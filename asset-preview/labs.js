/* Direct inspection of GPU texture data, captured mix inputs, and construction records. */
window.createAssetLabs = function createAssetLabs(api) {
  "use strict";
  const { THREE: T, Saltline: S, renderer, scene } = api,
    $ = (s) => document.querySelector(s);
  const channelInfo = {
    material: "完整 PBR 材质：包含颜色混合、粗糙度、金属度、法线与湿润处理。",
    albedo: "颜色贴图 RGB。读取数值以线性颜色表示；画面转换为 sRGB 显示。",
    normal:
      "法线 RGB 编码。各通道从 [0,1] 解码为 [-1,1]；这不是模型的几何法线。",
    orm: "ORM 打包图：R 是环境遮蔽，G 是粗糙度，B 是金属度。",
    ao: "ORM 的 R 通道。白色表示较少遮蔽，黑色表示较强遮蔽。",
    roughness:
      "ORM 的 G 通道。白色较粗糙，黑色较光滑；未叠加材质倍率或湿润变化。",
    metalness: "ORM 的 B 通道。白色偏金属，黑色偏非金属；未叠加材质倍率。",
    "normal-x": "法线 X 的编码值；分量 = 2 × 数值 − 1。",
    "normal-y": "法线 Y 的编码值；分量 = 2 × 数值 − 1。",
    "normal-z": "法线 Z 的编码值；分量 = 2 × 数值 − 1。",
    "albedo-alpha":
      "颜色贴图 A 通道，原着色器可将它用作漆面混合或透明遮罩；具体含义取决于配方。",
  };
  let audioAnalyzer = null,
    audioContext = null,
    aggregate = null,
    layerTrace = null,
    layerJob = 0,
    layerScale = 1,
    lastAssetKey = "",
    replay = null,
    replayJob = 0;
  const replayRoot = new T.Group();
  replayRoot.name = "generation-replay";
  scene.add(replayRoot);
  const raycaster = new T.Raycaster();
  const readTarget = new T.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const readScene = new T.Scene(),
    readCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const readMaterial = new T.ShaderMaterial({
    uniforms: { tMap: { value: null }, uUv: { value: new T.Vector2() } },
    vertexShader: "void main(){gl_Position=vec4(position.xy,0.0,1.0);}",
    fragmentShader:
      "uniform sampler2D tMap; uniform vec2 uUv; void main(){gl_FragColor=texture2D(tMap,uUv);}",
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const readQuad = new T.Mesh(new T.PlaneGeometry(2, 2), readMaterial);
  readScene.add(readQuad);
  function makeTextureMaterial(base, channel, repeat = 1, seams = false) {
    if (channel === "material") {
      const material = base.clone();
      if (base.defines) material.defines = { ...base.defines };
      material.userData = { ...base.userData };
      material.onBeforeCompile = (shader, webgl) => {
        base.onBeforeCompile(shader, webgl);
        if (shader.uniforms.uSlUv) {
          const uv = shader.uniforms.uSlUv.value.clone();
          uv.x *= repeat;
          uv.y *= repeat;
          shader.uniforms.uSlUv = { value: uv };
        }
        if (seams) {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <opaque_fragment>",
            `#include <opaque_fragment>\nvec2 workbenchUv=slUv;vec2 workbenchEdge=min(fract(workbenchUv),1.0-fract(workbenchUv));vec2 workbenchWidth=max(fwidth(workbenchUv)*1.3,vec2(.0001));float workbenchGrid=1.0-smoothstep(0.0,1.0,min(workbenchEdge.x/workbenchWidth.x,workbenchEdge.y/workbenchWidth.y));gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(1.0,.42,.07),workbenchGrid*.85);`,
          );
        }
      };
      material.customProgramCacheKey = () =>
        base.customProgramCacheKey() + "|workbench-repeat|" + Number(seams);
      return material;
    }
    const texture =
      channel === "albedo" || channel === "albedo-alpha"
        ? base.map
        : channel.startsWith("normal")
          ? base.normalMap
          : base.roughnessMap;
    const component =
      {
        ao: 0,
        roughness: 1,
        metalness: 2,
        "normal-x": 0,
        "normal-y": 1,
        "normal-z": 2,
        "albedo-alpha": 3,
      }[channel] ?? -1;
    const material = new T.ShaderMaterial({
      name: base.name,
      side: T.DoubleSide,
      toneMapped: false,
      uniforms: {
        tMap: { value: texture },
        uRepeat: { value: base.map.repeat.clone().multiplyScalar(repeat) },
        uComponent: { value: component },
        uSeams: { value: seams ? 1 : 0 },
      },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: `varying vec2 vUv;uniform sampler2D tMap;uniform vec2 uRepeat;uniform int uComponent;uniform float uSeams;void main(){vec2 q=vUv*uRepeat;vec4 texel=texture2D(tMap,q);vec3 color=texel.rgb;if(uComponent==0)color=vec3(texel.r);if(uComponent==1)color=vec3(texel.g);if(uComponent==2)color=vec3(texel.b);if(uComponent==3)color=vec3(texel.a);vec2 edge=min(fract(q),1.0-fract(q));vec2 width=max(fwidth(q)*1.3,vec2(.0001));float grid=(1.0-smoothstep(0.0,1.0,min(edge.x/width.x,edge.y/width.y)))*uSeams;color=mix(color,vec3(1.0,.55,.16),grid*.9);gl_FragColor=vec4(color,1.0);${channel === "albedo" ? "\n#include <colorspace_fragment>\n" : ""}}`,
    });
    material.userData = { ...base.userData };
    return material;
  }
  function readTexel(texture, uv) {
    const target = renderer.getRenderTarget(),
      scissor = renderer.getScissorTest(),
      viewport = new T.Vector4();
    renderer.getViewport(viewport);
    try {
      renderer.setScissorTest(false);
      readMaterial.uniforms.tMap.value = texture;
      readMaterial.uniforms.uUv.value.copy(uv);
      renderer.setRenderTarget(readTarget);
      renderer.render(readScene, readCamera);
      const pixel = new Uint8Array(4);
      renderer.readRenderTargetPixels(readTarget, 0, 0, 1, 1, pixel);
      return [...pixel].map((x) => x / 255);
    } finally {
      renderer.setRenderTarget(target);
      renderer.setViewport(viewport);
      renderer.setScissorTest(scissor);
    }
  }
  function inspectTexel(x, y) {
    const state = api.getState();
    if (state.tab !== "textures" || replay) return;
    const rect = renderer.domElement.getBoundingClientRect();
    let localX = x - rect.left;
    if (api.analysis.comparing) {
      if (localX < rect.width / 2) return;
      localX -= rect.width / 2;
    }
    raycaster.setFromCamera(
      new T.Vector2(
        (localX / (api.analysis.comparing ? rect.width / 2 : rect.width)) * 2 -
          1,
        (-(y - rect.top) / rect.height) * 2 + 1,
      ),
      api.camera,
    );
    const hit = raycaster.intersectObject(state.object, false)[0];
    if (!hit?.uv) return;
    const base = api.materials.get(state.selected),
      repeat = +$("#tile-repeat").value,
      uv = hit.uv.clone().multiply(base.map.repeat).multiplyScalar(repeat);
    const orm = readTexel(base.roughnessMap, uv),
      normal = readTexel(base.normalMap, uv);
    $("#texel-readout").textContent =
      `UV ${uv.x.toFixed(3)}, ${uv.y.toFixed(3)}；遮蔽 R ${orm[0].toFixed(3)} / 粗糙 G ${orm[1].toFixed(3)} / 金属 B ${orm[2].toFixed(3)}；法线（解码）${normal
        .slice(0, 3)
        .map((n) => (n * 2 - 1).toFixed(3))
        .join(", ")}。读数为 8 位量化后的原始贴图值。`;
    document.querySelector('[data-inspector="info"]').click();
  }

  // A Hann-windowed radix-2 FFT supplies an average spectrum after playback ends;
  // the Web Audio analyser supplies the live spectrum during playback.
  function fftPower(samples, start, size) {
    const real = new Float64Array(size),
      imag = new Float64Array(size);
    let windowSum = 0;
    const available = Math.min(size, Math.max(0, samples.length - start));
    for (let i = 0; i < available; i++) {
      const w =
        available <= 2
          ? 1
          : 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (available - 1));
      real[i] = (samples[start + i] || 0) * w;
      windowSum += w;
    }
    for (let i = 1, j = 0; i < size; i++) {
      let bit = size >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        const temp = real[i];
        real[i] = real[j];
        real[j] = temp;
      }
    }
    for (let len = 2; len <= size; len <<= 1) {
      const angle = (-2 * Math.PI) / len;
      for (let start = 0; start < size; start += len) {
        for (let j = 0; j < len / 2; j++) {
          const wr = Math.cos(angle * j),
            wi = Math.sin(angle * j),
            u = start + j,
            v = u + len / 2,
            tr = wr * real[v] - wi * imag[v],
            ti = wr * imag[v] + wi * real[v];
          real[v] = real[u] - tr;
          imag[v] = imag[u] - ti;
          real[u] += tr;
          imag[u] += ti;
        }
      }
    }
    const power = new Float64Array(size / 2),
      scale = 4 / (windowSum * windowSum);
    for (let i = 0; i < power.length; i++)
      power[i] = (real[i] * real[i] + imag[i] * imag[i]) * scale;
    return power;
  }
  function averageSpectrum(data) {
    const size = 4096,
      bins = new Float64Array(size / 2),
      length = data.ch[0].length,
      windows = Math.min(16, Math.max(1, Math.ceil(length / size)));
    let rms = 0,
      peak = 0,
      count = 0;
    for (const channel of data.ch) {
      for (const value of channel) {
        rms += value * value;
        peak = Math.max(peak, Math.abs(value));
        count++;
      }
      for (let i = 0; i < windows; i++) {
        const start = Math.round(
            (i * Math.max(0, length - size)) / Math.max(1, windows - 1),
          ),
          power = fftPower(channel, start, size);
        for (let k = 0; k < bins.length; k++)
          bins[k] += power[k] / (windows * data.ch.length);
      }
    }
    let peakBin = 1;
    for (let k = 2; k < bins.length; k++)
      if (bins[k] > bins[peakBin]) peakBin = k;
    return {
      db: Float32Array.from(bins, (v) =>
        Math.max(-120, 10 * Math.log10(Math.max(v, 1e-12))),
      ),
      sampleRate: data.sr,
      fftSize: size,
      rms: Math.sqrt(rms / Math.max(1, count)),
      peak,
      peakHz: (peakBin * data.sr) / size,
    };
  }
  function prepareCanvas(canvas) {
    const dpr = Math.min(devicePixelRatio || 1, 2),
      width = Math.max(1, canvas.clientWidth),
      height = Math.max(1, canvas.clientHeight);
    if (
      canvas.width !== Math.round(width * dpr) ||
      canvas.height !== Math.round(height * dpr)
    ) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const context = canvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width, height };
  }
  function drawSpectrum(spectrum, label = "整段平均") {
    const { context: c, width: w, height: h } = prepareCanvas($("#spectrum")),
      left = 36,
      right = 10,
      top = 16,
      bottom = 26,
      plotW = w - left - right,
      plotH = h - top - bottom,
      rate = spectrum?.sampleRate || 44100,
      maxHz = Math.min(24000, rate / 2),
      minHz = 20;
    const x = (f) =>
        left + (Math.log(f / minHz) / Math.log(maxHz / minHz)) * plotW,
      y = (db) =>
        top + (1 - Math.max(0, Math.min(1, (db + 100) / 100))) * plotH;
    c.font = "10px -apple-system,sans-serif";
    c.lineWidth = 1;
    c.fillStyle = "#a5bbc7";
    c.strokeStyle = "#3a5362";
    for (const db of [0, -25, -50, -75, -100]) {
      const yy = y(db);
      c.beginPath();
      c.moveTo(left, yy);
      c.lineTo(w - right, yy);
      c.stroke();
      c.fillText(String(db), 3, yy + 3);
    }
    for (const hz of w < 400
      ? [20, 100, 1000, 10000]
      : [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000])
      if (hz <= maxHz)
        c.fillText(hz >= 1000 ? hz / 1000 + "k" : String(hz), x(hz) - 7, h - 6);
    c.fillText(label, left, 10);
    if (!spectrum) return;
    c.strokeStyle = "#efa452";
    c.lineWidth = 1.5;
    c.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const hz = minHz * Math.pow(maxHz / minHz, i / plotW),
        bin = (hz * spectrum.fftSize) / rate,
        index = Math.floor(bin),
        aRaw = spectrum.db[Math.min(index, spectrum.db.length - 1)],
        bRaw = spectrum.db[Math.min(index + 1, spectrum.db.length - 1)],
        a = Number.isFinite(aRaw) ? aRaw : -120,
        b = Number.isFinite(bRaw) ? bRaw : -120,
        db = a + (b - a) * (bin - index);
      if (i === 0) c.moveTo(left + i, y(db));
      else c.lineTo(left + i, y(db));
    }
    c.stroke();
  }
  function drawSeam(data) {
    const show = !!data && $("#loop").checked;
    $("#loop-seam").hidden = !show;
    $("#seam-stats").hidden = !show;
    if (!show) return;
    const { context: c, width: w, height: h } = prepareCanvas($("#loop-seam")),
      a = data.ch[0],
      n = Math.min(Math.floor(data.sr * 0.01), Math.floor(a.length / 2));
    c.strokeStyle = "#557180";
    c.beginPath();
    c.moveTo(0, h / 2);
    c.lineTo(w, h / 2);
    c.stroke();
    c.strokeStyle = "#efa452";
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const value = i < n ? a[a.length - n + i] : a[i - n],
        x = (i / (n * 2 - 1)) * w,
        y = h / 2 - (value * (h - 20)) / 2;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    c.strokeStyle = "#dfebef";
    c.beginPath();
    c.moveTo(w / 2, 0);
    c.lineTo(w / 2, h);
    c.stroke();
    c.fillStyle = "#a5bbc7";
    c.font = "10px sans-serif";
    c.fillText("结尾 10 ms", 8, 12);
    c.fillText("开头 10 ms", w / 2 + 8, 12);
    const difference = Math.max(
      ...data.ch.map((a) => Math.abs(a[0] - a[a.length - 1])),
    );
    $("#seam-stats").textContent =
      "循环首尾最大端点差 " +
      difference.toFixed(5) +
      "（仅检查幅值连续性，不是音质评分）。";
  }
  function attachAudio(audioCtx, source, gain) {
    if (audioContext !== audioCtx) {
      audioContext = audioCtx;
      audioAnalyzer = audioCtx.createAnalyser();
      audioAnalyzer.fftSize = 4096;
      audioAnalyzer.minDecibels = -100;
      audioAnalyzer.maxDecibels = 0;
      audioAnalyzer.smoothingTimeConstant = 0.65;
      audioAnalyzer.connect(gain);
    }
    source.connect(audioAnalyzer);
  }
  function audioReady(data) {
    aggregate = averageSpectrum(data);
    const db = (v) =>
      v > 0 ? (20 * Math.log10(v)).toFixed(1) + " dBFS" : "−∞ dBFS";
    $("#spectrum-stats").textContent =
      `RMS ${db(aggregate.rms)} / 峰值 ${db(aggregate.peak)} / 平均谱峰 ${Math.round(aggregate.peakHz)} Hz；FFT 4096，Hann 窗。`;
    drawSpectrum(aggregate);
    drawSeam(data);
  }
  async function analyzeLayers() {
    const state = api.getState(),
      variant = +$("#variant").value,
      id = state.selected,
      job = ++layerJob;
    api.stopAudio();
    $("#analyze-layers").disabled = true;
    $("#layer-note").textContent = "正在记录原始合成器的混入片段…";
    try {
      const task = S.traceAudio(id, variant);
      let trace;
      while (!trace) {
        if (job !== layerJob) return;
        trace = task.step();
        if (!trace) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (job !== layerJob) return;
      layerTrace = trace;
      const fullLength = trace.audio.ch[0].length,
        channels = trace.channels,
        combined = Array.from(
          { length: channels },
          () => new Float32Array(fullLength),
        );
      const singles = [];
      for (const layer of trace.layers) {
        let start = Math.round(
          layer.time * (layer.sampleRate || trace.audio.sr),
        );
        let peak = 0;
        for (let i = 0; i < layer.samples.length; i++) {
          const index = layer.circular
              ? (((start + i) % fullLength) + fullLength) % fullLength
              : start + i,
            value = layer.samples[i] * layer.gain;
          if (index >= 0 && index < fullLength)
            combined[layer.channel][index] += value;
          peak = Math.max(peak, Math.abs(value));
        }
        singles.push(peak);
      }
      let peak = Math.max(1, ...singles);
      for (const channel of combined)
        for (const value of channel) peak = Math.max(peak, Math.abs(value));
      layerScale = 0.9 / peak;
      $("#layer-list").replaceChildren();
      trace.layers.forEach((layer, index) => {
        const row = document.createElement("div");
        row.className = "layer-row";
        const label = document.createElement("label"),
          checkbox = document.createElement("input"),
          text = document.createElement("span"),
          meta = document.createElement("small"),
          solo = document.createElement("button");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.dataset.layerIndex = index;
        text.textContent = index + 1 + ". " + layer.kind;
        meta.textContent = `${channels > 1 ? "声道 " + (layer.channel + 1) + " · " : ""}${layer.time.toFixed(3)} s / 增益 ${layer.gain.toFixed(2)}${layer.detail ? " · " + layer.detail : ""}`;
        text.append(meta);
        label.append(checkbox, text);
        solo.textContent = "独听";
        solo.onclick = () => playLayers([index]);
        row.append(label, solo);
        $("#layer-list").append(row);
      });
      $("#layer-actions").hidden = !trace.layers.length;
      $("#layer-note").textContent = trace.layers.length
        ? `捕获 ${trace.layers.length} 个真实混入片段。声层来自混音输入点，不含之后的总线滤波、饱和与归一化；全部声层使用同一预览增益 ${layerScale.toFixed(3)}，保留相对混入增益。${trace.truncated ? "记录达到上限，列表仅含部分片段。" : ""}`
        : "此生成器没有可独立截取的最终混入片段。完整试听和频谱仍可用；未使用频段滤波冒充分层。";
    } catch (error) {
      $("#layer-note").textContent = "声层分析失败：" + error.message;
      console.error(error);
    } finally {
      if (job === layerJob) $("#analyze-layers").disabled = false;
    }
  }
  async function playLayers(indices) {
    if (!layerTrace) return;
    const length = layerTrace.audio.ch[0].length,
      channels = Array.from(
        { length: layerTrace.channels },
        () => new Float32Array(length),
      );
    for (const index of indices) {
      const layer = layerTrace.layers[index],
        start = Math.round(
          layer.time * (layer.sampleRate || layerTrace.audio.sr),
        );
      for (let i = 0; i < layer.samples.length; i++) {
        const at = layer.circular
          ? (((start + i) % length) + length) % length
          : start + i;
        if (at >= 0 && at < length)
          channels[layer.channel][at] +=
            layer.samples[i] * layer.gain * layerScale;
      }
    }
    if (!indices.length) {
      $("#audio-status").textContent = "先选择至少一个声层";
      return;
    }
    await api.playAudio(
      {
        sr: layerTrace.audio.sr,
        ch: channels,
        loop: !!S.sounds[api.getState().selected].loop,
      },
      indices.length === 1
        ? "声层 " + (indices[0] + 1) + " 独听"
        : "所选 " + indices.length + " 个声层（总线处理前）",
    );
  }

  function boneLines(bones) {
    const positions = [];
    for (const bone of bones)
      if (bone.parent >= 0)
        positions.push(...bones[bone.parent].world, ...bone.world);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(positions, 3),
    );
    return new T.LineSegments(
      geometry,
      new T.LineBasicMaterial({
        color: 0xffbd75,
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      }),
    );
  }
  function endReplay() {
    if (!replay) return;
    replay.state.object.visible = replay.oldVisible;
    if (replay.oldSkeleton)
      replay.oldSkeleton.object.visible = replay.oldSkeleton.visible;
    for (const geometry of replay.ownedGeometries) geometry.dispose();
    for (const material of replay.ownedMaterials) material.dispose();
    replayRoot.clear();
    $("#wire").disabled = replay.wireDisabled;
    $("#bones").disabled = replay.bonesDisabled;
    document.querySelector('[data-inspector="parts"]').disabled =
      replay.partsDisabled;
    $("#compare").disabled = false;
    $("#replay").textContent = "生成回放";
    $("#replay-controls").hidden = true;
    replay = null;
  }
  function finalModelGroup(state, material) {
    const group = new T.Group();
    for (const part of api.analysis.parts) {
      const mesh = new T.Mesh(
        part.mesh.geometry,
        material || part.mesh.material,
      );
      mesh.position.copy(part.basePosition);
      mesh.rotation.copy(part.mesh.rotation);
      mesh.scale.copy(part.mesh.scale);
      group.add(mesh);
    }
    return group;
  }
  async function beginReplay() {
    if (replay) {
      endReplay();
      return;
    }
    const state = api.getState();
    if (state.tab === "sounds") return;
    if (api.analysis.comparing) $("#compare").click();
    const job = ++replayJob;
    $("#replay").disabled = true;
    $("#status").textContent = "正在采集生成记录…";
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (job !== replayJob) {
      $("#replay").disabled = false;
      return;
    }
    try {
      const ownedGeometries = new Set(),
        ownedMaterials = new Set(),
        construction = new T.Group(),
        wireMaterial = new T.MeshBasicMaterial({
          color: 0xa6c2d3,
          wireframe: true,
        }),
        solidMaterial = new T.MeshStandardMaterial({
          color: 0xa6b9c4,
          roughness: 0.7,
          metalness: 0.15,
          side: T.DoubleSide,
        });
      ownedMaterials.add(wireMaterial);
      ownedMaterials.add(solidMaterial);
      let trace = null,
        steps = [],
        finalWire,
        finalMaterial,
        skeletonGroup;
      if (state.tab === "models") {
        trace = S.traceGeometry(state.selected, api.game, {
          seed: state.config.seed,
          doors: state.config.doors,
          wear: state.config.wear,
          ...(state.config.color !== "auto"
            ? { color: state.config.color }
            : {}),
        });
        for (const record of trace.records) {
          ownedGeometries.add(record.geometry);
          const mesh = new T.Mesh(record.geometry, solidMaterial);
          mesh.applyMatrix4(record.matrix);
          construction.add(mesh);
        }
        finalWire = finalModelGroup(state, wireMaterial);
        finalMaterial = finalModelGroup(state, null);
        skeletonGroup = boneLines(trace.bones);
        ownedGeometries.add(skeletonGroup.geometry);
        ownedMaterials.add(skeletonGroup.material);
        steps.push({
          label: trace.bones.length
            ? "骨骼布局：" + trace.bones.length + " 个实际骨骼定义"
            : "生成入口与尺寸参数",
          source: trace.source,
        });
        trace.records.forEach((record, index) =>
          steps.push({
            label: `添加几何 ${index + 1}/${trace.records.length} · ${record.bone || record.slot || record.operation}`,
            source:
              record.operation === "RigGeometryBuilder.add"
                ? S.source.rigBuilder.toString()
                : trace.source,
          }),
        );
        steps.push(
          {
            label: "合并结果：完整网格线框",
            source: state.selected === "pac9" ? S.gun.toString() : trace.source,
          },
          { label: "分配材质：显示真实生成的表面", source: trace.source },
          {
            label: trace.bones.length
              ? "骨骼绑定：完整模型与实际骨架"
              : "生成完成：几何、材质与关卡元数据",
            source: trace.bones.length ? S.rig.toString() : trace.source,
          },
        );
        $("#replay-note").textContent =
          `${trace.mode}，共 ${trace.records.length} 条记录。末尾切换到实际完整网格与材质；这不是对 JavaScript 指令的单步执行。`;
      } else {
        const sourceMaterial = api.materials.get(state.selected),
          base = sourceMaterial.clone();
        if (sourceMaterial.defines)
          base.defines = { ...sourceMaterial.defines };
        base.userData = { ...sourceMaterial.userData };
        base.onBeforeCompile = sourceMaterial.onBeforeCompile;
        base.customProgramCacheKey =
          sourceMaterial.customProgramCacheKey.bind(sourceMaterial);
        base.roughness *= state.config.roughness;
        base.metalness *= state.config.metalness;
        base.color.multiply(new T.Color(state.config.tint));
        const spec = S.materialSpecs[state.selected];
        for (const channel of ["albedo", "orm", "normal", "material"]) {
          const mat = makeTextureMaterial(
            base,
            channel,
            +$("#tile-repeat").value,
            $("#tile-seams").checked,
          );
          ownedMaterials.add(mat);
          const mesh = new T.Mesh(state.object.geometry, mat);
          mesh.visible = false;
          construction.add(mesh);
        }
        base.dispose();
        steps = [
          {
            label: "配方与共享噪声函数（源码输入）",
            source: JSON.stringify(
              { preset: spec, recipe: S.textureSpecs[spec.set] },
              null,
              2,
            ),
          },
          {
            label: "GPU 颜色贴图产物",
            source: S.source.textureFunctions[S.textureSpecs[spec.set].fn],
          },
          {
            label: "GPU ORM 打包产物",
            source: S.source.textureFunctions[S.textureSpecs[spec.set].fn],
          },
          {
            label: "高度转法线：查看真实法线产物",
            source: S.source.normalShader,
          },
          { label: "完整 PBR 材质", source: S.materials.toString() },
        ];
        $("#replay-note").textContent =
          "按真实生成产物分阶段展示。颜色与 ORM 实际在同一 GPU pass 输出；高度中间缓冲未保留，此处展示法线结果及其计算源码，不模拟中间高度图。";
      }
      replay = {
        state,
        trace,
        steps,
        index: 0,
        playing: false,
        elapsed: 0,
        construction,
        finalWire,
        finalMaterial,
        skeletonGroup,
        ownedGeometries,
        ownedMaterials,
        oldVisible: state.object.visible,
        wireDisabled: $("#wire").disabled,
        bonesDisabled: $("#bones").disabled,
        partsDisabled: document.querySelector('[data-inspector="parts"]')
          .disabled,
      };
      replayRoot.add(construction);
      if (finalWire) replayRoot.add(finalWire);
      if (finalMaterial) replayRoot.add(finalMaterial);
      if (skeletonGroup) replayRoot.add(skeletonGroup);
      state.object.visible = false;
      const helper = scene.children.find((child) => child.isSkeletonHelper);
      if (helper) {
        replay.oldSkeleton = { object: helper, visible: helper.visible };
        helper.visible = false;
      }
      $("#wire").disabled = true;
      $("#bones").disabled = true;
      document.querySelector('[data-inspector="parts"]').disabled = true;
      document.querySelector('[data-inspector="info"]').click();
      $("#compare").disabled = true;
      $("#replay").textContent = "退出回放";
      $("#replay-controls").hidden = false;
      $("#replay-step").max = steps.length - 1;
      setReplayStep(0);
      $("#status").textContent = "生成记录就绪";
    } catch (error) {
      $("#status").textContent = "回放采集失败：" + error.message;
      console.error(error);
    } finally {
      $("#replay").disabled = false;
    }
  }
  function setReplayStep(index) {
    if (!replay) return;
    const r = replay;
    r.index = Math.max(0, Math.min(r.steps.length - 1, +index));
    $("#replay-step").value = r.index;
    $("#replay-label").textContent =
      `${r.index + 1} / ${r.steps.length} · ${r.steps[r.index].label}`;
    $("#replay-prev").disabled = r.index === 0;
    $("#replay-next").disabled = r.index === r.steps.length - 1;
    if (r.state.tab === "models") {
      const count = r.trace.records.length;
      r.construction.visible = r.index > 0 && r.index <= count;
      r.construction.children.forEach(
        (child, i) => (child.visible = i < r.index),
      );
      r.finalWire.visible = r.index === count + 1;
      r.finalMaterial.visible = r.index >= count + 2;
      r.skeletonGroup.visible = r.index === 0 || r.index === r.steps.length - 1;
    } else {
      r.construction.visible = true;
      r.construction.children.forEach(
        (child, i) => (child.visible = i === r.index - 1),
      );
    }
    if (r.index === r.steps.length - 1) {
      r.playing = false;
      $("#replay-play").textContent = "重新回放";
    } else
      $("#replay-play").textContent = r.playing
        ? "暂停"
        : r.index === 0
          ? "自动回放"
          : "继续回放";
  }
  function onSelection() {
    const state = api.getState(),
      key = state.tab + ":" + state.selected;
    $("#replay").hidden = state.tab === "sounds";
    $("#texture-inspection").hidden = state.tab !== "textures";
    $("#light-angle").disabled =
      state.tab === "textures" && $("#channel").value !== "material";
    $("#light-angle").closest("label").title =
      "侧光只影响完整材质，原始数据通道不受灯光影响。";
    if (state.tab === "textures")
      $("#channel-hint").textContent = channelInfo[$("#channel").value] || "";
    if (lastAssetKey !== key || state.tab === "sounds") {
      layerJob++;
      layerTrace = null;
      aggregate = null;
      $("#layer-list").replaceChildren();
      $("#layer-actions").hidden = true;
      $("#layer-note").textContent =
        "采集生成器实际混入的片段，不使用频段滤波模拟声层。";
      $("#analyze-layers").disabled = false;
      $("#spectrum-stats").textContent = "试听后显示频谱、RMS 和峰值频率。";
      $("#loop-seam").hidden = true;
      $("#seam-stats").hidden = true;
      lastAssetKey = key;
      if (state.tab === "sounds") drawSpectrum(null);
    }
  }
  function resetLayers() {
    layerJob++;
    layerTrace = null;
    $("#layer-list").replaceChildren();
    $("#layer-actions").hidden = true;
    $("#analyze-layers").disabled = false;
    $("#layer-note").textContent = "变体已切换，请重新分析声层。";
    aggregate = null;
    $("#spectrum-stats").textContent =
      "变体已切换，试听后显示该变体的频谱与电平。";
    drawSpectrum(null);
    $("#loop-seam").hidden = true;
    $("#seam-stats").hidden = true;
  }
  const studioKey = scene.children.find((child) => child.isDirectionalLight);
  if (studioKey) {
    const angle = (+$("#light-angle").value * Math.PI) / 180,
      radius = Math.hypot(studioKey.position.x, studioKey.position.z);
    studioKey.position.set(
      Math.sin(angle) * radius,
      studioKey.position.y,
      Math.cos(angle) * radius,
    );
  }
  $("#tile-repeat").oninput = () => {
    $("#tile-repeat-value").textContent = $("#tile-repeat").value + "×";
    api.rebuild();
  };
  $("#tile-seams").onchange = () => api.rebuild();
  $("#light-angle").oninput = () => {
    const angle = (+$("#light-angle").value * Math.PI) / 180,
      key = scene.children.find((child) => child.isDirectionalLight);
    if (key)
      key.position.set(
        Math.sin(angle) * Math.hypot(key.position.x, key.position.z),
        key.position.y,
        Math.cos(angle) * Math.hypot(key.position.x, key.position.z),
      );
    $("#light-angle-value").textContent = $("#light-angle").value + "°";
    api.analysis.updateConfig();
  };
  $("#analyze-layers").onclick = analyzeLayers;
  $("#layers-all").onclick = () =>
    document
      .querySelectorAll("[data-layer-index]")
      .forEach((box) => (box.checked = true));
  $("#layers-none").onclick = () =>
    document
      .querySelectorAll("[data-layer-index]")
      .forEach((box) => (box.checked = false));
  $("#play-layers").onclick = () =>
    playLayers(
      [...document.querySelectorAll("[data-layer-index]:checked")].map(
        (box) => +box.dataset.layerIndex,
      ),
    );
  $("#audio-layer-source").onclick = () =>
    api.openSource([
      ["合成函数", S.sounds[api.getState().selected].gen.toString()],
    ]);
  $("#replay").onclick = beginReplay;
  $("#replay-close").onclick = endReplay;
  $("#replay-step").oninput = () => {
    if (replay) {
      replay.playing = false;
      $("#replay-play").textContent = "继续回放";
      setReplayStep($("#replay-step").value);
    }
  };
  $("#replay-prev").onclick = () => setReplayStep(replay.index - 1);
  $("#replay-next").onclick = () => setReplayStep(replay.index + 1);
  $("#replay-play").onclick = () => {
    if (!replay) return;
    if (replay.index === replay.steps.length - 1) setReplayStep(0);
    replay.playing = !replay.playing;
    $("#replay-play").textContent = replay.playing ? "暂停" : "继续回放";
  };
  $("#replay-source").onclick = () => {
    if (replay)
      api.openSource([
        [
          "生成步骤 · " + replay.steps[replay.index].label,
          replay.steps[replay.index].source,
        ],
      ]);
  };
  new ResizeObserver(() => {
    if (api.getState().tab === "sounds") {
      drawSpectrum(aggregate);
      drawSeam(api.audioData());
    }
  }).observe($("#sound-view"));
  return {
    makeTextureMaterial,
    inspectTexel,
    attachAudio,
    audioReady,
    onSelection,
    resetLayers,
    beforeChange() {
      replayJob++;
      endReplay();
    },
    frame(dt, playing) {
      if (replay?.playing) {
        replay.elapsed += dt * +$("#replay-speed").value;
        while (replay && replay.playing && replay.elapsed >= 0.18) {
          replay.elapsed -= 0.18;
          setReplayStep(replay.index + 1);
        }
      }
      if (api.getState().tab === "sounds") {
        if (playing && audioAnalyzer) {
          const db = new Float32Array(audioAnalyzer.frequencyBinCount);
          audioAnalyzer.getFloatFrequencyData(db);
          drawSpectrum(
            {
              db,
              sampleRate: audioContext.sampleRate,
              fftSize: audioAnalyzer.fftSize,
            },
            "实时频谱",
          );
        } else drawSpectrum(aggregate);
      }
    },
    get replaying() {
      return !!replay;
    },
    get replay() {
      return replay;
    },
    get layers() {
      return layerTrace?.layers || [];
    },
    get spectrum() {
      return aggregate;
    },
    dispose() {
      layerJob++;
      endReplay();
      readTarget.dispose();
      readMaterial.dispose();
      readQuad.geometry.dispose();
      scene.remove(replayRoot);
      audioAnalyzer?.disconnect();
    },
  };
};

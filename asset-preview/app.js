import { Saltline as S } from "./engine.js";

(async () => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    T = S.THREE;
  const names = {
    container20: "20 英尺集装箱",
    container40: "40 英尺集装箱",
    container40hc: "高柜集装箱",
    forklift: "叉车",
    jersey_barrier: "混凝土护栏",
    light_mast: "照明灯杆",
    fence_panel: "铁丝围栏",
    guard_booth: "岗亭",
    gate_arm: "道闸",
    relay_node: "中继站",
    barrel: "油桶",
    pallet: "木托盘",
    pallet_stack: "托盘堆",
    crate_wood: "木箱",
    crate_stack: "木箱堆",
    ibc_tote: "吨桶",
    cable_reel: "线缆盘",
    tire_stack: "轮胎堆",
    dumpster: "垃圾箱",
    generator: "发电机",
    jerry_can: "油壶",
    traffic_cone: "交通锥",
    gas_cylinders: "气瓶",
    tarp_cargo: "篷布货物",
    sandbags: "沙袋",
    toolbox_cart: "工具车",
    floodlight_stand: "移动泛光灯",
    cardboard_boxes: "纸箱",
    pipe_stack: "管道堆",
    sign_post: "标志牌",
    shelf_rack: "货架",
    stairs_metal: "金属楼梯",
    catwalk: "金属步道",
    reefer_unit: "冷藏机组",
    bollard_mooring: "系船柱",
    bollard_post: "防撞柱",
    asphalt: "沥青",
    concrete: "混凝土",
    brick: "砖",
    rust: "铁锈",
    wood: "木纹",
    water: "水",
    rifle_shot: "步枪射击",
    rifle_tail_out: "室外枪声尾音",
    rifle_tail_in: "室内枪声尾音",
    rifle_dry: "空仓击发",
    reload_magout: "拔出弹匣",
    reload_magin: "插入弹匣",
    reload_bolt: "拉动枪机",
    shell_bounce: "弹壳落地",
    step_concrete: "混凝土脚步",
    step_water: "涉水脚步",
    step_metal: "金属脚步",
    rain: "雨",
    rain_interior: "室内雨声",
    wind: "风",
    sea: "海浪",
    thunder: "雷声",
    foghorn: "雾笛",
    gull_rotor: "无人机旋翼",
    hound_servo: "机器狗伺服",
    ir_outdoor: "室外混响响应",
    ir_shed: "棚内混响响应",
  };
  const label = (k) => names[k] || k.replaceAll("_", " ");
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: $("#scene"), antialias: true });
  } catch (e) {
    $("#status").textContent = "需要支持 WebGL2 的浏览器";
    $("#loading").hidden = false;
    $("#loading").textContent = e.message;
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  const scene = new T.Scene();
  scene.background = new T.Color(0x253945);
  const camera = new T.PerspectiveCamera(40, 1, 0.01, 1000),
    target = new T.Vector3();
  scene.add(new T.HemisphereLight(0xdcebf5, 0x62655d, 3));
  for (const [color, power, pos] of [
    [0xffffff, 4, [4, 7, 5]],
    [0xb8d8ff, 2, [-4, 3, -5]],
  ]) {
    const l = new T.DirectionalLight(color, power);
    l.position.set(...pos);
    scene.add(l);
  }
  const root = new T.Group();
  scene.add(root);
  const grid = new T.GridHelper(12, 24, 0x607886, 0x344e5e);
  scene.add(grid);
  const G = { renderer, params: { wet: 0.35 }, quality: { tex: 512 }, scene };
  G.mats = await S.materials(G);
  G.props = S.props(G);
  const catalog = {
    models: [
      { id: "hound", title: "Hound 机器狗" },
      { id: "gull", title: "Gull 无人机" },
      { id: "pac9", title: "PAC9 步枪" },
      ...G.props.names().map((id) => ({ id, title: label(id) })),
    ],
    textures: G.mats.names.map((id) => ({ id, title: label(id) })),
    sounds: Object.keys(S.sounds).map((id) => ({ id, title: label(id) })),
  };
  for (const k of Object.keys(catalog))
    $("#" + k + "-count").textContent = catalog[k].length;
  let tab = "models",
    selected = null,
    object = null,
    skeleton = null,
    rig = null,
    radius = 3,
    theta = 0.7,
    phi = 1.15,
    fitRadius = 3,
    ctx = null,
    gain = null,
    source = null,
    audioData = null,
    audioCache = new Map(),
    audioJob = 0,
    playing = false,
    currentTime = 0;
  const defaultConfig = () => ({
    seed: 7,
    doors: 0.2,
    wear: 0.5,
    color: "auto",
    roughness: 1,
    metalness: 1,
    tint: "#ffffff",
    wet: 0.35,
  });
  let generationConfig = defaultConfig(),
    currentAssetKey = "",
    analysis = null,
    labs = null,
    animation = null;
  const details = (rows) => {
    $("#details").replaceChildren();
    for (const [k, v] of rows) {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = k;
      dd.textContent = v;
      $("#details").append(dt, dd);
    }
  };
  function clear() {
    animation?.beforeChange();
    labs?.beforeChange();
    analysis?.detach();
    if (skeleton) {
      scene.remove(skeleton);
      skeleton.dispose();
      skeleton = null;
    }
    root.clear();
    if (object)
      object.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.userData.previewMaterial) o.material.dispose();
      });
    object = null;
    rig = null;
  }
  function wire() {
    root.traverse((o) => {
      if (o.isMesh && !o.userData.analysisOverlay) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.wireframe = $("#wire").checked;
      }
    });
  }
  function fit() {
    root.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(root, true),
      size = box.getSize(new T.Vector3()),
      center = box.getCenter(new T.Vector3());
    target.copy(center);
    const halfFov = Math.atan(
      Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect),
    );
    fitRadius = Math.max((size.length() * 0.55) / Math.sin(halfFov), 0.4);
    radius = fitRadius;
    theta = 0.7;
    phi = 1.15;
    grid.position.y = box.min.y - 0.015;
    grid.scale.setScalar(Math.max(size.x, size.z, size.y, 0.5) / 6);
    camera.near = Math.max(0.001, fitRadius / 1000);
    camera.far = Math.max(1000, fitRadius * 100);
    camera.updateProjectionMatrix();
  }
  function modelInfo() {
    let tris = 0,
      meshes = 0;
    object.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        tris +=
          (o.geometry.index
            ? o.geometry.index.count
            : o.geometry.attributes.position.count) / 3;
      }
    });
    const b = new T.Box3().setFromObject(object, true),
      sz = b.getSize(new T.Vector3());
    details([
      [
        "类型",
        selected === "pac9"
          ? "程序化武器"
          : rig
            ? "程序化骨骼模型"
            : "参数化场景道具",
      ],
      ["三角形", Math.round(tris).toLocaleString()],
      ["网格", meshes],
      [
        "尺寸 x / y / z",
        sz
          .toArray()
          .map((n) => n.toFixed(3))
          .join(" / ") + " m",
      ],
      ["骨骼", rig ? rig.skeleton.bones.length : "—"],
      [
        "生成入口",
        selected === "pac9"
          ? "w_()"
          : selected === "hound"
            ? "Z_() → pm()"
            : selected === "gull"
              ? "j_() → pm()"
              : "props.build()",
      ],
    ]);
  }
  function buildModel(id) {
    clear();
    object = new T.Group();
    if (id === "hound" || id === "gull") {
      const def = id === "hound" ? S.hound() : S.gull(),
        mats = {};
      for (const slot of def.slots)
        mats[slot] =
          slot === "glow"
            ? G.mats.emissive(0xffb347, 2)
            : G.mats.get(
                slot === "shell"
                  ? "armor_white"
                  : slot === "lens"
                    ? "glass"
                    : "steel_dark",
                { vertexColors: true, triplanar: true },
              );
      rig = S.rig(def, mats);
      object.add(rig.group);
    } else if (id === "pac9") {
      const parts = S.gun();
      for (const [key, geo] of Object.entries(parts)) {
        if (!geo?.isBufferGeometry) continue;
        const mesh = new T.Mesh(
          geo,
          G.mats.get(
            key === "plain"
              ? "polymer_black"
              : key === "round"
                ? "brass"
                : "gunmetal",
            { vertexColors: true, triplanar: true },
          ),
        );
        mesh.name = key;
        object.add(mesh);
      }
    } else
      object.add(
        G.props.build(id, {
          seed: generationConfig.seed,
          doors: generationConfig.doors,
          wear: generationConfig.wear,
          ...(generationConfig.color !== "auto"
            ? { color: generationConfig.color }
            : {}),
        }),
      );
    root.add(object);
    wire();
    if (rig) {
      skeleton = new T.SkeletonHelper(rig.mesh);
      skeleton.visible = $("#bones").checked;
      scene.add(skeleton);
    }
    $("#bones").disabled = !rig;
    $("#bones").parentElement.hidden = !rig;
    fit();
    modelInfo();
    $("#explanation").textContent = rig
      ? "由代码构造机械零件、骨骼层级及蒙皮权重，再组装成可驱动的骨骼网格。勾选骨骼可查看结构。"
      : id === "pac9"
        ? "二维轮廓挤出、倒角几何与旋转曲面构成武器。零件按表面材质分组；此处使用原项目材质库展示几何。"
        : "道具工厂按实际尺寸组合几何体，附加材质、编号和碰撞信息。固定种子让预览可重复。";
  }
  function buildTexture() {
    clear();
    const baseMaterial = G.mats.get(selected),
      mat = baseMaterial.clone();
    if (baseMaterial.defines) mat.defines = { ...baseMaterial.defines };
    mat.userData = { ...baseMaterial.userData };
    mat.onBeforeCompile = baseMaterial.onBeforeCompile;
    mat.customProgramCacheKey =
      baseMaterial.customProgramCacheKey.bind(baseMaterial);
    mat.roughness = baseMaterial.roughness * generationConfig.roughness;
    mat.metalness = baseMaterial.metalness * generationConfig.metalness;
    mat.color.multiply(new T.Color(generationConfig.tint));
    const set = mat.userData.set,
      channel = $("#channel").value,
      shape = $("#shape").value;
    const display = labs.makeTextureMaterial(
      mat,
      channel,
      +$("#tile-repeat").value,
      $("#tile-seams").checked,
    );
    mat.dispose();
    const geo =
      shape === "box"
        ? new T.BoxGeometry(1.6, 1.6, 1.6)
        : shape === "plane"
          ? new T.PlaneGeometry(2.7, 2.7)
          : new T.SphereGeometry(1, 64, 40);
    object = new T.Mesh(geo, display);
    object.userData.previewMaterial = true;

    root.add(object);
    wire();
    fit();
    if (shape === "plane") {
      theta = 0;
      phi = Math.PI / 2;
    }
    const spec = S.textureSpecs[set],
      img = mat.map.image;
    details([
      ["基础配方", set],
      ["贴图分辨率", img.width + " × " + img.height],
      ["贴图集合", "Albedo / Normal / ORM"],
      ["平铺尺寸", JSON.stringify(spec.tile) + " m"],
      ["生成方式", "GLSL → GPU RenderTarget"],
      ["查看通道", channel],
    ]);
    $("#explanation").textContent =
      "GPU 计算噪声、磨损与表面高度，生成颜色及 ORM 贴图，再由高度计算法线。ORM 的 R/G/B 分别存放遮蔽、粗糙度、金属度。";
  }
  function list() {
    const query = $("#search").value.trim().toLowerCase(),
      items = catalog[tab].filter((x) =>
        (x.id + " " + x.title).toLowerCase().includes(query),
      );
    $("#list").replaceChildren();
    for (const x of items) {
      const b = document.createElement("button");
      b.className = "asset" + (selected === x.id ? " selected" : "");
      b.dataset.id = x.id;
      b.setAttribute("aria-pressed", selected === x.id);
      const title = document.createElement("span"),
        small = document.createElement("small");
      title.textContent = x.title;
      small.textContent = x.id;
      b.append(title, small);
      b.onclick = () => select(x.id);
      $("#list").append(b);
    }
    $("#empty").hidden = !!items.length;
  }
  function stop() {
    audioJob++;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {}
      source.disconnect();
      source = null;
    }
    playing = false;
    $("#play").textContent = "试听音效";
  }
  async function samples(id, v, job) {
    const key = id + "#" + v;
    if (audioCache.has(key)) return audioCache.get(key);
    const task = S.synthSteps(id, v);
    let data = null;
    while (!data) {
      if (job !== audioJob) return null;
      data = task.step();
      if (!data) await new Promise((r) => setTimeout(r, 0));
    }
    audioCache.set(key, data);
    return data;
  }
  function drawWave(data) {
    const c = $("#wave"),
      dpr = devicePixelRatio || 1;
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    const x = c.getContext("2d"),
      w = c.width,
      h = c.height;
    x.clearRect(0, 0, w, h);
    x.strokeStyle = "#4e6979";
    x.beginPath();
    x.moveTo(0, h / 2);
    x.lineTo(w, h / 2);
    x.stroke();
    if (!data) return;
    const a = data.ch[0],
      step = Math.max(1, Math.floor(a.length / w));
    x.strokeStyle = "#efa452";
    x.beginPath();
    for (let i = 0; i < w; i++) {
      let min = 0,
        max = 0;
      for (let j = i * step; j < Math.min((i + 1) * step, a.length); j++) {
        min = Math.min(min, a[j]);
        max = Math.max(max, a[j]);
      }
      x.moveTo(i, h / 2 + min * h * 0.44);
      x.lineTo(i, h / 2 + max * h * 0.44);
    }
    x.stroke();
    if (playing && ctx) {
      const duration = a.length / data.sr,
        progress = ((ctx.currentTime - currentTime) % duration) / duration;
      x.strokeStyle = "#e1e8eb";
      x.beginPath();
      x.moveTo(progress * w, 0);
      x.lineTo(progress * w, h);
      x.stroke();
    }
  }
  function soundDetails() {
    const p = S.sounds[selected];
    details([
      ["采样率", p.sr.toLocaleString() + " Hz"],
      ["变体", p.n],
      ["原游戏循环", p.loop ? "是" : "否"],
      ["声道", audioData ? audioData.ch.length : "生成后显示"],
      [
        "时长",
        audioData
          ? (audioData.ch[0].length / audioData.sr).toFixed(2) + " s"
          : "生成后显示",
      ],
      ["合成函数", p.gen.name],
      ["游戏用途", p.ir ? "卷积混响响应" : p.music ? "音乐" : p.bus || "环境"],
    ]);
  }
  async function startAudioData(data, job, label = "") {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    if (job !== audioJob) return;
    if (!gain) {
      gain = ctx.createGain();
      gain.connect(ctx.destination);
    }
    gain.gain.value = +$("#volume").value;
    audioData = data;
    const buffer = ctx.createBuffer(data.ch.length, data.ch[0].length, data.sr);
    data.ch.forEach((channel, index) => buffer.copyToChannel(channel, index));
    const activeSource = ctx.createBufferSource();
    source = activeSource;
    activeSource.buffer = buffer;
    activeSource.loop = $("#loop").checked;
    if (labs) labs.attachAudio(ctx, activeSource, gain);
    else activeSource.connect(gain);
    playing = true;
    currentTime = ctx.currentTime;
    activeSource.onended = () => {
      activeSource.disconnect();
      if (source !== activeSource) return;
      playing = false;
      source = null;
      $("#play").textContent = "再次试听";
      $("#audio-status").textContent = "播放结束";
    };
    activeSource.start();
    $("#play").textContent = "重新播放";
    $("#audio-status").textContent =
      label || (source.loop ? "循环播放中" : "播放中");
    soundDetails();
    drawWave(data);
    labs?.audioReady(data);
  }
  async function play() {
    const id = selected,
      variant = +$("#variant").value;
    stop();
    const job = audioJob;
    $("#play").disabled = true;
    $("#audio-status").textContent = "正在合成采样…";
    try {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      await ctx.resume();
      const data = await samples(id, variant, job);
      if (!data || job !== audioJob) return;
      await startAudioData(data, job);
    } catch (error) {
      $("#audio-status").textContent = "无法播放：" + error.message;
    } finally {
      $("#play").disabled = false;
    }
  }
  function select(id) {
    stop();
    const nextKey = tab + ":" + id;
    if (nextKey !== currentAssetKey) {
      generationConfig = defaultConfig();
      G.mats.uniforms.wet.value = generationConfig.wet;
      $("#wet").value = generationConfig.wet;
      currentAssetKey = nextKey;
    }
    selected = id;
    list();
    const item = catalog[tab].find((x) => x.id === id);
    $("#title").textContent = item.title;
    $("#asset-id").textContent = id;
    $("#status").textContent = "生成器就绪";
    $("#kind").textContent = {
      models: "模型预览",
      textures: "材质预览",
      sounds: "音频预览",
    }[tab];
    try {
      if (tab === "models") buildModel(id);
      else if (tab === "textures") buildTexture();
      else {
        clear();
        audioData = null;
        const spec = S.sounds[id];
        $("#variant").replaceChildren(
          ...Array.from(
            { length: spec.n },
            (_, i) => new Option("变体 " + (i + 1), i),
          ),
        );
        $("#loop").checked = !!spec.loop;
        $("#audio-status").textContent = spec.ir
          ? "这是混响脉冲响应，可试听其原始声音"
          : "点击试听后生成音频";
        soundDetails();
        drawWave(null);
        $("#explanation").textContent =
          "数学波形与滤波噪声叠加，再通过振幅包络和共振计算生成 PCM 采样。同一变体使用固定种子，直接复用游戏原始合成函数。";
      }
      analysis?.setAsset(getAnalysisState());
      labs?.onSelection();
      animation?.onSelection();
    } catch (e) {
      $("#status").textContent = "生成失败：" + e.message;
      console.error(e);
    }
  }
  function switchTab(next) {
    tab = next;
    $("#search").value = "";
    for (const b of document.querySelectorAll("[data-tab]")) {
      b.classList.toggle("active", b.dataset.tab === tab);
      b.setAttribute("aria-pressed", b.dataset.tab === tab);
    }
    $("#scene").hidden = tab === "sounds";
    $("#sound-view").hidden = tab !== "sounds";
    $("#model-tools").hidden = tab !== "models";
    $("#texture-tools").hidden = tab !== "textures";
    $("#export-glb").hidden = tab !== "models";
    const infoExportBtn = $("#info-export-glb");
    if (infoExportBtn) infoExportBtn.hidden = tab !== "models";
    $("#view-note").hidden = tab === "sounds";
    $("#reset").hidden = tab === "sounds";
    $("#source").hidden = false;
    $("#bones").parentElement.hidden = tab !== "models";
    select(catalog[tab][0].id);
  }

  async function triggerGlbExport() {
    if (tab !== "models" || !object) return;
    const btn = $("#export-glb");
    const infoBtn = $("#info-export-glb");
    const oldText = btn ? btn.textContent : "导出 GLB";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "正在导出…";
    }
    if (infoBtn) {
      infoBtn.disabled = true;
      infoBtn.textContent = "正在导出…";
    }
    $("#status").textContent = `正在生成 ${selected} 资产的 GLB 文件…`;
    try {
      const targetObj =
        animation && animation.active && animation.active.controller
          ? animation.active.controller.root
          : object;
      const { blob, byteLength, filename } = await S.exportGlb(targetObj, selected);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const sizeMB = (byteLength / (1024 * 1024)).toFixed(2);
      $("#status").textContent = `已成功导出 ${filename} (${sizeMB} MB)`;
    } catch (err) {
      $("#status").textContent = `导出 GLB 失败: ${err.message}`;
      console.error(err);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText;
      }
      if (infoBtn) {
        infoBtn.disabled = false;
        infoBtn.textContent = "一键导出 GLB 资产";
      }
    }
  }
  for (const b of document.querySelectorAll("[data-tab]"))
    b.onclick = () => switchTab(b.dataset.tab);
  $("#search").oninput = list;
  $("#reset").onclick = fit;
  $("#export-glb").onclick = triggerGlbExport;
  const infoExportBtn = $("#info-export-glb");
  if (infoExportBtn) infoExportBtn.onclick = triggerGlbExport;
  $("#wire").onchange = wire;
  $("#bones").onchange = () => {
    if (skeleton) skeleton.visible = $("#bones").checked;
  };
  $("#wet").oninput = () => {
    generationConfig.wet = +$("#wet").value;
    G.mats.uniforms.wet.value = generationConfig.wet;
    analysis?.updateConfig();
  };
  $("#channel").onchange = () => rebuildCurrent();
  $("#shape").onchange = () => rebuildCurrent();
  $("#play").onclick = play;
  $("#stop").onclick = () => {
    stop();
    $("#audio-status").textContent = "已停止";
  };
  $("#volume").oninput = () => {
    if (gain) gain.gain.value = +$("#volume").value;
  };
  $("#variant").onchange = () => {
    stop();
    audioData = null;
    drawWave(null);
    $("#audio-status").textContent = "点击试听生成所选变体";
    soundDetails();
    labs?.resetLayers();
  };
  $("#loop").onchange = () => {
    if (source) source.loop = $("#loop").checked;
    if (audioData) labs?.audioReady(audioData);
  };
  let pointer = null,
    pointerStart = null,
    pointerMoved = false;
  const canvas = $("#scene");
  canvas.onpointerdown = (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    pointerStart = { x: e.clientX, y: e.clientY };
    pointerMoved = false;
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (!pointer) return;
    if (Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5)
      pointerMoved = true;
    const dx = e.clientX - pointer.x,
      dy = e.clientY - pointer.y;
    if (e.shiftKey || e.buttons === 2) {
      const right = new T.Vector3().setFromMatrixColumn(camera.matrix, 0);
      target.addScaledVector(right, -dx * radius * 0.0015);
      target.y += dy * radius * 0.0015;
    } else {
      theta -= dx * 0.008;
      phi = Math.max(0.08, Math.min(Math.PI - 0.08, phi - dy * 0.008));
    }
    pointer = { x: e.clientX, y: e.clientY };
  };
  canvas.onpointerup = (e) => {
    if (pointer && !pointerMoved && !labs?.replaying && !animation?.active) {
      if (tab === "textures") labs?.inspectTexel(e.clientX, e.clientY);
      else analysis?.pick(e.clientX, e.clientY);
    }
    pointer = null;
    pointerStart = null;
  };
  canvas.onpointercancel = () => {
    pointer = null;
    pointerStart = null;
  };
  canvas.oncontextmenu = (e) => e.preventDefault();
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      radius = Math.max(
        fitRadius * 0.12,
        Math.min(fitRadius * 12, radius * Math.exp(e.deltaY * 0.001)),
      );
    },
    { passive: false },
  );
  canvas.onkeydown = (e) => {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "-",
        "=",
      ].includes(e.key)
    ) {
      e.preventDefault();
      if (e.key === "ArrowLeft") theta -= 0.12;
      if (e.key === "ArrowRight") theta += 0.12;
      if (e.key === "ArrowUp") phi = Math.max(0.08, phi - 0.12);
      if (e.key === "ArrowDown") phi = Math.min(Math.PI - 0.08, phi + 0.12);
      if (e.key === "+" || e.key === "=")
        radius = Math.max(fitRadius * 0.12, radius * 0.9);
      if (e.key === "-") radius = Math.min(fitRadius * 12, radius * 1.1);
    }
  };
  function resizePreview(comparing = analysis?.comparing) {
    const w = $("#viewport").clientWidth,
      h = $("#viewport").clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = (comparing ? w / 2 : w) / h;
    camera.updateProjectionMatrix();
    if (tab === "sounds") drawWave(audioData);
  }
  new ResizeObserver(() => resizePreview()).observe($("#viewport"));
  function sourceSections() {
    if (tab === "sounds") {
      const spec = S.sounds[selected];
      return [
        ["音效配方", JSON.stringify({ ...spec, gen: spec.gen.name }, null, 2)],
        ["原始合成函数", spec.gen.toString()],
      ];
    }
    if (tab === "models") {
      if (selected === "pac9")
        return [
          ["武器几何 · w_()", S.gun.toString()],
          ...Object.entries(S.source.gunHelpers).map(([name, fn]) => [
            "几何工具 · " + name,
            fn.toString(),
          ]),
        ];
      if (rig)
        return [
          ["模型构造", (selected === "hound" ? S.hound : S.gull).toString()],
          ["骨骼构建器", S.source.rigBuilder.toString()],
          ["骨骼与网格绑定", S.rig.toString()],
        ];
      return [
        [
          "道具规格",
          JSON.stringify({ [selected]: S.propSpecs[selected] }, null, 2),
        ],
        ["道具建模函数", (S.source.builders[selected] || S.props).toString()],
      ];
    }
    const spec = S.materialSpecs[selected],
      recipe = S.textureSpecs[spec.set];
    return [
      ["材质参数", JSON.stringify({ [selected]: spec }, null, 2)],
      ["基础贴图配方", JSON.stringify({ [spec.set]: recipe }, null, 2)],
      ["表面生成 GLSL", S.source.textureFunctions[recipe.fn]],
      ["共享噪声与磨损函数 GLSL", S.source.textureCommon],
      ["贴图输出 GLSL", S.source.textureMain],
      ["高度转法线 GLSL", S.source.normalShader],
      ["GPU 贴图与材质工厂", S.materials.toString()],
      ["材质着色器注入", S.source.materialShader.toString()],
    ];
  }
  function sourceKey(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++)
      hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return text.length + ":" + (hash >>> 0).toString(16);
  }
  function readableCode(name, raw) {
    const known = window.SaltlineReadable?.library[sourceKey(raw)];
    if (known) return known;
    if (raw.trim().startsWith("{")) {
      const note = name.includes("规格")
        ? "道具规格：[宽度、高度、深度、视觉材质、碰撞表面]，长度单位为米。"
        : name.includes("配方")
          ? "贴图配方：fn 选择表面算法，size 为分辨率倍率，tile 为平铺尺寸（米），bump 控制法线强度，p 为算法参数。"
          : "材质预设：set 选择基础配方，color 为颜色值，rough / metal 控制粗糙度 / 金属度，wet / macro 是项目着色器的成组参数。";
      return (
        "// " +
        note +
        "\n// 参数名称保持原样，与生成器中的配置字段一致。\n\n" +
        raw
      );
    }
    return "// 此片段保留原始命名，尚无经过核对的语义重命名。\n" + raw;
  }
  function sourceText(index) {
    const [name, raw] = sections[index];
    return $("#source-mode").value === "original"
      ? raw
      : readableCode(name, raw);
  }
  function renderSource() {
    const text = sourceText(+$("#source-section").value);
    const container = $("#source-code");
    container.replaceChildren();
    for (const line of text.split("\n")) {
      const span = document.createElement("span");
      span.className = "code-line";
      const tokens =
        /(\/\/.*|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:function|class|let|const|var|return|new|for|if|else|async|await|true|false|null|void|this|throw|try|catch|uniform|vec[234]|float|int|precision)\b|\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/g;
      let offset = 0;
      for (const match of line.matchAll(tokens)) {
        span.append(document.createTextNode(line.slice(offset, match.index)));
        const token = document.createElement("span");
        token.className = match[0].startsWith("/")
          ? "token-comment"
          : /^["']/.test(match[0])
            ? "token-string"
            : /^\d/.test(match[0])
              ? "token-number"
              : "token-keyword";
        token.textContent = match[0];
        span.append(token);
        offset = match.index + match[0].length;
      }
      span.append(
        document.createTextNode(line.slice(offset) || (!line ? " " : "")),
      );
      container.append(span, document.createTextNode("\n"));
    }
    $("#copy-source").textContent = "复制代码";
    container.parentElement.scrollTop = 0;
  }
  let sections = [];
  function openSource(extraSections = [], focusRaw = null) {
    sections = [
      ...extraSections,
      ...sourceSections().filter(
        (item) => !extraSections.some((x) => x[1] === item[1]),
      ),
    ];
    const related = [];
    for (const [, raw] of sections)
      for (const item of window.SaltlineReadable?.related[sourceKey(raw)] ||
        []) {
        if (
          !sections.some((x) => x[1] === item.raw) &&
          !related.some((x) => x[1] === item.raw)
        )
          related.push(["调用实现 · " + item.name, item.raw]);
      }
    sections.push(...related);
    $("#source-title").textContent = $("#title").textContent + " / 源码";
    $("#source-section").replaceChildren(
      ...sections.map(([name], i) => new Option(name, i)),
    );
    if (focusRaw) {
      const index = sections.findIndex((item) => item[1] === focusRaw);
      if (index >= 0) $("#source-section").value = index;
    }
    renderSource();
    if (!$("#source-dialog").open) $("#source-dialog").showModal();
  }
  $("#source").onclick = () => openSource();
  $("#source-section").onchange = renderSource;
  $("#source-mode").onchange = renderSource;
  $("#close-source").onclick = () => $("#source-dialog").close();
  $("#copy-source").onclick = async () => {
    const text = sourceText(+$("#source-section").value);
    try {
      await navigator.clipboard.writeText(text);
      $("#copy-source").textContent = "已复制";
    } catch {
      const range = document.createRange();
      range.selectNodeContents($("#source-code"));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      $("#copy-source").textContent = "请按 Ctrl/Cmd+C 复制";
    }
  };
  $("#download-source").onclick = () => {
    const text = sections
      .map(([name], index) => "// " + name + "\n" + sourceText(index))
      .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = selected + "-source.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    labs?.frame(dt, playing);
    animation?.frame(dt);
    if (tab !== "sounds") {
      if ($("#rotate").checked) theta += dt * 0.3;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta),
      );
      camera.lookAt(target);
      if (!analysis?.render()) renderer.render(scene, camera);
    } else if (playing) drawWave(audioData);
    requestAnimationFrame(frame);
  }
  function getAnalysisState() {
    return {
      tab,
      selected,
      object,
      rig,
      config: { ...generationConfig },
      view: {
        shape: $("#shape").value,
        channel: $("#channel").value,
        repeat: +$("#tile-repeat").value,
        seams: $("#tile-seams").checked,
        light: +$("#light-angle").value,
      },
      title:
        catalog[tab]?.find((item) => item.id === selected)?.title || selected,
    };
  }
  function rebuildCurrent() {
    const view = { target: target.clone(), radius, theta, phi };
    try {
      G.mats.uniforms.wet.value = generationConfig.wet;
      if (tab === "models") buildModel(selected);
      else if (tab === "textures") buildTexture();
      analysis?.setAsset(getAnalysisState());
      labs?.onSelection();
      animation?.onSelection();
      target.copy(view.target);
      radius = view.radius;
      theta = view.theta;
      phi = view.phi;
      $("#status").textContent = "生成器就绪";
    } catch (error) {
      $("#status").textContent = "生成失败：" + error.message;
      console.error(error);
    }
  }
  analysis = window.createAssetAnalysis({
    THREE: T,
    Saltline: S,
    renderer,
    camera,
    scene,
    grid,
    root,
    getState: getAnalysisState,
    openSource,
    defaultConfig,
    resize: resizePreview,
    fitComparison() {
      const viewAngles = { theta, phi };
      fit();
      theta = viewAngles.theta;
      phi = viewAngles.phi;
    },
    navigateMaterial(name) {
      switchTab("textures");
      select(name);
    },
    applyConfig(patch) {
      generationConfig = { ...generationConfig, ...patch };
      $("#wet").value = generationConfig.wet;
      rebuildCurrent();
    },
  });
  labs = window.createAssetLabs({
    THREE: T,
    Saltline: S,
    renderer,
    scene,
    camera,
    game: G,
    materials: G.mats,
    analysis,
    getState: getAnalysisState,
    openSource,
    rebuild: rebuildCurrent,
    audioData: () => audioData,
    stopAudio: stop,
    async playAudio(data, label) {
      stop();
      const job = audioJob;
      try {
        await startAudioData(data, job, label);
      } catch (error) {
        $("#audio-status").textContent = "无法播放声层：" + error.message;
      }
    },
  });
  animation = window.createAssetAnimator({
    THREE: T,
    Saltline: S,
    game: G,
    scene,
    camera,
    analysis,
    labs,
    getState: getAnalysisState,
    openSource,
  });
  switchTab("models");
  requestAnimationFrame(frame);
  window.addEventListener("pagehide", () => {
    stop();
    ctx?.close();
    animation?.dispose();
    labs?.dispose();
    analysis?.dispose();
  });
  window.preview = {
    catalog,
    get selected() {
      return selected;
    },
    get tab() {
      return tab;
    },
    get object() {
      return object;
    },
    get audioData() {
      return audioData;
    },
    renderer,
    camera,
    analysis,
    labs,
    animation,
    get config() {
      return { ...generationConfig };
    },
  };
})().catch((e) => {
  document.querySelector("#status").textContent = "初始化失败：" + e.message;
  console.error(e);
});

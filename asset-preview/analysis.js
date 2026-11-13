/* Asset analysis stays separate from the original generator: source references,
   static part inspection, and a frozen A versus editable B comparison. */
window.createAssetAnalysis = function createAssetAnalysis(api) {
  "use strict";
  const { THREE: T, Saltline: S } = api;
  const $ = (selector) => document.querySelector(selector);
  const dependencies = window.SaltlineDependencies;
  const key = (text) => {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++)
      hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return text.length + ":" + (hash >>> 0).toString(16);
  };
  let parts = [],
    selectedPart = null,
    assetKey = "",
    baseline = null,
    explosion = 0;
  let currentState = null,
    graphMode = "calls";
  const raycaster = new T.Raycaster();
  const defaultViewNote = $("#view-note").textContent;
  const partNames = {
    ano: "阳极氧化枪身",
    gun: "金属零件",
    poly: "聚合物零件",
    plain: "机匣刻标与铭文",
    bolt: "枪机",
    mag: "弹匣",
    round: "弹药",
    body: "机身",
    head: "头部",
    neck: "颈部",
    turret: "炮塔",
    turret_gun: "机枪",
    antenna: "天线",
    beacon: "信标",
    root: "主体",
    shell: "外壳",
    metal: "金属",
    glow: "发光部件",
    lens: "镜片",
    disc: "旋翼光盘",
    cone: "探照光束",
  };
  const baselineScene = new T.Scene();
  baselineScene.background = api.scene.background.clone();
  for (const child of api.scene.children)
    if (child.isLight) baselineScene.add(child.clone());
  const baselineGrid = new T.GridHelper(12, 24, 0x607886, 0x344e5e);
  baselineScene.add(baselineGrid);
  const baselineRoot = new T.Group();
  baselineScene.add(baselineRoot);
  const materialArray = (mesh) =>
    Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const title = (name) => {
    const leg = /^(abd|thigh|shin)(FL|FR|RL|RR)$/.exec(name);
    if (leg)
      return (
        { FL: "左前", FR: "右前", RL: "左后", RR: "右后" }[leg[2]] +
        { abd: "髋关节", thigh: "大腿", shin: "小腿" }[leg[1]]
      );
    if (/^rotor\d+$/.test(name)) return "旋翼 " + (+name.slice(5) + 1);
    return partNames[name] || name;
  };
  const setText = (selector, value) => {
    $(selector).textContent = value;
  };

  // Snapshot shader uniforms as well as material properties. Otherwise a shared
  // wetness uniform would silently change the supposedly frozen A view.
  function cloneMaterial(original, wetness) {
    const clone = original.isShaderMaterial
      ? new T.ShaderMaterial({
          name: original.name,
          vertexShader: original.vertexShader,
          fragmentShader: original.fragmentShader,
          glslVersion: original.glslVersion,
          side: original.side,
          depthTest: original.depthTest,
          depthWrite: original.depthWrite,
          transparent: original.transparent,
          blending: original.blending,
          toneMapped: original.toneMapped,
          wireframe: original.wireframe,
          uniforms: Object.fromEntries(
            Object.entries(original.uniforms).map(([name, uniform]) => [
              name,
              {
                ...uniform,
                value: uniform.value?.isTexture
                  ? uniform.value
                  : uniform.value?.clone
                    ? uniform.value.clone()
                    : uniform.value,
              },
            ]),
          ),
        })
      : original.clone();
    if (original.defines) clone.defines = { ...original.defines };
    clone.userData = { ...original.userData };
    clone.customProgramCacheKey = original.customProgramCacheKey.bind(original);
    clone.onBeforeCompile = (shader, renderer) => {
      original.onBeforeCompile(shader, renderer);
      if (shader.uniforms.uSlWet) shader.uniforms.uSlWet = { value: wetness };
    };
    return clone;
  }
  function removeSelection() {
    if (!selectedPart) return;
    selectedPart.mesh.remove(selectedPart.highlight);
    selectedPart.highlight.material.dispose();
    selectedPart.highlight = null;
    selectedPart = null;
  }
  function disposeBaseline() {
    if (!baseline) return;
    baselineRoot.traverse((mesh) => {
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        materialArray(mesh).forEach((mat) => mat.dispose());
      }
    });
    baselineRoot.clear();
    baseline = null;
    setText("#view-note", defaultViewNote);
    $("#compare").textContent = "开启对比";
    $("#compare").setAttribute("aria-pressed", "false");
    $("#compare-labels").hidden = true;
    $("#refresh-baseline").hidden = true;
    $("#viewport").classList.remove("comparing");
    api.resize(false);
    updateComparisonSummary();
  }
  function detach() {
    removeSelection();
    parts = [];
    // Generated source meshes remain attached for skeleton inspection. Only
    // the static analysis copies own extra materials and geometry.
    if (currentState?.object)
      currentState.object.traverse((mesh) => {
        if (mesh.userData.analysisPart) {
          mesh.geometry.dispose();
          mesh.material.dispose();
        }
      });
  }
  function attributeSubset(source, indices, transform, mesh) {
    const geometry = new T.BufferGeometry(),
      attributes = source.attributes;
    for (const [name, attribute] of Object.entries(attributes)) {
      if (["skinIndex", "skinWeight"].includes(name)) continue;
      const array = new attribute.array.constructor(
        indices.length * attribute.itemSize,
      );
      const subset = new T.BufferAttribute(
        array,
        attribute.itemSize,
        attribute.normalized,
      );
      for (let i = 0; i < indices.length; i++) {
        const old = indices[i];
        if (name === "position") {
          const vertex = new T.Vector3();
          mesh.getVertexPosition(old, vertex);
          subset.setXYZ(i, vertex.x, vertex.y, vertex.z);
        } else if (name === "normal") {
          const normal = new T.Vector3().fromBufferAttribute(attribute, old);
          subset.setXYZ(i, normal.x, normal.y, normal.z);
        } else {
          for (let component = 0; component < attribute.itemSize; component++)
            array[i * attribute.itemSize + component] =
              attribute.array[old * attribute.itemSize + component];
        }
      }
      geometry.setAttribute(name, subset);
    }
    return geometry;
  }
  function collectParts(state) {
    const object = state.object;
    object.updateMatrixWorld(true);
    const inverse = new T.Matrix4().copy(object.matrixWorld).invert(),
      originalMeshes = [];
    object.traverse((mesh) => {
      if (mesh.isMesh && mesh.visible && !mesh.userData.analysisOverlay)
        originalMeshes.push(mesh);
    });
    const group = new T.Group();
    group.name = "analysis-parts";
    object.add(group);
    for (const original of originalMeshes) {
      const geometry = original.geometry,
        index = geometry.index;
      const triangleCount =
        (index ? index.count : geometry.attributes.position.count) / 3;
      const buckets = new Map(),
        materials = materialArray(original);
      for (let triangle = 0; triangle < triangleCount; triangle++) {
        const offset = triangle * 3,
          first = index ? index.getX(offset) : offset;
        const slot =
          geometry.groups.find(
            (g) => offset >= g.start && offset < g.start + g.count,
          )?.materialIndex || 0;
        const bone = original.isSkinnedMesh
          ? geometry.attributes.skinIndex.getX(first)
          : -1;
        const bucketKey = slot + ":" + bone;
        if (!buckets.has(bucketKey))
          buckets.set(bucketKey, { slot, bone, indices: [] });
        for (let k = 0; k < 3; k++)
          buckets
            .get(bucketKey)
            .indices.push(index ? index.getX(offset + k) : offset + k);
      }
      original.userData.analysisOriginal = true;
      const transform = new T.Matrix4().multiplyMatrices(
        inverse,
        original.matrixWorld,
      );
      for (const bucket of buckets.values()) {
        const sourceMaterial = materials[bucket.slot] || materials[0];
        const material = sourceMaterial.clone();
        if (sourceMaterial.defines)
          material.defines = { ...sourceMaterial.defines };
        material.userData = { ...sourceMaterial.userData };
        material.onBeforeCompile = sourceMaterial.onBeforeCompile;
        material.customProgramCacheKey =
          sourceMaterial.customProgramCacheKey.bind(sourceMaterial);
        const mesh = new T.Mesh(
          attributeSubset(geometry, bucket.indices, transform, original),
          material,
        );
        mesh.userData.analysisPart = true;
        mesh.name = original.name;
        mesh.applyMatrix4(transform);
        mesh.renderOrder = original.renderOrder;
        group.add(mesh);
        const boneName =
          bucket.bone >= 0 ? original.skeleton.bones[bucket.bone]?.name : null;
        const matName = sourceMaterial.name || "未命名材质";
        const part = {
          id: parts.length,
          mesh,
          boneName,
          materialName: matName,
          material: sourceMaterial,
          name: boneName
            ? title(boneName) + " / " + title(matName)
            : original.name
              ? title(original.name) + " / " + title(matName)
              : title(matName) + " · " + (parts.length + 1),
          triangles: bucket.indices.length / 3,
          basePosition: mesh.position.clone(),
          offset: new T.Vector3(),
          visible: true,
        };
        mesh.userData.analysisId = part.id;
        parts.push(part);
      }
      original.visible = false;
    }
    object.updateMatrixWorld(true);
    const bounds = new T.Box3();
    for (const part of parts)
      bounds.union(new T.Box3().setFromObject(part.mesh));
    const center = bounds.getCenter(new T.Vector3()),
      size = bounds.getSize(new T.Vector3()).length();
    for (const part of parts) {
      const c = new T.Box3()
        .setFromObject(part.mesh)
        .getCenter(new T.Vector3());
      part.offset.copy(c.sub(center));
      if (part.offset.length() < size * 0.03) {
        const angle = part.id * 2.39996;
        part.offset.set(Math.cos(angle), 0.3, Math.sin(angle));
      }
      part.offset.normalize().multiplyScalar(size * 0.45);
    }
  }
  function showPanel(panel) {
    if (panel === "parts" && currentState?.tab !== "models") panel = "info";
    if (panel === "params" && currentState?.tab === "sounds") panel = "info";
    for (const button of document.querySelectorAll("[data-inspector]")) {
      const active = button.dataset.inspector === panel;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active);
    }
    for (const p of ["info", "parts", "params"])
      $("#" + p + "-panel").hidden = p !== panel;
  }
  function renderParts() {
    const list = $("#parts-list");
    list.replaceChildren();
    for (const part of parts) {
      const button = document.createElement("button");
      button.className =
        "part-row" + (selectedPart === part ? " selected" : "");
      button.dataset.partId = part.id;
      button.setAttribute("aria-pressed", selectedPart === part);
      const name = document.createElement("span"),
        meta = document.createElement("small");
      name.textContent = part.name;
      meta.textContent =
        part.triangles.toLocaleString() +
        " 三角形" +
        (!part.visible ? " · 已隐藏" : "");
      button.append(name, meta);
      button.onclick = () => choosePart(part);
      list.append(button);
    }
    $("#isolate-part").disabled = !selectedPart;
    $("#hide-part").disabled = !selectedPart;
    $("#part-source").disabled = !selectedPart;
    if (!selectedPart)
      setText(
        "#part-summary",
        parts.length + " 个部件组。点击模型或列表进行选择。",
      );
    updateComparisonSummary();
  }
  function choosePart(part) {
    removeSelection();
    selectedPart = part;
    part.visible = true;
    part.mesh.visible = true;
    const highlight = new T.Mesh(
      part.mesh.geometry,
      new T.MeshBasicMaterial({
        color: 0xffb965,
        wireframe: true,
        transparent: true,
        opacity: 0.38,
        depthTest: false,
        depthWrite: false,
      }),
    );
    highlight.userData.analysisOverlay = true;
    highlight.raycast = () => {};
    highlight.renderOrder = 30;
    part.mesh.add(highlight);
    part.highlight = highlight;
    showPanel("parts");
    renderParts();
    setText(
      "#part-summary",
      part.name +
        "；材质 " +
        part.materialName +
        "；" +
        part.triangles.toLocaleString() +
        " 三角形" +
        (part.boneName ? "；骨骼 " + part.boneName : ""),
    );
  }
  function pick(clientX, clientY) {
    if (currentState?.tab !== "models") return;
    const rect = api.renderer.domElement.getBoundingClientRect();
    let x = clientX - rect.left;
    if (baseline) {
      if (x < rect.width / 2) return;
      x -= rect.width / 2;
    }
    const width = baseline ? rect.width / 2 : rect.width;
    raycaster.setFromCamera(
      new T.Vector2(
        (x / width) * 2 - 1,
        (-(clientY - rect.top) / rect.height) * 2 + 1,
      ),
      api.camera,
    );
    const hit = raycaster.intersectObjects(
      parts.filter((p) => p.visible).map((p) => p.mesh),
      false,
    )[0];
    if (hit) choosePart(parts[hit.object.userData.analysisId]);
  }
  function setExplosion(value) {
    explosion = +value;
    const pct = Math.round(explosion * 100) + "%";
    setText("#explode-value", pct);
    const quickSlider = $("#explode-quick");
    if (quickSlider && Math.abs(+quickSlider.value - explosion) > 1e-4) {
      quickSlider.value = String(explosion);
    }
    setText("#explode-quick-value", pct);
    for (const part of parts)
      part.mesh.position
        .copy(part.basePosition)
        .addScaledVector(part.offset, explosion);
    updateComparisonSummary();
  }
  function snapshot() {
    if (!currentState || currentState.tab === "sounds") return;
    const replacingBaseline = !!baseline;
    if (baseline) disposeBaseline();
    const state = api.getState();
    baseline = {
      key: state.tab + ":" + state.selected,
      config: { ...state.config },
      view: { ...state.view },
      explosion,
      partCount: parts.length,
      hiddenCount: parts.filter((p) => !p.visible).length,
    };
    const meshes =
      state.tab === "models"
        ? parts.filter((p) => p.visible).map((p) => p.mesh)
        : [state.object];
    for (const mesh of meshes) {
      const clone = new T.Mesh(
        mesh.geometry.clone(),
        Array.isArray(mesh.material)
          ? mesh.material.map((m) => cloneMaterial(m, state.config.wet))
          : cloneMaterial(mesh.material, state.config.wet),
      );
      clone.position.copy(mesh.position);
      clone.rotation.copy(mesh.rotation);
      clone.scale.copy(mesh.scale);
      clone.userData.analysisSnapshot = true;
      baselineRoot.add(clone);
    }
    for (const light of [...baselineScene.children].filter(
      (child) => child.isLight,
    ))
      baselineScene.remove(light);
    for (const light of api.scene.children.filter((child) => child.isLight))
      baselineScene.add(light.clone());
    baselineGrid.position.copy(api.grid.position);
    baselineGrid.scale.copy(api.grid.scale);
    $("#compare").textContent = "退出对比";
    $("#compare").setAttribute("aria-pressed", "true");
    $("#compare-labels").hidden = false;
    $("#refresh-baseline").hidden = false;
    $("#viewport").classList.add("comparing");
    api.resize(true);
    if (!replacingBaseline) api.fitComparison();
    setText(
      "#view-note",
      state.tab === "models"
        ? "拖动同步旋转 · 滚轮缩放 · 点击 B 选择部件"
        : "拖动同步旋转 · 滚轮缩放",
    );
    updateComparisonSummary();
  }
  function updateComparisonSummary() {
    $("#params-compare").disabled = !!baseline;
    $("#params-compare").textContent = baseline
      ? "已开启 A/B 对比"
      : "固定 A 并开始对比";
    if (!baseline) {
      setText(
        "#comparison-summary",
        "尚未开启对比。A 保存基准状态，参数只修改 B。",
      );
      return;
    }
    const state = api.getState(),
      labels = {
        seed: "种子",
        doors: "开门",
        wear: "磨损",
        color: "颜色",
        roughness: "粗糙倍率",
        metalness: "金属倍率",
        tint: "颜色叠乘",
        wet: "湿润",
      };
    const changes = Object.entries(state.config)
      .filter(([k, v]) => baseline.config[k] !== v)
      .map(([k, v]) => (labels[k] || k) + " " + baseline.config[k] + " → " + v);
    if (state.tab === "textures") {
      const names = {
        sphere: "球体",
        box: "方块",
        plane: "平面",
        material: "完整材质",
        albedo: "颜色",
        normal: "法线",
        orm: "ORM",
      };
      for (const field of ["shape", "channel"])
        if (baseline.view[field] !== state.view[field])
          changes.push(
            (field === "shape" ? "形状 " : "通道 ") +
              names[baseline.view[field]] +
              " → " +
              names[state.view[field]],
          );
    }
    if (state.tab === "textures")
      for (const [field, label] of [
        ["repeat", "平铺倍率"],
        ["light", "侧光角度"],
        ["seams", "接缝标记"],
      ])
        if (baseline.view[field] !== state.view[field])
          changes.push(
            label + " " + baseline.view[field] + " → " + state.view[field],
          );
    if (state.tab === "models") {
      if (baseline.partCount !== parts.length)
        changes.push("部件组数 " + baseline.partCount + " → " + parts.length);
      const hiddenCount = parts.filter((part) => !part.visible).length;
      if (baseline.hiddenCount !== hiddenCount)
        changes.push(
          "隐藏部件组 " + baseline.hiddenCount + " → " + hiddenCount,
        );
    }
    if (baseline.explosion !== explosion)
      changes.push(
        "拆解 " +
          Math.round(baseline.explosion * 100) +
          "% → " +
          Math.round(explosion * 100) +
          "%",
      );
    setText(
      "#comparison-summary",
      changes.length
        ? "A / B 差异：" + changes.join("；")
        : "A 与 B 参数一致。修改参数后比较，视角保持同步。",
    );
    setText(
      "#baseline-label",
      "A · 固定基准 / 湿润 " + baseline.config.wet.toFixed(2),
    );
    setText(
      "#current-label",
      "B · 当前参数 / 湿润 " + state.config.wet.toFixed(2),
    );
  }
  function relevantSource() {
    const state = api.getState();
    if (state.selected === "hound") return S.hound.toString();
    if (state.selected === "gull") return S.gull.toString();
    if (state.selected === "pac9") return S.gun.toString();
    return S.source.builders[state.selected]?.toString() || "";
  }
  function populateParameters() {
    const state = api.getState(),
      config = state.config;
    for (const field of [
      "seed",
      "doors",
      "wear",
      "color",
      "roughness",
      "metalness",
      "tint",
    ])
      $("#param-" + field).value = config[field];
    const raw = relevantSource(),
      related = window.SaltlineReadable?.related[key(raw)] || [];
    const source = raw + "\n" + related.map((x) => x.raw).join("\n");
    for (const field of ["seed", "doors", "wear", "color"]) {
      const supported =
        state.tab === "models" &&
        !["hound", "gull", "pac9"].includes(state.selected) &&
        new RegExp("\\." + field + "\\b").test(source);
      $("#param-" + field).disabled = !supported;
      $("#param-" + field).closest("label").hidden = !supported;
    }
    for (const field of ["roughness", "metalness", "tint"])
      $("#param-" + field).closest("label").hidden = state.tab !== "textures";
    setText(
      "#params-hint",
      state.tab === "textures"
        ? "材质参数作用于当前预览；颜色、粗糙度和金属度可与固定基准对比。"
        : "仅显示生成器实际读取的参数。湿润与拆解控制也可在对比中使用。",
    );
    updateOutputs();
    updateComparisonSummary();
  }
  function updateOutputs() {
    for (const name of ["doors", "wear"])
      setText(
        "#" + name + "-value",
        Math.round(+$("#param-" + name).value * 100) + "%",
      );
    for (const name of ["roughness", "metalness"])
      setText("#" + name + "-value", (+$("#param-" + name).value).toFixed(2));
  }

  function openSource(title, raw) {
    api.openSource([[title, raw]], raw);
  }
  function sourceForMaterial(material, name = material.name) {
    const spec = S.materialSpecs[name];
    if (!spec)
      return [
        [
          "材质 " + name,
          JSON.stringify(
            {
              name,
              color: material.color?.getHexString(),
              roughness: material.roughness,
              metalness: material.metalness,
            },
            null,
            2,
          ),
        ],
      ];
    const recipe = S.textureSpecs[spec.set];
    return [
      ["材质参数", JSON.stringify({ [name]: spec }, null, 2)],
      ["基础贴图配方", JSON.stringify({ [spec.set]: recipe }, null, 2)],
      ["表面生成 GLSL", S.source.textureFunctions[recipe.fn]],
    ];
  }
  function drawGraph() {
    const state = api.getState(),
      container = $("#dependency-graph");
    container.replaceChildren();
    const columns = [],
      edges = [];
    const add = (level, node) => {
      columns[level] ??= [];
      const old = columns.flat().find((x) => x.id === node.id);
      if (old) return old.id;
      columns[level].push(node);
      return node.id;
    };
    const rootId = add(0, {
      id: "asset",
      label: state.title,
      kind: "当前资产",
      raw:
        state.tab === "models"
          ? relevantSource()
          : JSON.stringify(
              { [state.selected]: S.materialSpecs[state.selected] },
              null,
              2,
            ),
    });
    if (graphMode === "calls") {
      const roots =
        state.tab === "textures"
          ? [
              { id: "Gg", raw: S.materials.toString() },
              { id: "h3", raw: S.source.materialShader.toString() },
            ]
          : state.selected === "hound"
            ? [
                { id: "Z_", raw: S.hound.toString() },
                { id: "pm", raw: S.rig.toString() },
              ]
            : state.selected === "gull"
              ? [
                  { id: "j_", raw: S.gull.toString() },
                  { id: "pm", raw: S.rig.toString() },
                ]
              : state.selected === "pac9"
                ? [{ id: "w_", raw: S.gun.toString() }]
                : [{ id: "entry", raw: relevantSource() }];
      for (const entry of roots) {
        const node = dependencies.nodes[entry.id],
          meta = dependencies.roots[key(entry.raw)];
        const id = add(1, {
          id: entry.id,
          label: node?.name || meta?.name || "道具生成入口",
          kind: "生成函数",
          raw: entry.raw,
        });
        edges.push([rootId, id]);
        for (const target of node?.calls || meta?.calls || []) {
          const dep = dependencies.nodes[target];
          if (!dep) continue;
          const helperId = add(2, {
            id: "helper-" + target,
            label: dep.name,
            kind: "共享函数 · " + target,
            raw: dep.code,
          });
          edges.push([id, helperId]);
        }
      }
      setText(
        "#graph-note",
        "箭头表示源码中的静态引用，包含函数与类；不代表每次生成都会执行的分支。展示入口及一层共享依赖。",
      );
    } else {
      const mats = new Map();
      if (state.tab === "models")
        for (const p of selectedPart ? [selectedPart] : parts)
          mats.set(p.materialName, p.material);
      else mats.set(state.selected, state.object.material);
      for (const [name, material] of mats) {
        const materialId = add(1, {
          id: "material-" + name,
          label: name,
          kind: "实际使用的材质",
          sections: sourceForMaterial(material, name),
          previewId: S.materialSpecs[name] ? name : null,
        });
        edges.push([rootId, materialId]);
        const spec = S.materialSpecs[name],
          set = material.userData.set || spec?.set;
        if (!set || !S.textureSpecs[set]) continue;
        const recipe = S.textureSpecs[set];
        const textureId = add(2, {
          id: "texture-" + set,
          label: set,
          kind: "程序化贴图配方",
          raw: JSON.stringify({ [set]: recipe }, null, 2),
        });
        edges.push([materialId, textureId]);
        const shaderId = add(3, {
          id: "shader-" + recipe.fn,
          label: recipe.fn + " / GLSL",
          kind: "颜色 · ORM · 高度 → 法线",
          raw: S.source.textureFunctions[recipe.fn],
        });
        edges.push([textureId, shaderId]);
      }
      setText(
        "#graph-note",
        selectedPart
          ? "只展示选中部件组的材质链路：" + selectedPart.name
          : "展示当前资产实际使用的材质与基础配方；发光或其他特殊材质可能不使用程序化贴图。",
      );
    }
    const graph = document.createElement("div");
    graph.className = "graph-layout";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("graph-edges");
    svg.setAttribute("aria-hidden", "true");
    graph.append(svg);
    const buttons = new Map();
    columns.forEach((nodes, level) => {
      const col = document.createElement("div");
      col.className = "graph-column";
      const heading = document.createElement("p");
      heading.textContent = (
        graphMode === "calls"
          ? ["资产", "生成入口", "共享依赖"]
          : ["资产", "材质", "贴图配方", "着色器"]
      )[level];
      col.append(heading);
      for (const node of nodes) {
        const b = document.createElement("button");
        b.className = "graph-node";
        b.dataset.nodeId = node.id;
        const title = document.createElement("strong"),
          kind = document.createElement("small");
        title.textContent = node.label;
        kind.textContent = node.kind;
        b.append(title, kind);
        b.onclick = () => {
          if (node.sections) api.openSource(node.sections, node.sections[0][1]);
          else openSource(node.label, node.raw);
        };
        const card = document.createElement("div");
        card.className = "graph-node-card";
        card.append(b);
        if (node.previewId) {
          const preview = document.createElement("button");
          preview.className = "graph-preview";
          preview.textContent = "预览此材质";
          preview.onclick = () => {
            $("#dependency-dialog").close();
            api.navigateMaterial(node.previewId);
          };
          card.append(preview);
        }
        col.append(card);
        buttons.set(node.id, b);
      }
      graph.append(col);
    });
    container.append(graph);
    requestAnimationFrame(() => {
      if (!graph.isConnected) return;
      const rect = graph.getBoundingClientRect();
      svg.setAttribute("width", graph.scrollWidth);
      svg.setAttribute("height", graph.scrollHeight);
      svg.setAttribute(
        "viewBox",
        "0 0 " + graph.scrollWidth + " " + graph.scrollHeight,
      );
      for (const [a, b] of edges) {
        const from = buttons.get(a)?.getBoundingClientRect(),
          to = buttons.get(b)?.getBoundingClientRect();
        if (!from || !to) continue;
        const x1 = from.right - rect.left,
          y1 = from.top + from.height / 2 - rect.top,
          x2 = to.left - rect.left,
          y2 = to.top + to.height / 2 - rect.top;
        const path = document.createElementNS(svg.namespaceURI, "path");
        path.setAttribute(
          "d",
          `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`,
        );
        svg.append(path);
      }
    });
  }

  for (const b of document.querySelectorAll("[data-inspector]"))
    b.onclick = () => showPanel(b.dataset.inspector);
  $("#toggle-inspector").onclick = () => {
    const open = !document.body.classList.contains("inspector-open");
    document.body.classList.toggle("inspector-open", open);
    $("#toggle-inspector").setAttribute("aria-expanded", open);
  };
  $("#explode").oninput = () => setExplosion($("#explode").value);
  const quickExplodeInput = $("#explode-quick");
  if (quickExplodeInput) {
    quickExplodeInput.oninput = () => setExplosion(quickExplodeInput.value);
  }
  $("#isolate-part").onclick = () => {
    if (!selectedPart) return;
    for (const p of parts) {
      p.visible = p === selectedPart;
      p.mesh.visible = p.visible;
    }
    renderParts();
  };
  $("#hide-part").onclick = () => {
    if (!selectedPart) return;
    const part = selectedPart;
    removeSelection();
    part.visible = false;
    part.mesh.visible = false;
    renderParts();
  };
  $("#restore-parts").onclick = () => {
    removeSelection();
    for (const part of parts) {
      part.visible = true;
      part.mesh.visible = true;
    }
    renderParts();
  };
  $("#part-source").onclick = () => {
    if (!selectedPart) return;
    api.openSource([
      ["模型构造", relevantSource()],
      ...sourceForMaterial(selectedPart.material),
    ]);
  };
  $("#compare").onclick = () => (baseline ? disposeBaseline() : snapshot());
  $("#params-compare").onclick = () => {
    if (!baseline) snapshot();
  };
  $("#refresh-baseline").onclick = snapshot;
  $("#parameter-form").onsubmit = (e) => {
    e.preventDefault();
    const state = api.getState(),
      patch = {};
    for (const field of ["seed", "doors", "wear", "roughness", "metalness"]) {
      const input = $("#param-" + field);
      if (!input.disabled && !input.closest("label").hidden)
        patch[field] = +input.value;
    }
    for (const field of ["color", "tint"]) {
      const input = $("#param-" + field);
      if (!input.disabled && !input.closest("label").hidden)
        patch[field] = input.value;
    }
    api.applyConfig(patch);
  };
  for (const name of ["doors", "wear", "roughness", "metalness"])
    $("#param-" + name).oninput = updateOutputs;
  $("#reset-params").onclick = () => api.applyConfig(api.defaultConfig());
  $("#dependencies").onclick = () => {
    $("#dependency-title").textContent = api.getState().title + " / 依赖图";
    $("#dependency-dialog").showModal();
    drawGraph();
  };
  $("#close-dependencies").onclick = () => $("#dependency-dialog").close();
  for (const b of document.querySelectorAll("[data-graph]"))
    b.onclick = () => {
      graphMode = b.dataset.graph;
      for (const btn of document.querySelectorAll("[data-graph]"))
        btn.classList.toggle("active", btn === b);
      drawGraph();
    };
  new ResizeObserver(() => {
    if ($("#dependency-dialog").open) drawGraph();
  }).observe($("#dependency-dialog"));
  return {
    detach,
    pick,
    cloneMaterial,
    setAsset(state) {
      const nextKey = state.tab + ":" + state.selected;
      if (nextKey !== assetKey) {
        disposeBaseline();
        explosion = 0;
        $("#explode").value = 0;
        setText("#explode-value", "0%");
        const quickSlider = $("#explode-quick");
        if (quickSlider) quickSlider.value = "0";
        setText("#explode-quick-value", "0%");
        assetKey = nextKey;
      }
      currentState = state;
      if (state.tab === "models") {
        collectParts(state);
        setExplosion(explosion);
      }
      renderParts();
      populateParameters();
      for (const b of document.querySelectorAll("[data-inspector]")) {
        const unavailable =
          (b.dataset.inspector === "parts" && state.tab !== "models") ||
          (b.dataset.inspector === "params" && state.tab === "sounds");
        b.hidden = unavailable;
        b.disabled = unavailable;
      }
      $("#dependencies").hidden = state.tab === "sounds";
      $("#compare").hidden = state.tab === "sounds";
      showPanel(
        document.querySelector("[data-inspector].active")?.dataset.inspector ||
          "info",
      );
    },
    updateConfig() {
      populateParameters();
    },
    render() {
      if (!baseline) return false;
      const width = $("#viewport").clientWidth,
        height = $("#viewport").clientHeight,
        half = Math.floor(width / 2);
      api.renderer.setScissorTest(true);
      api.renderer.setViewport(0, 0, half, height);
      api.renderer.setScissor(0, 0, half, height);
      api.renderer.render(baselineScene, api.camera);
      api.renderer.setViewport(half, 0, width - half, height);
      api.renderer.setScissor(half, 0, width - half, height);
      api.renderer.render(api.scene, api.camera);
      api.renderer.setScissorTest(false);
      api.renderer.setViewport(0, 0, width, height);
      return true;
    },
    get comparing() {
      return !!baseline;
    },
    setExplosion,
    get parts() {
      return parts;
    },
    get baseline() {
      return baseline;
    },
    get selectedPart() {
      return selectedPart;
    },
    dispose() {
      detach();
      disposeBaseline();
    },
  };
};

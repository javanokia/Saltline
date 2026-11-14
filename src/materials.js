// @ts-check
/**
 * ============================================================================
 * 3A-GAME Procedural PBR Material Library (materials.js)
 * 纯程序化 PBR 物理材质、GPU 程序化贴图生成、雨水湿润 Shader 补丁与警示标贴系统
 * ============================================================================
 */

import * as THREE from "three";
import {
  fullscreenVertexShader,
  surfaceShaderPrelude,
  surfaceShaderEntry,
  surfaceShaderLibrary,
  normalMapFragmentShader,
  srgbCopyFragmentShader,
} from "./materials/shaders.js";
import { createDecalFactory } from "./materials/decals.js";
import {
  TEXTURE_SPECS,
  MATERIAL_SPECS,
  FALLBACK_MATERIAL_SPEC,
  triplanarVertexCommon,
  triplanarVertexMain,
  surfaceFragmentCommon,
  surfaceMapFragment,
  surfaceRoughnessFragment,
  surfaceMetalnessFragment,
  surfaceNormalFragment,
  aoMapFragmentPatch,
} from "./materials/specs.js";

const MaterialsModule = {};
Object.defineProperties(MaterialsModule, {
  applyPatch: { get: () => applyMaterialPatch, enumerable: true },
  create: { get: () => buildMaterialsManager, enumerable: true },
  showcase: { get: () => buildMaterialsShowcase, enumerable: true },
});

export function applyMaterialPatch(material, uniforms) {
  Object.assign(material.uniforms, uniforms);
  material.vertexShader = material.vertexShader
    .replace("#include <common>", "#include <common>\n" + triplanarVertexCommon)
    .replace("#include <project_vertex>", "#include <project_vertex>\n" + triplanarVertexMain);
  material.fragmentShader = material.fragmentShader
    .replace("#include <common>", "#include <common>\n" + surfaceFragmentCommon)
    .replace("#include <map_fragment>", surfaceMapFragment)
    .replace("#include <roughnessmap_fragment>", surfaceRoughnessFragment)
    .replace("#include <metalnessmap_fragment>", surfaceMetalnessFragment)
    .replace("#include <normal_fragment_maps>", surfaceNormalFragment)
    .replace("#include <aomap_fragment>", aoMapFragmentPatch);
}

/**
 * 创建程序化 PBR 材质管理器：GPU 贴图集生成、材质缓存、雨水湿润补丁、
 * 贴花/铭牌/编号图集与展示厅支持。
 * @param {import('./types').EngineContext} engineContext
 * @returns {Promise<import('./types').MaterialsManager>}
 */
async function buildMaterialsManager(engineContext) {
  const renderer =
    engineContext.renderer || (engineContext.render && engineContext.render.renderer);
  const params = engineContext.params || {};
  const requestedTexSize =
    +(params.tex || 0) || (engineContext.quality && engineContext.quality.tex) || 1024;
  const maxBaseSize = Math.min(requestedTexSize, 1024);
  const maxAnisotropy = Math.min(
    8,
    renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1,
  );
  const sharedUniforms = { wet: { value: params.wet !== undefined ? +params.wet : 1 } };
  const statsCounters = { sets: 0, bytes: 0, ms: 0 };

  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quadMesh.frustumCulled = false;
  quadScene.add(quadMesh);

  const mrtCache = new Map();
  const bakerShaderCache = new Map();
  const textureSetCache = new Map();
  let lastGenTimestamp = 0;
  let helperShaders = null;

  const createBakerShader = (fragmentShader, uniforms) =>
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fullscreenVertexShader,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

  function getHelperShaders() {
    if (!helperShaders) {
      helperShaders = {
        normal: createBakerShader(normalMapFragmentShader, {
          tH: { value: null },
          uK: { value: new THREE.Vector2() },
          uTexel: { value: 0 },
        }),
        copy: createBakerShader(srgbCopyFragmentShader, {
          tA: { value: null },
          uSq: { value: 0 },
        }),
      };
    }
    return helperShaders;
  }

  function renderToTarget(target, shaderMat) {
    quadMesh.material = shaderMat;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, orthoCam);
  }

  function allocateChannelTarget(size, isSrgb) {
    const rt = new THREE.WebGLRenderTarget(size, size, {
      depthBuffer: false,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      anisotropy: maxAnisotropy,
      colorSpace: isSrgb ? THREE.SRGBColorSpace : THREE.NoColorSpace,
    });
    statsCounters.bytes += size * size * 4 * 1.34;
    return rt;
  }

  function resolveTexResolution(spec) {
    let size = Math.round(maxBaseSize * spec.size);
    if (spec.hero && requestedTexSize >= 2048) size = 2048;
    return Math.max(32, size);
  }

  function getOrBakeTextureSet(setKey) {
    const cached = textureSetCache.get(setKey);
    if (cached) return cached;

    const spec = TEXTURE_SPECS[setKey];
    const startMs = performance.now();
    const res = resolveTexResolution(spec);
    const tile = Array.isArray(spec.tile) ? spec.tile : [spec.tile, spec.tile];

    let mrt = mrtCache.get(res);
    if (!mrt) {
      mrt = new THREE.WebGLRenderTarget(res, res, {
        count: 3,
        depthBuffer: false,
        generateMipmaps: false,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
      });
      mrtCache.set(res, mrt);
    }

    let genMat = bakerShaderCache.get(spec.fn);
    if (!genMat) {
      genMat = createBakerShader(
        surfaceShaderPrelude + surfaceShaderLibrary[spec.fn] + surfaceShaderEntry,
        {
          uP: { value: new THREE.Vector4() },
          uSeed: { value: 0 },
          uTexel: { value: 0 },
        },
      );
      bakerShaderCache.set(spec.fn, genMat);
    }

    const pArr = spec.p || [];
    genMat.uniforms.uP.value.set(pArr[0] || 0, pArr[1] || 0, pArr[2] || 0, pArr[3] || 0);
    genMat.uniforms.uSeed.value = spec.seed || 0;
    genMat.uniforms.uTexel.value = 1 / res;

    const helpers = getHelperShaders();
    const prevTarget = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    const prevXr = renderer.xr.enabled;
    const prevShadowAuto = renderer.shadowMap.autoUpdate;

    renderer.autoClear = true;
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    renderToTarget(mrt, genMat);

    const albedoTarget = allocateChannelTarget(res, true);
    const ormTarget = allocateChannelTarget(res, false);
    const normalTarget = allocateChannelTarget(res, false);

    helpers.copy.uniforms.tA.value = mrt.textures[0];
    helpers.copy.uniforms.uSq.value = 1;
    renderToTarget(albedoTarget, helpers.copy);

    helpers.copy.uniforms.tA.value = mrt.textures[1];
    helpers.copy.uniforms.uSq.value = 0;
    renderToTarget(ormTarget, helpers.copy);

    helpers.normal.uniforms.tH.value = mrt.textures[2];
    helpers.normal.uniforms.uTexel.value = 1 / res;
    helpers.normal.uniforms.uK.value.set(
      (spec.bump * 0.001 * res) / tile[0],
      (spec.bump * 0.001 * res) / tile[1],
    );
    renderToTarget(normalTarget, helpers.normal);

    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;
    renderer.xr.enabled = prevXr;
    renderer.shadowMap.autoUpdate = prevShadowAuto;

    for (const target of [albedoTarget, ormTarget, normalTarget]) {
      target.texture.repeat.set(1 / tile[0], 1 / tile[1]);
      target.texture.name = "sl_" + setKey;
    }

    const entry = {
      key: setKey,
      albedo: albedoTarget.texture,
      orm: ormTarget.texture,
      normal: normalTarget.texture,
      tile,
      size: res,
      targets: [albedoTarget, ormTarget, normalTarget],
    };
    textureSetCache.set(setKey, entry);
    statsCounters.sets++;
    statsCounters.ms += performance.now() - startMs;
    lastGenTimestamp = performance.now();
    return entry;
  }

  function disposeTemporaryBakers() {
    for (const rt of mrtCache.values()) rt.dispose();
    mrtCache.clear();
    for (const sh of bakerShaderCache.values()) sh.dispose();
    bakerShaderCache.clear();
  }

  const materialCache = new Map();
  const warnedMissing = new Set();

  function getMaterial(name, opts = {}) {
    const cacheKey =
      name +
      "|" +
      (opts.vertexColors ? "v" : "") +
      (opts.triplanar ? "t" + (opts.scale || 1) : "") +
      (opts.doubleSide ? "d" : "") +
      (opts.interior ? "i" : "") +
      (opts.color !== undefined ? "c" + opts.color : "");
    const existing = materialCache.get(cacheKey);
    if (existing) return existing;

    let spec = MATERIAL_SPECS[name];
    if (!spec) {
      if (!warnedMissing.has(name)) {
        warnedMissing.add(name);
        console.warn(`[mats] unknown material "${name}" — using fallback`);
      }
      spec = FALLBACK_MATERIAL_SPEC;
    }

    let texSet;
    try {
      texSet = getOrBakeTextureSet(spec.set);
    } catch (err) {
      if (!warnedMissing.has("gen:" + spec.set)) {
        warnedMissing.add("gen:" + spec.set);
        console.error(`[mats] texture set "${spec.set}" failed: ${(err && err.message) || err}`);
      }
      const fallbackMat = new THREE.MeshStandardMaterial({
        color: opts.color !== undefined ? opts.color : spec.tint ? spec.color : 0x808080,
        roughness: 0.6,
        metalness: 0,
        vertexColors: !!opts.vertexColors,
      });
      fallbackMat.name = name;
      materialCache.set(cacheKey, fallbackMat);
      return fallbackMat;
    }

    const isTriplanar = !!opts.triplanar;
    const hasSurfaceFx = !spec.transparent && !spec.alphaCut;
    const mat = new THREE.MeshStandardMaterial({
      map: texSet.albedo,
      normalMap: texSet.normal,
      roughnessMap: texSet.orm,
      metalnessMap: texSet.orm,
      aoMap: texSet.orm,
      color: opts.color !== undefined ? opts.color : spec.color,
      roughness: spec.rough,
      metalness: spec.metal,
      vertexColors: !!opts.vertexColors,
    });
    mat.normalScale.set(spec.nrm, spec.nrm);
    mat.name = name;
    if (opts.doubleSide || spec.side === 2) mat.side = THREE.DoubleSide;
    if (spec.transparent) {
      mat.transparent = true;
      mat.depthWrite = false;
      mat.envMapIntensity = 1.4;
    }
    if (spec.alphaCut) mat.alphaTest = 0.5;

    mat.defines = { ...mat.defines, SL_TINT: spec.tint };
    if (isTriplanar) mat.defines.SL_TRIPLANAR = "";
    if (hasSurfaceFx) mat.defines.SL_FX = "";
    if (spec.alphaCut && !isTriplanar) mat.defines.SL_ACUT = "";

    const slUniforms = {
      uSlWet: sharedUniforms.wet,
      uSlWetP: { value: new THREE.Vector4(...spec.wet) },
      uSlMacro: { value: new THREE.Vector4(...spec.macro) },
      uSlUv: {
        value: new THREE.Vector3(
          1,
          1,
          isTriplanar ? (opts.scale || 1) / texSet.tile[0] : texSet.size,
        ),
      },
      uSlX: { value: new THREE.Vector2(opts.interior ? 0.12 : 1, 0) },
    };
    mat.userData.sl = slUniforms;
    mat.userData.set = texSet.key;
    mat.userData.tile = texSet.tile;
    if (opts.interior) mat.userData.interior = true;
    mat.onBeforeCompile = (shader) => applyMaterialPatch(shader, slUniforms);

    const progKey =
      "sl2|" +
      spec.tint +
      (isTriplanar ? "t" : "") +
      (hasSurfaceFx ? "f" : "") +
      (spec.alphaCut ? "a" : "");
    mat.customProgramCacheKey = () => progKey;
    materialCache.set(cacheKey, mat);
    return mat;
  }

  function getEmissiveMaterial(hexColor = 0xffffff, intensity = 4) {
    const key = "em|" + hexColor + "|" + intensity;
    const cached = materialCache.get(key);
    if (cached) return cached;
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(hexColor).multiplyScalar(intensity),
      toneMapped: true,
    });
    mat.name = "emissive";
    materialCache.set(key, mat);
    return mat;
  }

  const decalFactory = createDecalFactory(engineContext, maxAnisotropy);
  return {
    get: getMaterial,
    emissive: getEmissiveMaterial,
    decal: decalFactory.decal,
    label: decalFactory.label,
    number: decalFactory.number,
    names: Object.keys(MATERIAL_SPECS),
    decalNames: decalFactory.names,
    uniforms: sharedUniforms,
    update() {
      if (mrtCache.size && performance.now() - lastGenTimestamp > 4000) {
        disposeTemporaryBakers();
      }
    },
    prewarm(list) {
      for (const name of list || Object.keys(MATERIAL_SPECS)) getMaterial(name);
    },
    stats() {
      return {
        sets: statsCounters.sets,
        textureMB: +(statsCounters.bytes / 1048576).toFixed(1),
        genMs: +statsCounters.ms.toFixed(0),
        decalMB: +(decalFactory.bytes() / 1048576).toFixed(1),
      };
    },
    tileOf(name) {
      const spec = MATERIAL_SPECS[name];
      return spec ? TEXTURE_SPECS[spec.set].tile : 1;
    },
  };
}

const TRIPLANAR_SHOWCASE_MATERIALS = new Set([
  "gunmetal",
  "anodized_black",
  "polymer_black",
  "polymer_tan",
  "rubber",
  "carbon",
  "glove_fabric",
  "armor_white",
  "armor_orange",
]);

function createScaledSphereGeometry(radius) {
  const geo = new THREE.SphereGeometry(radius, 48, 32);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * 2 * Math.PI * radius, uv.getY(i) * Math.PI * radius);
  }
  return geo;
}

function createScaledPlaneGeometry(width, height) {
  const geo = new THREE.PlaneGeometry(width, height);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * width, uv.getY(i) * height);
  }
  return geo;
}

function buildMaterialsShowcase(engineContext) {
  const mats = engineContext.mats;
  const group = new THREE.Group();
  engineContext.scene.add(group);

  const filterList = engineContext.params.only
    ? String(engineContext.params.only).split(",").filter(Boolean)
    : null;
  const showDecals = !filterList || filterList.includes("decals");
  const matNames = filterList ? filterList.filter((name) => name !== "decals") : mats.names;
  const cols = filterList ? Math.max(1, matNames.length) : 10;
  const colSpacing = 1.9;
  const rowSpacing = 3.6;

  const sphereGeo = createScaledSphereGeometry(0.42);
  const wallGeo = createScaledPlaneGeometry(1.5, 1.5);
  const floorGeo = createScaledPlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2);

  const placeMesh = (geo, mat, x, y, z) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  matNames.forEach((name, idx) => {
    const x = ((idx % cols) - (cols - 1) / 2) * colSpacing;
    const z = -Math.floor(idx / cols) * rowSpacing;
    const mat = mats.get(
      name,
      name.startsWith("glass") || name === "chainlink" ? { doubleSide: true } : {},
    );
    placeMesh(wallGeo, mat, x, 0.76, z);
    placeMesh(floorGeo, mat, x, 0.012, z + 1.1);
    placeMesh(
      sphereGeo,
      TRIPLANAR_SHOWCASE_MATERIALS.has(name) ? mats.get(name, { triplanar: true }) : mat,
      x,
      0.46,
      z + 1.25,
    );
  });

  let camPos;
  let targetPos;
  const totalWidth = cols * colSpacing;

  if (filterList && matNames.length) {
    camPos = [0.25 * totalWidth, 1.5, 2.6 + totalWidth * 0.42];
    targetPos = [0, 0.62, 0.5];
  } else {
    camPos = [0, 9.5, 12];
    targetPos = [0, 0, -7];
  }

  if (showDecals) {
    const boardX = filterList && !matNames.length ? 0 : totalWidth / 2 + 5.5;
    const boardW = 8.4;
    const boardH = 3.3;
    placeMesh(
      createScaledPlaneGeometry(boardW, boardH),
      mats.get("paint_blue"),
      boardX,
      boardH / 2,
      -1,
    );
    const concreteBoard = placeMesh(
      createScaledPlaneGeometry(boardW, boardH),
      mats.get("concrete"),
      boardX,
      boardH / 2,
      -1.01,
    );
    concreteBoard.position.x += boardW;

    const decalList = mats.decalNames;
    let curX = -boardW / 2 + 0.25;
    let curY = boardH - 0.75;
    const rowH = 0.62;

    const placeDecalEntry = (entry, height) => {
      const width = height * entry.aspect;
      if (curX + width > boardW * 1.5 - 0.2) return;
      if (curX < boardW / 2 && curX + width > boardW / 2 - 0.15) curX = boardW / 2 + 0.25;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), entry.material);
      mesh.position.set(boardX + curX + width / 2, curY + height / 2, -0.996);
      mesh.renderOrder = 2;
      group.add(mesh);
      curX += width + 0.14;
    };

    [decalList.slice(0, 9), decalList.slice(9, 17), decalList.slice(17)].forEach(
      (slice, rowIdx) => {
        curX = -boardW / 2 + 0.25;
        curY = boardH - 0.75 - rowIdx * 0.78;
        slice.forEach((decalName) => placeDecalEntry(mats.decal(decalName), rowH));
      },
    );

    curX = -boardW / 2 + 0.25;
    curY = boardH - 0.75 - 3 * 0.78 - 0.05;
    placeDecalEntry(mats.label("SALTLINE TERMINAL  B4-0271", { color: "white" }), 0.3);
    placeDecalEntry(mats.label("MAX GROSS 30480 KG", { color: "yellow", distress: 0.6 }), 0.22);
    placeDecalEntry(mats.label("DANGER", { color: "red", distress: 0.2 }), 0.3);
    placeDecalEntry(mats.label("KEEP CLEAR", { color: "black", font: "sans" }), 0.25);
    placeDecalEntry(mats.number(4), 0.3);
    placeDecalEntry(mats.number(7), 0.3);

    if (filterList && !matNames.length) {
      camPos = [boardW / 2, 1.7, 7.2];
      targetPos = [boardW / 2, 1.6, -1];
    }
  }

  if (engineContext.params.wet !== undefined) {
    mats.uniforms.wet.value = +engineContext.params.wet;
  }
  console.log("[mats] " + JSON.stringify(mats.stats()));
  return { cam: camPos, target: targetPos, update() {} };
}

export const applyPatch = applyMaterialPatch;
export const create = buildMaterialsManager;
export const showcase = buildMaterialsShowcase;
export {
  MaterialsModule as qg,
  surfaceShaderLibrary,
  surfaceShaderPrelude,
  surfaceShaderEntry,
  normalMapFragmentShader,
  TEXTURE_SPECS,
  MATERIAL_SPECS,
};

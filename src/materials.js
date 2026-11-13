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
  heightToNormalFragmentShader,
  normalMapFragmentShader,
  srgbCopyFragmentShader,
} from "./materials/shaders.js";
import {
  createDecalFactory,
  stencilFontStack,
  sansFontStack,
  monoFontStack,
  PALETTE,
  rgba,
} from "./materials/decals.js";
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

// Three.js 紧凑别名
const Vector3 = THREE.Vector3;
const Vector2 = THREE.Vector2;
const Vector4 = THREE.Vector4;
const Color = THREE.Color;
const Group = THREE.Group;
const Mesh = THREE.Mesh;
const PlaneGeometry = THREE.PlaneGeometry;
const SphereGeometry = THREE.SphereGeometry;
const OrthographicCamera = THREE.OrthographicCamera;
const Scene = THREE.Scene;
const WebGLRenderTarget = THREE.WebGLRenderTarget;
const MeshStandardMaterial = THREE.MeshStandardMaterial;
const MeshBasicMaterial = THREE.MeshBasicMaterial;
const RawShaderMaterial = THREE.RawShaderMaterial;
const CanvasTexture = THREE.CanvasTexture;
const ShaderChunk = THREE.ShaderChunk;
const GLSL3 = THREE.GLSL3;
const DoubleSide = THREE.DoubleSide;
const LinearMipmapLinearFilter = THREE.LinearMipmapLinearFilter;
const NearestFilter = THREE.NearestFilter;
const LinearFilter = THREE.LinearFilter;
const RepeatWrapping = THREE.RepeatWrapping;
const SRGBColorSpace = THREE.SRGBColorSpace;
const NoColorSpace = THREE.NoColorSpace;

var MaterialsModule = {};
const defineProperty = Object.defineProperty;
const defineGetters = (i, e) => {
  for (var t in e) defineProperty(i, t, { get: e[t], enumerable: true });
};
defineGetters(MaterialsModule, {
  applyPatch: () => applyMaterialPatch,
  create: () => buildMaterialsManager,
  showcase: () => buildMaterialsShowcase,
});

function applyMaterialPatch(material, uniforms) {
  (Object.assign(material.uniforms, uniforms),
    (material.vertexShader = material.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
` + triplanarVertexCommon,
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
` + triplanarVertexMain,
      )),
    (material.fragmentShader = material.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
` + surfaceFragmentCommon,
      )
      .replace("#include <map_fragment>", surfaceMapFragment)
      .replace("#include <roughnessmap_fragment>", surfaceRoughnessFragment)
      .replace("#include <metalnessmap_fragment>", surfaceMetalnessFragment)
      .replace("#include <normal_fragment_maps>", surfaceNormalFragment)
      .replace("#include <aomap_fragment>", aoMapFragmentPatch)));
}
/**
 * 创建程序化 PBR 材质管理器：GPU 贴图集生成、材质缓存、雨水湿润补丁、
 * 贴花/铭牌/编号图集与展示厅支持。
 * @param {import('./types').EngineContext} engineContext
 * @returns {Promise<import('./types').MaterialsManager>}
 */
async function buildMaterialsManager(engineContext) {
  let e = engineContext.renderer || (engineContext.render && engineContext.render.renderer),
    t = engineContext.params || {},
    n = +(t.tex || 0) || (engineContext.quality && engineContext.quality.tex) || 1024,
    s = Math.min(n, 1024),
    o = Math.min(8, e.capabilities.getMaxAnisotropy ? e.capabilities.getMaxAnisotropy() : 1),
    r = { wet: { value: t.wet !== void 0 ? +t.wet : 1 } },
    a = { sets: 0, bytes: 0, ms: 0 },
    l = new OrthographicCamera(-1, 1, 1, -1, 0, 1),
    c = new Scene(),
    u = new Mesh(new PlaneGeometry(2, 2));
  ((u.frustumCulled = !1), c.add(u));
  let h = new Map(),
    f = new Map(),
    p = new Map(),
    d = 0,
    v = null,
    g = (O, q) =>
      new RawShaderMaterial({
        glslVersion: GLSL3,
        vertexShader: fullscreenVertexShader,
        fragmentShader: O,
        uniforms: q,
        depthTest: !1,
        depthWrite: !1,
      });
  function x() {
    return (
      v ||
        (v = {
          normal: g(normalMapFragmentShader, {
            tH: { value: null },
            uK: { value: new Vector2() },
            uTexel: { value: 0 },
          }),
          copy: g(srgbCopyFragmentShader, { tA: { value: null }, uSq: { value: 0 } }),
        }),
      v
    );
  }
  function y(O, q) {
    ((u.material = q), e.setRenderTarget(O), e.render(c, l));
  }
  function b(O, q) {
    let U = new WebGLRenderTarget(O, O, {
      depthBuffer: !1,
      generateMipmaps: !0,
      minFilter: LinearMipmapLinearFilter,
      magFilter: LinearFilter,
      wrapS: RepeatWrapping,
      wrapT: RepeatWrapping,
      anisotropy: o,
      colorSpace: q ? SRGBColorSpace : NoColorSpace,
    });
    return ((a.bytes += O * O * 4 * 1.34), U);
  }
  function m(O) {
    let q = Math.round(s * O.size);
    return (O.hero && n >= 2048 && (q = 2048), Math.max(32, q));
  }
  function A(O) {
    let q = p.get(O);
    if (q) return q;
    let U = TEXTURE_SPECS[O],
      T = performance.now(),
      D = m(U),
      C = Array.isArray(U.tile) ? U.tile : [U.tile, U.tile],
      G = h.get(D);
    G ||
      ((G = new WebGLRenderTarget(D, D, {
        count: 3,
        depthBuffer: !1,
        generateMipmaps: !1,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        wrapS: RepeatWrapping,
        wrapT: RepeatWrapping,
      })),
      h.set(D, G));
    let j = f.get(U.fn);
    j ||
      ((j = g(surfaceShaderPrelude + surfaceShaderLibrary[U.fn] + surfaceShaderEntry, {
        uP: { value: new Vector4() },
        uSeed: { value: 0 },
        uTexel: { value: 0 },
      })),
      f.set(U.fn, j));
    let N = U.p || [];
    (j.uniforms.uP.value.set(N[0] || 0, N[1] || 0, N[2] || 0, N[3] || 0),
      (j.uniforms.uSeed.value = U.seed || 0),
      (j.uniforms.uTexel.value = 1 / D));
    let Q = x(),
      K = e.getRenderTarget(),
      autoClear = e.autoClear,
      F = e.xr.enabled,
      X = e.shadowMap.autoUpdate;
    ((e.autoClear = !0), (e.xr.enabled = !1), (e.shadowMap.autoUpdate = !1), y(G, j));
    let albedoTarget = b(D, !0),
      ormTarget = b(D, !1),
      $ = b(D, !1);
    ((Q.copy.uniforms.tA.value = G.textures[0]),
      (Q.copy.uniforms.uSq.value = 1),
      y(albedoTarget, Q.copy),
      (Q.copy.uniforms.tA.value = G.textures[1]),
      (Q.copy.uniforms.uSq.value = 0),
      y(ormTarget, Q.copy),
      (Q.normal.uniforms.tH.value = G.textures[2]),
      (Q.normal.uniforms.uTexel.value = 1 / D),
      Q.normal.uniforms.uK.value.set((U.bump * 0.001 * D) / C[0], (U.bump * 0.001 * D) / C[1]),
      y($, Q.normal),
      e.setRenderTarget(K),
      (e.autoClear = autoClear),
      (e.xr.enabled = F),
      (e.shadowMap.autoUpdate = X));
    for (let target of [albedoTarget, ormTarget, $])
      (target.texture.repeat.set(1 / C[0], 1 / C[1]), (target.texture.name = "sl_" + O));
    return (
      (q = {
        key: O,
        albedo: albedoTarget.texture,
        orm: ormTarget.texture,
        normal: $.texture,
        tile: C,
        size: D,
        targets: [albedoTarget, ormTarget, $],
      }),
      p.set(O, q),
      a.sets++,
      (a.ms += performance.now() - T),
      (d = performance.now()),
      q
    );
  }
  function _() {
    for (let O of h.values()) O.dispose();
    h.clear();
    for (let O of f.values()) O.dispose();
    f.clear();
  }
  let M = new Map(),
    E = new Set();
  function w(O, q = {}) {
    let U =
        O +
        "|" +
        (q.vertexColors ? "v" : "") +
        (q.triplanar ? "t" + (q.scale || 1) : "") +
        (q.doubleSide ? "d" : "") +
        (q.interior ? "i" : "") +
        (q.color !== void 0 ? "c" + q.color : ""),
      T = M.get(U);
    if (T) return T;
    let D = MATERIAL_SPECS[O];
    D ||
      (E.has(O) || (E.add(O), console.warn(`[mats] unknown material "${O}" \u2014 using fallback`)),
      (D = FALLBACK_MATERIAL_SPEC));
    let C;
    try {
      C = A(D.set);
    } catch (K) {
      return (
        E.has("gen:" + D.set) ||
          (E.add("gen:" + D.set),
          console.error(`[mats] texture set "${D.set}" failed: ${(K && K.message) || K}`)),
        (T = new MeshStandardMaterial({
          color: q.color !== void 0 ? q.color : D.tint ? D.color : 8421504,
          roughness: 0.6,
          metalness: 0,
          vertexColors: !!q.vertexColors,
        })),
        (T.name = O),
        M.set(U, T),
        T
      );
    }
    let G = !!q.triplanar,
      j = !D.transparent && !D.alphaCut;
    ((T = new MeshStandardMaterial({
      map: C.albedo,
      normalMap: C.normal,
      roughnessMap: C.orm,
      metalnessMap: C.orm,
      aoMap: C.orm,
      color: q.color !== void 0 ? q.color : D.color,
      roughness: D.rough,
      metalness: D.metal,
      vertexColors: !!q.vertexColors,
    })),
      T.normalScale.set(D.nrm, D.nrm),
      (T.name = O),
      (q.doubleSide || D.side === 2) && (T.side = DoubleSide),
      D.transparent && ((T.transparent = !0), (T.depthWrite = !1), (T.envMapIntensity = 1.4)),
      D.alphaCut && (T.alphaTest = 0.5),
      (T.defines = { ...T.defines, SL_TINT: D.tint }),
      G && (T.defines.SL_TRIPLANAR = ""),
      j && (T.defines.SL_FX = ""),
      D.alphaCut && !G && (T.defines.SL_ACUT = ""));
    let N = {
      uSlWet: r.wet,
      uSlWetP: { value: new Vector4(...D.wet) },
      uSlMacro: { value: new Vector4(...D.macro) },
      uSlUv: { value: new Vector3(1, 1, G ? (q.scale || 1) / C.tile[0] : C.size) },
      uSlX: { value: new Vector2(q.interior ? 0.12 : 1, 0) },
    };
    ((T.userData.sl = N),
      (T.userData.set = C.key),
      (T.userData.tile = C.tile),
      q.interior && (T.userData.interior = !0),
      (T.onBeforeCompile = (K) => applyMaterialPatch(K, N)));
    let Q = "sl2|" + D.tint + (G ? "t" : "") + (j ? "f" : "") + (D.alphaCut ? "a" : "");
    return ((T.customProgramCacheKey = () => Q), M.set(U, T), T);
  }
  function S(O = 16777215, q = 4) {
    let U = "em|" + O + "|" + q;
    if (M.has(U)) return M.get(U);
    let T = new MeshBasicMaterial({ color: new Color(O).multiplyScalar(q), toneMapped: !0 });
    return ((T.name = "emissive"), M.set(U, T), T);
  }
  let z = createDecalFactory(engineContext, o);
  return {
    get: w,
    emissive: S,
    decal: z.decal,
    label: z.label,
    number: z.number,
    names: Object.keys(MATERIAL_SPECS),
    decalNames: z.names,
    uniforms: r,
    update(O) {
      h.size && performance.now() - d > 4e3 && _();
    },
    prewarm(O) {
      for (let q of O || Object.keys(MATERIAL_SPECS)) w(q);
    },
    stats() {
      return {
        sets: a.sets,
        textureMB: +(a.bytes / 1048576).toFixed(1),
        genMs: +a.ms.toFixed(0),
        decalMB: +(z.bytes() / 1048576).toFixed(1),
      };
    },
    tileOf(O) {
      let q = MATERIAL_SPECS[O];
      return q ? TEXTURE_SPECS[q.set].tile : 1;
    },
  };
}
var TRIPLANAR_SHOWCASE_MATERIALS = new Set([
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
  let e = new SphereGeometry(radius, 48, 32),
    t = e.attributes.uv;
  for (let n = 0; n < t.count; n++)
    t.setXY(n, t.getX(n) * 2 * Math.PI * radius, t.getY(n) * Math.PI * radius);
  return e;
}
function createScaledPlaneGeometry(width, height) {
  let t = new PlaneGeometry(width, height),
    n = t.attributes.uv;
  for (let s = 0; s < n.count; s++) n.setXY(s, n.getX(s) * width, n.getY(s) * height);
  return t;
}
function buildMaterialsShowcase(engineContext) {
  let e = engineContext.mats,
    t = new Group();
  engineContext.scene.add(t);
  let n = engineContext.params.only
      ? String(engineContext.params.only).split(",").filter(Boolean)
      : null,
    s = !n || n.includes("decals"),
    o = n ? n.filter((g) => g !== "decals") : e.names,
    r = n ? Math.max(1, o.length) : 10,
    a = 1.9,
    l = 3.6,
    c = createScaledSphereGeometry(0.42),
    u = createScaledPlaneGeometry(1.5, 1.5),
    h = createScaledPlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2),
    f = (g, x, y, b, m) => {
      let A = new Mesh(g, x);
      return (A.position.set(y, b, m), (A.castShadow = A.receiveShadow = !0), t.add(A), A);
    };
  o.forEach((g, x) => {
    let y = ((x % r) - (r - 1) / 2) * a,
      b = -Math.floor(x / r) * l,
      m = e.get(g, g.startsWith("glass") || g === "chainlink" ? { doubleSide: !0 } : {});
    (f(u, m, y, 0.76, b),
      f(h, m, y, 0.012, b + 1.1),
      f(
        c,
        TRIPLANAR_SHOWCASE_MATERIALS.has(g) ? e.get(g, { triplanar: !0 }) : m,
        y,
        0.46,
        b + 1.25,
      ));
  });
  let p,
    d,
    v = r * a;
  if (
    (n && o.length
      ? ((p = [0.25 * v, 1.5, 2.6 + v * 0.42]), (d = [0, 0.62, 0.5]))
      : ((p = [0, 9.5, 12]), (d = [0, 0, -7])),
    s)
  ) {
    let g = n && !o.length ? 0 : v / 2 + 5.5,
      x = 8.4,
      y = 3.3,
      b = f(createScaledPlaneGeometry(x, y), e.get("paint_blue"), g, y / 2, -1),
      m = f(createScaledPlaneGeometry(x, y), e.get("concrete"), g, y / 2, -1.01);
    m.position.x += x;
    let A = e.decalNames,
      _ = -x / 2 + 0.25,
      M = y - 0.75,
      E = 0.62,
      w = (z, H, O) => {
        let q = H * z.aspect;
        if (_ + q > x * 1.5 - 0.2) return;
        _ < x / 2 && _ + q > x / 2 - 0.15 && (_ = x / 2 + 0.25);
        let U = new Mesh(new PlaneGeometry(q, H), z.material);
        (U.position.set(g + _ + q / 2, M + H / 2, -0.996),
          (U.renderOrder = 2),
          t.add(U),
          (_ += q + 0.14));
      };
    ([A.slice(0, 9), A.slice(9, 17), A.slice(17)].forEach((z, H) => {
      ((_ = -x / 2 + 0.25), (M = y - 0.75 - H * 0.78), z.forEach((O) => w(e.decal(O), E)));
    }),
      (_ = -x / 2 + 0.25),
      (M = y - 0.75 - 3 * 0.78 - 0.05),
      w(e.label("SALTLINE TERMINAL  B4-0271", { color: "white" }), 0.3),
      w(e.label("MAX GROSS 30480 KG", { color: "yellow", distress: 0.6 }), 0.22),
      w(e.label("DANGER", { color: "red", distress: 0.2 }), 0.3),
      w(e.label("KEEP CLEAR", { color: "black", font: "sans" }), 0.25),
      w(e.number(4), 0.3),
      w(e.number(7), 0.3),
      n && !o.length && ((p = [x / 2, 1.7, 7.2]), (d = [x / 2, 1.6, -1])));
  }
  return (
    engineContext.params.wet !== void 0 && (e.uniforms.wet.value = +engineContext.params.wet),
    console.log("[mats] " + JSON.stringify(e.stats())),
    { cam: p, target: d, update() {} }
  );
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

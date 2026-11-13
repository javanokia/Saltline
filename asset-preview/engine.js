// @ts-check
/**
 * @file asset-preview/engine.js
 * @description 资产工坊核心适配引擎 (ESM 模块化统一架构)
 * 直接导入游戏 src/ 核心模块，100% 共享模型、材质、着色器与音效源码
 */

import * as THREE from "three";
import { GLTFExporter } from "../node_modules/three/examples/jsm/exporters/GLTFExporter.js";

import {
  create as buildMaterialsManager,
  applyPatch as applyMaterialPatch,
  showcase as buildMaterialsShowcase,
  surfaceShaderLibrary,
  surfaceShaderPrelude,
  surfaceShaderEntry,
  normalMapFragmentShader,
  TEXTURE_SPECS,
  MATERIAL_SPECS,
} from "../src/materials.js";

import {
  createPropsManager,
  PROP_SIZES,
  PROP_BUILDERS,
  prototypeCache,
} from "../src/props.js";

import {
  buildPac9Geometries,
  pac9RainUniform,
  PAC9_HELPERS,
} from "../src/weapons/pac9_model.js";

import { create as createWeaponController } from "../src/weapon.js";

import {
  buildHoundRig,
  createHound,
  solveLegIK,
} from "../src/enemies/hound.js";

import {
  buildGullRig,
  createGull,
} from "../src/enemies/gull.js";

import { SkeletonRig, createSkinnedMesh } from "../src/enemies/rig.js";
import { SOUND_REGISTRY } from "../src/audio/sounds.js";
import {
  applyBoundaryFade,
  getPeakAmplitude,
  scaleBuffer,
  createPrng,
  hashFnv1a,
  setAudioObservers,
} from "../src/audio/dsp.js";
import { mergeGeometries, setGeometryMergeObserver } from "../src/geo.js";

// ============================================================================
// 一、 3D 几何装配捕获与分析追踪器 (Geometry Tracer)
// ============================================================================

let assetGeometryCapture = null;

// 监听 SkeletonRig 构件添加与合并
const originalRigAdd = SkeletonRig.prototype.add;
SkeletonRig.prototype.add = function (...args) {
  const result = originalRigAdd.apply(this, args);
  if (assetGeometryCapture) {
    const slotGeo = this.slots[args[0]]?.at(-1);
    if (slotGeo) {
      assetGeometryCapture.parts.push({
        owner: this,
        slot: args[0],
        bone: args[1],
        geometry: slotGeo,
      });
    }
  }
  return result;
};

const originalRigBuild = SkeletonRig.prototype.build;
SkeletonRig.prototype.build = function (...args) {
  const result = originalRigBuild.apply(this, args);
  if (assetGeometryCapture) {
    assetGeometryCapture.definitions.set(result, this);
  }
  return result;
};

// 监听底层几何体合并
setGeometryMergeObserver((output, inputs) => {
  if (assetGeometryCapture) {
    assetGeometryCapture.merges.set(output, inputs.filter(Boolean));
  }
});

function traceAssetGeometry(id, game, options = {}) {
  const capture = { parts: [], merges: new Map(), definitions: new Map() };
  prototypeCache.clear();
  assetGeometryCapture = capture;
  let result;
  try {
    result =
      id === "hound"
        ? buildHoundRig()
        : id === "gull"
          ? buildGullRig()
          : id === "pac9"
            ? buildPac9Geometries()
            : game.props.build(id, options);
  } finally {
    assetGeometryCapture = null;
    prototypeCache.clear();
  }

  const records = [];
  const bones = result.bones || [];
  const owner = capture.definitions.get(result);

  if (owner) {
    for (const part of capture.parts.filter((p) => p.owner === owner)) {
      records.push({
        geometry: part.geometry.clone(),
        slot: part.slot,
        bone: part.bone,
        operation: "RigGeometryBuilder.add",
        matrix: new THREE.Matrix4(),
      });
    }
  } else {
    const visit = (geometry, slot, matrix, seen = new Set()) => {
      if (seen.has(geometry)) return;
      seen.add(geometry);
      const inputs = capture.merges.get(geometry);
      if (inputs?.length) {
        for (const input of inputs) visit(input, slot, matrix, new Set(seen));
      } else {
        records.push({
          geometry: geometry.clone(),
          slot,
          operation: inputs ? "merge" : "合并输入或最终部件组",
          matrix: matrix.clone(),
        });
      }
    };
    if (id === "pac9") {
      for (const [slot, geometry] of Object.entries(result)) {
        if (geometry?.isBufferGeometry) visit(geometry, slot, new THREE.Matrix4());
      }
    }
    if (result?.isObject3D) {
      result.updateMatrixWorld(true);
      result.traverse((mesh) => {
        if (mesh.isMesh) visit(mesh.geometry, mesh.material.name || "material", mesh.matrixWorld);
      });
    }
  }

  const owned = new Set();
  for (const part of capture.parts) owned.add(part.geometry);
  for (const geometry of capture.merges.keys()) owned.add(geometry);
  for (const inputs of capture.merges.values()) for (const geometry of inputs) owned.add(geometry);
  if (result.geometry) owned.add(result.geometry);
  if (result.extra?.geometry) owned.add(result.extra.geometry);
  if (result?.isObject3D) {
    result.traverse((mesh) => {
      if (mesh.isMesh) owned.add(mesh.geometry);
    });
  }
  for (const geometry of owned) geometry.dispose();

  return {
    records,
    bones,
    mode: owner ? "真实骨骼零件添加顺序" : "实际合并输入的装配顺序",
    source:
      id === "hound"
        ? buildHoundRig.toString()
        : id === "gull"
          ? buildGullRig.toString()
          : id === "pac9"
            ? buildPac9Geometries.toString()
            : PROP_BUILDERS[id]?.toString() || "",
    mergeCount: capture.merges.size,
  };
}

// ============================================================================
// 二、 Web Audio 声音合成分析与声层追踪器 (Audio Tracer)
// ============================================================================

let assetAudioCapture = null;

setAudioObservers({
  onMix: (target, input, time, gain, sampleRate, circular) => {
    if (!assetAudioCapture) return;
    let entries = assetAudioCapture.mixes.get(target);
    if (!entries) {
      entries = [];
      assetAudioCapture.mixes.set(target, entries);
    }
    if (entries.length >= 64 || assetAudioCapture.total >= 256) {
      assetAudioCapture.truncated = true;
      return;
    }
    assetAudioCapture.total++;
    entries.push({
      samples: input.slice(),
      time,
      gain,
      sampleRate,
      circular,
      ...(assetAudioCapture.labels.get(input) || { kind: "合成子片段", detail: "原生成器混入的采样" }),
    });
  },
  onTag: (buffer, description) => {
    if (assetAudioCapture && buffer instanceof Float32Array) {
      assetAudioCapture.labels.set(buffer, description);
    }
  },
});

function normalizeSoundAudio(spec, raw, sampleRate) {
  const channels = Array.isArray(raw) ? raw : [raw];
  if (!spec.loop) {
    for (const channel of channels) {
      applyBoundaryFade(channel, sampleRate, spec.ir ? 0 : 3e-4, spec.ir ? 0.05 : 0.012);
    }
  }
  let maxPeak = 0;
  for (const channel of channels) {
    maxPeak = Math.max(maxPeak, getPeakAmplitude(channel));
  }
  const scale = maxPeak > 0 ? spec.peak / maxPeak : 1;
  for (const channel of channels) {
    scaleBuffer(channel, scale);
  }
  return { sr: sampleRate, ch: channels, loop: !!spec.loop };
}

function synthSound(id, variant = 0, sampleRateOverride) {
  const spec = SOUND_REGISTRY[id];
  if (!spec) return null;
  const sampleRate = sampleRateOverride || spec.sr;
  const v = variant % spec.n;
  const rng = createPrng(hashFnv1a(id) + v * 7919);
  let raw = spec.gen(sampleRate, rng, v);
  if (raw && typeof raw.next === "function") {
    let stepResult;
    do {
      stepResult = raw.next();
    } while (!stepResult.done);
    raw = stepResult.value;
  }
  return normalizeSoundAudio(spec, raw, sampleRate);
}

function synthSteps(id, variant = 0, sampleRateOverride) {
  const spec = SOUND_REGISTRY[id];
  if (!spec) return null;
  const sampleRate = sampleRateOverride || spec.sr;
  const v = variant % spec.n;
  const rng = createPrng(hashFnv1a(id) + v * 7919);
  let raw = spec.gen(sampleRate, rng, v);
  let doneAudio = null;
  return {
    step() {
      if (doneAudio) return doneAudio;
      if (raw && typeof raw.next === "function") {
        const stepResult = raw.next();
        if (!stepResult.done) return null;
        raw = stepResult.value;
      }
      return (doneAudio = normalizeSoundAudio(spec, raw, sampleRate));
    },
  };
}

function traceAssetAudio(id, variant = 0) {
  const spec = SOUND_REGISTRY[id];
  const sampleRate = spec.sr;
  const index = variant % spec.n;
  const capture = { mixes: new Map(), labels: new WeakMap(), total: 0, truncated: false };
  let iterator = null,
    raw = null,
    result = null,
    started = false;

  return {
    step() {
      if (result) return result;
      assetAudioCapture = capture;
      try {
        if (!started) {
          started = true;
          raw = spec.gen(sampleRate, createPrng(hashFnv1a(id) + index * 7919), index);
          if (raw && typeof raw.next === "function") {
            iterator = raw;
            raw = null;
          }
        }
        if (iterator) {
          const next = iterator.next();
          if (!next.done) return null;
          raw = next.value;
          iterator = null;
        }
        const channels = Array.isArray(raw) ? raw : [raw];
        const layers = [];
        channels.forEach((channel, channelIndex) => {
          const entries = capture.mixes.get(channel) || [];
          entries.forEach((entry, mixIndex) => {
            layers.push({
              ...entry,
              channel: channelIndex,
              id: channelIndex + ":" + mixIndex,
              length: channel.length,
            });
          });
        });
        const audio = normalizeSoundAudio(spec, raw, sampleRate);
        result = { audio, layers, truncated: capture.truncated, channels: channels.length };
        return result;
      } finally {
        assetAudioCapture = null;
      }
    },
  };
}

// ============================================================================
// 三、 3D 模型骨骼与视模动态沙盒控制器 (Animation Studio Controller)
// ============================================================================

async function createAssetAnimation(id, game) {
  if (!["hound", "gull", "pac9"].includes(id)) return null;

  let randomState = 4207;
  const seeded = () => {
    randomState |= 0;
    randomState = (randomState + 1831565813) | 0;
    let value = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  seeded.fork = () => {
    let seed = 9001;
    return () => {
      seed |= 0;
      seed = (seed + 1831565813) | 0;
      let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  };

  const sharedMaterials = new Set(),
    sharedTextures = new Set();
  const remember = (material) => {
    if (!material) return material;
    sharedMaterials.add(material);
    for (const value of Object.values(material)) {
      if (value?.isTexture) sharedTextures.add(value);
    }
    return material;
  };

  const materials = Object.create(game.mats);
  for (const method of ["get", "emissive"]) {
    materials[method] = (...args) => remember(game.mats[method](...args));
  }
  for (const method of ["label", "decal", "number"]) {
    materials[method] = (...args) => {
      const res = game.mats[method](...args);
      remember(res.material || res);
      return res;
    };
  }

  const noop = () => {},
    camera = new THREE.PerspectiveCamera(74, 1, 0.01, 100),
    viewCamera = new THREE.PerspectiveCamera(54, 1, 0.01, 100);

  const input = {
    fire: false,
    ads: false,
    move: { x: 0, y: 0 },
    look: { dx: 0, dy: 0 },
    pressed: () => false,
  };

  const player = {
    alive: true,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    eye: new THREE.Vector3(0, 1.68, 0),
    onGround: true,
    speed: 0,
    sprinting: false,
    crouching: false,
    addRecoil: noop,
    addShake: noop,
  };

  const context = {
    ...game,
    mats: materials,
    camera,
    viewCamera,
    input,
    player: null,
    rng: seeded,
    time: { t: 0, dt: 0 },
    events: { emit: noop },
    audio: null,
    physics: { groundHeight: () => 0, raycast: () => null, lineOfSight: () => false },
    combat: { playerShot: () => null },
    fx: {
      tracer: noop,
      shell: noop,
      smoke: noop,
      sparks: noop,
      debris: noop,
      muzzleFlash: noop,
    },
  };

  const manager = {
    G: context,
    rng: seeded,
    t: 0,
    playerSpeed: 0,
    mergeSimple: (geometries) => mergeGeometries(geometries, false),
    think: noop,
    provoke: noop,
    rally: noop,
    releaseToken: noop,
    requestToken: () => false,
    fireBolt: noop,
    addWreck: noop,
    retire: noop,
  };

  const root = new THREE.Group();
  root.name = "asset-animation-" + id;

  let actor = null,
    weapon = null,
    mesh = null,
    skeleton = null,
    mode = "",
    time = 0,
    restBones = [],
    sources = [],
    oldWet = pac9RainUniform.value,
    extraMaterials = [];

  if (id === "pac9") {
    context.player = player;
    weapon = await createWeaponController(context);
    root.add(weapon.root);
    weapon.root.traverse((object) => object.layers.set(0));
    weapon.previewReset();
    weapon.update(0);
    root.quaternion.copy(weapon.root.quaternion).invert();
    root.position.copy(weapon.root.position).negate().applyQuaternion(root.quaternion);
    sources = [
      ["原始武器驱动", weapon.update.toString()],
      ["原始换弹入口", weapon.reloadNow.toString()],
    ];
  } else {
    const glow = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true }),
      lensBase = new THREE.MeshBasicMaterial({ color: 0xffb347 }),
      disc = new THREE.MeshBasicMaterial({
        color: 0x0c1017,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      cone = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

    extraMaterials = [glow, lensBase, disc, cone];
    const slots = {
      shell: materials.get("armor_white", { triplanar: true, vertexColors: true }),
      metal: materials.get("gunmetal", { triplanar: true, vertexColors: true }),
      glow,
      lensBase,
      disc,
      cone,
    };

    actor = id === "hound" ? createHound(manager, buildHoundRig(), slots, 0) : createGull(manager, buildGullRig(), slots, 0);
    root.add(actor.rig.group);
    mesh = actor.rig.mesh;
    skeleton = actor.rig.skeleton;
    restBones = skeleton.bones.map((bone) => ({
      bone,
      position: bone.position.clone(),
      quaternion: bone.quaternion.clone(),
      scale: bone.scale.clone(),
    }));

    sources =
      id === "hound"
        ? [
            ["原始姿态与腿部 IK", actor.previewPose.toString()],
            ["原始步态调度", actor.previewGait.toString()],
            ["原始三关节 IK", solveLegIK.toString()],
          ]
        : [
            ["原始无人机运动与骨骼驱动", actor._update.toString()],
            ["原始无人机驱动实现", createGull.toString()],
          ];
  }

  function reset(clip) {
    mode = clip;
    time = 0;
    manager.t = 0;
    context.time.t = 0;
    randomState = 4207;
    if (weapon) {
      input.fire = false;
      input.ads = false;
      player.speed = 0;
      player.sprinting = false;
      weapon.previewReset();
      if (mode === "reload") {
        weapon.ammo = 0;
        weapon.reloadNow();
      }
      if (mode === "ads") input.ads = true;
      weapon.update(0);
      weapon.root.traverse((object) => object.layers.set(0));
    } else {
      for (const rest of restBones) {
        rest.bone.position.copy(rest.position);
        rest.bone.quaternion.copy(rest.quaternion);
        rest.bone.scale.copy(rest.scale);
      }
      if (id === "hound") {
        actor.prevSpeed = 0;
        actor.yawRate = 0;
        actor.crouch = 0;
        actor._activate(new THREE.Vector3(), { passive: true, yaw: 0 });
        actor.phase = 0;
        actor.lastPair = 1;
        actor.prevSpeed = 0;
        actor.sw = -1;
        actor.swT = 0;
        actor.swDur = 0.2;
        actor.lift = 0.08;
        actor.tyaw = actor.tpitch = actor.hyaw = actor.hpitch = 0;
        actor.previewPose(0);
      } else {
        actor._activate(new THREE.Vector3(0, 1.6, 0), {
          passive: true,
          hover: 1.6,
          patrolRadius: 0,
          yaw: 0,
        });
        actor.phase = 0;
        actor.orbitA = 0;
        actor.orbitDir = 1;
        actor.gy = actor.gp = actor.sweep = 0;
        actor.thr = 1;
        actor.mode = mode === "scan" ? "search" : "patrol";
        actor.lastKnown.set(0, 0, 4);
        actor._update(0);
      }
      root.position.copy(actor.pos).negate();
    }
    root.updateMatrixWorld(true);
    skeleton?.update();
  }

  function step(dt) {
    time += dt;
    manager.t = time;
    context.time.t = time;
    context.time.dt = dt;
    if (weapon) {
      input.fire = mode === "fire" && time < 0.75;
      input.ads = mode === "ads" && time < 1.1;
      weapon.update(dt);
    } else if (id === "hound") {
      const speed = mode === "walk" ? 1.5 : mode === "run" ? 4.5 : 0;
      actor.speed = speed;
      actor.pos.z += speed * dt;
      actor.yawRate = 0;
      actor.tyaw = mode === "aim" ? Math.sin(time * 1.2) * 0.75 : 0;
      actor.tpitch = mode === "aim" ? Math.sin(time * 0.9) * 0.18 : 0;
      actor.hyaw = actor.tyaw * 0.7;
      actor.hpitch = actor.tpitch * 0.5;
      actor.previewGait(dt);
      actor.previewPose(dt);
      actor.prevSpeed = actor.speed;
      root.position.copy(actor.pos).negate();
    } else {
      actor._update(dt);
      root.position.copy(actor.pos).negate();
    }
    root.updateMatrixWorld(true);
    skeleton?.update();
  }

  function dispose() {
    const geometries = new Set(),
      ownedMaterials = new Set(extraMaterials),
      textures = new Set();
    root.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!sharedMaterials.has(material)) ownedMaterials.add(material);
        }
      }
    });
    for (const material of ownedMaterials) {
      for (const value of Object.values(material)) {
        if (value?.isTexture && !sharedTextures.has(value)) textures.add(value);
      }
      material.dispose();
    }
    for (const texture of textures) texture.dispose();
    for (const geometry of geometries) geometry.dispose();
    skeleton?.dispose();
    root.removeFromParent();
    pac9RainUniform.value = oldWet;
  }

  return {
    root,
    mesh,
    skeleton,
    sources,
    reset,
    step,
    dispose,
    setWetness(value) {
      weapon?.setWetness(value);
    },
    get time() {
      return time;
    },
    get actor() {
      return actor;
    },
    get weapon() {
      return weapon;
    },
  };
}

// ============================================================================
// 四、 3D 资产导出器 (GLB Exporter)
// ============================================================================

/**
 * 将 3D 对象转换为兼容 GLTF/GLB 标准导出格式的对象副本
 * @param {THREE.Object3D} rootObj
 * @returns {THREE.Object3D}
 */
export function prepareExportObject(rootObj) {
  const clone = rootObj.clone(true);
  clone.traverse((child) => {
    // @ts-ignore
    if (child.isMesh) {
      // @ts-ignore
      const originalMat = child.material;
      const processMat = (mat) => {
        if (!mat) return mat;
        const std = new THREE.MeshStandardMaterial({
          color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
          roughness: typeof mat.roughness === "number" ? mat.roughness : 0.5,
          metalness: typeof mat.metalness === "number" ? mat.metalness : 0.5,
          vertexColors: !!mat.vertexColors,
          wireframe: false,
          side: mat.side || THREE.FrontSide,
        });
        if (
          mat.map &&
          mat.map.image &&
          (mat.map.image instanceof HTMLCanvasElement ||
            mat.map.image instanceof HTMLImageElement ||
            mat.map.image.data)
        ) {
          std.map = mat.map;
        }
        return std;
      };

      if (Array.isArray(originalMat)) {
        // @ts-ignore
        child.material = originalMat.map(processMat);
      } else {
        // @ts-ignore
        child.material = processMat(originalMat);
      }
    }
  });
  return clone;
}

/**
 * 导出 3D 模型为标准 GLB 二进制文件
 * @param {THREE.Object3D} object
 * @param {string} [name="asset"]
 * @returns {Promise<{ blob: Blob, byteLength: number, filename: string }>}
 */
export function exportGlb(object, name = "asset") {
  return new Promise((resolve, reject) => {
    const exportable = prepareExportObject(object);
    const exporter = new GLTFExporter();
    exporter.parse(
      exportable,
      (glb) => {
        if (glb instanceof ArrayBuffer) {
          const blob = new Blob([glb], { type: "model/gltf-binary" });
          const filename = `${name}_saltline.glb`;
          resolve({ blob, byteLength: glb.byteLength, filename });
        } else {
          reject(new Error("GLTFExporter returned unexpected non-binary output"));
        }
      },
      (error) => {
        reject(error);
      },
      { binary: true },
    );
  });
}

// ============================================================================
// 五、 导出统一工坊运行时内核对象 (window.Saltline)
// ============================================================================

export const Saltline = {
  THREE,
  materials: buildMaterialsManager,
  props: createPropsManager,
  propSpecs: PROP_SIZES,
  textureSpecs: TEXTURE_SPECS,
  materialSpecs: MATERIAL_SPECS,
  gun: buildPac9Geometries,
  hound: buildHoundRig,
  gull: buildGullRig,
  rig: createSkinnedMesh,
  sounds: SOUND_REGISTRY,
  synth: synthSound,
  synthSteps: synthSteps,
  traceGeometry: traceAssetGeometry,
  traceAudio: traceAssetAudio,
  createAnimation: createAssetAnimation,
  exportGlb,
  prepareExportObject,
  source: {
    builders: PROP_BUILDERS,
    textureFunctions: surfaceShaderLibrary,
    textureCommon: surfaceShaderPrelude,
    textureMain: surfaceShaderEntry,
    normalShader: normalMapFragmentShader,
    materialShader: applyMaterialPatch,
    rigBuilder: SkeletonRig,
    gunHelpers: PAC9_HELPERS,
  },
};

// 挂载到全局，供 analysis.js, labs.js 等工坊模块使用
if (typeof window !== "undefined") {
  // @ts-ignore
  window.Saltline = Saltline;
}

/**
 * ============================================================================
 * 3A-GAME Engine Constants & Utilities (constants.js)
 * 全局场景边界、光照参数、玩家规格、画质预设、数学函数与事件总线
 * ============================================================================
 */

import * as THREE from "three";

// ============================================================================
// 一、 场景空间范围与环境光照 (Scene Bounds & Environment)
// ============================================================================

export const SCENE_BOUNDS = {
  min: new THREE.Vector3(-40, 0, -30),
  max: new THREE.Vector3(40, 30, 30),
  groundY: 0,
  seaY: -1.6,
  quayX: 30,
};

export const SUN_CONFIG = {
  dir: new THREE.Vector3(0.916, 0.225, 0.331).normalize(),
  color: new THREE.Color(1.0, 0.72, 0.42),
  intensity: 9.0,
};

export const SKY_CONFIG = {
  zenith: new THREE.Color(0.055, 0.085, 0.13),
  horizon: new THREE.Color(0.95, 0.55, 0.28),
  horizonAway: new THREE.Color(0.16, 0.22, 0.3),
  fog: new THREE.Color(0.42, 0.47, 0.52),
};

export const PLAYER_CONFIG = {
  eye: 1.68,
  crouchEye: 1.05,
  radius: 0.32,
  height: 1.8,
  fov: 74,
  viewFov: 54,
};

// 阵营常量 (Factions)
export const FACTION_PLAYER = 0;
export const FACTION_ENEMY = 1;

// ============================================================================
// 二、 画质分级预设与自适应探测 (Quality Presets & Auto-detection)
// ============================================================================

export const QUALITY_PRESETS = {
  test: {
    name: "test",
    scale: 1.0,
    msaa: 0,
    shadow: 1024,
    tex: 256,
    volSteps: 10,
    ao: true,
    planar: 0.5,
    bloom: true,
    motionBlur: false,
    rain: 0.4,
  },
  low: {
    name: "low",
    scale: 0.7,
    msaa: 0,
    shadow: 2048,
    tex: 512,
    volSteps: 12,
    ao: false,
    planar: 0,
    bloom: true,
    motionBlur: false,
    rain: 0.5,
  },
  medium: {
    name: "medium",
    scale: 0.85,
    msaa: 2,
    shadow: 2048,
    tex: 1024,
    volSteps: 16,
    ao: true,
    planar: 0.5,
    bloom: true,
    motionBlur: false,
    rain: 0.8,
  },
  high: {
    name: "high",
    scale: 1.0,
    msaa: 4,
    shadow: 4096,
    tex: 1024,
    volSteps: 24,
    ao: true,
    planar: 0.5,
    bloom: true,
    motionBlur: true,
    rain: 1.0,
  },
  ultra: {
    name: "ultra",
    scale: 1.0,
    msaa: 4,
    shadow: 4096,
    tex: 2048,
    volSteps: 40,
    ao: true,
    planar: 1.0,
    bloom: true,
    motionBlur: true,
    rain: 1.0,
  },
};

/**
 * 自动探测硬件 GPU 渲染器并推荐画质预设
 */
export function detectQualityPreset(preferredName) {
  if (preferredName && QUALITY_PRESETS[preferredName]) {
    return { ...QUALITY_PRESETS[preferredName] };
  }

  // 移动端降级保护
  if (
    /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900)
  ) {
    return { ...QUALITY_PRESETS.low };
  }

  let glRendererStr = "";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (gl) {
      const dbgInfo = gl.getExtension("WEBGL_debug_renderer_info");
      glRendererStr = String(
        dbgInfo ? gl.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      );
      const loseCtx = gl.getExtension("WEBGL_lose_context");
      if (loseCtx) loseCtx.loseContext();
    }
  } catch {}

  // 软件渲染器或入门核显限制在中画质，独立显卡使用高画质
  if (
    /SwiftShader|llvmpipe|Software|Mali|Adreno|PowerVR/i.test(glRendererStr) ||
    (/Intel/i.test(glRendererStr) && !/Arc/i.test(glRendererStr))
  ) {
    return { ...QUALITY_PRESETS.medium };
  }

  return { ...QUALITY_PRESETS.high };
}

// ============================================================================
// 三、 事件总线与确定性随机生成器 (EventBus & Seeded RNG)
// ============================================================================

/**
 * 轻量级高性能事件发布/订阅总线
 */
export function createEventBus() {
  const listeners = new Map();
  return {
    on(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event).push(handler);
      return () => this.off(event, handler);
    },
    off(event, handler) {
      const list = listeners.get(event);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx >= 0) list.splice(idx, 1);
      }
    },
    emit(event, payload) {
      const list = listeners.get(event);
      if (list) {
        for (let i = 0; i < list.length; i++) {
          try {
            list[i](payload);
          } catch (err) {
            console.error(`[events] handler for "${event}" threw`, err);
          }
        }
      }
    },
  };
}

/**
 * 确定性 32-bit 伪随机生成器 (Deterministic Seeded Random)
 */
export function createSeededRandom(seed = 1337) {
  let s = seed >>> 0;
  const rnd = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  rnd.range = (min, max) => min + (max - min) * rnd();
  rnd.int = (min, max) => Math.floor(min + (max - min + 1) * rnd());
  rnd.pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  rnd.sign = () => (rnd() < 0.5 ? -1 : 1);
  rnd.fork = () => createSeededRandom(Math.floor(rnd() * 4294967296));

  return rnd;
}

// ============================================================================
// 四、 常用数学函数 (Math Utilities)
// ============================================================================

export const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
export const lerp = (a, b, t) => a + (b - a) * t;
export const saturate = (x) => Math.min(1, Math.max(0, x));
export const smoothstep = (edge0, edge1, x) => {
  const t = saturate((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
export const damp = (current, target, lambda, dt) =>
  target + (current - target) * Math.exp(-lambda * dt);
export const noop = () => {};

// ============================================================================
// 五、 隔离测试桩对象 (Stub Registry for Testing)
// ============================================================================

export const STUBS = {
  ground: () => ({
    stub: true,
    update: noop,
    wetnessAt: () => 0.5,
    isPuddle: () => false,
  }),
  backdrop: () => ({
    stub: true,
    update: noop,
  }),
  fx: () => ({
    stub: true,
    update: noop,
    muzzleFlash: noop,
    tracer: noop,
    impact: noop,
    sparks: noop,
    smoke: noop,
    explosion: noop,
    debris: noop,
    shell: noop,
    decal: noop,
    dust: noop,
    clear: noop,
    splash: noop,
    addEmitter: () => ({ stop: noop, setPos: noop }),
  }),
  audio: () => {
    const handle = { setPos: noop, setGain: noop, setPitch: noop, stop: noop };
    return {
      stub: true,
      update: noop,
      resume: noop,
      play: noop,
      loop: () => handle,
      setIntensity: noop,
      setInterior: noop,
      setVolume: noop,
      setPaused: noop,
    };
  },
  weapon: () => ({
    stub: true,
    update: noop,
    reset: noop,
    setVisible: noop,
    ammo: 30,
    magSize: 30,
    reserve: 120,
    state: "idle",
    name: "KR-7",
    ads: 0,
    spread: 0.01,
  }),
  enemies: () => ({
    stub: true,
    list: [],
    update: noop,
    spawn: () => null,
    raycast: () => null,
    aliveCount: () => 0,
    clear: noop,
    alert: noop,
  }),
  hud: () => ({
    stub: true,
    update: noop,
    show: noop,
    setObjective: noop,
    message: noop,
    hitmarker: noop,
  }),
  mats: () => {
    const cache = new Map();
    return {
      stub: true,
      get: (name) => {
        if (!cache.has(name)) {
          cache.set(name, new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.7 }));
        }
        return cache.get(name);
      },
      emissive: (color = 0xffffff, intensity = 4) =>
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(color).multiplyScalar(intensity),
        }),
      names: [],
      decal: () => ({
        material: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
        aspect: 1,
      }),
      label: () => ({
        material: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
        aspect: 4,
      }),
      uniforms: { wet: { value: 1 } },
      update: noop,
    };
  },
};

// ============================================================================
// 六、 原始短别名兼容导出 (Legacy Alias Exports)
// ============================================================================

export {
  SCENE_BOUNDS as oi,
  SUN_CONFIG as Mn,
  SKY_CONFIG as en,
  PLAYER_CONFIG as Pi,
  FACTION_PLAYER as vf,
  FACTION_ENEMY as zc,
  QUALITY_PRESETS as Pr,
  detectQualityPreset as zy,
  createEventBus as Dy,
  createSeededRandom as il,
  clamp as Zn,
  lerp as bi,
  saturate as Fo,
  smoothstep as sl,
  damp as kn,
  noop as Wt,
  STUBS as dr,
};

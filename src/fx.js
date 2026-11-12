/**
 * ============================================================================
 * 3A-GAME Visual Effects Engine (fx.js)
 * 纯程序化视觉特效系统：GPU 实例化粒子、弹道曳光流、物理弹壳与破片、冲击弹孔贴花
 * ============================================================================
 *
 * 架构拆分重构 (Modular Architecture):
 * - ./fx/textures.js: 图集生成器 (Smoke, Sparks, Decals) 与 GPU 混合着色器 (Lit, Additive, Soft Fade)
 * - ./fx/pools.js: 实例化网格封装、SoA 紧凑粒子池 (ParticlePool) 与超音速弹道曳光流 (BulletTracerPool)
 * - ./fx/debris.js: 物理碎屑破片 (DebrisPhysicsSystem) 与黄铜抛壳动力学 (SpentShellEjectionSystem)
 * - ./fx/decals.js: 冲击弹孔贴花管理器 (ImpactDecalManager)
 */

import * as THREE from "three";
import { Mn as SUN_CONFIG, en as SKY_CONFIG } from "./constants.js";
import { Wi as createBoxBevelGeometry } from "./geo.js";

// 子模块统一导入与再导出 (Submodule Imports & Re-exports)
export {
  PARTICLE_FLAG_BOUNCE_FLOOR,
  PARTICLE_FLAG_DIE_ON_FLOOR,
  PARTICLE_FLAG_STICK_FLOOR,
  PARTICLE_MODE_BILLBOARD,
  PARTICLE_MODE_VELOCITY_STRETCH,
  PARTICLE_MODE_SURFACE_ALIGNED,
  SMOKE_ATLAS_COLS,
  SMOKE_ATLAS_ROWS,
  SPARKS_ATLAS_COLS,
  SPARKS_ATLAS_ROWS,
  SPARK_FRAME_SOFT_DOT,
  SPARK_FRAME_STREAK,
  SPARK_FRAME_STARBURST1,
  SPARK_FRAME_STARBURST2,
  SPARK_FRAME_RIPPLE,
  SPARK_FRAME_PLASMA,
  SPARK_FRAME_DROPLET,
  SPARK_FRAME_TRACER_TIP,
  DECAL_ATLAS_COLS,
  DECAL_ATLAS_ROWS,
  DECAL_TYPE_FRAMES,
  DECAL_DEFAULT_SIZES,
  smoothstep,
  randomRange,
  createNoiseGenerator,
  generateSmokeAtlas,
  generateSparksAtlas,
  generateDecalsAtlas,
  GLSL_SOFT_FADE,
  FX_VERTEX_SHADER,
  FX_LIT_FRAGMENT_SHADER,
  FX_ADD_FRAGMENT_SHADER,
} from "./fx/textures.js";

import {
  PARTICLE_FLAG_BOUNCE_FLOOR,
  PARTICLE_FLAG_DIE_ON_FLOOR,
  PARTICLE_FLAG_STICK_FLOOR,
  PARTICLE_MODE_BILLBOARD,
  PARTICLE_MODE_VELOCITY_STRETCH,
  PARTICLE_MODE_SURFACE_ALIGNED,
  SMOKE_ATLAS_COLS,
  SMOKE_ATLAS_ROWS,
  SPARKS_ATLAS_COLS,
  SPARKS_ATLAS_ROWS,
  SPARK_FRAME_SOFT_DOT,
  SPARK_FRAME_STREAK,
  SPARK_FRAME_STARBURST1,
  SPARK_FRAME_STARBURST2,
  SPARK_FRAME_RIPPLE,
  SPARK_FRAME_PLASMA,
  SPARK_FRAME_DROPLET,
  SPARK_FRAME_TRACER_TIP,
  DECAL_ATLAS_COLS,
  DECAL_ATLAS_ROWS,
  DECAL_TYPE_FRAMES,
  DECAL_DEFAULT_SIZES,
  smoothstep,
  randomRange,
  createNoiseGenerator,
  generateSmokeAtlas,
  generateSparksAtlas,
  generateDecalsAtlas,
  GLSL_SOFT_FADE,
  FX_VERTEX_SHADER,
  FX_LIT_FRAGMENT_SHADER,
  FX_ADD_FRAGMENT_SHADER,
} from "./fx/textures.js";

export { createInstancedParticleMesh, ParticlePool, BulletTracerPool } from "./fx/pools.js";

import { createInstancedParticleMesh, ParticlePool, BulletTracerPool } from "./fx/pools.js";

export {
  createDebrisGeometry,
  DebrisPhysicsSystem,
  createShellCartridgeGeometry,
  SpentShellEjectionSystem,
} from "./fx/debris.js";

import {
  createDebrisGeometry,
  DebrisPhysicsSystem,
  createShellCartridgeGeometry,
  SpentShellEjectionSystem,
} from "./fx/debris.js";

export { ImpactDecalManager } from "./fx/decals.js";

import { ImpactDecalManager } from "./fx/decals.js";

// 全局临时计算缓存 (Scratch Vectors & Matrices)
const vTempPos = new THREE.Vector3();
const vTempDir = new THREE.Vector3();
const vTempNorm = new THREE.Vector3();
const vTempCamPos = new THREE.Vector3();
const vTempAim = new THREE.Vector3();
const vTempReflect = new THREE.Vector3();
const vTempPoint = new THREE.Vector3();
const vTempOffset = new THREE.Vector3();
const vDrawSize = new THREE.Vector2();
const mTempMatrix = new THREE.Matrix4();
const qTempQuat = new THREE.Quaternion();
const eTempEuler = new THREE.Euler();
const cTempColor = new THREE.Color();
const aTempColorArr = [1, 1, 1];

const UP_VECTOR = new THREE.Vector3(0, 1, 0);
const DOWN_VECTOR = new THREE.Vector3(0, -1, 0);

// ============================================================================
// 十、 颜色解析与圆锥体随机发射辅助 (Helpers)
// ============================================================================

function parseColorToArray(colorInput, defaultR = 1, defaultG = 1, defaultB = 1) {
  if (colorInput == null) {
    aTempColorArr[0] = defaultR;
    aTempColorArr[1] = defaultG;
    aTempColorArr[2] = defaultB;
  } else if (Array.isArray(colorInput)) {
    aTempColorArr[0] = colorInput[0];
    aTempColorArr[1] = colorInput[1];
    aTempColorArr[2] = colorInput[2];
  } else if (colorInput.isColor) {
    aTempColorArr[0] = colorInput.r;
    aTempColorArr[1] = colorInput.g;
    aTempColorArr[2] = colorInput.b;
  } else {
    cTempColor.set(colorInput);
    aTempColorArr[0] = cTempColor.r;
    aTempColorArr[1] = cTempColor.g;
    aTempColorArr[2] = cTempColor.b;
  }
  return aTempColorArr;
}

/**
 * 沿基准方向生成圆锥体扩散向量
 */
function randomVectorInCone(baseDir, spreadRadius, outVector) {
  const rx = Math.random() * 2 - 1;
  const ry = Math.random() * 2 - 1;
  const rz = Math.random() * 2 - 1;
  const len = Math.hypot(rx, ry, rz) || 1;
  const factor = (spreadRadius * Math.cbrt(Math.random())) / len;

  outVector.set(baseDir.x + rx * factor, baseDir.y + ry * factor, baseDir.z + rz * factor);

  const outLen = outVector.length();
  if (outLen < 1e-4) {
    outVector.copy(baseDir);
  } else {
    outVector.multiplyScalar(1 / outLen);
  }
  return outVector;
}

// ============================================================================
// 十一、 核心特效管理器工厂 (createFXManager)
// ============================================================================

const CAPACITY_LIT_PARTICLES = 1400;
const CAPACITY_ADD_PARTICLES = 3200;

export async function createFXManager(engineCtx) {
  const scene = engineCtx.scene || (engineCtx.render && engineCtx.render.scene);
  const windDir = new THREE.Vector3(-0.8, 0, 0.3);

  // 环境光与日光光照参数
  const sunRadiance = new THREE.Vector3(
    SUN_CONFIG.color.r,
    SUN_CONFIG.color.g,
    SUN_CONFIG.color.b,
  ).multiplyScalar((SUN_CONFIG.intensity / Math.PI) * 0.9);

  const ambSky = new THREE.Vector3(
    SKY_CONFIG.zenith.r * 0.6 + SKY_CONFIG.horizonAway.r * 0.5 + SKY_CONFIG.fog.r * 0.25,
    SKY_CONFIG.zenith.g * 0.6 + SKY_CONFIG.horizonAway.g * 0.5 + SKY_CONFIG.fog.g * 0.25,
    SKY_CONFIG.zenith.b * 0.6 + SKY_CONFIG.horizonAway.b * 0.5 + SKY_CONFIG.fog.b * 0.25,
  );

  const ambGround = new THREE.Vector3(
    SKY_CONFIG.horizonAway.r * 0.3 + SKY_CONFIG.fog.r * 0.14,
    SKY_CONFIG.horizonAway.g * 0.3 + SKY_CONFIG.fog.g * 0.14,
    SKY_CONFIG.horizonAway.b * 0.3 + SKY_CONFIG.fog.b * 0.14,
  );

  // 初始化各子系统
  const smokeAtlas = generateSmokeAtlas(128);
  const sparksAtlas = generateSparksAtlas(128);

  const litMeshSystem = createInstancedParticleMesh(engineCtx, CAPACITY_LIT_PARTICLES, {
    lit: true,
    tex: smokeAtlas,
    cols: SMOKE_ATLAS_COLS,
    rows: SMOKE_ATLAS_ROWS,
    renderOrder: 10,
    sun: sunRadiance,
    sunDir: SUN_CONFIG.dir.clone().normalize(),
    ambLo: ambGround,
    ambHi: ambSky,
  });

  const addMeshSystem = createInstancedParticleMesh(engineCtx, CAPACITY_ADD_PARTICLES, {
    lit: false,
    tex: sparksAtlas,
    cols: SPARKS_ATLAS_COLS,
    rows: SPARKS_ATLAS_ROWS,
    renderOrder: 20,
  });

  const litPool = new ParticlePool(CAPACITY_LIT_PARTICLES, true);
  const addPool = new ParticlePool(CAPACITY_ADD_PARTICLES - 160, false);
  const tracerPool = new BulletTracerPool(48);
  const debrisSystem = new DebrisPhysicsSystem(engineCtx, 256);
  const shellSystem = new SpentShellEjectionSystem(engineCtx, 60);
  const decalSystem = new ImpactDecalManager(engineCtx, 160);

  const rootGroup = new THREE.Group();
  rootGroup.name = "fx";
  rootGroup.add(
    decalSystem.mesh,
    debrisSystem.mesh,
    shellSystem.mesh,
    litMeshSystem.mesh,
    addMeshSystem.mesh,
  );
  scene.add(rootGroup);

  let globalTime = 0;
  let lastMuzzleFlashTime = -1;
  let lastTracerSmokeTime = -1;

  const getLightPool = () => engineCtx.render && engineCtx.render.lightPool;
  const flashLight = (pos, color, intensity, distance, duration) => {
    const lp = getLightPool();
    if (lp && lp.flash) lp.flash(pos, color, intensity, distance, duration);
  };

  // 阴影遮挡与地面高度探测
  function queryShadowVisibility(pos, normal) {
    const phys = engineCtx.physics;
    if (!phys || !phys.raycast) return 1.0;
    vTempPos.copy(pos);
    if (normal) vTempPos.addScaledVector(normal, 0.08);
    vTempPos.y += 0.03;
    let hit = null;
    try {
      hit = phys.raycast(vTempPos, SUN_CONFIG.dir, 90);
    } catch {
      hit = null;
    }
    return hit ? 0.2 : 1.0;
  }

  function queryFloorHeight(pos) {
    const phys = engineCtx.physics;
    if (!phys || !phys.raycast) return 0;
    vTempPos.copy(pos);
    vTempPos.y += 0.1;
    let hit = null;
    try {
      hit = phys.raycast(vTempPos, DOWN_VECTOR, 12);
    } catch {
      hit = null;
    }
    return hit ? hit.point.y : -50;
  }

  // 基础粒子发射函数
  function emitLitSmoke(
    x,
    y,
    z,
    vx,
    vy,
    vz,
    life,
    s0,
    s1,
    r,
    g,
    b,
    alpha,
    shadowVis,
    drag,
    rise,
    windScale,
    frame,
  ) {
    const idx = litPool.emit(x, y, z, vx, vy, vz, life, s0, s1);
    if (idx < 0) return -1;
    litPool.r[idx] = r;
    litPool.g[idx] = g;
    litPool.b[idx] = b;
    litPool.a[idx] = alpha;
    litPool.shade[idx] = shadowVis;
    litPool.drag[idx] = drag;
    litPool.grav[idx] = -rise; // 向上浮力
    litPool.wind[idx] = windScale;
    litPool.turb[idx] = 0.5;
    litPool.rot[idx] = Math.random() * 6.283;
    litPool.rotv[idx] = (Math.random() - 0.5) * 1.2;
    litPool.frame[idx] = frame < 0 ? Math.floor(Math.random() * 6) : frame;
    litPool.fin[idx] = 0.06;
    litPool.fout[idx] = 0.3;
    litPool.sk[idx] = 2.5;
    return idx;
  }

  function emitAddSparkStreak(x, y, z, vx, vy, vz, life, size, r, g, b, flags) {
    const idx = addPool.emit(x, y, z, vx, vy, vz, life, size, size * 0.5);
    if (idx < 0) return -1;
    addPool.mode[idx] = PARTICLE_MODE_VELOCITY_STRETCH;
    addPool.frame[idx] = SPARK_FRAME_STREAK;
    addPool.stretch[idx] = 0.03;
    addPool.grav[idx] = 9.81;
    addPool.drag[idx] = 0.9;
    addPool.ramp[idx] = 1;
    addPool.r[idx] = r * 0.6;
    addPool.g[idx] = g * 0.6;
    addPool.b[idx] = b * 0.6;
    addPool.fout[idx] = 0.55;
    addPool.flags[idx] = flags;
    addPool.sk[idx] = 1;
    return idx;
  }

  function emitSparksCone(
    origin,
    normal,
    count,
    minSpeed,
    maxSpeed,
    spread,
    minLife,
    maxLife,
    r,
    g,
    b,
    flags,
  ) {
    for (let i = 0; i < count; i++) {
      randomVectorInCone(normal, spread, vTempAim);
      const spd = randomRange(minSpeed, maxSpeed) * (0.35 + 0.65 * Math.random());
      emitAddSparkStreak(
        origin.x,
        origin.y,
        origin.z,
        vTempAim.x * spd,
        vTempAim.y * spd,
        vTempAim.z * spd,
        randomRange(minLife, maxLife),
        randomRange(0.01, 0.02),
        r * randomRange(0.6, 1.2),
        g * randomRange(0.6, 1.2),
        b,
        flags,
      );
    }
  }

  function emitStaticAddFlare(x, y, z, life, s0, s1, r, g, b, frame) {
    const idx = addPool.emit(x, y, z, 0, 0, 0, life, s0, s1);
    if (idx < 0) return -1;
    addPool.frame[idx] = frame;
    addPool.r[idx] = r;
    addPool.g[idx] = g;
    addPool.b[idx] = b;
    addPool.fout[idx] = 0.2;
    addPool.rot[idx] = Math.random() * 6.283;
    addPool.sk[idx] = 1.5;
    return idx;
  }

  function emitWaterRippleRing(x, y, z, life, s0, s1, r, g, b) {
    const idx = addPool.emit(x, y, z, 0, 0, 0, life, s0, s1);
    if (idx < 0) return -1;
    addPool.mode[idx] = PARTICLE_MODE_SURFACE_ALIGNED;
    addPool.frame[idx] = SPARK_FRAME_RIPPLE;
    addPool.r[idx] = r;
    addPool.g[idx] = g;
    addPool.b[idx] = b;
    addPool.fout[idx] = 0.15;
    addPool.fin[idx] = 0.08;
    addPool.sk[idx] = 2.2;
    addPool.rot[idx] = Math.random() * 6.283;
    return idx;
  }

  function emitFlyingDebrisChunks(
    origin,
    normal,
    count,
    minSpeed,
    maxSpeed,
    minSx,
    maxSx,
    minSy,
    maxSy,
    minSz,
    maxSz,
    r,
    g,
    b,
    spread,
    floorY,
  ) {
    for (let i = 0; i < count; i++) {
      randomVectorInCone(normal, spread, vTempAim);
      const spd = randomRange(minSpeed, maxSpeed);
      const colMult = randomRange(0.8, 1.15);
      debrisSystem.add(
        origin.x + vTempAim.x * 0.02,
        origin.y + vTempAim.y * 0.02,
        origin.z + vTempAim.z * 0.02,
        vTempAim.x * spd,
        vTempAim.y * spd + 0.8,
        vTempAim.z * spd,
        randomRange(minSx, maxSx),
        randomRange(minSy, maxSy),
        randomRange(minSz, maxSz),
        r * colMult,
        g * colMult,
        b * colMult,
        randomRange(3.5, 6),
        floorY,
      );
    }
  }

  // ==========================================================================
  // 公共视觉特效接口 (Public Emitter API)
  // ==========================================================================

  function sparks(pos, normal, count = 12) {
    vTempNorm.copy(normal || UP_VECTOR);
    if (vTempNorm.lengthSq() < 1e-6) vTempNorm.copy(UP_VECTOR);
    vTempNorm.normalize();

    emitSparksCone(
      pos,
      vTempNorm,
      count,
      5,
      18,
      0.6,
      0.15,
      0.5,
      36,
      22,
      9,
      PARTICLE_FLAG_BOUNCE_FLOOR,
    );
    emitStaticAddFlare(pos.x, pos.y, pos.z, 0.05, 0.2, 0.35, 10, 6.5, 3, SPARK_FRAME_SOFT_DOT);
  }

  function smoke(pos, opts = {}) {
    const size = opts.size || 1;
    const life = opts.life || 2.5;
    const rise = opts.rise === undefined ? 0.6 : opts.rise;
    const col = parseColorToArray(opts.color, 0.32, 0.32, 0.33);
    const vel = opts.vel;
    const shadowVis = queryShadowVisibility(pos, null);
    const count = opts.count || 3;

    for (let i = 0; i < count; i++) {
      emitLitSmoke(
        pos.x + (Math.random() - 0.5) * 0.2 * size,
        pos.y + (Math.random() - 0.5) * 0.2 * size,
        pos.z + (Math.random() - 0.5) * 0.2 * size,
        (vel ? vel.x : 0) + (Math.random() - 0.5) * 0.4,
        (vel ? vel.y : 0) + Math.random() * 0.3,
        (vel ? vel.z : 0) + (Math.random() - 0.5) * 0.4,
        life * randomRange(0.75, 1.2),
        size * 0.3,
        size * randomRange(1, 1.5),
        col[0],
        col[1],
        col[2],
        opts.alpha || 0.4,
        shadowVis,
        1.2,
        rise,
        1,
        -1,
      );
    }
  }

  function dust(pos, normal, scale = 1, r = 0.5, g = 0.48, b = 0.45) {
    vTempNorm.copy(normal || UP_VECTOR);
    if (vTempNorm.lengthSq() < 1e-6) vTempNorm.copy(UP_VECTOR);
    vTempNorm.normalize();

    const shadowVis = queryShadowVisibility(pos, vTempNorm);
    for (let i = 0; i < 8; i++) {
      randomVectorInCone(vTempNorm, 0.5, vTempAim);
      const spd = randomRange(1, 4.5) * scale;
      const colMult = randomRange(0.85, 1.1);
      emitLitSmoke(
        pos.x + vTempNorm.x * 0.03,
        pos.y + vTempNorm.y * 0.03,
        pos.z + vTempNorm.z * 0.03,
        vTempAim.x * spd,
        vTempAim.y * spd,
        vTempAim.z * spd,
        randomRange(0.5, 1.1),
        0.08 * scale,
        randomRange(0.35, 0.7) * scale,
        r * colMult,
        g * colMult,
        b * colMult,
        0.9,
        shadowVis,
        3.5,
        0.15,
        0.6,
        i < 3 ? 7 : -1,
      );
    }

    for (let i = 0; i < 2; i++) {
      emitLitSmoke(
        pos.x + vTempNorm.x * 0.15,
        pos.y + vTempNorm.y * 0.15,
        pos.z + vTempNorm.z * 0.15,
        vTempNorm.x * 0.5 + (Math.random() - 0.5) * 0.3,
        vTempNorm.y * 0.5 + 0.1,
        vTempNorm.z * 0.5 + (Math.random() - 0.5) * 0.3,
        randomRange(2.2, 3.6),
        0.25 * scale,
        randomRange(0.9, 1.5) * scale,
        r,
        g,
        b,
        0.28,
        shadowVis,
        1.5,
        0.1,
        1,
        -1,
      );
    }
    return shadowVis;
  }

  function debris(pos, optionsOrDir = {}, surfaceType = "concrete", optionalCount = null) {
    let opts = optionsOrDir;
    if (optionsOrDir && optionsOrDir.isVector3) {
      opts = {
        normal: optionsOrDir,
        count: optionalCount || (typeof surfaceType === "number" ? surfaceType : 6),
        mat: typeof surfaceType === "string" ? surfaceType : "concrete",
      };
    }

    let col;
    if (opts.color !== undefined) {
      col = parseColorToArray(opts.color, 0.4, 0.4, 0.4);
    } else if (opts.mat) {
      let m = null;
      try {
        m = typeof opts.mat === "string" ? engineCtx.mats.get(opts.mat) : opts.mat;
      } catch {
        m = null;
      }
      col = parseColorToArray(m && m.color ? m.color : null, 0.4, 0.4, 0.4);
    } else {
      col = parseColorToArray(null, 0.4, 0.39, 0.37);
    }

    const sz = opts.size || 0.06;
    const spd = opts.speed || 5;
    vTempNorm.copy(opts.normal || UP_VECTOR).normalize();
    const count = Math.min(opts.count || 6, 40);

    emitFlyingDebrisChunks(
      pos,
      vTempNorm,
      count,
      spd * 0.4,
      spd * 1.3,
      sz * 0.4,
      sz * 1.2,
      sz * 0.3,
      sz * 0.9,
      sz * 0.4,
      sz * 1.2,
      col[0],
      col[1],
      col[2],
      opts.spread || 1,
      queryFloorHeight(pos),
    );
  }

  function splash(pos, scale = 1) {
    const shadowVis = queryShadowVisibility(pos, UP_VECTOR);
    const posY = pos.y;

    // 水柱与飞沫喷射
    for (let i = 0; i < 5; i++) {
      const dropSz = randomRange(0.35, 0.6) * scale;
      const idx = emitLitSmoke(
        pos.x + (Math.random() - 0.5) * 0.08 * scale,
        posY + 0.1 * scale,
        pos.z + (Math.random() - 0.5) * 0.08 * scale,
        (Math.random() - 0.5) * 0.5,
        randomRange(1.6, 2.8) * Math.sqrt(scale),
        (Math.random() - 0.5) * 0.5,
        randomRange(0.4, 0.65),
        dropSz * 0.3,
        dropSz,
        0.72,
        0.78,
        0.84,
        0.95,
        shadowVis,
        0.5,
        -7,
        0,
        6,
      );
      if (idx >= 0) {
        litPool.rot[idx] = (Math.random() - 0.5) * 0.3;
        litPool.rotv[idx] = 0;
        litPool.turb[idx] = 0;
        litPool.sk[idx] = 3;
        litPool.fout[idx] = 0.4;
      }
    }

    for (let i = 0; i < 2; i++) {
      emitLitSmoke(
        pos.x,
        posY + 0.15 * scale,
        pos.z,
        (Math.random() - 0.5) * 0.6,
        0.5,
        (Math.random() - 0.5) * 0.6,
        randomRange(0.7, 1.1),
        0.2 * scale,
        0.7 * scale,
        0.7,
        0.75,
        0.8,
        0.14,
        shadowVis,
        2,
        0,
        0.8,
        -1,
      );
    }

    // 水花飞溅微粒
    const rCol = 1.9 * shadowVis + 0.35;
    const gCol = 1.5 * shadowVis + 0.45;
    const bCol = 1.05 * shadowVis + 0.55;
    const dropletCount = Math.round(14 * Math.min(scale, 1.6));

    for (let i = 0; i < dropletCount; i++) {
      randomVectorInCone(UP_VECTOR, 0.75, vTempAim);
      const spd = randomRange(1.5, 4.8) * Math.sqrt(scale);
      const dIdx = addPool.emit(
        pos.x,
        posY + 0.03,
        pos.z,
        vTempAim.x * spd,
        Math.abs(vTempAim.y) * spd,
        vTempAim.z * spd,
        randomRange(0.5, 1),
        randomRange(0.012, 0.024),
        0.01,
      );
      if (dIdx >= 0) {
        addPool.mode[dIdx] = PARTICLE_MODE_VELOCITY_STRETCH;
        addPool.frame[dIdx] = SPARK_FRAME_DROPLET;
        addPool.stretch[dIdx] = 0.012;
        addPool.grav[dIdx] = 9.81;
        addPool.drag[dIdx] = 0.4;
        addPool.r[dIdx] = rCol;
        addPool.g[dIdx] = gCol;
        addPool.b[dIdx] = bCol;
        addPool.fout[dIdx] = 0.7;
        addPool.flags[dIdx] = PARTICLE_FLAG_DIE_ON_FLOOR;
        addPool.sk[dIdx] = 1;
        addPool.gy[dIdx] = posY;
      }
    }

    // 扩散同心圆涟漪
    emitWaterRippleRing(
      pos.x,
      posY + 0.012,
      pos.z,
      0.9,
      0.12 * scale,
      1.5 * scale,
      0.3 * shadowVis + 0.08,
      0.27 * shadowVis + 0.09,
      0.22 * shadowVis + 0.1,
    );
    const rip2 = emitWaterRippleRing(
      pos.x,
      posY + 0.012,
      pos.z,
      1.3,
      0.05 * scale,
      1 * scale,
      0.2 * shadowVis + 0.05,
      0.18 * shadowVis + 0.06,
      0.15 * shadowVis + 0.07,
    );
    if (rip2 >= 0) addPool.fin[rip2] = 0.35;
  }

  function impact(point, normal, surface = "concrete", dir = null, enemy = null) {
    vTempNorm.copy(normal || UP_VECTOR);
    if (vTempNorm.lengthSq() < 1e-6) vTempNorm.copy(UP_VECTOR);
    vTempNorm.normalize();

    if (dir && dir.lengthSq() > 1e-6) {
      vTempDir.copy(dir).normalize();
    } else {
      vTempDir.copy(vTempNorm).negate();
    }

    // 计算反射向量 (Reflect vector = dir - 2*(dir . norm)*norm)
    vTempReflect
      .copy(vTempDir)
      .addScaledVector(vTempNorm, -2 * vTempDir.dot(vTempNorm))
      .normalize();
    vTempPoint.copy(point);

    if (enemy) surface = "enemy";

    // 检查是否击中水坑
    if (
      surface !== "enemy" &&
      surface !== "water" &&
      vTempNorm.y > 0.7 &&
      engineCtx.ground &&
      engineCtx.ground.isPuddle
    ) {
      try {
        if (engineCtx.ground.isPuddle(vTempPoint.x, vTempPoint.z) && vTempPoint.y < 0.08) {
          surface = "water";
        }
      } catch {}
    }

    const camPos = engineCtx.camera ? engineCtx.camera.position : vTempCamPos.set(0, 0, 0);
    const isFar = camPos.distanceToSquared(vTempPoint) > 3025; // 55 米以外降低 LOD
    const lodScale = isFar ? 0.5 : 1.0;
    const nx = vTempNorm.x,
      ny = vTempNorm.y,
      nz = vTempNorm.z;

    switch (surface) {
      case "metal": {
        vTempAim.copy(vTempReflect).addScaledVector(vTempNorm, 0.6).normalize();
        emitSparksCone(
          vTempPoint,
          vTempAim,
          Math.round(18 * lodScale),
          6,
          24,
          0.55,
          0.1,
          0.38,
          40,
          25,
          10.5,
          0,
        );
        emitSparksCone(
          vTempPoint,
          vTempAim,
          2 + Math.floor(Math.random() * 2),
          9,
          18,
          0.9,
          0.7,
          1.3,
          32,
          18,
          7,
          PARTICLE_FLAG_BOUNCE_FLOOR,
        );

        emitStaticAddFlare(
          vTempPoint.x + nx * 0.03,
          vTempPoint.y + ny * 0.03,
          vTempPoint.z + nz * 0.03,
          0.05,
          0.25,
          0.45,
          16,
          11,
          5.5,
          SPARK_FRAME_SOFT_DOT,
        );
        emitStaticAddFlare(
          vTempPoint.x + nx * 0.04,
          vTempPoint.y + ny * 0.04,
          vTempPoint.z + nz * 0.04,
          0.04,
          0.35,
          0.5,
          9,
          6,
          2.6,
          SPARK_FRAME_STARBURST1 + Math.floor(Math.random() * 2),
        );

        if (globalTime - lastMuzzleFlashTime > 0.09) {
          lastMuzzleFlashTime = globalTime;
          vTempCamPos.copy(vTempPoint).addScaledVector(vTempNorm, 0.12);
          flashLight(vTempCamPos, 0xffbe30, 10, 5, 0.05);
        }

        const shadowVis = queryShadowVisibility(vTempPoint, vTempNorm);
        for (let i = 0; i < 2; i++) {
          emitLitSmoke(
            vTempPoint.x + nx * 0.04,
            vTempPoint.y + ny * 0.04,
            vTempPoint.z + nz * 0.04,
            nx * 0.8 + (Math.random() - 0.5) * 0.5,
            ny * 0.8 + 0.2,
            nz * 0.8 + (Math.random() - 0.5) * 0.5,
            randomRange(0.5, 0.9),
            0.06,
            randomRange(0.3, 0.5),
            0.4,
            0.4,
            0.41,
            0.4,
            shadowVis,
            2.5,
            0.3,
            0.8,
            -1,
          );
        }

        if (!isFar) {
          emitFlyingDebrisChunks(
            vTempPoint,
            vTempNorm,
            2,
            1.5,
            4,
            0.012,
            0.03,
            0.003,
            0.005,
            0.01,
            0.025,
            0.2,
            0.21,
            0.23,
            0.8,
            queryFloorHeight(vTempPoint),
          );
        }
        decalSystem.add(vTempPoint, vTempNorm, "bullet_metal");
        break;
      }

      case "wood": {
        const shadowVis = dust(vTempPoint, vTempNorm, 0.75, 0.5, 0.42, 0.32);
        emitFlyingDebrisChunks(
          vTempPoint,
          vTempNorm,
          isFar ? 3 : 7,
          2,
          6,
          0.004,
          0.009,
          0.03,
          0.1,
          0.004,
          0.012,
          0.62,
          0.5,
          0.33,
          0.7,
          queryFloorHeight(vTempPoint),
        );
        if (shadowVis > 0.5 && Math.random() < 0.3) {
          emitStaticAddFlare(
            vTempPoint.x,
            vTempPoint.y,
            vTempPoint.z,
            0.04,
            0.1,
            0.2,
            3,
            2,
            1,
            SPARK_FRAME_SOFT_DOT,
          );
        }
        decalSystem.add(vTempPoint, vTempNorm, "bullet_wood");
        break;
      }

      case "water": {
        splash(vTempPoint, 1);
        break;
      }

      case "rubber":
      case "dirt": {
        const shadowVis = queryShadowVisibility(vTempPoint, vTempNorm);
        const isDirt = surface === "dirt";
        const rCol = isDirt ? 0.3 : 0.14;
        const gCol = isDirt ? 0.25 : 0.14;
        const bCol = isDirt ? 0.19 : 0.14;

        for (let i = 0; i < 5; i++) {
          randomVectorInCone(vTempNorm, 0.6, vTempAim);
          const spd = randomRange(0.6, 2.6);
          emitLitSmoke(
            vTempPoint.x + nx * 0.03,
            vTempPoint.y + ny * 0.03,
            vTempPoint.z + nz * 0.03,
            vTempAim.x * spd,
            vTempAim.y * spd,
            vTempAim.z * spd,
            randomRange(0.5, 1),
            0.07,
            randomRange(0.3, 0.55),
            rCol,
            gCol,
            bCol,
            0.85,
            shadowVis,
            3.5,
            0.1,
            0.6,
            i < 2 ? 7 : -1,
          );
        }

        emitFlyingDebrisChunks(
          vTempPoint,
          vTempNorm,
          3,
          1.5,
          4,
          0.01,
          0.03,
          0.008,
          0.02,
          0.01,
          0.03,
          rCol * 0.8,
          gCol * 0.8,
          bCol * 0.8,
          0.7,
          queryFloorHeight(vTempPoint),
        );
        decalSystem.add(vTempPoint, vTempNorm, "soot", 0.2, 1, 0.8);
        break;
      }

      case "glass": {
        for (let i = 0; i < 12; i++) {
          randomVectorInCone(vTempNorm, 0.9, vTempAim);
          const spd = randomRange(1.5, 6);
          const dIdx = addPool.emit(
            vTempPoint.x,
            vTempPoint.y,
            vTempPoint.z,
            vTempAim.x * spd,
            vTempAim.y * spd,
            vTempAim.z * spd,
            randomRange(0.4, 0.9),
            randomRange(0.012, 0.02),
            0.008,
          );
          if (dIdx >= 0) {
            addPool.mode[dIdx] = PARTICLE_MODE_VELOCITY_STRETCH;
            addPool.frame[dIdx] = SPARK_FRAME_DROPLET;
            addPool.stretch[dIdx] = 0.01;
            addPool.grav[dIdx] = 9.81;
            addPool.r[dIdx] = 2.6;
            addPool.g[dIdx] = 2.7;
            addPool.b[dIdx] = 2.8;
            addPool.flags[dIdx] = PARTICLE_FLAG_DIE_ON_FLOOR;
            addPool.ramp[dIdx] = 3;
          }
        }

        emitFlyingDebrisChunks(
          vTempPoint,
          vTempNorm,
          4,
          1.5,
          5,
          0.01,
          0.03,
          0.002,
          0.004,
          0.01,
          0.03,
          0.62,
          0.72,
          0.74,
          0.8,
          queryFloorHeight(vTempPoint),
        );
        emitLitSmoke(
          vTempPoint.x,
          vTempPoint.y,
          vTempPoint.z,
          nx * 0.6,
          ny * 0.6 + 0.2,
          nz * 0.6,
          0.6,
          0.08,
          0.4,
          0.75,
          0.8,
          0.82,
          0.2,
          queryShadowVisibility(vTempPoint, vTempNorm),
          2.5,
          0.2,
          0.8,
          -1,
        );
        decalSystem.add(vTempPoint, vTempNorm, "bullet_glass");
        break;
      }

      case "enemy": {
        vTempAim.copy(vTempReflect).addScaledVector(vTempNorm, 0.8).normalize();
        emitSparksCone(
          vTempPoint,
          vTempAim,
          Math.round(13 * lodScale),
          5,
          20,
          0.9,
          0.12,
          0.45,
          42,
          29,
          14,
          0,
        );
        emitSparksCone(
          vTempPoint,
          vTempAim,
          2,
          6,
          12,
          1.0,
          0.6,
          1.1,
          32,
          18,
          7,
          PARTICLE_FLAG_BOUNCE_FLOOR,
        );

        emitStaticAddFlare(
          vTempPoint.x,
          vTempPoint.y,
          vTempPoint.z,
          0.06,
          0.3,
          0.55,
          18,
          12,
          6,
          SPARK_FRAME_SOFT_DOT,
        );
        emitStaticAddFlare(
          vTempPoint.x,
          vTempPoint.y,
          vTempPoint.z,
          0.04,
          0.3,
          0.45,
          8,
          5,
          2.4,
          SPARK_FRAME_STARBURST1 + Math.floor(Math.random() * 2),
        );

        if (globalTime - lastMuzzleFlashTime > 0.09) {
          lastMuzzleFlashTime = globalTime;
          flashLight(vTempPoint, 0xff7000, 8, 4.5, 0.05);
        }

        const shadowVis = queryShadowVisibility(vTempPoint, vTempNorm);
        for (let i = 0; i < 2; i++) {
          emitLitSmoke(
            vTempPoint.x,
            vTempPoint.y,
            vTempPoint.z,
            nx * 0.5 + (Math.random() - 0.5) * 0.4,
            ny * 0.5 + 0.3,
            nz * 0.5 + (Math.random() - 0.5) * 0.4,
            randomRange(0.6, 1.1),
            0.06,
            randomRange(0.3, 0.5),
            0.13,
            0.13,
            0.14,
            0.65,
            shadowVis,
            2.2,
            0.5,
            0.9,
            -1,
          );
        }

        if (!isFar) {
          const isBloodSpark = Math.random() < 0.35;
          emitFlyingDebrisChunks(
            vTempPoint,
            vTempNorm,
            3,
            2,
            6,
            0.012,
            0.035,
            0.004,
            0.008,
            0.012,
            0.03,
            0.6,
            isBloodSpark ? 0.2 : 0.62,
            isBloodSpark ? 0.05 : 0.64,
            0.8,
            queryFloorHeight(vTempPoint),
          );
        }
        break;
      }

      default: {
        // 混凝土默认表面 (Concrete default)
        dust(vTempPoint, vTempNorm, 1, 0.52, 0.5, 0.47);
        emitFlyingDebrisChunks(
          vTempPoint,
          vTempNorm,
          isFar ? 2 : 4,
          1.5,
          5.5,
          0.012,
          0.035,
          0.008,
          0.02,
          0.012,
          0.035,
          0.42,
          0.41,
          0.39,
          0.7,
          queryFloorHeight(vTempPoint),
        );

        vTempAim.copy(vTempReflect).addScaledVector(vTempNorm, 0.7).normalize();
        for (let i = 0; i < 4; i++) {
          randomVectorInCone(vTempAim, 0.5, vTempAim);
          const spd = randomRange(3, 9);
          const sIdx = emitLitSmoke(
            vTempPoint.x,
            vTempPoint.y,
            vTempPoint.z,
            vTempAim.x * spd,
            vTempAim.y * spd,
            vTempAim.z * spd,
            randomRange(0.25, 0.45),
            0.03,
            0.09,
            0.6,
            0.58,
            0.54,
            0.7,
            1,
            2,
            -6,
            0.2,
            7,
          );
          if (sIdx >= 0) litPool.turb[sIdx] = 0;
        }

        if (Math.random() < 0.3) {
          emitSparksCone(vTempPoint, vTempAim, 3, 4, 10, 0.6, 0.08, 0.2, 26, 15, 6, 0);
        }
        decalSystem.add(vTempPoint, vTempNorm, "bullet_concrete");
      }
    }
  }

  function tracer(fromPos, toPos, opts = {}) {
    const col = parseColorToArray(opts.color, 1, 0.8, 0.46);
    const intensity = opts.intensity || 16;
    tracerPool.add(
      fromPos,
      toPos,
      col[0] * intensity,
      col[1] * intensity,
      col[2] * intensity,
      opts.speed || 260,
      opts.width || 0.024,
    );

    if (globalTime - lastTracerSmokeTime > 0.07 && opts.trail !== false) {
      lastTracerSmokeTime = globalTime;
      vTempAim.subVectors(toPos, fromPos);
      const dist = vTempAim.length();
      if (dist > 2) {
        vTempAim.multiplyScalar(1 / dist);
        const steps = 5;
        const maxDist = Math.min(dist, 7);
        const shadowVis = queryShadowVisibility(fromPos, null);
        for (let i = 0; i < steps; i++) {
          const stepDist = 0.6 + ((i + Math.random()) / steps) * (maxDist - 0.6);
          const tIdx = emitLitSmoke(
            fromPos.x + vTempAim.x * stepDist,
            fromPos.y + vTempAim.y * stepDist,
            fromPos.z + vTempAim.z * stepDist,
            vTempAim.x * 0.6,
            0.05,
            vTempAim.z * 0.6,
            randomRange(0.45, 0.8),
            0.04,
            randomRange(0.12, 0.2),
            0.6,
            0.6,
            0.62,
            0.1,
            shadowVis,
            2,
            0.1,
            0.7,
            -1,
          );
          if (tIdx >= 0) litPool.fin[tIdx] = 0.25;
        }
      }
    }
  }

  function muzzleFlash(pos, dir, opts = {}) {
    const scale = opts.scale || 1;
    vTempAim.copy(dir || UP_VECTOR);
    if (vTempAim.lengthSq() < 1e-6) vTempAim.set(0, 0, -1);
    vTempAim.normalize();

    const col = parseColorToArray(opts.color, 1, 0.68, 0.32);
    const px = pos.x,
      py = pos.y,
      pz = pos.z;
    const cr = col[0],
      cg = col[1],
      cb = col[2];

    emitStaticAddFlare(
      px + vTempAim.x * 0.1 * scale,
      py + vTempAim.y * 0.1 * scale,
      pz + vTempAim.z * 0.1 * scale,
      0.045,
      0.75 * scale,
      1.15 * scale,
      34 * cr,
      34 * cg,
      34 * cb,
      SPARK_FRAME_STARBURST1,
    );
    emitStaticAddFlare(
      px + vTempAim.x * 0.14 * scale,
      py + vTempAim.y * 0.14 * scale,
      pz + vTempAim.z * 0.14 * scale,
      0.035,
      0.5 * scale,
      0.85 * scale,
      22 * cr,
      22 * cg,
      22 * cb,
      SPARK_FRAME_STARBURST2,
    );
    emitStaticAddFlare(
      px + vTempAim.x * 0.05 * scale,
      py + vTempAim.y * 0.05 * scale,
      pz + vTempAim.z * 0.05 * scale,
      0.045,
      0.13 * scale,
      0.2 * scale,
      22,
      22 * (cg + 0.25),
      22 * (cb + 0.3),
      SPARK_FRAME_SOFT_DOT,
    );
    emitStaticAddFlare(
      px,
      py,
      pz,
      0.05,
      0.8 * scale,
      1.1 * scale,
      0.4 * cr,
      0.4 * cg,
      0.4 * cb,
      SPARK_FRAME_SOFT_DOT,
    );

    const fIdx = addPool.emit(
      px + vTempAim.x * 0.4 * scale,
      py + vTempAim.y * 0.4 * scale,
      pz + vTempAim.z * 0.4 * scale,
      -vTempAim.x,
      -vTempAim.y,
      -vTempAim.z,
      0.04,
      0.11 * scale,
      0.14 * scale,
    );
    if (fIdx >= 0) {
      addPool.mode[fIdx] = PARTICLE_MODE_VELOCITY_STRETCH;
      addPool.frame[fIdx] = SPARK_FRAME_TRACER_TIP;
      addPool.stretch[fIdx] = 0.9 * scale;
      addPool.r[fIdx] = 18 * cr;
      addPool.g[fIdx] = 18 * cg;
      addPool.b[fIdx] = 18 * cb;
      addPool.fout[fIdx] = 0.3;
    }

    for (let i = 0; i < 3; i++) {
      randomVectorInCone(vTempAim, 0.25, vTempNorm);
      const spd = randomRange(8, 22);
      emitAddSparkStreak(
        px,
        py,
        pz,
        vTempNorm.x * spd,
        vTempNorm.y * spd,
        vTempNorm.z * spd,
        randomRange(0.08, 0.22),
        0.012,
        30,
        18,
        7,
        0,
      );
    }

    emitLitSmoke(
      px + vTempAim.x * 0.2,
      py + vTempAim.y * 0.2,
      pz + vTempAim.z * 0.2,
      vTempAim.x * 1.5,
      vTempAim.y * 1.5 + 0.2,
      vTempAim.z * 1.5,
      randomRange(0.5, 0.9),
      0.08 * scale,
      0.45 * scale,
      0.5,
      0.5,
      0.52,
      0.16,
      1,
      3,
      0.3,
      0.8,
      -1,
    );

    vTempCamPos.copy(pos).addScaledVector(vTempAim, 0.25);
    flashLight(vTempCamPos, 0xff7000, 16 * scale, 7 * scale, 0.05);
  }

  function shell(gunPos, ejectVelocity) {
    shellSystem.add(gunPos, ejectVelocity);
  }

  const vExplosionEvent = { pos: new THREE.Vector3(), size: 1 };

  function explosion(pos, size = 1) {
    const scale = Math.max(0.4, Math.min(size, 4));
    const px = pos.x,
      py = pos.y,
      pz = pos.z;
    const sqrtScale = Math.sqrt(scale);
    const floorY = queryFloorHeight(pos);
    const nearGround = py - floorY < 1.4 * scale;
    const shadowVis = queryShadowVisibility(pos, UP_VECTOR);

    vTempCamPos.set(px, py + 0.4, pz);
    flashLight(vTempCamPos, 0xffe470, 320 * scale, 10 + 9 * scale, 0.08);
    flashLight(vTempCamPos, 0xff7010, 55 * scale, 8 + 6 * scale, 0.45);

    const centerY = py + 0.35 * scale;
    emitStaticAddFlare(
      px,
      centerY,
      pz,
      0.055,
      1.5 * scale,
      2.3 * scale,
      16,
      13.5,
      9.5,
      SPARK_FRAME_SOFT_DOT,
    );
    emitStaticAddFlare(
      px,
      centerY,
      pz,
      0.05,
      2.6 * scale,
      4.2 * scale,
      7,
      5,
      2.4,
      SPARK_FRAME_STARBURST1 + Math.floor(Math.random() * 2),
    );
    emitStaticAddFlare(
      px,
      centerY,
      pz,
      0.3,
      3.5 * scale,
      5.5 * scale,
      0.35,
      0.2,
      0.08,
      SPARK_FRAME_SOFT_DOT,
    );

    // 火球膨胀火舌 (Fire lobes)
    const fireLobes = Math.round(13 + 5 * scale);
    for (let i = 0; i < fireLobes; i++) {
      randomVectorInCone(UP_VECTOR, 1.6, vTempAim);
      if (nearGround && vTempAim.y < -0.1) vTempAim.y = -vTempAim.y * 0.5;
      const spd = randomRange(2.2, 7.5) * sqrtScale;
      const colMult = randomRange(0.7, 1.15);
      const idx = litPool.emit(
        px + vTempAim.x * 0.3 * scale,
        centerY + vTempAim.y * 0.3 * scale,
        pz + vTempAim.z * 0.3 * scale,
        vTempAim.x * spd,
        vTempAim.y * spd + 1.4,
        vTempAim.z * spd,
        randomRange(0.55, 1.05),
        0.85 * scale,
        randomRange(1.8, 2.7) * scale,
      );
      if (idx >= 0) {
        litPool.frame[idx] = i % 4 === 0 ? 7 : Math.floor(Math.random() * 6);
        litPool.ramp[idx] = 2;
        litPool.r[idx] = 5.8 * colMult;
        litPool.g[idx] = 2.4 * colMult;
        litPool.b[idx] = 0.5 * colMult;
        litPool.a[idx] = 0.96;
        litPool.shade[idx] = 2 + shadowVis;
        litPool.drag[idx] = 4;
        litPool.grav[idx] = -2.6;
        litPool.wind[idx] = 0.6;
        litPool.turb[idx] = 1.5;
        litPool.rot[idx] = Math.random() * 6.283;
        litPool.rotv[idx] = (Math.random() - 0.5) * 2.5;
        litPool.sk[idx] = 3;
        litPool.fin[idx] = 0;
        litPool.fout[idx] = 0.6;
      }
    }

    // 内部高热核心发光体
    for (let i = 0; i < 5; i++) {
      randomVectorInCone(UP_VECTOR, 1.4, vTempAim);
      const spd = randomRange(2, 5) * sqrtScale;
      const pIdx = addPool.emit(
        px + vTempAim.x * 0.3 * scale,
        centerY + vTempAim.y * 0.3 * scale,
        pz + vTempAim.z * 0.3 * scale,
        vTempAim.x * spd,
        Math.abs(vTempAim.y) * spd + 1.2,
        vTempAim.z * spd,
        randomRange(0.3, 0.55),
        0.6 * scale,
        randomRange(1.2, 1.8) * scale,
      );
      if (pIdx >= 0) {
        addPool.frame[pIdx] = SPARK_FRAME_PLASMA;
        addPool.ramp[pIdx] = 2;
        addPool.r[pIdx] = 2.4;
        addPool.g[pIdx] = 1.1;
        addPool.b[pIdx] = 0.3;
        addPool.drag[pIdx] = 4;
        addPool.grav[pIdx] = -2.5;
        addPool.rot[pIdx] = Math.random() * 6.283;
        addPool.sk[pIdx] = 3;
        addPool.fout[pIdx] = 0.4;
      }
    }

    // 滚滚黑浓烟柱 (Thick black smoke columns)
    const smokePuffs = Math.round(11 + 5 * scale);
    for (let i = 0; i < smokePuffs; i++) {
      const isFast = i % 2 === 0;
      randomVectorInCone(UP_VECTOR, 1.4, vTempAim);
      if (nearGround && vTempAim.y < 0) vTempAim.y = -vTempAim.y * 0.4;
      const spd = (isFast ? randomRange(4.5, 9) : randomRange(1.5, 5)) * sqrtScale;
      const gray = randomRange(0.04, 0.1);
      const rad = isFast ? 0.75 : 0.3;
      const sIdx = emitLitSmoke(
        px + vTempAim.x * rad * scale,
        centerY + vTempAim.y * rad * scale,
        pz + vTempAim.z * rad * scale,
        vTempAim.x * spd,
        vTempAim.y * spd + 0.8,
        vTempAim.z * spd,
        randomRange(2.8, 4.8),
        (isFast ? 0.8 : 1.2) * scale,
        randomRange(2.6, 4.2) * scale,
        gray,
        gray * 0.95,
        gray * 0.9,
        isFast ? 0.7 : 0.8,
        shadowVis,
        3.4,
        randomRange(0.8, 1.7),
        1,
        i % 3 === 0 ? 7 : -1,
      );
      if (sIdx >= 0) {
        litPool.fin[sIdx] = isFast ? 0.025 : 0.16;
        litPool.fout[sIdx] = 0.35;
        litPool.turb[sIdx] = 1.2;
      }
    }

    // 产生地面持续余烟发射器
    spawnContinuousEmitter(
      px,
      py + 0.3 * scale,
      pz,
      "smolder",
      1.3 + 0.3 * scale,
      scale,
      shadowVis,
    );

    // 高速火花飞溅 (High-velocity sparks)
    const sparkCount = Math.min(90, Math.round(34 * scale));
    for (let i = 0; i < sparkCount; i++) {
      randomVectorInCone(UP_VECTOR, 1.5, vTempAim);
      if (nearGround && vTempAim.y < 0) vTempAim.y = -vTempAim.y;
      const spd = randomRange(6, 26) * sqrtScale;
      const spkIdx = emitAddSparkStreak(
        px,
        py + 0.05,
        pz,
        vTempAim.x * spd,
        vTempAim.y * spd,
        vTempAim.z * spd,
        randomRange(0.5, 1.5),
        randomRange(0.014, 0.028),
        40,
        23,
        8,
        PARTICLE_FLAG_BOUNCE_FLOOR,
      );
      if (spkIdx >= 0) {
        addPool.drag[spkIdx] = 1.4;
        addPool.stretch[spkIdx] = 0.035;
      }
    }

    // 漂浮慢火星余烬 (Floating embers)
    for (let i = 0; i < 10 * scale; i++) {
      randomVectorInCone(UP_VECTOR, 1.2, vTempAim);
      const spd = randomRange(1, 5);
      const eIdx = addPool.emit(
        px,
        py + 0.3,
        pz,
        vTempAim.x * spd,
        Math.abs(vTempAim.y) * spd + 1,
        vTempAim.z * spd,
        randomRange(1.4, 3),
        0.035,
        0.02,
      );
      if (eIdx >= 0) {
        addPool.frame[eIdx] = SPARK_FRAME_SOFT_DOT;
        addPool.ramp[eIdx] = 3;
        addPool.r[eIdx] = 9;
        addPool.g[eIdx] = 4;
        addPool.b[eIdx] = 1;
        addPool.drag[eIdx] = 1.2;
        addPool.grav[eIdx] = 0.6;
        addPool.turb[eIdx] = 3;
        addPool.wind[eIdx] = 1;
        addPool.fout[eIdx] = 0.5;
      }
    }

    // 贴地冲击波扩散环与烧焦贴花
    if (nearGround) {
      const shockY = floorY + 0.015;
      emitWaterRippleRing(px, shockY, pz, 0.32, 0.6 * scale, 9 * scale, 1.6, 1.2, 0.75);

      const ringPuffs = Math.round(12 + 3 * scale);
      for (let i = 0; i < ringPuffs; i++) {
        const ang = ((i + Math.random()) / ringPuffs) * 6.283;
        const spd = randomRange(5, 10) * sqrtScale;
        const gray = randomRange(0.42, 0.55);
        const rIdx = emitLitSmoke(
          px + Math.cos(ang) * 0.4 * scale,
          shockY + 0.2,
          pz + Math.sin(ang) * 0.4 * scale,
          Math.cos(ang) * spd,
          randomRange(0.2, 0.9),
          Math.sin(ang) * spd,
          randomRange(1.2, 2.2),
          0.4 * scale,
          randomRange(1.2, 1.9) * scale,
          gray,
          gray * 0.96,
          gray * 0.9,
          0.26,
          shadowVis,
          3,
          0.15,
          0.7,
          -1,
        );
        if (rIdx >= 0) litPool.fin[rIdx] = 0.1;
      }

      vTempPos.set(px, floorY, pz);
      decalSystem.add(vTempPos, UP_VECTOR, "scorch", 2.3 * scale, 1, 0.92);
    }

    // 爆炸重力石块飞溅
    vTempPos.set(px, Math.max(py, floorY + 0.1), pz);
    emitFlyingDebrisChunks(
      vTempPos,
      UP_VECTOR,
      Math.round(13 + 6 * scale),
      4,
      13 * sqrtScale,
      0.04,
      0.13,
      0.025,
      0.08,
      0.04,
      0.13,
      0.07,
      0.066,
      0.062,
      1.1,
      floorY,
    );

    vExplosionEvent.pos.copy(pos);
    vExplosionEvent.size = size;
    engineCtx.events.emit("explosion", vExplosionEvent);
  }

  // ==========================================================================
  // 十二、 持续粒子发射器池 (Continuous Emitters)
  // ==========================================================================

  const continuousEmitters = [];
  for (let i = 0; i < 24; i++) {
    const emitter = {
      active: false,
      kind: "steam",
      pos: new THREE.Vector3(),
      acc: 0,
      acc2: 0,
      ttl: Infinity,
      scale: 1,
      shade: 1,
      t: 0,
      light: null,
      drop: -1,
      stop() {
        emitter.active = false;
        if (emitter.light) {
          emitter.light.release();
          emitter.light = null;
        }
      },
      setPos(p) {
        emitter.pos.copy(p);
      },
    };
    continuousEmitters.push(emitter);
  }

  const dummyEmitter = {
    active: false,
    pos: new THREE.Vector3(),
    stop() {},
    setPos() {},
  };

  function spawnContinuousEmitter(x, y, z, kind, ttl, scale, shade) {
    let target = null;
    for (let i = 0; i < continuousEmitters.length; i++) {
      if (!continuousEmitters[i].active) {
        target = continuousEmitters[i];
        break;
      }
    }
    if (!target) return dummyEmitter;

    target.active = true;
    target.kind = kind;
    target.pos.set(x, y, z);
    target.acc = 0;
    target.acc2 = 0;
    target.ttl = ttl;
    target.scale = scale;
    target.t = 0;
    target.drop = -1;
    target.shade = shade === undefined ? queryShadowVisibility(target.pos, null) : shade;

    if (kind === "fire") {
      const lp = getLightPool();
      target.light = lp && lp.acquire ? lp.acquire() : null;
      if (target.light) {
        target.light.light.color.set(0xff801a);
        target.light.light.distance = 9;
        target.light.light.position.set(x, y + 0.5, z);
      }
    }
    return target;
  }

  function addEmitter(pos, kind = "steam", opts = {}) {
    return spawnContinuousEmitter(
      pos.x,
      pos.y,
      pos.z,
      kind,
      opts.ttl || Infinity,
      opts.scale || 1,
      undefined,
    );
  }

  function updateContinuousEmitters(dt) {
    for (let i = 0; i < continuousEmitters.length; i++) {
      const em = continuousEmitters[i];
      if (!em.active) continue;

      em.t += dt;
      if (em.t > em.ttl) {
        em.stop();
        continue;
      }

      const px = em.pos.x,
        py = em.pos.y,
        pz = em.pos.z,
        sc = em.scale;

      if (em.kind === "steam") {
        em.acc += dt * 13;
        while (em.acc > 1) {
          em.acc -= 1;
          const sIdx = emitLitSmoke(
            px + (Math.random() - 0.5) * 0.08,
            py,
            pz + (Math.random() - 0.5) * 0.08,
            (Math.random() - 0.5) * 0.4,
            randomRange(1.4, 2.4),
            (Math.random() - 0.5) * 0.4,
            randomRange(1.8, 3),
            0.12 * sc,
            randomRange(0.8, 1.3) * sc,
            0.8,
            0.82,
            0.85,
            0.2,
            em.shade,
            1.3,
            0.5,
            1,
            -1,
          );
          if (sIdx >= 0) {
            litPool.fin[sIdx] = 0.12;
            litPool.turb[sIdx] = 0.9;
          }
        }
      } else if (em.kind === "smolder") {
        em.acc += dt * 9 * (1 - em.t / em.ttl);
        while (em.acc > 1) {
          em.acc -= 1;
          const gray = randomRange(0.05, 0.11);
          const sIdx = emitLitSmoke(
            px + (Math.random() - 0.5) * 0.5 * sc,
            py,
            pz + (Math.random() - 0.5) * 0.5 * sc,
            (Math.random() - 0.5) * 0.6,
            randomRange(1.2, 2.4),
            (Math.random() - 0.5) * 0.6,
            randomRange(2.4, 3.8),
            0.5 * sc,
            randomRange(1.6, 2.6) * sc,
            gray,
            gray,
            gray,
            0.6,
            em.shade,
            1,
            0.9,
            1,
            -1,
          );
          if (sIdx >= 0) {
            litPool.fin[sIdx] = 0.12;
            litPool.turb[sIdx] = 1;
          }
        }
      } else if (em.kind === "embers") {
        em.acc += dt * 8;
        while (em.acc > 1) {
          em.acc -= 1;
          const eIdx = addPool.emit(
            px + (Math.random() - 0.5) * 0.4 * sc,
            py,
            pz + (Math.random() - 0.5) * 0.4 * sc,
            (Math.random() - 0.5) * 0.6,
            randomRange(0.6, 1.8),
            (Math.random() - 0.5) * 0.6,
            randomRange(1.5, 3.2),
            randomRange(0.02, 0.04),
            0.012,
          );
          if (eIdx >= 0) {
            addPool.frame[eIdx] = SPARK_FRAME_SOFT_DOT;
            addPool.ramp[eIdx] = 3;
            addPool.r[eIdx] = 10;
            addPool.g[eIdx] = 4.2;
            addPool.b[eIdx] = 1;
            addPool.drag[eIdx] = 0.8;
            addPool.grav[eIdx] = -0.5;
            addPool.turb[eIdx] = 3.5;
            addPool.wind[eIdx] = 1;
            addPool.fout[eIdx] = 0.5;
          }
        }
      } else if (em.kind === "fire") {
        em.acc += dt * 24;
        while (em.acc > 1) {
          em.acc -= 1;
          const fIdx = addPool.emit(
            px + (Math.random() - 0.5) * 0.3 * sc,
            py + 0.1 * sc,
            pz + (Math.random() - 0.5) * 0.3 * sc,
            (Math.random() - 0.5) * 0.5,
            randomRange(1.2, 2.6) * sc,
            (Math.random() - 0.5) * 0.5,
            randomRange(0.35, 0.65),
            0.45 * sc,
            randomRange(0.2, 0.35) * sc,
          );
          if (fIdx >= 0) {
            addPool.frame[fIdx] = SPARK_FRAME_PLASMA;
            addPool.ramp[fIdx] = 2;
            addPool.r[fIdx] = 9;
            addPool.g[fIdx] = 5.5;
            addPool.b[fIdx] = 2.2;
            addPool.drag[fIdx] = 1;
            addPool.rot[fIdx] = Math.random() * 6.283;
            addPool.rotv[fIdx] = (Math.random() - 0.5) * 4;
            addPool.fin[fIdx] = 0.12;
            addPool.fout[fIdx] = 0.4;
            addPool.wind[fIdx] = 1;
            addPool.turb[fIdx] = 2;
          }
        }

        em.acc2 += dt * 4;
        while (em.acc2 > 1) {
          em.acc2 -= 1;
          const gray = randomRange(0.05, 0.1);
          const sIdx = emitLitSmoke(
            px,
            py + 0.8 * sc,
            pz,
            (Math.random() - 0.5) * 0.4,
            randomRange(1.2, 2),
            (Math.random() - 0.5) * 0.4,
            randomRange(2.2, 3.4),
            0.3 * sc,
            randomRange(1.1, 1.8) * sc,
            gray,
            gray,
            gray,
            0.5,
            em.shade,
            0.9,
            0.8,
            1,
            -1,
          );
          if (sIdx >= 0) {
            litPool.fin[sIdx] = 0.2;
            litPool.turb[sIdx] = 1;
          }

          const eIdx = addPool.emit(
            px + (Math.random() - 0.5) * 0.3,
            py + 0.3,
            pz + (Math.random() - 0.5) * 0.3,
            Math.random() - 0.5,
            randomRange(1.5, 3),
            Math.random() - 0.5,
            randomRange(1, 2.2),
            0.03,
            0.012,
          );
          if (eIdx >= 0) {
            addPool.frame[eIdx] = SPARK_FRAME_SOFT_DOT;
            addPool.ramp[eIdx] = 3;
            addPool.r[eIdx] = 10;
            addPool.g[eIdx] = 4.2;
            addPool.b[eIdx] = 1;
            addPool.drag[eIdx] = 0.8;
            addPool.grav[eIdx] = -0.6;
            addPool.turb[eIdx] = 4;
            addPool.wind[eIdx] = 1;
          }
        }

        if (em.light) {
          em.light.light.intensity =
            (14 + 6 * Math.sin(em.t * 23) + 4 * Math.sin(em.t * 37.7)) * sc;
        }
      } else if (em.kind === "drip") {
        em.acc += dt * 1.6;
        if (em.drop >= 0) {
          em.drop -= dt;
          if (em.drop < 0) {
            const sh = em.shade;
            emitWaterRippleRing(
              px,
              0.014,
              pz,
              0.8,
              0.05,
              0.55,
              0.4 * sh + 0.14,
              0.36 * sh + 0.16,
              0.3 * sh + 0.18,
            );
            for (let d = 0; d < 3; d++) {
              randomVectorInCone(UP_VECTOR, 0.7, vTempAim);
              const spd = addPool.emit(
                px,
                0.03,
                pz,
                vTempAim.x * 1.2,
                Math.abs(vTempAim.y) * 1.6,
                vTempAim.z * 1.2,
                0.35,
                0.012,
                0.008,
              );
              if (spd >= 0) {
                addPool.mode[spd] = PARTICLE_MODE_VELOCITY_STRETCH;
                addPool.frame[spd] = SPARK_FRAME_DROPLET;
                addPool.stretch[spd] = 0.012;
                addPool.grav[spd] = 9.81;
                addPool.r[spd] = 1.6 * sh + 0.3;
                addPool.g[spd] = 1.3 * sh + 0.4;
                addPool.b[spd] = 0.9 * sh + 0.5;
                addPool.flags[spd] = PARTICLE_FLAG_DIE_ON_FLOOR;
              }
            }
          }
        }

        while (em.acc > 1) {
          em.acc -= 1 + Math.random() * 0.6;
          const dropTime = Math.sqrt((2 * Math.max(py, 0.05)) / 9.81);
          const dIdx = addPool.emit(px, py, pz, 0, -0.2, 0, dropTime + 0.05, 0.014, 0.014);
          if (dIdx >= 0) {
            addPool.mode[dIdx] = PARTICLE_MODE_VELOCITY_STRETCH;
            addPool.frame[dIdx] = SPARK_FRAME_DROPLET;
            addPool.stretch[dIdx] = 0.02;
            addPool.grav[dIdx] = 9.81;
            addPool.r[dIdx] = 1.4 * em.shade + 0.4;
            addPool.g[dIdx] = 1.2 * em.shade + 0.5;
            addPool.b[dIdx] = 0.9 * em.shade + 0.6;
            addPool.flags[dIdx] = PARTICLE_FLAG_DIE_ON_FLOOR;
            addPool.fout[dIdx] = 0.98;
          }
          em.drop = dropTime;
        }
      }
    }
  }

  // ==========================================================================
  // 十三、 事件总线绑定 (Event Bus Bindings)
  // ==========================================================================

  engineCtx.events.on("impact", (ev) => {
    if (!ev || !ev.point) return;
    impact(ev.point, ev.normal, ev.surface, ev.dir, ev.enemy);
  });

  const checkPuddle = (x, z) => {
    try {
      return Boolean(
        engineCtx.ground && engineCtx.ground.isPuddle && engineCtx.ground.isPuddle(x, z),
      );
    } catch {
      return false;
    }
  };

  engineCtx.events.on("player:step", (ev) => {
    const pos = (ev && ev.pos) || (engineCtx.player && engineCtx.player.pos);
    if (pos && ((ev && ev.surface === "water") || checkPuddle(pos.x, pos.z))) {
      vTempPos.set(pos.x, Math.max(0, pos.y), pos.z);
      splash(vTempPos, ev && ev.sprint ? 0.55 : 0.4);
    }
  });

  engineCtx.events.on("player:land", (ev) => {
    const pos = engineCtx.player && engineCtx.player.pos;
    if (pos) {
      vTempPos.set(pos.x, Math.max(0, pos.y), pos.z);
      if ((ev && ev.surface === "water") || checkPuddle(pos.x, pos.z)) {
        splash(vTempPos, 0.9);
      } else if (ev && ev.speed > 5) {
        const shadowVis = queryShadowVisibility(vTempPos, UP_VECTOR);
        for (let i = 0; i < 6; i++) {
          const ang = Math.random() * 6.283;
          emitLitSmoke(
            vTempPos.x + Math.cos(ang) * 0.2,
            vTempPos.y + 0.08,
            vTempPos.z + Math.sin(ang) * 0.2,
            Math.cos(ang) * 1.6,
            0.3,
            Math.sin(ang) * 1.6,
            randomRange(0.7, 1.2),
            0.15,
            randomRange(0.5, 0.8),
            0.45,
            0.44,
            0.42,
            0.22,
            shadowVis,
            3,
            0.1,
            0.8,
            -1,
          );
        }
      }
    }
  });

  // ==========================================================================
  // 十四、 主更新循环与生命周期 (Update Loop & Clear)
  // ==========================================================================

  function update(dt) {
    if (dt <= 0) dt = 0;
    globalTime += dt;
    updateContinuousEmitters(dt);

    const camPos = engineCtx.camera ? engineCtx.camera.position : vTempCamPos.set(0, 0, 0);

    litMeshSystem.begin();
    litPool.update(dt, litMeshSystem, camPos, windDir, globalTime);
    litMeshSystem.end();

    addMeshSystem.begin();
    addPool.update(dt, addMeshSystem, camPos, windDir, globalTime);
    tracerPool.update(dt, addMeshSystem, SPARK_FRAME_TRACER_TIP, SPARK_FRAME_SOFT_DOT);
    addMeshSystem.end();

    debrisSystem.update(dt);
    shellSystem.update(dt);
  }

  function clear() {
    litPool.clear();
    addPool.clear();
    tracerPool.clear();
    debrisSystem.clear();
    shellSystem.clear();
    decalSystem.clear();
    for (const em of continuousEmitters) {
      if (em.active) em.stop();
    }
    litMeshSystem.begin();
    litMeshSystem.end();
    addMeshSystem.begin();
    addMeshSystem.end();
  }

  return {
    update,
    clear,
    muzzleFlash,
    tracer,
    impact,
    sparks,
    smoke,
    dust,
    explosion,
    shell,
    splash,
    addEmitter,
    debris,
    decal(pos, normal, type = "bullet_concrete", size) {
      vTempNorm.copy(normal || UP_VECTOR);
      decalSystem.add(pos, vTempNorm, type, size);
    },
    wind: windDir,
    root: rootGroup,
    stats() {
      return {
        lit: litPool.n,
        add: addPool.n,
        tracers: tracerPool.n,
        debris: debrisSystem.live,
        drawCalls: 5,
      };
    },
  };
}

// ============================================================================
// 十五、 特效独立陈列与基准展示模式 (Showcase Environment)
// ============================================================================

export function showcaseFX(engineCtx) {
  const fx = engineCtx.fx;
  const showMode = engineCtx.params.fxshow || "all";
  const showcaseGroup = new THREE.Group();

  const spawnTargetMesh = (geometry, matName, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, engineCtx.mats.get(matName));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    showcaseGroup.add(mesh);
    return mesh;
  };

  // 靶场靶标 (Target props: concrete slab, blue metal container wall, wooden pallet)
  spawnTargetMesh(createBoxBevelGeometry(2.6, 2.2, 0.3, 0.02), "concrete", -3.2, 1.1, 0);
  spawnTargetMesh(createBoxBevelGeometry(2.2, 2.0, 0.08, 0.01), "paint_blue", 0, 1.0, 0);
  spawnTargetMesh(createBoxBevelGeometry(1.2, 1.2, 1.2, 0.015), "wood_pallet", 3.2, 0.6, 0);

  engineCtx.scene.add(showcaseGroup);
  engineCtx.physics.addBox([-4.5, 0, -0.15], [-1.9, 2.2, 0.15], { surface: "concrete" });
  engineCtx.physics.addBox([-1.1, 0, -0.04], [1.1, 2.0, 0.04], { surface: "metal" });
  engineCtx.physics.addBox([2.6, 0, -0.6], [3.8, 1.2, 0.6], { surface: "wood" });

  const pLeftGun = new THREE.Vector3(-6.5, 1.5, 7);
  const pRightGun = new THREE.Vector3(6.5, 1.4, 7);
  const pTargetGun = new THREE.Vector3(5.2, 1.3, 3.2);
  const pEjectPos = new THREE.Vector3(-4.6, 1.35, 4.2);

  const vTargetPoint = new THREE.Vector3();
  const vRayDir = new THREE.Vector3();
  const vTracerEnd = new THREE.Vector3();
  const vMuzzlePos = new THREE.Vector3(0, 1.3, 3);
  const vMuzzleDir = new THREE.Vector3(1, 0, 0);

  const impactData = {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    surface: "concrete",
    dir: new THREE.Vector3(),
    enemy: null,
    from: "player",
  };

  const rnd = Math.random;
  let elapsed = 0;
  let shotIndex = 0;
  let gunAlt = 0;
  let explosionCounter = 0;
  let impactTimer = 0;
  let tracerTimer = 0.2;
  let shellTimer = 0;
  let explosionTimer = 3.4;
  let warmedUp = false;

  const showImpacts = showMode === "all" || showMode === "impact";
  const showExplosions = showMode === "all" || showMode === "explosion";
  const showTracers = showMode === "all" || showMode === "tracer";
  const explosionInterval = showMode === "explosion" ? 2.4 : 3.5;

  if (showMode === "explosion") explosionTimer = 0.6;

  if (showMode === "all" || showMode === "impact") {
    fx.addEmitter(new THREE.Vector3(-6.2, 0.05, -1.5), "steam");
    fx.addEmitter(new THREE.Vector3(5.6, 0, 1.6), "fire");
    fx.addEmitter(new THREE.Vector3(0.4, 2.6, 1.6), "drip");
  }

  function fireSimulatedImpact(targetSlot) {
    const gunOrigin = gunAlt++ % 2 ? pRightGun : pLeftGun;
    impactData.enemy = null;
    impactData.from = "player";

    if (targetSlot === 5) {
      // 模拟击中敌方机械体
      impactData.point.set(-1.5 + rnd() * 0.3, 2.5 + rnd() * 0.3, 0.8);
      impactData.normal.copy(gunOrigin).sub(impactData.point).normalize();
      impactData.surface = "enemy";
      impactData.enemy = {};
      impactData.dir.copy(impactData.point).sub(gunOrigin).normalize();
      fx.tracer(gunOrigin, impactData.point);
      engineCtx.events.emit("impact", impactData);
      return;
    }

    if (targetSlot === 0) {
      vTargetPoint.set(-3.2 + (rnd() - 0.5) * 2, 0.4 + rnd() * 1.5, 0);
    } else if (targetSlot === 1 || targetSlot === 7) {
      vTargetPoint.set((rnd() - 0.5) * 1.8, 0.3 + rnd() * 1.5, 0);
    } else if (targetSlot === 2) {
      vTargetPoint.set(3.2 + (rnd() - 0.5) * 0.9, 0.2 + rnd() * 0.9, 0.6);
    } else if (targetSlot === 3) {
      vTargetPoint.set(-1.6 + (rnd() - 0.5) * 1.2, 0, 2.2 + rnd());
    } else if (targetSlot === 4) {
      vTargetPoint.set(1.5 + (rnd() - 0.5) * 0.8, 0, 2.6 + rnd() * 0.8);
    } else {
      vTargetPoint.set(3.4 + (rnd() - 0.5), 0, 2.4 + rnd() * 0.6);
    }

    vRayDir.copy(vTargetPoint).sub(gunOrigin).normalize();
    const hit = engineCtx.physics.raycast(gunOrigin, vRayDir, 100);
    if (hit) {
      impactData.point.copy(hit.point);
      impactData.normal.copy(hit.normal);
      impactData.dir.copy(vRayDir);
      impactData.surface = targetSlot === 4 ? "water" : targetSlot === 6 ? "dirt" : hit.surface;
      fx.tracer(gunOrigin, impactData.point);
      engineCtx.events.emit("impact", impactData);
    }
  }

  const holdMode = engineCtx.params.fxhold;

  function updateShowcase(dt) {
    elapsed += dt;

    if (holdMode === "muzzle") {
      fx.muzzleFlash(vMuzzlePos, vMuzzleDir, { scale: 1 });
      vMuzzlePos.x = 2.5;
      vMuzzleDir.set(-0.5, 0, 0.86);
      fx.muzzleFlash(vMuzzlePos, vMuzzleDir, { scale: 1.6 });
      vMuzzlePos.x = 0;
      vMuzzleDir.set(1, 0, 0);
    }

    if (showImpacts) {
      impactTimer -= dt;
      while (impactTimer <= 0) {
        impactTimer += showMode === "impact" ? 0.09 : 0.13;
        fireSimulatedImpact(shotIndex++ % 8);
      }
    }

    if (showTracers) {
      tracerTimer -= dt;
      if (tracerTimer <= 0) {
        tracerTimer += showMode === "tracer" ? 0.16 : 0.45;
        vTracerEnd.set(-5 + rnd() * 3, 1.2 + rnd() * 0.8, 6 + rnd() * 2);
        vRayDir.copy(vTracerEnd).sub(pTargetGun).normalize();
        fx.muzzleFlash(pTargetGun, vRayDir, { scale: 1 });
        fx.tracer(pTargetGun, vTracerEnd, { color: 0xff4c02, speed: 120 });
        if (showMode === "tracer") {
          vTracerEnd.set(6, 1 + rnd() * 1.5, -6 - rnd() * 6);
          vTargetPoint.set(-7, 1.6, 6.5);
          fx.tracer(vTargetPoint, vTracerEnd, { speed: 200 });
        }
      }

      shellTimer -= dt;
      if (shellTimer <= 0) {
        shellTimer += 0.22;
        vTracerEnd.set(1.6 + rnd() * 0.8, 1.6 + rnd() * 0.8, 0.4 + (rnd() - 0.5) * 0.8);
        fx.shell(pEjectPos, vTracerEnd);
      }
    }

    if (showExplosions) {
      explosionTimer -= dt;
      if (explosionTimer <= 0) {
        explosionTimer += explosionInterval;
        const explSize = Number(engineCtx.params.fxsize || 0) || 1 + (explosionCounter++ % 3);
        vTracerEnd.set(
          showMode === "explosion" ? 0 : 7,
          0.25,
          showMode === "explosion" ? 3.5 : -3.5,
        );
        fx.explosion(vTracerEnd, explSize);
      }
    }
  }

  let isFrozen = false;
  const originalUpdate = fx.update;
  fx.update = (dt) => {
    if (!isFrozen) originalUpdate(dt);
  };

  const hookSetShot = window.__setShot;
  if (hookSetShot) {
    window.__setShot = (shotData) => {
      if (shotData && shotData.fxage !== undefined) {
        fx.clear();
        vTracerEnd.set(0, 0.25, 3.5);
        fx.explosion(vTracerEnd, Number(shotData.fxsize || 1.2));
        const age = Number(shotData.fxage);
        for (let t = 0; t < age - 1e-6; t += 1 / 60) {
          originalUpdate(1 / 60);
        }
        originalUpdate(0);
        isFrozen = true;
      }
      hookSetShot(shotData);
    };
  }

  return {
    cam: showMode === "explosion" ? [0, 2, 12.5] : [0.3, 1.6, 7.2],
    target: showMode === "explosion" ? [0, 2.2, 3.5] : [0.2, 1, 0],
    update(dt) {
      if (!warmedUp) {
        warmedUp = true;
        const prewarmTime = Number(engineCtx.params.fxt || 0);
        for (let t = 0; t < prewarmTime; t += 1 / 30) {
          updateShowcase(1 / 30);
          fx.update(1 / 30);
        }
      }
      if (!isFrozen) updateShowcase(dt);
    },
  };
}

// ============================================================================
// 十六、 模块导出 (ESM Exports)
// ============================================================================

export const create = createFXManager;
export const showcase = showcaseFX;

export const Sv = {
  create: createFXManager,
  showcase: showcaseFX,
};

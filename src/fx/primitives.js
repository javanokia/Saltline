// @ts-check
/**
 * @file src/fx/primitives.js
 * @description 特效原子生成器 (烟尘、火花、碎屑、飞溅、波纹扩散等底层粒子与物理碎片)
 */

import * as THREE from "three";
import {
  PARTICLE_FLAG_BOUNCE_FLOOR,
  PARTICLE_FLAG_DIE_ON_FLOOR,
  PARTICLE_MODE_VELOCITY_STRETCH,
  PARTICLE_MODE_SURFACE_ALIGNED,
  SPARK_FRAME_SOFT_DOT,
  SPARK_FRAME_STREAK,
  SPARK_FRAME_RIPPLE,
  SPARK_FRAME_DROPLET,
  randomRange,
} from "./textures.js";
import { parseColorToArray, randomVectorInCone, UP_VECTOR } from "./helpers.js";

/**
 * 构建粒子原语发射接口
 * @param {Object} params
 * @param {any} params.engineCtx
 * @param {import("./pools.js").ParticlePool} params.litPool
 * @param {import("./pools.js").ParticlePool} params.addPool
 * @param {import("./debris.js").DebrisPhysicsSystem} params.debrisSystem
 * @param {(pos: THREE.Vector3, normal?: THREE.Vector3 | null) => number} params.queryShadowVisibility
 * @param {(pos: THREE.Vector3) => number} params.queryFloorHeight
 */
export function createFXPrimitives({
  engineCtx,
  litPool,
  addPool,
  debrisSystem,
  queryShadowVisibility,
  queryFloorHeight,
}) {
  const vTempAim = new THREE.Vector3();
  const vTempNorm = new THREE.Vector3();

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

  return {
    emitLitSmoke,
    emitAddSparkStreak,
    emitSparksCone,
    emitStaticAddFlare,
    emitWaterRippleRing,
    emitFlyingDebrisChunks,
    sparks,
    smoke,
    dust,
    debris,
    splash,
  };
}

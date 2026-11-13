// @ts-check
/**
 * @file src/fx/explosions.js
 * @description 剧烈爆炸冲击波、火球膨胀、滚滚黑烟与物理破片冲击系统
 */

import * as THREE from "three";
import {
  PARTICLE_FLAG_BOUNCE_FLOOR,
  SPARK_FRAME_SOFT_DOT,
  SPARK_FRAME_STARBURST1,
  SPARK_FRAME_PLASMA,
  randomRange,
} from "./textures.js";
import { randomVectorInCone, UP_VECTOR } from "./helpers.js";

/**
 * 构建爆炸特效管理子系统
 * @param {Object} params
 * @param {any} params.engineCtx
 * @param {import("./pools.js").ParticlePool} params.litPool
 * @param {import("./pools.js").ParticlePool} params.addPool
 * @param {import("./decals.js").ImpactDecalManager} params.decalSystem
 * @param {(x: number, y: number, z: number, kind: string, ttl: number, scale: number, shade?: number) => any} params.spawnContinuousEmitter
 * @param {(pos: THREE.Vector3, color: number, intensity: number, distance: number, duration: number) => void} params.flashLight
 * @param {(pos: THREE.Vector3, normal?: THREE.Vector3 | null) => number} params.queryShadowVisibility
 * @param {(pos: THREE.Vector3) => number} params.queryFloorHeight
 * @param {ReturnType<typeof import("./primitives.js").createFXPrimitives>} params.primitives
 */
export function createExplosionSystem({
  engineCtx,
  litPool,
  addPool,
  decalSystem,
  spawnContinuousEmitter,
  flashLight,
  queryShadowVisibility,
  queryFloorHeight,
  primitives,
}) {
  const vTempAim = new THREE.Vector3();
  const vTempCamPos = new THREE.Vector3();
  const vTempPos = new THREE.Vector3();
  const vExplosionEvent = { pos: new THREE.Vector3(), size: 1 };

  function explosion(/** @type {THREE.Vector3} */ pos, size = 1) {
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
    primitives.emitStaticAddFlare(
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
    primitives.emitStaticAddFlare(
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
    primitives.emitStaticAddFlare(
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
      const sIdx = primitives.emitLitSmoke(
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
      const spkIdx = primitives.emitAddSparkStreak(
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
      primitives.emitWaterRippleRing(px, shockY, pz, 0.32, 0.6 * scale, 9 * scale, 1.6, 1.2, 0.75);

      const ringPuffs = Math.round(12 + 3 * scale);
      for (let i = 0; i < ringPuffs; i++) {
        const ang = ((i + Math.random()) / ringPuffs) * 6.283;
        const spd = randomRange(5, 10) * sqrtScale;
        const gray = randomRange(0.42, 0.55);
        const rIdx = primitives.emitLitSmoke(
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
    primitives.emitFlyingDebrisChunks(
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

  return {
    explosion,
  };
}

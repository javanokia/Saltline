// @ts-check
/**
 * @file src/fx/weapons.js
 * @description 武器级视觉特效 (超音速弹道曳光流、高光枪口焰、退膛抛壳动力学)
 */

import * as THREE from "three";
import {
  PARTICLE_MODE_VELOCITY_STRETCH,
  SPARK_FRAME_SOFT_DOT,
  SPARK_FRAME_STARBURST1,
  SPARK_FRAME_STARBURST2,
  SPARK_FRAME_TRACER_TIP,
  randomRange,
} from "./textures.js";
import { parseColorToArray, randomVectorInCone, UP_VECTOR } from "./helpers.js";

/**
 * 构建武器射击视觉与物理特效
 * @param {Object} params
 * @param {import("./pools.js").BulletTracerPool} params.tracerPool
 * @param {import("./debris.js").SpentShellEjectionSystem} params.shellSystem
 * @param {import("./pools.js").ParticlePool} params.litPool
 * @param {import("./pools.js").ParticlePool} params.addPool
 * @param {(pos: THREE.Vector3, color: number, intensity: number, distance: number, duration: number) => void} params.flashLight
 * @param {(pos: THREE.Vector3, normal?: THREE.Vector3 | null) => number} params.queryShadowVisibility
 * @param {ReturnType<typeof import("./primitives.js").createFXPrimitives>} params.primitives
 * @param {() => number} params.getGlobalTime
 */
export function createWeaponFX({
  tracerPool,
  shellSystem,
  litPool,
  addPool,
  flashLight,
  queryShadowVisibility,
  primitives,
  getGlobalTime,
}) {
  const vTempAim = new THREE.Vector3();
  const vTempNorm = new THREE.Vector3();
  const vTempCamPos = new THREE.Vector3();

  let lastTracerSmokeTime = -1;

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

    const gt = getGlobalTime();
    if (gt - lastTracerSmokeTime > 0.07 && opts.trail !== false) {
      lastTracerSmokeTime = gt;
      vTempAim.subVectors(toPos, fromPos);
      const dist = vTempAim.length();
      if (dist > 2) {
        vTempAim.multiplyScalar(1 / dist);
        const steps = 5;
        const maxDist = Math.min(dist, 7);
        const shadowVis = queryShadowVisibility(fromPos, null);
        for (let i = 0; i < steps; i++) {
          const stepDist = 0.6 + ((i + Math.random()) / steps) * (maxDist - 0.6);
          const tIdx = primitives.emitLitSmoke(
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

    primitives.emitStaticAddFlare(
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
    primitives.emitStaticAddFlare(
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
    primitives.emitStaticAddFlare(
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
    primitives.emitStaticAddFlare(
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
      primitives.emitAddSparkStreak(
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

    primitives.emitLitSmoke(
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

  return {
    tracer,
    muzzleFlash,
    shell,
  };
}

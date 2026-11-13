// @ts-check
/**
 * @file src/fx/impacts.js
 * @description 击中打击反馈系统 (金属跳弹火花、混凝土碎石、木屑扬尘、玻璃破片、敌机电浆与装甲凹陷弹孔)
 */

import * as THREE from "three";
import {
  PARTICLE_FLAG_BOUNCE_FLOOR,
  PARTICLE_FLAG_DIE_ON_FLOOR,
  PARTICLE_MODE_VELOCITY_STRETCH,
  SPARK_FRAME_SOFT_DOT,
  SPARK_FRAME_STARBURST1,
  SPARK_FRAME_DROPLET,
  randomRange,
} from "./textures.js";
import { randomVectorInCone, UP_VECTOR } from "./helpers.js";

/**
 * 构建打击特效分发系统
 * @param {Object} params
 * @param {any} params.engineCtx
 * @param {import("./pools.js").ParticlePool} params.litPool
 * @param {import("./pools.js").ParticlePool} params.addPool
 * @param {import("./decals.js").ImpactDecalManager} params.decalSystem
 * @param {(pos: THREE.Vector3, color: number, intensity: number, distance: number, duration: number) => void} params.flashLight
 * @param {(pos: THREE.Vector3, normal?: THREE.Vector3 | null) => number} params.queryShadowVisibility
 * @param {(pos: THREE.Vector3) => number} params.queryFloorHeight
 * @param {ReturnType<typeof import("./primitives.js").createFXPrimitives>} params.primitives
 * @param {() => number} params.getGlobalTime
 */
export function createImpactSystem({
  engineCtx,
  litPool,
  addPool,
  decalSystem,
  flashLight,
  queryShadowVisibility,
  queryFloorHeight,
  primitives,
  getGlobalTime,
}) {
  const vTempAim = new THREE.Vector3();
  const vTempCamPos = new THREE.Vector3();
  const vTempNorm = new THREE.Vector3();
  const vTempDir = new THREE.Vector3();
  const vTempReflect = new THREE.Vector3();
  const vTempPoint = new THREE.Vector3();

  let lastMuzzleFlashTime = -1;

  function emitMetalImpact(point, norm, reflect, lodScale, isFar) {
    const nx = norm.x,
      ny = norm.y,
      nz = norm.z;
    vTempAim.copy(reflect).addScaledVector(norm, 0.6).normalize();
    primitives.emitSparksCone(
      point,
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
    primitives.emitSparksCone(
      point,
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

    primitives.emitStaticAddFlare(
      point.x + nx * 0.03,
      point.y + ny * 0.03,
      point.z + nz * 0.03,
      0.05,
      0.25,
      0.45,
      16,
      11,
      5.5,
      SPARK_FRAME_SOFT_DOT,
    );
    primitives.emitStaticAddFlare(
      point.x + nx * 0.04,
      point.y + ny * 0.04,
      point.z + nz * 0.04,
      0.04,
      0.35,
      0.5,
      9,
      6,
      2.6,
      SPARK_FRAME_STARBURST1 + Math.floor(Math.random() * 2),
    );

    const gt = getGlobalTime();
    if (gt - lastMuzzleFlashTime > 0.09) {
      lastMuzzleFlashTime = gt;
      vTempCamPos.copy(point).addScaledVector(norm, 0.12);
      flashLight(vTempCamPos, 0xffbe30, 10, 5, 0.05);
    }

    const shadowVis = queryShadowVisibility(point, norm);
    for (let i = 0; i < 2; i++) {
      primitives.emitLitSmoke(
        point.x + nx * 0.04,
        point.y + ny * 0.04,
        point.z + nz * 0.04,
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
      primitives.emitFlyingDebrisChunks(
        point,
        norm,
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
        queryFloorHeight(point),
      );
    }
    decalSystem.add(point, norm, "bullet_metal");
  }

  function emitWoodImpact(point, norm, isFar) {
    const shadowVis = primitives.dust(point, norm, 0.75, 0.5, 0.42, 0.32);
    primitives.emitFlyingDebrisChunks(
      point,
      norm,
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
      queryFloorHeight(point),
    );
    if (shadowVis > 0.5 && Math.random() < 0.3) {
      primitives.emitStaticAddFlare(
        point.x,
        point.y,
        point.z,
        0.04,
        0.1,
        0.2,
        3,
        2,
        1,
        SPARK_FRAME_SOFT_DOT,
      );
    }
    decalSystem.add(point, norm, "bullet_wood");
  }

  function emitDirtOrRubberImpact(point, norm, isDirt) {
    const nx = norm.x,
      ny = norm.y,
      nz = norm.z;
    const shadowVis = queryShadowVisibility(point, norm);
    const rCol = isDirt ? 0.3 : 0.14;
    const gCol = isDirt ? 0.25 : 0.14;
    const bCol = isDirt ? 0.19 : 0.14;

    for (let i = 0; i < 5; i++) {
      randomVectorInCone(norm, 0.6, vTempAim);
      const spd = randomRange(0.6, 2.6);
      primitives.emitLitSmoke(
        point.x + nx * 0.03,
        point.y + ny * 0.03,
        point.z + nz * 0.03,
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

    primitives.emitFlyingDebrisChunks(
      point,
      norm,
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
      queryFloorHeight(point),
    );
    decalSystem.add(point, norm, "soot", 0.2, 1, 0.8);
  }

  function emitGlassImpact(point, norm) {
    const nx = norm.x,
      ny = norm.y,
      nz = norm.z;
    for (let i = 0; i < 12; i++) {
      randomVectorInCone(norm, 0.9, vTempAim);
      const spd = randomRange(1.5, 6);
      const dIdx = addPool.emit(
        point.x,
        point.y,
        point.z,
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

    primitives.emitFlyingDebrisChunks(
      point,
      norm,
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
      queryFloorHeight(point),
    );
    primitives.emitLitSmoke(
      point.x,
      point.y,
      point.z,
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
      queryShadowVisibility(point, norm),
      2.5,
      0.2,
      0.8,
      -1,
    );
    decalSystem.add(point, norm, "bullet_glass");
  }

  function emitEnemyImpact(point, norm, reflect, lodScale, isFar) {
    const nx = norm.x,
      ny = norm.y,
      nz = norm.z;
    vTempAim.copy(reflect).addScaledVector(norm, 0.8).normalize();
    primitives.emitSparksCone(
      point,
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
    primitives.emitSparksCone(
      point,
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

    primitives.emitStaticAddFlare(
      point.x,
      point.y,
      point.z,
      0.06,
      0.3,
      0.55,
      18,
      12,
      6,
      SPARK_FRAME_SOFT_DOT,
    );
    primitives.emitStaticAddFlare(
      point.x,
      point.y,
      point.z,
      0.04,
      0.3,
      0.45,
      8,
      5,
      2.4,
      SPARK_FRAME_STARBURST1 + Math.floor(Math.random() * 2),
    );

    const gt = getGlobalTime();
    if (gt - lastMuzzleFlashTime > 0.09) {
      lastMuzzleFlashTime = gt;
      flashLight(point, 0xff7000, 8, 4.5, 0.05);
    }

    const shadowVis = queryShadowVisibility(point, norm);
    for (let i = 0; i < 2; i++) {
      primitives.emitLitSmoke(
        point.x,
        point.y,
        point.z,
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
      primitives.emitFlyingDebrisChunks(
        point,
        norm,
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
        queryFloorHeight(point),
      );
    }
  }

  function emitConcreteImpact(point, norm, reflect, isFar) {
    primitives.dust(point, norm, 1, 0.52, 0.5, 0.47);
    primitives.emitFlyingDebrisChunks(
      point,
      norm,
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
      queryFloorHeight(point),
    );

    vTempAim.copy(reflect).addScaledVector(norm, 0.7).normalize();
    for (let i = 0; i < 4; i++) {
      randomVectorInCone(vTempAim, 0.5, vTempAim);
      const spd = randomRange(3, 9);
      const sIdx = primitives.emitLitSmoke(
        point.x,
        point.y,
        point.z,
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
      primitives.emitSparksCone(point, vTempAim, 3, 4, 10, 0.6, 0.08, 0.2, 26, 15, 6, 0);
    }
    decalSystem.add(point, norm, "bullet_concrete");
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

    vTempReflect
      .copy(vTempDir)
      .addScaledVector(vTempNorm, -2 * vTempDir.dot(vTempNorm))
      .normalize();
    vTempPoint.copy(point);

    if (enemy) surface = "enemy";

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
    const isFar = camPos.distanceToSquared(vTempPoint) > 3025;
    const lodScale = isFar ? 0.5 : 1.0;

    switch (surface) {
      case "metal":
        emitMetalImpact(vTempPoint, vTempNorm, vTempReflect, lodScale, isFar);
        break;
      case "wood":
        emitWoodImpact(vTempPoint, vTempNorm, isFar);
        break;
      case "water":
        primitives.splash(vTempPoint, 1);
        break;
      case "rubber":
      case "dirt":
        emitDirtOrRubberImpact(vTempPoint, vTempNorm, surface === "dirt");
        break;
      case "glass":
        emitGlassImpact(vTempPoint, vTempNorm);
        break;
      case "enemy":
        emitEnemyImpact(vTempPoint, vTempNorm, vTempReflect, lodScale, isFar);
        break;
      default:
        emitConcreteImpact(vTempPoint, vTempNorm, vTempReflect, isFar);
        break;
    }
  }

  return {
    emitMetalImpact,
    emitWoodImpact,
    emitDirtOrRubberImpact,
    emitGlassImpact,
    emitEnemyImpact,
    emitConcreteImpact,
    impact,
  };
}

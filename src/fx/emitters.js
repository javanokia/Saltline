// @ts-check
/**
 * @file src/fx/emitters.js
 * @description 持续环境粒子发射器系统 (蒸汽喷涌、残骸暗火余烬、战火燃烧、水管滴漏)
 */

import * as THREE from "three";
import {
  PARTICLE_MODE_VELOCITY_STRETCH,
  SPARK_FRAME_SOFT_DOT,
  SPARK_FRAME_PLASMA,
  SPARK_FRAME_DROPLET,
  PARTICLE_FLAG_DIE_ON_FLOOR,
  randomRange,
} from "./textures.js";
import { randomVectorInCone, UP_VECTOR } from "./helpers.js";

/**
 * 构建持续环境粒子发射器管理器
 * @param {Object} params
 * @param {() => any} params.getLightPool
 * @param {(pos: THREE.Vector3, normal?: THREE.Vector3 | null) => number} params.queryShadowVisibility
 * @param {import("./pools.js").ParticlePool} params.litPool
 * @param {import("./pools.js").ParticlePool} params.addPool
 * @param {ReturnType<typeof import("./primitives.js").createFXPrimitives>} params.primitives
 */
export function createContinuousEmitterSystem({
  getLightPool,
  queryShadowVisibility,
  litPool,
  addPool,
  primitives,
}) {
  const vTempAim = new THREE.Vector3();

  /** @type {Array<any>} */
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
      setPos(/** @type {THREE.Vector3} */ p) {
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

  function spawnContinuousEmitter(
    /** @type {number} */ x,
    /** @type {number} */ y,
    /** @type {number} */ z,
    /** @type {string} */ kind,
    /** @type {number} */ ttl,
    /** @type {number} */ scale,
    /** @type {number|undefined} */ shade,
  ) {
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

  function addEmitter(
    /** @type {THREE.Vector3} */ pos,
    kind = "steam",
    /** @type {any} */ opts = {},
  ) {
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

  function updateContinuousEmitters(/** @type {number} */ dt) {
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
          const sIdx = primitives.emitLitSmoke(
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
          const sIdx = primitives.emitLitSmoke(
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
          const sIdx = primitives.emitLitSmoke(
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
            primitives.emitWaterRippleRing(
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

  return {
    continuousEmitters,
    spawnContinuousEmitter,
    addEmitter,
    updateContinuousEmitters,
  };
}

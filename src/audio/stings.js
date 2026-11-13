// @ts-check
/**
 * @file src/audio/stings.js
 * @description 港区偶发远景环境音 (远洋号角、海鸥啼鸣、缆绳碰撞、集装箱轰鸣)
 */

import { TWO_PI } from "./dsp.js";

/**
 * 创建环境偶发音效触发器
 * @param {(name: string, options?: any) => boolean} playSound
 */
export function createAmbientStingsManager(playSound) {
  const rand = Math.random;

  const ambientSpurTimers = {
    fog: 14 + rand() * 14,
    gull: 5 + rand() * 8,
    hal: 4 + rand() * 6,
    bang: 20 + rand() * 25,
  };

  /**
   * 逐帧更新远景随机环境刺音
   * @param {number} dt
   * @param {number} masterScale
   * @param {number} currentInteriorFactor
   * @param {{ x: number, y: number, z: number }} listenerPos
   */
  function updateAmbientStings(dt, masterScale, currentInteriorFactor, listenerPos) {
    const outdoorDamp = 1 - 0.7 * currentInteriorFactor;

    if ((ambientSpurTimers.fog -= dt) <= 0) {
      ambientSpurTimers.fog = 40 + rand() * 30;
      const zOffset = listenerPos.z + (rand() * 2 - 1) * 250;
      playSound("foghorn", {
        pos: [listenerPos.x + 320, 8, zOffset],
        ref: 400,
        gain: 0.34 * masterScale * outdoorDamp,
        pitch: rand() < 0.3 ? 0.89 : 1.0,
        jitter: 0.01,
      });
    }

    if ((ambientSpurTimers.gull -= dt) <= 0) {
      ambientSpurTimers.gull = 9 + rand() * 16;
      const angle = rand() * TWO_PI;
      const dist = 35 + rand() * 50;
      playSound("gull_cry", {
        pos: [
          listenerPos.x + Math.cos(angle) * dist,
          14 + rand() * 18,
          listenerPos.z + Math.sin(angle) * dist,
        ],
        ref: dist,
        roll: 1.0,
        gain: (0.16 + rand() * 0.16) * masterScale * outdoorDamp,
        jitter: 0.1,
      });
    }

    if ((ambientSpurTimers.hal -= dt) <= 0) {
      ambientSpurTimers.hal = 6 + rand() * 11;
      playSound("halyard", {
        pos: [29 + rand() * 8, 3 + rand() * 6, -8 + rand() * 32],
        ref: 16,
        roll: 0.5,
        gain: (0.3 + rand() * 0.3) * masterScale * outdoorDamp,
        jitter: 0.08,
      });
    }

    if ((ambientSpurTimers.bang -= dt) <= 0) {
      ambientSpurTimers.bang = 28 + rand() * 34;
      const angle = 1.6 + rand() * 3.2;
      playSound("container_bang", {
        pos: [listenerPos.x + Math.cos(angle) * 150, 4, listenerPos.z + Math.sin(angle) * 150],
        ref: 150,
        gain: (0.2 + rand() * 0.16) * masterScale * outdoorDamp,
        jitter: 0.12,
      });
    }
  }

  return { updateAmbientStings };
}

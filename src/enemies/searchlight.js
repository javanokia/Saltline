// @ts-check
/**
 * @file src/enemies/searchlight.js
 * @description 巡逻无人机动态探照灯与光锥追踪系统 (Gull Searchlight & Tracking Spotlight)
 *
 * 【系统职责】
 * 从渲染管线光源池（LightPool）动态申请聚光灯实例，
 * 跟踪距离摄像机最近的活跃机械飞鸥，依据其机头偏航与俯仰角度对地面进行物理投射检测，
 * 动态平滑插值聚光灯世界坐标与流明强度。
 */

import * as THREE from "three";

const { Vector3 } = THREE;

const vTempDir = new Vector3();
const vSpotTarget = new Vector3();

/**
 * 创建动态探照灯系统
 * @param {object} ctx 全局引擎上下文
 * @param {Array<object>} activeEnemies 活跃敌人群落
 * @returns {object}
 */
export function createSearchlightSystem(ctx, activeEnemies) {
  let spotlightHolder = null;
  let spotlightAcquired = false;
  let spotlightTimer = 0;
  let spotFactor = 0;

  return {
    /**
     * 每帧更新探照灯朝向与位置
     * @param {number} dt 帧时间间隔
     */
    update(dt) {
      if (!spotlightAcquired) {
        spotlightAcquired = true;
        try {
          spotlightHolder =
            ctx.render && ctx.render.lightPool && ctx.render.lightPool.acquire
              ? ctx.render.lightPool.acquire()
              : null;
        } catch {
          spotlightHolder = null;
        }
        if (spotlightHolder && spotlightHolder.light) {
          spotlightHolder.light.color.setRGB(1, 0.9, 0.75);
          spotlightHolder.light.distance = 9;
        }
      }

      if (!spotlightHolder || !spotlightHolder.light) return;

      let nearestGull = null;
      let minCamDistSq = 3600;
      const camPos = ctx.camera ? ctx.camera.position : null;

      for (let i = 0; i < activeEnemies.length; i++) {
        const enemy = activeEnemies[i];
        if (enemy.type !== "gull" || !enemy.alive) continue;
        const dSq = camPos ? enemy.pos.distanceToSquared(camPos) : 0;
        if (dSq < minCamDistSq) {
          minCamDistSq = dSq;
          nearestGull = enemy;
        }
      }

      let targetIntensity = 0;
      if (nearestGull) {
        spotlightTimer -= dt;
        if (spotlightTimer <= 0) {
          spotlightTimer = 0.1;
          const netYaw = nearestGull.yaw + nearestGull.gy;
          const cosPitch = Math.cos(nearestGull.gp);
          vTempDir
            .set(
              Math.sin(netYaw) * cosPitch,
              -Math.sin(nearestGull.gp),
              Math.cos(netYaw) * cosPitch,
            )
            .normalize();
          const hit = ctx.physics.raycast(nearestGull.sensor, vTempDir, 14);
          vSpotTarget
            .copy(nearestGull.sensor)
            .addScaledVector(vTempDir, (hit ? hit.dist : 8) - 0.6);
          spotFactor = hit ? 1 : 0.3;
        }
        targetIntensity = 26 * spotFactor;
        spotlightHolder.light.position.lerp(vSpotTarget, 1 - Math.exp(-12 * dt));
      }

      spotlightHolder.light.intensity +=
        (targetIntensity - spotlightHolder.light.intensity) * (1 - Math.exp(-8 * dt));
    },

    /**
     * 重置探照灯
     */
    reset() {
      if (spotlightHolder && spotlightHolder.light) {
        spotlightHolder.light.intensity = 0;
      }
      spotFactor = 0;
      spotlightTimer = 0;
    },
  };
}

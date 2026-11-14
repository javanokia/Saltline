// @ts-check
/**
 * @file src/enemies/perception.js
 * @description 敌方单位感知系统与集群警戒呼叫网络 (Enemy Perception & Alert Network)
 *
 * 【系统职责】
 * 统一处理视线追踪（Line of Sight）、视野广角锥度计算、物理光线遮挡检测、
 * 视线暴露值（Exposure）累积，以及受击激怒（Provoke）与区域警戒呼叫（Rally）。
 */

import * as THREE from "three";

/**
 * 创建感知与行为决策系统
 * @param {object} tune 配置参数
 * @param {() => number} rng 确定性伪随机数发生器
 * @returns {object}
 */
export function createPerceptionSystem(tune, rng) {
  const SIGHT_CONE_COS = Math.cos(((tune.sightCone / 2) * Math.PI) / 180);

  return {
    SIGHT_CONE_COS,

    /**
     * 敌方感知周期思考与状态机流转 (Line of Sight & State Transitions)
     * @param {object} enemy 目标敌方单位
     * @param {number} dt 帧时间
     * @param {number} seeThreshold 警戒触发阈值
     * @param {object} ctx 全局引擎上下文
     * @param {object} hiveContext 蜂群共享上下文
     * @param {Array<object>} activeEnemies
     */
    think(enemy, dt, seeThreshold, ctx, hiveContext, activeEnemies) {
      const player = ctx.player;
      if (enemy.passive || !player) {
        enemy.los = false;
        return;
      }

      enemy.senseT -= dt;
      if (enemy.senseT <= 0) {
        enemy.senseT = 0.11 + rng() * 0.08;
        let canSee = false;

        if (player.alive !== false) {
          const eyePos = player.eye || player.pos;
          const dx = eyePos.x - enemy.sensor.x;
          const dy = eyePos.y - enemy.sensor.y;
          const dz = eyePos.z - enemy.sensor.z;
          const dist = Math.hypot(dx, dy, dz);

          if (dist < tune.sightRange) {
            const planarDist = Math.hypot(dx, dz) || 1e-4;
            const facingDot = (dx * enemy.fwd.x + dz * enemy.fwd.z) / planarDist;
            if (enemy.mode === "engage" || facingDot > SIGHT_CONE_COS || dist < 3.5) {
              canSee = ctx.physics.lineOfSight(enemy.sensor, eyePos);
            }
          }
        }
        enemy.los = canSee;
      }

      if (enemy.los) {
        enemy.seeT += dt;
        enemy.noSeeT = 0;
        enemy.lastKnown.copy(player.pos);
        enemy.exposure = Math.min(1, enemy.exposure + dt * tune.exposureUp);
      } else {
        enemy.noSeeT += dt;
        enemy.seeT = Math.max(0, enemy.seeT - dt * 0.6);
        enemy.exposure = Math.max(0, enemy.exposure - dt * tune.exposureDown);
      }

      if (enemy.mode === "engage") {
        if (enemy.noSeeT > tune.loseSight || player.alive === false) {
          enemy.mode = "search";
          enemy.modeT = tune.searchTime + rng() * 3;
          hiveContext.releaseToken(enemy);
        }
      } else if (
        enemy.los &&
        enemy.seeT > (enemy.mode === "patrol" ? seeThreshold : seeThreshold * 0.45)
      ) {
        enemy.mode = "engage";
        enemy.noSeeT = 0;
        ctx.events.emit("enemy:alert", { enemy });
        this.rally(enemy.pos, 18, player.pos, enemy, activeEnemies);
      } else if (enemy.mode !== "patrol") {
        enemy.modeT -= dt;
        if (enemy.modeT <= 0) {
          enemy.mode = "patrol";
          enemy.home.x = enemy.pos.x;
          enemy.home.z = enemy.pos.z;
        }
      }
    },

    /**
     * 向周边友军单位发出战术警戒呼叫
     * @param {THREE.Vector3} origin 呼叫源点
     * @param {number} radius 呼叫广播半径
     * @param {THREE.Vector3} targetPos 目标最后已知坐标
     * @param {object} caller 呼叫发起者
     * @param {Array<object>} activeEnemies
     */
    rally(origin, radius, targetPos, caller, activeEnemies) {
      const rSq = radius * radius;
      for (let i = 0; i < activeEnemies.length; i++) {
        const e = activeEnemies[i];
        if (e === caller || !e.alive || e.passive || e.mode === "engage") continue;
        if (e.pos.distanceToSquared(origin) > rSq) continue;
        e.lastKnown.copy(targetPos);
        e.mode = "investigate";
        e.modeT = 9 + rng() * 4;
      }
    },

    /**
     * 受到伤害时激怒单位进入警戒搜索状态
     * @param {object} enemy 受创敌方单位
     * @param {object} ctx 全局引擎上下文
     * @param {Array<object>} activeEnemies
     */
    provoke(enemy, ctx, activeEnemies) {
      const player = ctx.player;
      if (!player || enemy.passive || !enemy.alive) return;
      if (enemy.mode !== "engage") {
        enemy.lastKnown.copy(player.pos);
        enemy.mode = "investigate";
        enemy.modeT = 10;
        enemy.seeT = 1;
        enemy.senseT = 0;
      }
      this.rally(enemy.pos, 20, player.pos, enemy, activeEnemies);
    },
  };
}

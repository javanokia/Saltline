// @ts-check
/**
 * @file src/enemies/projectiles.js
 * @description 敌方等离子脉冲弹丸系统 (Enemy Plasma Bolts & Projectiles)
 *
 * 【系统职责】
 * 统一管理敌方机械飞鸥发射的高速等离子弹丸对象池、InstancedMesh 批量发光几何渲染、
 * 物理环境碰撞检测、命中玩家线段判断与粒子撞击事件触发。
 */

import * as THREE from "three";
import { segmentSegmentDistanceSq } from "./math.js";

const {
  Vector3,
  Quaternion,
  Matrix4,
  CylinderGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  Color,
  DynamicDrawUsage,
} = THREE;

const VEC_Z_FORWARD = new Vector3(0, 0, 1);
const vTemp1 = new Vector3();
const qTempRot = new Quaternion();
const mTempMatrix = new Matrix4();
const vUnitScale = new Vector3(1, 1, 1);
const vPlayerFeet = new Vector3();
const vPlayerHead = new Vector3();

/**
 * 创建敌方等离子脉冲弹丸系统
 * @param {object} ctx 全局引擎上下文
 * @param {THREE.Group} rootGroup 挂载的目标组
 * @param {object} tune 配置参数
 * @returns {object}
 */
export function createProjectileSystem(ctx, rootGroup, tune) {
  const maxBolts = tune.maxBolts || 32;

  // 弹丸物理状态对象池
  const boltPool = [];
  for (let i = 0; i < maxBolts; i++) {
    boltPool.push({
      on: false,
      life: 0,
      len: 0,
      pos: new Vector3(),
      dir: new Vector3(),
      from: new Vector3(),
    });
  }

  // 弹丸发光几何体与着色材质
  const boltGeo = new CylinderGeometry(0.016, 0.03, 1, 6, 1);
  boltGeo.rotateX(Math.PI / 2);
  boltGeo.translate(0, 0, -0.5);

  const boltEmissive = ctx.mats.emissive(0xff681a, 14);
  const boltMat =
    boltEmissive && boltEmissive.isMeshBasicMaterial
      ? boltEmissive
      : new MeshBasicMaterial({ color: new Color(0xff681a).multiplyScalar(14) });

  const boltInstancedMesh = new InstancedMesh(boltGeo, boltMat, maxBolts);
  boltInstancedMesh.frustumCulled = false;
  boltInstancedMesh.castShadow = false;
  boltInstancedMesh.receiveShadow = false;
  boltInstancedMesh.count = 0;
  boltInstancedMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  rootGroup.add(boltInstancedMesh);

  // 碰撞事件通用载体
  const impactEventData = {
    point: new Vector3(),
    normal: new Vector3(),
    dist: 0,
    surface: "concrete",
    enemy: null,
    part: null,
    dir: new Vector3(),
    from: "enemy",
  };

  return {
    /**
     * 发射一颗等离子脉冲弹丸
     * @param {THREE.Vector3} origin 起始位置
     * @param {THREE.Vector3} dir 飞行方向
     */
    fireBolt(origin, dir) {
      let freeBolt = null;
      for (let i = 0; i < boltPool.length; i++) {
        if (!boltPool[i].on) {
          freeBolt = boltPool[i];
          break;
        }
      }
      if (freeBolt) {
        freeBolt.on = true;
        freeBolt.life = 1.3;
        freeBolt.pos.copy(origin);
        freeBolt.dir.copy(dir);
        freeBolt.from.copy(origin);
        freeBolt.len = 0;
      }
    },

    /**
     * 等离子弹丸每帧物理步进与碰撞判定
     * @param {number} dt 帧时间间隔
     */
    update(dt) {
      const player = ctx.player;
      let visibleCount = 0;

      for (let i = 0; i < boltPool.length; i++) {
        const bolt = boltPool[i];
        if (!bolt.on) continue;

        const stepDist = tune.gull.boltSpeed * dt;
        bolt.life -= dt;

        // 场景射线检测
        const envHit = ctx.physics.raycast(bolt.pos, bolt.dir, stepDist);
        const effectiveDist = envHit ? envHit.dist : stepDist;

        let hitPlayer = false;
        if (player && player.alive !== false) {
          vTemp1.copy(bolt.pos).addScaledVector(bolt.dir, effectiveDist);
          vPlayerFeet.set(player.pos.x, player.pos.y + 0.35, player.pos.z);
          vPlayerHead.set(
            player.pos.x,
            player.pos.y + (player.crouching ? 1.0 : 1.5),
            player.pos.z,
          );

          // 检测弹丸线段与玩家中轴线段最近距离
          if (segmentSegmentDistanceSq(bolt.pos, vTemp1, vPlayerFeet, vPlayerHead) < 0.36 * 0.36) {
            hitPlayer = true;
          }
        }

        if (hitPlayer) {
          player.damage(tune.gull.boltDamage, bolt.from);
          bolt.on = false;
          continue;
        }

        if (envHit) {
          impactEventData.point.copy(envHit.point);
          impactEventData.normal.copy(envHit.normal);
          impactEventData.dist = envHit.dist;
          impactEventData.surface = envHit.surface;
          impactEventData.dir.copy(bolt.dir);
          ctx.events.emit("impact", impactEventData);
          bolt.on = false;
          continue;
        }

        if (bolt.life <= 0) {
          bolt.on = false;
          continue;
        }

        bolt.pos.addScaledVector(bolt.dir, stepDist);
        bolt.len = Math.min(1.5, bolt.len + stepDist);

        qTempRot.setFromUnitVectors(VEC_Z_FORWARD, bolt.dir);
        vUnitScale.set(1, 1, Math.max(0.2, bolt.len));
        mTempMatrix.compose(bolt.pos, qTempRot, vUnitScale);
        boltInstancedMesh.setMatrixAt(visibleCount++, mTempMatrix);
      }

      if (visibleCount || boltInstancedMesh.count) {
        boltInstancedMesh.count = visibleCount;
        boltInstancedMesh.instanceMatrix.needsUpdate = true;
      }
    },

    /**
     * 重置所有活跃弹丸
     */
    reset() {
      for (let i = 0; i < boltPool.length; i++) {
        boltPool[i].on = false;
      }
      boltInstancedMesh.count = 0;
      boltInstancedMesh.instanceMatrix.needsUpdate = true;
    },
  };
}

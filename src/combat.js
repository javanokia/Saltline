import * as THREE from 'three';

const { Vector3 } = THREE;

/**
 * 创建战斗结算与弹道伤害判定系统 (Combat & Hitscan Adjudication System)
 * 负责玩家射线击发、命中敌人弱点判定、敌方对玩家弹道判定、物理表面碰撞与范围爆炸
 * @param {object} ctx 全局引擎上下文 (包含 events, physics, enemies, player)
 */
function createCombatSystem(ctx) {
  // 战绩数据统计
  const stats = {
    shots: 0,
    hits: 0,
    kills: 0
  };

  ctx.events.on('enemy:killed', () => {
    stats.kills++;
  });

  const tempVec1 = new Vector3();
  const tempVec2 = new Vector3();

  return {
    stats,

    /**
     * 重置战斗统计
     */
    reset() {
      stats.shots = 0;
      stats.hits = 0;
      stats.kills = 0;
    },

    /**
     * 玩家射击射线检测与命中判定
     * @param {THREE.Vector3} origin 射击起点 (玩家摄像机/枪口眼位)
     * @param {THREE.Vector3} direction 归一化射击方向 (包含武器散布)
     * @param {object} options
     * @param {number} [options.damage=28] 基础伤害
     * @param {number} [options.range=300] 最大有效射程 (米)
     * @param {number} [options.impulse=1] 物理冲击量
     * @returns {object|null} 命中结果
     */
    playerShot(origin, direction, { damage = 28, range = 300, impulse = 1 } = {}) {
      stats.shots++;

      // 1. 先进行静态场景物理射线检测
      const envHit = ctx.physics.raycast(origin, direction, range);
      const maxDistance = envHit ? envHit.dist : range;

      // 2. 在最近遮挡距离内检测敌方单位 (机械飞鸥 / 机械猎犬)
      const enemyHit = ctx.enemies.raycast(origin, direction, maxDistance);

      if (enemyHit) {
        stats.hits++;

        // 弱点/爆头暴击判定 (光学镜头核心 / 动力核心)
        const isWeakpoint = enemyHit.part === 'weak';
        const damageMultiplier = isWeakpoint ? 2.2 : 1.0;
        const totalDamage = damage * damageMultiplier;

        const isKilled = enemyHit.enemy.damage(totalDamage, enemyHit.point, direction, enemyHit.part) === true;

        const impactEvent = {
          point: enemyHit.point,
          normal: enemyHit.normal || direction.clone().negate(),
          dist: enemyHit.dist,
          surface: 'enemy',
          enemy: enemyHit.enemy,
          part: enemyHit.part,
          dir: direction,
          from: 'player',
          killed: isKilled
        };

        // 触发命中特效与 HUD 反馈 (Hitmarker)
        ctx.events.emit('impact', impactEvent);
        ctx.events.emit('player:hitEnemy', {
          enemy: enemyHit.enemy,
          part: enemyHit.part,
          killed: isKilled,
          weak: isWeakpoint
        });

        return impactEvent;
      }

      // 3. 击中静态场景 (集装箱/水泥地面/金属管道)
      if (envHit) {
        const impactEvent = {
          point: envHit.point,
          normal: envHit.normal,
          dist: envHit.dist,
          surface: envHit.surface,
          enemy: null,
          dir: direction,
          from: 'player'
        };
        ctx.events.emit('impact', impactEvent);
        return impactEvent;
      }

      return null;
    },

    /**
     * 敌方单位对玩家的射击判定 (机械飞鸥等离子脉冲弹 / 机械猎犬射击)
     * @param {THREE.Vector3} origin 射击起点
     * @param {THREE.Vector3} direction 射击方向
     * @param {object} options
     * @param {number} [options.damage=6] 单发伤害
     * @param {number} [options.range=200] 射程
     * @returns {boolean} 是否命中玩家
     */
    enemyShot(origin, direction, { damage = 6, range = 200 } = {}) {
      const envHit = ctx.physics.raycast(origin, direction, range);
      const maxDistance = envHit ? envHit.dist : range;
      const player = ctx.player;

      if (player && player.alive) {
        // 玩家中心高度偏移
        const playerChest = tempVec1.copy(player.pos);
        playerChest.y += 1.0;

        // 射线投影距离测试
        const rayProj = playerChest.sub(origin).dot(direction);

        if (rayProj > 0 && rayProj < maxDistance) {
          // 计算射线上最接近点
          const closestPoint = tempVec2.copy(origin).addScaledVector(direction, rayProj);
          const deltaY = Math.abs(closestPoint.y - (player.pos.y + 0.95));
          const planarDist = Math.hypot(closestPoint.x - player.pos.x, closestPoint.z - player.pos.z);

          // 玩家胶囊体碰撞判定 (柱体半径 0.38m, 半高 0.95m)
          if (planarDist < 0.38 && deltaY < 0.95) {
            player.damage(damage, origin);
            return true;
          }
        }
      }

      // 未命中玩家但击中环境
      if (envHit) {
        ctx.events.emit('impact', {
          point: envHit.point,
          normal: envHit.normal,
          dist: envHit.dist,
          surface: envHit.surface,
          enemy: null,
          dir: direction,
          from: 'enemy'
        });
      }

      return false;
    },

    /**
     * 范围爆炸物理与伤害结算 (油桶引爆 / 飞鸥坠地爆炸)
     * @param {THREE.Vector3} center 爆炸中心点
     * @param {number} [radius=5] 爆炸杀伤半径 (米)
     * @param {number} [maxDamage=80] 中心最高伤害
     * @param {string} [source='player'] 伤害来源
     */
    explode(center, radius = 5, maxDamage = 80, source = 'player') {
      // 遍历所有敌方单位
      for (const enemy of ctx.enemies.list) {
        if (!enemy.alive) continue;
        const dist = enemy.pos.distanceTo(center);
        if (dist < radius) {
          const targetPos = tempVec1.copy(enemy.pos).setY(enemy.pos.y + 0.5);
          // 视线遮挡检测 (防穿墙判定)
          if (ctx.physics.lineOfSight(center, targetPos)) {
            const damage = maxDamage * (1 - dist / radius);
            const impulseDir = tempVec2.copy(enemy.pos).sub(center).normalize();
            enemy.damage(damage, enemy.pos, impulseDir, 'body');
          }
        }
      }

      // 对玩家伤害判定
      const player = ctx.player;
      if (player && player.alive) {
        const playerChest = tempVec1.copy(player.pos).setY(player.pos.y + 1.0);
        const playerDist = playerChest.distanceTo(center);
        if (playerDist < radius && ctx.physics.lineOfSight(center, playerChest)) {
          const damage = maxDamage * 0.5 * (1 - playerDist / radius);
          player.damage(damage, center);
        }
      }
    }
  };
}

export const create = createCombatSystem;
export { createCombatSystem as zv };

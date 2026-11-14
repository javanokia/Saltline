// @ts-check
/**
 * @file src/enemies/tokens.js
 * @description 敌方单位并发攻击与突袭许可令牌调度器 (Combat Token Coordinator)
 *
 * 【系统职责】
 * 限制同一时刻对玩家发起远程开火或近战扑击的并发敌方单位数量，
 * 避免群体包围时瞬间齐射秒杀玩家，提供战术射击游戏的交火节奏感。
 */

/**
 * 创建并发攻击令牌协调器
 * @param {object} tune 配置参数
 * @returns {object}
 */
export function createTokenCoordinator(tune) {
  let activeTokens = 0;
  let lastTokenTime = -9;
  let lastTokenType = "";
  const wantTime = { gull: -9, hound: -9 };

  return {
    get count() {
      return activeTokens;
    },
    get lastTime() {
      return lastTokenTime;
    },
    get lastType() {
      return lastTokenType;
    },
    get wantTime() {
      return wantTime;
    },

    /**
     * 申请攻击许可令牌
     * @param {object} enemy 申请令牌的敌方单位
     * @param {number} currentTime 当前世界时间
     * @param {Array<object>} activeEnemies 当前活跃敌人群落
     * @returns {boolean} 是否授予令牌
     */
    requestToken(enemy, currentTime, activeEnemies) {
      if (enemy.hasToken) return true;

      let aliveCount = 0;
      for (let i = 0; i < activeEnemies.length; i++) {
        if (activeEnemies[i].alive) aliveCount++;
      }

      const maxAllowed = aliveCount > 5 ? tune.maxTokensCrowd : tune.maxTokens;
      const timeSinceLastToken = currentTime - lastTokenTime;
      const otherType = enemy.type === "gull" ? "hound" : "gull";

      // 防止同一类型敌人过于频繁连续抢占令牌，保持海鸥与机械犬交叉交火
      const isRepeatedTypeTooFast =
        lastTokenType === enemy.type &&
        currentTime - wantTime[otherType] < 0.5 &&
        timeSinceLastToken < tune.tokenGap * 2.2;

      if (
        activeTokens >= maxAllowed ||
        timeSinceLastToken < tune.tokenGap ||
        isRepeatedTypeTooFast
      ) {
        wantTime[enemy.type] = currentTime;
        return false;
      }

      activeTokens++;
      lastTokenTime = currentTime;
      lastTokenType = enemy.type;
      enemy.hasToken = true;
      return true;
    },

    /**
     * 归还或撤销攻击许可令牌
     * @param {object} enemy
     */
    releaseToken(enemy) {
      if (enemy.hasToken) {
        enemy.hasToken = false;
        activeTokens = Math.max(0, activeTokens - 1);
      }
    },

    /**
     * 重置令牌调度器
     */
    reset() {
      activeTokens = 0;
      lastTokenTime = -9;
      lastTokenType = "";
      wantTime.gull = -9;
      wantTime.hound = -9;
    },
  };
}

// @ts-check
/**
 * @file src/enemies/wrecks.js
 * @description 敌方单位被击毁残骸与资源回收管理器 (Enemy Wrecks & Lifecycle Recycler)
 *
 * 【系统职责】
 * 限制港区中保留的敌方残骸数量（默认最多 5 具），
 * 控制被击毁机械单位的持续冒烟、缓慢沉降与内存对象池回收。
 */

/**
 * 创建敌方残骸管理器
 * @param {number} maxWrecks 场景最大允许保留的残骸数量
 * @returns {object}
 */
export function createWreckManager(maxWrecks = 5) {
  const activeWrecks = [];

  return {
    get list() {
      return activeWrecks;
    },

    /**
     * 将阵亡敌方单位移入残骸队列
     * @param {object} enemy
     */
    addWreck(enemy) {
      activeWrecks.push(enemy);
      while (activeWrecks.length > maxWrecks) {
        const oldest = activeWrecks.shift();
        if (oldest.active) oldest.sink = 0.001;
      }
    },

    /**
     * 彻底注销并回收敌方单位
     * @param {object} enemy
     * @param {Array<object>} activeEnemies
     */
    retire(enemy, activeEnemies) {
      enemy._deactivate();
      const idxList = activeEnemies.indexOf(enemy);
      if (idxList >= 0) activeEnemies.splice(idxList, 1);
      const idxWreck = activeWrecks.indexOf(enemy);
      if (idxWreck >= 0) activeWrecks.splice(idxWreck, 1);
    },

    /**
     * 清空所有残骸
     */
    reset() {
      for (let i = 0; i < activeWrecks.length; i++) {
        activeWrecks[i]._deactivate();
      }
      activeWrecks.length = 0;
    },
  };
}

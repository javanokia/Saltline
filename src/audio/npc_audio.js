// @ts-check
/**
 * @file src/audio/npc_audio.js
 * @description 敌对单位距离优先近场音效跟踪 (NPC Audio Tracker) 与目标中继发射塔电磁回路声 (Relay Station Audio)
 */

import { clampNumber } from "./baker.js";

/**
 * 创建 NPC 与任务中继点音频跟踪器
 * @param {Object} params
 * @param {any} params.engineCtx
 * @param {{ x: number, y: number, z: number }} params.listenerPos
 * @param {(name: string, opts?: any) => any} params.createLoop
 * @param {(name: string, opts?: any) => boolean} params.playSound
 * @param {() => number} [params.rand]
 */
export function createNpcAudioTracker({
  engineCtx,
  listenerPos,
  createLoop,
  playSound,
  rand = Math.random,
}) {
  /** @type {Map<any, { h: any, type: string, lx: number, ly: number, lz: number, sp: number, d: number, tune: number }>} */
  const trackedEnemies = new Map();
  let npcSortTimer = 0;
  const isNpcTrackingActive = false;
  /** @type {any[]} */
  const trackedNpcLoops = [];

  function trackEnemy(enemy) {
    if (!enemy || isNpcTrackingActive || trackedEnemies.has(enemy) || enemy.alive === false) return;
    trackedEnemies.set(enemy, {
      h: null,
      type: enemy.type === "hound" ? "hound" : "gull",
      lx: enemy.pos ? enemy.pos.x : 0,
      ly: enemy.pos ? enemy.pos.y : 0,
      lz: enemy.pos ? enemy.pos.z : 0,
      sp: 0,
      d: 1e9,
      tune: 0.96 + rand() * 0.1,
    });
  }

  function removeTrackedEnemy(enemy) {
    const record = trackedEnemies.get(enemy);
    if (record) {
      if (record.h) record.h.stop(0.12);
      trackedEnemies.delete(enemy);
    }
  }

  function clearAllTrackedEnemies() {
    for (const enemy of [...trackedEnemies.keys()]) {
      removeTrackedEnemy(enemy);
    }
  }

  /** @type {any[]} */
  const sortedCandidates = [];

  function updateNpcAudioTracking(dt) {
    npcSortTimer -= dt;
    if (npcSortTimer <= 0 && isNpcTrackingActive) {
      npcSortTimer = 0.25;
      sortedCandidates.length = 0;
      for (const loopItem of trackedNpcLoops) {
        loopItem.d = Math.hypot(
          loopItem.px - listenerPos.x,
          loopItem.py - listenerPos.y,
          loopItem.pz - listenerPos.z,
        );
        sortedCandidates.push(loopItem);
      }
      sortedCandidates.sort((a, b) => a.d - b.d);
      for (let i = 0; i < sortedCandidates.length; i++) {
        sortedCandidates[i].vT = i < 6 && sortedCandidates[i].d < 90 ? 1 : 0;
      }
    }

    if (npcSortTimer <= 0) {
      npcSortTimer = 0.25;
      const enemyList = engineCtx.enemies && engineCtx.enemies.list;
      if (Array.isArray(enemyList)) {
        for (let i = 0; i < enemyList.length; i++) {
          const e = enemyList[i];
          if (e && e.alive !== false && !trackedEnemies.has(e)) trackEnemy(e);
        }
      }

      sortedCandidates.length = 0;
      for (const [enemy, record] of trackedEnemies) {
        if (enemy.alive === false || (Array.isArray(enemyList) && enemyList.indexOf(enemy) < 0)) {
          removeTrackedEnemy(enemy);
          continue;
        }
        const pos = enemy.pos;
        if (pos) {
          record.d = Math.hypot(
            pos.x - listenerPos.x,
            pos.y - listenerPos.y,
            pos.z - listenerPos.z,
          );
          sortedCandidates.push(record);
        }
      }
      sortedCandidates.sort((a, b) => a.d - b.d);

      for (let i = 0; i < sortedCandidates.length; i++) {
        const item = sortedCandidates[i];
        const isNear = i < 6 && item.d < 90;
        if (isNear && !item.h) {
          item.h = createLoop(item.type === "gull" ? "gull_rotor" : "hound_servo", {
            pos: [item.lx, item.ly, item.lz],
            gain: 0,
            hrtf: true,
            fade: 5.0,
            _auto: true,
          });
        } else if (!isNear && item.h) {
          item.h.stop(0.25);
          item.h = null;
        }
      }
    }

    for (const [enemy, record] of trackedEnemies) {
      const pos = enemy.pos;
      if (pos) {
        if (dt > 0) {
          const speed = Math.hypot(pos.x - record.lx, pos.y - record.ly, pos.z - record.lz) / dt;
          record.sp += (Math.min(speed, 30) - record.sp) * Math.min(1, dt * 5);
        }
        record.lx = pos.x;
        record.ly = pos.y;
        record.lz = pos.z;

        if (record.h) {
          record.h.setPos(pos);
          if (record.type === "gull") {
            record.h.setGain(1.0);
            record.h.setPitch(record.tune * (0.94 + 0.3 * clampNumber(record.sp / 10, 0, 1)));
          } else {
            const speedFactor = clampNumber(record.sp / 3, 0, 1);
            record.h.setGain(0.3 + 0.5 * speedFactor);
            record.h.setPitch(record.tune * (0.88 + 0.3 * speedFactor));
          }
        }
      }
    }
  }

  // 目标中继发射塔电磁回路声 (Relay Station Objective Audio)
  /** @type {Array<{ id?: any, index: number, pos: { x: number, y: number, z: number }, h: any }>} */
  let activeRelayNodes = [];

  function resetRelayAudioNodes() {
    for (const node of activeRelayNodes) node.h.stop(0.2);
    activeRelayNodes = [];

    const objectives = engineCtx.level && engineCtx.level.objectives;
    if (Array.isArray(objectives)) {
      objectives.forEach((obj, idx) => {
        if (obj && obj.pos) {
          activeRelayNodes.push({
            id: obj.id,
            index: idx,
            pos: { x: obj.pos.x, y: (obj.pos.y || 0) + 1.2, z: obj.pos.z },
            h: createLoop("relay_hum", {
              pos: [obj.pos.x, (obj.pos.y || 0) + 1.2, obj.pos.z],
              gain: 0.9,
            }),
          });
        }
      });
    }
  }

  function handleRelayHacked(data) {
    data = data || {};
    let foundIdx = activeRelayNodes.findIndex((n) => data.id != null && n.id === data.id);
    if (foundIdx < 0 && data.index != null) {
      foundIdx = activeRelayNodes.findIndex((n) => n.index === data.index);
    }

    if (foundIdx >= 0) {
      const node = activeRelayNodes[foundIdx];
      node.h.stop(0.08);
      activeRelayNodes.splice(foundIdx, 1);
      playSound("relay_cut", { pos: node.pos, gain: 1.0 });
    } else {
      playSound("relay_cut", { gain: 0.8 });
    }
  }

  return {
    trackedEnemies,
    trackEnemy,
    removeTrackedEnemy,
    clearAllTrackedEnemies,
    updateNpcAudioTracking,
    resetRelayAudioNodes,
    handleRelayHacked,
  };
}

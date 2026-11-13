// @ts-check
/**
 * @file src/audio/events.js
 * @description 音频系统与游戏全局事件总线绑定器 (Audio Event Bus Subscriptions)
 */

import { clampNumber } from "./baker.js";

/**
 * 格式化三维向量
 * @param {any} vec
 * @returns {{ x: number, y: number, z: number } | null}
 */
export const formatVector = (vec) => (vec && typeof vec.x === "number" ? vec : null);

/**
 * 绑定游戏事件到音频子系统
 * @param {Object} params
 * @param {any} params.engineCtx
 * @param {AudioContext} params.audioCtx
 * @param {{ x: number, y: number, z: number }} params.listenerPos
 * @param {(name: string, opts?: any) => boolean} params.playSound
 * @param {(gainScale: number) => void} params.triggerGunshotReverbTail
 * @param {any} params.npcTracker
 * @param {Record<string, any>} params.envLoops
 * @param {() => number} [params.rand]
 * @param {any} params.stateRef
 */
export function bindAudioEvents({
  engineCtx,
  audioCtx,
  listenerPos,
  playSound,
  triggerGunshotReverbTail,
  npcTracker,
  envLoops,
  rand = Math.random,
  stateRef,
}) {
  const eventBus = engineCtx.events;
  if (!eventBus || !eventBus.on) return;

  const on = (/** @type {string} */ evtName, /** @type {(payload: any) => void} */ handler) => {
    eventBus.on(evtName, (/** @type {any} */ payload) => {
      try {
        handler(payload || {});
      } catch (err) {
        console.error("[audio] event " + evtName, err);
      }
    });
  };

  let rifleVariantCycler = 0;
  let lastBounceTime = 0;
  let lastImpactTime = 0;
  let lastWhizTime = 0;
  let lastAlertTime = 0;
  let lastCompleteMusicTime = 0;

  on("weapon:fire", (payload) => {
    const soundType = (payload && payload.soundType) || "rifle";
    let soundName = "rifle_shot";
    let gainScale = 1.0;
    let minTailInterval = 0.28;
    let tailGain = 1.0;

    if (soundType === "shotgun") {
      soundName = "shotgun_shot";
      gainScale = 1.15;
      minTailInterval = 0.35;
      tailGain = 1.25;
    } else if (soundType === "smg") {
      soundName = "smg_shot";
      gainScale = 0.92;
      minTailInterval = 0.12;
      tailGain = 0.7;
    } else if (soundType === "sniper") {
      soundName = "sniper_shot";
      gainScale = 1.35;
      minTailInterval = 0.45;
      tailGain = 1.6;
    }

    rifleVariantCycler = (rifleVariantCycler + 1) & 3;
    playSound(soundName, { variant: rifleVariantCycler, gain: gainScale, jitter: 0.012 });

    const now = audioCtx.currentTime;
    stateRef.lastGunshotTime = now;
    if (now - stateRef.lastReverbTailTime > minTailInterval) {
      triggerGunshotReverbTail(tailGain);
    }

    stateRef.musicDuckingTarget = Math.min(stateRef.musicDuckingTarget, 0.55);
    if (stateRef.combatIntensityAccumulator > 0.3) {
      stateRef.combatIntensityAccumulator = Math.min(
        1.0,
        stateRef.combatIntensityAccumulator + 0.015,
      );
    }
  });

  on("weapon:dry", () => playSound("rifle_dry", { gain: 0.9 }));

  on("weapon:reload", (payload) => {
    if (payload.phase === "magout") playSound("reload_magout");
    else if (payload.phase === "magin") playSound("reload_magin");
    else if (payload.phase === "bolt") playSound("reload_bolt");
    else if (payload.phase === "start") playSound("jump", { gain: 0.5, pitch: 1.3 });
  });

  on("weapon:melee", () => playSound("jump", { gain: 0.9, pitch: 1.2 }));

  on("shell:bounce", (payload) => {
    const now = audioCtx.currentTime;
    if (now - lastBounceTime < 0.035) return;
    lastBounceTime = now;
    const surface = (payload && payload.surface) || "concrete";

    if (surface === "water") {
      playSound("impact_water", { pos: formatVector(payload.pos), gain: 0.25, pitch: 1.7 });
    } else if (surface === "metal") {
      playSound("shell_bounce_metal", { pos: formatVector(payload.pos), gain: 1.05, pitch: 1.0 });
    } else if (surface === "wood") {
      playSound("shell_bounce_wood", { pos: formatVector(payload.pos), gain: 0.9, pitch: 1.0 });
    } else {
      playSound("shell_bounce_concrete", {
        pos: formatVector(payload.pos),
        gain: 0.85,
        pitch: 1.0,
      });
    }
  });

  on("impact", (payload) => {
    const now = audioCtx.currentTime;
    if (now - lastImpactTime < 0.022) return;
    lastImpactTime = now;

    const hitPoint = formatVector(payload.point);
    const surfaceType = payload.surface;

    if (payload.enemy) {
      playSound("impact_enemy", {
        pos: hitPoint,
        gain: payload.part === "weak" ? 1.0 : 0.85,
        pitch: payload.part === "weak" ? 1.25 : 1.0,
      });
      return;
    }

    // 敌方子弹近失弹探测 (Near-Miss Bullet Whiz & Ricochet Detection)
    if (
      payload.from === "enemy" &&
      hitPoint &&
      payload.dir &&
      typeof payload.dir.x === "number" &&
      now - lastWhizTime > 0.09
    ) {
      const dir = payload.dir;
      const dirLenSq = dir.x * dir.x + dir.y * dir.y + dir.z * dir.z || 1;
      const projDist =
        ((listenerPos.x - hitPoint.x) * dir.x +
          (listenerPos.y - hitPoint.y) * dir.y +
          (listenerPos.z - hitPoint.z) * dir.z) /
        dirLenSq;

      if (projDist > 0 && projDist < 30) {
        const closestX = hitPoint.x + dir.x * projDist;
        const closestY = hitPoint.y + dir.y * projDist;
        const closestZ = hitPoint.z + dir.z * projDist;
        const earDist = Math.hypot(
          listenerPos.x - closestX,
          listenerPos.y - closestY,
          listenerPos.z - closestZ,
        );

        if (earDist < 3.5) {
          lastWhizTime = now;
          if (rand() < 0.45) {
            playSound("ricochet", {
              pos: [closestX, closestY, closestZ],
              gain: clampNumber(1 - earDist / 3.5, 0.4, 1.0),
            });
          } else {
            playSound("whiz", {
              pos: [closestX, closestY, closestZ],
              gain: clampNumber(1 - earDist / 3.5, 0.5, 1.0),
            });
          }
        }
      }
    }

    playSound("impact_concrete", { pos: hitPoint, surface: surfaceType });
  });

  on("player:step", (payload) => {
    let surface = payload.surface || "concrete";
    try {
      if (
        payload.pos &&
        engineCtx.ground &&
        engineCtx.ground.isPuddle &&
        engineCtx.ground.isPuddle(payload.pos.x, payload.pos.z)
      ) {
        surface = "water";
      }
    } catch {}

    const isSprint = !!payload.sprint;
    playSound("step_concrete", {
      surface,
      gain: isSprint ? 0.95 : 0.65,
      pitch: isSprint ? 1.05 : 1.0,
    });
  });

  on("player:jump", () => playSound("jump", { gain: 0.8 }));

  on("player:land", (payload) => {
    const gain = clampNumber(0.35 + (Math.abs(payload.speed) || 4.0) / 10, 0.35, 1.0);
    playSound("land", { gain });
    if (payload.surface === "water") playSound("impact_water", { gain: gain * 0.7, pitch: 0.9 });
  });

  on("player:hit", (payload) => {
    const dmg = +payload.amount || 10;
    playSound("hurt", { gain: clampNumber(0.5 + dmg / 40, 0.5, 1.0), jitter: 0.05 });
    if (dmg > 22 && audioCtx.currentTime - lastAlertTime > 2.0) {
      lastAlertTime = audioCtx.currentTime;
      playSound("ear_ring", { gain: clampNumber(dmg / 60, 0.3, 0.8) });
    }
    // 受到伤害时高频骤减 (耳鸣与闷音滤波)
    stateRef.muffledHearingFactor = Math.min(
      1.0,
      stateRef.muffledHearingFactor + 0.4 + dmg * 0.015,
    );
    stateRef.combatIntensityAccumulator = Math.min(1.0, stateRef.combatIntensityAccumulator + 0.35);
  });

  on("enemy:alert", (payload) => {
    const now = audioCtx.currentTime;
    if (now - lastAlertTime < 0.12) return;
    lastAlertTime = now;
    const enemy = payload.enemy || {};
    playSound("alert", {
      pos: formatVector(enemy.pos) || formatVector(payload.pos),
      variant: enemy.type === "hound" ? 1 : 0,
    });
    stateRef.combatIntensityAccumulator = Math.min(1.0, stateRef.combatIntensityAccumulator + 0.3);
  });

  on("enemy:fire", (payload) => {
    const type = payload.type || (payload.enemy && payload.enemy.type);
    const pos = formatVector(payload.pos) || (payload.enemy && formatVector(payload.enemy.pos));
    playSound(type === "hound" ? "hound_fire" : "gull_fire", { pos });
    stateRef.combatIntensityAccumulator = Math.min(1.0, stateRef.combatIntensityAccumulator + 0.08);
  });

  on("enemy:telegraph", (payload) => {
    const enemy = payload.enemy || {};
    const type = payload.type || enemy.type;
    const dur = clampNumber(+payload.time || 0.55, 0.15, 1.5);
    playSound("telegraph", {
      pos: formatVector(payload.pos) || formatVector(enemy.pos),
      variant: type === "hound" ? 1 : 0,
      pitch: clampNumber(0.55 / dur, 0.6, 1.8),
    });
  });

  on("enemy:step", (payload) => {
    const pos = formatVector(payload.pos) || (payload.enemy && formatVector(payload.enemy.pos));
    playSound("hound_step", { pos, gain: 1.0, pitch: payload.crash ? 0.75 : 1.0 });
  });

  on("enemy:killed", (payload) => {
    const enemy = payload.enemy;
    const type = payload.type || (enemy && enemy.type);
    const pos = formatVector(payload.pos) || (enemy && formatVector(enemy.pos));
    if (enemy) npcTracker.removeTrackedEnemy(enemy);
    playSound(type === "hound" ? "hound_die" : "gull_die", { pos, gain: 1.0 });
  });

  on("explosion", (payload) => {
    const size = clampNumber(+payload.size || 1.0, 0.3, 3.0);
    const pos = formatVector(payload.pos);
    playSound("explosion", {
      pos,
      gain: clampNumber(0.6 + size * 0.35, 0.6, 1.4),
      pitch: clampNumber(1.3 - size * 0.3, 0.6, 1.4),
    });

    if (pos) {
      const dist = Math.hypot(pos.x - listenerPos.x, pos.y - listenerPos.y, pos.z - listenerPos.z);
      stateRef.muffledHearingFactor = Math.max(
        stateRef.muffledHearingFactor,
        clampNumber(1 - (dist - 5) / 10, 0, 0.95),
      );
      if (dist < 18) playSound("ear_ring", { gain: clampNumber(1 - dist / 18, 0.2, 0.75) });
    }
    stateRef.combatIntensityAccumulator = Math.min(1.0, stateRef.combatIntensityAccumulator + 0.45);
  });

  on("objective:done", (payload) => {
    npcTracker.handleRelayHacked(payload);
    playSound("objective", { gain: 1.0, jitter: 0 });
    stateRef.manualIntensity = 0.15;
  });

  on("objective:all_done", () => {
    playSound("objective_all", { gain: 1.0, jitter: 0 });
    stateRef.manualIntensity = 0.8;
  });

  on("extraction", () => {
    const now = audioCtx.currentTime;
    if (now - lastCompleteMusicTime > 6.0) {
      lastCompleteMusicTime = now;
      playSound("complete", { gain: 1.0, jitter: 0 });
    }
  });

  on("thunder", (payload) => {
    const intensity = clampNumber(payload.intensity != null ? +payload.intensity : 0.6, 0.1, 1.0);
    playSound("thunder", { variant: intensity > 0.6 ? 1 : 0, gain: intensity });
  });

  on("game:state", (payload) => {
    const prevState = stateRef.gameState;
    stateRef.gameState = payload.state || stateRef.gameState;
    if (stateRef.gameState === "playing" && prevState !== "paused") {
      stateRef.combatIntensityAccumulator = 0;
      stateRef.muffledHearingFactor = 0;
      npcTracker.resetRelayAudioNodes();
      for (const key of Object.keys(envLoops)) envLoops[key].setGain(1);
    }
    if (stateRef.gameState === "title") {
      npcTracker.resetRelayAudioNodes();
      stateRef.manualIntensity = 0;
    }
  });
}

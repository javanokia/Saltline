// @ts-check
/**
 * @file src/audio/music_player.js
 * @description 5 轨分层自适应互动交战配乐系统 (5-Layer Adaptive Interactive Soundtrack)
 */

import { SOUND_REGISTRY } from "./sounds.js";
import { MUSIC_LAYER_KEYS, smoothstep01 } from "./baker.js";
import { makeGain } from "./bus.js";

/**
 * 构建 5 轨自适应互动音乐控制器
 * @param {AudioContext} audioCtx
 * @param {GainNode} musicBus
 * @param {Map<string, AudioBuffer>} bufferCache
 * @param {() => boolean} isAudioRunning
 */
export function createMusicConductor(audioCtx, musicBus, bufferCache, isAudioRunning) {
  const musicSystem = {
    on: false,
    layers:
      /** @type {Record<string, { g: GainNode, s: AudioBufferSourceNode, c: number }>} */ ({}),
    t0: 0,
  };

  function startMusicLayersIfReady() {
    if (musicSystem.on || !isAudioRunning()) return;
    for (const key of MUSIC_LAYER_KEYS) {
      if (!bufferCache.has(key + "#0")) return;
    }

    const tStart = audioCtx.currentTime + 0.08;
    for (const key of MUSIC_LAYER_KEYS) {
      const layerGain = makeGain(audioCtx, 0);
      const src = audioCtx.createBufferSource();
      src.buffer = /** @type {AudioBuffer} */ (bufferCache.get(key + "#0"));
      src.loop = true;
      src.connect(layerGain);
      layerGain.connect(musicBus);
      src.start(tStart);
      musicSystem.layers[key] = { g: layerGain, s: src, c: 0 };
    }
    musicSystem.on = true;
    musicSystem.t0 = tStart;
  }

  function checkMusicLayerStartup(justBakedName) {
    if (SOUND_REGISTRY[justBakedName] && SOUND_REGISTRY[justBakedName].music) {
      startMusicLayersIfReady();
    }
  }

  /**
   * 根据当前交战强度 (0.0 ~ 1.0) 计算 5 条音乐轨道的动态增益
   * @param {number} intensity
   * @param {string} [gameState]
   * @returns {number[]}
   */
  function calcMusicLayerGains(intensity, gameState = "playing") {
    if (gameState === "title") return [0.85, 0, 0, 0, 0.9];
    if (gameState === "intro") return [0.8, 0, 0, 0, 0.6];
    if (gameState === "dead") return [0.75, 0, 0, 0, 0];
    if (gameState === "complete") return [0.6, 0, 0, 0, 0.7];

    return [
      0.6 + 0.3 * intensity, // Layer 1: Ambient Drone (始终垫底)
      smoothstep01(0.05, 0.5, intensity) * 0.85, // Layer 2: Bass Ostinato (张力渐入)
      smoothstep01(0.4, 0.8, intensity) * 0.95, // Layer 3: Percussion (交火战术鼓点)
      smoothstep01(0.62, 1.0, intensity) * 0.8, // Layer 4: Climax Brass (战况高潮铜管)
      0, // Layer 5: Motif Chime (事件刺音)
    ];
  }

  /**
   * 逐帧更新音乐分轨音量
   * @param {number} dt
   * @param {number} intensity
   * @param {string} gameState
   * @param {number} masterDucking
   */
  function updateMusicLayers(dt, intensity, gameState, masterDucking) {
    if (!musicSystem.on) {
      startMusicLayersIfReady();
      return;
    }

    const targetGains = calcMusicLayerGains(intensity, gameState);
    const now = audioCtx.currentTime;

    MUSIC_LAYER_KEYS.forEach((key, idx) => {
      const layer = musicSystem.layers[key];
      if (!layer) return;
      const target = targetGains[idx] * masterDucking;
      layer.c += (target - layer.c) * Math.min(1, dt * 2.5);
      layer.g.gain.setValueAtTime(Math.max(0, layer.c), now);
    });
  }

  return {
    musicSystem,
    startMusicLayersIfReady,
    checkMusicLayerStartup,
    calcMusicLayerGains,
    updateMusicLayers,
  };
}

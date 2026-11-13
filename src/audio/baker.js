// @ts-check
/**
 * @file src/audio/baker.js
 * @description 纯算声音样本归一化、同步/分步异步生成器与后台切片烘焙器 (Audio Buffer Baker)
 */

import { createPrng, hashFnv1a, getPeakAmplitude, scaleBuffer } from "./dsp.js";
import { SOUND_REGISTRY } from "./sounds.js";

const isGenerator = (obj) => obj && typeof obj.next === "function";

export const clampNumber = (val, min, max) => Math.min(max, Math.max(min, val));
export const smoothstep01 = (edge0, edge1, x) => {
  const t = clampNumber((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const LAZY_LOAD_SET = new Set([
  "thunder",
  "foghorn",
  "objective",
  "objective_all",
  "complete",
  "death",
  "explosion",
  "rifle_tail_in",
  "gull_die",
  "hound_die",
  "relay_cut",
  "container_bang",
  "ear_ring",
]);

export const BOOT_QUEUE_ORDER = [
  "ir_outdoor",
  "ir_shed",
  "rain",
  "whiz",
  "reload_magout",
  "reload_magin",
  "reload_bolt",
  "shell_bounce",
  "impact_concrete",
  "impact_metal",
  "land",
  "jump",
  "hurt",
  "music_drone",
  "wind",
  "music_motif",
  "impact_enemy",
  "impact_wood",
  "impact_water",
  "impact_glass",
  "ricochet",
  "gull_rotor",
  "hound_servo",
  "alert",
  "telegraph",
  "gull_fire",
  "hound_fire",
  "hound_step",
  "ui_click",
  "ui_hover",
  "sea",
  "rain_interior",
  "relay_hum",
  "gull_die",
  "hound_die",
  "explosion",
  "ear_ring",
  "death",
  "music_ost",
  "music_perc",
  "music_brass",
  "relay_cut",
  "objective",
  "thunder",
  "objective_all",
  "complete",
  "gull_cry",
  "halyard",
  "foghorn",
  "container_bang",
];

export const MUSIC_LAYER_KEYS = [
  "music_drone",
  "music_ost",
  "music_perc",
  "music_brass",
  "music_motif",
];

/**
 * 样本峰值归一化与声道格式封装
 * @param {any} def
 * @param {Float32Array|Float32Array[]} rawData
 * @param {number} sampleRate
 */
export function packageBufferChannels(def, rawData, sampleRate) {
  const channels = Array.isArray(rawData) ? rawData : [rawData];
  let maxPeak = 0;
  for (const ch of channels) {
    maxPeak = Math.max(maxPeak, getPeakAmplitude(ch));
  }
  const normFactor = maxPeak > 0 ? def.peak / maxPeak : 1;
  for (const ch of channels) {
    scaleBuffer(ch, normFactor);
  }
  return {
    sr: sampleRate,
    ch: channels,
    loop: !!def.loop,
  };
}

/**
 * 同步一次性烘焙指定音频资产
 * @param {string} soundName
 * @param {number} [variantIdx=0]
 * @param {number} [overrideSampleRate]
 */
export function bakeSoundSync(soundName, variantIdx = 0, overrideSampleRate) {
  const def = SOUND_REGISTRY[soundName];
  if (!def) return null;
  const sr = overrideSampleRate || def.sr;
  const v = variantIdx % def.n;
  let raw = def.gen(sr, createPrng(hashFnv1a(soundName) + v * 7919), v);
  if (isGenerator(raw)) {
    let stepResult;
    do {
      stepResult = raw.next();
    } while (!stepResult.done);
    raw = stepResult.value;
  }
  return packageBufferChannels(def, raw, sr);
}

/**
 * 分步异步迭代烘焙音频资产 (用于避免阻塞主线程)
 * @param {string} soundName
 * @param {number} [variantIdx=0]
 * @param {number} [overrideSampleRate]
 */
export function createSoundStepper(soundName, variantIdx = 0, overrideSampleRate) {
  const def = SOUND_REGISTRY[soundName];
  if (!def) return null;
  const sr = overrideSampleRate || def.sr;
  const v = variantIdx % def.n;
  let genInstance = def.gen(sr, createPrng(hashFnv1a(soundName) + v * 7919), v);
  let bakedResult = null;

  return {
    step() {
      if (bakedResult) return bakedResult;
      if (isGenerator(genInstance)) {
        const res = genInstance.next();
        if (!res.done) return null;
        genInstance = res.value;
      }
      return (bakedResult = packageBufferChannels(def, genInstance, sr));
    },
  };
}

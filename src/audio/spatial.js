// @ts-check
/**
 * @file src/audio/spatial.js
 * @description 空间 3D 声道定位 (PannerNode)、声道池分配 (Voice Pooling) 与单发音效触发器
 */

import { SOUND_REGISTRY, SOUND_ALIASES, SURFACE_IMPACT_MAP, SURFACE_STEP_MAP } from "./sounds.js";
import { LAZY_LOAD_SET, clampNumber } from "./baker.js";
import { makeGain } from "./bus.js";

/**
 * 设置 PannerNode 空间坐标 (兼容新旧标准)
 * @param {PannerNode} panner
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
export function setPannerPosition(panner, x, y, z) {
  if (panner.positionX) {
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
  } else {
    // @ts-ignore
    panner.setPosition(x, y, z);
  }
}

/**
 * 创建 3D 音频定位节点
 * @param {AudioContext} audioCtx
 * @param {boolean} [useHrtf=false]
 * @returns {PannerNode}
 */
export function create3DPanner(audioCtx, useHrtf = false) {
  const panner = audioCtx.createPanner();
  panner.panningModel = useHrtf ? "HRTF" : "equalpower";
  panner.distanceModel = "inverse";
  panner.refDistance = 3.0;
  panner.rolloffFactor = 0.6;
  panner.maxDistance = 400.0;
  panner.coneInnerAngle = 360.0;
  return panner;
}

/**
 * 初始化静态声道池
 * @param {AudioContext} audioCtx
 * @param {Record<string, GainNode>} buses
 */
export function createVoicePools(audioCtx, buses) {
  const voicePools = {
    world: /** @type {any[]} */ ([]),
    near: /** @type {any[]} */ ([]),
    dry: /** @type {any[]} */ ([]),
    music: /** @type {any[]} */ ([]),
  };

  function allocateVoice(busName, hasPanner) {
    const voice = {
      g: makeGain(audioCtx, 0),
      pan: /** @type {PannerNode|null} */ (null),
      src: /** @type {AudioBufferSourceNode|null} */ (null),
      end: 0,
      start: 0,
      name: "",
      pri: 0,
    };
    if (hasPanner) {
      voice.pan = create3DPanner(audioCtx, false);
      voice.g.connect(voice.pan);
      voice.pan.connect(buses[busName]);
    } else {
      voice.g.connect(buses[busName]);
    }
    voicePools[busName].push(voice);
  }

  for (let i = 0; i < 22; i++) allocateVoice("world", true);
  for (let i = 0; i < 12; i++) allocateVoice("near", false);
  for (let i = 0; i < 8; i++) allocateVoice("dry", false);
  for (let i = 0; i < 3; i++) allocateVoice("music", false);

  return voicePools;
}

/**
 * 查找空闲或可抢占的声音通道 (Voice Stealing Algorithm)
 * @param {any[]} pool
 * @param {string} sfxName
 * @param {any} sfxDef
 * @param {number} now
 */
export function findAvailableVoice(pool, sfxName, sfxDef, now) {
  let freeVoice = null;
  let activeSameCount = 0;
  let oldestSameVoice = null;
  let lowestPriVoice = null;

  for (let i = 0; i < pool.length; i++) {
    const v = pool[i];
    if (v.end <= now) {
      if (!freeVoice) freeVoice = v;
      continue;
    }
    if (v.name === sfxName) {
      activeSameCount++;
      if (!oldestSameVoice || v.start < oldestSameVoice.start) oldestSameVoice = v;
    }
    if (
      !lowestPriVoice ||
      v.pri < lowestPriVoice.pri ||
      (v.pri === lowestPriVoice.pri && v.start < lowestPriVoice.start)
    ) {
      lowestPriVoice = v;
    }
  }

  if (activeSameCount >= (sfxDef.max || 4)) return oldestSameVoice;
  if (freeVoice) return freeVoice;
  return lowestPriVoice && lowestPriVoice.pri <= sfxDef.pri ? lowestPriVoice : null;
}

/**
 * 构建声效触发调度器
 * @param {AudioContext} audioCtx
 * @param {Record<string, any[]>} voicePools
 * @param {Map<string, AudioBuffer>} bufferCache
 * @param {(name: string, variant: number, cb: (buf: AudioBuffer) => void) => void} requestBufferAsync
 * @param {(name: string, variant: number) => AudioBuffer} bakeBufferImmediate
 * @param {() => boolean} isAudioRunning
 */
export function createSoundPlayer(
  audioCtx,
  voicePools,
  bufferCache,
  requestBufferAsync,
  bakeBufferImmediate,
  isAudioRunning,
) {
  const variantCounters = /** @type {Record<string, number>} */ ({});
  const rand = Math.random;

  /**
   * 触发播放单发音效 (Play One-Shot SFX)
   * @param {string} sfxName
   * @param {any} [options]
   */
  function playSound(sfxName, options = {}) {
    sfxName = SOUND_ALIASES[sfxName] || sfxName;
    if (options.surface) {
      if (sfxName === "impact_concrete") sfxName = SURFACE_IMPACT_MAP[options.surface] || sfxName;
      else if (sfxName === "step_concrete") sfxName = SURFACE_STEP_MAP[options.surface] || sfxName;
    }

    const sfxDef = SOUND_REGISTRY[sfxName];
    if (!sfxDef || sfxDef.loop || sfxDef.ir || !isAudioRunning()) return false;

    let variantIdx = options.variant;
    if (variantIdx == null) {
      variantIdx = variantCounters[sfxName] =
        ((variantCounters[sfxName] || 0) + 1 + (sfxDef.n > 2 && rand() < 0.3 ? 1 : 0)) % sfxDef.n;
    } else {
      variantIdx %= sfxDef.n;
    }

    let audioBuf = bufferCache.get(sfxName + "#" + variantIdx);
    if (!audioBuf) {
      if (LAZY_LOAD_SET.has(sfxName)) {
        const reqTime = audioCtx.currentTime;
        requestBufferAsync(sfxName, variantIdx, () => {
          if (audioCtx.currentTime - reqTime < 2.5) {
            playSound(sfxName, Object.assign({}, options, { variant: variantIdx }));
          }
        });
        return false;
      }
      audioBuf = bakeBufferImmediate(sfxName, variantIdx);
    }

    const now = audioCtx.currentTime;
    const is3D = !!options.pos && sfxDef.bus === "world";
    const targetPool = is3D
      ? voicePools.world
      : voicePools[sfxDef.bus === "world" ? "near" : sfxDef.bus];
    const voice = findAvailableVoice(targetPool, sfxName, sfxDef, now);
    if (!voice) return false;

    let startTime = now + (options.delay || 0);
    const gainParam = voice.g.gain;
    gainParam.cancelScheduledValues(now);

    if (voice.end > now && voice.src) {
      gainParam.setTargetAtTime(0, now, 0.004);
      try {
        voice.src.stop(now + 0.025);
      } catch {}
      startTime = Math.max(startTime, now + 0.025);
    }

    const jitter = options.jitter != null ? options.jitter : 0.035;
    const playbackPitch = clampNumber(
      (options.pitch || 1.0) * (1 + (rand() * 2 - 1) * jitter),
      0.25,
      4.0,
    );
    const targetGain = (options.gain != null ? options.gain : 1.0) * (1 - rand() * 0.08);

    gainParam.setValueAtTime(targetGain, startTime);

    if (is3D && voice.pan) {
      const pos = Array.isArray(options.pos)
        ? { x: options.pos[0], y: options.pos[1], z: options.pos[2] }
        : options.pos;
      setPannerPosition(voice.pan, pos.x || 0, pos.y || 0, pos.z || 0);
      voice.pan.refDistance = options.ref || sfxDef.ref || 3.0;
      voice.pan.rolloffFactor =
        options.roll != null ? options.roll : sfxDef.roll != null ? sfxDef.roll : 0.6;
    }

    const srcNode = audioCtx.createBufferSource();
    srcNode.buffer = audioBuf;
    srcNode.playbackRate.value = playbackPitch;
    srcNode.connect(voice.g);
    srcNode.onended = () => {
      try {
        srcNode.disconnect();
      } catch {}
    };
    srcNode.start(startTime);

    voice.src = srcNode;
    voice.start = startTime;
    voice.end = startTime + audioBuf.duration / playbackPitch + 0.03;
    voice.name = sfxName;
    voice.pri = sfxDef.pri || 0;
    return true;
  }

  return { playSound };
}

// @ts-check
/**
 * @file src/audio/loops.js
 * @description 循环背景音效系统 (Audio Loops) 与开敞港区风雨海流自适应环境音
 */

import { SOUND_REGISTRY } from "./sounds.js";
import { clampNumber } from "./baker.js";
import { makeGain } from "./bus.js";
import { create3DPanner, setPannerPosition } from "./spatial.js";

const dummyNoop = () => {};
export const dummyLoopHandle = {
  setPos: dummyNoop,
  setGain: dummyNoop,
  setPitch: dummyNoop,
  stop: dummyNoop,
  alive: false,
};

/**
 * 构建环境与单位循环音效管理器
 * @param {AudioContext} audioCtx
 * @param {Record<string, GainNode>} buses
 * @param {(name: string, variant: number, cb: (buf: AudioBuffer) => void) => void} requestBufferAsync
 */
export function createLoopManager(audioCtx, buses, requestBufferAsync) {
  const activeLoops = new Set();
  const trackedNpcLoops = new Set();
  let isNpcTrackingActive = false;
  const rand = Math.random;

  /**
   * 创建一个持续循环的声音通道
   * @param {string} loopName
   * @param {any} [options]
   */
  function createLoop(loopName, options = {}) {
    const sfxDef = SOUND_REGISTRY[loopName];
    if (!sfxDef || !sfxDef.loop) return dummyLoopHandle;

    const isNpcLoop = (loopName === "gull_rotor" || loopName === "hound_servo") && !options._auto;
    if (isNpcLoop && !options.hrtf) {
      options = Object.assign({ hrtf: true }, options);
    }

    const handle = {
      name: loopName,
      alive: true,
      vT: 1,
      vC: 1,
      px: 0,
      py: 0,
      pz: 0,
      gT: options.gain != null ? options.gain : 1.0,
      gC: 0,
      pT: options.pitch || 1.0,
      pC: options.pitch || 1.0,
      src: /** @type {AudioBufferSourceNode|null} */ (null),
      g: makeGain(audioCtx, 0),
      pan: /** @type {PannerNode|null} */ (null),
      rate: options.fade || 6.0,
      setPos: /** @type {(pos: any) => void} */ (dummyNoop),
      setGain: /** @type {(g: number) => void} */ (dummyNoop),
      setPitch: /** @type {(p: number) => void} */ (dummyNoop),
      stop: /** @type {(fadeTime?: number) => void} */ (dummyNoop),
    };

    let targetInputNode = /** @type {AudioNode} */ (handle.g);
    if (options.pos) {
      handle.pan = create3DPanner(audioCtx, !!options.hrtf);
      handle.pan.refDistance = options.ref || sfxDef.ref || 3.0;
      handle.pan.rolloffFactor =
        options.roll != null ? options.roll : sfxDef.roll != null ? sfxDef.roll : 0.6;
      handle.g.connect(handle.pan);
      targetInputNode = handle.pan;
    }

    targetInputNode.connect(
      buses[options.bus || (options.pos ? "world" : sfxDef.music ? "music" : "amb")],
    );

    handle.setPos = (pos) => {
      if (handle.pan && pos) {
        if (Array.isArray(pos)) {
          handle.px = pos[0];
          handle.py = pos[1];
          handle.pz = pos[2];
        } else {
          handle.px = pos.x || 0;
          handle.py = pos.y || 0;
          handle.pz = pos.z || 0;
        }
        if (Number.isFinite(handle.px + handle.py + handle.pz)) {
          setPannerPosition(handle.pan, handle.px, handle.py, handle.pz);
        }
      }
    };

    handle.setGain = (g) => {
      handle.gT = Math.max(0, +g || 0);
    };

    handle.setPitch = (p) => {
      handle.pT = clampNumber(+p || 1, 0.25, 4.0);
    };

    handle.stop = (fadeTime) => {
      if (!handle.alive) return;
      handle.alive = false;
      activeLoops.delete(handle);
      trackedNpcLoops.delete(handle);

      const fTime = fadeTime ?? 0.18;
      const now = audioCtx.currentTime;
      try {
        handle.g.gain.setValueAtTime(handle.gC, now);
        handle.g.gain.linearRampToValueAtTime(0, now + fTime);
        if (handle.src) handle.src.stop(now + fTime + 0.03);
      } catch {}

      setTimeout(
        () => {
          try {
            if (handle.src) handle.src.disconnect();
            handle.g.disconnect();
            if (handle.pan) handle.pan.disconnect();
          } catch {}
        },
        (fTime + 0.3) * 1000,
      );
    };

    if (options.pos) handle.setPos(options.pos);

    requestBufferAsync(loopName, 0, (buf) => {
      if (!handle.alive) return;
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.playbackRate.value = handle.pC;
      src.connect(handle.g);
      src.start(0, options.offset != null ? options.offset : rand() * buf.duration);
      handle.src = src;
    });

    activeLoops.add(handle);
    if (isNpcLoop) {
      trackedNpcLoops.add(handle);
      isNpcTrackingActive = true;
    }
    return handle;
  }

  // 常规持续环境背景声循环
  const envLoops = {
    rain: createLoop("rain", { gain: 0, fade: 2.0 }),
    rainIn: createLoop("rain_interior", { gain: 0, fade: 2.0 }),
    wind: createLoop("wind", { gain: 0, fade: 2.0 }),
    sea: createLoop("sea", { gain: 0, pos: [33, -1, 0], fade: 2.0, bus: "amb" }),
  };

  let windGustCurrent = 0.4;
  let windGustTarget = 0.4;
  let windTimer = 2.0;

  function updateAmbientLoops(dt, rainLevel, interiorFactor, masterScale) {
    if ((windTimer -= dt) <= 0) {
      windTimer = 3.0 + rand() * 4.0;
      windGustTarget = 0.25 + rand() * 0.55;
    }
    windGustCurrent += (windGustTarget - windGustCurrent) * Math.min(1, dt * 1.2);

    const outdoorRainGain = rainLevel * (1.0 - 0.75 * interiorFactor) * 0.72;
    const indoorRainGain = rainLevel * (0.05 + 0.85 * interiorFactor) * 0.65;
    const windGain = windGustCurrent * (1.0 - 0.7 * interiorFactor) * 0.55;
    const seaGain = (1.0 - 0.8 * interiorFactor) * 0.48;

    envLoops.rain.setGain(outdoorRainGain * masterScale);
    envLoops.rainIn.setGain(indoorRainGain * masterScale);
    envLoops.wind.setGain(windGain * masterScale);
    envLoops.sea.setGain(seaGain * masterScale);
  }

  return {
    createLoop,
    activeLoops,
    trackedNpcLoops,
    envLoops,
    updateAmbientLoops,
    get isNpcTrackingActive() {
      return isNpcTrackingActive;
    },
    set isNpcTrackingActive(val) {
      isNpcTrackingActive = val;
    },
  };
}

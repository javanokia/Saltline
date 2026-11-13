/**
 * @file src/audio.js
 * @description 几猫国产3A大作 (JM 3A Action Game) — 程序化纯声学合成引擎 (Web Audio DSP Engine)
 */

import { TWO_PI, createPrng, hashFnv1a, getPeakAmplitude, scaleBuffer } from "./audio/dsp.js";

import {
  SOUND_REGISTRY,
  SOUND_ALIASES,
  SURFACE_STEP_MAP,
  SURFACE_IMPACT_MAP,
} from "./audio/sounds.js";

const isGenerator = (obj) => obj && typeof obj.next === "function";

/**
 * 样本峰值归一化与声道格式封装
 */
function packageBufferChannels(def, rawData, sampleRate) {
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
 */
function bakeSoundSync(soundName, variantIdx = 0, overrideSampleRate) {
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
 */
function createSoundStepper(soundName, variantIdx = 0, overrideSampleRate) {
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

const clampNumber = (val, min, max) => Math.min(max, Math.max(min, val));
const smoothstep01 = (edge0, edge1, x) => {
  const t = clampNumber((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const LAZY_LOAD_SET = new Set([
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

const BOOT_QUEUE_ORDER = [
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

const MUSIC_LAYER_KEYS = ["music_drone", "music_ost", "music_perc", "music_brass", "music_motif"];

// ============================================================================
// 六、 空音频占位器与引擎实例化入口 (Engine Factory)
// ============================================================================

/**
 * 无音频支持环境下的静音降级桩 (Silent Audio Engine Stub)
 */
function createSilentAudioEngine() {
  const noop = () => {};
  const dummyLoop = { setPos: noop, setGain: noop, setPitch: noop, stop: noop };
  return {
    silent: true,
    update: noop,
    resume: noop,
    play: noop,
    loop: () => dummyLoop,
    setIntensity: noop,
    setInterior: noop,
    setVolume: noop,
    setPaused: noop,
    debug: () => ({ state: "none" }),
    names: Object.keys(SOUND_REGISTRY),
    ready: Promise.resolve(),
  };
}

/**
 * 异步初始化几猫程序化声学合成引擎
 * @param {object} engineCtx 全局引擎上下文 (包含 events, camera, player, level, enemies)
 */
async function createAudioEngine(engineCtx) {
  const AudioContextClass =
    typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  let audioCtx = null;
  try {
    if (AudioContextClass) {
      audioCtx = new AudioContextClass({ latencyHint: "interactive" });
    }
  } catch {
    audioCtx = null;
  }

  if (!audioCtx) {
    console.warn("[audio] WebAudio API unavailable — running in silent mode");
    return createSilentAudioEngine();
  }

  return setupAudioGraph(engineCtx, audioCtx, null);
}

// ============================================================================
// 七、 Web Audio 节点路由图与运行时驱动器 (Web Audio Graph & Engine Core)
// ============================================================================

/**
 * 组装 Web Audio 图谱并挂接事件与帧循环
 */
function setupAudioGraph(engineCtx, audioCtx, preheatedCache) {
  const eventBus = engineCtx.events;
  const rand = Math.random;
  const isAudioRunning = () => (preheatedCache ? true : audioCtx.state === "running");

  // 音频缓冲区与回调缓存表
  const bufferCache = preheatedCache ? preheatedCache.bufs : new Map();
  const readyCallbacks = new Map();
  let synthesisElapsedMs = 0;
  let bakedBufferCount = 0;
  let bootTimeMs = 0;

  /**
   * 将多声道 Float32 数据注册进 Web Audio Buffer
   */
  function registerAudioBuffer(key, pkg) {
    const audioBuf = audioCtx.createBuffer(pkg.ch.length, pkg.ch[0].length, pkg.sr);
    for (let c = 0; c < pkg.ch.length; c++) {
      audioBuf.getChannelData(c).set(pkg.ch[c]);
    }
    bufferCache.set(key, audioBuf);
    bakedBufferCount++;

    const callbacks = readyCallbacks.get(key);
    if (callbacks) {
      readyCallbacks.delete(key);
      for (const cb of callbacks) {
        try {
          cb(audioBuf);
        } catch (err) {
          console.error("[audio] ready callback threw", err);
        }
      }
    }
    return audioBuf;
  }

  const getTargetSampleRate = (name) => (SOUND_REGISTRY[name].ir ? audioCtx.sampleRate : undefined);

  function bakeBufferImmediate(name, variant) {
    const t0 = performance.now();
    const pkg = bakeSoundSync(name, variant, getTargetSampleRate(name));
    const buf = registerAudioBuffer(name + "#" + variant, pkg);
    synthesisElapsedMs += performance.now() - t0;
    return buf;
  }

  // 1. 初始化预生成任务队列
  const compileQueue = [];
  const registeredNames = new Set();

  for (const name of [...BOOT_QUEUE_ORDER, ...Object.keys(SOUND_REGISTRY)]) {
    const def = SOUND_REGISTRY[name];
    if (!def || registeredNames.has(name)) continue;
    registeredNames.add(name);
    for (let v = 0; v < def.n; v++) {
      const key = name + "#" + v;
      if (!bufferCache.has(key)) {
        if (def.boot) {
          bakeBufferImmediate(name, v);
        } else {
          compileQueue.push({ name, v, k: key, steps: null });
        }
      }
    }
  }

  bootTimeMs = synthesisElapsedMs;

  let resolveReadyPromise = () => {};
  const readyPromise = new Promise((resolve) => {
    resolveReadyPromise = () => resolve(undefined);
  });

  /**
   * 分片调度逐帧编译剩余音频资产 (Background Time-Sliced Audio Baker)
   */
  function processCompileQueue() {
    const tStart = performance.now();
    while (compileQueue.length) {
      const task = compileQueue[0];
      if (bufferCache.has(task.k)) {
        compileQueue.shift();
        continue;
      }
      if (!task.steps) {
        task.steps = createSoundStepper(task.name, task.v, getTargetSampleRate(task.name));
      }

      let pkg = null;
      try {
        pkg = task.steps.step();
      } catch (err) {
        console.error("[audio] synthesis failed for " + task.k, err);
        compileQueue.shift();
        continue;
      }

      if (pkg) {
        registerAudioBuffer(task.k, pkg);
        compileQueue.shift();
        checkMusicLayerStartup(task.name);
      }

      if (performance.now() - tStart > 6) break; // 每帧切片执行不超过 6ms
    }

    synthesisElapsedMs += performance.now() - tStart;
    if (compileQueue.length) {
      setTimeout(processCompileQueue, 12);
    } else if (resolveReadyPromise) {
      resolveReadyPromise();
    }
  }

  if (preheatedCache) {
    if (resolveReadyPromise) resolveReadyPromise();
  } else {
    setTimeout(processCompileQueue, 120);
  }

  function requestBufferAsync(name, variant, onReady) {
    const key = name + "#" + variant;
    const existing = bufferCache.get(key);
    if (existing) {
      onReady(existing);
      return;
    }
    if (!readyCallbacks.has(key)) readyCallbacks.set(key, []);
    readyCallbacks.get(key).push(onReady);

    const taskIdx = compileQueue.findIndex((item) => item.k === key);
    if (taskIdx > 0 && !compileQueue[taskIdx].steps) {
      const [promoted] = compileQueue.splice(taskIdx, 1);
      compileQueue.splice(compileQueue[0] && compileQueue[0].steps ? 1 : 0, 0, promoted);
    }
  }

  // 2. 音频母带管线与母线路由 (Master Bus Architecture)
  const makeGain = (val) => {
    const node = audioCtx.createGain();
    node.gain.value = val;
    return node;
  };

  const preMasterGain = makeGain(1.0);
  const masterCompressor = audioCtx.createDynamicsCompressor();
  masterCompressor.threshold.value = -10;
  masterCompressor.knee.value = 6;
  masterCompressor.ratio.value = 6;
  masterCompressor.attack.value = 0.002;
  masterCompressor.release.value = 0.14;

  const saturationDriveGain = makeGain(0.45);
  const masterWaveShaper = audioCtx.createWaveShaper();

  // 双曲正切柔和模拟限幅曲线 (Warm Analog Soft-Clipping Saturation)
  {
    const curve = new Float32Array(2049);
    for (let i = 0; i < 2049; i++) {
      const x = ((i / 2048) * 2 - 1) * 2;
      const absX = Math.abs(x);
      curve[i] = Math.sign(x) * (absX <= 0.6 ? absX : 0.6 + 0.4 * Math.tanh((absX - 0.6) / 0.4));
    }
    masterWaveShaper.curve = curve;
    try {
      masterWaveShaper.oversample = "2x";
    } catch {}
  }

  const masterGain = makeGain(0.9);

  // 母带链路连接: preMaster -> Compressor -> Saturation -> WaveShaper -> MasterGain -> Destination
  preMasterGain.connect(masterCompressor);
  masterCompressor.connect(saturationDriveGain);
  saturationDriveGain.connect(masterWaveShaper);
  masterWaveShaper.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  // 受伤/耳鸣闷音低通滤波器 (Muffled Hearing Lowpass on Damage)
  const muffledLowpass = audioCtx.createBiquadFilter();
  muffledLowpass.type = "lowpass";
  muffledLowpass.frequency.value = 20000;
  muffledLowpass.Q.value = 0.5;

  const muffledPostGain = makeGain(1.0);
  muffledLowpass.connect(muffledPostGain);
  muffledPostGain.connect(preMasterGain);

  // 子总线 (Sub-buses)
  const buses = {
    world: makeGain(1.0),
    near: makeGain(0.95),
    amb: makeGain(0.55),
    dry: makeGain(1.0),
    music: makeGain(0.62),
  };

  buses.world.connect(muffledLowpass);
  buses.near.connect(muffledLowpass);
  buses.amb.connect(muffledLowpass);
  buses.dry.connect(preMasterGain);

  const musicDuckingGain = makeGain(1.0);
  buses.music.connect(musicDuckingGain);
  musicDuckingGain.connect(preMasterGain);

  // 空间混响卷积器 (Convolution Reverb Nodes)
  const reverbBus = makeGain(1.0);
  const outdoorReverbSendGain = makeGain(1.0);
  const indoorReverbSendGain = makeGain(0.0);

  const outdoorConvolver = audioCtx.createConvolver();
  const indoorConvolver = audioCtx.createConvolver();
  const outdoorReverbReturnGain = makeGain(0.75);
  const indoorReverbReturnGain = makeGain(0.95);

  const worldReverbSend = makeGain(0.9);
  const nearReverbSend = makeGain(0.32);
  const musicReverbSend = makeGain(0.2);

  buses.world.connect(worldReverbSend);
  worldReverbSend.connect(reverbBus);
  buses.near.connect(nearReverbSend);
  nearReverbSend.connect(reverbBus);

  reverbBus.connect(outdoorReverbSendGain);
  reverbBus.connect(indoorReverbSendGain);

  outdoorReverbSendGain.connect(outdoorConvolver);
  indoorReverbSendGain.connect(indoorConvolver);

  outdoorConvolver.connect(outdoorReverbReturnGain);
  indoorConvolver.connect(indoorReverbReturnGain);

  outdoorReverbReturnGain.connect(muffledLowpass);
  indoorReverbReturnGain.connect(muffledLowpass);

  buses.music.connect(musicReverbSend);
  musicReverbSend.connect(indoorConvolver);

  requestBufferAsync("ir_outdoor", 0, (buf) => {
    outdoorConvolver.buffer = buf;
  });
  requestBufferAsync("ir_shed", 0, (buf) => {
    indoorConvolver.buffer = buf;
  });

  // 3. 3D 声道定位与声道池 (Spatial 3D Voice Pooling)
  function setPannerPosition(panner, x, y, z) {
    if (panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      panner.setPosition(x, y, z);
    }
  }

  function create3DPanner(useHrtf) {
    const panner = audioCtx.createPanner();
    panner.panningModel = useHrtf ? "HRTF" : "equalpower";
    panner.distanceModel = "inverse";
    panner.refDistance = 3.0;
    panner.rolloffFactor = 0.6;
    panner.maxDistance = 400.0;
    panner.coneInnerAngle = 360.0;
    return panner;
  }

  const voicePools = {
    world: [],
    near: [],
    dry: [],
    music: [],
  };

  function allocateVoice(busName, hasPanner) {
    const voice = {
      g: makeGain(0),
      pan: null,
      src: null,
      end: 0,
      start: 0,
      name: "",
      pri: 0,
    };
    if (hasPanner) {
      voice.pan = create3DPanner(false);
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

  // 4. 状态机与物理位置跟踪 (State Machine & Position Tracking)
  const listenerPos = { x: 0, y: 1.7, z: 0 };
  let isResumed = false;
  let isPaused = false;
  let userVolume = 0.9;
  let gameState = (engineCtx.game && engineCtx.game.state) || "title";

  let targetInteriorFactor = 0; // 0: 室外开阔码头, 1: 室内集装箱仓库
  let currentInteriorFactor = 0;
  let manualIntensity = 0;
  let combatIntensityAccumulator = 0;
  let currentMusicIntensity = 0;
  let muffledHearingFactor = 0;

  let musicDuckingTarget = 1.0;
  let masterMuffleGain = 1.0;
  let ambientMasterGain = 0.0;

  let lastGunshotTime = -9;
  let lastReverbTailTime = -9;
  let rifleVariantCycler = 0;
  let lastImpactTime = -9;
  let lastWhizTime = -9;
  let lastBounceTime = -9;
  let lastAlertTime = -9;
  let lastCompleteMusicTime = -9;

  const variantCounters = {};
  const audioManager = { autoIntensity: true };

  /**
   * 查找空闲或可抢占的声音通道 (Voice Stealing Algorithm)
   */
  function findAvailableVoice(pool, sfxName, sfxDef, now) {
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
   * 触发播放单发音效 (Play One-Shot SFX)
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

    if (is3D) {
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

  // 5. 循环音效系统 (Audio Loops)
  const activeLoops = new Set();
  const trackedNpcLoops = new Set();
  const dummyNoop = () => {};
  let isNpcTrackingActive = false;
  const dummyLoopHandle = {
    setPos: dummyNoop,
    setGain: dummyNoop,
    setPitch: dummyNoop,
    stop: dummyNoop,
    alive: false,
  };

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
      src: null,
      g: makeGain(0),
      pan: null,
      rate: options.fade || 6.0,
    };

    let targetInputNode = handle.g;
    if (options.pos) {
      handle.pan = create3DPanner(!!options.hrtf);
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
      if (!isNpcTrackingActive) {
        isNpcTrackingActive = true;
        for (const enemy of [...trackedEnemies.keys()]) removeTrackedEnemy(enemy);
      }
    }
    return handle;
  }

  // 6. 5 轨自适应交战音乐系统 (5 Adaptive Music Layers)
  const musicSystem = { on: false, layers: {} };

  function checkMusicLayerStartup(justBakedName) {
    if (SOUND_REGISTRY[justBakedName] && SOUND_REGISTRY[justBakedName].music) {
      startMusicLayersIfReady();
    }
  }

  function startMusicLayersIfReady() {
    if (musicSystem.on || !isAudioRunning()) return;
    for (const key of MUSIC_LAYER_KEYS) {
      if (!bufferCache.has(key + "#0")) return;
    }

    const tStart = audioCtx.currentTime + 0.08;
    for (const key of MUSIC_LAYER_KEYS) {
      const layerGain = makeGain(0);
      const src = audioCtx.createBufferSource();
      src.buffer = bufferCache.get(key + "#0");
      src.loop = true;
      src.connect(layerGain);
      layerGain.connect(buses.music);
      src.start(tStart);
      musicSystem.layers[key] = { g: layerGain, s: src, c: 0 };
    }
    musicSystem.on = true;
    musicSystem.t0 = tStart;
  }

  /**
   * 根据当前交战强度 (0.0 ~ 1.0) 计算 5 条音乐轨道的动态增益
   */
  function calcMusicLayerGains(intensity) {
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

  const ambientSpurTimers = {
    fog: 14 + rand() * 14,
    gull: 5 + rand() * 8,
    hal: 4 + rand() * 6,
    bang: 20 + rand() * 25,
  };

  /**
   * 泊区港湾偶发远景环境音 (港口远洋号角、海鸥盘旋、缆绳碰擦、集装箱轰鸣)
   */
  function updateAmbientStings(dt, masterScale) {
    const outdoorDamp = 1 - 0.7 * currentInteriorFactor;

    if ((ambientSpurTimers.fog -= dt) <= 0) {
      ambientSpurTimers.fog = 40 + rand() * 30;
      const zOffset = listenerPos.z + (rand() * 2 - 1) * 250;
      playSound("foghorn", {
        pos: [listenerPos.x + 320, 8, zOffset],
        ref: 400,
        gain: 0.34 * masterScale * outdoorDamp,
        pitch: rand() < 0.3 ? 0.89 : 1.0,
        jitter: 0.01,
      });
    }

    if ((ambientSpurTimers.gull -= dt) <= 0) {
      ambientSpurTimers.gull = 9 + rand() * 16;
      const angle = rand() * TWO_PI;
      const dist = 35 + rand() * 50;
      playSound("gull_cry", {
        pos: [
          listenerPos.x + Math.cos(angle) * dist,
          14 + rand() * 18,
          listenerPos.z + Math.sin(angle) * dist,
        ],
        ref: dist,
        roll: 1.0,
        gain: (0.16 + rand() * 0.16) * masterScale * outdoorDamp,
        jitter: 0.1,
      });
    }

    if ((ambientSpurTimers.hal -= dt) <= 0) {
      ambientSpurTimers.hal = 6 + rand() * 11;
      playSound("halyard", {
        pos: [29 + rand() * 8, 3 + rand() * 6, -8 + rand() * 32],
        ref: 16,
        roll: 0.5,
        gain: (0.3 + rand() * 0.3) * masterScale * outdoorDamp,
        jitter: 0.08,
      });
    }

    if ((ambientSpurTimers.bang -= dt) <= 0) {
      ambientSpurTimers.bang = 28 + rand() * 34;
      const angle = 1.6 + rand() * 3.2;
      playSound("container_bang", {
        pos: [listenerPos.x + Math.cos(angle) * 150, 4, listenerPos.z + Math.sin(angle) * 150],
        ref: 150,
        gain: (0.2 + rand() * 0.16) * masterScale * outdoorDamp,
        jitter: 0.12,
      });
    }
  }

  // 7. 敌对单位距离优先近场音效跟踪 (NPC Audio Tracker)
  const trackedEnemies = new Map();
  let npcSortTimer = 0;

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

  // 8. 目标中继发射塔电磁回路声 (Relay Station Objective Audio)
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

  const formatVector = (vec) => (vec && typeof vec.x === "number" ? vec : null);

  function triggerGunshotReverbTail(gainScale) {
    const occl = currentInteriorFactor;
    if (occl < 0.95) playSound("rifle_tail_out", { gain: gainScale * (1 - occl), jitter: 0.03 });
    if (occl > 0.05) playSound("rifle_tail_in", { gain: gainScale * occl, jitter: 0.03 });
    lastReverbTailTime = audioCtx.currentTime;
  }

  // 9. 事件总线绑定 (Event Listeners)
  const on = (evtName, handler) => {
    if (eventBus && eventBus.on) {
      eventBus.on(evtName, (payload) => {
        try {
          handler(payload || {});
        } catch (err) {
          console.error("[audio] event " + evtName, err);
        }
      });
    }
  };

  on("weapon:fire", () => {
    rifleVariantCycler = (rifleVariantCycler + 1) & 3;
    playSound("rifle_shot", { variant: rifleVariantCycler, gain: 1.0, jitter: 0.012 });

    const now = audioCtx.currentTime;
    lastGunshotTime = now;
    if (now - lastReverbTailTime > 0.28) triggerGunshotReverbTail(1.0);

    musicDuckingTarget = Math.min(musicDuckingTarget, 0.55);
    if (combatIntensityAccumulator > 0.3) {
      combatIntensityAccumulator = Math.min(1.0, combatIntensityAccumulator + 0.015);
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
    if (now - lastBounceTime < 0.04) return;
    lastBounceTime = now;
    if (payload.surface === "water") {
      playSound("impact_water", { pos: formatVector(payload.pos), gain: 0.25, pitch: 1.7 });
    } else {
      playSound("shell_bounce", {
        pos: formatVector(payload.pos),
        gain: payload.surface === "metal" ? 1.0 : 0.8,
        pitch: payload.surface === "metal" ? 1.12 : 1.0,
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
    muffledHearingFactor = Math.min(1.0, muffledHearingFactor + 0.4 + dmg * 0.015);
    combatIntensityAccumulator = Math.min(1.0, combatIntensityAccumulator + 0.35);
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
    combatIntensityAccumulator = Math.min(1.0, combatIntensityAccumulator + 0.3);
  });

  on("enemy:fire", (payload) => {
    const type = payload.type || (payload.enemy && payload.enemy.type);
    const pos = formatVector(payload.pos) || (payload.enemy && formatVector(payload.enemy.pos));
    playSound(type === "hound" ? "hound_fire" : "gull_fire", { pos });
    combatIntensityAccumulator = Math.min(1.0, combatIntensityAccumulator + 0.08);
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
    if (enemy) removeTrackedEnemy(enemy);
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
      muffledHearingFactor = Math.max(
        muffledHearingFactor,
        clampNumber(1 - (dist - 5) / 10, 0, 0.95),
      );
      if (dist < 18) playSound("ear_ring", { gain: clampNumber(1 - dist / 18, 0.2, 0.75) });
    }
    combatIntensityAccumulator = Math.min(1.0, combatIntensityAccumulator + 0.45);
  });

  on("objective:done", (payload) => {
    handleRelayHacked(payload);
    playSound("objective", { gain: 1.0, jitter: 0 });
    manualIntensity = 0.15;
  });

  on("objective:all_done", () => {
    playSound("objective_all", { gain: 1.0, jitter: 0 });
    manualIntensity = 0.8;
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
    const prevState = gameState;
    gameState = payload.state || gameState;
    if (gameState === "playing" && prevState !== "paused") {
      combatIntensityAccumulator = 0;
      muffledHearingFactor = 0;
      resetRelayAudioNodes();
      for (const key of Object.keys(envLoops)) envLoops[key].setGain(1);
    }
    if (gameState === "title") {
      resetRelayAudioNodes();
      manualIntensity = 0;
    }
  });

  // 10. 浏览器用户手势音频上下文恢复 (Resume on User Gesture)
  function resumeAudio() {
    isResumed = true;
    if (audioCtx.state !== "running" && audioCtx.state !== "closed") {
      try {
        const p = audioCtx.resume();
        if (p && p.catch) p.catch(() => {});
      } catch {}
    }
  }

  if (typeof window !== "undefined" && !preheatedCache) {
    const unlockHandler = () => {
      resumeAudio();
      if (isAudioRunning()) {
        for (const evt of ["pointerdown", "keydown", "touchend", "mousedown"]) {
          window.removeEventListener(evt, unlockHandler);
        }
      }
    };
    for (const evt of ["pointerdown", "keydown", "touchend", "mousedown"]) {
      window.addEventListener(evt, unlockHandler, { passive: true });
    }
  }

  // 11. 帧更新驱动 (Frame Update Loop)
  function update(dt) {
    dt = Math.min(Math.max(+dt || 0, 0), 0.25);
    const camera = engineCtx.camera;
    const listener = audioCtx.listener;

    // 1. 更新 3D 摄像机听者矩阵与方位
    if (camera && camera.matrixWorld) {
      const mat = camera.matrixWorld.elements;
      listenerPos.x = mat[12];
      listenerPos.y = mat[13];
      listenerPos.z = mat[14];

      if (Number.isFinite(listenerPos.x + listenerPos.y + listenerPos.z)) {
        if (listener.positionX) {
          listener.positionX.value = listenerPos.x;
          listener.positionY.value = listenerPos.y;
          listener.positionZ.value = listenerPos.z;
          listener.forwardX.value = -mat[8];
          listener.forwardY.value = -mat[9];
          listener.forwardZ.value = -mat[10];
          listener.upX.value = mat[4];
          listener.upY.value = mat[5];
          listener.upZ.value = mat[6];
        } else {
          listener.setPosition(listenerPos.x, listenerPos.y, listenerPos.z);
          listener.setOrientation(-mat[8], -mat[9], -mat[10], mat[4], mat[5], mat[6]);
        }
      }
    }

    // 2. 检测玩家是否位于室内集装箱仓库 (Interior Occlusion Detection)
    const interiorBoxes = engineCtx.level && engineCtx.level.interiorBoxes;
    if (Array.isArray(interiorBoxes) && interiorBoxes.length) {
      let isInside = 0;
      for (let i = 0; i < interiorBoxes.length; i++) {
        const box = interiorBoxes[i];
        if (
          box &&
          box.min &&
          box.max &&
          listenerPos.x > box.min.x &&
          listenerPos.x < box.max.x &&
          listenerPos.y > box.min.y - 0.5 &&
          listenerPos.y < box.max.y &&
          listenerPos.z > box.min.z &&
          listenerPos.z < box.max.z
        ) {
          isInside = 1;
          break;
        }
      }
      targetInteriorFactor = isInside;
    }

    const dampExp = (lambda) => 1 - Math.exp(-dt * lambda);

    // 3. 室内外混响与音景平滑衰减
    currentInteriorFactor += (targetInteriorFactor - currentInteriorFactor) * dampExp(3.0);
    outdoorReverbSendGain.gain.value = 1.0 - 0.9 * currentInteriorFactor;
    indoorReverbSendGain.gain.value = currentInteriorFactor;

    if (!isAudioRunning()) return;

    startMusicLayersIfReady();

    const now = audioCtx.currentTime;
    if (lastGunshotTime > lastReverbTailTime + 0.02 && now - lastGunshotTime > 0.1) {
      triggerGunshotReverbTail(0.9);
    }

    const isActiveGameplay = gameState === "playing" || gameState === "intro";
    ambientMasterGain +=
      ((isPaused ? 0 : gameState === "title" ? 0.6 : gameState === "dead" ? 0.7 : 1.0) -
        ambientMasterGain) *
      dampExp(1.2);

    masterMuffleGain += ((isPaused ? 0 : 1.0) - masterMuffleGain) * dampExp(12.0);
    muffledPostGain.gain.value = masterMuffleGain;

    // 4. 受击耳鸣闷音低通滤波频率动态响应 (20000Hz -> 600Hz)
    muffledHearingFactor +=
      ((gameState === "dead" ? 0.85 : 0) - muffledHearingFactor) *
      dampExp(gameState === "dead" ? 3.0 : 0.9);
    muffledLowpass.frequency.value =
      20000 * Math.pow(0.03, clampNumber(muffledHearingFactor, 0, 1));
    masterGain.gain.value = userVolume;

    // 5. 风力循环周期性突风调制 (Wind Gust Cycles)
    if ((windTimer -= dt) <= 0) {
      windTimer = 3.0 + rand() * 6.0;
      windGustTarget = 0.12 + rand() * 0.88;
    }
    windGustCurrent += (windGustTarget - windGustCurrent) * dampExp(0.5);

    envLoops.rain.setGain(ambientMasterGain * (1 - 0.93 * currentInteriorFactor) * 0.95);
    envLoops.rainIn.setGain(ambientMasterGain * currentInteriorFactor * 0.95);
    envLoops.wind.setGain(
      ambientMasterGain * (0.3 + 0.7 * windGustCurrent) * (1 - 0.65 * currentInteriorFactor) * 0.75,
    );
    envLoops.wind.setPitch(0.9 + 0.25 * windGustCurrent);
    envLoops.sea.setGain(ambientMasterGain * (1 - 0.5 * currentInteriorFactor) * 1.0);
    envLoops.sea.setPos([33, -1, clampNumber(listenerPos.z, -28, 26)]);

    if (!isPaused && (isActiveGameplay || gameState === "title" || gameState === "complete")) {
      updateAmbientStings(dt, gameState === "title" ? 0.7 : 1.0);
    }
    if (!isPaused) updateNpcAudioTracking(dt);

    // 6. 交战强度自适应与音乐分轨渐变 (Combat Intensity Layer Fading)
    combatIntensityAccumulator = Math.max(
      0,
      combatIntensityAccumulator - dt * (trackedEnemies.size ? 0.045 : 0.14),
    );
    const targetIntensity =
      isActiveGameplay || isPaused
        ? Math.max(
            manualIntensity,
            audioManager.autoIntensity ? Math.max(0.15, combatIntensityAccumulator) : 0,
          )
        : 0;

    currentMusicIntensity += (targetIntensity - currentMusicIntensity) * dampExp(2.0);
    musicDuckingTarget += (1.0 - musicDuckingTarget) * dampExp(3.5);
    musicDuckingGain.gain.value = musicDuckingTarget * (isPaused ? 0.45 : 1.0);

    if (musicSystem.on) {
      const targetGains = calcMusicLayerGains(currentMusicIntensity);
      const fadeRate = dampExp(1 / 0.5);
      for (let i = 0; i < MUSIC_LAYER_KEYS.length; i++) {
        const layer = musicSystem.layers[MUSIC_LAYER_KEYS[i]];
        layer.c += (targetGains[i] - layer.c) * fadeRate;
        layer.g.gain.value = layer.c;
      }
    }

    // 7. 活跃 Loop 实例音量与音高平滑
    for (const loopItem of activeLoops) {
      loopItem.vC += (loopItem.vT - loopItem.vC) * dampExp(4.0);
      loopItem.gC += (loopItem.gT * loopItem.vC - loopItem.gC) * dampExp(loopItem.rate);
      loopItem.g.gain.value = loopItem.gC;
      if (loopItem.src && Math.abs(loopItem.pT - loopItem.pC) > 1e-4) {
        loopItem.pC += (loopItem.pT - loopItem.pC) * dampExp(8.0);
        loopItem.src.playbackRate.value = loopItem.pC;
      }
    }
  }

  // 12. 离线音频渲染自测 (OfflineAudioContext Automated Regression Test)
  async function runSelfTest(testOptions = {}) {
    await readyPromise;
    const sampleRate = audioCtx.sampleRate;
    const duration = testOptions.seconds || 10;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

    const testEventMap = new Map();
    const testEvents = {
      on(name, cb) {
        if (!testEventMap.has(name)) testEventMap.set(name, []);
        testEventMap.get(name).push(cb);
      },
      emit(name, payload) {
        for (const cb of testEventMap.get(name) || []) cb(payload);
      },
    };

    const mockCamMat = new Float32Array(16);
    mockCamMat[0] = mockCamMat[5] = mockCamMat[10] = mockCamMat[15] = 1;
    mockCamMat[13] = 1.7;

    const mockEnemies = [
      { type: "gull", alive: true, pos: { x: 6, y: 4, z: -9 } },
      { type: "hound", alive: true, pos: { x: -8, y: 0, z: -14 } },
      { type: "gull", alive: true, pos: { x: 0, y: 5, z: -30 } },
    ];

    const mockInteriorBox = { min: { x: -99, y: -9, z: -99 }, max: { x: 99, y: 99, z: 99 } };

    const mockEngineContext = {
      events: testEvents,
      params: {},
      camera: { matrixWorld: { elements: mockCamMat } },
      enemies: { list: [] },
      level: {
        interiorBoxes: testOptions.interior
          ? [mockInteriorBox]
          : [{ min: { x: 500, y: 0, z: 500 }, max: { x: 501, y: 1, z: 501 } }],
        objectives: [{ id: "A", pos: { x: 4, y: 0, z: 3 } }],
      },
    };

    const testAudioEngine = setupAudioGraph(mockEngineContext, offlineCtx, { bufs: bufferCache });
    const stepDt = 0.02;
    let stepCount = 0;

    const triggerSimulatedEvents = (step) => {
      const t = step * stepDt;
      if (step === 0) testEvents.emit("game:state", { state: "playing" });
      if (t < 3.0 && step % 23 === 0)
        testEvents.emit("player:step", { surface: "concrete", sprint: false });

      if (step === 150) {
        for (const e of mockEnemies) {
          mockEngineContext.enemies.list.push(e);
          testEvents.emit("enemy:spawn", { enemy: e });
        }
        testEvents.emit("enemy:alert", { enemy: mockEnemies[0] });
        testAudioEngine.setIntensity(1.0);
      }

      if (t >= 3.0 && t < 6.0) {
        if (step % 4 === 0 && (t < 4.2 || t > 4.8)) {
          testEvents.emit("weapon:fire", {});
          testEvents.emit("impact", {
            point: { x: 4, y: 1, z: -12 },
            surface: step % 8 ? "metal" : "concrete",
            from: "player",
          });
          testEvents.emit("shell:bounce", { pos: { x: 0.6, y: 0, z: 0.2 }, surface: "concrete" });
        }
        if (step % 13 === 0)
          testEvents.emit("enemy:fire", {
            enemy: mockEnemies[0],
            pos: mockEnemies[0].pos,
            type: "gull",
          });
        if (step % 17 === 0)
          testEvents.emit("enemy:fire", {
            enemy: mockEnemies[1],
            pos: mockEnemies[1].pos,
            type: "hound",
          });
        if (step % 25 === 0)
          testEvents.emit("enemy:step", { pos: mockEnemies[1].pos, type: "hound" });
      }

      if (step === 300) testEvents.emit("explosion", { pos: { x: 3, y: 0, z: -5 }, size: 1.5 });
      if (step === 350) testEvents.emit("player:hit", { amount: 20 });
      if (step === 360) {
        mockEnemies[0].alive = false;
        testEvents.emit("enemy:killed", {
          enemy: mockEnemies[0],
          pos: mockEnemies[0].pos,
          type: "gull",
        });
      }
      if (step === 400) {
        testEvents.emit("objective:done", { id: "A", index: 0, total: 3 });
        testAudioEngine.setIntensity(0.15);
      }
    };

    for (let s = 1; s * stepDt < duration - 0.01; s++) {
      offlineCtx.suspend(s * stepDt).then(() => {
        triggerSimulatedEvents(s);
        testAudioEngine.update(stepDt);
        stepCount++;
        offlineCtx.resume();
      });
    }

    triggerSimulatedEvents(0);
    testAudioEngine.update(stepDt);

    const tRenderStart = performance.now();
    const renderedBuffer = await offlineCtx.startRendering();
    const renderTimeMs = performance.now() - tRenderStart;

    const testReport = {
      interior: !!testOptions.interior,
      renderMs: Math.round(renderTimeMs),
      steps: stepCount,
      peak: 0,
      over: 0,
      nan: 0,
      rmsDb: [],
      inst: testAudioEngine.debug(),
    };

    const leftData = renderedBuffer.getChannelData(0);
    const rightData = renderedBuffer.getChannelData(1);
    const sliceLen = Math.round(sampleRate / 2);

    for (let s = 0; s * sliceLen < leftData.length; s++) {
      let energy = 0;
      for (let i = s * sliceLen; i < (s + 1) * sliceLen && i < leftData.length; i++) {
        const l = leftData[i];
        const r = rightData[i];
        if (!(Math.abs(l) < 1e9) || !(Math.abs(r) < 1e9)) testReport.nan++;
        const maxAmp = Math.max(Math.abs(l), Math.abs(r));
        if (maxAmp > testReport.peak) testReport.peak = maxAmp;
        if (maxAmp >= 0.999) testReport.over++;
        energy += l * l + r * r;
      }
      testReport.rmsDb.push(+(10 * Math.log10(energy / (2 * sliceLen) + 1e-12)).toFixed(1));
    }

    testReport.peak = +testReport.peak.toFixed(3);
    return testReport;
  }

  // 13. 返回统一标准化引擎对外接口
  return Object.assign(audioManager, {
    ctx: audioCtx,
    resume: resumeAudio,
    play: playSound,
    loop: createLoop,
    update,
    ready: readyPromise,
    selfTest: runSelfTest,
    setIntensity(val) {
      manualIntensity = clampNumber(+val || 0, 0, 1);
    },
    setInterior(val) {
      targetInteriorFactor = clampNumber(+val || 0, 0, 1);
    },
    setVolume(val) {
      userVolume = clampNumber(+val, 0, 1);
      if (!Number.isFinite(userVolume)) userVolume = 0.9;
      masterGain.gain.value = userVolume;
    },
    setPaused(val) {
      isPaused = !!val;
    },
    names: Object.keys(SOUND_REGISTRY).filter((name) => !SOUND_REGISTRY[name].ir),
    get intensity() {
      return currentMusicIntensity;
    },
    get interior() {
      return currentInteriorFactor;
    },
    debug() {
      let activeVoices = 0;
      const now = audioCtx.currentTime;
      for (const poolKey in voicePools) {
        for (const v of voicePools[poolKey]) {
          if (v.end > now) activeVoices++;
        }
      }
      return {
        state: audioCtx.state,
        sampleRate: audioCtx.sampleRate,
        buffers: bakedBufferCount,
        queued: compileQueue.length,
        genMs: Math.round(synthesisElapsedMs),
        bootMs: Math.round(bootTimeMs),
        voices: activeVoices,
        loops: activeLoops.size,
        tracked: trackedEnemies.size,
        music: musicSystem.on,
        intensity: +currentMusicIntensity.toFixed(2),
        interior: +currentInteriorFactor.toFixed(2),
        gameState,
        reverb: [!!outdoorConvolver.buffer, !!indoorConvolver.buffer],
      };
    },
  });
}

// 统一导出 (ESM Exports)
export const create = createAudioEngine;
export { createAudioEngine as c_ };

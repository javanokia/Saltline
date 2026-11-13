// @ts-check
/**
 * @file src/audio.js
 * @description 几猫国产3A大作 (JM 3A Action Game) — 程序化纯声学合成引擎 (Web Audio DSP Engine)
 */

import { SOUND_REGISTRY } from "./audio/sounds.js";
import {
  BOOT_QUEUE_ORDER,
  MUSIC_LAYER_KEYS,
  bakeSoundSync,
  createSoundStepper,
  clampNumber,
} from "./audio/baker.js";
import { createAudioMasterBus } from "./audio/bus.js";
import { createVoicePools, createSoundPlayer } from "./audio/spatial.js";
import { createLoopManager, dummyLoopHandle } from "./audio/loops.js";
import { createMusicConductor } from "./audio/music_player.js";
import { createAmbientStingsManager } from "./audio/stings.js";
import { createNpcAudioTracker } from "./audio/npc_audio.js";
import { bindAudioEvents } from "./audio/events.js";

/**
 * 无音频支持环境下的静音降级桩 (Silent Audio Engine Stub)
 */
export function createSilentAudioEngine() {
  const noop = () => {};
  return {
    silent: true,
    update: noop,
    resume: noop,
    play: noop,
    loop: () => dummyLoopHandle,
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
 * 组装 Web Audio 图谱并挂接事件与帧循环
 * @param {any} engineCtx 全局引擎上下文
 * @param {AudioContext} audioCtx Web Audio 上下文
 * @param {any} [preheatedCache] 预热缓存
 */
function setupAudioGraph(engineCtx, audioCtx, preheatedCache) {
  const rand = Math.random;
  const isAudioRunning = () => (preheatedCache ? true : audioCtx.state === "running");

  // 1. 音频缓冲区与后台切片生成队列
  const bufferCache = preheatedCache ? preheatedCache.bufs : new Map();
  /** @type {Map<string, Array<(buf: AudioBuffer) => void>>} */
  const readyCallbacks = new Map();
  let synthesisElapsedMs = 0;
  let bakedBufferCount = 0;
  let bootTimeMs = 0;

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

  const getTargetSampleRate = (/** @type {string} */ name) =>
    SOUND_REGISTRY[name].ir ? audioCtx.sampleRate : undefined;

  function bakeBufferImmediate(/** @type {string} */ name, /** @type {number} */ variant) {
    const t0 = performance.now();
    const pkg = bakeSoundSync(name, variant, getTargetSampleRate(name));
    if (!pkg) return null;
    const buf = registerAudioBuffer(name + "#" + variant, pkg);
    synthesisElapsedMs += performance.now() - t0;
    return buf;
  }

  /** @type {Array<{ name: string, v: number, k: string, steps: any }>} */
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
        pkg = task.steps ? task.steps.step() : null;
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

      if (performance.now() - tStart > 6) break;
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

  function requestBufferAsync(
    /** @type {string} */ name,
    /** @type {number} */ variant,
    /** @type {(buf: AudioBuffer) => void} */ onReady,
  ) {
    const key = name + "#" + variant;
    const existing = bufferCache.get(key);
    if (existing) {
      onReady(existing);
      return;
    }
    if (!readyCallbacks.has(key)) readyCallbacks.set(key, []);
    const queue = readyCallbacks.get(key);
    if (queue) queue.push(onReady);

    const taskIdx = compileQueue.findIndex((item) => item.k === key);
    if (taskIdx > 0 && !compileQueue[taskIdx].steps) {
      const [promoted] = compileQueue.splice(taskIdx, 1);
      compileQueue.splice(compileQueue[0] && compileQueue[0].steps ? 1 : 0, 0, promoted);
    }
  }

  // 2. 母带链路与子总线系统
  const busNodes = createAudioMasterBus(audioCtx, requestBufferAsync);
  const {
    masterGain,
    muffledLowpass,
    muffledPostGain,
    buses,
    musicDuckingGain,
    outdoorReverbSendGain,
    indoorReverbSendGain,
    outdoorConvolver,
    indoorConvolver,
  } = busNodes;

  // 3. 空间声道池与声音播放器
  const voicePools = createVoicePools(audioCtx, buses);
  const { playSound } = createSoundPlayer(
    audioCtx,
    voicePools,
    bufferCache,
    requestBufferAsync,
    bakeBufferImmediate,
    isAudioRunning,
  );

  // 4. 背景音效循环系统
  const loopManager = createLoopManager(audioCtx, buses, requestBufferAsync);
  const { createLoop, activeLoops, envLoops } = loopManager;

  // 5. 5 轨动态互动音乐总监
  const musicConductor = createMusicConductor(audioCtx, buses.music, bufferCache, isAudioRunning);
  const { musicSystem, startMusicLayersIfReady, checkMusicLayerStartup, calcMusicLayerGains } =
    musicConductor;

  // 6. 港区远景环境偶发刺音
  const { updateAmbientStings } = createAmbientStingsManager(playSound);

  // 7. 空间听者坐标与敌对/中继点音频跟踪器
  const listenerPos = { x: 0, y: 0, z: 0 };
  const npcTracker = createNpcAudioTracker({
    engineCtx,
    listenerPos,
    createLoop,
    playSound,
    rand,
  });

  // 8. 运行时动态状态
  const stateRef = {
    gameState: "title",
    combatIntensityAccumulator: 0,
    currentMusicIntensity: 0,
    manualIntensity: 0,
    musicDuckingTarget: 1.0,
    muffledHearingFactor: 0,
    masterMuffleGain: 1.0,
    ambientMasterGain: 1.0,
    targetInteriorFactor: 0,
    currentInteriorFactor: 0,
    userVolume: 0.9,
    isPaused: false,
    isResumed: false,
    windTimer: 2.0,
    windGustCurrent: 0.4,
    windGustTarget: 0.4,
    lastGunshotTime: 0,
    lastReverbTailTime: 0,
  };

  const audioManager = {
    autoIntensity: true,
  };

  function triggerGunshotReverbTail(/** @type {number} */ gainScale) {
    const occl = stateRef.currentInteriorFactor;
    if (occl < 0.95) playSound("rifle_tail_out", { gain: gainScale * (1 - occl), jitter: 0.03 });
    if (occl > 0.05) playSound("rifle_tail_in", { gain: gainScale * occl, jitter: 0.03 });
    stateRef.lastReverbTailTime = audioCtx.currentTime;
  }

  // 9. 事件绑定
  bindAudioEvents({
    engineCtx,
    audioCtx,
    listenerPos,
    playSound,
    triggerGunshotReverbTail,
    npcTracker,
    envLoops,
    rand,
    stateRef,
  });

  // 10. 用户手势解锁
  function resumeAudio() {
    stateRef.isResumed = true;
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

  const dampExp = (/** @type {number} */ lambda, /** @type {number} */ dt) =>
    1 - Math.exp(-dt * lambda);

  // 11. 逐帧调度循环
  function update(/** @type {number} */ dt) {
    dt = Math.min(Math.max(+dt || 0, 0), 0.25);
    const camera = engineCtx.camera;
    const listener = audioCtx.listener;

    // 更新 3D 摄像机听者矩阵与方位
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
          // @ts-ignore
          listener.setPosition(listenerPos.x, listenerPos.y, listenerPos.z);
          // @ts-ignore
          listener.setOrientation(-mat[8], -mat[9], -mat[10], mat[4], mat[5], mat[6]);
        }
      }
    }

    // 室内集装箱检测
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
      stateRef.targetInteriorFactor = isInside;
    }

    // 混响平滑过渡
    stateRef.currentInteriorFactor +=
      (stateRef.targetInteriorFactor - stateRef.currentInteriorFactor) * dampExp(3.0, dt);
    outdoorReverbSendGain.gain.value = 1.0 - 0.9 * stateRef.currentInteriorFactor;
    indoorReverbSendGain.gain.value = stateRef.currentInteriorFactor;

    if (!isAudioRunning()) return;

    startMusicLayersIfReady();

    const now = audioCtx.currentTime;
    if (
      stateRef.lastGunshotTime > stateRef.lastReverbTailTime + 0.02 &&
      now - stateRef.lastGunshotTime > 0.1
    ) {
      triggerGunshotReverbTail(0.9);
    }

    const isActiveGameplay = stateRef.gameState === "playing" || stateRef.gameState === "intro";
    stateRef.ambientMasterGain +=
      ((stateRef.isPaused
        ? 0
        : stateRef.gameState === "title"
          ? 0.6
          : stateRef.gameState === "dead"
            ? 0.7
            : 1.0) -
        stateRef.ambientMasterGain) *
      dampExp(1.2, dt);

    stateRef.masterMuffleGain +=
      ((stateRef.isPaused ? 0 : 1.0) - stateRef.masterMuffleGain) * dampExp(12.0, dt);
    muffledPostGain.gain.value = stateRef.masterMuffleGain;

    // 低通滤波响应
    stateRef.muffledHearingFactor +=
      ((stateRef.gameState === "dead" ? 0.85 : 0) - stateRef.muffledHearingFactor) *
      dampExp(stateRef.gameState === "dead" ? 3.0 : 0.9, dt);
    muffledLowpass.frequency.value =
      20000 * Math.pow(0.03, clampNumber(stateRef.muffledHearingFactor, 0, 1));
    masterGain.gain.value = stateRef.userVolume;

    // 风力突风调制
    if ((stateRef.windTimer -= dt) <= 0) {
      stateRef.windTimer = 3.0 + rand() * 6.0;
      stateRef.windGustTarget = 0.12 + rand() * 0.88;
    }
    stateRef.windGustCurrent +=
      (stateRef.windGustTarget - stateRef.windGustCurrent) * dampExp(0.5, dt);

    envLoops.rain.setGain(
      stateRef.ambientMasterGain * (1 - 0.93 * stateRef.currentInteriorFactor) * 0.95,
    );
    envLoops.rainIn.setGain(stateRef.ambientMasterGain * stateRef.currentInteriorFactor * 0.95);
    envLoops.wind.setGain(
      stateRef.ambientMasterGain *
        (0.3 + 0.7 * stateRef.windGustCurrent) *
        (1 - 0.65 * stateRef.currentInteriorFactor) *
        0.75,
    );
    envLoops.wind.setPitch(0.9 + 0.25 * stateRef.windGustCurrent);
    envLoops.sea.setGain(
      stateRef.ambientMasterGain * (1 - 0.5 * stateRef.currentInteriorFactor) * 1.0,
    );
    envLoops.sea.setPos([33, -1, clampNumber(listenerPos.z, -28, 26)]);

    if (
      !stateRef.isPaused &&
      (isActiveGameplay || stateRef.gameState === "title" || stateRef.gameState === "complete")
    ) {
      updateAmbientStings(
        dt,
        stateRef.gameState === "title" ? 0.7 : 1.0,
        stateRef.currentInteriorFactor,
        listenerPos,
      );
    }
    if (!stateRef.isPaused) npcTracker.updateNpcAudioTracking(dt);

    // 交战强度与音乐层过渡
    stateRef.combatIntensityAccumulator = Math.max(
      0,
      stateRef.combatIntensityAccumulator - dt * (npcTracker.trackedEnemies.size ? 0.045 : 0.14),
    );
    const targetIntensity =
      isActiveGameplay || stateRef.isPaused
        ? Math.max(
            stateRef.manualIntensity,
            audioManager.autoIntensity ? Math.max(0.15, stateRef.combatIntensityAccumulator) : 0,
          )
        : 0;

    stateRef.currentMusicIntensity +=
      (targetIntensity - stateRef.currentMusicIntensity) * dampExp(2.0, dt);
    stateRef.musicDuckingTarget += (1.0 - stateRef.musicDuckingTarget) * dampExp(3.5, dt);
    musicDuckingGain.gain.value = stateRef.musicDuckingTarget * (stateRef.isPaused ? 0.45 : 1.0);

    if (musicSystem.on) {
      const targetGains = calcMusicLayerGains(stateRef.currentMusicIntensity, stateRef.gameState);
      const fadeRate = dampExp(1 / 0.5, dt);
      for (let i = 0; i < MUSIC_LAYER_KEYS.length; i++) {
        const layer = musicSystem.layers[MUSIC_LAYER_KEYS[i]];
        layer.c += (targetGains[i] - layer.c) * fadeRate;
        layer.g.gain.value = layer.c;
      }
    }

    // 活跃 Loop 实例音量平滑
    for (const loopItem of activeLoops) {
      loopItem.vC += (loopItem.vT - loopItem.vC) * dampExp(4.0, dt);
      loopItem.gC += (loopItem.gT * loopItem.vC - loopItem.gC) * dampExp(loopItem.rate, dt);
      loopItem.g.gain.value = loopItem.gC;
      if (loopItem.src && Math.abs(loopItem.pT - loopItem.pC) > 1e-4) {
        loopItem.pC += (loopItem.pT - loopItem.pC) * dampExp(8.0, dt);
        loopItem.src.playbackRate.value = loopItem.pC;
      }
    }
  }

  // 12. 离线音频渲染自测
  async function runSelfTest(testOptions = {}) {
    await readyPromise;
    const sampleRate = audioCtx.sampleRate;
    const duration = testOptions.seconds || 10;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

    /** @type {Map<string, Array<(payload: any) => void>>} */
    const testEventMap = new Map();
    const testEvents = {
      on(/** @type {string} */ name, /** @type {(payload: any) => void} */ cb) {
        if (!testEventMap.has(name)) testEventMap.set(name, []);
        const list = testEventMap.get(name);
        if (list) list.push(cb);
      },
      emit(/** @type {string} */ name, /** @type {any} */ payload) {
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
      enemies: { list: /** @type {any[]} */ ([]) },
      level: {
        interiorBoxes: testOptions.interior
          ? [mockInteriorBox]
          : [{ min: { x: 500, y: 0, z: 500 }, max: { x: 501, y: 1, z: 501 } }],
        objectives: [{ id: "A", pos: { x: 4, y: 0, z: 3 } }],
      },
    };

    const testAudioEngine = setupAudioGraph(mockEngineContext, /** @type {any} */ (offlineCtx), {
      bufs: bufferCache,
    });
    const stepDt = 0.02;
    let stepCount = 0;

    const triggerSimulatedEvents = (/** @type {number} */ step) => {
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
      rmsDb: /** @type {number[]} */ ([]),
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
    setIntensity(/** @type {number} */ val) {
      stateRef.manualIntensity = clampNumber(+val || 0, 0, 1);
    },
    setInterior(/** @type {number} */ val) {
      stateRef.targetInteriorFactor = clampNumber(+val || 0, 0, 1);
    },
    setVolume(/** @type {number} */ val) {
      stateRef.userVolume = clampNumber(+val, 0, 1);
      if (!Number.isFinite(stateRef.userVolume)) stateRef.userVolume = 0.9;
      masterGain.gain.value = stateRef.userVolume;
    },
    setPaused(/** @type {boolean} */ val) {
      stateRef.isPaused = !!val;
    },
    names: Object.keys(SOUND_REGISTRY).filter((name) => !SOUND_REGISTRY[name].ir),
    get intensity() {
      return stateRef.currentMusicIntensity;
    },
    get interior() {
      return stateRef.currentInteriorFactor;
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
        tracked: npcTracker.trackedEnemies.size,
        music: musicSystem.on,
        intensity: +stateRef.currentMusicIntensity.toFixed(2),
        interior: +stateRef.currentInteriorFactor.toFixed(2),
        gameState: stateRef.gameState,
        reverb: [!!outdoorConvolver.buffer, !!indoorConvolver.buffer],
      };
    },
  });
}

/**
 * 异步初始化几猫程序化声学合成引擎
 * @param {object} engineCtx 全局引擎上下文 (包含 events, camera, player, level, enemies)
 */
export async function createAudioEngine(engineCtx) {
  const AudioContextClass =
    typeof window !== "undefined" &&
    (window.AudioContext || /** @type {any} */ (window).webkitAudioContext);
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

// 统一导出 (ESM Exports)
export const create = createAudioEngine;
export { createAudioEngine as c_ };
export default createAudioEngine;

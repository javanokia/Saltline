import {
  TWO_PI,
  createPrng,
  hashFnv1a,
  midiToFreq,
  randomRange,
  createAudioBufferArray,
  createExpDecayEnvelope,
  createFreqSweep,
  generateWhiteNoise,
  applyEnvelope,
  applySoftSaturation,
  applyBoundaryFade,
  calcBiquadCoefficients,
  applyBiquadFilter,
  applyDynamicBiquadFilter,
  mixBuffer,
  mixBufferWrapped,
  scaleBuffer,
  getPeakAmplitude,
  sumTracks,
  crossfadeLoopBuffer,
  buildSeamlessLoop,
  synthesizeNoiseBurst,
  synthesizePitchSweepSine,
  synthesizeChirp,
  synthesizeModalBank,
  synthesizeGranularDebris,
} from "../dsp.js";

function synthesizeOutdoorReverbIR(sampleRate, rng, isStereo) {
  const buildChannel = (seedVal) => {
    const chRng = createPrng(seedVal);
    const ir = createAudioBufferArray(sampleRate, 1.55);
    const taps = isStereo
      ? [
          [0.058, 0.5, 4200],
          [0.097, 0.4, 3300],
          [0.139, 0.28, 2500],
          [0.176, 0.2, 1900],
          [0.262, 0.1, 1300],
        ]
      : [
          [0.066, 0.52, 4600],
          [0.088, 0.34, 3600],
          [0.124, 0.3, 2700],
          [0.169, 0.22, 2000],
          [0.231, 0.12, 1400],
        ];

    for (const [delay, gain, lpCutoff] of taps) {
      mixBuffer(
        ir,
        synthesizeNoiseBurst(sampleRate, chRng, 0.09, 0.016, { hp: 420, lp: lpCutoff }),
        delay + randomRange(chRng, -0.004, 0.004),
        gain * randomRange(chRng, 0.8, 1.1),
        sampleRate,
      );
    }

    const diffuseTail = generateWhiteNoise(sampleRate, 1.5, chRng);
    applyDynamicBiquadFilter(diffuseTail, "lp", createFreqSweep(3400, 380, 0.6), 0.6, sampleRate);
    applyBiquadFilter(diffuseTail, "hp", 130, 0.7, sampleRate);
    mixBuffer(
      ir,
      applyEnvelope(diffuseTail, sampleRate, createExpDecayEnvelope(0.3, 0.05)),
      0.03,
      0.55,
      sampleRate,
    );

    const subEcho = generateWhiteNoise(sampleRate, 1.2, chRng);
    applyBiquadFilter(subEcho, "lp", 150, 0.7, sampleRate);
    mixBuffer(
      ir,
      applyEnvelope(subEcho, sampleRate, createExpDecayEnvelope(0.26, 0.03)),
      0.02,
      0.9,
      sampleRate,
    );

    return ir;
  };

  const seed = Math.floor(rng() * 1e9);
  return [buildChannel(seed), buildChannel(seed + 77)];
}

const QR = synthesizeOutdoorReverbIR;

/**
 * 室内密闭集装箱仓库混响脉冲响应 (Indoor Warehouse Impulse Response Generator)
 * 运用分段生成器 (Generator) 逐级计算房间驻波模态 (Room Modes: 54Hz, 81Hz, 117Hz, 163Hz, 228Hz)
 */
function* synthesizeIndoorReverbIR(sampleRate, rng, isStereo) {
  const buildChannelGen = function* (seedVal) {
    const chRng = createPrng(seedVal);
    const ir = createAudioBufferArray(sampleRate, 2.3);
    const early = generateWhiteNoise(sampleRate, 2.25, chRng);
    applyDynamicBiquadFilter(early, "lp", createFreqSweep(2400, 260, 0.5), 0.7, sampleRate);
    mixBuffer(
      ir,
      applyEnvelope(early, sampleRate, createExpDecayEnvelope(0.42, 0.012)),
      0.008,
      0.6,
      sampleRate,
    );

    // 房间驻波谐振频率
    for (const [modeFreq, modeGain] of [
      [54, 1.0],
      [81, 0.8],
      [117, 0.6],
      [163, 0.45],
      [228, 0.3],
    ]) {
      const modeNoise = generateWhiteNoise(sampleRate, 2.2, chRng);
      applyBiquadFilter(modeNoise, "bp", modeFreq * (isStereo ? 1.06 : 1), 9, sampleRate);
      mixBuffer(
        ir,
        applyEnvelope(modeNoise, sampleRate, createExpDecayEnvelope(0.5, 0.02)),
        0.01,
        modeGain * 2.4,
        sampleRate,
      );
      yield;
    }

    const flutterInterval = isStereo ? 0.051 : 0.044;
    for (let u = 1; u < 9; u++) {
      mixBuffer(
        ir,
        synthesizeNoiseBurst(sampleRate, chRng, 0.05, 0.009, {
          hp: 500,
          lp: 3800 / (1 + u * 0.35),
        }),
        flutterInterval * u + randomRange(chRng, -0.003, 0.003),
        0.42 * Math.pow(0.74, u),
        sampleRate,
      );
    }
    return ir;
  };

  const seed = Math.floor(rng() * 1e9);
  const leftCh = yield* buildChannelGen(seed);
  const rightCh = yield* buildChannelGen(seed + 131);
  return [leftCh, rightCh];
}

const e8 = synthesizeIndoorReverbIR;

// ============================================================================
// 三、 各类单发音效与环境动力学生成器 (SFX Synthesis Routines)
// ============================================================================

/** 击针撞空 / 弹尽卡壳干击声 (Dry Fire Click) */

export { synthesizeOutdoorReverbIR, synthesizeIndoorReverbIR, QR, e8 };

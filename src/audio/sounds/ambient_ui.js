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

function* synthThunder(sampleRate, rng, isClose) {
  const buf = createAudioBufferArray(sampleRate, 6.5);
  const noise = generateWhiteNoise(sampleRate, 6.4, rng);
  yield;
  applyDynamicBiquadFilter(
    noise,
    "lp",
    createFreqSweep(isClose ? 520 : 380, 70, 0.6),
    0.7,
    sampleRate,
  );
  yield;

  const rumbleBursts = [];
  for (let i = 0; i < 9; i++) {
    rumbleBursts.push([
      randomRange(rng, 0.05, 3.6),
      randomRange(rng, 0.12, 0.5),
      randomRange(rng, 0.4, 1.0),
    ]);
  }

  for (let i = 0; i < noise.length; i++) {
    const t = i / sampleRate;
    let env = 0;
    for (const [burstTime, burstWidth, burstGain] of rumbleBursts) {
      const delta = (t - burstTime) / burstWidth;
      env += burstGain * Math.exp(-delta * delta);
    }
    noise[i] *= (0.25 + env) * Math.exp(-t / 1.9) * (1 - Math.exp(-t / 0.05));
  }
  mixBuffer(buf, noise, 0, 1.0, sampleRate);
  yield;

  const subRumble = generateWhiteNoise(sampleRate, 6.0, rng);
  applyBiquadFilter(subRumble, "bp", 48, 1.2, sampleRate);
  mixBuffer(
    buf,
    applyEnvelope(subRumble, sampleRate, createExpDecayEnvelope(2.0, 0.2)),
    0.05,
    3.0,
    sampleRate,
  );
  if (isClose)
    mixBuffer(
      buf,
      synthesizeNoiseBurst(sampleRate, rng, 0.3, 0.06, { hp: 300, lp: 2500 }),
      0.02,
      0.25,
      sampleRate,
    );
  return buf;
}
const D8 = synthThunder;

// 远洋雾笛谐波谱系数
const FOGHORN_HARMONICS = [0, 1.0, 0.435, 0.268, 0.19, 0.145, 0.116, 0.097];

/** 泊区远洋货轮低沉雾笛声 (Port Foghorn) */
function synthFoghorn(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 5.0);
  const len = buf.length;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const flutter = 0.0025 * Math.sin(TWO_PI * 4.3 * t);
    const env =
      Math.min(1, t / 0.45) *
      Math.min(1, (5 - t) / 1.5) *
      (t < 3.2 ? 1 : Math.exp(-(t - 3.2) / 0.7));
    let tone = 0;
    for (let h = 1; h <= 7; h++) {
      tone += Math.sin(TWO_PI * 92.5 * h * t * (1 + flutter) + h) * FOGHORN_HARMONICS[h];
    }
    for (let h = 1; h <= 4; h++) {
      tone += 0.45 * Math.sin(TWO_PI * 138.6 * h * t + h * 2) * FOGHORN_HARMONICS[h];
    }
    buf[i] = tone * env;
  }
  applyBiquadFilter(buf, "lp", 520, 0.7, sampleRate);
  return buf;
}
const L8 = synthFoghorn;

/** 远海海鸥盘旋啼鸣 (Harbor Seagull Cry) */
function synthGullCry(sampleRate, rng, isVariant) {
  const buf = createAudioBufferArray(sampleRate, 1.4);
  const cries = isVariant ? 3 : 4;
  let offset = 0.02;

  for (let c = 0; c < cries; c++) {
    const cryDur = randomRange(rng, 0.17, 0.26) * (isVariant ? 1.4 : 1.0);
    const crySamples = Math.round(cryDur * sampleRate);
    const startSample = Math.round(offset * sampleRate);
    const baseFreq = (isVariant ? 1250 : 1550) * (1 - c * 0.04);
    let phase = 0;

    for (let i = 0; i < crySamples && startSample + i < buf.length; i++) {
      const p = i / crySamples;
      const freq = baseFreq * (1 + 0.55 * Math.sin(Math.PI * Math.pow(p, 0.6)) - 0.25 * p);
      phase += (TWO_PI * freq) / sampleRate;
      const vibrato = 1 + 0.3 * Math.sin((TWO_PI * 63 * i) / sampleRate);
      buf[startSample + i] +=
        (Math.sin(phase) +
          0.6 * Math.sin(2 * phase + 0.5) +
          0.35 * Math.sin(3 * phase) +
          0.15 * Math.sin(4 * phase)) *
        vibrato *
        Math.pow(Math.sin(Math.PI * p), 0.7) *
        (1 - c * 0.14);
    }
    offset += cryDur + randomRange(rng, 0.05, 0.12);
  }
  applyBiquadFilter(buf, "lp", 4200, 0.7, sampleRate);
  return buf;
}
const k8 = synthGullCry;

/** 泊位缆绳绳索撞击桅杆金属清脆声 (Mooring Halyard Clink) */
function synthHalyard(sampleRate, rng, isVariant) {
  const buf = createAudioBufferArray(sampleRate, 1.1);
  const p = isVariant ? 1.19 : 1.0;
  let offset = 0.01;
  const count = isVariant ? 3 : 4;

  for (let i = 0; i < count; i++) {
    mixBuffer(
      buf,
      synthesizeModalBank(
        sampleRate,
        0.5,
        [
          [2310 * p, randomRange(rng, 0.06, 0.13), 1.0],
          [3740 * p, 0.07, 0.7],
          [5910 * p, 0.04, 0.5],
          [8130 * p, 0.025, 0.3],
          [10120 * p, 0.03, 0.3],
        ],
        rng,
      ),
      offset,
      randomRange(rng, 0.35, 1.0),
      sampleRate,
    );
    mixBuffer(
      buf,
      synthesizeNoiseBurst(sampleRate, rng, 0.004, 0.001, { hp: 3000 }),
      offset,
      0.3,
      sampleRate,
    );
    offset += randomRange(rng, 0.09, 0.26);
  }
  return buf;
}
const F8 = synthHalyard;

/** 集装箱受风浪扭曲形变金属轰鸣 (Container Stress Bang) */
function synthContainerBang(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 2.8);
  const subBang = createAudioBufferArray(sampleRate, 2.2);
  mixBuffer(
    subBang,
    synthesizeModalBank(
      sampleRate,
      2.2,
      [
        [47, 0.7, 1.0],
        [77, 0.55, 0.9],
        [121, 0.4, 0.7],
        [163, 0.3, 0.5],
        [214, 0.22, 0.4],
        [330, 0.12, 0.25],
      ],
      rng,
    ),
    0,
    0.5,
    sampleRate,
  );
  mixBuffer(
    subBang,
    synthesizeNoiseBurst(sampleRate, rng, 0.5, 0.11, { lp: 420 }),
    0,
    1.0,
    sampleRate,
  );
  mixBuffer(buf, subBang, 0, 1.0, sampleRate);
  mixBuffer(buf, subBang, 0.36, 0.3, sampleRate);
  mixBuffer(buf, subBang, 0.61, 0.12, sampleRate);
  return buf;
}
const U8 = synthContainerBang;

/** UI 点击按压轻脆声 (UI Click) */
function synthUiClick(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 0.09);
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.08,
      [
        [1820, 0.009, 1],
        [2730, 0.007, 0.6],
        [640, 0.012, 0.5],
      ],
      rng,
    ),
    0,
    1.0,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.004, 0.001, { hp: 2500 }),
    0,
    0.5,
    sampleRate,
  );
  return buf;
}
const N8 = synthUiClick;

/** UI 鼠标悬停聚焦微声 (UI Hover) */
function synthUiHover(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 0.06);
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.05,
      [
        [3200, 0.008, 1],
        [4800, 0.005, 0.3],
      ],
      rng,
    ),
    0,
    1.0,
    sampleRate,
  );
  return buf;
}
const B8 = synthUiHover;

// ============================================================================
// 四、 环境循环声与自适应多层音乐合成器 (Loops & Adaptive Music)
// ============================================================================

/** 港区无缝立体声暴雨循环 (Outdoor Rain Loop Generator) */
function* synthRainLoop(sampleRate, rng) {
  const buildChannel = function* (chRng) {
    const wideNoise = buildSeamlessLoop(sampleRate, 6.0, chRng, (buf) => {
      applyBiquadFilter(buf, "hp", 900, 0.6, sampleRate);
      applyBiquadFilter(buf, "lp", 8500, 0.6, sampleRate);
    });
    yield;

    const bodyNoise = buildSeamlessLoop(sampleRate, 6.0, chRng, (buf) => {
      applyBiquadFilter(buf, "bp", 420, 0.5, sampleRate);
    });

    const totalLen = wideNoise.length;
    const mixed = sumTracks(totalLen, [wideNoise, 0.5], [bodyNoise, 0.75]);
    const droplets = new Float32Array(totalLen);

    for (let i = 0; i < 1020; i++) {
      let idx = Math.floor(chRng() * totalLen);
      const dropLen = Math.round(randomRange(chRng, 0.0006, 0.003) * sampleRate);
      const dropAmp = Math.pow(chRng(), 3) * 1.6 + 0.15;
      for (let d = 0; d < dropLen; d++) {
        droplets[idx] += (chRng() * 2 - 1) * dropAmp * Math.exp((-5 * d) / dropLen);
        if (++idx >= totalLen) idx = 0;
      }
    }
    yield;
    applyDynamicBiquadFilter(droplets, "hp", () => 2200, 0.7, sampleRate, 2);
    yield;

    for (let i = 0; i < 30; i++) {
      const f = randomRange(chRng, 700, 2100);
      mixBufferWrapped(
        droplets,
        synthesizeChirp(sampleRate, randomRange(chRng, 0.008, 0.02), f, f * 1.7),
        chRng() * 6.0,
        randomRange(chRng, 0.08, 0.3),
        sampleRate,
      );
    }

    for (let i = 0; i < totalLen; i++) {
      mixed[i] += droplets[i] * 0.55;
    }
    return mixed;
  };

  const seed = Math.floor(rng() * 1e9);
  return [yield* buildChannel(createPrng(seed)), yield* buildChannel(createPrng(seed + 127))];
}
const O8 = synthRainLoop;

/** 集装箱仓库室内铁皮雨声循环 (Indoor Roof Rain Loop Generator) */
function* synthInteriorRainLoop(sampleRate, rng) {
  const buildChannel = function* (chRng) {
    const roofThump = buildSeamlessLoop(sampleRate, 6.0, chRng, (buf) => {
      applyBiquadFilter(buf, "lp", 1300, 0.6, sampleRate);
      applyBiquadFilter(buf, "hp", 110, 0.7, sampleRate);
    });
    const len = roofThump.length;
    const impactGrains = new Float32Array(len);

    for (let i = 0; i < 1560; i++) {
      impactGrains[Math.floor(chRng() * len)] +=
        (chRng() * 2 - 1) * (0.2 + Math.pow(chRng(), 4) * 3);
    }
    const mixed = sumTracks(len, [roofThump, 0.8]);

    // 铁皮波纹板共振模态
    for (const [modalF, modalQ, modalGain] of [
      [1820, 14, 1.0],
      [2740, 16, 0.8],
      [4150, 18, 0.6],
      [6200, 14, 0.35],
      [940, 8, 0.7],
    ]) {
      const resonantTrack = Float32Array.from(impactGrains);
      applyDynamicBiquadFilter(resonantTrack, "bp", () => modalF, modalQ, sampleRate, 2);
      for (let p = 0; p < len; p++) mixed[p] += resonantTrack[p] * modalGain * 5;
      yield;
    }

    for (let i = 0; i < 4; i++) {
      const f = randomRange(chRng, 900, 1600);
      mixBufferWrapped(
        mixed,
        synthesizeChirp(sampleRate, 0.014, f, f * 1.8),
        chRng() * 6.0,
        0.25,
        sampleRate,
      );
    }
    return mixed;
  };

  const seed = Math.floor(rng() * 1e9);
  return [yield* buildChannel(createPrng(seed)), yield* buildChannel(createPrng(seed + 991))];
}
const H8 = synthInteriorRainLoop;

/** 港区海风循环 (Coastal Wind Loop) */
function synthWindLoop(sampleRate, rng) {
  const noise1 = generateWhiteNoise(sampleRate, 8.5, rng);
  const noise2 = Float32Array.from(noise1);

  applyDynamicBiquadFilter(
    noise1,
    "bp",
    (progress) => {
      const t = progress * 8.5;
      return 380 + 190 * Math.sin((TWO_PI * t) / 8.0) + 90 * Math.sin((TWO_PI * t) / 2.667 + 1);
    },
    1.3,
    sampleRate,
  );

  applyDynamicBiquadFilter(
    noise2,
    "bp",
    (progress) => {
      const t = progress * 8.5;
      return 1350 + 260 * Math.sin((TWO_PI * t) / 4.0 + 2);
    },
    9.0,
    sampleRate,
  );

  for (let i = 0; i < noise1.length; i++) {
    const t = i / sampleRate;
    noise1[i] =
      noise1[i] * (0.7 + 0.3 * Math.sin((TWO_PI * t) / 8.0 + 0.5)) +
      noise2[i] * 0.22 * Math.pow(0.5 + 0.5 * Math.sin((TWO_PI * t) / 4.0 + 1), 2);
  }
  return crossfadeLoopBuffer(noise1, sampleRate * 8, true);
}
const V8 = synthWindLoop;

/** 远海海浪拍打防波堤循环 (Ocean Waves Loop) */
function* synthOceanLoop(sampleRate, rng) {
  const waveLow = generateWhiteNoise(sampleRate, 8.5, rng);
  const waveSpray = generateWhiteNoise(sampleRate, 8.5, rng);
  const waveMid = generateWhiteNoise(sampleRate, 8.5, rng);
  yield;

  applyBiquadFilter(waveLow, "lp", 1100, 0.6, sampleRate);
  applyBiquadFilter(waveLow, "hp", 70, 0.7, sampleRate);
  applyBiquadFilter(waveSpray, "hp", 2400, 0.7, sampleRate);
  applyBiquadFilter(waveMid, "bp", 520, 1.2, sampleRate);
  yield;

  for (let i = 0; i < waveLow.length; i++) {
    const t = i / sampleRate;
    const waveCycle = (t % 4.0) / 4.0;
    const swell = Math.pow(0.5 - 0.5 * Math.cos(TWO_PI * waveCycle), 1.5);
    const foam = Math.exp(-Math.pow((waveCycle - 0.5) / 0.05, 2));
    const hiss = Math.exp(-Math.pow((waveCycle - 0.68) / 0.16, 2));
    const seaBreath = 0.5 - 0.5 * Math.cos((TWO_PI * ((t + 1.3) % 2.667)) / 2.667);
    waveLow[i] =
      waveLow[i] * (0.3 + 0.7 * swell + 0.25 * seaBreath) +
      waveMid[i] * foam * 1.8 +
      waveSpray[i] * hiss * 0.35;
  }
  return crossfadeLoopBuffer(waveLow, sampleRate * 8, true);
}
const W8 = synthOceanLoop;

// 音乐曲式与和弦进行定义 (Musical Architecture)

export {
  synthThunder,
  synthFoghorn,
  synthGullCry,
  synthHalyard,
  synthContainerBang,
  synthUiClick,
  synthUiHover,
  synthRainLoop,
  synthInteriorRainLoop,
  synthWindLoop,
  synthOceanLoop,
};

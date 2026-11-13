/**
 * @file src/audio/sounds.js
 * @description 全量程序化音效波形生成器与注册表 (Sound Synthesizers & Sound Registry)
 */

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
} from "./dsp.js";

function synthesizeRifleShot(sampleRate, rng, variant) {
  const pitchVar = [1.0, 0.955, 1.045, 0.985][variant & 3];
  const filterVar = [1.0, 1.12, 0.9, 1.05][variant & 3];
  const out = createAudioBufferArray(sampleRate, 0.32);

  // 1. 超音速弹头出膛激波高频刺耳开裂 (Shockwave Crack: HP 2600Hz)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.012, 0.0011, { hp: 2600 * filterVar }),
    0,
    2.6,
    sampleRate,
  );

  // 2. 膛口爆燃白噪声带通冲击 (Muzzle Blast: HP 1200, LP 8000)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.02, 0.003, { hp: 1200, lp: 8000 }),
    0.0002,
    1.2,
    sampleRate,
  );

  // 3. 火药爆轰重低音沉重锤击 (160Hz -> 45Hz 下潜) 与 92Hz~36Hz 亚低频瞬态重音
  mixBuffer(
    out,
    synthesizePitchSweepSine(sampleRate, 0.11, 160 * pitchVar, 45 * pitchVar, 0.024, 0.03, 0.003),
    0,
    0.62,
    sampleRate,
  );
  mixBuffer(
    out,
    synthesizePitchSweepSine(sampleRate, 0.08, 92 * pitchVar, 36 * pitchVar, 0.018, 0.025, 0.002),
    0.001,
    0.78,
    sampleRate,
  );

  // 4. 机匣空腔压迫爆震 (300Hz ~ 2500Hz)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.22, 0.03, {
      hp: 300 * pitchVar,
      lp: 2500 * pitchVar * filterVar,
      att: 0.0012,
    }),
    0,
    1.5,
    sampleRate,
  );

  // 5. 撞针枪膛窄带带通谐振 (760Hz, Q=2.2)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.09, 0.016, { bp: 760 * pitchVar, q: 2.2, att: 0.001 }),
    0,
    0.9,
    sampleRate,
  );

  // 6. 枪机高频滑行机械反冲 (HP 4800Hz)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.16, 0.04, { hp: 4800 }),
    0.001,
    0.34,
    sampleRate,
  );

  // 7. 枪管金属物理高次模态群 (Barrel Harmonics)
  const delaySec = 0.035 + (variant - 1.5) * 0.0015;
  mixBuffer(
    out,
    synthesizeModalBank(
      sampleRate,
      0.05,
      [
        [2150 * pitchVar, 0.007, 1.0],
        [3420 * pitchVar, 0.006, 0.7],
        [5230, 0.004, 0.5],
        [880 * pitchVar, 0.012, 0.5],
      ],
      rng,
    ),
    delaySec,
    0.26,
    sampleRate,
  );
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.012, 0.002, { bp: 3100, q: 1.2 }),
    delaySec,
    0.3,
    sampleRate,
  );

  mixBuffer(
    out,
    synthesizeModalBank(
      sampleRate,
      0.05,
      [
        [1780 * pitchVar, 0.008, 1.0],
        [2890 * pitchVar, 0.006, 0.6],
        [640 * pitchVar, 0.02, 0.5],
      ],
      rng,
    ),
    delaySec + 0.027,
    0.17,
    sampleRate,
  );
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.01, 0.002, { bp: 2400, q: 1.2 }),
    delaySec + 0.027,
    0.16,
    sampleRate,
  );

  mixBuffer(
    out,
    synthesizeModalBank(
      sampleRate,
      0.2,
      [
        [712 * pitchVar, 0.05, 1.0],
        [1466 * pitchVar, 0.03, 0.4],
      ],
      rng,
    ),
    delaySec + 0.03,
    0.035,
    sampleRate,
  );

  // 7b. 枪机复进闭锁清脆金属撞击瞬态 (Bolt Carrier Slam & Battery Lockup: 4.8kHz)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.015, 0.0015, {
      bp: 4850 * pitchVar,
      q: 2.5,
      att: 0.0008,
    }),
    delaySec + 0.042,
    0.34,
    sampleRate,
  );
  mixBuffer(
    out,
    synthesizeModalBank(
      sampleRate,
      0.035,
      [
        [3600 * pitchVar, 0.008, 0.8],
        [5400 * pitchVar, 0.005, 0.5],
      ],
      rng,
    ),
    delaySec + 0.042,
    0.22,
    sampleRate,
  );

  // 8. 输出级软限幅饱和
  return applySoftSaturation(scaleBuffer(out, 0.46), 1.5);
}

const KR = synthesizeRifleShot;

/**
 * SG-12 重型战术霰弹枪枪声与次级机械泵动物理合成
 * 包含超大口径火药轰鸣、60Hz->22Hz 重低音下潜激波与 0.16s 战术滑块泵动机械回弹
 */
function synthesizeShotgunShot(sampleRate, rng, variant) {
  const pitchVar = [1.0, 0.94, 1.06, 0.98][variant & 3];
  const filterVar = [1.0, 1.15, 0.88, 1.08][variant & 3];
  const out = createAudioBufferArray(sampleRate, 0.48);

  // 1. 12铅径大口径出膛空气爆裂激波 (HP 400Hz, LP 6500Hz)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.024, 0.0012, {
      hp: 420 * filterVar,
      lp: 6800 * filterVar,
    }),
    0,
    3.2,
    sampleRate,
  );

  // 2. 60Hz -> 22Hz 剧烈亚低频爆轰震颤 (Sub-bass Chest Thump)
  mixBuffer(
    out,
    synthesizePitchSweepSine(sampleRate, 0.18, 68 * pitchVar, 22 * pitchVar, 0.035, 0.045, 0.003),
    0,
    1.1,
    sampleRate,
  );

  // 3. 粗大膛室火药膨胀爆震 (180Hz ~ 2200Hz)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.32, 0.045, {
      hp: 180 * pitchVar,
      lp: 2400 * pitchVar,
      att: 0.0015,
    }),
    0.0005,
    1.9,
    sampleRate,
  );

  // 4. 多弹丸喷射空气紊流与破片啸叫 (Whistling Turbulence)
  mixBuffer(
    out,
    synthesizeModalBank(
      sampleRate,
      0.08,
      [
        [1450 * pitchVar, 0.012, 0.8],
        [2280 * pitchVar, 0.009, 0.6],
        [3890 * filterVar, 0.006, 0.4],
      ],
      rng,
    ),
    0.01,
    0.35,
    sampleRate,
  );

  // 5. 次级机械泵动回拉声 (Pump Slide Pull: 0.14s)
  const pumpPullT = 0.14;
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.03, 0.003, { bp: 2600 * pitchVar, q: 2.2 }),
    pumpPullT,
    0.42,
    sampleRate,
  );

  // 6. 次级机械泵动前推闭锁与击铁复位 (Pump Slide Slam Lockup: 0.26s)
  const pumpLockT = 0.26;
  mixBuffer(
    out,
    synthesizeModalBank(
      sampleRate,
      0.07,
      [
        [3400 * pitchVar, 0.009, 1.0],
        [5100 * pitchVar, 0.006, 0.7],
        [1850 * pitchVar, 0.015, 0.5],
      ],
      rng,
    ),
    pumpLockT,
    0.48,
    sampleRate,
  );
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.018, 0.002, { hp: 4200 }),
    pumpLockT,
    0.36,
    sampleRate,
  );

  return applySoftSaturation(scaleBuffer(out, 0.44), 1.6);
}

/**
 * SMG-45 紧凑高射速冲锋枪声与轻量化枪机往复物理合成
 * 具备 980 RPM 极短出膛爆震、轻量化铝合金枪机 8.2kHz 脆响与紧凑消焰器喷流
 */
function synthesizeSmgShot(sampleRate, rng, variant) {
  const pitchVar = [1.0, 0.97, 1.03, 1.01][variant & 3];
  const filterVar = [1.0, 1.08, 0.92, 1.05][variant & 3];
  const out = createAudioBufferArray(sampleRate, 0.24);

  // 1. 短促清脆的高频超音速激波 (HP 3200Hz, 8ms 极短上升沿)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.009, 0.0008, { hp: 3200 * filterVar }),
    0,
    2.5,
    sampleRate,
  );

  // 2. 紧凑型弹药低频瞬态打击 (190Hz -> 65Hz)
  mixBuffer(
    out,
    synthesizePitchSweepSine(sampleRate, 0.07, 190 * pitchVar, 65 * pitchVar, 0.015, 0.02, 0.002),
    0,
    0.7,
    sampleRate,
  );

  // 3. 紧凑消焰器膛压喷流带通 (HP 850Hz, LP 4600Hz)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.14, 0.022, {
      hp: 850 * pitchVar,
      lp: 4600 * filterVar,
      att: 0.001,
    }),
    0,
    1.3,
    sampleRate,
  );

  // 4. 高速往复轻质铝钛枪机闭锁金属清脆碰撞 (Bolt Battery Slam: 8.2kHz)
  mixBuffer(
    out,
    synthesizeModalBank(
      sampleRate,
      0.045,
      [
        [8200 * pitchVar, 0.005, 1.0],
        [4600 * pitchVar, 0.008, 0.6],
        [11500, 0.003, 0.4],
      ],
      rng,
    ),
    0.018,
    0.42,
    sampleRate,
  );

  return applySoftSaturation(scaleBuffer(out, 0.45), 1.4);
}

/**
 * SR-99 反器材重型高精狙击步枪声物理合成
 * 包含 .50 口径超音速冲击波、24Hz 次重低音地震波爆轰、侧向多室制退器喷流与重型枪栓机械回音
 */
function synthesizeSniperShot(sampleRate, rng, variant) {
  const pitchVar = [1.0, 0.93, 1.05, 0.97][variant & 3];
  const filterVar = [1.0, 1.12, 0.9, 1.06][variant & 3];
  const out = createAudioBufferArray(sampleRate, 0.62);

  // 1. 超高能量反器材超音速穿甲弹冲击波 (HP 1800Hz, 极陡峭破裂瞬态)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.035, 0.001, { hp: 1800 * filterVar }),
    0,
    3.8,
    sampleRate,
  );

  // 2. 地震波级次重低音超长下潜轰鸣 (110Hz -> 24Hz, 0.26s 超低频震颤)
  mixBuffer(
    out,
    synthesizePitchSweepSine(sampleRate, 0.26, 110 * pitchVar, 24 * pitchVar, 0.045, 0.08, 0.002),
    0,
    1.35,
    sampleRate,
  );

  // 3. 巨型双室制退器侧向紊流喷火爆鸣 (HP 220, LP 2800)
  mixBuffer(
    out,
    synthesizeNoiseBurst(sampleRate, rng, 0.45, 0.06, {
      hp: 220 * pitchVar,
      lp: 2800 * pitchVar,
      att: 0.001,
    }),
    0.0008,
    2.4,
    sampleRate,
  );

  // 4. 重型钛合金机匣与加厚枪管驻波共振群 (Heavy Barrel Resonance)
  mixBuffer(
    out,
    synthesizeModalBank(
      sampleRate,
      0.18,
      [
        [540 * pitchVar, 0.035, 1.0],
        [1120 * pitchVar, 0.022, 0.7],
        [2850 * pitchVar, 0.012, 0.5],
        [4650 * pitchVar, 0.008, 0.4],
      ],
      rng,
    ),
    0.025,
    0.55,
    sampleRate,
  );

  // 5. 栓动重型拉机柄金属机械锁闭次级微回音 (Bolt Handle Lock Resonance: 0.16s)
  mixBuffer(
    out,
    synthesizeModalBank(
      sampleRate,
      0.08,
      [
        [3850 * pitchVar, 0.014, 0.8],
        [6200 * pitchVar, 0.009, 0.5],
      ],
      rng,
    ),
    0.16,
    0.32,
    sampleRate,
  );

  return applySoftSaturation(scaleBuffer(out, 0.5), 1.8);
}

/**
 * 室外开阔集装箱码头混响脉冲响应 (Outdoor Harbor Impulse Response)
 * 模拟开阔泊位、远海空旷扩散反射与大型集装箱堆垛早期反射
 */
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
function synthDryFire(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 0.13);
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.05,
      [
        [2840, 0.004, 1],
        [4130, 0.004, 0.7],
        [6320, 0.003, 0.5],
        [1210, 0.008, 0.4],
      ],
      rng,
    ),
    0,
    0.7,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.006, 0.0012, { hp: 2000 }),
    0,
    0.6,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.08,
      [
        [930, 0.018, 1],
        [1870, 0.012, 0.5],
      ],
      rng,
    ),
    0.016,
    0.16,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.004, 0.001, { hp: 3000 }),
    0.018,
    0.2,
    sampleRate,
  );
  return buf;
}
const t8 = synthDryFire;

/** 金属导轨滑动摩擦噪音频扫辅助函数 */
function synthSlidingFriction(sampleRate, rng, duration, startFreq, endFreq, grainRate) {
  const noise = generateWhiteNoise(sampleRate, duration, rng);
  applyDynamicBiquadFilter(noise, "bp", createFreqSweep(startFreq, endFreq), 1.6, sampleRate);
  let gain = 0.5;
  let targetGain = 0.5;
  const grainSamples = Math.round(sampleRate / grainRate);
  for (let i = 0; i < noise.length; i++) {
    if (i % grainSamples === 0) targetGain = 0.25 + rng() * 0.75;
    gain += (targetGain - gain) * 0.02;
    const progress = i / noise.length;
    noise[i] *= gain * Math.sin(Math.PI * Math.pow(progress, 0.7));
  }
  return noise;
}
const e_ = synthSlidingFriction;

/** 拔出空弹匣机械声 (Reload Magazine Out) */
function synthReloadMagOut(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 0.46);
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.03,
      [
        [3300, 0.004, 1],
        [5100, 0.003, 0.6],
      ],
      rng,
    ),
    0.004,
    0.45,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.005, 0.001, { hp: 2500 }),
    0.004,
    0.35,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthSlidingFriction(sampleRate, rng, 0.17, 1700, 3400, 190),
    0.03,
    0.5,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.06, 0.012, { lp: 950 }),
    0.2,
    0.8,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.12,
      [
        [415, 0.03, 1],
        [1140, 0.018, 0.6],
        [2290, 0.01, 0.4],
        [3470, 0.006, 0.25],
      ],
      rng,
    ),
    0.2,
    0.42,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.08, 0.02, { bp: 2600, q: 0.8 }),
    0.215,
    0.14,
    sampleRate,
  );
  return buf;
}
const n8 = synthReloadMagOut;

/** 插入新弹匣卡紧声 (Reload Magazine In) */
function synthReloadMagIn(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 0.5);
  mixBuffer(buf, synthSlidingFriction(sampleRate, rng, 0.14, 1250, 2900, 240), 0, 0.55, sampleRate);
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.03,
      [
        [2600, 0.004, 1],
        [4300, 0.003, 0.5],
      ],
      rng,
    ),
    0.05,
    0.2,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.07, 190, 88, 0.02, 0.022),
    0.15,
    0.8,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.05, 0.008, { lp: 1600 }),
    0.15,
    0.8,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.1,
      [
        [655, 0.024, 1],
        [1710, 0.014, 0.6],
        [3120, 0.008, 0.4],
      ],
      rng,
    ),
    0.15,
    0.4,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.04,
      [
        [3650, 0.005, 1],
        [5600, 0.004, 0.6],
        [2100, 0.007, 0.5],
      ],
      rng,
    ),
    0.187,
    0.42,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.005, 0.001, { hp: 3000 }),
    0.187,
    0.36,
    sampleRate,
  );
  return buf;
}
const i8 = synthReloadMagIn;

/** 拉动枪机复进推弹上膛声 (Reload Bolt Cycle) */
function synthReloadBolt(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 0.38);
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.03,
      [
        [2900, 0.005, 1],
        [4600, 0.004, 0.6],
      ],
      rng,
    ),
    0,
    0.3,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.03, 0.01, { bp: 2200, q: 0.8 }),
    0.004,
    0.25,
    sampleRate,
  );

  const rackTime = 0.03;
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.02, 0.004, { hp: 1200 }),
    rackTime,
    1.0,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.06, 230, 105, 0.012, 0.018),
    rackTime,
    0.8,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.15,
      [
        [1310, 0.03, 1],
        [2460, 0.024, 0.8],
        [3920, 0.016, 0.6],
        [5640, 0.01, 0.45],
        [7900, 0.006, 0.3],
      ],
      rng,
    ),
    rackTime,
    0.36,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.3,
      [
        [722, 0.075, 1],
        [1451, 0.05, 0.35],
      ],
      rng,
    ),
    rackTime + 0.002,
    0.1,
    sampleRate,
  );
  return applySoftSaturation(buf, 1.3);
}
const s8 = synthReloadBolt;

/** 抛壳黄铜弹壳多段落地弹跳声 (Shell Casing Bounce) */
function synthShellBounce(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.6);
  const pitchScale = [1.0, 1.09, 0.93][variant % 3];
  let delay = 0;
  let gain = 1.0;
  const bounceCount = 3 + (variant & 1);

  for (let b = 0; b < bounceCount; b++) {
    const p = pitchScale * randomRange(rng, 0.96, 1.05) * (1 + b * 0.025);
    mixBuffer(
      buf,
      synthesizeModalBank(
        sampleRate,
        0.22,
        [
          [4180 * p, randomRange(rng, 0.03, 0.055), 1.0],
          [6830 * p, 0.03, 0.7],
          [9760 * p, 0.02, 0.5],
          [11900 * p, 0.012, 0.3],
          [2470 * p, 0.012, 0.3],
        ],
        rng,
      ),
      delay,
      gain * 0.5,
      sampleRate,
    );
    mixBuffer(
      buf,
      synthesizeNoiseBurst(sampleRate, rng, 0.004, 0.0008, { hp: 3500 }),
      delay,
      gain * 0.5,
      sampleRate,
    );
    delay += randomRange(rng, 0.075, 0.13) * (b ? 0.72 : 1);
    gain *= randomRange(rng, 0.42, 0.58);
  }

  // 弹壳落地末段微小滚动余震颤音 (Micro-chatter / roll settle)
  const chatterP = pitchScale * 1.08;
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.08,
      [
        [4300 * chatterP, 0.015, 0.5],
        [7200 * chatterP, 0.01, 0.3],
      ],
      rng,
    ),
    delay,
    0.16,
    sampleRate,
  );
  return buf;
}
const o8 = synthShellBounce;

/**
 * 弹壳敲击金属铁板与集装箱面声学物理合成 (Shell Bounce on Metal Surface)
 * 具备极高 Q 模态谐振衰减 (5.2kHz / 7.8kHz / 10.5kHz) 与密集微弹跳颤音 (Micro-rattle)
 */
function synthShellBounceMetal(sampleRate, rng, variant) {
  const p = [1.0, 1.05, 0.95, 1.08][variant & 3];
  const buf = createAudioBufferArray(sampleRate, 0.36);
  let delay = 0.002;
  let gain = 1.0;

  for (let bounce = 0; bounce < 3; bounce++) {
    mixBuffer(
      buf,
      synthesizeModalBank(
        sampleRate,
        0.065,
        [
          [5200 * p, 0.025, 1.0],
          [7800 * p, 0.018, 0.75],
          [10500 * p, 0.012, 0.5],
          [3100 * p, 0.03, 0.4],
        ],
        rng,
      ),
      delay,
      gain * 0.65,
      sampleRate,
    );
    mixBuffer(
      buf,
      synthesizeNoiseBurst(sampleRate, rng, 0.005, 0.0006, { hp: 4200 }),
      delay,
      gain * 0.5,
      sampleRate,
    );
    delay += randomRange(rng, 0.055, 0.095);
    gain *= 0.45;
  }

  // 终段金属微弱余震颤音
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.07,
      [
        [6400 * p, 0.018, 0.6],
        [8900 * p, 0.012, 0.4],
      ],
      rng,
    ),
    delay,
    0.25,
    sampleRate,
  );
  return buf;
}

/**
 * 弹壳敲击混凝土与沥青路面声学物理合成 (Shell Bounce on Concrete Surface)
 * 具备坚实刚体撞击钝音与碎石微小摩擦声
 */
function synthShellBounceConcrete(sampleRate, rng, variant) {
  const p = [1.0, 0.96, 1.04, 0.98][variant & 3];
  const buf = createAudioBufferArray(sampleRate, 0.28);
  let delay = 0.002;
  let gain = 1.0;

  for (let bounce = 0; bounce < 2; bounce++) {
    mixBuffer(
      buf,
      synthesizeNoiseBurst(sampleRate, rng, 0.018, 0.003, { bp: 1450 * p, q: 1.8 }),
      delay,
      gain * 0.85,
      sampleRate,
    );
    mixBuffer(
      buf,
      synthesizeNoiseBurst(sampleRate, rng, 0.008, 0.001, { hp: 3600 }),
      delay,
      gain * 0.4,
      sampleRate,
    );
    delay += randomRange(rng, 0.07, 0.11);
    gain *= 0.38;
  }

  // 砂石划擦微细摩擦
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.045, 0.008, { bp: 2800, q: 0.8 }),
    delay,
    0.22,
    sampleRate,
  );
  return buf;
}

/**
 * 弹壳敲击木托盘与货箱声学物理合成 (Shell Bounce on Wood Surface)
 */
function synthShellBounceWood(sampleRate, rng, variant) {
  const p = [1.0, 0.95, 1.06, 0.98][variant & 3];
  const buf = createAudioBufferArray(sampleRate, 0.26);
  let delay = 0.002;
  let gain = 1.0;

  for (let bounce = 0; bounce < 2; bounce++) {
    mixBuffer(
      buf,
      synthesizeModalBank(
        sampleRate,
        0.05,
        [
          [520 * p, 0.018, 1.0],
          [960 * p, 0.014, 0.7],
          [1650 * p, 0.01, 0.4],
        ],
        rng,
      ),
      delay,
      gain * 0.75,
      sampleRate,
    );
    delay += randomRange(rng, 0.08, 0.12);
    gain *= 0.4;
  }
  return buf;
}

/**
 * 密集雨点敲击金属集装箱表面细微颗粒声 (Rain Patter on Metal Surface)
 */
function* synthRainMetalPatter(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 3.0);
  const len = buf.length;

  for (let i = 0; i < 900; i++) {
    const pos = Math.floor(rng() * (len - 800));
    const p = 0.9 + rng() * 0.2;
    const drop = synthesizeModalBank(
      sampleRate,
      0.02,
      [
        [5800 * p, 0.004, 0.8],
        [8200 * p, 0.003, 0.5],
      ],
      rng,
    );
    mixBuffer(buf, drop, pos / sampleRate, 0.12, sampleRate);
    if (i % 150 === 0) yield;
  }
  return buf;
}

/**
 * 雨水滴落积水洼水泡破裂音 (Rain Puddle Drips & Micro-Chirps)
 */
function* synthRainPuddleDrips(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 3.2);
  const len = buf.length;

  for (let i = 0; i < 48; i++) {
    const pos = Math.floor(rng() * (len - 1200));
    const startF = randomRange(rng, 1400, 2200);
    const endF = randomRange(rng, 700, 1100);
    const bubble = synthesizeChirp(sampleRate, 0.018, startF, endF);
    mixBuffer(buf, bubble, pos / sampleRate, 0.22, sampleRate);
    if (i % 12 === 0) yield;
  }
  return buf;
}

/** 混凝土路面脚步声 (Concrete Footstep) */
function synthStepConcrete(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.3);
  const p = [1.0, 1.07, 0.94, 1.03][variant & 3];
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.06, 112 * p, 58 * p, 0.018, 0.02, 0.002),
    0,
    0.75,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.06, 0.016, { lp: 720 * p }),
    0,
    0.9,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.1, 0.028, { bp: 2500 * p, q: 0.7, att: 0.004 }),
    0.012,
    0.22,
    sampleRate,
  );

  const grit = synthesizeNoiseBurst(sampleRate, rng, 0.2, 0.05, { hp: 3800, att: 0.01 });
  let gritGain = 1.0;
  for (let i = 0; i < grit.length; i++) {
    if (i % 70 === 0) gritGain = 0.3 + rng() * 0.7;
    grit[i] *= gritGain;
  }
  mixBuffer(buf, grit, 0.02, 0.16, sampleRate);
  return buf;
}
const r8 = synthStepConcrete;

/** 水洼水花飞溅声内核 (Water Splash Core) */
function synthWaterSplash(sampleRate, rng, duration, intensity) {
  const buf = createAudioBufferArray(sampleRate, duration);
  const noise = generateWhiteNoise(sampleRate, duration * 0.9, rng);
  applyDynamicBiquadFilter(noise, "bp", createFreqSweep(1500, 520), 0.8, sampleRate);
  mixBuffer(
    buf,
    applyEnvelope(noise, sampleRate, createExpDecayEnvelope(0.085 * intensity, 0.007)),
    0,
    0.9,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, duration * 0.8, 0.07 * intensity, {
      hp: 3000,
      att: 0.012,
    }),
    0.01,
    0.25,
    sampleRate,
  );

  const dropletCount = Math.round(5 * intensity);
  for (let d = 0; d < dropletCount; d++) {
    const f = randomRange(rng, 500, 1700);
    mixBuffer(
      buf,
      synthesizeChirp(sampleRate, randomRange(rng, 0.008, 0.02), f, f * randomRange(rng, 1.3, 1.9)),
      randomRange(rng, 0.03, duration * 0.6),
      randomRange(rng, 0.1, 0.3),
      sampleRate,
    );
  }
  return buf;
}
const t_ = synthWaterSplash;

/** 积水地面积水脚步声 (Water Puddle Footstep) */
function synthStepWater(sampleRate, rng, variant) {
  const buf = synthWaterSplash(sampleRate, rng, 0.46, 1 + variant * 0.08);
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.06, 100, 55, 0.02, 0.02, 0.002),
    0,
    0.5,
    sampleRate,
  );
  return buf;
}
const a8 = synthStepWater;

/** 金属格栅走道脚步声 (Metal Catwalk Footstep) */
function synthStepMetal(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.38);
  const p = [1.0, 1.08, 0.92][variant % 3];
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.06, 120, 62, 0.018, 0.02, 0.002),
    0,
    0.6,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.04, 0.008, { lp: 2400 }),
    0,
    0.6,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.36,
      [
        [178 * p, 0.09, 1.0],
        [412 * p, 0.075, 0.8],
        [733 * p, 0.06, 0.55],
        [1214 * p, 0.045, 0.4],
        [1958 * p, 0.03, 0.3],
        [3130 * p, 0.016, 0.18],
      ],
      rng,
    ),
    0.001,
    0.3,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.08, 0.02, { bp: 3000, q: 0.8, att: 0.003 }),
    0.01,
    0.1,
    sampleRate,
  );
  return buf;
}
const l8 = synthStepMetal;

/** 跳跃落地沉重冲击 (Heavy Landing Impact) */
function synthLand(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 0.45);
  // 深沉低频重击 (Deep Sub Impact) 与 82Hz~32Hz 触地低音包络
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.14, 124, 44, 0.03, 0.045, 0.002),
    0,
    1.0,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.09, 82, 32, 0.02, 0.035, 0.002),
    0.002,
    0.72,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.14, 0.035, { lp: 520 }),
    0,
    1.0,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.2, 0.06, { bp: 1500, q: 0.7, att: 0.01 }),
    0.01,
    0.16,
    sampleRate,
  );
  // 战术装具扣件摩擦抖动层 (Gear / buckle rustle layer)
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.06,
      [
        [2850, 0.015, 0.4],
        [4300, 0.01, 0.3],
      ],
      rng,
    ),
    0.018,
    0.22,
    sampleRate,
  );
  for (const t of [0.022, 0.05, 0.088]) {
    mixBuffer(
      buf,
      synthesizeNoiseBurst(sampleRate, rng, 0.012, 0.003, {
        bp: randomRange(rng, 2200, 4200),
        q: 2,
      }),
      t,
      randomRange(rng, 0.1, 0.22),
      sampleRate,
    );
  }
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.2, 0.05, { hp: 3500, att: 0.01 }),
    0.015,
    0.1,
    sampleRate,
  );
  return applySoftSaturation(buf, 1.2);
}
const c8 = synthLand;

/** 起跳腾空声 (Jump Takeoff Whoosh) */
function synthJump(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 0.26);
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.2, 0.05, { bp: 900, q: 0.7, att: 0.02 }),
    0,
    0.6,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.1, 0.025, { bp: 2600, q: 0.8, att: 0.004 }),
    0.005,
    0.35,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.05, 95, 60, 0.02, 0.018, 0.003),
    0,
    0.4,
    sampleRate,
  );
  return buf;
}
const u8 = synthJump;

/** 玩家受击剧痛声 (Player Hurt Flesh Impact) */
function synthHurt(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 0.5);
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.25, 92, 38, 0.04, 0.06, 0.0015),
    0,
    1.1,
    sampleRate,
  );
  mixBuffer(buf, synthesizeNoiseBurst(sampleRate, rng, 0.2, 0.04, { lp: 320 }), 0, 1.2, sampleRate);
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.06, 0.01, { bp: 820, q: 1 }),
    0,
    0.55,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.03, 0.004, { hp: 1800, lp: 5000 }),
    0,
    0.2,
    sampleRate,
  );
  return applySoftSaturation(buf, 1.6);
}
const h8 = synthHurt;

/** 耳鸣高频谐振 (Tinnitus Ear Ringing: 3150Hz + 4013Hz + 5310Hz) */
function synthEarRing(sampleRate) {
  const buf = createAudioBufferArray(sampleRate, 2.4);
  for (let i = 0; i < buf.length; i++) {
    const t = i / sampleRate;
    buf[i] =
      (Math.sin(TWO_PI * 3150 * t) +
        0.7 * Math.sin(TWO_PI * 4013 * t + 1) +
        0.35 * Math.sin(TWO_PI * 5310 * t + 2)) *
      (1 - Math.exp(-t / 0.12)) *
      Math.exp(-t / 0.55);
  }
  return buf;
}
const f8 = synthEarRing;

/** 命中金属击打声 (Bullet Impact Metal) */
function synthImpactMetal(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.5);
  const baseFreq = [640, 880, 745][variant % 3] * randomRange(rng, 0.97, 1.03);
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.015, 0.003, { hp: 1500 }),
    0,
    1.0,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.04, 0.008, { lp: 1800 }),
    0,
    0.6,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.48,
      [1, 1.58, 2.24, 2.92, 3.71, 4.93, 6.31, 8.1].map((r, a) => [
        baseFreq * r,
        0.13 / (1 + a * 0.55),
        1 / (1 + a * 0.5),
      ]),
      rng,
    ),
    0.0005,
    0.42,
    sampleRate,
  );
  return buf;
}
const d8 = synthImpactMetal;

/** 命中混凝土击打与碎渣飞溅声 (Bullet Impact Concrete) */
function synthImpactConcrete(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.36);
  const p = [1.0, 1.1, 0.9][variant % 3];
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.06, 0.013, { lp: 950 * p }),
    0,
    1.1,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.05, 150 * p, 70, 0.012, 0.016),
    0,
    0.6,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.012, 0.002, { hp: 2000 }),
    0,
    0.6,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.12, 0.024, { bp: 3500 * p, q: 0.7 }),
    0.003,
    0.3,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeGranularDebris(sampleRate, rng, 0.34, 16, {
      from: 0.03,
      fall: 1.8,
      hp: 1800,
      ampFall: 0.1,
    }),
    0,
    0.35,
    sampleRate,
  );
  return buf;
}
const p8 = synthImpactConcrete;

/** 命中木质货架木板声 (Bullet Impact Wood) */
function synthImpactWood(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.26);
  const p = variant ? 1.14 : 1.0;
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.2,
      [
        [238 * p, 0.03, 1],
        [512 * p, 0.022, 0.8],
        [893 * p, 0.016, 0.6],
        [1410 * p, 0.01, 0.4],
      ],
      rng,
    ),
    0,
    0.6,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.03, 0.006, { lp: 2100 }),
    0,
    0.8,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.01, 0.002, { hp: 3000 }),
    0,
    0.5,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeGranularDebris(sampleRate, rng, 0.2, 6, { from: 0.01, fall: 2.0, bp: 2600, q: 1.5 }),
    0,
    0.3,
    sampleRate,
  );
  return buf;
}
const m8 = synthImpactWood;

/** 命中积水水花飞溅声 (Bullet Impact Water) */
function synthImpactWater(sampleRate, rng, variant) {
  const buf = synthWaterSplash(sampleRate, rng, 0.5, 0.8 + variant * 0.2);
  mixBuffer(buf, synthesizeChirp(sampleRate, 0.035, 420, 1150), 0, 0.5, sampleRate);
  return buf;
}
const g8 = synthImpactWater;

/** 命中机械敌方复合装甲声 (Bullet Impact Enemy Armor) */
function synthImpactEnemy(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.3);
  const p = [1.0, 1.12, 0.9][variant % 3];
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.03, 0.007, { hp: 4000 }),
    0,
    0.9,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.12,
      [
        [2920 * p, 0.022, 1],
        [4730 * p, 0.018, 0.8],
        [7310 * p, 0.012, 0.6],
        [1180 * p, 0.03, 0.5],
      ],
      rng,
    ),
    0,
    0.4,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.05, 0.012, { bp: 320 * p, q: 1.5 }),
    0,
    0.9,
    sampleRate,
  );

  const squish = generateWhiteNoise(sampleRate, 0.06, rng);
  applyBiquadFilter(squish, "bp", 2400, 1, sampleRate);
  for (let i = 0; i < squish.length; i++) {
    const t = i / sampleRate;
    squish[i] *= (Math.sin(TWO_PI * 118 * t) > 0.2 ? 1 : 0.1) * Math.exp(-t / 0.02);
  }
  mixBuffer(buf, squish, 0.004, 0.5, sampleRate);
  mixBuffer(
    buf,
    synthesizeGranularDebris(sampleRate, rng, 0.28, 10, {
      from: 0.02,
      fall: 1.6,
      hp: 5000,
      ampFall: 0.08,
    }),
    0,
    0.3,
    sampleRate,
  );
  return buf;
}
const v8 = synthImpactEnemy;

/** 命中玻璃破碎爆裂声 (Bullet Impact Glass) */
function synthImpactGlass(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 0.45);
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.01, 0.002, { hp: 2500 }),
    0,
    1.0,
    sampleRate,
  );
  for (let i = 0; i < 9; i++) {
    const f = randomRange(rng, 3200, 9500);
    mixBuffer(
      buf,
      synthesizeModalBank(
        sampleRate,
        0.1,
        [
          [f, randomRange(rng, 0.01, 0.03), 1],
          [f * 1.47, 0.01, 0.5],
        ],
        rng,
      ),
      Math.pow(rng(), 2) * 0.3,
      randomRange(rng, 0.1, 0.35),
      sampleRate,
    );
  }
  return buf;
}
const x8 = synthImpactGlass;

/** 跳弹啸叫声 (Ricochet Zing) */
function synthRicochet(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.75);
  const startF = [3300, 2700, 3900][variant % 3];
  const endF = [820, 1100, 700][variant % 3];
  let phase = 0;
  const noise = generateWhiteNoise(sampleRate, 0.75, rng);

  for (let i = 0; i < buf.length; i++) {
    const t = i / sampleRate;
    const currentF = endF + (startF - endF) * Math.exp(-t / 0.16);
    const mod = 1 + 0.035 * Math.sin(TWO_PI * (18 + 30 * t) * t);
    phase += (TWO_PI * currentF * mod) / sampleRate;
    buf[i] =
      (Math.sin(phase) + 0.3 * Math.sin(2 * phase)) *
      (1 - Math.exp(-t / 0.004)) *
      Math.exp(-t / 0.19);
  }

  applyDynamicBiquadFilter(
    noise,
    "bp",
    (progress) => endF + (startF - endF) * Math.exp((-progress * 0.75) / 0.16),
    6,
    sampleRate,
  );
  mixBuffer(
    buf,
    applyEnvelope(noise, sampleRate, createExpDecayEnvelope(0.15, 0.003)),
    0,
    1.6,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.01, 0.002, { hp: 2500 }),
    0,
    0.7,
    sampleRate,
  );
  return buf;
}
const y8 = synthRicochet;

/** 子弹近耳掠过音 (Bullet Whiz Flyby) */
function synthBulletWhiz(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.3);
  const noise = generateWhiteNoise(sampleRate, 0.28, rng);
  const startF = [5200, 4300, 6100][variant % 3];
  const endF = [1300, 1000, 1700][variant % 3];
  applyDynamicBiquadFilter(noise, "bp", createFreqSweep(startF, endF, 0.8), 3.5, sampleRate);

  for (let i = 0; i < noise.length; i++) {
    const t = i / sampleRate;
    const offset = (t - 0.05) / (t < 0.05 ? 0.018 : 0.05);
    noise[i] *= Math.exp(-offset * offset);
  }
  mixBuffer(buf, noise, 0, 1.0, sampleRate);
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.006, 0.0008, { hp: 3000 }),
    0.048,
    0.25,
    sampleRate,
  );
  mixBuffer(buf, synthesizeChirp(sampleRate, 0.2, startF * 0.5, endF * 0.6), 0, 0.03, sampleRate);
  return buf;
}
const b8 = synthBulletWhiz;

const quantizePhase = (freq, grid) => Math.round(freq * grid) / grid;

/** 机械飞鸥旋翼轰鸣循环声 (Gull Quad-Rotor Loop Generator) */
function* synthGullRotorLoop(sampleRate, rng) {
  const totalSamples = sampleRate * 2;
  const out = new Float32Array(totalSamples);
  const bladeTones = [
    [184, 2.5],
    [207.5, 3.5],
    [233, 2.0],
    [258.5, 4.5],
  ];

  for (const [toneFreq, toneAmp] of bladeTones) {
    const fBase = quantizePhase(toneFreq, 2);
    const fMod = quantizePhase(toneAmp, 2);
    const p1 = rng() * TWO_PI;
    const p2 = rng() * TWO_PI;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const w = TWO_PI * fBase * t + p1;
      out[i] +=
        (Math.sin(w) +
          0.5 * Math.sin(2 * w + 1) +
          0.3 * Math.sin(3 * w + 2) +
          0.16 * Math.sin(4 * w) +
          0.08 * Math.sin(6 * w)) *
        (0.72 + 0.28 * Math.sin(TWO_PI * fMod * t + p2)) *
        0.25;
    }
    yield;
  }

  const airNoise = buildSeamlessLoop(
    sampleRate,
    2.0,
    rng,
    (buf) => {
      applyBiquadFilter(buf, "hp", 1100, 0.7, sampleRate);
      applyBiquadFilter(buf, "lp", 5200, 0.7, sampleRate);
    },
    0.25,
  );

  const modFreq = quantizePhase(46, 2);
  for (let i = 0; i < totalSamples; i++) {
    out[i] += airNoise[i] * (0.55 + 0.45 * Math.sin((TWO_PI * modFreq * i) / sampleRate)) * 0.5;
  }
  return out;
}
const _8 = synthGullRotorLoop;

/** 机械猎犬伺服电机与液压步态循环声 (Hound Servo Loop) */
function synthHoundServoLoop(sampleRate, rng) {
  const totalSamples = sampleRate * 2;
  const out = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const l = 1.1 * Math.sin(TWO_PI * 0.5 * t) + 0.5 * Math.sin(TWO_PI * 1.5 * t + 1);
    const c = TWO_PI * 310 * t + l;
    const u = 0.7 + 0.3 * Math.sin(TWO_PI * 1.5 * t);
    let sample = (Math.sin(c) + 0.45 * Math.sin(2 * c + l) + 0.2 * Math.sin(4 * c + 0.5)) * 0.3 * u;
    const f = TWO_PI * 62 * t;
    sample +=
      (Math.sin(f) + 0.5 * Math.sin(2 * f) + 0.33 * Math.sin(3 * f) + 0.2 * Math.sin(5 * f)) * 0.28;
    out[i] = sample;
  }

  const gearNoise = buildSeamlessLoop(
    sampleRate,
    2.0,
    rng,
    (buf) => {
      applyBiquadFilter(buf, "hp", 2800, 0.7, sampleRate);
      applyBiquadFilter(buf, "lp", 7000, 0.7, sampleRate);
    },
    0.25,
  );

  for (let i = 0; i < totalSamples; i++) {
    out[i] += gearNoise[i] * 0.12 * (0.6 + 0.4 * Math.sin((TWO_PI * 1.5 * i) / sampleRate + 2));
  }
  return out;
}
const M8 = synthHoundServoLoop;

/** 中继器高频电磁微波蜂鸣循环声 (Relay Hum Loop) */
function synthRelayHumLoop(sampleRate, rng) {
  const totalSamples = sampleRate * 2;
  const out = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const l = TWO_PI * 50 * t; // 50Hz 工频市电谐波
    out[i] =
      (Math.sin(l) * 0.5 +
        Math.sin(2 * l + 0.4) +
        0.5 * Math.sin(3 * l + 1) +
        0.3 * Math.sin(4 * l) +
        0.22 * Math.sin(6 * l + 2) +
        0.12 * Math.sin(10 * l)) *
        0.3 *
        (0.9 + 0.1 * Math.sin(TWO_PI * 0.5 * t)) +
      Math.sin(TWO_PI * 4100 * t) * 0.012 * (0.6 + 0.4 * Math.sin(TWO_PI * 1 * t)) +
      Math.sin(TWO_PI * 1250 * t + 0.6 * Math.sin(TWO_PI * 2 * t)) * 0.02;
  }

  const dischargeNoise = buildSeamlessLoop(
    sampleRate,
    2.0,
    rng,
    (buf) => {
      applyBiquadFilter(buf, "bp", 2100, 1.2, sampleRate);
    },
    0.25,
  );

  for (let i = 0; i < totalSamples; i++) {
    out[i] +=
      dischargeNoise[i] * 0.16 * Math.pow(0.5 + 0.5 * Math.sin((TWO_PI * 100 * i) / sampleRate), 3);
  }
  return out;
}
const w8 = synthRelayHumLoop;

/** 飞鸥等离子脉冲炮击发声 (Gull Plasma Bolt Fire) */
function synthGullFire(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.3);
  const p = variant ? 1.07 : 1.0;
  let phase = 0;
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.008, 0.0012, { hp: 3200 }),
    0,
    1.1,
    sampleRate,
  );

  const plasmaWave = createAudioBufferArray(sampleRate, 0.12);
  for (let i = 0; i < plasmaWave.length; i++) {
    const t = i / sampleRate;
    const f = (380 + 620 * Math.exp(-t / 0.018)) * p;
    phase += f / sampleRate;
    const saw = 2 * (phase - Math.floor(phase)) - 1;
    plasmaWave[i] = (saw + 0.5 * Math.sign(Math.sin(TWO_PI * phase * 2.02))) * Math.exp(-t / 0.024);
  }
  applyBiquadFilter(plasmaWave, "bp", 1500 * p, 0.9, sampleRate);
  mixBuffer(buf, plasmaWave, 0, 1.5, sampleRate);
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.08, 0.014, { bp: 2400 * p, q: 1.4 }),
    0,
    0.7,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.05, 240, 120, 0.012, 0.014),
    0,
    0.5,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.05,
      [
        [3400 * p, 0.006, 1],
        [5200, 0.005, 0.6],
        [1900, 0.008, 0.5],
      ],
      rng,
    ),
    0.021,
    0.2,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.15, 0.04, { hp: 6000 }),
    0.002,
    0.1,
    sampleRate,
  );
  return applySoftSaturation(scaleBuffer(buf, 0.6), 1.6);
}
const E8 = synthGullFire;

/** 猎犬顶部机枪速射声 (Hound Turret Fire) */
function synthHoundFire(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.48);
  const p = variant ? 0.94 : 1.0;
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.012, 0.002, { hp: 1500, lp: 6000 }),
    0,
    0.7,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.3, 112 * p, 37 * p, 0.035, 0.07),
    0,
    1.4,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.3, 0.045, { hp: 90, lp: 900 * p }),
    0,
    1.2,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.12, 0.024, { bp: 420 * p, q: 1.6 }),
    0,
    1.2,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.12,
      [
        [310 * p, 0.03, 1],
        [642 * p, 0.022, 0.7],
        [985 * p, 0.016, 0.5],
        [2200, 0.006, 0.3],
      ],
      rng,
    ),
    0.055,
    0.3,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.02, 0.004, { bp: 1800, q: 1 }),
    0.055,
    0.25,
    sampleRate,
  );
  return applySoftSaturation(scaleBuffer(buf, 0.42), 1.8);
}
const S8 = synthHoundFire;

/** 机械猎犬重质金属踏地声 (Hound Step) */
function synthHoundStep(sampleRate, rng, variant) {
  const buf = createAudioBufferArray(sampleRate, 0.42);
  const p = [1.0, 1.07, 0.93][variant % 3];
  mixBuffer(buf, synthesizeChirp(sampleRate, 0.035, 920 * p, 610 * p), 0, 0.06, sampleRate);

  const contactTime = 0.03;
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.2, 84 * p, 41, 0.03, 0.05, 0.002),
    contactTime,
    1.1,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.12, 0.03, { lp: 360 }),
    contactTime,
    1.1,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.03, 0.006, { lp: 2600, hp: 500 }),
    contactTime,
    0.4,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.12,
      [
        [522 * p, 0.026, 1],
        [1133 * p, 0.02, 0.7],
        [1871 * p, 0.014, 0.5],
        [3040 * p, 0.008, 0.3],
      ],
      rng,
    ),
    contactTime,
    0.2,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.14, 0.04, { hp: 3000, att: 0.006 }),
    contactTime + 0.01,
    0.06,
    sampleRate,
  );
  return applySoftSaturation(buf, 1.5);
}
const T8 = synthHoundStep;

/** 飞鸥击毁自旋下坠与殉爆破裂声 (Gull Death Explosion) */
function synthGullDie(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 1.5);
  const rotorPhases = [0, 0, 0, 0];
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.02, 0.004, { hp: 2500 }),
    0,
    0.9,
    sampleRate,
  );

  const rotorFrequencies = [184, 207, 233, 258];
  const spinSamples = Math.round(1.1 * sampleRate);
  for (let i = 0; i < spinSamples; i++) {
    const t = i / sampleRate;
    const spinFactor = Math.pow(0.16, t) * (1 + 0.06 * Math.sin(TWO_PI * (9 - 5 * t) * t));
    let rotorSum = 0;
    for (let r = 0; r < 4; r++) {
      rotorPhases[r] += (TWO_PI * rotorFrequencies[r] * spinFactor) / sampleRate;
      rotorSum +=
        Math.sin(rotorPhases[r]) +
        0.5 * Math.sin(2 * rotorPhases[r]) +
        0.3 * Math.sin(3 * rotorPhases[r]);
    }
    const stutter = 0.6 + 0.4 * Math.sign(Math.sin(TWO_PI * (26 - 16 * t) * t));
    buf[i] += rotorSum * 0.16 * stutter * Math.exp(-t / 0.55) * (1 - Math.exp(-t / 0.01));
  }

  const fireWhoosh = generateWhiteNoise(sampleRate, 1.0, rng);
  applyDynamicBiquadFilter(fireWhoosh, "bp", createFreqSweep(3200, 500), 1.0, sampleRate);
  mixBuffer(
    buf,
    applyEnvelope(fireWhoosh, sampleRate, createExpDecayEnvelope(0.35, 0.01)),
    0,
    0.3,
    sampleRate,
  );

  const blastTime = 0.72;
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.2, 0.035, { lp: 3000 }),
    blastTime,
    1.0,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.12, 130, 55, 0.02, 0.035),
    blastTime,
    0.8,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.4,
      [
        [705, 0.07, 1],
        [1490, 0.05, 0.7],
        [2610, 0.035, 0.5],
        [4020, 0.02, 0.3],
      ],
      rng,
    ),
    blastTime,
    0.28,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeGranularDebris(sampleRate, rng, 0.7, 26, {
      from: 0.02,
      fall: 1.7,
      hp: 1500,
      ampFall: 0.2,
      maxLen: 0.008,
    }),
    blastTime,
    0.5,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeModalBank(
      sampleRate,
      0.2,
      [
        [1900, 0.03, 1],
        [3350, 0.02, 0.6],
      ],
      rng,
    ),
    blastTime + 0.19,
    0.14,
    sampleRate,
  );
  return applySoftSaturation(buf, 1.4);
}
const A8 = synthGullDie;

/** 猎犬肢体崩解与残骸倒塌声 (Hound Death Collapse) */
function synthHoundDie(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 1.9);
  let motorPhase = 0;
  let whinePhase = 0;
  const engineDecay = createAudioBufferArray(sampleRate, 1.3);

  for (let i = 0; i < engineDecay.length; i++) {
    const t = i / sampleRate;
    const motorFreq = 30 + 112 * Math.pow(1 - t / 1.3, 1.6);
    motorPhase += motorFreq / sampleRate;
    whinePhase += (180 + 1050 * Math.exp(-t / 0.3)) / sampleRate;
    engineDecay[i] =
      (2 * (motorPhase - Math.floor(motorPhase)) - 1) *
        (1 - Math.exp(-t / 0.02)) *
        Math.pow(1 - t / 1.3, 0.7) +
      Math.sin(TWO_PI * whinePhase) * 0.25 * Math.exp(-t / 0.4);
  }
  applyDynamicBiquadFilter(engineDecay, "lp", createFreqSweep(1100, 160), 2.5, sampleRate);
  mixBuffer(buf, engineDecay, 0, 0.55, sampleRate);
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.03, 0.006, { hp: 2000 }),
    0,
    0.5,
    sampleRate,
  );

  // 肢体部件连续撞地破碎
  for (const [crashDelay, crashVol, crashPitch] of [
    [0.62, 1.0, 1.0],
    [0.84, 0.75, 1.22],
    [0.98, 0.5, 0.86],
    [1.17, 0.42, 1.4],
    [1.33, 0.22, 1.1],
  ]) {
    mixBuffer(
      buf,
      synthesizePitchSweepSine(sampleRate, 0.1, 105 * crashPitch, 48, 0.02, 0.035),
      crashDelay,
      crashVol * 0.9,
      sampleRate,
    );
    mixBuffer(
      buf,
      synthesizeNoiseBurst(sampleRate, rng, 0.08, 0.016, { lp: 2400 }),
      crashDelay,
      crashVol * 0.8,
      sampleRate,
    );
    mixBuffer(
      buf,
      synthesizeModalBank(
        sampleRate,
        0.3,
        [
          [388 * crashPitch, 0.07, 1],
          [861 * crashPitch, 0.05, 0.7],
          [1540 * crashPitch, 0.035, 0.5],
          [2750 * crashPitch, 0.02, 0.35],
        ],
        rng,
      ),
      crashDelay,
      crashVol * 0.3,
      sampleRate,
    );
  }
  mixBuffer(
    buf,
    synthesizeGranularDebris(sampleRate, rng, 1.0, 22, {
      from: 0,
      fall: 1.2,
      hp: 1800,
      ampFall: 0.4,
      maxLen: 0.007,
    }),
    0.62,
    0.3,
    sampleRate,
  );
  return applySoftSaturation(scaleBuffer(buf, 0.55), 1.5);
}
const R8 = synthHoundDie;

/** 警报鸣响与敌意锁定蜂鸣 (Enemy Alert Stinger) */
function synthAlert(sampleRate, rng, isHound) {
  const buf = createAudioBufferArray(sampleRate, 0.52);
  const baseFreq = isHound ? 622 : 1320;
  const harmonicFreq = baseFreq * 1.4142;
  let phase = 0;

  const addChirpTone = (startT, dur, freq, chirpRate) => {
    const samples = Math.round(dur * sampleRate);
    const offset = Math.round(startT * sampleRate);
    for (let i = 0; i < samples; i++) {
      const p = i / samples;
      const t = i / sampleRate;
      phase += (TWO_PI * freq * (1 + chirpRate * p)) / sampleRate;
      const wave = Math.sin(phase + 1.6 * Math.sin(phase * 0.25) + 0.4 * Math.sin(TWO_PI * 71 * t));
      buf[offset + i] +=
        Math.tanh(wave * 2.2) *
        Math.min(1, i / (0.004 * sampleRate), (samples - i) / (0.012 * sampleRate));
    }
  };

  addChirpTone(0, 0.09, baseFreq, 0);
  addChirpTone(0.12, 0.17, harmonicFreq, -0.05);
  if (isHound) addChirpTone(0.3, 0.2, baseFreq * 0.5, 0.5);

  applyBiquadFilter(buf, "bp", isHound ? 1100 : 2100, 0.6, sampleRate);
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.4, 0.2, { hp: 4000, att: 0.02 }),
    0,
    0.03,
    sampleRate,
  );
  return buf;
}
const C8 = synthAlert;

/** 激光预警蓄力充能声 (Telegraph Laser Charge) */
function synthTelegraph(sampleRate, rng, isMelee) {
  const buf = createAudioBufferArray(sampleRate, 0.6);
  const len = buf.length;
  const duration = 0.55;
  let phase1 = 0;
  let phase2 = 0;

  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const progress = Math.min(1, t / duration);
    const envelope =
      Math.pow(progress, 1.4) * (t < duration ? 1 : Math.exp(-(t - duration) / 0.008));

    if (isMelee) {
      phase1 += (170 + 380 * progress * progress) / sampleRate;
      phase2 += (680 + 900 * progress) / sampleRate;
      const saw = 2 * (phase1 - Math.floor(phase1)) - 1;
      buf[i] =
        (saw * (0.7 + 0.3 * Math.sin(TWO_PI * 38 * t)) + 0.35 * Math.sin(TWO_PI * phase2)) *
        envelope;
    } else {
      phase1 += (620 + 1900 * Math.pow(progress, 3)) / sampleRate;
      phase2 += ((1240 + 3800 * Math.pow(progress, 3)) * 1.003) / sampleRate;
      buf[i] =
        (Math.sin(TWO_PI * phase1) +
          0.4 * Math.sin(TWO_PI * phase2) +
          0.25 * Math.sign(Math.sin(TWO_PI * phase1 * 0.5))) *
        envelope *
        (0.8 + 0.2 * Math.sin(TWO_PI * (20 + 60 * progress) * t));
    }
  }

  applyBiquadFilter(buf, "lp", isMelee ? 2600 : 7000, 0.7, sampleRate);
  applyBiquadFilter(buf, "hp", isMelee ? 120 : 400, 0.7, sampleRate);

  const blipCount = isMelee ? 7 : 5;
  for (let b = 0; b < blipCount; b++) {
    const blipTime = duration * Math.sqrt(b / blipCount);
    mixBuffer(
      buf,
      synthesizeModalBank(
        sampleRate,
        0.03,
        [
          [isMelee ? 1500 : 3800, 0.004, 1],
          [isMelee ? 2600 : 6100, 0.003, 0.6],
        ],
        rng,
      ),
      blipTime,
      0.12 + (0.2 * b) / blipCount,
      sampleRate,
    );
  }
  return buf;
}
const P8 = synthTelegraph;

/** 巨大爆炸与气浪冲击波 (Massive Explosion Shockwave) */
function synthExplosion(sampleRate, rng, isClose) {
  const buf = createAudioBufferArray(sampleRate, 3.0);
  const p = isClose ? 0.9 : 1.0;
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.03, 0.006, { hp: 1500 }),
    0,
    1.8,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 1.6, 96 * p, 27, 0.16, 0.36, 0.001),
    0,
    0.85,
    sampleRate,
  );

  const rumble = generateWhiteNoise(sampleRate, 1.6, rng);
  applyDynamicBiquadFilter(rumble, "lp", createFreqSweep(2800, 260, 0.5), 0.7, sampleRate);
  mixBuffer(
    buf,
    applyEnvelope(rumble, sampleRate, createExpDecayEnvelope(0.26, 0.002)),
    0,
    3.2,
    sampleRate,
  );

  const subRumble = generateWhiteNoise(sampleRate, 2.6, rng);
  applyBiquadFilter(subRumble, "lp", 120, 0.7, sampleRate);
  mixBuffer(
    buf,
    applyEnvelope(subRumble, sampleRate, createExpDecayEnvelope(0.7, 0.03)),
    0,
    2.2,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.5, 0.09, { bp: 520 * p, q: 1.2 }),
    0,
    1.3,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeGranularDebris(sampleRate, rng, 2.5, 120, {
      from: 0.25,
      fall: 1.5,
      hp: 1500,
      lp: 9000,
      ampFall: 0.8,
      maxLen: 0.01,
    }),
    0,
    0.5,
    sampleRate,
  );

  for (let i = 0; i < 7; i++) {
    const f = randomRange(rng, 900, 3600);
    mixBuffer(
      buf,
      synthesizeModalBank(
        sampleRate,
        0.2,
        [
          [f, randomRange(rng, 0.02, 0.06), 1],
          [f * 1.61, 0.02, 0.5],
        ],
        rng,
      ),
      randomRange(rng, 0.4, 1.9),
      randomRange(rng, 0.03, 0.09),
      sampleRate,
    );
  }
  return applySoftSaturation(scaleBuffer(buf, 0.36), 1.7);
}
const I8 = synthExplosion;

/** 切断/入侵中继器线路电火花声 (Relay Terminal Cut) */
function synthRelayCut(sampleRate, rng) {
  const buf = createAudioBufferArray(sampleRate, 1.7);
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, rng, 0.01, 0.002, { hp: 2500 }),
    0,
    1.0,
    sampleRate,
  );

  const zap = generateWhiteNoise(sampleRate, 0.5, rng);
  applyBiquadFilter(zap, "bp", 3000, 0.8, sampleRate);
  let strobe = 1;
  for (let i = 0; i < zap.length; i++) {
    const t = i / sampleRate;
    if (i % 220 === 0) strobe = rng() < 0.55 + 0.4 * (1 - t / 0.5) ? 1 : 0;
    zap[i] =
      (zap[i] * (Math.sin(TWO_PI * 100 * t) > -0.2 ? 1 : 0.15) +
        0.35 * Math.sign(Math.sin(TWO_PI * 100 * t)) * (rng() - 0.3)) *
      strobe *
      Math.exp(-t / 0.3);
  }
  mixBuffer(buf, zap, 0.005, 0.8, sampleRate);

  const powerDown = createAudioBufferArray(sampleRate, 1.25);
  let phasePower = 0;
  let phaseHum = 0;
  for (let i = 0; i < powerDown.length; i++) {
    const t = i / sampleRate;
    const downProgress = Math.pow(0.22, t / 1.2);
    phasePower += (TWO_PI * 100 * downProgress) / sampleRate;
    phaseHum += (TWO_PI * (150 + 1900 * Math.pow(1 - t / 1.25, 2.2))) / sampleRate;
    powerDown[i] =
      ((Math.sin(phasePower) +
        0.6 * Math.sin(2 * phasePower) +
        0.4 * Math.sin(3 * phasePower) +
        0.25 * Math.sin(5 * phasePower)) *
        0.5 +
        Math.sin(phaseHum) * 0.22) *
      Math.pow(1 - t / 1.25, 1.2) *
      (1 - Math.exp(-t / 0.03));
  }
  mixBuffer(buf, powerDown, 0.4, 0.8, sampleRate);
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.12, 140, 60, 0.03, 0.04),
    0.4,
    0.5,
    sampleRate,
  );
  return applySoftSaturation(buf, 1.3);
}
const z8 = synthRelayCut;

/** 远洋港区雷暴隆隆声 (Thunder Rumble Generator) */
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
const MUSIC_CONFIG = {
  bpm: 100,
  bar: 2.4, // 每小节 2.4 秒 (4/4 拍, 100 BPM)
  loopBars: 8,
  sr: 32000,
};
const Fr = MUSIC_CONFIG;

const CHORD_PROGRESSIONS = [
  { root: 38, tones: [0, 3, 7, 12, 10], base: 50 }, // Dm (D2)
  { root: 34, tones: [0, 4, 7, 12, 11], base: 46 }, // Bb (Bb1)
  { root: 31, tones: [0, 3, 7, 12, 10], base: 43 }, // Gm (G1)
  { root: 33, tones: [0, 5, 7, 12, 10], base: 45 }, // Am / Asust4 (A1)
];
const Cv = CHORD_PROGRESSIONS;

/** 模拟三振荡器模拟合成器厚重铺底声音色 (Analog Detuned Poly Synth Tone) */
function synthDetunedPolyTone(sampleRate, freq, duration, attack, release, detuneAmount, rng) {
  const totalSamples = Math.round((duration + release) * sampleRate);
  const out = new Float32Array(totalSamples);
  const phases = [rng(), rng(), rng()];
  const detunePoles = [1 - detuneAmount, 1.0, 1 + detuneAmount * 1.1];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sumSaw = 0;
    for (let v = 0; v < 3; v++) {
      phases[v] += (freq * detunePoles[v]) / sampleRate;
      phases[v] -= Math.floor(phases[v]);
      sumSaw += 2 * phases[v] - 1;
    }
    const env =
      t < duration
        ? 1 - Math.exp(-t / attack)
        : (1 - Math.exp(-duration / attack)) * Math.exp(-(t - duration) / (release * 0.3));
    out[i] = sumSaw * env * 0.33;
  }
  applyBoundaryFade(out, sampleRate, 0, 0.1);
  return out;
}
const Jb = synthDetunedPolyTone;

/** 音乐第 1 轨：环境模拟温暖低音 Drone 循环 (Layer 1: Ambient Drone) */
function* synthMusicDroneTrack(sampleRate, rng) {
  const totalSec = MUSIC_CONFIG.bar * 8;
  const totalSamples = Math.round(totalSec * sampleRate);

  const buildChannel = function* (chRng) {
    const track = new Float32Array(totalSamples);
    for (let c = 0; c < 4; c++) {
      const chord = CHORD_PROGRESSIONS[c];
      const chordTime = c * 4.8;
      for (const [interval, gain] of [
        [0, 1.0],
        [7, 0.6],
        [12, 0.5],
        [chord.tones[1] + 12, 0.28],
      ]) {
        mixBufferWrapped(
          track,
          synthDetunedPolyTone(
            sampleRate,
            midiToFreq(chord.root + interval),
            4.6,
            1.3,
            1.8,
            0.0035,
            chRng,
          ),
          chordTime - 0.5,
          gain * 0.3,
          sampleRate,
        );
        yield;
      }
    }
    mixBufferWrapped(
      track,
      synthDetunedPolyTone(sampleRate, midiToFreq(26), totalSec - 0.2, 2.5, 0.2, 0.002, chRng),
      0.1,
      0.16,
      sampleRate,
    );
    yield;
    applyDynamicBiquadFilter(
      track,
      "lp",
      (progress) =>
        560 + 300 * Math.sin(TWO_PI * progress * 2) + 120 * Math.sin(TWO_PI * progress * 5 + 1),
      0.9,
      sampleRate,
      2,
    );
    yield;
    return track;
  };

  const seed = Math.floor(rng() * 1e9);
  return [yield* buildChannel(createPrng(seed)), yield* buildChannel(createPrng(seed + 443))];
}
const G8 = synthMusicDroneTrack;

/** 16分音符 Acid/Bass 弹拨音 (Acid Bass Pluck) */
function synthAcidBassPluck(sampleRate, freq, brightness) {
  const totalSamples = Math.round(0.42 * sampleRate);
  const out = new Float32Array(totalSamples);
  let sawPhase1 = 0;
  let sawPhase2 = 0;
  let f1 = 0;
  let f2 = 0;
  let pole = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    sawPhase1 += freq / sampleRate;
    sawPhase1 -= Math.floor(sawPhase1);
    sawPhase2 += (freq * 0.5) / sampleRate;
    sawPhase2 -= Math.floor(sawPhase2);

    const raw = 2 * sawPhase1 - 1 + 0.4 * (sawPhase2 < 0.5 ? 1 : -1);
    if ((i & 15) === 0) {
      pole = 1 - Math.exp((-TWO_PI * (300 + 2600 * brightness * Math.exp(-t / 0.06))) / sampleRate);
    }
    f1 += (raw - f1) * pole;
    f2 += (f1 - f2) * pole;
    out[i] = f2 * Math.exp(-t / 0.1) * Math.min(1, i / 40);
  }
  applyBoundaryFade(out, sampleRate, 0, 0.03);
  return out;
}
const n_ = synthAcidBassPluck;

/** 音乐第 2 轨：紧张度 16 分音符贝斯持续律动 (Layer 2: Bass Ostinato) */
function* synthMusicOstinatoTrack(sampleRate) {
  const totalSec = MUSIC_CONFIG.bar * 8;
  const track = new Float32Array(Math.round(totalSec * sampleRate));
  const patternIndex = [0, 0, 2, 0, 1, 0, 2, 0, 3, 0, 2, 0, 1, 0, 4, 2];
  const velocities = [
    1.0, 0.45, 0.7, 0.45, 0.85, 0.45, 0.7, 0.5, 1.0, 0.45, 0.7, 0.45, 0.85, 0.5, 0.8, 0.6,
  ];

  for (let step = 0; step < 128; step++) {
    const chord = CHORD_PROGRESSIONS[(step >> 5) & 3];
    const pat16 = step & 15;
    const note = n_(
      sampleRate,
      midiToFreq(chord.base + chord.tones[patternIndex[pat16]]),
      velocities[pat16],
    );
    mixBufferWrapped(track, note, step * 0.15, 0.5 * (0.5 + 0.5 * velocities[pat16]), sampleRate);
    mixBufferWrapped(track, note, step * 0.15 + 0.45, 0.14, sampleRate);
    if ((step & 7) === 7) yield;
  }
  return track;
}
const q8 = synthMusicOstinatoTrack;

/** 音乐第 3 轨：重工业硬核打击乐鼓点节奏 (Layer 3: Industrial Percussion Loop) */
function* synthMusicPercussionTrack(sampleRate, rng) {
  const totalSec = MUSIC_CONFIG.bar * 4;
  const track = new Float32Array(Math.round(totalSec * sampleRate));

  const synthKick = () =>
    sumTracks(
      Math.round(0.9 * sampleRate),
      [synthesizePitchSweepSine(sampleRate, 0.9, 74, 34, 0.07, 0.24, 0.002), 1.0],
      [synthesizeNoiseBurst(sampleRate, rng, 0.4, 0.07, { lp: 240 }), 1.2],
      [synthesizeNoiseBurst(sampleRate, rng, 0.05, 0.008, { bp: 1400, q: 0.8 }), 0.25],
    );

  const synthSnare = (f) =>
    sumTracks(
      Math.round(0.5 * sampleRate),
      [synthesizePitchSweepSine(sampleRate, 0.5, f, f * 0.55, 0.05, 0.12, 0.002), 1.0],
      [synthesizeNoiseBurst(sampleRate, rng, 0.1, 0.02, { lp: 600 }), 0.5],
    );

  const synthHiHat = (accent) =>
    synthesizeNoiseBurst(sampleRate, rng, 0.06, 0.008 + accent * 0.01, { hp: 6500 });

  for (let bar = 0; bar < 4; bar++) {
    const barStart = bar * 2.4;
    mixBufferWrapped(track, synthKick(), barStart, 1.0, sampleRate);
    mixBufferWrapped(track, synthSnare(104), barStart + 1.5, 0.55, sampleRate);
    if (bar % 2 === 1) mixBufferWrapped(track, synthKick(), barStart + 2.1, 0.6, sampleRate);

    for (let h = 0; h < 16; h++) {
      mixBufferWrapped(
        track,
        synthHiHat(h % 4 === 2 ? 1 : 0),
        barStart + h * 0.15,
        h % 4 === 2 ? 0.34 : h % 2 ? 0.11 : 0.2,
        sampleRate,
      );
    }
    yield;
  }

  // 加花过门 (Fill)
  for (const [fillStep, tomFreq] of [
    [12, 120],
    [13, 104],
    [14, 88],
    [15, 74],
  ]) {
    mixBufferWrapped(track, synthSnare(tomFreq), 7.2 + fillStep * 0.15, 0.6, sampleRate);
  }
  return applySoftSaturation(track, 1.3);
}
const X8 = synthMusicPercussionTrack;

/** 铜管合成和弦长音 (Synth Brass Chord) */
function synthBrassChordVoice(sampleRate, freq, duration) {
  const totalSamples = Math.round(duration * sampleRate);
  const out = new Float32Array(totalSamples);
  let p1 = 0;
  let p2 = 0;
  let z1 = 0;
  let z2 = 0;
  let filterCoeffs = null;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = i / totalSamples;
    const swell = Math.pow(Math.sin(Math.PI * Math.pow(progress, 0.8)), 1.5);
    const detuneLFO = 1 + 0.004 * Math.sin(TWO_PI * 5.1 * t) * Math.min(1, t);

    p1 += (freq * detuneLFO) / sampleRate;
    p1 -= Math.floor(p1);
    p2 += (freq * 1.004 * detuneLFO) / sampleRate;
    p2 -= Math.floor(p2);

    if ((i & 31) === 0) {
      filterCoeffs = calcBiquadCoefficients("lp", 240 + 1700 * swell * swell, 1.1, sampleRate);
    }

    const saw = 2 * p1 - 1 + (2 * p2 - 1);
    const filtered = filterCoeffs[0] * saw + z1;
    z1 = filterCoeffs[1] * saw - filterCoeffs[3] * filtered + z2;
    z2 = filterCoeffs[2] * saw - filterCoeffs[4] * filtered;
    out[i] = filtered * swell * 0.5;
  }
  return out;
}
const $c = synthBrassChordVoice;

/** 音乐第 4 轨：战术高潮铜管垫乐 (Layer 4: Climax Brass Pad) */
function* synthMusicBrassTrack(sampleRate) {
  const totalSec = MUSIC_CONFIG.bar * 8;
  const track = new Float32Array(Math.round(totalSec * sampleRate));
  for (let c = 0; c < 4; c++) {
    const chord = CHORD_PROGRESSIONS[c];
    for (const [interval, gain] of [
      [12, 1.0],
      [19, 0.7],
      [24 + chord.tones[1], 0.5],
      [24, 0.4],
    ]) {
      mixBufferWrapped(
        track,
        synthBrassChordVoice(sampleRate, midiToFreq(chord.root + interval), 4.7),
        c * 4.8 + 0.05,
        gain * 0.3,
        sampleRate,
      );
      yield;
    }
  }
  return track;
}
const Y8 = synthMusicBrassTrack;

/** 钟琴高音敲击 (Bell Chime Tone) */
function synthBellTone(sampleRate, freq, duration) {
  const out = synthesizeModalBank(sampleRate, duration, [
    [freq, duration * 0.3, 1.0],
    [freq * 2.003, duration * 0.18, 0.4],
    [freq * 3.01, duration * 0.1, 0.18],
    [freq * 4.2, duration * 0.05, 0.1],
    [freq * 0.5, duration * 0.3, 0.25],
  ]);
  const fadeSamples = Math.round(0.006 * sampleRate);
  for (let i = 0; i < fadeSamples; i++) out[i] *= i / fadeSamples;
  applyBoundaryFade(out, sampleRate, 0, 0.2);
  return out;
}
const Pf = synthBellTone;

/** 音乐第 5 轨：工业冷寂铃音主题 (Layer 5: Motif Chime) */
function* synthMusicMotifTrack(sampleRate) {
  const totalSec = MUSIC_CONFIG.bar * 8;
  const track = new Float32Array(Math.round(totalSec * sampleRate));

  const addBellNote = (startSec, midiNote, gain) => {
    const tone = synthBellTone(sampleRate, midiToFreq(midiNote), 3.2);
    mixBufferWrapped(track, tone, startSec, gain, sampleRate);
    mixBufferWrapped(track, tone, startSec + 0.45, gain * 0.28, sampleRate);
    mixBufferWrapped(track, tone, startSec + 0.9, gain * 0.1, sampleRate);
  };

  for (const [startT, midi] of [
    [0, 62],
    [0.9, 69],
    [1.8, 70],
    [3, 65],
  ]) {
    addBellNote(startT, midi, 0.5);
    yield;
  }
  for (const [startT, midi] of [
    [0, 62],
    [0.9, 69],
    [1.8, 72],
    [3, 67],
  ]) {
    addBellNote(9.6 + startT, midi, 0.42);
    yield;
  }
  return track;
}
const $8 = synthMusicMotifTrack;

/** 单个中继站入侵成功胜利和弦 (Single Relay Objective Done) */
function* synthObjectiveDoneSting(sampleRate) {
  const buf = createAudioBufferArray(sampleRate, 2.8);
  [57, 62, 65, 69].forEach((midi, idx) => {
    mixBuffer(
      buf,
      synthBellTone(sampleRate, midiToFreq(midi), 1.6),
      idx * 0.15,
      0.45 + idx * 0.08,
      sampleRate,
    );
    mixBuffer(
      buf,
      synthAcidBassPluck(sampleRate, midiToFreq(midi), 0.8),
      idx * 0.15,
      0.35,
      sampleRate,
    );
  });
  yield;
  mixBuffer(buf, synthBrassChordVoice(sampleRate, midiToFreq(62), 2.2), 0.6, 0.55, sampleRate);
  yield;
  return buf;
}
const Z8 = synthObjectiveDoneSting;

/** 全部三处中继站切断终极号角 (All Relays Complete Fanfare) */
function* synthObjectiveAllDoneSting(sampleRate) {
  const buf = createAudioBufferArray(sampleRate, 4.2);
  [50, 57, 62, 65, 69, 74].forEach((midi, idx) => {
    mixBuffer(buf, synthBellTone(sampleRate, midiToFreq(midi), 2.5), idx * 0.14, 0.5, sampleRate);
    mixBuffer(
      buf,
      synthAcidBassPluck(sampleRate, midiToFreq(midi - 12), 0.9),
      idx * 0.14,
      0.4,
      sampleRate,
    );
  });
  yield;
  mixBuffer(buf, synthBrassChordVoice(sampleRate, midiToFreq(50), 3.4), 0.8, 0.7, sampleRate);
  yield;
  return buf;
}
const j8 = synthObjectiveAllDoneSting;

/** 撤离完成行动通报胜利结算音乐 (Mission Complete Victory Theme) */
function* synthCompleteTheme(sampleRate) {
  const buf = createAudioBufferArray(sampleRate, 7.5);
  /** @type {Array<[number, number[], number]>} */
  const chords = [
    [50, [0, 7, 12, 16], 0],
    [46, [0, 7, 12, 15], 1.8],
    [43, [0, 7, 12, 15], 3.6],
    [45, [0, 7, 12, 17], 5.2],
  ];

  for (const [root, notes, startT] of chords) {
    for (const interval of notes) {
      mixBuffer(
        buf,
        synthBrassChordVoice(sampleRate, midiToFreq(root + interval), 2.2),
        startT,
        0.35,
        sampleRate,
      );
    }
    mixBuffer(
      buf,
      synthDetunedPolyTone(
        sampleRate,
        midiToFreq(root - 12),
        2.0,
        0.3,
        0.6,
        0.003,
        createPrng(root),
      ),
      startT,
      0.4,
      sampleRate,
    );
    yield;
  }
  return applySoftSaturation(buf, 1.2);
}
const J8 = synthCompleteTheme;

/** 阵亡特遣干员心跳骤停与哀乐 (Death Defeat Theme) */
function* synthDeathTheme(sampleRate) {
  const buf = createAudioBufferArray(sampleRate, 5.0);
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 1.2, 58, 22, 0.2, 0.5, 0.002),
    0,
    1.3,
    sampleRate,
  );
  mixBuffer(
    buf,
    synthesizeNoiseBurst(sampleRate, createPrng(100), 1.5, 0.3, { lp: 160 }),
    0,
    1.5,
    sampleRate,
  );
  yield;

  [38, 41, 45, 48].forEach((midi, idx) => {
    mixBuffer(
      buf,
      synthDetunedPolyTone(sampleRate, midiToFreq(midi), 3.5, 0.8, 1.2, 0.004, createPrng(midi)),
      0.3 + idx * 0.1,
      0.3,
      sampleRate,
    );
  });
  yield;
  return buf;
}
const K8 = synthDeathTheme;

// ============================================================================
// 五、 全局声音资产表与音频注册管理 (Sound Registry)
// ============================================================================

const SAMPLE_RATE_HI = 44100;
const SAMPLE_RATE_MED = 32000;
const SAMPLE_RATE_LOW = 22050;

const ki = SAMPLE_RATE_HI;
const Xn = SAMPLE_RATE_MED;
const pl = SAMPLE_RATE_LOW;

/**
 * 完整程序化音效资产注册元数据表
 */
const SOUND_REGISTRY = {
  // 制式武器与换弹系统
  rifle_shot: { gen: KR, n: 4, sr: ki, peak: 0.97, bus: "near", max: 5, pri: 9, boot: 1 },
  shotgun_shot: {
    gen: synthesizeShotgunShot,
    n: 4,
    sr: ki,
    peak: 1.0,
    bus: "near",
    max: 4,
    pri: 9,
    boot: 1,
  },
  smg_shot: {
    gen: synthesizeSmgShot,
    n: 4,
    sr: ki,
    peak: 0.95,
    bus: "near",
    max: 6,
    pri: 9,
    boot: 1,
  },
  sniper_shot: {
    gen: synthesizeSniperShot,
    n: 3,
    sr: ki,
    peak: 1.05,
    bus: "near",
    max: 3,
    pri: 9,
    boot: 1,
  },
  rifle_tail_out: { gen: QR, n: 2, sr: Xn, peak: 0.5, bus: "dry", max: 3, pri: 8, boot: 1 },
  rifle_tail_in: { gen: e8, n: 2, sr: Xn, peak: 0.62, bus: "dry", max: 3, pri: 8, boot: 1 },
  rifle_dry: { gen: t8, n: 1, sr: ki, peak: 0.5, bus: "near", max: 2, pri: 6, boot: 1 },
  reload_magout: { gen: n8, n: 1, sr: ki, peak: 0.6, bus: "near", max: 2, pri: 6 },
  reload_magin: { gen: i8, n: 1, sr: ki, peak: 0.65, bus: "near", max: 2, pri: 6 },
  reload_bolt: { gen: s8, n: 1, sr: ki, peak: 0.8, bus: "near", max: 2, pri: 6 },
  shell_bounce: { gen: o8, n: 3, sr: ki, peak: 0.3, bus: "world", max: 4, pri: 1, ref: 2, roll: 1 },
  shell_bounce_metal: {
    gen: synthShellBounceMetal,
    n: 4,
    sr: ki,
    peak: 0.35,
    bus: "world",
    max: 5,
    pri: 2,
    ref: 2,
    roll: 1,
  },
  shell_bounce_concrete: {
    gen: synthShellBounceConcrete,
    n: 3,
    sr: ki,
    peak: 0.3,
    bus: "world",
    max: 4,
    pri: 1,
    ref: 2,
    roll: 1,
  },
  shell_bounce_wood: {
    gen: synthShellBounceWood,
    n: 3,
    sr: ki,
    peak: 0.32,
    bus: "world",
    max: 4,
    pri: 1,
    ref: 2,
    roll: 1,
  },
  rain_metal_patter: { gen: synthRainMetalPatter, n: 1, sr: Xn, peak: 0.55, loop: 1 },
  rain_puddle_drips: { gen: synthRainPuddleDrips, n: 1, sr: Xn, peak: 0.6, loop: 1 },

  // 玩家机动与受击
  step_concrete: { gen: r8, n: 4, sr: Xn, peak: 0.45, bus: "near", max: 3, pri: 3, boot: 1 },
  step_water: { gen: a8, n: 3, sr: Xn, peak: 0.5, bus: "near", max: 3, pri: 3, boot: 1 },
  step_metal: { gen: l8, n: 3, sr: Xn, peak: 0.5, bus: "near", max: 3, pri: 3, boot: 1 },
  land: { gen: c8, n: 1, sr: Xn, peak: 0.7, bus: "near", max: 2, pri: 4 },
  jump: { gen: u8, n: 1, sr: Xn, peak: 0.35, bus: "near", max: 2, pri: 3 },
  hurt: { gen: h8, n: 1, sr: Xn, peak: 0.85, bus: "dry", max: 2, pri: 8 },
  ear_ring: { gen: f8, n: 1, sr: pl, peak: 0.2, bus: "dry", max: 1, pri: 5 },

  // 弹道命中表面与近失弹
  impact_metal: {
    gen: d8,
    n: 3,
    sr: ki,
    peak: 0.7,
    bus: "world",
    max: 4,
    pri: 4,
    ref: 4,
    roll: 0.7,
  },
  impact_concrete: {
    gen: p8,
    n: 3,
    sr: ki,
    peak: 0.7,
    bus: "world",
    max: 4,
    pri: 4,
    ref: 4,
    roll: 0.7,
  },
  impact_wood: {
    gen: m8,
    n: 2,
    sr: ki,
    peak: 0.7,
    bus: "world",
    max: 3,
    pri: 4,
    ref: 4,
    roll: 0.7,
  },
  impact_water: {
    gen: g8,
    n: 2,
    sr: Xn,
    peak: 0.6,
    bus: "world",
    max: 3,
    pri: 4,
    ref: 4,
    roll: 0.7,
  },
  impact_enemy: {
    gen: v8,
    n: 3,
    sr: ki,
    peak: 0.75,
    bus: "world",
    max: 4,
    pri: 5,
    ref: 5,
    roll: 0.6,
  },
  impact_glass: {
    gen: x8,
    n: 1,
    sr: ki,
    peak: 0.6,
    bus: "world",
    max: 2,
    pri: 4,
    ref: 4,
    roll: 0.7,
  },
  whiz: { gen: b8, n: 3, sr: ki, peak: 0.5, bus: "world", max: 3, pri: 5, ref: 2.5, roll: 0.6 },
  ricochet: { gen: y8, n: 3, sr: ki, peak: 0.4, bus: "world", max: 2, pri: 3, ref: 5, roll: 0.6 },

  // 机械敌军战术交火与步态
  gull_fire: {
    gen: E8,
    n: 2,
    sr: ki,
    peak: 0.85,
    bus: "world",
    max: 5,
    pri: 7,
    ref: 7,
    roll: 0.55,
  },
  hound_fire: {
    gen: S8,
    n: 2,
    sr: ki,
    peak: 0.95,
    bus: "world",
    max: 5,
    pri: 7,
    ref: 8,
    roll: 0.5,
  },
  hound_step: { gen: T8, n: 3, sr: Xn, peak: 0.7, bus: "world", max: 4, pri: 3, ref: 5, roll: 0.8 },
  gull_die: { gen: A8, n: 1, sr: Xn, peak: 0.85, bus: "world", max: 3, pri: 7, ref: 7, roll: 0.5 },
  hound_die: { gen: R8, n: 1, sr: Xn, peak: 0.9, bus: "world", max: 3, pri: 7, ref: 7, roll: 0.5 },
  telegraph: { gen: P8, n: 2, sr: Xn, peak: 0.42, bus: "world", max: 4, pri: 6, ref: 6, roll: 0.6 },
  alert: { gen: C8, n: 2, sr: Xn, peak: 0.5, bus: "world", max: 3, pri: 6, ref: 8, roll: 0.5 },
  explosion: {
    gen: I8,
    n: 2,
    sr: ki,
    peak: 0.97,
    bus: "world",
    max: 3,
    pri: 10,
    ref: 12,
    roll: 0.5,
  },
  relay_cut: { gen: z8, n: 1, sr: Xn, peak: 0.75, bus: "world", max: 2, pri: 8, ref: 6, roll: 0.5 },

  // 港区环境音景
  thunder: { gen: D8, n: 2, sr: pl, peak: 0.8, bus: "dry", max: 2, pri: 6 },
  foghorn: { gen: L8, n: 1, sr: pl, peak: 0.5, bus: "world", max: 1, pri: 2 },
  gull_cry: { gen: k8, n: 2, sr: pl, peak: 0.4, bus: "world", max: 2, pri: 1 },
  halyard: { gen: F8, n: 2, sr: Xn, peak: 0.3, bus: "world", max: 2, pri: 1 },
  container_bang: { gen: U8, n: 1, sr: pl, peak: 0.6, bus: "world", max: 1, pri: 2 },
  ui_click: { gen: N8, n: 1, sr: ki, peak: 0.3, bus: "dry", max: 2, pri: 9 },
  ui_hover: { gen: B8, n: 1, sr: ki, peak: 0.12, bus: "dry", max: 2, pri: 9 },

  // 战术任务音乐刺音 (Stings)
  objective: { gen: Z8, n: 1, sr: Xn, peak: 0.6, bus: "music", max: 1, pri: 9 },
  objective_all: { gen: j8, n: 1, sr: Xn, peak: 0.65, bus: "music", max: 1, pri: 9 },
  complete: { gen: J8, n: 1, sr: Xn, peak: 0.7, bus: "music", max: 1, pri: 9 },
  death: { gen: K8, n: 1, sr: Xn, peak: 0.75, bus: "music", max: 1, pri: 9 },

  // 循环音频 (Loops)
  gull_rotor: { gen: _8, n: 1, sr: Xn, peak: 0.6, loop: 1, ref: 5, roll: 0.9 },
  hound_servo: { gen: M8, n: 1, sr: Xn, peak: 0.42, loop: 1, ref: 4, roll: 1.0 },
  relay_hum: { gen: w8, n: 1, sr: Xn, peak: 0.4, loop: 1, ref: 2.5, roll: 1.4 },
  rain: { gen: O8, n: 1, sr: Xn, peak: 0.5, loop: 1 },
  rain_interior: { gen: H8, n: 1, sr: Xn, peak: 0.7, loop: 1 },
  wind: { gen: V8, n: 1, sr: pl, peak: 0.5, loop: 1 },
  sea: { gen: W8, n: 1, sr: pl, peak: 0.5, loop: 1, ref: 10, roll: 0.6 },

  // 5 轨自适应交战音乐层 (5 Adaptive Music Layers)
  music_drone: { gen: G8, n: 1, sr: Fr.sr, peak: 0.5, loop: 1, music: 1 },
  music_ost: { gen: q8, n: 1, sr: Fr.sr, peak: 0.45, loop: 1, music: 1 },
  music_perc: { gen: X8, n: 1, sr: Fr.sr, peak: 0.6, loop: 1, music: 1 },
  music_brass: { gen: Y8, n: 1, sr: Fr.sr, peak: 0.5, loop: 1, music: 1 },
  music_motif: { gen: $8, n: 1, sr: Fr.sr, peak: 0.4, loop: 1, music: 1 },

  // 空间混响脉冲响应 (Convolution Reverb IRs)
  ir_outdoor: { gen: QR, n: 1, sr: null, peak: 0.9, ir: 1 },
  ir_shed: { gen: e8, n: 1, sr: null, peak: 0.9, ir: 1 },
};

const Go = SOUND_REGISTRY;

// 别名重定向映射表 (Alias Redirection)
const SOUND_ALIASES = {
  footstep: "step_concrete",
  impact: "impact_concrete",
  hurt: "hurt",
  objective_done: "objective",
  extraction: "complete",
  enemy_alert: "alert",
};
const i_ = SOUND_ALIASES;

// 物理表面命中与脚步材质映射表
const SURFACE_IMPACT_MAP = {
  metal: "impact_metal",
  concrete: "impact_concrete",
  wood: "impact_wood",
  water: "impact_water",
  glass: "impact_glass",
  dirt: "impact_concrete",
  rubber: "impact_wood",
};
const l_ = SURFACE_IMPACT_MAP;

const SURFACE_STEP_MAP = {
  metal: "step_metal",
  water: "step_water",
  concrete: "step_concrete",
  wood: "step_concrete",
  dirt: "step_concrete",
  glass: "step_concrete",
  rubber: "step_concrete",
};
export { SOUND_REGISTRY, SOUND_ALIASES, SURFACE_STEP_MAP, SURFACE_IMPACT_MAP };

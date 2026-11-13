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

export {
  synthesizeRifleShot,
  synthesizeShotgunShot,
  synthesizeSmgShot,
  synthesizeSniperShot,
  synthDryFire,
  synthSlidingFriction,
  synthReloadMagOut,
  synthReloadMagIn,
  synthReloadBolt,
  synthShellBounce,
  synthShellBounceMetal,
  synthShellBounceConcrete,
  synthShellBounceWood,
};

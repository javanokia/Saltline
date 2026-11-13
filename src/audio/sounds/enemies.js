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

const quantizePhase = (freq, grid) => Math.round(freq * grid) / grid;

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

export {
  synthGullRotorLoop,
  synthHoundServoLoop,
  synthRelayHumLoop,
  synthGullFire,
  synthHoundFire,
  synthHoundStep,
  synthGullDie,
  synthHoundDie,
  synthAlert,
  synthTelegraph,
  synthExplosion,
  synthRelayCut,
};

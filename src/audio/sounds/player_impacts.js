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

export {
  synthRainMetalPatter,
  synthRainPuddleDrips,
  synthStepConcrete,
  synthWaterSplash,
  synthStepWater,
  synthStepMetal,
  synthLand,
  synthJump,
  synthHurt,
  synthEarRing,
  synthImpactMetal,
  synthImpactConcrete,
  synthImpactWood,
  synthImpactWater,
  synthImpactEnemy,
  synthImpactGlass,
  synthRicochet,
  synthBulletWhiz,
};

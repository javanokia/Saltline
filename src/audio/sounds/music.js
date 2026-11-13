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

export {
  MUSIC_CONFIG,
  CHORD_PROGRESSIONS,
  synthDetunedPolyTone,
  synthMusicDroneTrack,
  synthAcidBassPluck,
  synthMusicOstinatoTrack,
  synthMusicPercussionTrack,
  synthBrassChordVoice,
  synthMusicBrassTrack,
  synthBellTone,
  synthMusicMotifTrack,
  synthObjectiveDoneSting,
  synthObjectiveAllDoneSting,
  synthCompleteTheme,
  synthDeathTheme,
  Fr,
  Jb,
  n_,
  Pf,
};

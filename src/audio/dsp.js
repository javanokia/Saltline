/**
 * @file src/audio/dsp.js
 * @description 数字信号处理与波形合成原语库 (DSP Core Math, Envelope & Filters)
 */

const TWO_PI = Math.PI * 2;

/**
 * 乘同余 / 散列伪随机数生成器 (Mulberry32-like PRNG)
 * 返回 [0, 1) 的确定性单精度浮点数
 * @param {number} seed 整数种子
 * @returns {() => number}
 */
function createPrng(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a 32位哈希算法 (用于根据音效名称与参数生成确定性随机种子)
 * @param {string} str 输入字符串
 * @returns {number} 32位无符号整数
 */
function hashFnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * 创建音频缓冲区样本数组
 * @param {number} sampleRate 采样率 (Hz)
 * @param {number} duration 时长 (秒)
 * @returns {Float32Array}
 */
const createAudioBufferArray = (sampleRate, duration) =>
  new Float32Array(Math.max(1, Math.round(sampleRate * duration)));

/**
 * 标量在 [min, max] 区间内的随机浮点插值
 */
const randomRange = (rng, min, max) => min + (max - min) * rng();

/**
 * MIDI 音高音符转基频频率 (Hz)
 * A4 (MIDI 69) = 440 Hz
 * @param {number} midiNote
 * @returns {number}
 */
const midiToFreq = (midiNote) => 440 * Math.pow(2, (midiNote - 69) / 12);

/**
 * 生成白噪声 Float32 样本数组
 * @param {number} sampleRate
 * @param {number} duration
 * @param {() => number} rng
 * @returns {Float32Array}
 */
function generateWhiteNoise(sampleRate, duration, rng) {
  const buf = createAudioBufferArray(sampleRate, duration);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = rng() * 2 - 1;
  }
  if (audioTagObserver) {
    audioTagObserver(buf, { kind: "基础噪声", detail: "固定种子随机采样" });
  }
  return buf;
}

/**
 * 计算数字双二阶滤波器归一化系数 (Biquad Filter Coefficients: LP / HP / BP)
 * 基于 Direct Form II Canonical 架构设计
 * @param {'lp'|'hp'|'bp'} type 滤波器类型 (lowpass / highpass / bandpass)
 * @param {number} cutoff 截止频率 (Hz)
 * @param {number} Q 品质因数 (Resonance Q)
 * @param {number} sampleRate 采样率
 * @returns {number[]} [b0/a0, b1/a0, b2/a0, a1/a0, a2/a0]
 */
function calcBiquadCoefficients(type, cutoff, Q, sampleRate) {
  const w0 = (TWO_PI * Math.max(10, Math.min(cutoff, sampleRate * 0.47))) / sampleRate;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);
  const alpha = sinW / (2 * Q);

  let b0, b1, b2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW;
  const a2 = 1 - alpha;

  if (type === "lp") {
    b0 = (1 - cosW) / 2;
    b1 = 1 - cosW;
    b2 = b0;
  } else if (type === "hp") {
    b0 = (1 + cosW) / 2;
    b1 = -(1 + cosW);
    b2 = b0;
  } else {
    // bandpass (constant skirt gain, peak gain = Q)
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  }

  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

/**
 * 原地应用静态双二阶滤波器 (In-place Static Biquad Filtering)
 */
function applyBiquadFilter(buffer, type, cutoff, Q, sampleRate) {
  const [b0, b1, b2, a1, a2] = calcBiquadCoefficients(type, cutoff, Q, sampleRate);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < buffer.length; i++) {
    const input = buffer[i];
    const output = b0 * input + z1;
    z1 = b1 * input - a1 * output + z2;
    z2 = b2 * input - a2 * output;
    buffer[i] = output;
  }
  return buffer;
}

/**
 * 原地应用时变动态双二阶滤波器 (Time-Varying Dynamic Cutoff Biquad Filtering)
 * 每 32 个采样点重算一次系数以兼顾高性能与连续包络滤波
 * 修正：移除函数静态变量跨调用污染，多 pass 级联时原地写入滤波缓冲
 */
function applyDynamicBiquadFilter(buffer, type, cutoffFn, Q, sampleRate, passes = 1) {
  const len = buffer.length;
  for (let p = 0; p < passes; p++) {
    let z1 = 0;
    let z2 = 0;
    let coeffs = null;

    for (let i = 0; i < len; i++) {
      if ((i & 31) === 0) {
        const normTime = i / len;
        const currentCutoff = typeof cutoffFn === "function" ? cutoffFn(normTime) : cutoffFn;
        const currentQ = typeof Q === "function" ? Q(normTime) : Q;
        coeffs = calcBiquadCoefficients(type, currentCutoff, currentQ, sampleRate);
      }
      const input = buffer[i];
      const output = coeffs[0] * input + z1;
      z1 = coeffs[1] * input - coeffs[3] * output + z2;
      z2 = coeffs[2] * input - coeffs[4] * output;
      buffer[i] = output;
    }
  }
  return buffer;
}

/**
 * 指数频扫包络生成器
 */
const createFreqSweep =
  (startFreq, endFreq, curvePower = 1) =>
  (t) =>
    startFreq * Math.pow(endFreq / startFreq, Math.pow(t, curvePower));

/**
 * 原地应用时域增益包络
 */
function applyEnvelope(buffer, sampleRate, envFn) {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] *= envFn(i / sampleRate);
  }
  return buffer;
}

/**
 * 指数衰减 / 起音衰减包络曲线构造器
 * @param {number} decayTime 衰减特征时间
 * @param {number} [attackTime=0] 起音时间
 */
const createExpDecayEnvelope = (decayTime, attackTime = 0) =>
  attackTime > 0
    ? (t) => (1 - Math.exp(-t / attackTime)) * Math.exp(-t / decayTime)
    : (t) => Math.exp(-t / decayTime);

let audioMixObserver = null;
let audioTagObserver = null;

/**
 * @param {{ onMix?: Function | null, onTag?: Function | null }} [options]
 */
function setAudioObservers(options = {}) {
  const { onMix, onTag } = options;
  audioMixObserver = onMix || null;
  audioTagObserver = onTag || null;
}

/**
 * 将源样本混合混入目标缓冲区 (Buffer Splice / Mix)
 */
function mixBuffer(target, source, startSec, gain, sampleRate) {
  if (audioMixObserver) audioMixObserver(target, source, startSec, gain, sampleRate, false);
  const startSample = Math.round(startSec * sampleRate);
  const copyLen = Math.min(source.length, target.length - startSample);
  for (let i = Math.max(0, -startSample); i < copyLen; i++) {
    target[startSample + i] += source[i] * gain;
  }
  return target;
}

/**
 * 环形循环混音 (Circular Wrapping Mix)
 */
function mixBufferWrapped(target, source, startSec, gain, sampleRate) {
  if (audioMixObserver) audioMixObserver(target, source, startSec, gain, sampleRate, true);
  const len = target.length;
  let cursor = Math.round(startSec * sampleRate) % len;
  if (cursor < 0) cursor += len;
  for (let i = 0; i < source.length; i++) {
    target[cursor] += source[i] * gain;
    if (++cursor >= len) cursor = 0;
  }
  return target;
}

/**
 * 计算缓冲区峰值幅度
 */
function getPeakAmplitude(buffer) {
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i]);
    if (abs > peak) peak = abs;
  }
  return peak;
}

/**
 * 样本点数值整体缩放
 */
function scaleBuffer(buffer, scalar) {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] *= scalar;
  }
  return buffer;
}

/**
 * 双曲正切非线性软饱和失真 (Soft-Clipping Waveshaping Saturation)
 */
function applySoftSaturation(buffer, drive) {
  const invNorm = 1 / Math.tanh(drive);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.tanh(buffer[i] * drive) * invNorm;
  }
  return buffer;
}

/**
 * 边缘淡入淡出 (防止边界点击音 Click/Pop)
 */
function applyBoundaryFade(buffer, sampleRate, fadeInSec, fadeOutSec) {
  const inSamples = Math.min(buffer.length >> 1, Math.round(fadeInSec * sampleRate));
  const outSamples = Math.min(buffer.length >> 1, Math.round(fadeOutSec * sampleRate));
  for (let i = 0; i < inSamples; i++) {
    buffer[i] *= i / inSamples;
  }
  for (let i = 0; i < outSamples; i++) {
    const factor = i / outSamples;
    buffer[buffer.length - 1 - i] *= factor * factor;
  }
  return buffer;
}

/**
 * 过滤成型噪声爆发生成器 (Filtered Noise Burst)
 */
function synthesizeNoiseBurst(sampleRate, rng, duration, decayTime, filterOpts = {}) {
  const noise = generateWhiteNoise(sampleRate, duration, rng);
  if (filterOpts.hp) applyBiquadFilter(noise, "hp", filterOpts.hp, 0.707, sampleRate);
  if (filterOpts.lp) applyBiquadFilter(noise, "lp", filterOpts.lp, 0.707, sampleRate);
  if (filterOpts.bp) applyBiquadFilter(noise, "bp", filterOpts.bp, filterOpts.q || 1, sampleRate);

  applyEnvelope(noise, sampleRate, createExpDecayEnvelope(decayTime, filterOpts.att || 0));
  const peak = getPeakAmplitude(noise);
  const res = peak > 0 ? scaleBuffer(noise, 1 / peak) : noise;
  if (audioTagObserver) {
    audioTagObserver(res, {
      kind: filterOpts.hp || filterOpts.lp || filterOpts.bp ? "滤波噪声" : "包络噪声",
      detail: Object.entries(filterOpts)
        .map(([k, v]) => `${k}=${v}`)
        .join(", "),
    });
  }
  return res;
}

/**
 * 快速音高下潜的正弦冲击瞬态 (Pitch-Swept Kick / Sub-bass Impact)
 */
function synthesizePitchSweepSine(
  sampleRate,
  duration,
  startFreq,
  endFreq,
  pitchDecay,
  ampDecay,
  attackTime = 0.0006,
) {
  const buf = createAudioBufferArray(sampleRate, duration);
  let phase = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / sampleRate;
    phase += (TWO_PI * (endFreq + (startFreq - endFreq) * Math.exp(-t / pitchDecay))) / sampleRate;
    buf[i] = Math.sin(phase) * Math.exp(-t / ampDecay) * (1 - Math.exp(-t / attackTime));
  }
  if (audioTagObserver) {
    audioTagObserver(buf, { kind: "衰减扫频冲击", detail: `${startFreq} → ${endFreq} Hz` });
  }
  return buf;
}

/**
 * 指数调频啁啾信号 (Chirp Transient)
 */
function synthesizeChirp(sampleRate, duration, startFreq, endFreq, applyWindow = true) {
  const buf = createAudioBufferArray(sampleRate, duration);
  let phase = 0;
  const len = buf.length;
  for (let i = 0; i < len; i++) {
    const progress = i / len;
    phase += (TWO_PI * startFreq * Math.pow(endFreq / startFreq, progress)) / sampleRate;
    buf[i] = Math.sin(phase) * (applyWindow ? Math.sin(Math.PI * progress) : 1);
  }
  if (audioTagObserver) {
    audioTagObserver(buf, { kind: "扫频音", detail: `${startFreq} → ${endFreq} Hz` });
  }
  return buf;
}

/**
 * 模态谐振腔合成器 (Modal Synthesis - Additive Damped Sinusoids)
 * 用于还原枪管撞针金属谐振、弹壳弹跳、机械构件冲击
 * @param {number} sampleRate
 * @param {number} duration
 * @param {Array<[freq: number, decay: number, amplitude: number]>} modalPoles
 * @param {() => number} [rng]
 */
function synthesizeModalBank(sampleRate, duration, modalPoles, rng) {
  const buf = createAudioBufferArray(sampleRate, duration);
  for (const [freq, decay, amp] of modalPoles) {
    if (freq > sampleRate * 0.46) continue;
    const w = (TWO_PI * freq) / sampleRate;
    const initialPhase = rng ? rng() * TWO_PI : 0;
    const damping = Math.exp(-1 / (decay * sampleRate));
    let currentAmp = amp;
    for (let i = 0; i < buf.length; i++) {
      buf[i] += Math.sin(w * i + initialPhase) * currentAmp;
      currentAmp *= damping;
      if (currentAmp < 1e-5) break;
    }
  }
  // 极短起音平滑
  const attackSamples = Math.min(buf.length, Math.round(0.0004 * sampleRate));
  for (let i = 0; i < attackSamples; i++) {
    buf[i] *= i / attackSamples;
  }
  if (audioTagObserver) {
    audioTagObserver(buf, { kind: "共振模态", detail: `${modalPoles.length} 个频率分量` });
  }
  return buf;
}

/**
 * 密集微粒颗粒噪声生成器 (Granular Micro-Transient Scatter)
 * 模拟砂砾破片飞溅、火花爆炸细碎声、弹跳碎渣
 */
function synthesizeGranularDebris(sampleRate, rng, duration, count, opts = {}) {
  const buf = createAudioBufferArray(sampleRate, duration);
  const fromTime = opts.from || 0;
  const falloff = opts.fall || 1;

  for (let i = 0; i < count; i++) {
    const t = fromTime + (duration - fromTime - 0.02) * Math.pow(rng(), falloff);
    const startIdx = Math.round(t * sampleRate);
    const grainLen = Math.round(
      randomRange(rng, opts.minLen || 0.001, opts.maxLen || 0.004) * sampleRate,
    );
    const grainAmp = randomRange(rng, 0.2, 1) * (opts.ampFall ? Math.exp(-t / opts.ampFall) : 1);
    for (let p = 0; p < grainLen && startIdx + p < buf.length; p++) {
      buf[startIdx + p] += (rng() * 2 - 1) * grainAmp * Math.exp((-4 * p) / grainLen);
    }
  }

  if (opts.hp) applyBiquadFilter(buf, "hp", opts.hp, 0.707, sampleRate);
  if (opts.lp) applyBiquadFilter(buf, "lp", opts.lp, 0.707, sampleRate);
  if (opts.bp) applyBiquadFilter(buf, "bp", opts.bp, opts.q || 1, sampleRate);
  if (audioTagObserver) {
    audioTagObserver(buf, { kind: "颗粒 / 短促脉冲", detail: `${count} 组` });
  }
  return buf;
}

/**
 * 缓冲区边界平滑无缝对齐交叉淡化 (Seamless Loop Crossfade)
 */
function crossfadeLoopBuffer(buffer, targetLength, equalPower = true) {
  const tailLen = buffer.length - targetLength;
  const out = new Float32Array(targetLength);
  out.set(buffer.subarray(0, targetLength));
  for (let i = 0; i < tailLen; i++) {
    const t = (i + 0.5) / tailLen;
    const gainHead = equalPower ? Math.sin((t * Math.PI) / 2) : t;
    const gainTail = equalPower ? Math.cos((t * Math.PI) / 2) : 1 - t;
    out[i] = buffer[i] * gainHead + buffer[targetLength + i] * gainTail;
  }
  return out;
}

/**
 * 程序化无缝平铺循环音频构造器 (Procedural Seamless Loop Builder)
 */
function buildSeamlessLoop(sampleRate, duration, rng, processFn, padSec = 0.4) {
  const fullNoise = generateWhiteNoise(sampleRate, duration + padSec, rng);
  processFn(fullNoise);
  return crossfadeLoopBuffer(fullNoise, Math.round(sampleRate * duration), true);
}

/**
 * 多音轨混音器
 */
function sumTracks(totalLength, ...tracks) {
  const out = new Float32Array(totalLength);
  for (const [buf, gain] of tracks) {
    if (audioMixObserver) audioMixObserver(out, buf, 0, gain, 0, false);
    const copyLen = Math.min(totalLength, buf.length);
    for (let i = 0; i < copyLen; i++) {
      out[i] += buf[i] * gain;
    }
  }
  return out;
}

// ============================================================================
// 二、 几猫制式步枪（KR-7）射击与空间混响脉冲响应 (Gunshot & Reverb DSP)
// ============================================================================

/**
 * 几猫制式步枪（KR-7）超高压射击音效物理合成器
 * 融合 6 层分立声学微结构:
 * 1. 枪口初速超音速激波裂音 (Supersonic Shockwave Crack)
 * 2. 枪口高温燃气膨胀爆鸣 (Gas Expansion Blast)
 * 3. 亚低音火药重击冲量 (Sub-Bass Propellant Thump)
 * 4. 枪管导气中频冲量 (Chamber Mid-Punch)
 * 5. 机匣钢质驻退腔体共鸣 (Breech Resonance)
 * 6. 机机框复进金属碰擦 (Bolt Cycling Clink)
 * 7. 枪管微模态高次谐波 (Barrel Modal Harmonics: 2150Hz, 3420Hz, 5230Hz)
 * 8. 双曲正切非线性后级过载 (Post-Waveshaping Saturation)
 *
 * @param {number} sampleRate 采样率 (44.1kHz)
 * @param {() => number} rng 随机数发生器
 * @param {number} variant 音效变体索引 (0..3)
 * @returns {Float32Array}
 */

export {
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
  setAudioObservers,
};

/**
 * 几猫国产3A大作 (JM 3A Action Game) — 程序化纯声学合成引擎 (Web Audio DSP Engine)
 *
 * 核心技术基石:
 * 1. 极限零外部音频资产 (Zero External Audio Assets) — 不加载任何 MP3/WAV/OGG 文件。
 * 2. 纯代码数学合成 (Mathematical Sound Synthesis) — 基于 Web Audio API、Float32Array 物理声学建模、
 *    白噪声/粉红噪声生成、Direct Form II 双二阶滤波器 (Biquad Filter: LP/HP/BP)、
 *    模态合成 (Modal Synthesis)、指数啁啾频扫 (Chirp)、波形非线性饱和失真 (Waveshaper Saturation)。
 * 3. 动态环境声景 (Dynamic Environmental Soundscape) — 港区海风、无缝立体声暴雨、海浪拍岸、远洋号角。
 * 4. 空间声学与室内外动态遮挡 (Spatial Audio & Occlusion) — HRTF 3D 双耳声场定位、卷积混响脉冲响应 (IR)、
 *    进入集装箱仓库时平滑过渡为室内铁皮击打雨声与封闭空间混响。
 * 5. 自适应战术交战音乐状态机 (Dynamic Adaptive Music Layers) — 5 轨程序化合成多层音乐无缝渐变。
 * 6. 离线音频渲染自检 (OfflineAudioContext Self-Test) — 自动化电平与失真回归测试。
 */

// ============================================================================
// 一、 基础数学、伪随机数生成器与 DSP 辅助例程 (DSP Core Math & PRNG)
// ============================================================================

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
 */
function applyDynamicBiquadFilter(buffer, type, cutoffFn, Q, sampleRate, passes = 1) {
  const len = buffer.length;
  for (let p = 0; p < passes; p++) {
    let z1 = 0;
    let z2 = 0;
    let coeffs = null;
    if (p > 0) {
      z1 = applyDynamicBiquadFilter.z1 || 0;
      z2 = applyDynamicBiquadFilter.z2 || 0;
    }
    const writeTarget = p === passes - 1 ? buffer : null;

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
      if (writeTarget) writeTarget[i] = output;
    }
    applyDynamicBiquadFilter.z1 = z1;
    applyDynamicBiquadFilter.z2 = z2;
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

/**
 * 将源样本混合混入目标缓冲区 (Buffer Splice / Mix)
 */
function mixBuffer(target, source, startSec, gain, sampleRate) {
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
  return peak > 0 ? scaleBuffer(noise, 1 / peak) : noise;
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

  // 3. 火药爆轰重低音沉重锤击 (160Hz -> 45Hz 下潜)
  mixBuffer(
    out,
    synthesizePitchSweepSine(sampleRate, 0.11, 160 * pitchVar, 45 * pitchVar, 0.024, 0.03, 0.003),
    0,
    0.62,
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

  // 8. 输出级软限幅饱和
  return applySoftSaturation(scaleBuffer(out, 0.46), 1.5);
}

const KR = synthesizeRifleShot;

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
  const buf = createAudioBufferArray(sampleRate, 0.55);
  const pitchScale = [1.0, 1.09, 0.93][variant % 3];
  let delay = 0;
  let gain = 1.0;
  const bounceCount = 2 + (variant !== 1 ? 1 : 0);

  for (let b = 0; b < bounceCount; b++) {
    const p = pitchScale * randomRange(rng, 0.96, 1.05);
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
    delay += randomRange(rng, 0.085, 0.15) * (b ? 0.75 : 1);
    gain *= randomRange(rng, 0.45, 0.62);
  }
  return buf;
}
const o8 = synthShellBounce;

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
  mixBuffer(
    buf,
    synthesizePitchSweepSine(sampleRate, 0.14, 124, 44, 0.03, 0.045, 0.002),
    0,
    1.0,
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
  rifle_tail_out: { gen: QR, n: 2, sr: Xn, peak: 0.5, bus: "dry", max: 3, pri: 8, boot: 1 },
  rifle_tail_in: { gen: e8, n: 2, sr: Xn, peak: 0.62, bus: "dry", max: 3, pri: 8, boot: 1 },
  rifle_dry: { gen: t8, n: 1, sr: ki, peak: 0.5, bus: "near", max: 2, pri: 6, boot: 1 },
  reload_magout: { gen: n8, n: 1, sr: ki, peak: 0.6, bus: "near", max: 2, pri: 6 },
  reload_magin: { gen: i8, n: 1, sr: ki, peak: 0.65, bus: "near", max: 2, pri: 6 },
  reload_bolt: { gen: s8, n: 1, sr: ki, peak: 0.8, bus: "near", max: 2, pri: 6 },
  shell_bounce: { gen: o8, n: 3, sr: ki, peak: 0.3, bus: "world", max: 4, pri: 1, ref: 2, roll: 1 },

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
const Iv = SURFACE_STEP_MAP;

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

  let resolveReadyPromise;
  const readyPromise = new Promise((resolve) => {
    resolveReadyPromise = resolve;
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
    } else {
      resolveReadyPromise();
    }
  }

  if (preheatedCache) {
    resolveReadyPromise();
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

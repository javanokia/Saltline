// @ts-check
/**
 * @file src/audio/bus.js
 * @description Web Audio 母带总线、模拟温润双曲正切软限幅饱和器、低通滤波器与卷积混响路由
 */

/**
 * 快速创建 GainNode
 * @param {AudioContext} audioCtx
 * @param {number} val
 * @returns {GainNode}
 */
export const makeGain = (audioCtx, val) => {
  const node = audioCtx.createGain();
  node.gain.value = val;
  return node;
};

/**
 * 构建音频母带链路与各级子总线
 * @param {AudioContext} audioCtx
 * @param {(name: string, variant: number, cb: (buf: AudioBuffer) => void) => void} requestBufferAsync
 */
export function createAudioMasterBus(audioCtx, requestBufferAsync) {
  const preMasterGain = makeGain(audioCtx, 1.0);
  const masterCompressor = audioCtx.createDynamicsCompressor();
  masterCompressor.threshold.value = -10;
  masterCompressor.knee.value = 6;
  masterCompressor.ratio.value = 6;
  masterCompressor.attack.value = 0.002;
  masterCompressor.release.value = 0.14;

  const saturationDriveGain = makeGain(audioCtx, 0.45);
  const masterWaveShaper = audioCtx.createWaveShaper();

  // 双曲正切柔和模拟限幅饱和曲线 (Warm Analog Soft-Clipping Saturation)
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

  const masterGain = makeGain(audioCtx, 0.9);

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

  const muffledPostGain = makeGain(audioCtx, 1.0);
  muffledLowpass.connect(muffledPostGain);
  muffledPostGain.connect(preMasterGain);

  // 子总线 (Sub-buses)
  const buses = {
    world: makeGain(audioCtx, 1.0),
    near: makeGain(audioCtx, 0.95),
    amb: makeGain(audioCtx, 0.55),
    dry: makeGain(audioCtx, 1.0),
    music: makeGain(audioCtx, 0.62),
  };

  buses.world.connect(muffledLowpass);
  buses.near.connect(muffledLowpass);
  buses.amb.connect(muffledLowpass);
  buses.dry.connect(preMasterGain);

  const musicDuckingGain = makeGain(audioCtx, 1.0);
  buses.music.connect(musicDuckingGain);
  musicDuckingGain.connect(preMasterGain);

  // 空间混响卷积器 (Convolution Reverb Nodes)
  const reverbBus = makeGain(audioCtx, 1.0);
  const outdoorReverbSendGain = makeGain(audioCtx, 1.0);
  const indoorReverbSendGain = makeGain(audioCtx, 0.0);

  const outdoorConvolver = audioCtx.createConvolver();
  const indoorConvolver = audioCtx.createConvolver();
  const outdoorReverbReturnGain = makeGain(audioCtx, 0.75);
  const indoorReverbReturnGain = makeGain(audioCtx, 0.95);

  const worldReverbSend = makeGain(audioCtx, 0.9);
  const nearReverbSend = makeGain(audioCtx, 0.32);
  const musicReverbSend = makeGain(audioCtx, 0.2);

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

  return {
    preMasterGain,
    masterGain,
    muffledLowpass,
    muffledPostGain,
    buses,
    musicDuckingGain,
    reverbBus,
    outdoorReverbSendGain,
    indoorReverbSendGain,
    outdoorReverbReturnGain,
    indoorReverbReturnGain,
    outdoorConvolver,
    indoorConvolver,
  };
}

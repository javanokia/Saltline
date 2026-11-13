/**
 * @file src/audio/sounds.js
 * @description 全量程序化音效波形生成器与注册表 (Sound Synthesizers & Sound Registry)
 */

import {
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
} from "./sounds/weapons.js";

import { synthesizeOutdoorReverbIR, synthesizeIndoorReverbIR, QR, e8 } from "./sounds/reverb.js";

import {
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
} from "./sounds/player_impacts.js";

import {
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
} from "./sounds/enemies.js";

import {
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
} from "./sounds/ambient_ui.js";

import {
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
} from "./sounds/music.js";

// 原始别名绑定
const KR = synthesizeRifleShot;
const t8 = synthDryFire;
const e_ = synthSlidingFriction;
const n8 = synthReloadMagOut;
const i8 = synthReloadMagIn;
const s8 = synthReloadBolt;
const o8 = synthShellBounce;
const r8 = synthStepConcrete;
const t_ = synthWaterSplash;
const a8 = synthStepWater;
const l8 = synthStepMetal;
const c8 = synthLand;
const u8 = synthJump;
const h8 = synthHurt;
const f8 = synthEarRing;
const d8 = synthImpactMetal;
const p8 = synthImpactConcrete;
const v8 = synthImpactWood;
const g8 = synthImpactWater;
const m8 = synthImpactEnemy;
const x8 = synthImpactGlass;
const b8 = synthBulletWhiz;
const y8 = synthRicochet;
const E8 = synthGullFire;
const S8 = synthHoundFire;
const T8 = synthHoundStep;
const A8 = synthGullDie;
const R8 = synthHoundDie;
const P8 = synthTelegraph;
const C8 = synthAlert;
const I8 = synthExplosion;
const z8 = synthRelayCut;
const D8 = synthThunder;
const L8 = synthFoghorn;
const k8 = synthGullCry;
const F8 = synthHalyard;
const U8 = synthContainerBang;
const N8 = synthUiClick;
const B8 = synthUiHover;
const _8 = synthGullRotorLoop;
const M8 = synthHoundServoLoop;
const w8 = synthRelayHumLoop;
const O8 = synthRainLoop;
const H8 = synthInteriorRainLoop;
const V8 = synthWindLoop;
const W8 = synthOceanLoop;
const G8 = synthMusicDroneTrack;
const q8 = synthMusicOstinatoTrack;
const X8 = synthMusicPercussionTrack;
const Y8 = synthMusicBrassTrack;
const $8 = synthMusicMotifTrack;
const Z8 = synthObjectiveDoneSting;
const j8 = synthObjectiveAllDoneSting;
const J8 = synthCompleteTheme;
const K8 = synthDeathTheme;

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

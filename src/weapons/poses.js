// @ts-check
/**
 * @file src/weapons/poses.js
 * @description 武器第一人称视模姿态、弹簧动力学与换弹手部关键帧插值
 */

import * as THREE from "three";
import { saturate } from "../constants.js";
import { PAC9_MODEL_PARAMS } from "./pac9_model.js";

/** 腰射 (Hipfire) 默认视模变换偏移: p = [x,y,z], r = [pitch,yaw,roll] */
export const POSE_HIPFIRE = {
  p: [0.118, -0.122, -0.275],
  r: [0.034, 0.085, -0.03],
};

/** 开镜瞄准 (ADS - Aim Down Sights) 视模对齐偏移 (全息红点光轴居中) */
export const POSE_ADS = {
  p: [0, -PAC9_MODEL_PARAMS.sightY, -0.135],
  r: [0, 0, 0],
};

/** 战术疾跑 (Sprint) 低姿出枪偏移 */
export const POSE_SPRINT = {
  p: [-0.035, 0.004, 0.03],
  r: [-0.04, 0.62, 0.26],
};

/** 战术换弹姿态基准偏移 */
export const POSE_RELOAD = {
  p: [-0.03, 0.1, -0.02],
  r: [0.46, 0.22, -0.8],
};

/** 战术换弹时长 (秒) */
export const RELOAD_DURATION_TACTICAL = 2.1;
/** 空仓挂机换弹时长 (秒，包含左手拉栓复进动作) */
export const RELOAD_DURATION_EMPTY = 2.72;

/** 换弹时间线关键事件时间戳 (秒) */
export const RELOAD_TIMESTAMPS = {
  T_MAG_OUT: 0.47,
  T_MAG_IN: 1.345,
  T_RACK_START: 2.02,
  T_RACK_BACK: 2.14,
  T_RACK_RELEASE: 2.19,
};

/**
 * Ken Perlin 五次平滑阶跃函数 (Smootherstep: 6t^5 - 15t^4 + 10t^3)
 * @param {number} t
 * @returns {number}
 */
export function smootherstep(t) {
  t = saturate(t);
  return t * t * t * (t * (6 * t - 15) + 10);
}

/**
 * 创建二阶阻尼简谐振子弹簧 (Damped Harmonic Oscillator)
 * @param {number} stiffness 弹性系数 k
 * @param {number} damping 阻尼系数 c
 */
export function createSpring(stiffness, damping) {
  return { x: 0, v: 0, k: stiffness, c: damping };
}

/**
 * 物理弹簧步进积分器 (包含自适应微步进子切片，杜绝高帧率/卡顿时欧拉积分发散)
 * @param {{ x: number, v: number, k: number, c: number }} spring 弹簧状态对象
 * @param {number} target 目标平衡位置
 * @param {number} dt 帧耗时 (秒)
 * @returns {number} 当前弹簧位移
 */
export function stepSpring(spring, target, dt) {
  const steps = dt > 0.012 ? Math.ceil(dt / 0.008) : 1;
  const subDt = dt / steps;
  for (let i = 0; i < steps; i++) {
    spring.v += ((target - spring.x) * spring.k - spring.v * spring.c) * subDt;
    spring.x += spring.v * subDt;
  }
  return spring.x;
}

/**
 * 欧拉角快捷转换为四元数
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {THREE.EulerOrder} [order="XYZ"]
 * @returns {THREE.Quaternion}
 */
export function eulerToQuat(x, y, z, order = "XYZ") {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, order));
}

/**
 * 将局部方向向量逆旋转投影至骨骼空间
 * @param {THREE.Quaternion} quat
 * @param {number[]} dir
 * @param {boolean} [mirror=false]
 * @returns {number[]}
 */
export function projectDirection(quat, dir, mirror = false) {
  const vec = new THREE.Vector3(dir[0], dir[1], dir[2])
    .normalize()
    .applyQuaternion(quat.clone().invert());
  if (mirror) vec.x *= -1;
  return [vec.x, vec.y, vec.z];
}

const DEFAULT_WRIST_OFFSET = new THREE.Vector3(0, -0.015, -0.055);

/**
 * 构造基于手腕偏移的骨骼目标姿态
 * @param {THREE.Quaternion} quat
 * @param {number[]} posArr
 * @param {THREE.Vector3} [offset=DEFAULT_WRIST_OFFSET]
 */
export function makePose(quat, posArr, offset = DEFAULT_WRIST_OFFSET) {
  return {
    q: quat.clone(),
    p: new THREE.Vector3(posArr[0], posArr[1], posArr[2]).sub(offset.clone().applyQuaternion(quat)),
  };
}

/**
 * 基于基准姿态生成位移偏移姿态
 * @param {{ q: THREE.Quaternion, p: THREE.Vector3 }} base
 * @param {number} dx
 * @param {number} dy
 * @param {number} dz
 * @param {THREE.Quaternion | null} [overrideQuat=null]
 */
export function offsetPose(base, dx, dy, dz, overrideQuat = null) {
  return {
    q: overrideQuat ? overrideQuat.clone() : base.q.clone(),
    p: base.p.clone().add(new THREE.Vector3(dx, dy, dz)),
  };
}

/**
 * 构建左手换弹关键帧轨道（战术换弹 & 空仓挂机换弹）
 * @param {THREE.Quaternion} leftHandBaseQuat
 */
export function createReloadKeyframes(leftHandBaseQuat) {
  const leftHandHoldQuat = eulerToQuat(0, 0, Math.PI / 2).multiply(eulerToQuat(0.12, 0, 0));
  const poseGripHandguard = makePose(leftHandBaseQuat, [-0.015, -0.062, -0.236]);
  const poseAtMagWell = makePose(leftHandHoldQuat, [-0.0135, -0.15, -0.0745]);
  const poseApproachMag = offsetPose(poseAtMagWell, -0.035, -0.02, 0.01);
  const poseDropMagDown = offsetPose(
    poseAtMagWell,
    -0.06,
    -0.3,
    0.13,
    leftHandHoldQuat.clone().multiply(eulerToQuat(-0.5, 0, 0.25)),
  );
  const poseInsertMagPrep = offsetPose(poseAtMagWell, 0, -0.035, 0.004);
  const poseMagClickIn = offsetPose(poseAtMagWell, -0.004, -0.06, 0);
  const poseTapBasePlate = offsetPose(poseAtMagWell, 0, -0.012, 0);

  const rackQuat = eulerToQuat(-0.6, 0, 0).multiply(
    new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, -1, 0),
      ),
    ),
  );
  const poseGripChargingHandle = makePose(
    rackQuat,
    [
      PAC9_MODEL_PARAMS.handlePos[0] - 0.004,
      PAC9_MODEL_PARAMS.handlePos[1],
      PAC9_MODEL_PARAMS.handlePos[2],
    ],
    new THREE.Vector3(0, -0.024, -0.118),
  );
  const poseRackBoltBack = offsetPose(poseGripChargingHandle, 0, 0, PAC9_MODEL_PARAMS.boltTravel);

  /** @type {Array<[number, { p: THREE.Vector3, q: THREE.Quaternion }]>} */
  const kfTacticalReload = [
    [0, poseGripHandguard],
    [0.1, poseGripHandguard],
    [0.36, poseApproachMag],
    [0.44, poseAtMagWell],
    [0.5, poseAtMagWell],
    [0.8, poseDropMagDown],
    [0.98, poseDropMagDown],
    [1.28, poseInsertMagPrep],
    [1.35, poseAtMagWell],
    [1.45, poseMagClickIn],
    [1.52, poseTapBasePlate],
    [1.62, poseAtMagWell],
    [1.7, poseApproachMag],
    [2.02, poseGripHandguard],
    [9, poseGripHandguard],
  ];

  /** @type {Array<[number, { p: THREE.Vector3, q: THREE.Quaternion }]>} */
  const kfEmptyReload = [
    ...kfTacticalReload.slice(0, 12),
    [1.7, poseApproachMag],
    [1.96, poseGripChargingHandle],
    [2.02, poseGripChargingHandle],
    [2.14, poseRackBoltBack],
    [2.19, poseRackBoltBack],
    [2.26, poseGripChargingHandle],
    [2.36, poseGripChargingHandle],
    [2.66, poseGripHandguard],
    [9, poseGripHandguard],
  ];

  return {
    leftHandHoldQuat,
    leftHandMagInvert: leftHandHoldQuat.clone().invert(),
    poseGripHandguard,
    poseAtMagWell,
    kfTacticalReload,
    kfEmptyReload,
  };
}

/**
 * 在关键帧时间表中采样插值位置与旋转
 * @param {Array<[number, { p: THREE.Vector3, q: THREE.Quaternion }]>} keyframes
 * @param {number} time
 * @param {THREE.Vector3} outPos
 * @param {THREE.Quaternion} outQuat
 */
export function sampleHandKeyframes(keyframes, time, outPos, outQuat) {
  let idx = 0;
  while (idx < keyframes.length - 2 && time > keyframes[idx + 1][0]) {
    idx++;
  }
  const k0 = keyframes[idx];
  const k1 = keyframes[idx + 1];
  const alpha = smootherstep((time - k0[0]) / Math.max(1e-4, k1[0] - k0[0]));
  outPos.copy(k0[1].p).lerp(k1[1].p, alpha);
  outQuat.copy(k0[1].q).slerp(k1[1].q, alpha);
}

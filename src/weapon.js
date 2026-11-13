// @ts-check
import * as THREE from "three";

// Three.js 类与枚举别名映射（仅保留本模块使用的类型）
const {
  Vector3: W,
  Quaternion: Lt,
  Euler: In,
  Group: wt,
  Mesh: Qe,
  MeshStandardMaterial: Qt,
  Color: Ve,
  Matrix4: Ye,
  Skeleton: k0,
} = THREE;

import { clamp, lerp, saturate, damp, FACTION_PLAYER, FACTION_ENEMY } from "./constants.js";

import {
  buildPac9Geometries,
  PAC9_MODEL_PARAMS,
  applyPac9ShaderDetails,
  createPac9MarkingsMesh,
  createPac9SightDotMesh,
  createPac9MuzzleFlashMesh,
  buildPac9HandsMesh,
  countGeometryTris,
  pac9RainUniform,
} from "./weapons/pac9_model.js";

// ============================================================================
// 几猫九式突击步枪 (PAC-9 / KR-7) - 核心动力学与视模运行时系统 (Viewmodel System)
// ============================================================================

const Vector3_ = W;
const Quaternion_ = Lt;

/** 弹匣容量 (30发标准穿甲步枪弹) */
const MAG_CAPACITY = 30;
/** 初始备用弹药量 */
const DEFAULT_RESERVE_AMMO = 150;
/** 理论射速 (RPM - 每分钟 720 发) */
const FIRE_RATE_RPM = 720;
/** 单发对甲基础伤害 */
const BASE_DAMAGE = 26;
/** 最大有效杀伤射程 (米) */
const MAX_FIRE_RANGE = 300;

/** 腰射 (Hipfire) 默认视模变换偏移: p = [x,y,z], r = [pitch,yaw,roll] */
const POSE_HIPFIRE = {
  p: [0.118, -0.122, -0.275],
  r: [0.034, 0.085, -0.03],
};

/** 开镜瞄准 (ADS - Aim Down Sights) 视模对齐偏移 (全息红点光轴居中) */
const POSE_ADS = {
  p: [0, -PAC9_MODEL_PARAMS.sightY, -0.135],
  r: [0, 0, 0],
};

/** 战术疾跑 (Sprint) 低姿出枪偏移 */
const POSE_SPRINT = {
  p: [-0.035, 0.004, 0.03],
  r: [-0.04, 0.62, 0.26],
};

/** 战术换弹姿态基准偏移 */
const POSE_RELOAD = {
  p: [-0.03, 0.1, -0.02],
  r: [0.46, 0.22, -0.8],
};

/** 战术换弹时长 (秒) */
const RELOAD_DURATION_TACTICAL = 2.1;
/** 空仓挂机换弹时长 (秒，包含左手拉栓复进动作) */
const RELOAD_DURATION_EMPTY = 2.72;

/**
 * Ken Perlin 五次平滑阶跃函数 (Smootherstep: 6t^5 - 15t^4 + 10t^3)
 * @param {number} t
 * @returns {number}
 */
const smootherstep = (t) => {
  t = saturate(t);
  return t * t * t * (t * (6 * t - 15) + 10);
};

/**
 * 创建二阶阻尼简谐振子弹簧 (Damped Harmonic Oscillator)
 * @param {number} stiffness 弹性系数 k
 * @param {number} damping 阻尼系数 c
 */
const createSpring = (stiffness, damping) => ({
  x: 0,
  v: 0,
  k: stiffness,
  c: damping,
});

/**
 * 物理弹簧步进积分器 (包含自适应微步进子切片，杜绝高帧率/卡顿时欧拉积分发散)
 * @param {object} spring 弹簧状态对象
 * @param {number} target 目标平衡位置
 * @param {number} dt 帧耗时 (秒)
 * @returns {number} 当前弹簧位移
 */
function stepSpring(spring, target, dt) {
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
 */
const eulerToQuat = (x, y, z, order = "XYZ") =>
  new Quaternion_().setFromEuler(new In(x, y, z, /** @type {any} */ (order)));

/**
 * 创建几猫九式突击步枪视模控制器 (PAC-9 First-Person Viewmodel Controller)
 * @param {import('./types').EngineContext} ctx 全局引擎上下文 (包含 camera, player, input, combat, fx, mats, events 等)
 * @returns {Promise<import('./types').WeaponState>}
 */
async function createWeapon(ctx) {
  const root = new wt();
  root.name = "viewmodel-pac9";

  // 1. 获取程序化几何体构件
  const geo = buildPac9Geometries();

  // 2. 材质分配与三向投影贴图纹理
  const matScaleMap = {
    anodized_black: 2,
    gunmetal: 2,
    brass: 4,
    glove_fabric: 3,
    rubber: 4,
  };
  const getProceduralMat = (name) =>
    ctx.mats.get(name, {
      triplanar: true,
      vertexColors: true,
      scale: matScaleMap[name] || 1,
    });

  const createMesh = (geometry, material) => {
    const mesh = new Qe(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return mesh;
  };

  // 枪身机匣黑色阳极氧化铝材质
  const matAnodized = new Qt({
    color: new Ve(0.0085, 0.009, 0.0105),
    roughness: 0.4,
    metalness: 0.45,
    vertexColors: true,
  });
  matAnodized.name = "pac9_anodised";
  applyPac9ShaderDetails(matAnodized, 0);

  // 哑光印字/刻字材质
  const matMatte = new Qt({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0,
    vertexColors: true,
  });
  matMatte.name = "pac9_matte";

  // 枪机枪管磷化/发黑军用高碳钢材质
  const matPhosphate = new Qt({
    color: new Ve(0.016, 0.016, 0.0165),
    roughness: 0.5,
    metalness: 0.7,
    vertexColors: true,
  });
  matPhosphate.name = "pac9_phosphate";
  applyPac9ShaderDetails(matPhosphate, 1);

  // 工程塑料下机匣/握把聚合物材质
  const matPolymer = new Qt({
    color: new Ve(0.0125, 0.0128, 0.0135),
    roughness: 0.62,
    metalness: 0,
    vertexColors: true,
  });
  matPolymer.name = "pac9_polymer";
  applyPac9ShaderDetails(matPolymer, 2);

  // 棕褐色军规抗冲击弹匣工程塑料
  const matPolymerTan = new Qt({
    color: new Ve(0.105, 0.08, 0.05),
    roughness: 0.62,
    metalness: 0,
    vertexColors: true,
  });
  matPolymerTan.name = "pac9_polymer_tan";
  applyPac9ShaderDetails(matPolymerTan, 2);

  // 组装机匣主体
  root.add(
    createMesh(geo.ano, matAnodized),
    createMesh(geo.gun, matPhosphate),
    createMesh(geo.poly, matPolymer),
    createMesh(geo.plain, matMatte),
  );

  // 组装往复式枪机组 (Bolt Carrier Group)
  const boltMesh = createMesh(geo.bolt, matPhosphate);
  root.add(boltMesh);

  // 组装可拆卸供弹具 (30发弹匣与首发黄铜穿甲弹)
  const magGroup = new wt();
  const magDefaultPos = new Vector3_().fromArray(PAC9_MODEL_PARAMS.magPos);
  magGroup.position.copy(magDefaultPos);

  const topRoundMesh = createMesh(geo.round, getProceduralMat("brass"));
  magGroup.add(createMesh(geo.mag, matPolymerTan), topRoundMesh);
  root.add(magGroup);

  // 组装高精度机匣激光刻字与导轨刻度 (PAC-9 刻标、警示标记、快慢机 AUTO/SEMI/SAFE)
  let markingsMesh = null;
  try {
    markingsMesh = createPac9MarkingsMesh([
      ["model", -0.0168, -0.0315, 0.064, 0.0095, "L"],
      ["maker", -0.0168, -0.042, 0.064, 0.003, "L"],
      ["cal", -0.0168, -0.0465, 0.064, 0.0028, "L"],
      ["prop", -0.0168, -0.071, 0.066, 0.0026, "L"],
      ["auto", -0.0168, -0.027, -0.0335, 0.0036, "L"],
      ["semi", -0.0168, -0.0262, -0.049, 0.0036, "L"],
      ["safe", -0.0168, -0.0362, -0.062, 0.0036, "L"],
      ["rack", -0.0168, -0.004, -0.205, 0.02, "L"],
      ["warn", -0.0181, -0.01, 0.03, 0.0062, "L"],
      ["optic", -0.0195, 0.0735, 0.021, 0.0024, "L"],
      ["model", 0.0168, -0.0315, 0.068, 0.0095, "R"],
      ["warn", 0.0168, -0.066, 0.066, 0.0075, "R"],
      ["rack", 0.0168, -0.004, -0.205, 0.02, "R"],
      ["auto", 0.0168, -0.027, -0.0335, 0.0036, "R"],
      ["safe", 0.0168, -0.0362, -0.062, 0.0036, "R"],
      ["optic", 0.0195, 0.0735, 0.021, 0.0024, "R"],
      ["cal", 0.0181, 0.0245, -0.055, 0.0026, "R"],
      ["r2", 0, 0.04365, -0.0816, 0.003, "T"],
      ["r4", 0, 0.04365, -0.0616, 0.003, "T"],
      ["r6", 0, 0.04365, 0.0584, 0.003, "T"],
      ["r8", 0, 0.04365, 0.0784, 0.003, "T"],
      ["r10", 0, 0.04365, 0.0984, 0.003, "T"],
      ["r12", 0, 0.04365, 0.1184, 0.003, "T"],
    ]);
    markingsMesh.castShadow = false;
    markingsMesh.receiveShadow = true;
    markingsMesh.frustumCulled = false;
    root.add(markingsMesh);
  } catch (err) {
    console.warn("[weapon] markings skipped: " + err);
  }

  // 全息瞄准镜分划板与准直物镜
  const opticSightMesh = createPac9SightDotMesh(
    PAC9_MODEL_PARAMS.window.map((pt) => [
      pt[0] * 1.01,
      (pt[1] - PAC9_MODEL_PARAMS.sightY) * 1.01 + PAC9_MODEL_PARAMS.sightY,
    ]),
    PAC9_MODEL_PARAMS.lensF + 0.0025,
  );
  opticSightMesh.frustumCulled = false;
  root.add(opticSightMesh);

  // 枪口焰粒子与几何体
  const muzzleFlashMesh = createPac9MuzzleFlashMesh();
  muzzleFlashMesh.position.fromArray(PAC9_MODEL_PARAMS.muzzle);
  muzzleFlashMesh.visible = false;
  root.add(muzzleFlashMesh);

  // 3. 动力学手套与骨骼姿态系统
  const projectDirection = (quat, dir, mirror) => {
    const vec = new Vector3_(dir[0], dir[1], dir[2])
      .normalize()
      .applyQuaternion(quat.clone().invert());
    if (mirror) vec.x *= -1;
    return [vec.x, vec.y, vec.z];
  };

  // 右手（持握机匣握把，扣扳机手）
  const rightHandBaseQuat = eulerToQuat(-0.24, 0, 0).multiply(eulerToQuat(0, 0, -Math.PI / 2));
  const rightHandRig = buildPac9HandsMesh({
    mirror: false,
    fingers: [null, [0.62, 1.72, 0.8, 0], [0.68, 1.7, 0.8, -0.03], [0.74, 1.66, 0.8, -0.09]],
    indexPoses: [
      [0.1, 0.16, 0.1, 0.05],
      [0.46, 1.15, 0.5, 0],
    ],
    thumb: [
      projectDirection(rightHandBaseQuat, [-0.85, 0.05, -0.5]),
      projectDirection(rightHandBaseQuat, [-0.6, -0.05, -0.8]),
      projectDirection(rightHandBaseQuat, [-0.05, -0.2, -0.97]),
    ],
    forearm: projectDirection(rightHandBaseQuat, [0.27, -0.44, 0.86]),
    sleeve: 0.34,
  });

  const rightHandGroup = new wt();
  rightHandGroup.quaternion.copy(rightHandBaseQuat);
  rightHandGroup.position
    .fromArray(PAC9_MODEL_PARAMS.grip)
    .sub(new Vector3_(0.006, -0.031, -0.085).applyQuaternion(rightHandBaseQuat));

  const matGloveFabric = getProceduralMat("glove_fabric");
  rightHandGroup.add(createMesh(rightHandRig.fabric, matGloveFabric));

  const triggerFingerMesh = createMesh(rightHandRig.index[0].clone(), matGloveFabric);
  rightHandGroup.add(triggerFingerMesh);
  root.add(rightHandGroup);

  // 扳机手指渐变插值函数 (扣动扳机动作动力学)
  const indexAttrRelaxed = rightHandRig.index[0].attributes;
  const indexAttrPulled = rightHandRig.index[1].attributes;
  let lastFingerProgress = -1;

  function updateTriggerFinger(progress) {
    if (Math.abs(progress - lastFingerProgress) < 0.004) return;
    lastFingerProgress = progress;

    const posAttr = triggerFingerMesh.geometry.attributes.position;
    const normAttr = triggerFingerMesh.geometry.attributes.normal;
    const relaxedPos = indexAttrRelaxed.position.array;
    const pulledPos = indexAttrPulled.position.array;
    const relaxedNorm = indexAttrRelaxed.normal.array;
    const pulledNorm = indexAttrPulled.normal.array;

    for (let i = 0; i < relaxedPos.length; i++) {
      posAttr.array[i] = relaxedPos[i] + (pulledPos[i] - relaxedPos[i]) * progress;
      normAttr.array[i] = relaxedNorm[i] + (pulledNorm[i] - relaxedNorm[i]) * progress;
    }
    posAttr.needsUpdate = true;
    normAttr.needsUpdate = true;
  }

  // 左手（托住战术护木、拔插弹匣、拉动枪栓）
  const leftHandBaseQuat = eulerToQuat(0, 0, Math.PI / 2).multiply(eulerToQuat(0.06, 0, 0));
  const leftHandRig = buildPac9HandsMesh({
    mirror: true,
    fingers: [
      [1.27, 1.42, 0.75, 0.02],
      [1.3, 1.45, 0.75, 0],
      [1.3, 1.45, 0.75, -0.02],
      [1.33, 1.45, 0.75, -0.05],
    ],
    thumb: [
      projectDirection(leftHandBaseQuat, [0, 0.25, -0.97], true),
      projectDirection(leftHandBaseQuat, [0.05, 0.1, -0.99], true),
      projectDirection(leftHandBaseQuat, [0, 0, -1], true),
    ],
    forearm: projectDirection(leftHandBaseQuat, [-0.5, -0.35, 0.79], true),
    sleeve: 0.34,
  });

  const leftHandGroup = new wt();
  leftHandGroup.add(createMesh(leftHandRig.fabric, matGloveFabric));
  root.add(leftHandGroup);

  // 左手 IK 动画空间关键帧构造辅助
  const wristOffset = new Vector3_(0, -0.015, -0.055);
  const makePose = (quat, posArr, offset = wristOffset) => ({
    q: quat.clone(),
    p: new Vector3_(posArr[0], posArr[1], posArr[2]).sub(offset.clone().applyQuaternion(quat)),
  });
  const offsetPose = (base, dx, dy, dz, overrideQuat = null) => ({
    q: overrideQuat ? overrideQuat.clone() : base.q.clone(),
    p: base.p.clone().add(new Vector3_(dx, dy, dz)),
  });

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

  // 拉栓关键手位
  const rackQuat = eulerToQuat(-0.6, 0, 0).multiply(
    new Quaternion_().setFromRotationMatrix(
      new Ye().makeBasis(new Vector3_(0, 0, 1), new Vector3_(-1, 0, 0), new Vector3_(0, -1, 0)),
    ),
  );
  const poseGripChargingHandle = makePose(
    rackQuat,
    [
      PAC9_MODEL_PARAMS.handlePos[0] - 0.004,
      PAC9_MODEL_PARAMS.handlePos[1],
      PAC9_MODEL_PARAMS.handlePos[2],
    ],
    new Vector3_(0, -0.024, -0.118),
  );
  const poseRackBoltBack = offsetPose(poseGripChargingHandle, 0, 0, PAC9_MODEL_PARAMS.boltTravel);

  // 换弹关键帧时间表: [时间(秒), 姿态]
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

  // 空仓换弹时间表 (增加拉动拉机柄动作)
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

  // 关键帧时间戳节点
  const T_MAG_OUT = 0.47;
  const T_MAG_IN = 1.345;
  const T_RACK_START = 2.02;
  const T_RACK_BACK = 2.14;
  const T_RACK_RELEASE = 2.19;

  const tempVec = new Vector3_();
  const tempQuat1 = new Quaternion_();
  const tempQuat2 = new Quaternion_();

  function sampleHandKeyframes(keyframes, time) {
    let idx = 0;
    while (idx < keyframes.length - 2 && time > keyframes[idx + 1][0]) {
      idx++;
    }
    const k0 = keyframes[idx];
    const k1 = keyframes[idx + 1];
    const alpha = smootherstep((time - k0[0]) / Math.max(1e-4, k1[0] - k0[0]));
    tempVec.copy(k0[1].p).lerp(k1[1].p, alpha);
    tempQuat1.copy(k0[1].q).slerp(k1[1].q, alpha);
  }

  leftHandGroup.position.copy(poseGripHandguard.p);
  leftHandGroup.quaternion.copy(poseGripHandguard.q);

  const leftHandMagInvert = leftHandHoldQuat.clone().invert();

  // 设置第一人称视模渲染层级
  root.traverse((obj) => {
    obj.layers.set(FACTION_ENEMY);
  });
  ctx.camera.add(root);

  // 统计几何体面数与网格数
  const totalTris =
    Object.values(geo).reduce((sum, g) => sum + countGeometryTris(g), 0) +
    countGeometryTris(rightHandRig.fabric) +
    countGeometryTris(rightHandRig.index[0]) +
    countGeometryTris(leftHandRig.fabric) +
    (markingsMesh ? countGeometryTris(markingsMesh.geometry) : 0) +
    2;

  let totalMeshes = 0;
  root.traverse((obj) => {
    if (/** @type {any} */ (obj).isMesh) totalMeshes++;
  });
  console.log(
    "[weapon] " +
      PAC9_MODEL_PARAMS.name +
      ": " +
      Math.round(totalTris) +
      " tris, " +
      totalMeshes +
      " meshes (flash only while firing)",
  );

  const random = ctx.rng && ctx.rng.fork ? ctx.rng.fork() : Math.random;

  // 运行时物理与动画状态对象
  const state = {
    t: 0,
    cooldown: 0,
    prevFire: false,
    dryDone: false,
    autoReload: -1,
    reload: null,
    burst: 0,
    lastShot: -9,
    bloom: 0,
    heat: 0,
    smoke: 0,
    smokeTick: 0,
    adsLin: 0,
    adsE: 0,
    sprintT: 0,
    reloadW: 0,
    rackW: 0,
    bobPhase: 0,
    bobAmt: 0,
    finger: 0,
    boltT: 9,
    boltLocked: false,
    flashT: 0,
    flashDur: 0.05,
    recPhase: 0,
    wasGround: true,
    lastVy: 0,
    spreadS: 0.0125,
    idleT: 0,
    inspect: -1,

    // 动力学弹簧
    kZ: createSpring(520, 30), // 后坐力机匣向后冲量
    kP: createSpring(380, 26), // 后坐力枪口上扬 Pitch
    kY: createSpring(300, 22), // 后坐力水平游离 Yaw
    kR: createSpring(300, 20), // 后坐力枪身扭转 Roll
    swY: createSpring(110, 15), // 瞄准水平摆动 (Look Sway Yaw)
    swP: createSpring(110, 15), // 瞄准垂直摆动 (Look Sway Pitch)
    jY: createSpring(140, 13), // 跳跃/下落水平晃动
    jP: createSpring(140, 13), // 跳跃/下落垂直晃动
    bump: createSpring(600, 30), // 着陆撞击弹簧
  };

  const debug = {
    freeze: false,
    reloadT: null,
    empty: false,
    flash: false,
    noFire: false,
  };

  const weapon = {
    name: PAC9_MODEL_PARAMS.name,
    ammo: MAG_CAPACITY,
    magSize: MAG_CAPACITY,
    reserve: DEFAULT_RESERVE_AMMO,
    state: "idle",
    ads: 0,
    spread: 0.0125,
    damage: BASE_DAMAGE,
    rpm: FIRE_RATE_RPM,
    root,
    debug,
    info: {
      tris: Math.round(totalTris),
      meshes: totalMeshes,
    },
    update,
    reset,
    setVisible(v) {
      root.visible = !!v;
    },
    muzzleWorld: getMuzzleWorldPos,
    reloadNow: triggerReload,
    addAmmo(count) {
      weapon.reserve += count;
    },
    setWetness(w) {
      pac9RainUniform.value = Math.max(0, Math.min(1, +w || 0));
    },
    get reloading() {
      return state.reload !== null;
    },
    snap() {
      state.adsLin = ctx.input.ads ? 1 : 0;
      for (const s of ["kZ", "kP", "kY", "kR", "swY", "swP", "jY", "jP", "bump"]) {
        state[s].x = 0;
        state[s].v = 0;
      }
      state.sprintT = ctx.player.sprinting ? 1 : 0;
    },
  };

  /**
   * 重置枪械所有状态
   */
  function reset() {
    weapon.ammo = MAG_CAPACITY;
    weapon.reserve = DEFAULT_RESERVE_AMMO;
    weapon.state = "idle";
    weapon.ads = 0;
    Object.assign(state, {
      cooldown: 0,
      prevFire: false,
      dryDone: false,
      autoReload: -1,
      reload: null,
      burst: 0,
      lastShot: -9,
      bloom: 0,
      heat: 0,
      smoke: 0,
      adsLin: 0,
      adsE: 0,
      sprintT: 0,
      reloadW: 0,
      boltT: 9,
      boltLocked: false,
      flashT: 0,
      idleT: 0,
      inspect: -1,
    });
    for (const s of ["kZ", "kP", "kY", "kR", "swY", "swP", "jY", "jP", "bump"]) {
      state[s].x = 0;
      state[s].v = 0;
    }
    topRoundMesh.visible = true;
    magGroup.visible = true;
    magGroup.position.copy(magDefaultPos);
    magGroup.quaternion.identity();
    leftHandGroup.position.copy(poseGripHandguard.p);
    leftHandGroup.quaternion.copy(poseGripHandguard.q);
  }

  /**
   * 计算枪身局部点变换到世界坐标 (考虑武器视场角投影补偿)
   */
  function localPointToWorld(localArr, outVec) {
    root.updateMatrix();
    outVec.fromArray(localArr).applyMatrix4(root.matrix);
    const cam = ctx.camera;
    const fovCompensation =
      Math.tan((cam.fov * Math.PI) / 360) / Math.tan((ctx.viewCamera.fov * Math.PI) / 360);
    outVec.x *= fovCompensation;
    outVec.y *= fovCompensation;
    return outVec.applyQuaternion(cam.quaternion).add(cam.position);
  }

  function getMuzzleWorldPos(outVec = new Vector3_()) {
    return localPointToWorld(PAC9_MODEL_PARAMS.muzzle, outVec);
  }

  /**
   * 触发主动换弹
   */
  function triggerReload() {
    if (state.reload || weapon.ammo >= weapon.magSize || weapon.reserve <= 0) return false;
    const isEmpty = weapon.ammo <= 0;
    state.reload = {
      t: 0,
      T: isEmpty ? RELOAD_DURATION_EMPTY : RELOAD_DURATION_TACTICAL,
      empty: isEmpty,
      f: {},
    };
    state.autoReload = -1;
    ctx.events.emit("weapon:reload", { phase: "start", empty: isEmpty });
    return true;
  }

  // 临时向量
  const vRayDir = new Vector3_();
  const vMuzzlePos = new Vector3_();
  const vHitPos = new Vector3_();
  const vEjectPos = new Vector3_();
  const vShellVel = new Vector3_();
  const vEyePos = new Vector3_();

  /**
   * 击发核心物理过程 (Raycast, Ballistics, Visual/Audio Effects)
   */
  function fireShot() {
    const player = ctx.player;
    const camera = ctx.camera;

    weapon.ammo--;
    state.burst++;
    state.lastShot = state.t;
    state.heat = Math.min(1.3, state.heat + 0.05);

    // 弹道锥形随机散布
    const spread = weapon.spread;
    const spreadAngle = random() * Math.PI * 2;
    const spreadRadius = Math.tan(spread) * Math.sqrt(random());

    vRayDir
      .set(Math.cos(spreadAngle) * spreadRadius, Math.sin(spreadAngle) * spreadRadius, -1)
      .normalize()
      .applyQuaternion(camera.quaternion);

    vEyePos.copy(player.eye || camera.position);

    // 命中测试 (射线检测)
    let hitResult = null;
    try {
      hitResult = ctx.combat.playerShot(vEyePos, vRayDir, {
        damage: BASE_DAMAGE,
        range: MAX_FIRE_RANGE,
      });
    } catch (e) {
      console.warn("[weapon] playerShot calculation error:", e);
    }

    if (hitResult && hitResult.point) {
      vHitPos.copy(hitResult.point);
    } else {
      vHitPos.copy(vEyePos).addScaledVector(vRayDir, MAX_FIRE_RANGE);
    }

    getMuzzleWorldPos(vMuzzlePos);

    // 触发特效 (弹道曳光与抛壳)
    const fx = ctx.fx;
    if (fx) {
      if (fx.tracer) fx.tracer(vMuzzlePos, vHitPos);
      if (fx.shell) {
        localPointToWorld(PAC9_MODEL_PARAMS.eject, vEjectPos);
        vShellVel
          .set(2 + random() * 1.2, 1.2 + random() * 0.8, 0.5 - random() * 0.6)
          .applyQuaternion(camera.quaternion);
        if (player.vel) vShellVel.add(player.vel);
        fx.shell(vEjectPos, vShellVel);
      }
    }

    // 枪口动态点光源闪烁
    if (ctx.render && ctx.render.lightPool && ctx.render.lightPool.flash) {
      ctx.render.lightPool.flash(vMuzzlePos, 0xffa020, 45, 9, 0.05);
    }

    ctx.events.emit("weapon:fire", {
      origin: vEyePos,
      dir: vRayDir,
      muzzle: vMuzzlePos,
      ads: state.adsE,
    });

    // 后坐力计算与施加给玩家视角
    const adsFactor = lerp(1, 0.55, state.adsE) * (player.crouching ? 0.85 : 1);
    const burstCount = state.burst;
    const recoilScale = burstCount <= 9 ? 1 : 0.38;
    const recoilYaw =
      (burstCount < 4
        ? (random() - 0.5) * 0.0022
        : Math.sin(burstCount * 0.57 + state.recPhase) * 0.0042 + (random() - 0.5) * 0.002) *
      adsFactor;

    if (player.addRecoil) {
      player.addRecoil(0.0068 * recoilScale * adsFactor * (0.85 + random() * 0.3), recoilYaw);
    }
    if (player.addShake) {
      player.addShake(0.12 * adsFactor);
    }

    // 视模弹簧冲量激振
    state.kZ.v += 1.5 * lerp(1, 0.6, state.adsE);
    state.kP.v += 1.5 * adsFactor;
    state.kY.v += (random() - 0.5) * 1 * adsFactor;
    state.kR.v += (random() - 0.5) * 1.8 * adsFactor;
    state.bloom = Math.min(1, state.bloom + 0.17);
    state.flashT = state.flashDur = 0.036 + random() * 0.02;

    // 枪口焰 Shader 参数
    const flashUniforms = muzzleFlashMesh.material.uniforms;
    flashUniforms.uSeed.value = random() * 100;
    flashUniforms.uJet.value = 0.6 + random() * 0.6;
    muzzleFlashMesh.rotation.z = (random() - 0.5) * 0.4;

    const flashScale = (0.8 + random() * 0.5) * lerp(1, 0.62, state.adsE);
    muzzleFlashMesh.scale.set(flashScale, flashScale, flashScale * (0.8 + random() * 0.5));

    state.boltT = 0;
    if (weapon.ammo <= 0) {
      state.boltLocked = true;
      topRoundMesh.visible = false;
    }
  }

  /**
   * 换弹时间线机理与左右手状态机
   * @param {number} dt
   * @returns {number} rackBoltProgress
   */
  function updateReloadTimeline(dt) {
    let rackBoltProgress = 0;
    if (debug.reloadT != null && !state.reload) {
      state.reload = {
        t: 0,
        T: debug.empty ? RELOAD_DURATION_EMPTY : RELOAD_DURATION_TACTICAL,
        empty: debug.empty,
        f: {},
      };
    }

    if (!state.reload) return rackBoltProgress;

    const reloadData = state.reload;
    if (debug.reloadT != null) {
      reloadData.t = debug.reloadT;
    } else {
      reloadData.t += dt;
    }
    const curT = reloadData.t;

    const triggerPhase = (phaseName, timestamp) => {
      if (curT >= timestamp && !reloadData.f[phaseName]) {
        reloadData.f[phaseName] = 1;
        ctx.events.emit("weapon:reload", { phase: phaseName, empty: reloadData.empty });
        return true;
      }
      return false;
    };

    // 阶段 1: 拔出旧弹匣
    if (triggerPhase("magout", T_MAG_OUT)) {
      state.bump.v -= 0.25;
    }
    if (curT > 0.86 && !reloadData.f.fresh) {
      reloadData.f.fresh = 1;
      topRoundMesh.visible = true;
    }

    // 阶段 2: 插入新弹匣
    if (triggerPhase("magin", T_MAG_IN)) {
      state.bump.v += 0.55;
      const addCount = Math.min(weapon.magSize - weapon.ammo, weapon.reserve);
      weapon.ammo += addCount;
      weapon.reserve -= addCount;
      if (!reloadData.empty) {
        state.boltLocked = false;
      }
    }

    // 阶段 3: 拍实弹匣底板
    if (curT >= 1.5 && !reloadData.f.tap) {
      reloadData.f.tap = 1;
      state.bump.v += 0.4;
    }

    // 阶段 4: 空仓换弹专属 —— 拉动拉机柄
    if (reloadData.empty) {
      if (curT >= T_RACK_START) {
        rackBoltProgress =
          curT < T_RACK_BACK
            ? smootherstep((curT - T_RACK_START) / (T_RACK_BACK - T_RACK_START))
            : curT < T_RACK_RELEASE
              ? 1
              : Math.max(0, 1 - (curT - T_RACK_RELEASE) / 0.035);
      }
      if (triggerPhase("bolt", T_RACK_RELEASE)) {
        state.boltLocked = false;
        state.bump.v += 0.3;
        state.kZ.v -= 0.5;
      }
    }

    // 关键帧插值驱动左手位姿
    sampleHandKeyframes(reloadData.empty ? kfEmptyReload : kfTacticalReload, curT);
    leftHandGroup.position.copy(tempVec);
    leftHandGroup.quaternion.copy(tempQuat1);

    // 弹匣跟随手部移动（拔出至插入区间）
    if (curT >= T_MAG_OUT && curT < T_MAG_IN) {
      tempQuat2.copy(tempQuat1).multiply(leftHandMagInvert);
      magGroup.quaternion.copy(tempQuat2);
      magGroup.position
        .copy(magDefaultPos)
        .sub(poseAtMagWell.p)
        .applyQuaternion(tempQuat2)
        .add(tempVec);
    } else {
      magGroup.quaternion.identity();
      magGroup.position.copy(magDefaultPos);
    }

    const enterBlend = smootherstep(curT / 0.3);
    const exitBlend = 1 - smootherstep((curT - (reloadData.T - 0.46)) / 0.4);
    state.reloadW = Math.min(enterBlend, exitBlend);
    state.rackW = reloadData.empty ? smootherstep((curT - 1.62) / 0.3) * exitBlend : 0;

    if (curT >= reloadData.T && debug.reloadT == null) {
      state.reload = null;
      state.reloadW = 0;
      state.rackW = 0;
      ctx.events.emit("weapon:reload", { phase: "done" });
      leftHandGroup.position.copy(poseGripHandguard.p);
      leftHandGroup.quaternion.copy(poseGripHandguard.q);
    }

    return rackBoltProgress;
  }

  /**
   * 闲置检视 (Weapon Inspect) 动画状态机计算
   * @param {number} dt
   * @param {number} moveSpeed
   * @param {boolean} wantsFire
   * @param {any} input
   * @returns {{ inspectPitch: number, inspectYaw: number, inspectRoll: number }}
   */
  function updateInspectAnimation(dt, moveSpeed, wantsFire, input) {
    const isMovingOrLooking =
      wantsFire ||
      !!input.ads ||
      !!state.reload ||
      moveSpeed > 0.2 ||
      (input.look && Math.abs(input.look.dx) + Math.abs(input.look.dy) > 0.002) ||
      state.sprintT > 0.1;

    if (isMovingOrLooking) {
      state.idleT = 0;
      if (state.inspect >= 0) state.inspect = Math.max(state.inspect, 2.9);
    } else {
      state.idleT += dt;
    }
    if (state.inspect < 0 && state.idleT > 24) {
      state.inspect = 0;
    }

    let inspectPitch = 0;
    let inspectYaw = 0;
    let inspectRoll = 0;

    if (state.inspect >= 0) {
      const inspT = (state.inspect += dt);
      inspectPitch = smootherstep(inspT / 0.5) * (1 - smootherstep((inspT - 1.4) / 0.5));
      inspectYaw = smootherstep((inspT - 1.5) / 0.5) * (1 - smootherstep((inspT - 2.8) / 0.5));
      inspectRoll = smootherstep(inspT / 0.5) * (1 - smootherstep((inspT - 2.9) / 0.5));
      if (inspT > 3.5) {
        state.inspect = -1;
        state.idleT = 0;
      }
    }

    return { inspectPitch, inspectYaw, inspectRoll };
  }

  /**
   * 视模动力学物理弹簧步进 (Sway, Springs, Bobbing)
   * @param {number} dt
   * @param {any} player
   * @param {any} input
   * @param {number} moveSpeed
   */
  function updateSwayAndSprings(dt, player, input, moveSpeed) {
    const isOnGround = player.onGround !== false;
    const velY = player.vel ? player.vel.y : 0;

    state.bobAmt = damp(state.bobAmt, isOnGround ? saturate(moveSpeed / 3.6) : 0, 8, dt);
    state.bobPhase += dt * (moveSpeed > 0.3 && isOnGround ? 5.2 + moveSpeed * 1.55 : 0);

    const swaySensitivity = lerp(1, 0.4, state.adsE);

    // 瞄准随动摆动 (Look Sway)
    state.swY.v += clamp(input.look ? input.look.dx : 0, -0.2, 0.2) * 3.2 * swaySensitivity;
    state.swP.v += clamp(input.look ? input.look.dy : 0, -0.2, 0.2) * 2.6 * swaySensitivity;
    stepSpring(state.swY, 0, dt);
    stepSpring(state.swP, 0, dt);
    state.swY.x = clamp(state.swY.x, -0.09, 0.09);
    state.swP.x = clamp(state.swP.x, -0.07, 0.07);

    // 跳跃与着陆冲量反馈
    if (state.wasGround && !isOnGround && velY > 1) {
      state.jY.v -= 0.22;
      state.jP.v += 0.7;
    }
    if (!state.wasGround && isOnGround) {
      const landImpulse = clamp(-state.lastVy * 0.06, 0, 0.6);
      state.jY.v -= landImpulse;
      state.jP.v -= landImpulse * 3.2;
      state.kR.v += (random() - 0.5) * landImpulse * 2;
    }
    state.wasGround = isOnGround;
    if (!isOnGround) state.lastVy = velY;

    // 步进所有动力学物理弹簧
    stepSpring(state.jY, isOnGround ? 0 : clamp(-velY * 0.0045, -0.02, 0.024), dt);
    stepSpring(state.jP, isOnGround ? 0 : clamp(velY * 0.012, -0.06, 0.06), dt);
    stepSpring(state.kZ, 0, dt);
    stepSpring(state.kP, 0, dt);
    stepSpring(state.kY, 0, dt);
    stepSpring(state.kR, 0, dt);
    stepSpring(state.bump, 0, dt);
  }

  /**
   * 视模每帧动力学更新与姿态插值
   * @param {number} dt 帧耗时 (秒)
   */
  function update(dt) {
    const player = ctx.player;
    const input = ctx.input;
    if (!player || !input || !player.alive) {
      state.prevFire = false;
      if (muzzleFlashMesh) muzzleFlashMesh.visible = false;
      return;
    }

    state.t += dt;

    // 射击输入检测
    const wantsFire = !!input.fire && root.visible && !debug.noFire;
    state.prevFire = wantsFire;
    if (!wantsFire) state.dryDone = false;

    // 疾跑状态判定
    const isSprinting = !!player.sprinting && !wantsFire && !input.ads && !state.reload;
    state.sprintT = damp(state.sprintT, isSprinting ? 1 : 0, 9, dt);

    // 换弹按键与空仓自动换弹
    if (input.pressed && input.pressed("reload")) {
      triggerReload();
    }
    if (state.autoReload >= 0) {
      state.autoReload -= dt;
      if (state.autoReload < 0) triggerReload();
    }

    // 换弹时间线机理与左右手状态机
    const rackBoltProgress = updateReloadTimeline(dt);

    // 冷却与射击执行
    state.cooldown -= dt;
    const canFire = !state.reload && state.sprintT < 0.45;
    if (wantsFire && canFire) {
      if (weapon.ammo > 0) {
        let maxShotsPerFrame = 0;
        while (state.cooldown <= 0 && weapon.ammo > 0 && maxShotsPerFrame < 3) {
          fireShot();
          state.cooldown += 60 / FIRE_RATE_RPM;
          maxShotsPerFrame++;
        }
      } else if (!state.dryDone) {
        state.dryDone = true;
        ctx.events.emit("weapon:dry", {});
        state.bump.v -= 0.08;
        if (weapon.reserve > 0) {
          state.autoReload = 0.32;
        }
      }
    }

    if (state.cooldown < 0) state.cooldown = Math.max(state.cooldown, -0.001);

    // 连发散布与枪管热量、轻微枪口冒烟
    if (state.t - state.lastShot > 0.24) {
      if (state.burst > 0) state.recPhase = random() * 6.28;
      state.burst = 0;
    }
    state.bloom = Math.max(0, state.bloom - dt * 1.5);

    if (
      state.t - state.lastShot > 0.11 &&
      state.t - state.lastShot < 0.11 + dt * 1.5 &&
      state.heat > 0.4
    ) {
      state.smoke = Math.min(1.6, state.heat * 1.3);
    }
    if (state.smoke > 0) {
      state.smoke -= dt;
      state.smokeTick -= dt;
      if (state.smokeTick <= 0 && ctx.fx && ctx.fx.smoke) {
        state.smokeTick = 0.085;
        getMuzzleWorldPos(vMuzzlePos);
        ctx.fx.smoke(vMuzzlePos, {
          size: 0.1 + state.smoke * 0.06,
          life: 1.3,
          rise: 0.5,
          count: 1,
          alpha: 0.22,
        });
      }
    }
    state.heat = Math.max(0, state.heat - dt * 0.2);

    // ADS (开镜瞄准) 进度平滑
    const wantsAds = !!input.ads && !state.reload && state.sprintT < 0.35;
    state.adsLin = clamp(state.adsLin + (wantsAds ? dt : -dt) / 0.18, 0, 1);
    state.adsE = smootherstep(state.adsLin);
    weapon.ads = state.adsE;

    // 动态散布锥形角计算
    const moveSpeed = player.speed || 0;
    const speedRatio = saturate(moveSpeed / 6);
    const targetSpread =
      lerp(0.0125, 0.0012, state.adsE) +
      speedRatio * lerp(0.013, 0.004, state.adsE) +
      state.bloom * lerp(0.0065, 0.0022, state.adsE) +
      (player.onGround === false ? 0.022 : 0) -
      (player.crouching ? 0.002 * (1 - state.adsE) : 0);

    state.spreadS = damp(state.spreadS, targetSpread, 18, dt);
    weapon.spread = state.spreadS;

    // 闲置检视 (Weapon Inspect)
    const { inspectPitch, inspectYaw, inspectRoll } = updateInspectAnimation(
      dt,
      moveSpeed,
      wantsFire,
      input,
    );

    // 枪械核心状态名更新
    weapon.state = state.reload
      ? "reloading"
      : state.inspect >= 0
        ? "inspect"
        : state.sprintT > 0.5
          ? "sprinting"
          : state.t - state.lastShot < 0.14
            ? "firing"
            : "idle";

    // 往复式枪机运动
    state.boltT += dt;
    const cycleDur = 0.072;
    let boltOffsetNorm = state.boltT < cycleDur ? Math.sin((Math.PI * state.boltT) / cycleDur) : 0;
    if (state.boltLocked && state.boltT > cycleDur * 0.5) {
      boltOffsetNorm = Math.max(boltOffsetNorm, 0.86);
    }
    boltMesh.position.z =
      PAC9_MODEL_PARAMS.boltTravel * Math.max(boltOffsetNorm * 0.95, rackBoltProgress);

    // 扣动扳机手启动指关节变形
    state.finger = damp(state.finger, (wantsFire && canFire) || debug.flash ? 1 : 0, 30, dt);
    updateTriggerFinger(state.finger);

    // 枪口焰动态明暗
    const flashMatUniforms = muzzleFlashMesh.material.uniforms;
    if (debug.flash) {
      state.flashT = state.flashDur = 0.05;
      flashMatUniforms.uSeed.value = 3.7;
    }
    state.flashT -= dt;
    flashMatUniforms.uInt.value =
      state.flashT > 0 ? 9.5 * Math.sqrt(Math.max(0, state.flashT / state.flashDur)) : 0;
    flashMatUniforms.uHeat.value = saturate((state.heat - 0.45) / 0.8) * 2.2;
    muzzleFlashMesh.visible =
      flashMatUniforms.uInt.value > 0 || flashMatUniforms.uHeat.value > 0.02;

    if (debug.freeze) return;

    // 步进瞄准抖动与弹簧
    updateSwayAndSprings(dt, player, input, moveSpeed);

    // 跑动步伐摆动计算
    const curBobPhase = state.bobPhase;
    const bobIntensity = state.bobAmt * lerp(1, 0.12, state.adsE) * (1 + state.sprintT * 1.4);
    const bobX = Math.sin(curBobPhase) * 0.006 * bobIntensity;
    const bobY =
      (Math.sin(2 * curBobPhase) * 0.0042 -
        Math.pow(0.5 + 0.5 * Math.cos(2 * curBobPhase + 0.6), 4) * 0.0048) *
      bobIntensity;

    const adsInvertRatio = lerp(1, 0.3, state.adsE);
    const curTime = state.t;

    // 最终位置与姿态融合
    const moveX = input.move ? input.move.x : 0;
    const moveY = input.move ? input.move.y : 0;
    const hipWeight = 1 - state.adsE;
    const adsWeight = state.adsE;
    const sprintWeight = state.sprintT;
    const reloadWeight = state.reloadW;
    const rackWeight = state.rackW;

    // 视模位置计算
    const finalPosX =
      lerp(POSE_HIPFIRE.p[0], POSE_ADS.p[0], adsWeight) +
      POSE_SPRINT.p[0] * sprintWeight +
      POSE_RELOAD.p[0] * reloadWeight +
      bobX +
      Math.sin(curTime * 0.85 + 1) * 0.0012 * adsInvertRatio -
      state.swY.x * 0.06 -
      moveX * 0.004 * hipWeight -
      0.035 * inspectRoll;

    const finalPosY =
      lerp(POSE_HIPFIRE.p[1], POSE_ADS.p[1], adsWeight) +
      POSE_SPRINT.p[1] * sprintWeight +
      POSE_RELOAD.p[1] * reloadWeight +
      bobY +
      Math.sin(curTime * 1.7) * 0.0016 * adsInvertRatio +
      state.swP.x * 0.05 +
      state.jY.x +
      state.bump.x * 0.6 +
      0.045 * inspectRoll;

    const finalPosZ =
      lerp(POSE_HIPFIRE.p[2], POSE_ADS.p[2], adsWeight) +
      POSE_SPRINT.p[2] * sprintWeight +
      POSE_RELOAD.p[2] * reloadWeight +
      state.kZ.x * 0.55 +
      moveY * 0.004 * hipWeight * (1 - sprintWeight);

    // 视模旋转计算 (YXZ 欧拉角)
    const finalRotPitch =
      POSE_HIPFIRE.r[0] * hipWeight +
      POSE_SPRINT.r[0] * sprintWeight +
      POSE_RELOAD.r[0] * reloadWeight -
      0.16 * rackWeight +
      Math.sin(curTime * 1.7 + 0.8) * 0.0035 * adsInvertRatio +
      Math.sin(2 * curBobPhase + 0.5) * 0.008 * bobIntensity +
      state.swP.x +
      state.jP.x +
      state.kP.x +
      state.bump.x * 1.5 +
      0.3 * inspectRoll;

    const finalRotYaw =
      POSE_HIPFIRE.r[1] * hipWeight +
      POSE_SPRINT.r[1] * sprintWeight +
      POSE_RELOAD.r[1] * reloadWeight +
      Math.sin(curTime * 0.6) * 0.002 * adsInvertRatio +
      Math.sin(curBobPhase) * 0.01 * bobIntensity +
      state.swY.x +
      state.kY.x +
      0.18 * inspectRoll +
      0.25 * inspectYaw;

    const finalRotRoll =
      POSE_HIPFIRE.r[2] * hipWeight +
      POSE_SPRINT.r[2] * sprintWeight +
      POSE_RELOAD.r[2] * reloadWeight +
      0.62 * rackWeight +
      Math.sin(curBobPhase) * 0.014 * bobIntensity +
      state.swY.x * 0.7 -
      moveX * 0.035 * hipWeight +
      state.kR.x -
      0.75 * inspectPitch +
      0.55 * inspectYaw +
      Math.sin(curTime * 0.5) * 0.004 * adsInvertRatio;

    root.position.set(finalPosX, finalPosY, finalPosZ);
    root.rotation.set(finalRotPitch, finalRotYaw, finalRotRoll, "YXZ");
  }

  reset();
  return weapon;
}

/**
 * 展台/检视模式控制器 (Weapon Showcase Studio Mode)
 * 支持 ?show=weapon 独立参数调试枪模外观、各部细节与换弹动作
 * @param {object} ctx 全局上下文
 */
async function createShowcase(ctx) {
  const weaponInstance = await createWeapon(ctx);
  ctx.weapon = weaponInstance;
  const root = weaponInstance.root;

  const defaultCamPos = new Vector3_(0, 1.68, 4);
  const lookDirections = {
    south: [0.28, -0.01, 1],
    east: [1, 0, 0.25],
    north: [-0.2, -0.01, -1],
    west: [-1, 0, 0.1],
    nw: [-0.75, -0.01, -0.65],
  };

  const cameraPresets = {
    side: [Math.PI, [1.12, 1.3, 0.11], [0, 1.235, 0.11], 30],
    right: [0, [1.12, 1.3, -0.11], [0, 1.235, -0.11], 30],
    top: [Math.PI * 0.86, [0.62, 1.8, -0.42], [0, 1.24, 0.12], 32],
    hands: [Math.PI, [0.4, 1.4, 0.02], [0.02, 1.215, 0.25], 30],
    rhand: [0, [0.36, 1.22, 0.27], [0.03, 1.16, 0.09], 30],
    muzzle: [Math.PI, [0.26, 1.37, 0.98], [0, 1.262, 0.44], 30],
    optic: [Math.PI, [0.2, 1.4, -0.26], [0, 1.31, 0.02], 30],
    lower: [Math.PI, [0.34, 1.26, 0.04], [0, 1.2, 0.03], 30],
  };

  const setShotCallback = window.__setShot;
  let currentPoseName = null;

  function applyPreset(poseName, options = {}) {
    currentPoseName = poseName;
    const preset = cameraPresets[poseName];
    const input = ctx.input;
    const player = ctx.player;

    input.ads = false;
    input.fire = false;
    player.sprinting = false;
    player.speed = 0;
    weaponInstance.debug.reloadT = null;
    weaponInstance.debug.flash = false;
    weaponInstance.debug.empty = false;
    weaponInstance.debug.freeze = !!preset;
    weaponInstance.reset();

    let camPos, camTarget, fov;

    if (preset) {
      // 工作台展台视角
      ctx.scene.add(root);
      root.position.set(0, 1.25, 0);
      root.rotation.set(0, preset[0], 0, "YXZ");
      root.traverse((mesh) => mesh.layers.set(FACTION_PLAYER));
      camPos = preset[1];
      camTarget = preset[2];
      fov = preset[3];
      if (options.wt != null) {
        weaponInstance.debug.reloadT = +options.wt;
        weaponInstance.debug.empty = !!options.wempty;
      }
    } else {
      // 第一人称持枪视角
      ctx.camera.add(root);
      root.traverse((mesh) => mesh.layers.set(FACTION_ENEMY));
      const lookDir = lookDirections[options.wlook] || lookDirections.south;
      camPos = [defaultCamPos.x, defaultCamPos.y, defaultCamPos.z];
      camTarget = [
        defaultCamPos.x + lookDir[0] * 50,
        defaultCamPos.y + lookDir[1] * 50,
        defaultCamPos.z + lookDir[2] * 50,
      ];
      fov = 74;

      if (poseName === "ads") {
        input.ads = true;
        fov = 52;
      }
      if (poseName === "sprint") {
        player.sprinting = true;
        player.speed = 6;
      }
      if (poseName === "fire") {
        weaponInstance.debug.flash = true;
        if (options.wads) {
          input.ads = true;
          fov = 52;
        }
      }
      if (poseName === "reload" || poseName === "empty") {
        weaponInstance.debug.reloadT = options.wt != null ? +options.wt : 0.62;
        weaponInstance.debug.empty = poseName === "empty";
      }
      if (poseName === "empty") {
        weaponInstance.ammo = 0;
      }
    }

    weaponInstance.snap();
    weaponInstance.update(0.016);
    weaponInstance.snap();

    if (setShotCallback) {
      setShotCallback({
        cam: options.cam || [...camPos, ...camTarget].join(","),
        fov: options.fov || fov,
        exposure: options.exposure,
      });
    }

    return { cam: camPos, target: camTarget };
  }

  const onShotChange = (opts) => {
    if (opts && opts.wpose) {
      applyPreset(opts.wpose, opts);
    } else if (setShotCallback) {
      setShotCallback(opts);
    }
  };

  if (typeof window !== "undefined") {
    if (
      typeof window.__setShot === "function" &&
      typeof window.__setShot.subscribe === "function"
    ) {
      window.__setShot.subscribe(onShotChange);
    } else {
      const prevSetShot = window.__setShot;
      window.__setShot = (opts) => {
        onShotChange(opts);
        if (typeof prevSetShot === "function") prevSetShot(opts);
      };
    }
  }

  const initialShot = applyPreset(ctx.params.wpose || "hip", ctx.params);

  return {
    cam: initialShot.cam,
    target: initialShot.target,
    update(dt) {
      weaponInstance.update(dt);
      if (currentPoseName === "fire") {
        weaponInstance.debug.flash = true;
      }
    },
  };
}

const dm = createWeapon;
const PC = createShowcase;
const Xv = { create: dm, showcase: PC };
export const create = createWeapon;
export const showcase = createShowcase;
export { dm, PC, Xv };

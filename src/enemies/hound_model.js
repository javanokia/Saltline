import * as THREE from "three";
import { createTubeFromPoints } from "../geo.js";
import {
  SkeletonRig,
  createSkinnedMesh,
  placeGeometry,
  createBeveledBox,
  createCylinderY,
  createCylinderX,
  createCylinderZ,
  createPipeBetweenPoints,
  createScaledSphere,
  createBoltX,
  createBoltY,
  createBoltZ,
  HALF_PI,
  COLOR_SHELL_WHITE,
  COLOR_SHELL_WARM,
  COLOR_HAZARD_ORANGE,
  COLOR_DARK_ALLOY,
  COLOR_CHASSIS_BLACK,
  COLOR_AMBER_WARNING,
  COLOR_NEUTRAL_WHITE,
  COLOR_CHROME_BRIGHT,
  COLOR_GUNMETAL_GREY,
  LENS_COLOR_AMBER_PATROL,
  LENS_COLOR_RED_ALERT,
} from "./rig.js";
import { clampValue, diffAngle, intersectRayCapsule, intersectRaySphere } from "./math.js";

const { TorusGeometry: Ci, Mesh: Qe, Vector3: W, PlaneGeometry: rn } = THREE;

const DOWN_DIR = new W(0, -1, 0);
const tempSparkPos = new W();

/**
 * 3自由度四足腿部解析逆运动学解算器 (3-DOF Quadruped Leg Analytic IK Solver)
 * 计算大腿外展 (Abduction)、大腿俯仰 (Hip Pitch) 与小腿弯曲 (Knee Bend)
 *
 * @param {object} outAngles 输出角载体 { abd, hip, knee, reach }
 * @param {number} targetX 髋关节局部坐标 X
 * @param {number} targetY 髋关节局部坐标 Y
 * @param {number} targetZ 髋关节局部坐标 Z
 * @param {number} legSide 肢体侧向标识 (+1: 左肢, -1: 右肢)
 * @param {number} l0 髋关节外展轴横向偏置距离
 * @param {number} L1 大腿骨长 (Femur)
 * @param {number} L2 小腿骨长 (Tibia)
 * @returns {object} outAngles
 */
function solveLegIK(outAngles, targetX, targetY, targetZ, legSide, l0, L1, L2) {
  const lateralDistSq = targetX * targetX + targetY * targetY;
  const planarY = Math.sqrt(Math.max(lateralDistSq - l0 * l0, 1e-6));

  // 1. 髋关节外展/内收角 (Abduction / Adduction)
  outAngles.abd = Math.atan2(targetY, targetX) - Math.atan2(-planarY, legSide * l0);
  if (outAngles.abd > Math.PI) outAngles.abd -= 2 * Math.PI;
  else if (outAngles.abd < -Math.PI) outAngles.abd += 2 * Math.PI;

  // 2. 肢体伸展可达性与余弦定理解算 (Planar Reach & Law of Cosines)
  let reachDist = Math.hypot(planarY, targetZ);
  const maxReach = (L1 + L2) * 0.995;
  const minReach = Math.abs(L1 - L2) + 0.03;
  outAngles.reach = reachDist / (L1 + L2);

  if (reachDist > maxReach) reachDist = maxReach;
  else if (reachDist < minReach) reachDist = minReach;

  const elevationAngle = Math.atan2(targetZ, planarY);
  const cosHip = (L1 * L1 + reachDist * reachDist - L2 * L2) / (2 * L1 * reachDist);
  const cosKnee = (L1 * L1 + L2 * L2 - reachDist * reachDist) / (2 * L1 * L2);

  const clampedCosHip = Math.max(-1, Math.min(1, cosHip));
  const clampedCosKnee = Math.max(-1, Math.min(1, cosKnee));

  const hipAngle = Math.acos(clampedCosHip);
  const kneeAngle = Math.acos(clampedCosKnee);

  outAngles.hip = hipAngle - elevationAngle;
  outAngles.knee = -(Math.PI - kneeAngle);
  return outAngles;
}

// ============================================================================
// 机械猎犬骨骼拓扑与几何装配 (Hound Procedural Rigging)
// ============================================================================

const HOUND_RIG_SPEC = {
  stand: 0.72,
  L1: 0.4,
  L2: 0.42,
  l0: 0.075,
  hipX: 0.165,
  hipY: -0.01,
  hipZ: 0.4,
  footX: 0.275,
  footZ: [0.37, 0.37, -0.42, -0.42],
  legs: ["FL", "FR", "RL", "RR"],
  side: [1, -1, 1, -1],
  fore: [1, 1, -1, -1],
  muzzle: [0, 0, 0.43],
  eye: [0, 0, 0.14],
  footR: 0.046,
};

const $v = HOUND_RIG_SPEC;

/**
 * 组装机械猎犬（Hound）的程序化骨架与几何构件
 */
function buildHoundRig() {
  const spec = HOUND_RIG_SPEC;
  const rig = new SkeletonRig();

  // 1. 骨骼拓扑树 (Hierarchy)
  rig.bone("root", null, 0, 0, 0);
  rig.bone("body", "root", 0, spec.stand, 0);
  rig.bone("neck", "body", 0, 0.06, 0.49);
  rig.bone("head", "neck", 0, 0.13, 0.12);
  rig.bone("turret", "body", 0, 0.152, -0.03);
  rig.bone("gun", "turret", 0, 0.095, 0.02);
  rig.bone("antenna", "body", -0.105, 0.15, -0.46);
  rig.bone("beacon", "body", 0.105, 0.2, -0.455);

  for (let n = 0; n < 4; n++) {
    const legName = spec.legs[n];
    const sideSign = spec.side[n];
    rig.bone("abd" + legName, "body", sideSign * spec.hipX, spec.hipY, spec.fore[n] * spec.hipZ);
    rig.bone("thigh" + legName, "abd" + legName, sideSign * spec.l0, 0, 0);
    rig.bone("shin" + legName, "thigh" + legName, 0, -spec.L1, 0);
  }

  const add = (slot, bone, geo, tint, applyShading) => rig.add(slot, bone, geo, tint, applyShading);

  // 主体底盘与顶部防弹覆板
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.27, 0.2, 0.98, 0.02), 0, -0.01, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.35, 0.05, 0.3, 0.014), 0, 0.125, 0.33),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.35, 0.05, 0.36, 0.014), 0, 0.125, -0.012),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.1, 0.052, 0.36, 0.01), 0, 0.126, -0.012),
    COLOR_SHELL_WARM,
  );

  for (const x of [-0.15, 0.15]) {
    for (const z of [0.21, 0.45, -0.17, 0.145]) {
      add("metal", "body", createBoltY(x, 0.152, z), COLOR_CHROME_BRIGHT);
    }
  }

  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.31, 0.03, 0.25, 0.006), 0, 0.112, -0.335),
    COLOR_NEUTRAL_WHITE,
  );
  for (let n = 0; n < 10; n++) {
    add(
      "metal",
      "body",
      placeGeometry(
        createBeveledBox(0.007, 0.062, 0.225, 0.002),
        -0.126 + n * 0.028,
        0.155,
        -0.335,
      ),
      COLOR_CHROME_BRIGHT,
    );
  }

  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.3, 0.012, 0.02, 0.003), 0, 0.186, -0.24),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.3, 0.012, 0.02, 0.003), 0, 0.186, -0.43),
    COLOR_GUNMETAL_GREY,
  );

  // 两侧装甲、液压导管与吊耳
  for (const side of [1, -1]) {
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.032, 0.15, 0.31, 0.012), side * 0.15, 0.022, -0.075),
      COLOR_SHELL_WHITE,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.032, 0.15, 0.135, 0.012), side * 0.15, 0.022, 0.1625),
      COLOR_SHELL_WARM,
    );
    add(
      "metal",
      "body",
      createTubeFromPoints(
        [
          [side * 0.168, 0.06, 0.125],
          [side * 0.182, 0.06, 0.135],
          [side * 0.182, 0.06, 0.19],
          [side * 0.168, 0.06, 0.2],
        ],
        0.005,
        5,
      ),
      COLOR_CHROME_BRIGHT,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.034, 0.016, 0.135, 0.004), side * 0.151, -0.035, 0.1625),
      COLOR_AMBER_WARNING,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.034, 0.042, 0.46, 0.008), side * 0.151, -0.078, 0),
      COLOR_HAZARD_ORANGE,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.028, 0.1, 0.11, 0.008), side * 0.146, 0.01, 0.305),
      COLOR_DARK_ALLOY,
    );

    for (let s = 0; s < 4; s++) {
      add(
        "metal",
        "body",
        placeGeometry(
          createBeveledBox(0.004, 0.012, 0.085, 0.001),
          side * 0.161,
          -0.02 + s * 0.022,
          0.305,
        ),
        COLOR_GUNMETAL_GREY,
      );
    }

    for (const y of [-0.035, 0.08]) {
      for (const z of [-0.21, 0.06, 0.115, 0.21]) {
        add("metal", "body", createBoltX(side * 0.167, y, z), COLOR_CHROME_BRIGHT);
      }
    }

    add(
      "metal",
      "body",
      createTubeFromPoints(
        [
          [side * 0.135, 0.148, -0.19],
          [side * 0.135, 0.205, -0.16],
          [side * 0.135, 0.212, 0],
          [side * 0.135, 0.205, 0.43],
          [side * 0.135, 0.148, 0.465],
        ],
        0.0105,
        6,
      ),
      COLOR_CHROME_BRIGHT,
    );

    for (const z of [0, 0.26]) {
      add(
        "metal",
        "body",
        placeGeometry(createCylinderY(0.008, 0.008, 0.06, 6), side * 0.135, 0.178, z),
        COLOR_CHROME_BRIGHT,
      );
    }

    add(
      "shell",
      "body",
      createTubeFromPoints(
        [
          [side * 0.118, -0.105, -0.36],
          [side * 0.132, -0.118, -0.2],
          [side * 0.13, -0.112, 0.1],
          [side * 0.118, -0.1, 0.36],
        ],
        0.009,
        5,
      ),
      COLOR_CHASSIS_BLACK,
    );
    add(
      "metal",
      "body",
      placeGeometry(new Ci(0.02, 0.005, 5, 10), side * 0.17, 0.085, -0.335, 0, HALF_PI, 0),
      COLOR_CHROME_BRIGHT,
    );
  }

  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.3, 0.15, 0.075, 0.018), 0, -0.005, 0.505),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.2, 0.07, 0.02, 0.006), 0, 0.012, 0.545),
    COLOR_DARK_ALLOY,
  );

  for (let n = 0; n < 6; n++) {
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.05, 0.034, 0.014, 0.003), -0.125 + n * 0.05, -0.098, 0.538),
      n % 2 ? COLOR_DARK_ALLOY : COLOR_AMBER_WARNING,
    );
  }

  for (const x of [-0.115, 0.115]) {
    add(
      "metal",
      "body",
      placeGeometry(createCylinderZ(0.021, 0.021, 0.014, 10), x, 0.012, 0.547),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "glow",
      "body",
      placeGeometry(createCylinderZ(0.015, 0.015, 0.004, 10), x, 0.012, 0.556),
      [6.5, 4.6, 2.2],
      false,
    );
  }

  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.24, 0.095, 0.56, 0.02), 0, -0.145, 0),
    COLOR_NEUTRAL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.246, 0.03, 0.09, 0.006), 0, -0.14, 0.12),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.246, 0.03, 0.09, 0.006), 0, -0.14, -0.12),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.29, 0.15, 0.05, 0.014), 0, 0, -0.495),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.17, 0.05, 0.012, 0.004), 0, 0.03, -0.523),
    COLOR_DARK_ALLOY,
  );
  add(
    "glow",
    "body",
    placeGeometry(createBeveledBox(0.13, 0.012, 0.004, 0.001), 0, 0.03, -0.531),
    [5, 0.3, 0.1],
    false,
  );
  add(
    "metal",
    "body",
    placeGeometry(createCylinderZ(0.022, 0.022, 0.02, 10), 0.085, -0.035, -0.525),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "metal",
    "body",
    placeGeometry(new Ci(0.024, 0.006, 5, 10), -0.07, -0.05, -0.528, HALF_PI, 0, 0),
    COLOR_CHROME_BRIGHT,
  );

  for (const x of [-0.125, 0.125]) {
    for (const y of [-0.055, 0.055]) {
      add("metal", "body", createBoltZ(x, y, -0.523), COLOR_CHROME_BRIGHT);
    }
  }

  add(
    "shell",
    "body",
    createTubeFromPoints(
      [
        [0.09, 0.15, -0.2],
        [0.13, 0.2, -0.16],
        [0.12, 0.2, -0.08],
        [0.09, 0.165, -0.05],
      ],
      0.009,
      5,
    ),
    COLOR_CHASSIS_BLACK,
  );

  // 颈部与多段关节护罩 (Neck)
  add(
    "metal",
    "neck",
    createPipeBetweenPoints([0, -0.02, -0.02], [0, 0.11, 0.1], 0.045, 0.036, 10),
    COLOR_GUNMETAL_GREY,
  );
  for (let n = 0; n < 3; n++) {
    const s = 0.2 + n * 0.28;
    add(
      "shell",
      "neck",
      createPipeBetweenPoints(
        [0, -0.02 + 0.13 * s - 0.008, -0.02 + 0.12 * s - 0.0075],
        [0, -0.02 + 0.13 * s + 0.008, -0.02 + 0.12 * s + 0.0075],
        0.052,
        0.052,
        10,
      ),
      COLOR_CHASSIS_BLACK,
    );
  }
  add(
    "shell",
    "neck",
    placeGeometry(createBeveledBox(0.13, 0.05, 0.1, 0.012), 0, -0.01, -0.03),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "neck",
    createTubeFromPoints(
      [
        [0.05, -0.02, -0.04],
        [0.07, 0.05, 0.02],
        [0.06, 0.11, 0.07],
        [0.045, 0.12, 0.1],
      ],
      0.007,
      5,
    ),
    COLOR_CHASSIS_BLACK,
  );

  // 头部、多光谱广角主光学镜头与传感器 (Head & Sensor Suite)
  add(
    "shell",
    "head",
    placeGeometry(createBeveledBox(0.19, 0.118, 0.25, 0.03), 0, 0, 0),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "head",
    placeGeometry(createBeveledBox(0.168, 0.074, 0.03, 0.012), 0, -0.004, 0.118),
    COLOR_DARK_ALLOY,
  );
  add(
    "lens",
    "head",
    placeGeometry(createBeveledBox(0.128, 0.024, 0.006, 0.002), 0, 0.006, 0.1345),
    [1, 1, 1],
    false,
  );

  for (const x of [-0.056, 0.056]) {
    add(
      "metal",
      "head",
      placeGeometry(createCylinderZ(0.015, 0.015, 0.012, 10), x, -0.022, 0.132),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "metal",
      "head",
      placeGeometry(createCylinderZ(0.009, 0.009, 0.004, 8), x, -0.022, 0.139),
      [0.1, 0.12, 0.2],
    );
  }

  add(
    "shell",
    "head",
    placeGeometry(createBeveledBox(0.062, 0.008, 0.2, 0.003), 0, 0.06, -0.005),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "metal",
    "head",
    placeGeometry(createCylinderX(0.032, 0.032, 0.214, 12), 0, 0, -0.055),
    COLOR_GUNMETAL_GREY,
  );

  for (const side of [1, -1]) {
    add(
      "shell",
      "head",
      placeGeometry(createCylinderX(0.022, 0.022, 0.006, 10), side * 0.108, 0, -0.055),
      COLOR_HAZARD_ORANGE,
    );
  }

  add(
    "metal",
    "head",
    placeGeometry(createCylinderY(0.036, 0.036, 0.026, 14), 0, 0.072, -0.05),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "head",
    placeGeometry(createCylinderY(0.037, 0.037, 0.006, 14), 0, 0.074, -0.05),
    [0.2, 0.3, 0.5],
  );
  add(
    "metal",
    "head",
    placeGeometry(createBeveledBox(0.12, 0.03, 0.13, 0.008), 0, -0.068, 0.02),
    COLOR_NEUTRAL_WHITE,
  );

  for (const x of [-0.08, 0.08]) {
    for (const z of [-0.09, 0.07]) {
      add("metal", "head", createBoltY(x, 0.061, z), COLOR_CHROME_BRIGHT);
    }
  }

  // 背部双轴重型伺服炮塔座 (Turret Pivot Base)
  add(
    "metal",
    "turret",
    placeGeometry(createCylinderY(0.105, 0.118, 0.034, 18), 0, 0, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "turret",
    placeGeometry(createBeveledBox(0.18, 0.02, 0.16, 0.005), 0, 0.026, 0),
    COLOR_NEUTRAL_WHITE,
  );

  for (const side of [1, -1]) {
    add(
      "shell",
      "turret",
      placeGeometry(createBeveledBox(0.028, 0.115, 0.15, 0.012), side * 0.078, 0.085, 0.005),
      COLOR_SHELL_WHITE,
    );
    add(
      "metal",
      "turret",
      placeGeometry(createCylinderX(0.022, 0.022, 0.008, 10), side * 0.094, 0.095, 0.02),
      COLOR_CHROME_BRIGHT,
    );
  }

  // 大口径战术轨道狙击炮 (Rail Gun / Heavy Auto-Cannon)
  add(
    "shell",
    "gun",
    placeGeometry(createBeveledBox(0.108, 0.086, 0.21, 0.016), 0, 0, -0.012),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "gun",
    placeGeometry(createBeveledBox(0.11, 0.02, 0.212, 0.006), 0, -0.022, -0.012),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderZ(0.035, 0.035, 0.11, 12), 0, 0, 0.145),
    COLOR_GUNMETAL_GREY,
  );

  for (let n = 0; n < 4; n++) {
    add(
      "metal",
      "gun",
      placeGeometry(createCylinderZ(0.039, 0.039, 0.008, 12), 0, 0, 0.105 + n * 0.026),
      COLOR_NEUTRAL_WHITE,
    );
  }

  add(
    "metal",
    "gun",
    placeGeometry(createCylinderZ(0.022, 0.024, 0.3, 12), 0, 0, 0.25),
    COLOR_NEUTRAL_WHITE,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderZ(0.036, 0.036, 0.06, 10), 0, 0, 0.395),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.08, 0.012, 0.025, 0.003), 0, 0, 0.395),
    [0.15, 0.15, 0.15],
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderX(0.056, 0.056, 0.06, 14), 0.084, -0.004, -0.045),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderX(0.02, 0.02, 0.066, 8), 0.084, -0.004, -0.045),
    [5.5, 4, 1.6],
  );
  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.036, 0.036, 0.095, 0.008), -0.03, 0.06, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "glow",
    "gun",
    placeGeometry(createCylinderZ(0.011, 0.011, 0.003, 8), -0.03, 0.06, 0.049),
    [1.6, 0.12, 0.05],
    false,
  );
  add(
    "shell",
    "gun",
    createTubeFromPoints(
      [
        [0.05, -0.03, -0.11],
        [0.06, -0.07, -0.13],
        [0.04, -0.09, -0.1],
      ],
      0.008,
      5,
    ),
    COLOR_CHASSIS_BLACK,
  );

  // 背部战术天线与橙色旋转信标 (High Antenna & Beacon Sphere)
  add(
    "metal",
    "body",
    placeGeometry(createCylinderY(0.022, 0.026, 0.05, 10), 0.105, 0.175, -0.455),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "glow",
    "beacon",
    placeGeometry(createScaledSphere(0.02, 10, 6, 1, 1.25, 1), 0, 0.012, 0),
    [14, 5.5, 0.5],
    false,
  );
  add(
    "metal",
    "antenna",
    placeGeometry(createCylinderY(0.011, 0.014, 0.05, 8), 0, 0.025, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "antenna",
    placeGeometry(createCylinderY(0.0028, 0.005, 0.62, 5), 0, 0.36, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "shell",
    "antenna",
    placeGeometry(createScaledSphere(0.009, 6, 4), 0, 0.67, 0),
    COLOR_HAZARD_ORANGE,
  );

  // 四足高机动肢体 (4 Quadruped Leg Chains)
  for (let n = 0; n < 4; n++) {
    const legName = spec.legs[n];
    const sideSign = spec.side[n];
    const rAbd = "abd" + legName;
    const rThigh = "thigh" + legName;
    const rShin = "shin" + legName;

    // 髋部外展铰链 (Abduction Joint)
    add(
      "metal",
      rAbd,
      placeGeometry(createCylinderZ(0.06, 0.06, 0.17, 14), -sideSign * 0.02, 0, 0),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "shell",
      rAbd,
      placeGeometry(createBeveledBox(0.11, 0.05, 0.155, 0.014), 0, 0.058, 0),
      COLOR_SHELL_WHITE,
    );
    add(
      "metal",
      rAbd,
      placeGeometry(createCylinderZ(0.03, 0.03, 0.18, 8), -sideSign * 0.02, 0, 0),
      COLOR_CHROME_BRIGHT,
    );

    // 大腿连杆与伺服法兰 (Thigh / Femur)
    add(
      "shell",
      rThigh,
      placeGeometry(createCylinderX(0.078, 0.078, 0.07, 18), 0, 0, 0),
      COLOR_SHELL_WHITE,
    );
    add(
      "shell",
      rThigh,
      placeGeometry(createCylinderX(0.081, 0.081, 0.016, 18), sideSign * 0.012, 0, 0),
      COLOR_HAZARD_ORANGE,
    );
    add(
      "metal",
      rThigh,
      placeGeometry(createCylinderX(0.048, 0.048, 0.082, 12), 0, 0, 0),
      COLOR_GUNMETAL_GREY,
    );

    for (let c = 0; c < 5; c++) {
      const u = c * 1.2566;
      add(
        "metal",
        rThigh,
        createBoltX(sideSign * 0.039, Math.cos(u) * 0.062, Math.sin(u) * 0.062),
        COLOR_CHROME_BRIGHT,
      );
    }

    add(
      "shell",
      rThigh,
      placeGeometry(
        createBeveledBox(0.062, spec.L1 - 0.07, 0.1, 0.022),
        0,
        -spec.L1 * 0.5 - 0.005,
        0.004,
      ),
      COLOR_SHELL_WHITE,
    );
    add(
      "metal",
      rThigh,
      placeGeometry(
        createBeveledBox(0.044, spec.L1 - 0.04, 0.06, 0.012),
        0,
        -spec.L1 * 0.5,
        -0.035,
      ),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "shell",
      rThigh,
      placeGeometry(createBeveledBox(0.065, 0.045, 0.103, 0.01), 0, -0.145, 0.004),
      COLOR_HAZARD_ORANGE,
    );
    add(
      "shell",
      rThigh,
      placeGeometry(createBeveledBox(0.064, 0.012, 0.102, 0.004), 0, -0.26, 0.004),
      COLOR_DARK_ALLOY,
    );
    add(
      "metal",
      rThigh,
      createPipeBetweenPoints([0, -0.06, -0.082], [0, -spec.L1 * 0.62, -0.078], 0.021, 0.021, 10),
      COLOR_CHROME_BRIGHT,
    );
    add(
      "metal",
      rThigh,
      createPipeBetweenPoints(
        [0, -spec.L1 * 0.62, -0.078],
        [0, -spec.L1 + 0.025, -0.058],
        0.009,
        0.009,
        6,
      ),
      [9, 9, 9.6],
    );
    add(
      "metal",
      rThigh,
      placeGeometry(createBeveledBox(0.05, 0.03, 0.035, 0.006), 0, -0.055, -0.07),
      COLOR_NEUTRAL_WHITE,
    );
    add(
      "shell",
      rThigh,
      createTubeFromPoints(
        [
          [sideSign * 0.036, -0.02, 0.05],
          [sideSign * 0.044, -0.13, 0.062],
          [sideSign * 0.042, -0.28, 0.058],
          [sideSign * 0.034, -spec.L1 + 0.03, 0.035],
        ],
        0.0065,
        5,
      ),
      COLOR_CHASSIS_BLACK,
    );
    add(
      "metal",
      rThigh,
      placeGeometry(createCylinderX(0.05, 0.05, 0.086, 14), 0, -spec.L1, 0),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "shell",
      rThigh,
      placeGeometry(createCylinderX(0.036, 0.036, 0.092, 12), 0, -spec.L1, 0),
      COLOR_SHELL_WARM,
    );

    // 小腿弯曲连杆与足端橡胶缓冲球 (Shin / Tibia & Rubber Foot)
    add(
      "metal",
      rShin,
      placeGeometry(
        createCylinderY(0.03, 0.021, spec.L2 - 0.08, 10),
        0,
        -(spec.L2 - 0.08) / 2 - 0.01,
        0,
      ),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "shell",
      rShin,
      placeGeometry(createBeveledBox(0.052, 0.21, 0.04, 0.014), 0, -0.14, 0.02),
      COLOR_SHELL_WHITE,
    );
    add(
      "shell",
      rShin,
      placeGeometry(createBeveledBox(0.054, 0.02, 0.042, 0.006), 0, -0.215, 0.02),
      COLOR_HAZARD_ORANGE,
    );
    add(
      "metal",
      rShin,
      placeGeometry(createBeveledBox(0.03, 0.06, 0.05, 0.008), 0, -0.02, -0.03),
      COLOR_NEUTRAL_WHITE,
    );
    add(
      "metal",
      rShin,
      placeGeometry(createCylinderY(0.024, 0.03, 0.03, 10), 0, -spec.L2 + 0.085, 0),
      COLOR_CHROME_BRIGHT,
    );
    add(
      "shell",
      rShin,
      placeGeometry(
        createScaledSphere(spec.footR + 0.002, 12, 8, 1, 0.86, 1.08),
        0,
        -spec.L2 + spec.footR * 0.86,
        0.004,
      ),
      COLOR_CHASSIS_BLACK,
    );
  }

  return rig.build(["shell", "metal", "glow", "lens"]);
}

const Z_ = buildHoundRig;
const q_ = solveLegIK;

export { solveLegIK, HOUND_RIG_SPEC, buildHoundRig, Z_, q_, $v };

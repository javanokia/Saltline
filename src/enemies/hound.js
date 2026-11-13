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

const q_ = solveLegIK;

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

  // 四足肢体链
  for (let i = 0; i < 4; i++) {
    const leg = spec.legs[i];
    const side = spec.side[i];
    rig.bone("abd" + leg, "body", side * spec.hipX, spec.hipY, spec.fore[i] * spec.hipZ);
    rig.bone("thigh" + leg, "abd" + leg, side * spec.l0, 0, 0);
    rig.bone("shin" + leg, "thigh" + leg, 0, -spec.L1, 0);
  }

  const add = (slot, bone, geo, tint, applyShading) => rig.add(slot, bone, geo, tint, applyShading);

  // 主体躯干与动力舱
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

  // 尾部散热散热鳍片组
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.31, 0.03, 0.25, 0.006), 0, 0.112, -0.335),
    COLOR_NEUTRAL_WHITE,
  );
  for (let i = 0; i < 10; i++) {
    add(
      "metal",
      "body",
      placeGeometry(
        createBeveledBox(0.007, 0.062, 0.225, 0.002),
        -0.126 + i * 0.028,
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

  // 侧向复合装甲与警示涂装
  for (const s of [1, -1]) {
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.032, 0.15, 0.31, 0.012), s * 0.15, 0.022, -0.075),
      COLOR_SHELL_WHITE,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.032, 0.15, 0.135, 0.012), s * 0.15, 0.022, 0.1625),
      COLOR_SHELL_WARM,
    );
    add(
      "metal",
      "body",
      createTubeFromPoints(
        [
          [s * 0.168, 0.06, 0.125],
          [s * 0.182, 0.06, 0.135],
          [s * 0.182, 0.06, 0.19],
          [s * 0.168, 0.06, 0.2],
        ],
        0.005,
        5,
      ),
      COLOR_CHROME_BRIGHT,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.034, 0.016, 0.135, 0.004), s * 0.151, -0.035, 0.1625),
      COLOR_AMBER_WARNING,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.034, 0.042, 0.46, 0.008), s * 0.151, -0.078, 0),
      COLOR_HAZARD_ORANGE,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.028, 0.1, 0.11, 0.008), s * 0.146, 0.01, 0.305),
      COLOR_DARK_ALLOY,
    );
    for (let l = 0; l < 4; l++) {
      add(
        "metal",
        "body",
        placeGeometry(
          createBeveledBox(0.004, 0.012, 0.085, 0.001),
          s * 0.161,
          -0.02 + l * 0.022,
          0.305,
        ),
        COLOR_GUNMETAL_GREY,
      );
    }
    for (const y of [-0.035, 0.08]) {
      for (const z of [-0.21, 0.06, 0.115, 0.21]) {
        add("metal", "body", createBoltX(s * 0.167, y, z), COLOR_CHROME_BRIGHT);
      }
    }
    add(
      "metal",
      "body",
      createTubeFromPoints(
        [
          [s * 0.135, 0.148, -0.19],
          [s * 0.135, 0.205, -0.16],
          [s * 0.135, 0.212, 0],
          [s * 0.135, 0.205, 0.43],
          [s * 0.135, 0.148, 0.465],
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
        placeGeometry(createCylinderY(0.008, 0.008, 0.06, 6), s * 0.135, 0.178, z),
        COLOR_CHROME_BRIGHT,
      );
    }
    add(
      "shell",
      "body",
      createTubeFromPoints(
        [
          [s * 0.118, -0.105, -0.36],
          [s * 0.132, -0.118, -0.2],
          [s * 0.13, -0.112, 0.1],
          [s * 0.118, -0.1, 0.36],
        ],
        0.009,
        5,
      ),
      COLOR_CHASSIS_BLACK,
    );
    add(
      "metal",
      "body",
      placeGeometry(new Ci(0.02, 0.005, 5, 10), s * 0.17, 0.085, -0.335, 0, HALF_PI, 0),
      COLOR_CHROME_BRIGHT,
    );
  }

  // 前胸与机盖撞角
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
  for (let i = 0; i < 6; i++) {
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.05, 0.034, 0.014, 0.003), -0.125 + i * 0.05, -0.098, 0.538),
      i % 2 ? COLOR_DARK_ALLOY : COLOR_AMBER_WARNING,
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

  // 腹部液力传动与底盘护板
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

  // 柔性颈部液压软管与铰链
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
  add(
    "metal",
    "neck",
    createPipeBetweenPoints([0, -0.02, -0.02], [0, 0.11, 0.1], 0.045, 0.036, 10),
    COLOR_GUNMETAL_GREY,
  );
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + i * 0.28;
    add(
      "shell",
      "neck",
      createPipeBetweenPoints(
        [0, -0.02 + 0.13 * t, -0.02 + 0.12 * t],
        [0, -0.02 + 0.13 * (t + 0.09), -0.02 + 0.12 * (t + 0.09)],
        0.049,
        0.047,
        10,
      ),
      COLOR_SHELL_WHITE,
    );
  }
  for (const s of [1, -1]) {
    add(
      "metal",
      "neck",
      createTubeFromPoints(
        [
          [s * 0.042, 0.01, -0.02],
          [s * 0.055, 0.05, 0.03],
          [s * 0.045, 0.1, 0.09],
        ],
        0.006,
        6,
      ),
      COLOR_CHROME_BRIGHT,
    );
  }

  // 头部传感器舱 (Head Sensor Pod)
  add(
    "shell",
    "head",
    placeGeometry(createBeveledBox(0.2, 0.13, 0.22, 0.016), 0, 0.005, 0),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "head",
    placeGeometry(createBeveledBox(0.08, 0.04, 0.22, 0.008), 0, 0.072, 0.005),
    COLOR_SHELL_WARM,
  );
  add(
    "shell",
    "head",
    placeGeometry(createBeveledBox(0.18, 0.025, 0.07, 0.004), 0, -0.065, 0.035),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "metal",
    "head",
    placeGeometry(createBeveledBox(0.16, 0.09, 0.04, 0.006), 0, 0.005, 0.115),
    COLOR_DARK_ALLOY,
  );
  add(
    "metal",
    "head",
    placeGeometry(createCylinderZ(0.045, 0.045, 0.012, 16), 0, 0.005, 0.135),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "lens",
    "head",
    placeGeometry(createCylinderZ(0.038, 0.038, 0.006, 16), 0, 0.005, 0.14),
    [1, 1, 1],
    false,
  );

  for (const s of [1, -1]) {
    add(
      "metal",
      "head",
      placeGeometry(createCylinderX(0.012, 0.012, 0.006, 8), s * 0.06, 0.04, 0.135),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "metal",
      "head",
      placeGeometry(createCylinderX(0.012, 0.012, 0.006, 8), s * 0.06, -0.03, 0.135),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "glow",
      "head",
      placeGeometry(createCylinderZ(0.007, 0.007, 0.004, 8), s * 0.06, 0.04, 0.14),
      [5, 0.3, 0.1],
      false,
    );
    add(
      "glow",
      "head",
      placeGeometry(createCylinderZ(0.007, 0.007, 0.004, 8), s * 0.06, -0.03, 0.14),
      [5, 0.3, 0.1],
      false,
    );
    add(
      "shell",
      "head",
      placeGeometry(createBeveledBox(0.015, 0.07, 0.16, 0.006), s * 0.105, 0.01, -0.01),
      COLOR_AMBER_WARNING,
    );
    add(
      "metal",
      "head",
      placeGeometry(createCylinderX(0.02, 0.02, 0.012, 10), s * 0.108, -0.01, -0.03),
      COLOR_CHROME_BRIGHT,
    );
    add("metal", "head", createBoltX(s * 0.108, 0.055, 0.05), COLOR_CHROME_BRIGHT);
    add("metal", "head", createBoltX(s * 0.108, 0.055, -0.07), COLOR_CHROME_BRIGHT);
  }

  // 顶部速射机枪炮塔 (Top Turret & Autocannon)
  add(
    "metal",
    "turret",
    placeGeometry(createCylinderY(0.085, 0.095, 0.05, 14), 0, 0.025, 0),
    COLOR_DARK_ALLOY,
  );
  add(
    "shell",
    "turret",
    placeGeometry(createBeveledBox(0.18, 0.09, 0.22, 0.012), 0, 0.085, -0.01),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "turret",
    placeGeometry(createBeveledBox(0.185, 0.025, 0.14, 0.004), 0, 0.132, -0.02),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "metal",
    "turret",
    placeGeometry(createBeveledBox(0.14, 0.07, 0.03, 0.004), 0, 0.085, -0.125),
    COLOR_CHASSIS_BLACK,
  );
  add(
    "metal",
    "turret",
    placeGeometry(createCylinderZ(0.018, 0.018, 0.016, 8), 0.045, 0.085, -0.14),
    COLOR_CHROME_BRIGHT,
  );

  // 枪管与消焰制退器
  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.07, 0.075, 0.13, 0.006), 0, 0, 0),
    COLOR_DARK_ALLOY,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderZ(0.014, 0.014, 0.32, 10), 0, 0, 0.22),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderZ(0.019, 0.019, 0.04, 10), 0, 0, 0.4),
    COLOR_DARK_ALLOY,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderZ(0.014, 0.014, 0.025, 10), 0, 0, 0.425),
    COLOR_CHASSIS_BLACK,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderY(0.008, 0.008, 0.06, 6), 0, 0.03, 0.2),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.06, 0.05, 0.08, 0.004), -0.06, -0.01, -0.01),
    COLOR_DARK_ALLOY,
  );

  // 柔性通信天线与战术指示灯
  add(
    "metal",
    "antenna",
    placeGeometry(createCylinderY(0.01, 0.014, 0.03, 8), 0, 0.015, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "antenna",
    placeGeometry(createCylinderY(0.0018, 0.0035, 0.42, 6), 0, 0.24, 0),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "glow",
    "antenna",
    placeGeometry(createScaledSphere(0.007, 8, 6), 0, 0.45, 0),
    [6.5, 4.6, 2.2],
    false,
  );
  add(
    "metal",
    "beacon",
    placeGeometry(createCylinderY(0.012, 0.014, 0.025, 8), 0, 0.012, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "glow",
    "beacon",
    placeGeometry(createCylinderY(0.011, 0.011, 0.02, 10), 0, 0.032, 0),
    [14, 1, 0.35],
    false,
  );

  // 四足机械腿关节构型 (Abduction, Thigh, Shin & Foot)
  for (let i = 0; i < 4; i++) {
    const leg = spec.legs[i];
    const s = spec.side[i];
    const f = spec.fore[i];

    // 外展电机舱 (Abduction Hip Casing)
    add(
      "metal",
      "abd" + leg,
      placeGeometry(createCylinderX(0.052, 0.052, 0.075, 12), s * 0.035, 0, 0),
      COLOR_DARK_ALLOY,
    );
    add(
      "shell",
      "abd" + leg,
      placeGeometry(createBeveledBox(0.055, 0.09, 0.1, 0.008), s * 0.035, 0, 0),
      COLOR_SHELL_WHITE,
    );
    add(
      "metal",
      "abd" + leg,
      placeGeometry(createCylinderX(0.025, 0.025, 0.01, 10), s * 0.076, 0, 0),
      COLOR_CHROME_BRIGHT,
    );
    add("metal", "abd" + leg, createBoltX(s * 0.076, 0.03, 0.025), COLOR_CHROME_BRIGHT);
    add("metal", "abd" + leg, createBoltX(s * 0.076, -0.03, 0.025), COLOR_CHROME_BRIGHT);
    add("metal", "abd" + leg, createBoltX(s * 0.076, 0, -0.035), COLOR_CHROME_BRIGHT);

    // 大腿连杆与双液压杆 (Thigh / Femur)
    add(
      "metal",
      "thigh" + leg,
      placeGeometry(createCylinderX(0.046, 0.046, 0.04, 12), s * 0.015, 0, 0),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "shell",
      "thigh" + leg,
      createPipeBetweenPoints([0, 0, 0], [0, -spec.L1, 0], 0.045, 0.032, 10),
      COLOR_SHELL_WHITE,
    );
    add(
      "shell",
      "thigh" + leg,
      placeGeometry(createBeveledBox(0.065, 0.22, 0.06, 0.008), 0, -spec.L1 * 0.42, 0.01),
      COLOR_SHELL_WHITE,
    );
    add(
      "shell",
      "thigh" + leg,
      placeGeometry(createBeveledBox(0.068, 0.04, 0.062, 0.004), 0, -spec.L1 * 0.3, 0.01),
      COLOR_HAZARD_ORANGE,
    );
    add(
      "metal",
      "thigh" + leg,
      placeGeometry(createBeveledBox(0.02, 0.18, 0.025, 0.003), s * 0.038, -spec.L1 * 0.45, -0.01),
      COLOR_DARK_ALLOY,
    );
    add(
      "metal",
      "thigh" + leg,
      createPipeBetweenPoints(
        [s * 0.025, -0.04, -0.025],
        [s * 0.02, -spec.L1 * 0.85, -0.015],
        0.007,
        0.007,
        6,
      ),
      COLOR_CHROME_BRIGHT,
    );
    add(
      "metal",
      "thigh" + leg,
      createPipeBetweenPoints(
        [s * 0.02, -spec.L1 * 0.85, -0.015],
        [s * 0.02, -spec.L1 + 0.02, 0],
        0.005,
        0.005,
        6,
      ),
      COLOR_GUNMETAL_GREY,
    );

    // 膝关节阻尼铰链 (Knee Hinge)
    add(
      "metal",
      "shin" + leg,
      placeGeometry(createCylinderX(0.034, 0.034, 0.042, 10), s * 0.005, 0, 0),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "metal",
      "shin" + leg,
      placeGeometry(new Ci(0.026, 0.006, 5, 8), s * 0.028, 0, 0, 0, HALF_PI, 0),
      COLOR_CHROME_BRIGHT,
    );

    // 小腿复合碳纤杆与缓冲脚垫 (Shin / Tibia & Rubber Foot)
    add(
      "metal",
      "shin" + leg,
      createPipeBetweenPoints([0, 0, 0], [0, -spec.L2 + spec.footR * 0.5, 0], 0.026, 0.018, 8),
      COLOR_DARK_ALLOY,
    );
    add(
      "shell",
      "shin" + leg,
      placeGeometry(createBeveledBox(0.042, 0.18, 0.034, 0.005), 0, -spec.L2 * 0.35, f * 0.012),
      COLOR_SHELL_WARM,
    );
    add(
      "shell",
      "shin" + leg,
      placeGeometry(createBeveledBox(0.044, 0.03, 0.036, 0.003), 0, -spec.L2 * 0.22, f * 0.012),
      COLOR_AMBER_WARNING,
    );
    add(
      "metal",
      "shin" + leg,
      placeGeometry(createCylinderY(0.012, 0.016, 0.05, 8), 0, -spec.L2 + spec.footR + 0.02, 0),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "metal",
      "shin" + leg,
      placeGeometry(
        createScaledSphere(spec.footR, 12, 8, 1, 0.85, 1),
        0,
        -spec.L2 + spec.footR * 0.6,
        0,
      ),
      COLOR_DARK_ALLOY,
    );
    add(
      "shell",
      "shin" + leg,
      placeGeometry(
        new Ci(spec.footR * 0.95, 0.005, 5, 10),
        0,
        -spec.L2 + spec.footR * 0.8,
        0,
        HALF_PI,
        0,
        0,
      ),
      COLOR_HAZARD_ORANGE,
    );
  }

  return rig.build();
}

const Z_ = buildHoundRig;

const HOUND_CONFIG = {
  hp: 140,
  shotDamage: 5,
  burst: 4,
  burstGap: 0.11,
  telegraph: 0.5,
  cooldown: [1.8, 3.0],
  runSpeed: 4.5,
  stalkSpeed: 2.0,
  patrolSpeed: 1.5,
  lungeSpeed: 12.0,
  lungeRange: 4.8,
  lungeDamage: 35,
  lungeCooldown: 4.0,
  turnRate: 4.5,
  accel: 12.0,
  rangeMin: 7,
  rangeMax: 18,
  smokeBelow: 0.45,
  replan: 0.35,
};

const Kv = HOUND_CONFIG;

/**
 * 二阶弹簧阻尼谐振器 (Damped Harmonic Oscillator / Spring Damper)
 */
function springDamper(spring, target, stiffness, damping, dt) {
  spring.v += ((target - spring.x) * stiffness - spring.v * damping) * dt;
  spring.x += spring.v * dt;
  return spring.x;
}

const xa = springDamper;

const DIAGONAL_LEG_PAIRS = [
  [0, 3],
  [1, 2],
];
const wm = DIAGONAL_LEG_PAIRS;

const footScratchPos = new W();
const muzzleAimDir = new W();
const bulletTracerEnd = new W();
const houndEyeMuzzle = new W();
const ikAngles = { abd: 0, hip: 0, knee: 0, reach: 0 };
const bm = ikAngles;

/**
 * 构造一只机械猎犬实体 (Procedural Quadruped Combat Hound)
 */
function createHound(hiveCtx, rigDef, materials, index) {
  const engineCtx = hiveCtx.G;
  const rng = hiveCtx.rng;
  const lensMat = materials.lensBase.clone();

  const skinnedMeshWrapper = createSkinnedMesh(
    rigDef,
    {
      shell: materials.shell,
      metal: materials.metal,
      glow: materials.glow,
      lens: lensMat,
    },
    {
      radius: 1.5,
      center: [0, 0.6, 0],
    },
  );

  const bones = skinnedMeshWrapper.bones;
  skinnedMeshWrapper.group.visible = false;

  const abdJoints = [];
  const thighJoints = [];
  const shinJoints = [];

  for (let i = 0; i < 4; i++) {
    const legName = HOUND_RIG_SPEC.legs[i];
    abdJoints.push(bones["abd" + legName]);
    thighJoints.push(bones["thigh" + legName]);
    shinJoints.push(bones["shin" + legName]);
  }

  // 编号与军规战术铭牌
  const labelDef = engineCtx.mats.label("H-" + String(index + 3).padStart(2, "0"), {
    color: "black",
    font: "stencil",
    distress: 0.3,
  });
  const labelWidth = 0.2;
  const labelHeight = Math.min(0.085, labelWidth / (labelDef.aspect || 3));

  const planeLeft = new rn(labelWidth, labelHeight);
  planeLeft.rotateY(HALF_PI);
  planeLeft.translate(0.1675, 0.03, -0.085);

  const planeRight = new rn(labelWidth, labelHeight);
  planeRight.rotateY(-HALF_PI);
  planeRight.translate(-0.1675, 0.03, -0.085);

  const mergedLabelGeo = hiveCtx.mergeSimple([planeLeft, planeRight]);
  const labelMesh = new Qe(mergedLabelGeo, labelDef.material);
  labelMesh.castShadow = false;
  labelMesh.receiveShadow = true;
  bones.body.add(labelMesh);

  // 四足接触点动力学载体 (Foot Contact Points)
  const feet = [0, 1, 2, 3].map(() => ({
    p: new W(),
    from: new W(),
    to: new W(),
    slide: new W(),
  }));

  const hound = {
    id: 0,
    type: "hound",
    pos: skinnedMeshWrapper.group.position,
    alive: false,
    hp: HOUND_CONFIG.hp,
    active: false,
    rig: skinnedMeshWrapper,
    lens: lensMat,
    feet,
    yaw: 0,
    speed: 0,
    yawRate: 0,
    home: new W(),
    lastKnown: new W(),
    goal: new W(),
    firePos: new W(),
    firePlayer: new W(),
    sensor: new W(),
    fwd: new W(0, 0, 1),
    muzzle: new W(),
    headPos: new W(),
    push: new W(),
    mode: "patrol",
    los: false,
    seeT: 0,
    noSeeT: 0,
    senseT: 0,
    exposure: 0,
    modeT: 0,
    passive: false,
    hasToken: false,
    es: "move", // engage state: move, aim, tele, burst, wind, lunge, recover, cool
    esT: 0,
    cool: 1,
    shots: 0,
    bursts: 0,
    lungeCd: 0,
    path: null,
    wp: 0,
    planT: 0,
    hasGoal: false,
    waitT: 0,
    moveT: 0,
    stuckT: 0,
    sw: -1, // current swinging foot pair (0 or 1, -1 = all stance)
    swT: 0,
    swDur: 0.2,
    lastPair: 1,
    idleT: 0,
    lift: 0.08,

    // 底盘悬挂与天线动力学弹簧 (Suspension & Recoil Springs)
    sY: { x: 0, v: 0 }, // 纵向颠簸 (Vertical Heave)
    sP: { x: 0, v: 0 }, // 俯仰角 (Pitch)
    sR: { x: 0, v: 0 }, // 滚转角 (Roll)
    sL: { x: 0, v: 0 }, // 横向横移 (Lateral Sway)
    sA: { x: 0, v: 0 }, // 天线俯仰抖动 (Antenna Pitch)
    sA2: { x: 0, v: 0 }, // 天线横向抖动 (Antenna Yaw)

    crouch: 0,
    tyaw: 0,
    tpitch: 0,
    hyaw: 0,
    hpitch: 0,
    flare: 0,
    lensC: [LENS_COLOR_AMBER_PATROL[0], LENS_COLOR_AMBER_PATROL[1], LENS_COLOR_AMBER_PATROL[2]],
    smokeT: 0,
    phase: 0,
    scan: 0,
    dieT: 0,
    vy: 0,
    dieRoll: 0,
    diePitch: 0,
    wreck: false,
    sink: 0,
    loop: null,
    prevSpeed: 0,
    maxSpeed: HOUND_CONFIG.patrolSpeed,

    damage(amount, hitPoint, impulse, hitPart) {
      if (!hound.alive) return false;
      hound.hp -= amount;
      engineCtx.events.emit("enemy:hit", {
        enemy: hound,
        point: hitPoint,
        part: hitPart || "body",
      });

      if (impulse) {
        const cosY = Math.cos(hound.yaw);
        const sinY = Math.sin(hound.yaw);
        const impulseMag = Math.min(1.6, amount / 28);
        const forwardImpulse = impulse.x * sinY + impulse.z * cosY;
        const lateralImpulse = impulse.x * cosY - impulse.z * sinY;

        hound.sL.v += lateralImpulse * 1.4 * impulseMag;
        hound.sR.v += -lateralImpulse * 3.2 * impulseMag;
        hound.sP.v += forwardImpulse * 2.4 * impulseMag * (hitPart === "weak" ? 1.6 : 1.0);
        hound.sY.v -= 0.5 * impulseMag;
      }

      hiveCtx.provoke(hound);
      if (hound.hp <= 0) {
        killHound(impulse);
        return true;
      }
      return false;
    },

    _activate(spawnPos, options = {}) {
      hound.active = true;
      hound.alive = true;
      hound.wreck = false;
      hound.hp = HOUND_CONFIG.hp;
      hound.passive = !!options.passive;
      hound.sink = 0;
      hound.pos.copy(spawnPos);
      hound.pos.y = engineCtx.physics.groundHeight(spawnPos.x, spawnPos.z, spawnPos.y + 1);
      hound.home.copy(hound.pos);
      hound.yaw = options.yaw ?? rng() * 6.283;
      hound.speed = 0;
      hound.yawRate = 0;
      hound.push.set(0, 0, 0);
      hound.mode = options.state === "alert" ? "investigate" : "patrol";
      hound.modeT = 10;
      hound.modeSeen = hound.mode;
      hound.lastKnown.copy(options.target || (engineCtx.player ? engineCtx.player.pos : spawnPos));
      hound.los = false;
      hound.seeT = hound.noSeeT = 0;
      hound.exposure = 0;
      hound.senseT = rng() * 0.2;
      hound.hasToken = false;
      hound.patrolR = options.patrolRadius ?? 7;
      hound.patrolLine = options.patrolLine || null;
      hound.patrolI = 0;
      hound.es = "move";
      hound.cool = 0.6 + rng();
      hound.lungeCd = 0.3;
      hound.path = null;
      hound.hasGoal = false;
      hound.waitT = rng() * 1.5;
      hound.planT = 0;
      hound.sw = -1;
      hound.idleT = 0;
      hound.crouch = 0;
      hound.feelT = 0;
      hound.blocked = false;
      hound.flare = 0;
      hound.phase = rng() * 6.283;
      hound.dieT = 0;
      hound.tyaw = hound.hyaw = 0;
      hound.tpitch = hound.hpitch = 0;

      for (const spr of [hound.sY, hound.sP, hound.sR, hound.sL, hound.sA, hound.sA2]) {
        spr.x = 0;
        spr.v = 0;
      }

      for (let i = 0; i < 4; i++) {
        computeNeutralFootPos(hound.feet[i].p, i, hound.pos.x, hound.pos.z, hound.yaw);
      }

      bones.neck.rotation.set(0, 0, 0);
      bones.gun.rotation.set(0, 0, 0);
      skinnedMeshWrapper.group.visible = true;
      applyIKAndPose(0.016);

      if (engineCtx.audio && engineCtx.audio.loop && !hound.loop) {
        try {
          hound.loop = engineCtx.audio.loop("hound_servo", { pos: hound.pos, gain: 0 });
        } catch {
          hound.loop = null;
        }
      }
    },

    _deactivate() {
      hound.active = false;
      hound.alive = false;
      hound.wreck = false;
      skinnedMeshWrapper.group.visible = false;
      hiveCtx.releaseToken(hound);
      if (hound.loop) {
        try {
          hound.loop.stop();
        } catch {}
        hound.loop = null;
      }
    },

    _raycast(rayOrigin, rayDir, maxDist, outHit) {
      let isHit = false;

      // 1. 弱点：头部光电感知舱爆头相交检测 (Head Weakspot Sphere)
      if (intersectRaySphere(rayOrigin, rayDir, hound.headPos, 0.155, maxDist, outHit)) {
        outHit.part = "weak";
        outHit.enemy = hound;
        isHit = true;
      }

      // 2. 主体：躯干与底盘双胶囊体相交检测 (Chassis Torso Capsules)
      const cosY = Math.cos(hound.yaw);
      const sinY = Math.sin(hound.yaw);
      const bodyHeight = hound.pos.y + HOUND_RIG_SPEC.stand + hound.sY.x - hound.crouch;

      footScratchPos.set(hound.pos.x - sinY * 0.45, bodyHeight + 0.03, hound.pos.z - cosY * 0.45);
      tempSparkPos.set(hound.pos.x + sinY * 0.47, bodyHeight + 0.03, hound.pos.z + cosY * 0.47);

      if (
        intersectRayCapsule(rayOrigin, rayDir, footScratchPos, tempSparkPos, 0.27, maxDist, outHit)
      ) {
        outHit.part = "body";
        outHit.enemy = hound;
        isHit = true;
      }

      footScratchPos.y = tempSparkPos.y = hound.pos.y + (bodyHeight - hound.pos.y) * 0.45;
      if (
        intersectRayCapsule(rayOrigin, rayDir, footScratchPos, tempSparkPos, 0.25, maxDist, outHit)
      ) {
        outHit.part = "body";
        outHit.enemy = hound;
        isHit = true;
      }

      return isHit;
    },

    _update(dt) {
      if (hound.alive) updateAliveHound(dt);
      else updateDeadHound(dt);
    },
  };

  /**
   * 计算指定肢体在中立站立姿态下的地面世界坐标
   */
  function computeNeutralFootPos(outVec, legIdx, rootX, rootZ, rootYaw) {
    const offsetX = HOUND_RIG_SPEC.side[legIdx] * HOUND_RIG_SPEC.footX;
    const offsetZ = HOUND_RIG_SPEC.footZ[legIdx];
    const cosY = Math.cos(rootYaw);
    const sinY = Math.sin(rootYaw);
    outVec.set(rootX + offsetX * cosY + offsetZ * sinY, 0, rootZ - offsetX * sinY + offsetZ * cosY);
    return outVec;
  }

  /**
   * 设置寻路导航目标
   */
  function setGoal(targetPos, forceReplan = false) {
    if (!forceReplan && hound.hasGoal && hound.goal.distanceToSquared(targetPos) < 0.25) return;
    hound.goal.copy(targetPos);
    hound.hasGoal = true;
    hound.planT = 0;
    hound.stuckT = 0;
  }

  /**
   * 触发 A* 导航网格重规划 (A* Navmesh Pathfinding)
   */
  function replanPath() {
    hound.planT = HOUND_CONFIG.replan + rng() * 0.15;
    let path = null;
    try {
      path = engineCtx.physics.nav.findPath(hound.pos, hound.goal);
    } catch {
      path = null;
    }
    hound.path = path && path.length ? path : null;
    hound.wp = 0;
    if (hound.path && hound.path.length > 1 && hound.path[0].distanceToSquared(hound.pos) < 0.36) {
      hound.wp = 1;
    }
  }

  /**
   * 沿导航路径平滑移动巡航 (Path Following)
   */
  function followPath(dt, targetSpeed) {
    if (!hound.hasGoal) {
      hound.maxSpeed = 0;
      return true;
    }

    hound.planT -= dt;
    if (hound.planT <= 0) replanPath();

    let destPoint = hound.goal;
    if (hound.path) {
      while (hound.wp < hound.path.length) {
        const wpPos = hound.path[hound.wp];
        if (Math.hypot(wpPos.x - hound.pos.x, wpPos.z - hound.pos.z) > 0.65) break;
        hound.wp++;
      }
      if (hound.wp >= hound.path.length) {
        hound.path = null;
      } else {
        destPoint = hound.path[hound.wp];
      }
    }

    const dx = destPoint.x - hound.pos.x;
    const dz = destPoint.z - hound.pos.z;
    const distToDest = Math.hypot(dx, dz);

    if (distToDest < 0.45 && !hound.path) {
      hound.hasGoal = false;
      hound.maxSpeed = 0;
      return true;
    }

    hound.wantYaw = Math.atan2(dx, dz);
    const angleErr = Math.abs(diffAngle(hound.wantYaw, hound.yaw));
    const speedTurnFactor = clampValue(1 - angleErr * 0.7, 0.25, 1);
    hound.maxSpeed = targetSpeed * speedTurnFactor;
    return false;
  }

  /**
   * 战术寻找射击阵位或掩体点位 (Cover Point / Flank Position Selection)
   */
  function seekCoverOrFlank() {
    const player = engineCtx.player;
    if (!player) return;

    let bestScore = Infinity;
    const playerEye = player.eye || player.pos;

    const evaluatePoint = (candidatePos, isCover = false) => {
      const distToPlayer = Math.hypot(candidatePos.x - player.pos.x, candidatePos.z - player.pos.z);
      if (distToPlayer < HOUND_CONFIG.rangeMin || distToPlayer > HOUND_CONFIG.rangeMax) return;
      if (!engineCtx.physics.nav.isWalkable(candidatePos.x, candidatePos.z)) return;

      const hasLos = engineCtx.physics.lineOfSight(candidatePos, playerEye);
      if (!hasLos) return;

      const pathDist = Math.hypot(candidatePos.x - hound.pos.x, candidatePos.z - hound.pos.z);
      const score = pathDist + (isCover ? -2 : 0) + rng() * 3;
      if (score < bestScore) {
        bestScore = score;
        hound.firePos.copy(candidatePos);
      }
    };

    if (engineCtx.level && engineCtx.level.coverPoints) {
      for (const pt of engineCtx.level.coverPoints) evaluatePoint(pt, true);
    }

    if (bestScore === Infinity) {
      for (let i = 0; i < 8; i++) {
        const angle = rng() * Math.PI * 2;
        const radius =
          HOUND_CONFIG.rangeMin + 1 + rng() * (HOUND_CONFIG.rangeMax - HOUND_CONFIG.rangeMin - 2);
        footScratchPos.set(
          player.pos.x + Math.cos(angle) * radius,
          0,
          player.pos.z + Math.sin(angle) * radius,
        );
        evaluatePoint(footScratchPos, false);
      }
    }

    if (bestScore !== Infinity) {
      setGoal(hound.firePos, true);
      hound.firePlayer.copy(player.pos);
      hound.es = "move";
      hound.moveT = 0;
      hound.bursts = 0;
    } else {
      hound.es = "aim";
      hound.esT = 0;
    }
  }

  /**
   * 猎犬机枪向玩家快速单发击发 (Turret Burst Projectile / Hitscan)
   */
  function fireTurretShot(player) {
    const cosY = Math.cos(hound.yaw + hound.tyaw);
    const sinY = Math.sin(hound.yaw + hound.tyaw);

    houndEyeMuzzle.setFromMatrixPosition(bones.gun.matrixWorld);
    hound.muzzle.set(
      houndEyeMuzzle.x + sinY * 0.12,
      houndEyeMuzzle.y - 0.01,
      houndEyeMuzzle.z + cosY * 0.12,
    );

    const targetEye = player.eye || player.pos;
    muzzleAimDir.copy(targetEye).sub(hound.muzzle).normalize();

    const spread = 0.024 * (1 - hound.exposure * 0.3);
    muzzleAimDir.x += (rng() - 0.5) * 2 * spread;
    muzzleAimDir.y += (rng() - 0.5) * 2 * spread;
    muzzleAimDir.z += (rng() - 0.5) * 2 * spread;
    muzzleAimDir.normalize();

    const hit = engineCtx.physics.raycast(hound.muzzle, muzzleAimDir, 200);
    const playerHit = engineCtx.combat.enemyShot(hound.muzzle, muzzleAimDir, {
      damage: HOUND_CONFIG.shotDamage,
      range: 200,
    });

    const maxDist = playerHit ? hound.muzzle.distanceTo(targetEye) : hit ? hit.dist : 90;

    bulletTracerEnd.copy(hound.muzzle).addScaledVector(muzzleAimDir, maxDist);
    engineCtx.fx.tracer(hound.muzzle, bulletTracerEnd, {
      color: 0xffbd30,
      speed: 260,
      width: 0.035,
    });
    engineCtx.fx.muzzleFlash(hound.muzzle, muzzleAimDir, { scale: 0.9 });

    if (engineCtx.render && engineCtx.render.lightPool) {
      engineCtx.render.lightPool.flash(hound.muzzle, 0xffad20, 22, 7, 0.05);
    }

    engineCtx.events.emit("enemy:fire", {
      enemy: hound,
      pos: hound.muzzle,
      dir: muzzleAimDir,
      type: "hound",
    });

    // 枪管后坐力与底盘俯仰振动 (Turret Recoil Kick)
    hound.sP.v += 1.1;
    hound.sY.v -= 0.25;
  }

  /**
   * 猎犬行动分支处理：巡逻、调查、追逐与近战飞扑决策
   * @param {number} dt
   * @param {any} player
   * @param {number} distToPlayer
   * @returns {{ aimTarget: any, headLookTarget: any, crouchTarget: number, isLunging: boolean }}
   */
  function updateHoundBehavior(dt, player, distToPlayer) {
    let aimTarget = null;
    let headLookTarget = null;
    let crouchTarget = 0;
    let isLunging = false;

    if (hound.mode === "patrol") {
      if (hound.hasGoal) {
        if (followPath(dt, HOUND_CONFIG.patrolSpeed)) {
          hound.waitT = 1.5 + rng() * 3.0;
        }
      } else if ((hound.waitT -= dt) <= 0) {
        if (hound.patrolLine) {
          hound.patrolI = (hound.patrolI + 1) % hound.patrolLine.length;
          setGoal(hound.patrolLine[hound.patrolI], true);
        } else {
          const randPt = engineCtx.physics.nav.randomPoint(hound.home, hound.patrolR);
          if (randPt) setGoal(randPt, true);
          else hound.waitT = 1.0;
        }
      }
    } else if (hound.mode === "investigate" || hound.mode === "search") {
      headLookTarget = hound.lastKnown;
      const distToInvestigate = Math.hypot(
        hound.lastKnown.x - hound.pos.x,
        hound.lastKnown.z - hound.pos.z,
      );
      if (distToInvestigate > 2.2) {
        setGoal(hound.lastKnown);
        followPath(dt, distToInvestigate < 8 ? HOUND_CONFIG.stalkSpeed : HOUND_CONFIG.runSpeed);
      } else {
        hound.hasGoal = false;
        hound.scan += dt;
        hound.wantYaw = hound.yaw + Math.sin(hound.scan * 0.8) * 0.9;
        headLookTarget = null;
      }
    } else if (player) {
      aimTarget = player.pos;
      headLookTarget = player.pos;
      const angleToPlayer = Math.atan2(player.pos.x - hound.pos.x, player.pos.z - hound.pos.z);

      // 近身判定：触发致命飞扑冲刺 (Pounce / Lunge Attack Check)
      if (
        (hound.es === "move" || hound.es === "aim" || hound.es === "cool") &&
        distToPlayer < HOUND_CONFIG.lungeRange &&
        hound.lungeCd <= 0 &&
        player.alive
      ) {
        hound.es = "wind";
        hound.esT = 0.28;
        hiveCtx.releaseToken(hound);
        engineCtx.events.emit("enemy:telegraph", {
          enemy: hound,
          type: "hound",
          time: 0.28,
          pos: hound.pos,
          melee: true,
        });
      }

      switch (hound.es) {
        case "move": {
          hound.moveT += dt;
          const reached = followPath(dt, HOUND_CONFIG.runSpeed);
          const inIdealRange =
            distToPlayer > HOUND_CONFIG.rangeMin - 1 && distToPlayer < HOUND_CONFIG.rangeMax + 2;

          if (
            reached ||
            (hound.moveT > 1.4 && hound.los && inIdealRange && rng() < dt * 0.7) ||
            hound.moveT > 7.0
          ) {
            hound.es = "aim";
            hound.esT = 0;
            hound.hasGoal = false;
          } else if (player.pos.distanceToSquared(hound.firePlayer) > 49) {
            seekCoverOrFlank();
          }
          break;
        }

        case "aim":
        case "cool": {
          hound.wantYaw = angleToPlayer;
          hound.esT += dt;
          if (hound.los) {
            if (distToPlayer < HOUND_CONFIG.rangeMin - 3 && hound.esT > 0.8) {
              seekCoverOrFlank();
            } else if (
              hound.cool <= 0 &&
              player.alive &&
              Math.abs(diffAngle(angleToPlayer - hound.yaw, hound.tyaw)) < 0.14 &&
              hiveCtx.requestToken(hound)
            ) {
              hound.es = "tele";
              hound.esT = HOUND_CONFIG.telegraph;
              engineCtx.events.emit("enemy:telegraph", {
                enemy: hound,
                type: "hound",
                time: HOUND_CONFIG.telegraph,
                pos: hound.pos,
              });
            }
          } else if (hound.noSeeT > 1.1 || hound.esT > 3.0) {
            seekCoverOrFlank();
          }
          break;
        }

        case "tele": {
          hound.wantYaw = angleToPlayer;
          hound.esT -= dt;
          hound.flare = Math.min(1, hound.flare + dt * 5);
          crouchTarget = 0.05;
          if (hound.esT <= 0) {
            hound.es = "burst";
            hound.shots = HOUND_CONFIG.burst;
            hound.esT = 0;
          }
          break;
        }

        case "burst": {
          hound.wantYaw = angleToPlayer;
          hound.esT -= dt;
          hound.flare = 1.0;
          crouchTarget = 0.05;
          if (hound.esT <= 0) {
            hound.esT = HOUND_CONFIG.burstGap;
            hound.shots--;
            fireTurretShot(player);
          }
          if (hound.shots <= 0) {
            hiveCtx.releaseToken(hound);
            hound.cool =
              HOUND_CONFIG.cooldown[0] +
              rng() * (HOUND_CONFIG.cooldown[1] - HOUND_CONFIG.cooldown[0]);
            hound.bursts++;
            if (hound.bursts >= 1 + (rng() < 0.4 ? 1 : 0)) {
              seekCoverOrFlank();
            } else {
              hound.es = "cool";
              hound.esT = 0;
            }
          }
          break;
        }

        case "wind": {
          hound.wantYaw = angleToPlayer;
          hound.esT -= dt;
          crouchTarget = 0.16;
          hound.sP.v += 3.0 * dt;
          if (hound.esT <= 0) {
            hound.es = "lunge";
            hound.esT = 0.36;
            hound.speed = HOUND_CONFIG.lungeSpeed;
            hound.yaw = angleToPlayer;
          }
          break;
        }

        case "lunge": {
          isLunging = true;
          hound.esT -= dt;
          hound.wantYaw = angleToPlayer;
          hound.maxSpeed = HOUND_CONFIG.lungeSpeed;
          hound.speed = HOUND_CONFIG.lungeSpeed;

          if (distToPlayer < 1.35 && player.alive) {
            player.damage(HOUND_CONFIG.lungeDamage, hound.pos);
            engineCtx.events.emit("enemy:melee", { enemy: hound, pos: hound.pos });
            hound.esT = 0;
            hound.sP.v -= 4.0;
          }

          if (hound.esT <= 0) {
            hound.es = "recover";
            hound.esT = 0.55;
            hound.lungeCd = HOUND_CONFIG.lungeCooldown;
            hound.speed *= 0.3;
          }
          break;
        }

        case "recover": {
          hound.esT -= dt;
          hound.wantYaw = angleToPlayer;
          if (hound.esT <= 0) seekCoverOrFlank();
          break;
        }
      }
    }

    return { aimTarget, headLookTarget, crouchTarget, isLunging };
  }

  /**
   * 猎犬转向阻尼、线速度积分、物理避挤排斥与导航网格地面贴合计算
   * @param {number} dt
   * @param {any} player
   * @param {number} distToPlayer
   * @param {boolean} isLunging
   */
  function updateHoundMotionAndPhysics(dt, player, distToPlayer, isLunging) {
    // 转向速率阻尼积分 (Steering Dynamics)
    const yawError = diffAngle(hound.wantYaw, hound.yaw);
    const targetYawRate =
      clampValue(yawError * 6.0, -HOUND_CONFIG.turnRate, HOUND_CONFIG.turnRate) *
      (isLunging ? 2.0 : 1.0);

    hound.yawRate += (targetYawRate - hound.yawRate) * (1 - Math.exp(-10 * dt));
    hound.yaw += hound.yawRate * dt;

    // 线速度加速度积分 (Linear Velocity Integration)
    const accelRate = hound.maxSpeed > hound.speed ? HOUND_CONFIG.accel : -HOUND_CONFIG.accel * 1.4;
    hound.prevSpeed = hound.speed;
    hound.speed = isLunging
      ? hound.speed
      : clampValue(hound.speed + accelRate * dt, 0, Math.max(hound.maxSpeed, 0));

    if (!isLunging && accelRate < 0 && hound.speed < hound.maxSpeed) {
      hound.speed = hound.maxSpeed;
    }

    // 群体避挤与玩家碰撞排斥 (Flocking Repulsion & Push)
    const sinYaw = Math.sin(hound.yaw);
    const cosYaw = Math.cos(hound.yaw);

    for (const other of hiveCtx.list) {
      if (other === hound || other.type !== "hound" || !other.active) continue;
      const sepX = hound.pos.x - other.pos.x;
      const sepZ = hound.pos.z - other.pos.z;
      const sepDist = Math.hypot(sepX, sepZ);
      if (sepDist < 1.7 && sepDist > 0.001) {
        const force = ((1.7 - sepDist) * 2.2) / sepDist;
        hound.push.x += sepX * force * dt * 6;
        hound.push.z += sepZ * force * dt * 6;
      }
    }

    if (player && !isLunging && distToPlayer < 1.25 && distToPlayer > 0.001) {
      const force = ((1.25 - distToPlayer) * 3.0) / distToPlayer;
      hound.push.x += (hound.pos.x - player.pos.x) * force * dt * 6;
      hound.push.z += (hound.pos.z - player.pos.z) * force * dt * 6;
    }

    hound.push.multiplyScalar(Math.exp(-5 * dt));

    // 障碍探测与地面贴合 (Obstacle Feeler & Navmesh Bounds)
    let nextX = hound.pos.x + (sinYaw * hound.speed + hound.push.x) * dt;
    let nextZ = hound.pos.z + (cosYaw * hound.speed + hound.push.z) * dt;
    const navmesh = engineCtx.physics.nav;

    hound.feelT -= dt;
    if (hound.feelT <= 0 && hound.speed > 0.3) {
      hound.feelT = 0.12;
      houndEyeMuzzle.set(hound.pos.x, hound.pos.y + 0.55, hound.pos.z);
      muzzleAimDir.set(sinYaw, 0, cosYaw);
      const hit = engineCtx.physics.raycast(
        houndEyeMuzzle,
        muzzleAimDir,
        0.75 + hound.speed * 0.12,
      );
      hound.blocked = !!hit;
    } else if (hound.speed <= 0.3) {
      hound.blocked = false;
    }

    const isOffNav = navmesh.isWalkable && !navmesh.isWalkable(nextX, nextZ);
    const isObstructed =
      (hound.blocked && !isLunging) || (hound.blocked && isLunging && hound.esT < 0.3);

    if (isOffNav || isObstructed) {
      if (hound.blocked) {
        nextX = hound.pos.x + hound.push.x * dt;
        nextZ = hound.pos.z + hound.push.z * dt;
        hound.yawRate += (hound.phase > 3.14 ? 1 : -1) * 4 * dt;
      } else if (navmesh.isWalkable(nextX, hound.pos.z)) {
        nextZ = hound.pos.z;
      } else if (navmesh.isWalkable(hound.pos.x, nextZ)) {
        nextX = hound.pos.x;
      } else {
        nextX = hound.pos.x;
        nextZ = hound.pos.z;
      }

      hound.speed *= 0.6;
      hound.stuckT += dt;
      if (hound.stuckT > 0.5) {
        hound.stuckT = 0;
        hound.planT = 0;
        if (hound.mode === "engage" && hound.es === "move") seekCoverOrFlank();
        else if (hound.mode === "patrol") hound.hasGoal = false;
      }
    }

    hound.pos.x = nextX;
    hound.pos.z = nextZ;
    hound.pos.y +=
      (engineCtx.physics.groundHeight(nextX, nextZ, hound.pos.y + 0.6) - hound.pos.y) *
      (1 - Math.exp(-12 * dt));
  }

  /**
   * 猎犬战斗与行为决策主循环 (Hound Think & State Machine)
   */
  function updateAliveHound(dt) {
    const player = engineCtx.player;

    hound.fwd.set(Math.sin(hound.yaw), 0, Math.cos(hound.yaw));
    hound.sensor.copy(hound.headPos);

    hiveCtx.think(hound, dt, 0.55);

    if (hound.mode !== hound.modeSeen) {
      hound.modeSeen = hound.mode;
      hound.hasGoal = false;
      hound.path = null;
      hound.waitT = 0;
      if (hound.mode === "engage") {
        seekCoverOrFlank();
      } else if (hound.es === "tele" || hound.es === "burst") {
        hiveCtx.releaseToken(hound);
        hound.es = "move";
      }
    }

    hound.wantYaw = hound.yaw;
    hound.maxSpeed = 0;
    hound.cool -= dt;
    hound.lungeCd -= dt;

    const distToPlayer = player
      ? Math.hypot(player.pos.x - hound.pos.x, player.pos.z - hound.pos.z)
      : 1e9;

    // 1. 行为分支与状态跃迁计算
    const { aimTarget, headLookTarget, crouchTarget, isLunging } = updateHoundBehavior(
      dt,
      player,
      distToPlayer,
    );

    // 2. 转向、动力学与避挤地面贴合步进
    updateHoundMotionAndPhysics(dt, player, distToPlayer, isLunging);

    // 3. 四足小跑步态推进 (Trotting Locomotion Dynamics)
    updateHoundLocomotion(dt);

    hound.crouch += (crouchTarget - hound.crouch) * (1 - Math.exp(-12 * dt));

    // 4. 炮塔与头部多级朝向计算 (Turret Aiming & Head Look-At IK)
    const cosY = Math.cos(hound.yaw);
    const sinY = Math.sin(hound.yaw);
    let targetTurretYaw = 0;
    let targetTurretPitch = 0;
    let targetHeadYaw = 0;
    let targetHeadPitch = 0.05;
    const bodyHeight = hound.pos.y + HOUND_RIG_SPEC.stand + hound.sY.x - hound.crouch;

    if (aimTarget) {
      const dx = aimTarget.x - hound.pos.x;
      const dz = aimTarget.z - hound.pos.z;
      const dy = aimTarget.y + 1.0 - (bodyHeight + 0.25);
      targetTurretYaw = Math.atan2(dx * cosY - dz * sinY, dx * sinY + dz * cosY);
      targetTurretPitch = clampValue(Math.atan2(-dy, Math.hypot(dx, dz)), -0.9, 0.35);
    } else {
      hound.scan += dt * 0.5;
      targetTurretYaw = Math.sin(hound.scan * 0.9 + hound.phase) * 1.1;
    }

    if (headLookTarget) {
      const dx = headLookTarget.x - hound.pos.x;
      const dz = headLookTarget.z - hound.pos.z;
      const dy = headLookTarget.y + 1.2 - (bodyHeight + 0.2);
      targetHeadYaw = clampValue(
        Math.atan2(dx * cosY - dz * sinY, dx * sinY + dz * cosY),
        -1.2,
        1.2,
      );
      targetHeadPitch = clampValue(Math.atan2(-dy, Math.hypot(dx, dz)), -0.6, 0.5);
    } else {
      targetHeadYaw =
        Math.sin(hiveCtx.t * 0.7 + hound.phase) * 0.5 + clampValue(hound.yawRate * 0.25, -0.6, 0.6);
    }

    const turretTurnStep = clampValue(4.5 * dt, 0, 1);
    hound.tyaw += clampValue(
      diffAngle(targetTurretYaw, hound.tyaw),
      -turretTurnStep,
      turretTurnStep,
    );
    hound.tpitch += (targetTurretPitch - hound.tpitch) * (1 - Math.exp(-10 * dt));

    const headSmoothing = 1 - Math.exp(-7 * dt);
    hound.hyaw += (targetHeadYaw - hound.hyaw) * headSmoothing;
    hound.hpitch += (targetHeadPitch - hound.hpitch) * headSmoothing;

    // 8. 骨骼姿态与四足逆运动学求解 (Bone Transform & Quadruped Leg IK)
    applyIKAndPose(dt);

    // 9. 战术闪光与灯效
    const beaconFreq = (hiveCtx.t * (hound.mode === "patrol" ? 0.8 : 2.2) + hound.phase) % 1;
    const isBeaconOn = beaconFreq < 0.12 || (beaconFreq > 0.22 && beaconFreq < 0.3);
    bones.beacon.scale.setScalar(isBeaconOn ? 1 : 1e-4);

    const targetLensColor =
      hound.mode === "engage" ? LENS_COLOR_RED_ALERT : LENS_COLOR_AMBER_PATROL;
    const lensBrightness = 1 + hound.flare * 3.5;
    for (let c = 0; c < 3; c++) {
      hound.lensC[c] += (targetLensColor[c] - hound.lensC[c]) * (1 - Math.exp(-8 * dt));
    }
    lensMat.color.setRGB(
      hound.lensC[0] * lensBrightness,
      hound.lensC[1] * lensBrightness,
      hound.lensC[2] * lensBrightness,
    );
    hound.flare = Math.max(0, hound.flare - dt * 2.0);

    // 10. 受损排烟与机械伺服音效
    if (hound.hp < HOUND_CONFIG.hp * HOUND_CONFIG.smokeBelow) {
      hound.smokeT -= dt;
      if (hound.smokeT <= 0) {
        hound.smokeT = 0.2;
        footScratchPos.set(hound.pos.x - sinY * 0.3, bodyHeight + 0.2, hound.pos.z - cosY * 0.3);
        engineCtx.fx.smoke(footScratchPos, { size: 0.35, life: 1.3, color: 0x232428, rise: 0.9 });
        if (rng() < 0.2) engineCtx.fx.sparks(footScratchPos, DOWN_DIR, 3);
      }
    }

    if (hound.loop) {
      hound.loop.setPos(hound.pos);
      hound.loop.setGain(
        clampValue(0.12 + hound.speed * 0.12 + Math.abs(hound.yawRate) * 0.1, 0, 0.8),
      );
      hound.loop.setPitch(0.8 + hound.speed * 0.08);
    }
  }

  /**
   * 四足对角小跑步态生成器 (Trotting Gait Locomotion Generator)
   */
  function updateHoundLocomotion(dt) {
    const moveDirX = Math.sin(hound.yaw) * hound.speed + hound.push.x;
    const moveDirZ = Math.cos(hound.yaw) * hound.speed + hound.push.z;
    const isMoving = hound.speed > 0.15 || Math.abs(hound.yawRate) > 0.25;

    if (hound.sw < 0) {
      hound.idleT = isMoving ? 0 : hound.idleT + dt;
      const motionIntensity = hound.speed + Math.abs(hound.yawRate) * 0.5;
      const stepDuration = clampValue(0.27 - motionIntensity * 0.026, 0.14, 0.27);

      let bestPair = -1;
      let maxDisplacement = 0;

      for (let p = 0; p < 2; p++) {
        let pairDisp = 0;
        for (const legIdx of DIAGONAL_LEG_PAIRS[p]) {
          computeNeutralFootPos(
            footScratchPos,
            legIdx,
            hound.pos.x + moveDirX * stepDuration,
            hound.pos.z + moveDirZ * stepDuration,
            hound.yaw + hound.yawRate * stepDuration,
          );
          const d = Math.hypot(
            footScratchPos.x - hound.feet[legIdx].p.x,
            footScratchPos.z - hound.feet[legIdx].p.z,
          );
          if (d > pairDisp) pairDisp = d;
        }

        if (p !== hound.lastPair) pairDisp *= 1.25; // 步态滞后偏置 (Alternating Bias)
        if (pairDisp > maxDisplacement) {
          maxDisplacement = pairDisp;
          bestPair = p;
        }
      }

      const stepThreshold = isMoving ? 0.09 : hound.idleT > 0.25 ? 0.035 : 1e9;
      if (bestPair >= 0 && maxDisplacement > stepThreshold) {
        hound.sw = bestPair;
        hound.swT = 0;
        hound.swDur = stepDuration;
        hound.lift = 0.065 + Math.min(0.09, motionIntensity * 0.02);

        for (const legIdx of DIAGONAL_LEG_PAIRS[bestPair]) {
          const footRecord = hound.feet[legIdx];
          footRecord.from.copy(footRecord.p);
          computeNeutralFootPos(
            footRecord.to,
            legIdx,
            hound.pos.x + moveDirX * stepDuration * 1.5,
            hound.pos.z + moveDirZ * stepDuration * 1.5,
            hound.yaw + hound.yawRate * stepDuration * 1.5,
          );
          footRecord.to.y = engineCtx.physics.groundHeight(
            footRecord.to.x,
            footRecord.to.z,
            hound.pos.y + 0.6,
          );
        }
      }
    } else {
      // 抬腿摆动插值 (Leg Swing Cubic Phase)
      hound.swT += dt / hound.swDur;
      const t = hound.swT >= 1 ? 1 : hound.swT;
      const smoothT = t * t * (3 - 2 * t);

      for (const legIdx of DIAGONAL_LEG_PAIRS[hound.sw]) {
        const footRecord = hound.feet[legIdx];
        footRecord.p.lerpVectors(footRecord.from, footRecord.to, smoothT);
        footRecord.p.y += Math.sin(Math.PI * t) * hound.lift;
      }

      if (hound.swT >= 1) {
        // 落地踏步撞击与音效事件 (Foot Plant Contact Event)
        const plantFoot = hound.feet[DIAGONAL_LEG_PAIRS[hound.sw][0]];
        engineCtx.events.emit("enemy:step", {
          pos: plantFoot.p,
          type: "hound",
          enemy: hound,
          speed: hound.speed,
        });
        hound.sY.v -= 0.12 + hound.speed * 0.03; // 踏步底盘反冲
        hound.lastPair = hound.sw;
        hound.sw = -1;
      }
    }
  }

  /**
   * 姿态动力学与四足解析 IK 绑定 (Chassis Suspension & Leg IK Application)
   */
  function applyIKAndPose(dt) {
    const cosY = Math.cos(hound.yaw);
    const sinY = Math.sin(hound.yaw);

    // 四足支撑多边形高度平均
    const frontGroundY = (hound.feet[0].p.y + hound.feet[1].p.y) * 0.5;
    const rearGroundY = (hound.feet[2].p.y + hound.feet[3].p.y) * 0.5;
    const leftGroundY = (hound.feet[0].p.y + hound.feet[2].p.y) * 0.5;
    const rightGroundY = (hound.feet[1].p.y + hound.feet[3].p.y) * 0.5;

    const terrainHeightDelta = (frontGroundY + rearGroundY) * 0.5 - hound.pos.y;
    const accelDelta = dt > 0 ? (hound.speed - hound.prevSpeed) / dt : 0;

    let targetChassisPitch =
      Math.atan2(rearGroundY - frontGroundY, 0.8) * 0.6 +
      clampValue(accelDelta * 0.006, -0.07, 0.07);
    let targetChassisRoll =
      Math.atan2(leftGroundY - rightGroundY, 0.55) * 0.6 +
      clampValue(hound.yawRate * hound.speed * 0.02, -0.12, 0.12);
    let targetChassisHeave = terrainHeightDelta * 0.45 - Math.min(0.05, hound.speed * 0.011);

    if (!hound.alive) {
      targetChassisPitch = hound.diePitch;
      targetChassisRoll = hound.dieRoll;
      targetChassisHeave = 0;
    } else {
      springDamper(hound.sY, targetChassisHeave, 160, 17, dt);
      springDamper(hound.sP, targetChassisPitch, 130, 15, dt);
      springDamper(hound.sR, targetChassisRoll, 130, 15, dt);
      springDamper(hound.sL, 0, 110, 13, dt);
    }

    const idleBreathing = hound.alive ? Math.sin(hiveCtx.t * 1.7 + hound.phase) * 0.004 : 0;
    const bodyLocalX = hound.sL.x;
    const bodyLocalY = HOUND_RIG_SPEC.stand + hound.sY.x - hound.crouch + idleBreathing;
    const bodyPitch = hound.sP.x;
    const bodyRoll = hound.sR.x;

    skinnedMeshWrapper.group.rotation.y = hound.yaw;
    bones.body.position.set(bodyLocalX, bodyLocalY, 0);
    bones.body.rotation.set(bodyPitch, 0, bodyRoll);

    bones.turret.rotation.y = hound.tyaw;
    bones.gun.rotation.x = hound.tpitch - bodyPitch * 0.5;
    bones.head.rotation.set(hound.hpitch, hound.hyaw, 0);

    // 战术天线柔性摆动 (Antenna Whip Inertia)
    springDamper(hound.sA, clampValue(-accelDelta * 0.03 - bodyPitch, -0.6, 0.6), 60, 5, dt);
    springDamper(hound.sA2, clampValue(hound.yawRate * 0.12 - bodyRoll, -0.6, 0.6), 60, 5, dt);
    bones.antenna.rotation.set(hound.sA.x, 0, hound.sA2.x);

    // 肢体关节逆运动学变换矩阵解算 (Transform to Hip Local Space for IK)
    const cosPitch = Math.cos(bodyPitch);
    const sinPitch = Math.sin(bodyPitch);
    const cosRoll = Math.cos(bodyRoll);
    const sinRoll = Math.sin(bodyRoll);

    for (let i = 0; i < 4; i++) {
      const footPos = hound.feet[i].p;
      const worldDx = footPos.x - hound.pos.x;
      const worldDy = footPos.y + HOUND_RIG_SPEC.footR * 0.6 - hound.pos.y;
      const worldDz = footPos.z - hound.pos.z;

      // 投影至猎犬机体坐标系
      const localYawX = worldDx * cosY - worldDz * sinY - bodyLocalX;
      const localYawY = worldDy - bodyLocalY;
      const localYawZ = worldDx * sinY + worldDz * cosY;

      const pitchY = localYawY * cosPitch + localYawZ * sinPitch;
      const pitchZ = -localYawY * sinPitch + localYawZ * cosPitch;

      const hipLocalX = localYawX * cosRoll + pitchY * sinRoll;
      const hipLocalY = -localYawX * sinRoll + pitchY * cosRoll;
      const hipLocalZ = pitchZ;

      solveLegIK(
        ikAngles,
        hipLocalX - HOUND_RIG_SPEC.side[i] * HOUND_RIG_SPEC.hipX,
        hipLocalY - HOUND_RIG_SPEC.hipY,
        hipLocalZ - HOUND_RIG_SPEC.fore[i] * HOUND_RIG_SPEC.hipZ,
        HOUND_RIG_SPEC.side[i],
        HOUND_RIG_SPEC.l0,
        HOUND_RIG_SPEC.L1,
        HOUND_RIG_SPEC.L2 - HOUND_RIG_SPEC.footR * 0.6,
      );

      abdJoints[i].rotation.z = ikAngles.abd;
      thighJoints[i].rotation.x = ikAngles.hip;
      shinJoints[i].rotation.x = ikAngles.knee;
    }

    skinnedMeshWrapper.group.updateMatrixWorld(true);
    hound.headPos.setFromMatrixPosition(bones.head.matrixWorld);
  }

  /**
   * 猎犬死亡处理 (Hound Death Ragdoll, Sparks & Wreck Persistence)
   */
  function killHound(impulse) {
    hound.alive = false;
    hiveCtx.releaseToken(hound);
    hound.dieT = 0;
    hound.vy = 0;
    hound.es = "move";
    bones.beacon.scale.setScalar(1e-4);

    hound.dieRoll = (rng() < 0.5 ? -1 : 1) * (0.25 + rng() * 0.3);
    hound.diePitch = (rng() - 0.5) * 0.25;
    hound.sR.v += hound.dieRoll * 3.0;
    hound.sP.v += (rng() - 0.5) * 2.0;

    for (let i = 0; i < 4; i++) {
      const foot = hound.feet[i];
      if (hound.sw >= 0) foot.p.y = hound.pos.y;
      const side = HOUND_RIG_SPEC.side[i] * (0.16 + rng() * 0.2);
      const fore = HOUND_RIG_SPEC.fore[i] * (0.05 + rng() * 0.22) + (rng() - 0.5) * 0.1;
      const cosY = Math.cos(hound.yaw);
      const sinY = Math.sin(hound.yaw);
      foot.slide.set(side * cosY + fore * sinY, 0, -side * sinY + fore * cosY);
    }

    hound.sw = -1;
    hound.speed *= 0.3;

    footScratchPos.copy(hound.headPos);
    engineCtx.fx.sparks(footScratchPos, DOWN_DIR, 16);
    engineCtx.fx.debris(footScratchPos, { count: 4 });
    engineCtx.events.emit("enemy:killed", { enemy: hound, pos: hound.pos, type: "hound" });
    hiveCtx.addWreck(hound);
  }

  /**
   * 猎犬残骸倒塌与燃烧处理 (Dead Hound Ragdoll Decay & Settling)
   */
  function updateDeadHound(dt) {
    if (hound.sink > 0) {
      hound.sink += dt;
      hound.pos.y -= 0.22 * dt;
      if (hound.sink > 3.2) hiveCtx.retire(hound);
      return;
    }

    hound.dieT += dt;
    const timeSinceDeath = hound.dieT;

    if (timeSinceDeath < 2.2) {
      const groundFloorY = 0.215 - HOUND_RIG_SPEC.stand;
      hound.vy -= 9.8 * dt * (timeSinceDeath < 0.12 ? 0.3 : 1.0);
      hound.sY.x += hound.vy * dt;

      if (hound.sY.x < groundFloorY) {
        hound.sY.x = groundFloorY;
        if (hound.vy < -1.2) {
          engineCtx.events.emit("enemy:step", {
            pos: hound.pos,
            type: "hound",
            enemy: hound,
            speed: 5,
            crash: true,
          });
          engineCtx.fx.dust(hound.pos, DOWN_DIR);
        }
        hound.vy = -hound.vy * 0.22;
      }

      springDamper(hound.sP, hound.diePitch, 60, 9, dt);
      springDamper(hound.sR, hound.dieRoll, 60, 9, dt);
      springDamper(hound.sL, 0, 40, 8, dt);

      const frictionDecay = Math.exp(-3.2 * dt);
      for (let i = 0; i < 4; i++) {
        const foot = hound.feet[i];
        foot.p.x += foot.slide.x * (1 - frictionDecay);
        foot.p.z += foot.slide.z * (1 - frictionDecay);
        foot.slide.multiplyScalar(frictionDecay);
      }

      hound.pos.x += Math.sin(hound.yaw) * hound.speed * dt;
      hound.pos.z += Math.cos(hound.yaw) * hound.speed * dt;
      hound.speed *= Math.exp(-5 * dt);

      hound.hpitch += (0.55 - hound.hpitch) * (1 - Math.exp(-5 * dt));
      hound.hyaw += (hound.dieRoll - hound.hyaw) * (1 - Math.exp(-3 * dt));
      hound.tpitch += (0.3 - hound.tpitch) * (1 - Math.exp(-4 * dt));

      const deathFlicker =
        timeSinceDeath < 1.2
          ? Math.sin(timeSinceDeath * 60) > 0.2
            ? 1 - timeSinceDeath / 1.2
            : 0.05
          : 0.02;
      lensMat.color.setRGB(6 * deathFlicker + 0.05, 0.6 * deathFlicker + 0.01, 0.2 * deathFlicker);

      applyIKAndPose(dt);
    }

    if (timeSinceDeath < 6.5) {
      hound.smokeT -= dt;
      if (hound.smokeT <= 0) {
        hound.smokeT = timeSinceDeath < 2.0 ? 0.09 : 0.2;
        footScratchPos.set(
          hound.pos.x + (rng() - 0.5) * 0.4,
          hound.pos.y + 0.42,
          hound.pos.z + (rng() - 0.5) * 0.4,
        );
        engineCtx.fx.smoke(footScratchPos, {
          size: 0.5 + rng() * 0.3,
          life: 1.8,
          color: 0x17181b,
          rise: 1.1,
        });

        if (timeSinceDeath < 4.0 && rng() < 0.55) {
          tempSparkPos.set(rng() - 0.5, 1, rng() - 0.5).normalize();
          engineCtx.fx.sparks(footScratchPos, tempSparkPos, timeSinceDeath < 1.0 ? 8 : 3);
        }

        if (timeSinceDeath < 3.5 && rng() < 0.4) {
          engineCtx.fx.smoke(footScratchPos, {
            size: 0.22,
            life: 0.45,
            color: 0xff7b22,
            rise: 1.6,
          });
        }
      }
    } else if (!hound.wreck) {
      hound.wreck = true;
      if (hound.loop) {
        try {
          hound.loop.stop();
        } catch {}
        hound.loop = null;
      }
    }

    if (hound.loop) {
      hound.loop.setGain(Math.max(0, 0.4 - timeSinceDeath * 0.3));
    }
  }

  return hound;
}

export {
  solveLegIK,
  HOUND_RIG_SPEC,
  buildHoundRig,
  HOUND_CONFIG,
  springDamper,
  DIAGONAL_LEG_PAIRS,
  createHound,
};

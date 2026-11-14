/**
 * @file src/enemies/gull_model.js
 * @description 机械飞鸥 (Gull) 四旋翼无人机程序化骨骼与几何模型装配
 */

import * as THREE from "three";
import { createCylinderGeometry, createTubeFromPoints } from "../geo.js";
import {
  SkeletonRig,
  placeGeometry,
  createBeveledBox,
  createCylinderY,
  createCylinderX,
  createCylinderZ,
  createPipeBetweenPoints,
  createScaledSphere,
  createBoltY,
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
} from "./rig.js";

const GULL_RIG_SPEC = {
  rotors: [
    [0.33, 0.035, 0.3],
    [-0.33, 0.035, 0.3],
    [0.33, 0.035, -0.3],
    [-0.33, 0.035, -0.3],
  ],
  gimbal: [0, -0.095, 0.275],
  ball: [0, -0.072, 0],
  gun: [0, -0.085, -0.1],
  muzzle: [0, -0.032, 0.27],
  lamp: [0, -0.066, 0.025],
};

/**
 * 构造飞鸥高升力空气动力学旋翼桨叶截面
 */
function buildGullPropellerBlade() {
  const profilePoints = [
    [0.176, -0.036],
    [0.196, -0.032],
    [0.206, 0],
    [0.202, 0.03],
    [0.19, 0.04],
    [0.178, 0.032],
    [0.173, 0],
    [0.176, -0.036],
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  return new THREE.LatheGeometry(profilePoints, 28);
}

/**
 * 组装机械飞鸥（Gull）四旋翼无人机程序化骨架与几何构件
 */
function buildGullRig() {
  const spec = GULL_RIG_SPEC;
  const rig = new SkeletonRig();
  const extraRig = new SkeletonRig();

  const addBoneBoth = (name, parent, x, y, z) => {
    rig.bone(name, parent, x, y, z);
    extraRig.bone(name, parent, x, y, z);
  };

  addBoneBoth("root", null, 0, 0, 0);
  addBoneBoth("body", "root", 0, 0, 0);

  for (let l = 0; l < 4; l++) {
    addBoneBoth("rotor" + l, "body", spec.rotors[l][0], spec.rotors[l][1], spec.rotors[l][2]);
  }

  addBoneBoth("gimbalYaw", "body", spec.gimbal[0], spec.gimbal[1], spec.gimbal[2]);
  addBoneBoth("ball", "gimbalYaw", spec.ball[0], spec.ball[1], spec.ball[2]);
  addBoneBoth("lamp", "ball", spec.lamp[0], spec.lamp[1], spec.lamp[2]);
  addBoneBoth("gun", "body", spec.gun[0], spec.gun[1], spec.gun[2]);
  addBoneBoth("strobeG", "body", 0, 0, 0);
  addBoneBoth("strobeR", "body", 0, 0, 0);
  addBoneBoth("strobeW", "body", 0, 0, 0);

  const add = (slot, bone, geo, tint, applyShading) => rig.add(slot, bone, geo, tint, applyShading);

  // 流线型机身外壳与航空复合碳纤维结构
  add(
    "shell",
    "body",
    placeGeometry(createScaledSphere(1, 20, 12, 0.118, 0.074, 0.27), 0, 0.02, 0),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(
      createCylinderGeometry(1, 0.9, 1, 20),
      0,
      0.02,
      0.165,
      HALF_PI,
      0,
      0,
      [0.094, 0.05, 0.06],
    ),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "shell",
    "body",
    placeGeometry(
      createCylinderGeometry(1, 1, 1, 20),
      0,
      0.02,
      -0.02,
      HALF_PI,
      0,
      0,
      [0.121, 0.012, 0.0765],
    ),
    COLOR_DARK_ALLOY,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.118, 0.014, 0.2, 0.005), 0, 0.089, -0.03),
    COLOR_SHELL_WARM,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.03, 0.006, 0.2, 0.002), 0, 0.0975, -0.03),
    COLOR_HAZARD_ORANGE,
  );

  for (const x of [-0.05, 0.05]) {
    for (const z of [-0.12, 0.06]) {
      add("metal", "body", createBoltY(x, 0.097, z), COLOR_CHROME_BRIGHT);
    }
  }

  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.175, 0.06, 0.37, 0.016), 0, -0.035, -0.005),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.12, 0.075, 0.11, 0.014), 0, 0.005, -0.265),
    COLOR_NEUTRAL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.124, 0.02, 0.03, 0.005), 0, 0.03, -0.3),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "glow",
    "body",
    placeGeometry(createBeveledBox(0.05, 0.006, 0.003, 0.001), 0, 0, -0.321),
    [0.3, 1.6, 0.4],
    false,
  );

  // 两侧起落滑架与后倾斜双天线
  for (const side of [1, -1]) {
    for (let c = 0; c < 4; c++) {
      add(
        "metal",
        "body",
        placeGeometry(
          createBeveledBox(0.004, 0.01, 0.06, 0.001),
          side * 0.0885,
          -0.045 + c * 0.016,
          -0.06,
        ),
        [0.2, 0.2, 0.2],
      );
    }
    add(
      "metal",
      "body",
      createTubeFromPoints(
        [
          [side * 0.075, -0.055, 0.13],
          [side * 0.135, -0.175, 0.16],
          [side * 0.135, -0.192, 0.11],
          [side * 0.135, -0.192, -0.14],
          [side * 0.135, -0.175, -0.19],
          [side * 0.075, -0.055, -0.15],
        ],
        0.0085,
        6,
        false,
        0.5,
      ),
      COLOR_CHROME_BRIGHT,
    );

    for (const z of [0.07, -0.1]) {
      add(
        "shell",
        "body",
        placeGeometry(createCylinderZ(0.0135, 0.0135, 0.07, 8), side * 0.135, -0.192, z),
        COLOR_CHASSIS_BLACK,
      );
    }
    add(
      "metal",
      "body",
      createPipeBetweenPoints(
        [side * 0.04, 0.07, -0.17],
        [side * 0.085, 0.37, -0.27],
        0.004,
        0.002,
        5,
      ),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "metal",
      "body",
      placeGeometry(createCylinderY(0.008, 0.01, 0.025, 6), side * 0.04, 0.078, -0.17),
      COLOR_CHROME_BRIGHT,
    );
  }

  add(
    "metal",
    "body",
    placeGeometry(createCylinderY(0.007, 0.007, 0.04, 6), 0, 0.105, 0.1),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "shell",
    "body",
    placeGeometry(createCylinderY(0.034, 0.036, 0.018, 14), 0, 0.132, 0.1),
    COLOR_SHELL_WHITE,
  );
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.07, 0.03, 0.09, 0.008), 0, -0.075, 0.235),
    COLOR_NEUTRAL_WHITE,
  );

  // 四涵道旋翼机臂、导流罩与警示环 (Ducted Propeller Shrouds)
  const ductGeometry = buildGullPropellerBlade();

  for (let l = 0; l < 4; l++) {
    const [rx, ry, rz] = spec.rotors[l];
    const signX = Math.sign(rx);
    const signZ = Math.sign(rz);

    add(
      "metal",
      "body",
      createPipeBetweenPoints(
        [signX * 0.07, 0, signZ * 0.09],
        [rx, ry - 0.05, rz],
        0.017,
        0.015,
        8,
      ),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "shell",
      "body",
      placeGeometry(
        createBeveledBox(0.07, 0.045, 0.07, 0.014),
        signX * 0.085,
        0,
        signZ * 0.1,
        0,
        signX * signZ * 0.74,
        0,
      ),
      COLOR_SHELL_WHITE,
    );
    add(
      "shell",
      "body",
      createTubeFromPoints(
        [
          [signX * 0.09, 0.02, signZ * 0.12],
          [signX * 0.18, 0.012, signZ * 0.19],
          [rx - signX * 0.05, ry - 0.03, rz - signZ * 0.04],
        ],
        0.005,
        5,
      ),
      COLOR_CHASSIS_BLACK,
    );
    add(
      "metal",
      "body",
      placeGeometry(createCylinderY(0.04, 0.03, 0.075, 12), rx, ry - 0.05, rz),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "metal",
      "body",
      placeGeometry(createCylinderY(0.042, 0.042, 0.012, 12), rx, ry - 0.02, rz),
      COLOR_CHROME_BRIGHT,
    );

    // 空气动力学流线涵道与橙色内环
    add("shell", "body", placeGeometry(ductGeometry.clone(), rx, ry, rz), COLOR_SHELL_WHITE);
    add(
      "shell",
      "body",
      placeGeometry(
        new THREE.TorusGeometry(0.196, 0.0085, 6, 28),
        rx,
        ry + 0.036,
        rz,
        HALF_PI,
        0,
        0,
      ),
      COLOR_HAZARD_ORANGE,
    );

    // 三向电机支架 (Stator Struts)
    for (let v = 0; v < 3; v++) {
      const ang = v * 2.094 + 0.5 + l;
      add(
        "metal",
        "body",
        placeGeometry(
          createBeveledBox(0.145, 0.007, 0.016, 0.002),
          rx + Math.cos(ang) * 0.105,
          ry - 0.022,
          rz - Math.sin(ang) * 0.105,
          0,
          ang,
          0,
        ),
        COLOR_GUNMETAL_GREY,
      );
    }

    // 涵道外侧防撞保护翼鳍 (Protection Fins)
    for (let v = -1; v <= 1; v++) {
      const ang = Math.atan2(signZ, signX) + v * 0.2;
      add(
        "shell",
        "body",
        placeGeometry(
          createBeveledBox(0.012, 0.05, 0.036, 0.003),
          rx + Math.cos(ang) * 0.205,
          ry,
          rz + Math.sin(ang) * 0.205,
          0,
          -ang,
          0,
        ),
        v === 0 ? COLOR_DARK_ALLOY : COLOR_AMBER_WARNING,
      );
    }

    // 旋翼电机轴心与双叶折叠碳纤桨叶 (Rotor Hub & Blades)
    const rName = "rotor" + l;
    add(
      "metal",
      rName,
      placeGeometry(createCylinderY(0.017, 0.02, 0.03, 8), 0, -0.002, 0),
      COLOR_CHROME_BRIGHT,
    );
    add(
      "metal",
      rName,
      placeGeometry(createBeveledBox(0.158, 0.0035, 0.03, 0.001), 0.088, 0.008, 0, 0.22, 0, 0),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "metal",
      rName,
      placeGeometry(createBeveledBox(0.158, 0.0035, 0.03, 0.001), -0.088, 0.008, 0, -0.22, 0, 0),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "shell",
      rName,
      placeGeometry(createBeveledBox(0.02, 0.004, 0.031, 0.001), 0.158, 0.008, 0, 0.22, 0, 0),
      COLOR_AMBER_WARNING,
    );
    add(
      "shell",
      rName,
      placeGeometry(createBeveledBox(0.02, 0.004, 0.031, 0.001), -0.158, 0.008, 0, -0.22, 0, 0),
      COLOR_AMBER_WARNING,
    );

    // 旋翼动态模糊透明气动圆盘 (Motion Blur Disc)
    const blurDisc = new THREE.RingGeometry(0.03, 0.168, 24, 1);
    blurDisc.rotateX(-HALF_PI);
    extraRig.add("disc", "body", placeGeometry(blurDisc, rx, ry + 0.008, rz), [1, 1, 1], false);
  }

  // 国际航空标准红/绿/白三色导航频闪灯 (Aviation Strobes)
  add(
    "glow",
    "strobeR",
    placeGeometry(createScaledSphere(0.012, 8, 6), 0.33 + 0.215, 0.035, 0.3),
    [10, 0.4, 0.2],
    false,
  );
  add(
    "glow",
    "strobeR",
    placeGeometry(createScaledSphere(0.012, 8, 6), 0.33 + 0.215, 0.035, -0.3),
    [10, 0.4, 0.2],
    false,
  );
  add(
    "glow",
    "strobeG",
    placeGeometry(createScaledSphere(0.012, 8, 6), -0.33 - 0.215, 0.035, 0.3),
    [0.3, 9, 1],
    false,
  );
  add(
    "glow",
    "strobeG",
    placeGeometry(createScaledSphere(0.012, 8, 6), -0.33 - 0.215, 0.035, -0.3),
    [0.3, 9, 1],
    false,
  );
  add(
    "glow",
    "strobeW",
    placeGeometry(createScaledSphere(0.011, 8, 6), 0, 0.05, -0.325),
    [9, 9, 9],
    false,
  );

  // 腹部双轴云台与光电传感器球 (Gimbal & Multi-sensor Ball)
  add(
    "metal",
    "gimbalYaw",
    placeGeometry(createCylinderY(0.036, 0.036, 0.014, 12), 0, -0.004, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "gimbalYaw",
    placeGeometry(createBeveledBox(0.156, 0.01, 0.03, 0.003), 0, -0.014, 0),
    COLOR_NEUTRAL_WHITE,
  );

  for (const side of [1, -1]) {
    add(
      "metal",
      "gimbalYaw",
      placeGeometry(createBeveledBox(0.009, 0.075, 0.03, 0.003), side * 0.0735, -0.05, 0),
      COLOR_NEUTRAL_WHITE,
    );
  }

  add(
    "metal",
    "ball",
    placeGeometry(createScaledSphere(0.06, 18, 12), 0, 0, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "ball",
    placeGeometry(createCylinderX(0.013, 0.013, 0.142, 8), 0, 0, 0),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "metal",
    "ball",
    placeGeometry(createCylinderZ(0.031, 0.036, 0.03, 14), 0, 0.004, 0.048),
    COLOR_NEUTRAL_WHITE,
  );
  add(
    "lens",
    "ball",
    placeGeometry(createCylinderZ(0.025, 0.025, 0.004, 14), 0, 0.004, 0.0645),
    [1, 1, 1],
    false,
  );
  add(
    "metal",
    "ball",
    placeGeometry(createCylinderZ(0.012, 0.012, 0.01, 8), 0.03, 0.036, 0.04),
    [0.1, 0.12, 0.2],
  );
  add(
    "metal",
    "ball",
    placeGeometry(
      createCylinderZ(0.019, 0.023, 0.045, 10),
      spec.lamp[0],
      spec.lamp[1],
      spec.lamp[2] - 0.022,
    ),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "glow",
    "lamp",
    placeGeometry(createCylinderZ(0.016, 0.016, 0.003, 10), 0, 0, 0.001),
    [11, 9.8, 7.6],
    false,
  );

  // 强光探照视觉光锥 (Searchlight Volumetric Beam Cone)
  const searchlightCone = new THREE.ConeGeometry(1.25, 9, 20, 6, true);
  searchlightCone.translate(0, -9 / 2, 0);
  searchlightCone.rotateX(-HALF_PI);
  extraRig.add("cone", "lamp", searchlightCone, [1, 1, 1], false);

  // 腹部防御性双管等离子脉冲炮 (Ventral Defense Gun)
  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.05, 0.03, 0.05, 0.006), 0, 0.012, 0),
    COLOR_NEUTRAL_WHITE,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderX(0.012, 0.012, 0.07, 8), 0, -0.005, 0),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.052, 0.046, 0.13, 0.008), 0, -0.032, 0),
    COLOR_NEUTRAL_WHITE,
  );
  add(
    "shell",
    "gun",
    placeGeometry(createBeveledBox(0.054, 0.012, 0.05, 0.003), 0, -0.02, -0.03),
    COLOR_HAZARD_ORANGE,
  );

  for (const x of [-0.014, 0.014]) {
    add(
      "metal",
      "gun",
      placeGeometry(createCylinderZ(0.0085, 0.0085, 0.2, 8), x, -0.032, 0.16),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "metal",
      "gun",
      placeGeometry(createCylinderZ(0.012, 0.012, 0.03, 8), x, -0.032, 0.255),
      COLOR_NEUTRAL_WHITE,
    );
  }

  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.045, 0.012, 0.012, 0.002), 0, -0.032, 0.2),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.03, 0.05, 0.05, 0.006), 0.04, -0.035, -0.02),
    COLOR_GUNMETAL_GREY,
  );

  const mainResult = rig.build(["shell", "metal", "glow", "lens"]);
  const extraResult = extraRig.build(["disc", "cone"]);
  mainResult.extra = extraResult;
  return mainResult;
}

export { GULL_RIG_SPEC, buildGullPropellerBlade, buildGullRig };

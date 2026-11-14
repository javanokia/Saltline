// @ts-check
/**
 * @file src/props/machinery.js
 * @description 港区重型工业特种机械、特种车辆与维保设备构建器 (Heavy Machinery & Special Vehicles)
 *
 * 【资产清单】
 * 1. 3.5吨重型内燃/电动平衡重式叉车 (forklift)
 * 2. 工业级静音应急柴油发电机组 (generator)
 * 3. 港区重型集装垃圾箱 (dumpster)
 * 4. 多层移动式机修抽屉工具车 (toolbox_cart)
 */

import * as THREE from "three";
import { createBoxGeometry, createCylinderGeometry } from "../geo.js";
import {
  HALF_PI,
  clamp,
  PropCompoundBuilder,
  getCachedDecalTexture,
  createChamferedBoxGeometry,
  createPrismGeometry,
  createConnectingCylinder,
  createRevolvedGeometry,
  generateTireTreadProfile,
  resolveColorPalette,
  sampleSimplexNoise3D,
} from "./builder.js";

/**
 * 车辆重载车轮与轮毂构建器 (Vehicle Wheel & Hub Assembly)
 */
export function buildVehicleWheel(
  builder,
  x,
  y,
  width,
  halfTrack,
  sideSign,
  rimRadius,
  segments,
  _unused,
  prng,
) {
  const tireGeo = generateTireTreadProfile(y, width, rimRadius, segments);
  builder.push({
    p: [x, y, sideSign > 0 ? halfTrack - width / 2 : -(halfTrack - width / 2)],
    r: [sideSign > 0 ? HALF_PI : -HALF_PI, 0, 0],
  });
  builder.push({ r: [0, prng() * 6, 0] });
  const noiseSeed = prng() * 20;
  builder.add("tire", tireGeo, null, (vx, vy, vz) => {
    const dist = Math.hypot(vx, vz);
    return dist < rimRadius + 0.01
      ? 0.45
      : 0.78 + 0.22 * sampleSimplexNoise3D(Math.atan2(vz, vx) * 3 + noiseSeed, dist * 30, 0);
  });
  const rimInset = width * 0.8;
  const rimHubGeo = createRevolvedGeometry(
    [
      [rimRadius + 0.006, rimInset + 0.012],
      [rimRadius - 0.012, rimInset + 0.016],
      [rimRadius - 0.03, rimInset - 0.02],
      [rimRadius * 0.62, rimInset - 0.05],
      [rimRadius * 0.5, rimInset - 0.02],
      [rimRadius * 0.42, rimInset - 0.012],
      [0, rimInset - 0.012],
    ],
    14,
  );
  builder.add("paint_yellow", rimHubGeo, null, (vx, vy, vz) =>
    Math.hypot(vx, vz) > rimRadius * 0.7 ? [0.55, 0.5, 0.42] : [0.8, 0.78, 0.7],
  );
  builder.add(
    "steel_dark",
    createRevolvedGeometry(
      [
        [0, width * 0.2],
        [rimRadius + 0.004, width * 0.2],
      ],
      10,
    ),
    null,
    0.4,
  );
  builder.add(
    "steel_dark",
    createCylinderGeometry(rimRadius * 0.2, rimRadius * 0.24, 0.035, 8),
    { p: [0, rimInset, 0] },
    0.7,
  );
  for (let p = 0; p < 6; p++) {
    const angle = (p * Math.PI) / 3;
    builder.add(
      "steel_galv",
      createCylinderGeometry(0.011, 0.012, 0.016, 6),
      {
        p: [
          Math.cos(angle) * rimRadius * 0.33,
          rimInset - 0.006,
          Math.sin(angle) * rimRadius * 0.33,
        ],
      },
      prng.range(0.5, 0.8),
    );
  }
  builder.pop();
  builder.pop();
}

/**
 * 3.5吨重型工业平衡重内燃叉车 (Heavy Industrial Counterbalanced Forklift)
 * 基于资产工坊逆向解密标准尺寸装配
 */
export function buildForklift(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "forklift", options.seed || 0);
  const prng = b.rng;
  const forksUp = clamp(+options.forksUp || 0, 0, 1);
  const forkLiftY = forksUp * 1.5;
  const halfLiftY = forkLiftY / 2;
  const [matBody, tint] = resolveColorPalette(options.color, "yellow");
  const tintScale = (k = 1) => (typeof tint === "number" ? tint * k : tint.map((v) => v * k));
  const matDark = "steel_dark";
  const getLuminance = () => prng.range(0.68, 0.95);
  const fleetNum = options.number || ["04", "07", "12", "22"][b.seed % 4];

  // 1. 底盘与四轮行驶机构 (前驱动轮 0.33m 半径 / 后转向轮 0.27m 半径)
  const frontRadius = 0.33;
  const frontWidth = 0.23;
  const frontX = 0.22;
  const frontTrack = 0.47;
  const rearRadius = 0.27;
  const rearWidth = 0.18;
  const rearX = -1.1;
  const rearTrack = 0.46;

  for (const side of [1, -1]) {
    buildVehicleWheel(b, frontX, frontRadius, frontWidth, frontTrack, side, 0.195, 24, 0, prng);
    buildVehicleWheel(b, rearX, rearRadius, rearWidth, rearTrack, side, 0.155, 20, 0, prng);
  }

  // 前后桥贯通车轴与底盘大梁
  b.add(
    matDark,
    createConnectingCylinder([frontX, frontRadius, -0.4], [frontX, frontRadius, 0.4], 0.07, 8),
    null,
    0.5,
  );
  b.add(
    matDark,
    createChamferedBoxGeometry(0.12, 0.1, 0.78, 0.01),
    { p: [rearX, rearRadius, 0] },
    0.5,
  );
  b.add(
    matDark,
    createChamferedBoxGeometry(1.95, 0.34, 0.68, 0.02),
    { p: [-0.425, 0.37, 0] },
    0.55,
  );

  // 左右踏板、防滑板与挡泥板
  for (const side of [1, -1]) {
    b.add(
      matBody,
      createChamferedBoxGeometry(0.6, 0.3, 0.17, 0.02),
      { p: [-0.47, 0.4, side * 0.42] },
      tintScale(0.92),
    );
    b.add(
      "diamond_plate",
      createChamferedBoxGeometry(0.3, 0.012, 0.16, 0.003),
      { p: [-0.32, 0.556, side * 0.42] },
      0.7,
    );
    b.add(
      matDark,
      createCylinderGeometry(0.03, 0.03, 0.02, 8),
      { p: [-0.62, 0.56, side * 0.42] },
      0.6,
    );

    const fenderPts = [];
    const rIn = frontRadius + 0.035;
    const rOut = frontRadius + 0.06;
    for (let s = 0; s <= 7; s++) {
      const ang = 0.12 + ((Math.PI - 0.5) * s) / 7;
      fenderPts.push([frontX + Math.cos(ang) * rOut, frontRadius + Math.sin(ang) * rOut]);
    }
    for (let s = 7; s >= 0; s--) {
      const ang = 0.12 + ((Math.PI - 0.5) * s) / 7;
      fenderPts.push([frontX + Math.cos(ang) * rIn, frontRadius + Math.sin(ang) * rIn]);
    }
    b.add(
      matBody,
      createPrismGeometry(fenderPts, 0.27, { soft: 0.7 }),
      { p: [0, 0, side * 0.475] },
      tintScale(0.95),
    );
  }

  // 2. 车身下部、发动机舱与尾部铸铁平衡重 (Counterweight)
  b.add(
    matBody,
    createChamferedBoxGeometry(0.85, 0.38, 0.86, 0.03),
    { p: [-0.625, 0.69, 0] },
    tintScale(0.96),
  );
  b.add(
    matBody,
    createChamferedBoxGeometry(0.72, 0.07, 0.84, 0.02),
    { p: [-0.69, 0.915, 0] },
    tintScale(1.0),
  );
  b.add(
    matDark,
    createChamferedBoxGeometry(0.24, 0.008, 0.76, 0.003),
    { p: [-0.57, 0.954, 0] },
    0.35,
  );

  // 尾部铸造防撞配重块
  const weightPts = [
    [-1.05, 0.28],
    [-1.28, 0.3],
    [-1.48, 0.44],
    [-1.56, 0.66],
    [-1.55, 0.84],
    [-1.48, 0.96],
    [-1.34, 1.04],
    [-1.05, 1.04],
  ];
  b.add(
    matBody,
    createPrismGeometry(weightPts, 0.86, { soft: 0.85 }),
    { p: [0, 0, 0] },
    tintScale(0.9),
  );

  // 牵引销孔、散热格栅与尾灯
  b.add(matDark, createCylinderGeometry(0.045, 0.045, 0.16, 12), { p: [-1.48, 0.58, 0] }, 0.5);
  b.add(matDark, createBoxGeometry(0.01, 0.24, 0.56), { p: [-1.56, 0.74, 0] });
  for (const side of [1, -1]) {
    b.add("plastic_red", createChamferedBoxGeometry(0.02, 0.07, 0.11, 0.004), {
      p: [-1.52, 0.88, side * 0.34],
    });
    b.add("plastic_amber", createChamferedBoxGeometry(0.02, 0.04, 0.06, 0.004), {
      p: [-1.52, 0.82, side * 0.34],
    });
  }

  // 3. 驾驶员操作座舱 (Cabin & Controls)
  b.add("diamond_plate", createChamferedBoxGeometry(0.48, 0.03, 0.78, 0.005), {
    p: [-0.14, 0.535, 0],
  });
  b.add("plastic_grey", createChamferedBoxGeometry(0.24, 0.38, 0.78, 0.02), {
    p: [0.18, 0.74, 0],
  });

  // 转向柱、方向盘与控制手柄
  b.add(matDark, createCylinderGeometry(0.022, 0.028, 0.46, 8), {
    p: [0.08, 0.96, 0],
    rot: [0, 0, -0.44],
  });
  b.add(
    matDark,
    createCylinderGeometry(0.18, 0.18, 0.024, 16, true),
    { p: [0.18, 1.13, 0], rot: [0, 0, -0.44] },
    0.35,
  );
  b.add(matDark, createCylinderGeometry(0.035, 0.035, 0.04, 10), {
    p: [0.18, 1.13, 0],
    rot: [0, 0, -0.44],
  });
  for (let k = 0; k < 3; k++) {
    b.add(matDark, createCylinderGeometry(0.005, 0.005, 0.14, 6), {
      p: [0.16, 0.98 + k * 0.02, 0.22 + k * 0.045],
      rot: [0, 0, -0.2],
    });
    b.add("plastic_grey", createCylinderGeometry(0.014, 0.014, 0.03, 8), {
      p: [0.18, 1.05 + k * 0.02, 0.22 + k * 0.045],
    });
  }

  // 人体工学黑色皮革减震座椅
  b.add("leather_black", createChamferedBoxGeometry(0.42, 0.09, 0.44, 0.025), {
    p: [-0.5, 0.995, 0],
  });
  b.add("leather_black", createChamferedBoxGeometry(0.09, 0.42, 0.42, 0.025), {
    p: [-0.73, 1.21, 0],
    rot: [0, 0, -0.15],
  });

  // 4. 防滚安全驾驶护顶架 (ROPS Overhead Guard Cage)
  const cageRad = 0.028;
  const cageLegs = [
    [0.18, 0.88, 0.39, 0.18, 2.06, 0.38],
    [0.18, 0.88, -0.39, 0.18, 2.06, -0.38],
    [-0.96, 0.98, 0.39, -0.96, 2.06, 0.38],
    [-0.96, 0.98, -0.39, -0.96, 2.06, -0.38],
  ];
  for (const leg of cageLegs) {
    b.bar(matDark, [leg[0], leg[1], leg[2]], [leg[3], leg[4], leg[5]], cageRad);
  }
  b.bar(matDark, [0.18, 2.06, -0.38], [0.18, 2.06, 0.38], cageRad);
  b.bar(matDark, [-0.96, 2.06, -0.38], [-0.96, 2.06, 0.38], cageRad);
  b.bar(matDark, [-0.96, 2.06, -0.38], [0.18, 2.06, -0.38], cageRad);
  b.bar(matDark, [-0.96, 2.06, 0.38], [0.18, 2.06, 0.38], cageRad);

  for (let s = 0; s < 7; s++) {
    const x = -0.84 + s * 0.145;
    b.bar(matDark, [x, 2.07, -0.36], [x, 2.07, 0.36], 0.01);
  }

  // 顶部琥珀色警示频闪旋转灯 (Amber Beacon)
  b.add("plastic_amber", createCylinderGeometry(0.045, 0.05, 0.075, 10), {
    p: [-0.96, 2.14, 0.28],
  });
  b.add(matDark, createCylinderGeometry(0.055, 0.055, 0.015, 10), { p: [-0.96, 2.09, 0.28] });

  // 5. 升降门架槽钢与货叉执行机构 (Mast, Carriage & Forks)
  const mastTilt = 0.035;
  b.push({ p: [0.65, 0, 0], r: [0, 0, -mastTilt] });

  // 外门架 (Outer Mast)
  for (const side of [1, -1]) {
    b.beam(matDark, [0, 0.08, side * 0.36], [0, 2.22, side * 0.36], 0.09, 0.075, { r: 0.005 });
  }
  b.add(matDark, createBoxGeometry(0.08, 0.08, 0.72), { p: [0, 2.18, 0] });
  b.add(matDark, createBoxGeometry(0.08, 0.08, 0.72), { p: [0, 0.45, 0] });

  // 内门架 (Inner Sliding Mast)
  for (const side of [1, -1]) {
    b.beam(
      matDark,
      [0.015, 0.14 + halfLiftY, side * 0.3],
      [0.015, 2.18 + halfLiftY, side * 0.3],
      0.075,
      0.065,
      { r: 0.004 },
    );
  }
  b.add(matDark, createBoxGeometry(0.07, 0.07, 0.6), { p: [0.015, 2.14 + halfLiftY, 0] });

  // 主液压升降油缸与双排链轮链条
  b.add(matDark, createCylinderGeometry(0.045, 0.045, 1.8, 12), { p: [-0.01, 1.05, 0] });
  b.add(
    "steel_galv",
    createCylinderGeometry(0.028, 0.028, 1.7 + halfLiftY, 10),
    { p: [-0.01, 1.05 + halfLiftY / 2, 0] },
    0.9,
  );
  for (const side of [1, -1]) {
    b.add(matDark, createCylinderGeometry(0.048, 0.048, 0.022, 12), {
      p: [0.015, 2.14 + halfLiftY, side * 0.12],
      rot: [HALF_PI, 0, 0],
    });
    b.add("steel_dark", createBoxGeometry(0.018, 1.9 + halfLiftY, 0.02), {
      p: [-0.02, 1.1 + halfLiftY / 2, side * 0.12],
    });
  }

  // 倾斜液压推力缸
  for (const side of [1, -1]) {
    b.bar(matDark, [-0.22, 0.48, side * 0.28], [-0.02, 0.62, side * 0.28], 0.038);
    b.bar("steel_galv", [-0.14, 0.54, side * 0.28], [-0.02, 0.62, side * 0.28], 0.022);
  }

  // 货叉架 (Fork Carriage)
  b.add(matDark, createBoxGeometry(0.045, 0.06, 0.92), { p: [0.08, 0.18 + forkLiftY, 0] });
  b.add(matDark, createBoxGeometry(0.045, 0.06, 0.92), { p: [0.08, 0.74 + forkLiftY, 0] });
  for (let bIdx = 0; bIdx < 6; bIdx++) {
    b.add(matDark, createBoxGeometry(0.02, 0.52, 0.03), {
      p: [0.08, 0.46 + forkLiftY, -0.38 + bIdx * 0.15],
    });
  }
  b.add(matDark, createBoxGeometry(0.025, 0.45, 0.92), { p: [0.07, 0.96 + forkLiftY, 0] });

  // 锻造高强度钢货叉 (Forged Steel Forks L-Shape)
  const forkSpread = 0.26;
  for (const side of [1, -1]) {
    const forkZ = side * forkSpread;
    b.add("steel_dark", createBoxGeometry(0.045, 0.72, 0.1), {
      p: [0.11, 0.4 + forkLiftY, forkZ],
    });
    const bladePts = [
      [0.09, 0.045],
      [1.15, 0.018],
      [1.22, 0.004],
      [1.22, 0],
      [0.09, 0],
    ];
    b.add(
      "steel_dark",
      createPrismGeometry(bladePts, 0.1, { soft: 0.9 }),
      { p: [0, forkLiftY, forkZ] },
      0.45,
    );
  }

  b.pop(); // 门架旋转矩阵出栈

  // 6. 工业标识标牌与警示贴花 (Decals & Branding)
  b.label(
    "HELI 35",
    { color: "black", font: "display", tracking: 0.02 },
    0.36,
    0.09,
    { p: [-0.64, 0.74, 0.435], r: [0, 0, 0] },
    0.9,
  );
  b.label(
    "HELI 35",
    { color: "black", font: "display", tracking: 0.02 },
    0.36,
    0.09,
    { p: [-0.64, 0.74, -0.435], r: [0, Math.PI, 0] },
    0.9,
  );
  b.label(
    fleetNum,
    { color: "black", font: "display" },
    0.14,
    0.14,
    { p: [-1.46, 0.88, 0.42], r: [0, 0.4, 0] },
    0.9,
  );

  const hazDec = getCachedDecalTexture(engineCtx, "hazard_forklift");
  b.decal(hazDec, 0.14, 0.14, { p: [0.12, 0.78, 0.432] });

  // 7. 物理碰撞包围盒 (Collision Bounds)
  const cageColliders = cageLegs.map((l) => ({
    min: [Math.min(l[0], l[3]) - 0.04, l[1], Math.min(l[2], l[5]) - 0.04],
    max: [Math.max(l[0], l[3]) + 0.04, l[4], Math.max(l[2], l[5]) + 0.04],
    surface: "metal",
  }));

  return b.finish({
    size: [3.4, 2.2 + forkLiftY, 1.25],
    colliders: [
      { min: [-1.56, 0.2, -0.45], max: [0.38, 0.96, 0.45], surface: "metal" },
      { min: [-1.56, 0.3, -0.45], max: [-1.02, 1.05, 0.45], surface: "metal" },
      { min: [-0.38, 0.45, -0.42], max: [0.26, 0.58, 0.42], surface: "metal" },
      { min: [0.56, 0, -0.42], max: [0.78, 2.04 + halfLiftY, 0.42], surface: "metal" },
      { min: [0.72, forkLiftY, -0.53], max: [0.8, forkLiftY + 1.42, 0.53], surface: "metal" },
      { min: [0.8, forkLiftY, -0.33], max: [1.7, forkLiftY + 0.1, 0.33], surface: "metal" },
      { min: [-1.02, 2, -0.5], max: [0.32, 2.1, 0.5], surface: "metal" },
      ...cageColliders,
    ],
  });
}

/**
 * 工业级静音应急柴油发电机组 (Acoustic Industrial Generator)
 */
export function buildGenerator(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "generator", options.seed || 0);
  const [matBody, tint] = resolveColorPalette(options.color, "yellow");
  const matDark = "steel_dark";

  // 重型工字钢防震底座 (Channel Steel Skid Base)
  for (const sz of [-0.42, 0.42]) {
    b.add(matDark, createChamferedBoxGeometry(2.2, 0.14, 0.1, 0.012), { p: [0, 0.07, sz] });
  }

  // 隔音静音箱体 (Acoustic Attenuation Enclosure)
  b.add(matBody, createChamferedBoxGeometry(2.0, 1.15, 0.9, 0.03), { p: [0, 0.74, 0] }, tint);

  // 顶部 4 处重型起吊吊耳 (4 Lifting Lugs)
  for (const sx of [-0.85, 0.85]) {
    for (const sz of [-0.38, 0.38]) {
      b.add(matDark, createCylinderGeometry(0.045, 0.045, 0.03, 8), {
        p: [sx, 1.34, sz],
        rot: [0, 0, HALF_PI],
      });
    }
  }

  // 进排气消音百叶与检修门 (Air Louvers & Access Doors)
  b.add(matDark, createBoxGeometry(0.02, 0.65, 0.7), { p: [1.01, 0.75, 0] });
  b.add(matDark, createBoxGeometry(0.02, 0.65, 0.7), { p: [-1.01, 0.75, 0] });

  // 顶部消音排气管 (Exhaust Silencer Pipe)
  b.add(matDark, createCylinderGeometry(0.06, 0.06, 0.35, 12), { p: [0.5, 1.5, 0] });
  b.add(matDark, createCylinderGeometry(0.08, 0.06, 0.08, 12), { p: [0.5, 1.7, 0] });

  // 紧急停机按钮与数字液晶控制面板 (Emergency Stop & LCD Controller)
  b.add("plastic_red", createCylinderGeometry(0.025, 0.025, 0.03, 8), {
    p: [-0.6, 0.95, 0.46],
    rot: [HALF_PI, 0, 0],
  });
  b.add("paint_grey", createBoxGeometry(0.35, 0.45, 0.03), { p: [-0.2, 0.85, 0.46] });

  return b.finish();
}

/**
 * 港区工业集装垃圾箱 (Industrial Steel Waste Dumpster)
 */
export function buildDumpster(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "dumpster", options.seed || 0);
  const [matBody, tint] = resolveColorPalette(options.color, "green");
  const matDark = "steel_dark";

  // 倾斜铲斗式冲压钢板箱体 (Tapered Steel Hopper Body)
  const boxGeo = createChamferedBoxGeometry(1.85, 1.15, 1.05, 0.02);
  b.add(matBody, boxGeo, { p: [0, 0.72, 0] }, tint);

  // 两侧叉车提升袋口管 (Side Forklift Lifting Pockets)
  for (const sz of [-0.55, 0.55]) {
    b.add(matDark, createBoxGeometry(1.85, 0.12, 0.06), { p: [0, 0.65, sz] });
  }

  // 顶部双开轻质翻盖 (Plastic Split Lids)
  for (const sx of [-0.46, 0.46]) {
    b.add(
      "plastic_grey",
      createChamferedBoxGeometry(0.9, 0.04, 1.1, 0.01),
      { p: [sx, 1.32, 0] },
      0.8,
    );
  }

  // 四只重载脚轮 (4 Heavy Duty Caster Wheels)
  for (const sx of [-0.75, 0.75]) {
    for (const sz of [-0.42, 0.42]) {
      b.add(matDark, createCylinderGeometry(0.06, 0.06, 0.04, 10), {
        p: [sx, 0.08, sz],
        rot: [HALF_PI, 0, 0],
      });
    }
  }

  return b.finish();
}

/**
 * 多层移动重型维修工具车 (Mobile Maintenance Drawer Toolbox Cart)
 */
export function buildToolboxCart(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "toolbox_cart", options.seed || 0);
  const [matBody, tint] = resolveColorPalette(options.color, "red");
  const matDark = "steel_dark";
  const matAlum = "aluminium";

  // 冲压钢制车体外框 (Steel Cart Outer Cabinet)
  b.add(matBody, createChamferedBoxGeometry(0.74, 0.66, 0.46, 0.012), { p: [0.04, 0.45, 0] }, tint);

  // 5 层带铝合金把手的滑动抽屉 (5 Ball-Bearing Slide Drawers)
  const drawerHeights = [0.075, 0.075, 0.1, 0.13, 0.19];
  let curY = 0.75;
  for (const dh of drawerHeights) {
    curY -= dh / 2;
    b.add(
      matBody,
      createChamferedBoxGeometry(0.68, dh - 0.01, 0.02, 0.004),
      { p: [0.04, curY, 0.235] },
      tint,
    );
    b.add(matAlum, createBoxGeometry(0.62, 0.016, 0.016), {
      p: [0.04, curY + dh / 2 - 0.02, 0.245],
    });
    curY -= dh / 2;
  }

  // 顶层防油橡胶工作台垫 (Top Rubber Mat)
  b.add("rubber", createBoxGeometry(0.7, 0.01, 0.42), { p: [0.04, 0.785, 0] });

  // 侧边坚固推手把 (Side Tubular Grab Handle)
  b.tube(
    matAlum,
    [
      [-0.35, 0.72, -0.17],
      [-0.43, 0.72, -0.17],
      [-0.43, 0.72, 0.17],
      [-0.35, 0.72, 0.17],
    ],
    0.014,
  );

  // 4 个工业旋转脚轮 (4 Swivel Casters)
  for (const sx of [-0.28, 0.36]) {
    for (const sz of [-0.17, 0.17]) {
      b.add(matDark, createCylinderGeometry(0.05, 0.05, 0.03, 10), {
        p: [sx, 0.06, sz],
        rot: [HALF_PI, 0, 0],
      });
    }
  }

  return b.finish();
}

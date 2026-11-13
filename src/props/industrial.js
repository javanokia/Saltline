import * as THREE from "three";
import { createBoxGeometry, createCylinderGeometry, createTubeFromPoints } from "../geo.js";
import {
  PI,
  HALF_PI,
  clamp,
  PropCompoundBuilder,
  getCachedDecalTexture,
  createChamferedBoxGeometry,
  createBoxBetweenPoints,
  createPrismGeometry,
  normalizePolygonWinding,
  createSubdividedBoxGeometry,
  createConnectingCylinder,
  createRevolvedGeometry,
  generateBarrelProfilePoints,
  generateTireTreadProfile,
  applyVertexColorLuminance,
  recomputeNormalsAndBounds,
  resolveColorPalette,
  composeTransformMatrix4,
  traverseAndMutateVertices,
  sampleSimplexNoise3D,
} from "./builder.js";

function buildVehicleWheel(
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

// ============================================================================
// 九、 仓储物流与货物道具构建器 (Logistics & Cargo Builders)
// ============================================================================

/**
 * 200L 工业标准油桶 (Industrial 200L Steel Drum / Barrel)
 */
function buildBarrel(engineCtx, options = {}, variant = 0) {
  const b = new PropCompoundBuilder(engineCtx, "barrel", variant);
  const prng = b.rng;
  const [matName, tintFactor] = resolveColorPalette(options.color, "blue");

  if (options.lying) {
    b.push({ p: [-0.45, 0.297, 0], r: [0, 0, -HALF_PI] });
  }

  const barrelGeo = createRevolvedGeometry(generateBarrelProfilePoints(!!options.open), 22);
  b.add(matName, barrelGeo, null, tintFactor);

  // 桶身注料螺纹盖与透气盖 (Bung Hole Plugs)
  if (!options.open) {
    b.add("steel_dark", createCylinderGeometry(0.035, 0.035, 0.01, 10), { p: [0.18, 0.89, 0] });
    b.add("steel_dark", createCylinderGeometry(0.022, 0.022, 0.01, 10), { p: [-0.18, 0.89, 0] });
  }

  // 危险化学品警示贴标 (Hazard GHS Decal)
  const hazardDec = getCachedDecalTexture(engineCtx, options.hazard || "hazard_flammable");
  b.cdecal(hazardDec, 0.25, 0.25, { p: [0, 0.45, 0.298] }, 0.25);

  if (options.lying) b.pop();
  return b.finish();
}

/**
 * EUR 欧标木托盘构建核心 (Wooden Pallet Geometry Builder)
 */
function buildPalletGeometry(builder, prng, { broken = false, bevel = true } = {}) {
  const boxFn = (w, h, d, p) =>
    builder.add(
      "wood_pallet",
      bevel ? createChamferedBoxGeometry(w, h, d, 0.004) : createBoxGeometry(w, h, d),
      {
        p,
      },
    );

  // 顶层 5 块木板条 (5 Top Deckboards)
  const topZs = [-0.45, -0.22, 0, 0.22, 0.45];
  for (let i = 0; i < topZs.length; i++) {
    if (broken && i === 1 && prng() < 0.5) continue;
    boxFn(1.2, 0.022, 0.14, [0, 0.133, topZs[i]]);
  }

  // 3 根纵向贯穿支承梁条 (3 Stringer Boards)
  for (const sx of [-0.5, 0, 0.5]) {
    boxFn(0.12, 0.022, 1.0, [sx, 0.105, 0]);
  }

  // 9 个硬木支承垫块 (9 Solid Wooden Blocks)
  for (const sx of [-0.5, 0, 0.5]) {
    for (const sz of [-0.42, 0, 0.42]) {
      boxFn(0.14, 0.078, 0.14, [sx, 0.055, sz]);
    }
  }

  // 底层 3 块底板 (3 Bottom Deckboards)
  for (const sx of [-0.5, 0, 0.5]) {
    boxFn(0.14, 0.022, 1.0, [sx, 0.011, 0]);
  }
}

/**
 * 欧标木托盘 (EUR Wooden Pallet)
 */
function buildPallet(engineCtx, options = {}, variant = 0) {
  const b = new PropCompoundBuilder(engineCtx, "pallet", variant);
  buildPalletGeometry(b, b.rng, { broken: !!options.broken, bevel: true });
  return b.finish();
}

/**
 * 堆叠木托盘垛 (Stacked Pallets)
 */
function buildPalletStack(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "pallet_stack", options.seed || 0);
  const prng = b.rng;
  const count = clamp(options.count | 0 || 8, 1, 12);

  for (let i = 0; i < count; i++) {
    const isTop = i === count - 1;
    b.push({
      p: [i ? prng.range(-0.028, 0.028) : 0, i * 0.144, i ? prng.range(-0.022, 0.022) : 0],
      r: [
        0,
        prng.range(-0.035, 0.035) + (prng() < 0.3 ? PI : 0) + (isTop ? prng.range(-0.06, 0.06) : 0),
      ],
    });
    buildPalletGeometry(b, prng, { broken: false, bevel: false });
    b.pop();
  }
  return b.finish({ size: [1.2, count * 0.144, 1.0] });
}

/**
 * 木质包装箱几何生成核心 (Wooden Crate Generator)
 */
function buildWoodCrateGeometry(
  builder,
  w,
  h,
  d,
  { detail = true, label = "FRAGILE", code = "B4-117", skids = true } = {},
) {
  const prng = builder.rng;
  const skidH = skids ? 0.07 : 0;
  const boxH = h - skidH;
  const boxCenterY = skidH + boxH / 2;

  // 主箱体 (Main Crate Body)
  builder.add(
    "wood_pallet",
    detail ? createChamferedBoxGeometry(w, boxH, d, 0.004) : createBoxGeometry(w, boxH, d),
    { p: [0, boxCenterY, 0] },
    prng.range(0.85, 1.0),
  );

  // 底部托板木梁 (Bottom Skids)
  if (skids) {
    for (const sx of [-w / 2 + 0.07, 0, w / 2 - 0.07]) {
      builder.add("wood_dark", createBoxGeometry(0.08, skidH, d), { p: [sx, skidH / 2, 0] }, 0.8);
    }
  }

  // 侧边木框条与斜向交叉加固撑 (Frame Cleats & Diagonal Braces)
  if (detail) {
    for (const sz of [-d / 2, d / 2]) {
      builder.add("wood_dark", createBoxGeometry(w, 0.07, 0.015), { p: [0, skidH + 0.035, sz] });
      builder.add("wood_dark", createBoxGeometry(w, 0.07, 0.015), { p: [0, h - 0.035, sz] });
      for (const sx of [-w / 2 + 0.035, w / 2 - 0.035]) {
        builder.add("wood_dark", createBoxGeometry(0.07, boxH, 0.015), { p: [sx, boxCenterY, sz] });
      }
    }
  }

  // 唛头、条形码与警示喷涂印章 (Stencil Labels)
  if (label) {
    builder.label(label, { color: "black", font: "stencil", distress: 0.35 }, 0.45, 0.14, {
      p: [0, boxCenterY + 0.1, d / 2 + 0.002],
    });
  }
  if (code) {
    builder.label(code, { color: "black", font: "stencil", distress: 0.35 }, 0.35, 0.09, {
      p: [0, boxCenterY - 0.1, d / 2 + 0.002],
    });
  }
}

/**
 * 欧标木质货箱 (Wooden Crate)
 */
function buildCrateWood(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "crate_wood", options.seed || 0);
  const labels = ["FRAGILE", "THIS SIDE UP", "KEEP DRY", "MACHINE PARTS"];
  buildWoodCrateGeometry(b, 1.1, 1.0, 0.9, {
    label: options.label === undefined ? labels[b.seed % labels.length] : options.label,
    code: options.code || "B4-" + [117, 204, 318][b.seed % 3],
  });
  return b.finish();
}

/**
 * 堆叠木质货箱垛 (Stacked Crates)
 */
function buildCrateStack(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "crate_stack", options.seed || 0);
  const prng = b.rng;
  // 底层大货箱
  buildWoodCrateGeometry(b, 1.2, 0.95, 1.0, { label: "HEAVY", code: "SLT 04" + (b.seed % 2) });
  // 上层错落中货箱
  b.push({
    p: [prng.range(-0.1, 0.02), 0.95, prng.range(-0.05, 0.05)],
    r: [0, (prng() < 0.5 ? -1 : 1) * prng.range(0.1, 0.16), 0],
  });
  buildWoodCrateGeometry(b, 0.86, 0.82, 0.72, { label: "FRAGILE", code: "B4-204" });
  b.pop();
  return b.finish({ size: [1.2, 1.9, 1.0] });
}

/**
 * 1000L IBC 液体中型散装容器 (1000L Chemical IBC Tote)
 */
function buildIbcTote(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "ibc_tote", options.seed || 0);
  const prng = b.rng;

  // 镀锌钢板底座托盘 (Galvanized Steel Pallet Base)
  b.add("steel_galv", createBoxGeometry(1.2, 0.028, 1.0), { p: [0, 0.014, 0] });
  for (const sx of [-0.54, 0, 0.54]) {
    for (const sz of [-0.44, 0, 0.44]) {
      b.add("steel_galv", createChamferedBoxGeometry(0.12, 0.074, 0.1, 0.005), {
        p: [sx, 0.065, sz],
      });
    }
  }

  // 吹塑半透明聚乙烯高密度内胆 (HDPE Plastic Tank Liner)
  const tankGeo = createChamferedBoxGeometry(1.12, 0.95, 0.92, 0.06);
  b.add("plastic_grey", tankGeo, { p: [0, 0.58, 0] }, prng.range(0.85, 0.95));

  // 外层镀锌网状金属钢管笼 (Galvanized Steel Tubular Cage)
  const cageH = 1.04;
  for (const sx of [-0.58, 0.58]) {
    for (const sz of [-0.48, 0.48]) {
      b.add("steel_galv", createConnectingCylinder([sx, 0.11, sz], [sx, cageH, sz], 0.012, 6));
    }
  }
  for (let y = 0.25; y < cageH; y += 0.2) {
    b.add("steel_galv", createConnectingCylinder([-0.58, y, -0.48], [0.58, y, -0.48], 0.01, 6));
    b.add("steel_galv", createConnectingCylinder([-0.58, y, 0.48], [0.58, y, 0.48], 0.01, 6));
    b.add("steel_galv", createConnectingCylinder([-0.58, y, -0.48], [-0.58, y, 0.48], 0.01, 6));
    b.add("steel_galv", createConnectingCylinder([0.58, y, -0.48], [0.58, y, 0.48], 0.01, 6));
  }

  // 顶部 150mm 加料口盖与底部 50mm 放料球阀 (Top Lid & Bottom Ball Valve)
  b.add("plastic_red", createCylinderGeometry(0.08, 0.08, 0.04, 12), { p: [0, 1.08, 0] });
  b.add("steel_dark", createCylinderGeometry(0.035, 0.035, 0.06, 8), {
    p: [0, 0.16, 0.49],
    rot: [HALF_PI, 0, 0],
  });

  return b.finish();
}

/**
 * 大型工业木质电缆盘 (Large Industrial Wooden Cable Reel)
 */
function buildCableReel(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "cable_reel", options.seed || 0);
  const prng = b.rng;
  const radius = 0.65;
  const width = 0.8;
  const flangeThick = 0.045;

  // 两侧圆形法兰木护盘 (Twin Wooden Circular Flanges)
  for (const sz of [-width / 2 + flangeThick / 2, width / 2 - flangeThick / 2]) {
    b.add(
      "wood_dark",
      createCylinderGeometry(radius, radius, flangeThick, 20),
      { p: [0, radius, sz], rot: [HALF_PI, 0, 0] },
      prng.range(0.8, 1.0),
    );
  }

  // 中间圆柱形电缆卷筒 (Core Cylinder)
  const coreRadius = 0.32;
  b.add(
    "wood_pallet",
    createCylinderGeometry(coreRadius, coreRadius, width - 2 * flangeThick, 16),
    {
      p: [0, radius, 0],
      rot: [HALF_PI, 0, 0],
    },
  );

  // 缠绕黑色橡胶护套特种高压电缆 (Coiled High-Voltage Rubber Cable)
  const cableRadius = 0.54;
  b.add(
    "rubber",
    createCylinderGeometry(cableRadius, cableRadius, width - 2 * flangeThick - 0.02, 18),
    { p: [0, radius, 0], rot: [HALF_PI, 0, 0] },
    0.7,
  );

  return b.finish({ size: [radius * 2, radius * 2, width] });
}

/**
 * 重型工程卡车轮胎垛 (Stacked Tires)
 */
function buildTireStack(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "tire_stack", options.seed || 0);
  const prng = b.rng;
  const count = clamp(options.count | 0 || 4, 1, 5);
  const tireRadius = 0.4;
  const tireWidth = 0.25;

  for (let i = 0; i < count; i++) {
    const tireGeo = generateTireTreadProfile(tireWidth, tireRadius, 0.22, 16);
    b.push({
      p: [
        i ? prng.range(-0.03, 0.03) : 0,
        i * tireWidth + tireWidth / 2,
        i ? prng.range(-0.03, 0.03) : 0,
      ],
      r: [HALF_PI, 0, prng() * 6],
    });
    b.add("tire", tireGeo, null, 0.85);
    b.pop();
  }

  return b.finish({ size: [tireRadius * 2, count * tireWidth, tireRadius * 2] });
}

/**
 * 20L 军工便携油桶 (20-Liter Military Jerry Can)
 */
function buildJerryCan(engineCtx, options = {}, variant = 0) {
  const b = new PropCompoundBuilder(engineCtx, "jerry_can", variant);
  const [matName, tint] = resolveColorPalette(options.color, "olive");

  // 压铸冲压主体与加强筋凹坑 (Main Body with Stamped Stiffeners)
  const canGeo = createChamferedBoxGeometry(0.336, 0.36, 0.156, 0.022);
  b.add(matName, canGeo, { p: [0, 0.18, 0] }, tint);

  // 经典三联式便携提把 (Classic 3-Bar Handle)
  for (const sz of [-0.038, 0, 0.038]) {
    b.add(
      matName,
      createConnectingCylinder([-0.11, 0.39, sz], [0.08, 0.39, sz], 0.012, 6),
      null,
      tint,
    );
  }

  // 铰链式金属注油密封盖 (Cam-lock Pouring Spout Cap)
  b.add("steel_dark", createCylinderGeometry(0.022, 0.022, 0.04, 10), {
    p: [0.12, 0.39, 0],
    rot: [0, 0, -0.4],
  });

  return b.finish();
}

/**
 * 反光交通安全锥 (Reflective Traffic Cone)
 */
function buildTrafficCone(engineCtx, options = {}, variant = 0) {
  const b = new PropCompoundBuilder(engineCtx, "traffic_cone", variant);
  const prng = b.rng;

  if (options.lying) {
    b.push({ p: [-0.34, 0.18, 0], r: [0, prng() * 6, -HALF_PI + 0.16] });
  }

  // 黑色方型橡胶加重底座 (Square Heavy Rubber Base)
  b.add("rubber", createChamferedBoxGeometry(0.36, 0.03, 0.36, 0.008), { p: [0, 0.015, 0] });

  // 橙红色锥体 (Orange Body)
  b.add("plastic_red", createCylinderGeometry(0.031, 0.128, 0.67, 14, false, "bottom"), {
    p: [0, 0.03, 0],
  });

  // 白色高反光微棱镜反光套 (White Reflective Collars)
  b.add("paint_white", createCylinderGeometry(0.068, 0.088, 0.14, 14, false, "bottom"), {
    p: [0, 0.32, 0],
  });

  if (options.lying) b.pop();
  return b.finish();
}

/**
 * 高压工业压缩气体钢瓶组 (Compressed Gas Cylinder Rack)
 */
function buildGasCylinders(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "gas_cylinders", options.seed || 0);

  // 花纹防滑钢板底座与防护笼架 (Steel Base Skid & Protective Frame)
  b.add("diamond_plate", createChamferedBoxGeometry(0.9, 0.016, 0.5, 0.004), { p: [0, 0.008, 0] });
  for (const sx of [-0.43, 0.43]) {
    b.add("steel_dark", createChamferedBoxGeometry(0.04, 1.14, 0.04, 0.005), {
      p: [sx, 0.585, -0.225],
    });
    b.add("steel_dark", createChamferedBoxGeometry(0.04, 1.14, 0.04, 0.005), {
      p: [sx, 0.585, 0.225],
    });
  }
  b.add("steel_dark", createBoxGeometry(0.9, 0.03, 0.03), { p: [0, 1.14, -0.225] });
  b.add("steel_dark", createBoxGeometry(0.9, 0.03, 0.03), { p: [0, 1.14, 0.225] });

  // 4 具高压钢瓶 (4 High-Pressure Steel Cylinders: O2, N2, Acetylene)
  const cylColors = ["paint_teal", "paint_grey", "paint_orange", "paint_blue"];
  const xs = [-0.3, -0.1, 0.1, 0.3];
  for (let i = 0; i < 4; i++) {
    const cx = xs[i];
    // 瓶身
    b.add(cylColors[i % cylColors.length], createCylinderGeometry(0.1, 0.1, 1.25, 14), {
      p: [cx, 0.65, 0],
    });
    // 顶部球冠半球
    b.add(
      cylColors[i % cylColors.length],
      new THREE.SphereGeometry(0.1, 12, 8, 0, PI * 2, 0, HALF_PI),
      { p: [cx, 1.275, 0] },
    );
    // 减压阀与防护铜盖 (Brass Pressure Regulator & Protective Cap)
    b.add("brass", createCylinderGeometry(0.035, 0.035, 0.08, 8), { p: [cx, 1.36, 0] });
  }

  return b.finish();
}

/**
 * 工业无缝钢管堆垛 (Seamless Steel Pipe Stack)
 */
function buildPipeStack(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "pipe_stack", options.seed || 0);
  const prng = b.rng;
  const radius = 0.1365;
  const pipeLen = 6.0;

  // 3 根底部枕木垫木 (3 Bottom Wooden Dunnage Blocks)
  for (const sx of [-2.2, 0, 2.2]) {
    b.add("wood_dark", createChamferedBoxGeometry(0.11, 0.08, 1.2, 0.008), { p: [sx, 0.04, 0] });
  }

  // 金字塔型多层钢管堆叠 (Pyramid Pipe Stacking: 4-3-2)
  const layers = [
    { count: 4, y: 0.08 + radius, zStart: -0.42 },
    { count: 3, y: 0.08 + radius + radius * Math.sqrt(3), zStart: -0.28 },
    { count: 2, y: 0.08 + radius + radius * Math.sqrt(3) * 2, zStart: -0.14 },
  ];

  for (const lyr of layers) {
    for (let i = 0; i < lyr.count; i++) {
      const cz = lyr.zStart + i * (radius * 2);
      const pipeGeo = createCylinderGeometry(radius, radius, pipeLen, 16, true);
      b.add(
        "steel_rust",
        pipeGeo,
        { p: [0, lyr.y, cz], rot: [0, 0, HALF_PI] },
        prng.range(0.8, 1.0),
      );
      // 内部内壁暗色
      b.add(
        "steel_dark",
        createCylinderGeometry(radius - 0.015, radius - 0.015, pipeLen - 0.01, 14, true),
        { p: [0, lyr.y, cz], rot: [0, 0, HALF_PI] },
        0.5,
      );
    }
  }

  return b.finish({ size: [pipeLen, 0.9, 1.2] });
}

/**
 * 防雨帆布苫盖货物堆 (Draped Cargo Tarp)
 */
function buildTarpCargo(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "tarp_cargo", options.seed || 0);
  const prng = b.rng;

  // 内部垫底木托盘
  b.add("wood_pallet", createBoxGeometry(2.2, 0.14, 1.2), { p: [0, 0.07, 0] });

  // 物理垂坠帆布外曲面 (Organic Wrinkled Draped Canvas Surface)
  const tarpGeo = createChamferedBoxGeometry(2.35, 1.35, 1.35, 0.15);
  traverseAndMutateVertices(tarpGeo, (v) => {
    if (v.y > 0.1) {
      const n = sampleSimplexNoise3D(v.x * 3.5, v.y * 3.5, v.z * 3.5);
      v.x += n * 0.04;
      v.z += n * 0.04;
      v.y += (sampleSimplexNoise3D(v.x * 5, v.z * 5, 0) - 0.5) * 0.05;
    }
  });
  recomputeNormalsAndBounds(tarpGeo);

  b.add("tarp", tarpGeo, { p: [0, 0.78, 0] }, prng.range(0.85, 1.0));

  // 捆绑拉紧防风绳索 (Fastening Cargo Tie-down Ropes)
  for (const sx of [-0.8, -0.2, 0.4, 0.9]) {
    b.tube(
      "polymer_tan",
      [
        [sx, 0.1, -0.68],
        [sx, 1.45, -0.68],
        [sx, 1.48, 0.68],
        [sx, 0.1, 0.68],
      ],
      0.008,
    );
  }

  return b.finish();
}

/**
 * 沙袋防御掩体工事 (Sandbag Defensive Bunker Wall)
 */
function buildSandbags(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "sandbags", options.seed || 0);
  const prng = b.rng;
  const courses = clamp(options.courses | 0 || 5, 1, 7);

  const bagW = 0.58;
  const bagH = 0.16;
  const bagD = 0.32;

  for (let c = 0; c < courses; c++) {
    const y = c * (bagH * 0.88) + bagH / 2;
    const isOdd = c % 2 === 1;
    const count = isOdd ? 4 : 5;
    const xStart = isOdd ? -0.85 : -1.05;

    for (let i = 0; i < count; i++) {
      const x = xStart + i * (bagW * 0.92) + prng.range(-0.015, 0.015);
      const bagGeo = createChamferedBoxGeometry(bagW, bagH, bagD, 0.045);
      traverseAndMutateVertices(bagGeo, (v) => {
        const deform = (sampleSimplexNoise3D(v.x * 8, v.y * 8, v.z * 8) - 0.5) * 0.03;
        v.y += deform;
        v.x += deform * 0.5;
      });
      recomputeNormalsAndBounds(bagGeo);
      b.add(
        "tarp",
        bagGeo,
        { p: [x, y, prng.range(-0.02, 0.02)], r: [0, prng.range(-0.08, 0.08), 0] },
        prng.range(0.78, 0.96),
      );
    }
  }

  return b.finish({ size: [2.0, courses * 0.14 + 0.05, 0.6] });
}

/**
 * 瓦楞纸箱堆垛 (Cardboard Box Stack)
 */
function buildCardboardBoxes(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "cardboard_boxes", options.seed || 0);
  const prng = b.rng;

  const addBox = (bw, bh, bd, px, py, pz, ry = 0) => {
    const boxGeo = createChamferedBoxGeometry(bw, bh, bd, 0.006);
    b.add("cardboard", boxGeo, { p: [px, py + bh / 2, pz], r: [0, ry, 0] }, prng.range(0.85, 1.0));
    // 封箱牛皮胶带 (Packing Tape)
    b.add(
      "polymer_tan",
      createBoxGeometry(bw + 0.002, 0.05, bd + 0.002),
      { p: [px, py + bh / 2, pz], r: [0, ry, 0] },
      0.9,
    );
  };

  // 底层 2 盒
  addBox(0.48, 0.38, 0.44, -0.22, 0, -0.16, 0.05);
  addBox(0.44, 0.36, 0.42, 0.24, 0, 0.12, -0.08);
  // 上层错落叠放
  addBox(0.4, 0.34, 0.38, 0.02, 0.38, 0.02, 0.15);

  return b.finish();
}

// ============================================================================
// 十、 重型工业机械与特种车辆 (Heavy Machinery & Special Vehicles)
// ============================================================================

/**
 * 3.5吨柴油电动平衡重叉车 (3.5T Counterbalanced Industrial Forklift)
 */
/**
 * 高精重型工业内燃叉车 (Heavy Industrial Counterbalanced Forklift)
 */
// Deconstructed oR:
function buildForklift(engineCtx, options = {}) {
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

  b.add("diamond_plate", createBoxGeometry(0.66, 0.016, 0.68), { p: [0.2, 0.548, 0] }, 0.6);
  for (const pedZ of [-0.12, 0.1]) {
    b.add(
      "rubber",
      createChamferedBoxGeometry(0.1, 0.02, 0.07, 0.006),
      { p: [0.33, 0.6, pedZ], r: [0, 0, 0.5] },
      0.8,
    );
  }

  const cwBox = createSubdividedBoxGeometry(0.62, 0.63, 1.12, 0.12, 3, 3, 3);
  traverseAndMutateVertices(cwBox, (v) => {
    if (v.y > 0.1) {
      const fac = (v.y - 0.1) / 0.215;
      v.x += 0.03 * fac * (v.x < 0 ? 1 : 0);
    }
  });
  b.add(matBody, recomputeNormalsAndBounds(cwBox), { p: [-1.39, 0.915, 0] }, tintScale(0.97));
  b.add(
    matBody,
    createChamferedBoxGeometry(0.56, 0.37, 0.64, 0.05),
    { p: [-1.4, 0.43, 0] },
    tintScale(0.85),
  );
  b.add(
    "hazard_stripes",
    createChamferedBoxGeometry(0.014, 0.085, 0.84, 0.004),
    { p: [-1.702, 0.77, 0] },
    0.95,
  );
  b.label(fleetNum, { color: "black", font: "stencil", distress: 0.35 }, 0.4, 0.2, {
    p: [-1.703, 0.96, 0],
    r: [0, -HALF_PI, 0],
  });

  for (const side of [1, -1]) {
    b.add(
      engineCtx.mats.emissive(0xff2212, 0.16),
      createChamferedBoxGeometry(0.012, 0.05, 0.11, 0.004),
      { p: [-1.69, 1.1, side * 0.37] },
      1,
      { raw: true },
    );
    b.add(
      matDark,
      createChamferedBoxGeometry(0.016, 0.066, 0.126, 0.004),
      { p: [-1.684, 1.1, side * 0.37] },
      0.4,
    );
    b.label("几猫", { color: "black", font: "sans", distress: 0.3 }, 0.42, 0.085, {
      p: [-1.39, 0.99, side * 0.5625],
      r: [0, side > 0 ? 0 : Math.PI, 0],
    });
    b.add(
      matDark,
      createChamferedBoxGeometry(0.06, 0.05, 0.02, 0.004),
      { p: [-1.67, 0.44, side * 0.05] },
      0.5,
    );
  }
  b.add("steel_worn", createCylinderGeometry(0.02, 0.02, 0.13, 8), { p: [-1.68, 0.44, 0] }, 0.7);
  b.add(
    matBody,
    createChamferedBoxGeometry(0.98, 0.46, 0.94, 0.04),
    { p: [-0.59, 0.79, 0] },
    tintScale(),
  );

  for (const side of [1, -1]) {
    b.label(fleetNum, { color: "black", font: "stencil", distress: 0.35 }, 0.3, 0.19, {
      p: [-0.84, 0.8, side * 0.4715],
      r: [0, side > 0 ? 0 : Math.PI, 0],
    });
    b.add(matDark, createBoxGeometry(0.34, 0.2, 0.004), { p: [-0.36, 0.8, side * 0.47] }, 0.2);
    for (let sl = 0; sl < 5; sl++) {
      b.add(
        matBody,
        createBoxGeometry(0.34, 0.03, 0.006),
        { p: [-0.36, 0.72 + sl * 0.04, side * 0.474], r: [side * 0.5, 0, 0] },
        tintScale(0.85),
      );
    }
  }

  b.add(matDark, createChamferedBoxGeometry(0.4, 0.05, 0.4, 0.01), { p: [-0.54, 1.045, 0] }, 0.5);

  const seatBase = createSubdividedBoxGeometry(0.46, 0.1, 0.46, 0.04, 3, 3, 3);
  traverseAndMutateVertices(seatBase, (v) => {
    if (v.y > 0) v.y -= 0.018 * Math.cos(v.x * 5) * Math.cos(v.z * 5);
  });
  b.add("rubber", recomputeNormalsAndBounds(seatBase), { p: [-0.53, 1.115, 0] }, 1);

  const seatBack = createSubdividedBoxGeometry(0.1, 0.5, 0.44, 0.04, 3, 4, 3);
  traverseAndMutateVertices(seatBack, (v) => {
    if (v.x > 0) v.x -= 0.02 * Math.cos(v.z * 5.5);
  });
  b.add("rubber", recomputeNormalsAndBounds(seatBack), { p: [-0.8, 1.39, 0], r: [0, 0, 0.16] }, 1);

  for (const side of [1, -1]) {
    b.add(
      matDark,
      createBoxBetweenPoints(
        [-0.78, 1.08, side * 0.24],
        [-0.82, 1.3, side * 0.24],
        0.03,
        0.012,
        0.004,
      ),
      null,
      0.5,
    );
  }

  b.add(
    matBody,
    createPrismGeometry(
      [
        [0.2, 0.55],
        [0.54, 0.55],
        [0.54, 1],
        [0.46, 1.12],
        [0.3, 1.14],
        [0.21, 1.02],
      ],
      0.7,
      { soft: 0.5 },
    ),
    null,
    tintScale(),
  );

  const dashAngle = Math.atan2(0.12, 0.09);
  b.push({ p: [0.253, 1.082, 0], r: [0, 0, dashAngle] });
  b.add(matDark, createChamferedBoxGeometry(0.012, 0.13, 0.44, 0.004), { p: [-0.006, 0, 0] }, 0.45);
  b.add(
    engineCtx.mats.emissive(0x8fe2f0, 0.3),
    new THREE.PlaneGeometry(0.09, 0.05),
    { p: [-0.0135, 0.01, 0.1], r: [0, -HALF_PI, 0] },
    1,
    { raw: true, cast: false },
  );
  b.decal(engineCtx.mats.decal("csc_plate"), 0.09, { p: [-0.0135, 0, -0.12], r: [0, -HALF_PI, 0] });
  b.add(
    "plastic_red",
    createCylinderGeometry(0.016, 0.016, 0.02, 8),
    { p: [-0.02, 0, 0.19], r: [0, 0, HALF_PI] },
    0.9,
  );
  b.add(
    "steel_bare",
    createCylinderGeometry(0.009, 0.009, 0.02, 6),
    { p: [-0.018, -0.03, -0.01], r: [0, 0, HALF_PI] },
    0.9,
  );
  b.pop();

  const strBase = [0.3, 1.1, 0.04];
  const strTop = [0.1, 1.31, 0.04];
  b.add(matDark, createConnectingCylinder(strBase, strTop, 0.024, 8), null, 0.5);
  b.push({ p: strTop, r: [0, 0, Math.atan2(strTop[1] - strBase[1], strTop[0] - strBase[0])] });
  b.add("rubber", new THREE.TorusGeometry(0.165, 0.014, 6, 18), { r: [0, HALF_PI, 0] }, 1);
  for (let sp = 0; sp < 3; sp++) {
    const spAng = (sp * Math.PI * 2) / 3 + 0.5;
    b.add(
      matDark,
      createConnectingCylinder(
        [-0.01, 0, 0],
        [0, Math.cos(spAng) * 0.16, Math.sin(spAng) * 0.16],
        0.009,
        5,
      ),
      null,
      0.5,
    );
  }
  b.add(
    matDark,
    createCylinderGeometry(0.035, 0.04, 0.03, 10),
    { p: [-0.005, 0, 0], r: [0, 0, HALF_PI] },
    0.5,
  );
  b.add(
    "rubber",
    createCylinderGeometry(0.016, 0.014, 0.045, 8),
    { p: [0.03, 0.16, 0.02], r: [0, 0, HALF_PI] },
    1,
  );
  b.pop();

  for (let lv = 0; lv < 3; lv++) {
    const lvZ = -0.2 - lv * 0.055;
    const p1 = [0.33, 1.12, lvZ];
    const p2 = [0.25 - lv * 0.012, 1.3 - lv * 0.01, lvZ - 0.01];
    b.add("steel_bare", createConnectingCylinder(p1, p2, 0.007, 5), null, 0.8);
    b.add("rubber", new THREE.SphereGeometry(0.02, 7, 5), { p: p2 }, 1);
  }
  {
    const hb1 = [0.3, 1.1, 0.27];
    const hb2 = [0.2, 1.24, 0.29];
    b.add("steel_bare", createConnectingCylinder(hb1, hb2, 0.008, 5), null, 0.8);
    b.add(
      "plastic_red",
      createCylinderGeometry(0.016, 0.016, 0.07, 7),
      { p: hb2, r: [0, 0, 0.6] },
      0.9,
    );
  }

  const cageTopY = 2.045;
  const cageColliders = [];
  for (const side of [1, -1]) {
    const pFrontLow = [0.47, 1.08, side * 0.4];
    const pFrontHigh = [0.27, cageTopY, side * 0.46];
    const pRearLow = [-1, 1, side * 0.44];
    const pRearHigh = [-0.95, cageTopY, side * 0.46];
    b.add(
      matDark,
      createBoxBetweenPoints(pFrontLow, pFrontHigh, 0.06, 0.05, 0.01),
      null,
      getLuminance(),
    );
    b.add(
      matDark,
      createBoxBetweenPoints(pRearLow, pRearHigh, 0.06, 0.05, 0.01),
      null,
      getLuminance(),
    );
    b.add(
      matDark,
      createBoxBetweenPoints(
        [0.3, cageTopY, side * 0.46],
        [-0.98, cageTopY, side * 0.46],
        0.05,
        0.06,
        0.01,
      ),
      null,
      getLuminance(),
    );
    b.add(
      matDark,
      createChamferedBoxGeometry(0.09, 0.012, 0.08, 0.003),
      { p: [0.47, 1.085, side * 0.4] },
      0.5,
    );
    b.add(
      matDark,
      createChamferedBoxGeometry(0.09, 0.012, 0.08, 0.003),
      { p: [-1, 1.024, side * 0.44] },
      0.5,
    );

    const hlX = 0.36;
    const hlY = 1.66;
    b.add(
      matDark,
      createSubdividedBoxGeometry(0.085, 0.1, 0.13, 0.02, 3, 3, 3),
      { p: [hlX + 0.045, hlY, side * 0.47] },
      0.45,
    );
    b.add(
      engineCtx.mats.emissive(0xffef52, 0.7),
      createChamferedBoxGeometry(0.006, 0.075, 0.105, 0.002),
      { p: [hlX + 0.089, hlY, side * 0.47] },
      1,
      { raw: true },
    );
    b.add(
      matDark,
      createConnectingCylinder([0.385, 1.5, side * 0.42], [0.42, 1.52, side * 0.57], 0.008, 5),
      null,
      0.5,
    );
    b.add(
      matDark,
      createChamferedBoxGeometry(0.022, 0.17, 0.1, 0.006),
      { p: [0.42, 1.52, side * 0.573], r: [0, side * 0.25, 0] },
      0.5,
    );
    b.add(
      "steel_bare",
      createBoxGeometry(0.002, 0.15, 0.084),
      { p: [0.408, 1.52, side * 0.57], r: [0, side * 0.25, 0] },
      1,
    );

    cageColliders.push(
      {
        min: [-1.03, 1, side > 0 ? 0.41 : -0.5],
        max: [-0.92, cageTopY, side > 0 ? 0.5 : -0.41],
        surface: "metal",
      },
      {
        min: [0.24, 1.08, side > 0 ? 0.37 : -0.5],
        max: [0.5, cageTopY, side > 0 ? 0.5 : -0.37],
        surface: "metal",
      },
    );
  }

  for (const crossX of [0.28, -0.96]) {
    b.add(
      matDark,
      createChamferedBoxGeometry(0.05, 0.06, 0.92, 0.01),
      { p: [crossX, cageTopY, 0] },
      getLuminance(),
    );
  }
  for (let gr = 0; gr < 8; gr++) {
    b.add(
      matDark,
      createChamferedBoxGeometry(0.03, 0.028, 0.9, 0.006),
      { p: [-0.83 + gr * 0.139, cageTopY + 0.012, 0] },
      getLuminance(),
    );
  }

  b.add(
    matDark,
    createTubeFromPoints(
      [
        [0.44, 1.2, 0.44],
        [0.47, 1.25, 0.49],
        [0.41, 1.55, 0.5],
        [0.36, 1.6, 0.455],
      ],
      0.011,
      5,
      false,
      0.5,
    ),
    null,
    0.5,
  );
  b.add(
    matDark,
    createCylinderGeometry(0.045, 0.05, 0.03, 10),
    { p: [-0.86, cageTopY + 0.045, 0.3] },
    0.5,
  );
  b.add(
    engineCtx.mats.emissive(0xff8812, 0.9),
    createRevolvedGeometry(
      [
        [0.04, 0],
        [0.04, 0.06],
        [0.03, 0.082],
        [0, 0.09],
      ],
      10,
    ),
    { p: [-0.86, cageTopY + 0.06, 0.3] },
    1,
    { raw: true },
  );

  const lpgX = -1.4;
  const lpgY = 1.23 + 0.05 + 0.155; // 1.435
  for (const lpgZ of [-0.2, 0.2]) {
    b.add(
      matDark,
      createChamferedBoxGeometry(0.3, 0.07, 0.04, 0.008),
      { p: [lpgX, 1.262, lpgZ] },
      0.5,
    );
    b.add(
      matDark,
      createCylinderGeometry(0.159, 0.159, 0.035, 16, true),
      { p: [lpgX, lpgY, lpgZ], r: [HALF_PI, 0, 0] },
      0.35,
    );
  }
  b.add(
    "steel_galv",
    createRevolvedGeometry(
      [
        [0, -0.37],
        [0.08, -0.36],
        [0.132, -0.33],
        [0.155, -0.27],
        [0.155, 0.27],
        [0.132, 0.33],
        [0.08, 0.36],
        [0, 0.37],
      ],
      16,
    ),
    { p: [lpgX, lpgY, 0], r: [HALF_PI, 0, 0] },
    (vx, vy, vz) => 0.8 + 0.2 * sampleSimplexNoise3D(vx * 8, vy * 8, vz * 8),
  );
  b.add(
    "steel_galv",
    createCylinderGeometry(0.09, 0.09, 0.07, 12, true),
    { p: [lpgX, lpgY, 0.39], r: [HALF_PI, 0, 0] },
    0.7,
  );
  b.add(
    "steel_galv",
    createCylinderGeometry(0.02, 0.02, 0.05, 8),
    { p: [lpgX, lpgY, 0.39], r: [HALF_PI, 0, 0] },
    0.9,
  );
  b.add(
    "rubber",
    createTubeFromPoints(
      [
        [lpgX, lpgY, 0.41],
        [lpgX + 0.05, lpgY - 0.02, 0.46],
        [lpgX + 0.2, lpgY - 0.15, 0.44],
        [-1.07, 1.1, 0.38],
        [-1, 0.98, 0.36],
      ],
      0.012,
      5,
      false,
      0.5,
    ),
    null,
    1,
  );
  b.push({ p: [lpgX, lpgY, 0], r: [0, 0, 0.7] });
  b.cdecal(engineCtx.mats.decal("hazard_flammable"), 0.157, 0.12, {
    p: [0, 0, -0.05],
    r: [-HALF_PI, 0, 0],
  });
  b.cdecal(
    engineCtx.mats.label("液化气", { color: "red", font: "stencil", distress: 0.3 }),
    0.157,
    0.16,
    { p: [0, 0, 0.14], r: [-HALF_PI, 0, 0] },
  );
  b.pop();

  const mastX0 = 0.6;
  const mastX1 = 0.73;
  const mastColZ = 0.375;
  const mastBotY = 0.08;
  const mastTopY = 2.02;

  for (const side of [1, -1]) {
    const colZ = side * mastColZ;
    const cRailPts = [
      [mastX0, colZ],
      [mastX1, colZ],
      [mastX1, colZ - side * 0.065],
      [mastX1 - 0.014, colZ - side * 0.065],
      [mastX1 - 0.014, colZ - side * 0.014],
      [mastX0 + 0.014, colZ - side * 0.014],
      [mastX0 + 0.014, colZ - side * 0.065],
      [mastX0, colZ - side * 0.065],
    ];
    b.add(
      matDark,
      createPrismGeometry(
        normalizePolygonWinding(cRailPts.map((p) => [p[0], -p[1]])),
        mastTopY - mastBotY,
        { soft: 0 },
      ),
      { p: [0, (mastBotY + mastTopY) / 2, 0], r: [-HALF_PI, 0, 0] },
      getLuminance(),
    );
    b.add(
      matDark,
      createChamferedBoxGeometry(0.085, 1.86, 0.036, 0.006),
      { p: [0.665, 0.13 + halfLiftY + 0.93, side * 0.335] },
      getLuminance() * 1.25,
    );
    b.decal(engineCtx.mats.decal("hazard_general"), 0.1, {
      p: [0.665, 1.3, side * (mastColZ + 0.002)],
      r: [0, side > 0 ? 0 : Math.PI, 0],
    });

    const pTiltBase = [0.36, 0.66, side * 0.3];
    const pTiltTop = [0.6, 0.86, side * 0.33];
    const pTiltMid = [0.5, 0.777, side * 0.317];
    b.add(matDark, createConnectingCylinder(pTiltBase, pTiltMid, 0.034, 8, true), null, 0.55);
    b.add("steel_bare", createConnectingCylinder(pTiltMid, pTiltTop, 0.018, 6), null, 1);

    const chainZ = side * 0.13;
    const pulTopY = 1.9 + halfLiftY;
    const pulRad = 0.055;
    const chainPts = [
      [0.725, 0.5 + forkLiftY, chainZ],
      [0.725, pulTopY, chainZ],
    ];
    for (let cp = 0.5; cp < Math.PI; cp += 0.55) {
      chainPts.push([0.67 + Math.cos(cp) * pulRad, pulTopY + Math.sin(cp) * pulRad, chainZ]);
    }
    chainPts.push([0.615, pulTopY, chainZ], [0.615, 1, chainZ]);

    let linkIdx = 0;
    for (let c = 0; c < chainPts.length - 1; c++) {
      const pA = chainPts[c];
      const pB = chainPts[c + 1];
      const segLen = Math.hypot(pB[0] - pA[0], pB[1] - pA[1]);
      const segSteps = Math.max(1, Math.round(segLen / 0.058));
      for (let st = 0; st < segSteps; st++, linkIdx++) {
        const t0 = st / segSteps;
        const t1 = (st + 0.86) / segSteps;
        const lerpPt = (param) => [
          pA[0] + (pB[0] - pA[0]) * param,
          pA[1] + (pB[1] - pA[1]) * param,
          chainZ,
        ];
        b.add(
          "steel_worn",
          createBoxBetweenPoints(
            lerpPt(t0),
            lerpPt(t1),
            0.011,
            linkIdx % 2 ? 0.034 : 0.022,
            0,
            true,
          ),
          null,
          linkIdx % 2 ? 0.55 : 0.75,
        );
      }
    }
    b.add(
      matDark,
      createCylinderGeometry(pulRad - 0.006, pulRad - 0.006, 0.04, 12),
      { p: [0.67, pulTopY, chainZ], r: [HALF_PI, 0, 0] },
      0.7,
    );
  }

  b.add(
    matDark,
    createChamferedBoxGeometry(0.04, 0.09, 0.78, 0.008),
    { p: [mastX0 - 0.012, 1.96, 0] },
    getLuminance(),
  );
  b.add(
    matDark,
    createChamferedBoxGeometry(0.04, 0.12, 0.78, 0.008),
    { p: [mastX0 - 0.012, 0.42, 0] },
    getLuminance(),
  );
  b.add(
    matDark,
    createChamferedBoxGeometry(0.07, 0.09, 0.66, 0.008),
    { p: [0.665, 1.99 + halfLiftY, 0] },
    getLuminance(),
  );
  b.add(matDark, createCylinderGeometry(0.048, 0.048, 1.15, 10), { p: [0.645, 0.72, 0] }, 0.6);
  b.add(matDark, createCylinderGeometry(0.055, 0.055, 0.05, 10), { p: [0.645, 1.3, 0] }, 0.5);
  b.add(
    "steel_bare",
    createCylinderGeometry(0.027, 0.027, 0.64 + halfLiftY, 8, true),
    { p: [0.645, 1.31 + (0.64 + halfLiftY) / 2, 0] },
    1,
  );
  b.label("最大载重2500千克", { color: "yellow", font: "stencil", distress: 0.3 }, 0.5, 0.05, {
    p: [mastX0 - 0.033, 0.42, 0],
    r: [0, -HALF_PI, 0],
  });

  for (const hZ of [0.21, 0.245]) {
    b.add(
      "rubber",
      createTubeFromPoints(
        [
          [0.6, 1.25, hZ],
          [0.59, 1.65 + halfLiftY * 0.6, hZ],
          [0.655, 1.86 + halfLiftY, hZ + 0.005],
          [0.735, 1.6 + halfLiftY * 1.2, hZ],
          [0.74, 0.56 + forkLiftY, hZ],
        ],
        0.011,
        5,
        false,
        0.5,
      ),
      null,
      1,
    );
  }

  b.push({ p: [0, forkLiftY, 0] });
  const carrBaseY = 0.06;
  for (const cY of [carrBaseY + 0.12, carrBaseY + 0.5]) {
    b.add(
      matDark,
      createChamferedBoxGeometry(0.04, 0.1, 1.02, 0.008),
      { p: [0.755, cY, 0] },
      getLuminance(),
    );
  }
  b.add(
    "hazard_stripes",
    createBoxGeometry(0.003, 0.06, 0.4),
    { p: [0.7765, carrBaseY + 0.5, 0] },
    0.9,
  );

  for (const side of [1, -1]) {
    b.add(
      matDark,
      createChamferedBoxGeometry(0.03, 0.5, 0.06, 0.006),
      { p: [0.745, carrBaseY + 0.31, side * 0.3] },
      getLuminance(),
    );
    b.add(
      matDark,
      createChamferedBoxGeometry(0.11, 0.36, 0.022, 0.005),
      { p: [0.685, carrBaseY + 0.31, side * 0.305] },
      getLuminance(),
    );
    b.add(
      matDark,
      createChamferedBoxGeometry(0.03, 0.78, 0.04, 0.006),
      { p: [0.755, carrBaseY + 0.94, side * 0.5] },
      getLuminance(),
    );
    b.add(
      "steel_worn",
      createCylinderGeometry(0.04, 0.04, 0.03, 10),
      { p: [0.67, carrBaseY + 0.2, side * 0.325], r: [HALF_PI, 0, 0] },
      0.7,
    );
  }
  b.add(
    matDark,
    createChamferedBoxGeometry(0.03, 0.04, 1.04, 0.006),
    { p: [0.755, carrBaseY + 1.33, 0] },
    getLuminance(),
  );
  b.add(
    matDark,
    createChamferedBoxGeometry(0.02, 0.03, 1, 0.004),
    { p: [0.755, carrBaseY + 0.94, 0] },
    getLuminance(),
  );
  for (let gr = -2; gr <= 2; gr++) {
    b.add(
      matDark,
      createChamferedBoxGeometry(0.02, 0.76, 0.02, 0.004),
      { p: [0.755, carrBaseY + 0.94, gr * 0.165] },
      getLuminance(),
    );
  }

  const forkY0 = 0.035;
  for (const side of [1, -1]) {
    const tineProfile = [
      [0.777, forkY0],
      [1.45, forkY0],
      [1.7, forkY0 + 0.006],
      [1.7, forkY0 + 0.016],
      [0.87, forkY0 + 0.046],
      [0.826, forkY0 + 0.075],
      [0.822, forkY0 + 0.62],
      [0.777, forkY0 + 0.62],
    ];
    b.add(
      "steel_worn",
      createPrismGeometry(tineProfile, 0.1, { soft: 0.45 }),
      { p: [0, 0, side * 0.26] },
      (vx, vy, vz) => {
        const wearFac = clamp((vx - 0.8) / 0.9, 0, 1);
        const scratchNoise = sampleSimplexNoise3D(vx * 14, vz * 30 + side, 0);
        return (0.5 + 0.5 * wearFac) * (0.8 + 0.2 * scratchNoise);
      },
    );
    b.add(
      matDark,
      createChamferedBoxGeometry(0.075, 0.05, 0.112, 0.006),
      { p: [0.772, carrBaseY + 0.575, side * 0.26] },
      0.55,
    );
    b.add(
      matDark,
      createChamferedBoxGeometry(0.03, 0.04, 0.112, 0.006),
      { p: [0.79, carrBaseY + 0.07, side * 0.26] },
      0.55,
    );
  }
  b.pop();

  const totalHeight = Math.max(2.2, 0.06 + forkLiftY + 1.36, 2.04 + halfLiftY);
  return b.finish({
    size: [3.4, totalHeight, 1.25],
    colliders: [
      { min: [-1.7, 0, -0.6], max: [0.58, 1.24, 0.6], surface: "metal" },
      { min: [-1.56, 1.24, -0.4], max: [-1.22, 1.6, 0.4], surface: "metal" },
      { min: [-0.88, 1.24, -0.24], max: [-0.7, 1.66, 0.24], surface: "rubber" },
      { min: [0.56, 0, -0.42], max: [0.78, 2.04 + halfLiftY, 0.42], surface: "metal" },
      { min: [0.72, forkLiftY, -0.53], max: [0.8, forkLiftY + 1.42, 0.53], surface: "metal" },
      { min: [0.8, forkLiftY, -0.33], max: [1.7, forkLiftY + 0.1, 0.33], surface: "metal" },
      { min: [-1.02, 2, -0.5], max: [0.32, 2.1, 0.5], surface: "metal" },
      ...cageColliders,
    ],
  });
}

function buildGenerator(engineCtx, options = {}) {
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
function buildDumpster(engineCtx, options = {}) {
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
function buildToolboxCart(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "toolbox_cart", options.seed || 0);
  const prng = b.rng;
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

// ============================================================================
// 十一、 模块注册器与展示厅 API (Registration & Showcase API)
// ============================================================================

export {
  buildVehicleWheel,
  buildBarrel,
  buildPalletGeometry,
  buildPallet,
  buildPalletStack,
  buildWoodCrateGeometry,
  buildCrateWood,
  buildCrateStack,
  buildIbcTote,
  buildCableReel,
  buildTireStack,
  buildJerryCan,
  buildTrafficCone,
  buildGasCylinders,
  buildPipeStack,
  buildTarpCargo,
  buildSandbags,
  buildCardboardBoxes,
  buildForklift,
  buildGenerator,
  buildDumpster,
  buildToolboxCart,
};

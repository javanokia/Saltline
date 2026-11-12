import { ot, $e } from "../geo.js";
import {
  PI,
  HALF_PI,
  clamp,
  PropCompoundBuilder,
  getCachedDecalTexture,
  createChamferedBoxGeometry,
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

function buildVehicleWheel(builder, x, y, z, tireRadius, tireWidth, rimRadius, isFront, prng) {
  const tireGeo = generateTireTreadProfile(tireWidth, tireRadius, rimRadius, 18);
  builder.push({ p: [x, y, z], r: [isFront ? HALF_PI : -HALF_PI, 0, 0] });
  builder.push({ r: [0, prng() * 6, 0] });
  builder.add("tire", tireGeo, null, 0.85);

  // 钢制轮毂与轴承螺栓 (Steel Rim & Lug Nuts)
  const rimGeo = ot(rimRadius, rimRadius, tireWidth * 0.6, 16);
  builder.add("steel_dark", rimGeo, null, 0.6);
  for (let k = 0; k < 6; k++) {
    const a = k * (PI / 3);
    const lx = Math.cos(a) * (rimRadius * 0.55);
    const ly = Math.sin(a) * (rimRadius * 0.55);
    builder.add("steel_galv", ot(0.015, 0.015, 0.02, 6), { p: [lx, ly, tireWidth * 0.32] }, 0.8);
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
    b.add("steel_dark", ot(0.035, 0.035, 0.01, 10), { p: [0.18, 0.89, 0] });
    b.add("steel_dark", ot(0.022, 0.022, 0.01, 10), { p: [-0.18, 0.89, 0] });
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
    builder.add("wood_pallet", bevel ? createChamferedBoxGeometry(w, h, d, 0.004) : $e(w, h, d), {
      p,
    });

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
    detail ? createChamferedBoxGeometry(w, boxH, d, 0.004) : $e(w, boxH, d),
    { p: [0, boxCenterY, 0] },
    prng.range(0.85, 1.0),
  );

  // 底部托板木梁 (Bottom Skids)
  if (skids) {
    for (const sx of [-w / 2 + 0.07, 0, w / 2 - 0.07]) {
      builder.add("wood_dark", $e(0.08, skidH, d), { p: [sx, skidH / 2, 0] }, 0.8);
    }
  }

  // 侧边木框条与斜向交叉加固撑 (Frame Cleats & Diagonal Braces)
  if (detail) {
    for (const sz of [-d / 2, d / 2]) {
      builder.add("wood_dark", $e(w, 0.07, 0.015), { p: [0, skidH + 0.035, sz] });
      builder.add("wood_dark", $e(w, 0.07, 0.015), { p: [0, h - 0.035, sz] });
      for (const sx of [-w / 2 + 0.035, w / 2 - 0.035]) {
        builder.add("wood_dark", $e(0.07, boxH, 0.015), { p: [sx, boxCenterY, sz] });
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
  b.add("steel_galv", $e(1.2, 0.028, 1.0), { p: [0, 0.014, 0] });
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
  b.add("plastic_red", ot(0.08, 0.08, 0.04, 12), { p: [0, 1.08, 0] });
  b.add("steel_dark", ot(0.035, 0.035, 0.06, 8), { p: [0, 0.16, 0.49], rot: [HALF_PI, 0, 0] });

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
      ot(radius, radius, flangeThick, 20),
      { p: [0, radius, sz], rot: [HALF_PI, 0, 0] },
      prng.range(0.8, 1.0),
    );
  }

  // 中间圆柱形电缆卷筒 (Core Cylinder)
  const coreRadius = 0.32;
  b.add("wood_pallet", ot(coreRadius, coreRadius, width - 2 * flangeThick, 16), {
    p: [0, radius, 0],
    rot: [HALF_PI, 0, 0],
  });

  // 缠绕黑色橡胶护套特种高压电缆 (Coiled High-Voltage Rubber Cable)
  const cableRadius = 0.54;
  b.add(
    "rubber",
    ot(cableRadius, cableRadius, width - 2 * flangeThick - 0.02, 18),
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
  b.add("steel_dark", ot(0.022, 0.022, 0.04, 10), { p: [0.12, 0.39, 0], rot: [0, 0, -0.4] });

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
  b.add("plastic_red", ot(0.031, 0.128, 0.67, 14, false, "bottom"), { p: [0, 0.03, 0] });

  // 白色高反光微棱镜反光套 (White Reflective Collars)
  b.add("paint_white", ot(0.068, 0.088, 0.14, 14, false, "bottom"), { p: [0, 0.32, 0] });

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
  b.add("steel_dark", $e(0.9, 0.03, 0.03), { p: [0, 1.14, -0.225] });
  b.add("steel_dark", $e(0.9, 0.03, 0.03), { p: [0, 1.14, 0.225] });

  // 4 具高压钢瓶 (4 High-Pressure Steel Cylinders: O2, N2, Acetylene)
  const cylColors = ["paint_teal", "paint_grey", "paint_orange", "paint_blue"];
  const xs = [-0.3, -0.1, 0.1, 0.3];
  for (let i = 0; i < 4; i++) {
    const cx = xs[i];
    // 瓶身
    b.add(cylColors[i % cylColors.length], ot(0.1, 0.1, 1.25, 14), { p: [cx, 0.65, 0] });
    // 顶部球冠半球
    b.add(
      cylColors[i % cylColors.length],
      new THREE.SphereGeometry(0.1, 12, 8, 0, PI * 2, 0, HALF_PI),
      { p: [cx, 1.275, 0] },
    );
    // 减压阀与防护铜盖 (Brass Pressure Regulator & Protective Cap)
    b.add("brass", ot(0.035, 0.035, 0.08, 8), { p: [cx, 1.36, 0] });
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
      const pipeGeo = ot(radius, radius, pipeLen, 16, true);
      b.add(
        "steel_rust",
        pipeGeo,
        { p: [0, lyr.y, cz], rot: [0, 0, HALF_PI] },
        prng.range(0.8, 1.0),
      );
      // 内部内壁暗色
      b.add(
        "steel_dark",
        ot(radius - 0.015, radius - 0.015, pipeLen - 0.01, 14, true),
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
  b.add("wood_pallet", $e(2.2, 0.14, 1.2), { p: [0, 0.07, 0] });

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
      $e(bw + 0.002, 0.05, bd + 0.002),
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
function buildForklift(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "forklift", options.seed || 0);
  const prng = b.rng;
  const forksUp = clamp(+options.forksUp || 0, 0, 1);
  const forkLiftY = forksUp * 1.5;
  const [matBody, tint] = resolveColorPalette(options.color, "yellow");
  const matDark = "steel_dark";
  const matGalv = "steel_galv";

  // 1. 车身底盘与后部铸铁配重块 (Chassis & Cast-Iron Counterweight)
  b.add(matBody, createChamferedBoxGeometry(1.9, 0.75, 1.15, 0.03), { p: [-0.3, 0.55, 0] }, tint);
  // 后部流线型重型配重块 (Rear Curved Counterweight)
  b.add(matBody, createChamferedBoxGeometry(0.65, 0.68, 1.12, 0.08), { p: [-1.15, 0.6, 0] }, tint);

  // 2. 驾驶室顶棚防落物保护结构 (FOPS Overhead Guard & Roll Cage)
  const cageH = 2.15;
  for (const sx of [-0.95, 0.25]) {
    for (const sz of [-0.52, 0.52]) {
      b.add(matDark, createConnectingCylinder([sx, 0.9, sz], [sx, cageH, sz], 0.022, 6));
    }
  }
  b.add(matDark, $e(1.25, 0.04, 1.1), { p: [-0.35, cageH, 0] });
  for (let z = -0.4; z <= 0.41; z += 0.2) {
    b.add(matDark, $e(1.2, 0.02, 0.02), { p: [-0.35, cageH - 0.02, z] });
  }

  // 3. 驾驶员座椅与液压方向盘 (Driver Seat & Steering Wheel)
  b.add("rubber", createChamferedBoxGeometry(0.45, 0.12, 0.48, 0.02), { p: [-0.35, 1.0, 0] });
  b.add("rubber", createChamferedBoxGeometry(0.1, 0.45, 0.46, 0.02), { p: [-0.55, 1.25, 0] });
  b.add(matDark, createConnectingCylinder([0.05, 0.9, 0], [0.12, 1.25, 0], 0.018, 6));
  b.add("rubber", ot(0.18, 0.18, 0.02, 12), { p: [0.12, 1.27, 0], rot: [0.4, 0, 0] });

  // 4. 前部双级起升门架 (Duplex Mast Assembly)
  const mastX = 0.82;
  for (const sz of [-0.44, 0.44]) {
    b.add(matDark, createChamferedBoxGeometry(0.14, 2.3, 0.08, 0.01), { p: [mastX, 1.2, sz] });
  }
  b.add(matDark, $e(0.1, 0.08, 0.92), { p: [mastX, 0.2, 0] });
  b.add(matDark, $e(0.1, 0.08, 0.92), { p: [mastX, 2.25, 0] });

  // 5. 锻造钢制货叉与升降滑架 (Forks Carriage & Tines)
  const carriageY = 0.25 + forkLiftY;
  b.add(matGalv, $e(0.06, 0.65, 0.86), { p: [mastX + 0.08, carriageY + 0.32, 0] });
  for (const sz of [-0.26, 0.26]) {
    // 垂直叉背
    b.add(matGalv, createChamferedBoxGeometry(0.05, 0.75, 0.12, 0.006), {
      p: [mastX + 0.12, carriageY + 0.36, sz],
    });
    // 水平货叉长臂 (1.2m Fork Tine)
    b.add(matGalv, createChamferedBoxGeometry(1.22, 0.045, 0.12, 0.005), {
      p: [mastX + 0.72, carriageY + 0.025, sz],
    });
  }

  // 6. 前后四实心橡胶工业轮胎 (4 Solid Rubber Industrial Tires)
  buildVehicleWheel(b, 0.65, 0.36, 0.58, 0.36, 0.24, 0.18, true, prng);
  buildVehicleWheel(b, 0.65, 0.36, -0.58, 0.36, 0.24, 0.18, true, prng);
  buildVehicleWheel(b, -0.85, 0.3, 0.52, 0.3, 0.18, 0.15, false, prng);
  buildVehicleWheel(b, -0.85, 0.3, -0.52, 0.3, 0.18, 0.15, false, prng);

  return b.finish({ size: [3.4, 2.3, 1.25] });
}

/**
 * 静音应急柴油发电机组 (Silent Emergency Diesel Generator Set)
 */
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
      b.add(matDark, ot(0.045, 0.045, 0.03, 8), { p: [sx, 1.34, sz], rot: [0, 0, HALF_PI] });
    }
  }

  // 进排气消音百叶与检修门 (Air Louvers & Access Doors)
  b.add(matDark, $e(0.02, 0.65, 0.7), { p: [1.01, 0.75, 0] });
  b.add(matDark, $e(0.02, 0.65, 0.7), { p: [-1.01, 0.75, 0] });

  // 顶部消音排气管 (Exhaust Silencer Pipe)
  b.add(matDark, ot(0.06, 0.06, 0.35, 12), { p: [0.5, 1.5, 0] });
  b.add(matDark, ot(0.08, 0.06, 0.08, 12), { p: [0.5, 1.7, 0] });

  // 紧急停机按钮与数字液晶控制面板 (Emergency Stop & LCD Controller)
  b.add("plastic_red", ot(0.025, 0.025, 0.03, 8), { p: [-0.6, 0.95, 0.46], rot: [HALF_PI, 0, 0] });
  b.add("paint_grey", $e(0.35, 0.45, 0.03), { p: [-0.2, 0.85, 0.46] });

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
    b.add(matDark, $e(1.85, 0.12, 0.06), { p: [0, 0.65, sz] });
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
      b.add(matDark, ot(0.06, 0.06, 0.04, 10), { p: [sx, 0.08, sz], rot: [HALF_PI, 0, 0] });
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
    b.add(matAlum, $e(0.62, 0.016, 0.016), { p: [0.04, curY + dh / 2 - 0.02, 0.245] });
    curY -= dh / 2;
  }

  // 顶层防油橡胶工作台垫 (Top Rubber Mat)
  b.add("rubber", $e(0.7, 0.01, 0.42), { p: [0.04, 0.785, 0] });

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
      b.add(matDark, ot(0.05, 0.05, 0.03, 10), { p: [sx, 0.06, sz], rot: [HALF_PI, 0, 0] });
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

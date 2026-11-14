// @ts-check
/**
 * @file src/props/cargo.js
 * @description 港区物流、仓储散货与托盘箱包资产构建器 (Cargo, Logistics & Warehousing Props)
 *
 * 【资产清单】
 * 1. 200L 工业标准油桶 (barrel)
 * 2. EUR 欧标木托盘与堆叠木托盘垛 (pallet, pallet_stack)
 * 3. 欧标木质包装箱与木质货箱垛 (crate_wood, crate_stack)
 * 4. 1000L IBC 液体中型散装容器吨桶 (ibc_tote)
 * 5. 重型木质电缆卷盘 (cable_reel)
 * 6. 废旧重卡轮胎堆垛 (tire_stack)
 * 7. 20L 战术便携油桶 (jerry_can)
 * 8. 交通安全反光路锥 (traffic_cone)
 * 9. 联排高压工业气瓶组 (gas_cylinders)
 * 10. 港区重型无缝无缝钢管堆 (pipe_stack)
 * 11. 防雨篷布苫盖大件货物堆 (tarp_cargo)
 * 12. 防弹工事沙袋垛 (sandbags)
 * 13. 瓦楞纸箱堆垛 (cardboard_boxes)
 */

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
  traverseAndMutateVertices,
  sampleSimplexNoise3D,
} from "./builder.js";

/**
 * 200L 工业标准油桶 (Industrial 200L Steel Drum / Barrel)
 */
export function buildBarrel(engineCtx, options = {}, variant = 0) {
  const b = new PropCompoundBuilder(engineCtx, "barrel", variant);
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
export function buildPalletGeometry(builder, prng, { broken = false, bevel = true } = {}) {
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
export function buildPallet(engineCtx, options = {}, variant = 0) {
  const b = new PropCompoundBuilder(engineCtx, "pallet", variant);
  buildPalletGeometry(b, b.rng, { broken: !!options.broken, bevel: true });
  return b.finish();
}

/**
 * 堆叠木托盘垛 (Stacked Pallets)
 */
export function buildPalletStack(engineCtx, options = {}) {
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
export function buildWoodCrateGeometry(
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
export function buildCrateWood(engineCtx, options = {}) {
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
export function buildCrateStack(engineCtx, options = {}) {
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
export function buildIbcTote(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "ibc_tote", options.seed || 0);
  const prng = b.rng;

  // 镀锌钢板底座托盘 (Galvanized Steel Pallet Base)
  b.add("steel_galv", createBoxGeometry(1.2, 0.028, 1.0), { p: [0, 0.014, 0] });
  for (const sx of [-0.5, 0, 0.5]) {
    for (const sz of [-0.4, 0, 0.4]) {
      b.add("steel_galv", createBoxGeometry(0.1, 0.072, 0.1), { p: [sx, 0.064, sz] });
    }
  }

  // 吹塑聚乙烯白色半透明塑料内胆 (Blow-Molded HDPE Bottle)
  const bottleGeo = createChamferedBoxGeometry(1.08, 0.98, 0.88, 0.07);
  b.add("plastic_grey", bottleGeo, { p: [0, 0.59, 0] }, prng.range(0.9, 1.0));

  // 顶部注料加注口与螺纹保护盖 (Top Fill Cap)
  b.add("plastic_red", createCylinderGeometry(0.08, 0.085, 0.038, 12), { p: [0, 1.1, 0] });

  // 底部排放蝶阀与放料嘴 (Bottom Discharge Valve)
  b.add("plastic_red", createCylinderGeometry(0.038, 0.038, 0.07, 8), {
    p: [0, 0.16, 0.46],
    r: [HALF_PI, 0, 0],
  });

  // 外部四方网状焊接镀锌钢管笼架 (Outer Tubular Steel Cage)
  const cageRad = 0.01;
  const cageW = 1.16;
  const cageD = 0.96;
  const cageH = 1.04;
  for (const sx of [-cageW / 2, cageW / 2]) {
    for (const sz of [-cageD / 2, cageD / 2]) {
      b.add("steel_galv", createCylinderGeometry(cageRad, cageRad, cageH, 6), {
        p: [sx, 0.1 + cageH / 2, sz],
      });
    }
  }
  for (const ringY of [0.26, 0.52, 0.78, 1.04]) {
    b.bar("steel_galv", [-cageW / 2, ringY, -cageD / 2], [cageW / 2, ringY, -cageD / 2], cageRad);
    b.bar("steel_galv", [-cageW / 2, ringY, cageD / 2], [cageW / 2, ringY, cageD / 2], cageRad);
    b.bar("steel_galv", [-cageW / 2, ringY, -cageD / 2], [-cageW / 2, ringY, cageD / 2], cageRad);
    b.bar("steel_galv", [cageW / 2, ringY, -cageD / 2], [cageW / 2, ringY, cageD / 2], cageRad);
  }

  // 正面产品标识警示板 (Front Label Plate)
  b.add("steel_galv", createBoxGeometry(0.42, 0.35, 0.002), { p: [0, 0.72, cageD / 2 + 0.003] });
  b.label("IBC-1000L", { color: "black", font: "stencil" }, 0.32, 0.08, {
    p: [0, 0.76, cageD / 2 + 0.005],
  });
  const hazardDec = getCachedDecalTexture(engineCtx, options.hazard || "hazard_corrosive");
  b.decal(hazardDec, 0.14, 0.14, { p: [0, 0.63, cageD / 2 + 0.005] });

  return b.finish();
}

/**
 * 工业重型木质电缆卷盘 (Heavy Wooden Cable Reel)
 */
export function buildCableReel(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "cable_reel", options.seed || 0);
  const prng = b.rng;
  const rad = 0.65;
  const drumRad = 0.32;
  const width = 0.8;
  const flangeThick = 0.045;

  // 两侧圆形实木法兰侧板 (2 Circular Wooden Flanges)
  for (const sz of [-width / 2 + flangeThick / 2, width / 2 - flangeThick / 2]) {
    b.add("wood_dark", createCylinderGeometry(rad, rad, flangeThick, 20), {
      p: [0, rad, sz],
      r: [HALF_PI, 0, 0],
    });
    // 中心轴穿孔加固钢套 (Center Axle Hole Steel Flange)
    b.add("steel_dark", createCylinderGeometry(0.065, 0.065, flangeThick + 0.006, 12), {
      p: [0, rad, sz],
      r: [HALF_PI, 0, 0],
    });
    // 周向螺栓固定点 (Radial Tie-Rod Bolt Heads)
    for (let i = 0; i < 6; i++) {
      const angle = (i * PI) / 3;
      b.add("steel_galv", createCylinderGeometry(0.016, 0.016, flangeThick + 0.01, 6), {
        p: [Math.cos(angle) * (drumRad + 0.12), rad + Math.sin(angle) * (drumRad + 0.12), sz],
        r: [HALF_PI, 0, 0],
      });
    }
  }

  // 核心卷线圆筒与外层卷绕重型高压电缆 (Cable Drum Core & Wound Cable)
  const cableW = width - flangeThick * 2;
  const cableLayers = options.empty ? 0 : 3;
  const cableOuterRad = drumRad + cableLayers * 0.07;
  b.add(
    "tire",
    createCylinderGeometry(cableOuterRad, cableOuterRad, cableW - 0.01, 18),
    { p: [0, rad, 0], r: [HALF_PI, 0, 0] },
    0.6,
  );

  return b.finish({ size: [rad * 2, rad * 2, width] });
}

/**
 * 废旧卡车轮胎堆 (Scrap Heavy Vehicle Tire Stack)
 */
export function buildTireStack(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "tire_stack", options.seed || 0);
  const prng = b.rng;
  const count = clamp(options.count | 0 || 4, 1, 6);
  const tireRadius = 0.42;
  const tireW = 0.24;
  const rimRad = 0.22;

  let curY = 0;
  for (let i = 0; i < count; i++) {
    const isTop = i === count - 1;
    const offX = i ? prng.range(-0.035, 0.035) : 0;
    const offZ = i ? prng.range(-0.035, 0.035) : 0;
    const rotTilt = i ? prng.range(-0.04, 0.04) : 0;

    const tireGeo = generateTireTreadProfile(tireRadius, tireW, rimRad, 18);
    b.add(
      "tire",
      tireGeo,
      {
        p: [offX, curY + tireW / 2, offZ],
        r: [HALF_PI + rotTilt, prng.range(0, PI * 2), 0],
      },
      prng.range(0.7, 0.9),
    );

    curY += tireW * 0.95;
  }

  return b.finish({ size: [tireRadius * 2, curY, tireRadius * 2] });
}

/**
 * 20L 冲压加强筋战术油桶 (20L Jerry Can)
 */
export function buildJerryCan(engineCtx, options = {}, variant = 0) {
  const b = new PropCompoundBuilder(engineCtx, "jerry_can", variant);
  const [matName, tintFactor] = resolveColorPalette(options.color, "green");

  // 主冲压桶体 (Stamped Steel Body)
  const bodyGeo = createChamferedBoxGeometry(0.35, 0.47, 0.17, 0.024);
  b.add(matName, bodyGeo, { p: [0, 0.235, 0] }, tintFactor);

  // 经典 X 型冲压受力凹槽 (Stiffening X-Indent Ribs)
  for (const sz of [-0.086, 0.086]) {
    b.add("steel_dark", createBoxGeometry(0.24, 0.012, 0.004), {
      p: [0, 0.235, sz],
      r: [0, 0, 0.72],
    });
    b.add("steel_dark", createBoxGeometry(0.24, 0.012, 0.004), {
      p: [0, 0.235, sz],
      r: [0, 0, -0.72],
    });
  }

  // 经典三联管一体提手 (Three-Bar Carry Handle)
  for (const ox of [-0.04, 0, 0.04]) {
    b.bar(matName, [ox, 0.47, -0.06], [ox, 0.47, 0.06], 0.009);
    b.bar(matName, [ox, 0.47, -0.06], [ox, 0.45, -0.07], 0.009);
    b.bar(matName, [ox, 0.47, 0.06], [ox, 0.45, 0.07], 0.009);
  }

  // 倾斜注油倒料嘴与卡扣密封盖 (Angled Spout & Cam-Lock Cap)
  b.add("steel_dark", createCylinderGeometry(0.024, 0.024, 0.05, 8), {
    p: [0.12, 0.49, 0],
    r: [0, 0, -0.4],
  });

  return b.finish();
}

/**
 * 橡胶底座交通反光路锥 (Traffic Cone)
 */
export function buildTrafficCone(engineCtx, options = {}, variant = 0) {
  const b = new PropCompoundBuilder(engineCtx, "traffic_cone", variant);

  // 加重四方橡胶稳固底座 (Square Heavy Rubber Base)
  b.add("rubber_black", createChamferedBoxGeometry(0.36, 0.038, 0.36, 0.008), {
    p: [0, 0.019, 0],
  });

  // 荧光橙色锥形桶身 (Fluorescent Orange Tapered Cone Body)
  b.add("plastic_red", createCylinderGeometry(0.035, 0.14, 0.66, 14, true), {
    p: [0, 0.038 + 0.33, 0],
  });

  // 两道 3M 高光反光反差贴条 (Retroreflective White Stripes)
  b.add(
    "paint_white",
    createCylinderGeometry(0.058, 0.074, 0.11, 14, true),
    { p: [0, 0.45, 0] },
    1.4,
  );
  b.add(
    "paint_white",
    createCylinderGeometry(0.088, 0.104, 0.09, 14, true),
    { p: [0, 0.28, 0] },
    1.4,
  );

  return b.finish();
}

/**
 * 联排高压工业气瓶组 (Industrial Compressed Gas Cylinders Rack)
 */
export function buildGasCylinders(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "gas_cylinders", options.seed || 0);
  const prng = b.rng;
  const count = clamp(options.count | 0 || 3, 2, 4);
  const cylH = 1.45;
  const cylRad = 0.115;
  const spacing = cylRad * 2.15;
  const totalW = count * spacing;

  // 钢制安全固定防护推车架 (Steel Safety Support Rack & Base)
  b.add("steel_dark", createBoxGeometry(totalW + 0.08, 0.03, cylRad * 2 + 0.08), {
    p: [0, 0.015, 0],
  });
  b.add("steel_dark", createBoxGeometry(totalW + 0.08, 0.04, 0.02), {
    p: [0, 0.85, -cylRad - 0.02],
  });
  // 安全锁止钢链 (Safety Chain)
  b.bar("steel_galv", [-totalW / 2, 0.86, cylRad + 0.02], [totalW / 2, 0.86, cylRad + 0.02], 0.008);

  const colors = ["paint_blue", "paint_grey", "paint_green", "paint_yellow"];

  for (let i = 0; i < count; i++) {
    const x = -totalW / 2 + spacing * (i + 0.5);
    const colorMat = colors[(b.seed + i) % colors.length];

    // 气瓶圆柱主体 (Cylinder Body)
    b.add(colorMat, createCylinderGeometry(cylRad, cylRad, cylH - cylRad * 2, 12), {
      p: [x, cylH / 2, 0],
    });
    // 瓶顶半球封头 (Top Hemisphere Cap)
    b.add("steel_dark", createCylinderGeometry(0.01, cylRad, cylRad, 12), {
      p: [x, cylH - cylRad / 2, 0],
    });
    // 铜制减压主阀与安全护罩 (Brass Valve & Protective Collar)
    b.add("brass", createCylinderGeometry(0.018, 0.022, 0.065, 8), { p: [x, cylH + 0.03, 0] });
    b.add("steel_dark", createCylinderGeometry(0.05, 0.05, 0.09, 8, true), {
      p: [x, cylH + 0.03, 0],
    });
  }

  return b.finish({ size: [totalW + 0.08, cylH + 0.08, cylRad * 2 + 0.08] });
}

/**
 * 港区工业无缝厚壁钢管堆 (Seamless Industrial Pipe Stack)
 */
export function buildPipeStack(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "pipe_stack", options.seed || 0);
  const prng = b.rng;
  const pipeLen = options.length || 6.0;
  const outerRad = 0.16;
  const innerRad = 0.142;
  const tiers = 3; // 4-3-2 金字塔经典鞍座堆放

  // 底层木枕支承垫木 (Bottom Timber Dunnage)
  for (const pz of [-pipeLen * 0.38, pipeLen * 0.38]) {
    b.add("wood_dark", createBoxGeometry(1.4, 0.08, 0.14), { p: [0, 0.04, pz] });
  }

  let countInRow = 4;
  let curY = 0.08 + outerRad;

  for (let t = 0; t < tiers; t++) {
    const rowW = countInRow * (outerRad * 2.02);
    const startX = -rowW / 2 + outerRad;

    for (let i = 0; i < countInRow; i++) {
      const x = startX + i * (outerRad * 2.02);
      // 中空厚壁钢管 (Hollow Steel Pipe)
      const pipeGeo = createCylinderGeometry(outerRad, outerRad, pipeLen, 14, true);
      b.add("steel_rust", pipeGeo, { p: [x, curY, 0], r: [HALF_PI, 0, 0] }, prng.range(0.85, 1.05));
    }

    countInRow--;
    curY += outerRad * 1.732; // sin(60°) 紧密贴合
  }

  // 钢管两端固定打包钢带 (Steel Tension Strapping)
  for (const pz of [-pipeLen * 0.35, pipeLen * 0.35]) {
    b.add("steel_galv", createBoxGeometry(1.35, curY * 0.85, 0.015), { p: [0, curY * 0.42, pz] });
  }

  return b.finish({ size: [1.4, curY + outerRad, pipeLen] });
}

/**
 * 防雨篷布苫盖大件货堆 (Tarp-Covered Industrial Cargo Bundle)
 */
export function buildTarpCargo(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "tarp_cargo", options.seed || 0);
  const prng = b.rng;
  const w = options.w || 2.4;
  const h = options.h || 1.5;
  const d = options.d || 1.4;

  // 内部垫底欧标托盘
  b.add("wood_pallet", createBoxGeometry(w * 0.95, 0.144, d * 0.95), { p: [0, 0.072, 0] });

  // 带有物理张力不规则形变与褶皱的苫盖篷布 (Wrinkled Tarp Cover)
  const tarpGeo = createChamferedBoxGeometry(w, h - 0.144, d, 0.18, "bottom");
  traverseAndMutateVertices(tarpGeo, (v) => {
    // 顶部重力微凹陷 + 四角绷紧张力
    if (v.y > (h - 0.144) * 0.85) {
      v.y -= (1 - Math.hypot(v.x / (w / 2), v.z / (d / 2))) * 0.05;
    }
    // 表面随机布料细微褶皱
    const wrinkle = (sampleSimplexNoise3D(v.x * 4, v.y * 4, v.z * 4) - 0.5) * 0.04;
    v.x += wrinkle;
    v.z += wrinkle;
  });
  recomputeNormalsAndBounds(tarpGeo);

  b.add("tarp", tarpGeo, { p: [0, 0.144, 0] }, prng.range(0.85, 1.0));

  // 尼龙紧固捆扎带与压紧压扣 (Tension Cargo Straps)
  for (const sx of [-w * 0.32, 0, w * 0.32]) {
    b.add("hazard_stripes", createBoxGeometry(0.045, h * 0.98, d + 0.015), {
      p: [sx, h / 2, 0],
    });
  }

  return b.finish({ size: [w, h, d] });
}

/**
 * 防弹工事沙袋垛 (Defensive Ballistic Sandbags Wall)
 */
export function buildSandbags(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "sandbags", options.seed || 0);
  const prng = b.rng;
  const courses = clamp(options.courses | 0 || 4, 2, 6);
  const bagW = 0.44;
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
export function buildCardboardBoxes(engineCtx, options = {}) {
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

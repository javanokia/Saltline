/**
 * @file src/level/structures.js
 * @description 港区出入口哨所、围栏边界与钢结构大型封闭仓库生成器
 */

import {
  WAREHOUSE_SPECS,
  WAREHOUSE_COLUMN_X,
  DOORWAY_SPECS_YARD,
  DOORWAY_SPECS_QUAY,
  ROOF_SKYLIGHT_SPECS,
} from "./constants.js";

export function buildPerimeterGate(levelBuilder) {
  const place = levelBuilder.place;
  const minX = -38,
    maxX = 30;
  const minZ = -30,
    maxZ = 28;
  const gateZ0 = 2.0,
    gateZ1 = 8.0;

  // 沿港区边界铺设铁丝网安全护栏 (Boundary Fence Panels)
  function buildFenceLine(x0, z0, x1, z1, seedBase) {
    const dist = Math.hypot(x1 - x0, z1 - z0);
    const count = Math.max(1, Math.round(dist / 3.35));
    const step = dist / (count * 3);
    const isAlongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);

    for (let y = 0; y < count; y++) {
      const frac = (y + 0.5) / count;
      const mesh = place(
        "fence_panel",
        x0 + (x1 - x0) * frac,
        z0 + (z1 - z0) * frac,
        isAlongX ? 0 : Math.PI / 2,
        { seed: seedBase + y, posts: y === count - 1 ? "both" : "left" },
        0,
        { noCol: true },
      );
      mesh.scale.x = step;
    }
    // 连续物理阻挡碰撞盒
    levelBuilder.col(
      Math.min(x0, x1) - 0.05,
      0,
      Math.min(z0, z1) - 0.05,
      Math.max(x0, x1) + 0.05,
      2.4,
      Math.max(z0, z1) + 0.05,
      "metal",
    );
    // 高空防跳出空气墙 (Player Invisible Barrier)
    levelBuilder.col(
      Math.min(x0, x1) - 0.3,
      0,
      Math.min(z0, z1) - 0.3,
      Math.max(x0, x1) + 0.3,
      7.0,
      Math.max(z0, z1) + 0.3,
      "metal",
      { playerOnly: true },
    );
  }

  // 四周边界围网
  buildFenceLine(minX, minZ, maxX, minZ, 100);
  buildFenceLine(minX, maxZ, maxX, maxZ, 200);
  buildFenceLine(minX, minZ, minX, gateZ0, 300);
  buildFenceLine(minX, gateZ1, minX, maxZ, 400);

  // 出入口黄色警示立柱与电动道闸 (Gate Posts & Barrier Arm)
  for (const gz of [gateZ0 - 0.1, gateZ1 + 0.1]) {
    levelBuilder.box("steel_dark", 0.22, 3.4, 0.22, minX, 1.7, gz, { bevel: 0.02 });
    levelBuilder.box("hazard_stripes", 0.26, 1.2, 0.26, minX, 0.6, gz, { bevel: 0.02 });
    levelBuilder.col(minX - 0.13, 0, gz - 0.13, minX + 0.13, 3.4, gz + 0.13, "metal");
  }

  // 保安门禁岗亭、道闸与水泥防撞墩 (Guard Booth, Gate Arm & Barriers)
  place("guard_booth", minX + 3.3, gateZ1 + 2.2, Math.PI / 2, { color: "white", seed: 15 });
  place("gate_arm", minX + 0.2, gateZ0 + 0.4, 0, { open: 0.1, seed: 16 });
  place("jersey_barrier", minX + 2.0, gateZ0 - 1.2, 0.1, { seed: 17 });
  place("jersey_barrier", minX + 2.0, gateZ1 + 5.2, -0.15, { seed: 18 });
  place("sign_post", minX + 4.5, gateZ1 + 4.0, 0, { sign: "hazard_general", seed: 19 });
  place("floodlight_stand", minX + 5.0, gateZ0 + 1.0, 0.4, { on: true, seed: 20 });
}

// ============================================================================
// 五、 钢结构封闭集装箱仓库构建 (Steel Warehouse Shed Builder: ab)
// ============================================================================

/**
 * 组装大型封闭集装箱仓库 (Shed: Steel Framing, Gable Roof, Skylights & Interior Lights)
 */
export function buildWarehouseShed(levelBuilder) {
  const { M, MI, box, slab, cyl, rod, ibeam, col, add, G: engineCtx } = levelBuilder;
  const { X0, X1, Z0, Z1, EAVE, RIDGE, ZR, FLOOR } = WAREHOUSE_SPECS;

  const halfDepth = (Z1 - Z0) / 2;
  const roofRise = RIDGE - EAVE;
  const pitchSlope = Math.atan2(roofRise, halfDepth);
  const roofSpan = Math.hypot(halfDepth, roofRise);
  const getRoofHeightAtZ = (z) => EAVE + roofRise * (1 - Math.abs(z - ZR) / halfDepth);

  const matRoof = M("corrugated_roof");
  const matRoofInt = MI("corrugated_roof");
  const matConc = M("concrete");
  const matConcPaint = MI("concrete_painted");
  const matGrey = MI("paint_grey");
  const matGalv = MI("steel_galv");
  const matDark = MI("steel_dark");
  const wallThick = 0.25;

  // 1. 耐磨环氧地坪与地面碰撞 (Epoxy Floor Slab & Ground Colliders)
  slab(MI("floor_epoxy"), X0, -0.25, Z0, X1, FLOOR, Z1, { cast: false });
  col(X0, -0.5, Z0, X1, FLOOR, Z1, "concrete");

  // 出入口室外混凝土坡道 (Exterior Concrete Entry Aprons)
  slab(
    matConc,
    DOORWAY_SPECS_YARD.x0 - 0.4,
    -0.2,
    Z1,
    DOORWAY_SPECS_YARD.x1 + 0.4,
    0.02,
    Z1 + 1.4,
    { cast: false },
  );
  slab(
    matConc,
    X1,
    -0.2,
    DOORWAY_SPECS_QUAY.z0 - 0.4,
    X1 + 1.4,
    0.02,
    DOORWAY_SPECS_QUAY.z1 + 0.4,
    { cast: false },
  );

  // 2. 纵向外墙分段墙体生成器 (Wall Segment Builder Along X)
  function buildWallSegmentX(zPos, dirZ, startX, endX, botY, topY) {
    if (endX - startX < 0.02 || topY - botY < 0.02) return;
    const outerZ = zPos;
    const innerZ = zPos - dirZ * wallThick;
    // 底部 1.2m 预制水泥防撞矮墙 (1.2m Concrete Plinth)
    if (botY < 1.2) {
      const midZ = zPos - dirZ * wallThick * 0.5;
      slab(
        matConc,
        startX,
        FLOOR - 0.2,
        Math.min(outerZ, midZ),
        endX,
        Math.min(1.2, topY),
        Math.max(outerZ, midZ),
        { bevel: 0.015 },
      );
      slab(
        matConcPaint,
        startX,
        FLOOR - 0.2,
        Math.min(midZ, innerZ),
        endX,
        Math.min(1.2, topY),
        Math.max(midZ, innerZ),
        { bevel: 0.015 },
      );
    }
    // 上部双面瓦楞彩钢夹芯保温墙板 (Insulated Corrugated Wall Sheeting)
    const upperY = Math.max(botY, 1.2);
    if (topY > upperY) {
      slab(
        matRoof,
        startX,
        upperY - 0.03,
        Math.min(outerZ + dirZ * 0.02, outerZ + dirZ * 0.06),
        endX,
        topY,
        Math.max(outerZ + dirZ * 0.02, outerZ + dirZ * 0.06),
      );
      slab(
        matRoofInt,
        startX,
        upperY,
        Math.min(outerZ - dirZ * 0.1, outerZ - dirZ * 0.13),
        endX,
        topY,
        Math.max(outerZ - dirZ * 0.1, outerZ - dirZ * 0.13),
      );
    }
  }

  // 3. 山墙与侧立面外墙分段 (Side Walls & Gable Walls)
  for (let i = 0; i < WAREHOUSE_COLUMN_X.length - 1; i++) {
    const xA = WAREHOUSE_COLUMN_X[i];
    const xB = WAREHOUSE_COLUMN_X[i + 1];
    // 南墙 (带堆场大门)
    if (i === 2) {
      buildWallSegmentX(Z1, 1, xA, DOORWAY_SPECS_YARD.x0, 0, EAVE);
      buildWallSegmentX(Z1, 1, DOORWAY_SPECS_YARD.x1, xB, 0, EAVE);
      buildWallSegmentX(
        Z1,
        1,
        DOORWAY_SPECS_YARD.x0,
        DOORWAY_SPECS_YARD.x1,
        DOORWAY_SPECS_YARD.h,
        EAVE,
      );
    } else {
      buildWallSegmentX(Z1, 1, xA, xB, 0, EAVE);
    }
    // 北墙 (全封闭)
    buildWallSegmentX(Z0, -1, xA, xB, 0, EAVE);
  }

  // 4. 门式钢架柱梁系统 (Portal Frame Trusses, I-Beams & Columns)
  for (const cx of WAREHOUSE_COLUMN_X) {
    // 钢柱 (Columns)
    ibeam(matDark, "y", EAVE, cx, EAVE / 2, Z0 + 0.15, { depth: 0.35, width: 0.2 });
    ibeam(matDark, "y", EAVE, cx, EAVE / 2, Z1 - 0.15, { depth: 0.35, width: 0.2 });
    // 斜梁 (Rafters)
    rod(matGalv, [cx, EAVE - 0.2, Z0 + 0.15], [cx, RIDGE - 0.2, ZR], 0.035);
    rod(matGalv, [cx, EAVE - 0.2, Z1 - 0.15], [cx, RIDGE - 0.2, ZR], 0.035);
    // 柱间系杆 (Tie Rods)
    rod(matGalv, [cx, EAVE - 0.2, Z0 + 0.15], [cx, EAVE - 0.2, Z1 - 0.15], 0.025);
  }

  // 5. 屋面双坡波纹彩钢板与高透光天窗 (Corrugated Pitch Roof & Skylights)
  const skylightList = [];
  const skylightMat = MI("glass", { transparent: true, opacity: 0.65 });
  // 南北两坡屋面
  for (const dirZ of [-1, 1]) {
    const isSouth = dirZ > 0;
    const roofAngle = (isSouth ? -1 : 1) * pitchSlope;
    const midZ = ZR + dirZ * (halfDepth / 2);
    const midY = (EAVE + RIDGE) / 2;
    // 屋面板实体
    box(matRoof, X1 - X0, 0.06, roofSpan + 0.3, (X0 + X1) / 2, midY + 0.04, midZ, {
      rot: [roofAngle, 0, 0],
    });
  }

  // 天窗开孔与采光板放置
  for (const [pitchDir, tier, bay] of ROOF_SKYLIGHT_SPECS) {
    const isSouth = pitchDir === "S";
    const xPos = X0 + bay * 1.5;
    const zFrac = tier / 4;
    const zPos = isSouth ? ZR + halfDepth * zFrac : ZR - halfDepth * zFrac;
    const yPos = getRoofHeightAtZ(zPos);
    const roofAngle = (isSouth ? -1 : 1) * pitchSlope;
    box(skylightMat, 1.2, 0.02, 1.8, xPos, yPos + 0.05, zPos, { rot: [roofAngle, 0, 0] });
    skylightList.push({ pos: [xPos, yPos, zPos], dir: pitchDir });
  }

  // 6. 仓库内部照明灯具阵列 (High-Bay Warehouse Lighting Fixtures)
  const warehouseLights = [];
  const lampMat = engineCtx.mats.emissive(0xfff2d6, 6.0);
  for (const lx of [-10, -2, 6]) {
    for (const lz of [-24, -19.5, -15]) {
      const ly = getRoofHeightAtZ(lz) - 0.8;
      cyl(matDark, 0.25, 0.25, 0.1, lx, ly, lz, { seg: 12 });
      cyl(lampMat, 0.22, 0.22, 0.02, lx, ly - 0.05, lz, { seg: 12 });
      rod(matGalv, [lx, ly + 0.05, lz], [lx, getRoofHeightAtZ(lz), lz], 0.008);
      warehouseLights.push({ pos: [lx, ly, lz], intensity: 1.0 });
    }
  }

  // 7. 仓库内部重型货架、货物与铲车作业区 (Interior Racking & Pallets)
  levelBuilder.place("shelf_rack", -12.5, -23.5, 0, { seed: 1 });
  levelBuilder.place("shelf_rack", -9.5, -23.5, 0, { seed: 2 });
  levelBuilder.place("shelf_rack", -6.5, -23.5, 0, { seed: 3 });
  levelBuilder.place("shelf_rack", 2.5, -23.5, 0, { seed: 4 });
  levelBuilder.place("shelf_rack", 5.5, -23.5, 0, { seed: 5 });

  levelBuilder.place("forklift", -1.0, -18.0, Math.PI * 0.8, { color: "yellow", seed: 6 });
  levelBuilder.place("pallet_stack", -4.2, -15.0, 0.2, { count: 6, seed: 7 });
  levelBuilder.place("crate_stack", 0.5, -14.5, -0.3, { seed: 8 });
  levelBuilder.place("barrel", 8.0, -25.0, 0, { color: "blue", seed: 9 });
  levelBuilder.place("barrel", 8.6, -25.2, 0, { color: "blue", seed: 10 });
  levelBuilder.place("toolbox_cart", 7.5, -16.0, -Math.PI / 2, { color: "red", seed: 11 });

  // 仓库周围外墙与屋顶物理碰撞盒 (Warehouse Walls & Roof Physics Colliders)
  col(X0 - wallThick, 0, Z0 - wallThick, X1 + wallThick, EAVE, Z0, "metal");
  col(X0 - wallThick, 0, Z1, X1 + wallThick, EAVE, Z1 + wallThick, "metal");
  col(X0 - wallThick, 0, Z0 - wallThick, X0, EAVE, Z1 + wallThick, "metal");
  col(X1, 0, Z0 - wallThick, X1 + wallThick, EAVE, Z1 + wallThick, "metal");
  // 屋顶防跳出高空阻挡
  col(X0, EAVE, Z0, X1, RIDGE + 0.5, Z1, "metal", { playerOnly: true });

  return {
    skylights: skylightList,
    lights: warehouseLights,
    relayPos: { x: -8.0, z: -25.0 },
    update(dt) {},
  };
}

// ============================================================================
// 六、 深水码头岸壁与远洋作业泊位构建 (Deepwater Quay Builder: cb)
// ============================================================================

/**
 * 组装深水码头作业区 (Quay: Berthing Wall, Crane Rails, Mooring Bollards & Extraction Boat)
 */

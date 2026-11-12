import * as THREE from "three";
import {
  PI,
  HALF_PI,
  clamp,
  COLOR_PALETTE,
  resolveColorPalette,
  composeTransformMatrix4,
  traverseAndMutateVertices,
  transformGeometryInPlace,
  sampleValueNoise2D,
  createPropPRNG,
  createLoftedRibbonGeometry,
  createTransformMatrix4,
  PropMeshAssembler,
  getCachedDecalTexture,
  recomputeNormalsAndBounds,
  applyVertexColorLuminance,
} from "./builder.js";

function buildJerseyBarrier(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const seed = options.seed | 0;
  const prng = createPropPRNG(seed + 11);
  const noise = seed * 3.7;
  const matConcrete = t.M("concrete", { vertexColors: true });

  const profile = [
    [-0.3, 0],
    [0.3, 0],
    [0.3, 0.076],
    [0.127, 0.33],
    [0.1, 0.57],
    [0.077, 0.79],
    [0.06, 0.81],
    [-0.06, 0.81],
    [-0.077, 0.79],
    [-0.1, 0.57],
    [-0.127, 0.33],
    [-0.3, 0.076],
  ];
  const xPath = [-1.5, -1.47];
  for (let f = -1.25; f <= 1.26; f += 0.25) xPath.push(f);
  xPath.push(1.47, 1.5);

  const barrierGeo = createLoftedRibbonGeometry(
    profile,
    xPath,
    (px, py, pxPos) => [pxPos, py, px],
    { center: [0, 0.4, 0], closed: true, caps: true },
  );

  const pos = barrierGeo.attributes.position;
  const norm = barrierGeo.attributes.normal;
  const colArr = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i),
      vy = pos.getY(i),
      vz = pos.getZ(i);
    const ny = norm.getY(i);
    const n1 = sampleValueNoise2D(vx * 1.5 + noise, vz * 3);
    const n2 = sampleValueNoise2D(vx * 7, vy * 5 + noise);
    let factor =
      (0.78 + 0.22 * n1) * (0.88 + 0.12 * n2) * (0.82 + 0.18 * clamp(ny * 0.7 + 0.7, 0, 1));
    const groundOccl = clamp(1 - vy / 0.18, 0, 1);
    factor *= 1 - 0.4 * groundOccl * groundOccl * (0.6 + 0.4 * n2);
    colArr[i * 3] = factor;
    colArr[i * 3 + 1] = factor * (1 - 0.04 * groundOccl);
    colArr[i * 3 + 2] = factor * (1 - 0.1 * groundOccl);
  }
  barrierGeo.setAttribute("color", new THREE.Float32BufferAttribute(colArr, 3));
  t.add(matConcrete, barrierGeo);

  // 两侧红白反光警示片与吊装钢筋环
  const matGalv = t.M("steel_galv");
  const matReflector = t.M("plastic_red");
  t.tube(
    matGalv,
    [
      [-0.8, 0.81, 0],
      [-0.8, 0.9, 0],
      [-0.74, 0.9, 0],
      [-0.74, 0.81, 0],
    ],
    0.008,
  );
  t.tube(
    matGalv,
    [
      [0.74, 0.81, 0],
      [0.74, 0.9, 0],
      [0.8, 0.9, 0],
      [0.8, 0.81, 0],
    ],
    0.008,
  );
  for (const sx of [-0.9, 0.9]) {
    for (const sz of [-1, 1]) {
      t.box(matReflector, 0.08, 0.04, 0.005, sx, 0.58, sz * 0.105, {
        rot: [sz > 0 ? 0.1 : -0.1, 0, 0],
      });
    }
  }

  return t.group(engineCtx.mats);
}

/**
 * 14米港区高杆投光灯塔 (14-meter Lattice Floodlight Mast)
 */
function buildLightMast(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const matGalv = t.M("steel_galv");
  const matConc = t.M("concrete", { vertexColors: true });
  const matDark = t.M("steel_dark");
  const matLamp = engineCtx.mats.emissive(0xffdebd, options.on === false ? 0.02 : 8);

  // 混凝土基座
  t.box(matConc, 0.8, 0.32, 0.8, 0, 0.16, 0, { r: 0.03 });
  t.box(matGalv, 0.5, 0.03, 0.5, 0, 0.335, 0, { r: 0.006 });

  // 塔身四立柱与交叉斜撑 (Lattice Truss Mast)
  const mastH = 13.5;
  const rBot = 0.22;
  const rTop = 0.08;
  const legPts = [
    [-rBot, -rBot],
    [rBot, -rBot],
    [rBot, rBot],
    [-rBot, rBot],
  ];
  for (const lp of legPts) {
    t.bar(
      matGalv,
      [lp[0], 0.35, lp[1]],
      [lp[0] * (rTop / rBot), mastH, lp[1] * (rTop / rBot)],
      0.02,
    );
  }

  // 沿高度方向的多级横撑与斜撑
  const tiers = 14;
  for (let k = 0; k < tiers; k++) {
    const y0 = 0.35 + (mastH - 0.35) * (k / tiers);
    const y1 = 0.35 + (mastH - 0.35) * ((k + 1) / tiers);
    const rb0 = rBot + (rTop - rBot) * (k / tiers);
    const rb1 = rBot + (rTop - rBot) * ((k + 1) / tiers);
    for (let j = 0; j < 4; j++) {
      const pA0 = legPts[j].map((c) => c * (rb0 / rBot));
      const pB0 = legPts[(j + 1) % 4].map((c) => c * (rb0 / rBot));
      const pB1 = legPts[(j + 1) % 4].map((c) => c * (rb1 / rBot));
      t.bar(matGalv, [pA0[0], y0, pA0[1]], [pB0[0], y0, pB0[1]], 0.012);
      t.bar(matGalv, [pA0[0], y0, pA0[1]], [pB1[0], y1, pB1[1]], 0.01);
    }
  }

  // 检修爬梯与安全护笼 (Ladder & Safety Cage)
  const ladX = rBot + 0.06;
  t.bar(matGalv, [ladX, 0.5, -0.15], [ladX * (rTop / rBot), mastH, -0.15], 0.012);
  t.bar(matGalv, [ladX, 0.5, 0.15], [ladX * (rTop / rBot), mastH, 0.15], 0.012);
  for (let y = 0.6; y < mastH; y += 0.3) {
    t.bar(matGalv, [ladX, y, -0.15], [ladX, y, 0.15], 0.008);
  }

  // 顶部检修作业平台与泛光灯阵列 (Top Service Platform & Floodlight Fixtures)
  t.box(matGalv, 0.9, 0.04, 0.9, 0, mastH, 0, { r: 0.005 });
  for (const sx of [-0.35, 0.35]) {
    for (const sz of [-0.35, 0.35]) {
      // 泛光灯箱
      t.box(matDark, 0.28, 0.18, 0.14, sx, mastH + 0.25, sz, { rot: [0.35, 0, 0] });
      // 发光透镜表面
      t.box(matLamp, 0.24, 0.14, 0.02, sx, mastH + 0.25, sz + 0.07, { rot: [0.35, 0, 0] });
    }
  }

  return t.group(engineCtx.mats);
}

/**
 * 港区镀锌铁丝网安全护栏 (Chain-Link Security Fence Panel)
 */
function buildFencePanel(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const matGalv = t.M("steel_galv");
  const matMesh = t.M("chainlink", { doubleSide: true });
  const matConc = t.M("concrete", { vertexColors: true });

  const posts = options.posts || "both";
  const postList =
    posts === "both" ? [-1.5, 1.5] : posts === "left" ? [-1.5] : posts === "right" ? [1.5] : [];

  for (const px of postList) {
    t.box(matConc, 0.32, 0.09, 0.32, px, 0.035, 0, { r: 0.02 });
    t.cyl(matGalv, 0.035, 0.035, 2.5, px, 1.25, 0, { seg: 10 });
    // 顶部斜向刺铁丝支臂 (Overhang Barbwire Arm)
    t.bar(matGalv, [px, 2.45, 0], [px, 2.75, 0.25], 0.02);
  }

  // 上下左右边框管 (Border Tubes)
  t.bar(matGalv, [-1.5, 0.15, 0], [1.5, 0.15, 0], 0.02);
  t.bar(matGalv, [-1.5, 2.35, 0], [1.5, 2.35, 0], 0.02);

  // 菱形编织铁丝网面 (Chainlink Mesh Sheet)
  const meshPlane = new THREE.PlaneGeometry(3.0, 2.2);
  t.add(matMesh, transformGeometryInPlace(meshPlane, 0, 1.25, 0), null, true);

  // 顶部三道防攀爬刺铁丝 (Barbwire Strands)
  for (let k = 0; k < 3; k++) {
    const by = 2.45 + (k + 1) * 0.09;
    const bz = (k + 1) * 0.08;
    t.bar(matGalv, [-1.5, by, bz], [1.5, by, bz], 0.004);
  }

  return t.group(engineCtx.mats);
}

/**
 * 港区门禁保安岗亭 (Security Guard Booth)
 */
function buildGuardBooth(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const colorName = ["white", "grey", "teal"].includes(options.color) ? options.color : "white";
  const matWall = t.M("paint_" + colorName, { vertexColors: true });
  const matDark = t.M("steel_dark");
  const matGalv = t.M("steel_galv");
  const matGlass = t.M("glass", { doubleSide: true });
  const matRoof = t.M("paint_grey");

  // 混凝土基台
  t.box(t.M("concrete"), 2.7, 0.15, 2.3, 0, 0.075, 0, { r: 0.02 });

  // 主体墙体框架 (Main Booth Cabin)
  t.box(matWall, 2.5, 2.4, 2.1, 0, 1.35, 0, { r: 0.03 });

  // 宽视野玻璃观察窗 (Aluminum Windows)
  for (const sz of [-1.06, 1.06]) {
    t.box(matDark, 1.8, 1.0, 0.04, 0, 1.45, sz);
    t.add(
      matGlass,
      transformGeometryInPlace(
        new THREE.PlaneGeometry(1.7, 0.9),
        0,
        1.45,
        sz + (sz > 0 ? 0.021 : -0.021),
        [0, sz > 0 ? 0 : PI, 0],
      ),
      null,
      true,
    );
  }
  // 正面出入工作窗
  t.box(matDark, 0.04, 1.0, 1.4, 1.26, 1.45, 0);
  t.add(
    matGlass,
    transformGeometryInPlace(new THREE.PlaneGeometry(1.3, 0.9), 1.28, 1.45, 0, [0, HALF_PI, 0]),
    null,
    true,
  );

  // 悬挑挑檐平顶 (Overhanging Flat Roof)
  t.box(matRoof, 2.8, 0.16, 2.4, 0, 2.63, 0, { r: 0.02 });

  // 岗亭外部空调外机与电表箱
  t.box(matWall, 0.35, 0.45, 0.65, -1.1, 1.9, -1.25, { r: 0.01 });
  t.box(matGalv, 0.12, 0.35, 0.25, -1.28, 1.3, 0.5, { r: 0.005 });

  return t.group(engineCtx.mats);
}

/**
 * 港区出入口电动道闸 (Motorized Rising Barrier Arm)
 */
function buildGateArm(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const openRatio = clamp(options.open || 0, 0, 1);
  const matBody = t.M("paint_orange", { vertexColors: true });
  const matGalv = t.M("steel_galv");
  const matStripes = t.M("hazard_stripes");

  // 道闸控制机箱 (Control Cabinet)
  t.box(t.M("concrete"), 0.5, 0.06, 0.46, 0, 0.03, 0, { r: 0.015 });
  t.box(matBody, 0.36, 1.0, 0.3, 0, 0.56, 0, { r: 0.01 });

  // 升降转轴与平衡配重
  t.cyl(matGalv, 0.04, 0.04, 0.12, 0, 0.92, 0.18, { seg: 12 });

  // 5米黄黑斜纹反光道闸杆 (Rising Arm with Hazard Stripes)
  const armAngle = openRatio * THREE.MathUtils.degToRad(80);
  t.push(createTransformMatrix4(0, 0.92, 0.22, [-armAngle, 0, 0]));
  t.box(matStripes, 0.04, 0.1, 4.8, 0, 0, 2.3, { r: 0.005 });
  // 配重块
  t.box(matGalv, 0.08, 0.14, 0.4, 0, 0, -0.25, { r: 0.01 });
  t.pop();

  return t.group(engineCtx.mats);
}

/**
 * 码头大吨位铸钢系泊桩 (Heavy Marine Mooring Bollard)
 */
function buildBollardMooring(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const seed = (options.seed | 0) * 2.1;
  const matSteel = t.M("steel_dark", { vertexColors: true });
  const matRust = t.M("steel_rust");

  // 铸钢基座法兰盘
  t.cyl(matSteel, 0.34, 0.35, 0.045, 0, 0.0225, 0, { seg: 20 });
  t.cyl(matRust, 0.37, 0.37, 0.006, 0, 0.003, 0, { seg: 20 });

  // 双喇叭形主桩头与挡缆牛角凸起 (Twin Horn Mooring Post)
  t.cyl(matSteel, 0.22, 0.26, 0.52, 0, 0.28, 0, { seg: 18 });
  t.cyl(matSteel, 0.28, 0.21, 0.14, 0, 0.56, 0, { seg: 18 });
  for (const sx of [-0.22, 0.22]) {
    t.cyl(matSteel, 0.07, 0.08, 0.16, sx, 0.52, 0, { seg: 12, rot: [0, 0, sx > 0 ? -0.4 : 0.4] });
  }

  return t.group(engineCtx.mats);
}

/**
 * 道路防撞警示立柱 (Yellow Safety Bollard Post)
 */
function buildBollardPost(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const matYellow = t.M("paint_yellow", { vertexColors: true });
  const matReflective = t.M("paint_white");

  // 铸铁预埋圆座
  t.cyl(t.M("steel_dark"), 0.14, 0.15, 0.03, 0, 0.015, 0, { seg: 16 });

  // 警示黄柱身与红白微棱镜反光带
  t.cyl(matYellow, 0.085, 0.085, 0.95, 0, 0.5, 0, { seg: 16 });
  t.cyl(matReflective, 0.087, 0.087, 0.08, 0, 0.65, 0, { seg: 16 });
  t.cyl(matReflective, 0.087, 0.087, 0.08, 0, 0.82, 0, { seg: 16 });

  return t.group(engineCtx.mats);
}

/**
 * 工业指示与警示路牌 (Industrial Sign Post)
 */
function buildSignPost(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const matGalv = t.M("steel_galv");
  const matWhite = t.M("paint_white");

  // 基础底座与镀锌立杆
  t.box(t.M("concrete"), 0.3, 0.07, 0.3, 0, 0.03, 0, { r: 0.015 });
  t.box(matGalv, 0.05, 2.38, 0.05, 0, 1.2, 0, { r: 0.006 });

  // 铝合金标牌板面 (Aluminum Signboard)
  t.box(matWhite, 0.6, 0.6, 0.02, 0, 1.9, 0.035, { r: 0.005 });
  const signDecal = getCachedDecalTexture(engineCtx, options.sign || "warning_hazard");
  t.decal(signDecal, 0.55, 0.55, 0, 1.9, 0.047, [0, 0, 0]);

  return t.group(engineCtx.mats);
}

/**
 * 移动式三脚架泛光灯 (Portable Floodlight Tripod Stand)
 */
function buildFloodlightStand(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const matYellow = t.M("paint_yellow");
  const matAlum = t.M("aluminium");
  const matDark = t.M("steel_dark");
  const matLamp = engineCtx.mats.emissive(0xffdebd, options.on === false ? 0.02 : 10);

  // 伸缩立杆
  t.cyl(matAlum, 0.021, 0.021, 1.1, 0, 0.75, 0, { seg: 8, open: true });
  t.cyl(matAlum, 0.016, 0.016, 0.9, 0, 1.6, 0, { seg: 8, open: true });
  t.cyl(matDark, 0.03, 0.03, 0.06, 0, 1.3, 0, { seg: 8 });

  // 三脚折叠支腿 (Tripod Legs)
  for (let i = 0; i < 3; i++) {
    const angle = i * ((PI * 2) / 3);
    const lx = Math.cos(angle) * 0.45;
    const lz = Math.sin(angle) * 0.45;
    t.bar(matDark, [0, 0.7, 0], [lx, 0.02, lz], 0.014);
  }

  // 双头 LED 泛光灯箱
  t.bar(matYellow, [-0.3, 2.05, 0], [0.3, 2.05, 0], 0.016);
  for (const sx of [-0.22, 0.22]) {
    t.box(matYellow, 0.18, 0.12, 0.08, sx, 2.12, 0, { rot: [0.2, 0, 0] });
    t.box(matLamp, 0.16, 0.1, 0.01, sx, 2.12, 0.042, { rot: [0.2, 0, 0] });
  }

  return t.group(engineCtx.mats);
}

/**
 * 工业钢结构防滑斜梯 (Industrial Diamond Plate Metal Stairs)
 */
function buildStairsMetal(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const matTread = t.M("diamond_plate");
  const matDark = t.M("steel_dark");
  const matYellow = t.M("paint_yellow");
  const matGalv = t.M("steel_galv");

  const steps = 12;
  const stepRise = 0.2;
  const stepRun = 0.2;
  const startX = -1.5;
  const width = 0.9;

  for (let g = 0; g < steps; g++) {
    const cy = (g + 1) * stepRise;
    const cx = startX + g * stepRun;
    // 防滑花纹踏步 (Step Tread)
    t.box(matTread, 0.25, 0.03, width, cx + 0.125, cy - 0.015, 0, { r: 0.005 });
    // 黄色防滑警示边条
    t.box(matYellow, 0.035, 0.034, width, cx + 0.016, cy - 0.015, 0, { r: 0.006 });
  }

  // 两侧槽钢梯梁 (Stringer Channels)
  const totalRise = steps * stepRise;
  const totalRun = steps * stepRun;
  for (const sz of [-width / 2, width / 2]) {
    t.beam(matDark, [startX, 0, sz], [startX + totalRun, totalRise, sz], 0.05, 0.15);
    // 安全扶手 (Handrail & Posts)
    t.bar(matGalv, [startX, 0.9, sz], [startX + totalRun, totalRise + 0.9, sz], 0.02);
    for (let g = 0; g <= steps; g += 3) {
      const cx = startX + g * stepRun;
      const cy = g * stepRise;
      t.bar(matGalv, [cx, cy, sz], [cx, cy + 0.9, sz], 0.015);
    }
  }

  return t.group(engineCtx.mats);
}

/**
 * 工业钢结构检修连廊 (Industrial Steel Catwalk)
 */
function buildCatwalk(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const matPlate = t.M("diamond_plate");
  const matYellow = t.M("paint_yellow");
  const matGalv = t.M("steel_galv");
  const matDark = t.M("steel_dark");

  const rails = options.rails || "both";
  const railSides =
    rails === "both" ? [-1, 1] : rails === "left" ? [-1] : rails === "right" ? [1] : [];

  // 花纹钢格栅主桥面 (Catwalk Flooring)
  t.box(matPlate, 3.0, 0.04, 1.2, 0, 0.02, 0, { r: 0.005 });

  // 两侧纵梁
  for (const sz of [-0.58, 0.58]) {
    t.beam(matDark, [-1.5, -0.05, sz], [1.5, -0.05, sz], 0.06, 0.12);
  }

  // 安全护栏与黄色踢脚板 (Handrails & Yellow Kickplate)
  for (const sz of railSides) {
    const zPos = sz * 0.58;
    // 踢脚挡板
    t.box(matYellow, 3.0, 0.12, 0.01, 0, 0.08, zPos);
    // 顶部扶手与中间横杆
    t.bar(matGalv, [-1.5, 1.05, zPos], [1.5, 1.05, zPos], 0.02);
    t.bar(matGalv, [-1.5, 0.55, zPos], [1.5, 0.55, zPos], 0.015);
    // 立柱
    for (let x = -1.5; x <= 1.51; x += 0.75) {
      t.bar(matGalv, [x, 0.04, zPos], [x, 1.05, zPos], 0.018);
    }
  }

  return t.group(engineCtx.mats);
}

/**
 * 重型仓储多层货架 (Heavy Warehouse Pallet Rack)
 */
function buildShelfRack(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const matBlue = t.M("paint_blue", { vertexColors: true });
  const matOrange = t.M("paint_orange");
  const matGalv = t.M("steel_galv");

  const rackW = 2.7;
  const rackH = 4.2;
  const rackD = 1.1;

  // 四根冲孔立柱 (4 Upright Columns)
  for (const sx of [-rackW / 2, rackW / 2]) {
    for (const sz of [-rackD / 2, rackD / 2]) {
      t.box(matBlue, 0.08, rackH, 0.08, sx, rackH / 2, sz, { r: 0.005 });
    }
  }

  // 侧边剪刀撑 (Diagonal Bracing)
  for (const sx of [-rackW / 2, rackW / 2]) {
    for (let y = 0.2; y < rackH - 0.6; y += 0.8) {
      t.bar(matGalv, [sx, y, -rackD / 2], [sx, y + 0.8, rackD / 2], 0.015);
    }
  }

  // 3层橙色重型横梁 (3 Tier Orange Load Beams)
  for (const tierY of [0.8, 2.0, 3.2]) {
    for (const sz of [-rackD / 2, rackD / 2]) {
      t.beam(matOrange, [-rackW / 2, tierY, sz], [rackW / 2, tierY, sz], 0.05, 0.1);
    }
    // 镀锌钢丝层网 (Wire Mesh Decking)
    t.box(matGalv, rackW - 0.1, 0.02, rackD - 0.05, 0, tierY + 0.06, 0);
  }

  return t.group(engineCtx.mats);
}

/**
 * 冷藏集装箱一体化制冷机组 (Reefer Condenser Unit)
 */
function buildReeferUnit(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const matWhite = t.M("paint_white", { vertexColors: true });
  const matDark = t.M("steel_dark");
  const matGalv = t.M("steel_galv");
  const matAlum = t.M("aluminium");

  // 制冷压缩机主体框架
  t.box(matWhite, 0.5, 2.3, 2.3, 0, 1.15, 0, { r: 0.02 });

  // 进排气百叶窗格栅 (Condenser Louver Grille)
  for (let y = 0.5; y < 1.8; y += 0.08) {
    t.box(matAlum, 0.02, 0.015, 1.8, 0.25, y, 0, { rot: [0, 0, 0.5] });
  }

  // 轴流风扇保护罩
  for (const sz of [-0.55, 0.55]) {
    t.cyl(matDark, 0.38, 0.38, 0.05, 0.25, 1.6, sz, { seg: 16, rot: [0, 0, HALF_PI] });
  }

  // 电气微电脑控制面板 (Microprocessor Control Box)
  t.box(matDark, 0.06, 0.45, 0.4, 0.26, 0.85, -0.65, { r: 0.01 });

  return t.group(engineCtx.mats);
}

/**
 * 战术目标中继发射终端 (Tactical Objective Relay Node Terminal)
 */
function buildRelayNode(engineCtx, options = {}) {
  const seed = options.seed | 0;
  const labelId = options.id || options.label || "ABC"[seed % 3];
  const t = new PropMeshAssembler(engineCtx);

  const matGrey = t.M("paint_grey", { vertexColors: true });
  const matDark = t.M("steel_dark");
  const matGalv = t.M("steel_galv");
  const matAlum = t.M("aluminium");
  const matScreen = engineCtx.mats.emissive(0x38d8ff, 3.5);
  const matLed = engineCtx.mats.emissive(0x40ff60, 4.0);

  // 防震重型基座 (Concrete & Steel Heavy Base)
  t.box(t.M("concrete"), 1.3, 0.12, 0.9, 0, 0.06, 0, { r: 0.02 });

  // 三防工业服务器机柜 (Rugged Server Cabinet)
  t.box(matGrey, 1.1, 1.8, 0.75, 0, 1.02, 0, { r: 0.02 });

  // 侧边散热铝合金鳍片 (Cooling Fins)
  for (const sz of [-0.38, 0.38]) {
    for (let y = 0.5; y < 1.7; y += 0.08) {
      t.box(matAlum, 0.8, 0.01, 0.04, 0, y, sz);
    }
  }

  // 交互控制显示屏与战术终端界面 (Tactical Screen & Interface)
  t.box(matDark, 0.04, 0.45, 0.65, 0.56, 1.25, 0, { r: 0.008 });
  t.box(matScreen, 0.005, 0.38, 0.58, 0.58, 1.25, 0);

  // 状态指示 LED 灯带 (Status LEDs)
  for (let k = 0; k < 4; k++) {
    t.box(matLed, 0.01, 0.02, 0.02, 0.58, 1.5, -0.2 + k * 0.08);
  }

  // 顶部折叠双频通信天线 (Folding Communication Antenna)
  t.bar(matGalv, [0, 1.92, 0], [0, 2.7, 0], 0.018);
  t.bar(matGalv, [-0.25, 2.6, 0], [0.25, 2.6, 0], 0.008);

  const grp = t.group(engineCtx.mats);
  grp.userData.isRelay = true;
  grp.userData.relayId = labelId;
  return grp;
}

export {
  buildJerseyBarrier,
  buildLightMast,
  buildFencePanel,
  buildGuardBooth,
  buildGateArm,
  buildBollardMooring,
  buildBollardPost,
  buildSignPost,
  buildFloodlightStand,
  buildStairsMetal,
  buildCatwalk,
  buildShelfRack,
  buildReeferUnit,
  buildRelayNode,
};

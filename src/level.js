/**
 * @file src/level.js
 * @description 几猫四号泊位港区战术场景与关卡程序化装配引擎 (Berth 4 Tactical Seaport Level Engine)
 *
 * 【系统职责】
 * 负责全游戏核心战术关卡“四号深水泊位”（Berth 4）的宏观场景布局、建筑结构程序化建模与物理碰撞世界组装：
 * 1. 四大作战战术分区 (4 Tactical Combat Zones):
 *    - 闸口哨所 (Gate): [-40, -30] ~ [-24, 30] 港区入口、防暴升降道闸、警卫岗亭与安全围网。
 *    - 露天集装箱堆场 (Yard): [-24, -10] ~ [16, 30] 错落迷宫式多层集装箱垛、狭长交火走廊与空中连廊。
 *    - 大型封闭工业仓库 (Shed): [-24, -30] ~ [16, -10] 钢结构门式刚架、山墙屋顶、采光天窗与声学遮挡检测盒。
 *    - 远洋深水码头岸线 (Quay): [16, -30] ~ [40, 30] 58米重装泊位岸壁、岸桥起重机钢轨、系泊桩与撤离快艇泊位。
 * 2. 3 处核心战术中继站目标 (3 Tactical Relay Objectives):
 *    - 甲号中继 · 堆场 (relay_a): [1.5, 0, 7.5]
 *    - 乙号中继 · 仓库 (relay_b): 仓库内部核心控制台
 *    - 丙号中继 · 码头 (relay_c): 岸边主控中枢
 * 3. 撤离行动终点 (Extraction Zone):
 *    - 码头南端直通海面的专用登艇舷梯与靠泊快艇 [Quay, X=30m, Z=20m, R=2.5m]。
 * 4. 42 处战术敌人生成锚点 (Enemy Spawns) 与 55+ 处寻路导航掩体点 (Cover Points)。
 * 5. 静态网格几何深度合批 (Static Geometry Batch Merging: level-merged) 与动态 Canvas 贴花图集化 (Label Atlas)。
 */

import * as THREE from "three";

import {
  createBoxGeometry,
  createBoxBevelGeometry,
  createCylinderGeometry,
  createTubeFromPoints,
  mergeStaticMeshHierarchy,
  createMeshWithShadows,
} from "./geo.js";

import { PROP_SIZES } from "./props.js";

const HALF_PI = Math.PI / 2;

// ============================================================================
// 一、 宏观关卡规格与建筑结构参数 (Macro Level Specifications)
// ============================================================================

/**
 * 具有独立物理刚体模拟的轻质动态道具类型
 */
const DYNAMIC_PHYSICS_PROPS = new Set(["traffic_cone", "jerry_can"]);

/**
 * 大型集装箱仓库建筑结构几何参数 (Warehouse Shed Architecture Specs)
 */
const WAREHOUSE_SPECS = {
  X0: -16, // 仓库西山墙 X
  X1: 12, // 仓库东山墙 X (跨度 28m)
  Z0: -28, // 仓库北侧后墙 Z
  Z1: -11, // 仓库南侧正立面 Z (进深 17m)
  EAVE: 7.0, // 檐口标高 (Eave Height: 7m)
  RIDGE: 9.5, // 屋脊标高 (Ridge Height: 9.5m, 山墙坡度 ~1:5)
  ZR: -19.5, // 屋脊中轴线 Z
  FLOOR: 0.03, // 耐磨环氧地坪厚度
};

/**
 * 仓库钢构立柱柱网轴线间距 (Structural Steel Column Grid)
 */
const WAREHOUSE_COLUMN_X = [-16, -11.1, -6.2, -0.8, 5.6, 12];

/**
 * 仓库正面通往堆场的重型卷帘工业大门 (Yard-side Rolling Shutter Doorway)
 */
const DOORWAY_SPECS_YARD = { x0: -6, x1: -1, h: 5.0 };

/**
 * 仓库侧面通往深水码头的重型工业移门 (Quay-side Sliding Doorway)
 */
const DOORWAY_SPECS_QUAY = { z0: -22, z1: -17, h: 4.5 };

/**
 * 仓库屋顶高透光采光天窗排布 (Roof Pitch Skylights: ['S'|'N', pitchTier, bayIdx])
 */
const ROOF_SKYLIGHT_SPECS = [
  ["S", 1, 4],
  ["S", 2, 5],
  ["S", 1, 11],
  ["S", 2, 15],
  ["S", 3, 8],
  ["N", 2, 7],
  ["N", 1, 13],
  ["N", 3, 17],
];

/**
 * 深水码头岸壁与起重机轨道参数 (Deepwater Quay & Gantry Crane Specs)
 */
const QUAY_SPECS = {
  X: 30.0, // 码头前沿垂直岸壁 X (X > 30 为开阔海域)
  LADDER_Z: 20.0, // 撤离艇登艇钢梯 Z 坐标
  RAILS: [18.5, 28.5], // 岸桥重型轨道中心距 (跨距 10m)
  Z0: -30.0, // 泊位北端界限
  Z1: 28.0, // 泊位南端界限 (总长度 58m)
};

// ============================================================================
// 二、 场景装配构造器上下文 (Level Builder Context: ob)
// ============================================================================

/**
 * 创建关卡建造上下文环境
 * 提供网格放置、几何体合批、物理碰撞注册与层级管理方法
 */
function createLevelBuilderContext(engineCtx) {
  const staticRoot = new THREE.Group();
  staticRoot.name = "level-static";

  const dynRoot = new THREE.Group();
  dynRoot.name = "level-dynamic";

  const restrictedZones = [];
  const placedProps = [];
  const dynamicUpdaters = [];

  const prng = engineCtx.rng && engineCtx.rng.fork ? engineCtx.rng.fork() : Math.random;
  const prngRange = (min, max) => min + (max - min) * prng();

  const getMat = (name, opts) => engineCtx.mats.get(name, opts);
  const getInteriorMat = (name, opts) =>
    engineCtx.mats.get(name, { interior: true, ...(opts || {}) });
  const resolveMat = (m) => (typeof m === "string" ? getMat(m) : m);

  /**
   * 将几何体包装为网格并挂入层级
   */
  function addMesh(geo, mat, opts = {}) {
    const mesh = createMeshWithShadows(geo, resolveMat(mat), {
      cast: opts.cast !== false,
      recv: opts.recv !== false,
    });
    if (opts.p) mesh.position.set(opts.p[0], opts.p[1], opts.p[2]);
    if (opts.r) mesh.rotation.set(opts.r[0] || 0, opts.r[1] || 0, opts.r[2] || 0);
    (opts.parent || staticRoot).add(mesh);
    return mesh;
  }

  /**
   * 放置长方体建筑体
   */
  function addBox(mat, w, h, d, x, y, z, opts = {}) {
    const geo = opts.bevel
      ? createBoxBevelGeometry(w, h, d, opts.bevel)
      : createBoxGeometry(w, h, d);
    return addMesh(geo, mat, { ...opts, p: [x, y, z] });
  }

  /**
   * 根据对角包围盒范围放置长方体 (Box by Min-Max Bounds)
   */
  function addBoxBounds(mat, minX, minY, minZ, maxX, maxY, maxZ, opts = {}) {
    return addBox(
      mat,
      Math.abs(maxX - minX),
      Math.abs(maxY - minY),
      Math.abs(maxZ - minZ),
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
      opts,
    );
  }

  /**
   * 放置圆柱体
   */
  function addCylinder(mat, radius, height, x, y, z, opts = {}) {
    const geo = createCylinderGeometry(
      opts.rTop ?? radius,
      radius,
      height,
      opts.seg || 12,
      !!opts.open,
    );
    const rot =
      opts.axis === "x"
        ? [0, 0, Math.PI / 2]
        : opts.axis === "z"
          ? [Math.PI / 2, 0, 0]
          : opts.r || [0, 0, 0];
    return addMesh(geo, mat, { ...opts, p: [x, y, z], r: rot });
  }

  /**
   * 沿三维样条曲线创建管道 (Curve Tube)
   */
  function addCurveTube(mat, points, radius = 0.03, opts = {}) {
    return addMesh(
      createTubeFromPoints(points, radius, opts.radial || 6, false, opts.tension ?? 0.5),
      mat,
      opts,
    );
  }

  /**
   * 连接两点创建圆柱连杆 (Connecting Rod Between 2 Points)
   */
  function addConnectingRod(mat, p0, p1, radius = 0.015, opts = {}) {
    const v0 = new THREE.Vector3(...p0);
    const v1 = new THREE.Vector3(...p1);
    const len = v0.distanceTo(v1);
    const geo = createCylinderGeometry(radius, radius, len, opts.seg || 6);
    const mesh = addMesh(geo, mat, opts);
    mesh.position.copy(v0).add(v1).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v1.sub(v0).normalize());
    return mesh;
  }

  /**
   * 建造结构工字钢梁 (Structural I-Beam Builder)
   */
  function addIBeam(
    mat,
    axis,
    len,
    x,
    y,
    z,
    { depth = 0.4, width = 0.2, tf = 0.02, tw = 0.012, depthAxis = null, r = null } = {},
  ) {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    if (r) grp.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0);

    const dAxis = depthAxis || (axis === "y" ? "z" : "y");
    const otherAxis = ["x", "y", "z"].find((p) => p !== axis && p !== dAxis);

    const makeDims = (l, d, w) => {
      const o = {};
      o[axis] = l;
      o[dAxis] = d;
      o[otherAxis] = w;
      return [o.x, o.y, o.z];
    };
    const makeOffset = (p) => {
      const o = { x: 0, y: 0, z: 0 };
      o[dAxis] = p;
      return [o.x, o.y, o.z];
    };

    const resolvedM = resolveMat(mat);
    // 上下两块翼缘板 (Top & Bottom Flanges)
    for (const sign of [-1, 1]) {
      addMesh(createBoxGeometry(...makeDims(len, tf, width)), resolvedM, {
        parent: grp,
        p: makeOffset(sign * (depth / 2 - tf / 2)),
      });
    }
    // 中间腹板 (Web Plate)
    addMesh(createBoxGeometry(...makeDims(len, depth - 2 * tf, tw)), resolvedM, { parent: grp });
    staticRoot.add(grp);
    return grp;
  }

  /**
   * 贴装单面贴花 (Decal Mesh)
   */
  function addDecal(mat, w, h, x, y, z, dir = "z+", rotZ = 0) {
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.position.set(x, y, z);
    if (dir === "z-") mesh.rotation.y = Math.PI;
    else if (dir === "x+") mesh.rotation.y = Math.PI / 2;
    else if (dir === "x-") mesh.rotation.y = -Math.PI / 2;
    else if (dir === "y+") {
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = rotZ;
    }
    staticRoot.add(mesh);
    return mesh;
  }

  /**
   * 按名称贴装贴花
   */
  function addDecalByName(name, w, x, y, z, dir, rotZ) {
    try {
      const dec = engineCtx.mats.decal(name);
      if (!dec || !dec.material) return null;
      return addDecal(dec.material, w, w / (dec.aspect || 1), x, y, z, dir, rotZ);
    } catch {
      return null;
    }
  }

  /**
   * 贴装文字标贴 (Label Mesh)
   */
  function addLabel(text, h, x, y, z, dir, opts) {
    try {
      const lbl = engineCtx.mats.label(text, opts || {});
      if (!lbl || !lbl.material) return null;
      return addDecal(lbl.material, h * (lbl.aspect || 4), h, x, y, z, dir);
    } catch {
      return null;
    }
  }

  /**
   * 注册物理世界静态碰撞 AABB
   */
  function addPhysicsBox(minX, minY, minZ, maxX, maxY, maxZ, surface = "concrete", opts = {}) {
    return engineCtx.physics.addBox([minX, minY, minZ], [maxX, maxY, maxZ], { surface, ...opts });
  }

  const helperBox = new THREE.Box3();

  /**
   * 解析网格上携带的道具碰撞体并将世界 AABB 注册进物理系统
   */
  function addMeshCollidersToPhysics(mesh, rotY, opts = {}) {
    const colliders = mesh.userData.colliders || [];
    const isAngled = Math.abs(Math.sin(2 * rotY)) > 0.2;

    for (const c of colliders) {
      let subBoxes = [c];
      // 当道具发生非 90 度旋转时，将长条型碰撞体沿长轴剖分为多段小盒，杜绝斜向穿透伪碰撞 (Split Angled Box to Prevent Ghost Collisions)
      if (isAngled) {
        const dx = c.max[0] - c.min[0];
        const dz = c.max[2] - c.min[2];
        const primaryAxis = dx >= dz ? 0 : 2;
        const maxSpan = Math.max(dx, dz);
        const minSpan = Math.max(0.25, Math.min(dx, dz));
        const numSlices = Math.min(10, Math.max(1, Math.round(maxSpan / minSpan)));
        if (numSlices > 1) {
          subBoxes = [];
          for (let s = 0; s < numSlices; s++) {
            const bMin = c.min.slice();
            const bMax = c.max.slice();
            bMin[primaryAxis] = c.min[primaryAxis] + (maxSpan * s) / numSlices;
            bMax[primaryAxis] = c.min[primaryAxis] + (maxSpan * (s + 1)) / numSlices;
            subBoxes.push({ min: bMin, max: bMax, surface: c.surface });
          }
        }
      }

      for (const sb of subBoxes) {
        helperBox.min.set(sb.min[0], sb.min[1], sb.min[2]);
        helperBox.max.set(sb.max[0], sb.max[1], sb.max[2]);
        helperBox.applyMatrix4(mesh.matrixWorld);
        if (helperBox.max.y - helperBox.min.y < 0.2 && helperBox.max.y < 0.3) continue;

        if (isAngled) {
          const shrinkX = (helperBox.max.x - helperBox.min.x) * 0.07;
          const shrinkZ = (helperBox.max.z - helperBox.min.z) * 0.07;
          helperBox.min.x += shrinkX;
          helperBox.max.x -= shrinkX;
          helperBox.min.z += shrinkZ;
          helperBox.max.z -= shrinkZ;
        }

        engineCtx.physics.addBox(helperBox.min.toArray(), helperBox.max.toArray(), {
          surface: sb.surface || "metal",
          ...opts,
        });
      }
    }
  }

  /**
   * 实例化并放置道具 (Place Prop)
   */
  function placeProp(name, x, z, rotY = 0, opts = {}, y = 0, colOpts = {}) {
    const mesh = engineCtx.props.build(name, opts);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.updateMatrix();
    mesh.updateMatrixWorld(!opts.noCol);

    if (DYNAMIC_PHYSICS_PROPS.has(name)) {
      dynRoot.add(mesh);
    } else {
      staticRoot.add(mesh);
    }

    if (!colOpts.noCol) {
      addMeshCollidersToPhysics(mesh, rotY, colOpts);
    }

    placedProps.push({ name, pos: [x, y, z], yaw: rotY });
    return mesh;
  }

  /**
   * 放置钢结构楼梯并自动添加斜坡物理碰撞
   */
  function placeStairs(x, z, rotY = 0, y = 0, opts = {}) {
    const mesh = placeProp("stairs_metal", x, z, rotY, opts, y);
    const alongX = Math.abs(Math.cos(rotY)) > 0.5;
    const dir = (alongX ? Math.cos(rotY) : Math.sin(rotY)) > 0 ? 1 : -1;
    const run = 2.4;
    const rise = 2.4;
    const width = 0.9;
    const slices = 8;

    for (let k = 0; k < slices; k++) {
      const stepY = y + (k + 0.5) * (rise / slices);
      const stepDist = (k + 0.5) * (run / slices) - run / 2;
      const sx = alongX ? x + dir * stepDist : x;
      const sz = alongX ? z : z + dir * stepDist;
      const hw = alongX ? run / slices / 2 : width / 2;
      const hd = alongX ? width / 2 : run / slices / 2;
      engineCtx.physics.addBox([sx - hw, y, sz - hd], [sx + hw, stepY, sz + hd], {
        surface: "metal",
      });
    }
    return mesh;
  }

  /**
   * 放置高空检修连廊 (Catwalk)
   */
  function placeCatwalk(x, z, rotY = 0, y = 0, opts = {}, rails = [true, true]) {
    const railStr = rails[0] && rails[1] ? "both" : rails[0] ? "left" : rails[1] ? "right" : "none";
    return placeProp("catwalk", x, z, rotY, { ...opts, rails: railStr }, y);
  }

  /**
   * 沿高度堆叠多层集装箱垛 (Multi-tier Container Stacking)
   */
  function placeContainerStack(x, z, stackDefs, rotY = 0, spacing = 1) {
    let curY = 0;
    const placedList = [];
    for (let k = 0; k < stackDefs.length; k++) {
      const [typeNum, colorName, extraOpts = {}] = stackDefs[k];
      const typeStr = "container" + typeNum;
      const mesh = placeProp(
        typeStr,
        x + (extraOpts.dx || 0),
        z + (extraOpts.dz || 0),
        rotY + (extraOpts.flip ? Math.PI : 0),
        {
          color: colorName,
          seed: k + 1,
          doors: extraOpts.doors || 0,
          wear: extraOpts.wear || 0.4,
        },
        curY,
      );
      placedList.push(mesh);
      curY += (PROP_SIZES[typeStr] ? PROP_SIZES[typeStr][1] : 2.59) + 0.005;
    }
    return placedList;
  }

  return {
    staticRoot,
    dynRoot,
    placed: placedProps,
    updaters: dynamicUpdaters,
    M: getMat,
    MI: getInteriorMat,
    mesh: addMesh,
    box: addBox,
    slab: addBoxBounds,
    cyl: addCylinder,
    tube: addCurveTube,
    rod: addConnectingRod,
    ibeam: addIBeam,
    decal: addDecal,
    decalName: addDecalByName,
    label: addLabel,
    col: addPhysicsBox,
    addColliders: addMeshCollidersToPhysics,
    place: placeProp,
    stairs: placeStairs,
    catwalk: placeCatwalk,
    stack: placeContainerStack,
    isRestricted: (x, z) =>
      restrictedZones.some((b) => x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]),
    isMetal: (x, z) =>
      placedProps.some(
        (p) => p.name.startsWith("container") && Math.hypot(p.pos[0] - x, p.pos[2] - z) < 2.0,
      ),
    G: engineCtx,
  };
}

// ============================================================================
// 三、 露天集装箱堆场战术场景构建 (Container Yard Builder: hR)
// ============================================================================

/**
 * 组装集装箱露天堆场 (Yard: Staggered Stacks, Narrow Alleys & Vantage Points)
 */
function buildContainerYard(levelBuilder) {
  const place = levelBuilder.place;
  const stack = levelBuilder.stack;

  // 1. 南北多排集装箱垛 (Dense Container Stacks Forming Combat Corridors)
  stack(-19.45, -5.12, [
    [20, "green"],
    [20, "grey"],
    [20, "orange"],
  ]);
  stack(-13.3, -5.12, [[20, "white", { reefer: true, flip: true }]]);
  stack(3.7, -5.12, [
    [20, "blue", { doors: 0.8, flip: true }],
    [20, "white"],
  ]);
  stack(13.53, -5.12, [
    [20, "teal"],
    [20, "grey"],
  ]);

  stack(-19.45, 2.08, [[20, "blue"]]);
  stack(-13.35, 2.08, [[20, "red"]]);
  stack(0.8, 2.08, [
    [40, "orange"],
    [40, "teal"],
    [20, "blue", { dx: 3 }],
  ]);
  stack(12.3, 2.08, [
    [20, "red"],
    [20, "yellow"],
  ]);

  stack(-21.1, 9.92, [[20, "yellow"]], 0, 0.3);
  stack(
    -13.6,
    9.92,
    [
      [20, "green"],
      [20, "blue"],
      [20, "orange"],
    ],
    0,
    0.3,
  );
  stack(
    -21.6,
    12.42,
    [
      [20, "red"],
      [20, "white"],
      [20, "teal"],
    ],
    0,
    0.3,
  );
  stack(-15.4, 12.42, [[20, "grey", { doors: 0.6 }]], 0, 0.3);
  stack(4.43, 12.42, [[20, "blue"]], 0, 0);
  stack(13.53, 12.42, [[20, "green"]], 0, 0);

  // 2. 登顶钢梯与空中连廊制高点 (Stairs & Elevated Catwalk System)
  levelBuilder.stairs(-0.1, 12.42, 0, 0, { seed: 9 });
  levelBuilder.catwalk(8.98, 12.42, 0, 2.54, { seed: 10 });
  for (const cx of [7.6, 10.36]) {
    for (const cz of [11.86, 12.98]) {
      levelBuilder.rod("steel_dark", [cx, 0, cz], [cx, 2.54, cz], 0.04);
    }
  }

  // 3. 散落战术道具：叉车、工具车、油桶、纸箱、电缆盘与沙袋工事
  place("forklift", -4.5, 5.8, 0.4, { color: "yellow", forksUp: 0.3, seed: 1 });
  place("generator", 8.2, -1.8, -0.2, { color: "yellow", seed: 2 });
  place("toolbox_cart", -7.2, 8.5, 1.1, { color: "red", seed: 3 });
  place("dumpster", -16.5, 18.2, 0, { color: "green", seed: 4 });
  place("sandbags", 1.5, 5.5, -0.1, { courses: 5, seed: 5 });
  place("barrel", -2.4, 3.6, 0, { color: "blue", seed: 6 });
  place("barrel", -1.8, 3.9, 0, { color: "red", lying: true, seed: 7 });
  place("cable_reel", 10.5, 7.2, 0.8, { seed: 8 });
  place("tire_stack", -9.4, 15.6, 0, { count: 4, seed: 9 });
  place("ibc_tote", 6.2, 16.4, 0.15, { seed: 10 });
  place("tarp_cargo", -11.2, 21.0, 0, { seed: 11 });

  // 4. 堆场高杆照明灯塔 (Lattice Floodlight Mast in Yard)
  place("light_mast", 0.0, 18.0, 0, { on: true, seed: 12 });
}

// ============================================================================
// 四、 港区边界与出入口哨所构建 (Perimeter Gate & Security Booth: fR)
// ============================================================================

/**
 * 组装出入口哨所与防攀爬护栏 (Gate, Security Barrier, Fences & Warning Signs)
 */
function buildPerimeterGate(levelBuilder) {
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
  place("sign_post", minX + 4.5, gateZ1 + 4.0, 0, { sign: "warning_hazard", seed: 19 });
  place("floodlight_stand", minX + 5.0, gateZ0 + 1.0, 0.4, { on: true, seed: 20 });
}

// ============================================================================
// 五、 钢结构封闭集装箱仓库构建 (Steel Warehouse Shed Builder: ab)
// ============================================================================

/**
 * 组装大型封闭集装箱仓库 (Shed: Steel Framing, Gable Roof, Skylights & Interior Lights)
 */
function buildWarehouseShed(levelBuilder) {
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
function buildDeepwaterQuay(levelBuilder) {
  const { M, box, slab, cyl, rod, col, place } = levelBuilder;
  const { X: quayX, LADDER_Z: ladderZ, RAILS, Z0, Z1 } = QUAY_SPECS;

  const matConc = M("concrete");
  const matDirty = M("concrete_dirty");
  const matSteel = M("steel_worn");
  const matDark = M("steel_dark");
  const matGalv = M("steel_galv");
  const matYellow = M("paint_yellow");

  const seaY = -1.6;

  // 1. 码头前沿高程混凝土岸壁 (Heavy Concrete Quay Wall, X=30m)
  // 岸壁分为上部路面与直插海水的沉箱前沿挡浪墙
  const ladderGapMin = ladderZ - 0.42;
  const ladderGapMax = ladderZ + 0.42;

  for (const [zA, zB] of [
    [Z0 - 1, ladderGapMin],
    [ladderGapMax, Z1 + 1],
  ]) {
    // 码头路面水泥顶层
    slab(matConc, quayX - 0.65, -0.7, zA, quayX, 0.028, zB, { bevel: 0.03 });
    // 前沿防撞耐磨钢护边 (Steel Armored Coping Edge)
    slab(matSteel, quayX - 0.07, -0.16, zA, quayX + 0.022, 0.036, zB, { bevel: 0.012 });
    // 黄色安全作业防踏空警示边线 (Yellow Safety Line)
    slab(matYellow, quayX - 0.66, 0, zA, quayX - 0.5, 0.032, zB);
    // 直插海水的深水沉箱护岸立壁 (Vertical Underwater Retaining Wall)
    slab(matDirty, quayX - 0.55, -4.2, zA, quayX - 0.02, -0.7, zB);
  }

  // 登艇梯缺口处内凹护台 (Recessed Ladder Well)
  slab(matConc, quayX - 0.65, -0.7, ladderGapMin, quayX - 0.38, 0.028, ladderGapMax);
  slab(matDirty, quayX - 0.55, -4.2, ladderGapMin, quayX - 0.38, -0.7, ladderGapMax);

  // 2. 岸桥轨道 (Gantry Crane Heavy Rails)
  for (const rx of RAILS) {
    // 钢轨底座与重型 QU120 轨道钢
    slab(matDark, rx - 0.08, -0.01, Z0, rx + 0.08, 0.025, Z1);
    slab(matSteel, rx - 0.03, 0.025, Z0, rx + 0.03, 0.065, Z1);
  }

  // 3. 码头重型系缆桩与防撞橡胶护舷 (Mooring Bollards & Rubber Fenders)
  for (let z = Z0 + 4; z < Z1; z += 8) {
    if (Math.abs(z - ladderZ) < 1.5) continue;
    // 码头重型铸钢系缆桩
    place("bollard_mooring", quayX - 0.45, z, -HALF_PI, { seed: Math.abs(z | 0) });
    // 舷外垂直圆筒形橡胶护舷 (Cylindrical Arch Rubber Fenders)
    cyl("rubber", 0.22, 0.22, 1.8, quayX + 0.12, -0.9, z, { seg: 14 });
    rod(matDark, [quayX - 0.02, -0.1, z], [quayX + 0.12, -0.1, z], 0.03);
  }

  // 4. 直通海面的镀锌登艇逃生钢梯 (Steel Water Access Ladder to Sea Boat)
  for (const sz of [-0.25, 0.25]) {
    rod(
      matGalv,
      [quayX - 0.35, 0.02, ladderZ + sz],
      [quayX - 0.35, seaY - 0.4, ladderZ + sz],
      0.02,
    );
  }
  for (let y = 0.0; y >= seaY - 0.35; y -= 0.3) {
    rod(matGalv, [quayX - 0.35, y, ladderZ - 0.25], [quayX - 0.35, y, ladderZ + 0.25], 0.015);
  }

  // 5. 撤离快艇 (Extraction Tactical Speedboat Moored at Ladder)
  const boatPos = new THREE.Vector3(quayX + 1.8, seaY + 0.2, ladderZ);
  // 快艇深 V 船体 (Deep-V Hull)
  box(M("paint_grey"), 3.8, 0.9, 1.6, boatPos.x, boatPos.y, boatPos.z, { bevel: 0.1 });
  box(M("paint_orange"), 1.8, 0.4, 1.4, boatPos.x - 0.6, boatPos.y + 0.45, boatPos.z, {
    bevel: 0.05,
  });
  // 双大马力舷外挂机 (Twin Outboard Motors)
  for (const bz of [-0.4, 0.4]) {
    box(matDark, 0.4, 0.8, 0.25, boatPos.x - 2.0, boatPos.y + 0.2, boatPos.z + bz, { bevel: 0.02 });
  }

  // 6. 码头岸线物理边界碰撞体 (Quay Physics Colliders)
  col(quayX - 0.65, -0.7, Z0 - 1, quayX + 0.02, 0.04, Z1 + 1, "concrete");
  // 落水防掉出空气墙 (阻挡玩家直接向右冲入海中，必须走舷梯)
  col(quayX + 0.02, seaY - 1, Z0, quayX + 0.2, 5.0, ladderGapMin, "concrete");
  col(quayX + 0.02, seaY - 1, ladderGapMax, quayX + 0.2, 5.0, Z1, "concrete");

  return {
    extraction: boatPos,
    relayPos: { x: 26.5, z: 4.5 },
  };
}

// ============================================================================
// 七、 动态 Canvas 贴花图集化合并优化 (Label Texture Atlas Consolidation: rb)
// ============================================================================

const ATLAS_PADDING = 2;

/**
 * 将所有静态网格中的独立文字标签 Canvas 纹理合并为单张大图集 (Consolidate Labels into Texture Atlas)
 */
function buildLabelAtlas(staticRoot, { scale = 0.5, maxW = 2048 } = {}) {
  const result = { count: 0, material: null, update() {} };
  if (typeof document === "undefined") return result;

  const matMap = new Map();
  staticRoot.traverse((node) => {
    if (!node.isMesh || Array.isArray(node.material)) return;
    const mat = node.material;
    if (!mat || mat.name !== "label" || !mat.map || !mat.map.image || !mat.map.image.width) return;
    let cur = node;
    let noMerge = false;
    while (cur) {
      if (cur.userData && cur.userData.noMerge) {
        noMerge = true;
        break;
      }
      cur = cur.parent;
    }
    if (!noMerge) {
      if (!matMap.has(mat)) matMap.set(mat, []);
      matMap.get(mat).push(node);
    }
  });

  if (matMap.size < 2) return result;

  const items = [...matMap.keys()].map((m) => {
    const img = m.map.image;
    return {
      m,
      img,
      w: Math.max(4, Math.ceil(img.width * scale)),
      h: Math.max(4, Math.ceil(img.height * scale)),
    };
  });

  items.sort((a, b) => b.h - a.h || b.w - a.w);

  let curX = 0,
    curY = 0,
    rowH = 0;
  for (const it of items) {
    const limW = Math.min(it.w, maxW - 2 * ATLAS_PADDING);
    if (limW < it.w) {
      it.h = Math.max(4, Math.round((it.h * limW) / it.w));
      it.w = limW;
    }
    if (curX + it.w + 2 * ATLAS_PADDING > maxW) {
      curX = 0;
      curY += rowH;
      rowH = 0;
    }
    it.x = curX + ATLAS_PADDING;
    it.y = curY + ATLAS_PADDING;
    curX += it.w + 2 * ATLAS_PADDING;
    rowH = Math.max(rowH, it.h + 2 * ATLAS_PADDING);
  }

  const canvasW = maxW;
  const canvasH = THREE.MathUtils.ceilPowerOfTwo(Math.max(16, curY + rowH));
  if (canvasH > 4096) return result;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");

  const redrawAtlas = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvasW, canvasH);
    for (const it of items) {
      ctx.drawImage(
        it.img,
        it.x - ATLAS_PADDING,
        it.y - ATLAS_PADDING,
        it.w + 2 * ATLAS_PADDING,
        it.h + 2 * ATLAS_PADDING,
      );
      ctx.clearRect(it.x, it.y, it.w, it.h);
      ctx.drawImage(it.img, it.x, it.y, it.w, it.h);
      it.version = it.m.map.version;
    }
    atlasTex.needsUpdate = true;
  };

  const atlasTex = new THREE.CanvasTexture(canvas);
  atlasTex.generateMipmaps = false;
  atlasTex.minFilter = THREE.LinearFilter;
  atlasTex.magFilter = THREE.LinearFilter;
  atlasTex.colorSpace = THREE.SRGBColorSpace;

  const atlasMat = items[0].m.clone();
  atlasMat.map = atlasTex;
  atlasMat.name = "label_atlas";

  // 重新映射所有几何体 UV 坐标至合批大图集 (Remap Mesh UVs to Atlas Coordinates)
  for (const it of items) {
    const meshes = matMap.get(it.m) || [];
    const u0 = it.x / canvasW;
    const v0 = 1 - (it.y + it.h) / canvasH;
    const uW = it.w / canvasW;
    const vH = it.h / canvasH;

    for (const m of meshes) {
      const uvAttr = m.geometry.attributes.uv;
      if (uvAttr) {
        for (let i = 0; i < uvAttr.count; i++) {
          const oldU = uvAttr.getX(i);
          const oldV = uvAttr.getY(i);
          uvAttr.setXY(i, u0 + oldU * uW, v0 + oldV * vH);
        }
        uvAttr.needsUpdate = true;
      }
      m.material = atlasMat;
    }
  }

  redrawAtlas();
  result.count = items.length;
  result.material = atlasMat;
  result.update = () => {
    let changed = false;
    for (const it of items) {
      if (it.m.map.version !== it.version) {
        changed = true;
        break;
      }
    }
    if (changed) redrawAtlas();
  };

  return result;
}

// ============================================================================
// 八、 关卡顶层主组装引擎 (Main Level Assembly Core: C1)
// ============================================================================

/**
 * 快速创建 Vector3 辅助函数
 */
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * 异步初始化四号泊位宏观战术场景
 * @param {object} engineCtx 全局引擎上下文
 */
export async function createLevel(engineCtx) {
  const root = new THREE.Group();
  root.name = "level";
  engineCtx.scene.add(root);

  const builder = createLevelBuilderContext(engineCtx);

  // 1. 建造四大区域 (Build 4 Zones)
  buildContainerYard(builder);
  buildPerimeterGate(builder);
  const shedData = buildWarehouseShed(builder);
  const quayData = buildDeepwaterQuay(builder);

  // 2. 放置 3 处核心战术中继站 (Place 3 Tactical Relay Objectives)
  const relayNodeA = builder.place("relay_node", 1.5, 7.5, 0.35, { seed: 1 }, 0);
  const relayNodeB = builder.place(
    "relay_node",
    shedData.relayPos.x,
    shedData.relayPos.z,
    (Math.PI / 2) * 0.9,
    { seed: 2 },
    WAREHOUSE_SPECS.FLOOR,
  );
  const relayNodeC = builder.place(
    "relay_node",
    quayData.relayPos.x,
    quayData.relayPos.z,
    -0.2,
    { seed: 3 },
    0,
  );

  // 3. 动态分离与几何体静态合批 (Static Batching & Geometry Merging)
  builder.staticRoot.updateMatrixWorld(true);

  // 将标记为 noMerge 的网格转移至动态根节点 (Protect Dynamic Nodes from Merging)
  const noMergeNodes = [];
  builder.staticRoot.traverse((node) => {
    if (node.userData && node.userData.noMerge) {
      let cur = node.parent;
      let hasParentNoMerge = false;
      while (cur && cur !== builder.staticRoot) {
        if (cur.userData && cur.userData.noMerge) {
          hasParentNoMerge = true;
          break;
        }
        cur = cur.parent;
      }
      if (!hasParentNoMerge) noMergeNodes.push(node);
    }
  });
  for (const node of noMergeNodes) builder.dynRoot.attach(node);

  // 标签图集化 (Label Texture Atlasing)
  let atlasInfo = { count: 0, update() {} };
  try {
    atlasInfo = buildLabelAtlas(builder.staticRoot);
  } catch (err) {
    console.error("[level] label atlas failed", err);
  }

  // 静态几何体合并为单一大网格 (Merge into Single Batched Mesh)
  const mergedMesh = mergeStaticMeshHierarchy(builder.staticRoot);
  mergedMesh.name = "level-merged";
  root.add(mergedMesh);
  root.add(builder.dynRoot);

  // 确保 3 处战术中继节点可动态交互 (Keep Objective Terminals Dynamic)
  for (const rn of [relayNodeA, relayNodeB, relayNodeC]) {
    builder.dynRoot.add(rn);
  }

  // 统计顶点总面数
  let totalTris = 0;
  mergedMesh.traverse((node) => {
    if (node.isMesh) {
      const geo = node.geometry;
      totalTris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    }
  });

  // 4. 战术目标清单 (Tactical Objectives List)
  const objectives = [
    {
      id: "relay_a",
      label: "Relay A — Yard",
      zone: "yard",
      pos: v3(1.5, 0, 7.5),
      object: relayNodeA,
    },
    {
      id: "relay_b",
      label: "Relay B — Shed",
      zone: "shed",
      pos: v3(shedData.relayPos.x, WAREHOUSE_SPECS.FLOOR, shedData.relayPos.z),
      object: relayNodeB,
    },
    {
      id: "relay_c",
      label: "Relay C — Quay",
      zone: "quay",
      pos: v3(quayData.relayPos.x, 0, quayData.relayPos.z),
      object: relayNodeC,
    },
  ];

  // 5. 敌人动态生成锚点 (42 Enemy Spawns: Ground Patrols & Aerial Vectors)
  const groundSpawn = (x, z, zone) => ({ pos: v3(x, 0, z), zone, type: "ground" });
  const airSpawn = (x, y, z, zone) => ({ pos: v3(x, y, z), zone, type: "air" });

  const enemySpawns = [
    // 堆场区域 (Yard)
    groundSpawn(-19.0, -1.4, "yard"),
    groundSpawn(3.5, -1.6, "yard"),
    groundSpawn(14.2, 16.4, "yard"),
    groundSpawn(-3.2, 16.6, "yard"),
    groundSpawn(-16.0, 26.0, "yard"),
    groundSpawn(6.0, 26.0, "yard"),
    groundSpawn(4.2, -5.12, "yard"),
    groundSpawn(-7.8, 21.4, "yard"),
    groundSpawn(-11.3, 12.5, "yard"),
    groundSpawn(17.5, 22.2, "yard"),
    airSpawn(10.0, 11.0, 23.5, "yard"),
    airSpawn(2.0, 11.0, 21.5, "yard"),
    airSpawn(13.0, 9.0, 11.0, "yard"),
    airSpawn(-4.0, 12.5, -4.5, "yard"),
    airSpawn(9.0, 10.0, 1.5, "yard"),
    airSpawn(-10.0, 12.0, 24.5, "yard"),

    // 仓库区域 (Shed)
    groundSpawn(-12.4, -24.8, "shed"),
    groundSpawn(9.6, -25.3, "shed"),
    groundSpawn(-13.4, -19.6, "shed"),
    groundSpawn(4.6, -13.8, "shed"),
    groundSpawn(-21.0, -27.2, "shed"),
    groundSpawn(-18.6, -22.0, "shed"),
    groundSpawn(13.6, -24.0, "shed"),
    groundSpawn(-26.6, -15.0, "shed"),
    airSpawn(-8.0, 5.4, -20.5, "shed"),
    airSpawn(5.0, 5.2, -18.0, "shed"),
    airSpawn(-20.0, 10.5, -20.0, "shed"),
    airSpawn(14.5, 10.0, -22.0, "shed"),
    airSpawn(-2.0, 12.5, -8.5, "shed"),

    // 码头区域 (Quay)
    groundSpawn(27.7, -24.2, "quay"),
    groundSpawn(18.3, -25.4, "quay"),
    groundSpawn(27.2, -12.6, "quay"),
    groundSpawn(20.2, 14.0, "quay"),
    groundSpawn(23.4, 23.2, "quay"),
    groundSpawn(18.0, 24.4, "quay"),
    groundSpawn(27.4, 11.6, "quay"),
    airSpawn(36.0, 9.0, 4.0, "quay"),
    airSpawn(38.0, 11.0, -6.0, "quay"),
    airSpawn(35.0, 8.5, 16.0, "quay"),
    airSpawn(24.0, 12.5, 10.5, "quay"),
    airSpawn(33.5, 10.0, 24.5, "quay"),
    airSpawn(22.0, 13.0, -14.0, "quay"),
  ];

  // 6. 四大战术区域定义 (4 Combat Zones)
  const zones = [
    { name: "gate", min: [-40, -30], max: [-24, 30] },
    { name: "yard", min: [-24, -10], max: [16, 30] },
    { name: "shed", min: [-24, -30], max: [16, -10] },
    { name: "quay", min: [16, -30], max: [40, 30] },
  ];

  // 7. 空间声学室内遮挡盒 (Interior Acoustic Boxes for Audio Engine Occlusion)
  const interiorBoxes = [
    {
      min: v3(WAREHOUSE_SPECS.X0, 0, WAREHOUSE_SPECS.Z0),
      max: v3(WAREHOUSE_SPECS.X1, WAREHOUSE_SPECS.RIDGE, WAREHOUSE_SPECS.Z1),
    },
  ];

  // 8. 战术掩体点网络 (Tactical Cover Points Network)
  const coverPoints = [
    v3(-33.9, 0, 3.8),
    v3(-27.3, 0, 2.3),
    v3(-19.2, 0, 4.7),
    v3(-17.4, 0, 4.9),
    v3(-12.5, 0, 7.2),
    v3(-9.3, 0, 6.4),
    v3(-6.3, 0, 7.3),
    v3(-2.9, 0, 6.1),
    v3(-2.9, 0, 4.5),
    v3(5.6, 0, 5.8),
    v3(5.6, 0, 4.2),
    v3(-2.2, 0, 10.4),
    v3(5.0, 0, 8.9),
    v3(-4.8, 0, 10.6),
    v3(7.5, 0, 7.7),
    v3(9.2, 0, 4.4),
    v3(-1.0, 0, 13.6),
    v3(-13.5, 0, -1.5),
    v3(-9.6, 0, -0.7),
    v3(7.8, 0, -1.5),
    v3(-4.2, 0, -2.2),
    v3(-0.9, 0, -6.7),
    v3(-6.7, 0, -7.0),
    v3(1.2, 0, -8.9),
    v3(-8.1, 0, 15.4),
    v3(0.6, 0, 16.9),
    v3(4.2, 0, 15.7),
    v3(-16.0, 0, 15.6),
    v3(12.0, 0, 17.2),
    v3(2.9, 0, -17.0),
    v3(4.2, 0, -15.3),
    v3(6.9, 0, -20.6),
    v3(-7.6, 0, -17.4),
    v3(-8.3, 0, -14.3),
    v3(9.6, 0, -21.9),
    v3(-13.2, 0, -14.4),
    v3(-11.6, 0, -18.6),
    v3(0, 0, -25.8),
    v3(-12.4, 0, -25.8),
    v3(21.4, 0, -4.7),
    v3(25.3, 0, 3.9),
    v3(25.7, 0, -4.4),
    v3(20.2, 0, -15.4),
    v3(26.4, 0, -15.4),
    v3(20.6, 0, 14.4),
    v3(26.8, 0, 14.4),
    v3(20.6, 0, 21.2),
    v3(27.4, 0, 22.4),
    v3(19.6, 0, -21.4),
    v3(27.0, 0, -16.2),
    v3(25.6, 0, 6.0),
    v3(13.5, 2.59, 12.4),
    v3(4.4, 2.59, 12.4),
    v3(12.9, 0, 8.8),
    v3(11.6, 0, 4.9),
  ];

  // 贴合物理寻路可达网格校验 (Snap Cover & Spawns to Walkable Navmesh)
  const navmesh = engineCtx.physics.nav;
  const snapToNavmesh = (pt) => {
    if (!navmesh || !navmesh.isWalkable || pt.y > 0.2 || navmesh.isWalkable(pt.x, pt.z)) return;
    for (const radius of [0.5, 1.0, 1.5, 2.0]) {
      for (let angleIdx = 0; angleIdx < 8; angleIdx++) {
        const testX = pt.x + Math.cos(angleIdx * 0.7854) * radius;
        const testZ = pt.z + Math.sin(angleIdx * 0.7854) * radius;
        if (navmesh.isWalkable(testX, testZ)) {
          pt.x = testX;
          pt.z = testZ;
          return;
        }
      }
    }
  };
  coverPoints.forEach(snapToNavmesh);
  enemySpawns.forEach((s) => {
    if (s.type === "ground") snapToNavmesh(s.pos);
  });

  // 9. 电影级巡检航拍运镜轨迹 (12 Cinematic Waypoint Path)
  const cinematicPath = [
    { pos: [-34.0, 1.6, 6.2], look: [-12.0, 2.6, 6.6] },
    { pos: [-20.0, 1.3, 5.6], look: [0.0, 2.2, 7.0] },
    { pos: [-6.2, 2.1, 7.9], look: [2.0, 1.6, 7.6] },
    { pos: [-6.6, 2.5, 0.4], look: [-4.0, 2.6, -12.0] },
    { pos: [-4.4, 1.9, -8.6], look: [-2.4, 2.8, -19.5] },
    { pos: [-3.2, 2.2, -15.0], look: [-2.0, 2.2, -20.5] },
    { pos: [4.2, 2.6, -19.6], look: [12.0, 3.2, -19.5] },
    { pos: [15.0, 2.0, -19.5], look: [24.0, 3.5, -6.0] },
    { pos: [20.2, 1.7, -9.0], look: [23.0, 1.6, 0.0] },
    { pos: [25.9, 1.8, 1.5], look: [27.5, 1.2, 12.0] },
    { pos: [27.3, 1.8, 12.0], look: [29.6, 0.4, 20.0] },
    { pos: [28.4, 1.9, 17.2], look: [31.5, -0.8, 21.0] },
  ];

  let hasWarnedPropError = false;

  return {
    root,
    playerStart: { pos: v3(-32.0, 0, 6.0), yaw: -Math.PI / 2 },
    objectives,
    extraction: { pos: quayData.extraction.clone(), radius: 2.5 },
    enemySpawns,
    zones,
    interiorBoxes,
    cinematicPath,
    coverPoints,
    skylights: shedData.skylights,
    shedLights: shedData.lights,
    vantage: { stairsFoot: v3(-2.2, 0, 12.4), roof: v3(13.5, 2.59, 12.4) },
    stats: {
      labelsAtlased: atlasInfo.count,
      containers: builder.placed.filter((p) => p.name.startsWith("container")).length,
      props: builder.placed.length,
      tris: Math.round(totalTris),
      meshes: mergedMesh.children.length + countMeshes(builder.dynRoot),
    },
    placed: builder.placed,
    groundSurfaceAt(x, z) {
      return builder.isMetal(x, z) ? "metal" : "concrete";
    },
    update(dt) {
      shedData.update(dt);
      atlasInfo.update();
      for (let i = 0; i < builder.updaters.length; i++) {
        try {
          builder.updaters[i](dt);
        } catch (err) {
          if (!hasWarnedPropError) {
            hasWarnedPropError = true;
            console.error("[level] prop update threw", err);
          }
        }
      }
    },
  };
}

/**
 * 递归统计节点包含的网格数
 */
function countMeshes(obj) {
  let count = 0;
  obj.traverse((n) => {
    if (n.isMesh) count++;
  });
  return count;
}

/**
 * 场景展示厅与测试运行器
 */
export async function showcaseLevel(engineCtx) {
  const level = await createLevel(engineCtx);
  return {
    cam: [-32, 1.7, 6],
    target: [0, 2.4, 6.4],
    update: (dt) => level.update(dt),
  };
}

// 统一导出兼容对象 (ESM Exports)
export const create = createLevel;
export const showcase = showcaseLevel;

const cv = {
  create: createLevel,
  showcase: showcaseLevel,
};
export { cv };

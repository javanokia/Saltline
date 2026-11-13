/**
 * @file src/level.js
 * @description 几猫四号泊位港区战术场景与关卡程序化装配引擎 (Berth 4 Tactical Seaport Level Engine)
 *
 * 【架构解耦模块体系】
 * - ./level/constants.js: 宏观规格尺寸、仓库/码头建筑参数与多地图预设
 * - ./level/builder.js: 关卡建造上下文环境 (Level Builder Context) 与合批碰撞管线
 * - ./level/yard.js: 露天集装箱堆场、战术迷宫与前哨堡垒生成器
 * - ./level/structures.js: 港区出入口哨所、围栏边界与钢结构封闭仓库
 * - ./level/quay.js: 深水码头岸壁、起重机钢轨、系船柱与登船撤离快艇
 * - ./level/labels.js: 动态 Canvas 贴花图集化合并优化器 (Label Texture Atlas)
 */

import * as THREE from "three";
import { mergeStaticMeshHierarchy } from "./geo.js";

// 子系统导入 (Subsystem Imports)
import {
  HALF_PI,
  DYNAMIC_PHYSICS_PROPS,
  WAREHOUSE_SPECS,
  WAREHOUSE_COLUMN_X,
  DOORWAY_SPECS_YARD,
  DOORWAY_SPECS_QUAY,
  ROOF_SKYLIGHT_SPECS,
  QUAY_SPECS,
  LEVEL_PRESETS,
} from "./level/constants.js";
import { createLevelBuilderContext } from "./level/builder.js";
import {
  buildContainerYard,
  buildProceduralContainerMaze,
  buildOutpostFortress,
} from "./level/yard.js";
import { buildPerimeterGate, buildWarehouseShed } from "./level/structures.js";
import { buildDeepwaterQuay } from "./level/quay.js";
import { buildLabelAtlas } from "./level/labels.js";

/**
 * 快速创建 Vector3 辅助函数
 */
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * 异步初始化战术场景与关卡
 * @param {object} engineCtx 全局引擎上下文
 * @param {object} [options={}] 关卡自定配置 (含 map, seed)
 */
export async function createLevel(engineCtx, options = {}) {
  const root = new THREE.Group();
  root.name = "level";
  engineCtx.scene.add(root);

  const builder = createLevelBuilderContext(engineCtx);

  const mapType =
    options.map ||
    engineCtx.params?.map ||
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("map")) ||
    "berth4";

  const levelSeed = +(
    options.seed ||
    engineCtx.params?.seed ||
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("seed")) ||
    1337
  );

  let relayPosA = { x: 1.5, z: 7.5 };

  // 1. 建造四大区域 (Build 4 Zones)
  if (mapType === "maze") {
    relayPosA = buildProceduralContainerMaze(builder, levelSeed);
  } else if (mapType === "outpost") {
    relayPosA = buildOutpostFortress(builder, levelSeed);
  } else {
    relayPosA = buildContainerYard(builder);
  }
  buildPerimeterGate(builder);
  const shedData = buildWarehouseShed(builder);
  const quayData = buildDeepwaterQuay(builder);

  // 2. 放置 3 处核心战术中继站 (Place 3 Tactical Relay Objectives)
  const relayNodeA = builder.place("relay_node", relayPosA.x, relayPosA.z, 0.35, { seed: 1 }, 0);
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
    const meshNode = /** @type {THREE.Mesh} */ (node);
    if (meshNode.isMesh) {
      const geo = meshNode.geometry;
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
    groundSpawn(-11.0, -22.0, "shed"),
    groundSpawn(4.0, -22.0, "shed"),
    groundSpawn(-2.0, -16.0, "shed"),
    groundSpawn(6.0, -16.0, "shed"),
    groundSpawn(-8.0, -25.0, "shed"),
    groundSpawn(2.0, -25.0, "shed"),
    groundSpawn(-14.0, -18.0, "shed"),
    groundSpawn(9.0, -18.0, "shed"),
    airSpawn(-2.0, 6.0, -19.5, "shed"),
    airSpawn(4.0, 6.0, -19.5, "shed"),
    airSpawn(-8.0, 6.0, -19.5, "shed"),

    // 码头前沿 (Quay)
    groundSpawn(23.5, 8.0, "quay"),
    groundSpawn(23.5, 18.0, "quay"),
    groundSpawn(23.5, -8.0, "quay"),
    groundSpawn(23.5, -20.0, "quay"),
    groundSpawn(27.0, 0.0, "quay"),
    groundSpawn(27.0, 12.0, "quay"),
    groundSpawn(27.0, -14.0, "quay"),
    groundSpawn(20.0, 4.0, "quay"),
    groundSpawn(20.0, -12.0, "quay"),
    airSpawn(28.0, 10.0, 15.0, "quay"),
    airSpawn(28.0, 10.0, -15.0, "quay"),
    airSpawn(32.0, 8.0, 0.0, "quay"),
    airSpawn(24.0, 12.0, 22.0, "quay"),
    airSpawn(24.0, 12.0, -22.0, "quay"),

    // 闸口出入口 (Gate)
    groundSpawn(-30.0, 6.0, "gate"),
    groundSpawn(-34.0, 4.0, "gate"),
  ];

  // 6. 空间战术分区边界包围盒 (Tactical Zones Bounding Boxes)
  const zones = {
    gate: new THREE.Box3(v3(-40, 0, -30), v3(-24, 15, 30)),
    yard: new THREE.Box3(v3(-24, 0, -10), v3(16, 15, 30)),
    shed: new THREE.Box3(
      v3(WAREHOUSE_SPECS.X0, 0, WAREHOUSE_SPECS.Z0),
      v3(WAREHOUSE_SPECS.X1, WAREHOUSE_SPECS.RIDGE, WAREHOUSE_SPECS.Z1),
    ),
    quay: new THREE.Box3(v3(16, 0, -30), v3(40, 15, 30)),
  };

  // 7. 室内声学与光照检测盒 (Interior Sound Reverb & Shadow Occlusion Box)
  const interiorBoxes = [
    new THREE.Box3(
      v3(WAREHOUSE_SPECS.X0, 0, WAREHOUSE_SPECS.Z0),
      v3(WAREHOUSE_SPECS.X1, WAREHOUSE_SPECS.RIDGE, WAREHOUSE_SPECS.Z1),
    ),
  ];

  // 8. 战术掩护掩体点网络 (Tactical Cover Points Network)
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
    mapPreset: mapType,
    seed: levelSeed,
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

export {
  HALF_PI,
  DYNAMIC_PHYSICS_PROPS,
  WAREHOUSE_SPECS,
  WAREHOUSE_COLUMN_X,
  DOORWAY_SPECS_YARD,
  DOORWAY_SPECS_QUAY,
  ROOF_SKYLIGHT_SPECS,
  QUAY_SPECS,
  LEVEL_PRESETS,
  createLevelBuilderContext,
  buildContainerYard,
  buildProceduralContainerMaze,
  buildOutpostFortress,
  buildPerimeterGate,
  buildWarehouseShed,
  buildDeepwaterQuay,
  buildLabelAtlas,
};

const cv = {
  create: createLevel,
  showcase: showcaseLevel,
};
export { cv };

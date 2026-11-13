/**
 * @file src/props.js
 * @description 几猫四号泊位港区工业场景与物流道具程序化建模引擎 (Berth 4 Procedural Industrial Props Engine)
 *
 * 【系统职责】
 * 承担全游戏所有港口工业资产的程序化 3D 几何建模、顶点色彩光影着色与物理碰撞体装配：
 * 1. 零外部 3D 模型资产 (Zero External 3D Models) —— 100% 运行时内存即时几何体生成。
 * 2. ISO 6346 标准集装箱（20尺/40尺/40尺高柜），包含精确梯形波纹钢板、ISO 1161 角件、双开货运门与开门可进入碰撞体。
 * 3. 港口重工业基础设施：14米格构式高杆投光灯塔、新泽西防撞隔离墩、安全护栏、出入口电动道闸、门禁岗亭、重型大吨位系泊桩。
 * 4. 物流与仓储货运：EUR 欧标木托盘与堆叠、木制包装箱、1000L IBC 液体吨桶、电缆盘、轮胎堆、防雨布苫盖货物堆、沙袋防御掩体、纸箱堆。
 * 5. 重工业特种机械：3.5吨柴油电动叉车、静音应急柴油发电机组、工业垃圾箱、多层移动维修工具车。
 * 6. 统一物理碰撞网格装配：为所有道具自动输出 AABB 物理包围盒、地面物理表面属性（metal, concrete, wood, rubber, dirt）。
 */

import * as THREE from "three";
import { createBoxGeometry, createMeshWithShadows } from "./geo.js";
import { PROP_SIZES, withCachedPrototype, prototypeCache } from "./props/builder.js";
import { buildContainerMesh } from "./props/containers.js";
import {
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
} from "./props/structures.js";
import {
  buildBarrel,
  buildPallet,
  buildPalletStack,
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
} from "./props/industrial.js";

// 道具构建器注册表
const PROP_BUILDERS = {};

/**
 * 注册自定义道具构建器函数
 */
export function registerPropBuilder(name, builderFn) {
  PROP_BUILDERS[name] = builderFn;
}

// 自动完成全道具构建器的初始化挂载注册
(function initializePropRegistry() {
  // 1. 集装箱系列
  for (const t of ["container20", "container40", "container40hc"]) {
    registerPropBuilder(t, (ctx, opts) => buildContainerMesh(ctx, t, opts));
  }
  // 2. 港区基础设施
  registerPropBuilder("jersey_barrier", buildJerseyBarrier);
  registerPropBuilder("light_mast", buildLightMast);
  registerPropBuilder("fence_panel", buildFencePanel);
  registerPropBuilder("guard_booth", buildGuardBooth);
  registerPropBuilder("gate_arm", buildGateArm);
  registerPropBuilder("bollard_mooring", buildBollardMooring);
  registerPropBuilder("bollard_post", buildBollardPost);
  registerPropBuilder("sign_post", buildSignPost);
  registerPropBuilder("floodlight_stand", buildFloodlightStand);
  registerPropBuilder("stairs_metal", buildStairsMetal);
  registerPropBuilder("catwalk", buildCatwalk);
  registerPropBuilder("shelf_rack", buildShelfRack);
  registerPropBuilder("reefer_unit", buildReeferUnit);
  registerPropBuilder("relay_node", buildRelayNode);

  // 3. 物流与仓储货物
  registerPropBuilder("barrel", (ctx, opts = {}) =>
    withCachedPrototype(
      `barrel|${opts.color}|${!!opts.lying}|${!!opts.open}|${Math.abs(opts.seed | 0) % 4}`,
      () => buildBarrel(ctx, opts, Math.abs(opts.seed | 0) % 4),
    ),
  );
  registerPropBuilder("pallet", (ctx, opts = {}) =>
    withCachedPrototype(`pallet|${!!opts.broken}|${Math.abs(opts.seed | 0) % 4}`, () =>
      buildPallet(ctx, opts, Math.abs(opts.seed | 0) % 4),
    ),
  );
  registerPropBuilder("pallet_stack", buildPalletStack);
  registerPropBuilder("crate_wood", buildCrateWood);
  registerPropBuilder("crate_stack", buildCrateStack);
  registerPropBuilder("ibc_tote", buildIbcTote);
  registerPropBuilder("cable_reel", buildCableReel);
  registerPropBuilder("tire_stack", buildTireStack);
  registerPropBuilder("jerry_can", (ctx, opts = {}) =>
    withCachedPrototype(`jerry|${opts.color}|${Math.abs(opts.seed | 0) % 2}`, () =>
      buildJerryCan(ctx, opts, Math.abs(opts.seed | 0) % 2),
    ),
  );
  registerPropBuilder("traffic_cone", (ctx, opts = {}) =>
    withCachedPrototype(`cone|${!!opts.lying}|${Math.abs(opts.seed | 0) % 3}`, () =>
      buildTrafficCone(ctx, opts, Math.abs(opts.seed | 0) % 3),
    ),
  );
  registerPropBuilder("gas_cylinders", buildGasCylinders);
  registerPropBuilder("pipe_stack", buildPipeStack);
  registerPropBuilder("tarp_cargo", buildTarpCargo);
  registerPropBuilder("sandbags", buildSandbags);
  registerPropBuilder("cardboard_boxes", buildCardboardBoxes);

  // 4. 重工业机械与车辆
  registerPropBuilder("forklift", buildForklift);
  registerPropBuilder("generator", buildGenerator);
  registerPropBuilder("dumpster", buildDumpster);
  registerPropBuilder("toolbox_cart", buildToolboxCart);
})();

/**
 * 道具系统主工厂接口
 */
export function createPropsManager(engineCtx) {
  return {
    names: () => Object.keys(PROP_SIZES),
    has: (name) => !!PROP_SIZES[name],
    build(name, opts = {}) {
      if (PROP_BUILDERS[name]) {
        try {
          const res = PROP_BUILDERS[name](engineCtx, opts);
          if (res) {
            res.userData.prop = name;
            return res;
          }
        } catch (err) {
          console.error(`[props] builder "${name}" threw`, err);
        }
      }
      const def = PROP_SIZES[name] || [1, 1, 1, "concrete", "concrete"];
      if (!PROP_SIZES[name]) console.warn(`[props] unknown prop "${name}"`);
      const fallback = new THREE.Group();
      fallback.add(
        createMeshWithShadows(
          createBoxGeometry(def[0], def[1], def[2], "bottom"),
          engineCtx.mats.get(def[3]),
        ),
      );
      fallback.userData.colliders = [
        {
          min: [-def[0] / 2, 0, -def[2] / 2],
          max: [def[0] / 2, def[1], def[2] / 2],
          surface: def[4],
        },
      ];
      fallback.userData.size = [def[0], def[1], def[2]];
      fallback.userData.prop = name;
      return fallback;
    },
  };
}

/**
 * 道具展示厅与阵列预览
 */
export function showcaseProps(engineCtx) {
  const names = engineCtx.params.names
    ? engineCtx.params.names.split(",")
    : Object.keys(PROP_SIZES);
  let curX = 0,
    curZ = 0,
    rowMaxZ = 0,
    totalWidth = 0;

  for (const name of names) {
    const mesh = engineCtx.props.build(name, {
      seed: 7,
      doors: name.startsWith("container") ? 0.6 : 0,
    });
    const size = mesh.userData.size || PROP_SIZES[name] || [1, 1, 1];
    if (curX + size[0] > 26) {
      curX = 0;
      curZ += rowMaxZ + 1.5;
      rowMaxZ = 0;
    }
    mesh.position.set(curX + size[0] / 2, 0, curZ);
    engineCtx.scene.add(mesh);
    curX += size[0] + 1;
    rowMaxZ = Math.max(rowMaxZ, size[2]);
    totalWidth = Math.max(totalWidth, curX);
  }

  const midX = Math.min(totalWidth, 26) / 2;
  return {
    cam: [midX - 4, 2.2, curZ + rowMaxZ + 6],
    target: [midX, 1, curZ / 2],
  };
}

// 统一导出兼容对象 (ESM Exports)
export const create = createPropsManager;
export const register = registerPropBuilder;
export const showcase = showcaseProps;

const $g = {
  PROP_SIZES,
  PROP_BUILDERS,
  create: createPropsManager,
  register: registerPropBuilder,
  showcase: showcaseProps,
};
export { $g, PROP_SIZES, PROP_BUILDERS, withCachedPrototype, prototypeCache };

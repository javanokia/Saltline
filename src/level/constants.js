/**
 * @file src/level/constants.js
 * @description 港区战术关卡宏观规格、建筑结构尺寸与地图预设常量
 */

export const HALF_PI = Math.PI / 2;

/**
 * 具有独立物理刚体模拟的轻质动态道具类型
 */
export const DYNAMIC_PHYSICS_PROPS = new Set(["traffic_cone", "jerry_can"]);

/**
 * 大型集装箱仓库建筑结构几何参数 (Warehouse Shed Architecture Specs)
 */
export const WAREHOUSE_SPECS = {
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
export const WAREHOUSE_COLUMN_X = [-16, -11.1, -6.2, -0.8, 5.6, 12];

/**
 * 仓库正面通往堆场的重型卷帘工业大门 (Yard-side Rolling Shutter Doorway)
 */
export const DOORWAY_SPECS_YARD = { x0: -6, x1: -1, h: 5.0 };

/**
 * 仓库侧面通往深水码头的重型工业移门 (Quay-side Sliding Doorway)
 */
export const DOORWAY_SPECS_QUAY = { z0: -22, z1: -17, h: 4.5 };

/**
 * 仓库屋顶高透光采光天窗排布 (Roof Pitch Skylights: ['S'|'N', pitchTier, bayIdx])
 * @type {Array<['S' | 'N', number, number]>}
 */
export const ROOF_SKYLIGHT_SPECS = [
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
export const QUAY_SPECS = {
  X: 30.0, // 码头前沿垂直岸壁 X (X > 30 为开阔海域)
  LADDER_Z: 20.0, // 撤离艇登艇钢梯 Z 坐标
  RAILS: [18.5, 28.5], // 岸桥重型轨道中心距 (跨距 10m)
  Z0: -30.0, // 泊位北端界限
  Z1: 28.0, // 泊位南端界限 (总长度 58m)
};

/**
 * 多关卡模式预设地图注册表
 */
export const LEVEL_PRESETS = {
  berth4: { id: "berth4", name: "四号深水泊位 (Berth 4 Standard)" },
  maze: { id: "maze", name: "集装箱战术迷宫 (Container Tactical Labyrinth)" },
  outpost: { id: "outpost", name: "哨所防卫前哨 (Perimeter Outpost Fortress)" },
};

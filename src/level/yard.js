/**
 * @file src/level/yard.js
 * @description 露天集装箱堆场、战术迷宫与前哨堡垒生成器
 */

export function buildContainerYard(levelBuilder) {
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
  return { x: 1.5, z: 7.5 };
}

/**
 * 组装程序化随机集装箱战术迷宫 (Procedural Container Labyrinth Yard)
 * @param {object} levelBuilder 场景构建上下文
 * @param {number} [seed=1337] 随机种子
 * @returns {{ x: number, z: number }} 中继站 A 放置坐标
 */
export function buildProceduralContainerMaze(levelBuilder, seed = 1337) {
  const place = levelBuilder.place;
  const stack = levelBuilder.stack;

  // 确定性随机发生器
  let s = seed >>> 0;
  const rng = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const colors = ["green", "grey", "orange", "blue", "red", "teal", "yellow", "white"];
  const pickColor = () => colors[Math.floor(rng() * colors.length)];

  // 迷宫纵横主通道轴线坐标网格 (X: -20m ~ 14m, Z: -5m ~ 20m)
  const rowZ = [-5.12, 1.5, 8.2, 14.8, 20.5];
  const colX = [-19.5, -13.5, -6.5, 0.5, 7.5, 13.5];

  // 战术保留空地 (通道与中继广场)
  const isProtectedCorridor = (x, z) => {
    if (x < -16 && z >= 4 && z <= 8) return true;
    if (x >= -7 && x <= 0 && z < 0) return true;
    if (x > 11 && z >= 4 && z <= 10) return true;
    if (x >= -2 && x <= 3 && z >= 6 && z <= 9) return true;
    return false;
  };

  // 生成迷宫集装箱垛墙
  for (let r = 0; r < rowZ.length; r++) {
    for (let c = 0; c < colX.length; c++) {
      const x = colX[c] + (rng() - 0.5) * 0.8;
      const z = rowZ[r] + (rng() - 0.5) * 0.6;

      if (isProtectedCorridor(x, z)) continue;

      if (rng() < 0.76) {
        const height = 1 + Math.floor(rng() * 2.8);
        const is40ft = rng() < 0.45;
        const lengthType = is40ft ? 40 : 20;
        const rotY = rng() < 0.35 ? Math.PI / 2 : 0;

        const stackLayers = [];
        for (let h = 0; h < height; h++) {
          const isReefer = h === 0 && rng() < 0.25;
          const openDoors = h === 0 && rng() < 0.2 ? 0.75 : 0;
          stackLayers.push([
            lengthType,
            pickColor(),
            { reefer: isReefer, doors: openDoors, flip: rng() < 0.5 },
          ]);
        }
        stack(x, z, stackLayers, rotY, 0.3);
      }
    }
  }

  // 搭建中央与制高点连廊战术钢梯
  levelBuilder.stairs(-0.5, 12.0, 0, 0, { seed: seed + 1 });
  levelBuilder.catwalk(8.5, 12.0, 0, 2.54, { seed: seed + 2 });
  for (const cx of [7.2, 10.0]) {
    for (const cz of [11.5, 12.5]) {
      levelBuilder.rod("steel_dark", [cx, 0, cz], [cx, 2.54, cz], 0.04);
    }
  }

  // 中央中继点周围防御掩体工事
  place("sandbags", 0.5, 6.2, 0, { courses: 5, seed: seed + 3 });
  place("sandbags", 2.2, 7.5, Math.PI / 2, { courses: 5, seed: seed + 4 });
  place("sandbags", 0.5, 8.8, Math.PI, { courses: 4, seed: seed + 5 });

  // 散落战术物资道具
  place("forklift", -4.2, 5.5, 0.4, { color: "yellow", forksUp: 0.25, seed: seed + 6 });
  place("generator", 8.0, -1.5, -0.2, { color: "yellow", seed: seed + 7 });
  place("toolbox_cart", -7.5, 8.2, 1.1, { color: "red", seed: seed + 8 });
  place("barrel", -2.2, 3.8, 0, { color: "blue", seed: seed + 9 });
  place("barrel", -1.5, 4.1, 0, { color: "red", lying: true, seed: seed + 10 });
  place("cable_reel", 10.2, 7.0, 0.8, { seed: seed + 11 });
  place("dumpster", -15.8, 17.5, 0, { color: "green", seed: seed + 12 });
  place("tire_stack", -9.0, 15.0, 0, { count: 4, seed: seed + 13 });
  place("ibc_tote", 5.8, 16.0, 0.15, { seed: seed + 14 });
  place("tarp_cargo", -10.8, 20.5, 0, { seed: seed + 15 });

  // 迷宫高杆投光灯塔
  place("light_mast", 0.5, 17.5, 0, { on: true, seed: seed + 16 });

  return { x: 0.5, z: 7.5 };
}

/**
 * 组装哨所防卫前哨堡垒布局 (Perimeter Outpost Fortress Yard)
 * @param {object} levelBuilder 场景构建上下文
 * @param {number} [seed=1337] 随机种子
 * @returns {{ x: number, z: number }} 中继站 A 放置坐标
 */
export function buildOutpostFortress(levelBuilder, seed = 1337) {
  const place = levelBuilder.place;
  const stack = levelBuilder.stack;

  // 西侧主防御堡垒围墙
  stack(
    -18.5,
    -4.0,
    [
      [40, "teal"],
      [40, "grey"],
    ],
    Math.PI / 2,
  );
  stack(
    -18.5,
    10.0,
    [
      [40, "blue"],
      [40, "red"],
    ],
    Math.PI / 2,
  );

  // 北侧双层集装箱屏障
  stack(-12.0, 18.0, [
    [40, "orange"],
    [40, "teal"],
  ]);
  stack(2.0, 18.0, [
    [40, "green"],
    [40, "yellow"],
  ]);

  // 核心机枪掩体与前哨了望塔
  levelBuilder.stairs(1.0, 12.0, 0, 0, { seed: seed + 1 });
  levelBuilder.catwalk(1.0, 15.5, Math.PI / 2, 2.54, { seed: seed + 2 });
  stack(1.0, 18.0, [
    [20, "white", { doors: 0.8 }],
    [20, "blue"],
  ]);

  // 防御沙袋群与重工业装备
  place("sandbags", -2.5, 5.0, 0.2, { courses: 5, seed: seed + 3 });
  place("sandbags", 5.5, 5.0, -0.2, { courses: 5, seed: seed + 4 });
  place("forklift", -6.0, 4.0, 0.8, { color: "yellow", forksUp: 0.4, seed: seed + 5 });
  place("generator", 7.5, 3.5, 0, { color: "yellow", seed: seed + 6 });
  place("barrel", 0.0, 4.0, 0, { color: "red", seed: seed + 7 });
  place("barrel", 0.6, 4.2, 0, { color: "blue", lying: true, seed: seed + 8 });
  place("light_mast", -1.0, 16.0, 0, { on: true, seed: seed + 9 });

  return { x: 1.5, z: 7.5 };
}

// ============================================================================
// 四、 港区边界与出入口哨所构建 (Perimeter Gate & Security Booth: fR)
// ============================================================================

/**
 * 组装出入口哨所与防攀爬护栏 (Gate, Security Barrier, Fences & Warning Signs)
 */

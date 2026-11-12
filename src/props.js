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

import * as THREE from 'three';

import {
  oi, Mn, en, Pi, vf, zc, Pr, zy, Dy, il,
  Zn, bi, Fo, sl, kn, Wt, dr
} from './constants.js';

import {
  sa, Ly, oa, $e, Wi, ot, Fn, ky, Fy, Uy, Ny, Fg, Dc, Lc, Ii, By, Qi
} from './geo.js';

// ============================================================================
// 一、 标准工业道具尺寸与物理属性配置表 (Standard Prop Specifications Table)
// ============================================================================

/**
 * 道具尺寸规范字典
 * 格式: [宽 X, 高 Y, 深 Z, 默认材质名称, 物理碰撞表面类型]
 */
export const PROP_SIZES = {
  // ISO 集装箱系列 (Shipping Containers)
  container20:      [6.06,  2.59, 2.44,  "paint_red",       "metal"],
  container40:      [12.19, 2.59, 2.44,  "paint_blue",      "metal"],
  container40hc:    [12.19, 2.90, 2.44,  "paint_green",     "metal"],

  // 港区重工业基础设施 (Port Infrastructure)
  jersey_barrier:   [3.00,  0.81, 0.60,  "concrete",        "concrete"],
  light_mast:       [0.50,  14.0, 0.50,  "steel_galv",      "metal"],
  fence_panel:      [3.00,  2.40, 0.08,  "chainlink",       "metal"],
  guard_booth:      [2.60,  2.70, 2.20,  "paint_white",     "metal"],
  gate_arm:         [5.00,  1.10, 0.30,  "hazard_stripes",  "metal"],
  bollard_mooring:  [0.70,  0.60, 0.70,  "steel_dark",      "metal"],
  bollard_post:     [0.17,  1.00, 0.17,  "paint_yellow",    "metal"],
  sign_post:        [0.60,  2.40, 0.08,  "paint_white",     "metal"],
  floodlight_stand: [1.00,  2.20, 1.00,  "paint_yellow",    "metal"],
  stairs_metal:     [3.00,  2.60, 1.00,  "diamond_plate",   "metal"],
  catwalk:          [3.00,  1.10, 1.20,  "diamond_plate",   "metal"],
  shelf_rack:       [2.70,  4.20, 1.10,  "paint_orange",    "metal"],
  reefer_unit:      [0.50,  2.30, 2.30,  "paint_white",     "metal"],
  relay_node:       [1.20,  2.40, 0.80,  "paint_grey",      "metal"],

  // 仓储物流与货物 (Logistics & Cargo)
  barrel:           [0.60,  0.90, 0.60,  "paint_blue",      "metal"],
  pallet:           [1.20,  0.144,1.00,  "wood_pallet",     "wood"],
  pallet_stack:     [1.20,  1.15, 1.00,  "wood_pallet",     "wood"],
  crate_wood:       [1.10,  1.00, 0.90,  "wood_pallet",     "wood"],
  crate_stack:      [1.20,  1.90, 1.00,  "wood_pallet",     "wood"],
  ibc_tote:         [1.20,  1.16, 1.00,  "plastic_grey",    "metal"],
  cable_reel:       [1.30,  1.30, 0.80,  "wood_dark",       "wood"],
  tire_stack:       [0.80,  1.00, 0.80,  "tire",            "rubber"],
  jerry_can:        [0.35,  0.47, 0.17,  "paint_green",     "metal"],
  traffic_cone:     [0.36,  0.70, 0.36,  "plastic_red",     "rubber"],
  gas_cylinders:    [0.90,  1.60, 0.50,  "steel_dark",      "metal"],
  pipe_stack:       [6.00,  0.90, 1.20,  "steel_rust",      "metal"],
  tarp_cargo:       [2.40,  1.50, 1.40,  "tarp",            "dirt"],
  sandbags:         [2.00,  0.90, 0.60,  "tarp",            "dirt"],
  cardboard_boxes:  [1.00,  0.80, 0.80,  "cardboard",       "wood"],

  // 重型设备与车辆 (Machinery & Vehicles)
  forklift:         [3.40,  2.20, 1.25,  "paint_yellow",    "metal"],
  generator:        [2.20,  1.40, 1.00,  "paint_yellow",    "metal"],
  dumpster:         [1.90,  1.35, 1.10,  "paint_green",     "metal"],
  toolbox_cart:     [0.90,  0.95, 0.50,  "plastic_red",     "metal"]
};

// 内部道具构建器注册表 (Internal Registry)
const PROP_BUILDERS = {};

// ============================================================================
// 二、 数学与程序化噪波基础算法 (Math & Procedural Noise Primitives)
// ============================================================================

const PI = Math.PI;
const HALF_PI = Math.PI / 2;

/**
 * 有界截断函数
 */
const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

/**
 * 平滑 Hermite 插值
 */
const smoothstepHermite = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * 3D 线性插值
 */
const lerpVec3 = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];

/**
 * 道具确定性伪随机数发生器 (Deterministic Linear Hash PRNG)
 */
function createPropPRNG(seed = 0) {
  let s = ((seed | 0) * 2654435761) | 0;
  return () => {
    s = (s + 1831565813) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 2D 坐标离散哈希函数
 */
function hash2D(x, y) {
  const t = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return t - Math.floor(t);
}

/**
 * 2D 平滑网格数值噪波 (2D Value Noise)
 */
function sampleValueNoise2D(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const wx = fx * fx * (3 - 2 * fx);
  const wy = fy * fy * (3 - 2 * fy);
  const h00 = hash2D(ix, iy);
  const h10 = hash2D(ix + 1, iy);
  const h01 = hash2D(ix, iy + 1);
  const h11 = hash2D(ix + 1, iy + 1);
  return h00 + (h10 - h00) * wx + (h01 - h00) * wy + (h00 - h10 - h01 + h11) * wx * wy;
}

/**
 * 3D 快速整数哈希
 */
function hash3D(x, y, z) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/**
 * 3D 平滑三线性网格噪波 (3D Trilinear Gradient Noise)
 */
function sampleSimplexNoise3D(x, y = 0, z = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  let fx = x - ix;
  let fy = y - iy;
  let fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);
  const mix = (u, v, t) => u + (v - u) * t;
  return mix(
    mix(
      mix(hash3D(ix, iy, iz), hash3D(ix + 1, iy, iz), fx),
      mix(hash3D(ix, iy + 1, iz), hash3D(ix + 1, iy + 1, iz), fx),
      fy
    ),
    mix(
      mix(hash3D(ix, iy, iz + 1), hash3D(ix + 1, iy, iz + 1), fx),
      mix(hash3D(ix, iy + 1, iz + 1), hash3D(ix + 1, iy + 1, iz + 1), fx),
      fy
    ),
    fz
  );
}

// ============================================================================
// 三、 几何体生成与顶点变换算法 (Procedural Geometry Generators)
// ============================================================================

/**
 * 创建高精度倒角立方体网格 (Chamfered Beveled Box BufferGeometry)
 * @param {number} width 宽度
 * @param {number} height 高度
 * @param {number} depth 深度
 * @param {number} bevel 倒角半径
 * @param {string} origin 原点对齐方式 ('center' | 'bottom')
 */
function createBeveledBoxGeometry(width, height, depth, bevel = 0.01, origin = 'center') {
  bevel = Math.max(0.0005, Math.min(bevel, width / 2 - 0.0001, height / 2 - 0.0001, depth / 2 - 0.0001));
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;
  const posArr = new Float32Array(72);
  const normArr = new Float32Array(72);
  const uvArr = new Float32Array(48);

  const getCornerIndex = (cx, cy, cz, comp) =>
    (((cx > 0 ? 1 : 0) + (cy > 0 ? 2 : 0) + (cz > 0 ? 4 : 0)) * 3) + comp;

  for (const cx of [-1, 1]) {
    for (const cy of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const pOffsets = [
          [cx * hw, cy * (hh - bevel), cz * (hd - bevel)],
          [cx * (hw - bevel), cy * hh, cz * (hd - bevel)],
          [cx * (hw - bevel), cy * (hh - bevel), cz * hd]
        ];
        const nVectors = [
          [cx, 0, 0],
          [0, cy, 0],
          [0, 0, cz]
        ];
        for (let comp = 0; comp < 3; comp++) {
          const idx = getCornerIndex(cx, cy, cz, comp);
          posArr.set(pOffsets[comp], idx * 3);
          normArr.set(nVectors[comp], idx * 3);
          if (comp === 0) {
            uvArr[idx * 2] = pOffsets[comp][2];
            uvArr[idx * 2 + 1] = pOffsets[comp][1];
          } else if (comp === 1) {
            uvArr[idx * 2] = pOffsets[comp][0];
            uvArr[idx * 2 + 1] = pOffsets[comp][2];
          } else {
            uvArr[idx * 2] = pOffsets[comp][0];
            uvArr[idx * 2 + 1] = pOffsets[comp][1];
          }
        }
      }
    }
  }

  const indices = [];
  const addTri = (ia, ib, ic) => {
    const ax = posArr[ia * 3], ay = posArr[ia * 3 + 1], az = posArr[ia * 3 + 2];
    const bax = posArr[ib * 3] - ax, bay = posArr[ib * 3 + 1] - ay, baz = posArr[ib * 3 + 2] - az;
    const cax = posArr[ic * 3] - ax, cay = posArr[ic * 3 + 1] - ay, caz = posArr[ic * 3 + 2] - az;
    const nx = bay * caz - baz * cay;
    const ny = baz * cax - bax * caz;
    const nz = bax * cay - bay * cax;
    const cx = ax + (bax + cax) / 3;
    const cy = ay + (bay + cay) / 3;
    const cz = az + (baz + caz) / 3;
    if (nx * cx + ny * cy + nz * cz >= 0) {
      indices.push(ia, ib, ic);
    } else {
      indices.push(ia, ic, ib);
    }
  };
  const addQuad = (ia, ib, ic, id) => {
    addTri(ia, ib, ic);
    addTri(ia, ic, id);
  };

  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const cx of [-1, 1]) {
    addQuad(...corners.map(([cy, cz]) => getCornerIndex(cx, cy, cz, 0)));
    addQuad(...corners.map(([cy, cz]) => getCornerIndex(cy, cx, cz, 1)));
    addQuad(...corners.map(([cy, cz]) => getCornerIndex(cy, cz, cx, 2)));
  }
  for (const cx of [-1, 1]) {
    for (const cy of [-1, 1]) {
      addQuad(
        getCornerIndex(-1, cx, cy, 1),
        getCornerIndex(1, cx, cy, 1),
        getCornerIndex(1, cx, cy, 2),
        getCornerIndex(-1, cx, cy, 2)
      );
      addQuad(
        getCornerIndex(cx, -1, cy, 0),
        getCornerIndex(cx, 1, cy, 0),
        getCornerIndex(cx, 1, cy, 2),
        getCornerIndex(cx, -1, cy, 2)
      );
      addQuad(
        getCornerIndex(cx, cy, -1, 0),
        getCornerIndex(cx, cy, 1, 0),
        getCornerIndex(cx, cy, 1, 1),
        getCornerIndex(cx, cy, -1, 1)
      );
    }
  }
  for (const cx of [-1, 1]) {
    for (const cy of [-1, 1]) {
      for (const cz of [-1, 1]) {
        addTri(
          getCornerIndex(cx, cy, cz, 0),
          getCornerIndex(cx, cy, cz, 1),
          getCornerIndex(cx, cy, cz, 2)
        );
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  geom.setIndex(indices);
  if (origin === 'bottom') geom.translate(0, height / 2, 0);
  return geom;
}

/**
 * 校验多边形绕向并在与中心法向相反时执行逆转
 */
function checkFaceWinding(positions, uvs, startIdx, endIdx, center, invert) {
  let accum = 0;
  for (let a = startIdx; a < endIdx; a += 9) {
    const abx = positions[a + 3] - positions[a], aby = positions[a + 4] - positions[a + 1], abz = positions[a + 5] - positions[a + 2];
    const acx = positions[a + 6] - positions[a], acy = positions[a + 7] - positions[a + 1], acz = positions[a + 8] - positions[a + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    accum += nx * ((positions[a] + positions[a + 3] + positions[a + 6]) / 3 - center[0]) +
             ny * ((positions[a + 1] + positions[a + 4] + positions[a + 7]) / 3 - center[1]) +
             nz * ((positions[a + 2] + positions[a + 5] + positions[a + 8]) / 3 - center[2]);
  }
  if ((accum < 0) !== (!invert)) {
    for (let a = startIdx; a < endIdx; a += 9) {
      for (let c = 0; c < 3; c++) {
        const tmp = positions[a + 3 + c];
        positions[a + 3 + c] = positions[a + 6 + c];
        positions[a + 6 + c] = tmp;
      }
      const uvBase = (a / 3) * 2;
      for (let c = 0; c < 2; c++) {
        const tmp = uvs[uvBase + 2 + c];
        uvs[uvBase + 2 + c] = uvs[uvBase + 4 + c];
        uvs[uvBase + 4 + c] = tmp;
      }
    }
  }
}

/**
 * 沿截面路径放样挤出生成曲面几何体 (Extruded Ribbon / Sweep Surface)
 */
function createLoftedRibbonGeometry(profile, pathY, transformFn, { closed = false, center = null, inward = false, caps = false } = {}) {
  const positions = [];
  const uvs = [];
  const profLen = profile.length;
  const segs = closed ? profLen : profLen - 1;
  const distAlong = [0];

  for (let g = 0; g < segs; g++) {
    const p0 = profile[g];
    const p1 = profile[(g + 1) % profLen];
    distAlong.push(distAlong[g] + Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
  }

  for (let g = 0; g < pathY.length - 1; g++) {
    const y0 = pathY[g];
    const y1 = pathY[g + 1];
    for (let b = 0; b < segs; b++) {
      const p0 = profile[b];
      const p1 = profile[(b + 1) % profLen];
      const v00 = transformFn(p0[0], p0[1], y0, g);
      const v10 = transformFn(p1[0], p1[1], y0, g);
      const v11 = transformFn(p1[0], p1[1], y1, g + 1);
      const v01 = transformFn(p0[0], p0[1], y1, g + 1);
      positions.push(...v00, ...v10, ...v11, ...v00, ...v11, ...v01);
      uvs.push(
        distAlong[b], y0,
        distAlong[b + 1], y0,
        distAlong[b + 1], y1,
        distAlong[b], y0,
        distAlong[b + 1], y1,
        distAlong[b], y1
      );
    }
  }

  const vertCount = positions.length;
  let calcCenter = center;
  if (!calcCenter) {
    calcCenter = [0, 0, 0];
    for (let i = 0; i < vertCount; i += 3) {
      calcCenter[0] += positions[i];
      calcCenter[1] += positions[i + 1];
      calcCenter[2] += positions[i + 2];
    }
    const inv = 3 / vertCount;
    calcCenter[0] *= inv;
    calcCenter[1] *= inv;
    calcCenter[2] *= inv;
  }

  checkFaceWinding(positions, uvs, 0, vertCount, calcCenter, inward);

  if (caps && closed) {
    let avgX = 0, avgY = 0;
    for (const p of profile) { avgX += p[0]; avgY += p[1]; }
    avgX /= profLen; avgY /= profLen;

    for (const endIdx of [0, pathY.length - 1]) {
      const startVert = positions.length;
      const curY = pathY[endIdx];
      const capCenter = transformFn(avgX, avgY, curY, endIdx);
      for (let i = 0; i < profLen; i++) {
        const p0 = profile[i];
        const p1 = profile[(i + 1) % profLen];
        positions.push(...capCenter, ...transformFn(p0[0], p0[1], curY, endIdx), ...transformFn(p1[0], p1[1], curY, endIdx));
        uvs.push(avgX, avgY, p0[0], p0[1], p1[0], p1[1]);
      }
      checkFaceWinding(positions, uvs, startVert, positions.length, calcCenter, inward);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(positions), 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(uvs), 2));
  geom.computeVertexNormals();
  return geom;
}

/**
 * ISO 集装箱梯形波纹板截面位移计算 (Trapezoidal Corrugated Profile Wave)
 */
function evalCorrugationWave(x, period, depth, flat1, slope) {
  let modX = x % period;
  if (modX < 0) modX += period;
  const flat2 = period - flat1 - 2 * slope;
  if (modX <= flat1) return 0;
  if (modX < flat1 + slope) return -depth * (modX - flat1) / slope;
  if (modX <= flat1 + slope + flat2) return -depth;
  return -depth * (1 - (modX - flat1 - slope - flat2) / slope);
}

/**
 * 沿长度生成梯形波纹折线关键点 (Corrugated Keypoints Generation)
 */
function generateCorrugatedProfilePoints(start, end, period, depth, flat1, slope, offset = start) {
  const flat2 = period - flat1 - 2 * slope;
  const keyOffsets = [0, flat1, flat1 + slope, flat1 + slope + flat2];
  const pts = [start];
  const minIdx = Math.floor((start - offset) / period) - 1;
  const maxIdx = Math.ceil((end - offset) / period) + 1;

  for (let f = minIdx; f <= maxIdx; f++) {
    for (const ko of keyOffsets) {
      const pos = offset + f * period + ko;
      if (pos > start + 0.0001 && pos < end - 0.0001) pts.push(pos);
    }
  }
  pts.push(end);
  return pts.map(p => [p, evalCorrugationWave(p - offset, period, depth, flat1, slope)]);
}

/**
 * 创建倒角圆角 2D 矩形几何体 (Rounded Rectangle 2D Fan Geometry)
 */
function createRoundedRectGeometry(w, h, seg = 5) {
  const pts = [];
  const r = Math.min(w, h) / 2;
  const ox = w / 2 - r;
  const oy = h / 2 - r;

  for (let u = 0; u < 4; u++) {
    for (let s = 0; s <= seg; s++) {
      const angle = (u + s / seg) * HALF_PI;
      pts.push([
        Math.cos(angle) * r + (u === 0 || u === 3 ? ox : -ox),
        Math.sin(angle) * r + (u < 2 ? oy : -oy)
      ]);
    }
  }

  const positions = [];
  const uvs = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % pts.length];
    positions.push(0, 0, 0, p0[0], p0[1], 0, p1[0], p1[1], 0);
    uvs.push(0.5, 0.5, p0[0] / w + 0.5, p0[1] / h + 0.5, p1[0] / w + 0.5, p1[1] / h + 0.5);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(positions), 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(uvs), 2));
  geom.computeVertexNormals();
  return geom;
}

/**
 * 创建平面几何体并自动按世界尺度缩放 UV (World-Scale UV Plane)
 */
function createWorldUVPlaneGeometry(w, h) {
  const plane = new THREE.PlaneGeometry(w, h);
  const uv = plane.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  }
  return plane;
}

/**
 * 转为非索引网格并重新计算平直法线 (Flat Shaded Geometry)
 */
function toFlatShadedGeometry(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  return g;
}

const eulerHelper = new THREE.Euler();
const quatHelper  = new THREE.Quaternion();
const matHelper   = new THREE.Matrix4();
const posHelper   = new THREE.Vector3();
const scaleOne    = new THREE.Vector3(1, 1, 1);

/**
 * 在局部内存中快速变换几何体坐标
 */
function transformGeometryInPlace(geo, x = 0, y = 0, z = 0, rotEuler = null) {
  if (rotEuler) {
    eulerHelper.set(rotEuler[0], rotEuler[1], rotEuler[2]);
    quatHelper.setFromEuler(eulerHelper);
  } else {
    quatHelper.identity();
  }
  posHelper.set(x, y, z);
  matHelper.compose(posHelper, quatHelper, scaleOne);
  geo.applyMatrix4(matHelper);
  return geo;
}

/**
 * 创建 4x4 变换矩阵
 */
function createTransformMatrix4(x = 0, y = 0, z = 0, rotEuler = null) {
  if (rotEuler) {
    eulerHelper.set(rotEuler[0], rotEuler[1], rotEuler[2]);
    quatHelper.setFromEuler(eulerHelper);
  } else {
    quatHelper.identity();
  }
  posHelper.set(x, y, z);
  return new THREE.Matrix4().compose(posHelper, quatHelper, scaleOne);
}

// ============================================================================
// 四、 道具复合装配引擎 (Prop Assembly Framework: jn & Kn)
// ============================================================================

/**
 * 道具网格分材质批次收集器 (Material Bucketed Prop Mesh Assembler)
 */
class PropMeshAssembler {
  constructor(engineCtx) {
    this.G = engineCtx;
    this.buckets = new Map();
    this.stack = [];
    this.m = null;
    this.defCol = new Map();
  }

  M(name, opts) {
    return this.G.mats.get(name, opts);
  }

  push(mat4) {
    this.stack.push(this.m);
    this.m = this.m ? this.m.clone().multiply(mat4) : mat4.clone();
    return this;
  }

  pop() {
    this.m = this.stack.pop();
    return this;
  }

  add(mat, geo, col, noCast) {
    if (this.m) geo.applyMatrix4(this.m);
    const colorVal = col || this.defCol.get(mat);
    if (colorVal) Lc(geo, colorVal);
    let bucket = this.buckets.get(mat);
    if (!bucket) {
      bucket = { mat, geos: [], cast: !noCast };
      this.buckets.set(mat, bucket);
    }
    bucket.geos.push(geo);
    return geo;
  }

  box(mat, w, h, d, x, y, z, opts = {}) {
    const geo = opts.r === 0 ? $e(w, h, d) : createBeveledBoxGeometry(w, h, d, opts.r || Math.min(0.012, Math.min(w, h, d) * 0.25));
    return this.add(mat, transformGeometryInPlace(geo, x, y, z, opts.rot), opts.col);
  }

  cyl(mat, rTop, rBottom, height, x, y, z, opts = {}) {
    let geo = ot(rTop, rBottom, height, opts.seg || 12, !!opts.open);
    if (opts.flat) geo = toFlatShadedGeometry(geo);
    return this.add(mat, transformGeometryInPlace(geo, x, y, z, opts.rot), opts.col);
  }

  tube(mat, points, radius, opts = {}) {
    return this.add(mat, Fn(points, radius, opts.seg || 6, false, opts.tension === undefined ? 0.5 : opts.tension), opts.col);
  }

  bar(mat, p0, p1, radius, opts = {}) {
    const delta = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    const len = delta.length();
    const geo = ot(opts.r2 === undefined ? radius : opts.r2, radius, len, opts.seg || 6, !opts.caps);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2),
      q,
      scaleOne
    );
    geo.applyMatrix4(m);
    return this.add(mat, geo, opts.col);
  }

  beam(mat, p0, p1, width, depth, opts = {}) {
    const delta = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    const len = delta.length();
    const geo = opts.r === 0 ? $e(width, len, depth) : createBeveledBoxGeometry(width, len, depth, opts.r || Math.min(width, depth) * 0.2);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    if (opts.twist) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), opts.twist));
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2),
      q,
      scaleOne
    );
    geo.applyMatrix4(m);
    return this.add(mat, geo, opts.col);
  }

  decal(decalObj, w, h, x, y, z, rotEuler, aspect) {
    const plane = new THREE.PlaneGeometry(aspect || w * decalObj.aspect, w);
    return this.add(decalObj.material, transformGeometryInPlace(plane, x, y, z, rotEuler), null, true);
  }

  parts() {
    const res = [];
    for (const b of this.buckets.values()) {
      res.push({ mat: b.mat, geo: Ii(b.geos), cast: b.cast });
    }
    return res;
  }

  group(mats) {
    const grp = new THREE.Group();
    for (const part of this.parts()) {
      const mesh = new THREE.Mesh(part.geo, (mats && mats.get(part.mat)) || part.mat);
      mesh.castShadow = part.cast;
      mesh.receiveShadow = true;
      grp.add(mesh);
    }
    return grp;
  }
}

/**
 * 道具复合构建器 (Hierarchical Grime-weathered Prop Compound Builder)
 */
class PropCompoundBuilder {
  constructor(engineCtx, propName, seed = 1) {
    this.G = engineCtx;
    this.name = propName;
    this.seed = Math.abs(seed | 0);
    this.rng = il((this.seed + 1) * 7919 + propName.length * 131);
    this.b = new Map();
    this.stack = [new THREE.Matrix4()];
  }

  push(trans) {
    const cur = this.stack[this.stack.length - 1];
    this.stack.push(cur.clone().multiply(composeTransformMatrix4(trans)));
    return this;
  }

  pop() {
    this.stack.pop();
    return this;
  }

  mat(name, opts) {
    return this.G.mats.get(name, { vertexColors: true, ...(opts || {}) });
  }

  add(matOrName, geo, trans, lumFactor = 1, { raw = false, cast = true } = {}) {
    const m = typeof matOrName === 'string' ? this.mat(matOrName) : matOrName;
    if (trans) Dc(geo, trans);
    geo.applyMatrix4(this.stack[this.stack.length - 1]);
    if (!raw) applyVertexColorLuminance(geo, lumFactor);
    const key = m.uuid + (cast ? 'c' : 'n');
    let bucket = this.b.get(key);
    if (!bucket) {
      bucket = { mat: m, geos: [], raw, cast };
      this.b.set(key, bucket);
    }
    bucket.geos.push(geo);
    return this;
  }

  decal(decalObj, size, trans, height) {
    const plane = new THREE.PlaneGeometry(size, height || size / (decalObj.aspect || 1));
    return this.add(decalObj.material, plane, trans, 1, { raw: true, cast: false });
  }

  label(text, opts, maxW, maxH, trans) {
    const lbl = this.G.mats.label(text, opts);
    const width = Math.min(maxW, maxH * (lbl.aspect || 1));
    const plane = new THREE.PlaneGeometry(width, width / (lbl.aspect || 1));
    return this.add(lbl.material, plane, trans, 1, { raw: true, cast: false });
  }

  cdecal(decalObj, w, h, trans, customH) {
    const curved = createCurvedCylinderDecal(w, h, customH || h / (decalObj.aspect || 1));
    return this.add(decalObj.material, curved, trans, 1, { raw: true, cast: false });
  }

  tube(matOrName, points, radius = 0.03, opts = {}) {
    const geo = Fn(points, radius, opts.radial || 6, opts.closed || false, opts.tension ?? 0.5);
    return this.add(matOrName, geo, opts.trans, 1, { raw: opts.raw || false, cast: opts.cast !== false });
  }

  finish({ size, colliders, grime = 1, surface } = {}) {
    const grp = new THREE.Group();
    const noiseOffset = this.seed * 3.71;

    for (const bucket of this.b.values()) {
      const mergedGeo = Ii(bucket.geos);
      if (!bucket.raw && grime > 0 && mergedGeo.attributes.color) {
        const pos = mergedGeo.attributes.position;
        const norm = mergedGeo.attributes.normal;
        const colArr = mergedGeo.attributes.color.array;
        for (let v = 0; v < pos.count; v++) {
          const vx = pos.getX(v), vy = pos.getY(v), vz = pos.getZ(v);
          const ny = norm.getY(v);
          const n1 = sampleSimplexNoise3D(vx * 1.9 + noiseOffset, vy * 1.9, vz * 1.9 + 5.3);
          const n2 = sampleSimplexNoise3D(vx * 9 + 2.1, vy * 9 + noiseOffset, vz * 9);
          let factor = (0.82 + 0.18 * n1) * (0.92 + 0.08 * n2) * (0.76 + 0.24 * clamp(ny * 0.6 + 0.62, 0, 1));
          const groundOccl = clamp(1 - vy / 0.2, 0, 1);
          factor *= (1 - 0.42 * groundOccl * groundOccl * (0.55 + 0.45 * n2));
          factor = 1 + (factor - 1) * grime;
          colArr[v * 3]     *= factor;
          colArr[v * 3 + 1] *= factor * (1 - 0.05 * groundOccl * grime);
          colArr[v * 3 + 2] *= factor * (1 - 0.12 * groundOccl * grime);
        }
      }
      const mesh = new THREE.Mesh(mergedGeo, bucket.mat);
      mesh.castShadow = bucket.cast;
      mesh.receiveShadow = true;
      grp.add(mesh);
    }

    const defaultDef = PROP_SIZES[this.name] || [1, 1, 1, '', 'metal'];
    const finalSize = size || [defaultDef[0], defaultDef[1], defaultDef[2]];
    grp.userData.size = finalSize;
    grp.userData.colliders = colliders || [{
      min: [-finalSize[0] / 2, 0, -finalSize[2] / 2],
      max: [finalSize[0] / 2, finalSize[1], finalSize[2] / 2],
      surface: surface || defaultDef[4]
    }];
    return grp;
  }
}


// ============================================================================
// 五、 材质、标贴与几何原型缓存 (Texture, Decal & Prototype Cache)
// ============================================================================

const materialCacheMap = new WeakMap();

/**
 * 缓存获取动态 Canvas 生成的文字标签材质
 */
function getCachedLabelTexture(engineCtx, text, options) {
  let subMap = materialCacheMap.get(engineCtx.mats);
  if (!subMap) {
    subMap = new Map();
    materialCacheMap.set(engineCtx.mats, subMap);
  }
  const key = "L|" + text + "|" + JSON.stringify(options || {});
  if (!subMap.has(key)) {
    let lbl;
    try {
      lbl = engineCtx.mats.label(text, options || {});
    } catch {
      lbl = null;
    }
    subMap.set(key, lbl && lbl.material ? lbl : {
      material: engineCtx.mats.get("paint_white"),
      aspect: Math.max(1, text.length * 0.6)
    });
  }
  return subMap.get(key);
}

/**
 * 缓存获取矢量图案贴花 (Decal)
 */
function getCachedDecalTexture(engineCtx, decalName) {
  let subMap = materialCacheMap.get(engineCtx.mats);
  if (!subMap) {
    subMap = new Map();
    materialCacheMap.set(engineCtx.mats, subMap);
  }
  const key = "D|" + decalName;
  if (!subMap.has(key)) {
    let dec;
    try {
      dec = engineCtx.mats.decal(decalName);
    } catch {
      dec = null;
    }
    subMap.set(key, dec && dec.material ? dec : {
      material: engineCtx.mats.get("paint_white"),
      aspect: 1
    });
  }
  return subMap.get(key);
}

const prototypeCache = new Map();

/**
 * 原型网格克隆工厂 (Mesh Prototype Cache Cloner)
 */
function withCachedPrototype(cacheKey, factoryFn) {
  let proto = prototypeCache.get(cacheKey);
  if (!proto) {
    proto = factoryFn();
    prototypeCache.set(cacheKey, proto);
  }
  return proto.clone(true);
}

// ============================================================================
// 六、 ISO 6346 标准集装箱程序化生成器 (ISO Shipping Container Generator)
// ============================================================================

const CONTAINER_WIDTH_STD = 2.438; // 8ft ISO 标准箱宽

const CONTAINER_SPECS = {
  container20: {
    type: "22G1",
    gross: "30,480",
    tare: "2,230",
    net: "28,250",
    cu: "33.2",
    def: "red"
  },
  container40: {
    type: "42G1",
    gross: "32,500",
    tare: "3,750",
    net: "28,750",
    cu: "67.7",
    def: "blue"
  },
  container40hc: {
    type: "45G1",
    gross: "32,500",
    tare: "3,940",
    net: "28,560",
    cu: "76.3",
    def: "green"
  }
};

const CONTAINER_BIC_CODES = [
  "SLTU 482915 7",
  "HBMU 307144 2",
  "NRDU 665201 9",
  "OKTU 119873 4",
  "VSLU 850362 1",
  "TQLU 274590 6"
];

const CONTAINER_LOGOS = ["logo_a", "logo_b", "logo_c", "logo_d"];

const CORNER_CASTING_X = 0.178;
const CORNER_CASTING_Y = 0.118;
const CORNER_CASTING_Z = 0.162;

// 梯形波纹截面参数 (Side Corrugation Wave Specs)
const CORRUGATION_SPECS = {
  P:  0.278, // 周期
  d:  0.036, // 深度
  fo: 0.072, // 平面宽度
  sl: 0.068  // 斜坡宽度
};

/**
 * 生成集装箱几何网格与碰撞包围盒 (ISO Shipping Container Geometry & Colliders)
 * @param {object} engineCtx 引擎上下文
 * @param {string} type 集装箱规格 ('container20' | 'container40' | 'container40hc')
 * @param {number} seed 随机种子
 * @param {number} doorOpenRatio 货运门开合程度 (0: 紧闭, 1: 全开112度)
 * @param {number} wearFactor 风化锈蚀磨损程度
 */
function generateContainerGeometry(engineCtx, type, seed, doorOpenRatio, wearFactor) {
  const length = PROP_SIZES[type][0];
  const height = PROP_SIZES[type][1];
  const spec = CONTAINER_SPECS[type];
  const prng = createPropPRNG(1000 + seed * 77 + type.length * 13);
  const assembler = new PropMeshAssembler(engineCtx);

  const matGalv = assembler.M("steel_galv");
  const matWood = assembler.M("wood_pallet");

  const halfWidth = CONTAINER_WIDTH_STD / 2;
  const halfLength = length / 2;
  const innerHalfWidth = halfWidth - 0.012;
  const startX = -halfLength + 0.085;
  const endX = halfLength - 0.135;
  const bottomCorrugationY = 0.167;
  const topCorrugationY = height - 0.06;

  // 凹陷与物理撞击损伤变形列表
  const dents = [];
  const dentCount = Math.round((1 + prng() * 2.4) * (0.4 + wearFactor));
  const excludeZones = [[-halfLength * 0.75, -halfLength * 0.05], [halfLength - 2.2, halfLength]];

  for (let i = 0; i < dentCount; i++) {
    const side = prng() < 0.5 ? 1 : -1;
    let dx = 0, tries = 0;
    do {
      dx = (prng() * 2 - 1) * (halfLength - 0.9);
      tries++;
    } while (tries < 8 && excludeZones.some(z => dx > z[0] - 0.4 && dx < z[1] + 0.4 && prng() < 0.9));
    dents.push({
      side,
      x: side * dx,
      y: 0.45 + prng() * 1.3,
      r: 0.22 + prng() * 0.3,
      depth: 0.025 + prng() * 0.04
    });
  }

  // 锈蚀流淌条带列表
  const rustRuns = [];
  const rustCount = Math.round(length / 2.2 * (0.5 + wearFactor) * (0.6 + prng()));
  for (let i = 0; i < rustCount * 2; i++) {
    rustRuns.push({
      side: (i % 2) ? 1 : -1,
      x: (prng() * 2 - 1) * (halfLength - 0.3),
      w: 0.05 + prng() * 0.12,
      k: 0.4 + prng() * 0.6
    });
  }

  const grimeTint = [0.5, 0.44, 0.38];
  const rustTint  = [0.62, 0.38, 0.24];
  const noiseSeed = seed * 9.7;

  // 顶点噪波着色器回调函数
  const vertexColorShader = (vx, vy, vz) => {
    let factor = 1 + (sampleValueNoise2D(vx * 0.9 + noiseSeed, vy * 1.7 + vz * 0.4) - 0.5) * 0.16 * (0.5 + wearFactor);
    factor *= (0.94 + 0.06 * sampleValueNoise2D(vx * 6.1 + vz * 3.3, vy * 5 + noiseSeed));
    let col = [factor, factor, factor];
    const groundOccl = smoothstepHermite(0.62, 0.02, vy) * (0.45 + 0.5 * wearFactor) * (0.75 + 0.5 * sampleValueNoise2D(vx * 2.3 + vz, noiseSeed));
    col = lerpVec3(col, [grimeTint[0] * factor, grimeTint[1] * factor, grimeTint[2] * factor], Math.min(1, groundOccl));
    return col;
  };

  const BODY_TAG = { body: true };
  assembler.defCol.set(BODY_TAG, vertexColorShader);

  const getDentDisplacement = (vx, vy, vz) => {
    let disp = 0;
    for (const d of dents) {
      if (d.side === vz) {
        const dist = Math.hypot(vx - d.x, (vy - d.y) * 0.9) / d.r;
        if (dist < 1) {
          const w = 1 - dist * dist;
          disp += d.depth * w * w;
        }
      }
    }
    return disp;
  };

  const holeColor = [0.035, 0.035, 0.04];

  // 1. ISO 1161 八角铸钢转锁角件 (8 Corner Castings with Twist-Lock Holes)
  for (const sx of [-1, 1]) {
    for (const sy of [0, 1]) {
      for (const sz of [-1, 1]) {
        const cx = sx * (halfLength - CORNER_CASTING_X / 2);
        const cy = sy ? (height - CORNER_CASTING_Y / 2) : (CORNER_CASTING_Y / 2);
        const cz = sz * (halfWidth - CORNER_CASTING_Z / 2);
        assembler.box(BODY_TAG, CORNER_CASTING_X, CORNER_CASTING_Y, CORNER_CASTING_Z, cx, cy, cz, { r: 0.012 });
        assembler.add(BODY_TAG, transformGeometryInPlace(createRoundedRectGeometry(0.078, 0.052, 3), cx, cy, sz * (halfWidth + 0.0012), [0, sz > 0 ? 0 : PI, 0]), holeColor);
        assembler.add(BODY_TAG, transformGeometryInPlace(createRoundedRectGeometry(0.064, 0.05, 3), sx * (halfLength + 0.0012), cy, cz, [0, sx * HALF_PI, 0]), holeColor);
        if (sy) {
          assembler.add(BODY_TAG, transformGeometryInPlace(createRoundedRectGeometry(0.124, 0.064, 3), cx, height + 0.0012, cz, [-HALF_PI, 0, 0]), holeColor);
        }
      }
    }
  }

  // 2. 主体立柱与横梁 (Main Structural Posts and Rails)
  for (const sz of [-1, 1]) {
    assembler.box(BODY_TAG, 0.085, height - 2 * CORNER_CASTING_Y + 0.01, 0.15, -halfLength + 0.0465, height / 2, sz * (halfWidth - 0.079), { r: 0.014 });
    assembler.box(BODY_TAG, 0.14, height - 2 * CORNER_CASTING_Y + 0.01, 0.056, halfLength - 0.074, height / 2, sz * (halfWidth - 0.032), { r: 0.012 });
    assembler.box(BODY_TAG, length - 0.2, 0.062, 0.062, -0.02, height - 0.031, sz * (halfWidth - 0.035), { r: 0.008 });
    assembler.box(BODY_TAG, length - 0.2, 0.158, 0.05, -0.02, 0.012 + 0.079, sz * (halfWidth - 0.029), { r: 0.008 });
  }

  assembler.box(BODY_TAG, 0.062, 0.062, CONTAINER_WIDTH_STD - 0.2, -halfLength + 0.035, height - 0.031, 0, { r: 0.008 });
  assembler.box(BODY_TAG, 0.05, 0.158, CONTAINER_WIDTH_STD - 0.2, -halfLength + 0.029, 0.091, 0, { r: 0.008 });
  assembler.box(BODY_TAG, 0.13, 0.12, CONTAINER_WIDTH_STD - 0.12, halfLength - 0.072, height - 0.06, 0, { r: 0.01 });
  assembler.box(BODY_TAG, 0.13, 0.158, CONTAINER_WIDTH_STD - 0.12, halfLength - 0.072, 0.091, 0, { r: 0.01 });
  assembler.box(BODY_TAG, 0.03, 0.012, CONTAINER_WIDTH_STD - 0.4, halfLength - 0.012, height - 0.125, 0, { r: 0.003, rot: [0, 0, -0.5] });

  // 20尺集装箱特有的底部叉车槽 (Forklift Pockets for 20ft Containers)
  if (type === "container20") {
    for (const sz of [-1, 1]) {
      for (const px of [-1.025, 1.025]) {
        assembler.add(BODY_TAG, transformGeometryInPlace(new THREE.PlaneGeometry(0.36, 0.112), px, 0.075, sz * (halfWidth - 0.0035), [0, sz > 0 ? 0 : PI, 0]), holeColor);
        assembler.box(BODY_TAG, 0.46, 0.018, 0.012, px, 0.142, sz * (halfWidth - 0.002), { r: 0.003 });
        for (const mx of [-1, 1]) {
          assembler.box(BODY_TAG, 0.018, 0.13, 0.01, px + mx * 0.19, 0.078, sz * (halfWidth - 0.003), { r: 0.003 });
        }
      }
    }
  }

  // 3. 梯形波纹钢制侧板 (Trapezoidal Corrugated Side Panels)
  const yPath = [bottomCorrugationY, 0.44, 1.25, height - 0.5, topCorrugationY];
  const sideProfile = generateCorrugatedProfilePoints(startX, endX, CORRUGATION_SPECS.P, CORRUGATION_SPECS.d, CORRUGATION_SPECS.fo, CORRUGATION_SPECS.sl, startX + 0.02);

  for (const sz of [-1, 1]) {
    const sideMesh = createLoftedRibbonGeometry(
      sideProfile,
      yPath,
      (px, pz, py) => [px, py, sz * (innerHalfWidth + pz - getDentDisplacement(px, py, sz))],
      { center: [0, height / 2, 0] }
    );
    sideMesh.computeVertexNormals();
    const pos = sideMesh.attributes.position;
    const colArr = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      let col = vertexColorShader(vx, vy, vz);
      const edgeDist = innerHalfWidth - Math.abs(vz);
      const edgeWeight = smoothstepHermite(0.008, 0.034, edgeDist);
      col = [col[0] * (1 - 0.17 * edgeWeight), col[1] * (1 - 0.18 * edgeWeight), col[2] * (1 - 0.18 * edgeWeight)];

      const topRustWeight = smoothstepHermite(height - 0.75, topCorrugationY, vy);
      if (topRustWeight > 0) {
        for (const r of rustRuns) {
          if (r.side === sz) {
            const rxDist = Math.abs(vx - r.x) / r.w;
            if (rxDist < 1) {
              col = lerpVec3(col, [col[0] * rustTint[0], col[1] * rustTint[1], col[2] * rustTint[2]], topRustWeight * topRustWeight * r.k * (1 - rxDist * rxDist) * (0.45 + 0.55 * wearFactor));
            }
          }
        }
      }
      colArr[i * 3]     = col[0];
      colArr[i * 3 + 1] = col[1];
      colArr[i * 3 + 2] = col[2];
    }
    sideMesh.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    assembler.add(BODY_TAG, sideMesh);
  }

  // 4. 前端封板与顶板波纹 (Front Wall and Roof Corrugations)
  const frontProfile = generateCorrugatedProfilePoints(-halfWidth + 0.08, halfWidth - 0.08, 0.209, 0.02, 0.09, 0.03, -halfWidth + 0.08);
  const frontMesh = createLoftedRibbonGeometry(
    frontProfile,
    [bottomCorrugationY, topCorrugationY],
    (px, pz, py) => [-halfLength + 0.035 - pz, py, px],
    { center: [0, height / 2, 0] }
  );
  assembler.add(BODY_TAG, frontMesh);

  const roofY = height - 0.025;
  const roofProfile = generateCorrugatedProfilePoints(startX + 0.02, endX - 0.02, 0.25, 0.042, 0.07, 0.06, startX + 0.02);
  const roofMesh = createLoftedRibbonGeometry(
    roofProfile,
    [-halfWidth + 0.066, 0, halfWidth - 0.066],
    (px, pz, py) => [px, roofY + pz + (Math.abs(py) < 0.01 ? 0.006 : 0), py],
    { center: [0, height / 2, 0] }
  );
  assembler.add(BODY_TAG, roofMesh, (vx, vy, vz) => {
    const noise = 0.78 + 0.3 * sampleValueNoise2D(vx * 0.8 + noiseSeed, vz * 1.1);
    const roofSlope = smoothstepHermite(0.004, 0.018, roofY - vy);
    return [noise * (1 - 0.25 * roofSlope), noise * (1 - 0.3 * roofSlope) * 0.97, noise * (1 - 0.32 * roofSlope) * 0.94];
  });

  // 5. 内部木地板与中空通行结构 (Interior Wooden Floor & Hollow Walkway when doors open)
  const hasOpenDoor = doorOpenRatio > 0.03;
  const floorLevel = 0.172;
  if (hasOpenDoor) {
    const floorShader = (vx, vy, vz) => {
      const occl = (0.16 + 0.62 * smoothstepHermite(-halfLength, halfLength, vx) * smoothstepHermite(-halfLength, halfLength, vx)) * (0.8 + 0.2 * smoothstepHermite(0.2, 1.4, vy));
      return [occl, occl, occl];
    };
    const innerProfile = generateCorrugatedProfilePoints(startX, endX, CORRUGATION_SPECS.P, CORRUGATION_SPECS.d, CORRUGATION_SPECS.fo, CORRUGATION_SPECS.sl, startX + 0.02);
    for (const sz of [-1, 1]) {
      assembler.add(BODY_TAG, createLoftedRibbonGeometry(innerProfile, [floorLevel, topCorrugationY - 0.02], (px, pz, py) => [px, py, sz * (innerHalfWidth + pz - 0.004)], { center: [0, height / 2, 0], inward: true }), floorShader);
    }
    assembler.add(BODY_TAG, transformGeometryInPlace(new THREE.PlaneGeometry(endX - startX, 2 * innerHalfWidth), (startX + endX) / 2, topCorrugationY - 0.03, 0, [HALF_PI, 0, 0]), floorShader);
    assembler.add(BODY_TAG, transformGeometryInPlace(new THREE.PlaneGeometry(2 * innerHalfWidth, topCorrugationY - floorLevel), startX + 0.03, (floorLevel + topCorrugationY) / 2, 0, [0, HALF_PI, 0]), floorShader);

    const woodPlankGeo = createWorldUVPlaneGeometry(endX - startX + 0.1, 2 * innerHalfWidth - 0.02);
    assembler.add(matWood, transformGeometryInPlace(woodPlankGeo, (startX + endX) / 2 + 0.05, floorLevel, 0, [-HALF_PI, 0, 0]), vx => {
      const w = 0.3 + 0.6 * (smoothstepHermite(-halfLength, halfLength, vx) ** 2);
      return [w, w * 0.97, w * 0.93];
    });
    assembler.box(matGalv, 0.05, 0.006, 2 * innerHalfWidth - 0.1, halfLength - 0.11, floorLevel + 0.001, 0, { r: 0.002 });
  }

  // 6. 后部双开货运门 (Twin Cargo Swinging Doors with Locking Rods & Keepers)
  const doorBottomY = 0.175;
  const doorTopY = height - 0.124;
  const doorHeight = doorTopY - doorBottomY;
  const doorWidth = halfWidth - 0.058 - 0.004;
  const doorHingeX = halfLength - 0.066;
  const dynamicColliders = [];

  for (const side of [1, -1]) {
    const swingAngle = doorOpenRatio * (side > 0 ? 1 : 0.88) * THREE.MathUtils.degToRad(side > 0 ? 112 : 100);
    const hingeZ = side * (halfWidth - 0.058);
    assembler.push(createTransformMatrix4(doorHingeX, 0, hingeZ, [0, -side * swingAngle, 0]));

    const mirrorZ = k => -side * k;
    const doorMidY = (doorBottomY + doorTopY) / 2;
    assembler.box(BODY_TAG, 0.034, doorHeight, doorWidth - 0.006, 0, doorMidY, mirrorZ(doorWidth / 2), { r: 0.008, col: vertexColorShader });

    // 门板纵向波纹折线 (Vertical Ribbed Profile on Door)
    const doorP = type === "container40hc" ? 7 : 6;
    const ribMinY = doorBottomY + 0.085;
    const ribMaxY = doorTopY - 0.085;
    const ribStepY = (ribMaxY - ribMinY) / doorP;
    const ribProf = [];

    for (let k = 0; k < doorP; k++) {
      const cy = ribMinY + k * ribStepY;
      ribProf.push([cy, 0.019], [cy + 0.022, 0.019], [cy + 0.05, 0.031], [cy + ribStepY - 0.05, 0.031], [cy + ribStepY - 0.022, 0.019]);
    }
    ribProf.push([ribMaxY, 0.019]);
    assembler.add(BODY_TAG, createLoftedRibbonGeometry(ribProf, [0.075, doorWidth - 0.085], (ry, rz, rx) => [rz, ry, mirrorZ(rx)], { center: [-1, doorMidY, mirrorZ(doorWidth / 2)] }), vertexColorShader);

    // 密封橡胶圈 (Rubber Gaskets)
    const rubberCol = [0.05, 0.05, 0.05];
    assembler.box(BODY_TAG, 0.022, doorHeight + 0.012, 0.018, 0.004, doorMidY, mirrorZ(doorWidth + 0.001), { r: 0, col: rubberCol });
    assembler.box(BODY_TAG, 0.022, 0.016, doorWidth, 0.004, doorTopY + 0.004, mirrorZ(doorWidth / 2), { r: 0, col: rubberCol });
    assembler.box(BODY_TAG, 0.022, 0.016, doorWidth, 0.004, doorBottomY - 0.004, mirrorZ(doorWidth / 2), { r: 0, col: rubberCol });

    // 门铰链 (Door Hinges)
    const hingeCount = type === "container40hc" ? 5 : 4;
    for (let k = 0; k < hingeCount; k++) {
      const hy = doorBottomY + 0.16 + k * (doorHeight - 0.32) / (hingeCount - 1);
      assembler.box(BODY_TAG, 0.012, 0.062, 0.15, 0.021, hy, mirrorZ(0.085), { r: 0 });
      assembler.cyl(matGalv, 0.013, 0.013, 0.086, 0.026, hy, mirrorZ(-0.002), { seg: 6, open: true });
    }

    // 镀锌锁杆、凸轮锁头与操作手柄 (Locking Cam Rods & Operating Handles)
    for (const rodZ of [0.31, 0.83]) {
      assembler.cyl(matGalv, 0.0155, 0.0155, doorHeight + 0.2, 0.052, doorMidY, mirrorZ(rodZ), { seg: 7, open: true });
      for (const endSign of [-1, 1]) {
        assembler.add(matGalv, transformGeometryInPlace($e(0.03, 0.045, 0.085), 0.052 - 0.004, doorMidY + endSign * (doorHeight / 2 + 0.065), mirrorZ(rodZ)));
        assembler.box(BODY_TAG, 0.03, 0.05, 0.075, 0.052 - 0.012, doorMidY + endSign * (doorHeight / 2 - 0.035), mirrorZ(rodZ), { r: 0 });
      }
      for (const guideY of [doorBottomY + doorHeight * 0.3, doorBottomY + doorHeight * 0.72]) {
        assembler.box(BODY_TAG, 0.026, 0.04, 0.07, 0.052 - 0.012, guideY, mirrorZ(rodZ), { r: 0 });
      }
      const handleY = 1.02 + (rodZ > 0.5 ? 0 : 0.13);
      const handleDir = rodZ > 0.5 ? -1 : 1;
      assembler.box(matGalv, 0.02, 0.05, 0.05, 0.052 + 0.008, handleY, mirrorZ(rodZ), { r: 0 });
      assembler.box(matGalv, 0.011, 0.032, 0.36, 0.052 + 0.016, handleY, mirrorZ(rodZ + handleDir * 0.19), { r: 0.004 });
      assembler.box(BODY_TAG, 0.03, 0.07, 0.05, 0.052 - 0.008, handleY, mirrorZ(rodZ + handleDir * 0.33), { r: 0 });
      assembler.box(matGalv, 0.012, 0.085, 0.012, 0.052 + 0.012, handleY + 0.005, mirrorZ(rodZ + handleDir * 0.33), { r: 0 });
    }

    // 门体涂装、警告标线与铭牌 (Decals & Stencil Markings on Doors)
    const doorDecalX = 0.031 + 0.0025;
    const doorDecalRot = [0, HALF_PI, 0];
    const addDoorDecal = (dec, sz, py, pz, maxW) => {
      let finalW = sz * dec.aspect;
      if (maxW && finalW > maxW) {
        sz *= maxW / finalW;
        finalW = maxW;
      }
      assembler.add(dec.material, transformGeometryInPlace(new THREE.PlaneGeometry(finalW, sz), doorDecalX, py, mirrorZ(pz), doorDecalRot), null, true);
    };

    const getRibY = k => ribMinY + (k + 0.5) * ribStepY;

    if (side < 0) {
      addDoorDecal(getCachedLabelTexture(engineCtx, CONTAINER_BIC_CODES[seed % CONTAINER_BIC_CODES.length], { color: "white", font: "stencil", distress: 0.3 }), 0.115, getRibY(doorP - 1), doorWidth / 2, doorWidth - 0.24);
      addDoorDecal(getCachedLabelTexture(engineCtx, spec.type, { color: "white", font: "stencil", distress: 0.3 }), 0.1, getRibY(doorP - 2), doorWidth / 2 + 0.2, 0.4);
      const fontOpt = { color: "white", font: "sans", distress: 0.2 };
      addDoorDecal(getCachedLabelTexture(engineCtx, "最大总重 " + spec.gross + " 千克", fontOpt), 0.052, getRibY(doorP - 3) + 0.062, doorWidth / 2 - 0.01, 0.44);
      addDoorDecal(getCachedLabelTexture(engineCtx, "皮重 " + spec.tare + " 千克  净重 " + spec.net + " 千克", fontOpt), 0.045, getRibY(doorP - 3), doorWidth / 2 - 0.01, 0.44);
      addDoorDecal(getCachedLabelTexture(engineCtx, "容积 " + spec.cu + " 立方米", fontOpt), 0.045, getRibY(doorP - 3) - 0.062, doorWidth / 2 - 0.01, 0.44);
    } else {
      addDoorDecal(getCachedDecalTexture(engineCtx, CONTAINER_LOGOS[seed % 4]), 0.2, getRibY(doorP - 1), doorWidth / 2, doorWidth - 0.36);
      addDoorDecal(getCachedDecalTexture(engineCtx, "csc_plate"), 0.17, getRibY(1), doorWidth / 2 + 0.05, 0.36);
      if (type === "container40hc") {
        addDoorDecal(getCachedDecalTexture(engineCtx, "caution_stripes"), 0.1, doorTopY - 0.04, doorWidth / 2, doorWidth - 0.1);
      }
    }
    assembler.pop();

    // 开门后的动态旋转扇形碰撞盒 (Door Dynamic Colliders when Opened)
    if (hasOpenDoor) {
      for (let k = 0; k < 3; k++) {
        const segStart = doorWidth * k / 3;
        const segEnd   = doorWidth * (k + 1) / 3;
        const pA = [doorHingeX + Math.sin(swingAngle) * segStart, hingeZ - side * Math.cos(swingAngle) * segStart];
        const pB = [doorHingeX + Math.sin(swingAngle) * segEnd,   hingeZ - side * Math.cos(swingAngle) * segEnd];
        dynamicColliders.push({
          min: [Math.min(pA[0], pB[0]) - 0.03, doorBottomY, Math.min(pA[1], pB[1]) - 0.03],
          max: [Math.max(pA[0], pB[0]) + 0.03, doorTopY,    Math.max(pA[1], pB[1]) + 0.03],
          surface: "metal"
        });
      }
    }
  }

  // 7. 侧壁贴花、几猫海运标识与风化雨痕 (Side Wall Decals & Weathering)
  const addSideDecal = (dec, sz, py, pz, maxW) => {
    let finalW = pz * dec.aspect;
    if (maxW && finalW > maxW) {
      pz *= maxW / finalW;
      finalW = maxW;
    }
    const minX = py - finalW / 2;
    const maxX = py + finalW / 2;
    const effMinX = sz > 0 ? minX : -maxX;
    const effMaxX = sz > 0 ? maxX : -minX;
    const sideProf = generateCorrugatedProfilePoints(Math.max(startX, effMinX), Math.min(endX, effMaxX), CORRUGATION_SPECS.P, CORRUGATION_SPECS.d, CORRUGATION_SPECS.fo, CORRUGATION_SPECS.sl, startX + 0.02);
    const ribbon = createLoftedRibbonGeometry(
      sideProf,
      [pz - finalW / 2, pz + finalW / 2],
      (rx, rz, ry) => [rx, ry, sz * (innerHalfWidth + rz + 0.003 - getDentDisplacement(rx, ry, sz))],
      { center: [0, height / 2, 0] }
    );
    const pos = ribbon.attributes.position;
    const uv = ribbon.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) - effMinX) / (effMaxX - effMinX);
      uv.setXY(i, sz > 0 ? u : 1 - u, (pos.getY(i) - (pz - finalW / 2)) / finalW);
    }
    assembler.add(dec.material, ribbon, null, true);
    return finalW;
  };

  const bicDecal   = getCachedLabelTexture(engineCtx, CONTAINER_BIC_CODES[seed % CONTAINER_BIC_CODES.length], { color: "white", font: "stencil", distress: 0.3 });
  const typeDecal  = getCachedLabelTexture(engineCtx, spec.type, { color: "white", font: "stencil", distress: 0.3 });
  const logoDecal  = getCachedDecalTexture(engineCtx, CONTAINER_LOGOS[seed % 4]);

  for (const sz of [-1, 1]) {
    const logoH = Math.min(height * 0.4, 1.05);
    const logoW = Math.min(logoH * logoDecal.aspect, type === "container20" ? 2.2 : 3.4);
    addSideDecal(logoDecal, sz, type === "container20" ? -0.75 : -halfLength * 0.42, height * 0.52, logoW / logoDecal.aspect);

    const bicW = Math.min(0.14 * bicDecal.aspect, 1.9);
    addSideDecal(bicDecal, sz, halfLength - 0.3 - bicW / 2, height - 0.32, 0.14);

    const typeW = Math.min(0.11 * typeDecal.aspect, 0.6);
    addSideDecal(typeDecal, sz, halfLength - 0.3 - typeW / 2, height - 0.52, 0.11);

    const grimeStreakCount = Math.round((1 + prng() * 2) * (0.4 + wearFactor) * (length > 7 ? 1.6 : 1));
    for (let v = 0; v < grimeStreakCount; v++) {
      const streakDec = getCachedDecalTexture(engineCtx, prng() < 0.6 ? "rust_run" : "grime_streak");
      const streakH = 0.5 + prng() * 0.7;
      const streakW = Math.min(0.5, Math.max(0.16, streakH * streakDec.aspect));
      addSideDecal({ material: streakDec.material, aspect: streakW / streakH }, sz, (prng() * 2 - 1) * (halfLength - 0.6), topCorrugationY - streakH / 2 - 0.005, streakH);
    }
  }

  // 8. 物理碰撞包围盒定义 (Hollow Colliders if open, Solid AABB if closed)
  if (hasOpenDoor) {
    dynamicColliders.push(
      { min: [-halfLength, 0, -halfWidth],                max: [halfLength, floorLevel, halfWidth],               surface: "wood" },
      { min: [-halfLength, height - 0.09, -halfWidth],    max: [halfLength, height, halfWidth],                   surface: "metal" },
      { min: [-halfLength, 0, -halfWidth],                max: [halfLength, height, -halfWidth + 0.07],           surface: "metal" },
      { min: [-halfLength, 0, halfWidth - 0.07],          max: [halfLength, height, halfWidth],                   surface: "metal" },
      { min: [-halfLength, 0, -halfWidth],                max: [-halfLength + 0.07, height, halfWidth],           surface: "metal" }
    );
  } else {
    dynamicColliders.push({
      min: [-halfLength, 0, -halfWidth],
      max: [halfLength, height, halfWidth],
      surface: "metal"
    });
  }

  return { parts: assembler.parts(), colliders: dynamicColliders };
}

/**
 * 集装箱道具总装构建入口
 */
function buildContainerMesh(engineCtx, type, options = {}) {
  const spec = CONTAINER_SPECS[type];
  const seed = options.seed === undefined ? 0 : Math.abs(Math.floor(options.seed));
  const colorIdx = seed % 6;
  const colorName = options.color || ["red", "blue", "green", "yellow", "orange", "white", "grey", "teal"][colorIdx] || spec.def;
  const matName = "paint_" + colorName;
  const doorRatio = clamp(options.doors !== undefined ? +options.doors : 0, 0, 1);
  const wear = clamp(options.wear !== undefined ? +options.wear : 0.4, 0, 1);

  const cacheKey = `c_${type}_${seed}_${doorRatio.toFixed(2)}_${wear.toFixed(2)}`;
  let cached = prototypeCache.get(cacheKey);
  if (!cached) {
    cached = generateContainerGeometry(engineCtx, type, seed, doorRatio, wear);
    prototypeCache.set(cacheKey, cached);
  }

  const grp = new THREE.Group();
  for (const part of cached.parts) {
    let meshMat = part.mat;
    if (part.mat.body) {
      meshMat = engineCtx.mats.get(matName, { vertexColors: true });
    }
    const mesh = new THREE.Mesh(part.geo, meshMat);
    mesh.castShadow = part.cast;
    mesh.receiveShadow = true;
    grp.add(mesh);
  }

  grp.userData.size = [PROP_SIZES[type][0], PROP_SIZES[type][1], PROP_SIZES[type][2]];
  grp.userData.colliders = cached.colliders;
  grp.name = type;
  return grp;
}

// ============================================================================
// 七、 港区重工业基础设施道具构建器 (Port Infrastructure Builders)
// ============================================================================

/**
 * 新泽西水泥防撞隔离墩 (Jersey Concrete Barrier)
 */
function buildJerseyBarrier(engineCtx, options = {}) {
  const t = new PropMeshAssembler(engineCtx);
  const seed = options.seed | 0;
  const prng = createPropPRNG(seed + 11);
  const noise = seed * 3.7;
  const matConcrete = t.M("concrete", { vertexColors: true });

  const profile = [
    [-0.3, 0], [0.3, 0], [0.3, 0.076], [0.127, 0.33],
    [0.1, 0.57], [0.077, 0.79], [0.06, 0.81],
    [-0.06, 0.81], [-0.077, 0.79], [-0.1, 0.57],
    [-0.127, 0.33], [-0.3, 0.076]
  ];
  const xPath = [-1.5, -1.47];
  for (let f = -1.25; f <= 1.26; f += 0.25) xPath.push(f);
  xPath.push(1.47, 1.5);

  const barrierGeo = createLoftedRibbonGeometry(
    profile,
    xPath,
    (px, py, pxPos) => [pxPos, py, px],
    { center: [0, 0.4, 0], closed: true, caps: true }
  );

  const pos = barrierGeo.attributes.position;
  const norm = barrierGeo.attributes.normal;
  const colArr = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
    const ny = norm.getY(i);
    const n1 = sampleValueNoise2D(vx * 1.5 + noise, vz * 3);
    const n2 = sampleValueNoise2D(vx * 7, vy * 5 + noise);
    let factor = (0.78 + 0.22 * n1) * (0.88 + 0.12 * n2) * (0.82 + 0.18 * clamp(ny * 0.7 + 0.7, 0, 1));
    const groundOccl = clamp(1 - vy / 0.18, 0, 1);
    factor *= (1 - 0.4 * groundOccl * groundOccl * (0.6 + 0.4 * n2));
    colArr[i * 3]     = factor;
    colArr[i * 3 + 1] = factor * (1 - 0.04 * groundOccl);
    colArr[i * 3 + 2] = factor * (1 - 0.1 * groundOccl);
  }
  barrierGeo.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
  t.add(matConcrete, barrierGeo);

  // 两侧红白反光警示片与吊装钢筋环
  const matGalv = t.M("steel_galv");
  const matReflector = t.M("plastic_red");
  t.tube(matGalv, [[-0.8, 0.81, 0], [-0.8, 0.9, 0], [-0.74, 0.9, 0], [-0.74, 0.81, 0]], 0.008);
  t.tube(matGalv, [[0.74, 0.81, 0], [0.74, 0.9, 0], [0.8, 0.9, 0], [0.8, 0.81, 0]], 0.008);
  for (const sx of [-0.9, 0.9]) {
    for (const sz of [-1, 1]) {
      t.box(matReflector, 0.08, 0.04, 0.005, sx, 0.58, sz * 0.105, { rot: [sz > 0 ? 0.1 : -0.1, 0, 0] });
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
  const matLamp = engineCtx.mats.emissive(0xFFDEBD, options.on === false ? 0.02 : 8);

  // 混凝土基座
  t.box(matConc, 0.8, 0.32, 0.8, 0, 0.16, 0, { r: 0.03 });
  t.box(matGalv, 0.5, 0.03, 0.5, 0, 0.335, 0, { r: 0.006 });

  // 塔身四立柱与交叉斜撑 (Lattice Truss Mast)
  const mastH = 13.5;
  const rBot = 0.22;
  const rTop = 0.08;
  const legPts = [
    [-rBot, -rBot], [rBot, -rBot], [rBot, rBot], [-rBot, rBot]
  ];
  for (const lp of legPts) {
    t.bar(matGalv, [lp[0], 0.35, lp[1]], [lp[0] * (rTop / rBot), mastH, lp[1] * (rTop / rBot)], 0.02);
  }

  // 沿高度方向的多级横撑与斜撑
  const tiers = 14;
  for (let k = 0; k < tiers; k++) {
    const y0 = 0.35 + (mastH - 0.35) * (k / tiers);
    const y1 = 0.35 + (mastH - 0.35) * ((k + 1) / tiers);
    const rb0 = rBot + (rTop - rBot) * (k / tiers);
    const rb1 = rBot + (rTop - rBot) * ((k + 1) / tiers);
    for (let j = 0; j < 4; j++) {
      const pA0 = legPts[j].map(c => c * (rb0 / rBot));
      const pB0 = legPts[(j + 1) % 4].map(c => c * (rb0 / rBot));
      const pB1 = legPts[(j + 1) % 4].map(c => c * (rb1 / rBot));
      t.bar(matGalv, [pA0[0], y0, pA0[1]], [pB0[0], y0, pB0[1]], 0.012);
      t.bar(matGalv, [pA0[0], y0, pA0[1]], [pB1[0], y1, pB1[1]], 0.01);
    }
  }

  // 检修爬梯与安全护笼 (Ladder & Safety Cage)
  const ladX = rBot + 0.06;
  t.bar(matGalv, [ladX, 0.5, -0.15], [ladX * (rTop / rBot), mastH, -0.15], 0.012);
  t.bar(matGalv, [ladX, 0.5, 0.15],  [ladX * (rTop / rBot), mastH, 0.15], 0.012);
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
  const postList = posts === "both" ? [-1.5, 1.5] : posts === "left" ? [-1.5] : posts === "right" ? [1.5] : [];

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
    t.add(matGlass, transformGeometryInPlace(new THREE.PlaneGeometry(1.7, 0.9), 0, 1.45, sz + (sz > 0 ? 0.021 : -0.021), [0, sz > 0 ? 0 : PI, 0]), null, true);
  }
  // 正面出入工作窗
  t.box(matDark, 0.04, 1.0, 1.4, 1.26, 1.45, 0);
  t.add(matGlass, transformGeometryInPlace(new THREE.PlaneGeometry(1.3, 0.9), 1.28, 1.45, 0, [0, HALF_PI, 0]), null, true);

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
  const matRust  = t.M("steel_rust");

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
  const matLamp = engineCtx.mats.emissive(0xFFDEBD, options.on === false ? 0.02 : 10);

  // 伸缩立杆
  t.cyl(matAlum, 0.021, 0.021, 1.1, 0, 0.75, 0, { seg: 8, open: true });
  t.cyl(matAlum, 0.016, 0.016, 0.9, 0, 1.6, 0, { seg: 8, open: true });
  t.cyl(matDark, 0.03, 0.03, 0.06, 0, 1.3, 0, { seg: 8 });

  // 三脚折叠支腿 (Tripod Legs)
  for (let i = 0; i < 3; i++) {
    const angle = i * (PI * 2 / 3);
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
  const railSides = rails === "both" ? [-1, 1] : rails === "left" ? [-1] : rails === "right" ? [1] : [];

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
  const labelId = options.id || options.label || ("ABC"[seed % 3]);
  const t = new PropMeshAssembler(engineCtx);

  const matGrey = t.M("paint_grey", { vertexColors: true });
  const matDark = t.M("steel_dark");
  const matGalv = t.M("steel_galv");
  const matAlum = t.M("aluminium");
  const matScreen = engineCtx.mats.emissive(0x38D8FF, 3.5);
  const matLed = engineCtx.mats.emissive(0x40FF60, 4.0);

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


// ============================================================================
// 八、 辅助几何变换与材质调色板 (Geometry Helpers & Color Palette)
// ============================================================================

/**
 * 颜色名称映射至材质名与亮度因子
 */
const COLOR_PALETTE = {
  blue:   ["paint_blue",   1.0],
  red:    ["paint_red",    1.0],
  green:  ["paint_green",  1.0],
  yellow: ["paint_yellow", 1.0],
  orange: ["paint_orange", 1.0],
  white:  ["paint_white",  1.0],
  grey:   ["paint_grey",   1.0],
  teal:   ["paint_teal",   1.0],
  olive:  ["paint_green",  0.8]
};

function resolveColorPalette(colorName, fallback = "blue") {
  return COLOR_PALETTE[colorName] || COLOR_PALETTE[fallback] || ["paint_blue", 1.0];
}

/**
 * 将旋转、位移与缩放参数组合为 Matrix4
 */
function composeTransformMatrix4({ p = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}) {
  const euler = new THREE.Euler(r[0], r[1], r[2]);
  const quat = new THREE.Quaternion().setFromEuler(euler);
  const pos = new THREE.Vector3(p[0], p[1], p[2]);
  const scale = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(s[0], s[1], s[2]);
  return new THREE.Matrix4().compose(pos, quat, scale);
}

/**
 * 遍历并修改几何体顶点位置
 */
function traverseAndMutateVertices(geo, mutatorFn) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    mutatorFn(v, i, pos.count);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  return geo;
}

/**
 * 重新计算法线与包围盒
 */
function recomputeNormalsAndBounds(geo) {
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * 乘以顶点颜色亮度系数
 */
function applyVertexColorLuminance(geo, factor) {
  const count = geo.attributes.position.count;
  let colAttr = geo.attributes.color;
  if (!colAttr) {
    colAttr = new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3);
    geo.setAttribute('color', colAttr);
  }
  const arr = colAttr.array;
  for (let i = 0; i < count * 3; i++) {
    arr[i] *= factor;
  }
  colAttr.needsUpdate = true;
  return geo;
}

/**
 * 创建倒角长方体网格 (Chamfered Box Geometry)
 */
function createChamferedBoxGeometry(w, h, d, bevel = 0.008, origin = "center") {
  const geo = createBeveledBoxGeometry(w, h, d, bevel, origin);
  return geo;
}

/**
 * 创建带细分的圆角多面体盒子 (Subdivided Box Geometry)
 */
function createSubdividedBoxGeometry(w, h, d, bevel, segX = 3, segY = 3, segZ = 3, origin = "center") {
  const geo = new THREE.BoxGeometry(w, h, d, segX, segY, segZ);
  if (origin === "bottom") geo.translate(0, h / 2, 0);
  return geo;
}

/**
 * 创建连接两点的圆柱管 (Connecting Cylinder Between 2 Points)
 */
function createConnectingCylinder(p0, p1, radius = 0.02, seg = 6, caps = true) {
  const v0 = new THREE.Vector3(p0[0], p0[1], p0[2]);
  const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
  const delta = new THREE.Vector3().subVectors(v1, v0);
  const len = delta.length();
  const geo = ot(radius, radius, len, seg, !caps);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3().addVectors(v0, v1).multiplyScalar(0.5),
    q,
    new THREE.Vector3(1, 1, 1)
  );
  geo.applyMatrix4(m);
  return geo;
}

/**
 * 创建定向倒角盒梁 (Oriented Box Beam Between 2 Points)
 */
function createOrientedBoxBeam(p0, p1, width, depth, bevel = 0.006, raw = false) {
  const v0 = new THREE.Vector3(p0[0], p0[1], p0[2]);
  const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
  const delta = new THREE.Vector3().subVectors(v1, v0);
  const len = delta.length();
  delta.normalize();
  const geo = raw ? $e(width, len, depth) : createChamferedBoxGeometry(width, len, depth, bevel);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3().addVectors(v0, v1).multiplyScalar(0.5),
    q,
    new THREE.Vector3(1, 1, 1)
  );
  geo.applyMatrix4(m);
  return geo;
}

/**
 * 创建圆柱面贴花 (Curved Cylinder Decal)
 */
function createCurvedCylinderDecal(w, h, radius, seg = 4) {
  const geo = new THREE.PlaneGeometry(w, h, seg, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const pz = -Math.sqrt(Math.max(0, radius * radius - px * px)) + radius;
    pos.setZ(i, pz);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * 200L 工业标准油桶/化学品钢桶截面轮廓 (200-Liter Industrial Drum Lathe Profile)
 */
function generateBarrelProfilePoints(isOpen = false) {
  const pts = [
    [0, 0.016], [0.262, 0.016], [0.262, 0.016], [0.268, 0.002],
    [0.288, 0], [0.295, 0.008], [0.295, 0.022], [0.284, 0.034]
  ];
  // 两个桶身环形加强滚筋 (2 Rolling Hoops / Ribs)
  for (const n of [0.305, 0.595]) {
    pts.push(
      [0.283, n - 0.03],
      [0.291, n - 0.018],
      [0.297, n],
      [0.291, n + 0.018],
      [0.283, n + 0.03]
    );
  }
  pts.push([0.284, 0.866], [0.295, 0.878], [0.295, 0.892], [0.288, 0.9], [0.268, 0.898]);
  if (isOpen) {
    pts.push([0.268, 0.898], [0.272, 0.888], [0.272, 0.03], [0.272, 0.03], [0, 0.03]);
  } else {
    pts.push([0.262, 0.884], [0.262, 0.884], [0, 0.884]);
  }
  return pts;
}

/**
 * 旋转轮廓生成回转体几何体 (Lathe Revolved Geometry)
 */
function createRevolvedGeometry(profile, seg = 16) {
  const pts = profile.map(p => new THREE.Vector2(p[0], p[1]));
  return new THREE.LatheGeometry(pts, seg);
}

/**
 * 轮胎胎面花纹多边形截面轮廓
 */
function generateTireTreadProfile(width, radius, rimRadius, seg = 20) {
  const halfW = width / 2;
  const pts = [
    new THREE.Vector2(rimRadius, -halfW * 0.7),
    new THREE.Vector2(rimRadius, halfW * 0.7),
    new THREE.Vector2(radius * 0.88, halfW),
    new THREE.Vector2(radius, halfW * 0.9),
    new THREE.Vector2(radius, -halfW * 0.9),
    new THREE.Vector2(radius * 0.88, -halfW)
  ];
  return new THREE.LatheGeometry(pts, seg);
}

/**
 * 车轮与轮毂组件生成器 (Vehicle Wheel Assembly)
 */
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
  const boxFn = (w, h, d, p) => builder.add("wood_pallet", bevel ? createChamferedBoxGeometry(w, h, d, 0.004) : $e(w, h, d), { p });

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
      r: [0, prng.range(-0.035, 0.035) + (prng() < 0.3 ? PI : 0) + (isTop ? prng.range(-0.06, 0.06) : 0)]
    });
    buildPalletGeometry(b, prng, { broken: false, bevel: false });
    b.pop();
  }
  return b.finish({ size: [1.2, count * 0.144, 1.0] });
}

/**
 * 木质包装箱几何生成核心 (Wooden Crate Generator)
 */
function buildWoodCrateGeometry(builder, w, h, d, { detail = true, label = "易碎物品", code = "B4-117", skids = true } = {}) {
  const prng = builder.rng;
  const skidH = skids ? 0.07 : 0;
  const boxH = h - skidH;
  const boxCenterY = skidH + boxH / 2;

  // 主箱体 (Main Crate Body)
  builder.add("wood_pallet", detail ? createChamferedBoxGeometry(w, boxH, d, 0.004) : $e(w, boxH, d), { p: [0, boxCenterY, 0] }, prng.range(0.85, 1.0));

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
    builder.label(label, { color: "black", font: "stencil", distress: 0.35 }, 0.45, 0.14, { p: [0, boxCenterY + 0.1, d / 2 + 0.002] });
  }
  if (code) {
    builder.label(code, { color: "black", font: "stencil", distress: 0.35 }, 0.35, 0.09, { p: [0, boxCenterY - 0.1, d / 2 + 0.002] });
  }
}

/**
 * 欧标木质货箱 (Wooden Crate)
 */
function buildCrateWood(engineCtx, options = {}) {
  const b = new PropCompoundBuilder(engineCtx, "crate_wood", options.seed || 0);
  const labels = ["易碎物品", "此面向上", "保持干燥", "机械零件"];
  buildWoodCrateGeometry(b, 1.1, 1.0, 0.9, {
    label: options.label === undefined ? labels[b.seed % labels.length] : options.label,
    code: options.code || ("B4-" + [117, 204, 318][b.seed % 3])
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
  buildWoodCrateGeometry(b, 1.2, 0.95, 1.0, { label: "重物", code: "几猫04" + (b.seed % 2) });
  // 上层错落中货箱
  b.push({
    p: [prng.range(-0.1, 0.02), 0.95, prng.range(-0.05, 0.05)],
    r: [0, (prng() < 0.5 ? -1 : 1) * prng.range(0.1, 0.16), 0]
  });
  buildWoodCrateGeometry(b, 0.86, 0.82, 0.72, { label: "此面向上", code: "B4-88" });
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
      b.add("steel_galv", createChamferedBoxGeometry(0.12, 0.074, 0.1, 0.005), { p: [sx, 0.065, sz] });
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
    b.add("wood_dark", ot(radius, radius, flangeThick, 20), { p: [0, radius, sz], rot: [HALF_PI, 0, 0] }, prng.range(0.8, 1.0));
  }

  // 中间圆柱形电缆卷筒 (Core Cylinder)
  const coreRadius = 0.32;
  b.add("wood_pallet", ot(coreRadius, coreRadius, width - 2 * flangeThick, 16), { p: [0, radius, 0], rot: [HALF_PI, 0, 0] });

  // 缠绕黑色橡胶护套特种高压电缆 (Coiled High-Voltage Rubber Cable)
  const cableRadius = 0.54;
  b.add("rubber", ot(cableRadius, cableRadius, width - 2 * flangeThick - 0.02, 18), { p: [0, radius, 0], rot: [HALF_PI, 0, 0] }, 0.7);

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
      p: [i ? prng.range(-0.03, 0.03) : 0, i * tireWidth + tireWidth / 2, i ? prng.range(-0.03, 0.03) : 0],
      r: [HALF_PI, 0, prng() * 6]
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
    b.add(matName, createConnectingCylinder([-0.11, 0.39, sz], [0.08, 0.39, sz], 0.012, 6), null, tint);
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
    b.add("steel_dark", createChamferedBoxGeometry(0.04, 1.14, 0.04, 0.005), { p: [sx, 0.585, -0.225] });
    b.add("steel_dark", createChamferedBoxGeometry(0.04, 1.14, 0.04, 0.005), { p: [sx, 0.585, 0.225] });
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
    b.add(cylColors[i % cylColors.length], new THREE.SphereGeometry(0.1, 12, 8, 0, PI * 2, 0, HALF_PI), { p: [cx, 1.275, 0] });
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
    { count: 2, y: 0.08 + radius + radius * Math.sqrt(3) * 2, zStart: -0.14 }
  ];

  for (const lyr of layers) {
    for (let i = 0; i < lyr.count; i++) {
      const cz = lyr.zStart + i * (radius * 2);
      const pipeGeo = ot(radius, radius, pipeLen, 16, true);
      b.add("steel_rust", pipeGeo, { p: [0, lyr.y, cz], rot: [0, 0, HALF_PI] }, prng.range(0.8, 1.0));
      // 内部内壁暗色
      b.add("steel_dark", ot(radius - 0.015, radius - 0.015, pipeLen - 0.01, 14, true), { p: [0, lyr.y, cz], rot: [0, 0, HALF_PI] }, 0.5);
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
    b.tube("polymer_tan", [[sx, 0.1, -0.68], [sx, 1.45, -0.68], [sx, 1.48, 0.68], [sx, 0.1, 0.68]], 0.008);
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
      traverseAndMutateVertices(bagGeo, v => {
        const deform = (sampleSimplexNoise3D(v.x * 8, v.y * 8, v.z * 8) - 0.5) * 0.03;
        v.y += deform;
        v.x += deform * 0.5;
      });
      recomputeNormalsAndBounds(bagGeo);
      b.add("tarp", bagGeo, { p: [x, y, prng.range(-0.02, 0.02)], r: [0, prng.range(-0.08, 0.08), 0] }, prng.range(0.78, 0.96));
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
    b.add("polymer_tan", $e(bw + 0.002, 0.05, bd + 0.002), { p: [px, py + bh / 2, pz], r: [0, ry, 0] }, 0.9);
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
    b.add(matGalv, createChamferedBoxGeometry(0.05, 0.75, 0.12, 0.006), { p: [mastX + 0.12, carriageY + 0.36, sz] });
    // 水平货叉长臂 (1.2m Fork Tine)
    b.add(matGalv, createChamferedBoxGeometry(1.22, 0.045, 0.12, 0.005), { p: [mastX + 0.72, carriageY + 0.025, sz] });
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
    b.add("plastic_grey", createChamferedBoxGeometry(0.9, 0.04, 1.1, 0.01), { p: [sx, 1.32, 0] }, 0.8);
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
    b.add(matBody, createChamferedBoxGeometry(0.68, dh - 0.01, 0.02, 0.004), { p: [0.04, curY, 0.235] }, tint);
    b.add(matAlum, $e(0.62, 0.016, 0.016), { p: [0.04, curY + dh / 2 - 0.02, 0.245] });
    curY -= dh / 2;
  }

  // 顶层防油橡胶工作台垫 (Top Rubber Mat)
  b.add("rubber", $e(0.7, 0.01, 0.42), { p: [0.04, 0.785, 0] });

  // 侧边坚固推手把 (Side Tubular Grab Handle)
  b.tube(matAlum, [[-0.35, 0.72, -0.17], [-0.43, 0.72, -0.17], [-0.43, 0.72, 0.17], [-0.35, 0.72, 0.17]], 0.014);

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
  registerPropBuilder("jersey_barrier",   buildJerseyBarrier);
  registerPropBuilder("light_mast",       buildLightMast);
  registerPropBuilder("fence_panel",      buildFencePanel);
  registerPropBuilder("guard_booth",      buildGuardBooth);
  registerPropBuilder("gate_arm",         buildGateArm);
  registerPropBuilder("bollard_mooring",  buildBollardMooring);
  registerPropBuilder("bollard_post",     buildBollardPost);
  registerPropBuilder("sign_post",        buildSignPost);
  registerPropBuilder("floodlight_stand", buildFloodlightStand);
  registerPropBuilder("stairs_metal",     buildStairsMetal);
  registerPropBuilder("catwalk",          buildCatwalk);
  registerPropBuilder("shelf_rack",       buildShelfRack);
  registerPropBuilder("reefer_unit",      buildReeferUnit);
  registerPropBuilder("relay_node",       buildRelayNode);

  // 3. 物流与仓储货物
  registerPropBuilder("barrel",           (ctx, opts = {}) => withCachedPrototype(`barrel|${opts.color}|${!!opts.lying}|${!!opts.open}|${Math.abs(opts.seed | 0) % 4}`, () => buildBarrel(ctx, opts, Math.abs(opts.seed | 0) % 4)));
  registerPropBuilder("pallet",           (ctx, opts = {}) => withCachedPrototype(`pallet|${!!opts.broken}|${Math.abs(opts.seed | 0) % 4}`, () => buildPallet(ctx, opts, Math.abs(opts.seed | 0) % 4)));
  registerPropBuilder("pallet_stack",     buildPalletStack);
  registerPropBuilder("crate_wood",       buildCrateWood);
  registerPropBuilder("crate_stack",      buildCrateStack);
  registerPropBuilder("ibc_tote",         buildIbcTote);
  registerPropBuilder("cable_reel",       buildCableReel);
  registerPropBuilder("tire_stack",       buildTireStack);
  registerPropBuilder("jerry_can",        (ctx, opts = {}) => withCachedPrototype(`jerry|${opts.color}|${Math.abs(opts.seed | 0) % 2}`, () => buildJerryCan(ctx, opts, Math.abs(opts.seed | 0) % 2)));
  registerPropBuilder("traffic_cone",     (ctx, opts = {}) => withCachedPrototype(`cone|${!!opts.lying}|${Math.abs(opts.seed | 0) % 3}`, () => buildTrafficCone(ctx, opts, Math.abs(opts.seed | 0) % 3)));
  registerPropBuilder("gas_cylinders",    buildGasCylinders);
  registerPropBuilder("pipe_stack",       buildPipeStack);
  registerPropBuilder("tarp_cargo",       buildTarpCargo);
  registerPropBuilder("sandbags",         buildSandbags);
  registerPropBuilder("cardboard_boxes",  buildCardboardBoxes);

  // 4. 重工业机械与车辆
  registerPropBuilder("forklift",         buildForklift);
  registerPropBuilder("generator",        buildGenerator);
  registerPropBuilder("dumpster",         buildDumpster);
  registerPropBuilder("toolbox_cart",     buildToolboxCart);
})();

/**
 * 道具系统主工厂接口
 */
export function createPropsManager(engineCtx) {
  return {
    names: () => Object.keys(PROP_SIZES),
    has: name => !!PROP_SIZES[name],
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
      fallback.add(Qi($e(def[0], def[1], def[2], "bottom"), engineCtx.mats.get(def[3])));
      fallback.userData.colliders = [{
        min: [-def[0] / 2, 0, -def[2] / 2],
        max: [def[0] / 2, def[1], def[2] / 2],
        surface: def[4]
      }];
      fallback.userData.size = [def[0], def[1], def[2]];
      fallback.userData.prop = name;
      return fallback;
    }
  };
}

/**
 * 道具展示厅与阵列预览
 */
export function showcaseProps(engineCtx) {
  const names = engineCtx.params.names ? engineCtx.params.names.split(",") : Object.keys(PROP_SIZES);
  let curX = 0, curZ = 0, rowMaxZ = 0, totalWidth = 0;

  for (const name of names) {
    const mesh = engineCtx.props.build(name, {
      seed: 7,
      doors: name.startsWith("container") ? 0.6 : 0
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
    target: [midX, 1, curZ / 2]
  };
}

// 统一导出兼容对象 (ESM Exports)
export const create = createPropsManager;
export const register = registerPropBuilder;
export const showcase = showcaseProps;

const $g = {
  PROP_SIZES,
  create: createPropsManager,
  register: registerPropBuilder,
  showcase: showcaseProps
};
export { $g };

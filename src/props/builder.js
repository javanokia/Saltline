import * as THREE from "three";
import { createSeededRandom } from "../constants.js";
import {
  createBoxGeometry,
  createCylinderGeometry,
  createTubeFromPoints,
  transformGeometry,
  setVertexColors,
  mergeGeometriesClean,
} from "../geo.js";

export const PROP_SIZES = {
  // ISO 集装箱系列 (Shipping Containers)
  container20: [6.06, 2.59, 2.44, "paint_red", "metal"],
  container40: [12.19, 2.59, 2.44, "paint_blue", "metal"],
  container40hc: [12.19, 2.9, 2.44, "paint_green", "metal"],

  // 港区重工业基础设施 (Port Infrastructure)
  jersey_barrier: [3.0, 0.81, 0.6, "concrete", "concrete"],
  light_mast: [0.5, 14.0, 0.5, "steel_galv", "metal"],
  fence_panel: [3.0, 2.4, 0.08, "chainlink", "metal"],
  guard_booth: [2.6, 2.7, 2.2, "paint_white", "metal"],
  gate_arm: [5.0, 1.1, 0.3, "hazard_stripes", "metal"],
  bollard_mooring: [0.7, 0.6, 0.7, "steel_dark", "metal"],
  bollard_post: [0.17, 1.0, 0.17, "paint_yellow", "metal"],
  sign_post: [0.6, 2.4, 0.08, "paint_white", "metal"],
  floodlight_stand: [1.0, 2.2, 1.0, "paint_yellow", "metal"],
  stairs_metal: [3.0, 2.6, 1.0, "diamond_plate", "metal"],
  catwalk: [3.0, 1.1, 1.2, "diamond_plate", "metal"],
  shelf_rack: [2.7, 4.2, 1.1, "paint_orange", "metal"],
  reefer_unit: [0.5, 2.3, 2.3, "paint_white", "metal"],
  relay_node: [1.2, 2.4, 0.8, "paint_grey", "metal"],

  // 仓储物流与货物 (Logistics & Cargo)
  barrel: [0.6, 0.9, 0.6, "paint_blue", "metal"],
  pallet: [1.2, 0.144, 1.0, "wood_pallet", "wood"],
  pallet_stack: [1.2, 1.15, 1.0, "wood_pallet", "wood"],
  crate_wood: [1.1, 1.0, 0.9, "wood_pallet", "wood"],
  crate_stack: [1.2, 1.9, 1.0, "wood_pallet", "wood"],
  ibc_tote: [1.2, 1.16, 1.0, "plastic_grey", "metal"],
  cable_reel: [1.3, 1.3, 0.8, "wood_dark", "wood"],
  tire_stack: [0.8, 1.0, 0.8, "tire", "rubber"],
  jerry_can: [0.35, 0.47, 0.17, "paint_green", "metal"],
  traffic_cone: [0.36, 0.7, 0.36, "plastic_red", "rubber"],
  gas_cylinders: [0.9, 1.6, 0.5, "steel_dark", "metal"],
  pipe_stack: [6.0, 0.9, 1.2, "steel_rust", "metal"],
  tarp_cargo: [2.4, 1.5, 1.4, "tarp", "dirt"],
  sandbags: [2.0, 0.9, 0.6, "tarp", "dirt"],
  cardboard_boxes: [1.0, 0.8, 0.8, "cardboard", "wood"],

  // 重型设备与车辆 (Machinery & Vehicles)
  forklift: [3.4, 2.2, 1.25, "paint_yellow", "metal"],
  generator: [2.2, 1.4, 1.0, "paint_yellow", "metal"],
  dumpster: [1.9, 1.35, 1.1, "paint_green", "metal"],
  toolbox_cart: [0.9, 0.95, 0.5, "plastic_red", "metal"],
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
  a[2] + (b[2] - a[2]) * t,
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
      fy,
    ),
    mix(
      mix(hash3D(ix, iy, iz + 1), hash3D(ix + 1, iy, iz + 1), fx),
      mix(hash3D(ix, iy + 1, iz + 1), hash3D(ix + 1, iy + 1, iz + 1), fx),
      fy,
    ),
    fz,
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
function createBeveledBoxGeometry(width, height, depth, bevel = 0.01, origin = "center") {
  bevel = Math.max(
    0.0005,
    Math.min(bevel, width / 2 - 0.0001, height / 2 - 0.0001, depth / 2 - 0.0001),
  );
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;
  const posArr = new Float32Array(72);
  const normArr = new Float32Array(72);
  const uvArr = new Float32Array(48);

  const getCornerIndex = (cx, cy, cz, comp) =>
    ((cx > 0 ? 1 : 0) + (cy > 0 ? 2 : 0) + (cz > 0 ? 4 : 0)) * 3 + comp;

  for (const cx of [-1, 1]) {
    for (const cy of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const pOffsets = [
          [cx * hw, cy * (hh - bevel), cz * (hd - bevel)],
          [cx * (hw - bevel), cy * hh, cz * (hd - bevel)],
          [cx * (hw - bevel), cy * (hh - bevel), cz * hd],
        ];
        const nVectors = [
          [cx, 0, 0],
          [0, cy, 0],
          [0, 0, cz],
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
    const ax = posArr[ia * 3],
      ay = posArr[ia * 3 + 1],
      az = posArr[ia * 3 + 2];
    const bax = posArr[ib * 3] - ax,
      bay = posArr[ib * 3 + 1] - ay,
      baz = posArr[ib * 3 + 2] - az;
    const cax = posArr[ic * 3] - ax,
      cay = posArr[ic * 3 + 1] - ay,
      caz = posArr[ic * 3 + 2] - az;
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

  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
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
        getCornerIndex(-1, cx, cy, 2),
      );
      addQuad(
        getCornerIndex(cx, -1, cy, 0),
        getCornerIndex(cx, 1, cy, 0),
        getCornerIndex(cx, 1, cy, 2),
        getCornerIndex(cx, -1, cy, 2),
      );
      addQuad(
        getCornerIndex(cx, cy, -1, 0),
        getCornerIndex(cx, cy, 1, 0),
        getCornerIndex(cx, cy, 1, 1),
        getCornerIndex(cx, cy, -1, 1),
      );
    }
  }
  for (const cx of [-1, 1]) {
    for (const cy of [-1, 1]) {
      for (const cz of [-1, 1]) {
        addTri(
          getCornerIndex(cx, cy, cz, 0),
          getCornerIndex(cx, cy, cz, 1),
          getCornerIndex(cx, cy, cz, 2),
        );
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normArr, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvArr, 2));
  geom.setIndex(indices);
  if (origin === "bottom") geom.translate(0, height / 2, 0);
  return geom;
}

/**
 * 校验多边形绕向并在与中心法向相反时执行逆转
 */
function checkFaceWinding(positions, uvs, startIdx, endIdx, center, invert) {
  let accum = 0;
  for (let a = startIdx; a < endIdx; a += 9) {
    const abx = positions[a + 3] - positions[a],
      aby = positions[a + 4] - positions[a + 1],
      abz = positions[a + 5] - positions[a + 2];
    const acx = positions[a + 6] - positions[a],
      acy = positions[a + 7] - positions[a + 1],
      acz = positions[a + 8] - positions[a + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    accum +=
      nx * ((positions[a] + positions[a + 3] + positions[a + 6]) / 3 - center[0]) +
      ny * ((positions[a + 1] + positions[a + 4] + positions[a + 7]) / 3 - center[1]) +
      nz * ((positions[a + 2] + positions[a + 5] + positions[a + 8]) / 3 - center[2]);
  }
  if (accum < 0 !== !invert) {
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
function createLoftedRibbonGeometry(
  profile,
  pathY,
  transformFn,
  { closed = false, center = null, inward = false, caps = false } = {},
) {
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
        distAlong[b],
        y0,
        distAlong[b + 1],
        y0,
        distAlong[b + 1],
        y1,
        distAlong[b],
        y0,
        distAlong[b + 1],
        y1,
        distAlong[b],
        y1,
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
    let avgX = 0,
      avgY = 0;
    for (const p of profile) {
      avgX += p[0];
      avgY += p[1];
    }
    avgX /= profLen;
    avgY /= profLen;

    for (const endIdx of [0, pathY.length - 1]) {
      const startVert = positions.length;
      const curY = pathY[endIdx];
      const capCenter = transformFn(avgX, avgY, curY, endIdx);
      for (let i = 0; i < profLen; i++) {
        const p0 = profile[i];
        const p1 = profile[(i + 1) % profLen];
        positions.push(
          ...capCenter,
          ...transformFn(p0[0], p0[1], curY, endIdx),
          ...transformFn(p1[0], p1[1], curY, endIdx),
        );
        uvs.push(avgX, avgY, p0[0], p0[1], p1[0], p1[1]);
      }
      checkFaceWinding(positions, uvs, startVert, positions.length, calcCenter, inward);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(positions), 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(uvs), 2));
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
  if (modX < flat1 + slope) return (-depth * (modX - flat1)) / slope;
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
  return pts.map((p) => [p, evalCorrugationWave(p - offset, period, depth, flat1, slope)]);
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
        Math.sin(angle) * r + (u < 2 ? oy : -oy),
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
  geom.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(positions), 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(uvs), 2));
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
const quatHelper = new THREE.Quaternion();
const matHelper = new THREE.Matrix4();
const posHelper = new THREE.Vector3();
const scaleOne = new THREE.Vector3(1, 1, 1);

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
    if (colorVal) setVertexColors(geo, colorVal);
    let bucket = this.buckets.get(mat);
    if (!bucket) {
      bucket = { mat, geos: [], cast: !noCast };
      this.buckets.set(mat, bucket);
    }
    bucket.geos.push(geo);
    return geo;
  }

  box(mat, w, h, d, x, y, z, opts = {}) {
    const geo =
      opts.r === 0
        ? createBoxGeometry(w, h, d)
        : createBeveledBoxGeometry(w, h, d, opts.r || Math.min(0.012, Math.min(w, h, d) * 0.25));
    return this.add(mat, transformGeometryInPlace(geo, x, y, z, opts.rot), opts.col);
  }

  cyl(mat, rTop, rBottom, height, x, y, z, opts = {}) {
    let geo = createCylinderGeometry(rTop, rBottom, height, opts.seg || 12, !!opts.open);
    if (opts.flat) geo = toFlatShadedGeometry(geo);
    return this.add(mat, transformGeometryInPlace(geo, x, y, z, opts.rot), opts.col);
  }

  tube(mat, points, radius, opts = {}) {
    return this.add(
      mat,
      createTubeFromPoints(
        points,
        radius,
        opts.seg || 6,
        false,
        opts.tension === undefined ? 0.5 : opts.tension,
      ),
      opts.col,
    );
  }

  bar(mat, p0, p1, radius, opts = {}) {
    const delta = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    const len = delta.length();
    const geo = createCylinderGeometry(
      opts.r2 === undefined ? radius : opts.r2,
      radius,
      len,
      opts.seg || 6,
      !opts.caps,
    );
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2),
      q,
      scaleOne,
    );
    geo.applyMatrix4(m);
    return this.add(mat, geo, opts.col);
  }

  beam(mat, p0, p1, width, depth, opts = {}) {
    const delta = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    const len = delta.length();
    const geo =
      opts.r === 0
        ? createBoxGeometry(width, len, depth)
        : createBeveledBoxGeometry(width, len, depth, opts.r || Math.min(width, depth) * 0.2);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    if (opts.twist)
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), opts.twist));
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2),
      q,
      scaleOne,
    );
    geo.applyMatrix4(m);
    return this.add(mat, geo, opts.col);
  }

  decal(decalObj, w, h, x, y, z, rotEuler, aspect) {
    const plane = new THREE.PlaneGeometry(aspect || w * decalObj.aspect, w);
    return this.add(
      decalObj.material,
      transformGeometryInPlace(plane, x, y, z, rotEuler),
      null,
      true,
    );
  }

  parts() {
    const res = [];
    for (const b of this.buckets.values()) {
      res.push({ mat: b.mat, geo: mergeGeometriesClean(b.geos), cast: b.cast });
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
    this.rng = createSeededRandom((this.seed + 1) * 7919 + propName.length * 131);
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
    const m = typeof matOrName === "string" ? this.mat(matOrName) : matOrName;
    if (trans) transformGeometry(geo, trans);
    geo.applyMatrix4(this.stack[this.stack.length - 1]);
    if (!raw) applyVertexColorLuminance(geo, lumFactor);
    const key = m.uuid + (cast ? "c" : "n");
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
    const geo = createTubeFromPoints(
      points,
      radius,
      opts.radial || 6,
      opts.closed || false,
      opts.tension ?? 0.5,
    );
    return this.add(matOrName, geo, opts.trans, 1, {
      raw: opts.raw || false,
      cast: opts.cast !== false,
    });
  }

  /**
   * @param {{ size?: [number, number, number]; colliders?: any[]; grime?: number; surface?: string }} [options]
   */
  finish({ size, colliders, grime = 1, surface } = {}) {
    const grp = new THREE.Group();
    const noiseOffset = this.seed * 3.71;

    for (const bucket of this.b.values()) {
      const mergedGeo = mergeGeometriesClean(bucket.geos);
      if (!bucket.raw && grime > 0 && mergedGeo.attributes.color) {
        const pos = mergedGeo.attributes.position;
        const norm = mergedGeo.attributes.normal;
        const colArr = mergedGeo.attributes.color.array;
        for (let v = 0; v < pos.count; v++) {
          const vx = pos.getX(v),
            vy = pos.getY(v),
            vz = pos.getZ(v);
          const ny = norm.getY(v);
          const n1 = sampleSimplexNoise3D(vx * 1.9 + noiseOffset, vy * 1.9, vz * 1.9 + 5.3);
          const n2 = sampleSimplexNoise3D(vx * 9 + 2.1, vy * 9 + noiseOffset, vz * 9);
          let factor =
            (0.82 + 0.18 * n1) * (0.92 + 0.08 * n2) * (0.76 + 0.24 * clamp(ny * 0.6 + 0.62, 0, 1));
          const groundOccl = clamp(1 - vy / 0.2, 0, 1);
          factor *= 1 - 0.42 * groundOccl * groundOccl * (0.55 + 0.45 * n2);
          factor = 1 + (factor - 1) * grime;
          colArr[v * 3] *= factor;
          colArr[v * 3 + 1] *= factor * (1 - 0.05 * groundOccl * grime);
          colArr[v * 3 + 2] *= factor * (1 - 0.12 * groundOccl * grime);
        }
      }
      const mesh = new THREE.Mesh(mergedGeo, bucket.mat);
      mesh.castShadow = bucket.cast;
      mesh.receiveShadow = true;
      grp.add(mesh);
    }

    const defaultDef = PROP_SIZES[this.name] || [1, 1, 1, "", "metal"];
    const finalSize = size || [defaultDef[0], defaultDef[1], defaultDef[2]];
    grp.userData.size = finalSize;
    grp.userData.colliders = colliders || [
      {
        min: [-finalSize[0] / 2, 0, -finalSize[2] / 2],
        max: [finalSize[0] / 2, finalSize[1], finalSize[2] / 2],
        surface: surface || defaultDef[4],
      },
    ];
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
    subMap.set(
      key,
      lbl && lbl.material
        ? lbl
        : {
            material: engineCtx.mats.get("paint_white"),
            aspect: Math.max(1, text.length * 0.6),
          },
    );
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
    subMap.set(
      key,
      dec && dec.material
        ? dec
        : {
            material: engineCtx.mats.get("paint_white"),
            aspect: 1,
          },
    );
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

function createChamferedBoxGeometry(w, h, d, bevel = 0.008, origin = "center") {
  const geo = createBeveledBoxGeometry(w, h, d, bevel, origin);
  return geo;
}

/**
 * 创建带细分的圆角多面体盒子 (Subdivided Box Geometry)
 */
function createSubdividedBoxGeometry(
  w,
  h,
  d,
  bevel,
  segX = 3,
  segY = 3,
  segZ = 3,
  origin = "center",
) {
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
  const geo = createCylinderGeometry(radius, radius, len, seg, !caps);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3().addVectors(v0, v1).multiplyScalar(0.5),
    q,
    new THREE.Vector3(1, 1, 1),
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
  const geo = raw
    ? createBoxGeometry(width, len, depth)
    : createChamferedBoxGeometry(width, len, depth, bevel);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3().addVectors(v0, v1).multiplyScalar(0.5),
    q,
    new THREE.Vector3(1, 1, 1),
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
    [0, 0.016],
    [0.262, 0.016],
    [0.262, 0.016],
    [0.268, 0.002],
    [0.288, 0],
    [0.295, 0.008],
    [0.295, 0.022],
    [0.284, 0.034],
  ];
  // 两个桶身环形加强滚筋 (2 Rolling Hoops / Ribs)
  for (const n of [0.305, 0.595]) {
    pts.push(
      [0.283, n - 0.03],
      [0.291, n - 0.018],
      [0.297, n],
      [0.291, n + 0.018],
      [0.283, n + 0.03],
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
  const pts = profile.map((p) => new THREE.Vector2(p[0], p[1]));
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
    new THREE.Vector2(radius * 0.88, -halfW),
  ];
  return new THREE.LatheGeometry(pts, seg);
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
 * 颜色名称映射至材质名与亮度因子
 */
const COLOR_PALETTE = {
  blue: ["paint_blue", 1.0],
  red: ["paint_red", 1.0],
  green: ["paint_green", 1.0],
  yellow: ["paint_yellow", 1.0],
  orange: ["paint_orange", 1.0],
  white: ["paint_white", 1.0],
  grey: ["paint_grey", 1.0],
  teal: ["paint_teal", 1.0],
  olive: ["paint_green", 0.8],
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
  const scale =
    typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(s[0], s[1], s[2]);
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
 * 乘以顶点颜色亮度系数
 */
function applyVertexColorLuminance(geo, factor) {
  const count = geo.attributes.position.count;
  let colAttr = geo.attributes.color;
  if (!colAttr) {
    colAttr = new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3);
    geo.setAttribute("color", colAttr);
  }
  const arr = colAttr.array;
  for (let i = 0; i < count * 3; i++) {
    arr[i] *= factor;
  }
  colAttr.needsUpdate = true;
  return geo;
}

export {
  PI,
  HALF_PI,
  clamp,
  smoothstepHermite,
  lerpVec3,
  createPropPRNG,
  createBeveledBoxGeometry,
  createLoftedRibbonGeometry,
  createRoundedRectGeometry,
  createWorldUVPlaneGeometry,
  createTransformMatrix4,
  PropMeshAssembler,
  PropCompoundBuilder,
  getCachedLabelTexture,
  getCachedDecalTexture,
  withCachedPrototype,
  createChamferedBoxGeometry,
  createSubdividedBoxGeometry,
  createConnectingCylinder,
  createOrientedBoxBeam,
  createCurvedCylinderDecal,
  createRevolvedGeometry,
  generateBarrelProfilePoints,
  generateTireTreadProfile,
  recomputeNormalsAndBounds,
  applyVertexColorLuminance,
  prototypeCache,
  COLOR_PALETTE,
  resolveColorPalette,
  composeTransformMatrix4,
  traverseAndMutateVertices,
  CONTAINER_WIDTH_STD,
  generateCorrugatedProfilePoints,
  sampleValueNoise2D,
  sampleSimplexNoise3D,
  transformGeometryInPlace,
};

// @ts-check
/**
 * @file src/ground/terrain.js
 * @description 地形高度场采样、程序化噪声生成器与宏观水洼掩模计算
 */

export const TERRAIN_BOUNDS = { x0: -44, z0: -40, size: 80 };
export const WATER_HEIGHT_THRESHOLD = 0.385;
export const PUDDLE_SCALE = 1;
export const PUDDLE_EXTRA_DEPTH = 0.02;

/**
 * 预设水洼几何位置分布表 [centerX, centerZ, radiusX, radiusZ, depth]
 */
export const PUDDLE_DEFINITIONS = [
  [-30.5, 6.6, 2.6, 1.7, 0.24],
  [-19.5, 5.2, 7.5, 1.5, 0.27],
  [-11.5, 7, 5, 1.2, 0.24],
  [-7.6, 5.6, 2.3, 1.7, 0.2],
  [5.6, 4.7, 3.3, 1.35, 0.26],
  [13, 6.6, 2.6, 1.2, 0.2],
  [-13, -1.3, 4.6, 1.5, 0.2],
  [1, -1.6, 3.4, 1.4, 0.18],
  [12.5, -1.4, 2.4, 1.3, 0.18],
  [-3.5, -8.2, 4.4, 1.6, 0.2],
  [-20, -8.6, 3.6, 1.6, 0.18],
  [14.6, -19.5, 2, 3.6, 0.2],
  [23.5, 6.9, 3.2, 2, 0.22],
  [23.2, -7.6, 3.4, 1.8, 0.2],
  [20.8, 1.5, 1.4, 3.6, 0.16],
  [23.5, 22.5, 3, 2, 0.2],
  [24, -25, 2.8, 2.6, 0.2],
  [-1, 16.5, 7, 1.7, 0.2],
  [11.5, 16.9, 3.6, 1.4, 0.18],
  [-17, 15.8, 3.2, 1.5, 0.18],
  [8.6, 12.3, 1.5, 3.4, 0.17],
  [-7.8, 19.5, 1.7, 3.6, 0.17],
  [-8, 25.8, 6, 1.3, 0.18],
  [9, 25.9, 4, 1.2, 0.18],
  [-32, -4, 2.6, 3.4, 0.18],
  [-31, 18, 3, 4, 0.18],
];

export function hash3D(x, y, seed) {
  let n =
    Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  return ((n = Math.imul(n ^ (n >>> 13), 1274126177)), ((n ^ (n >>> 16)) >>> 0) / 4294967296);
}

export function valueNoise2D(x, y, seed, wrap = 0) {
  let ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy),
    x0 = ix,
    x1 = ix + 1,
    y0 = iy,
    y1 = iy + 1;
  if (wrap) {
    x0 = ((x0 % wrap) + wrap) % wrap;
    x1 = ((x1 % wrap) + wrap) % wrap;
    y0 = ((y0 % wrap) + wrap) % wrap;
    y1 = ((y1 % wrap) + wrap) % wrap;
  }
  let v00 = hash3D(x0, y0, seed),
    v10 = hash3D(x1, y0, seed),
    v01 = hash3D(x0, y1, seed),
    v11 = hash3D(x1, y1, seed);
  return v00 + (v10 - v00) * sx + (v01 - v00) * sy + (v00 - v10 - v01 + v11) * sx * sy;
}

export function fbm2D(x, y, seed, octaves = 4, wrap = 0) {
  let val = 0,
    amp = 0.5,
    maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise2D(x, y, seed + i * 17, wrap);
    maxAmp += amp;
    x *= 2;
    y *= 2;
    wrap *= 2;
    amp *= 0.5;
  }
  return val / maxAmp;
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const smoothstep01 = (min, max, val) => {
  let t = clamp01((val - min) / (max - min));
  return t * t * (3 - 2 * t);
};

/**
 * 采样地面自然起伏与水洼下凹高度
 * @param {number} x
 * @param {number} z
 * @returns {number}
 */
export function sampleGroundHeight(x, z) {
  let h =
    0.5 +
    (fbm2D(x / 8.5, z / 8.5, 11, 4) - 0.47) * 0.3 +
    (fbm2D(x / 2.4, z / 2.4, 23, 3) - 0.5) * 0.14;

  for (let i = 0; i < PUDDLE_DEFINITIONS.length; i++) {
    let p = PUDDLE_DEFINITIONS[i],
      dx = (x - p[0]) / (p[2] * PUDDLE_SCALE),
      dz = (z - p[1]) / (p[3] * PUDDLE_SCALE),
      d2 = dx * dx + dz * dz;
    if (d2 < 9) {
      h -= (p[4] + PUDDLE_EXTRA_DEPTH) * Math.exp(-d2 * d2);
    }
  }

  if (x > -37 && x < 29) {
    let n = 0.5 + 0.5 * valueNoise2D(x / 6, 3.1, 5),
      t1 = (z - 4.9) / 0.5,
      t2 = (z - 7.1) / 0.5,
      t3 = (z - 15.4) / 0.5,
      t4 = (z - 17.2) / 0.5,
      mask =
        smoothstep01(0.14, 0.34, fbm2D(x / 9, 7.7, 19, 2)) *
        smoothstep01(-27, -24, x) *
        (1 - smoothstep01(14, 17, x));
    h -=
      0.22 * (0.55 + 0.45 * n) * mask * (Math.exp(-t1 * t1) + Math.exp(-t2 * t2)) +
      0.09 *
        n *
        (1 - smoothstep01(0.3, 0.6, fbm2D(x / 9, 7.7, 19, 2))) *
        (Math.exp(-t3 * t3) + Math.exp(-t4 * t4));
  }

  h += 0.25 * smoothstep01(28.6, 29.8, x);
  return h;
}

/**
 * 生成大范围地面宏观属性贴图数据 (RGBA)
 * R: 积水掩模 (Puddle Mask)
 * G: 微起伏与侵蚀 (Micro-relief)
 * B: 碎石斑驳 (Gravel Specks)
 * A: 粗糙污迹流淌 (Dirt Streak)
 * @param {number} resolution
 * @returns {Uint8Array}
 */
export function generateMacroMapData(resolution) {
  let data = new Uint8Array(resolution * resolution * 4),
    { x0, z0, size } = TERRAIN_BOUNDS,
    step = size / resolution;

  for (let r = 0; r < resolution; r++) {
    let wz = z0 + (r + 0.5) * step;
    for (let c = 0; c < resolution; c++) {
      let wx = x0 + (c + 0.5) * step,
        idx = (r * resolution + c) * 4,
        gh = sampleGroundHeight(wx, wz);

      data[idx] = Math.round(clamp01(0.5 + (gh - WATER_HEIGHT_THRESHOLD) * 2.5) * 255);
      data[idx + 1] = Math.round(
        clamp01(0.5 + (fbm2D(wx / 5.5, wz / 5.5, 41, 3) - 0.5) * 1.5 + (0.5 - gh) * 0.9) * 255,
      );
      let gravel =
        smoothstep01(0.6, 0.78, fbm2D(wx / 1.4, wz / 1.4, 77, 4)) *
        smoothstep01(0.47, 0.62, fbm2D(wx / 9, wz / 9, 91, 2));
      data[idx + 2] = Math.round(clamp01(gravel) * 255);
      data[idx + 3] = Math.round(
        clamp01(fbm2D(wx / 22, wz / 0.9, 57, 3) * 0.6 + fbm2D(wx / 13, wz / 13, 63, 3) * 0.4) * 255,
      );
    }
  }
  return data;
}

/**
 * 双线性采样宏观贴图通道数值
 * @param {Uint8Array} data
 * @param {number} res
 * @param {number} x
 * @param {number} z
 * @param {number} channel
 * @returns {number}
 */
export function sampleMacroMapBilinear(data, res, x, z, channel) {
  let u = ((x - TERRAIN_BOUNDS.x0) / TERRAIN_BOUNDS.size) * res - 0.5,
    v = ((z - TERRAIN_BOUNDS.z0) / TERRAIN_BOUNDS.size) * res - 0.5;
  u = u < 0 ? 0 : u > res - 1.001 ? res - 1.001 : u;
  v = v < 0 ? 0 : v > res - 1.001 ? res - 1.001 : v;

  let x0 = u | 0,
    y0 = v | 0,
    fx = u - x0,
    fy = v - y0,
    idx = (y0 * res + x0) * 4 + channel,
    rowStride = res * 4;

  return (
    ((data[idx] * (1 - fx) + data[idx + 4] * fx) * (1 - fy) +
      (data[idx + rowStride] * (1 - fx) + data[idx + rowStride + 4] * fx) * fy) /
    255
  );
}

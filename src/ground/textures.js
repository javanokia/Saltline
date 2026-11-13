// @ts-check
/**
 * @file src/ground/textures.js
 * @description 程序化沥青/水泥地表 PBR 贴图生成器与 DataTexture 构建工具
 */

import * as THREE from "three";
import { fbm2D, clamp01 } from "./terrain.js";

const {
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
  RepeatWrapping,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
} = THREE;

/**
 * 构建 2D 数据纹理
 * @param {Uint8Array} data
 * @param {number} size
 * @param {{ repeat?: boolean, aniso?: number }} [options]
 * @returns {THREE.DataTexture}
 */
export function createDataTexture2D(data, size, { repeat = true, aniso = 1 } = {}) {
  let tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = aniso;
  tex.colorSpace = NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 生成地面高频与中频 PBR 细节贴图数据 (det, nrm)
 * @param {number} size
 * @returns {{ det: Uint8Array, nrm: Uint8Array }}
 */
export function generateGroundPbrTextures(size) {
  let det = new Uint8Array(size * size * 4),
    nrm = new Uint8Array(size * size * 4),
    hSmall = new Float32Array(size * size),
    hLarge = new Float32Array(size * size);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let u = c / size,
        v = r / size,
        idx = r * size + c,
        fine = fbm2D(u * 96, v * 96, 3, 2, 96) * 0.6 + fbm2D(u * 40, v * 40, 9, 2, 40) * 0.4,
        coarse = fbm2D(u * 6, v * 6, 21, 4, 6),
        warpX = (fbm2D(u * 8, v * 8, 31, 2, 8) - 0.5) * 0.25,
        warpY = (fbm2D(u * 8, v * 8, 37, 2, 8) - 0.5) * 0.25,
        cracks = 1 - Math.abs(2 * fbm2D((u + warpX) * 5, (v + warpY) * 5, 43, 3, 5) - 1),
        spots = fbm2D(u * 28, v * 28, 51, 3, 28);

      det[idx * 4] = Math.round(clamp01(fine) * 255);
      det[idx * 4 + 1] = Math.round(clamp01(coarse) * 255);
      det[idx * 4 + 2] = Math.round(clamp01(cracks) * 255);
      det[idx * 4 + 3] = Math.round(clamp01(spots) * 255);
      hSmall[idx] = fine;
      hLarge[idx] = fbm2D(u * 9, v * 9, 71, 4, 9);
    }
  }

  let wrapIdx = (val) => (val + size) % size;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let idx = r * size + c,
        dxSmall = (hSmall[r * size + wrapIdx(c + 1)] - hSmall[r * size + wrapIdx(c - 1)]) * 2.2,
        dySmall = (hSmall[wrapIdx(r + 1) * size + c] - hSmall[wrapIdx(r - 1) * size + c]) * 2.2,
        dxLarge = (hLarge[r * size + wrapIdx(c + 2)] - hLarge[r * size + wrapIdx(c - 2)]) * 9,
        dyLarge = (hLarge[wrapIdx(r + 2) * size + c] - hLarge[wrapIdx(r - 2) * size + c]) * 9;

      nrm[idx * 4] = Math.round(clamp01(0.5 - dxSmall) * 255);
      nrm[idx * 4 + 1] = Math.round(clamp01(0.5 - dySmall) * 255);
      nrm[idx * 4 + 2] = Math.round(clamp01(0.5 - dxLarge) * 255);
      nrm[idx * 4 + 3] = Math.round(clamp01(0.5 - dyLarge) * 255);
    }
  }

  return { det, nrm };
}

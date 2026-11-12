/**
 * ============================================================================
 * 3A-GAME Visual Effects Engine - Impact Decals (fx/decals.js)
 * 冲击弹孔与爆炸烧焦投影贴花管理器
 * ============================================================================
 */

import * as THREE from "three";
import { generateDecalsAtlas, DECAL_TYPE_FRAMES, DECAL_DEFAULT_SIZES } from "./textures.js";

const DECAL_FADE_OLDEST_COUNT = 14;

export class ImpactDecalManager {
  constructor(engineCtx, capacity = 160) {
    this.cap = capacity;
    this.next = 0;
    this.count = 0;

    const atlas = generateDecalsAtlas(256);
    this.atlas = atlas;

    const geom = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(capacity * 12), 3);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    this.nor = new THREE.BufferAttribute(new Float32Array(capacity * 12), 3);
    this.nor.setUsage(THREE.DynamicDrawUsage);
    this.uv = new THREE.BufferAttribute(new Float32Array(capacity * 8), 2);
    this.uv.setUsage(THREE.DynamicDrawUsage);
    this.col = new THREE.BufferAttribute(new Float32Array(capacity * 16), 4);
    this.col.setUsage(THREE.DynamicDrawUsage);

    this.baseA = new Float32Array(capacity);

    geom.setAttribute("position", this.pos);
    geom.setAttribute("normal", this.nor);
    geom.setAttribute("uv", this.uv);
    geom.setAttribute("color", this.col);

    const indexArr = new Uint16Array(capacity * 6);
    for (let i = 0; i < capacity; i++) {
      const vIdx = i * 4;
      const iIdx = i * 6;
      indexArr[iIdx] = vIdx;
      indexArr[iIdx + 1] = vIdx + 1;
      indexArr[iIdx + 2] = vIdx + 2;
      indexArr[iIdx + 3] = vIdx;
      indexArr[iIdx + 4] = vIdx + 2;
      indexArr[iIdx + 5] = vIdx + 3;
    }
    geom.setIndex(new THREE.BufferAttribute(indexArr, 1));

    const material = new THREE.MeshStandardMaterial({
      map: atlas.map,
      roughnessMap: atlas.orm,
      metalnessMap: atlas.orm,
      roughness: 1,
      metalness: 1,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    if (atlas.nrm) {
      material.normalMap = atlas.nrm;
      material.normalScale = new THREE.Vector2(1, 1);
    }
    material.name = "fx_decals";

    const mesh = new THREE.Mesh(geom, material);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.renderOrder = -5;
    mesh.matrixAutoUpdate = false;
    mesh.name = "fx_decals";
    mesh.visible = false;
    this.mesh = mesh;

    this.uvs = {};
    for (const type in DECAL_TYPE_FRAMES) {
      this.uvs[type] = DECAL_TYPE_FRAMES[type].map((f) => atlas.uv(f));
    }
  }

  clear() {
    this.col.array.fill(0);
    this.pos.array.fill(0);
    this.col.needsUpdate = true;
    this.pos.needsUpdate = true;
    this.next = 0;
    this.count = 0;
    this.mesh.visible = false;
  }

  add(pos, normal, type = "bullet_concrete", size = null, tint = 1, alpha = 1) {
    const uvFrames = this.uvs[type] || this.uvs.bullet_concrete;
    const uvCoords = uvFrames[Math.floor(Math.random() * uvFrames.length)];
    const baseSize = size || DECAL_DEFAULT_SIZES[type] || 0.25;
    const halfSize = baseSize * (0.85 + Math.random() * 0.3) * 0.5;

    const idx = this.next;
    this.next = (idx + 1) % this.cap;
    if (this.count < this.cap) this.count++;

    let nx = normal.x,
      ny = normal.y,
      nz = normal.z;
    const normLen = Math.hypot(nx, ny, nz) || 1;
    nx /= normLen;
    ny /= normLen;
    nz /= normLen;

    // 正交切线基底 (Tangent basis construction)
    let tx, ty, tz;
    if (Math.abs(ny) > 0.9) {
      tx = 1;
      ty = 0;
      tz = 0;
    } else {
      tx = -nz;
      ty = 0;
      tz = nx;
    }
    const dotTN = tx * nx + ty * ny + tz * nz;
    tx -= nx * dotTN;
    ty -= ny * dotTN;
    tz -= nz * dotTN;
    const tLen = Math.hypot(tx, ty, tz) || 1;
    tx /= tLen;
    ty /= tLen;
    tz /= tLen;

    // 副法线 (Bitangent = Normal x Tangent)
    const bx = ny * tz - nz * ty;
    const by = nz * tx - nx * tz;
    const bz = nx * ty - ny * tx;

    // 随机平面自旋 (Planar roll)
    const rollAngle = type === "bullet_wood" ? (Math.random() - 0.5) * 0.3 : Math.random() * 6.283;
    const cosR = Math.cos(rollAngle);
    const sinR = Math.sin(rollAngle);

    const sX = (tx * cosR + bx * sinR) * halfSize;
    const sY = (ty * cosR + by * sinR) * halfSize;
    const sZ = (tz * cosR + bz * sinR) * halfSize;

    const oX = (bx * cosR - tx * sinR) * halfSize;
    const oY = (by * cosR - ty * sinR) * halfSize;
    const oZ = (bz * cosR - tz * sinR) * halfSize;

    // 沿法线微量抬升避免 Z-Fighting
    const liftOffset = 0.004 + (idx % 7) * 0.0003;
    const cx = pos.x + nx * liftOffset;
    const cy = pos.y + ny * liftOffset;
    const cz = pos.z + nz * liftOffset;

    const pArr = this.pos.array;
    const nArr = this.nor.array;
    const uArr = this.uv.array;
    const cArr = this.col.array;

    const vOffset = idx * 12;
    pArr[vOffset] = cx - sX - oX;
    pArr[vOffset + 1] = cy - sY - oY;
    pArr[vOffset + 2] = cz - sZ - oZ;

    pArr[vOffset + 3] = cx + sX - oX;
    pArr[vOffset + 4] = cy + sY - oY;
    pArr[vOffset + 5] = cz + sZ - oZ;

    pArr[vOffset + 6] = cx + sX + oX;
    pArr[vOffset + 7] = cy + sY + oY;
    pArr[vOffset + 8] = cz + sZ + oZ;

    pArr[vOffset + 9] = cx - sX + oX;
    pArr[vOffset + 10] = cy - sY + oY;
    pArr[vOffset + 11] = cz - sZ + oZ;

    for (let f = 0; f < 4; f++) {
      nArr[vOffset + f * 3] = nx;
      nArr[vOffset + f * 3 + 1] = ny;
      nArr[vOffset + f * 3 + 2] = nz;
    }

    const uvOffset = idx * 8;
    uArr[uvOffset] = uvCoords[0];
    uArr[uvOffset + 1] = uvCoords[1];
    uArr[uvOffset + 2] = uvCoords[2];
    uArr[uvOffset + 3] = uvCoords[1];
    uArr[uvOffset + 4] = uvCoords[2];
    uArr[uvOffset + 5] = uvCoords[3];
    uArr[uvOffset + 6] = uvCoords[0];
    uArr[uvOffset + 7] = uvCoords[3];

    const colOffset = idx * 16;
    this.baseA[idx] = alpha;
    for (let f = 0; f < 4; f++) {
      cArr[colOffset + f * 4] = tint;
      cArr[colOffset + f * 4 + 1] = tint;
      cArr[colOffset + f * 4 + 2] = tint;
      cArr[colOffset + f * 4 + 3] = alpha;
    }

    // 池满时渐进淡出最旧的贴花
    if (this.count >= this.cap) {
      for (let f = 0; f < DECAL_FADE_OLDEST_COUNT; f++) {
        const oldIdx = (this.next + f) % this.cap;
        const fadeA = (this.baseA[oldIdx] * (f + 1)) / (DECAL_FADE_OLDEST_COUNT + 1);
        const oCol = oldIdx * 16;
        cArr[oCol + 3] = cArr[oCol + 7] = cArr[oCol + 11] = cArr[oCol + 15] = fadeA;
      }
    }

    this.pos.needsUpdate = true;
    this.nor.needsUpdate = true;
    this.uv.needsUpdate = true;
    this.col.needsUpdate = true;
    this.mesh.visible = true;
  }
}

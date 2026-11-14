// @ts-check
/**
 * @file src/backdrop/common.js
 * @description 港口远景渲染器通用几何构建算子、批处理容器与航标灯闪烁管理
 */

import * as THREE from "three";
import {
  mergeGeometries,
  createBoxGeometry,
  createBoxBevelGeometry,
  createCylinderGeometry,
  setVertexColors,
  mergeGeometriesClean,
} from "../geo.js";

export const vec3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const toVec3 = (v) => (v.isVector3 ? v : new THREE.Vector3(v[0], v[1], v[2]));

const UP_AXIS = new THREE.Vector3(0, 1, 0);
const UNIT_SCALE = new THREE.Vector3(1, 1, 1);
const tempQuat = new THREE.Quaternion();
const tempMat4 = new THREE.Matrix4();

export function hashInt3D(ix, iy, iz) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(iz, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function valueNoise3D(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  let fx = x - ix;
  let fy = y - iy;
  let fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);
  const lerp = (a, b, t) => a + (b - a) * t;
  return lerp(
    lerp(
      lerp(hashInt3D(ix, iy, iz), hashInt3D(ix + 1, iy, iz), fx),
      lerp(hashInt3D(ix, iy + 1, iz), hashInt3D(ix + 1, iy + 1, iz), fx),
      fy,
    ),
    lerp(
      lerp(hashInt3D(ix, iy, iz + 1), hashInt3D(ix + 1, iy, iz + 1), fx),
      lerp(hashInt3D(ix, iy + 1, iz + 1), hashInt3D(ix + 1, iy + 1, iz + 1), fx),
      fy,
    ),
    fz,
  );
}

export function createSeededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const tempTint = [1, 1, 1];
const DEFAULT_TINT = [1, 1, 1];

export function sampleWeatheringTint(x, y, z, baseTint = DEFAULT_TINT, strength = 1) {
  const nBroad = valueNoise3D(x * 0.31 + 11.3, y * 0.23 + 5.1, z * 0.31 + 3.7);
  const nRust = valueNoise3D(x * 1.7 + 40.2, 9.5, z * 1.7 + 17.9);
  const ao = 1 - strength * (0.3 - 0.36 * nBroad);
  let r = baseTint[0] * ao;
  let g = baseTint[1] * ao;
  let b = baseTint[2] * ao;
  if (nRust > 0.68) {
    const rustAmt =
      Math.min(1, (nRust - 0.68) / 0.3) *
      0.6 *
      strength *
      (0.35 + 0.65 * valueNoise3D(x * 0.9, y * 0.45, z * 0.9));
    r *= 1 + 0.45 * rustAmt;
    g *= 1 - 0.3 * rustAmt;
    b *= 1 - 0.6 * rustAmt;
  }
  tempTint[0] = r;
  tempTint[1] = g;
  tempTint[2] = b;
  return tempTint;
}

const tintedMaterialSet = new WeakSet();

export function getTintedMaterial(engineCtx, matName, opts = {}) {
  const mat = engineCtx.mats.get(matName, { vertexColors: true, ...opts });
  tintedMaterialSet.add(mat);
  return mat;
}

export class BackdropBatchBuilder {
  constructor() {
    this.buckets = new Map();
    this.tris = 0;
    this.remap = null;
    this.dz = 0;
    this.minSize = 0;
  }

  add(mat, geoOrList, tint) {
    if (!geoOrList) return;
    if (Array.isArray(geoOrList)) {
      for (const g of geoOrList) this.add(mat, g, tint);
      return;
    }
    let geo = geoOrList;
    if (this.remap) {
      const remapped = this.remap(mat, tint);
      if (!remapped) return;
      if (this.minSize) {
        geo.computeBoundingBox();
        const bb = geo.boundingBox;
        if (
          Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) < this.minSize
        ) {
          return;
        }
      }
      mat = remapped[0];
      tint = remapped[1];
      if (this.dz) geo.translate(0, 0, this.dz);
    }
    if (tintedMaterialSet.has(mat) && !geo.attributes.color) {
      setVertexColors(geo, (x, y, z) => sampleWeatheringTint(x, y, z, tint || DEFAULT_TINT));
    }
    let bucket = this.buckets.get(mat.uuid);
    if (!bucket) {
      bucket = { mat, geos: [] };
      this.buckets.set(mat.uuid, bucket);
    }
    bucket.geos.push(geo);
    this.tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  }

  build({ cast = true, recv = true } = {}) {
    const group = new THREE.Group();
    for (const bucket of this.buckets.values()) {
      const merged = mergeGeometriesClean(bucket.geos);
      const mesh = new THREE.Mesh(merged, bucket.mat);
      const isUnlitOrAlpha = bucket.mat.isMeshBasicMaterial || bucket.mat.transparent;
      mesh.castShadow = cast && !isUnlitOrAlpha;
      mesh.receiveShadow = recv && !isUnlitOrAlpha;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
}

export function boxFromBounds(minX, minY, minZ, maxX, maxY, maxZ, bevel = 0) {
  const w = Math.abs(maxX - minX);
  const h = Math.abs(maxY - minY);
  const d = Math.abs(maxZ - minZ);
  const geo = bevel > 0 ? createBoxBevelGeometry(w, h, d, bevel) : createBoxGeometry(w, h, d);
  geo.translate((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  return geo;
}

export function orientedCylinder(rTop, rBot, height, axis, x, y, z, segs = 12, openEnded = false) {
  const geo = createCylinderGeometry(rTop, rBot, height, segs, openEnded);
  if (axis === "x") geo.rotateZ(Math.PI / 2);
  else if (axis === "z") geo.rotateX(Math.PI / 2);
  geo.translate(x, y, z);
  return geo;
}

export function cylinderBetween(p0, p1, radius = 0.03, segs = 5, caps = false) {
  const v0 = toVec3(p0);
  const v1 = toVec3(p1);
  const delta = new THREE.Vector3().subVectors(v1, v0);
  const len = delta.length();
  if (len < 1e-5) return null;
  const geo = createCylinderGeometry(radius, radius, len, segs, !caps);
  const dir = delta.multiplyScalar(1 / len);
  const dot = UP_AXIS.dot(dir);
  if (dot > 0.999999) tempQuat.identity();
  else if (dot < -0.999999) tempQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  else tempQuat.setFromUnitVectors(UP_AXIS, dir);
  tempMat4.compose(
    new THREE.Vector3().addVectors(v0, v1).multiplyScalar(0.5),
    tempQuat,
    UNIT_SCALE,
  );
  geo.applyMatrix4(tempMat4);
  return geo;
}

export function beamBetween(p0, p1, width = 0.3, depth = 0.3, bevel = 0) {
  const v0 = toVec3(p0);
  const v1 = toVec3(p1);
  const delta = new THREE.Vector3().subVectors(v1, v0);
  const len = delta.length();
  delta.multiplyScalar(1 / len);
  const right = new THREE.Vector3().crossVectors(delta, UP_AXIS);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  else right.normalize();
  const fwd = new THREE.Vector3().crossVectors(right, delta);
  const geo =
    bevel > 0
      ? createBoxBevelGeometry(width, len, depth, bevel)
      : createBoxGeometry(width, len, depth);
  tempMat4
    .makeBasis(right, delta, fwd)
    .setPosition((v0.x + v1.x) / 2, (v0.y + v1.y) / 2, (v0.z + v1.z) / 2);
  geo.applyMatrix4(tempMat4);
  return geo;
}

export function polylineCylinders(points, radius = 0.03, segs = 5) {
  const parts = [];
  for (let i = 0; i < points.length - 1; i++) {
    const cyl = cylinderBetween(points[i], points[i + 1], radius, segs);
    if (cyl) parts.push(cyl);
  }
  return parts;
}

export function catenaryCurvePoints(p0, p1, sag = 1, segments = 10) {
  const v0 = toVec3(p0);
  const v1 = toVec3(p1);
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = new THREE.Vector3().lerpVectors(v0, v1, t);
    pt.y -= sag * 4 * t * (1 - t);
    pts.push(pt);
  }
  return pts;
}

export function placedPlane(w, h, x, y, z, rotY = 0, rotX = 0) {
  const geo = new THREE.PlaneGeometry(w, h);
  if (rotX) geo.rotateX(rotX);
  if (rotY) geo.rotateY(rotY);
  geo.translate(x, y, z);
  return geo;
}

/**
 * @param {{ add: (mat: any, geo: any, tint?: any) => void }} batch
 * @param {THREE.Material} mat
 * @param {Array<THREE.Vector3 | number[]>} points
 * @param {{ h?: number; post?: number; r?: number; tint?: number[]; mid?: boolean }} [options]
 */
export function addRailingSegments(
  batch,
  mat,
  points,
  { h = 1.1, post = 2.2, r = 0.022, tint, mid = true } = {},
) {
  const vecPts = points.map(toVec3);
  for (let i = 0; i < vecPts.length - 1; i++) {
    const a = vecPts[i];
    const b = vecPts[i + 1];
    const dist = a.distanceTo(b);
    const numPosts = Math.max(1, Math.round(dist / post));
    for (let k = i === 0 ? 0 : 1; k <= numPosts; k++) {
      const p = new THREE.Vector3().lerpVectors(a, b, k / numPosts);
      batch.add(mat, cylinderBetween(p, vec3(p.x, p.y + h, p.z), r, 4), tint);
    }
    batch.add(
      mat,
      cylinderBetween(vec3(a.x, a.y + h, a.z), vec3(b.x, b.y + h, b.z), r * 1.15, 5),
      tint,
    );
    if (mid) {
      batch.add(
        mat,
        cylinderBetween(vec3(a.x, a.y + h * 0.5, a.z), vec3(b.x, b.y + h * 0.5, b.z), r * 0.9, 4),
        tint,
      );
    }
  }
}

export function createBeaconBlinkSystem() {
  const uTime = { value: 0 };
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader =
      `attribute vec3 blink;
uniform float uTime;
varying float vBlink;
` +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
 float bph = fract(uTime / max(blink.x, 0.001) + blink.y);
 vBlink = blink.x <= 0.0 ? 1.0 : mix(0.02, 1.0, smoothstep(0.0, 0.06, bph) * (1.0 - smoothstep(blink.z, blink.z + 0.12, bph)));`,
      );
    shader.fragmentShader =
      `varying float vBlink;
` +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
 diffuseColor.rgb *= vBlink;`,
      );
  };
  mat.customProgramCacheKey = () => "saltline-blink";

  const geos = [];
  return {
    uTime,
    mat,
    add(rawGeo, color, period = 0, phase = 0, duty = 0.5) {
      if (!rawGeo) return;
      const nonIdx = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo;
      const count = nonIdx.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const blinks = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = color[0];
        colors[i * 3 + 1] = color[1];
        colors[i * 3 + 2] = color[2];
        blinks[i * 3] = period;
        blinks[i * 3 + 1] = phase;
        blinks[i * 3 + 2] = duty;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", nonIdx.attributes.position);
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geo.setAttribute("blink", new THREE.BufferAttribute(blinks, 3));
      geos.push(geo);
    },
    build() {
      if (!geos.length) return null;
      const mesh = new THREE.Mesh(mergeGeometries(geos.splice(0), false), mat);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      return mesh;
    },
  };
}

export const beaconOctahedron = (x, y, z, radius = 0.12) => {
  const geo = new THREE.OctahedronGeometry(radius, 0);
  geo.translate(x, y, z);
  return geo;
};

/**
 * ============================================================================
 * 3A-GAME Geometry Synthesis & Batch Merging (geo.js)
 * 程序化几何体生成、倒角圆角盒、样条弯管与静态层级合批系统
 * ============================================================================
 */

import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ============================================================================
// 一、 基础几何体合并与属性拼接 (BufferGeometry Merging)
// ============================================================================

export function mergeAttributes(attributes) {
  let arrayType;
  let itemSize;
  let normalized;
  let gpuType = -1;
  let totalCount = 0;

  for (let i = 0; i < attributes.length; ++i) {
    const attr = attributes[i];
    if (arrayType === undefined) arrayType = attr.array.constructor;
    if (arrayType !== attr.array.constructor) {
      console.error("BufferGeometryUtils: .mergeAttributes() failed. Array types must match.");
      return null;
    }
    if (itemSize === undefined) itemSize = attr.itemSize;
    if (itemSize !== attr.itemSize) {
      console.error("BufferGeometryUtils: .mergeAttributes() failed. itemSize must match.");
      return null;
    }
    if (normalized === undefined) normalized = attr.normalized;
    if (normalized !== attr.normalized) {
      console.error("BufferGeometryUtils: .mergeAttributes() failed. normalized flag must match.");
      return null;
    }
    if (gpuType === -1 && attr.gpuType !== undefined) gpuType = attr.gpuType;
    totalCount += attr.count * itemSize;
  }

  const mergedArray = new arrayType(totalCount);
  const resultAttr = new THREE.BufferAttribute(mergedArray, itemSize, normalized);
  let offset = 0;

  for (let i = 0; i < attributes.length; ++i) {
    const attr = attributes[i];
    if (attr.isInterleavedBufferAttribute) {
      const tupleOffset = offset / itemSize;
      for (let j = 0, len = attr.count; j < len; j++) {
        for (let k = 0; k < itemSize; k++) {
          resultAttr.setComponent(j + tupleOffset, k, attr.getComponent(j, k));
        }
      }
    } else {
      mergedArray.set(attr.array, offset);
    }
    offset += attr.count * itemSize;
  }

  if (gpuType !== -1 && gpuType !== undefined) /** @type {any} */ (resultAttr).gpuType = gpuType;
  return resultAttr;
}

export function mergeGeometries(geometries, useGroups = false) {
  if (!geometries || !geometries.length) return new THREE.BufferGeometry();

  const isIndexed = geometries[0].index !== null;
  const attrNames = new Set(Object.keys(geometries[0].attributes));
  const morphNames = new Set(Object.keys(geometries[0].morphAttributes));
  const attrLists = {};
  const morphLists = {};
  const morphRelative = geometries[0].morphTargetsRelative;
  const mergedGeom = new THREE.BufferGeometry();
  let groupOffset = 0;

  for (let i = 0; i < geometries.length; ++i) {
    const g = geometries[i];
    if (isIndexed !== (g.index !== null)) {
      console.error(`mergeGeometries(): Index mismatch at index ${i}.`);
      return null;
    }

    let attrCount = 0;
    for (const name in g.attributes) {
      if (!attrNames.has(name)) {
        console.error(`mergeGeometries(): Missing attribute "${name}" across geometries.`);
        return null;
      }
      if (!attrLists[name]) attrLists[name] = [];
      attrLists[name].push(g.attributes[name]);
      attrCount++;
    }

    if (attrCount !== attrNames.size) {
      console.error(`mergeGeometries(): Attribute count mismatch at index ${i}.`);
      return null;
    }

    for (const name in g.morphAttributes) {
      if (!morphNames.has(name)) return null;
      if (!morphLists[name]) morphLists[name] = [];
      morphLists[name].push(g.morphAttributes[name]);
    }

    if (useGroups) {
      const count = isIndexed ? g.index.count : g.attributes.position.count;
      mergedGeom.addGroup(groupOffset, count, i);
      groupOffset += count;
    }
  }

  if (isIndexed) {
    let indexOffset = 0;
    const mergedIndices = [];
    for (let i = 0; i < geometries.length; ++i) {
      const idx = geometries[i].index;
      for (let j = 0; j < idx.count; ++j) {
        mergedIndices.push(idx.getX(j) + indexOffset);
      }
      indexOffset += geometries[i].attributes.position.count;
    }
    mergedGeom.setIndex(mergedIndices);
  }

  for (const name in attrLists) {
    const mergedAttr = mergeAttributes(attrLists[name]);
    if (!mergedAttr) return null;
    mergedGeom.setAttribute(name, mergedAttr);
  }

  return mergedGeom;
}

// ============================================================================
// 二、 核心程序化几何体生成器 (Procedural Primitives)
// ============================================================================

const vScratch = new THREE.Vector3();

/**
 * 具有世界空间投影视差对齐 UV 的 Box 几何体
 */
export function createBoxGeometry(width, height, depth, align = "center") {
  const geom = new THREE.BoxGeometry(width, height, depth);
  const uvs = geom.attributes.uv;
  const pos = geom.attributes.position;
  const norm = geom.attributes.normal;

  for (let i = 0; i < uvs.count; i++) {
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);

    if (nx > 0.5) {
      uvs.setXY(i, pz, py);
    } else if (ny > 0.5) {
      uvs.setXY(i, px, pz);
    } else {
      uvs.setXY(i, px, py);
    }
  }

  if (align === "bottom") {
    geom.translate(0, height / 2, 0);
  }
  return geom;
}

/**
 * 高品质倒角圆角盒几何体 (Chamfered / Beveled Box Geometry)
 */
export function createBoxBevelGeometry(width, height, depth, bevel = 0.02, align = "center") {
  bevel = Math.min(bevel, width / 2 - 1e-4, height / 2 - 1e-4, depth / 2 - 1e-4);
  const geom = new THREE.BoxGeometry(width, height, depth, 3, 3, 3);
  const pos = geom.attributes.position;
  const norm = geom.attributes.normal;
  const uvs = geom.attributes.uv;

  const hx = width / 2;
  const hy = height / 2;
  const hz = depth / 2;

  const clampCoord = (p, limit) => {
    const absP = Math.abs(p);
    const s = Math.sign(p);
    return absP > limit - 1e-5 ? s * limit : s * (limit - bevel);
  };

  for (let i = 0; i < pos.count; i++) {
    let px = clampCoord(pos.getX(i), hx);
    let py = clampCoord(pos.getY(i), hy);
    let pz = clampCoord(pos.getZ(i), hz);

    const cx = Math.max(-(hx - bevel), Math.min(hx - bevel, px));
    const cy = Math.max(-(hy - bevel), Math.min(hy - bevel, py));
    const cz = Math.max(-(hz - bevel), Math.min(hz - bevel, pz));

    vScratch.set(px - cx, py - cy, pz - cz);
    if (vScratch.lengthSq() > 1e-10) {
      vScratch.normalize();
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);

      const cornerTaps =
        (Math.abs(px) > hx - 1e-5 ? 1 : 0) +
        (Math.abs(py) > hy - 1e-5 ? 1 : 0) +
        (Math.abs(pz) > hz - 1e-5 ? 1 : 0);
      if (cornerTaps >= 2) {
        px = cx + vScratch.x * bevel;
        py = cy + vScratch.y * bevel;
        pz = cz + vScratch.z * bevel;
        norm.setXYZ(i, vScratch.x, vScratch.y, vScratch.z);
      } else {
        norm.setXYZ(i, nx, ny, nz);
      }
    }

    pos.setXYZ(i, px, py, pz);

    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));

    if (nx >= ny && nx >= nz) {
      uvs.setXY(i, pz, py);
    } else if (ny >= nx && ny >= nz) {
      uvs.setXY(i, px, pz);
    } else {
      uvs.setXY(i, px, py);
    }
  }

  if (align === "bottom") {
    geom.translate(0, height / 2, 0);
  }
  return geom;
}

/**
 * 带有物理尺度 UV 展平的圆柱体几何体 (Cylinder Geometry)
 */
export function createCylinderGeometry(
  radiusTop,
  radiusBottom,
  height,
  segments = 16,
  openEnded = false,
  align = "center",
) {
  const geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, openEnded);
  const uvs = geom.attributes.uv;
  const pos = geom.attributes.position;
  const norm = geom.attributes.normal;
  const circum = Math.PI * (radiusTop + radiusBottom);

  for (let i = 0; i < uvs.count; i++) {
    if (Math.abs(norm.getY(i)) > 0.9) {
      uvs.setXY(i, pos.getX(i), pos.getZ(i));
    } else {
      uvs.setXY(i, uvs.getX(i) * circum, pos.getY(i));
    }
  }

  if (align === "bottom") {
    geom.translate(0, height / 2, 0);
  }
  return geom;
}

/**
 * 从连续控制点生成 Catmull-Rom 样条管道 (Tube / Pipe Spline Geometry)
 */
export function createTubeFromPoints(
  points,
  radius = 0.03,
  radialSegments = 8,
  closed = false,
  tension = 0,
) {
  const vecPoints = points.map((p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2])));
  const curve = new THREE.CatmullRomCurve3(vecPoints, closed, "catmullrom", tension);
  const len = curve.getLength();
  const tubularSegments = Math.max(2, Math.ceil(len / Math.max(0.08, radius * 3)));
  const geom = new THREE.TubeGeometry(
    curve,
    Math.min(tubularSegments, 400),
    radius,
    radialSegments,
    closed,
  );
  const uvs = geom.attributes.uv;

  for (let i = 0; i < uvs.count; i++) {
    uvs.setXY(i, uvs.getX(i) * len, uvs.getY(i) * Math.PI * 2 * radius);
  }
  return geom;
}

// ============================================================================
// 三、 几何体变换与批处理工具 (Transform & Batching Utilities)
// ============================================================================

const mTransform = new THREE.Matrix4();
const qTransform = new THREE.Quaternion();
const eTransform = new THREE.Euler();
const vTransformPos = new THREE.Vector3();
const vTransformScale = new THREE.Vector3();

/**
 * @param {THREE.BufferGeometry} geom
 * @param {{ p?: [number, number, number]; r?: [number, number, number]; s?: number | [number, number, number] }} [transform]
 */
export function transformGeometry(geom, { p = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}) {
  eTransform.set(r[0], r[1], r[2]);
  qTransform.setFromEuler(eTransform);
  vTransformPos.set(p[0], p[1], p[2]);
  if (typeof s === "number") {
    vTransformScale.set(s, s, s);
  } else {
    vTransformScale.set(s[0], s[1], s[2]);
  }
  mTransform.compose(vTransformPos, qTransform, vTransformScale);
  geom.applyMatrix4(mTransform);
  return geom;
}

export function setVertexColors(geom, colorOrFn) {
  const pos = geom.attributes.position;
  const count = pos.count;
  const colorArr = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const col =
      typeof colorOrFn === "function"
        ? colorOrFn(pos.getX(i), pos.getY(i), pos.getZ(i))
        : colorOrFn;
    colorArr[i * 3] = col[0];
    colorArr[i * 3 + 1] = col[1];
    colorArr[i * 3 + 2] = col[2];
  }

  geom.setAttribute("color", new THREE.BufferAttribute(colorArr, 3));
  return geom;
}

/**
 * 健壮几何体合批器 (Clean Geometry Merger)
 */
export function mergeGeometriesClean(geometries) {
  const valid = geometries.filter(Boolean).map((g) => {
    if (!g.attributes.uv) {
      g.setAttribute(
        "uv",
        new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2),
      );
    }
    if (!g.attributes.normal) {
      g.computeVertexNormals();
    }
    return g;
  });

  if (!valid.length) return new THREE.BufferGeometry();

  const hasColor = valid.some((g) => g.attributes.color);
  const normalized = valid.map((g) => {
    const clone = g;
    if (hasColor && !clone.attributes.color) {
      const white = new Float32Array(clone.attributes.position.count * 3).fill(1);
      clone.setAttribute("color", new THREE.BufferAttribute(white, 3));
    }
    for (const attr of Object.keys(clone.attributes)) {
      if (!["position", "normal", "uv", "color"].includes(attr)) {
        clone.deleteAttribute(attr);
      }
    }
    return clone;
  });

  const allIndexed = normalized.every((g) => g.index);
  const allNonIndexed = normalized.every((g) => !g.index);
  const prepared =
    allIndexed || allNonIndexed
      ? normalized
      : normalized.map((g) => (g.index ? g.toNonIndexed() : g));

  return mergeGeometries(prepared, false) || new THREE.BufferGeometry();
}

/**
 * 将整棵层级网格树按材质和阴影配置合批合并 (Merge Static Mesh Hierarchy)
 */
export function mergeStaticMeshHierarchy(
  rootGroup,
  { castShadow = true, receiveShadow = true } = {},
) {
  rootGroup.updateMatrixWorld(true);
  const batchMap = new Map();
  const unmergedMeshes = [];

  rootGroup.traverse((node) => {
    if (!node.isMesh) return;
    let curr = node;
    let skip = false;
    while (curr) {
      if (curr.userData && curr.userData.noMerge) {
        skip = true;
        break;
      }
      curr = curr.parent;
    }

    if (skip || node.isSkinnedMesh || node.isInstancedMesh || Array.isArray(node.material)) {
      unmergedMeshes.push(node);
      return;
    }

    const key = `${node.material.uuid}${node.castShadow ? "c" : "n"}${node.receiveShadow ? "r" : "n"}:${node.layers.mask}`;
    if (!batchMap.has(key)) {
      batchMap.set(key, {
        mat: node.material,
        geos: [],
        cast: node.castShadow,
        recv: node.receiveShadow,
        layers: node.layers.mask,
      });
    }

    const transformedGeom = node.geometry.clone();
    transformedGeom.applyMatrix4(node.matrixWorld);
    batchMap.get(key).geos.push(transformedGeom);
  });

  const mergedGroup = new THREE.Group();
  for (const batch of batchMap.values()) {
    const mergedGeom = mergeGeometriesClean(batch.geos);
    const mesh = new THREE.Mesh(mergedGeom, batch.mat);
    mesh.castShadow = batch.cast && castShadow;
    mesh.receiveShadow = batch.recv && receiveShadow;
    mesh.layers.mask = batch.layers;
    mergedGroup.add(mesh);
  }

  for (const node of unmergedMeshes) {
    node.updateMatrixWorld(true);
    const worldMat = node.matrixWorld.clone();
    mergedGroup.add(node);
    node.matrix.copy(worldMat);
    node.matrix.decompose(node.position, node.quaternion, node.scale);
  }

  return mergedGroup;
}

export function createMeshWithShadows(geom, material, { cast = true, recv = true } = {}) {
  const mesh = new THREE.Mesh(geom, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = recv;
  return mesh;
}

/**
 * 递归释放三维节点树的所有几何体、材质与关联纹理显存资源
 * @param {THREE.Object3D} root 待销毁的根节点
 */
export function disposeHierarchy(root) {
  if (!root) return;
  root.traverse((node) => {
    const meshNode = /** @type {any} */ (node);
    if (meshNode.geometry && typeof meshNode.geometry.dispose === "function") {
      meshNode.geometry.dispose();
    }
    if (meshNode.material) {
      const mats = Array.isArray(meshNode.material) ? meshNode.material : [meshNode.material];
      for (const mat of mats) {
        if (!mat) continue;
        for (const key of Object.keys(mat)) {
          const prop = mat[key];
          if (prop && prop.isTexture && typeof prop.dispose === "function") {
            prop.dispose();
          }
        }
        if (typeof mat.dispose === "function") mat.dispose();
      }
    }
  });
}

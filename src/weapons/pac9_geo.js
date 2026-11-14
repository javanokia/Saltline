// @ts-check
/**
 * @file src/weapons/pac9_geo.js
 * @description PAC-9 枪械几何体程序化建模基础图元库
 */

import * as THREE from "three";
import { createBoxBevelGeometry } from "../geo.js";

/**
 * 确定性 3D 伪随机哈希噪声
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {number}
 */
export function hashNoise3D(x, y, z) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

const isBevelEdgeNormal = (nx, ny, nz) => Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz)) < 0.95;

const isSideExtrudeNormal = (_nx, _ny, nz) => {
  const az = Math.abs(nz);
  return az > 0.15 && az < 0.95;
};

/**
 * 为几何体顶点计算微磨损边缘高光与表面纹理着色
 * @param {THREE.BufferGeometry} geometry
 * @param {number[]} baseColor
 * @param {number} [wear=0]
 * @param {((nx: number, ny: number, nz: number) => boolean) | null} [edgePredicate=null]
 */
export function applyVertexSurfaceColor(geometry, baseColor, wear = 0, edgePredicate = null) {
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let shade = 0.9 + 0.2 * hashNoise3D(Math.round(x * 70), Math.round(y * 70), Math.round(z * 70));

    if (wear > 0 && edgePredicate && edgePredicate(norm.getX(i), norm.getY(i), norm.getZ(i))) {
      const p = hashNoise3D(Math.round(x * 300), Math.round(y * 300), Math.round(z * 300));
      const d = Math.max(0, p - 0.84) / 0.16;
      shade *= 1 + wear * 1.6 * d * d;
    }

    colors[i * 3] = baseColor[0] * shade;
    colors[i * 3 + 1] = baseColor[1] * shade;
    colors[i * 3 + 2] = baseColor[2] * shade;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

const tempEuler = new THREE.Euler();
const tempMatrix = new THREE.Matrix4();

/**
 * 创建带倒角与精确定位旋转的几何盒体
 */
export function createPositionedBeveledBox(
  width,
  height,
  depth,
  bevel,
  x,
  y,
  z,
  color,
  wear = 0,
  rotation = null,
) {
  const geo = createBoxBevelGeometry(width, height, depth, bevel);
  applyVertexSurfaceColor(geo, color, wear, isBevelEdgeNormal);
  if (rotation) {
    tempEuler.set(rotation[0], rotation[1], rotation[2]);
    geo.applyMatrix4(tempMatrix.makeRotationFromEuler(tempEuler));
  }
  geo.translate(x, y, -z);
  return geo;
}

function buildShapeWithHoles(profile, holes) {
  const shape = new THREE.Shape();
  profile.forEach((pt, idx) => {
    if (idx === 0) shape.moveTo(pt[0], pt[1]);
    else shape.lineTo(pt[0], pt[1]);
  });
  shape.closePath();
  if (holes) {
    for (const hole of holes) {
      shape.holes.push(new THREE.Path(hole.map((pt) => new THREE.Vector2(pt[0], pt[1]))));
    }
  }
  return shape;
}

function extrudeBeveledProfile(profile, totalDepth, bevel, holes) {
  return new THREE.ExtrudeGeometry(buildShapeWithHoles(profile, holes), {
    depth: Math.max(1e-4, totalDepth - 2 * bevel),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 6,
  });
}

function smoothExtrudedNormals(geometry) {
  geometry.computeBoundingBox();
  const minZ = geometry.boundingBox.min.z;
  const maxZ = geometry.boundingBox.max.z;
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const nz = norm.getZ(i);
    const absNz = Math.abs(nz);
    if (absNz < 0.15 || absNz > 0.95) continue;
    const pz = pos.getZ(i);
    if (Math.abs(pz - minZ) < 1e-6 || Math.abs(pz - maxZ) < 1e-6) {
      norm.setXYZ(i, 0, 0, Math.sign(nz));
    } else {
      const len = Math.hypot(norm.getX(i), norm.getY(i)) || 1;
      norm.setXYZ(i, norm.getX(i) / len, norm.getY(i) / len, 0);
    }
  }
  return geometry;
}

/**
 * 沿 X 轴拉伸二维轮廓并倒角
 */
export function extrudeProfileAlongX(profile, start, end, bevel, color, wear = 0, holes = null) {
  const geo = extrudeBeveledProfile(profile, end - start, bevel, holes);
  applyVertexSurfaceColor(geo, color, wear, isSideExtrudeNormal);
  smoothExtrudedNormals(geo);
  geo.translate(0, 0, start + bevel);
  geo.rotateY(Math.PI / 2);
  return geo;
}

/**
 * 沿 Z 轴拉伸二维轮廓并倒角
 */
export function extrudeProfileAlongZ(profile, start, end, bevel, color, wear = 0, holes = null) {
  const geo = extrudeBeveledProfile(profile, end - start, bevel, holes);
  applyVertexSurfaceColor(geo, color, wear, isSideExtrudeNormal);
  smoothExtrudedNormals(geo);
  geo.translate(0, 0, -end + bevel);
  return geo;
}

/**
 * 创建旋转体几何体 (Lathe/Revolved Profile)
 */
export function createRevolvedProfile(
  profile,
  radialSegments,
  color,
  wear = 0,
  offsetX = 0,
  offsetY = 0,
  colorFn = null,
) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  let vertexBase = 0;

  for (let segIdx = 0; segIdx < profile.length - 1; segIdx++) {
    const [r0, z0] = profile[segIdx];
    const [r1, z1] = profile[segIdx + 1];
    const dr = r1 - r0;
    const dz = z1 - z0;
    const segLen = Math.hypot(dr, dz);
    if (segLen < 1e-7) continue;

    const nr = dz / segLen;
    const nz = -dr / segLen;
    const isBevelEdge = Math.abs(nr) > 0.25 && Math.abs(nz) > 0.25;

    for (let s = 0; s <= radialSegments; s++) {
      const angle = (s / radialSegments) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      for (let endIdx = 0; endIdx < 2; endIdx++) {
        const radius = endIdx ? r1 : r0;
        const zCoord = endIdx ? z1 : z0;
        const vx = offsetX + radius * cosA;
        const vy = offsetY + radius * sinA;
        const vz = -zCoord;

        positions.push(vx, vy, vz);
        normals.push(nr * cosA, nr * sinA, -nz);

        let shade =
          0.9 + 0.2 * hashNoise3D(Math.round(zCoord * 150), Math.round(angle * 3), segIdx);
        if (isBevelEdge && wear > 0) {
          const p = hashNoise3D(s * 7.1, segIdx * 3.3, zCoord * 100);
          const d = Math.max(0, p - 0.84) / 0.16;
          shade *= 1 + wear * 1.6 * d * d;
        }
        const c = colorFn ? colorFn(radius, zCoord, color) : color;
        colors.push(c[0] * shade, c[1] * shade, c[2] * shade);
      }
    }

    for (let s = 0; s < radialSegments; s++) {
      const v0 = vertexBase + s * 2;
      const v1 = v0 + 2;
      const v2 = v0 + 1;
      const v3 = v0 + 3;
      indices.push(v0, v2, v1, v1, v2, v3);
    }
    vertexBase += (radialSegments + 1) * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(new Float32Array((positions.length / 3) * 2), 2),
  );
  geo.setIndex(indices);
  return geo;
}

/**
 * 创建带倒角端面的圆柱连接销/栓体
 */
export function createConnectingTube(
  radius,
  length,
  x,
  y,
  z,
  color,
  radialSegments = 12,
  wear = 0,
) {
  const bevel = Math.min(radius * 0.25, length * 0.25);
  const halfL = length / 2;
  const geo = createRevolvedProfile(
    [
      [0, -halfL],
      [radius - bevel, -halfL],
      [radius, -halfL + bevel],
      [radius, halfL - bevel],
      [radius - bevel, halfL],
      [0, halfL],
    ],
    radialSegments,
    color,
    wear,
  );
  geo.rotateY(Math.PI / 2);
  geo.translate(x, y, -z);
  return geo;
}

/**
 * 生成长圆孔 (Slot/Oval) 轮廓顶点
 */
export function createSlotOvalPoints(cx, cy, width, height, segs = 4) {
  const pts = [];
  const r = height / 2;
  const halfStraight = width / 2 - r;
  for (let i = 0; i <= segs; i++) {
    const a = -Math.PI / 2 + (i / segs) * Math.PI;
    pts.push([cx + halfStraight + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI / 2 + (i / segs) * Math.PI;
    pts.push([cx - halfStraight + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/**
 * 生成圆角矩形轮廓顶点
 */
export function createRoundedRectPoints(x0, y0, x1, y1, r) {
  return [
    [x0 + r, y0],
    [x1 - r, y0],
    [x1, y0 + r],
    [x1, y1 - r],
    [x1 - r, y1],
    [x0 + r, y1],
    [x0, y1 - r],
    [x0, y0 + r],
  ];
}

/**
 * 统计几何体三角面数量
 * @param {THREE.BufferGeometry} geometry
 * @returns {number}
 */
export function countGeometryTris(geometry) {
  return (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
}

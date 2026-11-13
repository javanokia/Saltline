import * as THREE from "three";
import {
  mergeGeometries,
  createBoxBevelGeometry,
  createCylinderGeometry,
  transformGeometry,
} from "../geo.js";

const {
  Bone,
  Group,
  SkinnedMesh,
  Skeleton,
  BufferAttribute,
  Sphere,
  Vector3,
  Box3,
  Quaternion,
  Matrix4,
} = THREE;

// ============================================================================
// 装甲与机体表面着色调色板 (Color Tint Profiles)
// ============================================================================

export const COLOR_SHELL_WHITE = [1.15, 1.15, 1.15];
export const COLOR_SHELL_WARM = [0.95, 0.96, 0.97];
export const COLOR_HAZARD_ORANGE = [1.0, 0.34, 0.08];
export const COLOR_DARK_ALLOY = [0.1, 0.11, 0.12];
export const COLOR_CHASSIS_BLACK = [0.035, 0.035, 0.038];
export const COLOR_AMBER_WARNING = [1.0, 0.7, 0.07];
export const COLOR_NEUTRAL_WHITE = [1.0, 1.0, 1.0];
export const COLOR_CHROME_BRIGHT = [2.4, 2.5, 2.6];
export const COLOR_GUNMETAL_GREY = [0.45, 0.46, 0.48];

// 镜头光学发光色彩 (Lens Illumination Color Profiles)
export const LENS_COLOR_AMBER_PATROL = [8.0, 4.0, 0.7]; // 巡逻与搜寻状态: 警戒琥珀黄
export const LENS_COLOR_RED_ALERT = [14.0, 1.0, 0.35]; // 锁定与开火状态: 战术激怒高亮红

export const HALF_PI = Math.PI / 2;

// 几何构建辅助函数 (Procedural Geometry Helpers)
export const createBeveledBox = (w, h, d, bevel = 0.008) => createBoxBevelGeometry(w, h, d, bevel);
/**
 * @param {THREE.BufferGeometry} geo
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} [rx]
 * @param {number} [ry]
 * @param {number} [rz]
 * @param {number | [number, number, number]} [scale]
 */
export const placeGeometry = (geo, x, y, z, rx = 0, ry = 0, rz = 0, scale = 1) =>
  transformGeometry(geo, { p: [x, y, z], r: [rx, ry, rz], s: scale });
export const createCylinderY = (rTop, rBottom, height, seg = 12) =>
  createCylinderGeometry(rTop, rBottom, height, seg);
export const createCylinderX = (rTop, rBottom, height, seg = 12) =>
  transformGeometry(createCylinderGeometry(rTop, rBottom, height, seg), { r: [0, 0, -HALF_PI] });
export const createCylinderZ = (rTop, rBottom, height, seg = 12) =>
  transformGeometry(createCylinderGeometry(rTop, rBottom, height, seg), { r: [HALF_PI, 0, 0] });

const scratchVec1 = new Vector3();
const scratchVec2 = new Vector3();
const scratchQuat = new Quaternion();
const UP_DIR_Y = new Vector3(0, 1, 0);
const scratchMatrix = new Matrix4();
const UNIT_SCALE = new Vector3(1, 1, 1);

/**
 * 连接两点之间的工业管路/液压杆几何体
 */
export function createPipeBetweenPoints(pointA, pointB, rTop, rBottom = rTop, radialSegments = 8) {
  scratchVec1.set(pointA[0], pointA[1], pointA[2]);
  scratchVec2.set(pointB[0], pointB[1], pointB[2]);
  const length = scratchVec1.distanceTo(scratchVec2);
  const cylinder = createCylinderGeometry(rBottom, rTop, length, radialSegments);
  const dir = scratchVec2.clone().sub(scratchVec1).normalize();
  scratchQuat.setFromUnitVectors(UP_DIR_Y, dir);
  scratchMatrix.compose(
    scratchVec1.clone().add(scratchVec2).multiplyScalar(0.5),
    scratchQuat,
    UNIT_SCALE,
  );
  cylinder.applyMatrix4(scratchMatrix);
  return cylinder;
}

export const createScaledSphere = (radius, segW = 14, segH = 10, sx = 1, sy = 1, sz = 1) => {
  const geo = new THREE.SphereGeometry(radius, segW, segH);
  geo.scale(sx, sy, sz);
  return geo;
};

// 紧固件与六角螺栓程序化几何体
export const createBoltX = (x, y, z) =>
  placeGeometry(createCylinderX(0.0075, 0.0075, 0.006, 6), x, y, z);
export const createBoltY = (x, y, z) =>
  placeGeometry(createCylinderY(0.0075, 0.0075, 0.006, 6), x, y, z);
export const createBoltZ = (x, y, z) =>
  placeGeometry(createCylinderZ(0.0075, 0.0075, 0.006, 6), x, y, z);

/**
 * 程序化骨骼装配器 (Procedural Skeleton Rig Builder)
 * 动态定义骨骼树形拓扑结构，为几何构件赋予顶点权重与蒙皮索引 (Skinning Weights)
 */
export class SkeletonRig {
  constructor() {
    this.bones = [];
    this.index = {};
    this.slots = {};
    this.order = [];
  }

  /**
   * 定义或附加一根骨骼
   * @param {string} name 骨骼唯一标识
   * @param {string|null} parentName 父骨骼名称 (null 为根骨骼)
   * @param {number} [localX=0] 相对父骨骼的局部偏移 X
   * @param {number} [localY=0] 局部偏移 Y
   * @param {number} [localZ=0] 局部偏移 Z
   */
  bone(name, parentName, localX = 0, localY = 0, localZ = 0) {
    const parent = parentName ? this.bones[this.index[parentName]] : null;
    if (parentName && !parent) {
      throw new Error("rig: unknown parent bone " + parentName);
    }
    const record = {
      name,
      parent: parent ? parent.i : -1,
      local: [localX, localY, localZ],
      world: [
        localX + (parent ? parent.world[0] : 0),
        localY + (parent ? parent.world[1] : 0),
        localZ + (parent ? parent.world[2] : 0),
      ],
      i: this.bones.length,
    };
    this.index[name] = record.i;
    this.bones.push(record);
    return record;
  }

  /**
   * 向指定材质槽位和骨骼挂载网格几何体，并写入顶点蒙皮与光照着色属性
   * @param {string} slotName 材质槽位名称 (如 'shell', 'metal', 'glow', 'lens')
   * @param {string} boneName 绑定的骨骼名
   * @param {THREE.BufferGeometry} geometry 网格几何体
   * @param {number[]} [tint=[1,1,1]] 顶点基础着色 RGB
   * @param {boolean} [applyDiffuseShading=true] 是否烘焙法线微遮蔽与定向漫反射
   */
  add(slotName, boneName, geometry, tint = [1, 1, 1], applyDiffuseShading = true) {
    const bone = this.bones[this.index[boneName]];
    if (!bone) {
      throw new Error("rig: unknown bone " + boneName);
    }

    const geo = geometry;
    if (!geo.attributes.normal) geo.computeVertexNormals();

    // 清理冗余属性
    for (const key of Object.keys(geo.attributes)) {
      if (key !== "position" && key !== "normal" && key !== "uv") {
        geo.deleteAttribute(key);
      }
    }

    const vertexCount = geo.attributes.position.count;
    if (!geo.attributes.uv) {
      geo.setAttribute("uv", new BufferAttribute(new Float32Array(vertexCount * 2), 2));
    }

    // 变换到该骨骼的世界坐标系起点
    geo.translate(bone.world[0], bone.world[1], bone.world[2]);

    const colors = new Float32Array(vertexCount * 3);
    const skinIndices = new Uint16Array(vertexCount * 4);
    const skinWeights = new Float32Array(vertexCount * 4);
    const normals = geo.attributes.normal;

    for (let i = 0; i < vertexCount; i++) {
      const diffuse = applyDiffuseShading ? 0.74 + 0.26 * (normals.getY(i) * 0.5 + 0.5) : 1.0;
      colors[i * 3] = tint[0] * diffuse;
      colors[i * 3 + 1] = tint[1] * diffuse;
      colors[i * 3 + 2] = tint[2] * diffuse;

      // 绑定单一骨骼 (刚性机械装甲权重 1.0)
      skinIndices[i * 4] = bone.i;
      skinWeights[i * 4] = 1.0;
    }

    geo.setAttribute("color", new BufferAttribute(colors, 3));
    geo.setAttribute("skinIndex", new BufferAttribute(skinIndices, 4));
    geo.setAttribute("skinWeight", new BufferAttribute(skinWeights, 4));

    if (!this.slots[slotName]) {
      this.slots[slotName] = [];
      this.order.push(slotName);
    }
    this.slots[slotName].push(geo);
    return this;
  }

  /**
   * 合并所有插槽几何体，构建统一的 SkinnedMesh 几何体
   * @param {string[]} [orderOverride] 槽位排序覆写
   * @returns {{ geometry: THREE.BufferGeometry, slots: string[], bones: object[], tris: number, extra?: any }}
   */
  build(orderOverride) {
    const activeSlots = (orderOverride || this.order).filter(
      (s) => this.slots[s] && this.slots[s].length,
    );
    const mergedSlotGeos = activeSlots.map((slot) => {
      const geos = this.slots[slot];
      const normalizedGeos = geos.some((g) => !g.index)
        ? geos.map((g) => (g.index ? g.toNonIndexed() : g))
        : geos;
      const merged = mergeGeometries(normalizedGeos, false);
      return merged.index ? merged.toNonIndexed() : merged;
    });

    const finalMergedGeometry = mergeGeometries(mergedSlotGeos, true);
    finalMergedGeometry.computeBoundingSphere();
    finalMergedGeometry.computeBoundingBox();

    /** @type {{ geometry: THREE.BufferGeometry; slots: string[]; bones: any[]; tris: number; extra?: any }} */
    const res = {
      geometry: finalMergedGeometry,
      slots: activeSlots,
      bones: this.bones,
      tris: finalMergedGeometry.attributes.position.count / 3,
    };
    return res;
  }

  compile(orderOverride) {
    return this.build(orderOverride);
  }
}

/**
 * 实例化蒙皮网格与骨骼层级结构 (Create Skinned Mesh & Skeleton)
 * @param {object} rigDef 由 SkeletonRig.build() 输出的骨骼定义
 * @param {object} materials 材质映射字典
 * @param {object} options
 */
export function createSkinnedMesh(
  rigDef,
  materials,
  {
    castShadow = true,
    receiveShadow = true,
    radius = 1.5,
    center = [0, 0.5, 0],
    extra = null,
  } = {},
) {
  // 1. 实例化 Three.js Bone 对象
  const boneInstances = rigDef.bones.map((b) => {
    const bone = new Bone();
    bone.name = b.name;
    bone.position.set(b.local[0], b.local[1], b.local[2]);
    return bone;
  });

  // 2. 建立父子骨骼树形拓扑
  rigDef.bones.forEach((b, idx) => {
    if (b.parent >= 0) {
      boneInstances[b.parent].add(boneInstances[idx]);
    }
  });

  // 3. 构建多材质蒙皮网格 (Multi-material SkinnedMesh)
  const rootGroup = new Group();
  const materialList = rigDef.slots.map((s) => materials[s]);
  const skinnedMesh = new SkinnedMesh(rigDef.geometry, materialList);
  skinnedMesh.castShadow = castShadow;
  skinnedMesh.receiveShadow = receiveShadow;
  rootGroup.add(skinnedMesh);

  // 将根骨骼添加至网格
  rigDef.bones.forEach((b, idx) => {
    if (b.parent < 0) skinnedMesh.add(boneInstances[idx]);
  });
  rootGroup.updateMatrixWorld(true);

  // 4. 绑定 Skeleton
  const skeleton = new Skeleton(boneInstances);
  skinnedMesh.bind(skeleton);
  skinnedMesh.boundingSphere = new Sphere(new Vector3(center[0], center[1], center[2]), radius);
  skinnedMesh.boundingBox = new Box3(
    new Vector3(center[0] - radius, center[1] - radius, center[2] - radius),
    new Vector3(center[0] + radius, center[1] + radius, center[2] + radius),
  );

  const boneMap = {};
  boneInstances.forEach((b) => {
    boneMap[b.name] = b;
  });

  const result = {
    group: rootGroup,
    mesh: skinnedMesh,
    bones: boneMap,
    skeleton,
    extraMesh: null,
  };

  // 可选附加外层特效网格 (如能量护罩、警示外罩)
  if (extra) {
    const extraMatList = extra.def.slots.map((s) => materials[s]);
    const extraMesh = new SkinnedMesh(extra.def.geometry, extraMatList);
    extraMesh.castShadow = false;
    extraMesh.receiveShadow = false;
    extraMesh.renderOrder = 5;
    rootGroup.add(extraMesh);
    extraMesh.updateMatrixWorld(true);
    extraMesh.bind(skeleton, skinnedMesh.bindMatrix);
    const extraRadius = extra.radius || radius;
    extraMesh.boundingSphere = new Sphere(
      new Vector3(center[0], center[1], center[2]),
      extraRadius,
    );
    extraMesh.boundingBox = new Box3().setFromCenterAndSize(
      extraMesh.boundingSphere.center,
      new Vector3(1, 1, 1).multiplyScalar(2 * extraRadius),
    );
    result.extraMesh = extraMesh;
  }

  return result;
}

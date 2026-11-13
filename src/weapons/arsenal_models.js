// @ts-check
/**
 * @file src/weapons/arsenal_models.js
 * @description 多武器系统 3D 程序化视模装配库 (Procedural Arsenal Viewmodels Generator)
 *
 * 遵循零外部资产 (Zero-Asset Paradigm) 哲学：
 * 采用纯数学几何算子 (createBoxBevelGeometry / createTubeFromPoints) 与 MRT 材质槽位，
 * 在客户端内存中程序化合成工业级枪械 3D 网格模型：
 * 1. SG-12 Breacher (几猫重型战术霰弹枪 - 泵动式大口径近战突破枪)
 * 2. SMG-45 Stinger (几猫微型战术冲锋枪 - 高射速紧凑型室内清道夫)
 * 3. SR-99 Vanguard (几猫高精反器材狙击步枪 - 栓动式远距穿甲重武器)
 */

import * as THREE from "three";
import { createBoxBevelGeometry, createTubeFromPoints, mergeGeometriesClean } from "../geo.js";

const { BufferAttribute, Euler, Matrix4, Vector3, Mesh, MeshStandardMaterial, Group } = THREE;

// 伪随机哈希与顶点颜色微噪点生成算子
const hash3 = (x, y, z) => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
};

/**
 * 为几何体注入微妙表面微噪点与顶点色
 * @param {THREE.BufferGeometry} geo
 * @param {number[]} baseColor RGB [r, g, b] (0..1)
 */
function applyVertexNoise(geo, baseColor) {
  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise = 0.92 + 0.16 * hash3(Math.round(x * 80), Math.round(y * 80), Math.round(z * 80));
    colors[i * 3] = baseColor[0] * noise;
    colors[i * 3 + 1] = baseColor[1] * noise;
    colors[i * 3 + 2] = baseColor[2] * noise;
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
}

const tempEuler = new Euler();
const tempMatrix = new Matrix4();

/**
 * 构造带倒角、旋转与位移的几何部件
 */
function createBevelPart(w, h, d, bevel, x, y, z, color, rot = null) {
  const geo = createBoxBevelGeometry(w, h, d, bevel);
  applyVertexNoise(geo, color);
  if (rot) {
    tempEuler.set(rot[0], rot[1], rot[2]);
    geo.applyMatrix4(tempMatrix.makeRotationFromEuler(tempEuler));
  }
  geo.translate(x, y, z);
  return geo;
}

// 枪械共用涂装颜色定义
const C_DARK_STEEL = [0.18, 0.2, 0.22];
const C_GUNMETAL = [0.26, 0.28, 0.3];
const C_ANODIZED_BLACK = [0.12, 0.13, 0.14];
const C_COYOTE_POLYMER = [0.42, 0.36, 0.28];
const C_WARM_POLYMER = [0.22, 0.21, 0.2];
const C_TITANIUM = [0.32, 0.35, 0.38];
const C_RED_ACCENT = [0.72, 0.16, 0.12];
const C_BRASS = [0.82, 0.65, 0.24];

// ============================================================================
// 一、 SG-12 Breacher (重型战术霰弹枪) 3D 几何装配
// ============================================================================

/**
 * 装配 SG-12 泵动霰弹枪几何网格
 * @param {object} mats 全局材质管理器
 * @returns {THREE.Group}
 */
export function buildShotgunMesh(mats) {
  const root = new Group();
  root.name = "weapon_sg12";

  const geosMetal = [];
  const geosPolymer = [];
  const geosAccent = [];

  // 1. 机匣主体 (Heavy Machined Receiver)
  geosMetal.push(createBevelPart(0.046, 0.068, 0.26, 0.005, 0, 0, -0.06, C_ANODIZED_BLACK));
  // 抛壳窗 (Ejection Port)
  geosMetal.push(createBevelPart(0.012, 0.032, 0.075, 0.003, 0.022, 0.012, -0.045, C_GUNMETAL));

  // 2. 枪管与下置管状弹仓 (Over/Under Dual Barrel System)
  // 上主枪管 (12-Gauge Heavy Barrel)
  geosMetal.push(createBevelPart(0.026, 0.026, 0.42, 0.004, 0, 0.024, -0.38, C_DARK_STEEL));
  // 下置管式弹仓 (Tubular Magazine)
  geosMetal.push(createBevelPart(0.024, 0.024, 0.38, 0.003, 0, -0.004, -0.36, C_GUNMETAL));
  // 弹仓前端金属紧固帽 (Magazine Cap)
  geosMetal.push(createBevelPart(0.028, 0.028, 0.022, 0.004, 0, -0.004, -0.555, C_DARK_STEEL));
  // 枪口多孔制退防跳器 (Door-Breaching Muzzle Brake)
  geosMetal.push(createBevelPart(0.032, 0.032, 0.045, 0.004, 0, 0.024, -0.605, C_ANODIZED_BLACK));

  // 3. 枪管上方多孔隔热罩 (Perforated Heat Shield)
  geosMetal.push(createBevelPart(0.034, 0.018, 0.32, 0.002, 0, 0.038, -0.34, C_ANODIZED_BLACK));

  // 4. 战术泵动滑块把手 (Textured Pump Action Forend Slide)
  geosPolymer.push(createBevelPart(0.044, 0.048, 0.16, 0.006, 0, -0.004, -0.32, C_WARM_POLYMER));
  // 滑块防滑纵向刻纹
  for (let z = -0.38; z <= -0.26; z += 0.02) {
    geosPolymer.push(createBevelPart(0.048, 0.008, 0.006, 0.001, 0, -0.028, z, C_ANODIZED_BLACK));
  }

  // 5. 握把与枪托 (Ergonomic Grip & Fixed Heavy Stock)
  // 战术握把
  geosPolymer.push(
    createBevelPart(0.034, 0.12, 0.048, 0.006, 0, -0.075, 0.04, C_WARM_POLYMER, [0.38, 0, 0]),
  );
  // 扳机护圈与扳机
  geosMetal.push(createBevelPart(0.024, 0.045, 0.075, 0.004, 0, -0.045, -0.01, C_ANODIZED_BLACK));
  geosAccent.push(createBevelPart(0.008, 0.025, 0.012, 0.002, 0, -0.042, -0.005, C_RED_ACCENT));
  // 实木/高聚物重型固定枪托
  geosPolymer.push(
    createBevelPart(0.042, 0.085, 0.24, 0.008, 0, -0.022, 0.19, C_WARM_POLYMER, [-0.08, 0, 0]),
  );
  // 枪托橡胶缓冲后垫 (Rubber Recoil Buttpad)
  geosPolymer.push(createBevelPart(0.044, 0.11, 0.028, 0.005, 0, -0.032, 0.315, C_ANODIZED_BLACK));

  // 6. 机械瞄具 (Ghost Ring Rear Sight & High-Vis Front Bead)
  // 准星
  geosAccent.push(createBevelPart(0.006, 0.012, 0.006, 0.001, 0, 0.045, -0.58, C_RED_ACCENT));
  // 照门保护耳
  geosMetal.push(createBevelPart(0.028, 0.016, 0.018, 0.002, 0, 0.042, -0.04, C_ANODIZED_BLACK));

  // 合并生成网格
  const defaultMat = new MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.82,
    vertexColors: true,
  });
  const polyMat = new MeshStandardMaterial({
    roughness: 0.65,
    metalness: 0.18,
    vertexColors: true,
  });

  const mMetal = mergeGeometriesClean(geosMetal);
  if (mMetal) root.add(new Mesh(mMetal, defaultMat));
  const mPoly = mergeGeometriesClean(geosPolymer);
  if (mPoly) root.add(new Mesh(mPoly, polyMat));
  const mAccent = mergeGeometriesClean(geosAccent);
  if (mAccent) root.add(new Mesh(mAccent, defaultMat));

  return root;
}

// ============================================================================
// 二、 SMG-45 Stinger (高射速紧凑型冲锋枪) 3D 几何装配
// ============================================================================

/**
 * 装配 SMG-45 紧凑冲锋枪几何网格
 * @param {object} mats 全局材质管理器
 * @returns {THREE.Group}
 */
export function buildSmgMesh(mats) {
  const root = new Group();
  root.name = "weapon_smg45";

  const geosMetal = [];
  const geosPolymer = [];
  const geosAccent = [];

  // 1. 紧凑型机匣 (Compact Upper/Lower Receiver)
  geosPolymer.push(createBevelPart(0.042, 0.075, 0.22, 0.005, 0, 0.015, -0.06, C_COYOTE_POLYMER));
  // 顶部金属战术导轨 (Top Picatinny Rail)
  geosMetal.push(createBevelPart(0.028, 0.012, 0.26, 0.002, 0, 0.058, -0.06, C_ANODIZED_BLACK));

  // 2. 超短带开槽外枪管与消焰器 (Short Barrel & Muzzle Compensator)
  geosMetal.push(createBevelPart(0.022, 0.022, 0.18, 0.003, 0, 0.022, -0.25, C_DARK_STEEL));
  geosMetal.push(createBevelPart(0.026, 0.026, 0.038, 0.004, 0, 0.022, -0.35, C_ANODIZED_BLACK));

  // 3. 加长直立式工程塑料弹匣 (40-round Extended Vertical Magazine)
  geosPolymer.push(
    createBevelPart(0.03, 0.19, 0.046, 0.004, 0, -0.11, -0.05, C_ANODIZED_BLACK, [0.15, 0, 0]),
  );
  // 弹匣快速拔出底板 (Speed Plate)
  geosAccent.push(createBevelPart(0.034, 0.018, 0.052, 0.003, 0, -0.21, -0.035, C_COYOTE_POLYMER));

  // 4. 前置战术斜握把 (Angled Foregrip)
  geosPolymer.push(
    createBevelPart(0.032, 0.065, 0.072, 0.005, 0, -0.035, -0.18, C_COYOTE_POLYMER, [-0.42, 0, 0]),
  );

  // 5. 战术手枪握把与扳机
  geosPolymer.push(
    createBevelPart(0.032, 0.11, 0.042, 0.005, 0, -0.07, 0.04, C_COYOTE_POLYMER, [0.35, 0, 0]),
  );
  geosMetal.push(createBevelPart(0.022, 0.042, 0.065, 0.003, 0, -0.038, 0.005, C_ANODIZED_BLACK));
  geosAccent.push(createBevelPart(0.006, 0.022, 0.01, 0.002, 0, -0.035, 0.005, C_RED_ACCENT));

  // 6. 微型全息红点瞄准镜 (Micro Reflex Red Dot Sight)
  // 镜体基座
  geosMetal.push(createBevelPart(0.032, 0.028, 0.065, 0.003, 0, 0.076, -0.08, C_ANODIZED_BLACK));
  // 镜框立柱
  geosMetal.push(createBevelPart(0.034, 0.035, 0.012, 0.002, 0, 0.092, -0.065, C_ANODIZED_BLACK));
  // 红点发光芯片
  geosAccent.push(createBevelPart(0.004, 0.004, 0.004, 0.001, 0, 0.092, -0.065, [1.0, 0.1, 0.1]));

  // 7. 侧折叠战术枪托 (Side-Folding Wireframe Stock)
  geosMetal.push(createBevelPart(0.012, 0.028, 0.22, 0.002, 0.018, 0.022, 0.15, C_DARK_STEEL));
  geosPolymer.push(
    createBevelPart(0.032, 0.095, 0.022, 0.004, 0.018, 0.01, 0.26, C_ANODIZED_BLACK),
  );

  const matSteel = new MeshStandardMaterial({
    roughness: 0.38,
    metalness: 0.78,
    vertexColors: true,
  });
  const matPoly = new MeshStandardMaterial({
    roughness: 0.72,
    metalness: 0.15,
    vertexColors: true,
  });

  const mMetal = mergeGeometriesClean(geosMetal);
  if (mMetal) root.add(new Mesh(mMetal, matSteel));
  const mPoly = mergeGeometriesClean(geosPolymer);
  if (mPoly) root.add(new Mesh(mPoly, matPoly));
  const mAccent = mergeGeometriesClean(geosAccent);
  if (mAccent) root.add(new Mesh(mAccent, matSteel));

  return root;
}

// ============================================================================
// 三、 SR-99 Vanguard (高精反器材狙击步枪) 3D 几何装配
// ============================================================================

/**
 * 装配 SR-99 高精栓动反器材狙击步枪几何网格
 * @param {object} mats 全局材质管理器
 * @returns {THREE.Group}
 */
export function buildSniperMesh(mats) {
  const root = new Group();
  root.name = "weapon_sr99";

  const geosMetal = [];
  const geosTitanium = [];
  const geosPolymer = [];
  const geosAccent = [];

  // 1. 重型钛合金机匣 (Heavy Monolithic Receiver)
  geosTitanium.push(createBevelPart(0.052, 0.076, 0.36, 0.006, 0, 0.012, -0.06, C_TITANIUM));
  // 巨型旋转后拉式枪栓 (Heavy Bolt Handle)
  geosMetal.push(
    createBevelPart(0.014, 0.014, 0.12, 0.003, 0.038, 0.028, -0.02, C_DARK_STEEL, [0, 0, -0.45]),
  );
  geosMetal.push(
    createBevelPart(0.022, 0.022, 0.022, 0.004, 0.065, 0.055, -0.02, C_ANODIZED_BLACK),
  );

  // 2. 超长加重型凹槽枪管与双室冲击式制退器 (Fluted Bull Barrel & Baffle Brake)
  geosMetal.push(createBevelPart(0.032, 0.032, 0.65, 0.005, 0, 0.022, -0.52, C_DARK_STEEL));
  // 枪口巨型双室反器材制退器 (Dual-Chamber Muzzle Brake)
  geosTitanium.push(createBevelPart(0.048, 0.042, 0.085, 0.005, 0, 0.022, -0.87, C_TITANIUM));
  // 制退器侧向喷口开槽
  for (let z of [-0.85, -0.89]) {
    geosAccent.push(createBevelPart(0.052, 0.012, 0.015, 0.002, 0, 0.022, z, C_ANODIZED_BLACK));
  }

  // 3. 高倍率军规战术光学瞄准镜 (High-Magnification Sniper Scope)
  // 主镜身镜筒
  geosTitanium.push(createBevelPart(0.038, 0.038, 0.28, 0.004, 0, 0.098, -0.06, C_ANODIZED_BLACK));
  // 前端物镜喇叭口 (Objective Bell 56mm)
  geosTitanium.push(createBevelPart(0.052, 0.052, 0.075, 0.006, 0, 0.098, -0.22, C_ANODIZED_BLACK));
  // 后端目镜喇叭口 (Eyepiece Bell)
  geosTitanium.push(createBevelPart(0.044, 0.044, 0.055, 0.005, 0, 0.098, 0.095, C_ANODIZED_BLACK));
  // 弹道高低与风偏调节手轮 (Elevation & Windage Turrets)
  geosMetal.push(createBevelPart(0.018, 0.022, 0.018, 0.002, 0, 0.125, -0.06, C_GUNMETAL));
  geosMetal.push(createBevelPart(0.022, 0.018, 0.018, 0.002, 0.026, 0.098, -0.06, C_GUNMETAL));
  // 瞄具前后加重镜桥支架 (Scope Mount Rings)
  geosMetal.push(createBevelPart(0.044, 0.045, 0.022, 0.003, 0, 0.075, -0.15, C_DARK_STEEL));
  geosMetal.push(createBevelPart(0.044, 0.045, 0.022, 0.003, 0, 0.075, 0.03, C_DARK_STEEL));

  // 4. 下挂式可折叠战术双脚架 (Folding Bipod)
  geosMetal.push(createBevelPart(0.035, 0.025, 0.045, 0.003, 0, -0.012, -0.42, C_ANODIZED_BLACK));
  // 脚架双支腿 (收起姿态沿枪身贴靠)
  geosMetal.push(createBevelPart(0.014, 0.014, 0.18, 0.002, -0.028, -0.025, -0.32, C_DARK_STEEL));
  geosMetal.push(createBevelPart(0.014, 0.014, 0.18, 0.002, 0.028, -0.025, -0.32, C_DARK_STEEL));

  // 5. 5发装单排金属弹匣 (5-Round Heavy Steel Box Magazine)
  geosMetal.push(
    createBevelPart(0.034, 0.13, 0.085, 0.004, 0, -0.08, -0.08, C_GUNMETAL, [-0.15, 0, 0]),
  );

  // 6. 人体工程学一体化狙击枪托 (Thumbhole Ergonomic Precision Stock)
  geosPolymer.push(createBevelPart(0.046, 0.11, 0.28, 0.008, 0, -0.025, 0.22, C_WARM_POLYMER));
  // 可调节贴腮板 (Cheek Rest)
  geosPolymer.push(createBevelPart(0.042, 0.028, 0.12, 0.004, 0, 0.048, 0.2, C_COYOTE_POLYMER));
  // 枪托底部单脚架支撑杆与厚实橡胶缓冲后垫
  geosMetal.push(createBevelPart(0.016, 0.055, 0.016, 0.002, 0, -0.1, 0.32, C_DARK_STEEL));
  geosPolymer.push(createBevelPart(0.048, 0.13, 0.032, 0.005, 0, -0.035, 0.37, C_ANODIZED_BLACK));

  const matTitanium = new MeshStandardMaterial({
    roughness: 0.28,
    metalness: 0.88,
    vertexColors: true,
  });
  const matSteel = new MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.82,
    vertexColors: true,
  });
  const matPoly = new MeshStandardMaterial({
    roughness: 0.68,
    metalness: 0.18,
    vertexColors: true,
  });

  const mTit = mergeGeometriesClean(geosTitanium);
  if (mTit) root.add(new Mesh(mTit, matTitanium));
  const mMetal = mergeGeometriesClean(geosMetal);
  if (mMetal) root.add(new Mesh(mMetal, matSteel));
  const mPoly = mergeGeometriesClean(geosPolymer);
  if (mPoly) root.add(new Mesh(mPoly, matPoly));
  const mAccent = mergeGeometriesClean(geosAccent);
  if (mAccent) root.add(new Mesh(mAccent, matSteel));

  return root;
}

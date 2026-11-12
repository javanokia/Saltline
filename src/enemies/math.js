import * as THREE from "three";

/**
 * 常用数值钳制工具函数
 */
export const clampValue = (val, min, max) => (val < min ? min : val > max ? max : val);

/**
 * 角度差值规范化在 [-PI, PI] 之间
 */
export const diffAngle = (target, current) => {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  else if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
};

/**
 * 射线与球体精确解析相交判定 (Ray-Sphere Analytic Intersection)
 * @param {THREE.Vector3} rayOrigin 射线起点
 * @param {THREE.Vector3} rayDir 归一化射线方向
 * @param {THREE.Vector3} sphereCenter 球心坐标
 * @param {number} sphereRadius 球体半径
 * @param {number} maxDist 射线最大检测距离
 * @param {object} outHit 命中结果输出载体
 * @returns {boolean} 是否发生有效相交
 */
export function intersectRaySphere(rayOrigin, rayDir, sphereCenter, sphereRadius, maxDist, outHit) {
  const dx = rayOrigin.x - sphereCenter.x;
  const dy = rayOrigin.y - sphereCenter.y;
  const dz = rayOrigin.z - sphereCenter.z;

  const b = dx * rayDir.x + dy * rayDir.y + dz * rayDir.z;
  const c = dx * dx + dy * dy + dz * dz - sphereRadius * sphereRadius;
  const discriminant = b * b - c;

  if (discriminant < 0) return false;

  const hitDist = -b - Math.sqrt(discriminant);
  if (hitDist < 0 || hitDist > maxDist || hitDist >= outHit.dist) return false;

  outHit.dist = hitDist;
  outHit.point.copy(rayOrigin).addScaledVector(rayDir, hitDist);
  outHit.normal.copy(outHit.point).sub(sphereCenter).normalize();
  return true;
}

const vSegDelta = new THREE.Vector3();
const vRayToSegStart = new THREE.Vector3();
const vClosestOnSeg = new THREE.Vector3();

/**
 * 射线与胶囊体精确相交判定 (Ray-Capsule Analytic Intersection)
 * 计算射线至线段轴线的最近点投影，转化为球体相交检测
 * @param {THREE.Vector3} rayOrigin
 * @param {THREE.Vector3} rayDir
 * @param {THREE.Vector3} segA 线段起点
 * @param {THREE.Vector3} segB 线段终点
 * @param {number} radius 胶囊体半径
 * @param {number} maxDist
 * @param {object} outHit
 * @returns {boolean}
 */
export function intersectRayCapsule(rayOrigin, rayDir, segA, segB, radius, maxDist, outHit) {
  vSegDelta.copy(segB).sub(segA);
  vRayToSegStart.copy(rayOrigin).sub(segA);

  const segLengthSq = vSegDelta.dot(vSegDelta);
  const segDotRay = vSegDelta.dot(rayDir);
  const segDotOrigin = vSegDelta.dot(vRayToSegStart);
  const rayDotOrigin = rayDir.dot(vRayToSegStart);

  const denom = segLengthSq - segDotRay * segDotRay;
  let t = denom > 1e-8 ? (segDotOrigin - segDotRay * rayDotOrigin) / denom : 0;
  t = Math.max(0, Math.min(1, t));

  vClosestOnSeg.copy(segA).addScaledVector(vSegDelta, t);
  return intersectRaySphere(rayOrigin, rayDir, vClosestOnSeg, radius, maxDist, outHit);
}

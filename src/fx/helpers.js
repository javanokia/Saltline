// @ts-check
/**
 * @file src/fx/helpers.js
 * @description 特效系统基础辅助计算、颜色解析与圆锥体随机发射向量
 */

import * as THREE from "three";

export const UP_VECTOR = new THREE.Vector3(0, 1, 0);
export const DOWN_VECTOR = new THREE.Vector3(0, -1, 0);

const cTempColor = new THREE.Color();
const aTempColorArr = [1, 1, 1];

/**
 * 将任意颜色输入 (十六进制数、THREE.Color、RGB数组) 解析为 [r, g, b] 数组
 * @param {any} colorInput
 * @param {number} [defaultR=1]
 * @param {number} [defaultG=1]
 * @param {number} [defaultB=1]
 * @returns {number[]}
 */
export function parseColorToArray(colorInput, defaultR = 1, defaultG = 1, defaultB = 1) {
  if (colorInput == null) {
    aTempColorArr[0] = defaultR;
    aTempColorArr[1] = defaultG;
    aTempColorArr[2] = defaultB;
  } else if (Array.isArray(colorInput)) {
    aTempColorArr[0] = colorInput[0];
    aTempColorArr[1] = colorInput[1];
    aTempColorArr[2] = colorInput[2];
  } else if (colorInput.isColor) {
    aTempColorArr[0] = colorInput.r;
    aTempColorArr[1] = colorInput.g;
    aTempColorArr[2] = colorInput.b;
  } else {
    cTempColor.set(colorInput);
    aTempColorArr[0] = cTempColor.r;
    aTempColorArr[1] = cTempColor.g;
    aTempColorArr[2] = cTempColor.b;
  }
  return aTempColorArr;
}

/**
 * 沿基准方向生成圆锥体扩散向量
 * @param {THREE.Vector3} baseDir
 * @param {number} spreadRadius
 * @param {THREE.Vector3} outVector
 * @returns {THREE.Vector3}
 */
export function randomVectorInCone(baseDir, spreadRadius, outVector) {
  const rx = Math.random() * 2 - 1;
  const ry = Math.random() * 2 - 1;
  const rz = Math.random() * 2 - 1;
  const len = Math.hypot(rx, ry, rz) || 1;
  const factor = (spreadRadius * Math.cbrt(Math.random())) / len;

  outVector.set(baseDir.x + rx * factor, baseDir.y + ry * factor, baseDir.z + rz * factor);

  const outLen = outVector.length();
  if (outLen < 1e-4) {
    outVector.copy(baseDir);
  } else {
    outVector.multiplyScalar(1 / outLen);
  }
  return outVector;
}

// @ts-check
/**
 * @file src/ground/decals.js
 * @description 码头地面道路标线、停车位、集装箱位、斑马线与车胎印 Canvas 图集生成器
 */

import * as THREE from "three";

const { CanvasTexture, ClampToEdgeWrapping, LinearFilter, LinearMipmapLinearFilter, NoColorSpace } =
  THREE;

export const ROAD_MARKING_BOUNDS = { x0: -40, z0: -30, w: 70, h: 60 };

/**
 * 离线 Canvas 绘制地面标线与车胎印贴图
 * @param {number} resolution
 * @param {number} [anisotropy=1]
 * @returns {THREE.CanvasTexture}
 */
export function buildGroundDecalsCanvas(resolution, anisotropy = 1) {
  let canvas = document.createElement("canvas");
  canvas.width = canvas.height = resolution;
  let ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[ground] failed to get 2d context for decals");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, resolution, resolution);

  let scaleX = resolution / ROAD_MARKING_BOUNDS.w,
    scaleZ = resolution / ROAD_MARKING_BOUNDS.h;
  ctx.setTransform(
    scaleX,
    0,
    0,
    scaleZ,
    -ROAD_MARKING_BOUNDS.x0 * scaleX,
    -ROAD_MARKING_BOUNDS.z0 * scaleZ,
  );
  ctx.globalCompositeOperation = "lighter";

  let colRed = "#ff0000",
    colGreen = "#00ff00",
    fontFamily = '"PingFang SC", "PingFang SC", Impact, "PingFang SC", sans-serif',
    rngSeed = 90210,
    randomFloat = () => {
      rngSeed |= 0;
      rngSeed = (rngSeed + 1831565813) | 0;
      let t = Math.imul(rngSeed ^ (rngSeed >>> 15), 1 | rngSeed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

  const drawLine = (x1, y1, x2, y2, width, strokeStyle, dash) => {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = width;
    ctx.lineCap = "butt";
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const strokeRect = (x1, y1, x2, y2, width, strokeStyle) => {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = width;
    ctx.setLineDash([]);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  };

  const fillRect = (x1, y1, x2, y2, fillStyle) => {
    ctx.fillStyle = fillStyle;
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  };

  const drawText = (text, posX, posY, scale, rot, fillStyle) => {
    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate(rot);
    ctx.scale(scale / 100, scale / 100);
    ctx.font = `900 100px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = fillStyle;
    let textWidth = -ctx.measureText(text).width / 2;
    ctx.fillText(text, textWidth, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000";
    for (let char of text) {
      let cw = ctx.measureText(char).width;
      if (!" I1".includes(char)) {
        ctx.fillRect(textWidth + cw * 0.36, -60, 4.5, 120);
      }
      textWidth += cw;
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.restore();
  };

  const drawHatchedZone = (x1, y1, x2, y2, strokeStyle, spacing = 1.1, lineWidth = 0.14) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
    ctx.clip();
    let span = x2 - x1 + (y2 - y1);
    for (let offset = 0; offset < span; offset += spacing) {
      drawLine(x1 + offset, y1, x1 + offset - (y2 - y1), y2, lineWidth, strokeStyle);
    }
    ctx.restore();
    strokeRect(x1, y1, x2, y2, 0.15, strokeStyle);
  };

  const drawArrow = (posX, posY, scaleX, fillStyle) => {
    ctx.save();
    ctx.translate(posX, posY);
    ctx.scale(scaleX, 1);
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(-1.6, -0.14);
    ctx.lineTo(0.5, -0.14);
    ctx.lineTo(0.5, -0.5);
    ctx.lineTo(1.7, 0);
    ctx.lineTo(0.5, 0.5);
    ctx.lineTo(0.5, 0.14);
    ctx.lineTo(-1.6, 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // 基础车道边界与黄白实线/虚线
  drawLine(-25.6, 3.6, 16.2, 3.6, 0.15, colRed);
  drawLine(-25.6, 8.4, -5.6, 8.4, 0.15, colRed);
  drawLine(10.4, 8.4, 16.2, 8.4, 0.15, colRed);
  drawLine(-24, 6, -3, 6, 0.12, colGreen, [3, 4.5]);
  drawLine(6, 6, 15.5, 6, 0.12, colGreen, [3, 4.5]);
  drawLine(-23, 14, 16.2, 14, 0.15, colRed);
  drawLine(-23, 18.6, 16.2, 18.6, 0.15, colRed);
  drawLine(-23, 16.3, 15.5, 16.3, 0.1, colGreen, [2, 6]);
  drawLine(-23, -3.6, 16.2, -3.6, 0.12, colRed);
  drawLine(-23, 0.56, 16.2, 0.56, 0.12, colRed);
  drawLine(-23, 24.2, 16.2, 24.2, 0.12, colRed);
  drawLine(-37.5, 2.6, -26.4, 2.6, 0.15, colGreen);
  drawLine(-37.5, 9.2, -26.4, 9.2, 0.15, colGreen);

  drawArrow(-14, 4.7, 1, colGreen);
  drawArrow(13, 7.3, -1, colGreen);
  drawArrow(-16, 15.2, 1, colGreen);
  drawArrow(2, 17.5, -1, colGreen);

  fillRect(-26.2, 3.6, -25.75, 8.4, colGreen);
  for (let z = 2.75; z < 9; z += 1) {
    fillRect(-31.2, z, -28.2, z + 0.5, colGreen);
  }

  // 速度限制标识 "SLOW 10" 与圆圈
  drawText("SLOW", -21.4, 6, 1.7, Math.PI / 2, colGreen);
  drawText("10", -19, 6, 1.8, Math.PI / 2, colGreen);
  ctx.strokeStyle = colGreen;
  ctx.lineWidth = 0.14;
  ctx.beginPath();
  ctx.ellipse(-19, 6, 1.35, 1.8, 0, 0, Math.PI * 2);
  ctx.stroke();

  drawLine(-30.4, 2.6, -30.4, -10.2, 0.12, colGreen);
  drawLine(-29, 2.6, -29, -8.8, 0.12, colGreen);
  drawLine(-30.4, -10.2, -7, -10.2, 0.12, colGreen);
  drawLine(-29, -8.8, -7, -8.8, 0.12, colGreen);

  for (let x = -28; x < -7.5; x += 2.2) {
    drawLine(x, -10.2, x + 0.9, -8.8, 0.1, colGreen);
  }
  for (let z = -7.5; z < 2; z += 2.2) {
    drawLine(-30.4, z, -29, z + 0.9, 0.1, colGreen);
  }

  // 集装箱贝位与停放区标号 (A0/B0/C0/D0)
  let bayRanges = [
    [-22.5, -10.3],
    [-5.3, 6.9],
    [10.5, 16.6],
  ];
  let drawContainerBayCluster = (startZ, endZ, prefix, textZ, rot, skipMiddle) => {
    bayRanges.forEach((range, idx) => {
      if (skipMiddle && idx === 1) return;
      let numCols = idx === 2 ? 1 : 2,
        numRows = endZ - startZ > 4 ? 2 : 1;
      for (let col = 0; col < numCols; col++) {
        for (let row = 0; row < numRows; row++) {
          let x0 = range[0] + ((range[1] - range[0]) * col) / numCols,
            x1 = range[0] + ((range[1] - range[0]) * (col + 1)) / numCols,
            z0 = startZ + ((endZ - startZ) * row) / numRows,
            z1 = startZ + ((endZ - startZ) * row + 1) / numRows;
          strokeRect(x0 - 0.12, z0 - 0.12, x1 + 0.12, z1 + 0.12, 0.1, colGreen);
        }
      }
      drawText(prefix + (idx + 1), (range[0] + range[1]) / 2, textZ, 0.85, rot, colRed);
    });
  };

  drawContainerBayCluster(-6.34, -3.9, "D0", -2.9, Math.PI, false);
  drawContainerBayCluster(0.86, 3.3, "C0", -0.15, 0, false);
  drawContainerBayCluster(8.7, 13.64, "B0", 14.75, Math.PI, true);
  drawContainerBayCluster(18.9, 23.84, "A0", 17.85, 0, false);

  for (let x of [-10.3, -5.3, 6.9, 10.5]) {
    drawLine(
      x + (x === -10.3 || x === 6.9 ? 0.35 : -0.35),
      -6.3,
      x + (x === -10.3 || x === 6.9 ? 0.35 : -0.35),
      23.8,
      0.1,
      colRed,
      [1.5, 1.5],
    );
  }

  // 警戒阴影区与 KEEP CLEAR 标识
  drawHatchedZone(-6.6, -10.9, -0.4, -8.9, colRed, 0.9, 0.12);
  drawHatchedZone(12.2, -22.6, 16.2, -16.4, colRed);
  drawHatchedZone(-0.9, 5.4, 3.9, 9.9, colRed, 0.95, 0.13);
  drawText("KEEP CLEAR", 1.5, 10.6, 0.62, 0, colRed);
  drawHatchedZone(19.8, -4.2, 27.2, 4.2, colRed, 1.2, 0.16);
  drawText("KEEP CLEAR", 17.4, -19.5, 0.8, Math.PI / 2, colRed);

  // 泊位与起重机轨道导引线
  drawLine(16.9, -29.5, 16.9, 27.5, 0.15, colRed);
  drawLine(17.7, -29.5, 17.7, 27.5, 0.1, colRed, [1, 1]);
  drawLine(19.3, -29.5, 19.3, 27.5, 0.1, colRed, [1, 1]);
  drawLine(27.7, -29.5, 27.7, 27.5, 0.1, colRed, [1, 1]);

  drawText("BERTH 4", 23.5, 21.6, 1.9, 0, colGreen);
  drawText("BERTH 4", 23.5, -7.7, 1.7, Math.PI, colGreen);

  for (let z = -27; z < 27; z += 9) {
    drawText(String(400 + Math.round((z + 27) / 9) * 5), 26.9, z + 2, 0.5, Math.PI / 2, colGreen);
  }

  // 蓝色通道绘制橡胶摩擦印与水滑轮胎刹车纹
  ctx.lineCap = "round";
  const drawSkidTirePair = (x1, z1, x2, z2, curveOffset, alpha) => {
    for (let trackOffset of [-0.95, 0.95]) {
      for (let subTread of [-0.16, 0.16]) {
        ctx.strokeStyle = `rgba(0,0,255,${alpha})`;
        ctx.lineWidth = 0.26;
        ctx.beginPath();
        ctx.moveTo(x1, z1 + trackOffset + subTread);
        ctx.quadraticCurveTo(
          (x1 + x2) / 2,
          (z1 + z2) / 2 + curveOffset + trackOffset + subTread,
          x2,
          z2 + trackOffset + subTread,
        );
        ctx.stroke();
      }
    }
  };

  for (let i = 0; i < 46; i++) {
    let laneZ = randomFloat() < 0.68 ? 6 : 16.3,
      zCenter = laneZ + (randomFloat() - 0.5) * 2.6,
      startX = -36 + randomFloat() * 40,
      len = 8 + randomFloat() * 26;
    drawSkidTirePair(
      startX,
      zCenter,
      Math.min(startX + len, 28),
      zCenter + (randomFloat() - 0.5) * 1.6,
      (randomFloat() - 0.5) * 1.4,
      0.1 + randomFloat() * 0.22,
    );
  }

  for (let i = 0; i < 12; i++) {
    let laneZ = randomFloat() < 0.5 ? 6 : 16.3,
      dir = randomFloat() < 0.5 ? -1 : 1,
      alpha = 0.12 + randomFloat() * 0.2;
    ctx.strokeStyle = `rgba(0,0,255,${alpha})`;
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(10 + randomFloat() * 4, laneZ + (randomFloat() - 0.5) * 2);
    ctx.quadraticCurveTo(
      21 + randomFloat() * 3,
      laneZ,
      22 + randomFloat() * 4,
      laneZ + dir * (8 + randomFloat() * 10),
    );
    ctx.stroke();
  }

  for (let i = 0; i < 60; i++) {
    let px = -34 + randomFloat() * 62,
      pz = -8 + randomFloat() * 34,
      segLen = 0.6 + randomFloat() * 2.5,
      angle = (randomFloat() - 0.5) * 0.5;
    ctx.strokeStyle = `rgba(0,0,255,${0.15 + randomFloat() * 0.3})`;
    ctx.lineWidth = 0.12 + randomFloat() * 0.2;
    ctx.beginPath();
    ctx.moveTo(px, pz);
    ctx.lineTo(px + Math.cos(angle) * segLen, pz + Math.sin(angle) * segLen);
    ctx.stroke();
  }

  let tex = new CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = NoColorSpace;
  tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

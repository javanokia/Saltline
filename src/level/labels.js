/**
 * @file src/level/labels.js
 * @description 动态 Canvas 环境文字标签图集化合并优化器 (Label Texture Atlas Consolidation)
 */

import * as THREE from "three";

const ATLAS_PADDING = 2;

/**
 * 将所有静态网格中的独立文字标签 Canvas 纹理合并为单张大图集 (Consolidate Labels into Texture Atlas)
 */
export function buildLabelAtlas(staticRoot, { scale = 0.5, maxW = 2048 } = {}) {
  const result = { count: 0, material: null, update() {} };
  if (typeof document === "undefined") return result;

  const matMap = new Map();
  staticRoot.traverse((node) => {
    if (!node.isMesh || Array.isArray(node.material)) return;
    const mat = node.material;
    if (!mat || mat.name !== "label" || !mat.map || !mat.map.image || !mat.map.image.width) return;
    let cur = node;
    let noMerge = false;
    while (cur) {
      if (cur.userData && cur.userData.noMerge) {
        noMerge = true;
        break;
      }
      cur = cur.parent;
    }
    if (!noMerge) {
      if (!matMap.has(mat)) matMap.set(mat, []);
      matMap.get(mat).push(node);
    }
  });

  if (matMap.size < 2) return result;

  const items = [...matMap.keys()].map((m) => {
    const img = m.map.image;
    return {
      m,
      img,
      w: Math.max(4, Math.ceil(img.width * scale)),
      h: Math.max(4, Math.ceil(img.height * scale)),
      x: 0,
      y: 0,
      version: 0,
    };
  });

  items.sort((a, b) => b.h - a.h || b.w - a.w);

  let curX = 0,
    curY = 0,
    rowH = 0;
  for (const it of items) {
    const limW = Math.min(it.w, maxW - 2 * ATLAS_PADDING);
    if (limW < it.w) {
      it.h = Math.max(4, Math.round((it.h * limW) / it.w));
      it.w = limW;
    }
    if (curX + it.w + 2 * ATLAS_PADDING > maxW) {
      curX = 0;
      curY += rowH;
      rowH = 0;
    }
    it.x = curX + ATLAS_PADDING;
    it.y = curY + ATLAS_PADDING;
    curX += it.w + 2 * ATLAS_PADDING;
    rowH = Math.max(rowH, it.h + 2 * ATLAS_PADDING);
  }

  const canvasW = maxW;
  const canvasH = THREE.MathUtils.ceilPowerOfTwo(Math.max(16, curY + rowH));
  if (canvasH > 4096) return result;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");

  const redrawAtlas = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvasW, canvasH);
    for (const it of items) {
      ctx.drawImage(
        it.img,
        it.x - ATLAS_PADDING,
        it.y - ATLAS_PADDING,
        it.w + 2 * ATLAS_PADDING,
        it.h + 2 * ATLAS_PADDING,
      );
      ctx.clearRect(it.x, it.y, it.w, it.h);
      ctx.drawImage(it.img, it.x, it.y, it.w, it.h);
      it.version = it.m.map.version;
    }
    atlasTex.needsUpdate = true;
  };

  const atlasTex = new THREE.CanvasTexture(canvas);
  atlasTex.generateMipmaps = false;
  atlasTex.minFilter = THREE.LinearFilter;
  atlasTex.magFilter = THREE.LinearFilter;
  atlasTex.colorSpace = THREE.SRGBColorSpace;

  const atlasMat = items[0].m.clone();
  atlasMat.map = atlasTex;
  atlasMat.name = "label_atlas";

  // 重新映射所有几何体 UV 坐标至合批大图集 (Remap Mesh UVs to Atlas Coordinates)
  for (const it of items) {
    const meshes = matMap.get(it.m) || [];
    const u0 = it.x / canvasW;
    const v0 = 1 - (it.y + it.h) / canvasH;
    const uW = it.w / canvasW;
    const vH = it.h / canvasH;

    for (const m of meshes) {
      const uvAttr = m.geometry.attributes.uv;
      if (uvAttr) {
        for (let i = 0; i < uvAttr.count; i++) {
          const oldU = uvAttr.getX(i);
          const oldV = uvAttr.getY(i);
          uvAttr.setXY(i, u0 + oldU * uW, v0 + oldV * vH);
        }
        uvAttr.needsUpdate = true;
      }
      m.material = atlasMat;
    }
  }

  redrawAtlas();
  result.count = items.length;
  result.material = atlasMat;
  result.update = () => {
    let changed = false;
    for (const it of items) {
      if (it.m.map.version !== it.version) {
        changed = true;
        break;
      }
    }
    if (changed) redrawAtlas();
  };

  return result;
}

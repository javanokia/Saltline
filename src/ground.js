// @ts-check
/**
 * @file src/ground.js
 * @description 3A 级码头地面、风暴洋面与降水模拟系统主入口 (Ground & Precipitation Subsystem)
 *
 * 【架构解耦模块体系】
 * - ./ground/terrain.js: 高度场采样、程序化噪声与宏观水洼掩模
 * - ./ground/textures.js: 程序化 PBR 地面纹理与 DataTexture 工具
 * - ./ground/decals.js: 道路标线、斑马线、集装箱位与喷涂字 Canvas
 * - ./ground/reflection.js: 平面水面镜面反射探针与斜剪裁投影矩阵
 * - ./ground/sea.js: Gerstner 复杂海浪波谱、渐变非均匀海面网格与着色器
 * - ./ground/rain.js: GPU 雨滴飞线、地面水花与避雨遮罩系统
 * - ./ground/material.js: 沥青路面、积水与反射材质物理着色器
 */

import * as THREE from "three";
import { SCENE_BOUNDS } from "./constants.js";

import {
  TERRAIN_BOUNDS,
  sampleGroundHeight,
  generateMacroMapData,
  sampleMacroMapBilinear,
} from "./ground/terrain.js";
import { createDataTexture2D, generateGroundPbrTextures } from "./ground/textures.js";
import { buildGroundDecalsCanvas } from "./ground/decals.js";
import { createPlanarReflector } from "./ground/reflection.js";
import { sampleSeaWaveHeight, createSeaSystem } from "./ground/sea.js";
import { createRainSystem } from "./ground/rain.js";
import { createGroundMaterial } from "./ground/material.js";

const { Group, Mesh, BoxGeometry, CylinderGeometry, DataTexture, MathUtils } = THREE;

/**
 * 构建完整的地面、海洋与雨水系统
 * @param {import('./types').EngineContext} engineCtx
 * @returns {Promise<any>}
 */
export async function createGroundSystem(engineCtx) {
  let isHighQuality = (engineCtx.quality.tex || 512) >= 1024,
    maxAniso = Math.min(
      8,
      engineCtx.renderer.capabilities.getMaxAnisotropy
        ? engineCtx.renderer.capabilities.getMaxAnisotropy()
        : 1,
    );

  let macroRes = isHighQuality ? 1024 : 512,
    macroData = generateMacroMapData(macroRes),
    maskTex = createDataTexture2D(macroData, macroRes, { repeat: false, aniso: 2 });

  let detailRes = isHighQuality ? 512 : 256,
    { det, nrm } = generateGroundPbrTextures(detailRes),
    detailTex = createDataTexture2D(det, detailRes, { aniso: maxAniso }),
    detailNormalTex = createDataTexture2D(nrm, detailRes, { aniso: maxAniso });

  try {
    if (typeof document !== "undefined" && document.fonts && document.fonts.load) {
      await Promise.race([
        document.fonts.load('900 40px "PingFang SC"'),
        new Promise((resolve) => setTimeout(resolve, 350)),
      ]);
    }
  } catch {}

  let decalsTex = buildGroundDecalsCanvas(isHighQuality ? 2048 : 1024, maxAniso),
    blackTex = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blackTex.needsUpdate = true;

  let textures = {
    mask: maskTex,
    detail: detailTex,
    detailN: detailNormalTex,
    marks: decalsTex,
    black: blackTex,
  };

  let groundRoot = new Group();
  groundRoot.name = "ground";

  let groundMatSystem = createGroundMaterial(engineCtx, textures),
    seaSystem = createSeaSystem(engineCtx, textures),
    rainSystem = createRainSystem(engineCtx, textures);

  groundRoot.add(
    groundMatSystem.mesh,
    seaSystem.mesh,
    seaSystem.skirt,
    rainSystem.rain,
    rainSystem.splash,
  );
  engineCtx.scene.add(groundRoot);

  let planarReflector = createPlanarReflector(engineCtx, groundMatSystem.uniforms, [
    groundMatSystem.mesh,
    seaSystem.mesh,
    rainSystem.rain,
    rainSystem.splash,
  ]);

  if (engineCtx.render && engineCtx.render.addPrePass) {
    engineCtx.render.addPrePass(planarReflector.pass);
  }

  const isInsideInterior = (wx, wz) => {
    let interiorBoxes = engineCtx.level && engineCtx.level.interiorBoxes;
    if (!interiorBoxes) return false;
    for (let i = 0; i < interiorBoxes.length; i++) {
      let b = interiorBoxes[i];
      if (b && b.min && wx > b.min.x && wx < b.max.x && wz > b.min.z && wz < b.max.z) return true;
    }
    return false;
  };

  const isInTerrainBounds = (wx, wz) =>
    wx > TERRAIN_BOUNDS.x0 &&
    wx < TERRAIN_BOUNDS.x0 + TERRAIN_BOUNDS.size &&
    wz > TERRAIN_BOUNDS.z0 &&
    wz < TERRAIN_BOUNDS.z0 + TERRAIN_BOUNDS.size;

  let elapsedSimTime = 0;

  const groundController = {
    root: groundRoot,
    apron: groundMatSystem.mesh,
    sea: seaSystem.mesh,
    rain: rainSystem.rain,
    planar: planarReflector,
    reflectionTarget: planarReflector.target,
    reflectionCamera: planarReflector.camera,
    maskTexture: maskTex,
    uniforms: groundMatSystem.uniforms,

    puddleDepth(wx, wz) {
      if (wx > SCENE_BOUNDS.quayX || !isInTerrainBounds(wx, wz) || isInsideInterior(wx, wz)) {
        return -0.2;
      }
      return 0.5 - sampleMacroMapBilinear(macroData, macroRes, wx, wz, 0);
    },

    isPuddle(wx, wz) {
      return groundController.puddleDepth(wx, wz) > 0.015;
    },

    wetnessAt(wx, wz) {
      if (wx > SCENE_BOUNDS.quayX) return 1;
      if (isInsideInterior(wx, wz)) return 0.12;
      if (!isInTerrainBounds(wx, wz)) return 0.6;

      let depth = 0.5 - sampleMacroMapBilinear(macroData, macroRes, wx, wz, 0);
      if (depth > 0.015) return 1;

      let edge0 = MathUtils.smoothstep(depth, -0.11, 0),
        edge1 = MathUtils.smoothstep(depth, -0.65, -0.02),
        dampness =
          1 -
          MathUtils.smoothstep(
            sampleMacroMapBilinear(macroData, macroRes, wx, wz, 1) + edge1 * 0.55,
            0.2,
            0.42,
          );
      return Math.min(0.95, 0.25 + (1 - dampness) * 0.4 + edge0 * 0.3);
    },

    seaHeight(wx, wz) {
      return sampleSeaWaveHeight(wx, wz, elapsedSimTime);
    },

    setRain(level) {
      rainSystem.setRain(level);
    },

    get rainLevel() {
      return rainSystem.rainLevel;
    },

    setReflections(enabled) {
      planarReflector.enabled = !!enabled;
    },

    update(dt) {
      elapsedSimTime += dt;
      rainSystem.update(dt);
      groundMatSystem.uniforms.uTime.value = elapsedSimTime;
      groundMatSystem.uniforms.uRain.value = rainSystem.rainLevel;
      seaSystem.uniforms.uTime.value = elapsedSimTime;
    },
  };

  return groundController;
}

/**
 * 资产展示场景 (Showcase Mode: Ground & Sea)
 * @param {import('./types').EngineContext} engineCtx
 */
export async function showcaseGround(engineCtx) {
  let existingPlane = engineCtx.scene.children.find(
    (obj) =>
      /** @type {any} */ (obj).isMesh &&
      /** @type {any} */ (obj).geometry &&
      /** @type {any} */ (obj).geometry.type === "PlaneGeometry" &&
      /** @type {any} */ (obj).geometry.parameters &&
      /** @type {any} */ (obj).geometry.parameters.width === 80,
  );
  if (existingPlane) {
    engineCtx.scene.remove(existingPlane);
  }
  engineCtx.ground = await createGroundSystem(engineCtx);

  let showcaseGroup = new Group(),
    addProp = (geom, mat, x, y, z, rotY = 0) => {
      let mesh = new Mesh(geom, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotY;
      mesh.castShadow = mesh.receiveShadow = true;
      showcaseGroup.add(mesh);
      return mesh;
    },
    getMat = (name) => engineCtx.mats.get(name);

  addProp(new BoxGeometry(6.06, 2.59, 2.44), getMat("paint_red"), 3, 1.295, -0.2);
  addProp(new BoxGeometry(6.06, 2.59, 2.44), getMat("paint_blue"), 9.4, 1.295, -0.2);
  addProp(new BoxGeometry(6.06, 2.59, 2.44), getMat("paint_teal"), 9.4, 3.885, -0.2);
  addProp(new BoxGeometry(12.19, 2.59, 2.44), getMat("paint_yellow"), 3, 1.295, 11.2);
  addProp(new BoxGeometry(6.06, 2.59, 2.44), getMat("paint_white"), 12.4, 1.295, 11.2);
  addProp(new BoxGeometry(1.1, 1.1, 1.1), getMat("paint_orange"), 5.6, 0.55, 4.7, 0.4);
  addProp(new CylinderGeometry(0.29, 0.29, 0.88, 20), getMat("plastic_blue"), 3.9, 0.44, 6.3);
  addProp(new CylinderGeometry(0.29, 0.29, 0.88, 20), getMat("steel_rust"), 4.6, 0.44, 6.6);
  addProp(new CylinderGeometry(0.06, 0.06, 5, 10), getMat("steel_galv"), 12.5, 2.5, 6.2);
  addProp(new BoxGeometry(0.08, 1.6, 0.08), engineCtx.mats.emissive(16726556, 6), 6.6, 0.82, 2.6);
  addProp(new BoxGeometry(0.08, 1.6, 0.08), engineCtx.mats.emissive(3524863, 5), 2.2, 0.82, 3.2);
  addProp(new BoxGeometry(2.4, 0.08, 0.06), engineCtx.mats.emissive(16773328, 6), 9.4, 2.2, 1.06);
  addProp(new BoxGeometry(0.3, 0.12, 0.3), engineCtx.mats.emissive(16760944, 12), 12.5, 5, 6.2);
  addProp(new BoxGeometry(0.06, 1.2, 0.06), engineCtx.mats.emissive(5832570, 5), 23, 0.62, 8.2);
  addProp(new BoxGeometry(1.2, 1.2, 1.2), getMat("steel_dark"), 22.4, 0.6, 9.6, 0.3);

  engineCtx.scene.add(showcaseGroup);
  return { cam: [-9, 1.65, 5.6], target: [14, 0.4, 5] };
}

// 统一导出与向后兼容别名
export const create = createGroundSystem;
export const showcase = showcaseGround;
export const GroundModule = {
  create: createGroundSystem,
  showcase: showcaseGround,
};
export { GroundModule as vv };

export {
  TERRAIN_BOUNDS,
  sampleGroundHeight,
  generateMacroMapData,
  sampleMacroMapBilinear,
  sampleSeaWaveHeight,
};

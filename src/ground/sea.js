// @ts-check
/**
 * @file src/ground/sea.js
 * @description Gerstner 复杂洋面波谱生成、渐变非均匀海面网格与海洋材质着色器
 */

import * as THREE from "three";
import { SCENE_BOUNDS, SUN_CONFIG, SKY_CONFIG } from "../constants.js";

const {
  Mesh,
  PlaneGeometry,
  BufferGeometry,
  BufferAttribute,
  MeshStandardMaterial,
  Sphere,
  Vector3,
  MathUtils,
} = THREE;

/**
 * 宏观 Gerstner 长波参数 [dirX, dirZ, wavelength, amplitude]
 */
export const GERSTNER_WAVES = [
  [-0.92, 0.39, 9.5, 0.06],
  [-0.75, -0.66, 5.7, 0.04],
  [-0.99, 0.12, 3.3, 0.026],
  [-0.5, 0.87, 2, 0.016],
];

/**
 * 微观波纹碎浪参数 [dirX, dirZ, wavelength, amplitude]
 */
export const RIPPLE_WAVES = [
  [-0.8, 0.6, 1.31, 0.02],
  [-0.95, -0.31, 0.83, 0.014],
  [-0.35, -0.94, 0.57, 0.01],
  [-0.6, 0.8, 0.39, 0.007],
  [-1, 0.05, 0.27, 0.005],
  [0.3, 0.95, 0.47, 0.006],
  [-0.86, -0.51, 0.21, 0.0035],
];

// 预计算波长波数与角频率 (k = 2*PI / lambda, omega = sqrt(g * k))
for (let wave of GERSTNER_WAVES.concat(RIPPLE_WAVES)) {
  let len = Math.hypot(wave[0], wave[1]);
  wave[0] /= len;
  wave[1] /= len;
  wave[4] = (2 * Math.PI) / wave[2];
  wave[5] = Math.sqrt(9.81 * wave[4]);
}

const formatFloat = (num) => (Number.isInteger(num) ? num.toFixed(1) : num.toFixed(5));

/**
 * 实时采样海浪表面高度
 * @param {number} x
 * @param {number} z
 * @param {number} time
 * @returns {number}
 */
export function sampleSeaWaveHeight(x, z, time) {
  let decay = 1 - MathUtils.smoothstep(Math.hypot(x - 30, z), 50, 220),
    waveY = 0;
  for (let w of GERSTNER_WAVES) {
    waveY += w[3] * Math.sin(w[4] * (w[0] * x + w[1] * z) - w[5] * time);
  }
  return SCENE_BOUNDS.seaY + waveY * decay;
}

const seaVertexDisplacementChunk = GERSTNER_WAVES.map(
  (w) =>
    `  { float ph = ${formatFloat(w[4])} * dot(vec2(${formatFloat(w[0])}, ${formatFloat(w[1])}), swp.xz) - ${formatFloat(w[5])} * uTime; sdisp.y += ${formatFloat(w[3])} * sin(ph); sdisp.xz += vec2(${formatFloat(w[0])}, ${formatFloat(w[1])}) * (${formatFloat(w[3] * 0.6)} * cos(ph)); }`,
).join("\n");

const seaSlopeAChunk = GERSTNER_WAVES.map(
  (w) =>
    `  slopeA += vec2(${formatFloat(w[0])}, ${formatFloat(w[1])}) * (${formatFloat(w[3] * w[4])} * cos(${formatFloat(w[4])} * dot(vec2(${formatFloat(w[0])}, ${formatFloat(w[1])}), sxz) - ${formatFloat(w[5])} * uTime));`,
).join("\n");

const seaSlopeBChunk = RIPPLE_WAVES.map(
  (w) =>
    `  slopeB += vec2(${formatFloat(w[0])}, ${formatFloat(w[1])}) * (${formatFloat(w[3] * w[4])} * cos(${formatFloat(w[4])} * dot(vec2(${formatFloat(w[0])}, ${formatFloat(w[1])}), sxz) - ${formatFloat(w[5])} * uTime));`,
).join("\n");

const seaCommonHeader = `
uniform float uTime; uniform sampler2D uDetail, uDetailN; uniform vec3 uHazeA, uHazeB, uSunDirW;
varying vec3 vGWorld; varying float vSAmp;
float gRough; vec2 gNxz; float gOcc; float gSDist; float gSpark;
`;

const seaFragmentChunk = `
{
  vec2 sxz = vGWorld.xz;
  float sd = length(cameraPosition - vGWorld); gSDist = sd;
  vec2 slopeA = vec2(0.0), slopeB = vec2(0.0);
${seaSlopeAChunk}
${seaSlopeBChunk}
  float nearB = 1.0 - smoothstep(25.0, 110.0, sd);
  vec2 t1 = texture2D(uDetailN, sxz * 0.113 + uTime * vec2(-0.021, 0.009)).ba - 0.5;
  vec2 t2 = texture2D(uDetailN, sxz * 0.031 + uTime * vec2(-0.007, -0.004)).ba - 0.5;
  vec2 t3 = texture2D(uDetailN, sxz.yx * 0.39 + uTime * vec2(0.031, -0.027)).ba - 0.5;
  gNxz = slopeA * vSAmp + slopeB * nearB + t1 * 0.2 + t2 * 0.24 + t3 * 0.1 * nearB;
  // foam / scum along the quay wall (x = 30) and around the moored hull x[33,49] z[-60,-9]
  float dq = sxz.x - 30.0;
  vec2 hq = abs(sxz - vec2(41.0, -34.5)) - vec2(4.0, 21.5);
  float dh = length(max(hq, 0.0)) + min(max(hq.x, hq.y), 0.0) - 4.0;
  float de = min(dq, dh);
  vec4 fn = texture2D(uDetail, sxz * 0.41 + uTime * vec2(-0.012, 0.007));
  vec4 fn2 = texture2D(uDetail, sxz * 0.093 + uTime * vec2(0.004, 0.003));
  float band = 1.0 - smoothstep(0.0, 0.2 + fn2.g * fn2.g * 2.2, de);
  float foam = clamp(band * smoothstep(0.5, 0.68, fn.a * 0.55 + fn.r * 0.25 + fn2.g * 0.3 + band * 0.2), 0.0, 1.0) * step(-0.3, de);
  float scum = (1.0 - smoothstep(0.0, 5.0, de)) * smoothstep(0.4, 0.7, fn2.g);
  vec3 alb = vec3(0.0045, 0.013, 0.017);
  alb = mix(alb, vec3(0.03, 0.04, 0.034), scum * 0.6);
  alb = mix(alb, vec3(0.3, 0.32, 0.3), foam * 0.7);
  diffuseColor.rgb *= alb;
  // wind structure: broad cat's-paw patches (ruffled, darker, duller) between calmer slicks, plus long swell shading
  vec4 fn3 = texture2D(uDetail, sxz * 0.0123 + uTime * vec2(0.0016, 0.0011));
  float gust = smoothstep(0.38, 0.62, fn2.g * 0.45 + fn3.g * 0.75 - 0.1);
  float swell = sin(dot(sxz, vec2(-0.118, 0.05)) - uTime * 0.55 + fn3.a * 5.0) * 0.5 + 0.5;
  gNxz = gNxz * mix(0.4, 1.35, gust) + vec2(-0.92, 0.39) * (swell - 0.5) * 0.07;
  gSpark = mix(0.55, 1.0, swell) * mix(1.0, 0.6, gust);
  diffuseColor.rgb *= mix(1.0, 0.6, gust);
  gRough = mix(mix(0.1, 0.32, smoothstep(12.0, 380.0, sd)) * mix(0.62, 1.5, gust), 0.65, max(foam, scum * 0.3));
  gNxz *= 1.0 - foam * 0.6;
  gOcc = mix(0.3, 1.0, smoothstep(0.0, 8.0, de)) * mix(0.8, 1.05, swell);
}
`;

const seaOpaqueFogChunk = `
{
  vec3 sdir = normalize(vGWorld - cameraPosition);
  float toSun = pow(max(dot(normalize(sdir.xz + vec2(1e-5)), normalize(uSunDirW.xz)), 0.0), 3.0);
  vec3 hz = mix(uHazeA, uHazeB, toSun);
  outgoingLight = mix(outgoingLight, hz, smoothstep(220.0, 860.0, gSDist) * 0.8);
}
`;

/**
 * 非均匀递增网格步长生成器
 */
export function generateGridSteps(start, end, initialStep, stepMultiplier, maxStep) {
  let steps = [start],
    current = start,
    stride = initialStep;
  while (current < end - 0.001) {
    current = Math.min(end, current + stride);
    steps.push(current);
    stride = Math.min(maxStep, stride * stepMultiplier);
  }
  return steps;
}

/**
 * 创建海洋网格、防波堤护坎以及洋面着色材质
 * @param {import('../types').EngineContext} engineCtx
 * @param {{ detail: THREE.DataTexture, detailN: THREE.DataTexture }} textures
 * @returns {{ mesh: THREE.Mesh, skirt: THREE.Mesh, uniforms: Record<string, { value: any }>, material: THREE.MeshStandardMaterial }}
 */
export function createSeaSystem(engineCtx, textures) {
  let seaLevelY = SCENE_BOUNDS.seaY,
    xSteps = generateGridSteps(27.5, 880, 0.75, 1.075, 120),
    zOuterSteps = generateGridSteps(48, 880, 0.9, 1.085, 120),
    zSteps = zOuterSteps
      .map((val) => -val)
      .reverse()
      .concat(generateGridSteps(-48 + 0.9, 48 - 0.9, 0.9, 1, 0.9), zOuterSteps.slice(0)),
    cols = xSteps.length,
    rows = zSteps.length,
    skirtVertices = 12,
    posArray = new Float32Array((cols * rows + skirtVertices) * 3),
    indexArray = /** @type {number[]} */ ([]),
    cursor = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      posArray[cursor++] = xSteps[c];
      posArray[cursor++] = seaLevelY;
      posArray[cursor++] = zSteps[r];
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      let idx0 = r * cols + c,
        idx1 = idx0 + 1,
        idx2 = idx0 + cols,
        idx3 = idx2 + 1;
      indexArray.push(idx0, idx2, idx1, idx1, idx2, idx3);
    }
  }

  const addQuadPatch = (x0, z0, x1, z1) => {
    let startVert = cursor / 3;
    for (let [px, pz] of [
      [x0, z0],
      [x1, z0],
      [x0, z1],
      [x1, z1],
    ]) {
      posArray[cursor++] = px;
      posArray[cursor++] = seaLevelY;
      posArray[cursor++] = pz;
    }
    indexArray.push(
      startVert,
      startVert + 2,
      startVert + 1,
      startVert + 1,
      startVert + 2,
      startVert + 3,
    );
  };

  addQuadPatch(-880, -880, 27.5, -158);
  addQuadPatch(-880, 158, 27.5, 880);
  addQuadPatch(-880, -158, -158, 158);

  let seaGeom = new BufferGeometry();
  seaGeom.setAttribute("position", new BufferAttribute(posArray, 3));
  let normalArray = new Float32Array(posArray.length);
  for (let i = 1; i < normalArray.length; i += 3) normalArray[i] = 1;
  seaGeom.setAttribute("normal", new BufferAttribute(normalArray, 3));
  seaGeom.setIndex(indexArray);
  seaGeom.boundingSphere = new Sphere(new Vector3(0, seaLevelY, 0), 1300);

  let hazeColorFar = SKY_CONFIG.horizonAway.clone().multiplyScalar(0.85),
    hazeColorNear = SKY_CONFIG.horizon.clone().multiplyScalar(0.8),
    seaUniforms = {
      uTime: { value: 0 },
      uDetail: { value: textures.detail },
      uDetailN: { value: textures.detailN },
      uHazeA: { value: hazeColorFar },
      uHazeB: { value: hazeColorNear },
      uSunDirW: { value: SUN_CONFIG.dir.clone() },
    };

  let seaMat = new MeshStandardMaterial({ color: 16777215, roughness: 0.1, metalness: 0 });
  seaMat.name = "sea";
  seaMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, seaUniforms);
    shader.vertexShader =
      `uniform float uTime; varying vec3 vGWorld; varying float vSAmp;\n` +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
  vec3 swp = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vSAmp = 1.0 - smoothstep(50.0, 220.0, distance(swp.xz, vec2(30.0, 0.0)));
  vec3 sdisp = vec3(0.0);
${seaVertexDisplacementChunk}
  transformed += sdisp * vSAmp;
  vGWorld = swp;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
${seaCommonHeader}`,
      )
      .replace("#include <map_fragment>", seaFragmentChunk)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = gRough;")
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
  normal = normalize(mat3(viewMatrix) * normalize(vec3(-gNxz.x, 1.0, -gNxz.y)));`,
      )
      .replace(
        "#include <lights_fragment_maps>",
        `#include <lights_fragment_maps>
  radiance *= gOcc; iblIrradiance *= gOcc;`,
      )
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
  { // sun glitter
    vec3 sv = normalize(vGWorld - cameraPosition);
    float az = max(dot(normalize(sv.xz + vec2(1e-5)), normalize(uSunDirW.xz)), 0.0);
    reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(40.0)) * gSpark * mix(0.3, 1.0, az * az * az);
  }`,
      )
      .replace(
        "#include <opaque_fragment>",
        `${seaOpaqueFogChunk}
#include <opaque_fragment>`,
      );
  };
  seaMat.customProgramCacheKey = () => "saltline-sea-1";

  let seaMesh = new Mesh(seaGeom, seaMat);
  seaMesh.name = "sea";
  seaMesh.receiveShadow = true;
  seaMesh.castShadow = false;
  seaMesh.frustumCulled = false;
  seaMesh.matrixAutoUpdate = false;

  let skirtMat = new MeshStandardMaterial({ color: 724238, roughness: 0.55, metalness: 0 }),
    skirtMesh = new Mesh(
      new PlaneGeometry(320, 4.4).rotateY(Math.PI / 2).translate(29.88, -2.18, 0),
      skirtMat,
    );
  skirtMesh.name = "quaySkirt";
  skirtMesh.receiveShadow = true;
  skirtMesh.matrixAutoUpdate = false;

  return {
    mesh: seaMesh,
    skirt: skirtMesh,
    uniforms: seaUniforms,
    material: seaMat,
  };
}

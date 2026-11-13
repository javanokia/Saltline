// @ts-check
/**
 * @file src/ground/rain.js
 * @description GPU 实例化雨丝飞线、屋檐水滴、水面水花与室内遮蔽系统
 */

import * as THREE from "three";
import { SUN_CONFIG, SKY_CONFIG } from "../constants.js";
import { TERRAIN_BOUNDS } from "./terrain.js";

const {
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  BufferAttribute,
  ShaderMaterial,
  Mesh,
  Sphere,
  Vector2,
  Vector3,
  Vector4,
  AdditiveBlending,
  DoubleSide,
} = THREE;

const rainCommonChunk = `
uniform vec3 uBoxMin[4]; uniform vec3 uBoxMax[4];
bool wInside(vec3 p){
  for (int i = 0; i < 4; i++) { if (all(greaterThan(p, uBoxMin[i])) && all(lessThan(p, uBoxMax[i]))) return true; }
  return false;
}
float wPhase(float c){ float g = 0.72; return (1.0 - g * g) / (12.566 * pow(1.0 + g * g - 2.0 * g * c, 1.5)); }
`;

const rainStreakVertexShader = `
uniform float uTime, uRain, uPix, uDrip; uniform vec3 uVel, uBox, uSunDir, uSunCol, uAmb;
attribute vec4 aSeed;
varying vec3 vCol; varying float vA; varying vec2 vUv;
${rainCommonChunk}
uniform vec4 uSky[8];   // roof openings (x, z, half w, half d): rain falls through these into the shed
bool wSky(vec3 p){
  for (int i = 0; i < 8; i++) { if (abs(p.x - uSky[i].x) < uSky[i].z && abs(p.z - uSky[i].y) < uSky[i].w) return true; }
  return false;
}
void main(){
  vUv = position.xy;
  float sp = 0.82 + 0.36 * aSeed.w;
  vec3 vel = uVel * sp;
  vec3 p; float len; float kill = 0.0;
  if (aSeed.w < 0.0) {                       // eave drip line (shed south eave), free-fall from 7 m
    float T = 1.19; float t = fract(uTime / T * (0.9 + 0.2 * aSeed.y) + aSeed.z) * T;
    p = vec3(mix(-16.0, 12.0, aSeed.x), 7.0 - 4.9 * t * t, -10.72 + 0.05 * sin(aSeed.x * 911.0));
    vel = vec3(0.0, -9.81 * t - 0.3, 0.0); len = 0.022 * length(vel) + 0.03;
    kill = 1.0 - uDrip;
    if (fract(aSeed.x * 37.7) > 0.55 + 0.45 * uRain) kill = 1.0;
  } else {
    p = aSeed.xyz * uBox + vel * uTime;
    p = mod(p - cameraPosition + 0.5 * uBox, uBox) - 0.5 * uBox + cameraPosition;
    len = 0.03 * length(vel);
    if (fract(aSeed.w * 7.13 + aSeed.x) > uRain) kill = 1.0;
    if (wInside(p) && !wSky(p)) kill = 1.0;
  }
  if (p.y < (p.x > 30.0 ? -1.6 : 0.0)) kill = 1.0;
  vec3 dir = normalize(vel);
  vec3 toP = p - cameraPosition; float dist = length(toP);
  vec3 side = normalize(cross(dir, toP));
  float w0 = 0.005 + 0.004 * fract(aSeed.w * 3.7);
  float w = max(w0, dist * uPix * 0.75);
  vec3 wp = p + dir * (len * (position.y - 0.5)) + side * (w * position.x);
  float a = (w0 / w) * smoothstep(0.7, 2.6, dist) * (1.0 - smoothstep(0.38, 0.5, dist / uBox.x));
  float c = dot(toP / max(dist, 1e-3), uSunDir);
  vCol = uAmb + uSunCol * wPhase(c);
  vA = a * (0.55 + 0.45 * fract(aSeed.w * 13.3));
  gl_Position = kill > 0.5 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const rainStreakFragmentShader = `
varying vec3 vCol; varying float vA; varying vec2 vUv;
void main(){
  float x = 1.0 - abs(vUv.x) * 2.0;
  float e = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
  gl_FragColor = vec4(vCol, vA * x * e);
}
`;

const splashVertexShader = `
uniform float uTime, uRain; uniform vec3 uSunDir, uSunCol, uAmb, uMaskRect; uniform sampler2D uMask;
attribute vec4 aSeed;
varying vec3 vCol; varying float vA; varying vec2 vUv; varying float vLife;
${rainCommonChunk}
vec2 sHash(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
void main(){
  vUv = position.xy;
  float period = 0.26 + 0.14 * aSeed.z;
  float tt = uTime / period + aSeed.w * 10.0; float cyc = floor(tt); float life = fract(tt);
  vec2 r = sHash(aSeed.xy * 91.7 + cyc * 0.371);
  vec2 rr = r - 0.5; rr *= 0.35 + 1.3 * abs(rr);                    // denser near the player
  vec2 snap = floor(cameraPosition.xz / 4.0) * 4.0;
  vec3 p = vec3(snap.x + rr.x * 30.0, 0.0, snap.y + rr.y * 30.0);
  float kill = 0.0;
  vec2 muv = (p.xz - uMaskRect.xy) * uMaskRect.z;
  float inM = step(0.0, muv.x) * step(muv.x, 1.0) * step(0.0, muv.y) * step(muv.y, 1.0);
  float pud = step(textureLod(uMask, muv, 0.0).r, 0.49) * inM;
  float k = fract(aSeed.w * 5.3 + cyc * 0.17);
  if (pud < 0.5 && k > 0.3) kill = 1.0;
  if (k > 0.2 + 0.8 * uRain) kill = 1.0;
  if (p.x > 29.7 || wInside(p + vec3(0.0, 0.2, 0.0))) kill = 1.0;
  float sz = mix(0.04, 0.08, aSeed.z) * mix(0.65, 1.0, pud);
  float wd = sz * (0.7 + 1.5 * life), ht = sz * (0.4 + 1.3 * sin(life * 3.14159));
  vec3 toP = p - cameraPosition; float dist = length(toP);
  vec3 side = normalize(vec3(toP.z, 0.0, -toP.x));
  vec3 wp = p + side * (wd * position.x * 2.0) + vec3(0.0, ht * position.y + 0.004, 0.0);
  float c = dot(toP / max(dist, 1e-3), uSunDir);
  vCol = uAmb * 1.4 + uSunCol * wPhase(c) * 0.8;
  vA = (1.0 - life) * (1.0 - smoothstep(11.0, 15.0, dist)) * mix(0.5, 1.0, pud);
  vLife = life;
  gl_Position = kill > 0.5 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const splashFragmentShader = `
varying vec3 vCol; varying float vA; varying vec2 vUv; varying float vLife;
void main(){
  float x = vUv.x * 2.0, y = vUv.y;
  // little crown: a rim arc that opens outward, plus a few thrown droplets
  float dome = smoothstep(1.0, 0.25, length(vec2(x * 1.15, y * 1.5)));
  float crown = dome * (0.35 + 0.65 * smoothstep(0.25, 0.75, length(vec2(x, y * 1.4))));
  float core = smoothstep(0.5, 0.0, length(vec2(x * 1.6, (y - 0.25) * 1.6))) * (1.0 - vLife);
  float dots = smoothstep(0.16, 0.05, length(vec2(abs(x) - 0.75, y - 0.82))) + smoothstep(0.14, 0.04, length(vec2(x - 0.2, y - 0.93)));
  float a = clamp(crown * 0.5 + core * 0.8 + dots * 0.0, 0.0, 1.0) * vA * 0.6;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vCol, a);
}
`;

/**
 * 创建雨丝实例化四边形几何体
 * @param {number} streakCount
 * @param {number} splashCount
 * @param {() => number} rng
 * @returns {THREE.InstancedBufferGeometry}
 */
export function createRainGeometry(streakCount, splashCount, rng) {
  let geom = new InstancedBufferGeometry();
  geom.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0]), 3),
  );
  geom.setIndex([0, 1, 2, 2, 1, 3]);

  let totalCount = streakCount + splashCount,
    seedArray = new Float32Array(totalCount * 4);
  for (let i = 0; i < totalCount * 4; i++) seedArray[i] = rng();
  for (let i = streakCount; i < totalCount; i++) seedArray[i * 4 + 3] = -1;

  geom.setAttribute("aSeed", new InstancedBufferAttribute(seedArray, 4));
  geom.instanceCount = totalCount;
  geom.boundingSphere = new Sphere(new Vector3(), 1e5);
  return geom;
}

/**
 * 创建动态降雨与水花模拟子系统
 * @param {import('../types').EngineContext} engineCtx
 * @param {{ mask: THREE.DataTexture }} textures
 * @returns {{ rain: THREE.Mesh, splash: THREE.Mesh, wind: THREE.Vector3, setRain: (w: number) => void, rainLevel: number, update: (dt: number) => void }}
 */
export function createRainSystem(engineCtx, textures) {
  let rng = engineCtx.rng && engineCtx.rng.fork ? engineCtx.rng.fork() : Math.random,
    rainQuality = Math.max(0.15, engineCtx.quality.rain || 0.5),
    streakCount = Math.round(9000 * rainQuality),
    dripCount = 260,
    splashCount = Math.round(900 * rainQuality),
    boxMins = [0, 1, 2, 3].map(() => new Vector3()),
    boxMaxs = [0, 1, 2, 3].map(() => new Vector3()),
    sunColorBoost = SUN_CONFIG.color.clone().multiplyScalar(1.9),
    ambientColor = SKY_CONFIG.fog.clone().multiplyScalar(0.15),
    rainUniformsCommon = {
      uTime: { value: 0 },
      uRain: { value: 0.6 },
      uBoxMin: { value: boxMins },
      uBoxMax: { value: boxMaxs },
      uSunDir: { value: SUN_CONFIG.dir.clone() },
      uSunCol: { value: sunColorBoost },
      uAmb: { value: ambientColor },
    };

  let skylightRects = [0, 1, 2, 3, 4, 5, 6, 7].map(() => new Vector4(0, 0, -1, -1)),
    streakUniforms = {
      ...rainUniformsCommon,
      uSky: { value: skylightRects },
      uPix: { value: 0.002 },
      uDrip: { value: 0 },
      uVel: { value: new Vector3(-2.6, -9.4, 1.1) },
      uBox: { value: new Vector3(26, 15, 26) },
    };

  let streakMat = new ShaderMaterial({
    uniforms: streakUniforms,
    vertexShader: rainStreakVertexShader,
    fragmentShader: rainStreakFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: false,
  });

  let streakMesh = new Mesh(createRainGeometry(streakCount, dripCount, rng), streakMat);
  streakMesh.frustumCulled = false;
  streakMesh.renderOrder = 900;
  streakMesh.name = "rain";
  streakMesh.matrixAutoUpdate = false;
  streakMesh.castShadow = streakMesh.receiveShadow = false;

  let splashUniforms = {
    ...rainUniformsCommon,
    uMask: { value: textures.mask },
    uMaskRect: {
      value: new Vector3(TERRAIN_BOUNDS.x0, TERRAIN_BOUNDS.z0, 1 / TERRAIN_BOUNDS.size),
    },
  };

  let splashMat = new ShaderMaterial({
    uniforms: splashUniforms,
    vertexShader: splashVertexShader,
    fragmentShader: splashFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: false,
  });

  let splashMesh = new Mesh(createRainGeometry(splashCount, 0, rng), splashMat);
  splashMesh.frustumCulled = false;
  splashMesh.renderOrder = 890;
  splashMesh.name = "rainSplash";
  splashMesh.matrixAutoUpdate = false;

  let currentRain = 0.6,
    targetRain = 0.6,
    thunderTimer = 22 + rng() * 25,
    elapsed = 0,
    resBuffer = new Vector2();

  return {
    rain: streakMesh,
    splash: splashMesh,
    wind: streakUniforms.uVel.value,
    setRain(level) {
      targetRain = Math.min(1, Math.max(0, level));
    },
    get rainLevel() {
      return currentRain;
    },
    update(dt) {
      elapsed += dt;
      currentRain += (targetRain - currentRain) * Math.min(1, dt * 0.8);
      rainUniformsCommon.uTime.value = elapsed;
      rainUniformsCommon.uRain.value = currentRain;
      streakMesh.visible = splashMesh.visible = currentRain > 0.01;

      let cam = engineCtx.camera;
      if (cam) {
        let renRes = engineCtx.render && engineCtx.render.resolution;
        if (renRes && renRes.x > 8) {
          resBuffer.copy(renRes);
        } else if (engineCtx.renderer) {
          engineCtx.renderer.getDrawingBufferSize(resBuffer);
        }
        let persp = /** @type {THREE.PerspectiveCamera} */ (cam);
        streakUniforms.uPix.value =
          (2 * Math.tan(((persp.fov || 60) * Math.PI) / 360)) / Math.max(1, resBuffer.y);
      }

      let interiorBoxes = (engineCtx.level && engineCtx.level.interiorBoxes) || [];
      for (let i = 0; i < 4; i++) {
        let box = interiorBoxes[i];
        if (box && box.min && box.max) {
          boxMins[i].set(box.min.x - 0.15, box.min.y - 1, box.min.z - 0.15);
          boxMaxs[i].set(box.max.x + 0.15, box.max.y + 0.3, box.max.z + 0.15);
        } else {
          boxMins[i].set(0, 0, 0);
          boxMaxs[i].set(0, 0, 0);
        }
      }
      streakUniforms.uDrip.value = interiorBoxes.length ? 1 : 0;

      let skylights = (engineCtx.level && engineCtx.level.skylights) || [];
      for (let i = 0; i < 8; i++) {
        let sky = skylights[i];
        if (sky && sky.w > 0) {
          skylightRects[i].set(sky.x, sky.z, sky.w * 0.5, (sky.d || sky.w) * 0.5);
        } else {
          skylightRects[i].set(0, 0, -1, -1);
        }
      }

      thunderTimer -= dt;
      if (thunderTimer <= 0) {
        thunderTimer = 30 + rng() * 30;
        if (engineCtx.events && engineCtx.events.emit) {
          engineCtx.events.emit("thunder", { intensity: 0.3 + 0.7 * rng() });
        }
      }
    },
  };
}

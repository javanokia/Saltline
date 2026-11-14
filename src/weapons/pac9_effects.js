// @ts-check
/**
 * @file src/weapons/pac9_effects.js
 * @description PAC-9 枪身激光刻字贴图、全息红点准直镜片、枪口焰 Shader 与微表面雨滴着色注入
 */

import * as THREE from "three";
import { SUN_CONFIG, SKY_CONFIG } from "../constants.js";

const MARKING_ATLAS_RECTS = {
  model: [8, 8, 330, 84],
  maker: [8, 100, 560, 40],
  cal: [8, 146, 560, 40],
  prop: [8, 192, 700, 40],
  safe: [8, 240, 90, 34],
  semi: [110, 240, 90, 34],
  auto: [212, 240, 90, 34],
  rack: [8, 290, 300, 110],
  warn: [330, 290, 420, 110],
  optic: [580, 8, 300, 60],
  light: [580, 76, 300, 60],
  dots: [320, 240, 60, 34],
  r2: [8, 420, 56, 40],
  r4: [72, 420, 56, 40],
  r6: [136, 420, 56, 40],
  r8: [200, 420, 56, 40],
  r10: [264, 420, 56, 40],
  r12: [328, 420, 56, 40],
};

const ATLAS_WIDTH = 1024;
const ATLAS_HEIGHT = 512;

function createMarkingsAtlasTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_WIDTH;
  canvas.height = ATLAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);
  ctx.textBaseline = "middle";

  const drawLabel = (key, text, font, color, align = "left") => {
    const [x, y, w, h] = MARKING_ATLAS_RECTS[key];
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = /** @type {CanvasTextAlign} */ (align);
    ctx.fillText(text, align === "left" ? x + 2 : x + w / 2, y + h / 2 + 1, w - 4);
  };

  const fontSans = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
  const fontMono = '"IBM Plex Mono", "Courier New", monospace';
  const fontDisplay = '"Big Shoulders Display", "Barlow Condensed", Impact, sans-serif';
  const inkSilver = "rgba(196,198,194,0.92)";

  drawLabel("model", "PAC-9", `700 78px ${fontDisplay}`, inkSilver);
  drawLabel("maker", "LONGSHORE ARMS WORKS  ·  SALTLINE", `600 30px ${fontSans}`, inkSilver);
  drawLabel("cal", "CAL 5.8×40   SN PA-004217", `500 27px ${fontMono}`, inkSilver);
  drawLabel(
    "prop",
    "PROPERTY OF PORT AUTHORITY — BERTH 4 ARMOURY",
    `600 28px ${fontSans}`,
    inkSilver,
  );
  drawLabel("safe", "S", `700 30px ${fontSans}`, inkSilver, "center");
  drawLabel("semi", "1", `700 30px ${fontSans}`, inkSilver, "center");
  drawLabel("auto", "A", `700 30px ${fontSans}`, "rgba(205,60,40,0.95)", "center");
  drawLabel("rack", "B4-07", `800 104px ${fontDisplay}`, "rgba(214,206,170,0.9)", "center");

  for (const railNum of [2, 4, 6, 8, 10, 12]) {
    drawLabel(
      "r" + railNum,
      "T" + railNum,
      `600 30px ${fontMono}`,
      "rgba(190,192,188,0.85)",
      "center",
    );
  }

  drawLabel("optic", "HX-2 REFLEX", `700 44px ${fontSans}`, inkSilver, "center");
  drawLabel("light", "900 LM  IPX8", `600 40px ${fontSans}`, inkSilver, "center");

  {
    const [wx, wy] = MARKING_ATLAS_RECTS.warn;
    ctx.fillStyle = inkSilver;
    ctx.textAlign = "left";
    ctx.font = `600 24px ${fontSans}`;
    [
      "WARNING — CLEAR CHAMBER BEFORE",
      "STOWAGE. AUTHORISED BREACH",
      "PERSONNEL ONLY. PA-REG 44/7",
    ].forEach((line, idx) => ctx.fillText(line, wx + 2, wy + 20 + idx * 34));
  }

  {
    const [dx, dy, , dh] = MARKING_ATLAS_RECTS.dots;
    ctx.fillStyle = inkSilver;
    ctx.beginPath();
    ctx.arc(dx + 12, dy + dh / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(205,60,40,0.95)";
    ctx.beginPath();
    ctx.arc(dx + 40, dy + dh / 2, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 划痕磨损做旧蒙版
  ctx.globalCompositeOperation = "destination-out";
  let seed = 7;
  const nextRand = () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.25 + nextRand() * 0.6})`;
    const sz = nextRand() < 0.9 ? 1 + nextRand() * 1.5 : 2 + nextRand() * 5;
    ctx.fillRect(nextRand() * ATLAS_WIDTH, nextRand() * ATLAS_HEIGHT, sz, sz * (0.4 + nextRand()));
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/**
 * 构建机匣表面铭文与导轨刻度贴花网格
 * @param {Array<[string, number, number, number, number, string, number?]>} placements
 */
export function createPac9MarkingsMesh(placements) {
  const positions = [];
  const uvs = [];
  const normals = [];
  const indices = [];

  for (const [key, cx, cy, cz, size, face, angle = 0] of placements) {
    const [rx, ry, rw, rh] = MARKING_ATLAS_RECTS[key];
    const width = (size * rw) / rh;
    const u0 = rx / ATLAS_WIDTH;
    const u1 = (rx + rw) / ATLAS_WIDTH;
    const v1 = 1 - ry / ATLAS_HEIGHT;
    const v0 = 1 - (ry + rh) / ATLAS_HEIGHT;
    const baseVert = positions.length / 3;

    let quad;
    if (face === "L") {
      quad = [
        [cx, cy - size / 2, -(cz + width / 2)],
        [cx, cy - size / 2, -(cz - width / 2)],
        [cx, cy + size / 2, -(cz - width / 2)],
        [cx, cy + size / 2, -(cz + width / 2)],
      ];
    } else if (face === "R") {
      quad = [
        [cx, cy - size / 2, -(cz - width / 2)],
        [cx, cy - size / 2, -(cz + width / 2)],
        [cx, cy + size / 2, -(cz + width / 2)],
        [cx, cy + size / 2, -(cz - width / 2)],
      ];
    } else {
      quad = [
        [cx - width / 2, cy, -(cz - size / 2)],
        [cx + width / 2, cy, -(cz - size / 2)],
        [cx + width / 2, cy, -(cz + size / 2)],
        [cx - width / 2, cy, -(cz + size / 2)],
      ];
    }

    if (angle) {
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const originY = cy;
      const originZ = -cz;
      for (const pt of quad) {
        const dy = pt[1] - originY;
        const dz = pt[2] - originZ;
        pt[1] = originY + dy * cosA - dz * sinA;
        pt[2] = originZ + dy * sinA + dz * cosA;
      }
    }

    for (const pt of quad) positions.push(pt[0], pt[1], pt[2]);
    uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);

    const nrm = face === "L" ? [-1, 0, 0] : face === "R" ? [1, 0, 0] : [0, 1, 0];
    for (let k = 0; k < 4; k++) normals.push(nrm[0], nrm[1], nrm[2]);
    indices.push(baseVert, baseVert + 1, baseVert + 2, baseVert, baseVert + 2, baseVert + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);

  const mat = new THREE.MeshStandardMaterial({
    map: createMarkingsAtlasTexture(),
    transparent: true,
    roughness: 0.62,
    metalness: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  return mesh;
}

/**
 * 构建 HX-2 全息红点反射瞄准镜镀膜物镜网格
 * @param {number[][]} windowPts
 * @param {number} lensZ
 */
export function createPac9SightDotMesh(windowPts, lensZ) {
  const shape = new THREE.Shape();
  windowPts.forEach((pt, idx) => (idx ? shape.lineTo(pt[0], pt[1]) : shape.moveTo(pt[0], pt[1])));
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape);
  geo.translate(0, 0, -lensZ);

  let minX = 1e9;
  let maxX = -1e9;
  let minY = 1e9;
  let maxY = -1e9;
  for (const pt of windowPts) {
    minX = Math.min(minX, pt[0]);
    maxX = Math.max(maxX, pt[0]);
    minY = Math.min(minY, pt[1]);
    maxY = Math.max(maxY, pt[1]);
  }
  const posAttr = geo.attributes.position;
  const uvAttr = geo.attributes.uv;
  for (let i = 0; i < posAttr.count; i++) {
    uvAttr.setXY(
      i,
      (posAttr.getX(i) - minX) / (maxX - minX),
      (posAttr.getY(i) - minY) / (maxY - minY),
    );
  }

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uBright: { value: 7 },
      uSun: { value: SUN_CONFIG.dir.clone() },
      uSunCol: { value: SUN_CONFIG.color.clone() },
      uZen: { value: SKY_CONFIG.zenith.clone() },
      uHor: { value: SKY_CONFIG.horizonAway.clone() },
      uTilt: { value: 0.1 },
    },
    vertexShader: `
      varying vec3 vView, vFwd, vRight, vUp, vWPos, vWN; varying vec2 vUv;
      uniform float uTilt;
      void main(){
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = mv.xyz;
        vFwd = (modelViewMatrix * vec4(0.0, 0.0, -1.0, 0.0)).xyz;
        vRight = (modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz;
        vUp = (modelViewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
        vWPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vWN = normalize(mat3(modelMatrix) * normalize(vec3(0.0, -uTilt, 1.0)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vView, vFwd, vRight, vUp, vWPos, vWN; varying vec2 vUv;
      uniform float uBright; uniform vec3 uSun, uSunCol, uZen, uHor;
      void main(){
        vec3 d = normalize(vView), fw = normalize(vFwd);
        float k = max(dot(d, fw), 1e-3);
        vec2 a = vec2(dot(d, normalize(vRight)), dot(d, normalize(vUp))) / k;
        float r = length(a), px = max(fwidth(r), 1e-5);
        float dotR = max(0.0011, px * 0.9), ringW = max(0.00045, px * 0.6);
        float dotI = 1.0 - smoothstep(dotR - px, dotR + px, r);
        float ring = 1.0 - smoothstep(ringW - px * 0.5, ringW + px, abs(r - 0.0128));
        float tick = (1.0 - smoothstep(0.0, px * 1.2 + 0.0004, min(abs(a.x), abs(a.y)))) * step(0.0128, r) * (1.0 - smoothstep(0.0165, 0.0175, r));
        float ret = clamp(dotI + ring * 0.8 + tick * 0.8, 0.0, 1.0);
        ret += 0.05 * exp(-r * r / 0.00002);
        vec3 retCol = vec3(1.0, 0.11, 0.045) * ret * uBright;
        vec3 wv = normalize(vWPos - cameraPosition); vec3 n = normalize(vWN); if (dot(n, wv) > 0.0) n = -n;
        vec3 rf = reflect(wv, n);
        float fres = pow(1.0 - abs(dot(wv, n)), 3.0);
        vec3 sky = mix(uHor, uZen, clamp(rf.y * 1.4 + 0.2, 0.0, 1.0));
        float sd = max(dot(rf, uSun), 0.0);
        sky += uSunCol * (pow(sd, 6.0) * 0.6 + pow(sd, 90.0) * 6.0);
        float band = smoothstep(0.25, 0.5, vUv.x * 0.6 + vUv.y) * (1.0 - smoothstep(0.62, 0.95, vUv.x * 0.6 + vUv.y));
        vec3 coat = mix(vec3(0.30, 0.50, 0.95), vec3(1.0, 0.62, 0.28), clamp(fres * 2.2 + vUv.y * 0.75 - 0.15, 0.0, 1.0));
        vec2 e = abs(vUv - 0.5) * 2.0; float edge = smoothstep(0.90, 1.0, max(e.x, e.y));
        float refl = 0.12 + 0.60 * fres + 0.07 * band;
        vec2 eg = (vUv - vec2(0.5, 0.16)) * vec2(1.0, 1.6);
        retCol += vec3(1.0, 0.10, 0.04) * 0.20 * exp(-dot(eg, eg) * 60.0) * (1.0 - smoothstep(0.985, 0.9995, k));
        vec3 col = (sky * 1.5 + vec3(0.03, 0.035, 0.045)) * coat * refl * (1.0 - edge) + retCol;
        float alpha = clamp(0.20 + 0.32 * fres + 0.05 * band + 0.6 * edge, 0.0, 0.94);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 5;
  return mesh;
}

/**
 * 构建多片交叉式动态枪口焰 Shader 网格
 */
export function createPac9MuzzleFlashMesh() {
  const positions = [];
  const uvs = [];
  const types = [];
  const indices = [];

  const pushQuad = (p0, p1, p2, p3, typeId) => {
    const base = positions.length / 3;
    for (const p of [p0, p1, p2, p3]) positions.push(p[0], p[1], p[2]);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    for (let k = 0; k < 4; k++) types.push(typeId);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  pushQuad(
    [-0.13, -0.13, -0.03],
    [0.13, -0.13, -0.03],
    [0.13, 0.13, -0.03],
    [-0.13, 0.13, -0.03],
    0,
  );
  pushQuad(
    [-0.13 * 0.7, -0.13 * 0.7, -0.09],
    [0.13 * 0.7, -0.13 * 0.7, -0.09],
    [0.13 * 0.7, 0.13 * 0.7, -0.09],
    [-0.13 * 0.7, 0.13 * 0.7, -0.09],
    0,
  );

  const jetHalfW = 0.065;
  const jetLen = 0.34;
  pushQuad(
    [-jetHalfW, 0, 0.01],
    [jetHalfW, 0, 0.01],
    [jetHalfW, 0, -jetLen],
    [-jetHalfW, 0, -jetLen],
    1,
  );
  pushQuad(
    [0, -jetHalfW, 0.01],
    [0, jetHalfW, 0.01],
    [0, jetHalfW, -jetLen],
    [0, -jetHalfW, -jetLen],
    1,
  );

  const sideSpan = 0.17;
  const sideThick = 0.05;
  const sideZ = 0.035;
  pushQuad(
    [-sideSpan, -sideThick, sideZ],
    [sideSpan, -sideThick, sideZ],
    [sideSpan, sideThick, sideZ],
    [-sideSpan, sideThick, sideZ],
    2,
  );
  pushQuad(
    [-sideSpan, 0, sideZ + sideThick],
    [sideSpan, 0, sideZ + sideThick],
    [sideSpan, 0, sideZ - sideThick],
    [-sideSpan, 0, sideZ - sideThick],
    2,
  );
  pushQuad(
    [-0.05, -0.05, -0.01],
    [0.05, -0.05, -0.01],
    [0.05, 0.05, -0.01],
    [-0.05, 0.05, -0.01],
    3,
  );
  pushQuad([-0.03, -0.03, 0.02], [0.03, -0.03, 0.02], [0.03, 0.03, 0.02], [-0.03, 0.03, 0.02], 4);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("aType", new THREE.Float32BufferAttribute(types, 1));
  geo.setIndex(indices);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uSeed: { value: 0 },
      uInt: { value: 0 },
      uHeat: { value: 0 },
      uJet: { value: 1 },
    },
    vertexShader: `attribute float aType; varying vec2 vUv; varying float vType;
      void main(){ vUv = uv; vType = aType; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; varying float vType; uniform float uSeed, uInt, uHeat, uJet;
      float h1(float n){ return fract(sin(n * 127.1 + uSeed * 311.7) * 43758.5453); }
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x); float I = 0.0; vec3 tintc = vec3(1.0, 0.50, 0.16);
        if (vType < 0.5) {
          float n1 = 3.0 + floor(h1(1.0) * 3.0), n2 = 5.0 + floor(h1(2.0) * 4.0);
          float pet = pow(abs(cos(a * n1 * 0.5 + h1(3.0) * 6.283)), 5.0) * (0.55 + 0.45 * h1(4.0));
          pet += pow(abs(cos(a * n2 * 0.5 + h1(5.0) * 6.283)), 14.0) * 0.55;
          float reach = 0.35 + 0.65 * pet;
          I = (0.25 + pet) * smoothstep(reach, reach * 0.15, r) * (0.75 + 0.25 * sin(r * 26.0 + h1(6.0) * 20.0));
        } else if (vType < 1.5) {
          float y = vUv.y, x = p.x * (1.0 + 0.5 * sin(y * 17.0 + h1(7.0) * 30.0) * y);
          float wdt = mix(0.20, 0.75, smoothstep(0.0, 0.35, y)) * (1.0 - y * 0.75);
          I = exp(-x * x / (wdt * wdt * 0.35)) * pow(1.0 - y, 1.4) * (0.7 + 0.3 * sin(y * 31.0 + h1(8.0) * 9.0)) * 0.9;
        } else if (vType < 2.5) {
          float u = abs(p.x), len = 0.55 + 0.45 * h1(9.0 + step(0.0, p.x));
          float wv = p.y * (1.0 + u * 3.0) + 0.12 * sin(u * 14.0 + h1(10.0) * 20.0) * u;
          I = exp(-wv * wv * 22.0) * smoothstep(len, 0.06, u) * smoothstep(0.02, 0.10, u) * 0.85 * uJet;
        } else if (vType < 3.5) {
          I = exp(-r * r * 5.0) * 2.4 * smoothstep(1.0, 0.6, r); tintc = vec3(1.0, 0.82, 0.58);
        } else {
          gl_FragColor = vec4(vec3(1.0, 0.28, 0.06) * exp(-r * r * 4.0) * smoothstep(1.0, 0.5, r) * uHeat, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          return;
        }
        vec3 col = mix(tintc, vec3(1.0, 0.90, 0.70), clamp(I * I * 0.7, 0.0, 1.0)) * I * uInt;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 10;
  mesh.frustumCulled = false;
  return mesh;
}

export const pac9RainUniform = { value: 1 };

const DETAIL_SHADER_COMMON = `
varying vec3 vObjP; varying vec3 vWNrm; varying vec3 vONrm; uniform float uKind; uniform float uRain;
float dh3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float dn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dh3(i), dh3(i + vec3(1,0,0)), f.x), mix(dh3(i + vec3(0,1,0)), dh3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(dh3(i + vec3(0,0,1)), dh3(i + vec3(1,0,1)), f.x), mix(dh3(i + vec3(0,1,1)), dh3(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec2 dh2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
vec2 dDrops(vec2 uv, float cell, float seed){ vec2 g = uv / cell, i = floor(g), f = fract(g); float best = 0.0;
  for (int a = -1; a <= 1; a++) for (int b = -1; b <= 1; b++) { vec2 o = vec2(float(a), float(b)); vec2 r = dh2(i + o + seed);
    float keep = step(0.70, fract(r.x * 7.31 + r.y * 3.17)); vec2 c = o + 0.2 + 0.6 * r; float rad = (0.16 + 0.22 * fract(r.x * 13.7)) * keep;
    float d = length(f - c); best = max(best, sqrt(max(rad * rad - d * d, 0.0))); }
  return vec2(best * cell, step(1e-6, best)); }
vec3 dBump(vec3 N, float h){ vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition); float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpdy, N), r2 = cross(N, dpdx); float det = dot(dpdx, r1); vec3 g = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * N - g); }
`;

const DETAIL_SHADER_ROUGHNESS = `
vec3 dP = vObjP; vec3 dAn = abs(vONrm);
vec2 dUV = (dAn.y > dAn.x && dAn.y > dAn.z) ? dP.xz : (dAn.x > dAn.z ? dP.zy : dP.xy);
float dSm = dn3(dP * 36.0), dSm2 = dn3(dP * 150.0 + 7.0), dFine = dn3(dP * 2400.0);
float dHt = 0.0, dR = 0.0;
if (uKind < 0.5) {
  float scuff = smoothstep(0.70, 0.9, dn3(dP * vec3(420.0, 420.0, 26.0) + 3.0));
  float smudge = smoothstep(0.55, 0.8, dn3(dP * 55.0 + 11.0));
  dR = (dSm - 0.5) * 0.20 + (dSm2 - 0.5) * 0.10 + (dFine - 0.5) * 0.08 + scuff * 0.18 - smudge * 0.12;
  dHt = dFine * 0.000010 - scuff * 0.000015;
} else if (uKind < 1.5) {
  float ring = sin(dP.z * 5200.0) * 0.5 + 0.5, streak = dn3(vec3(dP.z * 950.0, 1.0, 2.0));
  dR = (streak - 0.5) * 0.26 + (dSm - 0.5) * 0.14 + (dFine - 0.5) * 0.10;
  dHt = ring * 0.000014 + dFine * 0.000010;
} else {
  float st = dn3(dP * 1500.0) * 0.6 + dn3(dP * 3100.0 + 5.0) * 0.4;
  dR = (dSm - 0.5) * 0.18 + (st - 0.5) * 0.14 - smoothstep(0.6, 0.85, dSm2) * 0.10;
  dHt = st * 0.000075;
}
float dUp = smoothstep(0.30, 0.75, vWNrm.y) * uRain;
vec2 dD1 = dDrops(dUV, 0.0046, 3.0), dD2 = dDrops(dUV + 0.31, 0.0023, 9.0);
float dDrop = max(dD1.y, dD2.y) * dUp, dDropH = max(dD1.x, dD2.x) * dUp;
float dWet = dUp * (0.5 + 0.5 * smoothstep(0.3, 0.7, dSm));
roughnessFactor = clamp(roughnessFactor + dR, 0.10, 1.0);
roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.5, dWet);
roughnessFactor = mix(roughnessFactor, 0.10, dDrop);
diffuseColor.rgb *= 1.0 - 0.18 * dWet;
`;

const DETAIL_SHADER_NORMAL = `
normal = dBump(normal, dHt + dDropH * 0.32);
`;

/**
 * 为枪械材质注入微表面磨损、金属拉丝与雨滴湿润细节着色器
 * @param {THREE.MeshStandardMaterial} material
 * @param {number} kind 0=阳极氧化铝, 1=磷化碳钢, 2=聚合物工程塑料
 */
export function applyPac9ShaderDetails(material, kind) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uKind = { value: kind };
    shader.uniforms.uRain = pac9RainUniform;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vObjP; varying vec3 vWNrm; varying vec3 vONrm;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvObjP = position; vONrm = normal; vWNrm = normalize(mat3(modelMatrix) * normal);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + DETAIL_SHADER_COMMON)
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\n" + DETAIL_SHADER_ROUGHNESS,
      )
      .replace(
        "#include <normal_fragment_maps>",
        "#include <normal_fragment_maps>\n" + DETAIL_SHADER_NORMAL,
      );
  };
  material.customProgramCacheKey = () => "pac9-detail-" + kind;
  return material;
}

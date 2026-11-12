/**
 * ============================================================================
 * 3A-GAME Visual Effects Engine (fx.js)
 * 纯程序化视觉特效系统：GPU 实例化粒子、弹道曳光流、物理弹壳与破片、冲击弹孔贴花
 * ============================================================================
 * 
 * 核心架构：
 * 1. 程序化图集生成 (Procedural Texture Atlases)：
 *    - 烟雾翻页图集 (Smoke 4x2)：RG 通道法线，B 通道辐射发光核心，A 通道对流膨胀密度。
 *    - 火花图集 (Sparks 4x2)：光斑、速度拉伸线段、辐射星芒、水波涟漪、激光电浆、雨滴。
 *    - 冲击贴花图集 (Decals 4x2)：程序化金属弹孔、混凝土剥落、木材裂纹、烧焦灼痕、玻璃蛛网。
 * 
 * 2. 混合渲染管线 (Hybrid GPU Shaders)：
 *    - Depth-Aware Soft Particles：基于反向线性深度缓冲的软粒子交错羽化 (Soft Fade)。
 *    - Lit Smoke Shader：集成日光包裹散射 (Sun Wrap)、米氏前向强散射 (Mie Forward)、发光火焰核心与未压缩暗碳烟。
 *    - Additive Glow Shader：高动态范围火花与电弧发光叠加。
 * 
 * 3. 动力学子系统 (Dynamics Subsystems)：
 *    - ParticlePool (SoA 紧凑数组)：速度、加速度、重力阻尼、地面弹跳与消亡判定。
 *    - BulletTracerPool：基于相机夹角的超音速子弹曳光流带。
 *    - DebrisPhysicsSystem：具有自旋阻尼与地面接触弹跳的刚体破片模拟。
 *    - SpentShellEjectionSystem：随枪机后坐抛出的黄铜弹壳动力学。
 *    - ImpactDecalManager：多边形法线投影贴花与顶点颜色衰减。
 */

import * as THREE from 'three';
import { Mn as SUN_CONFIG, en as SKY_CONFIG } from './constants.js';
import { Wi as createBoxBevelGeometry } from './geo.js';

// ============================================================================
// 一、 物理常量与粒子标志位 (Constants & Particle Flags)
// ============================================================================

export const PARTICLE_FLAG_BOUNCE_FLOOR = 1; // 撞击地面弹跳 (Bounce on floor contact)
export const PARTICLE_FLAG_DIE_ON_FLOOR    = 2; // 接触地面消亡 (Despawn on floor contact)
export const PARTICLE_FLAG_STICK_FLOOR     = 4; // 接触地面停滞 (Stick on floor)

// 粒子朝向模式 (Particle Alignment Modes)
export const PARTICLE_MODE_BILLBOARD        = 0; // 面向相机的公告板
export const PARTICLE_MODE_VELOCITY_STRETCH = 1; // 沿速度方向拉伸的线带/流光
export const PARTICLE_MODE_SURFACE_ALIGNED  = 2; // 平行于碰撞表面的贴花/涟漪

// 图集网格划分 (Atlas Grid Layouts)
const SMOKE_ATLAS_COLS = 4;
const SMOKE_ATLAS_ROWS = 2;

const SPARKS_ATLAS_COLS = 4;
const SPARKS_ATLAS_ROWS = 2;

// 火花图集帧索引 (Sparks Frame Indices)
export const SPARK_FRAME_SOFT_DOT   = 0; // 柔和发光圆点
export const SPARK_FRAME_STREAK     = 1; // 速度拉伸线段
export const SPARK_FRAME_STARBURST1 = 2; // 多芒放射火花 1
export const SPARK_FRAME_STARBURST2 = 3; // 多芒放射火花 2
export const SPARK_FRAME_RIPPLE     = 4; // 水面同心涟漪
export const SPARK_FRAME_PLASMA     = 5; // 电浆激光光斑
export const SPARK_FRAME_DROPLET    = 6; // 雨滴与溅射微粒
export const SPARK_FRAME_TRACER_TIP = 7; // 曳光弹尖端辉光

// 贴花图集网格与贴图映射
const DECAL_ATLAS_COLS = 4;
const DECAL_ATLAS_ROWS = 2;

const DECAL_TYPE_FRAMES = {
  bullet_metal:    [0, 1], // 金属弹坑与火花刮痕
  bullet_concrete: [2, 3], // 混凝土粉碎性弹孔
  bullet_wood:     [4],    // 木质纤维碎裂孔
  scorch:          [5],    // 高温爆炸烧焦黑斑
  soot:            [6],    // 烟熏粉尘附着
  bullet_glass:    [7]     // 玻璃放射状碎纹
};

const DECAL_DEFAULT_SIZES = {
  bullet_metal: 0.18,
  bullet_concrete: 0.28,
  bullet_wood: 0.22,
  scorch: 1.8,
  soot: 0.45,
  bullet_glass: 0.35
};

// 全局临时计算缓存 (Scratch Vectors & Matrices)
const vTempPos = new THREE.Vector3();
const vTempDir = new THREE.Vector3();
const vTempNorm = new THREE.Vector3();
const vTempCamPos = new THREE.Vector3();
const vTempAim = new THREE.Vector3();
const vTempReflect = new THREE.Vector3();
const vTempPoint = new THREE.Vector3();
const vTempOffset = new THREE.Vector3();
const vDrawSize = new THREE.Vector2();
const mTempMatrix = new THREE.Matrix4();
const qTempQuat = new THREE.Quaternion();
const eTempEuler = new THREE.Euler();
const cTempColor = new THREE.Color();
const aTempColorArr = [1, 1, 1];

const UP_VECTOR = new THREE.Vector3(0, 1, 0);
const DOWN_VECTOR = new THREE.Vector3(0, -1, 0);

// 平滑插值 (Smoothstep helper)
function smoothstep(edge0, edge1, x) {
  let t = (x - edge0) / (edge1 - edge0);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}

// 范围随机数
function randomRange(min, max) {
  return min + (max - min) * Math.random();
}

// ============================================================================
// 二、 伪随机噪声与程序化图集生成器 (Procedural Atlases)
// ============================================================================

/**
 * 快速 64x64 伪随机噪声与 FBM 生成器
 */
export function createNoiseGenerator(seed = 1337) {
  const table = new Float32Array(4096);
  let s = seed >>> 0;
  
  const rnd = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = 0; i < 4096; i++) {
    table[i] = rnd();
  }

  const noise = (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    let fx = x - ix;
    let fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);

    const x0 = ix & 63;
    const x1 = (ix + 1) & 63;
    const y0 = (iy & 63) * 64;
    const y1 = ((iy + 1) & 63) * 64;

    const n00 = table[y0 + x0];
    const n10 = table[y0 + x1];
    const n01 = table[y1 + x0];
    const n11 = table[y1 + x1];

    return n00 + (n10 - n00) * fx + (n01 - n00 + (n00 - n10 - n01 + n11) * fx) * fy;
  };

  const fbm = (x, y, octaves = 4) => {
    let sum = 0;
    let amp = 0.5;
    let maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
      sum += noise(x, y) * amp;
      maxAmp += amp;
      x = x * 2.03 + 17.1;
      y = y * 2.03 + 9.7;
      amp *= 0.5;
    }
    return sum / maxAmp;
  };

  return { noise, fbm, rnd };
}

/**
 * 生成 4x2 程序化烟雾翻页图集 (Procedural Smoke & Fire Flipbook Atlas)
 * RG: 法线贴图 (Billow Normal)
 * B:  高热发光核心 (Core Emissivity)
 * A:  烟团密度衰减 (Smoke Density)
 */
export function generateSmokeAtlas(frameSize = 128) {
  const atlasWidth = frameSize * SMOKE_ATLAS_COLS;
  const atlasHeight = frameSize * SMOKE_ATLAS_ROWS;
  const pixelData = new Uint8Array(atlasWidth * atlasHeight * 4);
  const noiseGen = createNoiseGenerator(9173);

  const bufNormalX = new Float32Array(frameSize * frameSize);
  const bufNormalY = new Float32Array(frameSize * frameSize);
  const bufDensity = new Float32Array(frameSize * frameSize);

  for (let frame = 0; frame < SMOKE_ATLAS_COLS * SMOKE_ATLAS_ROWS; frame++) {
    const colIdx = frame % SMOKE_ATLAS_COLS;
    const rowIdx = Math.floor(frame / SMOKE_ATLAS_COLS);
    const offsetX = frame * 13.37 + 3.1;
    const offsetY = frame * 7.77 + 1.3;

    for (let py = 0; py < frameSize; py++) {
      for (let px = 0; px < frameSize; px++) {
        const u = (px + 0.5) / frameSize * 2 - 1;
        const v = (py + 0.5) / frameSize * 2 - 1;
        const edgeFade = 1 - smoothstep(0.78, 0.98, Math.max(Math.abs(u), Math.abs(v)));
        let alphaVal, coreVal, densityVal;

        if (frame === 6) {
          // 向上对流火舌形态 (Convective flame lobe)
          const vy = v * 0.5 + 0.5;
          const lobeWidth = 0.16 + 0.5 * vy * vy;
          const wobble = (noiseGen.fbm(u * 2 + offsetX, vy * 2 + offsetY, 3) - 0.5) * 0.25;
          const horizFade = 1 - smoothstep(lobeWidth * 0.3, lobeWidth, Math.abs(u + wobble * vy));
          const fbmDetail = noiseGen.fbm(u * 9 + offsetX, vy * 2.2 + offsetY, 4);
          const vertFade = 1 - smoothstep(0.55, 0.95, vy - (noiseGen.noise(u * 6 + offsetX, 3.3) - 0.5) * 0.35);
          const baseCut = smoothstep(0, 0.12, vy);
          alphaVal = horizFade * vertFade * baseCut * smoothstep(0.22, 0.7, fbmDetail + 0.25 * (1 - vy));
          coreVal = horizFade * vertFade;
          densityVal = alphaVal * 0.5;
        } else {
          // 典型翻滚膨胀烟团 (Puffy billowing cloud)
          const isLobe7 = (frame === 7);
          const curlScale = isLobe7 ? 0.3 : 0.6;
          const curlX = (noiseGen.fbm(u * 1.4 + offsetX, v * 1.4 + offsetY, 3) - 0.5) * curlScale;
          const curlY = (noiseGen.fbm(u * 1.4 + offsetY + 5.2, v * 1.4 + offsetX + 1.7, 3) - 0.5) * curlScale;
          const distU = u + curlX;
          const distV = v + curlY;
          const distR = Math.sqrt(distU * distU + distV * distV);
          const warp = (noiseGen.fbm(distU * 2.2 + offsetX, distV * 2.2 + offsetY, 3) - 0.5) * 0.6;
          const radialFalloff = 1 - smoothstep(0, isLobe7 ? 0.84 : 0.8, distR + warp);
          const microNoise = noiseGen.fbm(distU * 4.2 + offsetX * 2, distV * 4.2 + offsetY * 2, 4);
          alphaVal = radialFalloff * smoothstep(0.18, 0.65, microNoise + 0.2 * (1 - distR));
          coreVal = Math.max(0, 1 - distR * 1.4);
          densityVal = alphaVal;
        }

        const pixelIdx = py * frameSize + px;
        bufDensity[pixelIdx] = Math.max(0, Math.min(1, alphaVal * edgeFade));
        bufNormalX[pixelIdx] = densityVal;
        bufNormalY[pixelIdx] = coreVal * edgeFade;
      }
    }

    // 从密度梯度计算表面法线 (Sobel-like normal gradient from density)
    for (let py = 0; py < frameSize; py++) {
      for (let px = 0; px < frameSize; px++) {
        const xPrev = Math.max(0, px - 1);
        const xNext = Math.min(frameSize - 1, px + 1);
        const yPrev = Math.max(0, py - 1);
        const yNext = Math.min(frameSize - 1, py + 1);

        const dX = (bufDensity[py * frameSize + xNext] - bufDensity[py * frameSize + xPrev]) * 3.5;
        const dY = (bufDensity[yNext * frameSize + px] - bufDensity[yPrev * frameSize + px]) * 3.5;
        const pIndex = py * frameSize + px;

        const outX = colIdx * frameSize + px;
        const outY = rowIdx * frameSize + py;
        const outOffset = (outY * atlasWidth + outX) * 4;

        pixelData[outOffset]     = Math.min(255, Math.max(0, (0.5 - dX * 0.5) * 255));
        pixelData[outOffset + 1] = Math.min(255, Math.max(0, (0.5 - dY * 0.5) * 255));
        pixelData[outOffset + 2] = Math.min(255, bufNormalY[pIndex] * 255);
        pixelData[outOffset + 3] = Math.min(255, bufDensity[pIndex] * 255);
      }
    }
  }

  const texture = new THREE.DataTexture(pixelData, atlasWidth, atlasHeight, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 生成 4x2 火花图集 (Procedural Sparks Atlas)
 */
export function generateSparksAtlas(frameSize = 128) {
  const atlasWidth = frameSize * SPARKS_ATLAS_COLS;
  const atlasHeight = frameSize * SPARKS_ATLAS_ROWS;
  const pixelData = new Uint8Array(atlasWidth * atlasHeight * 4);
  const noiseGen = createNoiseGenerator(4441);

  // 预生成放射星芒的尖刺角度与长度
  const starBursts = [0, 1].map(() => {
    const rayCount = 7 + Math.floor(noiseGen.rnd() * 4);
    const rays = [];
    for (let i = 0; i < rayCount; i++) {
      rays.push({
        angle: (i / rayCount + (noiseGen.rnd() - 0.5) * 0.12) * Math.PI * 2,
        length: 0.35 + noiseGen.rnd() * 0.6,
        width: 0.018 + noiseGen.rnd() * 0.05,
        intensity: 0.5 + noiseGen.rnd() * 0.5
      });
    }
    return rays;
  });

  for (let frame = 0; frame < 8; frame++) {
    const colIdx = frame % SPARKS_ATLAS_COLS;
    const rowIdx = Math.floor(frame / SPARKS_ATLAS_COLS);

    for (let py = 0; py < frameSize; py++) {
      for (let px = 0; px < frameSize; px++) {
        const u = (px + 0.5) / frameSize * 2 - 1;
        const v = (py + 0.5) / frameSize * 2 - 1;
        const dist = Math.sqrt(u * u + v * v);
        const edgeFade = 1 - smoothstep(0.86, 0.99, Math.max(Math.abs(u), Math.abs(v)));
        let brightness = 0;

        if (frame === SPARK_FRAME_SOFT_DOT) {
          const core = Math.max(0, 1 - dist);
          brightness = core * core * core * 0.75 + Math.exp(-dist * dist * 22) * 0.5;
        } else if (frame === SPARK_FRAME_STREAK) {
          const streakFalloff = Math.pow(Math.max(0, 1 - u * u), 1.5);
          brightness = Math.exp(-(v * v) / (0.42 * 0.42)) * streakFalloff;
        } else if (frame === SPARK_FRAME_STARBURST1 || frame === SPARK_FRAME_STARBURST2) {
          const rays = starBursts[frame - SPARK_FRAME_STARBURST1];
          const angle = Math.atan2(v, u);
          for (const ray of rays) {
            let dAngle = Math.abs(angle - ray.angle) % (Math.PI * 2);
            if (dAngle > Math.PI) dAngle = Math.PI * 2 - dAngle;
            const perpDist = Math.sin(Math.min(dAngle, 1.5)) * dist;
            if (dAngle < 1.5) {
              brightness += ray.intensity * Math.exp(-(perpDist * perpDist) / (ray.width * ray.width)) * Math.max(0, 1 - dist / ray.length);
            }
          }
          brightness += Math.exp(-dist * dist * 32) * 1.5;
        } else if (frame === SPARK_FRAME_RIPPLE) {
          const rippleRadius = 0.55;
          const ringDist = Math.abs(dist - rippleRadius);
          brightness = Math.exp(-(ringDist * ringDist) / (0.07 * 0.07)) * (1 - dist);
        } else if (frame === SPARK_FRAME_PLASMA) {
          const wobble = noiseGen.fbm(u * 5, v * 5, 2) * 0.15;
          brightness = Math.exp(-Math.pow(dist + wobble, 2) * 16) * 1.2;
        } else if (frame === SPARK_FRAME_DROPLET) {
          const droplet = Math.exp(-dist * dist * 40) + Math.exp(-Math.pow(Math.abs(v - 0.2), 2) * 20) * Math.max(0, 1 - u * u * 4);
          brightness = droplet * 0.8;
        } else {
          // SPARK_FRAME_TRACER_TIP
          const beam = Math.exp(-(v * v) / 0.05) * Math.exp(-Math.max(0, -u) * 3);
          brightness = beam * Math.max(0, 1 - dist);
        }

        const outX = colIdx * frameSize + px;
        const outY = rowIdx * frameSize + py;
        const outOffset = (outY * atlasWidth + outX) * 4;
        const clampedVal = Math.min(255, Math.max(0, brightness * edgeFade * 255));

        pixelData[outOffset]     = clampedVal;
        pixelData[outOffset + 1] = clampedVal;
        pixelData[outOffset + 2] = clampedVal;
        pixelData[outOffset + 3] = 255;
      }
    }
  }

  const texture = new THREE.DataTexture(pixelData, atlasWidth, atlasHeight, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 生成 4x2 冲击弹孔贴花图集 (Procedural Decal Atlas via HTML5 Canvas)
 */
export function generateDecalsAtlas(frameSize = 256) {
  const atlasWidth = frameSize * DECAL_ATLAS_COLS;
  const atlasHeight = frameSize * DECAL_ATLAS_ROWS;

  const canvasAlbedo = document.createElement('canvas');
  canvasAlbedo.width = atlasWidth;
  canvasAlbedo.height = atlasHeight;
  const ctxAlbedo = canvasAlbedo.getContext('2d');

  const canvasORM = document.createElement('canvas');
  canvasORM.width = atlasWidth;
  canvasORM.height = atlasHeight;
  const ctxORM = canvasORM.getContext('2d');

  const canvasNorm = document.createElement('canvas');
  canvasNorm.width = atlasWidth;
  canvasNorm.height = atlasHeight;
  const ctxNorm = canvasNorm.getContext('2d');

  // 背景初始化
  ctxAlbedo.clearRect(0, 0, atlasWidth, atlasHeight);
  ctxORM.fillStyle = 'rgb(0, 235, 0)'; // Roughness = 0.92, Metalness = 0
  ctxORM.fillRect(0, 0, atlasWidth, atlasHeight);
  ctxNorm.fillStyle = 'rgb(128, 128, 255)'; // Normal facing out +Z
  ctxNorm.fillRect(0, 0, atlasWidth, atlasHeight);

  const noiseGen = createNoiseGenerator(77123);
  const rnd = noiseGen.rnd;

  for (let frame = 0; frame < 8; frame++) {
    const colIdx = frame % DECAL_ATLAS_COLS;
    const rowIdx = Math.floor(frame / DECAL_ATLAS_COLS);
    const cx = colIdx * frameSize + frameSize * 0.5;
    const cy = rowIdx * frameSize + frameSize * 0.5;

    ctxAlbedo.save();
    ctxORM.save();
    ctxNorm.save();
    ctxAlbedo.translate(cx, cy);
    ctxORM.translate(cx, cy);
    ctxNorm.translate(cx, cy);

    const radius = frameSize * 0.35;

    if (frame === 0 || frame === 1) {
      // 金属弹孔 (Metal Bullet Impact: dark punched hole, scorched ring, silver rim)
      const grad = ctxAlbedo.createRadialGradient(0, 0, radius * 0.05, 0, 0, radius);
      grad.addColorStop(0, 'rgba(10, 10, 12, 1)');
      grad.addColorStop(0.2, 'rgba(30, 32, 36, 0.95)');
      grad.addColorStop(0.35, 'rgba(180, 190, 205, 0.8)');
      grad.addColorStop(0.65, 'rgba(40, 35, 30, 0.4)');
      grad.addColorStop(1, 'rgba(20, 20, 20, 0)');
      ctxAlbedo.fillStyle = grad;
      ctxAlbedo.beginPath();
      ctxAlbedo.arc(0, 0, radius, 0, Math.PI * 2);
      ctxAlbedo.fill();

      // ORM: 金属剥落高反光边缘
      const gradORM = ctxORM.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 0.5);
      gradORM.addColorStop(0, 'rgb(0, 180, 128)');
      gradORM.addColorStop(1, 'rgb(0, 240, 0)');
      ctxORM.fillStyle = gradORM;
      ctxORM.beginPath();
      ctxORM.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
      ctxORM.fill();
    } else if (frame === 2 || frame === 3) {
      // 混凝土爆裂坑 (Concrete Spall: jagged crater, pulverized white dust center)
      ctxAlbedo.fillStyle = 'rgba(20, 20, 20, 0.95)';
      ctxAlbedo.beginPath();
      const points = 16;
      for (let p = 0; p < points; p++) {
        const ang = (p / points) * Math.PI * 2;
        const r = radius * (0.6 + (rnd() - 0.5) * 0.4);
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        p === 0 ? ctxAlbedo.moveTo(x, y) : ctxAlbedo.lineTo(x, y);
      }
      ctxAlbedo.closePath();
      ctxAlbedo.fill();

      // 边缘飞溅粉尘晕
      const dustGrad = ctxAlbedo.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
      dustGrad.addColorStop(0, 'rgba(180, 175, 170, 0.6)');
      dustGrad.addColorStop(0.5, 'rgba(120, 115, 110, 0.3)');
      dustGrad.addColorStop(1, 'rgba(90, 85, 80, 0)');
      ctxAlbedo.fillStyle = dustGrad;
      ctxAlbedo.beginPath();
      ctxAlbedo.arc(0, 0, radius, 0, Math.PI * 2);
      ctxAlbedo.fill();
    } else if (frame === 4) {
      // 木材撕裂孔 (Wood splintered hole: elliptical grain fracture)
      ctxAlbedo.fillStyle = 'rgba(15, 10, 5, 0.95)';
      ctxAlbedo.beginPath();
      ctxAlbedo.ellipse(0, 0, radius * 0.25, radius * 0.65, 0, 0, Math.PI * 2);
      ctxAlbedo.fill();

      const woodGrad = ctxAlbedo.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 0.8);
      woodGrad.addColorStop(0, 'rgba(60, 40, 20, 0.7)');
      woodGrad.addColorStop(1, 'rgba(40, 25, 10, 0)');
      ctxAlbedo.fillStyle = woodGrad;
      ctxAlbedo.beginPath();
      ctxAlbedo.ellipse(0, 0, radius * 0.5, radius * 0.9, 0, 0, Math.PI * 2);
      ctxAlbedo.fill();
    } else if (frame === 5) {
      // 高温烧焦灼斑 (Explosion Scorch: soft feathered black burn)
      const burnGrad = ctxAlbedo.createRadialGradient(0, 0, 0, 0, 0, radius * 0.95);
      burnGrad.addColorStop(0, 'rgba(5, 5, 5, 0.92)');
      burnGrad.addColorStop(0.4, 'rgba(18, 16, 14, 0.7)');
      burnGrad.addColorStop(0.75, 'rgba(35, 30, 25, 0.25)');
      burnGrad.addColorStop(1, 'rgba(20, 18, 16, 0)');
      ctxAlbedo.fillStyle = burnGrad;
      ctxAlbedo.beginPath();
      ctxAlbedo.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
      ctxAlbedo.fill();
    } else if (frame === 6) {
      // 细颗粒烟粉附着 (Soot soot-puff)
      const sootGrad = ctxAlbedo.createRadialGradient(0, 0, 0, 0, 0, radius * 0.85);
      sootGrad.addColorStop(0, 'rgba(25, 25, 27, 0.85)');
      sootGrad.addColorStop(0.5, 'rgba(35, 35, 38, 0.35)');
      sootGrad.addColorStop(1, 'rgba(30, 30, 32, 0)');
      ctxAlbedo.fillStyle = sootGrad;
      ctxAlbedo.beginPath();
      ctxAlbedo.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
      ctxAlbedo.fill();
    } else {
      // 玻璃蛛网放射纹 (Glass Bullet Spider Fracture)
      ctxAlbedo.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctxAlbedo.beginPath();
      ctxAlbedo.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
      ctxAlbedo.fill();

      ctxAlbedo.strokeStyle = 'rgba(220, 235, 255, 0.65)';
      ctxAlbedo.lineWidth = 1.5;
      const glassCracks = 12;
      for (let g = 0; g < glassCracks; g++) {
        const ang = (g / glassCracks) * Math.PI * 2 + (rnd() - 0.5) * 0.2;
        ctxAlbedo.beginPath();
        ctxAlbedo.moveTo(0, 0);
        let currR = radius * 0.2;
        while (currR < radius * 0.9) {
          currR += radius * (0.15 + rnd() * 0.2);
          const px = Math.cos(ang + (rnd() - 0.5) * 0.25) * currR;
          const py = Math.sin(ang + (rnd() - 0.5) * 0.25) * currR;
          ctxAlbedo.lineTo(px, py);
        }
        ctxAlbedo.stroke();
      }
    }

    ctxAlbedo.restore();
    ctxORM.restore();
    ctxNorm.restore();
  }

  const texAlbedo = new THREE.CanvasTexture(canvasAlbedo);
  texAlbedo.colorSpace = THREE.SRGBColorSpace;
  texAlbedo.generateMipmaps = true;

  const texORM = new THREE.CanvasTexture(canvasORM);
  texORM.colorSpace = THREE.NoColorSpace;
  texORM.generateMipmaps = true;

  const texNorm = new THREE.CanvasTexture(canvasNorm);
  texNorm.colorSpace = THREE.NoColorSpace;
  texNorm.generateMipmaps = true;

  return {
    map: texAlbedo,
    orm: texORM,
    nrm: texNorm,
    cols: DECAL_ATLAS_COLS,
    rows: DECAL_ATLAS_ROWS,
    uv(frameIdx) {
      const u0 = (frameIdx % DECAL_ATLAS_COLS) / DECAL_ATLAS_COLS;
      const v0 = 1 - (Math.floor(frameIdx / DECAL_ATLAS_COLS) + 1) / DECAL_ATLAS_ROWS;
      const du = 1 / DECAL_ATLAS_COLS;
      const dv = 1 / DECAL_ATLAS_ROWS;
      return [u0, v0, u0 + du, v0 + dv];
    }
  };
}

// ============================================================================
// 三、 GPU 着色器程序 (Shaders)
// ============================================================================

/**
 * 软粒子交错淡出 GLSL 代码片段 (Linear Soft Depth Fade)
 */
export const GLSL_SOFT_FADE = `
uniform sampler2D uTex;
uniform sampler2D uDepth;
uniform vec2 uRes;
uniform vec2 uNearFar;
uniform float uSoft;
varying vec2 vUv;
varying vec4 vCol;
varying vec3 vOff;
varying vec3 vToCam;
varying vec3 vInfo;     // x: view-space Z, y: particle age, z: shade/misc
varying float vSoftD;
varying vec3 vT;
varying vec3 vB;

float softFade() {
  float s = 1.0;
  if (uSoft > 0.5) {
    float d = texture2D(uDepth, gl_FragCoord.xy / uRes).x;
    float zs = (uNearFar.x * uNearFar.y) / ((uNearFar.y - uNearFar.x) * d - uNearFar.y);
    s = clamp((vInfo.x - zs) / vSoftD, 0.0, 1.0);
  }
  return s;
}
`;

/**
 * 粒子实例化顶点着色器 (Instanced Particle Vertex Shader)
 */
export const FX_VERTEX_SHADER = `
attribute vec4 aPos;    // xyz: 中心坐标, w: 粒子尺寸 (米)
attribute vec4 aAxis;   // mode 1: 速度拉伸轴向量; mode 2: 碰撞表面法线; w: 旋转角 roll (弧度)
attribute vec4 aCol;    // rgb: HDR 基础发光/漫反射颜色, a: 粒子不透明度
attribute vec4 aMisc;   // x: 图集帧索引, y: 朝向模式, z: 归一化寿命 (0..1), w: 日照可视度/发光权重
uniform vec2 uAtlas;    // vec2(cols, rows)
uniform float uPx;      // 距离 1 处的像素世界空间尺寸 (用于亚像素防闪烁夹紧)

varying vec2 vUv;
varying vec4 vCol;
varying vec3 vOff;
varying vec3 vToCam;
varying vec3 vInfo;
varying float vSoftD;
varying vec3 vT;
varying vec3 vB;

void main() {
  vec2 c = position.xy;
  vec3 center = aPos.xyz;
  float size = aPos.w;
  float mode = aMisc.y;

  vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 toCam = cameraPosition - center;
  float dist = length(toCam);
  toCam /= max(dist, 1e-4);

  float sn = sin(aAxis.w), cs = cos(aAxis.w);
  vec2 rc = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs);
  vec3 off;
  float comp = 1.0;

  if (mode < 0.5) {
    // 模式 0: 标准相机公告板 (Billboard)
    off = (camR * rc.x + camU * rc.y) * size;
    vT = camR * cs + camU * sn;
    vB = camU * cs - camR * sn;
  } else if (mode < 1.5) {
    // 模式 1: 速度拉伸流光线带 (Velocity-stretched streak)
    float len = length(aAxis.xyz);
    vec3 d = aAxis.xyz / max(len, 1e-5);
    vec3 side = cross(d, toCam);
    float sl = length(side);
    if (sl < 1e-4) side = camR; else side /= sl;
    off = (side * (c.x * size) + d * (c.y * len));
    vT = side;
    vB = d;
  } else {
    // 模式 2: 表面法线贴附 (Surface-aligned decal / ripple)
    vec3 N = aAxis.xyz;
    vec3 T = abs(N.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    T = normalize(cross(N, T));
    vec3 B = cross(N, T);
    off = (T * rc.x + B * rc.y) * size;
    vT = T;
    vB = B;
  }

  // 亚像素防闪烁夹紧 (Subpixel clamping to prevent distance aliasing)
  float minSz = dist * uPx * 1.5;
  if (size < minSz) {
    comp = size / max(minSz, 1e-4);
    off *= minSz / max(size, 1e-4);
  }

  vec3 worldPos = center + off;
  vec4 viewPos = viewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * viewPos;

  // 图集 UV 偏移计算
  float frame = aMisc.x;
  float col = mod(frame, uAtlas.x);
  float row = floor(frame / uAtlas.x);
  vec2 uvScale = 1.0 / uAtlas;
  vUv = (position.xy + 0.5) * uvScale + vec2(col, (uAtlas.y - 1.0 - row)) * uvScale;

  vCol = vec4(aCol.rgb, aCol.a * comp);
  vOff = off / max(size, 1e-4);
  vToCam = toCam;
  vInfo = vec3(viewPos.z, aMisc.z, aMisc.w);
  vSoftD = clamp(size * 0.4, 0.04, 0.7);
}
`;

/**
 * 受光烟雾与火焰片元着色器 (Lit Smoke & Fire Fragment Shader)
 */
export const FX_LIT_FRAGMENT_SHADER = GLSL_SOFT_FADE + `
uniform vec3 uSun, uSunDir, uAmbLo, uAmbHi;

void main() {
  vec4 t = texture2D(uTex, vUv);
  float er = vInfo.y * 0.45; // 烟雾老化随时间逐渐消散蚀刻
  float a = smoothstep(er, er + (vInfo.z > 1.5 ? 0.38 : 0.6), t.a) * vCol.a;
  a *= softFade() * smoothstep(0.2, 0.9, -vInfo.x);
  if (a < 0.004) discard;

  vec3 V = normalize(vToCam);
  vec3 q = vOff * 2.0;
  float r2 = min(dot(q, q), 1.0);
  vec3 Ns = q + V * (sqrt(1.0 - r2) * 0.9 + 0.05); // 球面法线逼近

  vec2 tn = t.rg * 2.0 - 1.0; // 翻页图集中的翻滚法线扰动
  vec3 Nb = vT * tn.x + vB * tn.y + V * sqrt(max(1.0 - dot(tn, tn), 0.0));
  vec3 N = normalize(Ns * 0.55 + Nb);

  // 日光半兰伯特包裹光照 (Wrap lighting)
  float wrap = clamp((dot(N, uSunDir) + 0.45) / 1.45, 0.0, 1.0);
  // 米氏前向散射 (Looking towards sun: strong forward scattering)
  float back = pow(clamp(dot(-V, uSunDir), 0.0, 1.0), 5.0);
  float thin = 1.0 - t.b * smoothstep(0.0, 0.5, a);
  float hot = step(1.5, vInfo.z);
  float shade = vInfo.z - 2.0 * hot;

  vec3 sun = uSun * (wrap * wrap * 0.85 + back * (0.15 + 1.3 * thin)) * shade;
  vec3 amb = mix(uAmbLo, uAmbHi, N.y * 0.5 + 0.5) * (1.0 - 0.35 * t.b);
  vec3 col = vCol.rgb * (amb + sun);

  if (hot > 0.5) {
    // 辐射火焰核心 (Alpha-blended emissive fire lobes with soot)
    float lump = clamp(dot(tn, vec2(0.6, 0.8)) * 0.6 + 0.5, 0.0, 1.0);
    float core = t.b * t.b * smoothstep(0.15, 0.9, t.a);
    vec3 fire = vCol.rgb * (0.10 + 1.7 * core) * (0.45 + 1.1 * lump);
    col = vec3(0.045, 0.042, 0.04) * (amb + sun) + fire;
  }

  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb *= gl_FragColor.a;
}
`;

/**
 * 加色发光火花片元着色器 (Additive Glow Fragment Shader)
 */
export const FX_ADD_FRAGMENT_SHADER = GLSL_SOFT_FADE + `
void main() {
  float t = texture2D(uTex, vUv).r;
  float k = t * vCol.a * softFade();
  if (k < 0.002) discard;

  gl_FragColor = vec4(vCol.rgb * k, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// ============================================================================
// 四、 实例化网格封装 (Instanced Particle Mesh Builder)
// ============================================================================

/**
 * 创建 GPU 粒子实例化网格与缓冲管理对象
 */
export function createInstancedParticleMesh(engineCtx, capacity, options = {}) {
  const {
    lit = false,
    tex = null,
    cols = 4,
    rows = 2,
    renderOrder = 0,
    sun = new THREE.Vector3(1, 1, 1),
    sunDir = new THREE.Vector3(0, 1, 0),
    ambLo = new THREE.Vector3(0.1, 0.1, 0.1),
    ambHi = new THREE.Vector3(0.5, 0.5, 0.5)
  } = options;

  const quadGeom = new THREE.InstancedBufferGeometry();
  quadGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -0.5, -0.5, 0,
     0.5, -0.5, 0,
     0.5,  0.5, 0,
    -0.5,  0.5, 0
  ]), 3));
  quadGeom.setIndex([0, 1, 2, 0, 2, 3]);

  const createInstAttr = (name) => {
    const attr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    attr.setUsage(THREE.DynamicDrawUsage);
    quadGeom.setAttribute(name, attr);
    return attr;
  };

  const attrPos  = createInstAttr('aPos');
  const attrAxis = createInstAttr('aAxis');
  const attrCol  = createInstAttr('aCol');
  const attrMisc = createInstAttr('aMisc');
  quadGeom.instanceCount = 0;

  const uniforms = {
    uTex: { value: tex },
    uAtlas: { value: new THREE.Vector2(cols, rows) },
    uPx: { value: 0.001 },
    uDepth: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uNearFar: { value: new THREE.Vector2(0.08, 900) },
    uSoft: { value: 0 }
  };

  if (lit) {
    Object.assign(uniforms, {
      uSun: { value: sun },
      uSunDir: { value: sunDir },
      uAmbLo: { value: ambLo },
      uAmbHi: { value: ambHi }
    });
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: FX_VERTEX_SHADER,
    fragmentShader: lit ? FX_LIT_FRAGMENT_SHADER : FX_ADD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    fog: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: lit ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor
  });
  material.name = lit ? 'fx_lit' : 'fx_add';

  const mesh = new THREE.Mesh(quadGeom, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = renderOrder;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false;
  mesh.name = material.name;

  mesh.onBeforeRender = (renderer, scene, camera) => {
    const rt = renderer.getRenderTarget();
    let screenHeight;
    if (rt) {
      screenHeight = rt.height;
    } else {
      renderer.getDrawingBufferSize(vDrawSize);
      screenHeight = vDrawSize.y;
    }

    const projMat = camera.projectionMatrix.elements;
    uniforms.uPx.value = 2 / (Math.max(projMat[5], 0.001) * Math.max(screenHeight, 1));

    const renderSys = engineCtx.render;
    const depthTex = renderSys && renderSys.depthTexture;
    if (depthTex && depthTex.image && camera === engineCtx.camera &&
        renderSys.depthTextureIsLive !== true && engineCtx.params.fxsoft !== '0') {
      uniforms.uDepth.value = depthTex;
      uniforms.uSoft.value = 1;
      if (renderSys.resolution && renderSys.resolution.x > 0) {
        uniforms.uRes.value.set(renderSys.resolution.x, renderSys.resolution.y);
      } else {
        uniforms.uRes.value.set(depthTex.image.width || 1, depthTex.image.height || 1);
      }
      uniforms.uNearFar.value.set(camera.near, camera.far);
    } else {
      uniforms.uDepth.value = null;
      uniforms.uSoft.value = 0;
    }
  };

  const arrPos = attrPos.array;
  const arrAxis = attrAxis.array;
  const arrCol = attrCol.array;
  const arrMisc = attrMisc.array;

  const instanceSystem = {
    mesh,
    cap: capacity,
    n: 0,
    P: arrPos,
    A: arrAxis,
    C: arrCol,
    M: arrMisc,

    begin() {
      instanceSystem.n = 0;
    },

    push(px, py, pz, size, ax, ay, az, roll, r, g, b, a, frame, mode, age, sunVis) {
      const idx = instanceSystem.n;
      if (idx >= capacity) return false;
      const offset = idx * 4;

      arrPos[offset]     = px;
      arrPos[offset + 1] = py;
      arrPos[offset + 2] = pz;
      arrPos[offset + 3] = size;

      arrAxis[offset]     = ax;
      arrAxis[offset + 1] = ay;
      arrAxis[offset + 2] = az;
      arrAxis[offset + 3] = roll;

      arrCol[offset]     = r;
      arrCol[offset + 1] = g;
      arrCol[offset + 2] = b;
      arrCol[offset + 3] = a;

      arrMisc[offset]     = frame;
      arrMisc[offset + 1] = mode;
      arrMisc[offset + 2] = age;
      arrMisc[offset + 3] = sunVis;

      instanceSystem.n = idx + 1;
      return true;
    },

    end() {
      const count = instanceSystem.n;
      quadGeom.instanceCount = count;
      mesh.visible = count > 0;
      if (count > 0) {
        const attrs = [attrPos, attrAxis, attrCol, attrMisc];
        for (let i = 0; i < 4; i++) {
          const a = attrs[i];
          a.clearUpdateRanges();
          a.addUpdateRange(0, count * 4);
          a.needsUpdate = true;
        }
      }
    }
  };

  return instanceSystem;
}

// ============================================================================
// 五、 粒子对象池 SoA (ParticlePool - Structure of Arrays)
// ============================================================================

export class ParticlePool {
  constructor(capacity, sorted = false) {
    this.cap = capacity;
    this.sorted = sorted;
    this.n = 0;
    this.freeTop = capacity;

    const makeFloat = () => new Float32Array(capacity);
    this.px = makeFloat();
    this.py = makeFloat();
    this.pz = makeFloat();
    this.vx = makeFloat();
    this.vy = makeFloat();
    this.vz = makeFloat();
    this.age = makeFloat();
    this.life = makeFloat();
    this.s0 = makeFloat();
    this.s1 = makeFloat();
    this.sk = makeFloat();
    this.rot = makeFloat();
    this.rotv = makeFloat();
    this.r = makeFloat();
    this.g = makeFloat();
    this.b = makeFloat();
    this.a = makeFloat();
    this.drag = makeFloat();
    this.grav = makeFloat();
    this.wind = makeFloat();
    this.turb = makeFloat();
    this.seed = makeFloat();
    this.fin = makeFloat();
    this.fout = makeFloat();
    this.stretch = makeFloat();
    this.shade = makeFloat();
    this.key = makeFloat();
    this.gy = makeFloat();

    this.frame = new Uint8Array(capacity);
    this.mode = new Uint8Array(capacity);
    this.flags = new Uint8Array(capacity);
    this.ramp = new Uint8Array(capacity);
    this.order = new Uint16Array(capacity);
    this.free = new Uint16Array(capacity);

    for (let i = 0; i < capacity; i++) {
      this.free[i] = capacity - 1 - i;
    }
  }

  clear() {
    this.n = 0;
    this.freeTop = this.cap;
    for (let i = 0; i < this.cap; i++) {
      this.free[i] = this.cap - 1 - i;
    }
  }

  emit(x, y, z, vx, vy, vz, lifespan, startSize, endSize) {
    if (this.freeTop === 0) return -1;
    const idx = this.free[--this.freeTop];
    this.order[this.n++] = idx;

    this.px[idx] = x;
    this.py[idx] = y;
    this.pz[idx] = z;
    this.vx[idx] = vx;
    this.vy[idx] = vy;
    this.vz[idx] = vz;

    this.age[idx] = -1; // 标记第 0 帧刚生成
    this.life[idx] = lifespan;
    this.s0[idx] = startSize;
    this.s1[idx] = endSize;
    this.sk[idx] = 2;
    this.rot[idx] = 0;
    this.rotv[idx] = 0;

    this.r[idx] = 1;
    this.g[idx] = 1;
    this.b[idx] = 1;
    this.a[idx] = 1;

    this.drag[idx] = 0;
    this.grav[idx] = 0;
    this.wind[idx] = 0;
    this.turb[idx] = 0;
    this.seed[idx] = Math.random() * 100;
    this.fin[idx] = 0;
    this.fout[idx] = 0.5;
    this.stretch[idx] = 0.02;
    this.shade[idx] = 1;
    this.key[idx] = 0;
    this.gy[idx] = 0;

    this.frame[idx] = 0;
    this.mode[idx] = 0;
    this.flags[idx] = 0;
    this.ramp[idx] = 0;

    return idx;
  }

  update(dt, instanceSystem, camPos, windDir, globalTime) {
    const { px, py, pz, vx, vy, vz, age, life, order, flags } = this;
    const cx = camPos.x, cy = camPos.y, cz = camPos.z;
    let liveCount = 0;
    const total = this.n;

    for (let i = 0; i < total; i++) {
      const idx = order[i];
      let a = age[idx];

      if (a < 0) {
        // 第一帧初始化
        age[idx] = 0;
      } else {
        a += dt;
        if (a >= life[idx]) {
          this.free[this.freeTop++] = idx;
          continue;
        }
        age[idx] = a;

        // 空气阻力阻尼 (Air Drag)
        const d = this.drag[idx];
        if (d > 0) {
          const damping = Math.exp(-d * dt);
          vx[idx] *= damping;
          vy[idx] *= damping;
          vz[idx] *= damping;
        }

        // 重力加速度 (Gravity)
        vy[idx] -= this.grav[idx] * dt;

        // 风力影响 (Wind)
        const w = this.wind[idx];
        if (w > 0 && windDir) {
          vx[idx] += windDir.x * w * dt;
          vz[idx] += windDir.z * w * dt;
        }

        // 湍流晃动 (Turbulence)
        const tb = this.turb[idx];
        if (tb > 0) {
          const ph = globalTime * 3 + this.seed[idx];
          vx[idx] += Math.sin(ph * 1.7) * tb * dt;
          vz[idx] += Math.cos(ph * 1.3) * tb * dt;
        }

        px[idx] += vx[idx] * dt;
        py[idx] += vy[idx] * dt;
        pz[idx] += vz[idx] * dt;
        this.rot[idx] += this.rotv[idx] * dt;

        // 地面碰撞与消亡检测 (Floor collision handling)
        const fl = flags[idx];
        const floorY = this.gy[idx] + 0.012;
        if (fl && py[idx] < floorY) {
          if (fl & PARTICLE_FLAG_DIE_ON_FLOOR) {
            this.free[this.freeTop++] = idx;
            continue;
          }
          if (fl & PARTICLE_FLAG_BOUNCE_FLOOR) {
            py[idx] = floorY;
            if (vy[idx] < 0) {
              vy[idx] = -vy[idx] * (0.25 + (this.seed[idx] % 1) * 0.3);
              vx[idx] *= 0.65;
              vz[idx] *= 0.65;
            }
          } else if (fl & PARTICLE_FLAG_STICK_FLOOR) {
            py[idx] = floorY;
            vx[idx] = vy[idx] = vz[idx] = 0;
          }
        }
      }

      // 相机距离排序深度键值 (Depth sorting key)
      if (this.sorted) {
        const dx = px[idx] - cx;
        const dy = py[idx] - cy;
        const dz = pz[idx] - cz;
        this.key[idx] = dx * dx + dy * dy + dz * dz;
      }

      order[liveCount++] = idx;
    }

    this.n = liveCount;

    // 半透明粒子从远到近排序 (Back-to-front sorting for alpha blending)
    if (this.sorted && liveCount > 1) {
      order.subarray(0, liveCount).sort((ia, ib) => this.key[ib] - this.key[ia]);
    }

    // 将活跃粒子推入 GPU 实例化数组 (Push active particles to GPU)
    for (let i = 0; i < liveCount; i++) {
      const idx = order[i];
      const normAge = age[idx] / Math.max(life[idx], 1e-4);

      // 尺寸缓动 (Size curve)
      const sPower = this.sk[idx];
      const tSize = sPower === 1 ? normAge : Math.pow(normAge, 1 / sPower);
      const currSize = this.s0[idx] + (this.s1[idx] - this.s0[idx]) * tSize;

      // 透明度渐入渐出 (Fade in & out)
      let alphaVal = this.a[idx];
      const tIn = this.fin[idx];
      if (normAge < tIn && tIn > 0) {
        alphaVal *= normAge / tIn;
      }
      const tOut = this.fout[idx];
      if (normAge > tOut) {
        alphaVal *= Math.max(0, 1 - (normAge - tOut) / Math.max(1 - tOut, 1e-4));
      }

      let rCol = this.r[idx];
      let gCol = this.g[idx];
      let bCol = this.b[idx];

      // 颜色阶梯渐变 (Color ramp)
      const rampMode = this.ramp[idx];
      if (rampMode === 1) {
        // 白热 -> 橙红 -> 暗红
        const cool = Math.pow(normAge, 1.4);
        rCol = Math.max(0, rCol * (1 - cool * 0.2));
        gCol = Math.max(0, gCol * (1 - cool * 0.7));
        bCol = Math.max(0, bCol * (1 - cool * 0.95));
      } else if (rampMode === 2) {
        // 电弧闪烁蓝白
        const flicker = 0.8 + 0.4 * Math.sin(normAge * 30 + this.seed[idx]);
        rCol *= flicker;
        gCol *= flicker;
        bCol *= flicker;
      }

      const pMode = this.mode[idx];
      let axisX = 0, axisY = 0, axisZ = 0;
      if (pMode === PARTICLE_MODE_VELOCITY_STRETCH) {
        const st = this.stretch[idx];
        axisX = vx[idx] * st;
        axisY = vy[idx] * st;
        axisZ = vz[idx] * st;
      } else if (pMode === PARTICLE_MODE_SURFACE_ALIGNED) {
        axisX = 0;
        axisY = 1;
        axisZ = 0;
      }

      if (!instanceSystem.push(
        px[idx], py[idx], pz[idx], currSize,
        axisX, axisY, axisZ, this.rot[idx],
        rCol, gCol, bCol, alphaVal,
        this.frame[idx], pMode, normAge, this.shade[idx]
      )) {
        break;
      }
    }
  }
}


// ============================================================================
// 六、 弹道曳光流 (BulletTracerPool)
// ============================================================================

const TRACER_PROPS = [
  'fx', 'fy', 'fz', 'dx', 'dy', 'dz',
  'dist', 'speed', 'trav', 'len', 'width', 'r', 'g', 'b'
];

export class BulletTracerPool {
  constructor(capacity = 48) {
    this.cap = capacity;
    this.n = 0;

    const makeFloat = () => new Float32Array(capacity);
    this.fx = makeFloat();
    this.fy = makeFloat();
    this.fz = makeFloat();
    this.dx = makeFloat();
    this.dy = makeFloat();
    this.dz = makeFloat();
    this.dist = makeFloat();
    this.speed = makeFloat();
    this.trav = makeFloat();
    this.len = makeFloat();
    this.width = makeFloat();
    this.r = makeFloat();
    this.g = makeFloat();
    this.b = makeFloat();
    this.frames = new Uint8Array(capacity);
  }

  clear() {
    this.n = 0;
  }

  add(startPos, endPos, r, g, b, speed, width) {
    let idx = this.n;
    if (idx >= this.cap) {
      idx = 0; // 环形缓冲覆盖
    } else {
      this.n++;
    }

    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const dz = endPos.z - startPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 0.001) {
      if (idx === this.n - 1) this.n--;
      return;
    }

    this.fx[idx] = startPos.x;
    this.fy[idx] = startPos.y;
    this.fz[idx] = startPos.z;
    this.dx[idx] = dx / dist;
    this.dy[idx] = dy / dist;
    this.dz[idx] = dz / dist;
    this.dist[idx] = dist;
    this.speed[idx] = speed;
    this.trav[idx] = 0;
    this.len[idx] = Math.min(Math.max(speed * 0.022, 2), 7);
    this.width[idx] = width;
    this.r[idx] = r;
    this.g[idx] = g;
    this.b[idx] = b;
    this.frames[idx] = 0;
  }

  update(dt, instanceSystem, streakFrame, dotFrame) {
    let count = this.n;
    for (let i = 0; i < count; i++) {
      const spd = this.speed[i];
      const totalDist = this.dist[i];
      const streakLen = this.len[i];

      if (this.frames[i] === 0) {
        // 第 0 帧初次前进少量距离
        this.trav[i] = Math.min(totalDist, spd * Math.max(dt, 0.008) * (0.35 + Math.random() * 0.4));
      } else {
        this.trav[i] += spd * dt;
      }

      let tipPos = Math.min(this.trav[i], totalDist);
      let tailPos = Math.max(0, this.trav[i] - streakLen);

      if (tailPos >= totalDist) {
        if (this.frames[i] >= 2) {
          count--;
          if (i !== count) {
            for (const prop of TRACER_PROPS) {
              this[prop][i] = this[prop][count];
            }
            this.frames[i] = this.frames[count];
          }
          i--;
          continue;
        }
        tailPos = Math.max(0, totalDist - streakLen * 0.5);
        tipPos = totalDist;
      }

      this.frames[i] = Math.min(250, this.frames[i] + 1);
      const midDist = (tipPos + tailPos) * 0.5;
      const segLen = Math.max(tipPos - tailPos, 0.05);

      const dX = this.dx[i];
      const dY = this.dy[i];
      const dZ = this.dz[i];
      const w = this.width[i];

      const midX = this.fx[i] + dX * midDist;
      const midY = this.fy[i] + dY * midDist;
      const midZ = this.fz[i] + dZ * midDist;

      const rCol = this.r[i];
      const gCol = this.g[i];
      const bCol = this.b[i];

      // 1. 核心高亮发光线段 (Core laser streak)
      instanceSystem.push(
        midX, midY, midZ, w,
        dX * segLen, dY * segLen, dZ * segLen, 0,
        rCol, gCol, bCol, 1,
        streakFrame, PARTICLE_MODE_VELOCITY_STRETCH, 0, 5
      );

      // 2. 外部膨胀柔光光晕 (Outer bloom ribbon)
      instanceSystem.push(
        midX, midY, midZ, w * 6,
        dX * segLen * 1.05, dY * segLen * 1.05, dZ * segLen * 1.05, 0,
        rCol * 0.04, gCol * 0.032, bCol * 0.028, 1,
        streakFrame, PARTICLE_MODE_VELOCITY_STRETCH, 0, 28
      );

      // 3. 弹头点状耀斑 (Tracer tip flare)
      instanceSystem.push(
        this.fx[i] + dX * tipPos, this.fy[i] + dY * tipPos, this.fz[i] + dZ * tipPos, w * 5,
        0, 1, 0, 0,
        rCol * 0.2, gCol * 0.16, bCol * 0.12, 1,
        dotFrame, PARTICLE_MODE_BILLBOARD, 0, 1
      );
    }
    this.n = count;
  }
}

// ============================================================================
// 七、 物理碎屑与破片 (DebrisPhysicsSystem)
// ============================================================================

/**
 * 创建非对称抖动的刚体几何破片 (Jittered Debris Shrapnel Box)
 */
export function createDebrisGeometry() {
  let geom = new THREE.BoxGeometry(1, 1, 1, 2, 1, 2);
  const pos = geom.attributes.position;
  let seed = 1234.5;
  const hash = () => {
    seed = (Math.sin(seed * 12.9898 + 78.233) * 43758.5453);
    seed -= Math.floor(seed);
    return seed;
  };

  const vertexMap = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let jittered = vertexMap.get(key);
    if (!jittered) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const isCorner = Math.abs(x) > 0.49 && Math.abs(z) > 0.49;
      const f = isCorner ? 0.72 + hash() * 0.2 : 1.0;
      x = x * f + (hash() - 0.5) * 0.14;
      z = z * f + (hash() - 0.5) * 0.14;
      y = y * (0.8 + hash() * 0.3) + (hash() - 0.5) * 0.1;
      jittered = [x, y, z];
      vertexMap.set(key, jittered);
    }
    pos.setXYZ(i, jittered[0], jittered[1], jittered[2]);
  }

  geom = geom.toNonIndexed();
  geom.computeVertexNormals();
  return geom;
}

export class DebrisPhysicsSystem {
  constructor(engineCtx, capacity = 256) {
    this.ctx = engineCtx;
    this.cap = capacity;
    this.next = 0;
    this.live = 0;

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.05
    });
    material.name = 'fx_debris';

    const instMesh = new THREE.InstancedMesh(createDebrisGeometry(), material, capacity);
    instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3).fill(1), 3);
    instMesh.frustumCulled = false;
    instMesh.castShadow = false;
    instMesh.receiveShadow = true;
    instMesh.name = 'fx_debris';

    this.mesh = instMesh;

    const makeFloat = () => new Float32Array(capacity);
    this.px = makeFloat();
    this.py = makeFloat();
    this.pz = makeFloat();
    this.vx = makeFloat();
    this.vy = makeFloat();
    this.vz = makeFloat();
    this.ax = makeFloat();
    this.ay = makeFloat();
    this.az = makeFloat();
    this.ang = makeFloat();
    this.spin = makeFloat();
    this.sx = makeFloat();
    this.sy = makeFloat();
    this.sz = makeFloat();
    this.age = makeFloat();
    this.life = makeFloat();
    this.floor = makeFloat();
    this.state = new Uint8Array(capacity); // 0: free, 1: flying, 2: resting on floor

    mTempMatrix.makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) {
      mTempMatrix.toArray(instMesh.instanceMatrix.array, i * 16);
    }
    instMesh.visible = false;
  }

  clear() {
    this.state.fill(0);
    mTempMatrix.makeScale(0, 0, 0);
    for (let i = 0; i < this.cap; i++) {
      mTempMatrix.toArray(this.mesh.instanceMatrix.array, i * 16);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.live = 0;
    this.mesh.visible = false;
  }

  add(x, y, z, vx, vy, vz, sx, sy, sz, r, g, b, life, floorY) {
    const idx = this.next;
    this.next = (idx + 1) % this.cap;

    this.px[idx] = x;
    this.py[idx] = y;
    this.pz[idx] = z;
    this.vx[idx] = vx;
    this.vy[idx] = vy;
    this.vz[idx] = vz;

    const rx = Math.random() - 0.5;
    const ry = Math.random() - 0.5;
    const rz = Math.random() - 0.5;
    const len = Math.hypot(rx, ry, rz) || 1;

    this.ax[idx] = rx / len;
    this.ay[idx] = ry / len;
    this.az[idx] = rz / len;
    this.ang[idx] = Math.random() * 6.28;
    this.spin[idx] = (Math.random() - 0.5) * 50;

    this.sx[idx] = sx;
    this.sy[idx] = sy;
    this.sz[idx] = sz;
    this.age[idx] = 0;
    this.life[idx] = life;
    this.floor[idx] = floorY;
    this.state[idx] = 1;

    const colArr = this.mesh.instanceColor.array;
    colArr[idx * 3]     = r;
    colArr[idx * 3 + 1] = g;
    colArr[idx * 3 + 2] = b;
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    const st = this.state;
    const matArr = this.mesh.instanceMatrix.array;
    let activeCount = 0;
    let matrixChanged = false;

    for (let i = 0; i < this.cap; i++) {
      const stateVal = st[i];
      if (!stateVal) continue;

      this.age[i] += dt;
      const timeLeft = this.life[i] - this.age[i];
      if (timeLeft <= 0) {
        st[i] = 0;
        mTempMatrix.makeScale(0, 0, 0);
        mTempMatrix.toArray(matArr, i * 16);
        matrixChanged = true;
        continue;
      }

      activeCount++;
      if (stateVal === 2 && timeLeft > 0.5) {
        continue; // 静止中，且距离消亡还有一段时间，跳过矩阵更新
      }

      if (stateVal === 1) {
        this.vy[i] -= 9.81 * dt;
        this.px[i] += this.vx[i] * dt;
        this.py[i] += this.vy[i] * dt;
        this.pz[i] += this.vz[i] * dt;
        this.ang[i] += this.spin[i] * dt;

        const groundContact = this.floor[i] + Math.min(this.sx[i], this.sy[i], this.sz[i]) * 0.5;
        if (this.py[i] < groundContact && this.vy[i] < 0) {
          this.py[i] = groundContact;
          if (this.vy[i] > -1.2) {
            // 速度极小，转入静止着地模式
            st[i] = 2;
            this.vx[i] = this.vy[i] = this.vz[i] = 0;
            this.spin[i] = 0;
          } else {
            // 地面反弹
            this.vy[i] = -this.vy[i] * (0.2 + Math.random() * 0.2);
            this.vx[i] *= 0.6;
            this.vz[i] *= 0.6;
            this.spin[i] *= 0.5;
          }
        }
      }

      // 消亡前最后 0.5 秒缩小淡出
      let scaleMult = 1.0;
      if (timeLeft < 0.5) {
        scaleMult = timeLeft / 0.5;
      }

      qTempQuat.setFromAxisAngle(vTempAim.set(this.ax[i], this.ay[i], this.az[i]), this.ang[i]);
      vTempPos.set(this.px[i], this.py[i], this.pz[i]);
      vTempOffset.set(this.sx[i] * scaleMult, this.sy[i] * scaleMult, this.sz[i] * scaleMult);

      mTempMatrix.compose(vTempPos, qTempQuat, vTempOffset);
      mTempMatrix.toArray(matArr, i * 16);
      matrixChanged = true;
    }

    this.live = activeCount;
    this.mesh.visible = activeCount > 0;
    if (matrixChanged) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

// ============================================================================
// 八、 抛壳物理系统 (SpentShellEjectionSystem)
// ============================================================================

/**
 * 车削旋转生成标准 7.62x39mm / 5.56x45mm 黄铜子弹壳模型
 */
export function createShellCartridgeGeometry() {
  const profile = [
    [0, 0],
    [0.006076, 0],
    [0.0062, 0.0012],
    [0.005084, 0.0022],
    [0.005084, 0.0034],
    [0.006014, 0.0046],
    [0.00589, 0.0364],
    [0.004092, 0.0416],
    [0.003968, 0.052],
    [0.003224, 0.052],
    [0.0031, 0.04472]
  ];
  const latheGeom = new THREE.LatheGeometry(
    profile.map(p => new THREE.Vector2(p[0], p[1] - 0.052 / 2)),
    10
  );
  latheGeom.computeVertexNormals();
  return latheGeom;
}

const vShellBounceEvent = { pos: new THREE.Vector3(), surface: 'concrete' };

export class SpentShellEjectionSystem {
  constructor(engineCtx, capacity = 60) {
    this.ctx = engineCtx;
    this.cap = capacity;
    this.next = 0;

    let brassMat = null;
    try {
      brassMat = engineCtx.mats.get('brass');
    } catch {
      brassMat = null;
    }
    if (!brassMat || !brassMat.isMaterial) {
      brassMat = new THREE.MeshStandardMaterial({
        color: 0xb08d5c,
        roughness: 0.3,
        metalness: 1.0
      });
    }

    const instMesh = new THREE.InstancedMesh(createShellCartridgeGeometry(), brassMat, capacity);
    instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instMesh.frustumCulled = false;
    instMesh.castShadow = false;
    instMesh.receiveShadow = true;
    instMesh.name = 'fx_shells';

    this.mesh = instMesh;

    const makeFloat = () => new Float32Array(capacity);
    this.px = makeFloat();
    this.py = makeFloat();
    this.pz = makeFloat();
    this.vx = makeFloat();
    this.vy = makeFloat();
    this.vz = makeFloat();
    this.qx = makeFloat();
    this.qy = makeFloat();
    this.qz = makeFloat();
    this.qw = makeFloat().fill(1);
    this.wx = makeFloat();
    this.wy = makeFloat();
    this.wz = makeFloat();
    this.age = makeFloat();
    this.rest = makeFloat();
    this.floor = makeFloat();
    this.state = new Uint8Array(capacity);
    this.bounces = new Uint8Array(capacity);
    this.surface = new Array(capacity).fill('concrete');

    mTempMatrix.makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) {
      mTempMatrix.toArray(instMesh.instanceMatrix.array, i * 16);
    }
    instMesh.visible = false;
  }

  clear() {
    this.state.fill(0);
    mTempMatrix.makeScale(0, 0, 0);
    for (let i = 0; i < this.cap; i++) {
      mTempMatrix.toArray(this.mesh.instanceMatrix.array, i * 16);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.visible = false;
  }

  _queryFloor(idx) {
    const phys = this.ctx.physics;
    this.floor[idx] = 0;
    this.surface[idx] = 'concrete';
    if (phys && phys.raycast) {
      vTempPos.set(this.px[idx], this.py[idx] + 0.25, this.pz[idx]);
      const hit = phys.raycast(vTempPos, DOWN_VECTOR, 6);
      if (hit) {
        this.floor[idx] = hit.point.y;
        this.surface[idx] = hit.surface || 'concrete';
      } else {
        this.floor[idx] = -50;
      }
    }
  }

  add(pos, velocity) {
    const idx = this.next;
    this.next = (idx + 1) % this.cap;

    this.px[idx] = pos.x;
    this.py[idx] = pos.y;
    this.pz[idx] = pos.z;
    this.vx[idx] = velocity.x;
    this.vy[idx] = velocity.y;
    this.vz[idx] = velocity.z;

    eTempEuler.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    qTempQuat.setFromEuler(eTempEuler);
    this.qx[idx] = qTempQuat.x;
    this.qy[idx] = qTempQuat.y;
    this.qz[idx] = qTempQuat.z;
    this.qw[idx] = qTempQuat.w;

    this.wx[idx] = (Math.random() - 0.5) * 40;
    this.wy[idx] = (Math.random() - 0.5) * 20;
    this.wz[idx] = (Math.random() - 0.5) * 40;

    this.age[idx] = 0;
    this.rest[idx] = 0;
    this.state[idx] = 1;
    this.bounces[idx] = 0;

    this._queryFloor(idx);
  }

  update(dt) {
    const st = this.state;
    const matArr = this.mesh.instanceMatrix.array;
    let liveCount = 0;
    let matrixChanged = false;

    for (let i = 0; i < this.cap; i++) {
      const stateVal = st[i];
      if (!stateVal) continue;

      liveCount++;
      this.age[i] += dt;
      let scaleMult = 1.0;

      if (stateVal === 1) {
        this.vy[i] -= 9.81 * dt;
        this.px[i] += this.vx[i] * dt;
        this.py[i] += this.vy[i] * dt;
        this.pz[i] += this.vz[i] * dt;

        // 四元数角速度积分
        const wx = this.wx[i], wy = this.wy[i], wz = this.wz[i];
        const qx = this.qx[i], qy = this.qy[i], qz = this.qz[i], qw = this.qw[i];
        const halfDt = 0.5 * dt;
        const nx = qx + halfDt * (wx * qw + wy * qz - wz * qy);
        const ny = qy + halfDt * (wy * qw + wz * qx - wx * qz);
        const nz = qz + halfDt * (wz * qw + wx * qy - wy * qx);
        const nw = qw - halfDt * (wx * qx + wy * qy + wz * qz);
        const invLen = 1 / (Math.hypot(nx, ny, nz, nw) || 1);
        this.qx[i] = nx * invLen;
        this.qy[i] = ny * invLen;
        this.qz[i] = nz * invLen;
        this.qw[i] = nw * invLen;

        const groundY = this.floor[i] + 0.0065;
        if (this.py[i] < groundY && this.vy[i] < 0) {
          this.py[i] = groundY;
          const bounceCount = this.bounces[i]++;

          if (bounceCount < 2) {
            vShellBounceEvent.pos.set(this.px[i], this.py[i], this.pz[i]);
            vShellBounceEvent.surface = this.surface[i];
            this.ctx.events.emit('shell:bounce', vShellBounceEvent);
          }

          if (this.vy[i] > -0.9 || bounceCount >= 4) {
            // 静止平躺着地
            st[i] = 2;
            this.vx[i] = this.vy[i] = this.vz[i] = 0;
            eTempEuler.set(Math.PI / 2, 0, Math.random() * 6.28, 'ZXY');
            qTempQuat.setFromEuler(eTempEuler);
            this.qx[i] = qTempQuat.x;
            this.qy[i] = qTempQuat.y;
            this.qz[i] = qTempQuat.z;
            this.qw[i] = qTempQuat.w;
          } else {
            // 弹跳衰减与自旋扰动
            this.vy[i] = -this.vy[i] * (0.32 + Math.random() * 0.16);
            this.vx[i] = this.vx[i] * 0.6 + (Math.random() - 0.5) * 0.6;
            this.vz[i] = this.vz[i] * 0.6 + (Math.random() - 0.5) * 0.6;
            this.wx[i] = (Math.random() - 0.5) * 50;
            this.wy[i] = (Math.random() - 0.5) * 30;
            this.wz[i] = (Math.random() - 0.5) * 50;
            if (bounceCount === 0) this._queryFloor(i);
          }
        }

        if (this.age[i] > 8) st[i] = 2;
      } else {
        // 静止状态，停留 4 秒后在 0.7 秒内缩小编号回收
        this.rest[i] += dt;
        if (this.rest[i] < 4 && this.rest[i] > dt * 1.5) continue;
        if (this.rest[i] >= 4.7) {
          st[i] = 0;
          mTempMatrix.makeScale(0, 0, 0);
          mTempMatrix.toArray(matArr, i * 16);
          matrixChanged = true;
          continue;
        }
        if (this.rest[i] >= 4) {
          scaleMult = 1 - (this.rest[i] - 4) / 0.7;
        }
      }

      qTempQuat.set(this.qx[i], this.qy[i], this.qz[i], this.qw[i]);
      vTempPos.set(this.px[i], this.py[i], this.pz[i]);
      vTempOffset.set(scaleMult, scaleMult, scaleMult);
      mTempMatrix.compose(vTempPos, qTempQuat, vTempOffset);
      mTempMatrix.toArray(matArr, i * 16);
      matrixChanged = true;
    }

    this.mesh.visible = liveCount > 0;
    if (matrixChanged) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

// ============================================================================
// 九、 冲击弹孔贴花管理器 (ImpactDecalManager)
// ============================================================================

const DECAL_FADE_OLDEST_COUNT = 14;

export class ImpactDecalManager {
  constructor(engineCtx, capacity = 160) {
    this.cap = capacity;
    this.next = 0;
    this.count = 0;

    const atlas = generateDecalsAtlas(256);
    this.atlas = atlas;

    const geom = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(capacity * 12), 3);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    this.nor = new THREE.BufferAttribute(new Float32Array(capacity * 12), 3);
    this.nor.setUsage(THREE.DynamicDrawUsage);
    this.uv = new THREE.BufferAttribute(new Float32Array(capacity * 8), 2);
    this.uv.setUsage(THREE.DynamicDrawUsage);
    this.col = new THREE.BufferAttribute(new Float32Array(capacity * 16), 4);
    this.col.setUsage(THREE.DynamicDrawUsage);

    this.baseA = new Float32Array(capacity);

    geom.setAttribute('position', this.pos);
    geom.setAttribute('normal', this.nor);
    geom.setAttribute('uv', this.uv);
    geom.setAttribute('color', this.col);

    const indexArr = new Uint16Array(capacity * 6);
    for (let i = 0; i < capacity; i++) {
      const vIdx = i * 4;
      const iIdx = i * 6;
      indexArr[iIdx]     = vIdx;
      indexArr[iIdx + 1] = vIdx + 1;
      indexArr[iIdx + 2] = vIdx + 2;
      indexArr[iIdx + 3] = vIdx;
      indexArr[iIdx + 4] = vIdx + 2;
      indexArr[iIdx + 5] = vIdx + 3;
    }
    geom.setIndex(new THREE.BufferAttribute(indexArr, 1));

    const material = new THREE.MeshStandardMaterial({
      map: atlas.map,
      roughnessMap: atlas.orm,
      metalnessMap: atlas.orm,
      roughness: 1,
      metalness: 1,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });
    if (atlas.nrm) {
      material.normalMap = atlas.nrm;
      material.normalScale = new THREE.Vector2(1, 1);
    }
    material.name = 'fx_decals';

    const mesh = new THREE.Mesh(geom, material);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.renderOrder = -5;
    mesh.matrixAutoUpdate = false;
    mesh.name = 'fx_decals';
    mesh.visible = false;
    this.mesh = mesh;

    this.uvs = {};
    for (const type in DECAL_TYPE_FRAMES) {
      this.uvs[type] = DECAL_TYPE_FRAMES[type].map(f => atlas.uv(f));
    }
  }

  clear() {
    this.col.array.fill(0);
    this.pos.array.fill(0);
    this.col.needsUpdate = true;
    this.pos.needsUpdate = true;
    this.next = 0;
    this.count = 0;
    this.mesh.visible = false;
  }

  add(pos, normal, type = 'bullet_concrete', size = null, tint = 1, alpha = 1) {
    const uvFrames = this.uvs[type] || this.uvs.bullet_concrete;
    const uvCoords = uvFrames[Math.floor(Math.random() * uvFrames.length)];
    const baseSize = size || DECAL_DEFAULT_SIZES[type] || 0.25;
    const halfSize = baseSize * (0.85 + Math.random() * 0.3) * 0.5;

    const idx = this.next;
    this.next = (idx + 1) % this.cap;
    if (this.count < this.cap) this.count++;

    let nx = normal.x, ny = normal.y, nz = normal.z;
    const normLen = Math.hypot(nx, ny, nz) || 1;
    nx /= normLen; ny /= normLen; nz /= normLen;

    // 正交切线基底 (Tangent basis construction)
    let tx, ty, tz;
    if (Math.abs(ny) > 0.9) {
      tx = 1; ty = 0; tz = 0;
    } else {
      tx = -nz; ty = 0; tz = nx;
    }
    const dotTN = tx * nx + ty * ny + tz * nz;
    tx -= nx * dotTN; ty -= ny * dotTN; tz -= nz * dotTN;
    const tLen = Math.hypot(tx, ty, tz) || 1;
    tx /= tLen; ty /= tLen; tz /= tLen;

    // 副法线 (Bitangent = Normal x Tangent)
    const bx = ny * tz - nz * ty;
    const by = nz * tx - nx * tz;
    const bz = nx * ty - ny * tx;

    // 随机平面自旋 (Planar roll)
    const rollAngle = type === 'bullet_wood' ? (Math.random() - 0.5) * 0.3 : Math.random() * 6.283;
    const cosR = Math.cos(rollAngle);
    const sinR = Math.sin(rollAngle);

    const sX = (tx * cosR + bx * sinR) * halfSize;
    const sY = (ty * cosR + by * sinR) * halfSize;
    const sZ = (tz * cosR + bz * sinR) * halfSize;

    const oX = (bx * cosR - tx * sinR) * halfSize;
    const oY = (by * cosR - ty * sinR) * halfSize;
    const oZ = (bz * cosR - tz * sinR) * halfSize;

    // 沿法线微量抬升避免 Z-Fighting
    const liftOffset = 0.004 + (idx % 7) * 0.0003;
    const cx = pos.x + nx * liftOffset;
    const cy = pos.y + ny * liftOffset;
    const cz = pos.z + nz * liftOffset;

    const pArr = this.pos.array;
    const nArr = this.nor.array;
    const uArr = this.uv.array;
    const cArr = this.col.array;

    const vOffset = idx * 12;
    pArr[vOffset]      = cx - sX - oX;
    pArr[vOffset + 1]  = cy - sY - oY;
    pArr[vOffset + 2]  = cz - sZ - oZ;

    pArr[vOffset + 3]  = cx + sX - oX;
    pArr[vOffset + 4]  = cy + sY - oY;
    pArr[vOffset + 5]  = cz + sZ - oZ;

    pArr[vOffset + 6]  = cx + sX + oX;
    pArr[vOffset + 7]  = cy + sY + oY;
    pArr[vOffset + 8]  = cz + sZ + oZ;

    pArr[vOffset + 9]  = cx - sX + oX;
    pArr[vOffset + 10] = cy - sY + oY;
    pArr[vOffset + 11] = cz - sZ + oZ;

    for (let f = 0; f < 4; f++) {
      nArr[vOffset + f * 3]     = nx;
      nArr[vOffset + f * 3 + 1] = ny;
      nArr[vOffset + f * 3 + 2] = nz;
    }

    const uvOffset = idx * 8;
    uArr[uvOffset]     = uvCoords[0];
    uArr[uvOffset + 1] = uvCoords[1];
    uArr[uvOffset + 2] = uvCoords[2];
    uArr[uvOffset + 3] = uvCoords[1];
    uArr[uvOffset + 4] = uvCoords[2];
    uArr[uvOffset + 5] = uvCoords[3];
    uArr[uvOffset + 6] = uvCoords[0];
    uArr[uvOffset + 7] = uvCoords[3];

    const colOffset = idx * 16;
    this.baseA[idx] = alpha;
    for (let f = 0; f < 4; f++) {
      cArr[colOffset + f * 4]     = tint;
      cArr[colOffset + f * 4 + 1] = tint;
      cArr[colOffset + f * 4 + 2] = tint;
      cArr[colOffset + f * 4 + 3] = alpha;
    }

    // 池满时渐进淡出最旧的贴花
    if (this.count >= this.cap) {
      for (let f = 0; f < DECAL_FADE_OLDEST_COUNT; f++) {
        const oldIdx = (this.next + f) % this.cap;
        const fadeA = this.baseA[oldIdx] * (f + 1) / (DECAL_FADE_OLDEST_COUNT + 1);
        const oCol = oldIdx * 16;
        cArr[oCol + 3] = cArr[oCol + 7] = cArr[oCol + 11] = cArr[oCol + 15] = fadeA;
      }
    }

    this.pos.needsUpdate = true;
    this.nor.needsUpdate = true;
    this.uv.needsUpdate = true;
    this.col.needsUpdate = true;
    this.mesh.visible = true;
  }
}

// ============================================================================
// 十、 颜色解析与圆锥体随机发射辅助 (Helpers)
// ============================================================================

function parseColorToArray(colorInput, defaultR = 1, defaultG = 1, defaultB = 1) {
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
 */
function randomVectorInCone(baseDir, spreadRadius, outVector) {
  const rx = Math.random() * 2 - 1;
  const ry = Math.random() * 2 - 1;
  const rz = Math.random() * 2 - 1;
  const len = Math.hypot(rx, ry, rz) || 1;
  const factor = spreadRadius * Math.cbrt(Math.random()) / len;

  outVector.set(
    baseDir.x + rx * factor,
    baseDir.y + ry * factor,
    baseDir.z + rz * factor
  );

  const outLen = outVector.length();
  if (outLen < 1e-4) {
    outVector.copy(baseDir);
  } else {
    outVector.multiplyScalar(1 / outLen);
  }
  return outVector;
}

// ============================================================================
// 十一、 核心特效管理器工厂 (createFXManager)
// ============================================================================

const CAPACITY_LIT_PARTICLES = 1400;
const CAPACITY_ADD_PARTICLES = 3200;

export async function createFXManager(engineCtx) {
  const scene = engineCtx.scene || (engineCtx.render && engineCtx.render.scene);
  const windDir = new THREE.Vector3(-0.8, 0, 0.3);

  // 环境光与日光光照参数
  const sunRadiance = new THREE.Vector3(
    SUN_CONFIG.color.r,
    SUN_CONFIG.color.g,
    SUN_CONFIG.color.b
  ).multiplyScalar((SUN_CONFIG.intensity / Math.PI) * 0.9);

  const ambSky = new THREE.Vector3(
    SKY_CONFIG.zenith.r * 0.6 + SKY_CONFIG.horizonAway.r * 0.5 + SKY_CONFIG.fog.r * 0.25,
    SKY_CONFIG.zenith.g * 0.6 + SKY_CONFIG.horizonAway.g * 0.5 + SKY_CONFIG.fog.g * 0.25,
    SKY_CONFIG.zenith.b * 0.6 + SKY_CONFIG.horizonAway.b * 0.5 + SKY_CONFIG.fog.b * 0.25
  );

  const ambGround = new THREE.Vector3(
    SKY_CONFIG.horizonAway.r * 0.3 + SKY_CONFIG.fog.r * 0.14,
    SKY_CONFIG.horizonAway.g * 0.3 + SKY_CONFIG.fog.g * 0.14,
    SKY_CONFIG.horizonAway.b * 0.3 + SKY_CONFIG.fog.b * 0.14
  );

  // 初始化各子系统
  const smokeAtlas = generateSmokeAtlas(128);
  const sparksAtlas = generateSparksAtlas(128);

  const litMeshSystem = createInstancedParticleMesh(engineCtx, CAPACITY_LIT_PARTICLES, {
    lit: true,
    tex: smokeAtlas,
    cols: SMOKE_ATLAS_COLS,
    rows: SMOKE_ATLAS_ROWS,
    renderOrder: 10,
    sun: sunRadiance,
    sunDir: SUN_CONFIG.dir.clone().normalize(),
    ambLo: ambGround,
    ambHi: ambSky
  });

  const addMeshSystem = createInstancedParticleMesh(engineCtx, CAPACITY_ADD_PARTICLES, {
    lit: false,
    tex: sparksAtlas,
    cols: SPARKS_ATLAS_COLS,
    rows: SPARKS_ATLAS_ROWS,
    renderOrder: 20
  });

  const litPool = new ParticlePool(CAPACITY_LIT_PARTICLES, true);
  const addPool = new ParticlePool(CAPACITY_ADD_PARTICLES - 160, false);
  const tracerPool = new BulletTracerPool(48);
  const debrisSystem = new DebrisPhysicsSystem(engineCtx, 256);
  const shellSystem = new SpentShellEjectionSystem(engineCtx, 60);
  const decalSystem = new ImpactDecalManager(engineCtx, 160);

  const rootGroup = new THREE.Group();
  rootGroup.name = 'fx';
  rootGroup.add(
    decalSystem.mesh,
    debrisSystem.mesh,
    shellSystem.mesh,
    litMeshSystem.mesh,
    addMeshSystem.mesh
  );
  scene.add(rootGroup);

  let globalTime = 0;
  let lastMuzzleFlashTime = -1;
  let lastTracerSmokeTime = -1;

  const getLightPool = () => engineCtx.render && engineCtx.render.lightPool;
  const flashLight = (pos, color, intensity, distance, duration) => {
    const lp = getLightPool();
    if (lp && lp.flash) lp.flash(pos, color, intensity, distance, duration);
  };

  // 阴影遮挡与地面高度探测
  function queryShadowVisibility(pos, normal) {
    const phys = engineCtx.physics;
    if (!phys || !phys.raycast) return 1.0;
    vTempPos.copy(pos);
    if (normal) vTempPos.addScaledVector(normal, 0.08);
    vTempPos.y += 0.03;
    let hit = null;
    try {
      hit = phys.raycast(vTempPos, SUN_CONFIG.dir, 90);
    } catch {
      hit = null;
    }
    return hit ? 0.2 : 1.0;
  }

  function queryFloorHeight(pos) {
    const phys = engineCtx.physics;
    if (!phys || !phys.raycast) return 0;
    vTempPos.copy(pos);
    vTempPos.y += 0.1;
    let hit = null;
    try {
      hit = phys.raycast(vTempPos, DOWN_VECTOR, 12);
    } catch {
      hit = null;
    }
    return hit ? hit.point.y : -50;
  }

  // 基础粒子发射函数
  function emitLitSmoke(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, alpha, shadowVis, drag, rise, windScale, frame) {
    const idx = litPool.emit(x, y, z, vx, vy, vz, life, s0, s1);
    if (idx < 0) return -1;
    litPool.r[idx] = r;
    litPool.g[idx] = g;
    litPool.b[idx] = b;
    litPool.a[idx] = alpha;
    litPool.shade[idx] = shadowVis;
    litPool.drag[idx] = drag;
    litPool.grav[idx] = -rise; // 向上浮力
    litPool.wind[idx] = windScale;
    litPool.turb[idx] = 0.5;
    litPool.rot[idx] = Math.random() * 6.283;
    litPool.rotv[idx] = (Math.random() - 0.5) * 1.2;
    litPool.frame[idx] = frame < 0 ? Math.floor(Math.random() * 6) : frame;
    litPool.fin[idx] = 0.06;
    litPool.fout[idx] = 0.3;
    litPool.sk[idx] = 2.5;
    return idx;
  }

  function emitAddSparkStreak(x, y, z, vx, vy, vz, life, size, r, g, b, flags) {
    const idx = addPool.emit(x, y, z, vx, vy, vz, life, size, size * 0.5);
    if (idx < 0) return -1;
    addPool.mode[idx] = PARTICLE_MODE_VELOCITY_STRETCH;
    addPool.frame[idx] = SPARK_FRAME_STREAK;
    addPool.stretch[idx] = 0.03;
    addPool.grav[idx] = 9.81;
    addPool.drag[idx] = 0.9;
    addPool.ramp[idx] = 1;
    addPool.r[idx] = r * 0.6;
    addPool.g[idx] = g * 0.6;
    addPool.b[idx] = b * 0.6;
    addPool.fout[idx] = 0.55;
    addPool.flags[idx] = flags;
    addPool.sk[idx] = 1;
    return idx;
  }

  function emitSparksCone(origin, normal, count, minSpeed, maxSpeed, spread, minLife, maxLife, r, g, b, flags) {
    for (let i = 0; i < count; i++) {
      randomVectorInCone(normal, spread, vTempAim);
      const spd = randomRange(minSpeed, maxSpeed) * (0.35 + 0.65 * Math.random());
      emitAddSparkStreak(
        origin.x, origin.y, origin.z,
        vTempAim.x * spd, vTempAim.y * spd, vTempAim.z * spd,
        randomRange(minLife, maxLife),
        randomRange(0.01, 0.02),
        r * randomRange(0.6, 1.2),
        g * randomRange(0.6, 1.2),
        b,
        flags
      );
    }
  }

  function emitStaticAddFlare(x, y, z, life, s0, s1, r, g, b, frame) {
    const idx = addPool.emit(x, y, z, 0, 0, 0, life, s0, s1);
    if (idx < 0) return -1;
    addPool.frame[idx] = frame;
    addPool.r[idx] = r;
    addPool.g[idx] = g;
    addPool.b[idx] = b;
    addPool.fout[idx] = 0.2;
    addPool.rot[idx] = Math.random() * 6.283;
    addPool.sk[idx] = 1.5;
    return idx;
  }

  function emitWaterRippleRing(x, y, z, life, s0, s1, r, g, b) {
    const idx = addPool.emit(x, y, z, 0, 0, 0, life, s0, s1);
    if (idx < 0) return -1;
    addPool.mode[idx] = PARTICLE_MODE_SURFACE_ALIGNED;
    addPool.frame[idx] = SPARK_FRAME_RIPPLE;
    addPool.r[idx] = r;
    addPool.g[idx] = g;
    addPool.b[idx] = b;
    addPool.fout[idx] = 0.15;
    addPool.fin[idx] = 0.08;
    addPool.sk[idx] = 2.2;
    addPool.rot[idx] = Math.random() * 6.283;
    return idx;
  }

  function emitFlyingDebrisChunks(origin, normal, count, minSpeed, maxSpeed, minSx, maxSx, minSy, maxSy, minSz, maxSz, r, g, b, spread, floorY) {
    for (let i = 0; i < count; i++) {
      randomVectorInCone(normal, spread, vTempAim);
      const spd = randomRange(minSpeed, maxSpeed);
      const colMult = randomRange(0.8, 1.15);
      debrisSystem.add(
        origin.x + vTempAim.x * 0.02,
        origin.y + vTempAim.y * 0.02,
        origin.z + vTempAim.z * 0.02,
        vTempAim.x * spd,
        vTempAim.y * spd + 0.8,
        vTempAim.z * spd,
        randomRange(minSx, maxSx),
        randomRange(minSy, maxSy),
        randomRange(minSz, maxSz),
        r * colMult,
        g * colMult,
        b * colMult,
        randomRange(3.5, 6),
        floorY
      );
    }
  }

  // ==========================================================================
  // 公共视觉特效接口 (Public Emitter API)
  // ==========================================================================

  function sparks(pos, normal, count = 12) {
    vTempNorm.copy(normal || UP_VECTOR);
    if (vTempNorm.lengthSq() < 1e-6) vTempNorm.copy(UP_VECTOR);
    vTempNorm.normalize();

    emitSparksCone(pos, vTempNorm, count, 5, 18, 0.6, 0.15, 0.5, 36, 22, 9, PARTICLE_FLAG_BOUNCE_FLOOR);
    emitStaticAddFlare(pos.x, pos.y, pos.z, 0.05, 0.2, 0.35, 10, 6.5, 3, SPARK_FRAME_SOFT_DOT);
  }

  function smoke(pos, opts = {}) {
    const size = opts.size || 1;
    const life = opts.life || 2.5;
    const rise = opts.rise === undefined ? 0.6 : opts.rise;
    const col = parseColorToArray(opts.color, 0.32, 0.32, 0.33);
    const vel = opts.vel;
    const shadowVis = queryShadowVisibility(pos, null);
    const count = opts.count || 3;

    for (let i = 0; i < count; i++) {
      emitLitSmoke(
        pos.x + (Math.random() - 0.5) * 0.2 * size,
        pos.y + (Math.random() - 0.5) * 0.2 * size,
        pos.z + (Math.random() - 0.5) * 0.2 * size,
        (vel ? vel.x : 0) + (Math.random() - 0.5) * 0.4,
        (vel ? vel.y : 0) + Math.random() * 0.3,
        (vel ? vel.z : 0) + (Math.random() - 0.5) * 0.4,
        life * randomRange(0.75, 1.2),
        size * 0.3,
        size * randomRange(1, 1.5),
        col[0], col[1], col[2],
        opts.alpha || 0.4,
        shadowVis, 1.2, rise, 1, -1
      );
    }
  }

  function dust(pos, normal, scale = 1, r = 0.5, g = 0.48, b = 0.45) {
    vTempNorm.copy(normal || UP_VECTOR);
    if (vTempNorm.lengthSq() < 1e-6) vTempNorm.copy(UP_VECTOR);
    vTempNorm.normalize();

    const shadowVis = queryShadowVisibility(pos, vTempNorm);
    for (let i = 0; i < 8; i++) {
      randomVectorInCone(vTempNorm, 0.5, vTempAim);
      const spd = randomRange(1, 4.5) * scale;
      const colMult = randomRange(0.85, 1.1);
      emitLitSmoke(
        pos.x + vTempNorm.x * 0.03,
        pos.y + vTempNorm.y * 0.03,
        pos.z + vTempNorm.z * 0.03,
        vTempAim.x * spd,
        vTempAim.y * spd,
        vTempAim.z * spd,
        randomRange(0.5, 1.1),
        0.08 * scale,
        randomRange(0.35, 0.7) * scale,
        r * colMult, g * colMult, b * colMult,
        0.9, shadowVis, 3.5, 0.15, 0.6, i < 3 ? 7 : -1
      );
    }

    for (let i = 0; i < 2; i++) {
      emitLitSmoke(
        pos.x + vTempNorm.x * 0.15,
        pos.y + vTempNorm.y * 0.15,
        pos.z + vTempNorm.z * 0.15,
        vTempNorm.x * 0.5 + (Math.random() - 0.5) * 0.3,
        vTempNorm.y * 0.5 + 0.1,
        vTempNorm.z * 0.5 + (Math.random() - 0.5) * 0.3,
        randomRange(2.2, 3.6),
        0.25 * scale,
        randomRange(0.9, 1.5) * scale,
        r, g, b,
        0.28, shadowVis, 1.5, 0.1, 1, -1
      );
    }
    return shadowVis;
  }

  function debris(pos, optionsOrDir = {}, surfaceType = 'concrete', optionalCount = null) {
    let opts = optionsOrDir;
    if (optionsOrDir && optionsOrDir.isVector3) {
      opts = {
        normal: optionsOrDir,
        count: optionalCount || (typeof surfaceType === 'number' ? surfaceType : 6),
        mat: typeof surfaceType === 'string' ? surfaceType : 'concrete'
      };
    }

    let col;
    if (opts.color !== undefined) {
      col = parseColorToArray(opts.color, 0.4, 0.4, 0.4);
    } else if (opts.mat) {
      let m = null;
      try {
        m = typeof opts.mat === 'string' ? engineCtx.mats.get(opts.mat) : opts.mat;
      } catch {
        m = null;
      }
      col = parseColorToArray(m && m.color ? m.color : null, 0.4, 0.4, 0.4);
    } else {
      col = parseColorToArray(null, 0.4, 0.39, 0.37);
    }

    const sz = opts.size || 0.06;
    const spd = opts.speed || 5;
    vTempNorm.copy(opts.normal || UP_VECTOR).normalize();
    const count = Math.min(opts.count || 6, 40);

    emitFlyingDebrisChunks(
      pos, vTempNorm, count,
      spd * 0.4, spd * 1.3,
      sz * 0.4, sz * 1.2,
      sz * 0.3, sz * 0.9,
      sz * 0.4, sz * 1.2,
      col[0], col[1], col[2],
      opts.spread || 1,
      queryFloorHeight(pos)
    );
  }

  function splash(pos, scale = 1) {
    const shadowVis = queryShadowVisibility(pos, UP_VECTOR);
    const posY = pos.y;

    // 水柱与飞沫喷射
    for (let i = 0; i < 5; i++) {
      const dropSz = randomRange(0.35, 0.6) * scale;
      const idx = emitLitSmoke(
        pos.x + (Math.random() - 0.5) * 0.08 * scale,
        posY + 0.1 * scale,
        pos.z + (Math.random() - 0.5) * 0.08 * scale,
        (Math.random() - 0.5) * 0.5,
        randomRange(1.6, 2.8) * Math.sqrt(scale),
        (Math.random() - 0.5) * 0.5,
        randomRange(0.4, 0.65),
        dropSz * 0.3,
        dropSz,
        0.72, 0.78, 0.84, 0.95,
        shadowVis, 0.5, -7, 0, 6
      );
      if (idx >= 0) {
        litPool.rot[idx] = (Math.random() - 0.5) * 0.3;
        litPool.rotv[idx] = 0;
        litPool.turb[idx] = 0;
        litPool.sk[idx] = 3;
        litPool.fout[idx] = 0.4;
      }
    }

    for (let i = 0; i < 2; i++) {
      emitLitSmoke(
        pos.x, posY + 0.15 * scale, pos.z,
        (Math.random() - 0.5) * 0.6, 0.5, (Math.random() - 0.5) * 0.6,
        randomRange(0.7, 1.1),
        0.2 * scale, 0.7 * scale,
        0.7, 0.75, 0.8, 0.14,
        shadowVis, 2, 0, 0.8, -1
      );
    }

    // 水花飞溅微粒
    const rCol = 1.9 * shadowVis + 0.35;
    const gCol = 1.5 * shadowVis + 0.45;
    const bCol = 1.05 * shadowVis + 0.55;
    const dropletCount = Math.round(14 * Math.min(scale, 1.6));

    for (let i = 0; i < dropletCount; i++) {
      randomVectorInCone(UP_VECTOR, 0.75, vTempAim);
      const spd = randomRange(1.5, 4.8) * Math.sqrt(scale);
      const dIdx = addPool.emit(
        pos.x, posY + 0.03, pos.z,
        vTempAim.x * spd, Math.abs(vTempAim.y) * spd, vTempAim.z * spd,
        randomRange(0.5, 1),
        randomRange(0.012, 0.024),
        0.01
      );
      if (dIdx >= 0) {
        addPool.mode[dIdx] = PARTICLE_MODE_VELOCITY_STRETCH;
        addPool.frame[dIdx] = SPARK_FRAME_DROPLET;
        addPool.stretch[dIdx] = 0.012;
        addPool.grav[dIdx] = 9.81;
        addPool.drag[dIdx] = 0.4;
        addPool.r[dIdx] = rCol;
        addPool.g[dIdx] = gCol;
        addPool.b[dIdx] = bCol;
        addPool.fout[dIdx] = 0.7;
        addPool.flags[dIdx] = PARTICLE_FLAG_DIE_ON_FLOOR;
        addPool.sk[dIdx] = 1;
        addPool.gy[dIdx] = posY;
      }
    }

    // 扩散同心圆涟漪
    emitWaterRippleRing(pos.x, posY + 0.012, pos.z, 0.9, 0.12 * scale, 1.5 * scale, 0.3 * shadowVis + 0.08, 0.27 * shadowVis + 0.09, 0.22 * shadowVis + 0.1);
    const rip2 = emitWaterRippleRing(pos.x, posY + 0.012, pos.z, 1.3, 0.05 * scale, 1 * scale, 0.2 * shadowVis + 0.05, 0.18 * shadowVis + 0.06, 0.15 * shadowVis + 0.07);
    if (rip2 >= 0) addPool.fin[rip2] = 0.35;
  }

  function impact(point, normal, surface = 'concrete', dir = null, enemy = null) {
    vTempNorm.copy(normal || UP_VECTOR);
    if (vTempNorm.lengthSq() < 1e-6) vTempNorm.copy(UP_VECTOR);
    vTempNorm.normalize();

    if (dir && dir.lengthSq() > 1e-6) {
      vTempDir.copy(dir).normalize();
    } else {
      vTempDir.copy(vTempNorm).negate();
    }

    // 计算反射向量 (Reflect vector = dir - 2*(dir . norm)*norm)
    vTempReflect.copy(vTempDir).addScaledVector(vTempNorm, -2 * vTempDir.dot(vTempNorm)).normalize();
    vTempPoint.copy(point);

    if (enemy) surface = 'enemy';

    // 检查是否击中水坑
    if (surface !== 'enemy' && surface !== 'water' && vTempNorm.y > 0.7 && engineCtx.ground && engineCtx.ground.isPuddle) {
      try {
        if (engineCtx.ground.isPuddle(vTempPoint.x, vTempPoint.z) && vTempPoint.y < 0.08) {
          surface = 'water';
        }
      } catch {}
    }

    const camPos = engineCtx.camera ? engineCtx.camera.position : vTempCamPos.set(0, 0, 0);
    const isFar = camPos.distanceToSquared(vTempPoint) > 3025; // 55 米以外降低 LOD
    const lodScale = isFar ? 0.5 : 1.0;
    const nx = vTempNorm.x, ny = vTempNorm.y, nz = vTempNorm.z;

    switch (surface) {
      case 'metal': {
        vTempAim.copy(vTempReflect).addScaledVector(vTempNorm, 0.6).normalize();
        emitSparksCone(vTempPoint, vTempAim, Math.round(18 * lodScale), 6, 24, 0.55, 0.1, 0.38, 40, 25, 10.5, 0);
        emitSparksCone(vTempPoint, vTempAim, 2 + Math.floor(Math.random() * 2), 9, 18, 0.9, 0.7, 1.3, 32, 18, 7, PARTICLE_FLAG_BOUNCE_FLOOR);

        emitStaticAddFlare(vTempPoint.x + nx * 0.03, vTempPoint.y + ny * 0.03, vTempPoint.z + nz * 0.03, 0.05, 0.25, 0.45, 16, 11, 5.5, SPARK_FRAME_SOFT_DOT);
        emitStaticAddFlare(vTempPoint.x + nx * 0.04, vTempPoint.y + ny * 0.04, vTempPoint.z + nz * 0.04, 0.04, 0.35, 0.5, 9, 6, 2.6, SPARK_FRAME_STARBURST1 + Math.floor(Math.random() * 2));

        if (globalTime - lastMuzzleFlashTime > 0.09) {
          lastMuzzleFlashTime = globalTime;
          vTempCamPos.copy(vTempPoint).addScaledVector(vTempNorm, 0.12);
          flashLight(vTempCamPos, 0xffbe30, 10, 5, 0.05);
        }

        const shadowVis = queryShadowVisibility(vTempPoint, vTempNorm);
        for (let i = 0; i < 2; i++) {
          emitLitSmoke(
            vTempPoint.x + nx * 0.04, vTempPoint.y + ny * 0.04, vTempPoint.z + nz * 0.04,
            nx * 0.8 + (Math.random() - 0.5) * 0.5,
            ny * 0.8 + 0.2,
            nz * 0.8 + (Math.random() - 0.5) * 0.5,
            randomRange(0.5, 0.9), 0.06, randomRange(0.3, 0.5),
            0.4, 0.4, 0.41, 0.4, shadowVis, 2.5, 0.3, 0.8, -1
          );
        }

        if (!isFar) {
          emitFlyingDebrisChunks(vTempPoint, vTempNorm, 2, 1.5, 4, 0.012, 0.03, 0.003, 0.005, 0.01, 0.025, 0.2, 0.21, 0.23, 0.8, queryFloorHeight(vTempPoint));
        }
        decalSystem.add(vTempPoint, vTempNorm, 'bullet_metal');
        break;
      }

      case 'wood': {
        const shadowVis = dust(vTempPoint, vTempNorm, 0.75, 0.5, 0.42, 0.32);
        emitFlyingDebrisChunks(
          vTempPoint, vTempNorm, isFar ? 3 : 7, 2, 6,
          0.004, 0.009, 0.03, 0.1, 0.004, 0.012,
          0.62, 0.5, 0.33, 0.7, queryFloorHeight(vTempPoint)
        );
        if (shadowVis > 0.5 && Math.random() < 0.3) {
          emitStaticAddFlare(vTempPoint.x, vTempPoint.y, vTempPoint.z, 0.04, 0.1, 0.2, 3, 2, 1, SPARK_FRAME_SOFT_DOT);
        }
        decalSystem.add(vTempPoint, vTempNorm, 'bullet_wood');
        break;
      }

      case 'water': {
        splash(vTempPoint, 1);
        break;
      }

      case 'rubber':
      case 'dirt': {
        const shadowVis = queryShadowVisibility(vTempPoint, vTempNorm);
        const isDirt = surface === 'dirt';
        const rCol = isDirt ? 0.3 : 0.14;
        const gCol = isDirt ? 0.25 : 0.14;
        const bCol = isDirt ? 0.19 : 0.14;

        for (let i = 0; i < 5; i++) {
          randomVectorInCone(vTempNorm, 0.6, vTempAim);
          const spd = randomRange(0.6, 2.6);
          emitLitSmoke(
            vTempPoint.x + nx * 0.03, vTempPoint.y + ny * 0.03, vTempPoint.z + nz * 0.03,
            vTempAim.x * spd, vTempAim.y * spd, vTempAim.z * spd,
            randomRange(0.5, 1), 0.07, randomRange(0.3, 0.55),
            rCol, gCol, bCol, 0.85, shadowVis, 3.5, 0.1, 0.6, i < 2 ? 7 : -1
          );
        }

        emitFlyingDebrisChunks(
          vTempPoint, vTempNorm, 3, 1.5, 4,
          0.01, 0.03, 0.008, 0.02, 0.01, 0.03,
          rCol * 0.8, gCol * 0.8, bCol * 0.8, 0.7, queryFloorHeight(vTempPoint)
        );
        decalSystem.add(vTempPoint, vTempNorm, 'soot', 0.2, 1, 0.8);
        break;
      }

      case 'glass': {
        for (let i = 0; i < 12; i++) {
          randomVectorInCone(vTempNorm, 0.9, vTempAim);
          const spd = randomRange(1.5, 6);
          const dIdx = addPool.emit(
            vTempPoint.x, vTempPoint.y, vTempPoint.z,
            vTempAim.x * spd, vTempAim.y * spd, vTempAim.z * spd,
            randomRange(0.4, 0.9), randomRange(0.012, 0.02), 0.008
          );
          if (dIdx >= 0) {
            addPool.mode[dIdx] = PARTICLE_MODE_VELOCITY_STRETCH;
            addPool.frame[dIdx] = SPARK_FRAME_DROPLET;
            addPool.stretch[dIdx] = 0.01;
            addPool.grav[dIdx] = 9.81;
            addPool.r[dIdx] = 2.6;
            addPool.g[dIdx] = 2.7;
            addPool.b[dIdx] = 2.8;
            addPool.flags[dIdx] = PARTICLE_FLAG_DIE_ON_FLOOR;
            addPool.ramp[dIdx] = 3;
          }
        }

        emitFlyingDebrisChunks(
          vTempPoint, vTempNorm, 4, 1.5, 5,
          0.01, 0.03, 0.002, 0.004, 0.01, 0.03,
          0.62, 0.72, 0.74, 0.8, queryFloorHeight(vTempPoint)
        );
        emitLitSmoke(
          vTempPoint.x, vTempPoint.y, vTempPoint.z,
          nx * 0.6, ny * 0.6 + 0.2, nz * 0.6,
          0.6, 0.08, 0.4,
          0.75, 0.8, 0.82, 0.2,
          queryShadowVisibility(vTempPoint, vTempNorm),
          2.5, 0.2, 0.8, -1
        );
        decalSystem.add(vTempPoint, vTempNorm, 'bullet_glass');
        break;
      }

      case 'enemy': {
        vTempAim.copy(vTempReflect).addScaledVector(vTempNorm, 0.8).normalize();
        emitSparksCone(vTempPoint, vTempAim, Math.round(13 * lodScale), 5, 20, 0.9, 0.12, 0.45, 42, 29, 14, 0);
        emitSparksCone(vTempPoint, vTempAim, 2, 6, 12, 1.0, 0.6, 1.1, 32, 18, 7, PARTICLE_FLAG_BOUNCE_FLOOR);

        emitStaticAddFlare(vTempPoint.x, vTempPoint.y, vTempPoint.z, 0.06, 0.3, 0.55, 18, 12, 6, SPARK_FRAME_SOFT_DOT);
        emitStaticAddFlare(vTempPoint.x, vTempPoint.y, vTempPoint.z, 0.04, 0.3, 0.45, 8, 5, 2.4, SPARK_FRAME_STARBURST1 + Math.floor(Math.random() * 2));

        if (globalTime - lastMuzzleFlashTime > 0.09) {
          lastMuzzleFlashTime = globalTime;
          flashLight(vTempPoint, 0xff7000, 8, 4.5, 0.05);
        }

        const shadowVis = queryShadowVisibility(vTempPoint, vTempNorm);
        for (let i = 0; i < 2; i++) {
          emitLitSmoke(
            vTempPoint.x, vTempPoint.y, vTempPoint.z,
            nx * 0.5 + (Math.random() - 0.5) * 0.4,
            ny * 0.5 + 0.3,
            nz * 0.5 + (Math.random() - 0.5) * 0.4,
            randomRange(0.6, 1.1), 0.06, randomRange(0.3, 0.5),
            0.13, 0.13, 0.14, 0.65, shadowVis, 2.2, 0.5, 0.9, -1
          );
        }

        if (!isFar) {
          const isBloodSpark = Math.random() < 0.35;
          emitFlyingDebrisChunks(
            vTempPoint, vTempNorm, 3, 2, 6,
            0.012, 0.035, 0.004, 0.008, 0.012, 0.03,
            0.6, isBloodSpark ? 0.2 : 0.62, isBloodSpark ? 0.05 : 0.64,
            0.8, queryFloorHeight(vTempPoint)
          );
        }
        break;
      }

      default: {
        // 混凝土默认表面 (Concrete default)
        dust(vTempPoint, vTempNorm, 1, 0.52, 0.5, 0.47);
        emitFlyingDebrisChunks(
          vTempPoint, vTempNorm, isFar ? 2 : 4, 1.5, 5.5,
          0.012, 0.035, 0.008, 0.02, 0.012, 0.035,
          0.42, 0.41, 0.39, 0.7, queryFloorHeight(vTempPoint)
        );

        vTempAim.copy(vTempReflect).addScaledVector(vTempNorm, 0.7).normalize();
        for (let i = 0; i < 4; i++) {
          randomVectorInCone(vTempAim, 0.5, vTempAim);
          const spd = randomRange(3, 9);
          const sIdx = emitLitSmoke(
            vTempPoint.x, vTempPoint.y, vTempPoint.z,
            vTempAim.x * spd, vTempAim.y * spd, vTempAim.z * spd,
            randomRange(0.25, 0.45), 0.03, 0.09,
            0.6, 0.58, 0.54, 0.7, 1, 2, -6, 0.2, 7
          );
          if (sIdx >= 0) litPool.turb[sIdx] = 0;
        }

        if (Math.random() < 0.3) {
          emitSparksCone(vTempPoint, vTempAim, 3, 4, 10, 0.6, 0.08, 0.2, 26, 15, 6, 0);
        }
        decalSystem.add(vTempPoint, vTempNorm, 'bullet_concrete');
      }
    }
  }

  function tracer(fromPos, toPos, opts = {}) {
    const col = parseColorToArray(opts.color, 1, 0.8, 0.46);
    const intensity = opts.intensity || 16;
    tracerPool.add(
      fromPos, toPos,
      col[0] * intensity, col[1] * intensity, col[2] * intensity,
      opts.speed || 260,
      opts.width || 0.024
    );

    if (globalTime - lastTracerSmokeTime > 0.07 && opts.trail !== false) {
      lastTracerSmokeTime = globalTime;
      vTempAim.subVectors(toPos, fromPos);
      const dist = vTempAim.length();
      if (dist > 2) {
        vTempAim.multiplyScalar(1 / dist);
        const steps = 5;
        const maxDist = Math.min(dist, 7);
        const shadowVis = queryShadowVisibility(fromPos, null);
        for (let i = 0; i < steps; i++) {
          const stepDist = 0.6 + ((i + Math.random()) / steps) * (maxDist - 0.6);
          const tIdx = emitLitSmoke(
            fromPos.x + vTempAim.x * stepDist,
            fromPos.y + vTempAim.y * stepDist,
            fromPos.z + vTempAim.z * stepDist,
            vTempAim.x * 0.6, 0.05, vTempAim.z * 0.6,
            randomRange(0.45, 0.8), 0.04, randomRange(0.12, 0.2),
            0.6, 0.6, 0.62, 0.1, shadowVis, 2, 0.1, 0.7, -1
          );
          if (tIdx >= 0) litPool.fin[tIdx] = 0.25;
        }
      }
    }
  }

  function muzzleFlash(pos, dir, opts = {}) {
    const scale = opts.scale || 1;
    vTempAim.copy(dir || UP_VECTOR);
    if (vTempAim.lengthSq() < 1e-6) vTempAim.set(0, 0, -1);
    vTempAim.normalize();

    const col = parseColorToArray(opts.color, 1, 0.68, 0.32);
    const px = pos.x, py = pos.y, pz = pos.z;
    const cr = col[0], cg = col[1], cb = col[2];

    emitStaticAddFlare(px + vTempAim.x * 0.1 * scale, py + vTempAim.y * 0.1 * scale, pz + vTempAim.z * 0.1 * scale, 0.045, 0.75 * scale, 1.15 * scale, 34 * cr, 34 * cg, 34 * cb, SPARK_FRAME_STARBURST1);
    emitStaticAddFlare(px + vTempAim.x * 0.14 * scale, py + vTempAim.y * 0.14 * scale, pz + vTempAim.z * 0.14 * scale, 0.035, 0.5 * scale, 0.85 * scale, 22 * cr, 22 * cg, 22 * cb, SPARK_FRAME_STARBURST2);
    emitStaticAddFlare(px + vTempAim.x * 0.05 * scale, py + vTempAim.y * 0.05 * scale, pz + vTempAim.z * 0.05 * scale, 0.045, 0.13 * scale, 0.2 * scale, 22, 22 * (cg + 0.25), 22 * (cb + 0.3), SPARK_FRAME_SOFT_DOT);
    emitStaticAddFlare(px, py, pz, 0.05, 0.8 * scale, 1.1 * scale, 0.4 * cr, 0.4 * cg, 0.4 * cb, SPARK_FRAME_SOFT_DOT);

    const fIdx = addPool.emit(
      px + vTempAim.x * 0.4 * scale, py + vTempAim.y * 0.4 * scale, pz + vTempAim.z * 0.4 * scale,
      -vTempAim.x, -vTempAim.y, -vTempAim.z,
      0.04, 0.11 * scale, 0.14 * scale
    );
    if (fIdx >= 0) {
      addPool.mode[fIdx] = PARTICLE_MODE_VELOCITY_STRETCH;
      addPool.frame[fIdx] = SPARK_FRAME_TRACER_TIP;
      addPool.stretch[fIdx] = 0.9 * scale;
      addPool.r[fIdx] = 18 * cr;
      addPool.g[fIdx] = 18 * cg;
      addPool.b[fIdx] = 18 * cb;
      addPool.fout[fIdx] = 0.3;
    }

    for (let i = 0; i < 3; i++) {
      randomVectorInCone(vTempAim, 0.25, vTempNorm);
      const spd = randomRange(8, 22);
      emitAddSparkStreak(px, py, pz, vTempNorm.x * spd, vTempNorm.y * spd, vTempNorm.z * spd, randomRange(0.08, 0.22), 0.012, 30, 18, 7, 0);
    }

    emitLitSmoke(
      px + vTempAim.x * 0.2, py + vTempAim.y * 0.2, pz + vTempAim.z * 0.2,
      vTempAim.x * 1.5, vTempAim.y * 1.5 + 0.2, vTempAim.z * 1.5,
      randomRange(0.5, 0.9), 0.08 * scale, 0.45 * scale,
      0.5, 0.5, 0.52, 0.16, 1, 3, 0.3, 0.8, -1
    );

    vTempCamPos.copy(pos).addScaledVector(vTempAim, 0.25);
    flashLight(vTempCamPos, 0xff7000, 16 * scale, 7 * scale, 0.05);
  }

  function shell(gunPos, ejectVelocity) {
    shellSystem.add(gunPos, ejectVelocity);
  }

  const vExplosionEvent = { pos: new THREE.Vector3(), size: 1 };

  function explosion(pos, size = 1) {
    const scale = Math.max(0.4, Math.min(size, 4));
    const px = pos.x, py = pos.y, pz = pos.z;
    const sqrtScale = Math.sqrt(scale);
    const floorY = queryFloorHeight(pos);
    const nearGround = (py - floorY) < 1.4 * scale;
    const shadowVis = queryShadowVisibility(pos, UP_VECTOR);

    vTempCamPos.set(px, py + 0.4, pz);
    flashLight(vTempCamPos, 0xffe470, 320 * scale, 10 + 9 * scale, 0.08);
    flashLight(vTempCamPos, 0xff7010, 55 * scale, 8 + 6 * scale, 0.45);

    const centerY = py + 0.35 * scale;
    emitStaticAddFlare(px, centerY, pz, 0.055, 1.5 * scale, 2.3 * scale, 16, 13.5, 9.5, SPARK_FRAME_SOFT_DOT);
    emitStaticAddFlare(px, centerY, pz, 0.05, 2.6 * scale, 4.2 * scale, 7, 5, 2.4, SPARK_FRAME_STARBURST1 + Math.floor(Math.random() * 2));
    emitStaticAddFlare(px, centerY, pz, 0.3, 3.5 * scale, 5.5 * scale, 0.35, 0.2, 0.08, SPARK_FRAME_SOFT_DOT);

    // 火球膨胀火舌 (Fire lobes)
    const fireLobes = Math.round(13 + 5 * scale);
    for (let i = 0; i < fireLobes; i++) {
      randomVectorInCone(UP_VECTOR, 1.6, vTempAim);
      if (nearGround && vTempAim.y < -0.1) vTempAim.y = -vTempAim.y * 0.5;
      const spd = randomRange(2.2, 7.5) * sqrtScale;
      const colMult = randomRange(0.7, 1.15);
      const idx = litPool.emit(
        px + vTempAim.x * 0.3 * scale,
        centerY + vTempAim.y * 0.3 * scale,
        pz + vTempAim.z * 0.3 * scale,
        vTempAim.x * spd, vTempAim.y * spd + 1.4, vTempAim.z * spd,
        randomRange(0.55, 1.05), 0.85 * scale, randomRange(1.8, 2.7) * scale
      );
      if (idx >= 0) {
        litPool.frame[idx] = i % 4 === 0 ? 7 : Math.floor(Math.random() * 6);
        litPool.ramp[idx] = 2;
        litPool.r[idx] = 5.8 * colMult;
        litPool.g[idx] = 2.4 * colMult;
        litPool.b[idx] = 0.5 * colMult;
        litPool.a[idx] = 0.96;
        litPool.shade[idx] = 2 + shadowVis;
        litPool.drag[idx] = 4;
        litPool.grav[idx] = -2.6;
        litPool.wind[idx] = 0.6;
        litPool.turb[idx] = 1.5;
        litPool.rot[idx] = Math.random() * 6.283;
        litPool.rotv[idx] = (Math.random() - 0.5) * 2.5;
        litPool.sk[idx] = 3;
        litPool.fin[idx] = 0;
        litPool.fout[idx] = 0.6;
      }
    }

    // 内部高热核心发光体
    for (let i = 0; i < 5; i++) {
      randomVectorInCone(UP_VECTOR, 1.4, vTempAim);
      const spd = randomRange(2, 5) * sqrtScale;
      const pIdx = addPool.emit(
        px + vTempAim.x * 0.3 * scale,
        centerY + vTempAim.y * 0.3 * scale,
        pz + vTempAim.z * 0.3 * scale,
        vTempAim.x * spd, Math.abs(vTempAim.y) * spd + 1.2, vTempAim.z * spd,
        randomRange(0.3, 0.55), 0.6 * scale, randomRange(1.2, 1.8) * scale
      );
      if (pIdx >= 0) {
        addPool.frame[pIdx] = SPARK_FRAME_PLASMA;
        addPool.ramp[pIdx] = 2;
        addPool.r[pIdx] = 2.4;
        addPool.g[pIdx] = 1.1;
        addPool.b[pIdx] = 0.3;
        addPool.drag[pIdx] = 4;
        addPool.grav[pIdx] = -2.5;
        addPool.rot[pIdx] = Math.random() * 6.283;
        addPool.sk[pIdx] = 3;
        addPool.fout[pIdx] = 0.4;
      }
    }

    // 滚滚黑浓烟柱 (Thick black smoke columns)
    const smokePuffs = Math.round(11 + 5 * scale);
    for (let i = 0; i < smokePuffs; i++) {
      const isFast = (i % 2 === 0);
      randomVectorInCone(UP_VECTOR, 1.4, vTempAim);
      if (nearGround && vTempAim.y < 0) vTempAim.y = -vTempAim.y * 0.4;
      const spd = (isFast ? randomRange(4.5, 9) : randomRange(1.5, 5)) * sqrtScale;
      const gray = randomRange(0.04, 0.1);
      const rad = isFast ? 0.75 : 0.3;
      const sIdx = emitLitSmoke(
        px + vTempAim.x * rad * scale,
        centerY + vTempAim.y * rad * scale,
        pz + vTempAim.z * rad * scale,
        vTempAim.x * spd, vTempAim.y * spd + 0.8, vTempAim.z * spd,
        randomRange(2.8, 4.8), (isFast ? 0.8 : 1.2) * scale, randomRange(2.6, 4.2) * scale,
        gray, gray * 0.95, gray * 0.9,
        isFast ? 0.7 : 0.8, shadowVis, 3.4, randomRange(0.8, 1.7), 1, i % 3 === 0 ? 7 : -1
      );
      if (sIdx >= 0) {
        litPool.fin[sIdx] = isFast ? 0.025 : 0.16;
        litPool.fout[sIdx] = 0.35;
        litPool.turb[sIdx] = 1.2;
      }
    }

    // 产生地面持续余烟发射器
    spawnContinuousEmitter(px, py + 0.3 * scale, pz, 'smolder', 1.3 + 0.3 * scale, scale, shadowVis);

    // 高速火花飞溅 (High-velocity sparks)
    const sparkCount = Math.min(90, Math.round(34 * scale));
    for (let i = 0; i < sparkCount; i++) {
      randomVectorInCone(UP_VECTOR, 1.5, vTempAim);
      if (nearGround && vTempAim.y < 0) vTempAim.y = -vTempAim.y;
      const spd = randomRange(6, 26) * sqrtScale;
      const spkIdx = emitAddSparkStreak(
        px, py + 0.05, pz,
        vTempAim.x * spd, vTempAim.y * spd, vTempAim.z * spd,
        randomRange(0.5, 1.5), randomRange(0.014, 0.028),
        40, 23, 8, PARTICLE_FLAG_BOUNCE_FLOOR
      );
      if (spkIdx >= 0) {
        addPool.drag[spkIdx] = 1.4;
        addPool.stretch[spkIdx] = 0.035;
      }
    }

    // 漂浮慢火星余烬 (Floating embers)
    for (let i = 0; i < 10 * scale; i++) {
      randomVectorInCone(UP_VECTOR, 1.2, vTempAim);
      const spd = randomRange(1, 5);
      const eIdx = addPool.emit(
        px, py + 0.3, pz,
        vTempAim.x * spd, Math.abs(vTempAim.y) * spd + 1, vTempAim.z * spd,
        randomRange(1.4, 3), 0.035, 0.02
      );
      if (eIdx >= 0) {
        addPool.frame[eIdx] = SPARK_FRAME_SOFT_DOT;
        addPool.ramp[eIdx] = 3;
        addPool.r[eIdx] = 9;
        addPool.g[eIdx] = 4;
        addPool.b[eIdx] = 1;
        addPool.drag[eIdx] = 1.2;
        addPool.grav[eIdx] = 0.6;
        addPool.turb[eIdx] = 3;
        addPool.wind[eIdx] = 1;
        addPool.fout[eIdx] = 0.5;
      }
    }

    // 贴地冲击波扩散环与烧焦贴花
    if (nearGround) {
      const shockY = floorY + 0.015;
      emitWaterRippleRing(px, shockY, pz, 0.32, 0.6 * scale, 9 * scale, 1.6, 1.2, 0.75);

      const ringPuffs = Math.round(12 + 3 * scale);
      for (let i = 0; i < ringPuffs; i++) {
        const ang = ((i + Math.random()) / ringPuffs) * 6.283;
        const spd = randomRange(5, 10) * sqrtScale;
        const gray = randomRange(0.42, 0.55);
        const rIdx = emitLitSmoke(
          px + Math.cos(ang) * 0.4 * scale, shockY + 0.2, pz + Math.sin(ang) * 0.4 * scale,
          Math.cos(ang) * spd, randomRange(0.2, 0.9), Math.sin(ang) * spd,
          randomRange(1.2, 2.2), 0.4 * scale, randomRange(1.2, 1.9) * scale,
          gray, gray * 0.96, gray * 0.9, 0.26, shadowVis, 3, 0.15, 0.7, -1
        );
        if (rIdx >= 0) litPool.fin[rIdx] = 0.1;
      }

      vTempPos.set(px, floorY, pz);
      decalSystem.add(vTempPos, UP_VECTOR, 'scorch', 2.3 * scale, 1, 0.92);
    }

    // 爆炸重力石块飞溅
    vTempPos.set(px, Math.max(py, floorY + 0.1), pz);
    emitFlyingDebrisChunks(
      vTempPos, UP_VECTOR, Math.round(13 + 6 * scale), 4, 13 * sqrtScale,
      0.04, 0.13, 0.025, 0.08, 0.04, 0.13,
      0.07, 0.066, 0.062, 1.1, floorY
    );

    vExplosionEvent.pos.copy(pos);
    vExplosionEvent.size = size;
    engineCtx.events.emit('explosion', vExplosionEvent);
  }

  // ==========================================================================
  // 十二、 持续粒子发射器池 (Continuous Emitters)
  // ==========================================================================

  const continuousEmitters = [];
  for (let i = 0; i < 24; i++) {
    const emitter = {
      active: false,
      kind: 'steam',
      pos: new THREE.Vector3(),
      acc: 0,
      acc2: 0,
      ttl: Infinity,
      scale: 1,
      shade: 1,
      t: 0,
      light: null,
      drop: -1,
      stop() {
        emitter.active = false;
        if (emitter.light) {
          emitter.light.release();
          emitter.light = null;
        }
      },
      setPos(p) {
        emitter.pos.copy(p);
      }
    };
    continuousEmitters.push(emitter);
  }

  const dummyEmitter = {
    active: false,
    pos: new THREE.Vector3(),
    stop() {},
    setPos() {}
  };

  function spawnContinuousEmitter(x, y, z, kind, ttl, scale, shade) {
    let target = null;
    for (let i = 0; i < continuousEmitters.length; i++) {
      if (!continuousEmitters[i].active) {
        target = continuousEmitters[i];
        break;
      }
    }
    if (!target) return dummyEmitter;

    target.active = true;
    target.kind = kind;
    target.pos.set(x, y, z);
    target.acc = 0;
    target.acc2 = 0;
    target.ttl = ttl;
    target.scale = scale;
    target.t = 0;
    target.drop = -1;
    target.shade = shade === undefined ? queryShadowVisibility(target.pos, null) : shade;

    if (kind === 'fire') {
      const lp = getLightPool();
      target.light = lp && lp.acquire ? lp.acquire() : null;
      if (target.light) {
        target.light.light.color.set(0xff801a);
        target.light.light.distance = 9;
        target.light.light.position.set(x, y + 0.5, z);
      }
    }
    return target;
  }

  function addEmitter(pos, kind = 'steam', opts = {}) {
    return spawnContinuousEmitter(pos.x, pos.y, pos.z, kind, opts.ttl || Infinity, opts.scale || 1, undefined);
  }

  function updateContinuousEmitters(dt) {
    for (let i = 0; i < continuousEmitters.length; i++) {
      const em = continuousEmitters[i];
      if (!em.active) continue;

      em.t += dt;
      if (em.t > em.ttl) {
        em.stop();
        continue;
      }

      const px = em.pos.x, py = em.pos.y, pz = em.pos.z, sc = em.scale;

      if (em.kind === 'steam') {
        em.acc += dt * 13;
        while (em.acc > 1) {
          em.acc -= 1;
          const sIdx = emitLitSmoke(
            px + (Math.random() - 0.5) * 0.08, py, pz + (Math.random() - 0.5) * 0.08,
            (Math.random() - 0.5) * 0.4, randomRange(1.4, 2.4), (Math.random() - 0.5) * 0.4,
            randomRange(1.8, 3), 0.12 * sc, randomRange(0.8, 1.3) * sc,
            0.8, 0.82, 0.85, 0.2, em.shade, 1.3, 0.5, 1, -1
          );
          if (sIdx >= 0) {
            litPool.fin[sIdx] = 0.12;
            litPool.turb[sIdx] = 0.9;
          }
        }
      } else if (em.kind === 'smolder') {
        em.acc += dt * 9 * (1 - em.t / em.ttl);
        while (em.acc > 1) {
          em.acc -= 1;
          const gray = randomRange(0.05, 0.11);
          const sIdx = emitLitSmoke(
            px + (Math.random() - 0.5) * 0.5 * sc, py, pz + (Math.random() - 0.5) * 0.5 * sc,
            (Math.random() - 0.5) * 0.6, randomRange(1.2, 2.4), (Math.random() - 0.5) * 0.6,
            randomRange(2.4, 3.8), 0.5 * sc, randomRange(1.6, 2.6) * sc,
            gray, gray, gray, 0.6, em.shade, 1, 0.9, 1, -1
          );
          if (sIdx >= 0) {
            litPool.fin[sIdx] = 0.12;
            litPool.turb[sIdx] = 1;
          }
        }
      } else if (em.kind === 'embers') {
        em.acc += dt * 8;
        while (em.acc > 1) {
          em.acc -= 1;
          const eIdx = addPool.emit(
            px + (Math.random() - 0.5) * 0.4 * sc, py, pz + (Math.random() - 0.5) * 0.4 * sc,
            (Math.random() - 0.5) * 0.6, randomRange(0.6, 1.8), (Math.random() - 0.5) * 0.6,
            randomRange(1.5, 3.2), randomRange(0.02, 0.04), 0.012
          );
          if (eIdx >= 0) {
            addPool.frame[eIdx] = SPARK_FRAME_SOFT_DOT;
            addPool.ramp[eIdx] = 3;
            addPool.r[eIdx] = 10;
            addPool.g[eIdx] = 4.2;
            addPool.b[eIdx] = 1;
            addPool.drag[eIdx] = 0.8;
            addPool.grav[eIdx] = -0.5;
            addPool.turb[eIdx] = 3.5;
            addPool.wind[eIdx] = 1;
            addPool.fout[eIdx] = 0.5;
          }
        }
      } else if (em.kind === 'fire') {
        em.acc += dt * 24;
        while (em.acc > 1) {
          em.acc -= 1;
          const fIdx = addPool.emit(
            px + (Math.random() - 0.5) * 0.3 * sc, py + 0.1 * sc, pz + (Math.random() - 0.5) * 0.3 * sc,
            (Math.random() - 0.5) * 0.5, randomRange(1.2, 2.6) * sc, (Math.random() - 0.5) * 0.5,
            randomRange(0.35, 0.65), 0.45 * sc, randomRange(0.2, 0.35) * sc
          );
          if (fIdx >= 0) {
            addPool.frame[fIdx] = SPARK_FRAME_PLASMA;
            addPool.ramp[fIdx] = 2;
            addPool.r[fIdx] = 9;
            addPool.g[fIdx] = 5.5;
            addPool.b[fIdx] = 2.2;
            addPool.drag[fIdx] = 1;
            addPool.rot[fIdx] = Math.random() * 6.283;
            addPool.rotv[fIdx] = (Math.random() - 0.5) * 4;
            addPool.fin[fIdx] = 0.12;
            addPool.fout[fIdx] = 0.4;
            addPool.wind[fIdx] = 1;
            addPool.turb[fIdx] = 2;
          }
        }

        em.acc2 += dt * 4;
        while (em.acc2 > 1) {
          em.acc2 -= 1;
          const gray = randomRange(0.05, 0.1);
          const sIdx = emitLitSmoke(
            px, py + 0.8 * sc, pz,
            (Math.random() - 0.5) * 0.4, randomRange(1.2, 2), (Math.random() - 0.5) * 0.4,
            randomRange(2.2, 3.4), 0.3 * sc, randomRange(1.1, 1.8) * sc,
            gray, gray, gray, 0.5, em.shade, 0.9, 0.8, 1, -1
          );
          if (sIdx >= 0) {
            litPool.fin[sIdx] = 0.2;
            litPool.turb[sIdx] = 1;
          }

          const eIdx = addPool.emit(
            px + (Math.random() - 0.5) * 0.3, py + 0.3, pz + (Math.random() - 0.5) * 0.3,
            Math.random() - 0.5, randomRange(1.5, 3), Math.random() - 0.5,
            randomRange(1, 2.2), 0.03, 0.012
          );
          if (eIdx >= 0) {
            addPool.frame[eIdx] = SPARK_FRAME_SOFT_DOT;
            addPool.ramp[eIdx] = 3;
            addPool.r[eIdx] = 10;
            addPool.g[eIdx] = 4.2;
            addPool.b[eIdx] = 1;
            addPool.drag[eIdx] = 0.8;
            addPool.grav[eIdx] = -0.6;
            addPool.turb[eIdx] = 4;
            addPool.wind[eIdx] = 1;
          }
        }

        if (em.light) {
          em.light.light.intensity = (14 + 6 * Math.sin(em.t * 23) + 4 * Math.sin(em.t * 37.7)) * sc;
        }
      } else if (em.kind === 'drip') {
        em.acc += dt * 1.6;
        if (em.drop >= 0) {
          em.drop -= dt;
          if (em.drop < 0) {
            const sh = em.shade;
            emitWaterRippleRing(px, 0.014, pz, 0.8, 0.05, 0.55, 0.4 * sh + 0.14, 0.36 * sh + 0.16, 0.3 * sh + 0.18);
            for (let d = 0; d < 3; d++) {
              randomVectorInCone(UP_VECTOR, 0.7, vTempAim);
              const spd = addPool.emit(
                px, 0.03, pz,
                vTempAim.x * 1.2, Math.abs(vTempAim.y) * 1.6, vTempAim.z * 1.2,
                0.35, 0.012, 0.008
              );
              if (spd >= 0) {
                addPool.mode[spd] = PARTICLE_MODE_VELOCITY_STRETCH;
                addPool.frame[spd] = SPARK_FRAME_DROPLET;
                addPool.stretch[spd] = 0.012;
                addPool.grav[spd] = 9.81;
                addPool.r[spd] = 1.6 * sh + 0.3;
                addPool.g[spd] = 1.3 * sh + 0.4;
                addPool.b[spd] = 0.9 * sh + 0.5;
                addPool.flags[spd] = PARTICLE_FLAG_DIE_ON_FLOOR;
              }
            }
          }
        }

        while (em.acc > 1) {
          em.acc -= 1 + Math.random() * 0.6;
          const dropTime = Math.sqrt(2 * Math.max(py, 0.05) / 9.81);
          const dIdx = addPool.emit(px, py, pz, 0, -0.2, 0, dropTime + 0.05, 0.014, 0.014);
          if (dIdx >= 0) {
            addPool.mode[dIdx] = PARTICLE_MODE_VELOCITY_STRETCH;
            addPool.frame[dIdx] = SPARK_FRAME_DROPLET;
            addPool.stretch[dIdx] = 0.02;
            addPool.grav[dIdx] = 9.81;
            addPool.r[dIdx] = 1.4 * em.shade + 0.4;
            addPool.g[dIdx] = 1.2 * em.shade + 0.5;
            addPool.b[dIdx] = 0.9 * em.shade + 0.6;
            addPool.flags[dIdx] = PARTICLE_FLAG_DIE_ON_FLOOR;
            addPool.fout[dIdx] = 0.98;
          }
          em.drop = dropTime;
        }
      }
    }
  }

  // ==========================================================================
  // 十三、 事件总线绑定 (Event Bus Bindings)
  // ==========================================================================

  engineCtx.events.on('impact', (ev) => {
    if (!ev || !ev.point) return;
    impact(ev.point, ev.normal, ev.surface, ev.dir, ev.enemy);
  });

  const checkPuddle = (x, z) => {
    try {
      return Boolean(engineCtx.ground && engineCtx.ground.isPuddle && engineCtx.ground.isPuddle(x, z));
    } catch {
      return false;
    }
  };

  engineCtx.events.on('player:step', (ev) => {
    const pos = (ev && ev.pos) || (engineCtx.player && engineCtx.player.pos);
    if (pos && ((ev && ev.surface === 'water') || checkPuddle(pos.x, pos.z))) {
      vTempPos.set(pos.x, Math.max(0, pos.y), pos.z);
      splash(vTempPos, ev && ev.sprint ? 0.55 : 0.4);
    }
  });

  engineCtx.events.on('player:land', (ev) => {
    const pos = engineCtx.player && engineCtx.player.pos;
    if (pos) {
      vTempPos.set(pos.x, Math.max(0, pos.y), pos.z);
      if ((ev && ev.surface === 'water') || checkPuddle(pos.x, pos.z)) {
        splash(vTempPos, 0.9);
      } else if (ev && ev.speed > 5) {
        const shadowVis = queryShadowVisibility(vTempPos, UP_VECTOR);
        for (let i = 0; i < 6; i++) {
          const ang = Math.random() * 6.283;
          emitLitSmoke(
            vTempPos.x + Math.cos(ang) * 0.2,
            vTempPos.y + 0.08,
            vTempPos.z + Math.sin(ang) * 0.2,
            Math.cos(ang) * 1.6, 0.3, Math.sin(ang) * 1.6,
            randomRange(0.7, 1.2), 0.15, randomRange(0.5, 0.8),
            0.45, 0.44, 0.42, 0.22,
            shadowVis, 3, 0.1, 0.8, -1
          );
        }
      }
    }
  });

  // ==========================================================================
  // 十四、 主更新循环与生命周期 (Update Loop & Clear)
  // ==========================================================================

  function update(dt) {
    if (dt <= 0) dt = 0;
    globalTime += dt;
    updateContinuousEmitters(dt);

    const camPos = engineCtx.camera ? engineCtx.camera.position : vTempCamPos.set(0, 0, 0);

    litMeshSystem.begin();
    litPool.update(dt, litMeshSystem, camPos, windDir, globalTime);
    litMeshSystem.end();

    addMeshSystem.begin();
    addPool.update(dt, addMeshSystem, camPos, windDir, globalTime);
    tracerPool.update(dt, addMeshSystem, SPARK_FRAME_TRACER_TIP, SPARK_FRAME_SOFT_DOT);
    addMeshSystem.end();

    debrisSystem.update(dt);
    shellSystem.update(dt);
  }

  function clear() {
    litPool.clear();
    addPool.clear();
    tracerPool.clear();
    debrisSystem.clear();
    shellSystem.clear();
    decalSystem.clear();
    for (const em of continuousEmitters) {
      if (em.active) em.stop();
    }
    litMeshSystem.begin();
    litMeshSystem.end();
    addMeshSystem.begin();
    addMeshSystem.end();
  }

  return {
    update,
    clear,
    muzzleFlash,
    tracer,
    impact,
    sparks,
    smoke,
    dust,
    explosion,
    shell,
    splash,
    addEmitter,
    debris,
    decal(pos, normal, type = 'bullet_concrete', size) {
      vTempNorm.copy(normal || UP_VECTOR);
      decalSystem.add(pos, vTempNorm, type, size);
    },
    wind: windDir,
    root: rootGroup,
    stats() {
      return {
        lit: litPool.n,
        add: addPool.n,
        tracers: tracerPool.n,
        debris: debrisSystem.live,
        drawCalls: 5
      };
    }
  };
}

// ============================================================================
// 十五、 特效独立陈列与基准展示模式 (Showcase Environment)
// ============================================================================

export function showcaseFX(engineCtx) {
  const fx = engineCtx.fx;
  const showMode = engineCtx.params.fxshow || 'all';
  const showcaseGroup = new THREE.Group();

  const spawnTargetMesh = (geometry, matName, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, engineCtx.mats.get(matName));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    showcaseGroup.add(mesh);
    return mesh;
  };

  // 靶场靶标 (Target props: concrete slab, blue metal container wall, wooden pallet)
  spawnTargetMesh(createBoxBevelGeometry(2.6, 2.2, 0.3, 0.02), 'concrete', -3.2, 1.1, 0);
  spawnTargetMesh(createBoxBevelGeometry(2.2, 2.0, 0.08, 0.01), 'paint_blue', 0, 1.0, 0);
  spawnTargetMesh(createBoxBevelGeometry(1.2, 1.2, 1.2, 0.015), 'wood_pallet', 3.2, 0.6, 0);

  engineCtx.scene.add(showcaseGroup);
  engineCtx.physics.addBox([-4.5, 0, -0.15], [-1.9, 2.2, 0.15], { surface: 'concrete' });
  engineCtx.physics.addBox([-1.1, 0, -0.04], [1.1, 2.0, 0.04], { surface: 'metal' });
  engineCtx.physics.addBox([2.6, 0, -0.6], [3.8, 1.2, 0.6], { surface: 'wood' });

  const pLeftGun  = new THREE.Vector3(-6.5, 1.5, 7);
  const pRightGun = new THREE.Vector3(6.5, 1.4, 7);
  const pTargetGun = new THREE.Vector3(5.2, 1.3, 3.2);
  const pEjectPos  = new THREE.Vector3(-4.6, 1.35, 4.2);

  const vTargetPoint = new THREE.Vector3();
  const vRayDir      = new THREE.Vector3();
  const vTracerEnd   = new THREE.Vector3();
  const vMuzzlePos   = new THREE.Vector3(0, 1.3, 3);
  const vMuzzleDir   = new THREE.Vector3(1, 0, 0);

  const impactData = {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    surface: 'concrete',
    dir: new THREE.Vector3(),
    enemy: null,
    from: 'player'
  };

  const rnd = Math.random;
  let elapsed = 0;
  let shotIndex = 0;
  let gunAlt = 0;
  let explosionCounter = 0;
  let impactTimer = 0;
  let tracerTimer = 0.2;
  let shellTimer = 0;
  let explosionTimer = 3.4;
  let warmedUp = false;

  const showImpacts = showMode === 'all' || showMode === 'impact';
  const showExplosions = showMode === 'all' || showMode === 'explosion';
  const showTracers = showMode === 'all' || showMode === 'tracer';
  const explosionInterval = showMode === 'explosion' ? 2.4 : 3.5;

  if (showMode === 'explosion') explosionTimer = 0.6;

  if (showMode === 'all' || showMode === 'impact') {
    fx.addEmitter(new THREE.Vector3(-6.2, 0.05, -1.5), 'steam');
    fx.addEmitter(new THREE.Vector3(5.6, 0, 1.6), 'fire');
    fx.addEmitter(new THREE.Vector3(0.4, 2.6, 1.6), 'drip');
  }

  function fireSimulatedImpact(targetSlot) {
    const gunOrigin = (gunAlt++ % 2) ? pRightGun : pLeftGun;
    impactData.enemy = null;
    impactData.from = 'player';

    if (targetSlot === 5) {
      // 模拟击中敌方机械体
      impactData.point.set(-1.5 + rnd() * 0.3, 2.5 + rnd() * 0.3, 0.8);
      impactData.normal.copy(gunOrigin).sub(impactData.point).normalize();
      impactData.surface = 'enemy';
      impactData.enemy = {};
      impactData.dir.copy(impactData.point).sub(gunOrigin).normalize();
      fx.tracer(gunOrigin, impactData.point);
      engineCtx.events.emit('impact', impactData);
      return;
    }

    if (targetSlot === 0) {
      vTargetPoint.set(-3.2 + (rnd() - 0.5) * 2, 0.4 + rnd() * 1.5, 0);
    } else if (targetSlot === 1 || targetSlot === 7) {
      vTargetPoint.set((rnd() - 0.5) * 1.8, 0.3 + rnd() * 1.5, 0);
    } else if (targetSlot === 2) {
      vTargetPoint.set(3.2 + (rnd() - 0.5) * 0.9, 0.2 + rnd() * 0.9, 0.6);
    } else if (targetSlot === 3) {
      vTargetPoint.set(-1.6 + (rnd() - 0.5) * 1.2, 0, 2.2 + rnd());
    } else if (targetSlot === 4) {
      vTargetPoint.set(1.5 + (rnd() - 0.5) * 0.8, 0, 2.6 + rnd() * 0.8);
    } else {
      vTargetPoint.set(3.4 + (rnd() - 0.5), 0, 2.4 + rnd() * 0.6);
    }

    vRayDir.copy(vTargetPoint).sub(gunOrigin).normalize();
    const hit = engineCtx.physics.raycast(gunOrigin, vRayDir, 100);
    if (hit) {
      impactData.point.copy(hit.point);
      impactData.normal.copy(hit.normal);
      impactData.dir.copy(vRayDir);
      impactData.surface = targetSlot === 4 ? 'water' : targetSlot === 6 ? 'dirt' : hit.surface;
      fx.tracer(gunOrigin, impactData.point);
      engineCtx.events.emit('impact', impactData);
    }
  }

  const holdMode = engineCtx.params.fxhold;

  function updateShowcase(dt) {
    elapsed += dt;

    if (holdMode === 'muzzle') {
      fx.muzzleFlash(vMuzzlePos, vMuzzleDir, { scale: 1 });
      vMuzzlePos.x = 2.5;
      vMuzzleDir.set(-0.5, 0, 0.86);
      fx.muzzleFlash(vMuzzlePos, vMuzzleDir, { scale: 1.6 });
      vMuzzlePos.x = 0;
      vMuzzleDir.set(1, 0, 0);
    }

    if (showImpacts) {
      impactTimer -= dt;
      while (impactTimer <= 0) {
        impactTimer += showMode === 'impact' ? 0.09 : 0.13;
        fireSimulatedImpact(shotIndex++ % 8);
      }
    }

    if (showTracers) {
      tracerTimer -= dt;
      if (tracerTimer <= 0) {
        tracerTimer += showMode === 'tracer' ? 0.16 : 0.45;
        vTracerEnd.set(-5 + rnd() * 3, 1.2 + rnd() * 0.8, 6 + rnd() * 2);
        vRayDir.copy(vTracerEnd).sub(pTargetGun).normalize();
        fx.muzzleFlash(pTargetGun, vRayDir, { scale: 1 });
        fx.tracer(pTargetGun, vTracerEnd, { color: 0xff4c02, speed: 120 });
        if (showMode === 'tracer') {
          vTracerEnd.set(6, 1 + rnd() * 1.5, -6 - rnd() * 6);
          vTargetPoint.set(-7, 1.6, 6.5);
          fx.tracer(vTargetPoint, vTracerEnd, { speed: 200 });
        }
      }

      shellTimer -= dt;
      if (shellTimer <= 0) {
        shellTimer += 0.22;
        vTracerEnd.set(1.6 + rnd() * 0.8, 1.6 + rnd() * 0.8, 0.4 + (rnd() - 0.5) * 0.8);
        fx.shell(pEjectPos, vTracerEnd);
      }
    }

    if (showExplosions) {
      explosionTimer -= dt;
      if (explosionTimer <= 0) {
        explosionTimer += explosionInterval;
        const explSize = Number(engineCtx.params.fxsize || 0) || (1 + (explosionCounter++ % 3));
        vTracerEnd.set(showMode === 'explosion' ? 0 : 7, 0.25, showMode === 'explosion' ? 3.5 : -3.5);
        fx.explosion(vTracerEnd, explSize);
      }
    }
  }

  let isFrozen = false;
  const originalUpdate = fx.update;
  fx.update = (dt) => {
    if (!isFrozen) originalUpdate(dt);
  };

  const hookSetShot = window.__setShot;
  if (hookSetShot) {
    window.__setShot = (shotData) => {
      if (shotData && shotData.fxage !== undefined) {
        fx.clear();
        vTracerEnd.set(0, 0.25, 3.5);
        fx.explosion(vTracerEnd, Number(shotData.fxsize || 1.2));
        const age = Number(shotData.fxage);
        for (let t = 0; t < age - 1e-6; t += 1 / 60) {
          originalUpdate(1 / 60);
        }
        originalUpdate(0);
        isFrozen = true;
      }
      hookSetShot(shotData);
    };
  }

  return {
    cam: showMode === 'explosion' ? [0, 2, 12.5] : [0.3, 1.6, 7.2],
    target: showMode === 'explosion' ? [0, 2.2, 3.5] : [0.2, 1, 0],
    update(dt) {
      if (!warmedUp) {
        warmedUp = true;
        const prewarmTime = Number(engineCtx.params.fxt || 0);
        for (let t = 0; t < prewarmTime; t += 1 / 30) {
          updateShowcase(1 / 30);
          fx.update(1 / 30);
        }
      }
      if (!isFrozen) updateShowcase(dt);
    }
  };
}

// ============================================================================
// 十六、 模块导出 (ESM Exports)
// ============================================================================

export const create = createFXManager;
export const showcase = showcaseFX;

export const Sv = {
  create: createFXManager,
  showcase: showcaseFX
};

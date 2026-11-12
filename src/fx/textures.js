/**
 * ============================================================================
 * 3A-GAME Visual Effects Engine - Procedural Textures & Shaders (fx/textures.js)
 * 程序化图集生成器与 GPU 粒子着色器
 * ============================================================================
 */

import * as THREE from "three";

// ============================================================================
// 一、 物理常量与粒子标志位 (Constants & Particle Flags)
// ============================================================================

export const PARTICLE_FLAG_BOUNCE_FLOOR = 1; // 撞击地面弹跳 (Bounce on floor contact)
export const PARTICLE_FLAG_DIE_ON_FLOOR = 2; // 接触地面消亡 (Despawn on floor contact)
export const PARTICLE_FLAG_STICK_FLOOR = 4; // 接触地面停滞 (Stick on floor)

// 粒子朝向模式 (Particle Alignment Modes)
export const PARTICLE_MODE_BILLBOARD = 0; // 面向相机的公告板
export const PARTICLE_MODE_VELOCITY_STRETCH = 1; // 沿速度方向拉伸的线带/流光
export const PARTICLE_MODE_SURFACE_ALIGNED = 2; // 平行于碰撞表面的贴花/涟漪

// 图集网格划分 (Atlas Grid Layouts)
export const SMOKE_ATLAS_COLS = 4;
export const SMOKE_ATLAS_ROWS = 2;

export const SPARKS_ATLAS_COLS = 4;
export const SPARKS_ATLAS_ROWS = 2;

// 火花图集帧索引 (Sparks Frame Indices)
export const SPARK_FRAME_SOFT_DOT = 0; // 柔和发光圆点
export const SPARK_FRAME_STREAK = 1; // 速度拉伸线段
export const SPARK_FRAME_STARBURST1 = 2; // 多芒放射火花 1
export const SPARK_FRAME_STARBURST2 = 3; // 多芒放射火花 2
export const SPARK_FRAME_RIPPLE = 4; // 水面同心涟漪
export const SPARK_FRAME_PLASMA = 5; // 电浆激光光斑
export const SPARK_FRAME_DROPLET = 6; // 雨滴与溅射微粒
export const SPARK_FRAME_TRACER_TIP = 7; // 曳光弹尖端辉光

// 贴花图集网格与贴图映射
export const DECAL_ATLAS_COLS = 4;
export const DECAL_ATLAS_ROWS = 2;

export const DECAL_TYPE_FRAMES = {
  bullet_metal: [0, 1], // 金属弹坑与火花刮痕
  bullet_concrete: [2, 3], // 混凝土粉碎性弹孔
  bullet_wood: [4], // 木质纤维碎裂孔
  scorch: [5], // 高温爆炸烧焦黑斑
  soot: [6], // 烟熏粉尘附着
  bullet_glass: [7], // 玻璃放射状碎纹
};

export const DECAL_DEFAULT_SIZES = {
  bullet_metal: 0.18,
  bullet_concrete: 0.28,
  bullet_wood: 0.22,
  scorch: 1.8,
  soot: 0.45,
  bullet_glass: 0.35,
};

// 平滑插值 (Smoothstep helper)
export function smoothstep(edge0, edge1, x) {
  let t = (x - edge0) / (edge1 - edge0);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}

// 范围随机数
export function randomRange(min, max) {
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
        const u = ((px + 0.5) / frameSize) * 2 - 1;
        const v = ((py + 0.5) / frameSize) * 2 - 1;
        const edgeFade = 1 - smoothstep(0.78, 0.98, Math.max(Math.abs(u), Math.abs(v)));
        let alphaVal, coreVal, densityVal;

        if (frame === 6) {
          // 向上对流火舌形态 (Convective flame lobe)
          const vy = v * 0.5 + 0.5;
          const lobeWidth = 0.16 + 0.5 * vy * vy;
          const wobble = (noiseGen.fbm(u * 2 + offsetX, vy * 2 + offsetY, 3) - 0.5) * 0.25;
          const horizFade = 1 - smoothstep(lobeWidth * 0.3, lobeWidth, Math.abs(u + wobble * vy));
          const fbmDetail = noiseGen.fbm(u * 9 + offsetX, vy * 2.2 + offsetY, 4);
          const vertFade =
            1 - smoothstep(0.55, 0.95, vy - (noiseGen.noise(u * 6 + offsetX, 3.3) - 0.5) * 0.35);
          const baseCut = smoothstep(0, 0.12, vy);
          alphaVal =
            horizFade * vertFade * baseCut * smoothstep(0.22, 0.7, fbmDetail + 0.25 * (1 - vy));
          coreVal = horizFade * vertFade;
          densityVal = alphaVal * 0.5;
        } else {
          // 典型翻滚膨胀烟团 (Puffy billowing cloud)
          const isLobe7 = frame === 7;
          const curlScale = isLobe7 ? 0.3 : 0.6;
          const curlX = (noiseGen.fbm(u * 1.4 + offsetX, v * 1.4 + offsetY, 3) - 0.5) * curlScale;
          const curlY =
            (noiseGen.fbm(u * 1.4 + offsetY + 5.2, v * 1.4 + offsetX + 1.7, 3) - 0.5) * curlScale;
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

        pixelData[outOffset] = Math.min(255, Math.max(0, (0.5 - dX * 0.5) * 255));
        pixelData[outOffset + 1] = Math.min(255, Math.max(0, (0.5 - dY * 0.5) * 255));
        pixelData[outOffset + 2] = Math.min(255, bufNormalY[pIndex] * 255);
        pixelData[outOffset + 3] = Math.min(255, bufDensity[pIndex] * 255);
      }
    }
  }

  const texture = new THREE.DataTexture(
    pixelData,
    atlasWidth,
    atlasHeight,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
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
        intensity: 0.5 + noiseGen.rnd() * 0.5,
      });
    }
    return rays;
  });

  for (let frame = 0; frame < 8; frame++) {
    const colIdx = frame % SPARKS_ATLAS_COLS;
    const rowIdx = Math.floor(frame / SPARKS_ATLAS_COLS);

    for (let py = 0; py < frameSize; py++) {
      for (let px = 0; px < frameSize; px++) {
        const u = ((px + 0.5) / frameSize) * 2 - 1;
        const v = ((py + 0.5) / frameSize) * 2 - 1;
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
              brightness +=
                ray.intensity *
                Math.exp(-(perpDist * perpDist) / (ray.width * ray.width)) *
                Math.max(0, 1 - dist / ray.length);
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
          const droplet =
            Math.exp(-dist * dist * 40) +
            Math.exp(-Math.pow(Math.abs(v - 0.2), 2) * 20) * Math.max(0, 1 - u * u * 4);
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

        pixelData[outOffset] = clampedVal;
        pixelData[outOffset + 1] = clampedVal;
        pixelData[outOffset + 2] = clampedVal;
        pixelData[outOffset + 3] = 255;
      }
    }
  }

  const texture = new THREE.DataTexture(
    pixelData,
    atlasWidth,
    atlasHeight,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
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

  const canvasAlbedo = document.createElement("canvas");
  canvasAlbedo.width = atlasWidth;
  canvasAlbedo.height = atlasHeight;
  const ctxAlbedo = canvasAlbedo.getContext("2d");

  const canvasORM = document.createElement("canvas");
  canvasORM.width = atlasWidth;
  canvasORM.height = atlasHeight;
  const ctxORM = canvasORM.getContext("2d");

  const canvasNorm = document.createElement("canvas");
  canvasNorm.width = atlasWidth;
  canvasNorm.height = atlasHeight;
  const ctxNorm = canvasNorm.getContext("2d");

  // 背景初始化
  ctxAlbedo.clearRect(0, 0, atlasWidth, atlasHeight);
  ctxORM.fillStyle = "rgb(0, 235, 0)"; // Roughness = 0.92, Metalness = 0
  ctxORM.fillRect(0, 0, atlasWidth, atlasHeight);
  ctxNorm.fillStyle = "rgb(128, 128, 255)"; // Normal facing out +Z
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
      grad.addColorStop(0, "rgba(10, 10, 12, 1)");
      grad.addColorStop(0.2, "rgba(30, 32, 36, 0.95)");
      grad.addColorStop(0.35, "rgba(180, 190, 205, 0.8)");
      grad.addColorStop(0.65, "rgba(40, 35, 30, 0.4)");
      grad.addColorStop(1, "rgba(20, 20, 20, 0)");
      ctxAlbedo.fillStyle = grad;
      ctxAlbedo.beginPath();
      ctxAlbedo.arc(0, 0, radius, 0, Math.PI * 2);
      ctxAlbedo.fill();

      // ORM: 金属剥落高反光边缘
      const gradORM = ctxORM.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 0.5);
      gradORM.addColorStop(0, "rgb(0, 180, 128)");
      gradORM.addColorStop(1, "rgb(0, 240, 0)");
      ctxORM.fillStyle = gradORM;
      ctxORM.beginPath();
      ctxORM.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
      ctxORM.fill();
    } else if (frame === 2 || frame === 3) {
      // 混凝土爆裂坑 (Concrete Spall: jagged crater, pulverized white dust center)
      ctxAlbedo.fillStyle = "rgba(20, 20, 20, 0.95)";
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
      dustGrad.addColorStop(0, "rgba(180, 175, 170, 0.6)");
      dustGrad.addColorStop(0.5, "rgba(120, 115, 110, 0.3)");
      dustGrad.addColorStop(1, "rgba(90, 85, 80, 0)");
      ctxAlbedo.fillStyle = dustGrad;
      ctxAlbedo.beginPath();
      ctxAlbedo.arc(0, 0, radius, 0, Math.PI * 2);
      ctxAlbedo.fill();
    } else if (frame === 4) {
      // 木材撕裂孔 (Wood splintered hole: elliptical grain fracture)
      ctxAlbedo.fillStyle = "rgba(15, 10, 5, 0.95)";
      ctxAlbedo.beginPath();
      ctxAlbedo.ellipse(0, 0, radius * 0.25, radius * 0.65, 0, 0, Math.PI * 2);
      ctxAlbedo.fill();

      const woodGrad = ctxAlbedo.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 0.8);
      woodGrad.addColorStop(0, "rgba(60, 40, 20, 0.7)");
      woodGrad.addColorStop(1, "rgba(40, 25, 10, 0)");
      ctxAlbedo.fillStyle = woodGrad;
      ctxAlbedo.beginPath();
      ctxAlbedo.ellipse(0, 0, radius * 0.5, radius * 0.9, 0, 0, Math.PI * 2);
      ctxAlbedo.fill();
    } else if (frame === 5) {
      // 高温烧焦灼斑 (Explosion Scorch: soft feathered black burn)
      const burnGrad = ctxAlbedo.createRadialGradient(0, 0, 0, 0, 0, radius * 0.95);
      burnGrad.addColorStop(0, "rgba(5, 5, 5, 0.92)");
      burnGrad.addColorStop(0.4, "rgba(18, 16, 14, 0.7)");
      burnGrad.addColorStop(0.75, "rgba(35, 30, 25, 0.25)");
      burnGrad.addColorStop(1, "rgba(20, 18, 16, 0)");
      ctxAlbedo.fillStyle = burnGrad;
      ctxAlbedo.beginPath();
      ctxAlbedo.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
      ctxAlbedo.fill();
    } else if (frame === 6) {
      // 细颗粒烟粉附着 (Soot soot-puff)
      const sootGrad = ctxAlbedo.createRadialGradient(0, 0, 0, 0, 0, radius * 0.85);
      sootGrad.addColorStop(0, "rgba(25, 25, 27, 0.85)");
      sootGrad.addColorStop(0.5, "rgba(35, 35, 38, 0.35)");
      sootGrad.addColorStop(1, "rgba(30, 30, 32, 0)");
      ctxAlbedo.fillStyle = sootGrad;
      ctxAlbedo.beginPath();
      ctxAlbedo.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
      ctxAlbedo.fill();
    } else {
      // 玻璃蛛网放射纹 (Glass Bullet Spider Fracture)
      ctxAlbedo.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctxAlbedo.beginPath();
      ctxAlbedo.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
      ctxAlbedo.fill();

      ctxAlbedo.strokeStyle = "rgba(220, 235, 255, 0.65)";
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
    },
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
export const FX_LIT_FRAGMENT_SHADER =
  GLSL_SOFT_FADE +
  `
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
export const FX_ADD_FRAGMENT_SHADER =
  GLSL_SOFT_FADE +
  `
void main() {
  float t = texture2D(uTex, vUv).r;
  float k = t * vCol.a * softFade();
  if (k < 0.002) discard;

  gl_FragColor = vec4(vCol.rgb * k, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

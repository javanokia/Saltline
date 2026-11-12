/**
 * ============================================================================
 * 3A-GAME Visual Effects Engine - Particle & Tracer Pools (fx/pools.js)
 * GPU 实例化网格封装、SoA 粒子对象池与超音速弹道曳光流
 * ============================================================================
 */

import * as THREE from "three";
import {
  PARTICLE_FLAG_BOUNCE_FLOOR,
  PARTICLE_FLAG_DIE_ON_FLOOR,
  PARTICLE_FLAG_STICK_FLOOR,
  PARTICLE_MODE_BILLBOARD,
  PARTICLE_MODE_VELOCITY_STRETCH,
  PARTICLE_MODE_SURFACE_ALIGNED,
  FX_VERTEX_SHADER,
  FX_LIT_FRAGMENT_SHADER,
  FX_ADD_FRAGMENT_SHADER,
} from "./textures.js";

const vDrawSize = new THREE.Vector2();

// ============================================================================
// 一、 实例化网格封装 (Instanced Particle Mesh Builder)
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
    ambHi = new THREE.Vector3(0.5, 0.5, 0.5),
  } = options;

  const quadGeom = new THREE.InstancedBufferGeometry();
  quadGeom.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]),
      3,
    ),
  );
  quadGeom.setIndex([0, 1, 2, 0, 2, 3]);

  const createInstAttr = (name) => {
    const attr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    attr.setUsage(THREE.DynamicDrawUsage);
    quadGeom.setAttribute(name, attr);
    return attr;
  };

  const attrPos = createInstAttr("aPos");
  const attrAxis = createInstAttr("aAxis");
  const attrCol = createInstAttr("aCol");
  const attrMisc = createInstAttr("aMisc");
  quadGeom.instanceCount = 0;

  const uniforms = {
    uTex: { value: tex },
    uAtlas: { value: new THREE.Vector2(cols, rows) },
    uPx: { value: 0.001 },
    uDepth: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uNearFar: { value: new THREE.Vector2(0.08, 900) },
    uSoft: { value: 0 },
  };

  if (lit) {
    Object.assign(uniforms, {
      uSun: { value: sun },
      uSunDir: { value: sunDir },
      uAmbLo: { value: ambLo },
      uAmbHi: { value: ambHi },
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
    blendDstAlpha: THREE.OneFactor,
  });
  material.name = lit ? "fx_lit" : "fx_add";

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
    if (
      depthTex &&
      depthTex.image &&
      camera === engineCtx.camera &&
      renderSys.depthTextureIsLive !== true &&
      engineCtx.params.fxsoft !== "0"
    ) {
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

      arrPos[offset] = px;
      arrPos[offset + 1] = py;
      arrPos[offset + 2] = pz;
      arrPos[offset + 3] = size;

      arrAxis[offset] = ax;
      arrAxis[offset + 1] = ay;
      arrAxis[offset + 2] = az;
      arrAxis[offset + 3] = roll;

      arrCol[offset] = r;
      arrCol[offset + 1] = g;
      arrCol[offset + 2] = b;
      arrCol[offset + 3] = a;

      arrMisc[offset] = frame;
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
    },
  };

  return instanceSystem;
}

// ============================================================================
// 二、 粒子对象池 SoA (ParticlePool - Structure of Arrays)
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
    const cx = camPos.x,
      cy = camPos.y,
      cz = camPos.z;
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
      let axisX = 0,
        axisY = 0,
        axisZ = 0;
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

      if (
        !instanceSystem.push(
          px[idx],
          py[idx],
          pz[idx],
          currSize,
          axisX,
          axisY,
          axisZ,
          this.rot[idx],
          rCol,
          gCol,
          bCol,
          alphaVal,
          this.frame[idx],
          pMode,
          normAge,
          this.shade[idx],
        )
      ) {
        break;
      }
    }
  }
}

// ============================================================================
// 三、 弹道曳光流 (BulletTracerPool)
// ============================================================================

const TRACER_PROPS = [
  "fx",
  "fy",
  "fz",
  "dx",
  "dy",
  "dz",
  "dist",
  "speed",
  "trav",
  "len",
  "width",
  "r",
  "g",
  "b",
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
        this.trav[i] = Math.min(
          totalDist,
          spd * Math.max(dt, 0.008) * (0.35 + Math.random() * 0.4),
        );
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
        midX,
        midY,
        midZ,
        w,
        dX * segLen,
        dY * segLen,
        dZ * segLen,
        0,
        rCol,
        gCol,
        bCol,
        1,
        streakFrame,
        PARTICLE_MODE_VELOCITY_STRETCH,
        0,
        5,
      );

      // 2. 外部膨胀柔光光晕 (Outer bloom ribbon)
      instanceSystem.push(
        midX,
        midY,
        midZ,
        w * 6,
        dX * segLen * 1.05,
        dY * segLen * 1.05,
        dZ * segLen * 1.05,
        0,
        rCol * 0.04,
        gCol * 0.032,
        bCol * 0.028,
        1,
        streakFrame,
        PARTICLE_MODE_VELOCITY_STRETCH,
        0,
        28,
      );

      // 3. 弹头点状耀斑 (Tracer tip flare)
      instanceSystem.push(
        this.fx[i] + dX * tipPos,
        this.fy[i] + dY * tipPos,
        this.fz[i] + dZ * tipPos,
        w * 5,
        0,
        1,
        0,
        0,
        rCol * 0.2,
        gCol * 0.16,
        bCol * 0.12,
        1,
        dotFrame,
        PARTICLE_MODE_BILLBOARD,
        0,
        1,
      );
    }
    this.n = count;
  }
}

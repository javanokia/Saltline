/**
 * ============================================================================
 * 3A-GAME Visual Effects Engine - Debris & Shell Physics (fx/debris.js)
 * 物理碎屑破片与黄铜弹壳动力学系统
 * ============================================================================
 */

import * as THREE from "three";

// 局部临时计算缓存 (Scratch Vectors & Matrices)
const vTempPos = new THREE.Vector3();
const vTempAim = new THREE.Vector3();
const vTempOffset = new THREE.Vector3();
const mTempMatrix = new THREE.Matrix4();
const qTempQuat = new THREE.Quaternion();
const eTempEuler = new THREE.Euler();
const DOWN_VECTOR = new THREE.Vector3(0, -1, 0);

// ============================================================================
// 一、 物理碎屑与破片 (DebrisPhysicsSystem)
// ============================================================================

/**
 * 创建非对称抖动的刚体几何破片 (Jittered Debris Shrapnel Box)
 */
export function createDebrisGeometry() {
  let geom = new THREE.BoxGeometry(1, 1, 1, 2, 1, 2);
  const pos = geom.attributes.position;
  let seed = 1234.5;
  const hash = () => {
    seed = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
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
      metalness: 0.05,
    });
    material.name = "fx_debris";

    const instMesh = new THREE.InstancedMesh(createDebrisGeometry(), material, capacity);
    instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 3).fill(1),
      3,
    );
    instMesh.frustumCulled = false;
    instMesh.castShadow = false;
    instMesh.receiveShadow = true;
    instMesh.name = "fx_debris";

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
    colArr[idx * 3] = r;
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
// 二、 抛壳物理系统 (SpentShellEjectionSystem)
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
    [0.0031, 0.04472],
  ];
  const latheGeom = new THREE.LatheGeometry(
    profile.map((p) => new THREE.Vector2(p[0], p[1] - 0.052 / 2)),
    10,
  );
  latheGeom.computeVertexNormals();
  return latheGeom;
}

const vShellBounceEvent = { pos: new THREE.Vector3(), surface: "concrete" };

export class SpentShellEjectionSystem {
  constructor(engineCtx, capacity = 60) {
    this.ctx = engineCtx;
    this.cap = capacity;
    this.next = 0;

    let brassMat = null;
    try {
      brassMat = engineCtx.mats.get("brass");
    } catch {
      brassMat = null;
    }
    if (!brassMat || !brassMat.isMaterial) {
      brassMat = new THREE.MeshStandardMaterial({
        color: 0xb08d5c,
        roughness: 0.3,
        metalness: 1.0,
      });
    }

    const instMesh = new THREE.InstancedMesh(createShellCartridgeGeometry(), brassMat, capacity);
    instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instMesh.frustumCulled = false;
    instMesh.castShadow = false;
    instMesh.receiveShadow = true;
    instMesh.name = "fx_shells";

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
    this.surface = new Array(capacity).fill("concrete");

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
    this.surface[idx] = "concrete";
    if (phys && phys.raycast) {
      vTempPos.set(this.px[idx], this.py[idx] + 0.25, this.pz[idx]);
      const hit = phys.raycast(vTempPos, DOWN_VECTOR, 6);
      if (hit) {
        this.floor[idx] = hit.point.y;
        this.surface[idx] = hit.surface || "concrete";
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
        const wx = this.wx[i],
          wy = this.wy[i],
          wz = this.wz[i];
        const qx = this.qx[i],
          qy = this.qy[i],
          qz = this.qz[i],
          qw = this.qw[i];
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
            this.ctx.events.emit("shell:bounce", vShellBounceEvent);
          }

          if (this.vy[i] > -0.9 || bounceCount >= 4) {
            // 静止平躺着地
            st[i] = 2;
            this.vx[i] = this.vy[i] = this.vz[i] = 0;
            eTempEuler.set(Math.PI / 2, 0, Math.random() * 6.28, "ZXY");
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

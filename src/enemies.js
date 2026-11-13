import * as THREE from "three";

import { createSeededRandom } from "./constants.js";
import { mergeGeometries } from "./geo.js";
import { GULL_CONFIG, buildGullRig, createGull } from "./enemies/gull.js";
import { HOUND_CONFIG, buildHoundRig, createHound } from "./enemies/hound.js";

// Three.js 类与枚举别名映射（仅保留本模块使用的类型）
const {
  Vector3: W,
  Quaternion: Lt,
  Matrix4: Ye,
  Group: wt,
  MeshBasicMaterial: Nn,
  DoubleSide: Sn,
  ShaderMaterial: zn,
  Color: Ve,
  AdditiveBlending: hr,
  Object3D: on,
  CylinderGeometry: Ys,
  InstancedMesh: Sr,
  DynamicDrawUsage: bo,
  Timer: gp,
} = THREE;

// 子模块短别名适配（对齐下文调用）
const Zv = GULL_CONFIG;
const j_ = buildGullRig;
const Q_ = createGull;
const Z_ = buildHoundRig;
const Kv = HOUND_CONFIG;
const iM = createHound;

var ex = {};
const _M = Object.defineProperty;
const br = (i, e) => {
  for (var t in e) _M(i, t, { get: e[t], enumerable: true });
};
br(ex, { TUNE: () => Ui, create: () => Em, showcase: () => VC });

const TUNE = {
  gull: Zv, // 机械飞鸥专属数值配置
  hound: Kv, // 机械猎犬专属数值配置
  sightRange: 45, // 基础视觉感知半径 (米)
  sightCone: 200, // 视野广角锥度 (度)
  loseSight: 4, // 脱离视线后维持交火目标倒计时 (秒)
  searchTime: 8, // 到达最后目击点后的搜寻时间 (秒)
  hearRadius: 45, // 枪声/爆炸声听觉警觉半径 (米)
  maxTokens: 2, // 默认并发射击许可令牌数 (防止多敌同时齐射集火秒杀玩家)
  maxTokensCrowd: 3, // 群体包围战况下的并发攻击令牌数
  tokenGap: 1.25, // 两次攻击令牌发放之间的最小硬冷却 (秒)
  exposureUp: 0.1, // 视线暴露值递增速率 (秒^-1)
  exposureDown: 0.45, // 脱离视线暴露值衰减速率
  poolGulls: 10, // 机械飞鸥对象池容量
  poolHounds: 8, // 机械猎犬对象池容量
  maxWrecks: 5, // 场景中保留的最大残骸数量
  maxBolts: 32, // 场景中飞行的等离子脉冲弹丸最大并发数
};

const Ui = TUNE;
const SIGHT_CONE_COS = Math.cos(((TUNE.sightCone / 2) * Math.PI) / 180);

// 临时计算变量
const vTemp1 = new W();
const vTemp2 = new W();
const vTempDir = new W();
const qTempRot = new Lt();
const mTempMatrix = new Ye();
const vUnitScale = new W(1, 1, 1);
const VEC_Z_FORWARD = new W(0, 0, 1);
const VEC_Y_DOWN = new W(0, -1, 0);
const vPlayerFeet = new W();
const vPlayerHead = new W();

/**
 * 创建敌方单位群落总管理器 (Enemies Hive Manager)
 * 统一调度机械飞鸥与猎犬的 AI 决策、并发攻击令牌、射线击中判定、等离子弹丸渲染与探照灯
 * @param {object} ctx 全局引擎上下文
 */
async function createEnemiesManager(ctx) {
  const rng = createSeededRandom(+((ctx.params && ctx.params.eseed) || 9001));
  const activeEnemies = [];
  const activeWrecks = [];

  const rootGroup = new wt();
  rootGroup.name = "enemies";
  ctx.scene.add(rootGroup);

  // 预热发光与装甲着色材质
  const whiteMat = ctx.mats.emissive(0xffffff, 1);
  const glowMat = whiteMat && whiteMat.isMeshBasicMaterial ? whiteMat.clone() : new Nn();
  glowMat.color.setRGB(1, 1, 1);
  glowMat.vertexColors = true;
  glowMat.needsUpdate = true;

  const orangeEmissive = ctx.mats.emissive(0xffa000, 6);
  const lensBaseMat =
    orangeEmissive && orangeEmissive.isMeshBasicMaterial
      ? orangeEmissive
      : new Nn({ color: 0xffa000 });

  const isToneMapped = whiteMat && whiteMat.toneMapped !== undefined ? whiteMat.toneMapped : true;

  const enemyMaterials = {
    shell: ctx.mats.get("armor_white", { triplanar: true, vertexColors: true }),
    metal: ctx.mats.get("gunmetal", { triplanar: true, vertexColors: true }),
    glow: glowMat,
    lensBase: lensBaseMat,
    disc: new Nn({
      color: 0x0c0c0f,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: Sn,
      toneMapped: isToneMapped,
    }),
    cone: new zn({
      uniforms: {
        uColor: { value: new Ve(1, 0.9, 0.74) },
        uGain: { value: 0.085 },
      },
      vertexShader: `
        #include <common>
        #include <skinning_pars_vertex>
        varying float vT; varying vec3 vN; varying vec3 vV;
        void main() {
          #include <beginnormal_vertex>
          #include <skinbase_vertex>
          #include <skinnormal_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
          vN = normalMatrix * objectNormal; vV = -mv.xyz; vT = 1.0 - uv.y;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uGain;
        varying float vT; varying vec3 vN; varying vec3 vV;
        void main() {
          float f = abs(dot(normalize(vN), normalize(vV)));
          f = f * f * (3.0 - 2.0 * f);
          float t = clamp(vT, 0.0, 1.0);
          float k = pow(1.0 - t, 1.7) * (0.35 + 0.65 * smoothstep(0.0, 0.06, t));
          gl_FragColor = vec4(uColor * (uGain * f * k), 1.0);
        }`,
      transparent: true,
      blending: hr,
      depthWrite: false,
      side: Sn,
      fog: false,
    }),
  };

  // 群落共享运行时上下文
  const hiveContext = {
    G: ctx,
    rng,
    list: activeEnemies,
    t: 0,
    playerSpeed: 0,
    tokens: 0,
    tokenT: -9,
    lastType: "",
    wantT: { gull: -9, hound: -9 },
    mergeSimple: (geos) => mergeGeometries(geos, false),

    /**
     * 申请射击/突袭许可令牌 (Token Management)
     * 控制同一时刻对玩家开火的敌人数，防止不可避伤害
     */
    requestToken(enemy) {
      if (enemy.hasToken) return true;
      let aliveCount = 0;
      for (const e of activeEnemies) if (e.alive) aliveCount++;

      const maxAllowed = aliveCount > 5 ? TUNE.maxTokensCrowd : TUNE.maxTokens;
      const timeSinceLastToken = hiveContext.t - hiveContext.tokenT;
      const otherType = enemy.type === "gull" ? "hound" : "gull";
      const isRepeatedTypeTooFast =
        hiveContext.lastType === enemy.type &&
        hiveContext.t - hiveContext.wantT[otherType] < 0.5 &&
        timeSinceLastToken < TUNE.tokenGap * 2.2;

      if (
        hiveContext.tokens >= maxAllowed ||
        timeSinceLastToken < TUNE.tokenGap ||
        isRepeatedTypeTooFast
      ) {
        hiveContext.wantT[enemy.type] = hiveContext.t;
        return false;
      }

      hiveContext.tokens++;
      hiveContext.tokenT = hiveContext.t;
      hiveContext.lastType = enemy.type;
      enemy.hasToken = true;
      return true;
    },

    releaseToken(enemy) {
      if (enemy.hasToken) {
        enemy.hasToken = false;
        hiveContext.tokens = Math.max(0, hiveContext.tokens - 1);
      }
    },

    /**
     * 敌方感知思考 (Line of Sight & State Transitions)
     */
    think(enemy, dt, seeThreshold) {
      const player = ctx.player;
      if (enemy.passive || !player) {
        enemy.los = false;
        return;
      }

      enemy.senseT -= dt;
      if (enemy.senseT <= 0) {
        enemy.senseT = 0.11 + rng() * 0.08;
        let canSee = false;

        if (player.alive !== false) {
          const eyePos = player.eye || player.pos;
          const dx = eyePos.x - enemy.sensor.x;
          const dy = eyePos.y - enemy.sensor.y;
          const dz = eyePos.z - enemy.sensor.z;
          const dist = Math.hypot(dx, dy, dz);

          if (dist < TUNE.sightRange) {
            const planarDist = Math.hypot(dx, dz) || 1e-4;
            const facingDot = (dx * enemy.fwd.x + dz * enemy.fwd.z) / planarDist;
            if (enemy.mode === "engage" || facingDot > SIGHT_CONE_COS || dist < 3.5) {
              canSee = ctx.physics.lineOfSight(enemy.sensor, eyePos);
            }
          }
        }
        enemy.los = canSee;
      }

      if (enemy.los) {
        enemy.seeT += dt;
        enemy.noSeeT = 0;
        enemy.lastKnown.copy(player.pos);
        enemy.exposure = Math.min(1, enemy.exposure + dt * TUNE.exposureUp);
      } else {
        enemy.noSeeT += dt;
        enemy.seeT = Math.max(0, enemy.seeT - dt * 0.6);
        enemy.exposure = Math.max(0, enemy.exposure - dt * TUNE.exposureDown);
      }

      if (enemy.mode === "engage") {
        if (enemy.noSeeT > TUNE.loseSight || player.alive === false) {
          enemy.mode = "search";
          enemy.modeT = TUNE.searchTime + rng() * 3;
          hiveContext.releaseToken(enemy);
        }
      } else if (
        enemy.los &&
        enemy.seeT > (enemy.mode === "patrol" ? seeThreshold : seeThreshold * 0.45)
      ) {
        enemy.mode = "engage";
        enemy.noSeeT = 0;
        ctx.events.emit("enemy:alert", { enemy });
        hiveContext.rally(enemy.pos, 18, player.pos, enemy);
      } else if (enemy.mode !== "patrol") {
        enemy.modeT -= dt;
        if (enemy.modeT <= 0) {
          enemy.mode = "patrol";
          enemy.home.x = enemy.pos.x;
          enemy.home.z = enemy.pos.z;
        }
      }
    },

    rally(origin, radius, targetPos, caller) {
      for (const e of activeEnemies) {
        if (e === caller || !e.alive || e.passive || e.mode === "engage") continue;
        if (e.pos.distanceToSquared(origin) > radius * radius) continue;
        e.lastKnown.copy(targetPos);
        e.mode = "investigate";
        e.modeT = 9 + rng() * 4;
      }
    },

    provoke(enemy) {
      const player = ctx.player;
      if (!player || enemy.passive || !enemy.alive) return;
      if (enemy.mode !== "engage") {
        enemy.lastKnown.copy(player.pos);
        enemy.mode = "investigate";
        enemy.modeT = 10;
        enemy.seeT = 1;
        enemy.senseT = 0;
      }
      hiveContext.rally(enemy.pos, 20, player.pos, enemy);
    },

    fireBolt(origin, dir) {
      let freeBolt = null;
      for (let i = 0; i < boltPool.length; i++) {
        if (!boltPool[i].on) {
          freeBolt = boltPool[i];
          break;
        }
      }
      if (freeBolt) {
        freeBolt.on = true;
        freeBolt.life = 1.3;
        freeBolt.pos.copy(origin);
        freeBolt.dir.copy(dir);
        freeBolt.from.copy(origin);
        freeBolt.len = 0;
      }
    },

    addWreck(enemy) {
      activeWrecks.push(enemy);
      while (activeWrecks.length > TUNE.maxWrecks) {
        const oldest = activeWrecks.shift();
        if (oldest.active) oldest.sink = 0.001;
      }
    },

    retire(enemy) {
      enemy._deactivate();
      const idxList = activeEnemies.indexOf(enemy);
      if (idxList >= 0) activeEnemies.splice(idxList, 1);
      const idxWreck = activeWrecks.indexOf(enemy);
      if (idxWreck >= 0) activeWrecks.splice(idxWreck, 1);
    },
  };

  // 预生成程序化 3D 骨架模型
  const gullRigDef = j_();
  const houndRigDef = Z_();

  // 初始化对象池
  const gullPool = [];
  const houndPool = [];

  for (let i = 0; i < TUNE.poolGulls; i++) {
    const gull = Q_(hiveContext, gullRigDef, enemyMaterials, i);
    gullPool.push(gull);
    rootGroup.add(gull.rig.group);
  }

  for (let i = 0; i < TUNE.poolHounds; i++) {
    const hound = iM(hiveContext, houndRigDef, enemyMaterials, i);
    houndPool.push(hound);
    rootGroup.add(hound.rig.group);
  }

  // 等离子脉冲弹丸对象池与 InstancedMesh 批量渲染
  const boltPool = [];
  for (let i = 0; i < TUNE.maxBolts; i++) {
    boltPool.push({
      on: false,
      life: 0,
      len: 0,
      pos: new W(),
      dir: new W(),
      from: new W(),
    });
  }

  const boltGeo = new Ys(0.016, 0.03, 1, 6, 1);
  boltGeo.rotateX(Math.PI / 2);
  boltGeo.translate(0, 0, -0.5);

  const boltEmissive = ctx.mats.emissive(0xff681a, 14);
  const boltMat =
    boltEmissive && boltEmissive.isMeshBasicMaterial
      ? boltEmissive
      : new Nn({ color: new Ve(0xff681a).multiplyScalar(14) });

  const boltInstancedMesh = new Sr(boltGeo, boltMat, TUNE.maxBolts);
  boltInstancedMesh.frustumCulled = false;
  boltInstancedMesh.castShadow = false;
  boltInstancedMesh.receiveShadow = false;
  boltInstancedMesh.count = 0;
  boltInstancedMesh.instanceMatrix.setUsage(bo);
  rootGroup.add(boltInstancedMesh);

  const impactEventData = {
    point: new W(),
    normal: new W(),
    dist: 0,
    surface: "concrete",
    enemy: null,
    part: null,
    dir: new W(),
    from: "enemy",
  };

  /**
   * 等离子弹丸每帧物理步进与碰撞判定
   */
  function updateBolts(dt) {
    const player = ctx.player;
    let visibleCount = 0;

    for (let i = 0; i < boltPool.length; i++) {
      const bolt = boltPool[i];
      if (!bolt.on) continue;

      const stepDist = TUNE.gull.boltSpeed * dt;
      bolt.life -= dt;

      // 场景射线检测
      const envHit = ctx.physics.raycast(bolt.pos, bolt.dir, stepDist);
      const effectiveDist = envHit ? envHit.dist : stepDist;

      let hitPlayer = false;
      if (player && player.alive !== false) {
        vTemp1.copy(bolt.pos).addScaledVector(bolt.dir, effectiveDist);
        vPlayerFeet.set(player.pos.x, player.pos.y + 0.35, player.pos.z);
        vPlayerHead.set(player.pos.x, player.pos.y + (player.crouching ? 1.0 : 1.5), player.pos.z);

        // 检测弹丸线段与玩家中轴线段最近距离
        if (segmentSegmentDistanceSq(bolt.pos, vTemp1, vPlayerFeet, vPlayerHead) < 0.36 * 0.36) {
          hitPlayer = true;
        }
      }

      if (hitPlayer) {
        player.damage(TUNE.gull.boltDamage, bolt.from);
        bolt.on = false;
        continue;
      }

      if (envHit) {
        impactEventData.point.copy(envHit.point);
        impactEventData.normal.copy(envHit.normal);
        impactEventData.dist = envHit.dist;
        impactEventData.surface = envHit.surface;
        impactEventData.dir.copy(bolt.dir);
        ctx.events.emit("impact", impactEventData);
        bolt.on = false;
        continue;
      }

      if (bolt.life <= 0) {
        bolt.on = false;
        continue;
      }

      bolt.pos.addScaledVector(bolt.dir, stepDist);
      bolt.len = Math.min(1.5, bolt.len + stepDist);

      qTempRot.setFromUnitVectors(VEC_Z_FORWARD, bolt.dir);
      vUnitScale.set(1, 1, Math.max(0.2, bolt.len));
      mTempMatrix.compose(bolt.pos, qTempRot, vUnitScale);
      boltInstancedMesh.setMatrixAt(visibleCount++, mTempMatrix);
    }

    if (visibleCount || boltInstancedMesh.count) {
      boltInstancedMesh.count = visibleCount;
      boltInstancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  // 飞鸥动态探照灯分配
  let spotlightHolder = null;
  let spotlightAcquired = false;
  let spotlightTimer = 0;
  const vSpotTarget = new W();
  let spotFactor = 0;

  function updateSearchlight(dt) {
    if (!spotlightAcquired) {
      spotlightAcquired = true;
      try {
        spotlightHolder =
          ctx.render && ctx.render.lightPool && ctx.render.lightPool.acquire
            ? ctx.render.lightPool.acquire()
            : null;
      } catch (e) {
        spotlightHolder = null;
      }
      if (spotlightHolder && spotlightHolder.light) {
        spotlightHolder.light.color.setRGB(1, 0.9, 0.75);
        spotlightHolder.light.distance = 9;
      }
    }

    if (!spotlightHolder || !spotlightHolder.light) return;

    let nearestGull = null;
    let minCamDistSq = 3600;
    const camPos = ctx.camera ? ctx.camera.position : null;

    for (const enemy of activeEnemies) {
      if (enemy.type !== "gull" || !enemy.alive) continue;
      const dSq = camPos ? enemy.pos.distanceToSquared(camPos) : 0;
      if (dSq < minCamDistSq) {
        minCamDistSq = dSq;
        nearestGull = enemy;
      }
    }

    let targetIntensity = 0;
    if (nearestGull) {
      spotlightTimer -= dt;
      if (spotlightTimer <= 0) {
        spotlightTimer = 0.1;
        const netYaw = nearestGull.yaw + nearestGull.gy;
        const cosPitch = Math.cos(nearestGull.gp);
        vTempDir
          .set(Math.sin(netYaw) * cosPitch, -Math.sin(nearestGull.gp), Math.cos(netYaw) * cosPitch)
          .normalize();
        const hit = ctx.physics.raycast(nearestGull.sensor, vTempDir, 14);
        vSpotTarget.copy(nearestGull.sensor).addScaledVector(vTempDir, (hit ? hit.dist : 8) - 0.6);
        spotFactor = hit ? 1 : 0.3;
      }
      targetIntensity = 26 * spotFactor;
      spotlightHolder.light.position.lerp(vSpotTarget, 1 - Math.exp(-12 * dt));
    }

    spotlightHolder.light.intensity +=
      (targetIntensity - spotlightHolder.light.intensity) * (1 - Math.exp(-8 * dt));
  }

  let nextEnemyId = 1;
  let gunshotAlertCooldown = 0;

  const enemiesManager = {
    list: activeEnemies,
    TUNE,

    /**
     * 生成敌方单位
     * @param {'gull'|'hound'} type
     * @param {THREE.Vector3} spawnPos
     * @param {object} [options]
     * @returns {object|null}
     */
    spawn(type, spawnPos, options = {}) {
      const pool = type === "gull" ? gullPool : type === "hound" ? houndPool : null;
      if (!pool) return null;

      let enemy = null;
      for (const candidate of pool) {
        if (!candidate.active) {
          enemy = candidate;
          break;
        }
      }

      // 猎犬超量时回收最旧残骸
      if (!enemy && type === "hound" && activeWrecks.length) {
        const recycled = activeWrecks[0];
        hiveContext.retire(recycled);
        enemy = recycled;
      }

      if (enemy) {
        enemy.id = nextEnemyId++;
        activeEnemies.push(enemy);
        enemy._activate(spawnPos, options);
        ctx.events.emit("enemy:spawn", { enemy });
        return enemy;
      }
      return null;
    },

    /**
     * 玩家射击对敌群的全局射线检测 (返回最近命中单位与受击部位)
     * @param {THREE.Vector3} origin
     * @param {THREE.Vector3} dir
     * @param {number} [maxRange=300]
     * @returns {object|null}
     */
    raycast(origin, dir, maxRange = 300) {
      let closestHit = null;

      for (let i = 0; i < activeEnemies.length; i++) {
        const enemy = activeEnemies[i];
        if (!enemy.alive) continue;

        const dx = enemy.pos.x - origin.x;
        const dy = enemy.pos.y + (enemy.type === "hound" ? 0.6 : 0) - origin.y;
        const dz = enemy.pos.z - origin.z;
        const proj = dx * dir.x + dy * dir.y + dz * dir.z;

        // 粗筛包围球剔除
        if (proj < -1.5 || proj > maxRange + 1.5) continue;
        if (dx * dx + dy * dy + dz * dz - proj * proj > 1.7) continue;

        if (!closestHit) {
          closestHit = {
            dist: Infinity,
            point: new W(),
            normal: new W(),
            enemy: null,
            part: "body",
          };
        }

        enemy._raycast(origin, dir, maxRange, closestHit);
      }

      return closestHit && closestHit.enemy ? closestHit : null;
    },

    aliveCount() {
      let count = 0;
      for (const e of activeEnemies) if (e.alive) count++;
      return count;
    },

    clear() {
      for (const g of gullPool) if (g.active) g._deactivate();
      for (const h of houndPool) if (h.active) h._deactivate();
      activeEnemies.length = 0;
      activeWrecks.length = 0;
      hiveContext.tokens = 0;
      for (const b of boltPool) b.on = false;
      boltInstancedMesh.count = 0;
      if (spotlightHolder && spotlightHolder.light) {
        spotlightHolder.light.intensity = 0;
      }
    },

    /**
     * 声音与警报大范围唤醒通知
     */
    alert(origin, radius = 40) {
      for (const e of activeEnemies) {
        if (!e.alive || e.passive || e.mode === "engage") continue;
        if (e.pos.distanceToSquared(origin) > radius * radius) continue;
        e.lastKnown.copy(origin);
        e.lastKnown.y = Math.max(0, origin.y - 1.6);
        if (e.mode === "patrol") {
          ctx.events.emit("enemy:alert", { enemy: e, noise: true });
        }
        e.mode = "investigate";
        e.modeT = 9 + rng() * 4;
      }
    },

    /**
     * 每帧动力学与 AI 状态机更新
     */
    update(dt) {
      if (dt <= 0) return;
      if (dt > 0.05) dt = 0.05;

      hiveContext.t += dt;
      gunshotAlertCooldown -= dt;

      const player = ctx.player;
      if (player) {
        const speed = player.vel ? Math.hypot(player.vel.x, player.vel.z) : player.speed || 0;
        hiveContext.playerSpeed += (speed - hiveContext.playerSpeed) * (1 - Math.exp(-6 * dt));
      }

      for (let i = activeEnemies.length - 1; i >= 0; i--) {
        activeEnemies[i]._update(dt);
      }

      updateBolts(dt);
      updateSearchlight(dt);
    },

    debug: {
      ctx: hiveContext,
      gulls: gullPool,
      hounds: houndPool,
      wrecks: activeWrecks,
      bolts: boltPool,
      mats: enemyMaterials,
      tris: {
        gull: gullRigDef.tris + gullRigDef.extra.tris,
        hound: houndRigDef.tris,
      },
    },
  };

  ctx.events.on("weapon:fire", (e) => {
    if (gunshotAlertCooldown > 0) return;
    gunshotAlertCooldown = 0.3;
    const origin = (e && (e.origin || e.muzzle)) || (ctx.player && ctx.player.pos);
    if (origin) {
      enemiesManager.alert(origin, TUNE.hearRadius);
    }
  });

  ctx.events.on("explosion", (e) => {
    if (e && e.pos) {
      enemiesManager.alert(e.pos, 30);
    }
  });

  ctx.events.on("game:state", (e) => {
    if (e && e.state === "title") {
      enemiesManager.clear();
    }
  });

  return enemiesManager;
}

const Em = createEnemiesManager;

// ============================================================================
// 空间线段与线段最近距离计算 (Segment-to-Segment Shortest Distance Squared)
// ============================================================================

const vSegA = new W();
const vSegB = new W();
const vSegOrig = new W();

function segmentSegmentDistanceSq(segA1, segA2, segB1, segB2) {
  vSegA.copy(segA2).sub(segA1);
  vSegB.copy(segB2).sub(segB1);
  vSegOrig.copy(segA1).sub(segB1);

  const lenSqA = vSegA.dot(vSegA);
  const lenSqB = vSegB.dot(vSegB);
  const dotBOrig = vSegB.dot(vSegOrig);

  let s, t;

  if (lenSqA <= 1e-9 && lenSqB <= 1e-9) {
    return vSegOrig.dot(vSegOrig);
  }

  if (lenSqA <= 1e-9) {
    s = 0;
    t = Math.min(1, Math.max(0, dotBOrig / lenSqB));
  } else {
    const dotAOrig = vSegA.dot(vSegOrig);
    if (lenSqB <= 1e-9) {
      t = 0;
      s = Math.min(1, Math.max(0, -dotAOrig / lenSqA));
    } else {
      const dotAB = vSegA.dot(vSegB);
      const denom = lenSqA * lenSqB - dotAB * dotAB;

      s =
        denom > 1e-9 ? Math.min(1, Math.max(0, (dotAB * dotBOrig - dotAOrig * lenSqB) / denom)) : 0;
      t = (dotAB * s + dotBOrig) / lenSqB;

      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -dotAOrig / lenSqA));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (dotAB - dotAOrig) / lenSqA));
      }
    }
  }

  const cx = vSegOrig.x + vSegA.x * s - vSegB.x * t;
  const cy = vSegOrig.y + vSegA.y * s - vSegB.y * t;
  const cz = vSegOrig.z + vSegA.z * s - vSegB.z * t;
  return cx * cx + cy * cy + cz * cz;
}

const HC = segmentSegmentDistanceSq;

// ============================================================================
// 敌机展台工坊检视模式 (?show=enemies)
// ============================================================================

/**
 * 展台/调试工作台检视模式控制器 (Enemy Showcase Studio Mode)
 * @param {object} ctx
 */
async function createShowcase(ctx) {
  const manager = await createEnemiesManager(ctx);
  ctx.enemies = manager;

  const mkVec = (x, y, z) => new W(x, y, z);
  const showMode = ctx.params.eshow || "both";

  let camPos = [3, 1.45, 3.9];
  let camTarget = [0.5, 0.95, 0];
  let warmupSeconds = 2.6;

  if (showMode === "gull") {
    manager.spawn("gull", mkVec(0, 1.6, 0), {
      passive: true,
      hover: 1.6,
      patrolRadius: 0.02,
      yaw: 0.7,
    });
    camPos = [1.25, 1.95, 1.45];
    camTarget = [0, 1.52, 0];
    warmupSeconds = 1.2;
  } else if (showMode === "hound") {
    manager.spawn("hound", mkVec(0, 0, 0), {
      passive: true,
      yaw: 0.9,
      patrolLine: [mkVec(1.6, 0, 1.3), mkVec(-1.6, 0, -1.3)],
    });
    camPos = [2.1, 1, 2.3];
    camTarget = [0.5, 0.62, 0.4];
    warmupSeconds = 1.25;
  } else if (showMode === "fight") {
    manager.spawn("hound", mkVec(-7, 0, -9), { state: "alert" });
    manager.spawn("hound", mkVec(8, 0, -7), { state: "alert" });
    manager.spawn("hound", mkVec(0, 0, -14), { state: "alert" });
    manager.spawn("gull", mkVec(-5, 6, -13), { state: "alert" });
    manager.spawn("gull", mkVec(9, 6, -11), { state: "alert" });
    camPos = [5, 2.6, 10];
    camTarget = [0, 2.2, -5];
    warmupSeconds = 7;
  } else if (showMode === "dead") {
    const hound = manager.spawn("hound", mkVec(0, 0, 0), { passive: true, yaw: 0.8 });
    const gull = manager.spawn("gull", mkVec(-1.6, 3.4, -0.5), {
      passive: true,
      hover: 3.4,
      patrolRadius: 0.02,
    });
    manager.spawn("hound", mkVec(2.2, 0, -1.6), {
      passive: true,
      yaw: -0.6,
      patrolLine: [mkVec(2.2, 0, -1.6), mkVec(3.4, 0, -3)],
    });

    for (let i = 0; i < 30; i++) manager.update(1 / 60);
    hound.damage(999, hound.pos, mkVec(0.6, 0, -0.8), "body");
    for (let i = 0; i < 110; i++) manager.update(1 / 60);
    gull.damage(999, gull.pos, mkVec(0, 0, 1), "body");

    camPos = [2.6, 1.3, 3.2];
    camTarget = [0, 0.5, 0];
    warmupSeconds = 0.42;
  } else {
    manager.spawn("gull", mkVec(-0.9, 2.2, -0.2), {
      passive: true,
      hover: 2.2,
      patrolRadius: 0.25,
      yaw: 0.5,
    });
    manager.spawn("hound", mkVec(0.2, 0, 0.6), {
      passive: true,
      yaw: 1.2,
      patrolLine: [mkVec(2.6, 0, 1.2), mkVec(-1.8, 0, 0.2)],
    });
  }

  if (ctx.params.epre != null) {
    warmupSeconds = +ctx.params.epre;
  }

  const warmupFrames = Math.round(warmupSeconds * 60);
  for (let i = 0; i < warmupFrames; i++) {
    manager.update(1 / 60);
  }

  const isFrozen = !!ctx.params.efreeze;

  return {
    cam: camPos,
    target: camTarget,
    update(dt) {
      if (!isFrozen) manager.update(dt);
    },
  };
}

const VC = createShowcase;

export const create = createEnemiesManager;
export const showcase = createShowcase;
export { TUNE, TUNE as Ui, createEnemiesManager as Em, createShowcase as VC, ex };

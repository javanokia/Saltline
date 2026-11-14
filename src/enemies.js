// @ts-check
/**
 * @file src/enemies.js
 * @description 敌方单位群落总控协调器 (Enemies Hive Coordinator Facade)
 *
 * 【系统架构】
 * 统一调度机械飞鸥 (Gull) 与猎犬 (Hound) 的对象池、AI 状态机、
 * 并发攻击令牌 (tokens.js)、等离子弹丸物理步进 (projectiles.js)、
 * 动态探照灯焦点追踪 (searchlight.js)、残骸生命周期回收 (wrecks.js)
 * 与集群感知警戒网络 (perception.js)。
 */

import * as THREE from "three";
import { createSeededRandom } from "./constants.js";
import { mergeGeometries } from "./geo.js";
import { GULL_CONFIG, buildGullRig, createGull } from "./enemies/gull.js";
import { HOUND_CONFIG, buildHoundRig, createHound } from "./enemies/hound.js";
import { createTokenCoordinator } from "./enemies/tokens.js";
import { createProjectileSystem } from "./enemies/projectiles.js";
import { createSearchlightSystem } from "./enemies/searchlight.js";
import { createWreckManager } from "./enemies/wrecks.js";
import { createPerceptionSystem } from "./enemies/perception.js";

const {
  Vector3: W,
  Group: wt,
  MeshBasicMaterial: Nn,
  DoubleSide: Sn,
  ShaderMaterial: zn,
  Color: Ve,
  AdditiveBlending: hr,
} = THREE;

// 子模块短别名适配
const Zv = GULL_CONFIG;
const j_ = buildGullRig;
const Q_ = createGull;
const Z_ = buildHoundRig;
const Kv = HOUND_CONFIG;
const iM = createHound;

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

/**
 * 创建敌方单位群落总管理器 (Enemies Hive Manager)
 * @param {object} ctx 全局引擎上下文
 */
export async function createEnemiesManager(ctx) {
  const rng = createSeededRandom(+((ctx.params && ctx.params.eseed) || 9001));
  const activeEnemies = [];

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

  // 核心子系统实例创建
  const tokens = createTokenCoordinator(TUNE);
  const projectiles = createProjectileSystem(ctx, rootGroup, TUNE);
  const searchlight = createSearchlightSystem(ctx, activeEnemies);
  const wrecks = createWreckManager(TUNE.maxWrecks);
  const perception = createPerceptionSystem(TUNE, rng);

  // 群落共享运行时上下文
  const hiveContext = {
    G: ctx,
    rng,
    list: activeEnemies,
    t: 0,
    playerSpeed: 0,
    get tokens() {
      return tokens.count;
    },
    get tokenT() {
      return tokens.lastTime;
    },
    get lastType() {
      return tokens.lastType;
    },
    get wantT() {
      return tokens.wantTime;
    },
    mergeSimple: (geos) => mergeGeometries(geos, false),

    requestToken(enemy) {
      return tokens.requestToken(enemy, hiveContext.t, activeEnemies);
    },

    releaseToken(enemy) {
      tokens.releaseToken(enemy);
    },

    think(enemy, dt, seeThreshold) {
      perception.think(enemy, dt, seeThreshold, ctx, hiveContext, activeEnemies);
    },

    rally(origin, radius, targetPos, caller) {
      perception.rally(origin, radius, targetPos, caller, activeEnemies);
    },

    provoke(enemy) {
      perception.provoke(enemy, ctx, activeEnemies);
    },

    fireBolt(origin, dir) {
      projectiles.fireBolt(origin, dir);
    },

    addWreck(enemy) {
      wrecks.addWreck(enemy);
    },

    retire(enemy) {
      wrecks.retire(enemy, activeEnemies);
    },
  };

  // 预生成程序化 3D 骨架模型
  const gullRigDef = j_();
  const houndRigDef = Z_();

  // 初始化机械飞鸥与猎犬对象池
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
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          enemy = pool[i];
          break;
        }
      }

      // 猎犬超量时回收最旧残骸
      if (!enemy && type === "hound" && wrecks.list.length) {
        const recycled = wrecks.list[0];
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
      for (let i = 0; i < activeEnemies.length; i++) {
        if (activeEnemies[i].alive) count++;
      }
      return count;
    },

    clear() {
      for (let i = 0; i < gullPool.length; i++) {
        if (gullPool[i].active) gullPool[i]._deactivate();
      }
      for (let i = 0; i < houndPool.length; i++) {
        if (houndPool[i].active) houndPool[i]._deactivate();
      }
      activeEnemies.length = 0;
      wrecks.reset();
      tokens.reset();
      projectiles.reset();
      searchlight.reset();
    },

    /**
     * 声音与警报大范围唤醒通知
     * @param {THREE.Vector3} origin
     * @param {number} [radius=40]
     */
    alert(origin, radius = 40) {
      const rSq = radius * radius;
      for (let i = 0; i < activeEnemies.length; i++) {
        const e = activeEnemies[i];
        if (!e.alive || e.passive || e.mode === "engage") continue;
        if (e.pos.distanceToSquared(origin) > rSq) continue;
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
     * @param {number} dt
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

      projectiles.update(dt);
      searchlight.update(dt);
    },

    debug: {
      ctx: hiveContext,
      gulls: gullPool,
      hounds: houndPool,
      wrecks: wrecks.list,
      tokens,
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

/**
 * 展台/调试工作台检视模式控制器 (Enemy Showcase Studio Mode)
 * @param {object} ctx
 */
export async function createShowcase(ctx) {
  const manager = await createEnemiesManager(ctx);
  ctx.enemies = manager;

  const mkVec = (x, y, z) => new W(x, y, z);
  const showMode = ctx.params.eshow || "both";
  let camPos = [0, 1.2, 3.2];
  let camTarget = [0, 0.7, 0];
  let warmupSeconds = 1;

  if (showMode === "gull") {
    camPos = [0, 1.4, 2.6];
    camTarget = [0, 1.1, 0];
    manager.spawn("gull", mkVec(0, 1.1, 0), { passive: true, yaw: 0 });
  } else if (showMode === "hound") {
    camPos = [0, 1.0, 3.0];
    camTarget = [0, 0.5, 0];
    manager.spawn("hound", mkVec(0, 0, 0), {
      passive: true,
      yaw: 0.8,
      patrolLine: [mkVec(2, 0, 0), mkVec(-2, 0, 0)],
    });
  } else {
    manager.spawn("gull", mkVec(-1.2, 1.2, -0.4), {
      passive: true,
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

export const create = createEnemiesManager;
export const showcase = createShowcase;
export { TUNE, TUNE as Ui, createEnemiesManager as Em, createShowcase as VC };
export const ex = { TUNE, create: createEnemiesManager, showcase: createShowcase };

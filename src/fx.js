// @ts-check
/**
 * ============================================================================
 * 3A-GAME Visual Effects Engine (fx.js)
 * 纯程序化视觉特效系统：GPU 实例化粒子、弹道曳光流、物理弹壳与破片、冲击弹孔贴花
 * ============================================================================
 *
 * 架构拆分重构 (Modular Architecture):
 * - ./fx/textures.js: 图集生成器 (Smoke, Sparks, Decals) 与 GPU 混合着色器 (Lit, Additive, Soft Fade)
 * - ./fx/pools.js: 实例化网格封装、SoA 紧凑粒子池 (ParticlePool) 与超音速弹道曳光流 (BulletTracerPool)
 * - ./fx/debris.js: 物理碎屑破片 (DebrisPhysicsSystem) 与黄铜抛壳动力学 (SpentShellEjectionSystem)
 * - ./fx/decals.js: 冲击弹孔贴花管理器 (ImpactDecalManager)
 * - ./fx/helpers.js: 颜色解析与圆锥体随机向量
 * - ./fx/primitives.js: 基础烟尘/火花/波纹/飞溅粒子发射器
 * - ./fx/impacts.js: 多材质打击与弹孔贴花反馈 (金属、木材、混凝土、橡胶、玻璃、机械体)
 * - ./fx/weapons.js: 弹道曳光流、枪口火焰与抛壳系统
 * - ./fx/emitters.js: 持续环境粒子发射器 (蒸汽、火焰、漏水滴水、暗火)
 * - ./fx/explosions.js: 爆炸火球、冲击波与破片管理
 * - ./fx/showcase.js: 视觉特效靶场独立展示模式
 */

import * as THREE from "three";
import { SUN_CONFIG, SKY_CONFIG } from "./constants.js";

// 子模块导入 (Submodule Imports)
import {
  SMOKE_ATLAS_COLS,
  SMOKE_ATLAS_ROWS,
  SPARKS_ATLAS_COLS,
  SPARKS_ATLAS_ROWS,
  SPARK_FRAME_TRACER_TIP,
  SPARK_FRAME_SOFT_DOT,
  randomRange,
  generateSmokeAtlas,
  generateSparksAtlas,
} from "./fx/textures.js";

import { createInstancedParticleMesh, ParticlePool, BulletTracerPool } from "./fx/pools.js";
import { DebrisPhysicsSystem, SpentShellEjectionSystem } from "./fx/debris.js";
import { ImpactDecalManager } from "./fx/decals.js";
import { UP_VECTOR, DOWN_VECTOR } from "./fx/helpers.js";
import { createFXPrimitives } from "./fx/primitives.js";
import { createImpactSystem } from "./fx/impacts.js";
import { createWeaponFX } from "./fx/weapons.js";
import { createContinuousEmitterSystem } from "./fx/emitters.js";
import { createExplosionSystem } from "./fx/explosions.js";
import { showcaseFX } from "./fx/showcase.js";

const CAPACITY_LIT_PARTICLES = 1400;
const CAPACITY_ADD_PARTICLES = 3200;

/**
 * 核心特效管理器工厂 (createFXManager)
 * @param {any} engineCtx
 */
export async function createFXManager(engineCtx) {
  const scene = engineCtx.scene || (engineCtx.render && engineCtx.render.scene);
  const windDir = new THREE.Vector3(-0.8, 0, 0.3);

  // 环境光与日光光照参数
  const sunRadiance = new THREE.Vector3(
    SUN_CONFIG.color.r,
    SUN_CONFIG.color.g,
    SUN_CONFIG.color.b,
  ).multiplyScalar((SUN_CONFIG.intensity / Math.PI) * 0.9);

  const ambSky = new THREE.Vector3(
    SKY_CONFIG.zenith.r * 0.6 + SKY_CONFIG.horizonAway.r * 0.5 + SKY_CONFIG.fog.r * 0.25,
    SKY_CONFIG.zenith.g * 0.6 + SKY_CONFIG.horizonAway.g * 0.5 + SKY_CONFIG.fog.g * 0.25,
    SKY_CONFIG.zenith.b * 0.6 + SKY_CONFIG.horizonAway.b * 0.5 + SKY_CONFIG.fog.b * 0.25,
  );

  const ambGround = new THREE.Vector3(
    SKY_CONFIG.horizonAway.r * 0.3 + SKY_CONFIG.fog.r * 0.14,
    SKY_CONFIG.horizonAway.g * 0.3 + SKY_CONFIG.fog.g * 0.14,
    SKY_CONFIG.horizonAway.b * 0.3 + SKY_CONFIG.fog.g * 0.14,
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
    ambHi: ambSky,
  });

  const addMeshSystem = createInstancedParticleMesh(engineCtx, CAPACITY_ADD_PARTICLES, {
    lit: false,
    tex: sparksAtlas,
    cols: SPARKS_ATLAS_COLS,
    rows: SPARKS_ATLAS_ROWS,
    renderOrder: 20,
  });

  const litPool = new ParticlePool(CAPACITY_LIT_PARTICLES, true);
  const addPool = new ParticlePool(CAPACITY_ADD_PARTICLES - 160, false);
  const tracerPool = new BulletTracerPool(48);
  const debrisSystem = new DebrisPhysicsSystem(engineCtx, 256);
  const shellSystem = new SpentShellEjectionSystem(engineCtx, 60);
  const decalSystem = new ImpactDecalManager(engineCtx, 160);

  const rootGroup = new THREE.Group();
  rootGroup.name = "fx";
  rootGroup.add(
    decalSystem.mesh,
    debrisSystem.mesh,
    shellSystem.mesh,
    litMeshSystem.mesh,
    addMeshSystem.mesh,
  );
  scene.add(rootGroup);

  let globalTime = 0;
  const getGlobalTime = () => globalTime;

  const getLightPool = () => engineCtx.render && engineCtx.render.lightPool;
  const flashLight = (
    /** @type {THREE.Vector3} */ pos,
    /** @type {number} */ color,
    /** @type {number} */ intensity,
    /** @type {number} */ distance,
    /** @type {number} */ duration,
  ) => {
    const lp = getLightPool();
    if (lp && lp.flash) lp.flash(pos, color, intensity, distance, duration);
  };

  const vTempPos = new THREE.Vector3();
  const vTempCamPos = new THREE.Vector3();
  const vTempNorm = new THREE.Vector3();

  // 阴影遮挡与地面高度探测
  function queryShadowVisibility(
    /** @type {THREE.Vector3} */ pos,
    /** @type {THREE.Vector3|null|undefined} */ normal,
  ) {
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

  function queryFloorHeight(/** @type {THREE.Vector3} */ pos) {
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

  // 初始化原子发射器
  const primitives = createFXPrimitives({
    engineCtx,
    litPool,
    addPool,
    debrisSystem,
    queryShadowVisibility,
    queryFloorHeight,
  });

  // 初始化多材质打击反馈
  const impactSystem = createImpactSystem({
    engineCtx,
    litPool,
    addPool,
    decalSystem,
    flashLight,
    queryShadowVisibility,
    queryFloorHeight,
    primitives,
    getGlobalTime,
  });

  // 初始化武器特效
  const weaponFX = createWeaponFX({
    tracerPool,
    shellSystem,
    litPool,
    addPool,
    flashLight,
    queryShadowVisibility,
    primitives,
    getGlobalTime,
  });

  // 初始化持续环境发射器
  const emitterSystem = createContinuousEmitterSystem({
    getLightPool,
    queryShadowVisibility,
    litPool,
    addPool,
    primitives,
  });

  // 初始化爆炸特效
  const explosionSystem = createExplosionSystem({
    engineCtx,
    litPool,
    addPool,
    decalSystem,
    spawnContinuousEmitter: emitterSystem.spawnContinuousEmitter,
    flashLight,
    queryShadowVisibility,
    queryFloorHeight,
    primitives,
  });

  // 事件总线绑定
  engineCtx.events.on("impact", (/** @type {any} */ ev) => {
    if (!ev || !ev.point) return;
    impactSystem.impact(ev.point, ev.normal, ev.surface, ev.dir, ev.enemy);
  });

  const checkPuddle = (/** @type {number} */ x, /** @type {number} */ z) => {
    try {
      return Boolean(
        engineCtx.ground && engineCtx.ground.isPuddle && engineCtx.ground.isPuddle(x, z),
      );
    } catch {
      return false;
    }
  };

  engineCtx.events.on("player:step", (/** @type {any} */ ev) => {
    const pos = (ev && ev.pos) || (engineCtx.player && engineCtx.player.pos);
    if (pos && ((ev && ev.surface === "water") || checkPuddle(pos.x, pos.z))) {
      vTempPos.set(pos.x, Math.max(0, pos.y), pos.z);
      primitives.splash(vTempPos, ev && ev.sprint ? 0.55 : 0.4);
    }
  });

  engineCtx.events.on("player:land", (/** @type {any} */ ev) => {
    const pos = engineCtx.player && engineCtx.player.pos;
    if (pos) {
      vTempPos.set(pos.x, Math.max(0, pos.y), pos.z);
      if ((ev && ev.surface === "water") || checkPuddle(pos.x, pos.z)) {
        primitives.splash(vTempPos, 0.9);
      } else if (ev && ev.speed > 5) {
        const shadowVis = queryShadowVisibility(vTempPos, UP_VECTOR);
        for (let i = 0; i < 6; i++) {
          const ang = Math.random() * 6.283;
          primitives.emitLitSmoke(
            vTempPos.x + Math.cos(ang) * 0.2,
            vTempPos.y + 0.08,
            vTempPos.z + Math.sin(ang) * 0.2,
            Math.cos(ang) * 1.6,
            0.3,
            Math.sin(ang) * 1.6,
            randomRange(0.7, 1.2),
            0.15,
            randomRange(0.5, 0.8),
            0.45,
            0.44,
            0.42,
            0.22,
            shadowVis,
            3,
            0.1,
            0.8,
            -1,
          );
        }
      }
    }
  });

  // 主更新循环与生命周期 (Update Loop & Clear)
  function update(/** @type {number} */ dt) {
    if (dt <= 0) dt = 0;
    globalTime += dt;
    emitterSystem.updateContinuousEmitters(dt);

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
    for (const em of emitterSystem.continuousEmitters) {
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
    muzzleFlash: weaponFX.muzzleFlash,
    tracer: weaponFX.tracer,
    impact: impactSystem.impact,
    sparks: primitives.sparks,
    smoke: primitives.smoke,
    dust: primitives.dust,
    explosion: explosionSystem.explosion,
    shell: weaponFX.shell,
    splash: primitives.splash,
    addEmitter: emitterSystem.addEmitter,
    debris: primitives.debris,
    decal(
      /** @type {THREE.Vector3} */ pos,
      /** @type {THREE.Vector3} */ normal,
      type = "bullet_concrete",
      /** @type {number} */ size,
    ) {
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
        drawCalls: 5,
      };
    },
  };
}

// 统一导出 (ESM Exports)
export const create = createFXManager;
export const showcase = showcaseFX;

export const Sv = {
  create: createFXManager,
  showcase: showcaseFX,
};

export { showcaseFX };
export default createFXManager;

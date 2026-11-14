// @ts-check
/**
 * @file src/weapon.js
 * @description 第一人称武器控制器主入口与运行时状态机 (PAC-9 / SG-12 / SMG-45 / SR-99)
 */

import * as THREE from "three";
import { clamp, lerp, saturate, damp, FACTION_PLAYER, FACTION_ENEMY } from "./constants.js";
import { PAC9_MODEL_PARAMS, pac9RainUniform } from "./weapons/pac9_model.js";
import { WEAPON_REGISTRY, WEAPON_ORDER } from "./weapons/weapon_configs.js";
import {
  POSE_HIPFIRE,
  POSE_ADS,
  POSE_SPRINT,
  POSE_RELOAD,
  RELOAD_DURATION_TACTICAL,
  RELOAD_DURATION_EMPTY,
  RELOAD_TIMESTAMPS,
  smootherstep,
  createSpring,
  stepSpring,
  sampleHandKeyframes,
} from "./weapons/poses.js";
import { assembleWeaponViewModel } from "./weapons/view_model.js";
import { executeWeaponFire } from "./weapons/ballistics.js";

const { T_MAG_OUT, T_MAG_IN, T_RACK_START, T_RACK_BACK, T_RACK_RELEASE } = RELOAD_TIMESTAMPS;

/** 弹匣容量 (30发标准穿甲步枪弹) */
const MAG_CAPACITY = 30;
/** 初始备用弹药量 */
const DEFAULT_RESERVE_AMMO = 150;
/** 理论射速 (RPM - 每分钟 720 发) */
const FIRE_RATE_RPM = 720;
/** 单发对甲基础伤害 */
const BASE_DAMAGE = 26;

/**
 * 创建几猫九式突击步枪视模控制器 (PAC-9 First-Person Viewmodel Controller)
 * @param {import('./types').EngineContext} ctx 全局引擎上下文
 * @returns {Promise<import('./types').WeaponState>}
 */
async function createWeapon(ctx) {
  const {
    root,
    boltMesh,
    magGroup,
    magDefaultPos,
    topRoundMesh,
    opticSightMesh,
    muzzleFlashMesh,
    weaponMeshMap,
    updateMuzzlePosForWeapon,
    leftHandGroup,
    updateTriggerFinger,
    reloadRig,
    totalTris,
    totalMeshes,
  } = assembleWeaponViewModel(ctx);

  const { leftHandMagInvert, poseGripHandguard, poseAtMagWell, kfTacticalReload, kfEmptyReload } =
    reloadRig;

  const tempVec = new THREE.Vector3();
  const tempQuat1 = new THREE.Quaternion();
  const tempQuat2 = new THREE.Quaternion();

  const random = ctx.rng && ctx.rng.fork ? ctx.rng.fork() : Math.random;

  // 运行时物理与动画状态对象
  const state = {
    t: 0,
    cooldown: 0,
    prevFire: false,
    dryDone: false,
    autoReload: -1,
    reload: null,
    burst: 0,
    lastShot: -9,
    bloom: 0,
    heat: 0,
    smoke: 0,
    smokeTick: 0,
    adsLin: 0,
    adsE: 0,
    sprintT: 0,
    reloadW: 0,
    rackW: 0,
    bobPhase: 0,
    bobAmt: 0,
    finger: 0,
    boltT: 9,
    boltLocked: false,
    flashT: 0,
    flashDur: 0.05,
    recPhase: 0,
    wasGround: true,
    lastVy: 0,
    spreadS: 0.0125,
    idleT: 0,
    inspect: -1,

    // 动力学弹簧
    kZ: createSpring(520, 30), // 后坐力机匣向后冲量
    kP: createSpring(380, 26), // 后坐力枪口上扬 Pitch
    kY: createSpring(300, 22), // 后坐力水平游离 Yaw
    kR: createSpring(300, 20), // 后坐力枪身扭转 Roll
    swY: createSpring(110, 15), // 瞄准水平摆动 (Look Sway Yaw)
    swP: createSpring(110, 15), // 瞄准垂直摆动 (Look Sway Pitch)
    jY: createSpring(140, 13), // 跳跃/下落水平晃动
    jP: createSpring(140, 13), // 跳跃/下落垂直晃动
    bump: createSpring(600, 30), // 着陆撞击弹簧
  };

  const debug = {
    freeze: false,
    reloadT: null,
    empty: false,
    flash: false,
    noFire: false,
  };

  let activeWeaponId = "pac9";
  const ammoStates = {
    pac9: { ammo: WEAPON_REGISTRY.pac9.magCapacity, reserve: WEAPON_REGISTRY.pac9.reserveAmmo },
    sg12: { ammo: WEAPON_REGISTRY.sg12.magCapacity, reserve: WEAPON_REGISTRY.sg12.reserveAmmo },
    smg45: { ammo: WEAPON_REGISTRY.smg45.magCapacity, reserve: WEAPON_REGISTRY.smg45.reserveAmmo },
    sr99: { ammo: WEAPON_REGISTRY.sr99.magCapacity, reserve: WEAPON_REGISTRY.sr99.reserveAmmo },
  };

  function switchWeapon(targetId) {
    if (!WEAPON_REGISTRY[targetId] || targetId === activeWeaponId) return false;
    ammoStates[activeWeaponId].ammo = weapon.ammo;
    ammoStates[activeWeaponId].reserve = weapon.reserve;

    const fromId = activeWeaponId;
    activeWeaponId = targetId;
    const cfg = WEAPON_REGISTRY[targetId];

    for (const [id, mesh] of Object.entries(weaponMeshMap)) {
      if (mesh) mesh.visible = id === targetId;
    }
    updateMuzzlePosForWeapon(targetId);

    weapon.id = cfg.id;
    weapon.name = cfg.name;
    weapon.magSize = cfg.magCapacity;
    weapon.ammo = ammoStates[targetId].ammo;
    weapon.reserve = ammoStates[targetId].reserve;
    weapon.spread = cfg.spreadHip;
    weapon.damage = cfg.baseDamage;
    weapon.rpm = cfg.fireRateRpm;
    weapon.adsFov = cfg.adsFov;
    weapon.soundType = cfg.soundType;

    // 动态调整二阶阻尼简谐弹簧刚度与阻尼
    state.kZ.k = cfg.recoil.springK;
    state.kZ.c = cfg.recoil.springC;
    state.kP.k = cfg.recoil.springK;
    state.kP.c = cfg.recoil.springC;

    // 换弹状态复位
    state.reload = null;
    state.reloadW = 0;
    state.rackW = 0;

    ctx.events.emit("weapon:switch", { from: fromId, to: targetId, weapon: cfg });
    ctx.events.emit("weapon:reload", { phase: "bolt" });
    return true;
  }

  function cycleWeapon(dir = 1) {
    const curIdx = WEAPON_ORDER.indexOf(activeWeaponId);
    const nextIdx = (curIdx + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    return switchWeapon(WEAPON_ORDER[nextIdx]);
  }

  const weapon = {
    id: "pac9",
    name: PAC9_MODEL_PARAMS.name,
    ammo: MAG_CAPACITY,
    magSize: MAG_CAPACITY,
    reserve: DEFAULT_RESERVE_AMMO,
    state: "idle",
    ads: 0,
    spread: 0.0125,
    damage: BASE_DAMAGE,
    rpm: FIRE_RATE_RPM,
    adsFov: 52,
    soundType: "rifle",
    root,
    debug,
    info: {
      tris: Math.round(totalTris),
      meshes: totalMeshes,
    },
    update,
    reset,
    previewReset: reset,
    switchWeapon,
    cycleWeapon,
    getWeaponList() {
      return Object.values(WEAPON_REGISTRY);
    },
    getActiveWeapon() {
      return WEAPON_REGISTRY[activeWeaponId];
    },
    setVisible(v) {
      root.visible = !!v;
    },
    muzzleWorld: getMuzzleWorldPos,
    reloadNow: triggerReload,
    addAmmo(count) {
      weapon.reserve += count;
    },
    setWetness(w) {
      pac9RainUniform.value = Math.max(0, Math.min(1, +w || 0));
    },
    get reloading() {
      return state.reload !== null;
    },
    snap() {
      state.adsLin = ctx.input.ads ? 1 : 0;
      for (const s of ["kZ", "kP", "kY", "kR", "swY", "swP", "jY", "jP", "bump"]) {
        state[s].x = 0;
        state[s].v = 0;
      }
      state.sprintT = ctx.player.sprinting ? 1 : 0;
    },
  };

  /**
   * 重置枪械所有状态
   */
  function reset() {
    weapon.ammo = MAG_CAPACITY;
    weapon.reserve = DEFAULT_RESERVE_AMMO;
    weapon.state = "idle";
    weapon.ads = 0;
    Object.assign(state, {
      cooldown: 0,
      prevFire: false,
      dryDone: false,
      autoReload: -1,
      reload: null,
      burst: 0,
      lastShot: -9,
      bloom: 0,
      heat: 0,
      smoke: 0,
      adsLin: 0,
      adsE: 0,
      sprintT: 0,
      reloadW: 0,
      boltT: 9,
      boltLocked: false,
      flashT: 0,
      idleT: 0,
      inspect: -1,
    });
    for (const s of ["kZ", "kP", "kY", "kR", "swY", "swP", "jY", "jP", "bump"]) {
      state[s].x = 0;
      state[s].v = 0;
    }
    topRoundMesh.visible = true;
    magGroup.visible = true;
    magGroup.position.copy(magDefaultPos);
    magGroup.quaternion.identity();
    leftHandGroup.position.copy(poseGripHandguard.p);
    leftHandGroup.quaternion.copy(poseGripHandguard.q);
  }

  /**
   * 计算枪身局部点变换到世界坐标 (考虑武器视场角投影补偿)
   */
  function localPointToWorld(localArr, outVec) {
    root.updateMatrix();
    outVec.fromArray(localArr).applyMatrix4(root.matrix);
    const cam = ctx.camera;
    const fovCompensation =
      Math.tan((cam.fov * Math.PI) / 360) / Math.tan((ctx.viewCamera.fov * Math.PI) / 360);
    outVec.x *= fovCompensation;
    outVec.y *= fovCompensation;
    return outVec.applyQuaternion(cam.quaternion).add(cam.position);
  }

  function getMuzzleWorldPos(outVec = new THREE.Vector3()) {
    let localMuzzle = PAC9_MODEL_PARAMS.muzzle;
    if (activeWeaponId === "sr99") localMuzzle = [0, 0.022, -0.92];
    else if (activeWeaponId === "sg12") localMuzzle = [0, 0.024, -0.63];
    else if (activeWeaponId === "smg45") localMuzzle = [0, 0.022, -0.37];
    return localPointToWorld(localMuzzle, outVec);
  }

  /**
   * 触发主动换弹
   */
  function triggerReload() {
    if (state.reload || weapon.ammo >= weapon.magSize || weapon.reserve <= 0) return false;
    const isEmpty = weapon.ammo <= 0;
    const cfg = WEAPON_REGISTRY[activeWeaponId] || WEAPON_REGISTRY.pac9;
    state.reload = {
      t: 0,
      T: isEmpty ? cfg.reloadDurationEmpty : cfg.reloadDurationTactical,
      empty: isEmpty,
      f: {},
    };
    state.autoReload = -1;
    ctx.events.emit("weapon:reload", {
      phase: "start",
      empty: isEmpty,
      weaponType: activeWeaponId,
    });
    return true;
  }

  /**
   * 击发核心物理过程 (Raycast, Ballistics, Visual/Audio Effects)
   */
  function fireShot() {
    executeWeaponFire({
      ctx,
      weapon,
      state,
      activeWeaponId,
      muzzleFlashMesh,
      topRoundMesh,
      getMuzzleWorldPos,
      localPointToWorld,
      random,
    });
  }

  /**
   * 换弹时间线机理与左右手状态机
   * @param {number} dt
   * @returns {number} rackBoltProgress
   */
  function updateReloadTimeline(dt) {
    let rackBoltProgress = 0;
    if (debug.reloadT != null && !state.reload) {
      state.reload = {
        t: 0,
        T: debug.empty ? RELOAD_DURATION_EMPTY : RELOAD_DURATION_TACTICAL,
        empty: debug.empty,
        f: {},
      };
    }

    if (!state.reload) return rackBoltProgress;

    const reloadData = state.reload;
    if (debug.reloadT != null) {
      reloadData.t = debug.reloadT;
    } else {
      reloadData.t += dt;
    }
    const curT = reloadData.t;

    const triggerPhase = (phaseName, timestamp) => {
      if (curT >= timestamp && !reloadData.f[phaseName]) {
        reloadData.f[phaseName] = 1;
        ctx.events.emit("weapon:reload", { phase: phaseName, empty: reloadData.empty });
        return true;
      }
      return false;
    };

    // 阶段 1: 拔出旧弹匣
    if (triggerPhase("magout", T_MAG_OUT)) {
      state.bump.v -= 0.25;
    }
    if (curT > 0.86 && !reloadData.f.fresh) {
      reloadData.f.fresh = 1;
      topRoundMesh.visible = true;
    }

    // 阶段 2: 插入新弹匣
    if (triggerPhase("magin", T_MAG_IN)) {
      state.bump.v += 0.55;
      const addCount = Math.min(weapon.magSize - weapon.ammo, weapon.reserve);
      weapon.ammo += addCount;
      weapon.reserve -= addCount;
      if (!reloadData.empty) {
        state.boltLocked = false;
      }
    }

    // 阶段 3: 拍实弹匣底板
    if (curT >= 1.5 && !reloadData.f.tap) {
      reloadData.f.tap = 1;
      state.bump.v += 0.4;
    }

    // 阶段 4: 空仓换弹专属 —— 拉动拉机柄
    if (reloadData.empty) {
      if (curT >= T_RACK_START) {
        rackBoltProgress =
          curT < T_RACK_BACK
            ? smootherstep((curT - T_RACK_START) / (T_RACK_BACK - T_RACK_START))
            : curT < T_RACK_RELEASE
              ? 1
              : Math.max(0, 1 - (curT - T_RACK_RELEASE) / 0.035);
      }
      if (triggerPhase("bolt", T_RACK_RELEASE)) {
        state.boltLocked = false;
        state.bump.v += 0.3;
        state.kZ.v -= 0.5;
      }
    }

    // 关键帧插值驱动左手位姿
    sampleHandKeyframes(
      reloadData.empty ? kfEmptyReload : kfTacticalReload,
      curT,
      tempVec,
      tempQuat1,
    );
    leftHandGroup.position.copy(tempVec);
    leftHandGroup.quaternion.copy(tempQuat1);

    // 弹匣跟随手部移动（拔出至插入区间）
    if (curT >= T_MAG_OUT && curT < T_MAG_IN) {
      tempQuat2.copy(tempQuat1).multiply(leftHandMagInvert);
      magGroup.quaternion.copy(tempQuat2);
      magGroup.position
        .copy(magDefaultPos)
        .sub(poseAtMagWell.p)
        .applyQuaternion(tempQuat2)
        .add(tempVec);
    } else {
      magGroup.quaternion.identity();
      magGroup.position.copy(magDefaultPos);
    }

    const enterBlend = smootherstep(curT / 0.3);
    const exitBlend = 1 - smootherstep((curT - (reloadData.T - 0.46)) / 0.4);
    state.reloadW = Math.min(enterBlend, exitBlend);
    state.rackW = reloadData.empty ? smootherstep((curT - 1.62) / 0.3) * exitBlend : 0;

    if (curT >= reloadData.T && debug.reloadT == null) {
      state.reload = null;
      state.reloadW = 0;
      state.rackW = 0;
      ctx.events.emit("weapon:reload", { phase: "done" });
      leftHandGroup.position.copy(poseGripHandguard.p);
      leftHandGroup.quaternion.copy(poseGripHandguard.q);
    }

    return rackBoltProgress;
  }

  /**
   * 闲置检视 (Weapon Inspect) 动画状态机计算
   * @param {number} dt
   * @param {number} moveSpeed
   * @param {boolean} wantsFire
   * @param {any} input
   * @returns {{ inspectPitch: number, inspectYaw: number, inspectRoll: number }}
   */
  function updateInspectAnimation(dt, moveSpeed, wantsFire, input) {
    const isMovingOrLooking =
      wantsFire ||
      !!input.ads ||
      !!state.reload ||
      moveSpeed > 0.2 ||
      (input.look && Math.abs(input.look.dx) + Math.abs(input.look.dy) > 0.002) ||
      state.sprintT > 0.1;

    if (isMovingOrLooking) {
      state.idleT = 0;
      if (state.inspect >= 0) state.inspect = Math.max(state.inspect, 2.9);
    } else {
      state.idleT += dt;
    }
    if (state.inspect < 0 && state.idleT > 24) {
      state.inspect = 0;
    }

    let inspectPitch = 0;
    let inspectYaw = 0;
    let inspectRoll = 0;

    if (state.inspect >= 0) {
      const inspT = (state.inspect += dt);
      inspectPitch = smootherstep(inspT / 0.5) * (1 - smootherstep((inspT - 1.4) / 0.5));
      inspectYaw = smootherstep((inspT - 1.5) / 0.5) * (1 - smootherstep((inspT - 2.8) / 0.5));
      inspectRoll = smootherstep(inspT / 0.5) * (1 - smootherstep((inspT - 2.9) / 0.5));
      if (inspT > 3.5) {
        state.inspect = -1;
        state.idleT = 0;
      }
    }

    return { inspectPitch, inspectYaw, inspectRoll };
  }

  /**
   * 视模动力学物理弹簧步进 (Sway, Springs, Bobbing)
   * @param {number} dt
   * @param {any} player
   * @param {any} input
   * @param {number} moveSpeed
   */
  function updateSwayAndSprings(dt, player, input, moveSpeed) {
    const isOnGround = player.onGround !== false;
    const velY = player.vel ? player.vel.y : 0;

    state.bobAmt = damp(state.bobAmt, isOnGround ? saturate(moveSpeed / 3.6) : 0, 8, dt);
    state.bobPhase += dt * (moveSpeed > 0.3 && isOnGround ? 5.2 + moveSpeed * 1.55 : 0);

    const swaySensitivity = lerp(1, 0.4, state.adsE);

    // 瞄准随动摆动 (Look Sway)
    state.swY.v += clamp(input.look ? input.look.dx : 0, -0.2, 0.2) * 3.2 * swaySensitivity;
    state.swP.v += clamp(input.look ? input.look.dy : 0, -0.2, 0.2) * 2.6 * swaySensitivity;
    stepSpring(state.swY, 0, dt);
    stepSpring(state.swP, 0, dt);
    state.swY.x = clamp(state.swY.x, -0.09, 0.09);
    state.swP.x = clamp(state.swP.x, -0.07, 0.07);

    // 跳跃与着陆冲量反馈
    if (state.wasGround && !isOnGround && velY > 1) {
      state.jY.v -= 0.22;
      state.jP.v += 0.7;
    }
    if (!state.wasGround && isOnGround) {
      const landImpulse = clamp(-state.lastVy * 0.06, 0, 0.6);
      state.jY.v -= landImpulse;
      state.jP.v -= landImpulse * 3.2;
      state.kR.v += (random() - 0.5) * landImpulse * 2;
    }
    state.wasGround = isOnGround;
    if (!isOnGround) state.lastVy = velY;

    // 步进所有动力学物理弹簧
    stepSpring(state.jY, isOnGround ? 0 : clamp(-velY * 0.0045, -0.02, 0.024), dt);
    stepSpring(state.jP, isOnGround ? 0 : clamp(velY * 0.012, -0.06, 0.06), dt);
    stepSpring(state.kZ, 0, dt);
    stepSpring(state.kP, 0, dt);
    stepSpring(state.kY, 0, dt);
    stepSpring(state.kR, 0, dt);
    stepSpring(state.bump, 0, dt);
  }

  /**
   * 视模每帧动力学更新与姿态插值
   * @param {number} dt 帧耗时 (秒)
   */
  function update(dt) {
    const player = ctx.player;
    const input = ctx.input;
    if (!player || !input || !player.alive) {
      state.prevFire = false;
      if (muzzleFlashMesh) muzzleFlashMesh.visible = false;
      return;
    }

    state.t += dt;

    // 射击输入检测
    const wantsFire = !!input.fire && root.visible && !debug.noFire;
    state.prevFire = wantsFire;
    if (!wantsFire) state.dryDone = false;

    // 疾跑状态判定
    const isSprinting = !!player.sprinting && !wantsFire && !input.ads && !state.reload;
    state.sprintT = damp(state.sprintT, isSprinting ? 1 : 0, 9, dt);

    // 武器槽位切换输入检测 (1: PAC-9, 2: SG-12, 3: SMG-45, 4: SR-99, Q: 快速轮换)
    if (input.pressed) {
      if (input.pressed("slot1")) switchWeapon("pac9");
      else if (input.pressed("slot2")) switchWeapon("sg12");
      else if (input.pressed("slot3")) switchWeapon("smg45");
      else if (input.pressed("slot4")) switchWeapon("sr99");
      else if (input.pressed("quickswitch")) cycleWeapon(1);
    }

    // 换弹按键与空仓自动换弹
    if (input.pressed && input.pressed("reload")) {
      triggerReload();
    }
    if (state.autoReload >= 0) {
      state.autoReload -= dt;
      if (state.autoReload < 0) triggerReload();
    }

    // 换弹时间线机理与左右手状态机
    const rackBoltProgress = updateReloadTimeline(dt);

    // 冷却与射击执行
    state.cooldown -= dt;
    const canFire = !state.reload && state.sprintT < 0.45;
    if (wantsFire && canFire) {
      if (weapon.ammo > 0) {
        let maxShotsPerFrame = 0;
        const currentRpm = weapon.rpm || FIRE_RATE_RPM;
        while (state.cooldown <= 0 && weapon.ammo > 0 && maxShotsPerFrame < 3) {
          fireShot();
          state.cooldown += 60 / currentRpm;
          maxShotsPerFrame++;
        }
      } else if (!state.dryDone) {
        state.dryDone = true;
        ctx.events.emit("weapon:dry", {});
        state.bump.v -= 0.08;
        if (weapon.reserve > 0) {
          state.autoReload = 0.32;
        }
      }
    }

    if (state.cooldown < 0) state.cooldown = Math.max(state.cooldown, -0.001);

    // 连发散布与枪管热量、轻微枪口冒烟
    if (state.t - state.lastShot > 0.24) {
      if (state.burst > 0) state.recPhase = random() * 6.28;
      state.burst = 0;
    }
    state.bloom = Math.max(0, state.bloom - dt * 1.5);

    if (
      state.t - state.lastShot > 0.11 &&
      state.t - state.lastShot < 0.11 + dt * 1.5 &&
      state.heat > 0.4
    ) {
      state.smoke = Math.min(1.6, state.heat * 1.3);
    }
    if (state.smoke > 0) {
      state.smoke -= dt;
      state.smokeTick -= dt;
      if (state.smokeTick <= 0 && ctx.fx && ctx.fx.smoke) {
        state.smokeTick = 0.085;
        getMuzzleWorldPos(tempVec);
        ctx.fx.smoke(tempVec, {
          size: 0.1 + state.smoke * 0.06,
          life: 1.3,
          rise: 0.5,
          count: 1,
          alpha: 0.22,
        });
      }
    }
    state.heat = Math.max(0, state.heat - dt * 0.2);

    // ADS (开镜瞄准) 进度平滑
    const wantsAds = !!input.ads && !state.reload && state.sprintT < 0.35;
    state.adsLin = clamp(state.adsLin + (wantsAds ? dt : -dt) / 0.18, 0, 1);
    state.adsE = smootherstep(state.adsLin);
    weapon.ads = state.adsE;

    // 动态散布锥形角计算
    const moveSpeed = player.speed || 0;
    const speedRatio = saturate(moveSpeed / 6);
    const targetSpread =
      lerp(0.0125, 0.0012, state.adsE) +
      speedRatio * lerp(0.013, 0.004, state.adsE) +
      state.bloom * lerp(0.0065, 0.0022, state.adsE) +
      (player.onGround === false ? 0.022 : 0) -
      (player.crouching ? 0.002 * (1 - state.adsE) : 0);

    state.spreadS = damp(state.spreadS, targetSpread, 18, dt);
    weapon.spread = state.spreadS;

    // 闲置检视 (Weapon Inspect)
    const { inspectPitch, inspectYaw, inspectRoll } = updateInspectAnimation(
      dt,
      moveSpeed,
      wantsFire,
      input,
    );

    // 枪械核心状态名更新
    weapon.state = state.reload
      ? "reloading"
      : state.inspect >= 0
        ? "inspect"
        : state.sprintT > 0.5
          ? "sprinting"
          : state.t - state.lastShot < 0.14
            ? "firing"
            : "idle";

    // 往复式枪机运动
    state.boltT += dt;
    const cycleDur = 0.072;
    let boltOffsetNorm = state.boltT < cycleDur ? Math.sin((Math.PI * state.boltT) / cycleDur) : 0;
    if (state.boltLocked && state.boltT > cycleDur * 0.5) {
      boltOffsetNorm = Math.max(boltOffsetNorm, 0.86);
    }
    boltMesh.position.z =
      PAC9_MODEL_PARAMS.boltTravel * Math.max(boltOffsetNorm * 0.95, rackBoltProgress);

    // 扣动扳机手启动指关节变形
    state.finger = damp(state.finger, (wantsFire && canFire) || debug.flash ? 1 : 0, 30, dt);
    updateTriggerFinger(state.finger);

    // 枪口焰动态明暗
    const flashMatUniforms = muzzleFlashMesh.material.uniforms;
    if (debug.flash) {
      state.flashT = state.flashDur = 0.05;
      flashMatUniforms.uSeed.value = 3.7;
    }
    state.flashT -= dt;
    flashMatUniforms.uInt.value =
      state.flashT > 0 ? 9.5 * Math.sqrt(Math.max(0, state.flashT / state.flashDur)) : 0;
    flashMatUniforms.uHeat.value = saturate((state.heat - 0.45) / 0.8) * 2.2;
    muzzleFlashMesh.visible =
      flashMatUniforms.uInt.value > 0 || flashMatUniforms.uHeat.value > 0.02;

    if (debug.freeze) return;

    // 步进瞄准抖动与弹簧
    updateSwayAndSprings(dt, player, input, moveSpeed);

    // 跑动步伐摆动计算
    const curBobPhase = state.bobPhase;
    const bobIntensity = state.bobAmt * lerp(1, 0.12, state.adsE) * (1 + state.sprintT * 1.4);
    const bobX = Math.sin(curBobPhase) * 0.006 * bobIntensity;
    const bobY =
      (Math.sin(2 * curBobPhase) * 0.0042 -
        Math.pow(0.5 + 0.5 * Math.cos(2 * curBobPhase + 0.6), 4) * 0.0048) *
      bobIntensity;

    const adsInvertRatio = lerp(1, 0.3, state.adsE);
    const curTime = state.t;

    // 最终位置与姿态融合
    const moveX = input.move ? input.move.x : 0;
    const moveY = input.move ? input.move.y : 0;
    const hipWeight = 1 - state.adsE;
    const adsWeight = state.adsE;
    const sprintWeight = state.sprintT;
    const reloadWeight = state.reloadW;
    const rackWeight = state.rackW;

    // 视模位置计算
    const finalPosX =
      lerp(POSE_HIPFIRE.p[0], POSE_ADS.p[0], adsWeight) +
      POSE_SPRINT.p[0] * sprintWeight +
      POSE_RELOAD.p[0] * reloadWeight +
      bobX +
      Math.sin(curTime * 0.85 + 1) * 0.0012 * adsInvertRatio -
      state.swY.x * 0.06 -
      moveX * 0.004 * hipWeight -
      0.035 * inspectRoll;

    const finalPosY =
      lerp(POSE_HIPFIRE.p[1], POSE_ADS.p[1], adsWeight) +
      POSE_SPRINT.p[1] * sprintWeight +
      POSE_RELOAD.p[1] * reloadWeight +
      bobY +
      Math.sin(curTime * 1.7) * 0.0016 * adsInvertRatio +
      state.swP.x * 0.05 +
      state.jY.x +
      state.bump.x * 0.6 +
      0.045 * inspectRoll;

    const finalPosZ =
      lerp(POSE_HIPFIRE.p[2], POSE_ADS.p[2], adsWeight) +
      POSE_SPRINT.p[2] * sprintWeight +
      POSE_RELOAD.p[2] * reloadWeight +
      state.kZ.x * 0.55 +
      moveY * 0.004 * hipWeight * (1 - sprintWeight);

    // 视模旋转计算 (YXZ 欧拉角)
    const finalRotPitch =
      POSE_HIPFIRE.r[0] * hipWeight +
      POSE_SPRINT.r[0] * sprintWeight +
      POSE_RELOAD.r[0] * reloadWeight -
      0.16 * rackWeight +
      Math.sin(curTime * 1.7 + 0.8) * 0.0035 * adsInvertRatio +
      Math.sin(2 * curBobPhase + 0.5) * 0.008 * bobIntensity +
      state.swP.x +
      state.jP.x +
      state.kP.x +
      state.bump.x * 1.5 +
      0.3 * inspectRoll;

    const finalRotYaw =
      POSE_HIPFIRE.r[1] * hipWeight +
      POSE_SPRINT.r[1] * sprintWeight +
      POSE_RELOAD.r[1] * reloadWeight +
      Math.sin(curTime * 0.6) * 0.002 * adsInvertRatio +
      Math.sin(curBobPhase) * 0.01 * bobIntensity +
      state.swY.x +
      state.kY.x +
      0.18 * inspectRoll +
      0.25 * inspectYaw;

    const finalRotRoll =
      POSE_HIPFIRE.r[2] * hipWeight +
      POSE_SPRINT.r[2] * sprintWeight +
      POSE_RELOAD.r[2] * reloadWeight +
      0.62 * rackWeight +
      Math.sin(curBobPhase) * 0.014 * bobIntensity +
      state.swY.x * 0.7 -
      moveX * 0.035 * hipWeight +
      state.kR.x -
      0.75 * inspectPitch +
      0.55 * inspectYaw +
      Math.sin(curTime * 0.5) * 0.004 * adsInvertRatio;

    root.position.set(finalPosX, finalPosY, finalPosZ);
    root.rotation.set(finalRotPitch, finalRotYaw, finalRotRoll, "YXZ");
  }

  reset();
  return weapon;
}

/**
 * 展台/检视模式控制器 (Weapon Showcase Studio Mode)
 * 支持 ?show=weapon 独立参数调试枪模外观、各部细节与换弹动作
 * @param {object} ctx 全局上下文
 */
async function createShowcase(ctx) {
  const weaponInstance = await createWeapon(ctx);
  ctx.weapon = weaponInstance;
  const root = weaponInstance.root;

  const defaultCamPos = new THREE.Vector3(0, 1.68, 4);
  const lookDirections = {
    south: [0.28, -0.01, 1],
    east: [1, 0, 0.25],
    north: [-0.2, -0.01, -1],
    west: [-1, 0, 0.1],
    nw: [-0.75, -0.01, -0.65],
  };

  const cameraPresets = {
    side: [Math.PI, [1.12, 1.3, 0.11], [0, 1.235, 0.11], 30],
    right: [0, [1.12, 1.3, -0.11], [0, 1.235, -0.11], 30],
    top: [Math.PI * 0.86, [0.62, 1.8, -0.42], [0, 1.24, 0.12], 32],
    hands: [Math.PI, [0.4, 1.4, 0.02], [0.02, 1.215, 0.25], 30],
    rhand: [0, [0.36, 1.22, 0.27], [0.03, 1.16, 0.09], 30],
    muzzle: [Math.PI, [0.26, 1.37, 0.98], [0, 1.262, 0.44], 30],
    optic: [Math.PI, [0.2, 1.4, -0.26], [0, 1.31, 0.02], 30],
    lower: [Math.PI, [0.34, 1.26, 0.04], [0, 1.2, 0.03], 30],
  };

  const setShotCallback = window.__setShot;
  let currentPoseName = null;

  function applyPreset(poseName, options = {}) {
    currentPoseName = poseName;
    const preset = cameraPresets[poseName];
    const input = ctx.input;
    const player = ctx.player;

    input.ads = false;
    input.fire = false;
    player.sprinting = false;
    player.speed = 0;
    weaponInstance.debug.reloadT = null;
    weaponInstance.debug.flash = false;
    weaponInstance.debug.empty = false;
    weaponInstance.debug.freeze = !!preset;
    weaponInstance.reset();

    let camPos, camTarget, fov;

    if (preset) {
      // 工作台展台视角
      ctx.scene.add(root);
      root.position.set(0, 1.25, 0);
      root.rotation.set(0, preset[0], 0, "YXZ");
      root.traverse((mesh) => mesh.layers.set(FACTION_PLAYER));
      camPos = preset[1];
      camTarget = preset[2];
      fov = preset[3];
      if (options.wt != null) {
        weaponInstance.debug.reloadT = +options.wt;
        weaponInstance.debug.empty = !!options.wempty;
      }
    } else {
      // 第一人称持枪视角
      ctx.camera.add(root);
      root.traverse((mesh) => mesh.layers.set(FACTION_ENEMY));
      const lookDir = lookDirections[options.wlook] || lookDirections.south;
      camPos = [defaultCamPos.x, defaultCamPos.y, defaultCamPos.z];
      camTarget = [
        defaultCamPos.x + lookDir[0] * 50,
        defaultCamPos.y + lookDir[1] * 50,
        defaultCamPos.z + lookDir[2] * 50,
      ];
      fov = 74;

      if (poseName === "ads") {
        input.ads = true;
        fov = 52;
      }
      if (poseName === "sprint") {
        player.sprinting = true;
        player.speed = 6;
      }
      if (poseName === "fire") {
        weaponInstance.debug.flash = true;
        if (options.wads) {
          input.ads = true;
          fov = 52;
        }
      }
      if (poseName === "reload" || poseName === "empty") {
        weaponInstance.debug.reloadT = options.wt != null ? +options.wt : 0.62;
        weaponInstance.debug.empty = poseName === "empty";
      }
      if (poseName === "empty") {
        weaponInstance.ammo = 0;
      }
    }

    weaponInstance.snap();
    weaponInstance.update(0.016);
    weaponInstance.snap();

    if (setShotCallback) {
      setShotCallback({
        cam: options.cam || [...camPos, ...camTarget].join(","),
        fov: options.fov || fov,
        exposure: options.exposure,
      });
    }

    return { cam: camPos, target: camTarget };
  }

  const onShotChange = (opts) => {
    if (opts && opts.wpose) {
      applyPreset(opts.wpose, opts);
    }
  };

  if (typeof window !== "undefined") {
    if (
      typeof window.__setShot === "function" &&
      typeof window.__setShot.subscribe === "function"
    ) {
      window.__setShot.subscribe(onShotChange);
    } else {
      const prevSetShot = window.__setShot;
      window.__setShot = (opts) => {
        onShotChange(opts);
        if (typeof prevSetShot === "function") prevSetShot(opts);
      };
    }
  }

  const initialShot = applyPreset(ctx.params.wpose || "hip", ctx.params);

  return {
    cam: initialShot.cam,
    target: initialShot.target,
    update(dt) {
      weaponInstance.update(dt);
      if (currentPoseName === "fire") {
        weaponInstance.debug.flash = true;
      }
    },
  };
}

const dm = createWeapon;
const PC = createShowcase;
const Xv = { create: dm, showcase: PC };
export const create = createWeapon;
export const showcase = createShowcase;
export { dm, PC, Xv };

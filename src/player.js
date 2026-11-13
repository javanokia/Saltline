/**
 * player.js - 第一人称主角控制器 (First-Person Locomotion & Character Controller)
 * 几猫国产3A大作核心动力学与视口控制系统
 *
 * 核心功能：
 * 1. 运动学物理模拟：惯性加速度、地面摩擦制动、重力下坠、空中机动限制。
 * 2. 战术动作状态机：行走 (Walk)、疾跑冲刺 (Sprint)、蹲伏/滑铲 (Crouch)、跳跃缓冲 (Jump Buffer) 与 土狼时间 (Coyote Time)。
 * 3. 仿生第一人称相机系统：
 *    - 头部物理晃动 (Head Bobbing X/Y)
 *    - 侧滑转弯视角倾斜 (Strafe Roll)
 *    - 着地冲击力弹簧 (Harmonic Spring Landing Dip)
 *    - 后坐力上跳与阻尼回复 (Weapon Recoil Kickback & Damped Recovery)
 *    - 多频噪声镜头受击/爆炸震动 (Multi-frequency Camera Shake)
 *    - 动态开镜视场缩放 (ADS Smooth FOV Interpolation)
 * 4. 战术生命机制：受击红晕、心跳低血量黑白去色、落海自动救援机制、脱战生命自动恢复。
 */

import * as THREE from "three";

const lt = THREE;
const _M = Object.defineProperty;
const br = (i, e) => {
  for (var t in e) _M(i, t, { get: e[t], enumerable: true });
};

import {
  SCENE_BOUNDS,
  PLAYER_CONFIG,
  clamp,
  lerp,
  saturate,
  smoothstep,
  damp,
} from "./constants.js";

const { Vector3, Euler, Matrix4 } = THREE;

/**
 * 玩家机能调谐参数 (Player Locomotion & Feel Tuning)
 */
export const PLAYER_TUNE = {
  // 基础移动速度 (米/秒)
  walk: 3.8,
  sprint: 6.4,
  crouch: 1.9,
  ads: 2.4,

  // 加速度与阻尼
  accelGround: 34,
  decelGround: 26,
  accelAir: 9,
  gravity: 21,

  // 跳跃与物理高度
  jumpApex: 1.0, // 跳跃高度峰值 (米)
  coyote: 0.12, // 土狼时间 (离地后允许起跳的秒数)
  jumpBuffer: 0.13, // 跳跃预输入缓冲时间 (秒)
  standHeight: PLAYER_CONFIG.height, // 站立碰撞胶囊高 (1.8m)
  crouchHeight: 1.15, // 蹲伏碰撞胶囊高 (1.15m)
  eyeRate: 11, // 蹲起视高平滑过渡速率

  // 步频与脚步声距离跨度 (米)
  stride: {
    walk: 1.55,
    sprint: 2.1,
    crouch: 1.05,
  },

  // 头部正弦晃动幅度
  bobY: 0.024,
  bobX: 0.013,
  bobSprint: 1.9,
  bobAds: 0.22,
  rollStrafe: 0.02, // 侧移时视口微倾斜角

  // 着地缓冲下沉弹簧参数
  landDip: 0.36,
  landDipMax: 0.2,

  // 视场角 (FOV)
  fovSprint: 6,
  fovAds: 52,
  adsLook: 0.6, // 开镜时瞄准灵敏度缩放系数

  // 生命恢复
  regenDelay: 4.0, // 脱战恢复延迟 (秒)
  regenRate: 25.0, // 生命恢复速率 (点/秒)

  // 武器后坐力对相机的冲击
  recoilKeep: 0.35, // 保留作为永久视口偏角的比例
  recoilApply: 34, // 后坐力弹簧施加速度
  recoilRecover: 6.5, // 后坐力回复阻尼速率
  recoilHold: 0.09, // 后坐力持续时间

  // 屏幕震动衰减
  shakeDecay: 1.7,
  shakePitch: 0.03,
  shakeYaw: 0.03,
  shakeRoll: 0.045,

  // 俯仰角限制 (弧度，约 +/- 86 度)
  pitchLimit: 1.5,
};

// 起跳初速度公式：v = sqrt(2 * g * h)
const JUMP_VELOCITY = Math.sqrt(2 * PLAYER_TUNE.gravity * PLAYER_TUNE.jumpApex);

/**
 * 创建第一人称玩家控制器
 * @param {Object} ctx - 游戏全局上下文 GameContext
 */
export function createPlayer(ctx) {
  const camera = ctx.camera;
  const getPostParams = () => (ctx.render && ctx.render.post) || fallbackPost;
  const fallbackPost = {};

  // 视高与胶囊体尺寸
  let currentEyeHeight = PLAYER_CONFIG.eye;
  let targetCapsuleHeight = PLAYER_TUNE.standHeight;

  // 跳跃与离地计时
  let coyoteTimer = 0;
  let jumpBufferTimer = 0;
  let wasOnGround = true;
  let airTime = 0;
  let peakFallSpeed = 0;

  // 脚步声与晃动相位
  let footstepCycle = 0;
  let headBobWeight = 0;
  let bobOffsetX = 0;
  let bobOffsetY = 0;
  let strafeRollAngle = 0;

  // 着地阻尼弹簧振子 (Spring Damper System)
  const landDipSpring = { x: 0, v: 0 };

  // 后坐力目标值与当前插值
  let recoilPitchTarget = 0;
  let recoilYawTarget = 0;
  let recoilPitchCurrent = 0;
  let recoilYawCurrent = 0;
  let recoilHoldTimer = 0;

  // 震动与创伤脉冲
  let shakeIntensity = 0;
  let shakeElapsedTime = 0;
  let healthRegenTimer = 99;
  let hurtPulse = 0;
  let lowHealthWeight = 0;
  let deathTimer = 0;
  let currentFov = PLAYER_CONFIG.fov;
  let adsProgress = 0;
  let lastGroundSurface = "concrete";

  // 内部数学运算复用矢量与欧拉角
  const desiredVelocity = new Vector3();
  const cameraEuler = new Euler(0, 0, 0, "YXZ");
  const lastSafeQuayPosition = new Vector3();

  // 玩家状态接口对象
  const player = {
    pos: new Vector3(),
    eye: new Vector3(),
    vel: new Vector3(),
    forward: new Vector3(0, 0, -1),
    yaw: 0,
    pitch: 0,
    health: 100,
    maxHealth: 100,
    alive: true,
    onGround: true,
    sprinting: false,
    crouching: false,
    ads: 0,
    speed: 0,
    enabled: true,
    invulnerable: false,
    baseFov: PLAYER_CONFIG.fov,
    hurtPulse: 0,
    lookScale: 1,
    lastSafe: lastSafeQuayPosition,
    tuning: PLAYER_TUNE,

    /** 重置玩家至初始出生点或指定位置 */
    reset(spawnTransform) {
      const spawn = spawnTransform ||
        (ctx.level && ctx.level.playerStart) || { pos: new Vector3(), yaw: 0 };
      player.pos.copy(spawn.pos);
      player.yaw = spawn.yaw || 0;
      player.pitch = 0;
      player.vel.set(0, 0, 0);
      player.health = player.maxHealth;
      player.alive = true;
      player.onGround = true;
      player.sprinting = false;
      player.crouching = false;
      player.invulnerable = false;
      player.speed = 0;

      currentEyeHeight = PLAYER_CONFIG.eye;
      targetCapsuleHeight = PLAYER_TUNE.standHeight;
      coyoteTimer = 0;
      jumpBufferTimer = 0;
      wasOnGround = true;
      airTime = 0;
      peakFallSpeed = 0;
      footstepCycle = 0;
      headBobWeight = 0;
      bobOffsetX = 0;
      bobOffsetY = 0;
      strafeRollAngle = 0;

      landDipSpring.x = 0;
      landDipSpring.v = 0;
      recoilPitchTarget = 0;
      recoilYawTarget = 0;
      recoilPitchCurrent = 0;
      recoilYawCurrent = 0;
      recoilHoldTimer = 0;
      shakeIntensity = 0;
      healthRegenTimer = 99;
      hurtPulse = 0;
      lowHealthWeight = 0;
      deathTimer = 0;
      player.hurtPulse = 0;

      lastSafeQuayPosition.copy(player.pos);

      const post = getPostParams();
      post.damage = 0;
      post.lowHealth = 0;
      post.ads = 0;

      updateCameraRig(0);
    },

    /** 受到伤害 */
    damage(amount, sourcePosition) {
      if (!player.alive || player.invulnerable || !(amount > 0)) return;

      player.health = Math.max(0, player.health - amount);
      healthRegenTimer = 0;
      hurtPulse = Math.min(1, hurtPulse + 0.35 + amount / 40);
      player.addShake(0.22 + amount / 70);

      ctx.events.emit("player:hit", { amount, fromPos: sourcePosition });

      if (player.health <= 0) {
        player.alive = false;
        deathTimer = 0;
        player.sprinting = false;
        ctx.events.emit("player:dead", {});
      }
    },

    /** 治疗/恢复生命 */
    heal(amount) {
      if (player.alive) {
        player.health = Math.min(player.maxHealth, player.health + amount);
      }
    },

    /** 施加武器后坐力冲击 */
    addRecoil(pitchAmount = 0, yawAmount = 0) {
      const keep = PLAYER_TUNE.recoilKeep;
      // 永久偏移一部分
      player.pitch = clamp(
        player.pitch + pitchAmount * keep,
        -PLAYER_TUNE.pitchLimit,
        PLAYER_TUNE.pitchLimit,
      );
      player.yaw += yawAmount * keep;

      // 弹性回复部分
      recoilPitchTarget += pitchAmount * (1 - keep);
      recoilYawTarget += yawAmount * (1 - keep);
      recoilPitchTarget = clamp(recoilPitchTarget, -0.3, 0.3);
      recoilYawTarget = clamp(recoilYawTarget, -0.2, 0.2);
      recoilHoldTimer = PLAYER_TUNE.recoilHold;
    },

    /** 施加视口震动 */
    addShake(intensity = 0.3) {
      shakeIntensity = Math.min(1, shakeIntensity + intensity);
    },

    /** 调整基础视场角 */
    setFov(fovVal) {
      player.baseFov = clamp(+fovVal || PLAYER_CONFIG.fov, 55, 100);
    },

    /** 主逻辑更新 */
    update(dt) {
      updatePlayer(dt);
    },
  };

  // 监听环境爆炸波产生的视口晃动
  ctx.events.on("explosion", (evt) => {
    if (!evt || !evt.pos) return;
    const dist = player.eye.distanceTo(evt.pos);
    const scale = evt.size || 1;
    const impact = saturate(1 - dist / (14 + scale * 10)) * (0.35 + 0.35 * scale);
    if (impact > 0.01) player.addShake(impact);
  });

  /**
   * 检查头顶是否有障碍物阻止起身 (Stand-up clearance check)
   */
  function canStandUp() {
    const boxes = ctx.physics && ctx.physics.boxes;
    if (!boxes) return true;
    const r = PLAYER_CONFIG.radius * 0.9;
    const minY = player.pos.y + PLAYER_TUNE.crouchHeight - 0.05;
    const maxY = player.pos.y + PLAYER_TUNE.standHeight;

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.bulletOnly) continue;
      const xOverlap = !(player.pos.x + r < b.min.x || player.pos.x - r > b.max.x);
      const zOverlap = !(player.pos.z + r < b.min.z || player.pos.z - r > b.max.z);
      if (xOverlap && zOverlap && b.min.y < maxY && b.max.y > minY) {
        return false;
      }
    }
    return true;
  }

  /**
   * 查询当前脚下表面物理材质 (用于脚步声反馈)
   */
  function queryGroundSurface() {
    const px = player.pos.x;
    const pz = player.pos.z;
    try {
      if (ctx.ground && ctx.ground.isPuddle && player.pos.y < 0.05 && ctx.ground.isPuddle(px, pz)) {
        return "water";
      }
    } catch {}

    if (lastGroundSurface && lastGroundSurface !== "concrete") return lastGroundSurface;

    try {
      return (
        (ctx.level && ctx.level.groundSurfaceAt && ctx.level.groundSurfaceAt(px, pz)) ||
        lastGroundSurface ||
        "concrete"
      );
    } catch {
      return lastGroundSurface || "concrete";
    }
  }

  /**
   * 计算玩家在当前控制输入与开镜/蹲伏/冲刺下的期望速度与运动状态
   * @param {any} input
   * @param {boolean} isControlEnabled
   * @returns {{ moveX: number, moveY: number, hasMoveInput: boolean }}
   */
  function updateLocomotionIntent(input, isControlEnabled) {
    // 视角转动灵敏度缩放 (开镜降低灵敏度)
    player.lookScale = lerp(1, PLAYER_TUNE.adsLook, player.ads);
    if (isControlEnabled) {
      player.yaw -= input.look.dx * player.lookScale;
      player.pitch = clamp(
        player.pitch - input.look.dy * player.lookScale,
        -PLAYER_TUNE.pitchLimit,
        PLAYER_TUNE.pitchLimit,
      );

      // 规范化 Yaw 在合理弧度区间
      if (player.yaw > Math.PI * 4 || player.yaw < -Math.PI * 4) {
        player.yaw = player.yaw % (Math.PI * 2);
      }
    }

    // 蹲伏控制与站立阻挡
    if (isControlEnabled && input.crouch) {
      player.crouching = true;
    } else if (player.crouching && canStandUp()) {
      player.crouching = false;
    }
    targetCapsuleHeight = player.crouching ? PLAYER_TUNE.crouchHeight : PLAYER_TUNE.standHeight;

    // 移动输入向量
    const moveX = isControlEnabled ? input.move.x : 0;
    const moveY = isControlEnabled ? input.move.y : 0;
    const hasMoveInput = moveX * moveX + moveY * moveY > 0.01;

    // 冲刺判定：按住冲刺键 + 主要前推摇杆 + 非蹲伏 + 非开镜瞄准 + 非开火
    const canSprint =
      isControlEnabled &&
      input.sprint &&
      moveY > 0.55 &&
      Math.abs(moveX) < 0.6 &&
      !player.crouching &&
      player.ads < 0.35 &&
      !input.fire;
    player.sprinting =
      (canSprint && player.onGround && player.speed > PLAYER_TUNE.walk * 0.6) ||
      (canSprint && !player.onGround && player.sprinting);

    // 计算移动目标速率
    let targetSpeed = PLAYER_TUNE.walk;
    if (player.crouching) {
      targetSpeed = PLAYER_TUNE.crouch;
    } else if (canSprint) {
      targetSpeed = PLAYER_TUNE.sprint;
    }
    targetSpeed = lerp(targetSpeed, Math.min(targetSpeed, PLAYER_TUNE.ads), player.ads);
    if (moveY < 0) {
      targetSpeed *= lerp(1, 0.82, -moveY);
    }

    const sinYaw = Math.sin(player.yaw);
    const cosYaw = Math.cos(player.yaw);
    desiredVelocity
      .set(moveX * cosYaw - moveY * sinYaw, 0, -moveX * sinYaw - moveY * cosYaw)
      .multiplyScalar(targetSpeed);

    return { moveX, moveY, hasMoveInput };
  }

  /**
   * 水平/垂直动量积分、跳跃、胶囊体胶着碰撞与落水搜救
   * @param {number} dt
   * @param {any} input
   * @param {boolean} isControlEnabled
   * @param {boolean} hasMoveInput
   */
  function updatePlayerPhysics(dt, input, isControlEnabled, hasMoveInput) {
    // 水平地面惯性阻尼与空中机动响应
    const accelRate = player.onGround
      ? hasMoveInput
        ? PLAYER_TUNE.accelGround
        : PLAYER_TUNE.decelGround
      : hasMoveInput
        ? PLAYER_TUNE.accelAir
        : 0.6;

    let deltaVx = desiredVelocity.x - player.vel.x;
    let deltaVz = desiredVelocity.z - player.vel.z;
    if (!player.onGround && !hasMoveInput) {
      deltaVx = -player.vel.x;
      deltaVz = -player.vel.z;
    }

    const deltaDist = Math.hypot(deltaVx, deltaVz);
    const maxAccel = accelRate * dt;
    if (deltaDist <= maxAccel || deltaDist < 1e-6) {
      if (player.onGround || hasMoveInput) {
        player.vel.x = desiredVelocity.x;
        player.vel.z = desiredVelocity.z;
      }
    } else {
      player.vel.x += (deltaVx / deltaDist) * maxAccel;
      player.vel.z += (deltaVz / deltaDist) * maxAccel;
    }

    // 土狼时间与起跳预输入缓冲
    coyoteTimer = player.onGround ? PLAYER_TUNE.coyote : Math.max(0, coyoteTimer - dt);
    jumpBufferTimer =
      isControlEnabled && input.pressed("jump")
        ? PLAYER_TUNE.jumpBuffer
        : Math.max(0, jumpBufferTimer - dt);

    if (jumpBufferTimer > 0 && coyoteTimer > 0 && (!player.crouching || canStandUp())) {
      player.vel.y = JUMP_VELOCITY;
      jumpBufferTimer = 0;
      coyoteTimer = 0;
      player.onGround = false;
      player.crouching = false;
      targetCapsuleHeight = PLAYER_TUNE.standHeight;
      ctx.events.emit("player:jump", { pos: player.pos });
    }

    // 重力下落模拟
    player.vel.y -= PLAYER_TUNE.gravity * dt * 0.5;
    if (player.vel.y < -40) player.vel.y = -40;

    const preMoveVy = player.vel.y;
    // 物理引擎胶囊体步进碰撞
    const hitResult =
      ctx.physics.moveCapsule(
        player.pos,
        player.vel,
        dt,
        PLAYER_CONFIG.radius,
        targetCapsuleHeight,
        wasOnGround,
      ) || {};
    if (!hitResult.onGround) {
      player.vel.y -= PLAYER_TUNE.gravity * dt * 0.5;
    }

    // 港区地图边界钳位
    const bounds = ctx.physics.bounds;
    if (bounds) {
      player.pos.x = clamp(player.pos.x, bounds.min.x + 0.4, bounds.max.x - 0.4);
      player.pos.z = clamp(player.pos.z, bounds.min.z + 0.4, bounds.max.z - 0.4);
    }

    player.onGround = !!hitResult.onGround;
    if (hitResult.surface) {
      lastGroundSurface = hitResult.surface;
    }

    // 着地响应
    if (player.onGround) {
      if (!wasOnGround && airTime > 0.12) {
        const fallSpeed = Math.max(0, -preMoveVy, peakFallSpeed);
        landDipSpring.v -= Math.min(fallSpeed * PLAYER_TUNE.landDip, 3.2);

        if (fallSpeed > 7.5) {
          player.addShake(Math.min(0.5, (fallSpeed - 7.5) * 0.06));
        }
        ctx.events.emit("player:land", {
          speed: fallSpeed,
          surface: queryGroundSurface(),
          pos: player.pos,
        });

        // 高处坠落伤害 (> 13 m/s)
        if (fallSpeed > 13) {
          player.damage((fallSpeed - 13) * 7, null);
        }
        footstepCycle = 0.35;
      }
      airTime = 0;
      peakFallSpeed = 0;

      // 记录安全的码头陆地位置 (防止落海失救)
      if (player.pos.x <= SCENE_BOUNDS.quayX - 1.2 && player.pos.y > -0.5) {
        lastSafeQuayPosition.copy(player.pos);
      }
    } else {
      airTime += dt;
      peakFallSpeed = Math.max(peakFallSpeed, -player.vel.y);
    }

    wasOnGround = player.onGround;

    // 掉入海水中自动救援
    if (player.pos.y < SCENE_BOUNDS.seaY - 2.2) {
      player.pos.copy(lastSafeQuayPosition);
      player.vel.set(0, 0, 0);
      player.onGround = true;
      wasOnGround = true;
      shakeIntensity = 0.6;
      player.yaw += Math.PI;
      player.damage(12, null);
      ctx.events.emit("player:rescued", {});
    }

    player.speed = Math.hypot(player.vel.x, player.vel.z);
  }

  /**
   * 玩家主动机能主更新循环
   */
  function updatePlayer(dt) {
    const input = ctx.input;
    const weapon = ctx.weapon || {};

    // 瞄准开镜 (ADS) 权重平滑
    if (weapon.stub || typeof weapon.ads !== "number") {
      adsProgress = damp(adsProgress, player.enabled && input.ads ? 1 : 0, 14, dt);
      player.ads = adsProgress;
    } else {
      player.ads = saturate(weapon.ads);
    }

    // 阵亡状态处理
    if (!player.alive) {
      deathTimer += dt;
      updateDeadPhysics(dt);
      updateCameraRig(dt);
      updatePostEffects(dt);
      return;
    }

    const isControlEnabled = player.enabled;

    // 1. 意图解析与机能速度期望
    const { hasMoveInput } = updateLocomotionIntent(input, isControlEnabled);

    // 2. 运动学动力学积分与物理碰撞
    updatePlayerPhysics(dt, input, isControlEnabled, hasMoveInput);

    // 3. 脚步声节拍驱动
    const currentStride = player.crouching
      ? PLAYER_TUNE.stride.crouch
      : player.sprinting
        ? PLAYER_TUNE.stride.sprint
        : PLAYER_TUNE.stride.walk;
    if (player.onGround && player.speed > 0.5) {
      const prevStep = footstepCycle;
      footstepCycle += (player.speed * dt) / currentStride;
      if (Math.floor(footstepCycle) > Math.floor(prevStep)) {
        ctx.events.emit("player:step", {
          surface: queryGroundSurface(),
          sprint: player.sprinting,
          pos: player.pos,
        });
      }
    } else if (player.onGround) {
      footstepCycle = damp(footstepCycle, Math.round(footstepCycle), 8, dt);
    }

    // 4. 第一人称视口仿生摆动 (Head Bobbing)
    const bobTarget = player.onGround
      ? saturate(player.speed / PLAYER_TUNE.walk) *
        (player.sprinting ? PLAYER_TUNE.bobSprint : 1) *
        lerp(1, PLAYER_TUNE.bobAds, player.ads) *
        (player.crouching ? 0.7 : 1)
      : 0;
    headBobWeight = damp(headBobWeight, bobTarget, 9, dt);
    bobOffsetY = -Math.cos(footstepCycle * Math.PI * 2) * PLAYER_TUNE.bobY * headBobWeight;
    bobOffsetX = Math.sin(footstepCycle * Math.PI) * PLAYER_TUNE.bobX * headBobWeight;

    // 5. 侧倾转角 (Strafe Roll)
    const sinYaw = Math.sin(player.yaw);
    const cosYaw = Math.cos(player.yaw);
    const lateralSpeed = player.vel.x * cosYaw - player.vel.z * sinYaw;
    strafeRollAngle = damp(
      strafeRollAngle,
      (-lateralSpeed / PLAYER_TUNE.sprint) * PLAYER_TUNE.rollStrafe * lerp(1, 0.4, player.ads),
      8,
      dt,
    );

    // 6. 脱战生命自然回复
    healthRegenTimer += dt;
    if (healthRegenTimer > PLAYER_TUNE.regenDelay && player.health < player.maxHealth) {
      player.health = Math.min(player.maxHealth, player.health + PLAYER_TUNE.regenRate * dt);
    }

    updateCameraRig(dt);
    updatePostEffects(dt);
  }

  /**
   * 玩家死亡物理减速
   */
  function updateDeadPhysics(dt) {
    player.vel.x = damp(player.vel.x, 0, 5, dt);
    player.vel.z = damp(player.vel.z, 0, 5, dt);
    player.vel.y -= PLAYER_TUNE.gravity * dt;

    try {
      const hit = ctx.physics.moveCapsule(
        player.pos,
        player.vel,
        dt,
        PLAYER_CONFIG.radius,
        0.6,
        wasOnGround,
      );
      wasOnGround = !!(hit && hit.onGround);
    } catch {}

    if (player.pos.y < SCENE_BOUNDS.seaY - 1) {
      player.pos.y = SCENE_BOUNDS.seaY - 1;
      player.vel.y = 0;
    }
    player.speed = 0;
    player.sprinting = false;
    headBobWeight = damp(headBobWeight, 0, 10, dt);
    bobOffsetX *= 0.9;
    bobOffsetY *= 0.9;
  }

  /**
   * 更新第一人称相机骨架、视高插值、后坐力回复与多频震动
   */
  function updateCameraRig(dt) {
    let targetEyeY = player.crouching ? PLAYER_CONFIG.crouchEye : PLAYER_CONFIG.eye;
    let deathRoll = 0;
    let deathPitch = 0;

    if (player.alive) {
      currentEyeHeight =
        dt > 0 ? damp(currentEyeHeight, targetEyeY, PLAYER_TUNE.eyeRate, dt) : targetEyeY;
    } else {
      // 倒下死亡动作视线倾斜
      const progress = smoothstep(0, 0.85, deathTimer);
      const ease = progress * progress;
      targetEyeY = lerp(PLAYER_CONFIG.eye, 0.22, ease);
      currentEyeHeight = damp(currentEyeHeight, targetEyeY, 18, dt);
      deathRoll = 1.15 * ease;
      deathPitch = -0.25 * progress + 0.12 * Math.sin(progress * Math.PI);
    }

    if (dt > 0) {
      // 二阶弹簧着地减震模拟
      const springForce = -landDipSpring.x * 150 - landDipSpring.v * 17;
      landDipSpring.v += springForce * dt;
      landDipSpring.x += landDipSpring.v * dt;
      landDipSpring.x = clamp(landDipSpring.x, -PLAYER_TUNE.landDipMax, 0.05);

      // 后坐力回复阻尼
      recoilHoldTimer -= dt;
      if (recoilHoldTimer <= 0) {
        recoilPitchTarget = damp(recoilPitchTarget, 0, PLAYER_TUNE.recoilRecover, dt);
        recoilYawTarget = damp(recoilYawTarget, 0, PLAYER_TUNE.recoilRecover, dt);
      }
      recoilPitchCurrent = damp(recoilPitchCurrent, recoilPitchTarget, PLAYER_TUNE.recoilApply, dt);
      recoilYawCurrent = damp(recoilYawCurrent, recoilYawTarget, PLAYER_TUNE.recoilApply, dt);

      // 镜头震动衰减
      shakeIntensity = Math.max(0, shakeIntensity - PLAYER_TUNE.shakeDecay * dt);
      shakeElapsedTime += dt;
    }

    const sinYaw = Math.sin(player.yaw);
    const cosYaw = Math.cos(player.yaw);

    // 最终相机视点位置 = 玩家根节点 + 左右摆动 + 视高 + 上下晃动 + 缓冲弹簧
    player.eye.set(
      player.pos.x + bobOffsetX * cosYaw,
      player.pos.y + currentEyeHeight + bobOffsetY + landDipSpring.x,
      player.pos.z - bobOffsetX * sinYaw,
    );

    // 视口朝向叠加后坐力
    const totalPitch = clamp(player.pitch + recoilPitchCurrent, -1.55, 1.55);
    const totalYaw = player.yaw + recoilYawCurrent;
    cameraEuler.set(totalPitch, totalYaw, 0, "YXZ");
    player.forward.set(0, 0, -1).applyEuler(cameraEuler);

    // 多频复合噪声模拟真实受击震颤
    const shakePower = shakeIntensity * shakeIntensity;
    const time = shakeElapsedTime;
    const shakeP =
      shakePower *
      PLAYER_TUNE.shakePitch *
      (Math.sin(time * 43.1) + 0.6 * Math.sin(time * 71.7 + 1.3));
    const shakeY =
      shakePower *
      PLAYER_TUNE.shakeYaw *
      (Math.sin(time * 37.3 + 2.1) + 0.6 * Math.sin(time * 83.9));
    const shakeR =
      shakePower *
      PLAYER_TUNE.shakeRoll *
      (Math.sin(time * 29.7 + 0.7) + 0.5 * Math.sin(time * 61.3 + 4));

    camera.position.copy(player.eye);
    camera.rotation.set(
      totalPitch + shakeP + deathPitch + landDipSpring.x * 0.12,
      totalYaw + shakeY,
      strafeRollAngle + shakeR + deathRoll + bobOffsetX * 0.35,
      "YXZ",
    );

    // 动态 FOV 过渡
    if (!ctx.params || !ctx.params.fov) {
      const adsFovTarget = (ctx.weapon && ctx.weapon.adsFov) || PLAYER_TUNE.fovAds;
      const targetFov = lerp(
        player.baseFov + (player.sprinting ? PLAYER_TUNE.fovSprint : 0),
        adsFovTarget,
        player.ads,
      );
      currentFov =
        dt > 0
          ? damp(currentFov, targetFov, player.ads > 0.02 && player.ads < 0.98 ? 30 : 7, dt)
          : targetFov;
      if (Math.abs(camera.fov - currentFov) > 0.01) {
        camera.fov = currentFov;
        camera.updateProjectionMatrix();
      }
    }
  }

  /**
   * 更新受击红晕与残血去色等屏幕特效
   */
  function updatePostEffects(dt) {
    hurtPulse = Math.max(0, hurtPulse - dt * 1.9);
    player.hurtPulse = hurtPulse;

    const lowHealthTarget = player.alive
      ? smoothstep(0.55, 0.12, player.health / player.maxHealth)
      : 1;
    lowHealthWeight = damp(lowHealthWeight, lowHealthTarget, 4, dt);

    const post = getPostParams();
    post.damage = hurtPulse;
    post.lowHealth = lowHealthWeight;
    post.ads = player.ads;
  }

  return player;
}

export const create = createPlayer;
export { createPlayer as x_ };

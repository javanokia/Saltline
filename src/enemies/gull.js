import * as THREE from "three";
import { createCylinderGeometry } from "../geo.js";
import {
  SkeletonRig,
  createSkinnedMesh,
  placeGeometry,
  createBeveledBox,
  createCylinderY,
  createCylinderZ,
  createPipeBetweenPoints,
  createScaledSphere,
  HALF_PI,
  COLOR_SHELL_WHITE,
  COLOR_SHELL_WARM,
  COLOR_HAZARD_ORANGE,
  COLOR_DARK_ALLOY,
  COLOR_CHASSIS_BLACK,
  COLOR_AMBER_WARNING,
  COLOR_NEUTRAL_WHITE,
  COLOR_CHROME_BRIGHT,
  COLOR_GUNMETAL_GREY,
  LENS_COLOR_AMBER_PATROL,
  LENS_COLOR_RED_ALERT,
} from "./rig.js";
import { clampValue, diffAngle } from "./math.js";

const {
  CircleGeometry: Bu,
  Vector2: Ae,
  Vector3: W,
  LatheGeometry: ar,
  PlaneGeometry: rn,
  Mesh: Qe,
} = THREE;

const DOWN_DIR = new W(0, -1, 0);
const UP_DIR_Y = new W(0, 1, 0);
const tempAccVec = new W();
const tempRayDir = new W();
const tempTargetPos = new W();
const tempSparkPos = new W();

const GULL_RIG_SPEC = {
  rotors: [
    [0.33, 0.035, 0.3],
    [-0.33, 0.035, 0.3],
    [0.33, 0.035, -0.3],
    [-0.33, 0.035, -0.3],
  ],
  gimbal: [0, -0.095, 0.275],
  ball: [0, -0.072, 0],
  gun: [0, -0.085, -0.1],
  muzzle: [0, -0.032, 0.27],
  lamp: [0, -0.066, 0.025],
};

const xm = GULL_RIG_SPEC;

/**
 * 构造飞鸥高升力空气动力学旋翼桨叶截面
 */
function buildGullPropellerBlade() {
  const profilePoints = [
    [0.176, -0.036],
    [0.196, -0.032],
    [0.206, 0],
    [0.202, 0.03],
    [0.19, 0.04],
    [0.178, 0.032],
    [0.173, 0],
    [0.176, -0.036],
  ].map((p) => new Ae(p[0], p[1]));
  return new ar(profilePoints, 28);
}

const FC = buildGullPropellerBlade;

/**
 * 组装机械飞鸥（Gull）四旋翼无人机程序化骨架与几何构件
 */
function buildGullRig() {
  const spec = GULL_RIG_SPEC;
  const rig = new SkeletonRig();
  const extraRig = new SkeletonRig();

  const addBoneBoth = (name, parent, x, y, z) => {
    rig.bone(name, parent, x, y, z);
    extraRig.bone(name, parent, x, y, z);
  };

  // 1. 骨骼拓扑树
  addBoneBoth("root", null, 0, 0, 0);
  addBoneBoth("body", "root", 0, 0, 0);

  for (let i = 0; i < 4; i++) {
    addBoneBoth("rotor" + i, "body", spec.rotors[i][0], spec.rotors[i][1], spec.rotors[i][2]);
  }

  addBoneBoth("gimbalYaw", "body", spec.gimbal[0], spec.gimbal[1], spec.gimbal[2]);
  addBoneBoth("ball", "gimbalYaw", spec.ball[0], spec.ball[1], spec.ball[2]);
  addBoneBoth("lamp", "ball", spec.lamp[0], spec.lamp[1], spec.lamp[2]);
  addBoneBoth("gun", "body", spec.gun[0], spec.gun[1], spec.gun[2]);
  addBoneBoth("strobeG", "body", 0, 0, 0);
  addBoneBoth("strobeR", "body", 0, 0, 0);
  addBoneBoth("strobeW", "body", 0, 0, 0);

  const add = (slot, bone, geo, tint, applyShading) => rig.add(slot, bone, geo, tint, applyShading);

  // 流线型机身外壳与航空碳纤维结构
  add(
    "shell",
    "body",
    placeGeometry(createScaledSphere(1, 20, 12, 0.118, 0.074, 0.27), 0, 0.02, 0),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(
      createCylinderGeometry(1, 0.9, 1, 20),
      0,
      0.02,
      0.165,
      HALF_PI,
      0,
      0,
      [0.094, 0.05, 0.06],
    ),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "shell",
    "body",
    placeGeometry(
      createCylinderGeometry(1, 1, 1, 20),
      0,
      0.02,
      -0.02,
      HALF_PI,
      0,
      0,
      [0.121, 0.012, 0.0765],
    ),
    COLOR_DARK_ALLOY,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.118, 0.014, 0.2, 0.005), 0, 0.089, -0.03),
    COLOR_SHELL_WARM,
  );
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.09, 0.05, 0.16, 0.008), 0, -0.045, -0.01),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.095, 0.02, 0.12, 0.004), 0, -0.072, -0.01),
    COLOR_HAZARD_ORANGE,
  );

  // 四向碳纤机臂与无刷电机机舱 (Carbon Arms & Rotor Nacelles)
  for (let i = 0; i < 4; i++) {
    const rx = spec.rotors[i][0];
    const ry = spec.rotors[i][1];
    const rz = spec.rotors[i][2];
    const armGeo = createPipeBetweenPoints([0, 0.01, 0], [rx, ry - 0.01, rz], 0.014, 0.011, 8);
    add("metal", "body", armGeo, COLOR_CHROME_BRIGHT);

    // 电机罩与支柱
    add(
      "metal",
      "body",
      placeGeometry(createCylinderY(0.028, 0.024, 0.035, 12), rx, ry - 0.01, rz),
      COLOR_DARK_ALLOY,
    );
    add(
      "shell",
      "body",
      placeGeometry(createCylinderY(0.03, 0.029, 0.016, 12), rx, ry - 0.005, rz),
      COLOR_SHELL_WHITE,
    );
    add(
      "metal",
      "rotor" + i,
      placeGeometry(createCylinderY(0.012, 0.012, 0.02, 10), 0, 0.01, 0),
      COLOR_CHROME_BRIGHT,
    );

    // 旋翼桨叶几何
    const bladeGeo = buildGullPropellerBlade();
    add("metal", "rotor" + i, placeGeometry(bladeGeo, 0, 0.005, 0), COLOR_GUNMETAL_GREY);

    // 旋转半透明高升力气动虚拟圆盘 (Rotor Motion Blur Disc)
    extraRig.add(
      "disc",
      "rotor" + i,
      placeGeometry(new Bu(0.208, 24), 0, 0.018, 0, -HALF_PI, 0, 0),
    );
  }

  // 腹部双轴侦察光电球 (2-Axis Surveillance Gimbal)
  add(
    "metal",
    "gimbalYaw",
    placeGeometry(createCylinderY(0.04, 0.04, 0.016, 12), 0, 0, 0),
    COLOR_DARK_ALLOY,
  );
  add(
    "metal",
    "ball",
    placeGeometry(createScaledSphere(0.048, 14, 10), 0, 0, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "shell",
    "ball",
    placeGeometry(createBeveledBox(0.055, 0.055, 0.025, 0.006), 0, 0, 0.032),
    COLOR_SHELL_WHITE,
  );
  add(
    "lens",
    "lamp",
    placeGeometry(createCylinderZ(0.026, 0.026, 0.008, 14), 0, 0, 0.045),
    [1, 1, 1],
    false,
  );

  // 侦察锥形警示探照光束 (Searchlight Visual Cone)
  extraRig.add(
    "cone",
    "lamp",
    placeGeometry(createCylinderGeometry(0.02, 0.65, 4.5, 16, true), 0, 0, 2.25, HALF_PI, 0, 0),
  );

  // 机头等离子速射炮 (Plasma Auto-Pulse Cannon)
  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.038, 0.038, 0.22, 0.004), 0, 0, 0.1),
    COLOR_DARK_ALLOY,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderZ(0.009, 0.009, 0.18, 8), 0, 0, 0.24),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "glow",
    "gun",
    placeGeometry(createCylinderZ(0.007, 0.007, 0.02, 8), 0, 0, 0.32),
    [14, 1, 0.35],
    false,
  );

  // 国际民航标准红/绿/白三色导航频闪灯 (Aviation Navigation Strobes)
  add(
    "glow",
    "strobeR",
    placeGeometry(createScaledSphere(0.012, 8, 6), -0.33, 0.04, 0.3),
    [14, 0.5, 0.2],
    false,
  ); // 左翼尖红灯
  add(
    "glow",
    "strobeG",
    placeGeometry(createScaledSphere(0.012, 8, 6), 0.33, 0.04, 0.3),
    [0.3, 12, 1],
    false,
  ); // 右翼尖绿灯
  add(
    "glow",
    "strobeW",
    placeGeometry(createScaledSphere(0.014, 8, 6), 0, 0.08, -0.31),
    [12, 12, 12],
    false,
  ); // 尾部防撞白频闪

  const rigDef = rig.build();
  rigDef.extra = extraRig.build();
  return rigDef;
}

const j_ = buildGullRig;

const GULL_CONFIG = {
  hp: 45,
  boltDamage: 7,
  boltSpeed: 70,
  burst: 3,
  burstGap: 0.12,
  telegraph: 0.55,
  cooldown: [1.9, 3.3],
  rangeMin: 12,
  rangeMax: 25,
  fireRange: 28,
  altMin: 4,
  altMax: 8,
  patrolSpeed: 3.5,
  maxSpeed: 8.5,
  accel: 14,
  spreadNear: 0.015,
  spreadFar: 0.04,
  explodeRadius: 4.5,
  explodeDamage: 45,
};

const Zv = GULL_CONFIG;

function createGull(hiveCtx, rigDef, materials, index) {
  const engineCtx = hiveCtx.G;
  const rng = hiveCtx.rng;
  const lensMat = materials.lensBase.clone();

  const skinnedMeshWrapper = createSkinnedMesh(
    rigDef,
    {
      shell: materials.shell,
      metal: materials.metal,
      glow: materials.glow,
      lens: lensMat,
      disc: materials.disc,
      cone: materials.cone,
    },
    {
      radius: 0.9,
      center: [0, 0, 0],
      extra: { def: rigDef.extra, radius: 10 },
    },
  );

  const bones = skinnedMeshWrapper.bones;
  skinnedMeshWrapper.group.rotation.order = "YXZ";
  skinnedMeshWrapper.group.visible = false;

  // 编号与军规战术铭牌 (ID Tactical Label)
  const labelDef = engineCtx.mats.label("G-" + String(index + 11), {
    color: "black",
    font: "stencil",
    distress: 0.35,
  });
  const labelWidth = 0.105;
  const labelHeight = Math.min(0.045, labelWidth / (labelDef.aspect || 3));
  const labelPlane = new rn(labelWidth, labelHeight);
  labelPlane.rotateX(-HALF_PI);
  labelPlane.rotateY(Math.PI);
  const labelMesh = new Qe(labelPlane, labelDef.material);
  labelMesh.position.set(0, 0.0985, -0.085);
  labelMesh.castShadow = false;
  labelMesh.receiveShadow = true;
  bones.body.add(labelMesh);

  // 实体属性与状态
  const gull = {
    id: 0,
    type: "gull",
    pos: skinnedMeshWrapper.group.position,
    alive: false,
    hp: GULL_CONFIG.hp,
    active: false,
    rig: skinnedMeshWrapper,
    lens: lensMat,
    vel: new W(),
    yaw: 0,
    pitch: 0,
    roll: 0,
    home: new W(),
    lastKnown: new W(),
    sensor: new W(),
    fwd: new W(0, 0, 1),
    muzzle: new W(),
    mode: "patrol",
    los: false,
    seeT: 0,
    noSeeT: 0,
    senseT: 0,
    exposure: 0,
    modeT: 0,
    passive: false,
    hasToken: false,
    orbitA: 0,
    orbitDir: 1,
    orbitR: 16,
    alt: 6,
    hoverY: 0,
    phase: 0,
    ceil: 1e9,
    ceilT: 0,
    flipT: 0,
    avoid: new W(),
    atk: "idle",
    atkT: 0,
    cool: 1,
    shots: 0,
    smokeT: 0,
    feeler: 0,
    strobeT: 0,
    flare: 0,
    lensC: [LENS_COLOR_AMBER_PATROL[0], LENS_COLOR_AMBER_PATROL[1], LENS_COLOR_AMBER_PATROL[2]],
    dieT: 0,
    spin: 0,
    lostRotor: 0,
    gy: 0,
    gp: 0,
    loop: null,
    sweep: 0,
    thr: 1,

    damage(amount, hitPoint, impulse, hitPart) {
      if (!gull.alive) return false;
      gull.hp -= amount;
      engineCtx.events.emit("enemy:hit", {
        enemy: gull,
        point: hitPoint,
        part: hitPart || "body",
      });

      if (impulse) {
        gull.vel.addScaledVector(impulse, Math.min(3, amount * 0.09));
        gull.roll += (rng() - 0.5) * 0.5;
        gull.pitch += (rng() - 0.5) * 0.4;
      }

      hiveCtx.provoke(gull);
      if (gull.hp <= 0) {
        killGull(impulse);
        return true;
      }
      return false;
    },

    _activate(spawnPos, options = {}) {
      gull.active = true;
      gull.alive = true;
      gull.hp = GULL_CONFIG.hp;
      gull.passive = !!options.passive;
      gull.pos.copy(spawnPos);
      gull.home.copy(spawnPos);
      gull.vel.set(0, 0, 0);
      gull.yaw = options.yaw ?? rng() * 6.283;
      gull.pitch = gull.roll = 0;
      gull.mode = options.state === "alert" ? "investigate" : "patrol";
      gull.modeT = 8;
      gull.lastKnown.copy(options.target || (engineCtx.player ? engineCtx.player.pos : spawnPos));
      gull.los = false;
      gull.seeT = gull.noSeeT = 0;
      gull.exposure = 0;
      gull.senseT = rng() * 0.2;
      gull.hasToken = false;
      gull.orbitDir = rng() < 0.5 ? 1 : -1;
      gull.orbitR =
        GULL_CONFIG.rangeMin + 2 + rng() * (GULL_CONFIG.rangeMax - GULL_CONFIG.rangeMin - 5);
      gull.alt =
        options.hover ??
        GULL_CONFIG.altMin + 0.8 + rng() * (GULL_CONFIG.altMax - GULL_CONFIG.altMin - 1.6);
      gull.hoverFixed = options.hover != null;
      gull.patrolR = options.patrolRadius ?? 4 + rng() * 5;
      gull.phase = rng() * 6.283;
      gull.orbitA = rng() * 6.283;
      gull.ceil = 1e9;
      gull.flipT = 3 + rng() * 4;
      gull.atk = "idle";
      gull.cool = 1 + rng() * 1.5;
      gull.dieT = 0;
      gull.spin = 0;
      gull.lostRotor = -1;
      gull.flare = 0;
      gull.thr = 1;

      for (let m = 0; m < 4; m++) bones["rotor" + m].scale.setScalar(1);
      bones.lamp.scale.setScalar(1);
      bones.body.rotation.set(0, 0, 0);
      skinnedMeshWrapper.group.visible = true;
      skinnedMeshWrapper.group.rotation.set(0, gull.yaw, 0);

      if (engineCtx.audio && engineCtx.audio.loop && !gull.loop) {
        try {
          gull.loop = engineCtx.audio.loop("gull_rotor", { pos: gull.pos, gain: 0.5 });
        } catch {
          gull.loop = null;
        }
      }
    },

    _deactivate() {
      gull.active = false;
      gull.alive = false;
      skinnedMeshWrapper.group.visible = false;
      hiveCtx.releaseToken(gull);
      if (gull.loop) {
        try {
          gull.loop.stop();
        } catch {}
        gull.loop = null;
      }
    },

    _raycast(rayOrigin, rayDir, maxDist, outHit) {
      // 椭球体空间变换解析求交 (Raycast against squashed ellipsoid)
      const dx = rayOrigin.x - gull.pos.x;
      const dy = (rayOrigin.y - gull.pos.y + 0.03) * 2.3;
      const dz = rayOrigin.z - gull.pos.z;

      const vx = rayDir.x;
      const vy = rayDir.y * 2.3;
      const vz = rayDir.z;

      const a = vx * vx + vy * vy + vz * vz;
      const b = dx * vx + dy * vy + dz * vz;
      const c = dx * dx + dy * dy + dz * dz - 0.5 * 0.5;

      const disc = b * b - a * c;
      if (disc < 0) return false;

      const t = (-b - Math.sqrt(disc)) / a;
      if (t < 0 || t > maxDist || t >= outHit.dist) return false;

      outHit.dist = t;
      outHit.part = "body";
      outHit.enemy = gull;
      outHit.point.copy(rayOrigin).addScaledVector(rayDir, t);
      outHit.normal.copy(outHit.point).sub(gull.pos);
      outHit.normal.y *= 2.3;
      outHit.normal.normalize();
      return true;
    },

    _update(dt) {
      if (gull.alive) updateAliveGull(dt);
      else updateDeadGull(dt);
    },
  };

  /**
   * 飞鸥击毁死亡处理 (Rotor Failure & Spin-out)
   */
  function killGull(impulse) {
    gull.alive = false;
    hiveCtx.releaseToken(gull);
    gull.dieT = 0;
    gull.lostRotor = Math.floor(rng() * 4);
    bones["rotor" + gull.lostRotor].scale.setScalar(1e-4);

    tempSparkPos
      .set(GULL_RIG_SPEC.rotors[gull.lostRotor][0], 0.05, GULL_RIG_SPEC.rotors[gull.lostRotor][2])
      .applyAxisAngle(UP_DIR_Y, gull.yaw)
      .add(gull.pos);

    engineCtx.fx.sparks(tempSparkPos, UP_DIR_Y, 14);
    engineCtx.fx.debris(tempSparkPos, { count: 3 });
    engineCtx.fx.smoke(tempSparkPos, { size: 0.5, life: 1 });

    gull.spin = (rng() < 0.5 ? -1 : 1) * (5 + rng() * 3);
    gull.vel.y += 1.5;
    if (impulse) gull.vel.addScaledVector(impulse, 2.5);

    bones.lamp.scale.setScalar(1e-4);
    bones.strobeG.scale.setScalar(1e-4);
    bones.strobeR.scale.setScalar(1e-4);
    bones.strobeW.scale.setScalar(1e-4);
    lensMat.color.setRGB(0.3, 0.05, 0.02);

    engineCtx.events.emit("enemy:killed", { enemy: gull, pos: gull.pos, type: "gull" });
  }

  /**
   * 飞鸥坠毁物理动力学与触地爆炸 (Dead Crash Physics & Ground Explosion)
   */
  function updateDeadGull(dt) {
    gull.dieT += dt;
    gull.vel.y -= 9.5 * dt;
    gull.vel.x *= 1 - 0.4 * dt;
    gull.vel.z *= 1 - 0.4 * dt;

    gull.spin += Math.sign(gull.spin) * 7 * dt;
    gull.yaw += gull.spin * dt;
    gull.roll += gull.spin * 0.35 * dt;
    gull.pitch += 0.9 * dt;

    const currentSpeed = gull.vel.length();
    const moveStep = currentSpeed * dt;
    let hasExploded = gull.dieT > 5 || gull.pos.y < -3;

    if (!hasExploded && currentSpeed > 0.01) {
      tempRayDir.copy(gull.vel).multiplyScalar(1 / currentSpeed);
      const hit = engineCtx.physics.raycast(gull.pos, tempRayDir, moveStep + 0.3);
      if (hit) {
        gull.pos.copy(hit.point).addScaledVector(hit.normal, 0.2);
        hasExploded = true;
      }
    }

    if (!hasExploded) {
      gull.pos.addScaledVector(gull.vel, dt);
    }

    skinnedMeshWrapper.group.rotation.set(gull.pitch, gull.yaw, gull.roll);

    for (let r = 0; r < 4; r++) {
      if (r !== gull.lostRotor) {
        bones["rotor" + r].rotation.y +=
          (r % 3 === 0 ? 1 : -1) * 30 * Math.max(0.2, 1 - gull.dieT * 0.5) * dt;
      }
    }

    gull.smokeT -= dt;
    if (gull.smokeT <= 0) {
      gull.smokeT = 0.045;
      engineCtx.fx.smoke(gull.pos, { size: 0.45, life: 1.3, color: 0x15161a, rise: 0.6 });
      if (rng() < 0.5) {
        tempSparkPos.set(rng() - 0.5, rng(), rng() - 0.5).normalize();
        engineCtx.fx.sparks(gull.pos, tempSparkPos, 3);
      }
    }

    if (gull.loop) {
      gull.loop.setPos(gull.pos);
      gull.loop.setPitch(Math.max(0.4, 1.25 - gull.dieT * 0.4));
      gull.loop.setGain(0.5);
    }

    if (hasExploded) {
      engineCtx.fx.explosion(gull.pos, 1.2);
      if (engineCtx.combat && engineCtx.combat.explode) {
        engineCtx.combat.explode(
          gull.pos,
          GULL_CONFIG.explodeRadius,
          GULL_CONFIG.explodeDamage,
          "enemy",
        );
      }
      hiveCtx.retire(gull);
    }
  }

  /**
   * 飞鸥飞行航路轨迹规划
   * @param {number} dt
   * @param {any} player
   * @param {boolean} isEngaging
   * @returns {{ targetSpeed: number, destX: number, destY: number, destZ: number }}
   */
  function planGullFlightPath(dt, player, isEngaging) {
    let targetSpeed = GULL_CONFIG.patrolSpeed;
    let destX, destY, destZ;

    if (isEngaging && player) {
      targetSpeed = GULL_CONFIG.maxSpeed;
      const isAttacking = gull.atk !== "idle";
      gull.flipT -= dt;
      if (gull.flipT <= 0) {
        gull.flipT = 3 + rng() * 5;
        if (rng() < 0.6) gull.orbitDir = -gull.orbitDir;
        gull.orbitR = clampValue(
          gull.orbitR + (rng() - 0.5) * 6,
          GULL_CONFIG.rangeMin + 1,
          GULL_CONFIG.rangeMax - 2,
        );
      }

      if (gull.noSeeT > 1.5) {
        destX = gull.lastKnown.x;
        destZ = gull.lastKnown.z;
        destY = gull.lastKnown.y + gull.alt + 1;
        gull.orbitA = Math.atan2(gull.pos.z - gull.lastKnown.z, gull.pos.x - gull.lastKnown.x);
      } else {
        gull.orbitA += ((gull.orbitDir * (isAttacking ? 0.9 : 3.6)) / gull.orbitR) * dt;
        destX = player.pos.x + Math.cos(gull.orbitA) * gull.orbitR;
        destZ = player.pos.z + Math.sin(gull.orbitA) * gull.orbitR;
        destY = player.pos.y + gull.alt;
      }
    } else if (gull.mode === "investigate" || gull.mode === "search") {
      targetSpeed = 5.5;
      gull.orbitA += 0.5 * dt;
      destX = gull.lastKnown.x + Math.cos(gull.orbitA) * 4.5;
      destZ = gull.lastKnown.z + Math.sin(gull.orbitA) * 4.5;
      destY = gull.lastKnown.y + Math.min(gull.alt, 5.5);
    } else {
      gull.orbitA += 0.28 * dt * gull.orbitDir;
      destX = gull.home.x + Math.cos(gull.orbitA) * gull.patrolR;
      destZ = gull.home.z + Math.sin(gull.orbitA) * gull.patrolR;
      destY = gull.hoverFixed ? gull.alt : gull.home.y;
    }

    if (destY > gull.ceil) destY = gull.ceil;
    if (!gull.hoverFixed && destY < 2.2) destY = 2.2;

    return { targetSpeed, destX, destY, destZ };
  }

  /**
   * 飞鸥射线触角多层避障与三轴碰撞滑移
   * @param {number} dt
   * @param {number} horizontalSpeed
   * @param {number} targetSpeed
   * @param {boolean} isDamaged
   * @param {number} simTime
   */
  function updateGullObstacleAvoidance(dt, horizontalSpeed, targetSpeed, isDamaged, simTime) {
    gull.feeler = (gull.feeler + 1) % 3;

    if (gull.feeler === 0 && horizontalSpeed > 0.6) {
      tempRayDir.set(gull.vel.x / horizontalSpeed, 0, gull.vel.z / horizontalSpeed);
      const checkDist = 2.2 + horizontalSpeed * 0.5;
      const hit = engineCtx.physics.raycast(gull.pos, tempRayDir, checkDist);
      if (hit) {
        const proximity = 1 - hit.dist / checkDist;
        gull.avoid.copy(hit.normal).multiplyScalar(26 * proximity);
        gull.avoid.y += 9 * proximity;
        if (proximity > 0.5) {
          gull.orbitDir = -gull.orbitDir;
          gull.flipT = 2.5;
        }
      }
    } else if (gull.feeler === 1) {
      const groundHit = engineCtx.physics.raycast(gull.pos, DOWN_DIR, 2.4);
      if (groundHit && !gull.hoverFixed) {
        gull.avoid.y += (2.4 - groundHit.dist) * 10;
      }
    } else if (gull.feeler === 2 && ((gull.ceilT -= dt * 3), gull.ceilT <= 0)) {
      gull.ceilT = 0.35;
      const ceilHit = engineCtx.physics.raycast(gull.pos, UP_DIR_Y, 4.0);
      gull.ceil = ceilHit ? gull.pos.y + ceilHit.dist - 1.3 : 1e9;
    }

    tempAccVec.add(gull.avoid);
    gull.avoid.multiplyScalar(Math.exp(-6 * dt));

    if (isDamaged) {
      tempAccVec.x += Math.sin(simTime * 7.3 + gull.phase) * 5;
      tempAccVec.z += Math.cos(simTime * 6.1 + gull.phase) * 5;
      tempAccVec.y += Math.sin(simTime * 9.7) * 3;
    }

    const totalAcc = tempAccVec.length();
    if (totalAcc > GULL_CONFIG.accel) {
      tempAccVec.multiplyScalar(GULL_CONFIG.accel / totalAcc);
    }
    gull.vel.addScaledVector(tempAccVec, dt);

    const speed = gull.vel.length();
    if (speed > targetSpeed) {
      gull.vel.multiplyScalar(targetSpeed / speed);
    }

    // 三轴分离物理碰撞滑移 (Axis-Separated Collision Response)
    for (let axis = 0; axis < 3; axis++) {
      const vComp = axis === 0 ? gull.vel.x : axis === 1 ? gull.vel.y : gull.vel.z;
      if (Math.abs(vComp) < 0.02) continue;
      const dirSign = vComp > 0 ? 1 : -1;
      const hullRadius = axis === 1 ? 0.35 : 0.62;

      tempRayDir.set(axis === 0 ? dirSign : 0, axis === 1 ? dirSign : 0, axis === 2 ? dirSign : 0);
      const hit = engineCtx.physics.raycast(
        gull.pos,
        tempRayDir,
        Math.abs(vComp) * dt + hullRadius,
      );
      if (hit) {
        gull.vel.setComponent(axis, -vComp * 0.25);
        gull.avoid.setComponent(axis, gull.avoid.getComponent(axis) - dirSign * 8);
        if (hit.dist < hullRadius) {
          gull.pos.setComponent(
            axis,
            gull.pos.getComponent(axis) - dirSign * (hullRadius - hit.dist),
          );
        }
      }
    }

    gull.pos.addScaledVector(gull.vel, dt);

    if (!gull.hoverFixed) {
      const groundFloor =
        engineCtx.physics.groundHeight(gull.pos.x, gull.pos.z, gull.pos.y + 0.5) + 1.1;
      if (gull.pos.y < groundFloor) {
        gull.pos.y = groundFloor;
        if (gull.vel.y < 0) gull.vel.y = 0;
      }
    }
  }

  /**
   * 飞鸥机载机枪爆发射击状态机 (Attack Burst Execution)
   * @param {number} dt
   * @param {any} player
   * @param {boolean} isEngaging
   * @param {number} yawDelta
   * @param {boolean} isDamaged
   */
  function updateGullAttack(dt, player, isEngaging, yawDelta, isDamaged) {
    gull.muzzle.set(0, -0.12, 0.17).applyAxisAngle(UP_DIR_Y, gull.yaw).add(gull.pos);
    gull.cool -= dt;

    if (gull.atk === "idle") {
      if (
        isEngaging &&
        gull.los &&
        gull.cool <= 0 &&
        player &&
        player.alive &&
        Math.abs(yawDelta) < 0.35 &&
        gull.pos.distanceTo(player.pos) < GULL_CONFIG.fireRange &&
        hiveCtx.requestToken(gull)
      ) {
        gull.atk = "tele";
        gull.atkT = GULL_CONFIG.telegraph;
        engineCtx.events.emit("enemy:telegraph", {
          enemy: gull,
          type: "gull",
          time: GULL_CONFIG.telegraph,
          pos: gull.pos,
        });
      }
    } else if (gull.atk === "tele") {
      gull.atkT -= dt;
      gull.flare = Math.min(1, gull.flare + dt * 4.5);

      if (isEngaging) {
        if (gull.atkT <= 0) {
          gull.atk = "burst";
          gull.shots = GULL_CONFIG.burst;
          gull.atkT = 0;
          gull.lead = 0.2 + rng() * 0.65;
        }
      } else {
        gull.atk = "idle";
        hiveCtx.releaseToken(gull);
      }
    } else if (gull.atk === "burst") {
      gull.atkT -= dt;
      gull.flare = 1.0;

      if (gull.atkT <= 0) {
        gull.atkT = GULL_CONFIG.burstGap;
        gull.shots--;

        if (player) {
          const distToPlayer = gull.muzzle.distanceTo(player.pos);
          const flightTime = distToPlayer / GULL_CONFIG.boltSpeed;

          tempTargetPos.set(
            player.pos.x + player.vel.x * flightTime * gull.lead,
            player.pos.y + 1.05,
            player.pos.z + player.vel.z * flightTime * gull.lead,
          );

          tempRayDir.copy(tempTargetPos).sub(gull.muzzle).normalize();

          const spreadFactor =
            (GULL_CONFIG.spreadFar +
              (GULL_CONFIG.spreadNear - GULL_CONFIG.spreadFar) * gull.exposure) *
            (1 + hiveCtx.playerSpeed * 0.45) *
            (isDamaged ? 1.5 : 1.0);

          tempRayDir.x += (rng() - 0.5) * 2 * spreadFactor;
          tempRayDir.y += (rng() - 0.5) * 2 * spreadFactor;
          tempRayDir.z += (rng() - 0.5) * 2 * spreadFactor;
          tempRayDir.normalize();

          hiveCtx.fireBolt(gull.muzzle, tempRayDir, gull);
          engineCtx.fx.muzzleFlash(gull.muzzle, tempRayDir, { scale: 0.55 });
          engineCtx.events.emit("enemy:fire", {
            enemy: gull,
            pos: gull.muzzle,
            dir: tempRayDir,
            type: "gull",
          });

          gull.vel.addScaledVector(tempRayDir, -0.35);
        }

        if (gull.shots <= 0) {
          gull.atk = "idle";
          gull.cool =
            GULL_CONFIG.cooldown[0] + rng() * (GULL_CONFIG.cooldown[1] - GULL_CONFIG.cooldown[0]);
          hiveCtx.releaseToken(gull);
        }
      }
    }
  }

  /**
   * 飞鸥飞行控制律、战术环绕、避障与射击状态机 (Active Flight Controller & Attack State Machine)
   */
  function updateAliveGull(dt) {
    const player = engineCtx.player;
    const simTime = hiveCtx.t;

    gull.fwd.set(Math.sin(gull.yaw), 0, Math.cos(gull.yaw));
    gull.sensor.set(0, -0.17, 0.27).applyAxisAngle(UP_DIR_Y, gull.yaw).add(gull.pos);

    hiveCtx.think(gull, dt, 0.4);

    const isEngaging = gull.mode === "engage";
    const isDamaged = gull.hp < GULL_CONFIG.hp * 0.5;

    // 1. 战术航线规划
    const { targetSpeed, destX, destY, destZ } = planGullFlightPath(dt, player, isEngaging);

    // 2. PD 速度跟踪加速度指令
    tempAccVec.set(
      (destX - gull.pos.x) * 2.2 - gull.vel.x * 2.4,
      (destY - gull.pos.y) * 5.0 - gull.vel.y * 3.6,
      (destZ - gull.pos.z) * 2.2 - gull.vel.z * 2.4,
    );

    const horizontalSpeed = Math.hypot(gull.vel.x, gull.vel.z);

    // 3. 多触角环境光线避障与物理碰撞
    updateGullObstacleAvoidance(dt, horizontalSpeed, targetSpeed, isDamaged, simTime);

    // 4. 偏航角与机动侧倾姿态学 (Yaw Steering, Pitch & Roll Banking)
    let desiredYaw = gull.yaw;
    if ((isEngaging || gull.mode === "search" || gull.mode === "investigate") && player) {
      const aimTarget = isEngaging && gull.noSeeT < 1.5 ? player.pos : gull.lastKnown;
      desiredYaw = Math.atan2(aimTarget.x - gull.pos.x, aimTarget.z - gull.pos.z);
    } else if (horizontalSpeed > 0.4) {
      desiredYaw = Math.atan2(gull.vel.x, gull.vel.z);
    }

    const yawDelta = diffAngle(desiredYaw, gull.yaw);
    gull.yaw += clampValue(yawDelta, -3.2 * dt, 3.2 * dt);

    const cosYaw = Math.cos(gull.yaw);
    const sinYaw = Math.sin(gull.yaw);

    // 转换至无人机体坐标系以计算飞行机动姿态俯仰与滚转
    const forwardForce = tempAccVec.x * sinYaw + tempAccVec.z * cosYaw;
    const rightForce = tempAccVec.x * cosYaw - tempAccVec.z * sinYaw;

    let targetPitch = clampValue(forwardForce * 0.04, -0.42, 0.42);
    let targetRoll = clampValue(-rightForce * 0.04, -0.42, 0.42);

    if (isDamaged) {
      targetPitch += Math.sin(simTime * 11 + gull.phase) * 0.1;
      targetRoll += Math.cos(simTime * 8.7 + gull.phase * 2) * 0.13;
    }

    const bankSmoothing = 1 - Math.exp(-7 * dt);
    gull.pitch += (targetPitch - gull.pitch) * bankSmoothing;
    gull.roll += (targetRoll - gull.roll) * bankSmoothing;

    skinnedMeshWrapper.group.rotation.set(gull.pitch, gull.yaw, gull.roll);
    bones.body.position.y =
      Math.sin(simTime * 2.1 + gull.phase) * 0.045 +
      Math.sin(simTime * 3.7 + gull.phase * 1.7) * 0.018;

    // 旋翼油门转速自适应 (Throttle Speed)
    gull.thr +=
      (1 + clampValue(tempAccVec.y * 0.03, -0.25, 0.4) + horizontalSpeed * 0.02 - gull.thr) *
      bankSmoothing;
    const rotorSpeed = 41 * gull.thr * dt;
    bones.rotor0.rotation.y += rotorSpeed;
    bones.rotor1.rotation.y -= rotorSpeed * 1.03;
    bones.rotor2.rotation.y -= rotorSpeed * 0.98;
    bones.rotor3.rotation.y += rotorSpeed * 1.01;

    // 5. 航行警示频闪灯节律 (Navigation Strobe Flashing)
    const strobePhase = (simTime * 0.9 + gull.phase * 0.1) % 1;
    const isWingStrobeOn = strobePhase < 0.05 || (strobePhase > 0.13 && strobePhase < 0.18);
    const isTailStrobeOn = strobePhase > 0.5 && strobePhase < 0.56;

    bones.strobeR.scale.setScalar(isWingStrobeOn ? 1 : 1e-4);
    bones.strobeG.scale.setScalar(isWingStrobeOn ? 1 : 1e-4);
    bones.strobeW.scale.setScalar(isTailStrobeOn ? 1 : 1e-4);

    // 6. 双轴光电瞄准吊舱跟踪 (Gimbal Tracking Player / Search Sweep)
    if (isEngaging && player) {
      tempTargetPos.set(player.pos.x, player.pos.y + 1.1, player.pos.z);
    } else if (gull.mode !== "patrol") {
      gull.sweep += dt;
      tempTargetPos.set(
        gull.lastKnown.x + Math.sin(gull.sweep * 0.9) * 3,
        gull.lastKnown.y,
        gull.lastKnown.z + Math.cos(gull.sweep * 0.7) * 3,
      );
    } else {
      gull.sweep += dt;
      const sweepYaw = gull.yaw + Math.sin(gull.sweep * 0.5 + gull.phase) * 0.9;
      tempTargetPos.set(
        gull.pos.x + Math.sin(sweepYaw) * 5,
        gull.pos.y - (gull.hoverFixed ? 1.6 : 5.0),
        gull.pos.z + Math.cos(sweepYaw) * 5,
      );
    }

    tempSparkPos.copy(tempTargetPos).sub(gull.sensor);
    const localTargetX = tempSparkPos.x * cosYaw - tempSparkPos.z * sinYaw;
    const localTargetZ = tempSparkPos.x * sinYaw + tempSparkPos.z * cosYaw;
    const localTargetY = tempSparkPos.y;

    const gimbalTargetYaw = Math.atan2(localTargetX, localTargetZ);
    const gimbalTargetPitch = clampValue(
      Math.atan2(-localTargetY, Math.hypot(localTargetX, localTargetZ)),
      -0.5,
      1.5,
    );

    const gimbalSmoothing = 1 - Math.exp(-9 * dt);
    gull.gy += diffAngle(gimbalTargetYaw, gull.gy) * gimbalSmoothing;
    gull.gp += (gimbalTargetPitch - gull.gp) * gimbalSmoothing;

    bones.gimbalYaw.rotation.y = gull.gy;
    bones.ball.rotation.x = gull.gp - gull.pitch;
    bones.gun.rotation.x = clampValue(gull.gp, -0.2, 1.3) - gull.pitch;

    // 7. 战术镜头辉光颜色与充能过载 (Lens Color & Flare)
    const targetLensColor = isEngaging ? LENS_COLOR_RED_ALERT : LENS_COLOR_AMBER_PATROL;
    const lensBrightness =
      1 + gull.flare * 3.2 + (isEngaging ? 0 : Math.sin(simTime * 3 + gull.phase) * 0.15);

    for (let c = 0; c < 3; c++) {
      gull.lensC[c] += (targetLensColor[c] - gull.lensC[c]) * (1 - Math.exp(-8 * dt));
    }
    lensMat.color.setRGB(
      gull.lensC[0] * lensBrightness,
      gull.lensC[1] * lensBrightness,
      gull.lensC[2] * lensBrightness,
    );
    gull.flare = Math.max(0, gull.flare - dt * 1.5);

    // 8. 射击攻击状态机 (Attack State Machine: idle -> tele -> burst)
    updateGullAttack(dt, player, isEngaging, yawDelta, isDamaged);

    // 9. 破损冒烟排烟与引擎声学调制
    if (isDamaged) {
      gull.smokeT -= dt;
      if (gull.smokeT <= 0) {
        gull.smokeT = 0.16;
        engineCtx.fx.smoke(gull.pos, { size: 0.3, life: 1.1, color: 0x26272c, rise: 0.8 });
        if (rng() < 0.15) engineCtx.fx.sparks(gull.pos, DOWN_DIR, 2);
      }
    }

    if (gull.loop) {
      gull.loop.setPos(gull.pos);
      gull.loop.setPitch(0.85 + gull.thr * 0.2 + (isDamaged ? Math.sin(simTime * 13) * 0.05 : 0));
    }
  }

  return gull;
}

export { GULL_RIG_SPEC, buildGullPropellerBlade, buildGullRig, GULL_CONFIG, createGull };

// @ts-check
/**
 * @file src/weapons/ballistics.js
 * @description 武器击发弹道射线检测、散射分布、枪口焰与后坐力冲量结算
 */

import * as THREE from "three";
import { lerp } from "../constants.js";
import { PAC9_MODEL_PARAMS } from "./pac9_model.js";
import { WEAPON_REGISTRY } from "./weapon_configs.js";

const vRayDir = new THREE.Vector3();
const vMuzzlePos = new THREE.Vector3();
const vHitPos = new THREE.Vector3();
const vEjectPos = new THREE.Vector3();
const vShellVel = new THREE.Vector3();
const vEyePos = new THREE.Vector3();

/**
 * 执行一次武器击发物理与视听结算
 * @param {object} params
 * @param {import('../types').EngineContext} params.ctx
 * @param {any} params.weapon
 * @param {any} params.state
 * @param {string} params.activeWeaponId
 * @param {THREE.Mesh} params.muzzleFlashMesh
 * @param {THREE.Mesh} params.topRoundMesh
 * @param {Function} params.getMuzzleWorldPos
 * @param {Function} params.localPointToWorld
 * @param {Function} params.random
 */
export function executeWeaponFire({
  ctx,
  weapon,
  state,
  activeWeaponId,
  muzzleFlashMesh,
  topRoundMesh,
  getMuzzleWorldPos,
  localPointToWorld,
  random,
}) {
  const player = ctx.player;
  const camera = ctx.camera;
  const cfg = WEAPON_REGISTRY[activeWeaponId] || WEAPON_REGISTRY.pac9;

  weapon.ammo--;
  state.burst++;
  state.lastShot = state.t;
  state.heat = Math.min(1.3, state.heat + 0.05);

  const pellets = cfg.pellets || 1;
  const baseSpread = state.adsE > 0.4 ? cfg.spreadAds : cfg.spreadHip;
  weapon.spread = baseSpread;

  vEyePos.copy(player.eye || camera.position);
  getMuzzleWorldPos(vMuzzlePos);

  const fx = ctx.fx;

  for (let p = 0; p < pellets; p++) {
    const spreadAngle = random() * Math.PI * 2;
    const spreadRadius = Math.tan(baseSpread) * Math.sqrt(random());

    vRayDir
      .set(Math.cos(spreadAngle) * spreadRadius, Math.sin(spreadAngle) * spreadRadius, -1)
      .normalize()
      .applyQuaternion(camera.quaternion);

    let hitResult = null;
    try {
      hitResult = ctx.combat.playerShot(vEyePos, vRayDir, {
        damage: cfg.baseDamage,
        range: cfg.maxRange,
      });
    } catch (e) {
      console.warn("[weapon] playerShot calculation error:", e);
    }

    if (hitResult && hitResult.point) {
      vHitPos.copy(hitResult.point);
    } else {
      vHitPos.copy(vEyePos).addScaledVector(vRayDir, cfg.maxRange);
    }

    if (fx && fx.tracer) {
      fx.tracer(vMuzzlePos, vHitPos);
    }
  }

  // 触发抛壳特效
  if (fx && fx.shell) {
    localPointToWorld(PAC9_MODEL_PARAMS.eject, vEjectPos);
    vShellVel
      .set(2 + random() * 1.2, 1.2 + random() * 0.8, 0.5 - random() * 0.6)
      .applyQuaternion(camera.quaternion);
    if (player.vel) vShellVel.add(player.vel);
    fx.shell(vEjectPos, vShellVel);
  }

  // 枪口动态点光源闪烁
  if (ctx.render && ctx.render.lightPool && ctx.render.lightPool.flash) {
    const lightRadius = cfg.id === "sr99" ? 14 : cfg.id === "sg12" ? 12 : 9;
    const lightColor = cfg.id === "sr99" ? 0xffcc40 : 0xffa020;
    ctx.render.lightPool.flash(vMuzzlePos, lightColor, 50, lightRadius, 0.05);
  }

  ctx.events.emit("weapon:fire", {
    origin: vEyePos,
    dir: vRayDir,
    muzzle: vMuzzlePos,
    ads: state.adsE,
    weaponType: cfg.id,
    soundType: cfg.soundType,
  });

  // 视模后坐力弹簧冲量施加
  const adsFactor = lerp(1, 0.55, state.adsE) * (player.crouching ? 0.85 : 1);
  state.kZ.v += cfg.recoil.kickZ;
  state.kP.v += cfg.recoil.pitch * adsFactor;
  state.kY.v += (random() - 0.5) * cfg.recoil.yaw * adsFactor;
  state.kR.v += (random() - 0.5) * cfg.recoil.roll;

  // 施加给玩家视角后坐力晃动
  const burstCount = state.burst;
  const recoilScale = burstCount <= 9 ? 1 : 0.38;
  const recoilPitchAmount =
    cfg.recoil.pitch * 0.15 * recoilScale * adsFactor * (0.85 + random() * 0.3);
  const recoilYaw =
    (burstCount < 4
      ? (random() - 0.5) * 0.0022
      : Math.sin(burstCount * 0.57 + state.recPhase) * 0.0042 + (random() - 0.5) * 0.002) *
    adsFactor;

  if (player.addRecoil) {
    player.addRecoil(recoilPitchAmount, recoilYaw);
  }
  if (player.addShake) {
    player.addShake(0.12 * adsFactor);
  }

  // 视模弹簧冲量激振
  state.kZ.v += 1.5 * lerp(1, 0.6, state.adsE);
  state.kP.v += 1.5 * adsFactor;
  state.kY.v += (random() - 0.5) * 1 * adsFactor;
  state.kR.v += (random() - 0.5) * 1.8 * adsFactor;
  state.bloom = Math.min(1, state.bloom + 0.17);
  state.flashT = state.flashDur = 0.036 + random() * 0.02;

  // 枪口焰 Shader 参数
  const flashUniforms = /** @type {THREE.ShaderMaterial} */ (muzzleFlashMesh.material).uniforms;
  flashUniforms.uSeed.value = random() * 100;
  flashUniforms.uJet.value = 0.6 + random() * 0.6;
  muzzleFlashMesh.rotation.z = (random() - 0.5) * 0.4;

  const flashScale = (0.8 + random() * 0.5) * lerp(1, 0.62, state.adsE);
  muzzleFlashMesh.scale.set(flashScale, flashScale, flashScale * (0.8 + random() * 0.5));

  state.boltT = 0;
  if (weapon.ammo <= 0) {
    state.boltLocked = true;
    topRoundMesh.visible = false;
  }
}

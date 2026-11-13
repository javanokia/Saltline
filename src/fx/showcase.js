// @ts-check
/**
 * @file src/fx/showcase.js
 * @description 视觉特效独立展示环境与基准测试靶场 (FX Showcase Environment & Benchmark)
 */

import * as THREE from "three";
import { createBoxBevelGeometry } from "../geo.js";

/**
 * 组装特效靶场陈列与模拟射击环境
 * @param {any} engineCtx
 */
export function showcaseFX(engineCtx) {
  const fx = engineCtx.fx;
  const showMode = engineCtx.params.fxshow || "all";
  const showcaseGroup = new THREE.Group();

  const spawnTargetMesh = (
    /** @type {THREE.BufferGeometry} */ geometry,
    /** @type {string} */ matName,
    /** @type {number} */ x,
    /** @type {number} */ y,
    /** @type {number} */ z,
  ) => {
    const mesh = new THREE.Mesh(geometry, engineCtx.mats.get(matName));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    showcaseGroup.add(mesh);
    return mesh;
  };

  // 靶场靶标 (Target props: concrete slab, blue metal container wall, wooden pallet)
  spawnTargetMesh(createBoxBevelGeometry(2.6, 2.2, 0.3, 0.02), "concrete", -3.2, 1.1, 0);
  spawnTargetMesh(createBoxBevelGeometry(2.2, 2.0, 0.08, 0.01), "paint_blue", 0, 1.0, 0);
  spawnTargetMesh(createBoxBevelGeometry(1.2, 1.2, 1.2, 0.015), "wood_pallet", 3.2, 0.6, 0);

  engineCtx.scene.add(showcaseGroup);
  engineCtx.physics.addBox([-4.5, 0, -0.15], [-1.9, 2.2, 0.15], { surface: "concrete" });
  engineCtx.physics.addBox([-1.1, 0, -0.04], [1.1, 2.0, 0.04], { surface: "metal" });
  engineCtx.physics.addBox([2.6, 0, -0.6], [3.8, 1.2, 0.6], { surface: "wood" });

  const pLeftGun = new THREE.Vector3(-6.5, 1.5, 7);
  const pRightGun = new THREE.Vector3(6.5, 1.4, 7);
  const pTargetGun = new THREE.Vector3(5.2, 1.3, 3.2);
  const pEjectPos = new THREE.Vector3(-4.6, 1.35, 4.2);

  const vTargetPoint = new THREE.Vector3();
  const vRayDir = new THREE.Vector3();
  const vTracerEnd = new THREE.Vector3();
  const vMuzzlePos = new THREE.Vector3(0, 1.3, 3);
  const vMuzzleDir = new THREE.Vector3(1, 0, 0);

  const impactData = {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    surface: "concrete",
    dir: new THREE.Vector3(),
    enemy: /** @type {any} */ (null),
    from: "player",
  };

  const rnd = Math.random;
  let elapsed = 0;
  let shotIndex = 0;
  let gunAlt = 0;
  let explosionCounter = 0;
  let impactTimer = 0;
  let tracerTimer = 0.2;
  let shellTimer = 0;
  let explosionTimer = 3.4;
  let warmedUp = false;

  const showImpacts = showMode === "all" || showMode === "impact";
  const showExplosions = showMode === "all" || showMode === "explosion";
  const showTracers = showMode === "all" || showMode === "tracer";
  const explosionInterval = showMode === "explosion" ? 2.4 : 3.5;

  if (showMode === "explosion") explosionTimer = 0.6;

  if (showMode === "all" || showMode === "impact") {
    fx.addEmitter(new THREE.Vector3(-6.2, 0.05, -1.5), "steam");
    fx.addEmitter(new THREE.Vector3(5.6, 0, 1.6), "fire");
    fx.addEmitter(new THREE.Vector3(0.4, 2.6, 1.6), "drip");
  }

  function fireSimulatedImpact(/** @type {number} */ targetSlot) {
    const gunOrigin = gunAlt++ % 2 ? pRightGun : pLeftGun;
    impactData.enemy = null;
    impactData.from = "player";

    if (targetSlot === 5) {
      // 模拟击中敌方机械体
      impactData.point.set(-1.5 + rnd() * 0.3, 2.5 + rnd() * 0.3, 0.8);
      impactData.normal.copy(gunOrigin).sub(impactData.point).normalize();
      impactData.surface = "enemy";
      impactData.enemy = {};
      impactData.dir.copy(impactData.point).sub(gunOrigin).normalize();
      fx.tracer(gunOrigin, impactData.point);
      engineCtx.events.emit("impact", impactData);
      return;
    }

    if (targetSlot === 0) {
      vTargetPoint.set(-3.2 + (rnd() - 0.5) * 2, 0.4 + rnd() * 1.5, 0);
    } else if (targetSlot === 1 || targetSlot === 7) {
      vTargetPoint.set((rnd() - 0.5) * 1.8, 0.3 + rnd() * 1.5, 0);
    } else if (targetSlot === 2) {
      vTargetPoint.set(3.2 + (rnd() - 0.5) * 0.9, 0.2 + rnd() * 0.9, 0.6);
    } else if (targetSlot === 3) {
      vTargetPoint.set(-1.6 + (rnd() - 0.5) * 1.2, 0, 2.2 + rnd());
    } else if (targetSlot === 4) {
      vTargetPoint.set(1.5 + (rnd() - 0.5) * 0.8, 0, 2.6 + rnd() * 0.8);
    } else {
      vTargetPoint.set(3.4 + (rnd() - 0.5), 0, 2.4 + rnd() * 0.6);
    }

    vRayDir.copy(vTargetPoint).sub(gunOrigin).normalize();
    const hit = engineCtx.physics.raycast(gunOrigin, vRayDir, 100);
    if (hit) {
      impactData.point.copy(hit.point);
      impactData.normal.copy(hit.normal);
      impactData.dir.copy(vRayDir);
      impactData.surface = targetSlot === 4 ? "water" : targetSlot === 6 ? "dirt" : hit.surface;
      fx.tracer(gunOrigin, impactData.point);
      engineCtx.events.emit("impact", impactData);
    }
  }

  const holdMode = engineCtx.params.fxhold;

  function updateShowcase(/** @type {number} */ dt) {
    elapsed += dt;

    if (holdMode === "muzzle") {
      fx.muzzleFlash(vMuzzlePos, vMuzzleDir, { scale: 1 });
      vMuzzlePos.x = 2.5;
      vMuzzleDir.set(-0.5, 0, 0.86);
      fx.muzzleFlash(vMuzzlePos, vMuzzleDir, { scale: 1.6 });
      vMuzzlePos.x = 0;
      vMuzzleDir.set(1, 0, 0);
    }

    if (showImpacts) {
      impactTimer -= dt;
      while (impactTimer <= 0) {
        impactTimer += showMode === "impact" ? 0.09 : 0.13;
        fireSimulatedImpact(shotIndex++ % 8);
      }
    }

    if (showTracers) {
      tracerTimer -= dt;
      if (tracerTimer <= 0) {
        tracerTimer += showMode === "tracer" ? 0.16 : 0.45;
        vTracerEnd.set(-5 + rnd() * 3, 1.2 + rnd() * 0.8, 6 + rnd() * 2);
        vRayDir.copy(vTracerEnd).sub(pTargetGun).normalize();
        fx.muzzleFlash(pTargetGun, vRayDir, { scale: 1 });
        fx.tracer(pTargetGun, vTracerEnd, { color: 0xff4c02, speed: 120 });
        if (showMode === "tracer") {
          vTracerEnd.set(6, 1 + rnd() * 1.5, -6 - rnd() * 6);
          vTargetPoint.set(-7, 1.6, 6.5);
          fx.tracer(vTargetPoint, vTracerEnd, { speed: 200 });
        }
      }

      shellTimer -= dt;
      if (shellTimer <= 0) {
        shellTimer += 0.22;
        vTracerEnd.set(1.6 + rnd() * 0.8, 1.6 + rnd() * 0.8, 0.4 + (rnd() - 0.5) * 0.8);
        fx.shell(pEjectPos, vTracerEnd);
      }
    }

    if (showExplosions) {
      explosionTimer -= dt;
      if (explosionTimer <= 0) {
        explosionTimer += explosionInterval;
        const explSize = Number(engineCtx.params.fxsize || 0) || 1 + (explosionCounter++ % 3);
        vTracerEnd.set(
          showMode === "explosion" ? 0 : 7,
          0.25,
          showMode === "explosion" ? 3.5 : -3.5,
        );
        fx.explosion(vTracerEnd, explSize);
      }
    }
  }

  let isFrozen = false;
  const originalUpdate = fx.update;
  fx.update = (/** @type {number} */ dt) => {
    if (!isFrozen) originalUpdate(dt);
  };

  const handleFxShot = (/** @type {any} */ shotData) => {
    if (shotData && shotData.fxage !== undefined) {
      fx.clear();
      vTracerEnd.set(0, 0.25, 3.5);
      fx.explosion(vTracerEnd, Number(shotData.fxsize || 1.2));
      const age = Number(shotData.fxage);
      for (let t = 0; t < age - 1e-6; t += 1 / 60) {
        originalUpdate(1 / 60);
      }
      originalUpdate(0);
      isFrozen = true;
    }
  };

  if (typeof window !== "undefined") {
    const win = /** @type {any} */ (window);
    if (typeof win.__setShot === "function" && typeof win.__setShot.subscribe === "function") {
      win.__setShot.subscribe(handleFxShot);
    } else if (win.__setShot) {
      const hookSetShot = win.__setShot;
      win.__setShot = (/** @type {any} */ shotData) => {
        handleFxShot(shotData);
        hookSetShot(shotData);
      };
    }
  }

  return {
    cam: showMode === "explosion" ? [0, 2, 12.5] : [0.3, 1.6, 7.2],
    target: showMode === "explosion" ? [0, 2.2, 3.5] : [0.2, 1, 0],
    update(/** @type {number} */ dt) {
      if (!warmedUp) {
        warmedUp = true;
        const prewarmTime = Number(engineCtx.params.fxt || 0);
        for (let t = 0; t < prewarmTime; t += 1 / 30) {
          updateShowcase(1 / 30);
          fx.update(1 / 30);
        }
      }
      if (!isFrozen) updateShowcase(dt);
    },
  };
}

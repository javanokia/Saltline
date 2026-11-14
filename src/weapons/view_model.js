// @ts-check
/**
 * @file src/weapons/view_model.js
 * @description 武器第一人称视模与双手骨骼网格装配工厂 (PAC-9 / SG-12 / SMG-45 / SR-99)
 */

import * as THREE from "three";
import { FACTION_ENEMY } from "../constants.js";
import {
  buildPac9Geometries,
  PAC9_MODEL_PARAMS,
  applyPac9ShaderDetails,
  createPac9MarkingsMesh,
  createPac9SightDotMesh,
  createPac9MuzzleFlashMesh,
  buildPac9HandsMesh,
  countGeometryTris,
} from "./pac9_model.js";
import { buildShotgunMesh, buildSmgMesh, buildSniperMesh } from "./arsenal_models.js";
import { eulerToQuat, projectDirection, createReloadKeyframes } from "./poses.js";

/**
 * 装配第一人称武器视模层级、材质与双手手套网格
 * @param {import('../types').EngineContext} ctx
 */
export function assembleWeaponViewModel(ctx) {
  const root = new THREE.Group();
  root.name = "viewmodel-pac9";

  // 1. 获取程序化几何体构件
  const geo = buildPac9Geometries();

  // 2. 材质分配与三向投影贴图纹理
  const matScaleMap = {
    anodized_black: 2,
    gunmetal: 2,
    brass: 4,
    glove_fabric: 3,
    rubber: 4,
  };
  const getProceduralMat = (name) =>
    ctx.mats.get(name, {
      triplanar: true,
      vertexColors: true,
      scale: matScaleMap[name] || 1,
    });

  const createMesh = (geometry, material) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return mesh;
  };

  // 枪身机匣黑色阳极氧化铝材质
  const matAnodized = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.0085, 0.009, 0.0105),
    roughness: 0.4,
    metalness: 0.45,
    vertexColors: true,
  });
  matAnodized.name = "pac9_anodised";
  applyPac9ShaderDetails(matAnodized, 0);

  // 哑光印字/刻字材质
  const matMatte = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0,
    vertexColors: true,
  });
  matMatte.name = "pac9_matte";

  // 枪机枪管磷化/发黑军用高碳钢材质
  const matPhosphate = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.016, 0.016, 0.0165),
    roughness: 0.5,
    metalness: 0.7,
    vertexColors: true,
  });
  matPhosphate.name = "pac9_phosphate";
  applyPac9ShaderDetails(matPhosphate, 1);

  // 工程塑料下机匣/握把聚合物材质
  const matPolymer = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.0125, 0.0128, 0.0135),
    roughness: 0.62,
    metalness: 0,
    vertexColors: true,
  });
  matPolymer.name = "pac9_polymer";
  applyPac9ShaderDetails(matPolymer, 2);

  // 棕褐色军规抗冲击弹匣工程塑料
  const matPolymerTan = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.105, 0.08, 0.05),
    roughness: 0.62,
    metalness: 0,
    vertexColors: true,
  });
  matPolymerTan.name = "pac9_polymer_tan";
  applyPac9ShaderDetails(matPolymerTan, 2);

  // 组装 PAC-9 机匣主体与附件组
  const pac9Group = new THREE.Group();
  pac9Group.name = "weapon_pac9_group";
  pac9Group.add(
    createMesh(geo.ano, matAnodized),
    createMesh(geo.gun, matPhosphate),
    createMesh(geo.poly, matPolymer),
    createMesh(geo.plain, matMatte),
  );

  // 组装往复式枪机组 (Bolt Carrier Group)
  const boltMesh = createMesh(geo.bolt, matPhosphate);
  pac9Group.add(boltMesh);

  // 组装可拆卸供弹具 (30发弹匣与首发黄铜穿甲弹)
  const magGroup = new THREE.Group();
  const magDefaultPos = new THREE.Vector3().fromArray(PAC9_MODEL_PARAMS.magPos);
  magGroup.position.copy(magDefaultPos);

  const topRoundMesh = createMesh(geo.round, getProceduralMat("brass"));
  magGroup.add(createMesh(geo.mag, matPolymerTan), topRoundMesh);
  pac9Group.add(magGroup);

  // 组装高精度机匣激光刻字与导轨刻度
  let markingsMesh = null;
  try {
    markingsMesh = createPac9MarkingsMesh([
      ["model", -0.0168, -0.0315, 0.064, 0.0095, "L"],
      ["maker", -0.0168, -0.042, 0.064, 0.003, "L"],
      ["cal", -0.0168, -0.0465, 0.064, 0.0028, "L"],
      ["prop", -0.0168, -0.071, 0.066, 0.0026, "L"],
      ["auto", -0.0168, -0.027, -0.0335, 0.0036, "L"],
      ["semi", -0.0168, -0.0262, -0.049, 0.0036, "L"],
      ["safe", -0.0168, -0.0362, -0.062, 0.0036, "L"],
      ["rack", -0.0168, -0.004, -0.205, 0.02, "L"],
      ["warn", -0.0181, -0.01, 0.03, 0.0062, "L"],
      ["optic", -0.0195, 0.0735, 0.021, 0.0024, "L"],
      ["model", 0.0168, -0.0315, 0.068, 0.0095, "R"],
      ["warn", 0.0168, -0.066, 0.066, 0.0075, "R"],
      ["rack", 0.0168, -0.004, -0.205, 0.02, "R"],
      ["auto", 0.0168, -0.027, -0.0335, 0.0036, "R"],
      ["safe", 0.0168, -0.0362, -0.062, 0.0036, "R"],
      ["optic", 0.0195, 0.0735, 0.021, 0.0024, "R"],
      ["cal", 0.0181, 0.0245, -0.055, 0.0026, "R"],
      ["r2", 0, 0.04365, -0.0816, 0.003, "T"],
      ["r4", 0, 0.04365, -0.0616, 0.003, "T"],
      ["r6", 0, 0.04365, 0.0584, 0.003, "T"],
      ["r8", 0, 0.04365, 0.0784, 0.003, "T"],
      ["r10", 0, 0.04365, 0.0984, 0.003, "T"],
      ["r12", 0, 0.04365, 0.1184, 0.003, "T"],
    ]);
    markingsMesh.castShadow = false;
    markingsMesh.receiveShadow = true;
    markingsMesh.frustumCulled = false;
    pac9Group.add(markingsMesh);
  } catch (err) {
    console.warn("[weapon] markings skipped: " + err);
  }

  // 全息瞄准镜分划板与准直物镜
  const opticSightMesh = createPac9SightDotMesh(
    PAC9_MODEL_PARAMS.window.map((pt) => [
      pt[0] * 1.01,
      (pt[1] - PAC9_MODEL_PARAMS.sightY) * 1.01 + PAC9_MODEL_PARAMS.sightY,
    ]),
    PAC9_MODEL_PARAMS.lensF + 0.0025,
  );
  opticSightMesh.frustumCulled = false;
  pac9Group.add(opticSightMesh);

  root.add(pac9Group);

  // 组装多武器扩展视模 (SG-12 / SMG-45 / SR-99)
  const shotgunGroup = buildShotgunMesh(ctx.mats);
  shotgunGroup.visible = false;
  root.add(shotgunGroup);

  const smgGroup = buildSmgMesh(ctx.mats);
  smgGroup.visible = false;
  root.add(smgGroup);

  const sniperGroup = buildSniperMesh(ctx.mats);
  sniperGroup.visible = false;
  root.add(sniperGroup);

  const weaponMeshMap = {
    pac9: pac9Group,
    sg12: shotgunGroup,
    smg45: smgGroup,
    sr99: sniperGroup,
  };

  // 枪口焰粒子与几何体
  const muzzleFlashMesh = createPac9MuzzleFlashMesh();
  muzzleFlashMesh.position.fromArray(PAC9_MODEL_PARAMS.muzzle);
  muzzleFlashMesh.visible = false;
  root.add(muzzleFlashMesh);

  const updateMuzzlePosForWeapon = (weaponId) => {
    if (weaponId === "sr99") muzzleFlashMesh.position.set(0, 0.022, -0.92);
    else if (weaponId === "sg12") muzzleFlashMesh.position.set(0, 0.024, -0.63);
    else if (weaponId === "smg45") muzzleFlashMesh.position.set(0, 0.022, -0.37);
    else muzzleFlashMesh.position.fromArray(PAC9_MODEL_PARAMS.muzzle);
  };

  // 右手（持握机匣握把，扣扳机手）
  const rightHandBaseQuat = eulerToQuat(-0.24, 0, 0).multiply(eulerToQuat(0, 0, -Math.PI / 2));
  const rightHandRig = buildPac9HandsMesh({
    mirror: false,
    fingers: [null, [0.62, 1.72, 0.8, 0], [0.68, 1.7, 0.8, -0.03], [0.74, 1.66, 0.8, -0.09]],
    indexPoses: [
      [0.1, 0.16, 0.1, 0.05],
      [0.46, 1.15, 0.5, 0],
    ],
    thumb: [
      projectDirection(rightHandBaseQuat, [-0.85, 0.05, -0.5]),
      projectDirection(rightHandBaseQuat, [-0.6, -0.05, -0.8]),
      projectDirection(rightHandBaseQuat, [-0.05, -0.2, -0.97]),
    ],
    forearm: projectDirection(rightHandBaseQuat, [0.27, -0.44, 0.86]),
    sleeve: 0.34,
  });

  const rightHandGroup = new THREE.Group();
  rightHandGroup.quaternion.copy(rightHandBaseQuat);
  rightHandGroup.position
    .fromArray(PAC9_MODEL_PARAMS.grip)
    .sub(new THREE.Vector3(0.006, -0.031, -0.085).applyQuaternion(rightHandBaseQuat));

  const matGloveFabric = getProceduralMat("glove_fabric");
  rightHandGroup.add(createMesh(rightHandRig.fabric, matGloveFabric));

  const triggerFingerMesh = createMesh(rightHandRig.index[0].clone(), matGloveFabric);
  rightHandGroup.add(triggerFingerMesh);
  root.add(rightHandGroup);

  const indexAttrRelaxed = rightHandRig.index[0].attributes;
  const indexAttrPulled = rightHandRig.index[1].attributes;
  let lastFingerProgress = -1;

  function updateTriggerFinger(progress) {
    if (Math.abs(progress - lastFingerProgress) < 0.004) return;
    lastFingerProgress = progress;

    const posAttr = triggerFingerMesh.geometry.attributes.position;
    const normAttr = triggerFingerMesh.geometry.attributes.normal;
    const relaxedPos = indexAttrRelaxed.position.array;
    const pulledPos = indexAttrPulled.position.array;
    const relaxedNorm = indexAttrRelaxed.normal.array;
    const pulledNorm = indexAttrPulled.normal.array;

    for (let i = 0; i < relaxedPos.length; i++) {
      posAttr.array[i] = relaxedPos[i] + (pulledPos[i] - relaxedPos[i]) * progress;
      normAttr.array[i] = relaxedNorm[i] + (pulledNorm[i] - relaxedNorm[i]) * progress;
    }
    posAttr.needsUpdate = true;
    normAttr.needsUpdate = true;
  }

  // 左手（托住战术护木、拔插弹匣、拉动枪栓）
  const leftHandBaseQuat = eulerToQuat(0, 0, Math.PI / 2).multiply(eulerToQuat(0.06, 0, 0));
  const leftHandRig = buildPac9HandsMesh({
    mirror: true,
    fingers: [
      [1.27, 1.42, 0.75, 0.02],
      [1.3, 1.45, 0.75, 0],
      [1.3, 1.45, 0.75, -0.02],
      [1.33, 1.45, 0.75, -0.05],
    ],
    thumb: [
      projectDirection(leftHandBaseQuat, [0, 0.25, -0.97], true),
      projectDirection(leftHandBaseQuat, [0.05, 0.1, -0.99], true),
      projectDirection(leftHandBaseQuat, [0, 0, -1], true),
    ],
    forearm: projectDirection(leftHandBaseQuat, [-0.5, -0.35, 0.79], true),
    sleeve: 0.34,
  });

  const leftHandGroup = new THREE.Group();
  leftHandGroup.add(createMesh(leftHandRig.fabric, matGloveFabric));
  root.add(leftHandGroup);

  const reloadRig = createReloadKeyframes(leftHandBaseQuat);
  leftHandGroup.position.copy(reloadRig.poseGripHandguard.p);
  leftHandGroup.quaternion.copy(reloadRig.poseGripHandguard.q);

  // 设置第一人称视模渲染层级
  root.traverse((obj) => {
    obj.layers.set(FACTION_ENEMY);
  });
  ctx.camera.add(root);

  // 统计几何体面数与网格数
  const totalTris =
    Object.values(geo).reduce((sum, g) => sum + countGeometryTris(g), 0) +
    countGeometryTris(rightHandRig.fabric) +
    countGeometryTris(rightHandRig.index[0]) +
    countGeometryTris(leftHandRig.fabric) +
    (markingsMesh ? countGeometryTris(markingsMesh.geometry) : 0) +
    2;

  let totalMeshes = 0;
  root.traverse((obj) => {
    if (/** @type {any} */ (obj).isMesh) totalMeshes++;
  });
  console.log(
    "[weapon] " +
      PAC9_MODEL_PARAMS.name +
      ": " +
      Math.round(totalTris) +
      " tris, " +
      totalMeshes +
      " meshes (flash only while firing)",
  );

  return {
    root,
    pac9Group,
    boltMesh,
    magGroup,
    magDefaultPos,
    topRoundMesh,
    opticSightMesh,
    muzzleFlashMesh,
    weaponMeshMap,
    updateMuzzlePosForWeapon,
    rightHandGroup,
    leftHandGroup,
    updateTriggerFinger,
    reloadRig,
    totalTris,
    totalMeshes,
  };
}

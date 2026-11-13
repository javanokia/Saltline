/**
 * @file src/level/builder.js
 * @description 关卡建造上下文环境 (Level Builder Context)
 * 提供网格放置、几何体合批、物理碰撞注册、道具空间分布与层级管理方法
 */

import * as THREE from "three";
import {
  createBoxGeometry,
  createBoxBevelGeometry,
  createCylinderGeometry,
  createTubeFromPoints,
  mergeStaticMeshHierarchy,
  createMeshWithShadows,
} from "../geo.js";
import { PROP_SIZES } from "../props.js";
import { HALF_PI, DYNAMIC_PHYSICS_PROPS } from "./constants.js";

export function createLevelBuilderContext(engineCtx) {
  const staticRoot = new THREE.Group();
  staticRoot.name = "level-static";

  const dynRoot = new THREE.Group();
  dynRoot.name = "level-dynamic";

  const restrictedZones = [];
  const placedProps = [];
  const dynamicUpdaters = [];

  const prng = engineCtx.rng && engineCtx.rng.fork ? engineCtx.rng.fork() : Math.random;
  const prngRange = (min, max) => min + (max - min) * prng();

  const getMat = (name, opts) => engineCtx.mats.get(name, opts);
  const getInteriorMat = (name, opts) =>
    engineCtx.mats.get(name, { interior: true, ...(opts || {}) });
  const resolveMat = (m) => (typeof m === "string" ? getMat(m) : m);

  /**
   * 将几何体包装为网格并挂入层级
   */
  function addMesh(geo, mat, opts = {}) {
    const mesh = createMeshWithShadows(geo, resolveMat(mat), {
      cast: opts.cast !== false,
      recv: opts.recv !== false,
    });
    if (opts.p) mesh.position.set(opts.p[0], opts.p[1], opts.p[2]);
    if (opts.r) mesh.rotation.set(opts.r[0] || 0, opts.r[1] || 0, opts.r[2] || 0);
    (opts.parent || staticRoot).add(mesh);
    return mesh;
  }

  /**
   * 放置长方体建筑体
   */
  function addBox(mat, w, h, d, x, y, z, opts = {}) {
    const geo = opts.bevel
      ? createBoxBevelGeometry(w, h, d, opts.bevel)
      : createBoxGeometry(w, h, d);
    return addMesh(geo, mat, { ...opts, p: [x, y, z] });
  }

  /**
   * 根据对角包围盒范围放置长方体 (Box by Min-Max Bounds)
   */
  function addBoxBounds(mat, minX, minY, minZ, maxX, maxY, maxZ, opts = {}) {
    return addBox(
      mat,
      Math.abs(maxX - minX),
      Math.abs(maxY - minY),
      Math.abs(maxZ - minZ),
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
      opts,
    );
  }

  /**
   * 放置圆柱体
   */
  function addCylinder(mat, radius, height, x, y, z, opts = {}) {
    const geo = createCylinderGeometry(
      opts.rTop ?? radius,
      radius,
      height,
      opts.seg || 12,
      !!opts.open,
    );
    const rot =
      opts.axis === "x"
        ? [0, 0, Math.PI / 2]
        : opts.axis === "z"
          ? [Math.PI / 2, 0, 0]
          : opts.r || [0, 0, 0];
    return addMesh(geo, mat, { ...opts, p: [x, y, z], r: rot });
  }

  /**
   * 沿三维样条曲线创建管道 (Curve Tube)
   */
  function addCurveTube(mat, points, radius = 0.03, opts = {}) {
    return addMesh(
      createTubeFromPoints(points, radius, opts.radial || 6, false, opts.tension ?? 0.5),
      mat,
      opts,
    );
  }

  /**
   * 连接两点创建圆柱连杆 (Connecting Rod Between 2 Points)
   */
  function addConnectingRod(mat, p0, p1, radius = 0.015, opts = {}) {
    const v0 = new THREE.Vector3(...p0);
    const v1 = new THREE.Vector3(...p1);
    const len = v0.distanceTo(v1);
    const geo = createCylinderGeometry(radius, radius, len, opts.seg || 6);
    const mesh = addMesh(geo, mat, opts);
    mesh.position.copy(v0).add(v1).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v1.sub(v0).normalize());
    return mesh;
  }

  /**
   * 建造结构工字钢梁 (Structural I-Beam Builder)
   */
  function addIBeam(
    mat,
    axis,
    len,
    x,
    y,
    z,
    { depth = 0.4, width = 0.2, tf = 0.02, tw = 0.012, depthAxis = null, r = null } = {},
  ) {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    if (r) grp.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0);

    const dAxis = depthAxis || (axis === "y" ? "z" : "y");
    const otherAxis = ["x", "y", "z"].find((p) => p !== axis && p !== dAxis);

    const makeDims = (l, d, w) => {
      const o = {};
      o[axis] = l;
      o[dAxis] = d;
      o[otherAxis] = w;
      return [o.x, o.y, o.z];
    };
    const makeOffset = (p) => {
      const o = { x: 0, y: 0, z: 0 };
      o[dAxis] = p;
      return [o.x, o.y, o.z];
    };

    const resolvedM = resolveMat(mat);
    // 上下两块翼缘板 (Top & Bottom Flanges)
    for (const sign of [-1, 1]) {
      addMesh(createBoxGeometry(...makeDims(len, tf, width)), resolvedM, {
        parent: grp,
        p: makeOffset(sign * (depth / 2 - tf / 2)),
      });
    }
    // 中间腹板 (Web Plate)
    addMesh(createBoxGeometry(...makeDims(len, depth - 2 * tf, tw)), resolvedM, { parent: grp });
    staticRoot.add(grp);
    return grp;
  }

  /**
   * 贴装单面贴花 (Decal Mesh)
   */
  function addDecal(mat, w, h, x, y, z, dir = "z+", rotZ = 0) {
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.position.set(x, y, z);
    if (dir === "z-") mesh.rotation.y = Math.PI;
    else if (dir === "x+") mesh.rotation.y = Math.PI / 2;
    else if (dir === "x-") mesh.rotation.y = -Math.PI / 2;
    else if (dir === "y+") {
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = rotZ;
    }
    staticRoot.add(mesh);
    return mesh;
  }

  /**
   * 按名称贴装贴花
   */
  function addDecalByName(name, w, x, y, z, dir, rotZ) {
    try {
      const dec = engineCtx.mats.decal(name);
      if (!dec || !dec.material) return null;
      return addDecal(dec.material, w, w / (dec.aspect || 1), x, y, z, dir, rotZ);
    } catch {
      return null;
    }
  }

  /**
   * 贴装文字标贴 (Label Mesh)
   */
  function addLabel(text, h, x, y, z, dir, opts) {
    try {
      const lbl = engineCtx.mats.label(text, opts || {});
      if (!lbl || !lbl.material) return null;
      return addDecal(lbl.material, h * (lbl.aspect || 4), h, x, y, z, dir);
    } catch {
      return null;
    }
  }

  /**
   * 注册物理世界静态碰撞 AABB
   */
  function addPhysicsBox(minX, minY, minZ, maxX, maxY, maxZ, surface = "concrete", opts = {}) {
    return engineCtx.physics.addBox([minX, minY, minZ], [maxX, maxY, maxZ], { surface, ...opts });
  }

  const helperBox = new THREE.Box3();

  /**
   * 解析网格上携带的道具碰撞体并将世界 AABB 注册进物理系统
   */
  function addMeshCollidersToPhysics(mesh, rotY, opts = {}) {
    const colliders = mesh.userData.colliders || [];
    const isAngled = Math.abs(Math.sin(2 * rotY)) > 0.2;

    for (const c of colliders) {
      let subBoxes = [c];
      // 当道具发生非 90 度旋转时，将长条型碰撞体沿长轴剖分为多段小盒，杜绝斜向穿透伪碰撞 (Split Angled Box to Prevent Ghost Collisions)
      if (isAngled) {
        const dx = c.max[0] - c.min[0];
        const dz = c.max[2] - c.min[2];
        const primaryAxis = dx >= dz ? 0 : 2;
        const maxSpan = Math.max(dx, dz);
        const minSpan = Math.max(0.25, Math.min(dx, dz));
        const numSlices = Math.min(10, Math.max(1, Math.round(maxSpan / minSpan)));
        if (numSlices > 1) {
          subBoxes = [];
          for (let s = 0; s < numSlices; s++) {
            const bMin = c.min.slice();
            const bMax = c.max.slice();
            bMin[primaryAxis] = c.min[primaryAxis] + (maxSpan * s) / numSlices;
            bMax[primaryAxis] = c.min[primaryAxis] + (maxSpan * (s + 1)) / numSlices;
            subBoxes.push({ min: bMin, max: bMax, surface: c.surface });
          }
        }
      }

      for (const sb of subBoxes) {
        helperBox.min.set(sb.min[0], sb.min[1], sb.min[2]);
        helperBox.max.set(sb.max[0], sb.max[1], sb.max[2]);
        helperBox.applyMatrix4(mesh.matrixWorld);
        if (helperBox.max.y - helperBox.min.y < 0.2 && helperBox.max.y < 0.3) continue;

        if (isAngled) {
          const shrinkX = (helperBox.max.x - helperBox.min.x) * 0.07;
          const shrinkZ = (helperBox.max.z - helperBox.min.z) * 0.07;
          helperBox.min.x += shrinkX;
          helperBox.max.x -= shrinkX;
          helperBox.min.z += shrinkZ;
          helperBox.max.z -= shrinkZ;
        }

        engineCtx.physics.addBox(helperBox.min.toArray(), helperBox.max.toArray(), {
          surface: sb.surface || "metal",
          ...opts,
        });
      }
    }
  }

  /**
   * 实例化并放置道具 (Place Prop)
   */
  function placeProp(name, x, z, rotY = 0, opts = {}, y = 0, colOpts = {}) {
    const mesh = engineCtx.props.build(name, opts);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.updateMatrix();
    mesh.updateMatrixWorld(!opts.noCol);

    if (DYNAMIC_PHYSICS_PROPS.has(name)) {
      dynRoot.add(mesh);
    } else {
      staticRoot.add(mesh);
    }

    if (!colOpts.noCol) {
      addMeshCollidersToPhysics(mesh, rotY, colOpts);
    }

    placedProps.push({ name, pos: [x, y, z], yaw: rotY });
    return mesh;
  }

  /**
   * 放置钢结构楼梯并自动添加斜坡物理碰撞
   */
  function placeStairs(x, z, rotY = 0, y = 0, opts = {}) {
    const mesh = placeProp("stairs_metal", x, z, rotY, opts, y);
    const alongX = Math.abs(Math.cos(rotY)) > 0.5;
    const dir = (alongX ? Math.cos(rotY) : Math.sin(rotY)) > 0 ? 1 : -1;
    const run = 2.4;
    const rise = 2.4;
    const width = 0.9;
    const slices = 8;

    for (let k = 0; k < slices; k++) {
      const stepY = y + (k + 0.5) * (rise / slices);
      const stepDist = (k + 0.5) * (run / slices) - run / 2;
      const sx = alongX ? x + dir * stepDist : x;
      const sz = alongX ? z : z + dir * stepDist;
      const hw = alongX ? run / slices / 2 : width / 2;
      const hd = alongX ? width / 2 : run / slices / 2;
      engineCtx.physics.addBox([sx - hw, y, sz - hd], [sx + hw, stepY, sz + hd], {
        surface: "metal",
      });
    }
    return mesh;
  }

  /**
   * 放置高空检修连廊 (Catwalk)
   */
  function placeCatwalk(x, z, rotY = 0, y = 0, opts = {}, rails = [true, true]) {
    const railStr = rails[0] && rails[1] ? "both" : rails[0] ? "left" : rails[1] ? "right" : "none";
    return placeProp("catwalk", x, z, rotY, { ...opts, rails: railStr }, y);
  }

  /**
   * 沿高度堆叠多层集装箱垛 (Multi-tier Container Stacking)
   */
  function placeContainerStack(x, z, stackDefs, rotY = 0, spacing = 1) {
    let curY = 0;
    const placedList = [];
    for (let k = 0; k < stackDefs.length; k++) {
      const [typeNum, colorName, extraOpts = {}] = stackDefs[k];
      const typeStr = "container" + typeNum;
      const mesh = placeProp(
        typeStr,
        x + (extraOpts.dx || 0),
        z + (extraOpts.dz || 0),
        rotY + (extraOpts.flip ? Math.PI : 0),
        {
          color: colorName,
          seed: k + 1,
          doors: extraOpts.doors || 0,
          wear: extraOpts.wear || 0.4,
        },
        curY,
      );
      placedList.push(mesh);
      curY += (PROP_SIZES[typeStr] ? PROP_SIZES[typeStr][1] : 2.59) + 0.005;
    }
    return placedList;
  }

  return {
    staticRoot,
    dynRoot,
    placed: placedProps,
    updaters: dynamicUpdaters,
    M: getMat,
    MI: getInteriorMat,
    mesh: addMesh,
    box: addBox,
    slab: addBoxBounds,
    cyl: addCylinder,
    tube: addCurveTube,
    rod: addConnectingRod,
    ibeam: addIBeam,
    decal: addDecal,
    decalName: addDecalByName,
    label: addLabel,
    col: addPhysicsBox,
    addColliders: addMeshCollidersToPhysics,
    place: placeProp,
    stairs: placeStairs,
    catwalk: placeCatwalk,
    stack: placeContainerStack,
    isRestricted: (x, z) =>
      restrictedZones.some((b) => x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]),
    isMetal: (x, z) =>
      placedProps.some(
        (p) => p.name.startsWith("container") && Math.hypot(p.pos[0] - x, p.pos[2] - z) < 2.0,
      ),
    G: engineCtx,
  };
}

// ============================================================================
// 三、 露天集装箱堆场战术场景构建 (Container Yard Builder: hR)
// ============================================================================

/**
 * 组装集装箱露天堆场 (Yard: Staggered Stacks, Narrow Alleys & Vantage Points)
 */

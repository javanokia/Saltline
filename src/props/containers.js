import * as THREE from "three";
import { createBoxGeometry } from "../geo.js";
import {
  PI,
  HALF_PI,
  clamp,
  PROP_SIZES,
  CONTAINER_WIDTH_STD,
  generateCorrugatedProfilePoints,
  sampleValueNoise2D,
  transformGeometryInPlace,
  smoothstepHermite,
  lerpVec3,
  createPropPRNG,
  createBeveledBoxGeometry,
  createLoftedRibbonGeometry,
  createRoundedRectGeometry,
  createWorldUVPlaneGeometry,
  createTransformMatrix4,
  PropMeshAssembler,
  getCachedLabelTexture,
  getCachedDecalTexture,
  withCachedPrototype,
  prototypeCache,
} from "./builder.js";

const CONTAINER_SPECS = {
  container20: {
    type: "22G1",
    gross: "30,480",
    tare: "2,230",
    net: "28,250",
    cu: "33.2",
    def: "red",
  },
  container40: {
    type: "42G1",
    gross: "32,500",
    tare: "3,750",
    net: "28,750",
    cu: "67.7",
    def: "blue",
  },
  container40hc: {
    type: "45G1",
    gross: "32,500",
    tare: "3,940",
    net: "28,560",
    cu: "76.3",
    def: "green",
  },
};

const CONTAINER_BIC_CODES = [
  "SLTU 482915 7",
  "HBMU 307144 2",
  "NRDU 665201 9",
  "OKTU 119873 4",
  "VSLU 850362 1",
  "TQLU 274590 6",
];

const CONTAINER_LOGOS = ["logo_a", "logo_b", "logo_c", "logo_d"];

const CORNER_CASTING_X = 0.178;
const CORNER_CASTING_Y = 0.118;
const CORNER_CASTING_Z = 0.162;

// 梯形波纹截面参数 (Side Corrugation Wave Specs)
const CORRUGATION_SPECS = {
  P: 0.278, // 周期
  d: 0.036, // 深度
  fo: 0.072, // 平面宽度
  sl: 0.068, // 斜坡宽度
};

/**
 * 生成集装箱几何网格与碰撞包围盒 (ISO Shipping Container Geometry & Colliders)
 * @param {object} engineCtx 引擎上下文
 * @param {string} type 集装箱规格 ('container20' | 'container40' | 'container40hc')
 * @param {number} seed 随机种子
 * @param {number} doorOpenRatio 货运门开合程度 (0: 紧闭, 1: 全开112度)
 * @param {number} wearFactor 风化锈蚀磨损程度
 */
function generateContainerGeometry(engineCtx, type, seed, doorOpenRatio, wearFactor) {
  const length = PROP_SIZES[type][0];
  const height = PROP_SIZES[type][1];
  const spec = CONTAINER_SPECS[type];
  const prng = createPropPRNG(1000 + seed * 77 + type.length * 13);
  const assembler = new PropMeshAssembler(engineCtx);

  const matGalv = assembler.M("steel_galv");
  const matWood = assembler.M("wood_pallet");

  const halfWidth = CONTAINER_WIDTH_STD / 2;
  const halfLength = length / 2;
  const innerHalfWidth = halfWidth - 0.012;
  const startX = -halfLength + 0.085;
  const endX = halfLength - 0.135;
  const bottomCorrugationY = 0.167;
  const topCorrugationY = height - 0.06;

  // 凹陷与物理撞击损伤变形列表
  const dents = [];
  const dentCount = Math.round((1 + prng() * 2.4) * (0.4 + wearFactor));
  const excludeZones = [
    [-halfLength * 0.75, -halfLength * 0.05],
    [halfLength - 2.2, halfLength],
  ];

  for (let i = 0; i < dentCount; i++) {
    const side = prng() < 0.5 ? 1 : -1;
    let dx = 0,
      tries = 0;
    do {
      dx = (prng() * 2 - 1) * (halfLength - 0.9);
      tries++;
    } while (
      tries < 8 &&
      excludeZones.some((z) => dx > z[0] - 0.4 && dx < z[1] + 0.4 && prng() < 0.9)
    );
    dents.push({
      side,
      x: side * dx,
      y: 0.45 + prng() * 1.3,
      r: 0.22 + prng() * 0.3,
      depth: 0.025 + prng() * 0.04,
    });
  }

  // 锈蚀流淌条带列表
  const rustRuns = [];
  const rustCount = Math.round((length / 2.2) * (0.5 + wearFactor) * (0.6 + prng()));
  for (let i = 0; i < rustCount * 2; i++) {
    rustRuns.push({
      side: i % 2 ? 1 : -1,
      x: (prng() * 2 - 1) * (halfLength - 0.3),
      w: 0.05 + prng() * 0.12,
      k: 0.4 + prng() * 0.6,
    });
  }

  const grimeTint = [0.5, 0.44, 0.38];
  const rustTint = [0.62, 0.38, 0.24];
  const noiseSeed = seed * 9.7;

  // 顶点噪波着色器回调函数
  const vertexColorShader = (vx, vy, vz) => {
    let factor =
      1 +
      (sampleValueNoise2D(vx * 0.9 + noiseSeed, vy * 1.7 + vz * 0.4) - 0.5) *
        0.16 *
        (0.5 + wearFactor);
    factor *= 0.94 + 0.06 * sampleValueNoise2D(vx * 6.1 + vz * 3.3, vy * 5 + noiseSeed);
    let col = [factor, factor, factor];
    const groundOccl =
      smoothstepHermite(0.62, 0.02, vy) *
      (0.45 + 0.5 * wearFactor) *
      (0.75 + 0.5 * sampleValueNoise2D(vx * 2.3 + vz, noiseSeed));
    col = lerpVec3(
      col,
      [grimeTint[0] * factor, grimeTint[1] * factor, grimeTint[2] * factor],
      Math.min(1, groundOccl),
    );
    return col;
  };

  const BODY_TAG = { body: true };
  assembler.defCol.set(BODY_TAG, vertexColorShader);

  const getDentDisplacement = (vx, vy, vz) => {
    let disp = 0;
    for (const d of dents) {
      if (d.side === vz) {
        const dist = Math.hypot(vx - d.x, (vy - d.y) * 0.9) / d.r;
        if (dist < 1) {
          const w = 1 - dist * dist;
          disp += d.depth * w * w;
        }
      }
    }
    return disp;
  };

  const holeColor = [0.035, 0.035, 0.04];

  // 1. ISO 1161 八角铸钢转锁角件 (8 Corner Castings with Twist-Lock Holes)
  for (const sx of [-1, 1]) {
    for (const sy of [0, 1]) {
      for (const sz of [-1, 1]) {
        const cx = sx * (halfLength - CORNER_CASTING_X / 2);
        const cy = sy ? height - CORNER_CASTING_Y / 2 : CORNER_CASTING_Y / 2;
        const cz = sz * (halfWidth - CORNER_CASTING_Z / 2);
        assembler.box(BODY_TAG, CORNER_CASTING_X, CORNER_CASTING_Y, CORNER_CASTING_Z, cx, cy, cz, {
          r: 0.012,
        });
        assembler.add(
          BODY_TAG,
          transformGeometryInPlace(
            createRoundedRectGeometry(0.078, 0.052, 3),
            cx,
            cy,
            sz * (halfWidth + 0.0012),
            [0, sz > 0 ? 0 : PI, 0],
          ),
          holeColor,
        );
        assembler.add(
          BODY_TAG,
          transformGeometryInPlace(
            createRoundedRectGeometry(0.064, 0.05, 3),
            sx * (halfLength + 0.0012),
            cy,
            cz,
            [0, sx * HALF_PI, 0],
          ),
          holeColor,
        );
        if (sy) {
          assembler.add(
            BODY_TAG,
            transformGeometryInPlace(
              createRoundedRectGeometry(0.124, 0.064, 3),
              cx,
              height + 0.0012,
              cz,
              [-HALF_PI, 0, 0],
            ),
            holeColor,
          );
        }
      }
    }
  }

  // 2. 主体立柱与横梁 (Main Structural Posts and Rails)
  for (const sz of [-1, 1]) {
    assembler.box(
      BODY_TAG,
      0.085,
      height - 2 * CORNER_CASTING_Y + 0.01,
      0.15,
      -halfLength + 0.0465,
      height / 2,
      sz * (halfWidth - 0.079),
      { r: 0.014 },
    );
    assembler.box(
      BODY_TAG,
      0.14,
      height - 2 * CORNER_CASTING_Y + 0.01,
      0.056,
      halfLength - 0.074,
      height / 2,
      sz * (halfWidth - 0.032),
      { r: 0.012 },
    );
    assembler.box(
      BODY_TAG,
      length - 0.2,
      0.062,
      0.062,
      -0.02,
      height - 0.031,
      sz * (halfWidth - 0.035),
      { r: 0.008 },
    );
    assembler.box(
      BODY_TAG,
      length - 0.2,
      0.158,
      0.05,
      -0.02,
      0.012 + 0.079,
      sz * (halfWidth - 0.029),
      { r: 0.008 },
    );
  }

  assembler.box(
    BODY_TAG,
    0.062,
    0.062,
    CONTAINER_WIDTH_STD - 0.2,
    -halfLength + 0.035,
    height - 0.031,
    0,
    { r: 0.008 },
  );
  assembler.box(BODY_TAG, 0.05, 0.158, CONTAINER_WIDTH_STD - 0.2, -halfLength + 0.029, 0.091, 0, {
    r: 0.008,
  });
  assembler.box(
    BODY_TAG,
    0.13,
    0.12,
    CONTAINER_WIDTH_STD - 0.12,
    halfLength - 0.072,
    height - 0.06,
    0,
    { r: 0.01 },
  );
  assembler.box(BODY_TAG, 0.13, 0.158, CONTAINER_WIDTH_STD - 0.12, halfLength - 0.072, 0.091, 0, {
    r: 0.01,
  });
  assembler.box(
    BODY_TAG,
    0.03,
    0.012,
    CONTAINER_WIDTH_STD - 0.4,
    halfLength - 0.012,
    height - 0.125,
    0,
    { r: 0.003, rot: [0, 0, -0.5] },
  );

  // 20尺集装箱特有的底部叉车槽 (Forklift Pockets for 20ft Containers)
  if (type === "container20") {
    for (const sz of [-1, 1]) {
      for (const px of [-1.025, 1.025]) {
        assembler.add(
          BODY_TAG,
          transformGeometryInPlace(
            new THREE.PlaneGeometry(0.36, 0.112),
            px,
            0.075,
            sz * (halfWidth - 0.0035),
            [0, sz > 0 ? 0 : PI, 0],
          ),
          holeColor,
        );
        assembler.box(BODY_TAG, 0.46, 0.018, 0.012, px, 0.142, sz * (halfWidth - 0.002), {
          r: 0.003,
        });
        for (const mx of [-1, 1]) {
          assembler.box(
            BODY_TAG,
            0.018,
            0.13,
            0.01,
            px + mx * 0.19,
            0.078,
            sz * (halfWidth - 0.003),
            { r: 0.003 },
          );
        }
      }
    }
  }

  // 3. 梯形波纹钢制侧板 (Trapezoidal Corrugated Side Panels)
  const yPath = [bottomCorrugationY, 0.44, 1.25, height - 0.5, topCorrugationY];
  const sideProfile = generateCorrugatedProfilePoints(
    startX,
    endX,
    CORRUGATION_SPECS.P,
    CORRUGATION_SPECS.d,
    CORRUGATION_SPECS.fo,
    CORRUGATION_SPECS.sl,
    startX + 0.02,
  );

  for (const sz of [-1, 1]) {
    const sideMesh = createLoftedRibbonGeometry(
      sideProfile,
      yPath,
      (px, pz, py) => [px, py, sz * (innerHalfWidth + pz - getDentDisplacement(px, py, sz))],
      { center: [0, height / 2, 0] },
    );
    sideMesh.computeVertexNormals();
    const pos = sideMesh.attributes.position;
    const colArr = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      let col = vertexColorShader(vx, vy, vz);
      const edgeDist = innerHalfWidth - Math.abs(vz);
      const edgeWeight = smoothstepHermite(0.008, 0.034, edgeDist);
      col = [
        col[0] * (1 - 0.17 * edgeWeight),
        col[1] * (1 - 0.18 * edgeWeight),
        col[2] * (1 - 0.18 * edgeWeight),
      ];

      const topRustWeight = smoothstepHermite(height - 0.75, topCorrugationY, vy);
      if (topRustWeight > 0) {
        for (const r of rustRuns) {
          if (r.side === sz) {
            const rxDist = Math.abs(vx - r.x) / r.w;
            if (rxDist < 1) {
              col = lerpVec3(
                col,
                [col[0] * rustTint[0], col[1] * rustTint[1], col[2] * rustTint[2]],
                topRustWeight *
                  topRustWeight *
                  r.k *
                  (1 - rxDist * rxDist) *
                  (0.45 + 0.55 * wearFactor),
              );
            }
          }
        }
      }
      colArr[i * 3] = col[0];
      colArr[i * 3 + 1] = col[1];
      colArr[i * 3 + 2] = col[2];
    }
    sideMesh.setAttribute("color", new THREE.Float32BufferAttribute(colArr, 3));
    assembler.add(BODY_TAG, sideMesh);
  }

  // 4. 前端封板与顶板波纹 (Front Wall and Roof Corrugations)
  const frontProfile = generateCorrugatedProfilePoints(
    -halfWidth + 0.08,
    halfWidth - 0.08,
    0.209,
    0.02,
    0.09,
    0.03,
    -halfWidth + 0.08,
  );
  const frontMesh = createLoftedRibbonGeometry(
    frontProfile,
    [bottomCorrugationY, topCorrugationY],
    (px, pz, py) => [-halfLength + 0.035 - pz, py, px],
    { center: [0, height / 2, 0] },
  );
  assembler.add(BODY_TAG, frontMesh);

  const roofY = height - 0.025;
  const roofProfile = generateCorrugatedProfilePoints(
    startX + 0.02,
    endX - 0.02,
    0.25,
    0.042,
    0.07,
    0.06,
    startX + 0.02,
  );
  const roofMesh = createLoftedRibbonGeometry(
    roofProfile,
    [-halfWidth + 0.066, 0, halfWidth - 0.066],
    (px, pz, py) => [px, roofY + pz + (Math.abs(py) < 0.01 ? 0.006 : 0), py],
    { center: [0, height / 2, 0] },
  );
  assembler.add(BODY_TAG, roofMesh, (vx, vy, vz) => {
    const noise = 0.78 + 0.3 * sampleValueNoise2D(vx * 0.8 + noiseSeed, vz * 1.1);
    const roofSlope = smoothstepHermite(0.004, 0.018, roofY - vy);
    return [
      noise * (1 - 0.25 * roofSlope),
      noise * (1 - 0.3 * roofSlope) * 0.97,
      noise * (1 - 0.32 * roofSlope) * 0.94,
    ];
  });

  // 5. 内部木地板与中空通行结构 (Interior Wooden Floor & Hollow Walkway when doors open)
  const hasOpenDoor = doorOpenRatio > 0.03;
  const floorLevel = 0.172;
  if (hasOpenDoor) {
    const floorShader = (vx, vy, vz) => {
      const occl =
        (0.16 +
          0.62 *
            smoothstepHermite(-halfLength, halfLength, vx) *
            smoothstepHermite(-halfLength, halfLength, vx)) *
        (0.8 + 0.2 * smoothstepHermite(0.2, 1.4, vy));
      return [occl, occl, occl];
    };
    const innerProfile = generateCorrugatedProfilePoints(
      startX,
      endX,
      CORRUGATION_SPECS.P,
      CORRUGATION_SPECS.d,
      CORRUGATION_SPECS.fo,
      CORRUGATION_SPECS.sl,
      startX + 0.02,
    );
    for (const sz of [-1, 1]) {
      assembler.add(
        BODY_TAG,
        createLoftedRibbonGeometry(
          innerProfile,
          [floorLevel, topCorrugationY - 0.02],
          (px, pz, py) => [px, py, sz * (innerHalfWidth + pz - 0.004)],
          { center: [0, height / 2, 0], inward: true },
        ),
        floorShader,
      );
    }
    assembler.add(
      BODY_TAG,
      transformGeometryInPlace(
        new THREE.PlaneGeometry(endX - startX, 2 * innerHalfWidth),
        (startX + endX) / 2,
        topCorrugationY - 0.03,
        0,
        [HALF_PI, 0, 0],
      ),
      floorShader,
    );
    assembler.add(
      BODY_TAG,
      transformGeometryInPlace(
        new THREE.PlaneGeometry(2 * innerHalfWidth, topCorrugationY - floorLevel),
        startX + 0.03,
        (floorLevel + topCorrugationY) / 2,
        0,
        [0, HALF_PI, 0],
      ),
      floorShader,
    );

    const woodPlankGeo = createWorldUVPlaneGeometry(endX - startX + 0.1, 2 * innerHalfWidth - 0.02);
    assembler.add(
      matWood,
      transformGeometryInPlace(woodPlankGeo, (startX + endX) / 2 + 0.05, floorLevel, 0, [
        -HALF_PI,
        0,
        0,
      ]),
      (vx) => {
        const w = 0.3 + 0.6 * smoothstepHermite(-halfLength, halfLength, vx) ** 2;
        return [w, w * 0.97, w * 0.93];
      },
    );
    assembler.box(
      matGalv,
      0.05,
      0.006,
      2 * innerHalfWidth - 0.1,
      halfLength - 0.11,
      floorLevel + 0.001,
      0,
      { r: 0.002 },
    );
  }

  // 6. 后部双开货运门 (Twin Cargo Swinging Doors with Locking Rods & Keepers)
  const doorBottomY = 0.175;
  const doorTopY = height - 0.124;
  const doorHeight = doorTopY - doorBottomY;
  const doorWidth = halfWidth - 0.058 - 0.004;
  const doorHingeX = halfLength - 0.066;
  const dynamicColliders = [];

  for (const side of [1, -1]) {
    const swingAngle =
      doorOpenRatio * (side > 0 ? 1 : 0.88) * THREE.MathUtils.degToRad(side > 0 ? 112 : 100);
    const hingeZ = side * (halfWidth - 0.058);
    assembler.push(createTransformMatrix4(doorHingeX, 0, hingeZ, [0, -side * swingAngle, 0]));

    const mirrorZ = (k) => -side * k;
    const doorMidY = (doorBottomY + doorTopY) / 2;
    assembler.box(
      BODY_TAG,
      0.034,
      doorHeight,
      doorWidth - 0.006,
      0,
      doorMidY,
      mirrorZ(doorWidth / 2),
      { r: 0.008, col: vertexColorShader },
    );

    // 门板纵向波纹折线 (Vertical Ribbed Profile on Door)
    const doorP = type === "container40hc" ? 7 : 6;
    const ribMinY = doorBottomY + 0.085;
    const ribMaxY = doorTopY - 0.085;
    const ribStepY = (ribMaxY - ribMinY) / doorP;
    const ribProf = [];

    for (let k = 0; k < doorP; k++) {
      const cy = ribMinY + k * ribStepY;
      ribProf.push(
        [cy, 0.019],
        [cy + 0.022, 0.019],
        [cy + 0.05, 0.031],
        [cy + ribStepY - 0.05, 0.031],
        [cy + ribStepY - 0.022, 0.019],
      );
    }
    ribProf.push([ribMaxY, 0.019]);
    assembler.add(
      BODY_TAG,
      createLoftedRibbonGeometry(
        ribProf,
        [0.075, doorWidth - 0.085],
        (ry, rz, rx) => [rz, ry, mirrorZ(rx)],
        { center: [-1, doorMidY, mirrorZ(doorWidth / 2)] },
      ),
      vertexColorShader,
    );

    // 密封橡胶圈 (Rubber Gaskets)
    const rubberCol = [0.05, 0.05, 0.05];
    assembler.box(
      BODY_TAG,
      0.022,
      doorHeight + 0.012,
      0.018,
      0.004,
      doorMidY,
      mirrorZ(doorWidth + 0.001),
      { r: 0, col: rubberCol },
    );
    assembler.box(
      BODY_TAG,
      0.022,
      0.016,
      doorWidth,
      0.004,
      doorTopY + 0.004,
      mirrorZ(doorWidth / 2),
      { r: 0, col: rubberCol },
    );
    assembler.box(
      BODY_TAG,
      0.022,
      0.016,
      doorWidth,
      0.004,
      doorBottomY - 0.004,
      mirrorZ(doorWidth / 2),
      { r: 0, col: rubberCol },
    );

    // 门铰链 (Door Hinges)
    const hingeCount = type === "container40hc" ? 5 : 4;
    for (let k = 0; k < hingeCount; k++) {
      const hy = doorBottomY + 0.16 + (k * (doorHeight - 0.32)) / (hingeCount - 1);
      assembler.box(BODY_TAG, 0.012, 0.062, 0.15, 0.021, hy, mirrorZ(0.085), { r: 0 });
      assembler.cyl(matGalv, 0.013, 0.013, 0.086, 0.026, hy, mirrorZ(-0.002), {
        seg: 6,
        open: true,
      });
    }

    // 镀锌锁杆、凸轮锁头与操作手柄 (Locking Cam Rods & Operating Handles)
    for (const rodZ of [0.31, 0.83]) {
      assembler.cyl(matGalv, 0.0155, 0.0155, doorHeight + 0.2, 0.052, doorMidY, mirrorZ(rodZ), {
        seg: 7,
        open: true,
      });
      for (const endSign of [-1, 1]) {
        assembler.add(
          matGalv,
          transformGeometryInPlace(
            createBoxGeometry(0.03, 0.045, 0.085),
            0.052 - 0.004,
            doorMidY + endSign * (doorHeight / 2 + 0.065),
            mirrorZ(rodZ),
          ),
        );
        assembler.box(
          BODY_TAG,
          0.03,
          0.05,
          0.075,
          0.052 - 0.012,
          doorMidY + endSign * (doorHeight / 2 - 0.035),
          mirrorZ(rodZ),
          { r: 0 },
        );
      }
      for (const guideY of [doorBottomY + doorHeight * 0.3, doorBottomY + doorHeight * 0.72]) {
        assembler.box(BODY_TAG, 0.026, 0.04, 0.07, 0.052 - 0.012, guideY, mirrorZ(rodZ), { r: 0 });
      }
      const handleY = 1.02 + (rodZ > 0.5 ? 0 : 0.13);
      const handleDir = rodZ > 0.5 ? -1 : 1;
      assembler.box(matGalv, 0.02, 0.05, 0.05, 0.052 + 0.008, handleY, mirrorZ(rodZ), { r: 0 });
      assembler.box(
        matGalv,
        0.011,
        0.032,
        0.36,
        0.052 + 0.016,
        handleY,
        mirrorZ(rodZ + handleDir * 0.19),
        { r: 0.004 },
      );
      assembler.box(
        BODY_TAG,
        0.03,
        0.07,
        0.05,
        0.052 - 0.008,
        handleY,
        mirrorZ(rodZ + handleDir * 0.33),
        { r: 0 },
      );
      assembler.box(
        matGalv,
        0.012,
        0.085,
        0.012,
        0.052 + 0.012,
        handleY + 0.005,
        mirrorZ(rodZ + handleDir * 0.33),
        { r: 0 },
      );
    }

    // 门体涂装、警告标线与铭牌 (Decals & Stencil Markings on Doors)
    const doorDecalX = 0.031 + 0.0025;
    const doorDecalRot = [0, HALF_PI, 0];
    const addDoorDecal = (dec, sz, py, pz, maxW) => {
      let finalW = sz * dec.aspect;
      if (maxW && finalW > maxW) {
        sz *= maxW / finalW;
        finalW = maxW;
      }
      assembler.add(
        dec.material,
        transformGeometryInPlace(
          new THREE.PlaneGeometry(finalW, sz),
          doorDecalX,
          py,
          mirrorZ(pz),
          doorDecalRot,
        ),
        null,
        true,
      );
    };

    const getRibY = (k) => ribMinY + (k + 0.5) * ribStepY;

    if (side < 0) {
      addDoorDecal(
        getCachedLabelTexture(engineCtx, CONTAINER_BIC_CODES[seed % CONTAINER_BIC_CODES.length], {
          color: "white",
          font: "stencil",
          distress: 0.3,
        }),
        0.115,
        getRibY(doorP - 1),
        doorWidth / 2,
        doorWidth - 0.24,
      );
      addDoorDecal(
        getCachedLabelTexture(engineCtx, spec.type, {
          color: "white",
          font: "stencil",
          distress: 0.3,
        }),
        0.1,
        getRibY(doorP - 2),
        doorWidth / 2 + 0.2,
        0.4,
      );
      const fontOpt = { color: "white", font: "sans", distress: 0.2 };
      addDoorDecal(
        getCachedLabelTexture(engineCtx, "MAX GROSS " + spec.gross + " KG", fontOpt),
        0.052,
        getRibY(doorP - 3) + 0.062,
        doorWidth / 2 - 0.01,
        0.44,
      );
      addDoorDecal(
        getCachedLabelTexture(
          engineCtx,
          "TARE " + spec.tare + " KG   NET " + spec.net + " KG",
          fontOpt,
        ),
        0.045,
        getRibY(doorP - 3),
        doorWidth / 2 - 0.01,
        0.44,
      );
      addDoorDecal(
        getCachedLabelTexture(engineCtx, "CU.CAP. " + spec.cu + " CU.M", fontOpt),
        0.045,
        getRibY(doorP - 3) - 0.062,
        doorWidth / 2 - 0.01,
        0.44,
      );
    } else {
      addDoorDecal(
        getCachedDecalTexture(engineCtx, CONTAINER_LOGOS[seed % 4]),
        0.2,
        getRibY(doorP - 1),
        doorWidth / 2,
        doorWidth - 0.36,
      );
      addDoorDecal(
        getCachedDecalTexture(engineCtx, "csc_plate"),
        0.17,
        getRibY(1),
        doorWidth / 2 + 0.05,
        0.36,
      );
      if (type === "container40hc") {
        addDoorDecal(
          getCachedDecalTexture(engineCtx, "caution_stripes"),
          0.1,
          doorTopY - 0.04,
          doorWidth / 2,
          doorWidth - 0.1,
        );
      }
    }
    assembler.pop();

    // 开门后的动态旋转扇形碰撞盒 (Door Dynamic Colliders when Opened)
    if (hasOpenDoor) {
      for (let k = 0; k < 3; k++) {
        const segStart = (doorWidth * k) / 3;
        const segEnd = (doorWidth * (k + 1)) / 3;
        const pA = [
          doorHingeX + Math.sin(swingAngle) * segStart,
          hingeZ - side * Math.cos(swingAngle) * segStart,
        ];
        const pB = [
          doorHingeX + Math.sin(swingAngle) * segEnd,
          hingeZ - side * Math.cos(swingAngle) * segEnd,
        ];
        dynamicColliders.push({
          min: [Math.min(pA[0], pB[0]) - 0.03, doorBottomY, Math.min(pA[1], pB[1]) - 0.03],
          max: [Math.max(pA[0], pB[0]) + 0.03, doorTopY, Math.max(pA[1], pB[1]) + 0.03],
          surface: "metal",
        });
      }
    }
  }

  // 7. 侧壁贴花、几猫海运标识与风化雨痕 (Side Wall Decals & Weathering)
  const addSideDecal = (dec, sz, py, pz, maxW) => {
    let finalW = pz * dec.aspect;
    if (maxW && finalW > maxW) {
      pz *= maxW / finalW;
      finalW = maxW;
    }
    const minX = py - finalW / 2;
    const maxX = py + finalW / 2;
    const effMinX = sz > 0 ? minX : -maxX;
    const effMaxX = sz > 0 ? maxX : -minX;
    const sideProf = generateCorrugatedProfilePoints(
      Math.max(startX, effMinX),
      Math.min(endX, effMaxX),
      CORRUGATION_SPECS.P,
      CORRUGATION_SPECS.d,
      CORRUGATION_SPECS.fo,
      CORRUGATION_SPECS.sl,
      startX + 0.02,
    );
    const ribbon = createLoftedRibbonGeometry(
      sideProf,
      [pz - finalW / 2, pz + finalW / 2],
      (rx, rz, ry) => [
        rx,
        ry,
        sz * (innerHalfWidth + rz + 0.003 - getDentDisplacement(rx, ry, sz)),
      ],
      { center: [0, height / 2, 0] },
    );
    const pos = ribbon.attributes.position;
    const uv = ribbon.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) - effMinX) / (effMaxX - effMinX);
      uv.setXY(i, sz > 0 ? u : 1 - u, (pos.getY(i) - (pz - finalW / 2)) / finalW);
    }
    assembler.add(dec.material, ribbon, null, true);
    return finalW;
  };

  const bicDecal = getCachedLabelTexture(
    engineCtx,
    CONTAINER_BIC_CODES[seed % CONTAINER_BIC_CODES.length],
    { color: "white", font: "stencil", distress: 0.3 },
  );
  const typeDecal = getCachedLabelTexture(engineCtx, spec.type, {
    color: "white",
    font: "stencil",
    distress: 0.3,
  });
  const logoDecal = getCachedDecalTexture(engineCtx, CONTAINER_LOGOS[seed % 4]);

  for (const sz of [-1, 1]) {
    const logoH = Math.min(height * 0.4, 1.05);
    const logoW = Math.min(logoH * logoDecal.aspect, type === "container20" ? 2.2 : 3.4);
    addSideDecal(
      logoDecal,
      sz,
      type === "container20" ? -0.75 : -halfLength * 0.42,
      height * 0.52,
      logoW / logoDecal.aspect,
    );

    const bicW = Math.min(0.14 * bicDecal.aspect, 1.9);
    addSideDecal(bicDecal, sz, halfLength - 0.3 - bicW / 2, height - 0.32, 0.14);

    const typeW = Math.min(0.11 * typeDecal.aspect, 0.6);
    addSideDecal(typeDecal, sz, halfLength - 0.3 - typeW / 2, height - 0.52, 0.11);

    const grimeStreakCount = Math.round(
      (1 + prng() * 2) * (0.4 + wearFactor) * (length > 7 ? 1.6 : 1),
    );
    for (let v = 0; v < grimeStreakCount; v++) {
      const streakDec = getCachedDecalTexture(
        engineCtx,
        prng() < 0.6 ? "rust_run" : "grime_streak",
      );
      const streakH = 0.5 + prng() * 0.7;
      const streakW = Math.min(0.5, Math.max(0.16, streakH * streakDec.aspect));
      addSideDecal(
        { material: streakDec.material, aspect: streakW / streakH },
        sz,
        (prng() * 2 - 1) * (halfLength - 0.6),
        topCorrugationY - streakH / 2 - 0.005,
        streakH,
      );
    }
  }

  // 8. 物理碰撞包围盒定义 (Hollow Colliders if open, Solid AABB if closed)
  if (hasOpenDoor) {
    dynamicColliders.push(
      {
        min: [-halfLength, 0, -halfWidth],
        max: [halfLength, floorLevel, halfWidth],
        surface: "wood",
      },
      {
        min: [-halfLength, height - 0.09, -halfWidth],
        max: [halfLength, height, halfWidth],
        surface: "metal",
      },
      {
        min: [-halfLength, 0, -halfWidth],
        max: [halfLength, height, -halfWidth + 0.07],
        surface: "metal",
      },
      {
        min: [-halfLength, 0, halfWidth - 0.07],
        max: [halfLength, height, halfWidth],
        surface: "metal",
      },
      {
        min: [-halfLength, 0, -halfWidth],
        max: [-halfLength + 0.07, height, halfWidth],
        surface: "metal",
      },
    );
  } else {
    dynamicColliders.push({
      min: [-halfLength, 0, -halfWidth],
      max: [halfLength, height, halfWidth],
      surface: "metal",
    });
  }

  return { parts: assembler.parts(), colliders: dynamicColliders };
}

/**
 * 集装箱道具总装构建入口
 */
function buildContainerMesh(engineCtx, type, options = {}) {
  const spec = CONTAINER_SPECS[type];
  const seed = options.seed === undefined ? 0 : Math.abs(Math.floor(options.seed));
  const colorIdx = seed % 6;
  const colorName =
    options.color ||
    ["red", "blue", "green", "yellow", "orange", "white", "grey", "teal"][colorIdx] ||
    spec.def;
  const matName = "paint_" + colorName;
  const doorRatio = clamp(options.doors !== undefined ? +options.doors : 0, 0, 1);
  const wear = clamp(options.wear !== undefined ? +options.wear : 0.4, 0, 1);

  const cacheKey = `c_${type}_${seed}_${doorRatio.toFixed(2)}_${wear.toFixed(2)}`;
  let cached = prototypeCache.get(cacheKey);
  if (!cached) {
    cached = generateContainerGeometry(engineCtx, type, seed, doorRatio, wear);
    prototypeCache.set(cacheKey, cached);
  }

  const grp = new THREE.Group();
  for (const part of cached.parts) {
    let meshMat = part.mat;
    if (part.mat.body) {
      meshMat = engineCtx.mats.get(matName, { vertexColors: true, doubleSide: true });
    }
    const mesh = new THREE.Mesh(part.geo, meshMat);
    mesh.castShadow = part.cast;
    mesh.receiveShadow = true;
    grp.add(mesh);
  }

  grp.userData.size = [PROP_SIZES[type][0], PROP_SIZES[type][1], PROP_SIZES[type][2]];
  grp.userData.colliders = cached.colliders;
  grp.name = type;
  return grp;
}

// ============================================================================
// 七、 港区重工业基础设施道具构建器 (Port Infrastructure Builders)
// ============================================================================

/**
 * 新泽西水泥防撞隔离墩 (Jersey Concrete Barrier)
 */

export { CONTAINER_SPECS, generateContainerGeometry, buildContainerMesh };

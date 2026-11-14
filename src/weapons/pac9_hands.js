// @ts-check
/**
 * @file src/weapons/pac9_hands.js
 * @description 第一人称战术手套、手指关节护甲与作战服袖口程序化建模
 */

import * as THREE from "three";
import { mergeGeometriesClean } from "../geo.js";

const COL_GLOVE_TOP = [31, 21.5, 12.5];
const COL_GLOVE_PAD = [5.6, 5.3, 5];
const COL_KNUCKLE_ARMOR = [3.2, 3.1, 3];
const COL_GLOVE_PALM = [12.5, 10, 7.6];
const COL_GLOVE_SIDE = [16, 11, 6.6];
const COL_GLOVE_EDGE = [3, 2.6, 2.2];
const COL_GLOVE_STITCH = [36, 27, 16];
const COL_CUFF_BASE = [20, 14, 8.4];
const COL_CUFF_STRAP = [4.8, 4.5, 4.2];
const COL_PULL_TAB = [30, 9.5, 2.2];
const COL_SLEEVE_FABRIC = [5, 6.9, 9];
const COL_SLEEVE_STRIPE_A = [30, 9.5, 2.2];
const COL_SLEEVE_STRIPE_B = [26, 26, 25];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothStep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const signedPow = (v, exp) => Math.sign(v) * Math.pow(Math.abs(v), exp);
const hash1D = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const tempVec = new THREE.Vector3();
const FORWARD_NEG_Z = new THREE.Vector3(0, 0, -1);

class RingTubeBuilder {
  constructor(ringSegments) {
    this.ringSegments = ringSegments;
    this.positions = [];
    this.colors = [];
    this.weldRings = [];
  }

  pushVertex(pos, color, shade = 1) {
    this.positions.push(pos.x, pos.y, pos.z);
    this.colors.push(color[0] * shade, color[1] * shade, color[2] * shade);
  }

  ringCount() {
    return this.positions.length / 3 / this.ringSegments;
  }

  markWeld() {
    this.weldRings.push(this.ringCount() - 1);
  }

  buildGeometry(flipWinding = false) {
    const segs = this.ringSegments;
    const rings = this.ringCount();
    const indices = [];

    for (let r = 0; r < rings - 1; r++) {
      for (let s = 0; s < segs; s++) {
        const a = r * segs + s;
        const b = r * segs + ((s + 1) % segs);
        const c = a + segs;
        const d = b + segs;
        if (flipWinding) indices.push(a, b, c, b, d, c);
        else indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
    geo.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(new Float32Array((this.positions.length / 3) * 2), 2),
    );
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const normAttr = geo.attributes.normal;
    for (const r of this.weldRings) {
      let nx = 0;
      let ny = 0;
      let nz = 0;
      for (let s = 0; s < segs; s++) {
        nx += normAttr.getX(r * segs + s);
        ny += normAttr.getY(r * segs + s);
        nz += normAttr.getZ(r * segs + s);
      }
      const len = Math.hypot(nx, ny, nz) || 1;
      for (let s = 0; s < segs; s++) {
        normAttr.setXYZ(r * segs + s, nx / len, ny / len, nz / len);
      }
    }
    return geo;
  }
}

function buildGridSurface(uSteps, vSteps, evalPointFn) {
  const positions = [];
  const colors = [];
  const indices = [];
  const nu = uSteps.length;
  const nv = vSteps.length;

  for (let iv = 0; iv < nv; iv++) {
    for (let iu = 0; iu < nu; iu++) {
      const col = evalPointFn(uSteps[iu], vSteps[iv], tempVec);
      positions.push(tempVec.x, tempVec.y, tempVec.z);
      colors.push(col[0], col[1], col[2]);
    }
  }

  for (let iv = 0; iv < nv - 1; iv++) {
    for (let iu = 0; iu < nu - 1; iu++) {
      const a = iv * nu + iu;
      const b = a + 1;
      const c = a + nu;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(new Float32Array((positions.length / 3) * 2), 2),
  );
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const PATCH_SAMPLES = [-1, -0.9, -0.5, 0, 0.5, 0.9, 1];
const patchEdgeWeight = (u) => (Math.abs(u) > 0.95 ? -1 : Math.abs(u) > 0.8 ? 0.82 : 1);

function buildRaisedPatch(
  cx,
  cz,
  halfW,
  halfD,
  thickness,
  colorOrFn,
  surfaceHeightFn,
  warpFn = null,
  isBottom = false,
  uSamples = PATCH_SAMPLES,
  vSamples = PATCH_SAMPLES,
) {
  return buildGridSurface(uSamples, vSamples, (u, v, out) => {
    const px = cx + u * halfW;
    const pz = cz + (isBottom ? v : -v) * halfD;
    const edgeW = Math.min(patchEdgeWeight(u), patchEdgeWeight(v));
    const py = surfaceHeightFn(px, pz) + (edgeW < 0 ? -0.0022 : thickness * edgeW);
    out.set(px, isBottom ? -py : py, pz);
    if (warpFn) warpFn(out);
    const col = typeof colorOrFn === "function" ? colorOrFn(u, v) : colorOrFn;
    const shade = edgeW < 0 ? 0.5 : edgeW < 1 ? 0.8 : 1;
    return [col[0] * shade, col[1] * shade, col[2] * shade];
  });
}

const FINGER_SPECS = [
  { base: [-0.031, 0, -0.094], len: [0.044, 0.026, 0.022], rad: [0.0096, 0.009, 0.0083, 0.0076] },
  {
    base: [-0.0105, 0.001, -0.099],
    len: [0.049, 0.03, 0.023],
    rad: [0.0097, 0.0091, 0.0084, 0.0077],
  },
  { base: [0.0105, 0, -0.095], len: [0.045, 0.028, 0.022], rad: [0.0094, 0.0088, 0.0081, 0.0074] },
  {
    base: [0.03, -0.002, -0.086],
    len: [0.035, 0.021, 0.02],
    rad: [0.0084, 0.0078, 0.0072, 0.0066],
  },
];

const FINGER_ANGLES = [
  12, 34, 44, 68, 90, 112, 136, 146, 168, 192, 220, 245, 270, 295, 320, 348,
].map((deg) => (deg * Math.PI) / 180);
const FINGER_RING_COUNT = FINGER_ANGLES.length;
const FINGER_PAD_OFFSET = 0.0012;
const JOINT_SLICE_FACTORS = [0.14, 0.22, 0.27, 0.73, 0.78, 0.88];
const DEFAULT_JOINT_BUMP = [0.1, 0.17, 0.1];

function buildFingerTube(spec) {
  const tube = new RingTubeBuilder(FINGER_RING_COUNT);
  const { base, qs, len, rad } = spec;
  const pads = spec.pads || [1, 1, 0];
  const patchJ = spec.patchJ ?? 1;
  const bump = spec.bump || DEFAULT_JOINT_BUMP;
  const tipW = spec.tipW || 1;
  const tipH = spec.tipH || 1;

  const jointOrigins = [];
  const segDirs = [];
  const curPos = base.clone();
  for (let m = 0; m < 3; m++) {
    jointOrigins.push(curPos.clone());
    segDirs.push(FORWARD_NEG_Z.clone().applyQuaternion(qs[m + 1]));
    curPos.addScaledVector(segDirs[m], len[m]);
  }

  const rootDir = FORWARD_NEG_Z.clone().applyQuaternion(qs[0]);
  const getPrevDir = (m) => (m ? segDirs[m - 1] : rootDir);
  const bisectPlanes = [0, 1, 2].map((m) =>
    new THREE.Vector3().addVectors(getPrevDir(m), segDirs[m]).normalize(),
  );
  const signedDistToPlane = (pt, j) =>
    (pt.x - jointOrigins[j].x) * bisectPlanes[j].x +
    (pt.y - jointOrigins[j].y) * bisectPlanes[j].y +
    (pt.z - jointOrigins[j].z) * bisectPlanes[j].z;

  const clampBeforePlane = (pt, j) => {
    const d = signedDistToPlane(pt, j);
    if (d > 0) pt.addScaledVector(getPrevDir(j), -d / getPrevDir(j).dot(bisectPlanes[j]));
  };
  const clampAfterPlane = (pt, j) => {
    const d = signedDistToPlane(pt, j);
    if (d < 0) pt.addScaledVector(segDirs[j], -d / segDirs[j].dot(bisectPlanes[j]));
  };

  const ringPt = new THREE.Vector3();
  const slerpQuat = new THREE.Quaternion();

  const emitRing = (quat, center, radius, opts) => {
    const kD = opts.kD || 1;
    const kP = opts.kP || 1;
    const ao = opts.ao || 1;

    for (let q = 0; q < FINGER_RING_COUNT; q++) {
      const cosA = Math.cos(FINGER_ANGLES[q]);
      const sinA = Math.sin(FINGER_ANGLES[q]);
      const isTopArc = q >= 1 && q <= 7;
      const isPadArc = q >= 2 && q <= 6;

      let rx = radius * cosA;
      let ry =
        sinA > 0
          ? radius * 0.96 * sinA * (isPadArc ? kD : 1 + (kD - 1) * 0.4)
          : radius * 0.98 * sinA * kP;
      if (opts.pad && isPadArc) {
        rx += cosA * FINGER_PAD_OFFSET;
        ry += sinA * FINGER_PAD_OFFSET;
      }
      rx *= opts.wx || 1;
      ry *= opts.wy || 1;

      ringPt.set(rx, ry, 0).applyQuaternion(quat).add(center);
      if (opts.a >= 0) clampBeforePlane(ringPt, opts.a);
      if (opts.b >= 0) clampAfterPlane(ringPt, opts.b);

      let col = isTopArc ? COL_GLOVE_TOP : q >= 10 && q <= 14 ? COL_GLOVE_PALM : COL_GLOVE_SIDE;
      let shade = ao;
      if (opts.pad && isPadArc) col = COL_GLOVE_PAD;
      else if (opts.patch && isPadArc) {
        col = COL_GLOVE_SIDE;
        shade *= 0.9;
      }
      if ((opts.pad && isTopArc && !isPadArc) || (opts.edge && isTopArc)) col = COL_GLOVE_EDGE;
      if (opts.saddle && q >= 8) {
        col = COL_GLOVE_PALM;
        shade *= 0.9;
      }
      if (opts.stitch && isTopArc) {
        col = COL_GLOVE_STITCH;
        shade *= 0.8;
      }
      if (q === 0 || q === 8 || q === 9 || q === 15) shade *= 0.72;
      if (q >= 9) shade *= opts.aoP || 1;

      tube.pushVertex(ringPt, col, shade);
    }
  };

  emitRing(
    qs[0],
    tempVec.copy(jointOrigins[0]).addScaledVector(rootDir, -(spec.rootBack || 0.012) - 0.002),
    1e-5,
    {
      a: 0,
      b: -1,
      ao: spec.rootAo || 0.5,
    },
  );
  tube.markWeld();
  emitRing(
    qs[0],
    tempVec.copy(jointOrigins[0]).addScaledVector(rootDir, -(spec.rootBack || 0.012)),
    rad[0] * (spec.rootK || 1),
    {
      a: 0,
      b: -1,
      ao: spec.rootAo || 0.5,
      saddle: spec.saddle,
    },
  );

  for (let m = 0; m < 3; m++) {
    for (let e = 0; e < 4; e++) {
      const w = e / 3;
      slerpQuat.slerpQuaternions(qs[m], qs[m + 1], w);
      emitRing(
        slerpQuat,
        tempVec
          .copy(jointOrigins[m])
          .addScaledVector(e < 2 ? getPrevDir(m) : segDirs[m], (e - 1.5) * 4e-4),
        rad[m],
        {
          a: w < 0.5 ? m : -1,
          b: w < 0.5 ? -1 : m,
          kD: 1 + bump[m] * (e === 0 || e === 3 ? 0.55 : 1),
          patch: m === patchJ,
          saddle: spec.saddle && m < 2,
          wx: m === 2 ? 1 + (tipW - 1) * 0.5 : 1,
          wy: m === 2 ? 1 + (tipH - 1) * 0.5 : 1,
          ao: m === 0 && !spec.rootAo ? 0.62 + 0.1 * e : 1,
          aoP: e === 1 || e === 2 ? 0.55 : 0.8,
        },
      );
    }

    if (m < 2) {
      for (let e = 0; e < JOINT_SLICE_FACTORS.length; e++) {
        const w = JOINT_SLICE_FACTORS[e];
        const rInterp = (rad[m] + (rad[m + 1] - rad[m]) * w) * (1 - 0.06 * Math.sin(Math.PI * w));
        emitRing(
          qs[m + 1],
          tempVec.copy(jointOrigins[m]).addScaledVector(segDirs[m], len[m] * w),
          rInterp,
          {
            a: m + 1,
            b: m,
            pad: pads[m] && (e === 2 || e === 3),
            edge: pads[m] && (e === 1 || e === 4),
            saddle: spec.saddle && m === 0,
            ao: m === 0 && !spec.rootAo ? 0.86 + 0.14 * smoothStep(0, 0.5, w) : 1,
          },
        );
      }
    } else {
      const tipR = rad[3];
      const capStart = len[2] - tipR;
      emitRing(
        qs[3],
        tempVec.copy(jointOrigins[2]).addScaledVector(segDirs[2], len[2] * 0.2),
        rad[2] * 0.97,
        {
          a: -1,
          b: 2,
          stitch: 1,
          wx: tipW,
          wy: tipH,
        },
      );
      emitRing(
        qs[3],
        tempVec.copy(jointOrigins[2]).addScaledVector(segDirs[2], len[2] * 0.42),
        (rad[2] + tipR) * 0.5,
        {
          a: -1,
          b: 2,
          kP: 1.08,
          wx: tipW,
          wy: tipH,
        },
      );
      for (const ang of [0, 0.6, 1.05, 1.36]) {
        emitRing(
          qs[3],
          tempVec
            .copy(jointOrigins[2])
            .addScaledVector(segDirs[2], capStart + tipR * 1.08 * Math.sin(ang)),
          tipR * Math.cos(ang),
          { a: -1, b: -1, kP: 1.06, wx: tipW, wy: tipH },
        );
      }
      emitRing(
        qs[3],
        tempVec.copy(jointOrigins[2]).addScaledVector(segDirs[2], capStart + tipR * 1.08),
        1e-5,
        {
          a: -1,
          b: -1,
        },
      );
      tube.markWeld();
    }
  }

  return tube.buildGeometry();
}

const rotY = (a) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
const rotX = (a) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a);

function buildArticulatedFinger(spec, curlAngles) {
  const qs = [rotY(curlAngles[3] || 0)];
  for (let i = 0; i < 3; i++) {
    qs.push(qs[i].clone().multiply(rotX(-curlAngles[i])));
  }
  return buildFingerTube({
    base: new THREE.Vector3(spec.base[0], spec.base[1], spec.base[2]),
    qs,
    len: spec.len,
    rad: spec.rad,
  });
}

function quatFromForwardAndUp(fwdDir, upHint) {
  const back = fwdDir.clone().negate();
  const right = new THREE.Vector3().crossVectors(upHint, back);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(back, right);
  return new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, up, back),
  );
}

function buildThumb(dirs) {
  const normDirs = dirs.map((d) => new THREE.Vector3(d[0], d[1], d[2]).normalize());
  const upHint = new THREE.Vector3(-0.72, 0.69, 0);
  const delta = normDirs[2].clone().sub(normDirs[0]);
  if (delta.length() > 0.12) upHint.multiplyScalar(0.25).addScaledVector(delta.normalize(), -1);
  const qs = normDirs.map((d) => quatFromForwardAndUp(d, upHint));
  qs.unshift(qs[0].clone());

  return buildFingerTube({
    base: new THREE.Vector3(-0.028, -0.007, -0.014),
    qs,
    len: [0.044, 0.031, 0.026],
    rad: [0.0165, 0.0118, 0.011, 0.01],
    pads: [0, 1, 0],
    patchJ: 2,
    bump: [0, 0.2, 0.2],
    tipW: 1.12,
    tipH: 0.86,
    saddle: 1,
    rootBack: 0.01,
    rootK: 0.72,
    rootAo: 0.9,
  });
}

const PALM_Z_START = 0.006;
const knuckleCurveZ = (x) => -0.0975 + 0.0125 * Math.pow((x + 0.008) / 0.04, 2);
const palmFrontZ = (x) => knuckleCurveZ(x) + 0.006;
const palmHalfWidth = (t) => 0.029 + 0.014 * smoothStep(0.05, 0.85, t);
const palmTopHeight = (t) => 0.0185 - 0.0065 * smoothStep(0.1, 1, t);
const palmBottomHeight = (t) =>
  0.0185 + 0.003 * Math.sin(Math.PI * clamp01(t * 1.6)) - 0.0055 * smoothStep(0.3, 1, t);

function evalPalmTopY(x, z) {
  const t = clamp01((PALM_Z_START - z) / (PALM_Z_START - palmFrontZ(x)));
  const u = Math.min(0.999, Math.abs(x / palmHalfWidth(t)));
  return palmTopHeight(t) * Math.pow(1 - Math.pow(u, 2.5), 0.4);
}

function evalPalmBottomY(x, z) {
  const t = clamp01((PALM_Z_START - z) / (PALM_Z_START - palmFrontZ(x)));
  const w = palmHalfWidth(t);
  const u = Math.min(0.999, Math.abs(x / w));
  return (
    palmBottomHeight(t) *
    Math.pow(1 - Math.pow(u, 2.5), 0.4) *
    (1 + 0.14 * Math.max(0, x / w) * Math.sin(Math.PI * t))
  );
}

function buildPalmMesh() {
  const tube = new RingTubeBuilder(24);
  const pt = new THREE.Vector3();
  const rings = [
    [0, 0, 1, 1],
    [0.1, 0, 1, 1],
    [0.22, 0, 1, 1],
    [0.36, 0, 1, 1],
    [0.5, 0, 1, 1],
    [0.64, 0, 1, 1],
    [0.77, 0, 1, 1],
    [0.89, 0, 1, 1],
    [1, 0, 1, 1],
    [1, -0.005, 0.8, 1],
    [1, -0.009, 0.45, 0.985],
    [1, -0.0105, 0.04, 0.97],
  ];

  for (const [t, dz, rScale, wScale] of rings) {
    const hw = palmHalfWidth(t) * wScale;
    const hTop = palmTopHeight(t) * rScale;
    const hBot = palmBottomHeight(t) * rScale;

    for (let s = 0; s < 24; s++) {
      const ang = ((s + 0.5) / 24) * Math.PI * 2;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const vx = hw * signedPow(cosA, 0.8);
      const vy =
        sinA >= 0
          ? hTop * signedPow(sinA, 0.8)
          : hBot * signedPow(sinA, 0.8) * (1 + 0.14 * Math.max(0, vx / hw) * Math.sin(Math.PI * t));
      pt.set(vx, vy, PALM_Z_START + (palmFrontZ(vx) - PALM_Z_START) * t + dz);

      let col = sinA > 0.3 ? COL_GLOVE_TOP : sinA < -0.3 ? COL_GLOVE_PALM : COL_GLOVE_SIDE;
      let shade = 1;
      if (t === 0.1 && sinA > 0.3) {
        col = COL_GLOVE_STITCH;
        shade = 0.75;
      }
      if (dz < 0) {
        col = COL_GLOVE_SIDE;
        shade = 0.7 + dz * 30;
      }
      if (sinA < -0.3) shade *= 0.82 + 0.18 * Math.abs(cosA);
      tube.pushVertex(pt, col, shade);
    }
  }
  return tube.buildGeometry();
}

function buildThumbWebMesh(thumbBaseDir) {
  const tube = new RingTubeBuilder(12);
  const pt = new THREE.Vector3();
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const perp = new THREE.Vector3();
  const upHint = new THREE.Vector3(thumbBaseDir.x, thumbBaseDir.y, thumbBaseDir.z - 1).normalize();
  const steps = [-0.12, 0, 0.2, 0.4, 0.6, 0.78, 0.9];

  for (let i = 0; i < steps.length; i++) {
    const t = steps[i];
    const isEnd = i === 0 || i === steps.length - 1;
    pA.set(-0.028, -0.007, -0.014).addScaledVector(thumbBaseDir, 0.044 * t);
    pB.set(-0.03, -0.003, -0.022 - 0.06 * t);
    dir.subVectors(pA, pB);
    const halfLen = dir.length() * 0.5 + 0.005;
    dir.normalize();
    perp.crossVectors(dir, upHint).normalize();
    const ry = isEnd ? 1e-5 : 0.0085 * (1 - 0.55 * t);
    const rx = isEnd ? 1e-5 : halfLen * (1 - 0.3 * t * t);

    for (let s = 0; s < 12; s++) {
      const ang = ((s + 0.5) / 12) * Math.PI * 2;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      pt.copy(pA)
        .add(pB)
        .multiplyScalar(0.5)
        .addScaledVector(dir, cosA * rx)
        .addScaledVector(perp, sinA * ry);
      const isBottom = perp.y * sinA < 0;
      tube.pushVertex(pt, isBottom ? COL_GLOVE_PALM : COL_GLOVE_TOP, isBottom ? 0.85 : 0.92);
    }
    if (isEnd) tube.markWeld();
  }

  const geo = tube.buildGeometry();
  const posAttr = geo.attributes.position;
  const idx = geo.index.array;
  let signedVol = 0;
  for (let i = 0; i < idx.length; i += 3) {
    pA.fromBufferAttribute(posAttr, idx[i]);
    pB.fromBufferAttribute(posAttr, idx[i + 1]);
    pt.fromBufferAttribute(posAttr, idx[i + 2]);
    signedVol += pA.dot(pB.cross(pt));
  }
  if (signedVol < 0) {
    for (let i = 0; i < idx.length; i += 3) {
      const tmp = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = tmp;
    }
    geo.computeVertexNormals();
  }
  return geo;
}

function mirrorGeometryX(geo) {
  geo.scale(-1, 1, 1);
  if (!geo.index) {
    const count = geo.attributes.position.count;
    const arr = new Uint32Array(count);
    for (let i = 0; i < count; i++) arr[i] = i;
    geo.setIndex(new THREE.BufferAttribute(arr, 1));
  }
  const idx = geo.index.array;
  for (let i = 0; i < idx.length; i += 3) {
    const tmp = idx[i + 1];
    idx[i + 1] = idx[i + 2];
    idx[i + 2] = tmp;
  }
  return geo;
}

/**
 * 构建带战术护甲、手腕袖口与手指关节的第一人称手臂手套网格
 * @param {object} opts
 */
export function buildPac9HandsMesh(opts) {
  const parts = [];
  const debugParts = opts.debugParts || null;
  const addPart = (name, geo) => {
    parts.push(geo);
    if (debugParts) debugParts.push([name, geo]);
    return geo;
  };

  addPart("palm", buildPalmMesh());

  {
    const uList = [];
    for (let i = 0; i <= 30; i++) uList.push(-1 + i / 15);
    addPart(
      "guard",
      buildGridSurface(uList, [-1, -0.9, -0.5, 0, 0.5, 0.9, 1], (u, v, out) => {
        const px = -5e-4 + u * 0.0405;
        const pz = knuckleCurveZ(px) + 0.0045 - v * 0.011;
        const edgeW = Math.min(patchEdgeWeight(u), patchEdgeWeight(v));
        let bump = 0;
        for (let m = 0; m < 4; m++) {
          const d = (px - FINGER_SPECS[m].base[0]) / 0.0058;
          bump += (m === 3 ? 0.8 : 1) * Math.exp(-d * d);
        }
        bump = Math.min(1, bump) * (1 - 0.55 * v * v);
        out.set(
          px,
          evalPalmTopY(px, pz) +
            (edgeW < 0 ? (v > 0.95 ? -0.008 : -0.003) : (0.0016 + 0.006 * bump) * edgeW),
          pz,
        );
        const shade = edgeW < 0 ? 0.6 : 0.85 + 1.3 * bump;
        return [
          COL_KNUCKLE_ARMOR[0] * shade,
          COL_KNUCKLE_ARMOR[1] * shade,
          COL_KNUCKLE_ARMOR[2] * shade,
        ];
      }),
    );
  }

  for (let i = 0; i < 3; i++) {
    addPart(
      "bar",
      buildRaisedPatch(
        0.001,
        -0.034 - i * 0.015,
        0.023 + i * 0.0025,
        0.0052,
        0.0019,
        COL_GLOVE_PAD,
        evalPalmTopY,
      ),
    );
  }

  addPart(
    "seam",
    buildRaisedPatch(
      0,
      -0.0225,
      0.027,
      0.0013,
      9e-4,
      COL_GLOVE_STITCH.map((v) => v * 0.8),
      evalPalmTopY,
      null,
      false,
      PATCH_SAMPLES,
      [-1, 0, 1].map((v) => v * 0.9),
    ),
  );
  addPart(
    "heelPad",
    buildRaisedPatch(
      0.013,
      -0.03,
      0.0135,
      0.017,
      0.0017,
      COL_GLOVE_PAD,
      evalPalmBottomY,
      null,
      true,
    ),
  );

  const indexGeos = [];
  for (let i = 0; i < 4; i++) {
    if (i === 0 && opts.indexPoses) {
      for (const pose of opts.indexPoses)
        indexGeos.push(buildArticulatedFinger(FINGER_SPECS[0], pose));
      continue;
    }
    addPart("finger" + i, buildArticulatedFinger(FINGER_SPECS[i], opts.fingers[i]));
  }

  addPart("thumb", buildThumb(opts.thumb));
  addPart(
    "web",
    buildThumbWebMesh(
      new THREE.Vector3(opts.thumb[0][0], opts.thumb[0][1], opts.thumb[0][2]).normalize(),
    ),
  );

  const forearmDir = new THREE.Vector3(
    opts.forearm[0],
    opts.forearm[1],
    opts.forearm[2],
  ).normalize();
  const sleeveLen = opts.sleeve || 0.36;
  const wristPivotZ = 0.022;
  const forearmQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    forearmDir,
  );
  const identQuat = new THREE.Quaternion();
  const blendQuat = new THREE.Quaternion();
  const bendWrist = (pt) => {
    blendQuat.slerpQuaternions(identQuat, forearmQuat, smoothStep(0.002, 0.042, pt.z));
    pt.z -= wristPivotZ;
    pt.applyQuaternion(blendQuat);
    pt.z += wristPivotZ;
    return pt;
  };

  {
    const cuffTube = new RingTubeBuilder(24);
    const pt = new THREE.Vector3();
    /** @type {Array<[number, number, number[], number]>} */
    const cuffRings = [
      [-0.0085, -0.0015, COL_CUFF_STRAP, 0.6],
      [-0.009, 0.0022, COL_CUFF_STRAP, 1.3],
      [-0.006, 0.0026, COL_CUFF_STRAP, 1.3],
      [-0.0052, 0.002, COL_CUFF_BASE, 0.75],
      [0.004, 0.0014, COL_CUFF_BASE, 1],
      [0.011, 0.0016, COL_CUFF_BASE, 0.7],
      [0.0122, 0.003, COL_CUFF_STRAP, 1.2],
      [0.0305, 0.0032, COL_CUFF_STRAP, 1.2],
      [0.0317, 0.0018, COL_CUFF_BASE, 0.7],
      [0.04, 0.002, COL_CUFF_BASE, 1],
      [0.054, 0.0024, COL_CUFF_BASE, 1],
      [0.058, 0.0026, COL_GLOVE_STITCH, 0.7],
      [0.058, -0.004, COL_CUFF_BASE, 0.4],
    ];
    for (const [z, offsetR, col, shade] of cuffRings) {
      for (let s = 0; s < 24; s++) {
        const ang = ((s + 0.5) / 24) * Math.PI * 2;
        const sinA = Math.sin(ang);
        cuffTube.pushVertex(
          bendWrist(
            pt.set(
              (0.0296 + offsetR) * signedPow(Math.cos(ang), 0.8),
              (sinA >= 0 ? 0.0185 + offsetR : 0.0204 + offsetR) * signedPow(sinA, 0.8),
              z,
            ),
          ),
          col,
          shade,
        );
      }
    }
    addPart("cuff", cuffTube.buildGeometry(true));
  }

  addPart(
    "strapTab",
    buildRaisedPatch(
      0.009,
      0.0215,
      0.0135,
      0.0076,
      0.0017,
      (u) => (u > 0.55 ? COL_GLOVE_STITCH.map((v) => v * 0.75) : [9, 9, 9.6]),
      (x) => 0.0217 * Math.pow(1 - Math.pow(Math.min(0.999, Math.abs(x / 0.0328)), 2.5), 0.4),
      bendWrist,
    ),
  );
  addPart(
    "pullTab",
    buildRaisedPatch(
      0.003,
      0.004,
      0.0065,
      0.0115,
      0.0022,
      COL_PULL_TAB,
      () => 0.022,
      bendWrist,
      true,
    ),
  );

  {
    const angles = [];
    for (let z = 0; z < 24; z++) {
      angles.push(z * 15);
      if (z === 4 || z === 16) angles.push(z * 15 + 11.5);
      if (z === 5 || z === 17) angles.push(z * 15 + 3.5);
    }
    angles.sort((a, b) => a - b);
    const nAngles = angles.length;
    const seamIdxA = angles.indexOf(75);
    const seamIdxB = angles.indexOf(255);
    const sleeveTube = new RingTubeBuilder(nAngles);
    const pt = new THREE.Vector3();
    const maxZ = 0.04 + sleeveLen;

    const ringDefs = [
      [0.0415, 0],
      [0.04, 1],
      [0.044, 2],
      [0.049, 3],
      [0.055, 3],
      [0.061, 3],
      [0.0655, 4],
      [0.0685, 5],
    ];
    const bandZs = [0.1415, 0.143, 0.157, 0.1582, 0.1662, 0.1674, 0.181, 0.1825];
    const allZs = bandZs.slice();
    const zSteps = Math.ceil((maxZ - 0.074) / 0.0052);
    for (let i = 0; i <= zSteps; i++) {
      const z = 0.074 + ((maxZ - 0.074) * i) / zSteps;
      if (!bandZs.some((bz) => Math.abs(bz - z) < 0.0016)) allZs.push(z);
    }
    allZs.sort((a, b) => a - b);
    for (const z of allZs) ringDefs.push([z, 6]);

    let vertIdx = 0;
    for (const [z, kind] of ringDefs) {
      for (let i = 0; i < nAngles; i++) {
        const ang = (angles[i] * Math.PI) / 180;
        let rad = 0;
        let shade = 1;
        let col = COL_SLEEVE_FABRIC;

        if (kind === 0) {
          rad = 0.0292;
          shade = 0.4;
        } else if (kind === 1) {
          rad = 0.0372;
          shade = 1.15;
        } else if (kind === 2) {
          rad = 0.0377;
          shade = 1.1;
        } else if (kind === 3) {
          const w = Math.cos(ang * 12);
          rad = 0.0368 + 0.0012 * w;
          shade = 0.62 + 0.26 * w;
        } else if (kind === 4) {
          rad = 0.0356;
          shade = 0.55;
        } else if (kind === 5) {
          rad = 0.038;
          shade = 0.9;
        } else {
          const t = (z - 0.0685) / (maxZ - 0.0685);
          const creaseA = 0.0048 * Math.exp(-Math.pow((t - 0.13) / 0.11, 2));
          const creaseB = 0.0048 * smoothStep(0.62, 0.85, t);
          const waveA =
            Math.pow(
              Math.abs(
                Math.sin(
                  (Math.PI * z) / 0.027 + 1.7 * Math.sin(ang + 0.5) + 0.8 * Math.sin(2 * ang + 1.3),
                ),
              ),
              0.6,
            ) *
              2 -
            1.25;
          const waveB =
            Math.pow(
              Math.abs(
                Math.sin(
                  (Math.PI * z) / 0.034 + 1.9 * Math.sin(ang - 0.8) + 0.7 * Math.sin(2 * ang),
                ),
              ),
              0.6,
            ) *
              2 -
            1.25;
          const ripple =
            Math.sin(z * 40 + 2 * Math.sin(ang * 2 + 1)) + 0.6 * Math.sin(3 * ang + z * 25);
          rad =
            0.0405 +
            0.012 * Math.pow(t, 0.85) +
            0.0025 * Math.exp(-Math.pow((z - 0.082) / 0.012, 2)) +
            creaseA * waveA +
            creaseB * waveB +
            0.0016 * ripple;
          shade =
            0.78 +
            0.26 *
              smoothStep(
                -1.1,
                0.5,
                (creaseA * waveA + creaseB * waveB) / (creaseA + creaseB + 8e-4),
              ) +
            0.04 * ripple;
          const n = hash1D(vertIdx);
          if (z > 0.1575 && z < 0.167) {
            col = COL_SLEEVE_STRIPE_B;
            shade *= 0.85 + 0.25 * n;
          } else if (z > 0.1425 && z < 0.1815) {
            col = COL_SLEEVE_STRIPE_A;
            shade *= 0.78 + 0.3 * n;
          }
        }

        if (kind > 0) {
          if (i === seamIdxA || i === seamIdxB) {
            rad += 0.0019;
            shade *= 1.3;
          } else if (Math.abs(i - seamIdxA) === 1 || Math.abs(i - seamIdxB) === 1) {
            shade *= 0.52;
          }
        }
        pt.set(Math.cos(ang) * rad, Math.sin(ang) * rad * 0.84, z);
        sleeveTube.pushVertex(pt, col, shade);
        vertIdx++;
      }
    }
    for (let i = 0; i < nAngles; i++)
      sleeveTube.pushVertex(pt.set(0, 0, maxZ + 0.006), COL_SLEEVE_FABRIC, 0.3);
    sleeveTube.markWeld();

    const sleeveGeo = sleeveTube.buildGeometry(true);
    sleeveGeo.applyMatrix4(
      new THREE.Matrix4()
        .makeTranslation(0, 0, wristPivotZ)
        .multiply(new THREE.Matrix4().makeRotationFromQuaternion(forearmQuat))
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, -wristPivotZ)),
    );
    addPart("sleeve", sleeveGeo);
  }

  const result = {
    fabric: mergeGeometriesClean(parts),
    rubber: null,
    index: indexGeos.length ? indexGeos : null,
    knuckle: FINGER_SPECS[0].base.slice(),
  };

  if (opts.mirror) {
    mirrorGeometryX(result.fabric);
    if (result.index) result.index.forEach(mirrorGeometryX);
    result.knuckle[0] *= -1;
  }

  return result;
}

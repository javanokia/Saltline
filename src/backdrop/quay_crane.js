/**
 * @file src/backdrop/quay_crane.js
 * @description 几猫04号岸桥集装箱起重机 (Quay Crane "几猫04号") 52.6米高桁架、台车与集装箱吊具
 */

import * as THREE from "three";
import {
  vec3,
  toVec3,
  hashInt3D,
  valueNoise3D,
  createSeededRng,
  sampleWeatheringTint,
  getTintedMaterial,
  BackdropBatchBuilder,
  boxFromBounds,
  orientedCylinder,
  cylinderBetween,
  beamBetween,
  polylineCylinders,
  catenaryCurvePoints,
  placedPlane,
  addRailingSegments,
  createBeaconBlinkSystem,
  beaconOctahedron,
} from "./common.js";

var Bt = 18.5,
  is = 28.5,
  Di = 5.4,
  fv = 21.2,
  ai = 22.8,
  On = 1.8,
  wo = 12,
  Xi = 62,
  ks = 41,
  wn = [0.82, 0.95, 1.12],
  Ms = [0.6, 0.72, 0.86],
  En = [1, 0.95, 0.85],
  cl = [0.95, 0.96, 0.97];
function buildQuayCraneBogie(g, mats, colliders, R, I) {
  let se = R < 23.5 ? 1 : -1;
  for (let ae of [-1.12, 1.12]) {
    let k = I + ae;
    g(mats.paintYellow, boxFromBounds(R - 0.3, 0.36, k - 0.98, R + 0.3, 0.84, k + 0.98, 0.04), En);
    for (let ce of [-0.56, 0.56])
      (g(mats.steelDark, orientedCylinder(0.33, 0.33, 0.14, "x", R, 0.33, k + ce, 16)),
        g(mats.steelDark, orientedCylinder(0.37, 0.37, 0.025, "x", R - 0.085, 0.33, k + ce, 16)),
        g(mats.steelDark, orientedCylinder(0.37, 0.37, 0.025, "x", R + 0.085, 0.33, k + ce, 16)),
        g(mats.steelGalv, orientedCylinder(0.11, 0.11, 0.7, "x", R, 0.33, k + ce, 8)));
    (g(mats.steelDark, orientedCylinder(0.16, 0.16, 0.5, "z", R + se * 0.5, 0.6, k, 10)),
      g(
        mats.paintYellow,
        boxFromBounds(R + se * 0.3, 0.42, k - 0.56 - 0.16, R + se * 0.62, 0.8, k - 0.3, 0.03),
        En,
      ));
  }
  (g(mats.steelDark, boxFromBounds(R - 0.2, 0.1, I - 0.22, R + 0.2, 0.9, I + 0.22, 0.03)),
    g(mats.paintGrey, boxFromBounds(R - 0.34, 0.9, I - 1.8, R + 0.34, 1.42, I + 1.8, 0.05), wn));
  for (let ae of [-1.12, 0, 1.12])
    g(mats.steelGalv, orientedCylinder(0.14, 0.14, 0.8, "x", R, ae ? 1.08 : 1.22, I + ae, 10));
  g(mats.paintGrey, boxFromBounds(R - 0.54, 1.42, I - 0.54, R + 0.54, 1.6, I + 0.54, 0.03), Ms);
  for (let ae of [-1, 1]) {
    let k = I + ae * 2.1;
    (g(
      mats.paintYellow,
      boxFromBounds(R - 0.16, 0.44, k - 0.12, R + 0.16, 0.8, k + 0.12, 0.02),
      En,
    ),
      g(mats.steelGalv, orientedCylinder(0.08, 0.08, 0.34, "z", R, 0.62, k + ae * 0.28, 8)),
      g(mats.steelDark, orientedCylinder(0.17, 0.15, 0.12, "z", R, 0.62, k + ae * 0.5, 12)),
      g(
        mats.hazardStripes,
        boxFromBounds(R - 0.28, 0.04, k + ae * 0.13, R + 0.28, 0.4, k + ae * 0.16),
      ));
  }
  (colliders.push({ min: [R - 0.5, 0, I - 2.7], max: [R + 0.5, 1.5, I + 2.7] }),
    colliders.push({ min: [R - 0.62, 0, I - 0.62], max: [R + 0.62, 24, I + 0.62] }));
}

function buildQuayCraneAccessStairs(g, mats, colliders, batch) {
  let T = 6.15,
    D = 6.97,
    C = 7.8,
    G = [19.4, 20.6],
    j = [26.4, 27.6];
  function N(R, I, se, ae, k, ce) {
    let ve = ae - I,
      _e = Math.max(2, Math.round(ve / 0.21));
    for (let Te of [k + 0.03, ce - 0.03]) {
      (g(mats.steelGalv, beamBetween([R, I - 0.12, Te], [se, ae - 0.12, Te], 0.05, 0.24)),
        g(mats.paintYellow, cylinderBetween([R, I + 1, Te], [se, ae + 1, Te], 0.024, 5), En),
        g(mats.paintYellow, cylinderBetween([R, I + 0.5, Te], [se, ae + 0.5, Te], 0.018, 4), En));
      for (let Pe = 0; Pe <= 4; Pe++) {
        let Re = Pe / 4,
          Fe = R + (se - R) * Re,
          ze = I + ve * Re;
        g(mats.paintYellow, cylinderBetween([Fe, ze - 0.05, Te], [Fe, ze + 1, Te], 0.02, 4), En);
      }
    }
    for (let Te = 1; Te <= _e; Te++) {
      let Pe = (Te - 0.5) / _e,
        Re = R + (se - R) * Pe,
        Fe = I + ve * (Te / _e);
      g(mats.steelGalv, boxFromBounds(Re - 0.13, Fe - 0.03, k + 0.06, Re + 0.13, Fe, ce - 0.06));
    }
  }
  function Q(R, I, se, ae) {
    (g(mats.steelGalv, boxFromBounds(R, se - 0.05, T, I, se, C)),
      g(mats.steelGalv, boxFromBounds(R, se - 0.2, T, I, se - 0.05, T + 0.06)),
      g(mats.steelGalv, boxFromBounds(R, se - 0.2, C - 0.06, I, se - 0.05, C)));
    let k = ae > 0 ? I - 0.03 : R + 0.03,
      ce = ae > 0 ? R : I;
    addRailingSegments(
      batch,
      mats.paintYellow,
      [
        [ce, se, C - 0.03],
        [k, se, C - 0.03],
        [k, se, T + 0.03],
      ],
      { post: 0.9, tint: En },
    );
  }
  let K = [3.6, 6.9, 10.2, 13.5, 16.8, 20.1];
  for (let R = 0; R < 5; R++)
    R % 2 === 0
      ? (Q(G[0], G[1], K[R], -1), N(G[1], K[R], j[0], K[R + 1], T, D))
      : (Q(j[0], j[1], K[R], 1), N(j[0], K[R], G[1], K[R + 1], D, C));
  (Q(j[0], j[1], K[5], 1),
    N(j[0], K[5], 23.4, 21.9, D, C),
    g(mats.steelGalv, boxFromBounds(22.5, 21.85, On + 1.35, 23.4, 21.9, C)),
    addRailingSegments(
      batch,
      mats.paintYellow,
      [
        [22.53, 21.9, On + 1.4],
        [22.53, 21.9, C - 0.03],
        [23.37, 21.9, C - 0.03],
      ],
      { post: 1.3, tint: En },
    ),
    addRailingSegments(
      batch,
      mats.paintYellow,
      [
        [23.37, 21.9, On + 1.4],
        [23.37, 21.9, D],
      ],
      { post: 1.3, tint: En },
    ),
    g(mats.steelGalv, boxFromBounds(j[0], 13.45, 4.95, j[1], 13.5, T)));
  for (let R of [G[0], j[1]])
    for (let I of [T - 0.05, C + 0.05])
      g(mats.paintGrey, boxFromBounds(R - 0.07, 3.3, I - 0.07, R + 0.07, 21.4, I + 0.07), wn);
  for (let R = 0; R < K.length; R++) {
    let I = K[R] - 0.25;
    g(mats.paintGrey, boxFromBounds(G[0], I - 0.06, C + 0, j[1], I + 0.06, C + 0.1), Ms);
    for (let se of [G[0], j[1]])
      g(mats.paintGrey, boxFromBounds(se - 0.05, I - 0.06, 5.9, se + 0.05, I + 0.06, C + 0.1), Ms);
    if (R < K.length - 1) {
      let se = K[R + 1] - 0.25;
      (g(mats.paintGrey, cylinderBetween([G[0], I, C + 0.05], [j[1], se, C + 0.05], 0.03, 5), wn),
        g(mats.paintGrey, cylinderBetween([j[1], I, C + 0.05], [G[0], se, C + 0.05], 0.03, 5), wn));
    }
  }
  {
    let R = G[0] - 0.05,
      I = 7.35;
    for (let ae of [-0.22, 0.22])
      g(mats.steelGalv, cylinderBetween([R, 0.05, I + ae], [R, 4.75, I + ae], 0.022, 5));
    for (let ae = 0.3; ae < 4.7; ae += 0.3)
      g(mats.steelGalv, cylinderBetween([R, ae, I - 0.22], [R, ae, I + 0.22], 0.012, 4));
    let se = (ae) => {
      let k = [];
      for (let ce = 0; ce <= 8; ce++) {
        let ve = (Math.PI * ce) / 8;
        k.push(vec3(R - Math.sin(ve) * 0.7, ae, I - Math.cos(ve) * 0.36));
      }
      return k;
    };
    for (let ae = 2.3; ae <= 4.75; ae += 0.6)
      g(mats.steelGalv, polylineCylinders(se(ae), 0.012, 4));
    for (let ae = 1; ae < 8; ae += 1.5) {
      let k = (Math.PI * ae) / 8;
      g(
        mats.steelGalv,
        cylinderBetween(
          [R - Math.sin(k) * 0.7, 2.3, I - Math.cos(k) * 0.36],
          [R - Math.sin(k) * 0.7, 4.75, I - Math.cos(k) * 0.36],
          0.01,
          4,
        ),
      );
    }
    colliders.push({
      min: [R - 0.72, 0, I - 0.4],
      max: [R + 0.05, 4.7, I + 0.4],
      bulletOnly: !1,
    });
  }
}

function buildQuayCraneOperatorCab(g, mats, beaconMgr, batch, trolleyX, ieHelper) {
  let F = trolleyX + 0.25,
    X = trolleyX + 2.65,
    ne = 2.35,
    re = 4.4,
    $ = 18.3,
    ue = 20.7;
  for (let R of [F + 0.12, X - 0.3]) {
    g(mats.paintYellow, boxFromBounds(R - 0.12, 20.88, -1, R + 0.12, 21.16, re, 0.03), En);
    for (let I of [ne + 0.1, re - 0.1])
      g(mats.paintYellow, boxFromBounds(R - 0.06, ue, I - 0.06, R + 0.06, 20.9, I + 0.06), En);
  }
  (g(mats.paintWhite, boxFromBounds(F, $, ne, X, $ + 0.14, re, 0.03), cl),
    g(
      mats.paintWhite,
      boxFromBounds(F - 0.08, ue - 0.02, ne - 0.08, X + 0.12, ue + 0.12, re + 0.08, 0.03),
      cl,
    ),
    g(mats.paintWhite, boxFromBounds(F, $ + 0.14, ne, F + 0.08, ue, re), cl));
  for (let R of [ne, re - 0.06])
    (g(mats.paintWhite, boxFromBounds(F, $ + 0.14, R, X - 0.5, $ + 0.95, R + 0.06), cl),
      g(mats.glass, boxFromBounds(F + 0.08, $ + 0.95, R + 0.02, X - 0.06, ue, R + 0.04)),
      g(mats.glass, boxFromBounds(X - 0.5, $ + 0.14, R + 0.02, X - 0.06, $ + 0.95, R + 0.04)));
  for (let R of [X - 0.06])
    for (let I of [ne, re - 0.06, (ne + re) / 2 - 0.03])
      g(mats.paintWhite, boxFromBounds(R, $ + 0.14, I, R + 0.06, ue, I + 0.06), cl);
  (g(mats.glass, boxFromBounds(X - 0.04, $ + 0.14, ne + 0.06, X - 0.02, ue, re - 0.06)),
    g(mats.glass, boxFromBounds(X - 0.9, $ + 0.02, ne + 0.3, X - 0.1, $ + 0.04, re - 0.3)),
    g(mats.steelDark, boxFromBounds(F + 0.9, $ + 0.14, 3.1, F + 1.45, $ + 0.6, 3.65, 0.04)),
    g(mats.steelDark, boxFromBounds(F + 0.82, $ + 0.6, 3.1, F + 0.96, $ + 1.35, 3.65, 0.04)));
  for (let R of [2.75, 4])
    (g(
      mats.steelDark,
      boxFromBounds(F + 1.2, $ + 0.14, R - 0.16, F + 1.75, $ + 0.85, R + 0.16, 0.03),
    ),
      beaconMgr.add(
        boxFromBounds(F + 1.3, $ + 0.855, R - 0.1, F + 1.6, $ + 0.865, R + 0.1),
        [0.75, 0.5, 0.26],
        0,
      ));
  (beaconMgr.add(
    boxFromBounds(F + 0.5, ue - 0.045, 3, F + 1.5, ue - 0.03, 3.2),
    [0.75, 0.5, 0.26],
    0,
  ),
    ieHelper(X + 0.15, $ + 0.1, 3.37, 2, "z"),
    g(mats.steelGalv, boxFromBounds(F - 0.9, $ + 0.1, ne, F, $ + 0.14, re)),
    addRailingSegments(
      batch,
      mats.paintYellow,
      [
        [F, $ + 0.14, ne + 0.03],
        [F - 0.87, $ + 0.14, ne + 0.03],
        [F - 0.87, $ + 0.14, re - 0.03],
        [F, $ + 0.14, re - 0.03],
      ],
      { post: 1, tint: En },
    ));
}

function buildQuayCraneSpreader(mats, trolleyX) {
  let P = new BackdropBatchBuilder(),
    V = (R, I, se) => P.add(R, I, se),
    Y = 8.3;
  for (let R of [-0.9, 0.9])
    for (let I of [-0.8, 0.8])
      V(mats.steelDark, cylinderBetween([R, 0, I], [R * 0.8, -Y, I * 0.7], 0.022, 5));
  V(mats.paintYellow, boxFromBounds(-0.95, -Y - 0.55, -0.75, 0.95, -Y, 0.75, 0.05), En);
  for (let R of [-0.45, 0.45])
    V(mats.steelDark, orientedCylinder(0.3, 0.3, 0.12, "z", 0, -Y + 0.12, R, 12));
  let L = -Y - 0.55,
    Z = L - 0.34;
  for (let R of [-0.6, 0.6])
    V(mats.paintYellow, boxFromBounds(R - 0.16, Z, -6.02, R + 0.16, L, 6.02, 0.03), En);
  for (let R of [-5.92, 5.92])
    V(mats.paintYellow, boxFromBounds(-1.22, Z, R - 0.14, 1.22, L, R + 0.14, 0.03), En);
  V(mats.paintYellow, boxFromBounds(-0.9, Z - 0.02, -1.3, 0.9, L + 0.1, 1.3, 0.04), En);
  for (let R of [-1.2, 1.2])
    for (let I of [-6, 6])
      (V(mats.steelDark, boxFromBounds(R - 0.1, Z - 0.1, I - 0.1, R + 0.1, Z + 0.05, I + 0.1)),
        V(
          mats.paintYellow,
          beamBetween([R * 1.02, Z, I * 1.01], [R * 1.22, Z - 0.55, I * 1.04], 0.28, 0.03),
          En,
        ));
  let J = Z - 0.08,
    oe = J - 2.59,
    fe = [0.9, 0.82, 0.8];
  V(mats.paintRed, boxFromBounds(-1.2, oe, -6.08, 1.2, J, 6.08, 0.03), fe);
  for (let R of [-1.22, 1.22])
    for (let I = -5.7; I <= 5.71; I += 0.57)
      V(
        mats.paintRed,
        boxFromBounds(R - 0.02, oe + 0.16, I - 0.1, R + 0.02, J - 0.12, I + 0.1),
        fe,
      );
  for (let R of [-6.095, 6.095])
    for (let I of [-1.22, 1.22])
      V(
        mats.paintRed,
        boxFromBounds(I - 0.08, oe, R - 0.08, I + 0.08, J, R + 0.08),
        [0.7, 0.62, 0.6],
      );
  for (let R of [-0.8, -0.3, 0.3, 0.8])
    V(mats.steelDark, cylinderBetween([R, oe + 0.08, 6.1], [R, J - 0.08, 6.1], 0.02, 5));
  let le = P.build({ cast: !0, recv: !0 });
  le.position.set(trolleyX, 20.7, 0);
  le.userData.noMerge = !0;
  le.name = "crane-spreader";
  return { spreaderMesh: le, tris: P.tris };
}

/**
 * Builds the heavy container quay crane (STS Crane) positioned on the dockside.
 * Includes motorized bogies, portal legs, machinery house, operator cabin,
 * overhead boom girder, trolley track, and telescopic spreader.
 * @param {any} i Engine context
 * @param {any} e Beacon light manager
 * @param {object} [t] Optional configuration overrides (into, dz, mat)
 */
function buildQuayCrane(i, e, t = {}) {
  let n = !!t.into,
    s = t.dz || 0,
    o = t.into || new BackdropBatchBuilder(),
    r = n
      ? {
          add(R, I, se, ae, k) {
            (R.translate(0, 0, s), e.add(R, I, se, ae, k));
          },
        }
      : e,
    a = getTintedMaterial(i, "paint_grey"),
    l = getTintedMaterial(i, "paint_yellow"),
    c = getTintedMaterial(i, "paint_white"),
    u = getTintedMaterial(i, "paint_red"),
    h = i.mats.get("steel_galv"),
    f = i.mats.get("steel_dark"),
    p = i.mats.get("hazard_stripes"),
    d = i.mats.get("glass"),
    v = i.mats.emissive(16769716, 6),
    mats = {
      paintGrey: a,
      paintYellow: l,
      paintWhite: c,
      paintRed: u,
      steelGalv: h,
      steelDark: f,
      hazardStripes: p,
      glass: d,
      emissive: v,
    },
    g = (R, I, se) => o.add(R, I, se),
    x = [];
  if (n) {
    let R = new Map([
        [a.uuid, [0.2, 0.25, 0.31]],
        [l.uuid, [0.72, 0.52, 0.12]],
        [c.uuid, [0.78, 0.78, 0.76]],
        [u.uuid, [0.5, 0.14, 0.1]],
        [h.uuid, [0.5, 0.52, 0.54]],
        [f.uuid, [0.1, 0.1, 0.11]],
        [p.uuid, [0.7, 0.5, 0.1]],
      ]),
      I = t.mat;
    ((o.remap = (se, ae) => {
      let k = R.get(se.uuid);
      return k ? [I, ae ? [k[0] * ae[0], k[1] * ae[1], k[2] * ae[2]] : k] : null;
    }),
      (o.dz = s),
      (o.minSize = 2.6));
  }
  let b = [3.6, 7.6, 11.2, 12.5, 13.5, 17.2, 20.6, 23.8];
  for (let R of [Bt, is])
    for (let I of [-Di, Di]) {
      (buildQuayCraneBogie(g, mats, x, R, I),
        g(p, boxFromBounds(R - 0.6, 1.6, I - 0.6, R + 0.6, 3.6, I + 0.6, 0.04)));
      for (let se = 0; se < b.length - 1; se++)
        (g(a, boxFromBounds(R - 0.6, b[se], I - 0.6, R + 0.6, b[se + 1], I + 0.6, 0.05), wn),
          (se === 0 || se === 1 || se === 5) &&
            g(
              a,
              boxFromBounds(R - 0.64, b[se] - 0.05, I - 0.64, R + 0.64, b[se] + 0.05, I + 0.64),
              Ms,
            ));
    }
  let m = i.mats.decal("hazard_voltage");
  for (let R of [-Di, Di]) {
    let I = Bt - 0.6;
    (g(c, boxFromBounds(I - 0.035, 1.72, R - 0.36, I, 3.48, R + 0.36, 0.012), [0.62, 0.66, 0.7]),
      g(f, boxFromBounds(I - 0.05, 1.66, R - 0.42, I - 0.005, 1.72, R + 0.42)),
      g(f, boxFromBounds(I - 0.05, 3.48, R - 0.42, I - 0.005, 3.54, R + 0.42)),
      g(f, boxFromBounds(I - 0.05, 1.66, R - 0.42, I - 0.005, 3.54, R - 0.36)),
      g(f, boxFromBounds(I - 0.05, 1.66, R + 0.36, I - 0.005, 3.54, R + 0.42)),
      g(h, cylinderBetween([I - 0.08, 2.45, R + 0.26], [I - 0.08, 2.75, R + 0.26], 0.014, 5)));
    for (let se of [2, 3.2])
      g(f, boxFromBounds(I - 0.06, se - 0.07, R - 0.37, I - 0.03, se + 0.07, R - 0.33));
    (g(h, boxFromBounds(I - 0.3, 1.5, R - 0.4, I, 1.56, R + 0.4)),
      g(h, boxFromBounds(I - 0.3, 1, R - 0.4, I - 0.02, 1.05, R + 0.4)),
      g(m.material, placedPlane(0.3, 0.3, I - 0.04, 3.1, R, -Math.PI / 2)));
  }
  for (let R of [Bt, is]) {
    g(a, boxFromBounds(R - 0.45, 3.6, -Di + 0.6, R + 0.45, 4.6, Di - 0.6, 0.05), wn);
    for (let I of [-2.4, 0, 2.4])
      g(a, boxFromBounds(R - 0.48, 3.58, I - 0.03, R + 0.48, 4.62, I + 0.03), Ms);
  }
  (g(l, orientedCylinder(1.15, 1.15, 0.06, "x", Bt - 0.62, 5.85, -2.2, 24), En),
    g(l, orientedCylinder(1.15, 1.15, 0.06, "x", Bt - 1.02, 5.85, -2.2, 24), En),
    g(f, orientedCylinder(0.7, 0.7, 0.36, "x", Bt - 0.82, 5.85, -2.2, 20)),
    g(h, orientedCylinder(0.12, 0.12, 0.9, "x", Bt - 0.6, 5.85, -2.2, 8)),
    g(a, boxFromBounds(Bt - 0.5, 4.6, -2.5, Bt + 0.3, 5.9, -1.9, 0.03), Ms),
    g(f, cylinderBetween([Bt - 0.82, 4.75, -2.2 + 1], [Bt - 0.82, 0.02, -1.2 + 0.3], 0.035, 6)),
    g(h, boxFromBounds(Bt - 1, 0, -1.15, Bt - 0.64, 0.5, -0.65, 0.02)),
    x.push({ min: [Bt - 1, 0, -1.15], max: [Bt - 0.64, 0.5, -0.65] }),
    g(c, boxFromBounds(Bt - 0.42, 4.6, 1, Bt + 0.42, 6.3, 3.6, 0.03), cl));
  for (let R of [1.65, 2.3, 2.95])
    g(f, boxFromBounds(Bt - 0.44, 4.7, R - 0.01, Bt - 0.42, 6.2, R + 0.01));
  g(h, boxFromBounds(Bt - 0.47, 5.6, 1.2, Bt - 0.42, 6.1, 1.55));
  for (let R of [-Di, Di]) {
    g(a, boxFromBounds(Bt + 0.6, 12.5, R - 0.45, is - 0.6, 13.5, R + 0.45, 0.05), wn);
    for (let se of [21, 23.5, 26])
      g(a, boxFromBounds(se - 0.03, 12.48, R - 0.48, se + 0.03, 13.52, R + 0.48), Ms);
    let I = Math.sign(R);
    (g(a, beamBetween([Bt + 0.5, 9.6, R], [Bt + 3.4, 12.6, R], 0.4, 0.4, 0.03), wn),
      g(a, beamBetween([is - 0.5, 9.6, R], [is - 3.4, 12.6, R], 0.4, 0.4, 0.03), wn));
    for (let se of [Bt, is])
      g(a, beamBetween([se, 9.6, R - I * 0.5], [se, 12.6, R - I * 3.4], 0.4, 0.4, 0.03), wn);
    (g(a, cylinderBetween([is - 0.4, 13.7, R], [Bt + 0.4, 22.7, R], 0.2, 10), wn),
      g(a, cylinderBetween([Bt + 0.4, 13.7, R], [is - 0.4, 22.7, R], 0.2, 10), wn),
      g(a, boxFromBounds(23.5 - 0.5, 17.7, R - 0.24, 23.5 + 0.5, 18.7, R + 0.24, 0.03), Ms),
      g(a, boxFromBounds(Bt + 0.6, 22.95, R - 0.35, is - 0.6, 23.7, R + 0.35, 0.04), wn));
  }
  for (let R of [Bt, is]) {
    (g(a, boxFromBounds(R - 0.45, 12.5, -Di + 0.6, R + 0.45, 13.5, Di - 0.6, 0.05), wn),
      g(a, boxFromBounds(R - 0.45, 22.8, -Di + 0.6, R + 0.45, 23.8, Di - 0.6, 0.05), wn));
    for (let I of [-1, 1])
      g(a, beamBetween([R, 20.2, I * (Di - 0.5)], [R, 22.8, I * (On + 1.2)], 0.36, 0.36, 0.03), wn);
  }
  (g(h, boxFromBounds(Bt + 0.9, 13.5, 4.05, is - 0.9, 13.55, 4.95)),
    addRailingSegments(
      o,
      l,
      [
        [Bt + 0.9, 13.55, 4.08],
        [is - 0.9, 13.55, 4.08],
      ],
      { tint: En },
    ),
    g(h, boxFromBounds(Bt + 0.45, 13.45, -4.6, Bt + 1.25, 13.5, 4.05)),
    addRailingSegments(
      o,
      l,
      [
        [Bt + 1.22, 13.5, -4.6],
        [Bt + 1.22, 13.5, 4.05],
      ],
      { tint: En },
    ));
  let A = is + 1.3;
  for (let R of [-1, 1]) {
    let I = R * On,
      se = [wo, 15.4, Bt, 22, 25.2, is, A - 0.15, A + 0.15, 34.6, 39.2, 43.8, 48.4, 53, 57.6, Xi];
    for (let ce = 0; ce < se.length - 1; ce++)
      ce !== 6 &&
        (g(a, boxFromBounds(se[ce], fv, I - 0.45, se[ce + 1], ai, I + 0.45, 0.05), wn),
        ce > 0 &&
          ce !== 7 &&
          g(
            a,
            boxFromBounds(se[ce] - 0.035, fv - 0.05, I - 0.5, se[ce] + 0.035, ai + 0.05, I + 0.5),
            Ms,
          ));
    (g(a, boxFromBounds(A - 0.7, ai - 0.1, I - 0.52, A + 0.7, ai + 0.55, I - 0.4, 0.03), Ms),
      g(a, boxFromBounds(A - 0.7, ai - 0.1, I + 0.4, A + 0.7, ai + 0.55, I + 0.52, 0.03), Ms),
      g(h, orientedCylinder(0.16, 0.16, 1.2, "z", A, ai + 0.22, I, 12)),
      g(
        f,
        boxFromBounds(wo + 0.3, ai, I - R * 0.32 - 0.05, Xi - 0.3, ai + 0.09, I - R * 0.32 + 0.05),
      ));
    let ae = I + R * 0.45,
      k = I + R * 1.35;
    g(h, boxFromBounds(wo + 0.2, 21.86, Math.min(ae, k), Xi - 0.2, 21.9, Math.max(ae, k)));
    for (let ce = wo + 0.6; ce < Xi; ce += 2.45)
      (g(a, beamBetween([ce, 21.84, ae], [ce, 21.3, ae], 0.07, 0.07), Ms),
        g(a, beamBetween([ce, 21.82, k], [ce, 21.36, ae], 0.06, 0.08), Ms));
    (addRailingSegments(
      o,
      l,
      [
        [wo + 0.2, 21.9, k - R * 0.03],
        [Xi - 0.2, 21.9, k - R * 0.03],
      ],
      { post: 2.45, tint: En },
    ),
      g(
        l,
        boxFromBounds(wo + 0.2, 21.9, k - R * 0.03 - 0.008, Xi - 0.2, 22.02, k - R * 0.03 + 0.008),
        En,
      ));
    for (let ce of [44, 58])
      g(a, boxFromBounds(ce - 0.18, ai, I - 0.2, ce + 0.18, ai + 1.5, I + 0.2, 0.03), wn);
  }
  for (let R of [44, 58])
    g(a, boxFromBounds(R - 0.2, ai + 1.2, -On - 0.3, R + 0.2, ai + 1.6, On + 0.3, 0.04), wn);
  for (let R of [wo + 0.25, Xi - 0.25]) {
    g(a, boxFromBounds(R - 0.25, fv + 0.1, -On + 0.45, R + 0.25, ai - 0.1, On - 0.45, 0.05), wn);
    let I = R < 30 ? 1 : -1;
    for (let se of [-0.8, 0.8])
      g(f, orientedCylinder(0.14, 0.14, 0.4, "x", R + I * 0.45, 22, se, 10));
  }
  (g(h, boxFromBounds(Xi - 0.1, 21.86, -On - 1.35, Xi + 0.9, 21.9, On + 1.35)),
    addRailingSegments(
      o,
      l,
      [
        [Xi - 0.1, 21.9, -On - 1.32],
        [Xi + 0.87, 21.9, -On - 1.32],
        [Xi + 0.87, 21.9, On + 1.32],
        [Xi - 0.1, 21.9, On + 1.32],
      ],
      { post: 1.4, tint: En },
    ),
    g(h, cylinderBetween([Xi + 0.6, 21.9, 0], [Xi + 0.6, 25.2, 0], 0.035, 6)),
    g(h, cylinderBetween([Xi + 0.6, 24.8, -0.45], [Xi + 0.6, 24.8, 0.45], 0.015, 4)),
    r.add(beaconOctahedron(Xi + 0.6, 25.32, 0, 0.13), [9, 0.5, 0.25], 2.6, 0.5, 0.45),
    g(f, orientedCylinder(0.1, 0.12, 0.1, "y", Xi + 0.6, 25.2, 0, 8)));
  let _ = 27.6,
    M = 30,
    E = 1.5;
  for (let R of [-1, 1]) {
    (g(a, beamBetween([is, 23.8, R * Di], [_, M, R * E], 0.55, 0.55, 0.04), wn),
      g(a, beamBetween([Bt, 23.8, R * Di], [_, M, R * E], 0.5, 0.5, 0.04), wn));
    for (let [I, se] of [
      [44, 0.1],
      [58, 0.1],
    ]) {
      let ae = vec3(_ + 0.3, M, R * E),
        k = vec3(I, ai + 1.45, R * On);
      g(a, cylinderBetween(ae, k, se, 8), wn);
      let ce = ae.clone().lerp(k, 0.5);
      g(
        a,
        boxFromBounds(
          ce.x - 0.3,
          ce.y - 0.16,
          ce.z - 0.14,
          ce.x + 0.3,
          ce.y + 0.16,
          ce.z + 0.14,
          0.03,
        ),
        Ms,
      );
    }
    (g(f, cylinderBetween([_ + 0.2, M + 0.35, R * 0.9], [50, ai + 0.2, R * 1], 0.022, 5)),
      g(f, orientedCylinder(0.5, 0.5, 0.18, "z", _, M + 0.25, R * 0.9, 16)));
  }
  g(a, boxFromBounds(_ - 0.45, M - 0.35, -E - 0.5, _ + 0.45, M + 0.3, E + 0.5, 0.05), wn);
  {
    let R = (k, ce) => vec3(is + (_ - is) * k, 23.8 + (M - 23.8) * k, ce * (Di + (E - Di) * k)),
      I = (k, ce) => vec3(Bt + (_ - Bt) * k, 23.8 + (M - 23.8) * k, ce * (Di + (E - Di) * k));
    (g(a, beamBetween(R(0.5, -1), R(0.5, 1), 0.3, 0.3, 0.02), wn),
      g(a, beamBetween(I(0.55, -1), I(0.55, 1), 0.3, 0.3, 0.02), wn),
      g(a, cylinderBetween(I(0.55, -1), R(0.5, -1), 0.09, 6), wn),
      g(a, cylinderBetween(I(0.55, 1), R(0.5, 1), 0.09, 6), wn));
    let se = R(0.02, 1),
      ae = R(0.97, 1);
    for (let k of [-0.22, 0.22])
      g(h, cylinderBetween([se.x - 0.42, se.y, se.z + k], [ae.x - 0.42, ae.y, ae.z + k], 0.02, 4));
    for (let k = 0.03; k < 1; k += 0.045) {
      let ce = se.clone().lerp(ae, k);
      g(
        h,
        cylinderBetween(
          [ce.x - 0.42, ce.y, ce.z - 0.22],
          [ce.x - 0.42, ce.y, ce.z + 0.22],
          0.012,
          4,
        ),
      );
    }
  }
  g(a, boxFromBounds(wo + 0.05, ai, -3.6, wo + 0.55, ai + 0.4, 3.6, 0.04), wn);
  for (let R of [-1, 1])
    (g(
      a,
      boxFromBounds(wo + 0.08, ai + 0.4, R * 3.3 - 0.2, wo + 0.52, ai + 1, R * 3.3 + 0.2, 0.03),
      Ms,
    ),
      g(a, cylinderBetween([_ - 0.3, M, R * E], [wo + 0.3, ai + 0.8, R * 3.3], 0.1, 8), wn),
      g(h, orientedCylinder(0.12, 0.12, 0.6, "z", wo + 0.3, ai + 0.8, R * 3.3, 10)));
  (g(h, boxFromBounds(_ - 1, M + 0.3, -E - 0.6, _ + 1, M + 0.34, E + 0.6)),
    addRailingSegments(
      o,
      l,
      [
        [_ - 0.98, M + 0.34, -E - 0.58],
        [_ + 0.98, M + 0.34, -E - 0.58],
        [_ + 0.98, M + 0.34, E + 0.58],
        [_ - 0.98, M + 0.34, E + 0.58],
        [_ - 0.98, M + 0.34, -E - 0.58],
      ],
      { post: 1.2, tint: En },
    ),
    g(h, cylinderBetween([_, M + 0.34, 0], [_, M + 2, 0], 0.045, 6)),
    g(h, cylinderBetween([_, M + 2, 0], [_, M + 3.6, 0], 0.016, 4)),
    g(h, cylinderBetween([_ - 0.5, M + 1.5, 0], [_ + 0.5, M + 1.5, 0], 0.018, 4)));
  for (let R of [-0.5, 0.5])
    (g(f, orientedCylinder(0.1, 0.12, 0.1, "y", _ + R, M + 1.56, 0, 8)),
      r.add(beaconOctahedron(_ + R, M + 1.72, 0, 0.15), [10, 0.5, 0.25], 2.6, 0, 0.45));
  let w = 20.4,
    S = 27.9,
    z = ai,
    H = 26,
    O = 2.9;
  (g(c, boxFromBounds(w, z, -O, S, H, O, 0.06), cl),
    g(a, boxFromBounds(w - 0.15, z - 0.12, -O - 0.15, S + 0.15, z + 0.1, O + 0.15, 0.03), Ms),
    g(h, boxFromBounds(w - 0.2, H, -O - 0.2, S + 0.2, H + 0.12, O + 0.2, 0.03)));
  for (let R = w + 1.3; R < S; R += 1.3)
    for (let I of [-1, 1])
      g(
        c,
        boxFromBounds(R - 0.02, z + 0.1, I * O - 0.015, R + 0.02, H, I * O + 0.015),
        [0.7, 0.72, 0.74],
      );
  function q(R, I, se, ae, k, ce) {
    let ve = [boxFromBounds(-ae / 2, -k / 2, 0, ae / 2, k / 2, 0.02)],
      _e = Math.round(k / 0.12);
    for (let Te = 0; Te < _e; Te++) {
      let Pe = boxFromBounds(-ae / 2 + 0.03, -0.012, 0, ae / 2 - 0.03, 0.012, 0.11);
      (Pe.rotateX(0.7), Pe.translate(0, -k / 2 + (Te + 0.5) * (k / _e), 0.03), ve.push(Pe));
    }
    for (let Te of ve) (Te.rotateY(ce), Te.translate(R, I, se));
    (g(f, ve.shift()), g(h, ve));
  }
  for (let R of [-1, 1])
    for (let I of [w + 1.4, w + 3.9, w + 6.1])
      q(I, 24.5, R * (O + 0.005), 1.5, 1.3, R > 0 ? 0 : Math.PI);
  (q(w - 0.005, 23.75, -1.9, 1.4, 1.1, -Math.PI / 2),
    g(c, boxFromBounds(w - 0.03, z + 0.15, 0.8, w, z + 2.15, 1.7, 0.01), [0.6, 0.64, 0.68]),
    g(h, cylinderBetween([w - 0.06, z + 1, 1.55], [w - 0.06, z + 1.3, 1.55], 0.014, 5)),
    g(h, boxFromBounds(w - 0.9, z + 0.05, 0.3, w, z + 0.1, 2.2)),
    addRailingSegments(
      o,
      l,
      [
        [w, z + 0.1, 0.32],
        [w - 0.88, z + 0.1, 0.32],
        [w - 0.88, z + 0.1, 2.18],
        [w, z + 0.1, 2.18],
      ],
      { post: 1, tint: En },
    ));
  let U = i.mats.decal("logo_a");
  (g(
    U.material,
    placedPlane(1.1 * Math.min(3, U.aspect || 1), 1.1, w - 0.012, 25.2, 0, -Math.PI / 2),
  ),
    addRailingSegments(
      o,
      l,
      [
        [w, H + 0.12, -O],
        [S, H + 0.12, -O],
        [S, H + 0.12, O],
        [w, H + 0.12, O],
        [w, H + 0.12, -O],
      ],
      { post: 1.95, tint: En },
    ));
  for (let R of [w + 1.9, w + 5.6])
    (g(h, orientedCylinder(0.28, 0.28, 0.5, "y", R, H + 0.37, -1.2, 10)),
      g(h, orientedCylinder(0.1, 0.5, 0.22, "y", R, H + 0.72, -1.2, 10)));
  (g(f, orientedCylinder(0.13, 0.13, 1.6, "y", w + 3.7, H + 0.9, 1.9, 8)),
    g(f, orientedCylinder(0.2, 0.14, 0.2, "y", w + 3.7, H + 1.75, 1.9, 8)),
    g(c, boxFromBounds(w + 5.4, H + 0.12, 0.4, w + 6.7, H + 0.85, 1.8, 0.03), [0.7, 0.72, 0.75]),
    g(h, cylinderBetween([w + 0.3, H + 0.12, 2.5], [w + 0.3, H + 1.9, 2.5], 0.03, 5)),
    r.add(beaconOctahedron(w + 0.3, H + 2.02, 2.5, 0.13), [9, 0.5, 0.25], 2.6, 0.25, 0.45));

  buildQuayCraneAccessStairs(g, mats, x, o);

  g(f, boxFromBounds(13, 21.02, -On - 0.95, ks - 1.2, 21.12, -On - 0.85));
  for (let R = 13.5; R < ks - 1.2; R += 3.3)
    g(f, boxFromBounds(R - 0.03, 21.1, -On - 0.93, R + 0.03, 21.86, -On - 0.87));
  {
    let se = (ks - 1.6 - 13.6) / 15;
    for (let ae = 0; ae < 15; ae++) {
      let k = 13.6 + ae * se,
        ce = 1.1 + 0.25 * Math.sin(ae * 2.1);
      g(f, boxFromBounds(k - 0.1, 20.9, -On - 0.98, k + 0.1, 21.02, -On - 0.82));
      for (let ve of [-0.05, 0.05]) {
        let _e = [];
        for (let Te = 0; Te <= 7; Te++) {
          let Pe = Te / 7;
          _e.push(vec3(k + se * Pe, 20.92 - ce * (1 - (2 * Pe - 1) ** 2), -On - 0.9 + ve));
        }
        g(f, polylineCylinders(_e, 0.03, 4));
      }
    }
  }
  function ie(R, I, se, ae, k = "z") {
    let ce = ae * 0.46;
    k === "z"
      ? g(f, boxFromBounds(R - 0.03, I, se - ce / 2, R + 0.03, I + 0.06, se + ce / 2))
      : g(f, boxFromBounds(R - ce / 2, I, se - 0.03, R + ce / 2, I + 0.06, se + 0.03));
    for (let ve = 0; ve < ae; ve++) {
      let _e = (ve - (ae - 1) / 2) * 0.46,
        Te = k === "z" ? R : R + _e,
        Pe = k === "z" ? se + _e : se;
      (g(f, boxFromBounds(Te - 0.17, I - 0.2, Pe - 0.17, Te + 0.17, I, Pe + 0.17, 0.02)),
        g(v, boxFromBounds(Te - 0.14, I - 0.215, Pe - 0.14, Te + 0.14, I - 0.2, Pe + 0.14)));
    }
  }
  for (let R of [33, 47.5, 59.5]) for (let I of [-1, 1]) ie(R, 21.3, I * (On + 1.3), 3, "x");
  for (let R of [-1, 1])
    (ie(23.5, 12.28, R * (Di - 0.2), 4, "x"), ie(15, 21.3, R * (On + 1.3), 2, "x"));
  (ie(is + 0.1, 12.28, 0, 3, "z"),
    ie(Bt - 0.1, 12.28, 0, 3, "z"),
    ie(_ + 0.6, M - 0.55, 0, 3, "z"),
    g(l, boxFromBounds(ks - 2.3, 21.35, -1.25, ks + 2.3, 22.2, 1.25, 0.06), En),
    g(l, boxFromBounds(ks - 1.6, 20.7, -1.1, ks + 1.6, 21.35, 1.1, 0.05), En));
  for (let R of [-1.8, 1.8])
    for (let I of [-1, 1])
      (g(f, orientedCylinder(0.24, 0.24, 0.16, "z", ks + R, 22.42, I * 1.3, 12)),
        g(
          l,
          boxFromBounds(
            ks + R - 0.35,
            22.1,
            I * 1.3 - 0.14,
            ks + R + 0.35,
            22.5,
            I * 1.3 + 0.14,
            0.03,
          ),
          En,
        ));
  (g(f, orientedCylinder(0.42, 0.42, 1.5, "z", ks - 0.9, 22.35, 0, 14)),
    g(f, orientedCylinder(0.42, 0.42, 1.5, "z", ks + 0.9, 22.35, 0, 14)));

  buildQuayCraneOperatorCab(g, mats, r, o, ks, ie);

  let me = i.mats.label("SALTLINE 04", {
      color: "white",
      font: "stencil",
      distress: 0.35,
    }),
    ee = Math.max(1, me.aspect || 6);
  {
    let R = Math.min(1.15, 8.6 / ee);
    for (let I of [-1, 1])
      g(me.material, placedPlane(R * ee, R, 36.9, 22, I * (On + 0.453), I > 0 ? 0 : Math.PI));
  }
  {
    let R = Math.min(0.86, 9.4 / ee);
    g(me.material, placedPlane(R * ee, R, Bt - 0.453, 13, 0, -Math.PI / 2));
  }
  if (n) return ((o.remap = null), (o.dz = 0), (o.minSize = 0), null);
  let B = o.build({ cast: !0, recv: !0 });
  B.name = "crane";

  let { spreaderMesh: le, tris: spreaderTris } = buildQuayCraneSpreader(mats, ks);
  B.add(le);
  return { root: B, spreader: le, colliders: x, tris: o.tris + spreaderTris };
}
/**
 * Builds a rail-mounted / rubber-tyred gantry crane (RMG/RTG) in the container yard.
 */

const z1 = buildQuayCrane;

export {
  buildQuayCraneBogie,
  buildQuayCraneAccessStairs,
  buildQuayCraneOperatorCab,
  buildQuayCraneSpreader,
  buildQuayCrane,
  z1,
};

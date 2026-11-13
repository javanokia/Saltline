/**
 * @file src/backdrop/patrol_boat.js
 * @description 深V型巡逻撤离快艇 (Patrol Rescue Craft) 充气气囊、玻璃钢艇底与双发外挂机
 */

import {
  THREE,
  W,
  Ve,
  wt,
  Qe,
  Lt,
  Ye,
  on,
  nt,
  et,
  He,
  Ci,
  rn,
  U0,
  Na,
  Kr,
  Jr,
  Nn,
  Sn,
  _t,
  al,
  hb,
  gR,
  ub,
  I1,
  t0,
  rl,
  uv,
  hv,
  so,
  io,
  Ee,
  xt,
  Ke,
  jt,
  kr,
  ua,
  ll,
  ns,
  pb,
  Bn,
} from "./common.js";

function buildPatrolBoat(i, e) {
  let t = new io(),
    n = so(i, "plastic_grey"),
    s = so(i, "paint_orange"),
    o = i.mats.get("polymer_black"),
    r = i.mats.get("steel_galv"),
    a = i.mats.get("glass"),
    l = (U, T, D) => t.add(U, T, D),
    c = [2, 2.02, 2.08],
    u = [0.5, 0.5, 0.52],
    h = [1.9, 1.7, 1.2],
    f = [
      [-3.35, 0.5, 1.03],
      [-1.6, 0.5, 1.06],
      [0.5, 0.52, 1.05],
      [1.8, 0.58, 0.93],
      [2.75, 0.68, 0.6],
      [3.3, 0.78, 0.22],
    ],
    p = [
      ...f.map((U) => _t(U[0], U[1], U[2])),
      _t(3.43, 0.8, 0),
      ...f
        .slice()
        .reverse()
        .map((U) => _t(U[0], U[1], -U[2])),
    ],
    d = new Jr(p, !1, "centripetal"),
    v = new Kr(d, 60, 0.27, 12, !1);
  {
    let U = v.attributes.uv,
      T = d.getLength();
    for (let D = 0; D < U.count; D++) U.setXY(D, U.getX(D) * T, U.getY(D) * 1.7);
  }
  l(n, v, c);
  for (let U of [-1, 1]) l(n, xt(0.07, 0.27, 0.42, "x", -3.56, 0.5, U * 1.03, 12), c);
  let g = 11,
    x = [];
  for (let U = 0; U < g; U++) {
    let T = 0.04 + (0.92 * U) / (g - 1),
      D = d.getPointAt(T),
      C = d.getTangentAt(T),
      G = new Ci(0.276, 0.016, 5, 14);
    (G.applyQuaternion(new Lt().setFromUnitVectors(_t(0, 0, 1), C)),
      G.translate(D.x, D.y, D.z),
      l(n, G, u));
    let j = _t(D.x, 0, D.z)
      .sub(_t(Math.min(D.x, 2.2), 0, 0))
      .normalize();
    x.push(
      D.clone()
        .addScaledVector(j, 0.2)
        .add(_t(0, 0.2, 0)),
    );
  }
  for (let U = 0; U < g - 1; U++) l(n, kr(ua(x[U], x[U + 1], 0.1, 4), 0.012, 4), h);
  let y = [-3.4, -2, -0.5, 1, 2, 2.8, 3.3],
    b = [0.9, 0.93, 0.93, 0.85, 0.62, 0.34, 0.08],
    m = [0.22, 0.22, 0.24, 0.3, 0.42, 0.56, 0.7],
    A = [-0.3, -0.32, -0.33, -0.3, -0.15, 0.15, 0.62],
    _ = [],
    M = (U, T, D) => {
      let C = T.clone().sub(U).cross(D.clone().sub(U)),
        G = U.clone()
          .add(T)
          .add(D)
          .multiplyScalar(1 / 3),
        j = _t(0, G.y - 0.45, G.z);
      (Math.abs(G.x) > 3.39 && j.set(G.x, 0, 0),
        C.dot(j) < 0
          ? _.push(U.x, U.y, U.z, D.x, D.y, D.z, T.x, T.y, T.z)
          : _.push(U.x, U.y, U.z, T.x, T.y, T.z, D.x, D.y, D.z));
    };
  for (let U of [-1, 1]) {
    for (let T = 0; T < y.length - 1; T++) {
      let D = _t(y[T], A[T], 0),
        C = _t(y[T + 1], A[T + 1], 0),
        G = _t(y[T], m[T], U * b[T]),
        j = _t(y[T + 1], m[T + 1], U * b[T + 1]),
        N = _t(y[T], 0.5 + Math.max(0, m[T] - 0.22) * 0.6, U * (b[T] + 0.1)),
        Q = _t(y[T + 1], 0.5 + Math.max(0, m[T + 1] - 0.22) * 0.6, U * (b[T + 1] + 0.1));
      (M(D, C, j), M(D, j, G), M(G, j, Q), M(G, Q, N));
    }
    (M(_t(-3.4, A[0], 0), _t(-3.4, m[0], U * b[0]), _t(-3.4, 0.78, U * (b[0] + 0.1))),
      M(_t(-3.4, A[0], 0), _t(-3.4, 0.78, U * (b[0] + 0.1)), _t(-3.4, 0.78, 0)));
  }
  let E = new nt();
  (E.setAttribute("position", new He(_, 3)),
    E.computeVertexNormals(),
    l(o, E),
    l(n, Ee(-3.38, 0.2, -0.86, 2.1, 0.26, 0.86), u),
    l(n, Ee(2, 0.26, -0.62, 2.85, 0.56, 0.62, 0.05), u),
    l(o, Ee(-3.46, 0.1, -0.92, -3.34, 0.8, 0.92, 0.02)),
    l(r, Ke([3.2, 0.95, -0.12], [3.2, 0.95, 0.12], 0.02, 5)),
    l(r, Ke([3.2, 0.8, 0], [3.2, 0.95, 0], 0.018, 5)),
    l(s, Ee(0.3, 0.26, -0.4, 1, 1.12, 0.4, 0.05), [1, 0.9, 0.85]),
    l(o, jt([0.28, 1.14, 0], [0.86, 1.3, 0], 0.76, 0.05)));
  let w = Ee(-0.012, 0, -0.42, 0.012, 0.5, 0.42);
  (w.rotateZ(0.42), w.translate(0.95, 1.2, 0), l(a, w));
  for (let U of [-0.43, 0.43])
    l(
      r,
      Ke([0.95, 1.2, U], [0.95 - Math.sin(0.42) * 0.52, 1.2 + Math.cos(0.42) * 0.52, U], 0.016, 5),
    );
  l(
    r,
    Ke(
      [0.95 - Math.sin(0.42) * 0.52, 1.2 + Math.cos(0.42) * 0.52, -0.43],
      [0.95 - Math.sin(0.42) * 0.52, 1.2 + Math.cos(0.42) * 0.52, 0.43],
      0.016,
      5,
    ),
  );
  let S = new Ci(0.18, 0.017, 6, 18);
  (S.rotateY(Math.PI / 2),
    S.rotateZ(-0.5),
    S.translate(0.2, 1.12, -0.12),
    l(o, S),
    l(r, Ke([0.2, 1.12, -0.12], [0.36, 1.03, -0.12], 0.02, 5)));
  for (let U of [0, 2.1, 4.2])
    l(
      r,
      Ke(
        [0.2, 1.12, -0.12],
        [
          0.2 + Math.sin(-0.5) * Math.cos(U) * -0.17,
          1.12 + Math.cos(-0.5) * Math.cos(U) * 0.17,
          -0.12 + Math.sin(U) * 0.17,
        ],
        0.01,
        4,
      ),
    );
  (l(o, Ee(0.34, 1.16, 0.16, 0.5, 1.34, 0.3, 0.02)),
    l(r, Ke([0.42, 1.34, 0.23], [0.36, 1.48, 0.23], 0.012, 4)),
    l(r, Ke([0.35, 0.3, -0.46], [0.35, 1, -0.46], 0.02, 5)),
    l(r, Ke([0.35, 1, -0.46], [0.95, 1, -0.46], 0.02, 5)),
    l(r, Ke([0.35, 0.3, 0.46], [0.35, 1, 0.46], 0.02, 5)),
    l(r, Ke([0.35, 1, 0.46], [0.95, 1, 0.46], 0.02, 5)));
  for (let U of [-0.75, -1.75])
    (l(s, Ee(U - 0.28, 0.26, -0.2, U + 0.28, 0.82, 0.2, 0.05), [1, 0.9, 0.85]),
      l(o, Ee(U - 0.3, 0.82, -0.22, U + 0.3, 0.93, 0.22, 0.04)),
      l(o, Ee(U - 0.34, 0.93, -0.2, U - 0.26, 1.2, 0.2, 0.03)),
      l(r, Ke([U + 0.3, 0.6, -0.22], [U + 0.3, 1.02, 0], 0.014, 4)),
      l(r, Ke([U + 0.3, 0.6, 0.22], [U + 0.3, 1.02, 0], 0.014, 4)));
  l(s, Ee(-2.9, 0.26, -0.3, -2.45, 0.58, 0.3, 0.04), [1.1, 0.5, 0.4]);
  for (let U of [-1, 1])
    (l(r, Ke([-2.95, 0.55, U * 0.9], [-2.75, 2, U * 0.55], 0.03, 6)),
      l(r, Ke([-2.3, 0.55, U * 0.9], [-2.75, 1.3, U * 0.7], 0.022, 5)));
  (l(r, Ke([-2.75, 2, -0.55], [-2.75, 2, 0.55], 0.03, 6)),
    l(r, Ee(-2.88, 2, -0.2, -2.62, 2.04, 0.2)),
    l(o, xt(0.05, 0.06, 0.1, "y", -2.75, 2.09, 0, 8)),
    l(o, Ke([-2.75, 2, 0.42], [-2.9, 3.7, 0.46], 0.011, 5)),
    l(o, xt(0.16, 0.16, 0.07, "y", -2.75, 2.1, -0.36, 10)));
  for (let U of [-0.36, 0.36])
    (l(r, Ee(-3.6, 0.42, U - 0.16, -3.44, 0.78, U + 0.16, 0.02)),
      l(o, Ee(-4.1, 0.78, U - 0.23, -3.48, 1.4, U + 0.23, 0.09)),
      l(n, Ee(-4.11, 1, U - 0.235, -3.47, 1.05, U + 0.235), [1.4, 1.4, 1.4]),
      l(o, Ee(-3.92, -0.05, U - 0.085, -3.62, 0.8, U + 0.085, 0.03)),
      l(o, Ee(-4.02, -0.52, U - 0.04, -3.6, -0.05, U + 0.04, 0.015)),
      l(o, xt(0.07, 0.03, 0.42, "x", -3.9, -0.3, U, 8)));
  for (let U of [-1.8, 0.4, 1.7])
    (l(s, xt(0.11, 0.11, 0.42, "y", U, 0.42, 1.36, 10), [1.2, 0.8, 0.7]),
      l(n, Ke([U, 0.63, 1.36], [U, 0.78, 1.12], 0.01, 4), h));
  let z = new Ci(0.26, 0.07, 6, 16);
  (z.rotateY(Math.PI / 2), z.translate(1.02, 0.72, 0), l(s, z, [1.3, 0.6, 0.45]));
  let H = t.build({ cast: !0, recv: !0 });
  (e.add(Bn(-2.75, 2.2, 0, 0.075), [1.2, 11, 3.2], 1.5, 0, 0.1),
    e.add(Bn(-2.75, 2.2, 0, 0.074), [1.2, 11, 3.2], 1.5, 0.2, 0.08));
  let O = e.build();
  O && ((O.frustumCulled = !1), H.add(O));
  let q = new wt();
  return (
    (q.name = "boat"),
    q.add(H),
    (q.userData.noMerge = !0),
    { root: q, hullGrp: H, tris: t.tris }
  );
}
var dv = new Ve(12172214),
  k1 = (i, e = 1) => {
    let t = new Ve(i);
    return [(e * t.r) / dv.r, (e * t.g) / dv.g, (e * t.b) / dv.b];
  },
  yb = [
    8200729, 8200729, 6957596, 2047846, 2047846, 2307146, 2906692, 2906692, 11751962, 9062946,
    5922920, 5922920, 4146764, 2055523, 10121752, 8093308, 6962468, 6962468,
  ].map((i) => k1(i)),
  L1 = [
    [0.6, 0.17, 0.13],
    [0.17, 0.29, 0.5],
    [0.2, 0.42, 0.3],
    [0.76, 0.35, 0.12],
    [0.78, 0.6, 0.16],
    [0.8, 0.81, 0.78],
    [0.4, 0.43, 0.47],
    [0.16, 0.42, 0.45],
    [0.55, 0.2, 0.15],
    [0.2, 0.3, 0.45],
  ],
  _b = (i, e, t) => {
    let n = Math.min(1, Math.max(0, (t - i) / (e - i)));
    return n * n * (3 - 2 * n);
  },
  bb = (i, e) => 1 - 0.6 * _b(38, 160, Math.hypot(i + 5, e));
/**
 * Builds the container storage yard blocks, floodlight towers, substation, and distant scenery.
 * @param {any} i Engine context
 * @param {any} e Beacon light manager
 */

const xb = buildPatrolBoat;

export { buildPatrolBoat, xb };

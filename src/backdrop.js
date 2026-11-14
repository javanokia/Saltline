/**
 * @file src/backdrop.js
 * @description 《几猫国产3A大作》港口海洋天际线与宏观远景建筑群程序化装配引擎 (Marine Backdrop Engine)
 */

import * as THREE from "three";
import {
  vec3,
  BackdropBatchBuilder,
  polylineCylinders,
  catenaryCurvePoints,
  createBeaconBlinkSystem,
} from "./backdrop/common.js";

import { buildQuayCrane, z1 } from "./backdrop/quay_crane.js";
import { buildCargoShip, vb } from "./backdrop/cargo_ship.js";
import { buildPatrolBoat, xb } from "./backdrop/patrol_boat.js";
import { buildYardCrane, buildYardBlocks, mb, Mb } from "./backdrop/yard_blocks.js";
import { buildGullsFlock, wb } from "./backdrop/gulls.js";

var mv = {};
const _M = Object.defineProperty;
const br = (i, e) => {
  for (var t in e) _M(i, t, { get: e[t], enumerable: true });
};
br(mv, { create: () => pv, showcase: () => MR });

var _R = ["crane", "ship", "boat", "sky"];
/**
 * Assembles the full backdrop scene graph and colliders.
 * @param {any} i Engine context
 * @param {object} [opts] Options
 * @param {string|null} [opts.only] Optional single asset filter ("crane"|"ship"|"boat"|"sky")
 * @param {boolean} [opts.showcase] Whether running in showcase orbit mode
 */
function buildBackdropScene(i, { only: e = null, showcase: t = !1 } = {}) {
  let n = (b) => !e || e === b,
    s = new THREE.Group();
  s.name = "backdrop";
  let o = createBeaconBlinkSystem(),
    r = new THREE.Vector3(31.5, -1.6, 21);
  t && r.set(24, 0.34, 15);
  let a = null,
    l = null,
    c = null,
    u = null,
    h = null;
  if (
    (n("boat") &&
      ((a = buildPatrolBoat(i, o)),
      a.root.position.copy(r),
      (a.root.rotation.y = -Math.PI / 2),
      s.add(a.root)),
    a && !t)
  ) {
    let b = new BackdropBatchBuilder(),
      m = i.mats.get("rope");
    (b.add(
      m,
      polylineCylinders(
        catenaryCurvePoints(vec3(3.2, 0.95, 0.05), vec3(4.6, 2.12, 2.3), 0.22, 7),
        0.016,
        5,
      ),
    ),
      b.add(
        m,
        polylineCylinders(
          catenaryCurvePoints(vec3(-3.25, 0.82, 0.95), vec3(-4.6, 2.12, 2.3), 0.2, 7),
          0.016,
          5,
        ),
      ),
      a.root.add(b.build({ cast: !1, recv: !1 })));
  }
  (n("crane") && ((l = buildQuayCrane(i, o)), s.add(l.root)),
    n("ship") && ((c = buildCargoShip(i, o)), s.add(c.root)),
    n("sky") && ((u = buildYardBlocks(i, o)), s.add(u.root)),
    (n("sky") || n("crane")) && ((h = wb(i, o.uTime, 12)), s.add(h)));
  let f = o.build();
  (f && ((f.name = "backdrop-lamps"), (f.frustumCulled = !1), s.add(f)), i.scene.add(s));
  let p = [],
    d = (b, m) => {
      i.physics &&
        i.physics.addBox &&
        p.push(
          i.physics.addBox(b.min, b.max, {
            surface: m,
            tag: "backdrop",
            noNav: !!b.noNav,
          }),
        );
    };
  if (l) for (let b of l.colliders) d(b, "metal");
  if (c) for (let b of c.colliders) d(b, "metal");
  a && !t && d({ min: [30.25, -1.7, 17.4], max: [32.8, -0.7, 24.6] }, "rubber");
  let v = 0,
    g = 0;
  s.traverse((b) => {
    const mesh = /** @type {THREE.Mesh} */ (b);
    if (mesh.isMesh) {
      g++;
      let m = mesh.geometry;
      v += (m.index ? m.index.count : m.attributes.position.count) / 3;
    }
  });
  let x = 0;
  function y(b) {
    if (((x += b), (o.uTime.value = x), l)) {
      let m = l.spreader;
      ((m.rotation.x = 0.012 * Math.sin(x * 0.52) + 0.004 * Math.sin(x * 1.31 + 1)),
        (m.rotation.z = 0.009 * Math.sin(x * 0.41 + 1.1)));
    }
    (c && (c.radar.rotation.y = x * 1.9),
      a &&
        ((a.root.position.y =
          r.y + (t ? 0 : 0.05 * Math.sin(x * 1.15) + 0.025 * Math.sin(x * 2.3 + 1.3))),
        (a.hullGrp.rotation.x = 0.05 * Math.sin(x * 0.9 + 0.4) + 0.016 * Math.sin(x * 2.1)),
        (a.hullGrp.rotation.z = 0.02 * Math.sin(x * 1.3 + 2))));
  }
  return (
    y(0),
    {
      update: y,
      root: s,
      boat: a ? a.root : new THREE.Object3D(),
      crane: l ? l.root : null,
      ship: c ? c.root : null,
      skyline: u ? u.root : null,
      gulls: h,
      lamps: f,
      colliders: p,
      spreader: l ? l.spreader : null,
      boatBase: r,
      extractionPoint: new THREE.Vector3(30, 0, 20),
      shipName: "KITTIWAKE",
      craneId: "SALTLINE 04",
      stats: { tris: Math.round(v), drawCalls: g },
    }
  );
}
async function createBackdropEnvironment(i) {
  return buildBackdropScene(i, {});
}

/**
 * Showcase mode runner for isolated inspection of backdrop assets.
 * @param {any} i Engine context
 */
function showcaseBackdrop(i) {
  let e = i.params && _R.includes(i.params.bshow) ? i.params.bshow : null,
    t = buildBackdropScene(i, { only: e, showcase: !0 });
  console.log("[backdrop] " + JSON.stringify(t.stats));
  let n = {
    crane: { cam: [0, 1.7, 27], target: [33, 13, 0] },
    ship: { cam: [24, 1.7, -2], target: [38, 9, -24] },
    boat: { cam: [19.5, 1.7, 11.5], target: [24, 0.9, 15] },
    sky: { cam: [-32, 1.7, 6], target: [30, 9, 0] },
  };
  return { ...(n[e] || n.crane), update: (s) => t.update(s) };
}

// 兼容别名
const Eb = buildBackdropScene;
const pv = createBackdropEnvironment;
const MR = showcaseBackdrop;

// 语义化标准导出与别名
export {
  buildQuayCrane,
  buildYardCrane,
  buildCargoShip,
  buildPatrolBoat,
  buildYardBlocks,
  createBackdropEnvironment,
  showcaseBackdrop,
  createBackdropEnvironment as create,
  showcaseBackdrop as showcase,
  mv,
};

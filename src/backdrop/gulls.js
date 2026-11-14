/**
 * @file src/backdrop/gulls.js
 * @description 远景海鸥群程序化飞行与振翅着色器
 */

import * as THREE from "three";
import { vec3, createSeededRng } from "./common.js";

function wb(i, e, t = 12) {
  let n = createSeededRng(5521),
    s = [],
    o = [],
    r = [];
  for (let u = 0; u < t; u++) {
    let f =
        u % 3 === 0
          ? [54 + n() * 30, 9 + n() * 14, -4 + n() * 56]
          : [16 + n() * 26, 33 + n() * 12, -14 + n() * 28],
      p = 9 + n() * 16,
      d = (0.16 + n() * 0.16) * (n() > 0.5 ? 1 : -1),
      v = n() * 6.283,
      g = 5 + n() * 3,
      x = [
        [0.15, 0, 0, 0],
        [-0.13, 0, 0, 0],
        [-0.24, 0, 0.8, 1],
        [0.15, 0, 0, 0],
        [-0.24, 0, -0.8, 1],
        [-0.13, 0, 0, 0],
      ];
    for (let y of x)
      (s.push(y[0], y[1] - 60, y[2]), o.push(f[0], f[1], f[2], p), r.push(d, v, g, y[3]));
  }
  let a = new THREE.BufferGeometry();
  (a.setAttribute("position", new THREE.Float32BufferAttribute(s, 3)),
    a.setAttribute("aOrbit", new THREE.Float32BufferAttribute(o, 4)),
    a.setAttribute("aPar", new THREE.Float32BufferAttribute(r, 4)));
  let l = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.2, 0.21, 0.23),
    side: THREE.DoubleSide,
    fog: !1,
  });
  ((l.onBeforeCompile = (u) => {
    ((u.uniforms.uTime = e),
      (u.vertexShader =
        `attribute vec4 aOrbit;
attribute vec4 aPar;
uniform float uTime;
` +
        u.vertexShader.replace(
          "#include <begin_vertex>",
          `
      float ga = aPar.y + uTime * aPar.x;
      float gdir = sign(aPar.x);
      vec3 gfw = vec3(-sin(ga), 0.0, cos(ga)) * gdir;
      vec3 grt = vec3(gfw.z, 0.0, -gfw.x);
      vec3 gl = position + vec3(0.0, 60.0, 0.0);
      float glide = smoothstep(-0.2, 0.5, sin(uTime * 0.31 + aPar.y * 3.0));
      float gflap = sin(uTime * aPar.z + aPar.y * 7.0) * mix(0.12, 0.55, glide) + 0.18;
      gl.y += aPar.w * gflap * abs(gl.z);
      gl.z *= mix(1.0, 0.86, aPar.w * abs(gflap));
      vec3 gc = aOrbit.xyz + vec3(cos(ga), 0.0, sin(ga)) * aOrbit.w + vec3(0.0, sin(ga * 0.7 + aPar.y) * 2.2 + sin(uTime * 0.23 + aPar.y) * 1.5, 0.0);
      vec3 transformed = gc + gfw * gl.x + grt * gl.z + vec3(0.0, gl.y - 0.3 * gdir * gl.z, 0.0);`,
        )));
  }),
    (l.customProgramCacheKey = () => "saltline-gulls"));
  let c = new THREE.Mesh(a, l);
  return (
    (c.frustumCulled = !1),
    (c.castShadow = !1),
    (c.receiveShadow = !1),
    (c.name = "gulls"),
    c
  );
}

export { wb as buildGullsFlock, wb };

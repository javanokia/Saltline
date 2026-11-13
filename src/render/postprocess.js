/**
 * @file src/render/postprocess.js
 * @description 延迟后处理渲染管线 (HDR 颜色分级、环境光遮蔽、体积光、运动模糊、Bloom 与自动曝光)
 */

import * as THREE from "three";
import { QUALITY_PRESETS, SUN_CONFIG, SKY_CONFIG } from "../constants.js";
import {
  postShaderPrefix,
  depthHalfEpsilon,
  screenSpaceDepthEpsilon,
  postVertexShader,
  postShaderCommon,
  exposureShaderChunk,
  depthCopyFragmentShader,
  depthHalfFragmentShader,
  ambientOcclusionFragmentShader,
  volumetricLightFragmentShader,
  bilateralBlurFragmentShader,
  compositeFragmentShader,
  motionBlurFragmentShader,
  bloomDownsampleFragmentShader,
  bloomUpsampleFragmentShader,
  anamorphicStreakFragmentShader,
  eyeAdaptationFragmentShader,
  lensDirtFragmentShader,
  colorGradeFragmentShader,
  finalOutputFragmentShader,
} from "./shaders.js";

const {
  BufferGeometry,
  BufferAttribute,
  OrthographicCamera,
  Mesh,
  ShaderMaterial,
  WebGLRenderTarget,
  DepthTexture,
  HalfFloatType,
  FloatType,
  UnsignedByteType,
  UnsignedIntType,
  LinearFilter,
  NearestFilter,
  RepeatWrapping,
  RGBAFormat,
  RedFormat,
  Vector2,
  Vector3,
  Matrix4,
  DataUtils,
  AlwaysDepth,
  FrontSide,
} = THREE;

export function buildPostPipeline(renderer, engineContext, { noiseTex }) {
  let n = new BufferGeometry();
  (n.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  ),
    n.setAttribute("uv", new BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2)));
  let s = new Mesh(n, null);
  s.frustumCulled = !1;
  let o = new OrthographicCamera(-1, 1, 1, -1, 0, 1),
    r = [],
    a = (passName, fragmentShaderSource, passUniforms, R = {}) => {
      let I = new ShaderMaterial({
        name: "post-" + passName,
        vertexShader: postVertexShader,
        fragmentShader: `${postShaderPrefix} ${passName}
${fragmentShaderSource}`,
        uniforms: passUniforms,
        depthTest: !1,
        depthWrite: !1,
        blending: FrontSide,
        toneMapped: !1,
        ...R,
      });
      return (r.push(I), I);
    };
  function renderQuadPass(material, target) {
    ((s.material = material), renderer.setRenderTarget(target), renderer.render(s, o));
  }
  const c = HalfFloatType;
  const u = UnsignedByteType;
  const h = LinearFilter;
  const f = NearestFilter;
  /**
   * @param {any} [textureType]
   * @param {any} [filterMode]
   * @param {any} [options]
   */
  const p = (textureType = c, filterMode = h, options = {}) => {
    let renderTarget = new WebGLRenderTarget(4, 4, {
      type: textureType,
      format: RGBAFormat,
      minFilter: filterMode,
      magFilter: filterMode,
      depthBuffer: !1,
      stencilBuffer: !1,
      generateMipmaps: !1,
      ...options,
    });
    return ((renderTarget.texture.generateMipmaps = !1), renderTarget);
  };
  const d = () => engineContext.quality,
    v = () => ({
      uSunDir: { value: SUN_CONFIG.dir.clone() },
      uZen: { value: SKY_CONFIG.zenith.clone() },
      uHor: { value: SKY_CONFIG.horizon.clone() },
      uHorAway: { value: SKY_CONFIG.horizonAway.clone() },
      uSunCol: { value: SUN_CONFIG.color.clone() },
    }),
    g = {
      volSunScale: 0.85,
      volAmbient: 0.2,
      volSigma: 0.0034,
      volMaxDist: 170,
      volFarHaze: 0.42,
      volInteriorDust: 6,
      aoRadius: 0.9,
      aoIntensity: 1.6,
      aoStrength: 0.95,
      bloom: 0.065,
      bloomMix: 0.62,
      dirt: 0.1,
      streak: 0.03,
      streakThreshold: 2.2,
      flare: 0.16,
      key: 0.12,
      minExposure: 0.6,
      maxExposure: 2,
      adaptTau: 1.5,
      agxMix: 0.25,
      ca: 0.0013,
      vignette: 0.3,
      grain: 0.02,
      sharpen: 0.3,
      lookPower: 1.18,
      lookSat: 1.22,
    };
  let x = !1;
  try {
    x = !!renderer.extensions.has("EXT_color_buffer_float");
  } catch {
    x = !1;
  }
  let y = {
      scene: p(c, h),
      motion: p(c, h),
      ldr: p(u, h),
      depthHalf: x ? p(FloatType, f, { format: RedFormat }) : p(c, f),
      aoA: p(u, f),
      aoB: p(u, f),
      volA: p(c, f),
      volB: p(c, f),
      down: [],
      up: [],
      streakA: p(c, h),
      streakB: p(c, h),
      adapt: [p(c, f), p(c, f)],
      dirt: p(u, h),
      depthCopy: null,
    },
    b = 6;
  for (let level = 0; level < b; level++) y.down.push(p(c, h));
  for (let level = 0; level < b - 1; level++) y.up.push(p(c, h));
  (y.adapt[0].setSize(1, 1), y.adapt[1].setSize(1, 1), y.dirt.setSize(512, 288));
  let m = 0,
    A = 0,
    _ = !1,
    M = { w: 4, h: 4, hw: 2, hh: 2 },
    E = {
      tAdapt: { value: null },
      uExposure: { value: 1 },
      uKey: { value: g.key },
      uMinE: { value: g.minExposure },
      uMaxE: { value: g.maxExposure },
      uAuto: { value: 1 },
    },
    w = a(
      "depthcopy",
      depthCopyFragmentShader,
      { tDepth: { value: null } },
      { depthTest: !0, depthWrite: !0, depthFunc: AlwaysDepth, colorWrite: !1 },
    ),
    S = a("depthhalf", depthHalfFragmentShader, {
      tDepth: { value: null },
      uNear: { value: 0.08 },
      uFar: { value: 900 },
    }),
    z = a(
      "ao",
      ambientOcclusionFragmentShader,
      {
        tDepthHalf: { value: y.depthHalf.texture },
        uTanHalf: { value: new Vector2() },
        uTexel: { value: new Vector2() },
        uRadius: { value: g.aoRadius },
        uIntensity: { value: g.aoIntensity },
        uAspect: { value: 1 },
      },
      { defines: { AO_TAPS: 12 } },
    ),
    H = a(
      "vol",
      volumetricLightFragmentShader,
      {
        tDepthHalf: { value: y.depthHalf.texture },
        tShadow: { value: null },
        uShadowMatrix: { value: new Matrix4() },
        uCamWorld: { value: new Matrix4() },
        uCamPos: { value: new Vector3() },
        uSunRad: { value: new Vector3() },
        uAmb: { value: new Vector3() },
        uTanHalf: { value: new Vector2() },
        uHasShadow: { value: 0 },
        uMaxDist: { value: g.volMaxDist },
        uSigma: { value: g.volSigma },
        uFarZ: { value: 900 },
        uFarHaze: { value: g.volFarHaze },
        uFlicker: { value: 0 },
        uBoxDust: { value: 0 },
        uBoxMin: { value: new Vector3(1e6, 1e6, 1e6) },
        uBoxMax: { value: new Vector3(-1e6, -1e6, -1e6) },
        ...v(),
      },
      { defines: { VOL_STEPS: 16 } },
    ),
    O = a(
      "blur-ao",
      bilateralBlurFragmentShader,
      {
        tSrc: { value: null },
        tDepthHalf: { value: y.depthHalf.texture },
        uDir: { value: new Vector2() },
      },
      { defines: { BLUR_TOL: "0.04" } },
    ),
    q = a(
      "blur-vol",
      bilateralBlurFragmentShader,
      {
        tSrc: { value: null },
        tDepthHalf: { value: y.depthHalf.texture },
        uDir: { value: new Vector2() },
      },
      { defines: { BLUR_TOL: "0.30" } },
    ),
    U = a("composite", compositeFragmentShader, {
      tColor: { value: null },
      tDepth: { value: null },
      tDepthHalf: { value: y.depthHalf.texture },
      tAO: { value: y.aoA.texture },
      tVol: { value: y.volA.texture },
      uHalfRes: { value: new Vector2() },
      uNear: { value: 0.08 },
      uFar: { value: 900 },
      uAoOn: { value: 1 },
      uVolOn: { value: 1 },
      uAoStrength: { value: g.aoStrength },
      ...E,
    }),
    T = a("motion", motionBlurFragmentShader, {
      tColor: { value: y.scene.texture },
      tDepth: { value: null },
      uInvViewProj: { value: new Matrix4() },
      uPrevViewProj: { value: new Matrix4() },
      uShutter: { value: 0.5 },
      uRes: { value: new Vector2() },
    }),
    D = a("down", bloomDownsampleFragmentShader, {
      tSrc: { value: null },
      uTexel: { value: new Vector2() },
      uFirst: { value: 0 },
    }),
    C = a("up", bloomUpsampleFragmentShader, {
      tLow: { value: null },
      tHigh: { value: null },
      uTexel: { value: new Vector2() },
      uMix: { value: g.bloomMix },
    }),
    G = a("streak", anamorphicStreakFragmentShader, {
      tSrc: { value: null },
      uDir: { value: new Vector2() },
      uThreshold: { value: 0 },
      ...E,
    }),
    j = a("adapt", eyeAdaptationFragmentShader, {
      tPrev: { value: null },
      tLum: { value: null },
      tDepth: { value: null },
      uSunUv: { value: new Vector2(0.5, 0.5) },
      uSunOn: { value: 0 },
      uRate: { value: 1 },
      uVisRate: { value: 1 },
      uAspect: { value: 1 },
    }),
    N = a("dirt", lensDirtFragmentShader, {
      tNoise: { value: noiseTex },
      uAspect: { value: 16 / 9 },
    }),
    Q = a(
      "grade",
      colorGradeFragmentShader,
      {
        tScene: { value: null },
        tBloom: { value: y.up[0].texture },
        tBlur: { value: y.down[1].texture },
        tStreak: { value: y.streakB.texture },
        tDirt: { value: y.dirt.texture },
        ...E,
        uSunCol: { value: SUN_CONFIG.color.clone() },
        uSunUv: { value: new Vector2(0.5, 0.5) },
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uBloom: { value: g.bloom },
        uDirt: { value: g.dirt },
        uStreak: { value: g.streak },
        uFlare: { value: g.flare },
        uCA: { value: g.ca },
        uVignette: { value: g.vignette },
        uDamage: { value: 0 },
        uLowHealth: { value: 0 },
        uAds: { value: 0 },
        uFlash: { value: 0 },
        uFade: { value: 0 },
        uSaturation: { value: 1 },
        uSunOn: { value: 0 },
        uThunder: { value: 0 },
        uAgxMix: { value: g.agxMix },
      },
      {
        defines: {
          LOOK_POWER: g.lookPower.toFixed(3),
          LOOK_SAT: g.lookSat.toFixed(3),
        },
      },
    ),
    K = a("final", finalOutputFragmentShader, {
      tSrc: { value: y.ldr.texture },
      uTexel: { value: new Vector2() },
      uTime: { value: 0 },
      uGrain: { value: g.grain },
      uSharpen: { value: g.sharpen },
      uFxaa: { value: 1 },
    }),
    viewProjectionMatrix = new Matrix4(),
    F = new Matrix4(),
    X = new Matrix4(),
    sunWorldPosition = new Vector3(),
    viewDirection = new Vector3(),
    $ = !1;
  function applyQuality() {
    let volumetricSteps = Math.max(6, d().volSteps | 0),
      aoTaps = d().name === "test" || d().name === "low" ? 8 : d().name === "ultra" ? 16 : 12;
    (H.defines.VOL_STEPS !== volumetricSteps &&
      ((H.defines.VOL_STEPS = volumetricSteps), (H.needsUpdate = !0)),
      z.defines.AO_TAPS !== aoTaps && ((z.defines.AO_TAPS = aoTaps), (z.needsUpdate = !0)));
  }
  function resize(width, height) {
    if (
      ((width = Math.max(8, width | 0)),
      (height = Math.max(8, height | 0)),
      (M.w = width),
      (M.h = height),
      (M.hw = Math.max(4, Math.ceil(width / 2))),
      (M.hh = Math.max(4, Math.ceil(height / 2))),
      y.scene.setSize(width, height),
      y.motion.setSize(width, height),
      y.ldr.setSize(width, height),
      y.depthCopy)
    ) {
      y.depthCopy.setSize(width, height);
      let I = y.depthCopy.depthTexture.image;
      (I.width !== width || I.height !== height) &&
        ((I.width = width), (I.height = height), (y.depthCopy.depthTexture.needsUpdate = !0));
    }
    for (let I of [y.depthHalf, y.aoA, y.aoB, y.volA, y.volB]) I.setSize(M.hw, M.hh);
    let halfWidth = M.hw,
      halfHeight = M.hh;
    for (let I = 0; I < b; I++)
      (y.down[I].setSize(halfWidth, halfHeight),
        I < b - 1 && y.up[I].setSize(halfWidth, halfHeight),
        (halfWidth = Math.max(2, halfWidth >> 1)),
        (halfHeight = Math.max(2, halfHeight >> 1)));
    (y.streakA.setSize(y.down[2].width, y.down[2].height),
      y.streakB.setSize(y.down[2].width, y.down[2].height),
      ($ = !1),
      applyQuality());
  }
  function ensureDepthCopy() {
    if (!y.depthCopy) {
      let depthTexture = new DepthTexture(M.w, M.h);
      ((depthTexture.type = UnsignedIntType),
        (depthTexture.minFilter = depthTexture.magFilter = f),
        (y.depthCopy = new WebGLRenderTarget(M.w, M.h, {
          type: u,
          format: RGBAFormat,
          minFilter: f,
          magFilter: f,
          depthBuffer: !0,
          stencilBuffer: !1,
          depthTexture: depthTexture,
          generateMipmaps: !1,
        })),
        renderer.setRenderTarget(y.depthCopy),
        renderer.setClearColor(0, 1),
        renderer.clear(!0, !0, !1),
        renderer.setRenderTarget(null));
    }
    return y.depthCopy.depthTexture;
  }
  function copyDepthTexture(depthTexture) {
    y.depthCopy && ((w.uniforms.tDepth.value = depthTexture), renderQuadPass(w, y.depthCopy));
  }
  function executePostPipeline({
    hdr: hdrTarget,
    camera: camera,
    sun: sunLight,
    dt: deltaTime,
    post: I,
    exposure: exposure,
    time: time,
    fast: k,
    thunder: thunder,
  }) {
    let quality = d(),
      projectionElements = camera.projectionMatrix.elements,
      tanHalfX = 1 / projectionElements[0],
      tanHalfY = 1 / projectionElements[5],
      aspectRatio = tanHalfX / tanHalfY,
      depthTexture = hdrTarget.depthTexture;
    ((E.tAdapt.value = y.adapt[m].texture),
      (E.uExposure.value = exposure),
      (E.uAuto.value = J.autoExposure ? 1 : 0),
      (E.uKey.value = g.key),
      (E.uMinE.value = g.minExposure),
      (E.uMaxE.value = g.maxExposure),
      _ || ((N.uniforms.uAspect.value = 16 / 9), renderQuadPass(N, y.dirt), (_ = !0)),
      (S.uniforms.tDepth.value = depthTexture),
      (S.uniforms.uNear.value = camera.near),
      (S.uniforms.uFar.value = camera.far),
      renderQuadPass(S, y.depthHalf));
    let invHalfWidth = 1 / M.hw,
      invHalfHeight = 1 / M.hh,
      aoEnabled = !!quality.ao;
    aoEnabled &&
      (z.uniforms.uTanHalf.value.set(tanHalfX, tanHalfY),
      z.uniforms.uTexel.value.set(invHalfWidth, invHalfHeight),
      (z.uniforms.uAspect.value = aspectRatio),
      renderQuadPass(z, y.aoA),
      (O.uniforms.tSrc.value = y.aoA.texture),
      O.uniforms.uDir.value.set(invHalfWidth, 0),
      renderQuadPass(O, y.aoB),
      (O.uniforms.tSrc.value = y.aoB.texture),
      O.uniforms.uDir.value.set(0, invHalfHeight),
      renderQuadPass(O, y.aoA));
    let volumetricEnabled = (quality.volSteps | 0) > 0;
    if (volumetricEnabled) {
      let uniforms = H.uniforms,
        interiorBox =
          engineContext.level &&
          engineContext.level.interiorBoxes &&
          engineContext.level.interiorBoxes[0];
      interiorBox
        ? (uniforms.uBoxMin.value.copy(interiorBox.min),
          uniforms.uBoxMax.value.copy(interiorBox.max),
          (uniforms.uBoxDust.value = g.volInteriorDust))
        : (uniforms.uBoxDust.value = 0);
      let shadowTexture =
        sunLight.shadow && sunLight.shadow.map ? sunLight.shadow.map.texture : null;
      ((uniforms.tShadow.value = shadowTexture),
        (uniforms.uHasShadow.value = shadowTexture ? 1 : 0),
        shadowTexture && uniforms.uShadowMatrix.value.copy(sunLight.shadow.matrix),
        uniforms.uCamWorld.value.copy(camera.matrixWorld),
        uniforms.uCamPos.value.setFromMatrixPosition(camera.matrixWorld),
        uniforms.uTanHalf.value.set(tanHalfX, tanHalfY),
        (uniforms.uFarZ.value = camera.far));
      let sunRadianceScale = sunLight.intensity * g.volSunScale;
      uniforms.uSunRad.value.set(
        sunLight.color.r * sunRadianceScale,
        sunLight.color.g * sunRadianceScale,
        sunLight.color.b * sunRadianceScale,
      );
      let ambientScale = g.volAmbient * (1 + thunder * 1.5);
      (uniforms.uAmb.value.set(
        SKY_CONFIG.fog.r * ambientScale,
        SKY_CONFIG.fog.g * ambientScale,
        SKY_CONFIG.fog.b * ambientScale,
      ),
        renderQuadPass(H, y.volA),
        (q.uniforms.tSrc.value = y.volA.texture),
        q.uniforms.uDir.value.set(invHalfWidth, 0),
        renderQuadPass(q, y.volB),
        (q.uniforms.tSrc.value = y.volB.texture),
        q.uniforms.uDir.value.set(0, invHalfHeight),
        renderQuadPass(q, y.volA));
    }
    {
      let uniforms = U.uniforms;
      ((uniforms.tColor.value = hdrTarget.texture),
        (uniforms.tDepth.value = depthTexture),
        uniforms.uHalfRes.value.set(M.hw, M.hh),
        (uniforms.uNear.value = camera.near),
        (uniforms.uFar.value = camera.far),
        (uniforms.uAoOn.value = aoEnabled ? 1 : 0),
        (uniforms.uVolOn.value = volumetricEnabled ? 1 : 0),
        renderQuadPass(U, y.scene));
    }
    let sceneColor = y.scene.texture;
    if (
      (viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
      quality.motionBlur && $ && deltaTime > 0)
    ) {
      let uniforms = T.uniforms;
      ((uniforms.tDepth.value = depthTexture),
        uniforms.uInvViewProj.value.copy(X.copy(viewProjectionMatrix).invert()),
        uniforms.uPrevViewProj.value.copy(F),
        (uniforms.uShutter.value = Math.min(0.5, 1 / 190 / Math.max(deltaTime, 0.001))),
        uniforms.uRes.value.set(M.w, M.h),
        renderQuadPass(T, y.motion),
        (sceneColor = y.motion.texture));
    }
    if ((F.copy(viewProjectionMatrix), ($ = !0), quality.bloom)) {
      let uniforms = sceneColor,
        levelWidth = M.w,
        levelHeight = M.h;
      for (let level = 0; level < b; level++)
        ((D.uniforms.tSrc.value = uniforms),
          D.uniforms.uTexel.value.set(1 / levelWidth, 1 / levelHeight),
          (D.uniforms.uFirst.value = level === 0 ? 1 : 0),
          renderQuadPass(D, y.down[level]),
          (uniforms = y.down[level].texture),
          (levelWidth = y.down[level].width),
          (levelHeight = y.down[level].height));
      let currentLevel = y.down[b - 1];
      for (let level = b - 2; level >= 0; level--)
        ((C.uniforms.tLow.value = currentLevel.texture),
          (C.uniforms.tHigh.value = y.down[level].texture),
          C.uniforms.uTexel.value.set(1 / currentLevel.width, 1 / currentLevel.height),
          renderQuadPass(C, y.up[level]),
          (currentLevel = y.up[level]));
      let streakTexel = 1 / y.streakA.width;
      ((G.uniforms.tSrc.value = y.down[2].texture),
        G.uniforms.uDir.value.set(streakTexel * 1.5, 0),
        (G.uniforms.uThreshold.value = g.streakThreshold),
        renderQuadPass(G, y.streakA),
        (G.uniforms.tSrc.value = y.streakA.texture),
        G.uniforms.uDir.value.set(streakTexel * 5, 0),
        (G.uniforms.uThreshold.value = 0),
        renderQuadPass(G, y.streakB));
    }
    (sunWorldPosition
      .copy(SUN_CONFIG.dir)
      .multiplyScalar(500)
      .add(viewDirection.setFromMatrixPosition(camera.matrixWorld))
      .project(camera),
      camera.getWorldDirection(viewDirection));
    let sunFacing = viewDirection.dot(SUN_CONFIG.dir) > 0.05,
      sunEdgeFactor = Math.max(Math.abs(sunWorldPosition.x), Math.abs(sunWorldPosition.y)),
      sunVisibility = sunFacing ? 1 - Math.min(1, Math.max(0, (sunEdgeFactor - 1) / 0.3)) : 0,
      sunUvX = sunWorldPosition.x * 0.5 + 0.5,
      sunUvY = sunWorldPosition.y * 0.5 + 0.5;
    {
      let uniforms = j.uniforms,
        readAdaptTarget = y.adapt[m],
        writeAdaptTarget = y.adapt[1 - m];
      ((uniforms.tPrev.value = readAdaptTarget.texture),
        (uniforms.tLum.value = quality.bloom ? y.down[b - 1].texture : sceneColor),
        (uniforms.tDepth.value = depthTexture),
        uniforms.uSunUv.value.set(sunUvX, sunUvY),
        (uniforms.uSunOn.value = sunVisibility),
        (uniforms.uAspect.value = aspectRatio));
      let instantAdaptation = A < 2 || k;
      ((uniforms.uRate.value = instantAdaptation
        ? A < 2
          ? 1
          : 0.6
        : 1 - Math.exp(-deltaTime / g.adaptTau)),
        (uniforms.uVisRate.value = instantAdaptation ? 1 : 1 - Math.exp(-deltaTime / 0.12)),
        renderQuadPass(j, writeAdaptTarget),
        (m = 1 - m),
        A++);
    }
    {
      let uniforms = Q.uniforms;
      ((uniforms.tScene.value = sceneColor),
        (E.tAdapt.value = y.adapt[m].texture),
        uniforms.uSunUv.value.set(sunUvX, sunUvY),
        (uniforms.uSunOn.value = sunVisibility),
        (uniforms.uAspect.value = aspectRatio),
        (uniforms.uTime.value = time),
        (uniforms.uBloom.value = quality.bloom ? g.bloom : 0),
        (uniforms.uDirt.value = quality.bloom ? g.dirt : 0),
        (uniforms.uStreak.value = quality.bloom ? g.streak : 0),
        (uniforms.uFlare.value = g.flare),
        (uniforms.uAgxMix.value = g.agxMix),
        (uniforms.uCA.value = g.ca),
        (uniforms.uVignette.value = g.vignette),
        (uniforms.uDamage.value = V(I.damage)),
        (uniforms.uLowHealth.value = V(I.lowHealth)),
        (uniforms.uAds.value = V(I.ads)),
        (uniforms.uFlash.value = V(I.flash)),
        (uniforms.uFade.value = V(I.fade)),
        (uniforms.uSaturation.value = Number.isFinite(I.saturation) ? I.saturation : 1),
        renderQuadPass(Q, y.ldr));
    }
    {
      let uniforms = K.uniforms;
      (uniforms.uTexel.value.set(1 / M.w, 1 / M.h),
        (uniforms.uTime.value = time),
        (uniforms.uGrain.value = g.grain),
        (uniforms.uSharpen.value = g.sharpen),
        renderQuadPass(K, null));
    }
  }
  let V = (value) => (value > 0 ? (value < 1 ? value : 1) : 0);
  function disposePostPipeline() {
    for (let material of r) material.dispose();
    let targets = [
      y.scene,
      y.motion,
      y.ldr,
      y.depthHalf,
      y.aoA,
      y.aoB,
      y.volA,
      y.volB,
      y.streakA,
      y.streakB,
      y.dirt,
      ...y.down,
      ...y.up,
      ...y.adapt,
    ];
    y.depthCopy && targets.push(y.depthCopy);
    for (let target of targets) target.dispose();
  }
  let L = new Uint16Array(4);
  function readbackAutoExposure() {
    try {
      renderer.readRenderTargetPixels(y.adapt[m], 0, 0, 1, 1, L);
      let luminance = DataUtils.fromHalfFloat(L[0]),
        autoExposure = Math.min(
          g.maxExposure,
          Math.max(g.minExposure, Math.pow(g.key / Math.max(luminance, 1e-4), 0.85)),
        );
      return {
        lum: +luminance.toFixed(4),
        auto: +autoExposure.toFixed(3),
        sunVis: +DataUtils.fromHalfFloat(L[1]).toFixed(2),
      };
    } catch {
      return null;
    }
  }
  let J = {
    readAdapt: readbackAutoExposure,
    run: executePostPipeline,
    resize: resize,
    copyDepth: copyDepthTexture,
    ensureDepthCopy: ensureDepthCopy,
    applyQuality: applyQuality,
    dispose: disposePostPipeline,
    materials: r,
    rt: y,
    size: M,
    TUNE: g,
    autoExposure: !0,
    pass: renderQuadPass,
    quad: s,
    fsCam: o,
  };
  return J;
}

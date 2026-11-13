// @ts-check
/**
 * @file src/render.js
 * @description 3A 级前向增强渲染引擎与主渲染系统
 *
 * 【架构解耦模块体系】
 * - ./render/environment.js: 程序化噪波纹理、天空穹顶网格与 PMREM 环境探针
 * - ./render/shadows.js: 太阳级联定向光正交视锥紧致贴合与 PCF 软阴影注入
 * - ./render/shaders.js: 延迟后处理着色器全集 (SSAO/体积光/Bloom/AgX 色调映射)
 * - ./render/postprocess.js: 延迟后处理渲染管线 (HDR 颜色分级、动态模糊与自动曝光)
 */

import * as THREE from "three";
import {
  SUN_CONFIG,
  SKY_CONFIG,
  PLAYER_CONFIG,
  FACTION_PLAYER,
  FACTION_ENEMY,
  QUALITY_PRESETS,
} from "./constants.js";
import { createBoxGeometry, createBoxBevelGeometry, createMeshWithShadows } from "./geo.js";

// 子模块导入 (Submodule Imports)
import {
  buildNoiseTexture,
  buildSkyUniforms,
  buildSkyDome,
  buildEnvironmentCapture,
} from "./render/environment.js";
import {
  fitSunShadowCamera,
  patchSoftShadows,
  restoreShadowChunk,
  softShadowShaderHeader,
} from "./render/shadows.js";
import { postShaderPrefix } from "./render/shaders.js";
import { buildPostPipeline } from "./render/postprocess.js";

// Three.js 类与枚举映射
const {
  WebGLRenderer,
  Vector3,
  Vector2,
  Matrix4,
  Scene,
  PerspectiveCamera,
  OrthographicCamera,
  Mesh,
  Group,
  BufferGeometry,
  BufferAttribute,
  DirectionalLight,
  PointLight,
  MeshStandardMaterial,
  WebGLRenderTarget,
  DepthTexture,
  SphereGeometry,
  BoxGeometry,
  ShaderChunk,
  DataUtils,
  DataTexture,
  PMREMGenerator,
  AlwaysDepth,
  SRGBColorSpace,
  NoColorSpace,
  RGBAFormat,
  HalfFloatType,
  UnsignedIntType,
  FloatType,
  RedFormat,
  PCFShadowMap,
  NoToneMapping,
  ACESFilmicToneMapping,
  LinearFilter,
  NearestFilter,
  RepeatWrapping,
  UnsignedByteType,
  ShaderMaterial,
  NormalBlending,
  FrontSide,
  WebGLCubeRenderTarget,
  CubeCamera,
} = THREE;

const PCFSoftShadowMap = 2;

var ENVIRONMENT_INTENSITY = 2,
  INTERIOR_ENVIRONMENT_INTENSITY = 1;
/**
 * 创建渲染系统：WebGL 渲染器、场景/相机、天空、太阳阴影、光池、
 * 环境反射与可选的高级后处理链，并暴露统一渲染接口。
 * @param {import('./types').EngineContext} engineContext
 * @returns {Promise<import('./types').RenderSystem>}
 */
async function buildRenderSystem(engineContext) {
  let e = engineContext.params || {},
    t = document.getElementById("view"),
    n = new WebGLRenderer({
      canvas: t,
      antialias: !1,
      powerPreference: "high-performance",
      alpha: !1,
      depth: !0,
      stencil: !1,
    });
  ((n.outputColorSpace = SRGBColorSpace),
    (n.toneMapping = NoToneMapping),
    (n.toneMappingExposure = 1),
    (n.shadowMap.enabled = !0),
    (n.shadowMap.type = PCFShadowMap),
    (n.shadowMap.autoUpdate = !1),
    (n.autoClear = !1),
    (n.info.autoReset = !1),
    n.setClearColor(0, 1));
  let s = n.getContext(),
    o = { post: !1, shadow: !1, sky: !1, other: 0 };
  n.debug.onShaderError = (renderer, F, X, fragmentShader) => {
    let shaderSource = "",
      infoLog = "";
    try {
      ((shaderSource = renderer.getShaderSource(fragmentShader) || ""),
        (infoLog =
          (renderer.getShaderInfoLog(fragmentShader) || "") +
          " " +
          (renderer.getShaderInfoLog(X) || "") +
          " " +
          (renderer.getProgramInfoLog(F) || "")));
    } catch {}
    let materialLabel = "material";
    (shaderSource.includes(postShaderPrefix)
      ? ((o.post = !0),
        (materialLabel = "post pass " + (shaderSource.match(/SALTLINE_POST (\S+)/) || [])[1]))
      : shaderSource.includes("SALTLINE_SKY")
        ? ((o.sky = !0), (materialLabel = "sky"))
        : shaderSource.includes(softShadowShaderHeader)
          ? ((o.shadow = !0), (materialLabel = "material (soft shadow chunk active)"))
          : o.other++,
      console.error(`[render] shader error in ${materialLabel}: ${infoLog.trim().slice(0, 700)}`));
  };
  let r = new Scene(),
    a = new PerspectiveCamera(PLAYER_CONFIG.fov, 16 / 9, 0.08, 900);
  (a.layers.set(FACTION_PLAYER), (a.rotation.order = "YXZ"), r.add(a));
  let l = new PerspectiveCamera(PLAYER_CONFIG.viewFov, 16 / 9, 0.01, 10);
  l.layers.set(FACTION_ENEMY);
  let c = buildNoiseTexture(),
    u = buildSkyDome(c);
  r.add(u.mesh);
  let h = new DirectionalLight(SUN_CONFIG.color, SUN_CONFIG.intensity);
  ((h.name = "sun"), (h.castShadow = !0));
  let f = fitSunShadowCamera(
      h,
      new Vector3(-41, -0.2, -33),
      new Vector3(37, 32, 31),
      new Vector3(-41, -3, -64),
      new Vector3(72, 36, 34),
    ),
    p = () => Math.min(engineContext.quality.shadow || 2048, n.capabilities.maxTextureSize);
  (h.shadow.mapSize.set(p(), p()),
    (h.shadow.bias = -12e-5),
    (h.shadow.normalBias = 0.02),
    (h.shadow.radius = 1),
    (h.shadow.autoUpdate = !0),
    r.add(h, h.target));
  let d = !1;
  try {
    d = patchSoftShadows(f, {
      taps: engineContext.quality.name === "low" ? 10 : 16,
      searchTaps: 8,
    });
  } catch (error) {
    console.warn("[render] soft shadows unavailable: " + error);
  }
  let v = 6,
    g = [];
  for (let index = 0; index < v; index++) {
    let F = new PointLight(16777215, 0, 12, 2);
    ((F.userData = { busy: !1, ttl: 0, dur: 0, peak: 0, persistent: !1 }), r.add(F), g.push(F));
  }
  let x = {
      flash(position, color = 16763008, intensity = 30, distance = 10, duration = 0.06) {
        let light =
          g.find((light) => !light.userData.busy) ||
          g
            .filter((light) => !light.userData.persistent)
            .sort((light, comparison) => light.userData.ttl - comparison.userData.ttl)[0];
        light &&
          (light.position.copy(position),
          light.color.set(color),
          (light.distance = distance),
          (light.intensity = intensity),
          Object.assign(light.userData, {
            busy: !0,
            ttl: duration,
            dur: duration,
            peak: intensity,
            persistent: !1,
          }));
      },
      acquire() {
        let light = g.find((candidate) => !candidate.userData.busy);
        return light
          ? ((light.userData.busy = !0),
            (light.userData.persistent = !0),
            (light.intensity = 0),
            {
              light: light,
              release() {
                ((light.userData.busy = !1),
                  (light.userData.persistent = !1),
                  (light.intensity = 0));
              },
            })
          : null;
      },
      update(deltaTime) {
        for (let F of g) {
          let state = F.userData;
          state.busy &&
            !state.persistent &&
            ((state.ttl -= deltaTime),
            state.ttl <= 0
              ? ((state.busy = !1), (F.intensity = 0))
              : (F.intensity = state.peak * (state.ttl / state.dur)));
        }
      },
    },
    y = null;
  try {
    ((y = buildEnvironmentCapture(n, u)),
      (r.environment = y.texture),
      (r.environmentIntensity = ENVIRONMENT_INTENSITY));
  } catch (error) {
    console.error("[render] environment capture failed: " + ((error && error.stack) || error));
  }
  let b = new DepthTexture(4, 4);
  ((b.type = UnsignedIntType), (b.minFilter = b.magFilter = NearestFilter));
  let m = new WebGLRenderTarget(4, 4, {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: !0,
      stencilBuffer: !1,
      depthTexture: b,
      samples: engineContext.quality.msaa | 0,
      generateMipmaps: !1,
    }),
    A = null,
    _ = e.post !== "0";
  if (
    (e.ao === "0" && (engineContext.quality.ao = !1),
    e.vol === "0" && (engineContext.quality.volSteps = 0),
    e.bloom === "0" && (engineContext.quality.bloom = !1),
    e.mb === "1" && (engineContext.quality.motionBlur = !0),
    _)
  )
    try {
      A = buildPostPipeline(n, engineContext, { noiseTex: c });
    } catch (error) {
      ((_ = !1),
        console.error(
          "[render] post chain failed to initialise, using forward fallback: " +
            ((error && error.stack) || error),
        ));
    }
  let M = !!(e.shot || e.show),
    E = !1,
    w = { t: 99, power: 0, value: 0 };
  engineContext.events &&
    engineContext.events.on &&
    engineContext.events.on("thunder", (payload) => {
      ((w.t = 0), (w.power = Math.min(1, (payload && payload.intensity) || 0.6)));
      let F = Math.PI * (0.55 + Math.random() * 0.9);
      u.material.uniforms.uFlashDir.value
        .set(Math.cos(F), 0.35 + Math.random() * 0.3, Math.sin(F) * (Math.random() < 0.5 ? -1 : 1))
        .normalize();
    });
  let S = {
    scale: 1,
    enabled: !(e.shot || e.show || e.dynres === "0"),
    acc: 0,
    n: 0,
    settle: 3.5,
    upWait: 4,
    upDelay: 4,
  };
  function updateDynamicResolution(deltaMs) {
    if (!S.enabled || !_ || deltaMs > 1500) return;
    if (((S.settle -= deltaMs / 1e3), (S.upWait -= deltaMs / 1e3), S.settle > 0)) {
      ((S.acc = 0), (S.n = 0));
      return;
    }
    if (((S.acc += deltaMs), S.n++, S.n < 45 && S.acc < 900)) return;
    let F = S.acc / S.n;
    ((S.acc = 0), (S.n = 0));
    let X = S.scale;
    if (
      (F > 21.5 && X > 0.6
        ? ((X = F > 45 ? 0.6 : Math.max(0.6, X - (F > 30 ? 0.2 : 0.1))),
          (S.upDelay = Math.min(60, S.upDelay * 2)),
          (S.upWait = S.upDelay))
        : F < 17.4 && X < 1 && S.upWait <= 0
          ? ((X = Math.min(1, X + 0.1)), (S.upWait = 2))
          : F < 17.4 && X >= 1 && (S.upDelay = 4),
      (X = Math.round(X * 10) / 10),
      X <= 0.6 && F > 26)
    ) {
      S.floorHits = (S.floorHits || 0) + 1;
      let lowerQualityName = { ultra: "high", high: "medium", medium: "low" }[
        engineContext.quality.name
      ];
      if (S.floorHits >= 2 && lowerQualityName && QUALITY_PRESETS[lowerQualityName]) {
        ((S.floorHits = 0),
          (S.scale = 0.8),
          (S.settle = 2),
          (S.upDelay = 4),
          console.log(
            "[render] frame time " +
              F.toFixed(0) +
              " ms at minimum scale: dropping quality to " +
              lowerQualityName,
          ));
        try {
          (N.setQuality({ ...QUALITY_PRESETS[lowerQualityName] }),
            engineContext.events.emit("quality:auto", { name: lowerQualityName }));
        } catch {}
        return;
      }
    } else S.floorHits = 0;
    X !== S.scale && ((S.scale = X), (S.settle = 1), N.resize());
  }
  let H = [],
    O = {},
    q = (errorKey, message) => {
      O[errorKey] || ((O[errorKey] = 1), console.error(message));
    },
    U = { calls: 0, tris: 0 },
    T = 0,
    D = 0;
  function syncPlanarReflectionCamera() {
    (a.updateMatrixWorld(!0),
      (l.matrixAutoUpdate = !1),
      (l.matrixWorldAutoUpdate = !1),
      l.matrixWorld.copy(a.matrixWorld),
      l.matrixWorldInverse.copy(l.matrixWorld).invert());
  }
  function applyToneMapping() {
    (n.toneMapping !== ACESFilmicToneMapping && (n.toneMapping = ACESFilmicToneMapping),
      (n.toneMappingExposure = 0.6 * N.exposure * (1 - Math.min(1, Math.max(0, N.post.fade)))),
      n.setRenderTarget(null),
      n.clear(),
      (n.shadowMap.needsUpdate = !0),
      n.render(r, a),
      n.clearDepth(),
      n.render(r, l));
  }
  function renderPlanarReflections(deltaTime) {
    (n.toneMapping !== NoToneMapping && (n.toneMapping = NoToneMapping),
      (n.toneMappingExposure = 1),
      n.setRenderTarget(m),
      n.clear(!0, !0, !1),
      (engineContext.quality.name === "ultra" || e.shot || (T & 1) === 0 || !h.shadow.map) &&
        (n.shadowMap.needsUpdate = !0),
      n.render(r, a),
      E && (A.copyDepth(b), n.setRenderTarget(m)),
      s.depthRange(0, 0.05));
    let F = r.environmentIntensity,
      X = r.environment,
      interiorBox =
        N.interiorEnv &&
        engineContext.level &&
        engineContext.level.interiorBoxes &&
        engineContext.level.interiorBoxes[0],
      insideInterior = !!(
        interiorBox &&
        interiorBox.min &&
        a.position.x > interiorBox.min.x &&
        a.position.x < interiorBox.max.x &&
        a.position.z > interiorBox.min.z &&
        a.position.z < interiorBox.max.z &&
        a.position.y < interiorBox.max.y
      );
    (insideInterior && (r.environment = N.interiorEnv),
      (r.environmentIntensity =
        F *
        (insideInterior ? INTERIOR_ENVIRONMENT_INTENSITY / ENVIRONMENT_INTENSITY : 1) *
        (N.viewFill || 1.35)));
    try {
      n.render(r, l);
    } finally {
      (s.depthRange(0, 1), (r.environmentIntensity = F), (r.environment = X));
    }
    if (
      (A.run({
        hdr: m,
        camera: a,
        sun: h,
        dt: deltaTime,
        post: N.post,
        exposure: N.exposure,
        time: engineContext.time ? engineContext.time.t : T / 60,
        fast: M,
        thunder: w.value,
      }),
      n.setRenderTarget(null),
      o.post)
    )
      throw new Error("a post shader failed to compile");
  }
  let N = {
      renderer: n,
      scene: r,
      camera: a,
      viewCamera: l,
      sun: h,
      sky: u.mesh,
      sunDir: SUN_CONFIG.dir.clone(),
      lightPool: x,
      post: {
        damage: 0,
        lowHealth: 0,
        ads: 0,
        flash: 0,
        fade: 0,
        saturation: 1,
        focusDist: 0,
        shake: 0,
        wet: 1,
      },
      exposure: 1,
      env: y ? y.texture : null,
      interiorEnv: null,
      resolution: new Vector2(4, 4),
      depthTextureIsLive: !1,
      tune: A ? A.TUNE : {},
      get advanced() {
        return _;
      },
      get autoExposure() {
        return A ? A.autoExposure : !1;
      },
      set autoExposure(enabled) {
        A && (A.autoExposure = !!enabled);
      },
      get depthTexture() {
        if (!A) return null;
        E = !0;
        try {
          return A.ensureDepthCopy();
        } catch {
          return null;
        }
      },
      addPrePass(prePass) {
        H.push(prePass);
      },
      renderWorld(camera, target) {
        let X = n.getRenderTarget(),
          previousShadowUpdate = n.shadowMap.needsUpdate,
          previousToneMapping = n.toneMapping,
          previousExposure = n.toneMappingExposure,
          layersMask = camera.layers.mask;
        (camera.layers.disable(FACTION_ENEMY),
          (n.shadowMap.needsUpdate = !1),
          (n.toneMapping = NoToneMapping),
          (n.toneMappingExposure = 1));
        try {
          (n.setRenderTarget(target), n.clear(), n.render(r, camera));
        } finally {
          ((camera.layers.mask = layersMask),
            n.setRenderTarget(X),
            (n.shadowMap.needsUpdate = previousShadowUpdate),
            (n.toneMapping = previousToneMapping),
            (n.toneMappingExposure = previousExposure));
        }
      },
      async onLevelReady() {
        n.shadowMap.needsUpdate = !0;
        try {
          updateInteriorLighting();
        } catch (error) {
          console.error("[render] interior probe failed: " + ((error && error.stack) || error));
        }
        try {
          if ((_ && n.setRenderTarget(m), await n.compileAsync(r, a), N.interiorEnv)) {
            let previousEnvironment = r.environment;
            r.environment = N.interiorEnv;
            try {
              n.compile(r, l);
            } finally {
              r.environment = previousEnvironment;
            }
          }
        } catch {}
        (n.setRenderTarget(null), (S.settle = 3.5), (S.acc = 0), (S.n = 0));
      },
      setQuality(quality) {
        engineContext.quality = quality;
        let shadowMapSize = p();
        h.shadow.mapSize.x !== shadowMapSize &&
          (h.shadow.mapSize.set(shadowMapSize, shadowMapSize),
          h.shadow.map && (h.shadow.map.dispose(), (h.shadow.map = null)));
        let X = quality.msaa | 0;
        (m.samples !== X && ((m.samples = X), m.dispose()), A && A.applyQuality(), N.resize());
      },
      resize() {
        let width = Math.max(2, t.clientWidth || window.innerWidth),
          height = Math.max(2, t.clientHeight || window.innerHeight),
          pixelRatio = Math.min(window.devicePixelRatio || 1, 2),
          qualityScale = engineContext.quality.scale || 1;
        if (_) {
          (n.setPixelRatio(pixelRatio), n.setSize(width, height, !1));
          let renderScale = qualityScale * S.scale,
            pixelBudget =
              { low: 1e6, medium: 15e5, high: 23e5, ultra: 37e5 }[engineContext.quality.name] ||
              23e5,
            pixelCount = width * pixelRatio * height * pixelRatio * renderScale * renderScale;
          pixelCount > pixelBudget && (renderScale *= Math.sqrt(pixelBudget / pixelCount));
          let renderWidth = Math.max(16, Math.round(width * pixelRatio * renderScale)),
            renderHeight = Math.max(16, Math.round(height * pixelRatio * renderScale));
          (m.setSize(renderWidth, renderHeight),
            (b.image.width !== renderWidth || b.image.height !== renderHeight) &&
              ((b.image.width = renderWidth),
              (b.image.height = renderHeight),
              (b.needsUpdate = !0)),
            A && A.resize(renderWidth, renderHeight),
            N.resolution.set(renderWidth, renderHeight));
        } else
          (n.setPixelRatio(pixelRatio * qualityScale),
            n.setSize(width, height, !1),
            N.resolution.set(
              Math.round(width * pixelRatio * qualityScale),
              Math.round(height * pixelRatio * qualityScale),
            ));
        ((a.aspect = l.aspect = width / height),
          a.updateProjectionMatrix(),
          l.updateProjectionMatrix());
      },
      frame(deltaTime) {
        let timestamp = performance.now();
        (D && updateDynamicResolution(timestamp - D),
          (D = timestamp),
          T++,
          n.info.reset(),
          x.update(deltaTime));
        let elapsed = engineContext.time ? engineContext.time.t : T / 60;
        ((u.material.uniforms.uTime.value = elapsed),
          (w.t += deltaTime),
          (w.value =
            w.t < 0.9
              ? w.power *
                Math.exp(-w.t * 5) *
                (0.55 + 0.45 * Math.sin(w.t * 47) * Math.sin(w.t * 13 + 1)) *
                0.35
              : 0),
          (u.material.uniforms.uFlash.value = Math.max(0, w.value)),
          syncPlanarReflectionCamera());
        for (let prePass of H)
          try {
            prePass(n, r, a);
          } catch (error) {
            q("pre", "[render] pre-pass threw: " + ((error && error.stack) || error));
          }
        if (_)
          try {
            renderPlanarReflections(deltaTime);
          } catch (error) {
            _ = !1;
            try {
              (s.depthRange(0, 1), n.setRenderTarget(null));
            } catch {}
            (console.error(
              "[render] advanced pipeline disabled, falling back to forward rendering: " +
                ((error && error.stack) || error),
            ),
              N.resize());
          }
        (_ || applyToneMapping(),
          (U = { calls: n.info.render.calls, tris: n.info.render.triangles }));
      },
      stats() {
        let info = n.info;
        return {
          calls: U.calls,
          tris: U.tris,
          geos: info.memory.geometries,
          tex: info.memory.textures,
          programs: info.programs ? info.programs.length : 0,
          res: [N.resolution.x, N.resolution.y],
          scale: S.scale,
          advanced: _,
          softShadows: d,
          adapt: A && e.shot ? A.readAdapt() : void 0,
        };
      },
    },
    Q = null;
  function updateInteriorLighting() {
    let interiorBoxes = engineContext.level && engineContext.level.interiorBoxes;
    if (!interiorBoxes || !interiorBoxes.length) return;
    let firstBox = interiorBoxes[0],
      centerX = (firstBox.min.x + firstBox.max.x) / 2,
      centerZ = (firstBox.min.z + firstBox.max.z) / 2,
      probeY = firstBox.min.y + Math.min(2.4, (firstBox.max.y - firstBox.min.y) * 0.4);
    if (!Q) {
      let cubeRenderTarget = new WebGLCubeRenderTarget(128, {
        type: HalfFloatType,
        generateMipmaps: !1,
      });
      ((Q = {
        cubeRT: cubeRenderTarget,
        cam: new CubeCamera(0.15, 300, cubeRenderTarget),
        pmrem: new PMREMGenerator(n),
        out: null,
      }),
        Q.cam.layers.set(FACTION_PLAYER));
    }
    (Q.cam.position.set(centerX, probeY, centerZ), Q.cam.updateMatrixWorld(!0));
    let previousToneMapping = n.toneMapping;
    ((n.toneMapping = NoToneMapping),
      (u.material.uniforms.uEnv.value = 1),
      (n.shadowMap.needsUpdate = !0));
    try {
      Q.cam.update(n, r);
    } finally {
      ((u.material.uniforms.uEnv.value = 0),
        (n.toneMapping = previousToneMapping),
        n.setRenderTarget(null));
    }
    (Q.out && Q.out.dispose(),
      (Q.out = Q.pmrem.fromCubemap(Q.cubeRT.texture)),
      (N.interiorEnv = Q.out.texture));
    let assignedCount = 0,
      processedMaterials = new Set();
    (r.traverse((object) => {
      let materials = /** @type {any} */ (object).material
        ? Array.isArray(/** @type {any} */ (object).material)
          ? /** @type {any} */ (object).material
          : [/** @type {any} */ (object).material]
        : null;
      if (materials)
        for (let material of materials)
          !material ||
            processedMaterials.has(material) ||
            !material.userData ||
            material.userData.interior !== !0 ||
            !("envMap" in material) ||
            (processedMaterials.add(material),
            (material.envMap = N.interiorEnv),
            material.userData.keepEnvIntensity ||
              (material.envMapIntensity = INTERIOR_ENVIRONMENT_INTENSITY),
            (material.needsUpdate = !0),
            assignedCount++);
    }),
      assignedCount &&
        console.log(`[render] interior probe assigned to ${assignedCount} material(s)`));
  }
  ((N.captureInteriorProbe = updateInteriorLighting),
    N.resize(),
    window.addEventListener("resize", () => N.resize()));
  try {
    let fallbackMaterial = new MeshStandardMaterial({ color: 8421504 }),
      testMesh = new Mesh(new BoxGeometry(1, 1, 1), fallbackMaterial);
    ((testMesh.castShadow = testMesh.receiveShadow = !0),
      testMesh.position.set(0, 0.5, -3),
      r.add(testMesh));
    let selfTest = () => {
      (syncPlanarReflectionCamera(), _ ? renderPlanarReflections(0.016) : applyToneMapping());
    };
    try {
      selfTest();
    } catch (error) {
      _ &&
        ((_ = !1),
        console.error(
          "[render] advanced pipeline failed its self test, using forward fallback: " +
            ((error && error.message) || error),
        ));
    }
    if (o.shadow && d) {
      (restoreShadowChunk(),
        (d = !1),
        (o.shadow = !1),
        (n.shadowMap.type = PCFSoftShadowMap),
        (h.shadow.radius = 2),
        fallbackMaterial.dispose(),
        (testMesh.material = new MeshStandardMaterial({ color: 8421505 })),
        console.warn("[render] soft shadow chunk rejected by the driver, using stock PCF"));
      try {
        selfTest();
      } catch {
        _ = !1;
      }
    }
    if (
      (o.sky && console.error("[render] sky shader failed to compile"),
      r.remove(testMesh),
      testMesh.geometry.dispose(),
      fallbackMaterial.dispose(),
      testMesh.material.dispose(),
      !_)
    ) {
      try {
        (s.depthRange(0, 1), n.setRenderTarget(null));
      } catch {}
      N.resize();
    }
    T = 0;
  } catch (error) {
    console.error("[render] self test threw: " + ((error && error.stack) || error));
  }
  return N;
}
function buildRenderShowcase(engineContext) {
  let e = new Group();
  e.name = "render-showcase";
  let t = (h) => (e.add(h), h),
    n = new SphereGeometry(0.42, 48, 24);
  for (let h = 0; h < 2; h++)
    for (let f = 0; f < 7; f++) {
      let p = new MeshStandardMaterial({
          color: h ? 12170408 : 8006172,
          roughness: 0.06 + f * 0.15,
          metalness: h ? 1 : 0,
        }),
        d = new Mesh(n, p);
      (d.position.set(-3.6 + f * 1.2, 0.42 + h * 1.05, h * -1.1),
        (d.castShadow = d.receiveShadow = !0),
        t(d));
    }
  /** @type {[string, number, number, number, number, number][]} */
  let s = [
    ["paint_orange", -5.2, 1.4, 1.3, 1.2, 2.2],
    ["steel_worn", 4.6, 1, 0.9, 1, 1.6],
    ["paint_teal", 5.6, 0.6, 2.4, 0.9, 3.6],
    ["concrete", -2.2, 0.5, 0.5, 2.6, 3.2],
  ];
  for (let [h, f, p, d, v, g] of s) {
    let x = createMeshWithShadows(
      createBoxBevelGeometry(p, d, v, 0.03, "bottom"),
      engineContext.mats.get(h),
    );
    (x.position.set(f, 0, g), (x.rotation.y = f * 0.2), t(x));
  }
  for (let h = 0; h < 5; h++) {
    let f = createMeshWithShadows(
      createBoxBevelGeometry(0.5, 0.5, 0.5, 0.02, "bottom"),
      engineContext.mats.get("wood_pallet"),
    );
    (f.position.set(0.5 + h * 0.52, 0, 3.4 + (h % 2) * 0.04), t(f));
  }
  {
    let h = createMeshWithShadows(
      createBoxBevelGeometry(0.5, 0.5, 0.5, 0.02, "bottom"),
      engineContext.mats.get("wood_pallet"),
    );
    (h.position.set(1.3, 0.5, 3.42), (h.rotation.y = 0.3), t(h));
  }
  let o = engineContext.mats.get("concrete_dirty"),
    r = 9,
    a = 7.5,
    l = [
      [-14, -5.2],
      [-4.7, -1.6],
      [-1.1, 1.9],
      [2.4, 5.6],
      [6.3, 14],
    ];
  for (let [h, f] of l) {
    let p = createMeshWithShadows(createBoxGeometry(0.4, a, f - h, "bottom"), o);
    (p.position.set(r, 0, (h + f) / 2), t(p));
  }
  {
    let h = createMeshWithShadows(createBoxGeometry(0.4, 1.2, 28, "bottom"), o);
    (h.position.set(r, a, 0), t(h));
  }
  let c = [
    [-12, 0, -9, 6, 4, 0.3],
    [-12, 0, -3, 6, 4, 0.3],
    [-15, 0, -6, 0.3, 4, 6.3],
    [-12, 4, -6, 6.6, 0.3, 6.6],
  ];
  for (let [h, f, p, d, v, g] of c) {
    let x = createMeshWithShadows(
      createBoxGeometry(d, v, g, "bottom"),
      engineContext.mats.get("steel_dark"),
    );
    (x.position.set(h, f, p), t(x));
  }
  {
    let h = new Mesh(createBoxGeometry(2.4, 0.06, 0.06), engineContext.mats.emissive(16756832, 14));
    (h.position.set(-12, 3.6, -6), t(h));
  }
  {
    let h = new Mesh(new SphereGeometry(0.06, 12, 8), engineContext.mats.emissive(16726560, 30));
    (h.position.set(4.6, 1.02, 1.6), t(h));
  }
  return (
    engineContext.scene.add(e),
    {
      cam: [-8.5, 1.7, 4.2],
      target: [3, 1.5, 0.4],
      update: () => {
        let h = engineContext.render.post,
          f = Math.round(engineContext.camera.position.y * 1e3) % 10;
        ((h.damage = f === 1 ? 0.8 : 0),
          (h.lowHealth = f === 2 ? 0.85 : 0),
          (h.ads = f === 3 ? 1 : 0),
          (h.flash = f === 4 ? 0.35 : 0),
          (h.fade = f === 5 ? 0.5 : 0));
      },
    }
  );
}

// 语义化主别名与导出
export const createSkyDome = buildSkyDome;
export const captureEnvironmentMap = buildEnvironmentCapture;
export const setupDirectionalSunLight = fitSunShadowCamera;
export const injectSoftShadows = patchSoftShadows;
export const createPostProcessingPipeline = buildPostPipeline;
export const createRenderSystem = buildRenderSystem;
export const showcaseRender = buildRenderShowcase;

export const create = buildRenderSystem;
export const showcase = buildRenderShowcase;
export const RenderModule = {
  create: buildRenderSystem,
  showcase: buildRenderShowcase,
};
export { RenderModule as Vg };

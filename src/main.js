/**
 * @file src/main.js
 * @description 《几猫国产3A大作》主自举入口与运行时驱动循环 (Master Entry & RAF Main Loop)
 *
 * 【系统职责】
 * 1. 引擎核心自举 (Engine Bootstrap)：解析 URL 参数（跑分模式、Showcase、画质、视口）、装配全局上下文。
 * 2. 异步子系统依赖注入与拓扑流水线：
 *    - Render（3A HDR 渲染器、双相机视模分层、软阴影与环境探针）
 *    - Materials（136 套 GPU MRT 物理材质、Canvas 2D 标贴图集）
 *    - Physics（Slab-Method AABB 射线投射与空间划分）
 *    - Props（36 款工业道具装配工厂）
 *    - Level（港区四号泊位宏观场景与掩体布局）
 *    - Backdrop（岸桥起重机、万吨集装箱轮、撤离巡逻艇）
 *    - Ground（Gerstner 动态水面、沥青地面）
 *    - FX（GPU 实例化弹道、枪口焰、粒子池）
 *    - Audio（Web Audio 物理建模合成器与动态音轨）
 *    - Input / Player / Combat / Weapon / Enemies / HUD / Game
 * 3. 独立系统沙盒陈列室 (Showcase Sandbox Dispatcher)
 * 4. 实时基准测试监测 (Benchmark HUD) 与每秒 60 帧固定/变频 RAF 主循环驱动。
 */

import * as THREE from "three";
import {
  PLAYER_CONFIG,
  createEventBus,
  createSeededRandom,
  detectQualityPreset,
  STUBS,
} from "./constants.js";
import { createMeshWithShadows } from "./geo.js";
import { initI18n, t } from "./i18n.js";

// 导入全套解耦 ESM 核心系统
import * as render from "./render.js";
import * as materials from "./materials.js";
import * as physics from "./physics.js";
import * as props from "./props.js";
import * as level from "./level.js";
import * as backdrop from "./backdrop.js";
import * as ground from "./ground.js";
import * as fx from "./fx.js";
import * as audio from "./audio.js";
import * as input from "./input.js";
import * as player from "./player.js";
import * as combat from "./combat.js";
import * as weapon from "./weapon.js";
import * as enemies from "./enemies.js";
import * as hud from "./hud.js";
import * as game from "./game.js";
import * as debug from "./debug.js";

// 子系统别名与兼容导出对象提取
const materialModule = materials.qg || materials;
const levelModule = level.cv || level;
const backdropModule = backdrop.mv || backdrop;
const groundModule = ground.vv || ground;
const fxModule = fx.Sv || fx;
const weaponModule = weapon.Xv || weapon;
const enemiesModule = enemies.ex || enemies;
const propsModule = props.$g || props;
const renderModule = render.Vg || render;

/**
 * 独立系统展示厅沙盒注册表 (Showcase Modules Registry)
 */
const SHOWCASE_MODULES = {
  mats: materialModule,
  materials: materialModule,
  level: levelModule,
  backdrop: backdropModule,
  ground: groundModule,
  fx: fxModule,
  weapon: weaponModule,
  enemies: enemiesModule,
  props: propsModule,
  render: renderModule,
};

// 全局运行时诊断变量挂载 (Dev & Test Diagnostics)
window.__frames = 0;
window.__ready = false;
window.__fatal = null;
window.__errors = [];

// DOM 启动进度节点
const bootOverlayEl = document.getElementById("boot");
const bootMsgEl = document.getElementById("boot-msg");
const bootFillEl = document.getElementById("boot-fill");

/**
 * 弹出全屏严重错误提示
 * @param {Error|string} error
 */
function showFatalError(error) {
  const errMsg = String(error);
  window.__fatal = errMsg;
  console.error("[fatal]", error);
  let fatalEl = document.getElementById("fatal");
  if (!fatalEl) {
    fatalEl = document.createElement("div");
    fatalEl.id = "fatal";
    document.getElementById("app")?.appendChild(fatalEl);
  }
  fatalEl.textContent = t("boot.fatalPrefix") + errMsg;
}

// 捕获未处理的运行时异常
window.addEventListener("error", (event) => {
  window.__errors.push(String(event.message));
});

// 捕获未处理的 Promise Rejection 异步异常
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const errMsg = reason instanceof Error ? reason.stack || reason.message : String(reason);
  window.__errors.push(`[UnhandledRejection] ${errMsg}`);
});

// 重定向 console.error 进行异常追踪收集
const originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  try {
    window.__errors.push(
      args
        .map((arg) => (arg && arg.stack) || String(arg))
        .join(" ")
        .slice(0, 400),
    );
  } catch {}
  originalConsoleError(...args);
};

const yieldTick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * 更新开机引导进度条 UI
 * @param {string} message 提示文本
 * @param {number} progress 0.0 ~ 1.0 进度比例
 */
async function updateBootProgress(message, progress) {
  if (bootMsgEl) bootMsgEl.textContent = message;
  if (bootFillEl) bootFillEl.style.width = Math.round(progress * 100) + "%";
  await yieldTick();
}

/**
 * 创建展示模式专用的虚拟空输入控制器
 */
function createDummyInput() {
  const noop = () => {};
  return {
    move: { x: 0, y: 0 },
    look: { dx: 0, dy: 0 },
    fire: false,
    ads: false,
    sprint: false,
    crouch: false,
    locked: false,
    touch: false,
    sensitivity: 1,
    down: () => false,
    pressed: () => false,
    update: noop,
    endFrame: noop,
    requestLock: noop,
    exitLock: noop,
  };
}

/**
 * 创建展示模式专用的虚拟空玩家对象
 */
function createDummyPlayer() {
  return {
    pos: new THREE.Vector3(0, 0, 4),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    health: 100,
    maxHealth: 100,
    alive: true,
    onGround: true,
    sprinting: false,
    crouching: false,
    ads: 0,
    speed: 0,
    eye: new THREE.Vector3(0, PLAYER_CONFIG.eye, 4),
    forward: new THREE.Vector3(0, 0, -1),
    enabled: false,
    reset() {},
    damage() {},
    heal() {},
    addRecoil() {},
    addShake() {},
    update() {},
  };
}

/**
 * 跑分基准模式悬浮状态面板 (Benchmark Performance HUD)
 * @param {object} engineCtx 全局引擎上下文
 */
function createBenchmarkHUD(engineCtx) {
  const hudEl = document.createElement("pre");
  hudEl.id = "bench";
  hudEl.style.cssText = [
    "position:absolute",
    "left:12px",
    "top:12px",
    "z-index:90",
    "margin:0",
    "padding:10px 12px",
    'font:12px/1.45 "IBM Plex Mono",ui-monospace,monospace',
    "color:#d8f0d0",
    "background:rgba(0,0,0,0.72)",
    "white-space:pre-wrap",
    "max-width:min(560px,90vw)",
    "pointer-events:none",
  ].join(";");
  document.getElementById("app")?.appendChild(hudEl);

  let gpuRendererName = "unknown";
  try {
    const gl = engineCtx.renderer.getContext();
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    gpuRendererName = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
  } catch {}

  const cinematicPath =
    engineCtx.level.cinematicPath && engineCtx.level.cinematicPath.length >= 2
      ? engineCtx.level.cinematicPath
      : [
          { pos: [-32, 1.7, 6], look: [0, 2, 5] },
          { pos: [10, 1.7, 6], look: [30, 6, 0] },
        ];

  const frameTimes = [];
  let elapsedTime = 0;
  let lastReportTime = 0;
  const loopDuration = 30; // 航拍轨迹巡航周期 (秒)

  const posA = new THREE.Vector3();
  const posB = new THREE.Vector3();
  const lookA = new THREE.Vector3();
  const lookB = new THREE.Vector3();

  if (engineCtx.player) engineCtx.player.enabled = false;

  engineCtx.bench = {
    frame(dt) {
      elapsedTime += dt;
      const progress = ((elapsedTime / loopDuration) % 1) * (cinematicPath.length - 1);
      const segIndex = Math.min(cinematicPath.length - 2, Math.floor(progress));
      const segFraction = progress - segIndex;
      const smoothFraction = segFraction * segFraction * (3 - 2 * segFraction);

      posA.fromArray(cinematicPath[segIndex].pos);
      posB.fromArray(cinematicPath[segIndex + 1].pos);
      lookA.fromArray(cinematicPath[segIndex].look);
      lookB.fromArray(cinematicPath[segIndex + 1].look);

      engineCtx.camera.position.lerpVectors(posA, posB, smoothFraction);
      engineCtx.camera.lookAt(lookA.lerp(lookB, smoothFraction));

      if (elapsedTime > 2) frameTimes.push(dt * 1000);
      if (frameTimes.length > 3000) frameTimes.shift();

      if (elapsedTime - lastReportTime > 1 && frameTimes.length > 10) {
        lastReportTime = elapsedTime;
        const sorted = frameTimes.slice().sort((a, b) => a - b);
        const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        const median = sorted[sorted.length >> 1];
        const renderStats = engineCtx.render.stats ? engineCtx.render.stats() : {};
        const drawBufSize = engineCtx.renderer.getDrawingBufferSize(new THREE.Vector2());

        hudEl.textContent = [
          `${t("bench.title")}  t=${elapsedTime.toFixed(0)}s`,
          `GPU: ${gpuRendererName}`,
          `buffer ${drawBufSize.x}x${drawBufSize.y}  quality ${engineCtx.quality.name}  dpr ${window.devicePixelRatio}`,
          `frame ms avg ${avg.toFixed(1)}  median ${median.toFixed(1)}  p99 ${p99.toFixed(1)}  => ${(1000 / avg).toFixed(0)} fps`,
          `stats ${JSON.stringify(renderStats)}`,
          `errors ${window.__errors.length}${window.__errors.length ? `\n - ` + window.__errors.slice(0, 6).join(`\n - `) : ""}`,
        ].join("\n");
      }
    },
  };
}

/**
 * 引擎主自举与初始化流水线 (Master Bootstrap Pipeline)
 */
export async function bootstrapEngine() {
  // 1. 规范化解析 URL 启动参数 (智能兼容漏写问号的 /show=weapon 路径形式)
  let rawSearch = location.search;
  if (!rawSearch && location.pathname.includes("=")) {
    rawSearch = "?" + location.pathname.replace(/^\//, "");
  }
  const urlParams = Object.fromEntries(new URLSearchParams(rawSearch));
  initI18n(urlParams.lang);
  if (bootMsgEl) bootMsgEl.textContent = t("boot.sub");

  const isBenchmark = !!urlParams.bench || location.hash === "#bench";
  if (isBenchmark) {
    urlParams.noaudio = "1";
    urlParams.autostart = "1";
  }

  // 2. 组装核心全局上下文 (Engine Context)
  const engineCtx = /** @type {any} */ ({
    THREE,
    params: urlParams,
    events: createEventBus(),
    rng: createSeededRandom(+(urlParams.seed || 4207)),
    time: { t: 0, dt: 0, frame: 0, real: 0 },
    quality: detectQualityPreset(urlParams.q || (urlParams.shot ? "test" : "")),
  });
  window.__G = engineCtx;

  // 3. 检查是否进入独立沙盒陈列室 (Showcase)
  const showcaseMode = urlParams.show && SHOWCASE_MODULES[urlParams.show] ? urlParams.show : null;
  engineCtx.showcase = showcaseMode;

  // 相机手动校准闭包与全局 __setShot 统一分发器
  let forcedShotCamera = null;
  const shotSubscribers = new Set();

  function setShotCamera(cfg) {
    if (!cfg) return;
    if (cfg.cam) {
      const coords = String(cfg.cam).split(",").map(Number);
      forcedShotCamera = {
        pos: new THREE.Vector3(coords[0], coords[1], coords[2]),
        look: new THREE.Vector3(coords[3] ?? 0, coords[4] ?? 1, coords[5] ?? 0),
      };
    }
    if (cfg.cam === "") forcedShotCamera = null;
    if (cfg.fov) {
      engineCtx.camera.fov = +cfg.fov;
      engineCtx.camera.updateProjectionMatrix();
    }
    if (cfg.exposure) {
      engineCtx.render.exposure = +cfg.exposure;
    }
    for (const sub of shotSubscribers) {
      try {
        sub(cfg);
      } catch (err) {
        console.error("[setShot] subscriber threw:", err);
      }
    }
  }

  // 支持通过 window.__setShot 直接触发，并提供订阅方法
  window.__setShot = setShotCamera;
  window.__setShot.subscribe = (fn) => {
    shotSubscribers.add(fn);
    return () => shotSubscribers.delete(fn);
  };

  // 4. 模块异步加载包装器
  async function loadModule(moduleName, label, factoryFn, isCritical = false) {
    const startTime = performance.now();
    try {
      engineCtx[moduleName] = await factoryFn();
    } catch (err) {
      console.error(`[boot] module "${moduleName}" failed:`, err);
      if (isCritical || !STUBS[moduleName]) throw err;
      engineCtx[moduleName] = STUBS[moduleName]();
    }
    const elapsed = performance.now() - startTime;
    if (elapsed > 150) {
      console.log(`[boot] ${moduleName} ${elapsed.toFixed(0)}ms`);
    }
  }

  // 5. 按拓扑顺序依次异步拉起子系统
  await updateBootProgress(t("boot.step1"), 0.04);
  await loadModule("render", "render", () => render.create(engineCtx), true);
  engineCtx.renderer = engineCtx.render.renderer;
  engineCtx.scene = engineCtx.render.scene;
  engineCtx.camera = engineCtx.render.camera;
  engineCtx.viewCamera = engineCtx.render.viewCamera;

  await updateBootProgress(t("boot.step2"), 0.12);
  await loadModule("mats", "materials", () => materials.create(engineCtx));

  engineCtx.physics = physics.create(engineCtx);
  engineCtx.props = props.create(engineCtx);
  engineCtx.input = showcaseMode ? createDummyInput() : input.create(engineCtx);

  // 6. 分流初始化：独立沙盒 Showcase 模式 vs 主战役关卡模式
  if (showcaseMode) {
    // 沙盒模式：布置简易地面与虚拟桩
    const dummyGround = createMeshWithShadows(
      new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2),
      engineCtx.mats.get("concrete"),
      { cast: false },
    );
    engineCtx.scene.add(dummyGround);

    engineCtx.level = {
      stub: true,
      playerStart: { pos: new THREE.Vector3(0, 0, 4), yaw: 0 },
      objectives: [],
      enemySpawns: [],
      zones: [],
      interiorBoxes: [],
      cinematicPath: [],
      extraction: { pos: new THREE.Vector3(), radius: 2 },
      groundSurfaceAt: () => "concrete",
      update() {},
    };
    engineCtx.backdrop = STUBS.backdrop();
    engineCtx.ground = STUBS.ground();
    engineCtx.physics.build();

    if (showcaseMode === "fx") {
      await loadModule("fx", "fx", () => fx.create(engineCtx));
    } else {
      try {
        engineCtx.fx = await fx.create(engineCtx);
      } catch {
        engineCtx.fx = STUBS.fx();
      }
    }

    engineCtx.audio = STUBS.audio();
    engineCtx.hud = STUBS.hud();
    engineCtx.player = createDummyPlayer();
    engineCtx.combat = combat.create(engineCtx);
    engineCtx.weapon = STUBS.weapon();
    engineCtx.enemies = STUBS.enemies();
    engineCtx.game = { state: "showcase", update: () => false, start() {} };

    let scInfo = null;
    try {
      scInfo = await SHOWCASE_MODULES[showcaseMode].showcase(engineCtx);
    } catch (err) {
      showFatalError(`showcase "${showcaseMode}" threw: ${(err && err.stack) || err}`);
    }
    engineCtx.showcaseInfo = scInfo || {};
    if (scInfo && scInfo.cam) {
      setShotCamera({
        cam: [...scInfo.cam, ...(scInfo.target || [0, 1, 0])].join(","),
      });
    }
  } else {
    // 主战役模式：拉起完整世界
    await updateBootProgress(t("boot.step3"), 0.34);
    await loadModule("level", "level", () => level.create(engineCtx), true);

    await updateBootProgress(t("boot.step4"), 0.5);
    await loadModule("backdrop", "backdrop", () => backdrop.create(engineCtx));

    await updateBootProgress(t("boot.step5"), 0.58);
    await loadModule("ground", "ground", () => ground.create(engineCtx));
    if (engineCtx.ground.stub) {
      const fallbackGround = createMeshWithShadows(
        new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2),
        engineCtx.mats.get("asphalt"),
        { cast: false },
      );
      engineCtx.scene.add(fallbackGround);
    }

    engineCtx.physics.build();

    await updateBootProgress(t("boot.step6"), 0.66);
    await loadModule("fx", "fx", () => fx.create(engineCtx));

    await loadModule("audio", "audio", () =>
      urlParams.noaudio ? STUBS.audio() : audio.create(engineCtx),
    );

    engineCtx.player = player.create(engineCtx);
    engineCtx.combat = combat.create(engineCtx);

    await updateBootProgress(t("boot.step7"), 0.74);
    await loadModule("weapon", "weapon", () => weapon.create(engineCtx));

    await updateBootProgress(t("boot.step8"), 0.82);
    await loadModule("enemies", "enemies", () => enemies.create(engineCtx));
    await loadModule("hud", "hud", () => hud.create(engineCtx));

    engineCtx.game = game.create(engineCtx);
  }

  // 7. 首帧编译与着色器预热 (Shader Warm-up)
  await updateBootProgress(t("boot.step9"), 0.92);
  try {
    await engineCtx.render.onLevelReady();
  } catch (err) {
    console.error("[boot] render.onLevelReady failed:", err);
  }

  // 挂载运行时全局查询接口
  let currentFps = 0;
  window.__stats = () => ({
    ...(engineCtx.render.stats ? engineCtx.render.stats() : {}),
    fps: currentFps ? +(1 / currentFps).toFixed(1) : 0,
    state: engineCtx.game && engineCtx.game.state,
  });

  if (urlParams.cam) setShotCamera(urlParams);
  if (urlParams.fov) setShotCamera({ fov: urlParams.fov });

  if (!showcaseMode && (urlParams.shot || urlParams.autostart)) {
    try {
      engineCtx.game.start({ skipIntro: true });
    } catch (err) {
      console.error("[boot] game.start failed:", err);
    }
  }

  if (urlParams.noweapon && engineCtx.weapon.setVisible) {
    engineCtx.weapon.setVisible(false);
  }

  if (isBenchmark) {
    createBenchmarkHUD(engineCtx);
  }

  // 挂载开发者可视化调试套件 (Debug Suite)
  // 门禁：仅在开发模式 (import.meta.env?.DEV) 或显式带有 debug/dev URL 参数时启用
  const isDebugEnabled = Boolean(
    /** @type {any} */ (import.meta).env?.DEV ||
    urlParams.debug !== undefined ||
    urlParams.dev !== undefined,
  );
  if (isDebugEnabled) {
    engineCtx.debug = debug.create(engineCtx);
  } else {
    engineCtx.debug = {
      update() {},
      dispose() {},
      enabled: false,
    };
  }

  await updateBootProgress(t("boot.stepReady"), 1.0);
  bootOverlayEl?.classList.add("done");
  setTimeout(() => {
    if (bootOverlayEl) bootOverlayEl.hidden = true;
  }, 700);

  // 8. 启动主渲染与逻辑 RAF 驱动循环 (Main RAF Loop)
  let lastFrameTime = performance.now();
  let indoorTransition = 1;

  const updateSubsystem = (subsystemName, dt) => {
    const mod = engineCtx[subsystemName];
    if (mod && mod.update) {
      try {
        mod.update(dt);
      } catch (err) {
        if (!updateSubsystem.errors[subsystemName]) {
          updateSubsystem.errors[subsystemName] = true;
          console.error(`[loop] ${subsystemName}.update threw:`, err);
        }
      }
    }
  };
  updateSubsystem.errors = {};

  engineCtx.renderer.setAnimationLoop(() => {
    const now = performance.now();
    const rawDt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // 平滑帧时间计算 FPS
    currentFps = currentFps ? currentFps * 0.95 + rawDt * 0.05 : rawDt;
    let dt = Math.min(rawDt, 0.05);
    if (engineCtx.time.scale !== undefined) dt *= engineCtx.time.scale;
    if (urlParams.dt) dt = +urlParams.dt;

    engineCtx.time.dt = dt;
    engineCtx.time.t += dt;
    engineCtx.time.real = now / 1000;
    engineCtx.time.frame++;

    // 1. 输入轮询
    updateSubsystem("input", dt);

    // 2. 战局主逻辑更新
    let isGameActive = false;
    try {
      isGameActive =
        engineCtx.game.update(dt) !== false &&
        engineCtx.game.state !== "title" &&
        engineCtx.game.state !== "paused";
    } catch (err) {
      if (!updateSubsystem.errors.game) {
        updateSubsystem.errors.game = true;
        console.error("[loop] game.update threw:", err);
      }
    }

    if (showcaseMode) {
      if (engineCtx.showcaseInfo?.update) {
        try {
          engineCtx.showcaseInfo.update(dt);
        } catch (err) {
          if (!updateSubsystem.errors.sc) {
            updateSubsystem.errors.sc = true;
            console.error("[loop] showcase update threw:", err);
          }
        }
      }
    } else if (isGameActive) {
      updateSubsystem("player", dt);
      updateSubsystem("weapon", dt);
      updateSubsystem("enemies", dt);
    }

    // 3. 室内雨水湿润阻尼渐变
    if (engineCtx.weapon?.setWetness && engineCtx.level?.interiorBoxes?.[0]) {
      const box = engineCtx.level.interiorBoxes[0];
      const camPos = engineCtx.camera.position;
      const isInside =
        camPos.x > box.min.x &&
        camPos.x < box.max.x &&
        camPos.z > box.min.z &&
        camPos.z < box.max.z &&
        camPos.y < box.max.y;
      indoorTransition +=
        ((isInside ? 0.3 : 1.0) - indoorTransition) * Math.min(1, dt * (isInside ? 0.25 : 0.6));
      try {
        engineCtx.weapon.setWetness(indoorTransition);
      } catch {}
    }

    // 4. 环境与视听觉更新
    if (engineCtx.game.state !== "paused") {
      updateSubsystem("fx", dt);
      updateSubsystem("ground", dt);
      updateSubsystem("level", dt);
      updateSubsystem("backdrop", dt);
      updateSubsystem("mats", dt);
    }
    updateSubsystem("audio", dt);
    updateSubsystem("hud", dt);
    updateSubsystem("debug", dt);

    // 5. 调试相机位置强制锁定
    if (forcedShotCamera) {
      engineCtx.camera.position.copy(forcedShotCamera.pos);
      engineCtx.camera.lookAt(forcedShotCamera.look);
    }

    // 6. 跑分录制与每帧渲染执行
    if (engineCtx.bench) engineCtx.bench.frame(rawDt);
    try {
      engineCtx.render.frame(dt);
    } catch (err) {
      if (!updateSubsystem.errors.render) {
        updateSubsystem.errors.render = true;
        console.error("[loop] render.frame threw:", err);
      }
    }

    // 7. 帧尾清理
    if (engineCtx.input?.endFrame) {
      engineCtx.input.endFrame();
    }

    window.__frames++;
    if (window.__frames === 2) {
      window.__ready = true;
    }
  });
}

// 自动执行模块引导启动
bootstrapEngine().catch((err) => showFatalError((err && err.stack) || err));

export { bootstrapEngine as boot };

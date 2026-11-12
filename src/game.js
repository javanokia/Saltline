import * as THREE from "three";

const { Vector3 } = THREE;

import { Pi, Pr, Zn, sl, kn, Fo } from "./constants.js";

// ============================================================================
// 1. 本地偏好设置系统 (User Settings & Local Storage Persistence)
// ============================================================================

const SETTINGS_STORAGE_KEY = "saltline.settings.v1";

const DEFAULT_SETTINGS = {
  quality: "auto",
  sens: 1.0,
  invertY: false,
  volume: 0.8,
  fov: Pi.fov,
};

const QUALITY_OPTIONS = ["low", "medium", "high", "ultra"];

/**
 * 从 localStorage 读取玩家设置 (含合法性边界校验)
 */
function loadSettings() {
  const settings = { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "null");
    if (parsed && typeof parsed === "object") {
      if (parsed.quality === "auto" || QUALITY_OPTIONS.includes(parsed.quality)) {
        settings.quality = parsed.quality;
      }
      if (Number.isFinite(parsed.sens)) {
        settings.sens = Math.min(3.0, Math.max(0.2, parsed.sens));
      }
      settings.invertY = !!parsed.invertY;
      if (Number.isFinite(parsed.volume)) {
        settings.volume = Math.min(1.0, Math.max(0.0, parsed.volume));
      }
      if (Number.isFinite(parsed.fov)) {
        settings.fov = Math.min(95, Math.max(60, parsed.fov));
      }
    }
  } catch (err) {}
  return settings;
}

/**
 * 将玩家设置保存至 localStorage
 */
function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {}
}

// 键鼠操作说明 HTML 片段
const KEYBOARD_CONTROLS_HTML = `
  <dl class="keys">
    <div><dt>Move</dt><dd><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dd></div>
    <div><dt>Look</dt><dd>Mouse</dd></div>
    <div><dt>Fire</dt><dd>Left button</dd></div>
    <div><dt>Aim</dt><dd>Right button</dd></div>
    <div><dt>Reload</dt><dd><kbd>R</kbd></dd></div>
    <div><dt>Cut relay</dt><dd>Hold <kbd>E</kbd></dd></div>
    <div><dt>Jump</dt><dd><kbd>Space</kbd></dd></div>
    <div><dt>Sprint</dt><dd><kbd>Shift</kbd></dd></div>
    <div><dt>Crouch</dt><dd><kbd>C</kbd> or <kbd>Ctrl</kbd></dd></div>
    <div><dt>Melee</dt><dd><kbd>F</kbd></dd></div>
    <div><dt>Pause</dt><dd><kbd>Esc</kbd> or <kbd>P</kbd></dd></div>
  </dl>`;

// 触屏操作说明 HTML 片段
const TOUCH_CONTROLS_HTML = `
  <dl class="keys">
    <div><dt>Move</dt><dd>Left thumb, anywhere</dd></div>
    <div><dt>Look</dt><dd>Drag the right side</dd></div>
    <div><dt>Fire</dt><dd>Hold FIRE, drag to track</dd></div>
    <div><dt>Aim</dt><dd>AIM toggles</dd></div>
    <div><dt>Reload</dt><dd>RLD</dd></div>
    <div><dt>Jump</dt><dd>JUMP</dd></div>
    <div><dt>Cut relay</dt><dd>Hold USE at a relay</dd></div>
    <div><dt>Sprint</dt><dd>Push the stick fully forward</dd></div>
  </dl>`;

// ============================================================================
// 2. 菜单与模态面板控制器 (Menu & Modal Screens Controller)
// ============================================================================

/**
 * 创建全套游戏菜单系统 (标题页、暂停页、结算页、死亡页、设置与关于面板)
 * @param {object} ctx 全局引擎上下文
 * @param {object} callbacks 按钮动作回调
 */
function createMenu(ctx, callbacks) {
  const uiContainer = document.getElementById("ui");
  const userSettings = loadSettings();

  const menuContainer = document.createElement("div");
  menuContainer.className = "menu";
  menuContainer.dataset.screen = "none";
  menuContainer.innerHTML = `
    <div class="m-veil"></div>
    <div class="m-bars"><i></i><i></i></div>

    <section class="m-screen m-title" data-s="title" aria-label="Saltline">
      <div class="m-title-main">
        <div class="m-eyebrow"><span class="m-tag">B4</span><span>Port Authority Breach Unit</span><span class="m-dim">Saltline Terminal · 05:42</span></div>
        <h1 class="m-word">SALTLINE</h1>
        <p class="m-premise">The port’s security net has gone feral. Cut its three uplinks. Reach the boat.</p>
        <div class="m-actions">
          <button class="btn primary" data-act="deploy">Deploy</button>
          <button class="btn" data-act="settings">Settings</button>
          <button class="btn m-only-narrow" data-act="controls">Controls</button>
        </div>
        <p class="m-note">Every surface, machine and sound is generated in your browser. Nothing is downloaded.</p>
      </div>
      <aside class="m-legend" aria-label="Controls at a glance">
        <div><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span><span><kbd>Mouse</kbd> Look</span><span><kbd>LMB</kbd> Fire</span><span><kbd>RMB</kbd> Aim</span><span><kbd>R</kbd> Reload</span></div>
        <div><span><kbd>E</kbd> Cut relay</span><span><kbd>Space</kbd> Jump</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>C</kbd> Crouch</span><span><kbd>Esc</kbd> Pause</span></div>
        <div class="lg-touch"><em>Touch</em><span>Left thumb moves</span><span>Right thumb looks</span><span>Fire · Aim · Reload · Jump on screen</span></div>
      </aside>
    </section>

    <section class="m-screen m-card" data-s="paused" aria-label="Paused">
      <div class="m-k">Operation on hold</div>
      <h2 class="m-h">Paused</h2>
      <p class="m-line" data-f="lookmode"></p>
      <div class="m-actions col">
        <button class="btn primary" data-act="resume">Resume</button>
        <button class="btn" data-act="settings">Settings</button>
        <button class="btn" data-act="controls">Controls</button>
        <button class="btn" data-act="restart">Restart mission</button>
      </div>
    </section>

    <section class="m-screen m-card m-dead" data-s="dead" aria-label="Signal lost">
      <div class="m-k">Breacher down</div>
      <h2 class="m-h">Signal lost</h2>
      <dl class="m-stats"><div><dt>Time survived</dt><dd data-f="dead-time">00:00</dd></div><div><dt>Relays cut</dt><dd data-f="dead-relays">0/3</dd></div></dl>
      <div class="m-actions col"><button class="btn primary" data-act="retry">Retry</button></div>
    </section>

    <section class="m-screen m-card m-debrief" data-s="complete" aria-label="Debrief">
      <div class="m-k">Berth 4 · Debrief</div>
      <h2 class="m-h">Saltline is dark</h2>
      <div class="m-rating"><span>Rating</span><b data-f="rating">Clean</b></div>
      <dl class="m-stats">
        <div><dt>Time</dt><dd data-f="time">00:00</dd></div>
        <div><dt>Accuracy</dt><dd data-f="acc">0%</dd></div>
        <div><dt>Machines destroyed</dt><dd data-f="kills">0</dd></div>
        <div><dt>Retries</dt><dd data-f="retries">0</dd></div>
      </dl>
      <div class="m-actions col"><button class="btn primary" data-act="redeploy">Redeploy</button></div>
    </section>

    <div class="panel" role="dialog" aria-modal="true" aria-label="Settings and controls" tabindex="-1" hidden>
      <header class="panel-h">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" data-tab="settings" aria-selected="true">Settings</button>
          <button class="tab" role="tab" data-tab="controls" aria-selected="false">Controls</button>
        </div>
        <button class="btn small" data-act="close-panel">Close</button>
      </header>
      <div class="panel-b" data-pane="settings">
        <div class="row"><label id="l-q">Graphics quality</label>
          <div class="seg" role="group" aria-labelledby="l-q">${QUALITY_OPTIONS.map((q) => `<button data-q="${q}" aria-pressed="false">${q}</button>`).join("")}</div></div>
        <div class="row"><label for="s-sens">Mouse sensitivity</label><div class="slider"><input id="s-sens" type="range" min="0.2" max="3" step="0.05"><output data-o="sens"></output></div></div>
        <div class="row"><label id="l-inv">Invert Y</label><button class="toggle" data-act="invert" aria-labelledby="l-inv" aria-pressed="false"><i></i><span>Off</span></button></div>
        <div class="row"><label for="s-vol">Master volume</label><div class="slider"><input id="s-vol" type="range" min="0" max="100" step="1"><output data-o="vol"></output></div></div>
        <div class="row"><label for="s-fov">Field of view</label><div class="slider"><input id="s-fov" type="range" min="60" max="95" step="1"><output data-o="fov"></output></div></div>
        <div class="row" data-row="fs"><label id="l-fs">Display</label><button class="btn small" data-act="fullscreen" aria-labelledby="l-fs fs-t"><span id="fs-t">Enter fullscreen</span></button></div>
        <p class="panel-note" data-f="qnote"></p>
      </div>
      <div class="panel-b" data-pane="controls" hidden>
        <h3>Keyboard · Mouse</h3>${KEYBOARD_CONTROLS_HTML}
        <p class="panel-note">If the browser will not capture the mouse, hold a mouse button and drag to look (left also fires, right also aims). Arrow keys or <kbd>I</kbd><kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> turn, <kbd>Enter</kbd> fires.</p>
        <h3>Touch</h3>${TOUCH_CONTROLS_HTML}
        <h3>Gamepad</h3>
        <p class="panel-note">Sticks move and look · RT fire · LT aim · A jump · B crouch · X reload · Y cut relay · L3 sprint · Start pause.</p>
      </div>
    </div>

    <div class="loc-card" aria-hidden="true"><i></i><b>Saltline Terminal · Berth 4 · 05:42</b><span>Port Authority Breach Unit — one breacher, no backup</span></div>
  `;
  uiContainer.appendChild(menuContainer);

  const $ = (sel) => menuContainer.querySelector(sel);
  const $$ = (sel) => [...menuContainer.querySelectorAll(sel)];
  const panelEl = $(".panel");
  const locationCardEl = $(".loc-card");
  const fieldEl = (name) => menuContainer.querySelector(`[data-f="${name}"]`);

  const sliderSens = $("#s-sens");
  const sliderVol = $("#s-vol");
  const sliderFov = $("#s-fov");

  let currentScreenName = "none";
  let lastFocusedElement = null;

  /**
   * 应用设置至游戏各个子系统
   */
  function applySettings(key) {
    if ((!key || key === "sens") && ctx.input) {
      ctx.input.sensitivity = userSettings.sens;
    }
    if ((!key || key === "invertY") && ctx.input) {
      ctx.input.invertY = userSettings.invertY;
    }
    if (!key || key === "volume") {
      try {
        if (ctx.audio && ctx.audio.setVolume) ctx.audio.setVolume(userSettings.volume);
      } catch (e) {}
    }
    if ((!key || key === "fov") && ctx.player && ctx.player.setFov) {
      ctx.player.setFov(userSettings.fov);
    }
    if (
      key === "quality" ||
      (!key &&
        userSettings.quality !== "auto" &&
        !ctx.params.shot &&
        !ctx.params.q &&
        userSettings.quality !== (ctx.quality && ctx.quality.name))
    ) {
      const preset = Pr[userSettings.quality];
      if (preset) {
        try {
          if (ctx.render && ctx.render.setQuality) {
            ctx.render.setQuality({ ...preset });
          } else {
            ctx.quality = { ...preset };
          }
        } catch (e) {
          console.error("[game] setQuality failed", e);
        }
      }
    }
  }

  /**
   * 刷新设置面板中 UI 控件的值
   */
  function syncSettingsUI() {
    const activeQuality =
      userSettings.quality === "auto" ? ctx.quality && ctx.quality.name : userSettings.quality;
    for (const btn of $$(".seg button")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.q === activeQuality));
    }
    sliderSens.value = userSettings.sens;
    sliderVol.value = Math.round(userSettings.volume * 100);
    sliderFov.value = userSettings.fov;

    $('[data-o="sens"]').textContent = userSettings.sens.toFixed(2) + "×";
    $('[data-o="vol"]').textContent = Math.round(userSettings.volume * 100) + "%";
    $('[data-o="fov"]').textContent = Math.round(userSettings.fov) + "°";

    const invertBtn = $('[data-act="invert"]');
    invertBtn.setAttribute("aria-pressed", String(userSettings.invertY));
    invertBtn.querySelector("span").textContent = userSettings.invertY ? "On" : "Off";

    fieldEl("qnote").textContent =
      userSettings.quality === "auto"
        ? `Quality was picked for this device (${activeQuality || "default"}). Lower it if the frame rate struggles.`
        : "Quality changes apply at once; shadows and reflections may take a moment to rebuild.";
  }

  sliderSens.addEventListener("input", () => {
    userSettings.sens = +sliderSens.value;
    applySettings("sens");
    syncSettingsUI();
    saveSettings(userSettings);
  });

  sliderVol.addEventListener("input", () => {
    userSettings.volume = +sliderVol.value / 100;
    applySettings("volume");
    syncSettingsUI();
    saveSettings(userSettings);
  });

  sliderFov.addEventListener("input", () => {
    userSettings.fov = +sliderFov.value;
    applySettings("fov");
    syncSettingsUI();
    saveSettings(userSettings);
  });

  // 全屏模式控制
  const fsRow = $('[data-row="fs"]');
  const fsText = $("#fs-t");
  const getFullscreenEl = () =>
    document.fullscreenElement || document.webkitFullscreenElement || null;
  const appRoot = document.getElementById("app") || document.documentElement;

  if (
    !appRoot ||
    (!appRoot.requestFullscreen && !appRoot.webkitRequestFullscreen) ||
    document.fullscreenEnabled === false
  ) {
    fsRow.hidden = true;
  }

  function toggleFullscreen() {
    try {
      if (getFullscreenEl()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return;
      }
      const req = (appRoot.requestFullscreen || appRoot.webkitRequestFullscreen).call(appRoot);
      if (req && req.catch)
        req.catch(() => {
          fsText.textContent = "Fullscreen is not available here";
        });
    } catch (err) {
      fsText.textContent = "Fullscreen is not available here";
    }
  }

  const onFullscreenChange = () => {
    fsText.textContent = getFullscreenEl() ? "Exit fullscreen" : "Enter fullscreen";
  };
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);

  /**
   * 打开模态弹窗 (设置 / 操作说明 / 项目介绍)
   */
  function openPanel(tabName = "settings") {
    lastFocusedElement = document.activeElement;
    panelEl.hidden = false;
    menuContainer.classList.add("panel-open");
    switchTab(tabName);
    try {
      panelEl.focus({ preventScroll: true });
    } catch (e) {}
  }

  /**
   * 关闭模态弹窗
   */
  function closePanel() {
    if (panelEl.hidden) return false;
    panelEl.hidden = true;
    menuContainer.classList.remove("panel-open");
    if (
      lastFocusedElement &&
      lastFocusedElement.focus &&
      menuContainer.contains(lastFocusedElement)
    ) {
      lastFocusedElement.focus();
    } else {
      focusPrimaryButton();
    }
    return true;
  }

  function switchTab(tabName) {
    for (const tab of $$(".tab")) {
      tab.setAttribute("aria-selected", String(tab.dataset.tab === tabName));
    }
    for (const pane of $$(".panel-b")) {
      pane.hidden = pane.dataset.pane !== tabName;
    }
  }

  function focusPrimaryButton() {
    const primaryBtn = menuContainer.querySelector(
      `.m-screen[data-s="${currentScreenName}"] .btn.primary`,
    );
    if (primaryBtn) {
      try {
        primaryBtn.focus({ preventScroll: true });
      } catch (e) {}
    }
  }

  // 事件委托：按钮点击
  menuContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || !menuContainer.contains(btn)) return;

    ctx.events.emit("ui:click", {});

    if (btn.dataset.q) {
      userSettings.quality = btn.dataset.q;
      applySettings("quality");
      syncSettingsUI();
      saveSettings(userSettings);
      return;
    }

    if (btn.dataset.tab) {
      switchTab(btn.dataset.tab);
      return;
    }

    const action = btn.dataset.act;
    if (action === "about") openPanel("about");
    else if (action === "settings") openPanel("settings");
    else if (action === "controls") openPanel("controls");
    else if (action === "close-panel") closePanel();
    else if (action === "invert") {
      userSettings.invertY = !userSettings.invertY;
      applySettings("invertY");
      syncSettingsUI();
      saveSettings(userSettings);
    } else if (action === "fullscreen") {
      toggleFullscreen();
    } else if (action && callbacks[action]) {
      callbacks[action](e);
    }
  });

  menuContainer.addEventListener("mouseover", (e) => {
    const btn = e.target.closest("button");
    if (btn && e.relatedTarget && !btn.contains(e.relatedTarget)) {
      ctx.events.emit("ui:hover", {});
    }
  });

  menuContainer.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && !panelEl.hidden) {
      closePanel();
      e.stopPropagation();
      e.preventDefault();
    }
    if (e.code === "Tab" && !panelEl.hidden) {
      const focusable = [...panelEl.querySelectorAll("button, input")].filter(
        (el) => el.offsetParent !== null,
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  });

  const formatSeconds = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
  };

  const menuInterface = {
    root: menuContainer,
    settings: userSettings,
    fmtTime: formatSeconds,
    get screen() {
      return currentScreenName;
    },
    get panelOpen() {
      return !panelEl.hidden;
    },
    closePanel,
    show(screenName) {
      if (screenName !== currentScreenName) {
        currentScreenName = screenName;
        menuContainer.dataset.screen = screenName;
        closePanel();
        menuContainer.classList.toggle("open", screenName !== "none");
        if (screenName !== "none") {
          syncSettingsUI();
          setTimeout(focusPrimaryButton, 30);
        } else if (document.activeElement && menuContainer.contains(document.activeElement)) {
          document.activeElement.blur();
        }
      }
    },
    locationCard(show) {
      locationCardEl.classList.toggle("on", !!show);
    },
    setLookMode(text) {
      fieldEl("lookmode").textContent = text || "";
    },
    setDead({ time, relays, total }) {
      fieldEl("dead-time").textContent = formatSeconds(time);
      fieldEl("dead-relays").textContent = `${relays}/${total}`;
    },
    setDebrief({ time, accuracy, kills, retries, rating }) {
      fieldEl("time").textContent = formatSeconds(time);
      fieldEl("acc").textContent = accuracy == null ? "—" : Math.round(accuracy * 100) + "%";
      fieldEl("kills").textContent = String(kills);
      fieldEl("retries").textContent = String(retries);
      fieldEl("rating").textContent = rating;
    },
    applySettings,
  };

  syncSettingsUI();
  return menuInterface;
}

// ============================================================================
// 3. 游戏流程与数值平衡配置 (Game Flow & Balance Settings)
// ============================================================================

const GAME_CONFIG = {
  introSeconds: 3.5,
  retryIntroSeconds: 1.3,
  interactRange: 2.2, // 切断中继最大交互半径 (米)
  interactFacing: 0.45, // 交互朝向夹角余弦值
  cutSeconds: 2.4, // 持续按住 E 骇入切断中继所需时间 (秒)
  patrol: { gull: 2, hound: 1 },
  waves: [
    { gull: 3, hound: 1 }, // 破坏中继 1 后触发
    { gull: 3, hound: 2 }, // 破坏中继 2 后触发
    { gull: 4, hound: 3 }, // 破坏中继 3 后触发
  ],
  maxAlive: 9, // 场上同时存活敌人上限
  spawnStagger: 0.85, // 敌兵出怪时间间隔 (秒)
  spawnFar: 18, // 最小视线遮挡出怪距离 (米)
  pursuitEvery: 7,
  pursuitMinAlive: 4,
  pursuitExtra: 5,
  titleSpeed: 1.15,
  titleFov: 50,
};

const DIRECTIONS = [
  "NORTH",
  "NORTH-EAST",
  "EAST",
  "SOUTH-EAST",
  "SOUTH",
  "SOUTH-WEST",
  "WEST",
  "NORTH-WEST",
];

const RADIO_MESSAGES = {
  intro:
    "Breacher, this is Control. The Harbormaster holds the berth. Cut its three uplinks — yard, shed, quay.",
  contact: "It has seen you. Gulls fly, Hounds walk. Put them down.",
  cut: [
    "One relay dark. It felt that — machines inbound.",
    "Two dark. It is throwing everything it has left at you.",
  ],
  all: "All three dark. The boat is holding at the quay ladder, south end. Run.",
  low: "You are hit hard. Get behind steel and breathe.",
  done: "Breacher is aboard. Saltline is dark. Good work.",
};

// ============================================================================
// 4. 核心游戏状态机与行动管理器 (Master Game Manager)
// ============================================================================

/**
 * 创建核心游戏管理器 (Master GameManager Runtime)
 * @param {object} ctx 全局引擎上下文
 */
function createGameManager(ctx) {
  const postFx = (ctx.render && ctx.render.post) || {};
  const defaultSaturation = typeof postFx.saturation === "number" ? postFx.saturation : 1;
  const player = ctx.player;
  const level = ctx.level;
  const hud = ctx.hud;
  const input = ctx.input;

  const safeCall = (obj, method, ...args) => {
    try {
      if (obj && typeof obj[method] === "function") {
        return obj[method](...args);
      }
    } catch (err) {
      console.error(`[game] ${method} threw`, err);
    }
  };

  const menu = createMenu(ctx, {
    deploy() {
      safeCall(ctx.audio, "resume");
      input.requestLock();
      startRun({});
    },
    resume() {
      resumeGame(true);
    },
    restart() {
      safeCall(ctx.audio, "resume");
      input.requestLock();
      runState.retries++;
      startRun({ quick: true, keepRetries: true });
    },
    retry() {
      safeCall(ctx.audio, "resume");
      input.requestLock();
      runState.retries++;
      startRun({ quick: true, keepRetries: true });
    },
    redeploy() {
      safeCall(ctx.audio, "resume");
      input.requestLock();
      startRun({ quick: true });
    },
  });

  menu.applySettings();

  // 当前对局单局运行时状态
  const runState = {
    time: 0,
    retries: 0,
    relays: [],
    cut: 0,
    allCut: false,
    queue: [],
    waveHot: 0,
    alertT: 0,
    pursuitT: 0,
    pursuitLeft: 0,
    contactSaid: false,
    lowSaid: false,
    extractHint: 0,
    intensity: 0.15,
    used: new Map(),
  };

  let stateTimer = 0;
  let introDuration = GAME_CONFIG.introSeconds;
  let locCardShown = false;
  let introRadioSent = false;
  let pauseCooldown = 0;
  let isMouseCaptured = false;
  let lastLookModeDesc = "";
  let lookReminderTimer = 0.8;

  const tempPos1 = new Vector3();
  const tempPos2 = new Vector3();

  const getObjectives = () => (level && level.objectives) || [];

  const gameStateController = {
    state: "title",
    flow: GAME_CONFIG,
    run: runState,
    menus: menu,

    start(opts = {}) {
      startRun({ skipIntro: !!opts.skipIntro, quick: !!opts.quick });
    },
    pause() {
      pauseGame();
    },
    resume() {
      resumeGame(false);
    },
    update: updateGame,
    debugCut() {
      const targetRelay = runState.relays.find((r) => !r.cut);
      if (targetRelay) cutRelay(targetRelay);
    },
  };

  function setGameState(newState) {
    const prevState = gameStateController.state;
    if (newState !== prevState) {
      gameStateController.state = newState;
      stateTimer = 0;
      ctx.events.emit("game:state", { state: newState, prev: prevState });
    }
  }

  // 标题页漫游样条轨迹
  const cinematicSpline = {
    pos: [],
    look: [],
    len: 1,
    t: 0,
  };

  function initCinematicPath() {
    const rawPath = (level && level.cinematicPath) || [];
    cinematicSpline.pos = rawPath.map((p) => new Vector3(...p.pos));
    cinematicSpline.look = rawPath.map((p) => new Vector3(...p.look));

    if (cinematicSpline.pos.length < 2) {
      const pStart = (level && level.playerStart && level.playerStart.pos) || new Vector3();
      cinematicSpline.pos = [
        new Vector3(pStart.x, 2.2, pStart.z),
        new Vector3(pStart.x + 8, 2, pStart.z),
      ];
      cinematicSpline.look = [
        new Vector3(pStart.x + 30, 2.5, pStart.z - 2),
        new Vector3(pStart.x + 40, 3, pStart.z - 2),
      ];
    }

    let totalDist = 0;
    for (let i = 1; i < cinematicSpline.pos.length; i++) {
      totalDist += cinematicSpline.pos[i].distanceTo(cinematicSpline.pos[i - 1]);
    }
    cinematicSpline.len = Math.max(totalDist, 4);
  }

  // Catmull-Rom 样条插值计算
  function sampleSpline(points, progress, outVec) {
    const count = points.length - 1;
    const scaled = Zn(progress, 0, 1) * count;
    const index = Math.min(count - 1, Math.floor(scaled));
    const t = scaled - index;

    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(count, index + 2)];

    const t2 = t * t;
    const t3 = t2 * t;

    const interp = (v0, v1, v2, v3) =>
      0.5 *
      (2 * v1 +
        (-v0 + v2) * t +
        (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 +
        (-v0 + 3 * v1 - 3 * v2 + v3) * t3);

    outVec.set(
      interp(p0.x, p1.x, p2.x, p3.x),
      interp(p0.y, p1.y, p2.y, p3.y),
      interp(p0.z, p1.z, p2.z, p3.z),
    );
    return outVec;
  }

  /**
   * 标题页运镜动力学推进
   */
  function updateTitleCinematic(dt) {
    const cycleDuration = Math.max(26, cinematicSpline.len / GAME_CONFIG.titleSpeed);
    cinematicSpline.t += dt;
    if (cinematicSpline.t >= cycleDuration) {
      cinematicSpline.t = 0;
    }

    const normT = cinematicSpline.t / cycleDuration;
    const smoothedT = normT * normT * (3 - 2 * normT) * 0.25 + normT * 0.75;
    const cam = ctx.camera;
    const curTime = ctx.time.t;

    sampleSpline(cinematicSpline.pos, smoothedT, tempPos1);
    sampleSpline(cinematicSpline.look, smoothedT, tempPos2);

    tempPos1.x += Math.sin(curTime * 0.31) * 0.05;
    tempPos1.y += Math.sin(curTime * 0.43 + 1.7) * 0.035;
    tempPos1.z += Math.sin(curTime * 0.27 + 0.6) * 0.05;

    tempPos2.y += Math.sin(curTime * 0.19) * 0.12;
    tempPos2.x += Math.sin(curTime * 0.13 + 2) * 0.2;

    cam.position.copy(tempPos1);
    cam.lookAt(tempPos2);
    cam.rotation.z += Math.sin(curTime * 0.21) * 0.006;

    if (!ctx.params.fov && Math.abs(cam.fov - GAME_CONFIG.titleFov) > 0.01) {
      cam.fov = GAME_CONFIG.titleFov;
      cam.updateProjectionMatrix();
    }

    postFx.fade = Math.max(
      1 - sl(0, 1.8, cinematicSpline.t),
      sl(cycleDuration - 1.6, cycleDuration, cinematicSpline.t),
    );
  }

  /**
   * 重置单局所有游戏实体、状态与中继站
   */
  function resetRunState() {
    safeCall(ctx.enemies, "clear");
    safeCall(ctx.fx, "clear");
    safeCall(ctx.combat, "reset");
    safeCall(ctx.weapon, "reset");

    runState.time = 0;
    runState.cut = 0;
    runState.allCut = false;
    runState.queue.length = 0;
    runState.waveHot = 0;
    runState.alertT = 0;
    runState.pursuitT = 0;
    runState.pursuitLeft = 0;
    runState.contactSaid = false;
    runState.lowSaid = false;
    runState.extractHint = 0;
    runState.used.clear();

    runState.relays = getObjectives().map((obj, idx) => {
      const matchLetter = (/([a-z0-9])$/i.exec(String(obj.id || "")) || [
        0,
        String.fromCharCode(65 + idx),
      ])[1].toUpperCase();
      setRelayObjectState(obj, "live");
      return {
        o: obj,
        id: obj.id || "relay_" + idx,
        short: matchLetter,
        t: 0,
        cut: false,
        cutting: false,
      };
    });

    player.reset(level.playerStart);
    if (hud.reset) hud.reset();

    postFx.saturation = defaultSaturation;
    postFx.flash = 0;

    syncHudMarkers();
    if (hud.setRelays) hud.setRelays(0, runState.relays.length);
    spawnInitialPatrols();
  }

  function setRelayObjectState(relayObj, stateName) {
    try {
      const ud = relayObj && relayObj.object && relayObj.object.userData;
      if (ud && typeof ud.setState === "function") {
        ud.setState(stateName);
      }
    } catch (err) {
      console.error("[game] relay setState threw", err);
    }
  }

  function syncHudMarkers() {
    if (!hud.setMarkers) return;
    const markers = runState.relays
      .filter((r) => !r.cut)
      .map((r) => ({
        id: r.id,
        short: r.short,
        label: r.o.label || "Relay " + r.short,
        pos: r.o.pos,
        kind: "relay",
      }));

    if (runState.allCut && level.extraction) {
      markers.push({
        id: "extract",
        short: "EX",
        label: "Boat",
        pos: level.extraction.pos,
        kind: "extract",
      });
    }

    hud.setMarkers(markers);
  }

  /**
   * 启动单局出击
   */
  function startRun({ skipIntro = false, quick = false, keepRetries = false } = {}) {
    if (!keepRetries) runState.retries = 0;
    menu.show("none");
    menu.locationCard(false);
    safeCall(ctx.audio, "setPaused", false);
    resetRunState();
    safeCall(ctx.weapon, "setVisible", true);
    isMouseCaptured = false;

    if (skipIntro) {
      postFx.fade = 0;
      enterPlayingState();
      return;
    }

    introDuration = quick ? GAME_CONFIG.retryIntroSeconds : GAME_CONFIG.introSeconds;
    locCardShown = quick;
    introRadioSent = quick;
    player.enabled = false;
    if (input.setGameplay) input.setGameplay(false);
    hud.show(false);
    postFx.fade = 1;
    safeCall(ctx.audio, "setIntensity", 0.15);
    setGameState("intro");
  }

  function enterPlayingState() {
    player.enabled = true;
    hud.show(true);
    if (input.setGameplay) input.setGameplay(true);
    hud.setObjective(getObjectiveText());
    setGameState("playing");
    syncMouseLookNotice(true);
  }

  function getObjectiveText() {
    if (runState.allCut) return "Get to the boat";
    const remaining = runState.relays.length - runState.cut;
    return runState.cut === 0
      ? "Cut the three uplink relays"
      : remaining === 1
        ? "Cut the last relay"
        : `Cut the remaining ${remaining} relays`;
  }

  function syncMouseLookNotice(force) {
    const desc = input.describeMode ? input.describeMode() : "";
    menu.setLookMode(desc);
    if (!force && desc === lastLookModeDesc) return;
    lastLookModeDesc = desc;

    if (gameStateController.state === "playing") {
      if (
        input.mode === "drag" ||
        (input.mode === "lock" && !input.locked && !ctx.params.shot && !ctx.params.autostart)
      ) {
        hud.message(desc, input.mode === "drag" ? 7 : 4);
      } else if (input.locked) {
        hud.message("", 0);
      }
    }
  }

  if (input.onModeChange) {
    input.onModeChange(() => syncMouseLookNotice(false));
  }

  ctx.events.on("input:lock", (e) => {
    if (e.locked) {
      isMouseCaptured = true;
      syncMouseLookNotice(false);
      return;
    }
    if (gameStateController.state === "playing" && isMouseCaptured) {
      pauseGame();
    }
    isMouseCaptured = false;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && gameStateController.state === "playing") {
      pauseGame();
    }
  });

  addEventListener("keydown", (e) => {
    if (gameStateController.state !== "title" || menu.panelOpen) return;
    if (e.code !== "Enter" && e.code !== "NumpadEnter") return;
    if (e.target && e.target.tagName === "BUTTON") return;
    safeCall(ctx.audio, "resume");
    input.requestLock();
    startRun({});
  });

  function pauseGame() {
    if (gameStateController.state === "playing") {
      if (input.setGameplay) input.setGameplay(false);
      input.exitLock();
      safeCall(ctx.audio, "setPaused", true);
      menu.setLookMode(
        input.mode === "drag"
          ? input.describeMode()
          : input.touch
            ? ""
            : "Resume recaptures the mouse.",
      );
      hud.show(false);
      menu.show("paused");
      pauseCooldown = 0.35;
      setGameState("paused");
    }
  }

  function resumeGame(fromUserAction) {
    if (gameStateController.state === "paused") {
      menu.show("none");
      safeCall(ctx.audio, "setPaused", false);
      hud.show(true);
      if (input.setGameplay) input.setGameplay(true);
      isMouseCaptured = false;
      input.requestLock();
      setGameState("playing");
      setTimeout(() => syncMouseLookNotice(true), 700);
    }
  }

  // 敌军出怪点检索
  function getSpawns(type) {
    const requiredCategory = type === "gull" ? "air" : "ground";
    const allSpawns = (level && level.enemySpawns) || [];
    const matched = allSpawns.filter((sp) => sp.type === requiredCategory);
    return matched.length ? matched : allSpawns;
  }

  function pickSpawnPosition(
    type,
    { minDist = GAME_CONFIG.spawnFar, from = player.pos, preferHidden = true } = {},
  ) {
    const candidateSpawns = getSpawns(type);
    let bestSpawn = null;
    let highestScore = -1e9;

    for (const sp of candidateSpawns) {
      const dist = Math.hypot(sp.pos.x - from.x, sp.pos.z - from.z);
      let score = ctx.rng() * 1.5;
      score +=
        dist >= minDist ? 2 + Math.min(1, (dist - minDist) / 30) * 0.5 : -(minDist - dist) / 4;

      if (preferHidden) {
        tempPos1.copy(sp.pos);
        tempPos1.y += type === "gull" ? 0 : 1;
        let hasLineOfSight = true;
        try {
          hasLineOfSight = ctx.physics.lineOfSight(tempPos1, player.eye);
        } catch (e) {}
        if (!hasLineOfSight) score += 2.5;
      }

      const lastUsedTime = runState.used.get(sp);
      if (lastUsedTime !== undefined && runState.time - lastUsedTime < 6) {
        score -= 3;
      }

      if (score > highestScore) {
        highestScore = score;
        bestSpawn = sp;
      }
    }

    const finalPos = new Vector3();
    if (bestSpawn) {
      runState.used.set(bestSpawn, runState.time);
      finalPos.copy(bestSpawn.pos);

      const jitterX = (ctx.rng() - 0.5) * 2.4;
      const jitterZ = (ctx.rng() - 0.5) * 2.4;
      let isWalkable = type === "gull";

      try {
        if (!isWalkable)
          isWalkable = ctx.physics.nav.isWalkable(finalPos.x + jitterX, finalPos.z + jitterZ);
      } catch (e) {
        isWalkable = false;
      }

      if (isWalkable) {
        finalPos.x += jitterX;
        finalPos.z += jitterZ;
      }
    } else {
      const angle = ctx.rng() * Math.PI * 2;
      finalPos.set(
        Zn(from.x + Math.cos(angle) * 26, -34, 26),
        0,
        Zn(from.z + Math.sin(angle) * 26, -26, 24),
      );
    }

    if (type === "gull" && finalPos.y < 2.5) {
      finalPos.y = 6 + ctx.rng() * 3;
    }

    return finalPos;
  }

  function spawnEnemyUnit(type, pos, options) {
    try {
      return ctx.enemies.spawn(type, pos, options);
    } catch (err) {
      console.error("[game] enemies.spawn threw", err);
      return null;
    }
  }

  function spawnInitialPatrols() {
    const origin = (level.playerStart && level.playerStart.pos) || player.pos;
    for (const type of ["gull", "hound"]) {
      const count = GAME_CONFIG.patrol[type];
      for (let i = 0; i < count; i++) {
        spawnEnemyUnit(
          type,
          pickSpawnPosition(type, { minDist: 32, from: origin, preferHidden: true }),
          {
            state: "patrol",
          },
        );
      }
    }
  }

  function triggerWave(waveIndex) {
    const waveDef = GAME_CONFIG.waves[Math.min(waveIndex, GAME_CONFIG.waves.length - 1)];
    const units = [];

    for (let i = 0; i < waveDef.gull; i++) units.push("gull");
    for (let i = 0; i < waveDef.hound; i++)
      units.splice(Math.min(units.length, 1 + i * 2), 0, "hound");

    let sumDeltaX = 0;
    let sumDeltaZ = 0;

    units.forEach((unitType, idx) => {
      const pos = pickSpawnPosition(unitType);
      sumDeltaX += pos.x - player.pos.x;
      sumDeltaZ += pos.z - player.pos.z;
      runState.queue.push({
        type: unitType,
        pos,
        at: runState.time + 1.6 + idx * GAME_CONFIG.spawnStagger,
      });
    });

    runState.waveHot = 30;
    const avgBearingDeg = ((Math.atan2(sumDeltaX, -sumDeltaZ) * 180) / Math.PI + 360) % 360;
    const directionName = DIRECTIONS[Math.round(avgBearingDeg / 45) % 8];
    if (hud.warn) {
      hud.warn("Contact — " + directionName, 3.4);
    } else if (hud.warning) {
      hud.warning("Contact — " + directionName, 3.4);
    }
  }

  function processSpawnQueue(dt) {
    const aliveCount = getAliveEnemiesCount();
    for (let i = 0; i < runState.queue.length; i++) {
      const entry = runState.queue[i];
      if (runState.time < entry.at) continue;

      if (aliveCount >= GAME_CONFIG.maxAlive) {
        entry.at = runState.time + 1;
        continue;
      }

      if (
        !spawnEnemyUnit(entry.type, entry.pos, { state: "alert", target: player.pos }) &&
        !ctx.enemies.stub
      ) {
        entry.tries = (entry.tries || 0) + 1;
        if (entry.tries < 6) {
          entry.at = runState.time + 1.5;
          continue;
        }
      }

      runState.queue.splice(i, 1);
      safeCall(ctx.enemies, "alert", player.pos, 60);
      break;
    }

    // 全中继破坏后的持续追击波次
    if (runState.allCut) {
      runState.pursuitT -= dt;
      if (
        runState.pursuitT <= 0 &&
        runState.pursuitLeft > 0 &&
        !runState.queue.length &&
        aliveCount < GAME_CONFIG.pursuitMinAlive
      ) {
        runState.pursuitT = GAME_CONFIG.pursuitEvery;
        runState.pursuitLeft--;
        const nextType = ctx.rng() < 0.6 ? "gull" : "hound";
        runState.queue.push({
          type: nextType,
          pos: pickSpawnPosition(nextType),
          at: runState.time + 0.5,
        });
      }
      if (runState.pursuitT <= 0) {
        runState.pursuitT = 4;
        safeCall(ctx.enemies, "alert", player.pos, 90);
      }
    }
  }

  function getAliveEnemiesCount() {
    try {
      return ctx.enemies.aliveCount
        ? ctx.enemies.aliveCount()
        : ctx.enemies.list.filter((e) => e.alive).length;
    } catch (e) {
      return 0;
    }
  }

  function hasEnemyNear(distThreshold) {
    const list = (ctx.enemies && ctx.enemies.list) || [];
    for (let i = 0; i < list.length; i++) {
      const enemy = list[i];
      if (
        enemy &&
        enemy.alive &&
        enemy.pos &&
        Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.z - player.pos.z) < distThreshold
      ) {
        return true;
      }
    }
    return false;
  }

  ctx.events.on("enemy:alert", () => {
    runState.alertT = 10;
    if (gameStateController.state === "playing" && !runState.contactSaid) {
      runState.contactSaid = true;
      if (hud.radio) hud.radio(RADIO_MESSAGES.contact, 3.2);
    }
  });

  ctx.events.on("player:hit", () => {
    runState.alertT = Math.max(runState.alertT, 8);
  });

  ctx.events.on("player:rescued", () => {
    if (gameStateController.state === "playing") hud.message("Hauled out of the water", 2.5);
  });

  // 寻找玩家正前方可交互的未切断中继站
  function findInteractableRelay() {
    let closestRelay = null;
    let minDist = GAME_CONFIG.interactRange;

    for (const relay of runState.relays) {
      if (relay.cut) continue;
      const dx = relay.o.pos.x - player.pos.x;
      const dz = relay.o.pos.z - player.pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist > minDist) continue;
      if (Math.abs((relay.o.pos.y || 0) - player.pos.y) > 2.5) continue;

      if (dist > 0.9) {
        const forwardDot =
          (dx * player.forward.x + dz * player.forward.z) /
          (dist * Math.max(0.2, Math.hypot(player.forward.x, player.forward.z)));
        if (forwardDot < GAME_CONFIG.interactFacing) continue;
      }

      closestRelay = relay;
      minDist = dist;
    }

    return closestRelay;
  }

  // 交互逻辑与撤离点判定
  function updateInteractionAndExtraction(dt) {
    const targetRelay = player.alive ? findInteractableRelay() : null;

    for (const relay of runState.relays) {
      if (relay.cut) continue;

      if (relay === targetRelay && input.down("interact")) {
        if (!relay.cutting) {
          relay.cutting = true;
          setRelayObjectState(relay.o, "cutting");
        }
        relay.t += dt / GAME_CONFIG.cutSeconds;
        ctx.events.emit("objective:progress", { id: relay.id, t: Math.min(1, relay.t) });

        if (relay.t >= 1) {
          cutRelay(relay);
        }
      } else if (relay.t > 0) {
        relay.t = Math.max(0, relay.t - dt * 1.6);
        if (relay.cutting) {
          relay.cutting = false;
          setRelayObjectState(relay.o, "live");
          ctx.events.emit("objective:progress", { id: relay.id, t: 0 });
        }
      }
    }

    if (targetRelay && !targetRelay.cut) {
      if (hud.setPrompt) hud.setPrompt("Cut relay " + targetRelay.short, Fo(targetRelay.t));
    } else {
      if (hud.setPrompt) hud.setPrompt(null);
    }

    // 撤离点检测
    const evac = level.extraction;
    if (evac && evac.pos) {
      const evacDist = Math.hypot(evac.pos.x - player.pos.x, evac.pos.z - player.pos.z);
      const isInsideEvacZone =
        evacDist < (evac.radius || 2.5) && Math.abs(evac.pos.y - player.pos.y) < 3.5;

      if (isInsideEvacZone && runState.allCut && player.alive) {
        completeMission();
      } else if (isInsideEvacZone && !runState.allCut && runState.extractHint <= 0) {
        runState.extractHint = 8;
        hud.message("Relays still live — the boat will not wait under fire", 3.5);
      }
      runState.extractHint = Math.max(0, runState.extractHint - dt);
    }
  }

  function cutRelay(relay) {
    relay.cut = true;
    relay.cutting = false;
    relay.t = 1;
    runState.cut++;
    setRelayObjectState(relay.o, "cut");

    const totalRelays = runState.relays.length;
    ctx.events.emit("objective:done", { id: relay.id, index: runState.cut, total: totalRelays });
    if (hud.setRelays) hud.setRelays(runState.cut, totalRelays);
    if (hud.setPrompt) hud.setPrompt(null);
    player.addShake(0.18);

    triggerWave(runState.cut - 1);

    if (runState.cut >= totalRelays) {
      runState.allCut = true;
      runState.pursuitLeft = GAME_CONFIG.pursuitExtra;
      runState.pursuitT = 12;
      ctx.events.emit("objective:all", {});
      if (hud.radio) hud.radio(RADIO_MESSAGES.all, 4.5);
    } else {
      const radioIdx = Math.min(runState.cut - 1, RADIO_MESSAGES.cut.length - 1);
      if (hud.radio) hud.radio(RADIO_MESSAGES.cut[radioIdx], 3.6);
    }

    hud.setObjective(getObjectiveText());
    syncHudMarkers();
  }

  ctx.events.on("player:dead", () => {
    if (gameStateController.state !== "playing" && gameStateController.state !== "paused") return;
    if (input.setGameplay) input.setGameplay(false);
    input.exitLock();
    if (hud.setPrompt) hud.setPrompt(null);
    hud.show(false);
    if (hud.clearRadio) hud.clearRadio();
    menu.setDead({ time: runState.time, relays: runState.cut, total: runState.relays.length });
    setGameState("dead");
  });

  function completeMission() {
    player.invulnerable = true;
    player.enabled = false;
    if (input.setGameplay) input.setGameplay(false);
    input.exitLock();
    if (hud.setPrompt) hud.setPrompt(null);
    hud.show(false);
    ctx.events.emit("extraction:reached", {});
    if (hud.clearRadio) hud.clearRadio();
    if (hud.radio) hud.radio(RADIO_MESSAGES.done, 2.2);

    const stats = (ctx.combat && ctx.combat.stats) || { shots: 0, hits: 0, kills: 0 };
    const accuracy = stats.shots > 0 ? Zn(stats.hits / stats.shots, 0, 1) : null;

    // 评级计算
    const timeScore = runState.time < 270 ? 2 : runState.time < 400 ? 1 : 0;
    const accScore = accuracy >= 0.5 ? 2 : accuracy >= 0.3 ? 1 : 0;
    const retryScore = runState.retries === 0 ? 1 : 0;
    const totalScore = timeScore + accScore + retryScore;
    const ratingTitle = ["Messy", "Loud", "Steady", "Clean", "Sharp", "Surgical"][totalScore];

    menu.setDebrief({
      time: runState.time,
      accuracy,
      kills: stats.kills || 0,
      retries: runState.retries,
      rating: ratingTitle,
    });
    setGameState("complete");
  }

  /**
   * 游戏总循环更新
   */
  function updateGame(dt) {
    stateTimer += dt;

    switch (gameStateController.state) {
      case "title":
        updateTitleCinematic(dt);
        return false;

      case "intro":
        postFx.fade = 1 - sl(0.25, Math.min(introDuration, 2.6), stateTimer);
        if (!locCardShown && stateTimer > 0.5) {
          locCardShown = true;
          menu.locationCard(true);
        }
        if (!introRadioSent && stateTimer > 1.3) {
          introRadioSent = true;
          if (hud.radio) hud.radio(RADIO_MESSAGES.intro, 4.2);
        }
        if (stateTimer > introDuration - 0.6 && !hud.root?.classList.contains("on")) {
          hud.show(true);
          hud.setObjective(getObjectiveText());
        }
        if (stateTimer >= introDuration) {
          menu.locationCard(false);
          postFx.fade = 0;
          enterPlayingState();
        }
        return true;

      case "playing": {
        runState.time += dt;
        postFx.fade = kn(postFx.fade || 0, 0, 6, dt);
        if (pauseCooldown > 0) pauseCooldown -= dt;

        if (input.pressed("pause")) {
          pauseGame();
          return false;
        }

        updateInteractionAndExtraction(dt);
        if (gameStateController.state !== "playing") return true;

        processSpawnQueue(dt);
        runState.alertT = Math.max(0, runState.alertT - dt);
        runState.waveHot = Math.max(0, runState.waveHot - dt);

        const alive = getAliveEnemiesCount();
        if (
          runState.waveHot > 0 &&
          alive === 0 &&
          !runState.queue.length &&
          runState.waveHot < 24
        ) {
          runState.waveHot = 0;
        }

        const targetIntensity =
          runState.allCut || runState.queue.length || (runState.waveHot > 0 && alive > 0)
            ? 1.0
            : runState.alertT > 0 || (alive > 0 && hasEnemyNear(26))
              ? 0.6
              : 0.15;

        if (targetIntensity !== runState.intensity) {
          runState.intensity = targetIntensity;
          safeCall(ctx.audio, "setIntensity", targetIntensity);
        }

        if (
          input.mode === "lock" &&
          !input.locked &&
          !input.touch &&
          !ctx.params.shot &&
          !ctx.params.autostart
        ) {
          lookReminderTimer -= dt;
          if (lookReminderTimer <= 0) {
            lookReminderTimer = 2.0;
            hud.message(input.describeMode(), 2.6);
          }
        } else {
          lookReminderTimer = 0.8;
        }

        if (!runState.lowSaid && player.alive && player.health < 30) {
          runState.lowSaid = true;
          if (hud.radio) hud.radio(RADIO_MESSAGES.low, 3);
        }
        return true;
      }

      case "paused":
        if (pauseCooldown > 0) {
          pauseCooldown -= dt;
        } else if (input.pressed("pause")) {
          if (!menu.closePanel()) resumeGame(false);
        }
        return false;

      case "dead":
        postFx.saturation = kn(postFx.saturation ?? 1, 0.12, 2.2, dt);
        postFx.fade = kn(postFx.fade || 0, 0.55, 1.4, dt);
        if (stateTimer > 1.5 && menu.screen !== "dead") {
          menu.show("dead");
          safeCall(ctx.audio, "setIntensity", 0.15);
        }
        return true;

      case "complete":
        postFx.fade = kn(postFx.fade || 0, 0.72, 0.9, dt);
        postFx.saturation = kn(postFx.saturation ?? 1, defaultSaturation * 0.7, 1, dt);
        if (stateTimer > 3.3 && menu.screen !== "complete") {
          menu.show("complete");
          safeCall(ctx.audio, "setIntensity", 0.15);
        }
        return true;
    }

    return false;
  }

  initCinematicPath();
  player.enabled = false;
  hud.show(false);
  safeCall(ctx.weapon, "setVisible", false);
  if (input.setGameplay) input.setGameplay(false);
  safeCall(ctx.audio, "setIntensity", 0.15);

  if (!ctx.params.shot && !ctx.params.autostart) {
    menu.show("title");
  }

  return gameStateController;
}

export const create = createGameManager;
export { createGameManager as mM, GAME_CONFIG, DIRECTIONS, RADIO_MESSAGES, createMenu as pM };

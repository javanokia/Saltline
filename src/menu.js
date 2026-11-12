/**
 * @file src/menu.js
 * @description 游戏菜单与模态面板控制器 (Menu & Modal Screens Controller)
 *
 * 职责：
 * 1. 标题主菜单 (Title Screen)、暂停菜单 (Paused Screen)
 * 2. 阵亡结算 (Dead Screen)、任务完成简报 (Debrief Screen)
 * 3. 模态设置面板 (Graphics, Sensitivity, Invert Y, Volume, FOV, Language)
 * 4. 操作说明速查 (Keyboard, Mouse, Touch, Gamepad)
 * 5. 本地玩家设置持久化 (localStorage: saltline.settings.v1)
 */

import { Pi, Pr } from "./constants.js";
import { t, getLanguagePreference, setLanguage, onLanguageChange } from "./i18n.js";

// ============================================================================
// 1. 本地偏好设置系统 (User Settings & Local Storage Persistence)
// ============================================================================

export const SETTINGS_STORAGE_KEY = "saltline.settings.v1";

export const DEFAULT_SETTINGS = {
  lang: "auto",
  quality: "auto",
  sens: 1.0,
  invertY: false,
  volume: 0.8,
  fov: Pi.fov,
};

export const QUALITY_OPTIONS = ["low", "medium", "high", "ultra"];
export const LANG_OPTIONS = ["auto", "en", "zh"];

/**
 * 从 localStorage 读取玩家设置 (含合法性边界校验)
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function loadSettings() {
  const settings = { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "null");
    if (parsed && typeof parsed === "object") {
      if (parsed.lang && LANG_OPTIONS.includes(parsed.lang)) {
        settings.lang = parsed.lang;
      }
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
 * @param {object} settings
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {}
}

function getKeyboardControlsHTML() {
  return `
  <dl class="keys">
    <div><dt>${t("controls.kMove")}</dt><dd><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dd></div>
    <div><dt>${t("controls.kLook")}</dt><dd>${t("controls.kLookDesc")}</dd></div>
    <div><dt>${t("controls.kFire")}</dt><dd>${t("controls.kFireDesc")}</dd></div>
    <div><dt>${t("controls.kAim")}</dt><dd>${t("controls.kAimDesc")}</dd></div>
    <div><dt>${t("controls.kReload")}</dt><dd><kbd>R</kbd></dd></div>
    <div><dt>${t("controls.kCutRelay")}</dt><dd>${t("controls.kCutRelayDesc")}</dd></div>
    <div><dt>${t("controls.kJump")}</dt><dd><kbd>Space</kbd></dd></div>
    <div><dt>${t("controls.kSprint")}</dt><dd>${t("controls.kSprintDesc")}</dd></div>
    <div><dt>${t("controls.kCrouch")}</dt><dd>${t("controls.kCrouchDesc")}</dd></div>
    <div><dt>${t("controls.kMelee")}</dt><dd><kbd>F</kbd></dd></div>
    <div><dt>${t("controls.kPause")}</dt><dd>${t("controls.kPauseDesc")}</dd></div>
  </dl>`;
}

function getTouchControlsHTML() {
  return `
  <dl class="keys">
    <div><dt>${t("controls.kMove")}</dt><dd>${t("controls.touchMove")}</dd></div>
    <div><dt>${t("controls.kLook")}</dt><dd>${t("controls.touchLook")}</dd></div>
    <div><dt>${t("controls.kFire")}</dt><dd>${t("controls.touchFire")}</dd></div>
    <div><dt>${t("controls.kAim")}</dt><dd>${t("controls.touchAim")}</dd></div>
    <div><dt>${t("controls.kReload")}</dt><dd>${t("controls.touchReload")}</dd></div>
    <div><dt>${t("controls.kJump")}</dt><dd>${t("controls.touchJump")}</dd></div>
    <div><dt>${t("controls.kCutRelay")}</dt><dd>${t("controls.touchCutRelay")}</dd></div>
    <div><dt>${t("controls.kSprint")}</dt><dd>${t("controls.touchSprint")}</dd></div>
  </dl>`;
}

// ============================================================================
// 2. 菜单与模态面板控制器核心工厂 (createMenu)
// ============================================================================

/**
 * 创建全套游戏菜单系统 (标题页、暂停页、结算页、死亡页、设置与关于面板)
 * @param {object} ctx 全局引擎上下文
 * @param {Record<string, (e: Event) => void>} callbacks 按钮动作回调 (deploy, resume, restart, retry, redeploy 等)
 */
export function createMenu(ctx, callbacks) {
  const uiContainer = document.getElementById("ui");
  const userSettings = loadSettings();

  const menuContainer = document.createElement("div");
  menuContainer.className = "menu";
  menuContainer.dataset.screen = "none";

  function renderMenuHTML() {
    const subtitle = t("menu.subtitle");
    const subHTML = subtitle ? ` <span class="m-subtitle">${subtitle}</span>` : "";

    return `
    <div class="m-veil"></div>
    <div class="m-bars"><i></i><i></i></div>

    <section class="m-screen m-title" data-s="title" aria-label="${t("menu.title")}">
      <div class="m-title-main">
        <div class="m-eyebrow"><span class="m-tag">${t("menu.eyebrowTag")}</span><span>${t("menu.eyebrowUnit")}</span><span class="m-dim">${t("menu.eyebrowLocation")}</span></div>
        <h1 class="m-word">${t("menu.title")}${subHTML}</h1>
        <p class="m-premise">${t("menu.premise")}</p>
        <div class="m-actions">
          <button class="btn primary" data-act="deploy">${t("menu.deploy")}</button>
          <button class="btn" data-act="settings">${t("menu.settings")}</button>
          <button class="btn m-only-narrow" data-act="controls">${t("menu.controls")}</button>
        </div>
        <p class="m-note">${t("menu.note")}</p>
      </div>
      <aside class="m-legend" aria-label="${t("menu.controlsGlance")}">
        <div><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ${t("controls.kMove")}</span><span><kbd>Mouse</kbd> ${t("controls.kLook")}</span><span><kbd>LMB</kbd> ${t("controls.kFire")}</span><span><kbd>RMB</kbd> ${t("controls.kAim")}</span><span><kbd>R</kbd> ${t("controls.kReload")}</span></div>
        <div><span><kbd>E</kbd> ${t("controls.kCutRelay")}</span><span><kbd>Space</kbd> ${t("controls.kJump")}</span><span><kbd>Shift</kbd> ${t("controls.kSprint")}</span><span><kbd>C</kbd> ${t("controls.kCrouch")}</span><span><kbd>Esc</kbd> ${t("controls.kPause")}</span></div>
        <div class="lg-touch"><em>${t("menu.touchLegend")}</em><span>${t("menu.touchLeft")}</span><span>${t("menu.touchRight")}</span><span>${t("menu.touchActions")}</span></div>
      </aside>
    </section>

    <section class="m-screen m-card" data-s="paused" aria-label="${t("menu.pausedTitle")}">
      <div class="m-k">${t("menu.pausedK")}</div>
      <h2 class="m-h">${t("menu.pausedTitle")}</h2>
      <p class="m-line" data-f="lookmode"></p>
      <div class="m-actions col">
        <button class="btn primary" data-act="resume">${t("menu.resume")}</button>
        <button class="btn" data-act="settings">${t("menu.settings")}</button>
        <button class="btn" data-act="controls">${t("menu.controls")}</button>
        <button class="btn" data-act="restart">${t("menu.restart")}</button>
      </div>
    </section>

    <section class="m-screen m-card m-dead" data-s="dead" aria-label="${t("menu.deadTitle")}">
      <div class="m-k">${t("menu.deadK")}</div>
      <h2 class="m-h">${t("menu.deadTitle")}</h2>
      <dl class="m-stats"><div><dt>${t("menu.timeSurvived")}</dt><dd data-f="dead-time">00:00</dd></div><div><dt>${t("menu.relaysCut")}</dt><dd data-f="dead-relays">0/3</dd></div></dl>
      <div class="m-actions col"><button class="btn primary" data-act="retry">${t("menu.retry")}</button></div>
    </section>

    <section class="m-screen m-card m-debrief" data-s="complete" aria-label="${t("menu.debriefTitle")}">
      <div class="m-k">${t("menu.debriefK")}</div>
      <h2 class="m-h">${t("menu.debriefTitle")}</h2>
      <div class="m-rating"><span>${t("menu.rating")}</span><b data-f="rating">Clean</b></div>
      <dl class="m-stats">
        <div><dt>${t("menu.time")}</dt><dd data-f="time">00:00</dd></div>
        <div><dt>${t("menu.accuracy")}</dt><dd data-f="acc">0%</dd></div>
        <div><dt>${t("menu.machinesDestroyed")}</dt><dd data-f="kills">0</dd></div>
        <div><dt>${t("menu.retries")}</dt><dd data-f="retries">0</dd></div>
      </dl>
      <div class="m-actions col"><button class="btn primary" data-act="redeploy">${t("menu.redeploy")}</button></div>
    </section>

    <div class="panel" role="dialog" aria-modal="true" aria-label="${t("settings.title")}" tabindex="-1" hidden>
      <header class="panel-h">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" data-tab="settings" aria-selected="true">${t("settings.tabsSettings")}</button>
          <button class="tab" role="tab" data-tab="controls" aria-selected="false">${t("settings.tabsControls")}</button>
        </div>
        <button class="btn small" data-act="close-panel">${t("settings.close")}</button>
      </header>
      <div class="panel-b" data-pane="settings">
        <div class="row"><label id="l-lang">${t("settings.language")}</label>
          <div class="seg" role="group" aria-labelledby="l-lang">
            <button data-lang="auto" aria-pressed="false">${t("settings.langAuto")}</button>
            <button data-lang="en" aria-pressed="false">English</button>
            <button data-lang="zh" aria-pressed="false">中文</button>
          </div>
        </div>
        <div class="row"><label id="l-q">${t("settings.graphicsQuality")}</label>
          <div class="seg" role="group" aria-labelledby="l-q">${QUALITY_OPTIONS.map((q) => `<button data-q="${q}" aria-pressed="false">${q}</button>`).join("")}</div></div>
        <div class="row"><label for="s-sens">${t("settings.mouseSensitivity")}</label><div class="slider"><input id="s-sens" type="range" min="0.2" max="3" step="0.05"><output data-o="sens"></output></div></div>
        <div class="row"><label id="l-inv">${t("settings.invertY")}</label><button class="toggle" data-act="invert" aria-labelledby="l-inv" aria-pressed="false"><i></i><span>Off</span></button></div>
        <div class="row"><label for="s-vol">${t("settings.masterVolume")}</label><div class="slider"><input id="s-vol" type="range" min="0" max="100" step="1"><output data-o="vol"></output></div></div>
        <div class="row"><label for="s-fov">${t("settings.fieldOfView")}</label><div class="slider"><input id="s-fov" type="range" min="60" max="95" step="1"><output data-o="fov"></output></div></div>
        <div class="row" data-row="fs"><label id="l-fs">${t("settings.display")}</label><button class="btn small" data-act="fullscreen" aria-labelledby="l-fs fs-t"><span id="fs-t">${t("settings.enterFullscreen")}</span></button></div>
        <p class="panel-note" data-f="qnote"></p>
      </div>
      <div class="panel-b" data-pane="controls" hidden>
        <h3>${t("controls.keyboardMouse")}</h3>${getKeyboardControlsHTML()}
        <p class="panel-note">${t("controls.mouseFallbackNote")}</p>
        <h3>${t("controls.touch")}</h3>${getTouchControlsHTML()}
        <h3>${t("controls.gamepad")}</h3>
        <p class="panel-note">${t("controls.gamepadNote")}</p>
      </div>
    </div>

    <div class="loc-card" aria-hidden="true"><i></i><b>${t("menu.locationCardTitle")}</b><span>${t("menu.locationCardSub")}</span></div>
  `;
  }

  menuContainer.innerHTML = renderMenuHTML();
  uiContainer.appendChild(menuContainer);

  const $ = (sel) => menuContainer.querySelector(sel);
  const $$ = (sel) => [...menuContainer.querySelectorAll(sel)];
  let panelEl = $(".panel");
  let locationCardEl = $(".loc-card");
  const fieldEl = (name) => menuContainer.querySelector(`[data-f="${name}"]`);

  let sliderSens = $("#s-sens");
  let sliderVol = $("#s-vol");
  let sliderFov = $("#s-fov");

  let currentScreenName = "none";
  let lastFocusedElement = null;
  let activeTabName = "settings";

  const savedStats = {
    lookmode: "",
    deadTime: "00:00",
    deadRelays: "0/3",
    time: "00:00",
    acc: "0%",
    kills: "0",
    retries: "0",
    rating: "Clean",
  };

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
    for (const btn of $$(".seg [data-q]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.q === activeQuality));
    }
    const currentLangPref = getLanguagePreference();
    for (const btn of $$(".seg [data-lang]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === currentLangPref));
    }

    if (sliderSens) {
      sliderSens.value = userSettings.sens;
      sliderVol.value = Math.round(userSettings.volume * 100);
      sliderFov.value = userSettings.fov;
    }

    const oSens = $('[data-o="sens"]');
    if (oSens) oSens.textContent = userSettings.sens.toFixed(2) + "×";
    const oVol = $('[data-o="vol"]');
    if (oVol) oVol.textContent = Math.round(userSettings.volume * 100) + "%";
    const oFov = $('[data-o="fov"]');
    if (oFov) oFov.textContent = Math.round(userSettings.fov) + "°";

    const invertBtn = $('[data-act="invert"]');
    if (invertBtn) {
      invertBtn.setAttribute("aria-pressed", String(userSettings.invertY));
      const sp = invertBtn.querySelector("span");
      if (sp) sp.textContent = userSettings.invertY ? t("settings.on") : t("settings.off");
    }

    const qnoteEl = fieldEl("qnote");
    if (qnoteEl) {
      qnoteEl.textContent =
        userSettings.quality === "auto"
          ? t("settings.qnoteAuto", { quality: activeQuality || "default" })
          : t("settings.qnoteManual");
    }

    if (fsText) {
      fsText.textContent = getFullscreenEl()
        ? t("settings.exitFullscreen")
        : t("settings.enterFullscreen");
    }
  }

  function bindMenuDOM() {
    panelEl = $(".panel");
    locationCardEl = $(".loc-card");
    sliderSens = $("#s-sens");
    sliderVol = $("#s-vol");
    sliderFov = $("#s-fov");
    fsRow = $('[data-row="fs"]');
    fsText = $("#fs-t");

    if (
      !appRoot ||
      (!appRoot.requestFullscreen && !appRoot.webkitRequestFullscreen) ||
      document.fullscreenEnabled === false
    ) {
      if (fsRow) fsRow.hidden = true;
    }

    if (sliderSens) {
      sliderSens.addEventListener("input", () => {
        userSettings.sens = +sliderSens.value;
        applySettings("sens");
        syncSettingsUI();
        saveSettings(userSettings);
      });
    }

    if (sliderVol) {
      sliderVol.addEventListener("input", () => {
        userSettings.volume = +sliderVol.value / 100;
        applySettings("volume");
        syncSettingsUI();
        saveSettings(userSettings);
      });
    }

    if (sliderFov) {
      sliderFov.addEventListener("input", () => {
        userSettings.fov = +sliderFov.value;
        applySettings("fov");
        syncSettingsUI();
        saveSettings(userSettings);
      });
    }
  }

  function restoreSavedStats() {
    if (fieldEl("lookmode")) fieldEl("lookmode").textContent = savedStats.lookmode;
    if (fieldEl("dead-time")) fieldEl("dead-time").textContent = savedStats.deadTime;
    if (fieldEl("dead-relays")) fieldEl("dead-relays").textContent = savedStats.deadRelays;
    if (fieldEl("time")) fieldEl("time").textContent = savedStats.time;
    if (fieldEl("acc")) fieldEl("acc").textContent = savedStats.acc;
    if (fieldEl("kills")) fieldEl("kills").textContent = savedStats.kills;
    if (fieldEl("retries")) fieldEl("retries").textContent = savedStats.retries;
    if (fieldEl("rating")) fieldEl("rating").textContent = savedStats.rating;
  }

  function rebuildMenuDOM() {
    const wasPanelHidden = panelEl ? panelEl.hidden : true;
    menuContainer.innerHTML = renderMenuHTML();
    bindMenuDOM();
    switchTab(activeTabName);
    if (!wasPanelHidden && panelEl) {
      panelEl.hidden = false;
      menuContainer.classList.add("panel-open");
    }
    restoreSavedStats();
    syncSettingsUI();
  }

  // 全屏模式控制
  let fsRow = $('[data-row="fs"]');
  let fsText = $("#fs-t");
  const getFullscreenEl = () =>
    document.fullscreenElement || document.webkitFullscreenElement || null;
  const appRoot = document.getElementById("app") || document.documentElement;

  bindMenuDOM();

  function toggleFullscreen() {
    try {
      if (getFullscreenEl()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return;
      }
      const req = (appRoot.requestFullscreen || appRoot.webkitRequestFullscreen).call(appRoot);
      if (req && req.catch)
        req.catch(() => {
          if (fsText) fsText.textContent = t("settings.fullscreenUnavailable");
        });
    } catch (err) {
      if (fsText) fsText.textContent = t("settings.fullscreenUnavailable");
    }
  }

  const onFullscreenChange = () => {
    if (fsText) {
      fsText.textContent = getFullscreenEl()
        ? t("settings.exitFullscreen")
        : t("settings.enterFullscreen");
    }
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
    activeTabName = tabName;
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

    if (btn.dataset.lang) {
      const newLang = btn.dataset.lang;
      userSettings.lang = newLang;
      setLanguage(newLang);
      saveSettings(userSettings);
      rebuildMenuDOM();
      return;
    }

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

  onLanguageChange(() => {
    rebuildMenuDOM();
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
      savedStats.lookmode = text || "";
      if (fieldEl("lookmode")) fieldEl("lookmode").textContent = savedStats.lookmode;
    },
    setDead({ time, relays, total }) {
      savedStats.deadTime = formatSeconds(time);
      savedStats.deadRelays = `${relays}/${total}`;
      if (fieldEl("dead-time")) fieldEl("dead-time").textContent = savedStats.deadTime;
      if (fieldEl("dead-relays")) fieldEl("dead-relays").textContent = savedStats.deadRelays;
    },
    setDebrief({ time, accuracy, kills, retries, rating }) {
      savedStats.time = formatSeconds(time);
      savedStats.acc = accuracy == null ? "—" : Math.round(accuracy * 100) + "%";
      savedStats.kills = String(kills);
      savedStats.retries = String(retries);
      savedStats.rating = rating;
      if (fieldEl("time")) fieldEl("time").textContent = savedStats.time;
      if (fieldEl("acc")) fieldEl("acc").textContent = savedStats.acc;
      if (fieldEl("kills")) fieldEl("kills").textContent = savedStats.kills;
      if (fieldEl("retries")) fieldEl("retries").textContent = savedStats.retries;
      if (fieldEl("rating")) fieldEl("rating").textContent = savedStats.rating;
    },
    applySettings,
    dispose() {
      if (rootEl && rootEl.parentNode) {
        rootEl.parentNode.removeChild(rootEl);
      }
    },
  };

  syncSettingsUI();
  return menuInterface;
}

export const pM = createMenu;

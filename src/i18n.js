/**
 * @file src/i18n.js
 * @description 国际化多语言系统 (Internationalization & Localization Engine)
 *
 * 支持语言：English (en) 与 简体中文 (zh)
 * 特性：
 * 1. 语言自动探测 (URL 参数 > 本地存储 > 浏览器系统语言)
 * 2. 响应式事件发布订阅 (onLanguageChange)
 * 3. 动态文本插值 (Interpolation {var}) 与优雅回退 (English Fallback)
 */

const SETTINGS_STORAGE_KEY = "saltline.settings.v1";

/**
 * 完整字典表
 */
export const TRANSLATIONS = {
  en: {
    langName: "English",
    boot: {
      sub: "Raising the terminal",
      step1: "Waking the renderer",
      step2: "Mixing paint, rust and rain",
      step3: "Stacking containers",
      step4: "Raising the cranes",
      step5: "Flooding the apron",
      step6: "Loading tracers and smoke",
      step7: "Checking the rifle",
      step8: "Waking the Harbormaster",
      step9: "Waiting for first light",
      stepReady: "Ready",
      fatalPrefix: "Saltline could not start: ",
    },
    menu: {
      title: "SALTLINE",
      subtitle: "",
      eyebrowTag: "B4",
      eyebrowUnit: "Port Authority Breach Unit",
      eyebrowLocation: "Saltline Terminal · 05:42",
      premise: "The port’s security net has gone feral. Cut its three uplinks. Reach the boat.",
      deploy: "Deploy",
      workshop: "Asset Workshop",
      settings: "Settings",
      controls: "Controls",
      note: "Every surface, machine and sound is generated in your browser. Nothing is downloaded.",
      controlsGlance: "Controls at a glance",
      touchLegend: "Touch",
      touchLeft: "Left thumb moves",
      touchRight: "Right thumb looks",
      touchActions: "Fire · Aim · Reload · Jump on screen",
      pausedK: "Operation on hold",
      pausedTitle: "Paused",
      resume: "Resume",
      restart: "Restart mission",
      deadK: "Breacher down",
      deadTitle: "Signal lost",
      timeSurvived: "Time survived",
      relaysCut: "Relays cut",
      retry: "Retry",
      debriefK: "Berth 4 · Debrief",
      debriefTitle: "Saltline is dark",
      rating: "Rating",
      time: "Time",
      accuracy: "Accuracy",
      machinesDestroyed: "Machines destroyed",
      retries: "Retries",
      redeploy: "Redeploy",
      locationCardTitle: "Saltline Terminal · Berth 4 · 05:42",
      locationCardSub: "Port Authority Breach Unit — one breacher, no backup",
      resumeRecaptures: "Resume recaptures the mouse.",
    },
    settings: {
      title: "Settings and controls",
      tabsSettings: "Settings",
      tabsControls: "Controls",
      close: "Close",
      language: "Language",
      langAuto: "Auto",
      graphicsQuality: "Graphics quality",
      mouseSensitivity: "Mouse sensitivity",
      invertY: "Invert Y",
      masterVolume: "Master volume",
      fieldOfView: "Field of view",
      display: "Display",
      enterFullscreen: "Enter fullscreen",
      exitFullscreen: "Exit fullscreen",
      fullscreenUnavailable: "Fullscreen is not available here",
      qnoteAuto:
        "Quality was picked for this device ({quality}). Lower it if the frame rate struggles.",
      qnoteManual:
        "Quality changes apply at once; shadows and reflections may take a moment to rebuild.",
      on: "On",
      off: "Off",
    },
    controls: {
      keyboardMouse: "Keyboard · Mouse",
      touch: "Touch",
      gamepad: "Gamepad",
      kMove: "Move",
      kLook: "Look",
      kLookDesc: "Mouse",
      kFire: "Fire",
      kFireDesc: "Left button",
      kAim: "Aim",
      kAimDesc: "Right button",
      kReload: "Reload",
      kCutRelay: "Cut relay",
      kCutRelayDesc: "Hold <kbd>E</kbd>",
      kJump: "Jump",
      kSprint: "Sprint",
      kCrouch: "Crouch",
      kCrouchDesc: "<kbd>C</kbd> or <kbd>Ctrl</kbd>",
      kMelee: "Melee",
      kPause: "Pause",
      kPauseDesc: "<kbd>Esc</kbd> or <kbd>P</kbd>",
      touchMove: "Left thumb, anywhere",
      touchLook: "Drag the right side",
      touchFire: "Hold FIRE, drag to track",
      touchAim: "AIM toggles",
      touchReload: "RLD",
      touchJump: "JUMP",
      touchCutRelay: "Hold USE at a relay",
      touchSprint: "Push the stick fully forward",
      mouseFallbackNote:
        "If the browser will not capture the mouse, hold a mouse button and drag to look (left also fires, right also aims). Arrow keys or <kbd>I</kbd><kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> turn, <kbd>Enter</kbd> fires.",
      gamepadNote:
        "Sticks move and look · RT fire · LT aim · A jump · B crouch · X reload · Y cut relay · L3 sprint · Start pause.",
    },
    touchBtns: {
      fire: "FIRE",
      aim: "AIM",
      reload: "RLD",
      jump: "JUMP",
      interact: "USE",
      pause: "PAUSE",
    },
    hud: {
      objective: "Objective",
      relays: "Relays",
      vitals: "Vitals",
      control: "Control",
      cardinals: {
        0: "N",
        45: "NE",
        90: "E",
        135: "SE",
        180: "S",
        225: "SW",
        270: "W",
        315: "NW",
      },
      directions: [
        "NORTH",
        "NORTH-EAST",
        "EAST",
        "SOUTH-EAST",
        "SOUTH",
        "SOUTH-WEST",
        "WEST",
        "NORTH-WEST",
      ],
      reloading: "Reloading",
      reload: "Reload",
      rReload: "R — Reload",
      lowAmmo: "Low ammo",
      empty: "Empty",
      weakPoint: "Weak point",
      destroyed: "destroyed",
      contactAlert: "Contact — {dir}",
      holdPrompt: "Hold {key} — {label}",
      cutRelayLabel: "Cut relay {short}",
      relayMarker: "Relay {short}",
      boatMarker: "Boat",
      objCutThree: "Cut the three uplink relays",
      objCutLast: "Cut the last relay",
      objCutRemaining: "Cut the remaining {n} relays",
      objGetToBoat: "Get to the boat",
      relaysLiveHint: "Relays still live — the boat will not wait under fire",
      hauledOutOfWater: "Hauled out of the water",
      touchActive: "Touch controls active",
      dragNotice:
        "Mouse capture unavailable — move the mouse to look, rest it at a screen edge to keep turning · click fires · arrows or IJKL also turn",
      mouseCaptured: "Mouse captured — Esc releases it",
      clickToCapture: "Click the view to capture the mouse",
    },
    radio: {
      intro:
        "Breacher, this is Control. The Harbormaster holds the berth. Cut its three uplinks — yard, shed, quay.",
      contact: "It has seen you. Gulls fly, Hounds walk. Put them down.",
      cut1: "One relay dark. It felt that — machines inbound.",
      cut2: "Two dark. It is throwing everything it has left at you.",
      all: "All three dark. The boat is holding at the quay ladder, south end. Run.",
      low: "You are hit hard. Get behind steel and breathe.",
      done: "Breacher is aboard. Saltline is dark. Good work.",
    },
    ratings: ["Messy", "Loud", "Steady", "Clean", "Sharp", "Surgical"],
    bench: {
      title: "SALTLINE BENCH",
    },
  },
  zh: {
    langName: "简体中文",
    boot: {
      sub: "正在唤醒战术终端",
      step1: "启动渲染引擎与 WebGL",
      step2: "烘焙材质、锈斑与雨水着色器",
      step3: "加载四号泊位集装箱矩阵",
      step4: "升起岸桥起重机与防波堤",
      step5: "生成深水海面与沥青水洼倒影",
      step6: "装载粒子池、曳光弹与火花烟雾",
      step7: "校准 PAC-9 突击步枪与反射瞄具",
      step8: "激活港务主控 AI 与巡逻敌群",
      step9: "等待破晓晨光与雷暴天候",
      stepReady: "战术终端就绪",
      fatalPrefix: "盐线启动失败：",
    },
    menu: {
      title: "SALTLINE",
      subtitle: "盐线",
      eyebrowTag: "B4",
      eyebrowUnit: "港务局突击小队",
      eyebrowLocation: "盐线港区 · 05:42",
      premise: "港区防御系统失控。切断三处上行中继，突破封锁，登船撤离。",
      deploy: "开始行动",
      workshop: "资产工坊",
      settings: "设置",
      controls: "操作说明",
      note: "所有场景、机械与音效均在浏览器纯代码实时生成，零外部下载。",
      controlsGlance: "操作速览",
      touchLegend: "触屏操作",
      touchLeft: "左手拇指移动",
      touchRight: "右手拇指视角",
      touchActions: "屏幕开火 · 瞄准 · 换弹 · 跳跃",
      pausedK: "行动暂停",
      pausedTitle: "已暂停",
      resume: "继续行动",
      restart: "重新开始任务",
      deadK: "队员倒下",
      deadTitle: "信号中断",
      timeSurvived: "生存时间",
      relaysCut: "已切断中继",
      retry: "再试一次",
      debriefK: "四号泊位 · 战况简报",
      debriefTitle: "港区网络已切断",
      rating: "任务评级",
      time: "耗时",
      accuracy: "命中率",
      machinesDestroyed: "击毁机械",
      retries: "重试次数",
      redeploy: "再次出击",
      locationCardTitle: "盐线港区 · 四号泊位 · 05:42",
      locationCardSub: "港务局突击小队 — 单兵突击，孤立无援",
      resumeRecaptures: "继续游戏后将重新捕获鼠标。",
    },
    settings: {
      title: "设置与操作说明",
      tabsSettings: "系统设置",
      tabsControls: "操作说明",
      close: "关闭",
      language: "显示语言",
      langAuto: "自动",
      graphicsQuality: "画质预设",
      mouseSensitivity: "鼠标灵敏度",
      invertY: "反转 Y 轴",
      masterVolume: "主音量",
      fieldOfView: "视野范围 (FOV)",
      display: "显示模式",
      enterFullscreen: "进入全屏",
      exitFullscreen: "退出全屏",
      fullscreenUnavailable: "当前环境不支持全屏",
      qnoteAuto: "已根据您的设备自动选择画质（{quality}）。若运行不流畅可降低画质。",
      qnoteManual: "画质设置立即生效；阴影与平面反射需要片刻重新生成。",
      on: "开启",
      off: "关闭",
    },
    controls: {
      keyboardMouse: "键盘 · 鼠标",
      touch: "触屏操作",
      gamepad: "手柄控制",
      kMove: "移动",
      kLook: "视角",
      kLookDesc: "移动鼠标",
      kFire: "开火",
      kFireDesc: "鼠标左键",
      kAim: "瞄准",
      kAimDesc: "鼠标右键",
      kReload: "换弹",
      kCutRelay: "切断中继",
      kCutRelayDesc: "按住 <kbd>E</kbd>",
      kJump: "跳跃",
      kSprint: "冲刺",
      kCrouch: "蹲伏",
      kCrouchDesc: "<kbd>C</kbd> 或 <kbd>Ctrl</kbd>",
      kMelee: "近战",
      kPause: "暂停",
      kPauseDesc: "<kbd>Esc</kbd> 或 <kbd>P</kbd>",
      touchMove: "左手拇指在左侧任意区域滑动",
      touchLook: "在屏幕右半区域拖动",
      touchFire: "按住开火，拖动跟踪目标",
      touchAim: "点击瞄准切换开镜",
      touchReload: "换弹",
      touchJump: "跳跃",
      touchCutRelay: "靠近中继按住交互",
      touchSprint: "将摇杆推至最顶端",
      mouseFallbackNote:
        "若浏览器无法锁定鼠标，可按住鼠标按键并拖动调整视角（左键开火，右键瞄准）。方向键或 <kbd>I</kbd><kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> 也可转向，<kbd>Enter</kbd> 开火。",
      gamepadNote:
        "双摇杆移动与视角 · RT 开火 · LT 瞄准 · A 跳跃 · B 蹲伏 · X 换弹 · Y 切断中继 · L3 冲刺 · Start 暂停。",
    },
    touchBtns: {
      fire: "开火",
      aim: "瞄准",
      reload: "换弹",
      jump: "跳跃",
      interact: "交互",
      pause: "暂停",
    },
    hud: {
      objective: "任务目标",
      relays: "中继",
      vitals: "生命状态",
      control: "指挥中心",
      cardinals: {
        0: "北",
        45: "东北",
        90: "东",
        135: "东南",
        180: "南",
        225: "西南",
        270: "西",
        315: "西北",
      },
      directions: ["北方", "东北方", "东方", "东南方", "南方", "西南方", "西方", "西北方"],
      reloading: "换弹中",
      reload: "换弹",
      rReload: "R — 换弹",
      lowAmmo: "弹药不足",
      empty: "弹药耗尽",
      weakPoint: "弱点命中",
      destroyed: "已摧毁",
      contactAlert: "发现敌情 — {dir}",
      holdPrompt: "按住 {key} — {label}",
      cutRelayLabel: "切断中继 {short}",
      relayMarker: "中继 {short}",
      boatMarker: "撤离艇",
      objCutThree: "切断三处上行中继",
      objCutLast: "切断最后一处中继",
      objCutRemaining: "切断剩余 {n} 处中继",
      objGetToBoat: "前往撤离艇登船",
      relaysLiveHint: "中继仍在运转——撤离艇无法在火力下接应",
      hauledOutOfWater: "已从海水中救起脱困",
      touchActive: "触屏操作已启用",
      dragNotice:
        "鼠标捕获不可用：移动鼠标调整视角，停在屏幕边缘持续转向 · 点击开火 · 方向键或 IJKL 也可转向",
      mouseCaptured: "鼠标已捕获，按 Esc 释放",
      clickToCapture: "点击游戏画面以捕获鼠标",
    },
    radio: {
      intro: "突击队员，这里是指挥中心。港区主控已封锁泊位。切断堆场、仓库、码头的三处中继。",
      contact: "你已被发现！空中有机械飞鸥，地面有机械猎犬。消灭它们。",
      cut1: "第一处中继已切断。主控已察觉——机械守卫正在围攻！",
      cut2: "第二处中继已切断。敌方正调集全部残余兵力向你扑来。",
      all: "三处中继全部切断！撤离艇正在码头南端舷梯等待，快跑！",
      low: "你受重伤了！躲到掩体后喘口气。",
      done: "突击队员已登船，港区网络完全瘫痪。干得漂亮！",
    },
    ratings: ["险象环生", "火力全开", "稳扎稳打", "干净利落", "精准果断", "完美突击"],
    bench: {
      title: "SALTLINE 跑分基准",
    },
  },
};

/** @type {Set<(lang: string) => void>} */
const changeListeners = new Set();

let currentPreference = "auto";
let currentResolvedLang = "en";

/**
 * 探测环境默认语言
 * @returns {"en" | "zh"}
 */
function detectSystemLanguage() {
  try {
    const navLang =
      (typeof navigator !== "undefined" &&
        (navigator.language || (navigator.languages && navigator.languages[0]))) ||
      "";
    if (navLang.toLowerCase().startsWith("zh")) {
      return "zh";
    }
  } catch (e) {}
  return "en";
}

/**
 * 初始化 i18n 系统
 * @param {string} [urlLangParam] 可选的 URL 参数 ?lang=
 */
export function initI18n(urlLangParam) {
  let preference = "auto";

  // 1. 优先读取 URL 查询参数
  if (urlLangParam && (urlLangParam === "en" || urlLangParam === "zh")) {
    preference = urlLangParam;
  } else {
    // 2. 读取 LocalStorage
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "null");
      if (saved && (saved.lang === "en" || saved.lang === "zh" || saved.lang === "auto")) {
        preference = saved.lang;
      }
    } catch (e) {}
  }

  currentPreference = preference;
  currentResolvedLang = preference === "auto" ? detectSystemLanguage() : preference;
  document.documentElement.lang = currentResolvedLang;
  return currentResolvedLang;
}

/**
 * 获取当前偏好设置 ("auto" | "en" | "zh")
 */
export function getLanguagePreference() {
  return currentPreference;
}

/**
 * 获取当前实际生效语言 ("en" | "zh")
 */
export function getLanguage() {
  return currentResolvedLang;
}

/**
 * 切换语言设置
 * @param {"auto" | "en" | "zh"} preference
 */
export function setLanguage(preference) {
  if (preference !== "auto" && preference !== "en" && preference !== "zh") {
    preference = "auto";
  }

  currentPreference = preference;
  const newResolved = preference === "auto" ? detectSystemLanguage() : preference;
  const changed = newResolved !== currentResolvedLang;
  currentResolvedLang = newResolved;
  document.documentElement.lang = newResolved;

  // 持久化保存
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
    settings.lang = preference;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {}

  // 广播变化
  for (const listener of changeListeners) {
    try {
      listener(currentResolvedLang);
    } catch (err) {
      console.error("[i18n] listener threw:", err);
    }
  }

  return currentResolvedLang;
}

/**
 * 监听语言变更
 * @param {(lang: string) => void} fn
 * @returns {() => void} 取消监听函数
 */
export function onLanguageChange(fn) {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

/**
 * 翻译文本函数
 * @param {string} path 点分隔路径如 "menu.deploy"
 * @param {Record<string, string|number>} [params] 插值变量对象
 * @returns {any}
 */
export function t(path, params) {
  const langTable = TRANSLATIONS[currentResolvedLang] || TRANSLATIONS.en;
  let val = resolvePath(langTable, path);

  if (val === undefined && currentResolvedLang !== "en") {
    val = resolvePath(TRANSLATIONS.en, path);
  }

  if (val === undefined) {
    return path;
  }

  if (typeof val === "string" && params) {
    return val.replace(/\{(\w+)\}/g, (match, key) =>
      params[key] !== undefined ? String(params[key]) : match,
    );
  }

  return val;
}

/**
 * 内部路径解析
 */
function resolvePath(obj, path) {
  if (!obj || !path) return undefined;
  const segments = path.split(".");
  let cur = obj;
  for (const seg of segments) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[seg];
  }
  return cur;
}

import * as THREE from "three";

const { Vector3 } = THREE;

// 罗盘刻度像素跨度与方位常量
const COMPASS_PX_PER_DEGREE = 4;
const COMPASS_MIN_DEG = -90;
const COMPASS_MAX_DEG = 450;
const CARDINAL_NAMES = {
  0: "北",
  45: "东北",
  90: "东",
  135: "东南",
  180: "南",
  225: "西南",
  270: "西",
  315: "西北",
};

// 交互进度环圆周长 (2 * PI * r, r=19)
const PROMPT_RING_CIRCUMFERENCE = 2 * Math.PI * 19;

/**
 * 快速创建带 class 和 innerHTML 的 DOM 元素辅助函数
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [html]
 * @returns {HTMLElement}
 */
function createElement(tag, className, html) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html != null) el.innerHTML = html;
  return el;
}

/**
 * 创建沉浸式第一人称战术 HUD 界面控制器 (Tactical HUD System)
 * @param {object} ctx 全局引擎上下文 (包含 player, camera, weapon, events, input, time)
 */
function createHUD(ctx) {
  const uiContainer = document.getElementById("ui");
  const root = createElement("div", "hud");
  root.setAttribute("aria-hidden", "true");

  // ==========================================
  // 1. 顶部战术滚动罗盘 (Tape Compass)
  // ==========================================
  const compassEl = createElement("div", "h-compass");
  const compassTapeEl = createElement("div", "h-tape");

  // 生成刻度线与方向文字
  let tapeHTML = "";
  for (let deg = COMPASS_MIN_DEG; deg <= COMPASS_MAX_DEG; deg += 5) {
    const leftPx = (deg - COMPASS_MIN_DEG) * COMPASS_PX_PER_DEGREE;
    const normDeg = ((deg % 360) + 360) % 360;
    const isCardinal = normDeg % 45 === 0;
    const isMajor = normDeg % 15 === 0;

    tapeHTML += `<i class="${isCardinal ? "mj" : isMajor ? "md" : "mn"}" style="left:${leftPx}px"></i>`;
    if (isCardinal) {
      tapeHTML += `<b class="${normDeg % 90 === 0 ? "card" : "ic"}" style="left:${leftPx}px">${CARDINAL_NAMES[normDeg]}</b>`;
    } else if (isMajor) {
      tapeHTML += `<b class="num" style="left:${leftPx}px">${String(normDeg).padStart(3, "0")}</b>`;
    }
  }
  compassTapeEl.innerHTML = tapeHTML;

  const tapeWrapEl = createElement("div", "h-tape-wrap");
  tapeWrapEl.appendChild(compassTapeEl);

  const compassMarksEl = createElement("div", "h-cmarks");
  const headingTextEl = createElement("div", "h-heading", "000");
  compassEl.append(tapeWrapEl, createElement("i", "h-needle"), compassMarksEl, headingTextEl);

  // ==========================================
  // 2. 任务目标与中继站计数器 (Objective Tracker)
  // ==========================================
  const objEl = createElement(
    "div",
    "h-obj",
    '<div class="h-k">任务目标</div><div class="h-obj-t"></div><div class="h-relays"><span>中继</span><i></i><i></i><i></i><b>0/3</b></div>',
  );
  const objTextEl = objEl.querySelector(".h-obj-t");
  const relaysContainer = objEl.querySelector(".h-relays");
  const relaysCountText = relaysContainer.querySelector("b");
  let relayPipElements = [...relaysContainer.querySelectorAll("i")];

  // 警报横幅
  const warnBannerEl = createElement("div", "h-warn");

  // ==========================================
  // 3. 动态扩散十字准星 (Dynamic Crosshair)
  // ==========================================
  const crosshairEl = createElement(
    "div",
    "h-cross",
    '<i class="c-t"></i><i class="c-b"></i><i class="c-l"></i><i class="c-r"></i><i class="c-dot"></i>',
  );
  const crosshairBars = crosshairEl.querySelectorAll("i");

  // 命中反馈 (Hitmarker)
  const hitmarkerEl = createElement("div", "h-hit", "<i></i><i></i><i></i><i></i>");

  // ==========================================
  // 4. 受击方向弧形指示器 (Damage Direction Arcs)
  // ==========================================
  const arcsContainer = createElement("div", "h-arcs");
  const damageArcs = [];
  for (let i = 0; i < 4; i++) {
    const arcEl = createElement(
      "div",
      "h-arc",
      '<svg viewBox="-100 -100 200 200"><path d="M -38 -84 A 92 92 0 0 1 38 -84" /><path class="tip" d="M -7 -97 L 0 -106 L 7 -97" /></svg>',
    );
    arcsContainer.appendChild(arcEl);
    damageArcs.push({
      el: arcEl,
      life: 0,
      src: new Vector3(),
      op: -1,
      rot: 1e9,
    });
  }

  // ==========================================
  // 5. 交互引导与环形进度条 (Interaction Prompt Ring)
  // ==========================================
  const promptEl = createElement(
    "div",
    "h-prompt",
    `<svg viewBox="-24 -24 48 48"><circle class="bg" r="19"/><circle class="fg" r="19" stroke-dasharray="${PROMPT_RING_CIRCUMFERENCE.toFixed(2)}" stroke-dashoffset="${PROMPT_RING_CIRCUMFERENCE.toFixed(2)}" transform="rotate(-90)"/></svg><span class="h-key">E</span><span class="h-plabel"></span>`,
  );
  const promptFgCircle = promptEl.querySelector(".fg");
  const promptKeySpan = promptEl.querySelector(".h-key");
  const promptLabelSpan = promptEl.querySelector(".h-plabel");

  // 战况日志 feed & 提示消息
  const feedContainer = createElement("div", "h-feed");
  const msgBannerEl = createElement("div", "h-msg");

  // ==========================================
  // 6. 生命状态监视器 (Vitality Monitor)
  // ==========================================
  const healthEl = createElement(
    "div",
    "h-health",
    '<div class="h-k">生命状态</div><div class="h-hp-row"><b class="h-hp-n">100</b><div class="h-hp-bar">' +
      "<i></i>".repeat(10) +
      "</div></div>",
  );
  const hpNumberText = healthEl.querySelector(".h-hp-n");
  const hpSegmentBars = [...healthEl.querySelectorAll(".h-hp-bar i")];

  // ==========================================
  // 7. 枪械弹药与状态指示 (Ammo Display)
  // ==========================================
  const ammoEl = createElement(
    "div",
    "h-ammo",
    '<div class="h-cue"></div><div class="h-ammo-row"><b class="h-ammo-n">30</b><span class="h-ammo-r">120</span></div><div class="h-pips"></div><div class="h-wname"></div>',
  );
  const ammoMagText = ammoEl.querySelector(".h-ammo-n");
  const ammoReserveText = ammoEl.querySelector(".h-ammo-r");
  const ammoPipsContainer = ammoEl.querySelector(".h-pips");
  const weaponNameText = ammoEl.querySelector(".h-wname");
  const ammoCueText = ammoEl.querySelector(".h-cue");

  // 3D 空间世界地标投影 (World Waypoint Markers)
  const worldMarkersContainer = createElement("div", "h-marks");

  root.append(
    worldMarkersContainer,
    compassEl,
    objEl,
    warnBannerEl,
    arcsContainer,
    crosshairEl,
    hitmarkerEl,
    promptEl,
    feedContainer,
    msgBannerEl,
    healthEl,
    ammoEl,
  );
  uiContainer.appendChild(root);

  // ==========================================
  // 8. 无线电通信对话框 (Radio Comms Dialogue)
  // ==========================================
  const radioEl = createElement(
    "div",
    "comms",
    '<span class="comms-who">指挥中心</span><span class="comms-t"></span>',
  );
  radioEl.setAttribute("role", "status");
  radioEl.setAttribute("aria-live", "polite");
  const radioTextEl = radioEl.querySelector(".comms-t");
  uiContainer.appendChild(radioEl);

  // ==========================================
  // 内部状态跟踪缓存 (避免冗余 DOM 读写)
  // ==========================================
  let isHudVisible = false;
  let compassWidth = 420;
  let screenWidth = innerWidth;
  let screenHeight = innerHeight;

  const cache = {
    ammo: -1,
    mag: -1,
    reserve: -1,
    name: null,
    cue: null,
    low: null,
    hp: -1,
    hpSeg: -1,
    hurt: null,
    head: -1,
    tapeX: 1e9,
    gap: -1,
    crossOn: null,
    promptOn: null,
    promptText: null,
    promptT: -1,
    promptKey: null,
    marksOn: null,
    done: -1,
    total: -1,
  };

  let bulletPipElements = [];
  let currentObjective = "";
  let objTypedChars = 0;
  let objTypewriterProgress = 0;

  const radioQueue = [];
  let currentRadioItem = null;
  let radioTypedChars = 0;
  let radioTypewriterProgress = 0;
  let radioDurationLeft = 0;

  let warnDurationLeft = 0;
  let msgDurationLeft = 0;

  const activeFeedItems = [];
  let activeMarkers = [];
  const tempProjectVec = new Vector3();

  let lastFeedItem = null;
  let lastFeedFrame = -1;

  function onResize() {
    screenWidth = innerWidth;
    screenHeight = innerHeight;
    compassWidth = compassEl.clientWidth || Math.min(420, screenWidth * 0.6);
    cache.tapeX = 1e9;
    cache.gap = -1;
    for (const marker of activeMarkers) {
      marker.lastC = 1e9;
      marker.lastW = "";
    }
  }

  addEventListener("resize", onResize);

  // 事件监听：击中反馈
  ctx.events.on("player:hitEnemy", (e) => {
    const isKill = e && e.killed;
    const isWeak = e && (e.weak || e.part === "weak");
    hudInterface.hitmarker(isKill ? "kill" : isWeak ? "weak" : "hit");

    if (
      isKill &&
      isWeak &&
      lastFeedItem &&
      lastFeedFrame === ctx.time.frame &&
      !lastFeedItem.weak
    ) {
      lastFeedItem.weak = true;
      lastFeedItem.el.innerHTML += "<em>弱点命中</em>";
    }
  });

  // 事件监听：击杀通报
  ctx.events.on("enemy:killed", (e) => {
    const typeName =
      { gull: "机械飞鸥", hound: "机械猎犬" }[e && (e.type || (e.enemy && e.enemy.type))] ||
      "机械守卫";
    lastFeedItem = hudInterface.feed(`<b>${typeName}</b> 已摧毁`);
    lastFeedFrame = ctx.time.frame;
  });

  // 事件监听：受击方向提示
  ctx.events.on("player:hit", (e) => {
    if (!e || !e.fromPos) return;
    let targetArc = damageArcs[0];
    for (const arc of damageArcs) {
      if (arc.life <= 0) {
        targetArc = arc;
        break;
      }
      if (arc.life < targetArc.life) {
        targetArc = arc;
      }
    }
    targetArc.src.copy(e.fromPos);
    targetArc.life = 1.5;
    targetArc.max = 1.5;
  });

  // ==========================================
  // HUD 对外公共接口
  // ==========================================
  const hudInterface = {
    root,

    show(visible) {
      visible = !!visible;
      if (visible !== isHudVisible) {
        isHudVisible = visible;
        root.classList.toggle("on", visible);
        if (visible) onResize();
      }
    },

    setObjective(text) {
      text = text || "";
      if (text !== currentObjective) {
        currentObjective = text;
        objTypedChars = 0;
        objTypewriterProgress = 0;
        objTextEl.textContent = "";
        objEl.classList.toggle("has", !!text);
        objEl.classList.remove("flash");
        void objEl.offsetWidth; // 触发 reflow
        objEl.classList.add("flash");
      }
    },

    setRelays(doneCount, totalCount) {
      if (doneCount === cache.done && totalCount === cache.total) return;

      if (totalCount !== cache.total) {
        relayPipElements.forEach((el) => el.remove());
        relayPipElements = [];
        for (let i = 0; i < totalCount; i++) {
          const pip = document.createElement("i");
          relaysContainer.insertBefore(pip, relaysCountText);
          relayPipElements.push(pip);
        }
      }

      cache.done = doneCount;
      cache.total = totalCount;
      relayPipElements.forEach((el, idx) => el.classList.toggle("cut", idx < doneCount));
      relaysCountText.textContent = `${doneCount}/${totalCount}`;
      relaysContainer.classList.toggle("all", doneCount >= totalCount && totalCount > 0);
    },

    setMarkers(markerList) {
      for (const m of activeMarkers) {
        m.cEl.remove();
        m.wEl.remove();
      }
      activeMarkers = (markerList || []).map((item) => {
        const compassMarker = createElement(
          "div",
          "h-cmark",
          `<span class="tag ${item.kind || ""}">${item.label}</span><span class="dist"></span>`,
        );
        const worldMarker = createElement(
          "div",
          "h-mark" + (item.kind ? " " + item.kind : ""),
          `<div class="pin"><i class="glyph"></i><b class="lbl">${item.label}</b></div><span class="dist"></span>`,
        );
        compassMarksEl.appendChild(compassMarker);
        worldMarkersContainer.appendChild(worldMarker);
        return {
          ...item,
          cEl: compassMarker,
          cDist: compassMarker.querySelector(".dist"),
          wEl: worldMarker,
          wDist: worldMarker.querySelector(".dist"),
          lastC: 1e9,
          lastW: "",
          lastD: -1,
        };
      });
    },

    setPrompt(key, label, progress = 0) {
      const active = key != null;
      if (active !== cache.promptOn) {
        cache.promptOn = active;
        promptEl.classList.toggle("on", active);
      }
      if (!active) return;

      if (label !== cache.promptText) {
        cache.promptText = label;
        promptLabelSpan.textContent = label || "";
      }
      if (key !== cache.promptKey) {
        cache.promptKey = key;
        promptKeySpan.textContent = key || "E";
      }

      const clampedProg = Math.max(0, Math.min(1, progress));
      if (Math.abs(clampedProg - cache.promptT) > 0.005) {
        cache.promptT = clampedProg;
        promptFgCircle.style.strokeDashoffset = String(
          (PROMPT_RING_CIRCUMFERENCE * (1 - clampedProg)).toFixed(2),
        );
      }
    },

    warning(text, duration = 3) {
      warnBannerEl.textContent = text || "";
      warnBannerEl.classList.toggle("on", !!text);
      warnDurationLeft = duration;
    },

    message(text, duration = 4) {
      msgBannerEl.textContent = text || "";
      msgBannerEl.classList.toggle("on", !!text);
      msgDurationLeft = duration;
    },

    radio(text, seconds = 4.5) {
      if (text) {
        radioQueue.push({ text, secs: seconds });
      }
    },

    feed(html) {
      const itemEl = createElement("div", "h-feed-item", html);
      feedContainer.appendChild(itemEl);
      const record = { el: itemEl, life: 4, out: false, weak: false };
      activeFeedItems.push(record);
      return record;
    },

    hitmarker(type = "hit") {
      hitmarkerEl.className = "h-hit " + type;
      try {
        const scale = type === "kill" ? 1.4 : type === "weak" ? 1.25 : 1.1;
        hitmarkerEl.animate(
          [
            { opacity: 0, transform: `translate(-50%,-50%) scale(${scale})` },
            { opacity: 1, transform: "translate(-50%,-50%) scale(1)", offset: 0.35 },
            { opacity: 0, transform: "translate(-50%,-50%) scale(0.92)" },
          ],
          { duration: type === "kill" ? 420 : 240, easing: "ease-out" },
        );
      } catch (err) {}
    },

    reset() {
      radioQueue.length = 0;
      currentRadioItem = null;
      radioEl.classList.remove("on");
      for (const item of activeFeedItems) item.el.remove();
      activeFeedItems.length = 0;
      for (const arc of damageArcs) arc.life = 0;
      warnDurationLeft = 0;
      warnBannerEl.classList.remove("on");
      hudInterface.message("");
      hudInterface.setPrompt(null);
      hudInterface.setObjective("");
      cache.hp = -1;
    },

    update: updateHUD,
  };

  /**
   * HUD 每帧动力学与 UI 数据更新
   * @param {number} dt 帧耗时
   */
  function updateHUD(dt) {
    updateRadio(dt);
    if (!isHudVisible) return;

    const player = ctx.player;
    const weapon = ctx.weapon || {};
    const camera = ctx.camera;
    const adsProgress = player.ads || 0;

    // 1. 顶部罗盘刻度平移更新
    let yawDeg = ((-player.yaw * 180) / Math.PI) % 360;
    if (yawDeg < 0) yawDeg += 360;

    const tapeOffsetPx =
      Math.round((compassWidth / 2 - (yawDeg - COMPASS_MIN_DEG) * COMPASS_PX_PER_DEGREE) * 2) / 2;
    if (tapeOffsetPx !== cache.tapeX) {
      cache.tapeX = tapeOffsetPx;
      compassTapeEl.style.transform = `translate3d(${tapeOffsetPx}px,0,0)`;
    }

    const roundedHeading = Math.round(yawDeg) % 360;
    if (roundedHeading !== cache.head) {
      cache.head = roundedHeading;
      headingTextEl.textContent = String(roundedHeading).padStart(3, "0");
    }

    // 开镜时隐藏罗盘和屏幕地标
    const showMarkers = adsProgress < 0.5;
    if (showMarkers !== cache.marksOn) {
      cache.marksOn = showMarkers;
      worldMarkersContainer.classList.toggle("off", !showMarkers);
    }

    // 2. 3D 空间地标投影与测距计算
    if (activeMarkers.length) {
      camera.updateMatrixWorld();
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      const compassHalfRange = compassWidth / 2 - 14;

      for (const marker of activeMarkers) {
        const dx = marker.pos.x - player.pos.x;
        const dz = marker.pos.z - player.pos.z;
        const distMeters = Math.round(Math.hypot(dx, dz));

        if (distMeters !== marker.lastD) {
          marker.lastD = distMeters;
          const distStr = distMeters + "米";
          marker.cDist.textContent = distStr;
          marker.wDist.textContent = distStr;
        }

        // 罗盘方位标记
        let angleToTarget = (Math.atan2(dx, -dz) * 180) / Math.PI - yawDeg;
        angleToTarget = ((angleToTarget + 540) % 360) - 180;
        const compassPosPx = Math.round(
          Math.max(
            -compassHalfRange,
            Math.min(compassHalfRange, angleToTarget * COMPASS_PX_PER_DEGREE),
          ),
        );

        if (compassPosPx !== marker.lastC) {
          marker.lastC = compassPosPx;
          marker.cEl.style.transform = `translate3d(${compassPosPx}px,0,0)`;
          marker.cEl.classList.toggle("edge", Math.abs(compassPosPx) >= compassHalfRange);
        }

        // 屏幕空间视锥体投影
        tempProjectVec
          .set(marker.pos.x, marker.pos.y + (marker.kind === "extract" ? 1.2 : 1.9), marker.pos.z)
          .project(camera);

        let screenX, screenY;
        let isOffscreen = false;

        if (tempProjectVec.z > 1) {
          isOffscreen = true;
          tempProjectVec.x = -tempProjectVec.x;
          tempProjectVec.y = -tempProjectVec.y;
        }

        if (isOffscreen || Math.abs(tempProjectVec.x) > 0.9 || Math.abs(tempProjectVec.y) > 0.82) {
          isOffscreen = true;
          const normRatio = Math.max(
            Math.abs(tempProjectVec.x) / 0.9,
            Math.abs(tempProjectVec.y) / 0.82,
            0.001,
          );
          tempProjectVec.x /= normRatio;
          tempProjectVec.y /= normRatio;
          if (tempProjectVec.z > 1) {
            const edgeRatio = Math.max(
              Math.abs(tempProjectVec.x) / 0.9,
              Math.abs(tempProjectVec.y) / 0.82,
            );
            if (edgeRatio < 0.999) {
              tempProjectVec.x /= edgeRatio;
              tempProjectVec.y /= edgeRatio;
            }
          }
        }

        screenX = Math.round((tempProjectVec.x * 0.5 + 0.5) * screenWidth);
        screenY = Math.round((-tempProjectVec.y * 0.5 + 0.5) * screenHeight);

        const isCenterDim =
          !isOffscreen && Math.hypot(tempProjectVec.x, tempProjectVec.y * 0.6) < 0.16;
        const stateKey = `${screenX},${screenY}${isOffscreen ? "o" : ""}${distMeters < 3 ? "n" : ""}${isCenterDim ? "d" : ""}`;

        if (stateKey !== marker.lastW) {
          marker.lastW = stateKey;
          marker.wEl.style.transform = `translate3d(${screenX}px,${screenY}px,0)`;
          marker.wEl.classList.toggle("offscreen", isOffscreen);
          marker.wEl.classList.toggle("near", distMeters < 3);
          marker.wEl.classList.toggle("dim", isCenterDim);
        }
      }
    }

    // 3. 动态准星开合度 (与武器散布角精确映射)
    const showCrosshair = adsProgress <= 0.6 && player.alive && weapon.state !== "reloading_hidden";
    if (showCrosshair !== cache.crossOn) {
      cache.crossOn = showCrosshair;
      crosshairEl.classList.toggle("off", !showCrosshair);
    }

    if (showCrosshair) {
      const spreadAngle = typeof weapon.spread === "number" ? weapon.spread : 0.012;
      const halfFovRad = (camera.fov * Math.PI) / 360;
      let gapPx =
        (Math.tan(spreadAngle) / Math.tan(halfFovRad)) * (screenHeight / 2) +
        4 +
        (player.sprinting ? 10 : 0);
      gapPx = Math.round(Math.max(4, Math.min(70, gapPx)) * 2) / 2;

      if (gapPx !== cache.gap) {
        cache.gap = gapPx;
        crosshairBars[0].style.transform = `translate3d(-50%,${-gapPx}px,0) translateY(-100%)`;
        crosshairBars[1].style.transform = `translate3d(-50%,${gapPx}px,0)`;
        crosshairBars[2].style.transform = `translate3d(${-gapPx}px,-50%,0) translateX(-100%)`;
        crosshairBars[3].style.transform = `translate3d(${gapPx}px,-50%,0)`;
      }
    }

    // 4. 枪械弹药监视
    const magCapacity = Math.max(1, Math.min(60, weapon.magSize | 0 || 30));
    const currentAmmo = Math.max(0, weapon.ammo | 0);
    const reserveAmmo = Math.max(0, weapon.reserve | 0);

    if (magCapacity !== cache.mag) {
      cache.mag = magCapacity;
      ammoPipsContainer.innerHTML = "<i></i>".repeat(magCapacity);
      bulletPipElements = [...ammoPipsContainer.children];
      cache.ammo = -1;
    }

    if (currentAmmo !== cache.ammo) {
      cache.ammo = currentAmmo;
      ammoMagText.textContent = String(currentAmmo).padStart(2, "0");
      for (let i = 0; i < bulletPipElements.length; i++) {
        bulletPipElements[i].className = i < currentAmmo ? "" : "off";
      }
    }

    if (reserveAmmo !== cache.reserve) {
      cache.reserve = reserveAmmo;
      ammoReserveText.textContent = String(reserveAmmo).padStart(3, "0");
    }

    if (weapon.name !== cache.name) {
      cache.name = weapon.name;
      weaponNameText.textContent = weapon.name || "";
    }

    const isLowAmmo = currentAmmo <= Math.ceil(magCapacity * 0.27);
    const cueMessage =
      weapon.state === "reloading"
        ? "换弹中"
        : currentAmmo === 0
          ? reserveAmmo > 0
            ? ctx.input.touch
              ? "换弹"
              : "R · 换弹"
            : "弹药耗尽"
          : isLowAmmo
            ? "弹药不足"
            : "";

    if (cueMessage !== cache.cue) {
      cache.cue = cueMessage;
      ammoCueText.textContent = cueMessage;
      ammoCueText.className =
        "h-cue" +
        (cueMessage ? " on" : "") +
        (currentAmmo === 0 && weapon.state !== "reloading" ? " urgent" : "");
    }

    if (isLowAmmo !== cache.low) {
      cache.low = isLowAmmo;
      ammoEl.classList.toggle("low", isLowAmmo);
    }

    // 5. 生命值显示与分段血条
    const currentHp = Math.max(0, Math.ceil(player.health));
    const isInjured = player.health < player.maxHealth - 0.5;

    if (currentHp !== cache.hp) {
      cache.hp = currentHp;
      hpNumberText.textContent = String(currentHp);
      const activeSegs = Math.ceil((currentHp / player.maxHealth) * hpSegmentBars.length);
      if (activeSegs !== cache.hpSeg) {
        cache.hpSeg = activeSegs;
        for (let i = 0; i < hpSegmentBars.length; i++) {
          hpSegmentBars[i].className = i < activeSegs ? "" : "off";
        }
        healthEl.classList.toggle("crit", activeSegs <= 3);
      }
    }

    if (isInjured !== cache.hurt) {
      cache.hurt = isInjured;
      healthEl.classList.toggle("on", isInjured);
    }

    // 6. 受击方向弧形更新
    for (const arc of damageArcs) {
      if (arc.life <= 0) {
        if (arc.op !== 0) {
          arc.op = 0;
          arc.el.style.opacity = "0";
        }
        continue;
      }
      arc.life -= dt;
      const angle = Math.atan2(arc.src.x - player.pos.x, -(arc.src.z - player.pos.z)) + player.yaw;
      const deg = Math.round((angle * 180) / Math.PI);
      if (deg !== arc.rot) {
        arc.rot = deg;
        arc.el.style.transform = `translate(-50%,-50%) rotate(${deg}deg)`;
      }
      const alpha = Math.round(Math.min(1, Math.max(0, arc.life / 0.6)) * 20) / 20;
      if (alpha !== arc.op) {
        arc.op = alpha;
        arc.el.style.opacity = String(alpha);
      }
    }

    // 7. 目标文字打字机滚动效果
    if (objTypedChars < currentObjective.length) {
      objTypewriterProgress += dt * 46;
      const targetCount = Math.min(currentObjective.length, Math.floor(objTypewriterProgress));
      if (targetCount !== objTypedChars) {
        objTypedChars = targetCount;
        objTextEl.textContent = currentObjective.slice(0, targetCount);
      }
    }

    // 提示条倒计时衰减
    if (warnDurationLeft > 0) {
      warnDurationLeft -= dt;
      if (warnDurationLeft <= 0) warnBannerEl.classList.remove("on");
    }
    if (msgDurationLeft > 0) {
      msgDurationLeft -= dt;
      if (msgDurationLeft <= 0) msgBannerEl.classList.remove("on");
    }

    // 战况 Feed 渐变销毁
    for (let i = activeFeedItems.length - 1; i >= 0; i--) {
      const item = activeFeedItems[i];
      item.life -= dt;
      if (item.life <= 0) {
        item.el.remove();
        activeFeedItems.splice(i, 1);
      } else if (item.life < 0.6 && !item.out) {
        item.out = true;
        item.el.classList.add("out");
      }
    }
  }

  /**
   * 指挥中心无线电打字机更新
   * @param {number} dt
   */
  function updateRadio(dt) {
    if (!currentRadioItem) {
      if (!radioQueue.length) return;
      currentRadioItem = radioQueue.shift();
      radioTypedChars = 0;
      radioTypewriterProgress = 0;
      radioDurationLeft = currentRadioItem.secs;
      radioTextEl.textContent = "";
      radioEl.classList.add("on");
      ctx.events.emit("radio:line", { text: currentRadioItem.text });
    }

    const fullText = currentRadioItem.text;
    if (radioTypedChars < fullText.length) {
      radioTypewriterProgress += dt * 58;
      const count = Math.min(fullText.length, Math.floor(radioTypewriterProgress));
      if (count !== radioTypedChars) {
        radioTypedChars = count;
        radioTextEl.textContent = fullText.slice(0, count);
      }
    } else {
      radioDurationLeft -= dt;
      if (radioDurationLeft <= 0) {
        currentRadioItem = null;
        if (!radioQueue.length) {
          radioEl.classList.remove("on");
        }
      }
    }
  }

  onResize();
  return hudInterface;
}

export const create = createHUD;
export { createHUD as hM, createElement };

// @ts-check
/**
 * @file src/debug.js
 * @description 《几猫国产3A大作》开发者可视化调试套件 (In-Engine Visual Debug Suite)
 *
 * 【核心能力】
 * 1. 物理碰撞体线框渲染 (Physics Colliders Wireframe Overlay)
 * 2. 自由穿墙漫游视角 (Noclip Free-Flight Camera)
 * 3. 动态光照与环境调校 (Sun Elevation/Azimuth/Intensity, Fog, Exposure)
 * 4. 战局调试与作弊套件 (God Mode, Infinite Ammo, Instant Kill/Heal, Bullet-Time)
 * 5. 快速传送跳点 (Teleport Presets)
 * 6. 沙盒陈列室一键直达 (Showcase Mode Switcher)
 * 7. 实时性能遥测 (Live Telemetry HUD)
 */

import * as THREE from "three";

/**
 * 常用地图关键点传送坐标
 */
const TELEPORT_POINTS = [
  { name: "Berth 4 Spawn", pos: [-32, 1.8, 12], yaw: 0 },
  { name: "Container Yard", pos: [-10, 1.8, 2], yaw: Math.PI / 2 },
  { name: "Crane Summit", pos: [-12, 28, 18], yaw: -Math.PI / 4 },
  { name: "Quay Waterfront", pos: [8, 1.8, -12], yaw: Math.PI },
  { name: "Warehouse 4", pos: [-24, 1.8, -20], yaw: -Math.PI / 2 },
  { name: "Patrol Boat (Extract)", pos: [22, 1.8, 16], yaw: Math.PI / 3 },
];

/**
 * 注入调试面板全局样式
 */
function injectDebugStyles() {
  if (document.getElementById("jm-debug-style")) return;
  const style = document.createElement("style");
  style.id = "jm-debug-style";
  style.textContent = `
    .jm-debug-toggle-btn {
      position: fixed;
      top: 14px;
      right: 14px;
      z-index: 99999;
      background: rgba(11, 13, 15, 0.75);
      border: 1px solid rgba(255, 179, 71, 0.5);
      color: #ffb347;
      font-family: monospace;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      transition: all 0.2s ease;
      user-select: none;
    }
    .jm-debug-toggle-btn:hover {
      background: rgba(255, 179, 71, 0.2);
      border-color: #ffc977;
      color: #fff;
    }
    .jm-debug-panel {
      position: fixed;
      top: 50px;
      right: 14px;
      width: 360px;
      max-height: 85vh;
      background: rgba(11, 13, 15, 0.88);
      border: 1px solid rgba(232, 228, 218, 0.2);
      border-top: 3px solid #ffb347;
      color: #e8e4da;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      border-radius: 6px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(14px);
      user-select: none;
      overflow: hidden;
      animation: jmFadeIn 0.2s ease-out;
    }
    @keyframes jmFadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .jm-debug-header {
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.04);
      border-bottom: 1px solid rgba(232, 228, 218, 0.1);
      font-weight: 600;
      color: #ffb347;
      letter-spacing: 0.5px;
    }
    .jm-debug-close {
      cursor: pointer;
      color: #8d9aa3;
      font-size: 16px;
      line-height: 1;
      padding: 2px 6px;
    }
    .jm-debug-close:hover {
      color: #ff5a40;
    }
    .jm-debug-tabs {
      display: flex;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(232, 228, 218, 0.1);
      overflow-x: auto;
    }
    .jm-debug-tab {
      flex: 1;
      text-align: center;
      padding: 8px 4px;
      cursor: pointer;
      color: #8d9aa3;
      font-size: 11px;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .jm-debug-tab.active {
      color: #ffb347;
      border-bottom-color: #ffb347;
      background: rgba(255, 179, 71, 0.06);
    }
    .jm-debug-content {
      padding: 14px;
      overflow-y: auto;
      flex: 1;
    }
    .jm-debug-section {
      display: none;
    }
    .jm-debug-section.active {
      display: block;
    }
    .jm-debug-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .jm-debug-label {
      color: #d1d5db;
    }
    .jm-debug-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #e8e4da;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.15s;
    }
    .jm-debug-btn:hover {
      background: rgba(255, 179, 71, 0.25);
      border-color: #ffb347;
      color: #fff;
    }
    .jm-debug-btn.active {
      background: #ffb347;
      color: #0b0d0f;
      font-weight: 600;
    }
    .jm-debug-btn.danger:hover {
      background: rgba(255, 90, 64, 0.3);
      border-color: #ff5a40;
    }
    .jm-debug-slider-row {
      margin-bottom: 12px;
    }
    .jm-debug-slider-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      color: #8d9aa3;
    }
    .jm-debug-slider {
      width: 100%;
      height: 4px;
      accent-color: #ffb347;
      cursor: pointer;
    }
    .jm-debug-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-top: 8px;
    }
    .jm-debug-stat-box {
      background: rgba(0, 0, 0, 0.3);
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      font-family: monospace;
      font-size: 11px;
    }
    .jm-debug-stat-title {
      color: #8d9aa3;
      font-size: 10px;
      margin-bottom: 2px;
    }
    .jm-debug-stat-val {
      color: #ffb347;
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);
}

/**
 * 创建全套开发者可视化调试套件
 * @param {import('./types').EngineContext} ctx
 */
export function createDebugSuite(ctx) {
  injectDebugStyles();

  let panelVisible = false;
  let collidersVisible = false;
  let noclipActive = false;
  let infiniteAmmoActive = false;
  let godModeActive = false;
  let activeTab = "cheats";

  // 1. 物理碰撞线框可视化 Mesh 容器
  const collidersGroup = new THREE.Group();
  collidersGroup.name = "__debug_colliders__";
  collidersGroup.visible = false;
  ctx.scene.add(collidersGroup);

  let collidersBuilt = false;

  function buildCollidersWireframe() {
    if (collidersBuilt) return;
    if (!ctx.physics || !ctx.physics.boxes) return;

    // 清理旧资源
    while (collidersGroup.children.length > 0) {
      const child = /** @type {any} */ (collidersGroup.children[0]);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      collidersGroup.remove(child);
    }

    const defaultMat = new THREE.LineBasicMaterial({
      color: 0x00e676,
      transparent: true,
      opacity: 0.85,
    });
    const waterMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
    });
    const metalMat = new THREE.LineBasicMaterial({
      color: 0xffb347,
      transparent: true,
      opacity: 0.85,
    });

    const boxes = ctx.physics.boxes;
    for (const b of boxes) {
      const dx = Math.max(0.05, b.max.x - b.min.x);
      const dy = Math.max(0.05, b.max.y - b.min.y);
      const dz = Math.max(0.05, b.max.z - b.min.z);

      const geom = new THREE.BoxGeometry(dx, dy, dz);
      const wireGeom = new THREE.WireframeGeometry(geom);
      geom.dispose();

      let mat = defaultMat;
      if (b.surface === "water") mat = waterMat;
      else if (b.surface === "metal") mat = metalMat;

      const line = new THREE.LineSegments(wireGeom, mat);
      line.position.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2);
      collidersGroup.add(line);
    }

    collidersBuilt = true;
  }

  // 2. Noclip 飞行状态追踪
  const noclipKeys = { w: false, a: false, s: false, d: false, space: false, shift: false };
  const flySpeed = { current: 15, boost: 3 };

  window.addEventListener("keydown", (e) => {
    // 快捷键: ~ 或 F1 键切换调试面板
    if (e.code === "Backquote" || e.code === "F1") {
      togglePanel();
      e.preventDefault();
      return;
    }

    if (!noclipActive) return;
    if (e.code === "KeyW") noclipKeys.w = true;
    if (e.code === "KeyS") noclipKeys.s = true;
    if (e.code === "KeyA") noclipKeys.a = true;
    if (e.code === "KeyD") noclipKeys.d = true;
    if (e.code === "Space") noclipKeys.space = true;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") noclipKeys.shift = true;
  });

  window.addEventListener("keyup", (e) => {
    if (!noclipActive) return;
    if (e.code === "KeyW") noclipKeys.w = false;
    if (e.code === "KeyS") noclipKeys.s = false;
    if (e.code === "KeyA") noclipKeys.a = false;
    if (e.code === "KeyD") noclipKeys.d = false;
    if (e.code === "Space") noclipKeys.space = false;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") noclipKeys.shift = false;
  });

  // 3. UI 元素创建
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "jm-debug-toggle-btn";
  toggleBtn.textContent = "⚡ DevSuite (~ / F1)";
  toggleBtn.onclick = () => togglePanel();
  document.body.appendChild(toggleBtn);

  const panel = document.createElement("div");
  panel.className = "jm-debug-panel";
  panel.style.display = "none";
  panel.innerHTML = `
    <div class="jm-debug-header">
      <span>SALTLINE DevSuite</span>
      <span class="jm-debug-close" title="Close Panel">✕</span>
    </div>
    <div class="jm-debug-tabs">
      <div class="jm-debug-tab active" data-tab="cheats">Cheats</div>
      <div class="jm-debug-tab" data-tab="noclip">NoClip</div>
      <div class="jm-debug-tab" data-tab="physics">Physics</div>
      <div class="jm-debug-tab" data-tab="lighting">Lighting</div>
      <div class="jm-debug-tab" data-tab="teleport">Teleport</div>
      <div class="jm-debug-tab" data-tab="showcase">Showcases</div>
      <div class="jm-debug-tab" data-tab="stats">Telemetry</div>
    </div>
    <div class="jm-debug-content">
      <!-- 1. 快捷作弊 -->
      <div class="jm-debug-section active" id="sec-cheats">
        <div class="jm-debug-row">
          <span class="jm-debug-label">God Mode</span>
          <button class="jm-debug-btn" id="btn-god">OFF</button>
        </div>
        <div class="jm-debug-row">
          <span class="jm-debug-label">Infinite Ammo</span>
          <button class="jm-debug-btn" id="btn-ammo">OFF</button>
        </div>
        <div class="jm-debug-row">
          <span class="jm-debug-label">Restore Vitals</span>
          <button class="jm-debug-btn" id="btn-heal">Full Health</button>
        </div>
        <div class="jm-debug-row">
          <span class="jm-debug-label">Clear All Enemies</span>
          <button class="jm-debug-btn danger" id="btn-killall">Kill All</button>
        </div>
        <div class="jm-debug-slider-row" style="margin-top: 14px;">
          <div class="jm-debug-slider-header">
            <span>Bullet Time (Time Scale)</span>
            <span id="val-timescale">1.0x</span>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="jm-debug-btn" data-scale="0.1">0.1x</button>
            <button class="jm-debug-btn" data-scale="0.25">0.25x</button>
            <button class="jm-debug-btn" data-scale="0.5">0.5x</button>
            <button class="jm-debug-btn active" data-scale="1.0">1.0x</button>
            <button class="jm-debug-btn" data-scale="2.0">2.0x</button>
            <button class="jm-debug-btn" data-scale="5.0">5.0x</button>
          </div>
        </div>
      </div>

      <!-- 2. 自由漫游 -->
      <div class="jm-debug-section" id="sec-noclip">
        <div class="jm-debug-row">
          <span class="jm-debug-label">Free Flight Camera</span>
          <button class="jm-debug-btn" id="btn-noclip">OFF</button>
        </div>
        <p style="color: #8d9aa3; font-size: 11px; line-height: 1.5; margin: 8px 0;">
          WASD moves, Space ascends, Shift descends.
        </p>
        <div class="jm-debug-slider-row">
          <div class="jm-debug-slider-header">
            <span>Flight Speed</span>
            <span id="val-flyspeed">15 m/s</span>
          </div>
          <input type="range" class="jm-debug-slider" id="slider-flyspeed" min="5" max="60" value="15" />
        </div>
      </div>

      <!-- 3. 碰撞线框 -->
      <div class="jm-debug-section" id="sec-physics">
        <div class="jm-debug-row">
          <span class="jm-debug-label">Show Collider Wireframes</span>
          <button class="jm-debug-btn" id="btn-colliders">OFF</button>
        </div>
        <p style="color: #8d9aa3; font-size: 11px; line-height: 1.5;">
          Green: ground/buildings; Orange: metal props; Cyan: water/quay boundaries.
        </p>
      </div>

      <!-- 4. 光照天候 -->
      <div class="jm-debug-section" id="sec-lighting">
        <div class="jm-debug-slider-row">
          <div class="jm-debug-slider-header">
            <span>Sun Intensity</span>
            <span id="val-sun-intensity">3.5</span>
          </div>
          <input type="range" class="jm-debug-slider" id="slider-sun-intensity" min="0" max="10" step="0.2" value="3.5" />
        </div>
        <div class="jm-debug-slider-row">
          <div class="jm-debug-slider-header">
            <span>Exposure</span>
            <span id="val-exposure">1.0</span>
          </div>
          <input type="range" class="jm-debug-slider" id="slider-exposure" min="0.2" max="3.0" step="0.1" value="1.0" />
        </div>
      </div>

      <!-- 5. 传送跳点 -->
      <div class="jm-debug-section" id="sec-teleport">
        <div class="jm-debug-grid" id="teleport-list"></div>
      </div>

      <!-- 6. 沙盒陈列室 -->
      <div class="jm-debug-section" id="sec-showcase">
        <div class="jm-debug-grid">
          <button class="jm-debug-btn" data-url="/?bench=1">Benchmark</button>
          <button class="jm-debug-btn" data-url="/?show=weapon">Weapons</button>
          <button class="jm-debug-btn" data-url="/?show=enemies">Enemies</button>
          <button class="jm-debug-btn" data-url="/?show=fx">FX Systems</button>
          <button class="jm-debug-btn" data-url="/?show=props">Props</button>
          <button class="jm-debug-btn" data-url="/?show=materials">Materials</button>
          <button class="jm-debug-btn" data-url="/?show=ground">Ground & Water</button>
          <button class="jm-debug-btn" data-url="/">Main Game</button>
        </div>
      </div>

      <!-- 7. 性能遥测 -->
      <div class="jm-debug-section" id="sec-stats">
        <div class="jm-debug-grid">
          <div class="jm-debug-stat-box">
            <div class="jm-debug-stat-title">FPS</div>
            <div class="jm-debug-stat-val" id="stat-fps">--</div>
          </div>
          <div class="jm-debug-stat-box">
            <div class="jm-debug-stat-title">Draw Calls</div>
            <div class="jm-debug-stat-val" id="stat-calls">--</div>
          </div>
          <div class="jm-debug-stat-box">
            <div class="jm-debug-stat-title">Triangles</div>
            <div class="jm-debug-stat-val" id="stat-tris">--</div>
          </div>
          <div class="jm-debug-stat-box">
            <div class="jm-debug-stat-title">Geometries</div>
            <div class="jm-debug-stat-val" id="stat-geos">--</div>
          </div>
          <div class="jm-debug-stat-box">
            <div class="jm-debug-stat-title">Textures</div>
            <div class="jm-debug-stat-val" id="stat-tex">--</div>
          </div>
          <div class="jm-debug-stat-box">
            <div class="jm-debug-stat-title">Resolution</div>
            <div class="jm-debug-stat-val" id="stat-res">--</div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // 绑定关闭按钮
  panel.querySelector(".jm-debug-close")?.addEventListener("click", () => togglePanel(false));

  // 选项卡切换
  panel.querySelectorAll(".jm-debug-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      panel.querySelectorAll(".jm-debug-tab").forEach((t) => t.classList.remove("active"));
      panel.querySelectorAll(".jm-debug-section").forEach((s) => s.classList.remove("active"));
      tab.classList.add("active");
      const targetTab = tab.getAttribute("data-tab");
      panel.querySelector(`#sec-${targetTab}`)?.classList.add("active");
    });
  });

  // 1. 无敌模式开关
  const btnGod = /** @type {HTMLButtonElement} */ (panel.querySelector("#btn-god"));
  btnGod.onclick = () => {
    godModeActive = !godModeActive;
    btnGod.textContent = godModeActive ? "ON" : "OFF";
    btnGod.classList.toggle("active", godModeActive);
    if (ctx.player) {
      ctx.player.invulnerable = godModeActive;
      if (godModeActive) ctx.player.health = ctx.player.maxHealth;
    }
  };

  // 2. 无限弹药开关
  const btnAmmo = /** @type {HTMLButtonElement} */ (panel.querySelector("#btn-ammo"));
  btnAmmo.onclick = () => {
    infiniteAmmoActive = !infiniteAmmoActive;
    btnAmmo.textContent = infiniteAmmoActive ? "ON" : "OFF";
    btnAmmo.classList.toggle("active", infiniteAmmoActive);
    if (ctx.weapon && infiniteAmmoActive) {
      ctx.weapon.ammo = 999;
      ctx.weapon.reserve = 999;
    }
  };

  // 3. 满血满甲
  panel.querySelector("#btn-heal")?.addEventListener("click", () => {
    if (ctx.player) {
      ctx.player.health = ctx.player.maxHealth;
      ctx.player.alive = true;
    }
  });

  // 4. 清空敌人
  panel.querySelector("#btn-killall")?.addEventListener("click", () => {
    if (ctx.enemies && typeof ctx.enemies.clear === "function") {
      ctx.enemies.clear();
    }
  });

  // 5. 时间倍率
  panel.querySelectorAll("[data-scale]").forEach((btn) => {
    btn.addEventListener("click", () => {
      panel.querySelectorAll("[data-scale]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const scale = parseFloat(btn.getAttribute("data-scale") || "1.0");
      if (ctx.time) ctx.time.scale = scale;
      const valEl = panel.querySelector("#val-timescale");
      if (valEl) valEl.textContent = `${scale.toFixed(2)}x`;
    });
  });

  // 6. 飞行与漫游
  const btnNoclip = /** @type {HTMLButtonElement} */ (panel.querySelector("#btn-noclip"));
  btnNoclip.onclick = () => {
    noclipActive = !noclipActive;
    btnNoclip.textContent = noclipActive ? "ON" : "OFF";
    btnNoclip.classList.toggle("active", noclipActive);
    if (ctx.player) {
      ctx.player.enabled = !noclipActive;
    }
  };

  const sliderFlySpeed = /** @type {HTMLInputElement} */ (panel.querySelector("#slider-flyspeed"));
  sliderFlySpeed?.addEventListener("input", (e) => {
    flySpeed.current = parseFloat(/** @type {HTMLInputElement} */ (e.target).value);
    const valEl = panel.querySelector("#val-flyspeed");
    if (valEl) valEl.textContent = `${flySpeed.current} m/s`;
  });

  // 7. 碰撞线框开关
  const btnColliders = /** @type {HTMLButtonElement} */ (panel.querySelector("#btn-colliders"));
  btnColliders.onclick = () => {
    collidersVisible = !collidersVisible;
    btnColliders.textContent = collidersVisible ? "ON" : "OFF";
    btnColliders.classList.toggle("active", collidersVisible);
    if (collidersVisible) buildCollidersWireframe();
    collidersGroup.visible = collidersVisible;
  };

  // 8. 光照调节
  const sliderSun = /** @type {HTMLInputElement} */ (panel.querySelector("#slider-sun-intensity"));
  sliderSun?.addEventListener("input", (e) => {
    const val = parseFloat(/** @type {HTMLInputElement} */ (e.target).value);
    const sun = ctx.scene.getObjectByName("sun");
    if (sun && "intensity" in sun) /** @type {any} */ (sun).intensity = val;
    const valEl = panel.querySelector("#val-sun-intensity");
    if (valEl) valEl.textContent = val.toFixed(1);
  });

  const sliderExp = /** @type {HTMLInputElement} */ (panel.querySelector("#slider-exposure"));
  sliderExp?.addEventListener("input", (e) => {
    const val = parseFloat(/** @type {HTMLInputElement} */ (e.target).value);
    if (ctx.renderer) ctx.renderer.toneMappingExposure = val;
    const valEl = panel.querySelector("#val-exposure");
    if (valEl) valEl.textContent = val.toFixed(1);
  });

  // 9. 传送点渲染
  const teleportContainer = panel.querySelector("#teleport-list");
  if (teleportContainer) {
    for (const tp of TELEPORT_POINTS) {
      const btn = document.createElement("button");
      btn.className = "jm-debug-btn";
      btn.textContent = tp.name;
      btn.onclick = () => {
        if (ctx.player) {
          ctx.player.pos.set(tp.pos[0], tp.pos[1], tp.pos[2]);
          ctx.camera.position.set(tp.pos[0], tp.pos[1] + 1.6, tp.pos[2]);
          ctx.player.vel.set(0, 0, 0);
          if (tp.yaw !== undefined) ctx.player.yaw = tp.yaw;
        }
      };
      teleportContainer.appendChild(btn);
    }
  }

  // 10. 沙盒跳转
  panel.querySelectorAll("[data-url]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetUrl = btn.getAttribute("data-url");
      if (targetUrl) window.location.href = targetUrl;
    });
  });

  function togglePanel(force) {
    panelVisible = force !== undefined ? force : !panelVisible;
    panel.style.display = panelVisible ? "flex" : "none";
    if (panelVisible) {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }

  // 内部数学计算复用矢量
  const vMove = new THREE.Vector3();
  const vForward = new THREE.Vector3();
  const vRight = new THREE.Vector3();

  return {
    get isVisible() {
      return panelVisible;
    },
    toggle: togglePanel,
    update(dt) {
      // 保持无敌与无限弹药锁定
      if (godModeActive && ctx.player) {
        ctx.player.health = ctx.player.maxHealth;
        ctx.player.invulnerable = true;
      }
      if (infiniteAmmoActive && ctx.weapon) {
        if (ctx.weapon.ammo < 30) ctx.weapon.ammo = 30;
        if (ctx.weapon.reserve < 180) ctx.weapon.reserve = 180;
      }

      // Noclip 飞行位移解算
      if (noclipActive && ctx.camera) {
        const speed = flySpeed.current * (noclipKeys.shift ? flySpeed.boost : 1.0) * dt;
        ctx.camera.getWorldDirection(vForward);
        vRight.crossVectors(vForward, ctx.camera.up).normalize();

        vMove.set(0, 0, 0);
        if (noclipKeys.w) vMove.add(vForward);
        if (noclipKeys.s) vMove.sub(vForward);
        if (noclipKeys.d) vMove.add(vRight);
        if (noclipKeys.a) vMove.sub(vRight);
        if (noclipKeys.space) vMove.y += 1;

        if (vMove.lengthSq() > 0.0001) {
          vMove.normalize().multiplyScalar(speed);
          ctx.camera.position.add(vMove);
          if (ctx.player) {
            ctx.player.pos.copy(ctx.camera.position);
            ctx.player.vel.set(0, 0, 0);
          }
        }
      }

      // 实时更新性能遥测面板
      if (panelVisible) {
        const stats = typeof window.__stats === "function" ? window.__stats() : null;
        if (stats) {
          const fpsEl = panel.querySelector("#stat-fps");
          const callsEl = panel.querySelector("#stat-calls");
          const trisEl = panel.querySelector("#stat-tris");
          const geosEl = panel.querySelector("#stat-geos");
          const texEl = panel.querySelector("#stat-tex");
          const resEl = panel.querySelector("#stat-res");

          if (fpsEl && stats.fps !== undefined) fpsEl.textContent = `${stats.fps}`;
          if (callsEl && stats.calls !== undefined) callsEl.textContent = `${stats.calls}`;
          if (trisEl && stats.tris !== undefined)
            trisEl.textContent = `${(stats.tris / 1000).toFixed(1)}k`;
          if (geosEl && stats.geos !== undefined) geosEl.textContent = `${stats.geos}`;
          if (texEl && stats.tex !== undefined) texEl.textContent = `${stats.tex}`;
          if (resEl && stats.res) resEl.textContent = `${stats.res[0]}x${stats.res[1]}`;
        }
      }
    },
    destroy() {
      toggleBtn.remove();
      panel.remove();
      ctx.scene.remove(collidersGroup);
    },
  };
}

export const create = createDebugSuite;

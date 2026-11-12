# 《几猫国产3A大作》战术 HUD 与 UI 渲染系统 Wiki 文档

> **模块归属**: [src/hud.js](file:///Volumes/M1/3A/src/hud.js) & [src/ui.css](file:///Volumes/M1/3A/src/ui.css)  
> **逆向状态**: **100% 完整逆向还原 (Fully Deobfuscated & Clean ESM)**  
> **核心机制**: 360° 磁带滚动战术罗盘（Tape Compass: 4px/deg）、3D 空间目标点屏幕逆投影与视锥体边缘贴靠（Screen-edge Clamping）、武器散布动态准星、4 向受击方位指示弧、10 段式生命监视器、30 发弹药状态排针、无线电打字机通讯字幕与暗黑工业风 CSS 渲染体系。

---

## 1. 架构总览 (Architecture Overview)

战术 HUD 采用**纯原生 DOM + SVG 矢量图元**构建，依托高性能 GPU 硬件合成图层（`translate3d` 与 `transform`），彻底杜绝 Canvas 2D 逐帧重绘的 CPU 开销与内存垃圾回收（GC）抖动。

```
+-------------------------------------------------------------------------------+
|   [任务目标] 切断四号泊位安全中继 (0/3)    [045° 东北] 滚动磁带罗盘    [FPS: 60]   |
|   - 甲号中继 (堆场): 18米                     [▲] 指针针尖                    |
|                                                                               |
|                                                                               |
|                                     |                                         |
|                                --   +   --                                    |
|                                     |                                         |
|                                (动态扩散准星)                                  |
|                                                                               |
|            ( 受击方向弧光 )                                                     |
|                  弧                                                           |
|                                                                               |
|  [+] 生命状态 100/100                               PAC-9 · 几猫九式突击步枪    |
|  [■■■■■■■■■■] 10段网格                             30 / 120  [||||||||||||]  |
|                                                    [R · 换弹] 战术指示标签    |
+-------------------------------------------------------------------------------+
|  【指挥中心】: 干员，四号泊位已被失控防卫网络封锁，立即前往甲号中继执行骇入！...    |
+-------------------------------------------------------------------------------+
```

---

## 2. 磁带滚动战术罗盘与 3D 地标投影 (Tape Compass & Waypoints)

### 2.1 360° 磁带滚动罗盘 (Tape Compass Engine)
- **像素/角度物理比例**: 每 $1^\circ$ 视向偏角对应 `COMPASS_PX_PER_DEGREE = 4px` 物理位移。
- **循环刻度跨度**: 罗盘覆盖 $-90^\circ \sim 450^\circ$（共 $540^\circ$ 宽域缓冲），当玩家水平视角（Yaw）在 $[0, 2\pi]$ 连续转动时，磁带通过平滑取模将位移保持在无缝视口内：

$$X_{\text{tape}} = \text{round}\left( \frac{W_{\text{compass}}}{2} - (\theta_{\text{yaw}} \cdot \frac{180}{\pi} - \theta_0) \times 4 \right)$$

- **刻度类型拆分**:
  - 每 $5^\circ$: 次要细刻度线 (`mn`)
  - 每 $15^\circ$: 主要中刻度线 (`md`) 并附带 3 位数字方位角（如 `045`, `090`, `135`）
  - 每 $45^\circ$: 关键主罗盘刻度 (`mj`) 并附带汉字基准方位（`北`, `东北`, `东`, `东南`, `南`, `西南`, `西`, `西北`）

### 2.2 世界空间 3D 地标屏幕逆投影 (World-to-Screen Projection)
关卡中的三处中继发射塔与南端撤离艇泊位，实时通过相机视图矩阵与投影矩阵逆运算投影到干员视野中：

```javascript
// 3D 世界坐标投射至归一化设备坐标 (NDC: [-1, 1])
const ndcPos = waypointWorldPos.clone().project(camera);

// 判定地标是否在玩家视线正后方 (Z > 1)
const isBehind = ndcPos.z > 1.0;
if (isBehind) {
  ndcPos.x = -ndcPos.x;
  ndcPos.y = -ndcPos.y;
}

// 屏幕视口边缘贴靠 (Screen-Edge Clamping)
const clampX = 0.90; // 水平保留 10% 边距
const clampY = 0.82; // 垂直保留 18% 边距
if (Math.abs(ndcPos.x) > clampX || Math.abs(ndcPos.y) > clampY) {
  const scale = Math.max(Math.abs(ndcPos.x) / clampX, Math.abs(ndcPos.y) / clampY);
  ndcPos.x /= scale;
  ndcPos.y /= scale;
}

// 映射为屏幕绝对像素
const screenX = (ndcPos.x * 0.5 + 0.5) * window.innerWidth;
const screenY = (-ndcPos.y * 0.5 + 0.5) * window.innerHeight;
```

---

## 3. 动态扩散准星与受击方向弧 (Dynamic Reticle & Damage Arcs)

### 3.1 动态准星算法 (Dynamic Spread Reticle)
准星由 4 条正交标尺线（上、下、左、右）与中心瞄点组成。标尺间隙（`gap`）根据武器当前的实时散布角（Spread）动态计算：

$$\text{Gap}_{\text{px}} = \text{round}\left( \frac{\tan(\theta_{\text{spread}})}{\tan(\text{FOV}_{\text{rad}} / 2)} \cdot \frac{H_{\text{screen}}}{2} + 4 + (\text{isSprinting} ? 10 : 0) \right)$$

- **腰射静止**: 散布角 $\theta = 0.022\text{ rad}$，准星间距约 $16\text{ px}$。
- **开火后坐力**: 连续射击时散布迅速扩张至 $48\text{ px}$。
- **ADS 开镜瞄准**: 准星整体 `opacity: 0` 平滑淡出隐藏，焦点转移至全息瞄具内部发光红点。

### 3.2 3D 威胁源受击方向弧光 (Damage Direction Arcs)
当玩家受到机械飞鸥脉冲机枪或猎犬飞扑抓挠时，系统计算**伤害来源世界坐标 $\vec{P}_{\text{src}}$ 相对玩家当前面朝方向 $\vec{F}_{\text{player}}$ 的水平方位角 $\alpha$**：

$$\alpha = \text{atan2}(P_{\text{src}.x} - P_{\text{player}.x}, -(P_{\text{src}.z} - P_{\text{player}.z})) - \text{Yaw}_{\text{player}}$$

- SVG 战术弧形指针立即旋转至 $\alpha$ 角度。
- 采用高饱和度警示红光（`#ff2b2b`）在屏幕正中环绕高亮，并在 $0.60\text{ 秒}$ 内以指数曲线平滑衰减淡出。

---

## 4. 生命体征监视器与弹药状态排针 (Vitality & Ammo Displays)

### 4.1 生命体征监视器 (`.h-health`)
- **左下角战术状态面板**:
  - 大字号三位数显示当前实时生命值（`100`）。
  - **10 段式自适应物理分格条 (`i` 标签阵列)**：每 10 点生命代表 1 格，生命值降低时网格依次熄灭变暗。
  - **危殆警报状态**: 当生命值 $\le 30$ 点时，血条网格进入红色高频闪烁模式（`.crit` 类），提示干员寻找掩体脱离火力线。

### 4.2 弹药状态排针与装填提示 (`.h-ammo`)
- **双排数字展示**: 大字号显示当前弹匣剩余弹数，小字号浅灰显示总备弹数。
- **30 发物理子弹排针 (`.h-pips`)**:
  - 30 个并排微型发光矩阵，每射出一发子弹，对应的排针瞬时变暗。
  - 弹药不足 8 发时，整体闪烁橙黄色警示光，右侧弹出“弹药不足”战术标签。
  - 弹匣打空时，标签变为深红急迫状态：“<kbd>R</kbd> · 换弹”。

---

## 5. 无线电打字机通讯系统 (Radio Comms Pipeline)

游戏包含一套异步调度的军事战术无线电通讯字幕队列，模拟特战头盔目镜内的文字投射：

```javascript
// 队列调度状态机
const radioQueue = [];
let currentRadioItem = null;

// 打字机以 58 字符/秒 匀速解密展开文本
if (typedChars < fullText.length) {
  progress += dt * 58;
  const targetLen = Math.min(fullText.length, Math.floor(progress));
  if (targetLen !== typedChars) {
    typedChars = targetLen;
    radioTextElement.textContent = fullText.slice(0, typedChars);
  }
}
```

- **全流程通讯脚本覆盖**:
  1. 开局渗透简报：“各单位注意，已抵达四号泊位外围，首要切断甲号中继。”
  2. 首遭敌情：“雷达告警！检测到失控巡逻集群，准许自由开火消除威胁！”
  3. 中继切断确认：“甲号中继链路已切断，自卫网络已察觉，准备迎击增援波次！”
  4. 全目标达成与撤离指令：“所有中继站切断完毕！撤离快艇已在南端泊位就绪，立即撤离！”

---

## 6. 工业暗黑战术视觉样式体系 (`ui.css`)

UI 样式严格遵循现代硬核工业科幻美学标准：

| 视觉元素 | 规范设定 | CSS 实现与特性 |
| :--- | :--- | :--- |
| **基础色板 (Color Palette)** | 战术深黑背景 + 工业琥珀金 + 警告红 | `rgba(10, 14, 16, 0.85)` 磨砂半透背景，高亮主色 `#e6f0d8`，警戒色 `#ff4433` |
| **标准字体栈 (Typography)** | 等宽数字 + 工业无衬线字体 | `font-family: ui-monospace, "PingFang SC", "SF Pro Display", monospace` |
| **视口层级隔离 (Z-Index Hierarchy)** | 背景 HUD < 交互提示 < 模态设置菜单 | HUD (`z-index: 10`)，受击红晕 (`z-index: 20`)，暂停与设置面板 (`z-index: 50`) |
| **移动端虚拟按键 (Touch Layout)** | 拇指黄金人机工学区域分布 | 右下角 `84px` 巨大开火圆盘、`56px` 瞄准/跳跃/换弹环绕排列 |

---

## 7. 对外接口规范 (Module API)

```javascript
/**
 * 实例化战术 HUD 系统
 * @param {object} ctx 全局引擎上下文
 * @returns {HUDController}
 */
export function create(ctx);

// HUDController 实例方法
hud.show(visible);                      // 隐藏/显示 HUD (在菜单或暂停时隐匿)
hud.update(dt);                         // 帧循环驱动罗盘旋转、准星阻尼、受击弧光衰减与地标投影
hud.setObjective(text);                 // 设置主任务目标文字
hud.setRelays(done, total);             // 更新中继器完成计数 (如 2/3)
hud.setPrompt(text, progress);          // 显示/隐藏 3.5s 交互环形进度条
hud.hitmarker(isHeadshot);              // 触发普通或爆头击中反馈 X 标记
hud.radio(message, duration);           // 压入一条战术无线电通讯字幕
hud.message(text, duration);            // 在屏幕中央浮动一条战术通知
```

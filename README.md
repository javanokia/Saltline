# 几猫国产3A大作 (JM 3A Action Game) — 逆向工程还原项目

本项目为国产第一人称射击游戏（FPS）体验版**《几猫3A大作》**的完整逆向还原工程。原工程以单个独立 HTML 文件（`几猫国产3A大作_V1.html`）打包发布，基于 **Three.js (r180)**、**Web Audio API** 与 **HTML5 Canvas 程序化纹理合成** 技术开发。

本逆向工程将原本打包混淆的单文件代码完全解构、去混淆，并还原为现代化的模块化 ESM（ECMAScript Modules）工程体系，支持 Vite 本地热重载开发调试及一键单文件打包发布。

---

## 目录结构

```
/Volumes/M1/3A/
├── 几猫国产3A大作_V1.html       # 原始单文件发行版（作为对齐比对基准完整保留）
├── index.html                 # 现代开发调试入口页（ESM 模块化架构）
├── package.json               # NPM 依赖与构建脚本配置
├── vite.config.js             # Vite 构建配置（支持 singlefile 单文件打包与 @ 路径别名）
├── eslint.config.js           # ESLint 9 Flat Config 代码规范基线
├── .prettierrc.json           # Prettier 代码格式化配置
├── .editorconfig              # 跨编辑器编码/缩进约定
├── commitlint.config.js       # Conventional Commits 提交规范校验
├── tsconfig.json              # 编辑器 TypeScript/JSDoc 类型提示配置
├── tsconfig.typecheck.json    # 核心模块严格类型检查配置
├── .github/workflows/ci.yml   # GitHub Actions 质量门禁与 CI 流水线
├── CONTRIBUTING.md            # 协作流程、提交规范与质量门禁说明
├── CHANGELOG.md               # 版本变更记录
├── README.md                  # 工程架构与逆向分析技术文档
├── docs/                      # 架构设计与技术文档库
│   ├── GDD.md                 # 游戏总体设计文档 (Game Design Document)
│   ├── REFACTOR-SUMMARY.md    # 逆向工程与重构全景复盘总结
│   ├── WIKI_INDEX.md          # 十大子系统技术白皮书主索引
│   ├── WIKI_WEAPONS.md        # 1. 枪械武器动力学与视模系统
│   ├── WIKI_PLAYER_INPUT.md   # 2. 玩家控制器与全平台输入
│   ├── WIKI_COMBAT_GAME_LOOP.md # 3. 战斗系统与战局推进状态机
│   ├── WIKI_HUD_UI.md         # 4. 战术 HUD 与 UI 渲染系统
│   ├── WIKI_PROCEDURAL_ASSETS.md # 5. 程序化材质与工业级 3D 资产
│   ├── WIKI_AUDIO.md          # 6. 物理声学合成与 Web Audio DSP
│   ├── WIKI_ENEMIES.md        # 7. 敌方 AI 与运动学解密
│   ├── WIKI_LEVEL.md          # 8. 四号泊位关卡场景与建模
│   ├── WIKI_PHYSICS_WORLD.md  # 9. 空间物理、港区世界与海洋环境
│   └── WIKI_RENDER_FX.md      # 10. 渲染管线与视觉特效系统
├── tests/                     # 自动化测试与质量保障
│   ├── run_e2e_test.js        # Puppeteer Headless Chrome E2E 回归测试套件
│   └── artifacts/             # 自动化测试输出基准截图与比对工件
├── scripts/                   # 逆向工程与静态分析工具集
│   ├── analyze_sections.py    # 模块切片与代码区段分析脚本
│   ├── check_symbols.py       # 符号导出与命名解构检查
│   ├── dump_config.py         # 配置参数与常量导出
│   ├── extract_assets.py      # 程序化材质与数据提取
│   ├── extract_three_symbols.py # Three.js 混淆别名逆向映射表生成
│   ├── find_undeclared.js     # AST 语法树未声明变量与作用域静态检查
│   ├── three_symbols_map.json # 逆向提取的 Three.js 核心符号字典
│   └── verify_boundaries.py   # 模块物理边界与闭包完整性验证
└── src/                       # 模块化源代码
    ├── constants.js           # 场景边界、光照预设、玩家规格与数学工具
    ├── geo.js                 # 核心几何体程序化生成（倒角圆角盒、柱体、样条管）
    ├── render.js              # 渲染管线、后期着色器、平面反射与曝光管理
    ├── materials.js           # 程序化材质库（Canvas 2D 沥青、集装箱涂装、标贴、水渍）
    ├── physics.js             # 空间碰撞网格、胶囊体扫描、射线检测与 A* 寻路
    ├── props.js               # 工业级程序化 3D 资产生成器（集装箱、岸桥吊车、叉车）
    ├── level.js               # 四号泊位关卡场景布局、掩体战术通道、中继器目标点
    ├── backdrop.js            # 远景海面模拟、远洋巨轮、岸桥吊塔与地平线晨雾
    ├── ground.js              # 码头路面、动态水洼倒影、车道标线与表面材质检测
    ├── fx.js                  # 粒子特效系统（枪口火焰、曳光、火花、烟雾、爆炸、雨滴）
    ├── audio.js               # Web Audio API 程序化音频合成引擎（步枪射击、机械声）
    ├── input.js               # 键盘鼠标（Pointer Lock）、触屏虚拟按键与手柄适配
    ├── player.js              # FPS 移动控制器（WASD、滑铲蹲伏、奔跑、瞄准开镜、受击晃动）
    ├── weapon.js              # PAC-9 Longshore 3D 模型、ADS 瞄准、换弹动作与雨水光泽
    ├── enemies.js             # 敌对机械巡逻单位（机械飞鸥、机械猎犬）与战斗状态机
    ├── combat.js              # 命中判定、弱点爆头计算、击中反馈十字标记与战况统计
    ├── hud.js                 # 战术 HUD 界面（磁带滚动罗盘、准星、受击弧光、生命/弹药计）
    ├── game.js                # 战局状态机（标题封面、战斗演进、三处中继器入侵、防守撤离）
    ├── main.js                # 资源装载编排器、首帧预热、帧循环驱动、基准测试模式
    ├── debug.js               # 开发者可视化调试套件 (NoClip / Teleport / Cheats)
    ├── types/                 # TypeScript 类型定义声明文件
    └── ui.css                 # 港区工业风格暗黑战术 UI 样式表
```

---

## 快速上手

### 1. 安装依赖

```bash
npm install
```

### 2. 启动本地开发服务（热更新）

```bash
npm run dev
```

打开浏览器访问 `http://localhost:3000` 即可开始游玩与调试。

### 3. 构建单文件发行版

```bash
npm run build
```

构建产物输出在 `dist/index.html`，为一个完全内联独立的单个 HTML 文件，可在任何没有 Web 服务器的环境中双击直接运行！

---

## 工程化与质量门禁

### 环境要求

- Node.js >= 20（仓库提供 `.nvmrc`，可执行 `nvm use`）
- npm >= 10

### 常用脚本

| 命令                   | 作用                                            |
| :--------------------- | :---------------------------------------------- |
| `npm run dev`          | 启动 Vite 热更新开发服务器                      |
| `npm run build`        | 构建单文件发行版到 `dist/index.html`            |
| `npm run lint`         | ESLint 静态检查                                 |
| `npm run lint:fix`     | ESLint 自动修复                                 |
| `npm run format`       | Prettier 全量格式化                             |
| `npm run format:check` | 校验格式是否符合规范                            |
| `npm run typecheck`    | 对核心模块执行 TypeScript/JSDoc 编译期检查      |
| `npm test`             | Headless Chrome E2E 回归与截图                  |
| `npm run check`        | 本地完整门禁：lint + format + typecheck + build |

### 提交与 CI

- **pre-commit**：通过 `lint-staged` 对暂存文件执行 ESLint 修复与 Prettier 格式化。
- **commit-msg**：通过 `commitlint` 校验 Conventional Commits 格式，例如 `feat: 新增后处理泛光`。
- **CI**：`.github/workflows/ci.yml` 在 push / PR 时依次执行 lint、format check、typecheck、build，并在独立 job 中运行 E2E 回归。

---

## 游戏控制与玩法

### 键盘与鼠标操作

| 按键              | 功能                             |
| :---------------- | :------------------------------- |
| **W / A / S / D** | 前进 / 左移 / 后退 / 右移        |
| **鼠标移动**      | 转动视角（点击画面进入准星锁定） |
| **鼠标左键**      | 开火射击（KR-7 制式步枪）        |
| **鼠标右键**      | 精确瞄准（ADS 开镜）             |
| **R**             | 更换弹匣                         |
| **Shift**         | 快速冲刺                         |
| **Space**         | 跳跃                             |
| **C**             | 蹲伏 / 滑铲                      |
| **E**             | 交互（切断/入侵港区安全中继器）  |
| **Esc**           | 暂停菜单 / 呼出设置              |

### 移动端触屏支持

- **左侧半屏**：虚拟摇杆控制角色全向移动
- **右侧半屏**：滑动控制视角瞄准
- **虚拟屏幕按键**：开火、开镜、跳跃、换弹

---

## URL 参数与调试指令

游戏内置了丰富的调试和基准测试支持，可在 URL 后添加 Query 参数：

1. **基准性能跑分模式**：

   ```
   http://localhost:3000/?bench=1
   ```

   自动禁用音频并进入轨道运镜测试，实时计算平均帧时间（Avg ms）、中位数、P99 延迟及 FPS 稳定性。

2. **单模块隔离陈列室模式（Showcase Mode）**：
   无需加载整个关卡，直接对单一模块进行 3D 检查与材质预览：
   - `?show=weapon`：独立预览步枪模型与动作（可附带 `&wpose=ads` 或 `&wpose=fire`）
   - `?show=enemies`：独立检查机械飞鸥与机械猎犬 AI 与动作
   - `?show=props`：独立检查集装箱、岸桥吊车、叉车等工业资产
   - `?show=materials`：独立检查沥青、锈蚀铁皮与警示标志贴图
   - `?show=ground`：独立检查湿滑地面与水洼倒影
   - `?show=fx`：独立检查粒子爆破与弹道特效

3. **版本国际化语言控制**：
   - `?lang=zh`：强制以简体中文启动
   - `?lang=en`：强制以英文启动
   - 默认策略：若无 URL 参数，自动优先跟随玩家在系统设置中的偏好，其次跟随浏览器语言环境（`navigator.language`）。游戏中随时可在“设置 (Settings)”面板无缝一键实时切换。

4. **指定画质档位**：
   ```
   http://localhost:3000/?q=ultra   # 可选：low / medium / high / ultra
   ```

---

## 核心系统架构分析

### 1. 零资源程序化生成（Procedural Asset Generation）

整个游戏不依赖任何外部图片、GLTF 模型或音频文件：

- **贴图合成**：利用 HTML5 2D Canvas 动态生成漫反射图与粗糙度蒙版，绘制出包括“几猫远洋”、“几猫北航”、“四号泊位”等中文集装箱箱标，以及 3 级易燃物、高压危险等警示标志。
- **几何体构造**：通过自定义几何算法生成倒角集装箱壁波纹板、岸桥桁架、叉车车身管线。
- **声效合成**：借助 Web Audio API 振荡器（OscillatorNode）、粉红噪声发生器和双二阶滤波器，实时计算生成枪击爆破声、弹壳清脆落地声、金属踩踏回音及环境海浪声。

### 2. 战术关卡与任务流

- **目标设定**：港区安全主控失控，玩家需潜入四号泊位，依次入侵并切断分布在露天堆场、大型仓库与装卸码头的 3 处安全中继器。
- **波次防御**：每切断一处中继器，警戒等级提升，激活机械增援波次（空中巡弋机械飞鸥 + 地面围攻机械猎犬）。
- **撤离行动**：切断全部中继器后，撤离艇在码头南端舷梯到位，玩家登船即可完成封锁解除，并进入“行动简报”评级结算。

---

### 4. 自动化回归测试 (Headless E2E Tests)

```bash
npm test
```

通过 Headless Chrome 与 Puppeteer 自动加载单文件发行版（`dist/index.html`）、原版 HTML 对比、Showcase 独立展示厅及战斗开火交互，并自动截取高清渲染画面输出至 `tests/artifacts/`。

---

## 逆向工程与技术 Wiki 文档库

- **[全系统技术白皮书主索引 (docs/WIKI_INDEX.md)](docs/WIKI_INDEX.md)** — 十分子系统知识库全景架构与索引导航。
- **[GDD 游戏总体设计文档 (docs/GDD.md)](docs/GDD.md)** — 游戏世界观、硬核数值、动力学参数、战术波次与终局评价全案。
- **[工程重构全景总结 (docs/REFACTOR-SUMMARY.md)](docs/REFACTOR-SUMMARY.md)** — 逆向还原拆解、模块化重构与架构解耦复盘总结。
- **[1. PAC-9 枪械武器动力学与视模系统 (docs/WIKI_WEAPONS.md)](docs/WIKI_WEAPONS.md)** — 53,136 面程序化枪模、4 轴阻尼简谐振子后坐力、ADS 瞄准五次平滑赫尔米特过渡、双换弹状态机、抛壳物理与雨水着色器。
- **[2. 玩家动力学控制器与输入系统 (docs/WIKI_PLAYER_INPUT.md)](docs/WIKI_PLAYER_INPUT.md)** — 连续惯性运动学、土狼时间 (0.12s) 与跳跃预输入缓冲 (0.13s)、仿生第一人称步频晃动、着陆沉降弹簧、脱战自愈与全平台输入适配。
- **[3. 战斗系统与战局推进状态机 (docs/WIKI_COMBAT_GAME_LOOP.md)](docs/WIKI_COMBAT_GAME_LOOP.md)** — 环境遮挡优先射线相交、弱点 2.2x/2.5x 爆头暴击判定、Hitmarker 击中反馈、三处中继器入侵倒计时、阶梯式波次与撤离评价。
- **[4. 战术 HUD 与 UI 渲染系统 (docs/WIKI_HUD_UI.md)](docs/WIKI_HUD_UI.md)** — 360° 磁带滚动罗盘 (4px/deg)、3D 空间地标屏幕视锥体逆投影贴靠、动态准星、4 向受击指示弧、10 段式血条与无线电打字机字幕。
- **[5. 程序化材质与工业级 3D 资产系统 (docs/WIKI_PROCEDURAL_ASSETS.md)](docs/WIKI_PROCEDURAL_ASSETS.md)** — 136 套 GPU MRT 烘焙 PBR 材质、PCG3 哈希与 FBM/Voronoi 噪声、倒角圆角盒算子、ISO 6346 集装箱与几何体深度合批。
- **[6. 纯声学合成器与 Web Audio DSP 系统 (docs/WIKI_AUDIO.md)](docs/WIKI_AUDIO.md)** — 57 种零资源程序化音效、PAC-9 突击步枪 6 层复合开火声、双二阶 Direct Form II 滤波器、露天/室内双卷积混响与 5 轨动态配乐。
- **[7. 敌方 AI 与动力学深度解密 (docs/WIKI_ENEMIES.md)](docs/WIKI_ENEMIES.md)** — 3-DOF 腿部解析 IK、四足对角小跑步态、悬挂弹簧阻尼、四旋翼飞行器动力学与战术令牌协同系统。
- **[8. 四号泊位港区关卡与工业场景建模 (docs/WIKI_LEVEL.md)](docs/WIKI_LEVEL.md)** — 四大战术分区尺度、36 种程序化工业道具库、ISO 6346 真实集装箱放样、钢结构仓库、深水码头岸壁与静态几何体合批。
- **[9. 物理系统、港区世界与远景海洋环境 (docs/WIKI_PHYSICS_WORLD.md)](docs/WIKI_PHYSICS_WORLD.md)** — 极速 Slab 算法 AABB 光线投射、0.42m 台阶自动跨越扫掠胶囊体、142×124 障碍物膨胀二叉堆 A* 寻路与 Gerstner 风暴洋面波浪模拟。
- **[10. 渲染管线与视觉特效引擎深度解密 (docs/WIKI_RENDER_FX.md)](docs/WIKI_RENDER_FX.md)** — 半精度 HDR 前向增强管线、SSAO 泊松采样、双重滤波 6 级泛光金字塔、AgX 胶片色调映射、4×2 纯程序化烟雾/火花/弹孔图集与粒子物理。

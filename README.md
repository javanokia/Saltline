# Saltline (盐线) / 几猫国产3A大作 — 零外部资产 WebGL 战术射击游戏

本项目为国产第一人称射击游戏（FPS）体验版**《Saltline（盐线）/ 几猫3A大作》**的完整逆向还原与现代化架构重构工程。原工程以单个独立 HTML 文件（`几猫国产3A大作_V1.html`）打包发布，基于 **Three.js (r180)**、**Web Audio API** 与 **HTML5 Canvas 程序化纹理合成** 技术开发。

本逆向工程将原本打包混淆的单文件代码完全解构、去混淆，并还原为现代化的模块化 ESM（ECMAScript Modules）工程体系，实现游戏本体与资产工坊的**同源架构（Single Source of Truth）**，支持 Vite 本地热重载开发调试及一键单文件打包发布。

---

## 🌐 在线体验 (Live Demo)

- 🎮 **游戏最新单文件发行版在线游玩**：[https://javanokia.github.io/Saltline/](https://javanokia.github.io/Saltline/)
- 🕹️ **原始单文件发行版 (V1) 对照试玩**：[https://javanokia.github.io/Saltline/v1.html](https://javanokia.github.io/Saltline/v1.html)
- 🚀 **GitHub CI/CD 自动化流水线**：每次推送到 `main` 分支均会自动执行全套测试门禁，并在测试全部通过后自动构建并热部署至 GitHub Pages。

---

## 目录结构

```
/Volumes/M1/3A/
├── 几猫国产3A大作_V1.html       # 原始单文件发行版（作为对齐比对基准完整保留）
├── index.html                 # 现代开发调试入口页（ESM 模块化架构）
├── asset-preview/             # 资产工坊（程序化 3D 资产、GPU 材质、DSP 音频全能预览工作台）
│   ├── index.html             # 资产工坊可视化交互界面（内置 GLB 导出、姿态播放、爆炸图拆解）
│   ├── style.css              # 工坊暗黑科技风响应式界面样式
│   ├── app.js                 # 资产目录调度、Three.js 交互相机与场景管理
│   ├── labs.js                # Web Audio 声音实验室（实时波形、dBFS 频谱、循环缝合与合成层拆解）
│   ├── analysis.js            # 3D 零件拆解 (Explode)、材质通道取样与生成参数实时调控
│   ├── animation.js           # 骨骼动力学与动作姿态播放器（Hound/Gull/PAC-9 实时动作驱动）
│   ├── dependency-index.js    # 程序化生成调用图与材质依赖网格静态索引
│   ├── readable-sources.js    # 语义化中文注释版与原始生成源码多版本阅读器
│   └── engine.js              # 全量游戏程序化生成内核运行时（集成 GLTFExporter 导出）
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
│   ├── PROJECT_TECHNICAL_DECONSTRUCTION.md # 全系统硬核技术拆解知识库 (Knowledge Base)
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
│   ├── run_e2e_test.js        # Puppeteer Headless Chrome 8大测试用例全量回归套件
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
    ├── geo.js                 # 核心几何体程序化生成（倒角圆角盒、柱体、样条管）与 WebGL 资源递归释放
    ├── render.js              # 渲染系统总控编排器、主循环驱动与动态分辨率自适应
    ├── render/                # 增强前向渲染子系统
    │   ├── environment.js     # 程序化噪波纹理、物理天空穹顶与 PMREM 立方体环境探针
    │   ├── shadows.js         # 太阳级联定向光正交视锥紧致贴合与 PCF 软阴影注入
    │   ├── shaders.js         # 延迟后处理着色器全集 (SSAO/体积光/Bloom/AgX 色调映射/胶片颗粒)
    │   └── postprocess.js     # 延迟后处理渲染管线 (HDR 颜色分级、动态模糊与自动曝光读回)
    ├── materials.js           # 程序化材质库（Canvas 2D 沥青、集装箱涂装、标贴、水渍）
    ├── physics.js             # 空间碰撞网格、胶囊体扫描、射线检测与 A* 寻路
    ├── props.js               # 工业级程序化 3D 资产注册中心与空间分区装配
    ├── props/                 # 场景工业道具高内聚子系统
    │   ├── builder.js         # 网格装配器、复合构造器、多边形拉伸与曲面贴花工具
    │   ├── containers.js      # ISO 6346 瓦楞集装箱程序化生成器
    │   ├── structures.js      # 高杆灯塔、防撞墩、安防岗亭建筑设施
    │   └── industrial.js      # 100% 对齐原版高精叉车、发电机组、欧标木托盘、油桶等重工业杂项
    ├── level.js               # 关卡引擎高层编排器与地图预设加载器 (berth4/maze/outpost)
    ├── level/                 # 关卡工业建筑与场景几何生成子系统
    │   ├── constants.js       # 关卡宏观规格、建筑参数与地图预设常量
    │   ├── builder.js         # 静态几何体自动合批与刚体物理扫描注册
    │   ├── yard.js            # 露天集装箱堆场、随机迷宫与前哨堡垒生成
    │   ├── structures.js      # 出入口道闸、围栏边界与钢结构大型仓库
    │   ├── quay.js            # 深水码头岸壁、起重机钢轨与撤离艇
    │   └── labels.js          # 动态 Canvas 文字标贴图集化合并
    ├── backdrop.js            # 远景海面模拟、远洋巨轮、岸桥吊塔与地平线晨雾
    ├── ground.js              # 码头路面、风暴洋面与降水模拟系统主控
    ├── ground/                # 码头路面与洋面物理子系统
    │   ├── terrain.js         # 高度场采样、程序化噪声与宏观水洼掩模计算
    │   ├── textures.js        # 程序化 PBR 地面纹理与 DataTexture 构建工具
    │   ├── decals.js          # 道路标线、斑马线、集装箱位与喷涂字 Canvas
    │   ├── reflection.js      # 平面水面镜面反射探针与斜剪裁投影矩阵
    │   ├── sea.js             # Gerstner 复杂海浪波谱、渐变非均匀海面网格与海洋着色器
    │   ├── rain.js            # GPU 实例化雨滴飞线、水花与避雨遮罩系统
    │   └── material.js        # 沥青路面、积水与反射材质物理着色器
    ├── fx.js                  # 粒子特效系统核心调度（枪口火焰、爆炸冲击波、雨滴飞溅）与展厅
    ├── fx/                    # 粒子特效动力学与着色器子系统
    │   ├── textures.js        # Canvas 程序化图集生成器 (烟雾/火花/贴花) 与 GPU 混合着色器
    │   ├── pools.js           # GPU 实例化网格封装、SoA 紧凑粒子池与超音速弹道曳光流
    │   ├── debris.js          # 刚体破片非对称物理系统与黄铜弹壳抛壳动力学
    │   ├── decals.js          # 冲击弹孔与爆炸烧焦投影贴花管理器
    │   ├── helpers.js         # 颜色输入解析与圆锥体随机发射向量
    │   ├── primitives.js      # 烟雾/火花/波纹/飞溅等原子发射器
    │   ├── impacts.js         # 多材质打击反馈 (金属、木材、混凝土、橡胶、玻璃、敌机)
    │   ├── weapons.js         # 武器级特效 (超音速弹道曳光流、高光枪口焰、退膛抛壳)
    │   ├── emitters.js        # 持续环境粒子发射器 (蒸汽喷涌、残骸暗火余烬、战火燃烧、漏水滴漏)
    │   ├── explosions.js      # 爆炸火球膨胀、冲击波与破片管理
    │   └── showcase.js        # 视觉特效独立展示环境与基准测试靶场
    ├── audio.js               # Web Audio API 混音路由图、空间音频监听与总线控制
    ├── audio/                 # 纯物理声学合成子系统
    │   ├── dsp.js             # 双二阶滤波器、粉红噪声、chirp 啁啾与模态共振原语
    │   ├── sounds.js          # 57 种音效波形数学合成器与注册表
    │   ├── baker.js           # 纯算声音样本归一化、切片异步生成与后台烘焙器
    │   ├── bus.js             # 母带饱和器、双曲正切软限幅、低通滤波器与卷积混响路由
    │   ├── spatial.js         # 空间 3D 声道定位 (PannerNode) 与声道池分配调度器
    │   ├── loops.js           # 循环背景音效系统与开敞港区风雨海流自适应环境音
    │   ├── music_player.js    # 5 轨分层自适应互动交战配乐系统 (Drone/Bass/Perc/Brass/Chime)
    │   ├── stings.js          # 港区偶发远景环境音 (远洋号角、海鸥啼鸣、缆绳碰擦、集装箱轰鸣)
    │   ├── npc_audio.js       # 敌对单位近场机械关节音效跟踪与目标中继发射塔电磁回路声
    │   └── events.js          # 音频系统与游戏全局事件总线绑定器
    ├── input.js               # 键盘鼠标（Pointer Lock）、触屏虚拟按键与手柄适配
    ├── player.js              # FPS 移动控制器（WASD、滑铲蹲伏、奔跑、瞄准开镜、受击晃动）
    ├── weapon.js              # PAC-9 武器控制器、ADS 瞄准、换弹动作与雨水光泽
    ├── weapons/               # 武器库动力学与程序化视模子系统
    │   ├── pac9_model.js      # PAC-9 Longshore 3D 程序化建模与材质槽位装配
    │   ├── arsenal_models.js  # SG-12 破门霰弹枪、SMG-45 冲锋枪、SR-99 狙击枪程序化枪模
    │   └── weapon_configs.js  # 扩展军械库数值配置（射速、后坐力散布、弹匣容量）
    ├── enemies.js             # 蜂群总控 (Hive Context)、全局警觉与展厅模式
    ├── enemies/               # 敌对机械巡逻单位子系统
    │   ├── rig.js             # 骨架装配器 SkeletonRig 与蒙皮网格生成器
    │   ├── gull.js            # 机械飞鸥四旋翼结构与飞行/开火/扫视状态机
    │   ├── hound.js           # 机械猎犬状态控制器与步态动画接口
    │   ├── hound_model.js     # 机械猎犬 3-DOF 逆运动学 IK 骨骼装配与几何构件
    │   └── math.js            # 射线-球体与射线-胶囊体几何相交算法
    ├── combat.js              # 命中判定、弱点爆头计算、击中反馈十字标记与战况统计
    ├── hud.js                 # 战术 HUD 界面（磁带滚动罗盘、准星、受击弧光、生命/弹药计）
    ├── menu.js                # 主菜单、战术简报、暂停界面、设置面板与 DOM 销毁
    ├── i18n.js                # 双语国际化引擎（zh 简体中文 / en 英文无缝动态切换）
    ├── game.js                # 战局状态机（标题封面、战斗演进、三处中继器入侵、防守撤离与全资源销毁）
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

### 3. 打开资产工坊（可视化检视工作台）

```bash
npm run workshop
```

直接启动并打开**资产工坊（Asset Preview）**，支持全部 3D 模型、GPU 材质、DSP 音频、动作播放与 3D 导出。

### 4. 构建单文件发行版

```bash
npm run build
```

构建产物输出在 `dist/index.html`，为一个完全内联独立的单个 HTML 文件（约 1.38MB），可在任何无 Web 服务器的离线环境中双击直接运行！

---

## 工程化与质量门禁

### 环境要求

- Node.js >= 20（仓库提供 `.nvmrc`，可执行 `nvm use`）
- npm >= 10

### 常用脚本

| 命令                   | 作用                                                             |
| :--------------------- | :--------------------------------------------------------------- |
| `npm run dev`          | 启动 Vite 热更新开发服务器 (`http://localhost:3000`)             |
| `npm run workshop`     | 启动并直接打开“资产工坊”可视化交互工作台 (`/asset-preview/`)     |
| `npm run build`        | 构建单文件独立发行版到 `dist/index.html`                         |
| `npm run lint`         | ESLint 静态语法与代码规范检查                                    |
| `npm run lint:fix`     | ESLint 自动修复代码格式与规则                                    |
| `npm run format`       | Prettier 全量格式化代码与文档                                    |
| `npm run format:check` | Prettier 格式规范合规性校验                                      |
| `npm run typecheck`    | 对核心模块执行严格的 TypeScript/JSDoc 编译期静态类型检查         |
| `npm test`             | 运行 Puppeteer Headless Chrome E2E 8大测试用例全量回归与截图比对 |
| `npm run check`        | 本地开发全量流水线质量门禁：`lint + format + typecheck + build`  |

### 提交与 CI 流水线

- **pre-commit**：通过 `lint-staged` 对暂存文件自动执行 ESLint 修复与 Prettier 格式化。
- **commit-msg**：通过 `commitlint` 校验 Conventional Commits 格式，例如 `fix: 修复叉车轮胎外径与轮距参数`。
- **CI 流水线**：`.github/workflows/ci.yml` 在 push / PR 时依次执行 lint、format check、typecheck、build，并在独立 job 中运行 Headless E2E 自动化回归。

---

## 游戏控制与玩法

### 键盘与鼠标操作

| 按键              | 功能                                                |
| :---------------- | :-------------------------------------------------- |
| **W / A / S / D** | 前进 / 左移 / 后退 / 右移                           |
| **鼠标移动**      | 转动视角（点击画面进入准星锁定）                    |
| **鼠标左键**      | 开火射击                                            |
| **鼠标右键**      | 精确瞄准（ADS 机械瞄具开镜）                        |
| **R**             | 更换弹匣                                            |
| **1 / 2 / 3 / 4** | 切换武器（1: PAC-9, 2: SG-12, 3: SMG-45, 4: SR-99） |
| **Shift**         | 快速冲刺（Sprint）                                  |
| **Space**         | 跳跃（支持土狼时间与预输入缓冲）                    |
| **C**             | 蹲伏 / 滑铲（Slide）                                |
| **E**             | 战术交互（切断/入侵港区安全中继器）                 |
| **Esc**           | 暂停菜单 / 呼出设置面板                             |

### 移动端触屏支持

- **左侧半屏**：动态虚拟摇杆控制角色全向运动；
- **右侧半屏**：全屏滑动控制视角转向与瞄准；
- **虚拟屏幕按键**：一键开火、开镜、跳跃、换弹。

---

## URL 参数与调试指令

游戏内置了丰富的调试和基准测试支持，可在 URL 后添加 Query 参数：

1. **基准性能跑分模式**：

   ```
   http://localhost:3000/?bench=1
   ```

   自动禁用音频并进入多角度轨道运镜测试，实时计算平均帧时间（Avg ms）、中位数、P99 延迟及 FPS 稳定性。

2. **迷宫战术关卡扩展**：

   ```
   http://localhost:3000/?map=maze
   ```

   加载程序化生成的集装箱战术迷宫地图，体验近距离室内遭遇战与多武器切换。

3. **单模块隔离陈列室模式（Showcase Mode）**：
   无需加载整个关卡，直接对单一模块进行 3D 检查与材质预览：
   - `?show=weapon`：独立预览步枪模型与动作（可附带 `&wpose=ads` 或 `&wpose=fire`）
   - `?show=enemies`：独立检查机械飞鸥与机械猎犬 AI 与动作
   - `?show=props`：独立检查集装箱、岸桥吊车、叉车等工业资产
   - `?show=materials`：独立检查沥青、锈蚀铁皮与警示标志贴图
   - `?show=ground`：独立检查湿滑地面与水洼倒影
   - `?show=fx`：独立检查粒子爆破与弹道特效

4. **版本国际化语言控制**：
   - `?lang=zh`：强制以简体中文启动
   - `?lang=en`：强制以英文启动
   - 默认策略：若无 URL 参数，自动优先跟随玩家在系统设置中的偏好，其次跟随浏览器语言环境（`navigator.language`）。游戏中随时可在“设置 (Settings)”面板无缝一键实时切换。

5. **指定画质档位**：
   ```
   http://localhost:3000/?q=ultra   # 可选：low / medium / high / ultra
   ```

---

## 核心系统架构分析

### 1. 零资源程序化生成（Procedural Asset Generation）

整个游戏在打包后**不依赖任何外部图片（PNG/JPG）、3D 模型（GLTF/FBX）或外部音频文件（WAV/MP3）**：

- **贴图合成**：利用 HTML5 2D Canvas 动态生成漫反射图与粗糙度蒙版，绘制出包括“几猫远洋”、“几猫北航”、“四号泊位”等中文集装箱箱标，以及 3 级易燃物、高压危险等警示标志。
- **几何体构造**：通过自定义几何算法生成倒角集装箱壁波纹板、岸桥桁架、高精叉车车身管线。
- **声效合成**：借助 Web Audio API 振荡器（OscillatorNode）、粉红噪声发生器和双二阶滤波器，实时计算生成枪击爆破声、弹壳清脆落地声、金属踩踏回音及环境海浪声。

---

### 2. 资产工坊（Asset Preview Workshop）四大核心能力

资产工坊是用于检视、分析与调试全量游戏资产的可视化多功能工作台，与游戏本体遵循**完全同源代码维护**：

1. **3D 模型与机械构件展台（39 款资产）**：
   - 全面覆盖机械猎犬（Hound）、机械飞鸥（Gull）、PAC-9 突击步枪以及全套港区工业基础设施与物流道具（集装箱、高精叉车、发电机组、照明灯塔、护栏等）；
   - **自动旋转 / 网格线框 / 骨骼透视 / 雨水湿润度** 实时调节；
   - **机械零件爆炸图解构 (Exploded View)**：视口底部滑块与右侧零件面板支持无级调节拆解度，各机件沿法线外展爆散，清晰检视内部机械构件装配。
2. **动作与姿态播放器 (Animation & Pose Player)**：
   - **Hound 机器狗**：支持行走（`walk`）、奔跑（`run`）、瞄准（`aim`）与待机（`idle`）动作切换；
   - **Gull 机械飞鸥**：支持巡弋悬停（`hover`）、低空扫视（`scan`）及旋翼转速控制；
   - **PAC-9 突击步枪**：支持待机（`idle`）、开火后坐力（`fire`）、战术换弹（`reload`）及瞄准姿态（`ads`）；
   - 提供播放/暂停、单帧微调、时间轴拖拽与 0.25x - 2.0x 倍速播放控制。
3. **一键 3D 资产导出 (GLB Exporter)**：
   - 任意 3D 模型均支持一键导出为标准的 `.glb`（Binary glTF）二进制文件；
   - 自动将游戏自定义着色器转换为规范的 `MeshStandardMaterial`，完整保留基础色（Albedo）、粗糙度（Roughness）、金属度（Metalness）、顶点色及拓扑结构，可直接导入 Blender、Unity 或 Unreal Engine 中使用。
4. **材质实验室与声学物理实验室**：
   - **材质与贴图实验室（48 款材质）**：提供完整材质 / 颜色 Albedo / 法线 Normal / ORM 打包图 / 遮蔽 AO / 粗糙度 Roughness / 金属度 Metalness 等通道切换，支持球体、方块、平面三维形态投射与侧光旋转；
   - **声音实验室（57 种音效）**：纯 Web Audio DSP 合成音频可视化，提供实时波形图、对数横轴 dBFS 频谱仪（实时标注峰值频率与 RMS）、首尾波形缝合分析与真实多层声源拆解试听。

---

### 3. 高精工业叉车（Forklift）100% 官方像素级还原

重构后的叉车模型严格对齐原版 `oR` 规范，彻底解决车轮穿透地面与比例失真问题：

- **工业四轮深槽轮胎**：
  - 前轮外半径 `0.33m`、胎宽 `0.23m`、半轮距 `0.47m`、内凹阶梯轮毂半径 `0.195m`；
  - 后轮外半径 `0.27m`、胎宽 `0.18m`、半轮距 `0.46m`、内凹阶梯轮毂半径 `0.155m`；
  - 胎面运用 3D Simplex 噪波程序化微凹凸扰动，中央配备深色减速盖与 6 颗镀锌六角螺栓。
- **全车机械结构**：
  - 底盘大梁、轮轴与两侧花纹铝制防滑登车踏板；
  - 铸造弧面配重块、尾部反光警示条、“几猫”车标与机队编号；
  - 聚氨酯人体工学座椅、三幅转向柱方向盘、三连多路阀操纵手柄、急停按钮与仪表盘 CSC 铭牌；
  - 倒梯形 FOPS 防落物顶棚护栏、8 根防砸格栅条、双侧前照灯、后视镜与顶部黄色旋转频闪警示灯；
  - 后置 LPG 丙烷钢瓶系统，包含圆弧抱箍、截止阀、输气软管与“液化气”曲面贴花；
  - 双级起升门架（C 型导轨钢）、起升滑轮、随动板式链条、主升降油缸与高强度锻钢货叉。

---

### 4. 自动化测试套件 (8 大 E2E 测试用例)

```bash
npm test
```

通过 Puppeteer 与 Headless Chrome 自动执行 8 大用例，保证每次重构与提交质量稳固：

1. **用例 1**：生产构建单文件 (`dist/index.html?bench=1`) 跑分与稳定性验证；
2. **用例 2**：原始单文件 (`几猫国产3A大作_V1.html`) 启动与逆向还原基准比对；
3. **用例 3**：子系统单体展示模式 (`?show=weapon/enemies/props`) 独立渲染零报错；
4. **用例 4**：战斗交互仿真（开火扣减弹药、连续后坐力、换弹状态机及 HUD 刷新）；
5. **用例 5**：版本国际化双语系统（中文/英文初始加载与动态无缝热切换）；
6. **用例 6**：移动端触控仿真（双摇杆与移动端触摸屏 HUD 响应）；
7. **用例 7**：战术关卡扩展（`?map=maze` 迷宫地图）与多武器系统（SG-12 / SMG-45 / SR-99）槽位切换；
8. **用例 8**：资产工坊全量装配验证（39 款 3D 模型、48 款材质、57 种音效及动作播放全绿）。

---

## 逆向工程与技术 Wiki 文档库

- **[全系统技术白皮书主索引 (docs/WIKI_INDEX.md)](docs/WIKI_INDEX.md)** — 十大子系统知识库全景架构与索引导航。
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

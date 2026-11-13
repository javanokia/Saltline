# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- **多武器系统扩展与 3D 程序化视模**：
  - 新增 `src/weapons/weapon_configs.js` 与 `src/weapons/arsenal_models.js`，基于纯数学几何算子无外部资产构建 4 大制式武器全景装配：
    1. **PAC-9 Longshore (几猫九式突击步枪)**：30发、720 RPM、高精度全能战术步枪；
    2. **SG-12 Breacher (重型战术霰弹枪)**：8发、105 RPM、8 弹丸高爆散射、144 近距毁灭爆发伤害、粗重泵动滑块拉栓机械动作；
    3. **SMG-45 Stinger (高射速战术冲锋枪)**：40发、960 RPM、轻量化钛合金枪机高速往复闭锁金属声、超紧凑室内突击微型红点瞄具；
    4. **SR-99 Vanguard (高精反器材狙击步枪)**：5发、42 RPM、单发 165 穿甲暴击伤害、24° 高倍战术光学狙击镜、双室反跳制退器与巨震次重低音。
  - `src/weapon.js` 扩展槽位切换架构（按键 `1`/`2`/`3`/`4` 或 `Q` 快速轮换），支持独立弹药储备记忆、自适应 ADS 视场角过渡、多武器动力学简谐振子弹簧参数与 HUD 实时连动。
- **战术关卡扩展与程序化随机集装箱迷宫**：
  - `src/level.js` 引入多关卡地图配置 `LEVEL_PRESETS`（`berth4` 标准深水泊位、`maze` 随机集装箱战术迷宫、`outpost` 哨所防卫前哨堡垒），支持 `?map=maze`、`?map=outpost` 与 `?seed=...` 任意种子参数。
  - 实现 `buildProceduralContainerMaze` 与 `buildOutpostFortress`：依据伪随机数发生器在露天堆场动态构建 1~3 层错落集装箱回廊、死角掩体、战术钢梯与高空连廊制高点，并动态重定位战术中继站 A 与掩体防御工事。
- **音频空间声学升级与多材质落地/雨点物理动态**：
  - `src/audio/sounds.js` 新增 `synthesizeShotgunShot`（12铅径 60Hz->22Hz 重低音下潜激波与 0.16s 战术泵动手感）、`synthesizeSmgShot`（8.2kHz 枪机高速闭锁清脆金属音）、`synthesizeSniperShot`（24Hz 地震波级次重低音爆轰与 .50 口径超音速撕裂）；
  - 弹壳反弹落地全面细化材质特化声学：`synthShellBounceMetal`（尖锐高 Q 模态谐振衰减 5.2kHz/7.8kHz/10.5kHz 与密集微弹跳颤音）、`synthShellBounceConcrete`（刚体钝击与碎石摩擦）、`synthShellBounceWood`（温暖木质共振）；
  - 新增雨点敲击金属集装箱表面细微颗粒声（`synthRainMetalPatter`）与水洼水泡气泡声（`synthRainPuddleDrips`）。
- **E2E 自动化测试套件扩充**：`tests/run_e2e_test.js` 新增【测试用例 7】，全自动测试集装箱随机迷宫（`?map=maze`）装配、四大武器槽位快速切换无缝响应与弹药规格校验。

- **移动端与触摸屏全面操作支持**：`src/input.js` 新增自适应环境/URL 探测（`?touch=1`、`pointer: coarse`、`maxTouchPoints > 0`），实现左半屏虚拟移动摇杆（动态外圈触发行走/冲刺）、右半屏滑动视角转向、开火/跳跃/换弹/瞄准独立触控热区；并在 `tests/run_e2e_test.js` 新增【测试用例 6】移动端仿真端到端自动化测试。
- **程序化音频合成器音质与声学动态增强**：
  - `src/audio/sounds.js` 为 PAC-9 步枪（`synthesizeRifleShot`）引入 92Hz~36Hz 亚低音冲击（Sub-Bass Punch）与 4.8kHz 枪机复进闭锁清脆金属撞击瞬态（Bolt Slam & Battery Lockup）；
  - 增强弹壳反弹（`synthShellBounce`）多材质碰撞随机音高颤动与末段微小滚动余震颤音（Micro-chatter）；
  - 增强跳跃重力落地（`synthLand`）82Hz~32Hz 触地低音包络与战术装具扣件摩擦抖动层（Gear rustle）。
- 全量 TypeScript 编译期检查覆盖：`tsconfig.typecheck.json` 覆盖全工程 38 个源码文件，实现 **100% 0 报错通过**。
- 全局异常捕获强化：`src/main.js` 新增 `unhandledrejection` 异步 Promise 异常捕获，杜绝异步模块错误漏检。
- 相机与调试钩子统一发布/订阅总线：`window.__setShot.subscribe` 提供多模块协同监听，解决调试参数相互覆盖。
- 生命周期解绑与事件回收：`src/input.js`、`src/debug.js` 引入 `AbortController` 机制解绑 DOM 监听；`src/game.js` 在 `dispose()` 时协同释放输入、调试面板并切断渲染循环 `renderer.setAnimationLoop(null)`。

### Changed

- **场景背景模块语义化与结构治理**：`src/backdrop.js` 彻底重构淘汰 `z1, mb, vb, xb, Mb, Eb, pv, MR` 历史混淆短命名，重构为 `buildQuayCrane`（岸桥起重机）、`buildYardCrane`（龙门吊）、`buildCargoShip`（集装箱远洋货轮）、`buildPatrolBoat`（巡逻艇）、`buildYardBlocks`（货场堆垛与变电站）、`createBackdropEnvironment`（全景装配）与 `showcaseBackdrop`，补充详尽 JSDoc 注解并保留别名兼容。
- **PAC-9 武器几何装配架构深度模块化**：彻底拆解 `src/weapons/pac9_model.js` 中 1,026 行超大单体装配函数 `w_`，分解为 7 个高内聚子装配函数（机匣与握把、护木与导轨、枪管与枪口装置、枪托与缓冲管、反射式瞄具与机械瞄具、枪机框与拉机柄、弹匣与枪弹），将圈复杂度由 51 降至 <10，并通过端到端几何校验验证其 100% 顶点/法线/索引零畸变。
- 剔除 `src/enemies.js`、`src/weapon.js`、`src/weapons/pac9_model.js` 顶部各 423 行全量混淆解构块，净删减 **1,300+ 行死代码**，统一按需采用原生 Three.js 引用。
- 清理 `src/constants.js`、`src/geo.js`、`src/audio/sounds.js`、`src/enemies/gull.js`、`src/enemies/hound.js` 中 45 个未被外部引用的历史废弃短别名导出。
- `src/main.js` 中 DevSuite 开发者调试面板挂载增加运行环境门禁，仅在开发模式或显式带有 `debug`/`dev` 参数时激活，生产环境完全隔离。

### Fixed

- 修复 `src/audio/dsp.js` 中 `applyDynamicBiquadFilter` 静态延迟线属性跨调用状态污染问题，多 pass 级联时原地写入滤波缓冲。
- 修复 `src/types/index.d.ts` 中 `PhysicsWorld` 核心接口签名缺失与 `Window` 全局属性定义。
- 强化 E2E 自动化回归断言：用例 2 强制断言原版基准帧数一致性，Showcase 用例增加 `window.__errors.length === 0` 零异常校验。

### Added (Previous)

- 新增 ESLint 9 Flat Config、Prettier、EditorConfig 代码规范基线。
- 新增 husky + lint-staged 预提交检查与 commitlint 提交信息校验。
- 新增 GitHub Actions CI：lint、format check、typecheck、build 与 E2E 回归。
- 新增 `tsconfig.typecheck.json` 与 `npm run typecheck` 核心模块编译期检查。
- 新增 `CombatRaycast`、`CombatSystem`、`PostPipeline`、`SeededRandom` 等核心类型。
- 新增 `CONTRIBUTING.md`、`CHANGELOG.md`、`.nvmrc` 与 Vite `@` 路径别名。

### Changed

- `src/render.js`、`src/materials.js` 完成历史 2–3 字符短变量的语义化重命名。
- `WeaponState` 按 PAC-9 武器实际运行时结构修正，`EngineContext` 核心字段收紧类型。
- 全仓库统一 Prettier 代码风格，`src/materials.js` 恢复可读的多行结构。

### Fixed

- 修正 `RenderStats.adapt`、`GameQualityConfig.tex`、`PhysicsWorld.lineOfSight` 等类型缺失。
- E2E 测试的 Chrome 路径支持通过 `CHROME_PATH` 环境变量覆盖，便于 CI 运行。

## [1.1.0] - 2026-11-12

### Added

- 全版本中英文国际化引擎（`src/i18n.js`）：支持 `zh`（简体中文）与 `en`（英文），具备 URL 参数覆盖（`?lang=zh`）、系统语言自适应以及设置面板一键无缝实时热切换。
- 原版 1:1 UI 字体与排版还原：严格对齐原版游戏引导界面的字体层级、字符间距、按键提示徽标（WASD / ADS / 滑铲 / 换弹）与布局对齐。
- WebGL 资源生命周期释放治理：`src/geo.js` 增加 `disposeHierarchy(root)` 深度递归释放 Geometry、多槽 Material 与关联 Texture 显存；`src/menu.js` 与 `src/game.js` 增补 `dispose()` 统一停机回收接口。
- 端到端测试扩展：E2E 测试套件新增第 5 大用例，全自动断言国际化双语系统在单文件生产构建中的动态切换与无损渲染。

### Changed

- 核心子系统全面模块化解耦（四阶段巨石拆解，累计解耦逾 15,000 行超长文件）：
  - **敌人系统 (`src/enemies/`)**：拆分为 `rig.js`（骨架装配器）、`gull.js`（机械飞鸥 AI）、`hound.js`（机械猎犬 3-DOF IK 动力学）与 `math.js`（几何相交算法），主文件精简 72%。
  - **场景道具系统 (`src/props/`)**：拆分为 `builder.js`（复合网格装配器）、`containers.js`（ISO 6346 瓦楞集装箱）、`structures.js`（高杆灯塔与安防岗亭）与 `industrial.js`（叉车/发电机/重工业杂项），主文件精简 94%。
  - **纯声学音频系统 (`src/audio/`)**：拆分为 `dsp.js`（双二阶滤波与合成原语）与 `sounds.js`（57 种音效波形数学合成器），主文件专注于 Web Audio 空间路由图。
  - **粒子特效系统 (`src/fx/`)**：拆分为 `textures.js`（Canvas 程序化图集与 GPU 混合着色器）、`pools.js`（SoA 粒子池与超音速曳光流）、`debris.js`（刚体破片与抛壳物理）与 `decals.js`（法线投影贴花），主文件精简 45%。
- 业务层符号纯语义化治理：彻底替换 `src/enemies/rig.js`、`src/enemies/hound.js`、`src/fx.js` 等模块中遗留的反混淆压缩短别名导入，恢复 Three.js 与核心模块的纯正语义。

## [1.0.0] - 2026-11-12

### Added

- 几猫国产 3A 大作逆向还原工程首个模块化 ESM 版本。
- 完整渲染、材质、物理、战斗、音频、HUD、关卡与游戏状态机模块。
- Vite 单文件打包与 Headless Chrome E2E 回归套件。

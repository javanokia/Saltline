# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

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

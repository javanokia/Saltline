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

## [1.0.0] - 2026-11-12

### Added

- 几猫国产 3A 大作逆向还原工程首个模块化 ESM 版本。
- 完整渲染、材质、物理、战斗、音频、HUD、关卡与游戏状态机模块。
- Vite 单文件打包与 Headless Chrome E2E 回归套件。

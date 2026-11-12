# 重构变更摘要

> 范围：`/Volumes/M1/3A`（可读源码工程）
> 主题：代码语义化洗练 + TypeScript/JSDoc 类型系统升级
> 日期：2026-11-12

## 一、目标

1. 清除 `src/render.js`、`src/materials.js` 中遗留的历史紧凑短变量（如 `ie`、`fe`、`oe`），替换为具备明确语义的长变量名。
2. 为 `EngineContext`、`WeaponState`、`CombatRaycast` 等核心数据流补齐类型声明，并建立可执行的编译期检查。

## 二、反混淆治理

- 基于 acorn + eslint-scope 的作用域级重命名，避免正则替换导致的跨作用域误改。
- 两个文件内 **2–3 字符绑定从 359 个降至 0 个，累计消除 1153 处引用**：
  - `src/render.js`：243 个绑定 / 761 处引用
  - `src/materials.js`：116 个绑定 / 392 处引用
- 代表性重命名：

| 模块      | 原名称             | 新名称                                               |
| --------- | ------------------ | ---------------------------------------------------- |
| render    | `ie`               | `viewProjectionMatrix`                               |
| render    | `oe` / `fe` / `le` | `passName` / `fragmentShaderSource` / `passUniforms` |
| render    | `jy`               | `buildPostPipeline`                                  |
| render    | `Hg`               | `buildRenderSystem`                                  |
| render    | `H6`               | `skyFragmentShader`                                  |
| render    | `W` / `si` / `gc`  | `Vector3` / `WebGLRenderTarget` / `PCFShadowMap`     |
| materials | `Gg`               | `buildMaterialsManager`                              |
| materials | `wA`               | `buildMaterialsShowcase`                             |
| materials | `aA` / `lA`        | `createSeededRandom` / `hashString`                  |
| materials | `Tn` / `Ut` / `An` | `surfaceShaderLibrary` / `PALETTE` / `rgba`          |

- 同步清理 `src/materials.js` 中整段未使用的 `constants.js` / `geo.js` 导入。
- `src/render.js`、`src/materials.js` 统一使用 Prettier 格式化，`materials.js` 中原先压缩为单行的 JS 代码恢复为可读结构。
- 公共导出名保持兼容：`RenderModule as Vg`、`MaterialsModule as qg`，`main.js` 无需改动。

## 三、类型系统升级

### 1. 新增/修正类型（`src/types/index.d.ts`）

- 新增 `CombatRaycast`：命中点、法线、距离、表面类型、敌人实体、受击部位、方向、来源、击杀标记。
- 新增 `EnemyRaycast`、`EnemyHitPart`、`EnemyEntity`。
- 新增 `CombatSystem`：`playerShot` / `enemyShot` / `explode` / `stats` 的完整签名。
- 新增 `PostPipeline`：后处理管线 `run` / `resize` / `copyDepth` / `readAdapt` 等接口。
- 新增 `SeededRandom`：随机源及其 `range` / `int` / `pick` / `sign` / `fork`。
- 按实际返回结构修正 `WeaponState`：`magSize`、`reserve`、`ads`、`spread`、`muzzleWorld()`、`reloadNow()` 等。
- `EngineContext.combat` 由 `any` 收紧为 `CombatSystem`；`rng` 由 `() => number` 收紧为 `SeededRandom`。
- 补充 `RenderStats.adapt`、`GameQualityConfig.tex`、`PhysicsWorld.lineOfSight` 等缺失成员。

### 2. JSDoc 与编译期门禁

- `buildRenderSystem`、`buildPostPipeline`、`buildMaterialsManager`、`createWeapon`、`createCombatSystem` 等入口补齐 `EngineContext` 入参与返回类型。
- 四个核心文件顶部加入 `// @ts-check`。
- 新增 `tsconfig.typecheck.json`，仅纳入强类型核心模块，避免全量打包代码产生噪声。
- `package.json` 新增脚本：`npm run typecheck`。

## 四、变更文件

| 文件                                 | 变更内容                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `src/render.js`                      | 短变量语义化、模块别名重命名、入口 JSDoc、`@ts-check`                       |
| `src/materials.js`                   | 短变量语义化、删除死导入、代码格式化、入口 JSDoc、`@ts-check`               |
| `src/types/index.d.ts`               | 新增/修正 7 组核心类型，完善 EngineContext                                  |
| `src/combat.js`                      | 入口 JSDoc 绑定 `EngineContext` / `CombatSystem`                            |
| `src/weapon.js`                      | 入口 JSDoc 绑定 `EngineContext` / `WeaponState`，局部数组与 Canvas 类型标注 |
| `tsconfig.typecheck.json`            | 新增类型检查配置                                                            |
| `package.json` / `package-lock.json` | 新增 `typecheck` 脚本与 TypeScript 开发依赖                                 |

代码差异规模：6 个源码/配置文件，`+5246 / -1155`。

## 五、验证结果

| 检查项     | 命令                | 结果                              |
| ---------- | ------------------- | --------------------------------- |
| 类型检查   | `npm run typecheck` | 0 error                           |
| 生产构建   | `npm run build`     | 成功（25 modules，产物 1,318 kB） |
| 自动化回归 | `npm test`          | 4/4 用例通过                      |

回归覆盖：生产构建运行、原始单文件对比、weapon/enemies/props 展示模式、开火/弹药扣减/换弹交互。

## 六、工程化基线（第二轮）

在上述重构基础上，项目补齐了可持续协作所需的工程化能力：

### 1. 代码规范

- `eslint.config.js`：ESLint 9 Flat Config，拦截重复 key、不可达代码、`debugger` 等真实风险，对逆向代码的动态写法保持宽容。
- `.prettierrc.json` / `.prettierignore` / `.editorconfig`：统一格式、编码、缩进与换行。
- 全仓库执行 Prettier 格式化，`npm run format:check` 已作为门禁项。
- npm scripts 新增 `lint`、`lint:fix`、`format`、`format:check`、`check`。

### 2. 提交与 CI 门禁

- `.husky/pre-commit`：`lint-staged` 对暂存 JS 执行 ESLint 修复与 Prettier 格式化。
- `.husky/commit-msg`：`commitlint` 校验 Conventional Commits。
- `.github/workflows/ci.yml`：push / PR 依次执行 lint、format check、typecheck、build；独立 job 运行 E2E 回归。
- E2E 服务器端口支持 `PORT` 覆盖，Chrome 路径支持 `CHROME_PATH` 覆盖，便于本地与 CI 复用。

### 3. 配置与骨架

- `vite.config.js` 新增 `@` → `src` 路径别名，与 `tsconfig.json` / `jsconfig.json` 保持一致。
- 新增 `.nvmrc` 与 `engines` 约束，统一 Node.js >= 20 / npm >= 10。

### 4. 文档与版本规范

- 新增 `CONTRIBUTING.md`：分支、提交、质量门禁与 PR 检查清单。
- 新增 `CHANGELOG.md`：Keep a Changelog 格式的版本记录。
- `README.md` 新增“工程化与质量门禁”章节与脚本说明。

## 七、遗留说明

- 本次按“历史 2–3 字符紧凑名”范围治理，文件内仍有少量单字符结构变量（如循环变量、局部临时值），它们作用域短且不构成阅读障碍。
- 后续如继续推进，可对 `render.js` 的 `buildPostPipeline` / `buildRenderSystem` 内部单字符局部变量做第二轮语义化，并逐步扩大 `tsconfig.typecheck.json` 的纳入范围。

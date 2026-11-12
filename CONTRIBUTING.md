# 贡献指南

## 环境准备

```bash
nvm use          # Node.js >= 20
npm install      # 安装依赖并启用 husky 钩子
npm run dev      # 启动开发服务器
```

## 分支与提交

- 分支命名：`feat/<topic>`、`fix/<topic>`、`refactor/<topic>`、`docs/<topic>`。
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：
  - `feat: 新增后处理泛光`
  - `fix: 修复换弹状态机边界`
  - `refactor: 语义化 render 管线变量`
  - `docs: 更新工程化说明`
- `commit-msg` 钩子会自动校验格式；`pre-commit` 会对暂存文件执行 ESLint 修复与 Prettier 格式化。

## 本地质量门禁

提交前请确保以下命令全部通过：

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
```

或直接执行聚合命令：

```bash
npm run check
```

## 目录职责

| 目录/文件          | 职责                                            |
| :----------------- | :---------------------------------------------- |
| `src/`             | 游戏运行时模块（渲染、材质、物理、战斗、UI 等） |
| `src/types/`       | 跨模块共享的 JSDoc/TypeScript 类型声明          |
| `scripts/`         | 逆向分析、提取、边界校验与 E2E 自动化脚本       |
| `tests/artifacts/` | E2E 截图产物（不参与格式化与 lint）             |
| `docs/`            | 逆向工程 Wiki 与技术白皮书                      |
| `dist/`            | 构建产物（不提交）                              |

## 代码约定

- 新增/修改核心数据流时，同步更新 `src/types/index.d.ts` 的 JSDoc 类型。
- 核心渲染、材质、战斗、武器模块需保持 `// @ts-check` 可检查状态。
- 避免重新引入 1–3 字符的无语义变量；局部循环变量除外。
- 不提交 `dist/`、`node_modules/`、`tests/artifacts/` 与任何密钥/本机绝对路径。

## Pull Request 检查清单

- [ ] 提交信息符合 Conventional Commits
- [ ] `npm run lint` 通过
- [ ] `npm run format:check` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 通过
- [ ] `npm test` 通过，或已说明无法运行的原因
- [ ] 涉及核心数据流时已补充/更新类型声明

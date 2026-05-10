# CR-01：索引器独立打包（交付阻塞修复）

## 变更背景

E10 实现验收时发现，客户侧无法独立运行索引构建和检索功能：

**缺陷 D1（REQ-10）**：索引构建通过 `bun run index`（opencode `package.json` scripts）触发，
`scripts/cpp-indexer/index.ts` 运行时依赖 opencode monorepo 的 node_modules 和 bun 环境。
客户现场只有 `devpilot` binary，没有 opencode 源码，无法执行。

**缺陷 D2（REQ-12）**：`cpp-code-search.ts` 通过相对路径 `../../scripts/cpp-indexer/...`
动态 import 检索模块。工具文件从 `.devpilot/tools/` 加载，相对路径指向 opencode 源码目录，
编译后 binary 运行时该路径不存在。

## 原始需求 vs 实现现状

| 项目 | 原始 spec 描述 | 实现现状 | 差距 |
|------|--------------|---------|------|
| REQ-10 交付方式 | "独立 CLI 脚本，bun 运行" | `bun run index`（需 opencode 源码） | ❌ 非独立 |
| REQ-12 运行时依赖 | Tool 内实现，不修改 opencode 核心 | 相对路径 import opencode 源码 | ❌ 依赖源码 |

## 修复方案

将 `scripts/cpp-indexer/` 编译为独立 binary `devpilot-indexer`，同时承担 build 和 search 两个子命令：

```
客户交付物（修复后）：
devpilot            ← AI 对话 binary（已有）
devpilot-indexer    ← 独立索引 CLI（新增）
install.sh
```

**客户操作流**：
```bash
# 构建索引（一次性，或代码变更后重建）
devpilot-indexer build /path/to/cpp-project

# 启动 devpilot（在 C++ 项目根目录）
cd /path/to/cpp-project
devpilot
# devpilot 在对话中自动调用 devpilot-indexer search
```

`cpp-code-search.ts` 改为通过 `child_process.spawn("devpilot-indexer", ["search", ...])` 调用，
消除所有对 opencode 源码的运行时 import 依赖。

## 影响范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `scripts/cpp-indexer/index.ts` | MODIFIED | 拆分为 `build` 子命令，输出路径写到 `<codeRoot>/.opencode-index/` |
| `scripts/cpp-indexer/search.ts` | ADDED | 新增 `search` 子命令入口（从 tool 中抽出检索逻辑） |
| `scripts/cpp-indexer/cli.ts` | ADDED | 统一 CLI 入口，分发 build/search 子命令 |
| `packages/opencode/script/build.ts` | MODIFIED | 新增 `devpilot-indexer` compile target |
| `.devpilot/tools/cpp-code-search.ts` | MODIFIED | 替换 dynamic import 为 subprocess 调用 `devpilot-indexer search` |
| `package.json` | MODIFIED | `index` script 更新为 `devpilot-indexer build` 的开发态等价命令 |
| `/tmp/devpilot-delivery-v1.0.0/install.sh` | MODIFIED | 安装 `devpilot-indexer` binary |

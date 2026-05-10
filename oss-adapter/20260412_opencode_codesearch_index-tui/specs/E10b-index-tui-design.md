# E10b: TUI 内索引构建 — Epic Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to generate the implementation plan from this spec.

**替代关系**：本 Epic 替代 CR-01（独立 devpilot-indexer binary）方案，作为 E10 的架构升级。

---

## 目标

用户在 devpilot TUI 聊天界面输入 `/index /path/to/cpp-project`，devpilot 自动调用 BashTool 执行内置的索引构建子命令，实时展示进度，完成后可直接使用 cpp-code-search 检索。

---

## 架构

### 三层实现

```
L1-Command：.devpilot/commands/index.md
  └─ 用户输入 /index <path> → LLM 读取命令模板 → 调用 BashTool
     └─ BashTool 执行：devpilot index <path>（timeout: 600000ms）
        └─ L3-Patch：src/cli/cmd/index-cmd.ts（新增 yargs 子命令）
           └─ 执行索引构建逻辑（复用 scripts/cpp-indexer/index.ts 的 buildMain）

L2-Plugin：.devpilot/tools/cpp-code-search.ts（修改）
  └─ 替换 ../../scripts/cpp-indexer/... 相对路径 import
     └─ 改为 spawnSync(process.execPath, ["index", "--search", ...])
```

### 数据流

```
用户: /index /path/to/cpp
  → TUI 触发 command: "index"，arguments: "/path/to/cpp"
  → LLM 读取 index.md 模板（$ARGUMENTS = "/path/to/cpp"）
  → LLM 调用 BashTool("devpilot index /path/to/cpp", timeout=600000)
  → BashTool 启动子进程，实时输出回 TUI
  → index-cmd.ts 执行 buildMain("/path/to/cpp")
  → 索引写到 /path/to/cpp/.opencode-index/
  → BashTool 返回完成信息
  → LLM 回复："索引构建完成，可以开始检索了"
```

---

## 文件清单

| 文件 | 动作 | 定制级别 |
|------|------|---------|
| `packages/opencode/src/cli/cmd/index-cmd.ts` | 新增 | L3-Patch |
| `packages/opencode/src/index.ts` | 修改：注册 IndexCommand | L3-Patch |
| `scripts/cpp-indexer/index.ts` | 修改：导出 `buildMain(codeRoot)` | 内部重构 |
| `.devpilot/commands/index.md` | 新增 | L1-Command |
| `.devpilot/tools/cpp-code-search.ts` | 修改：subprocess 替换 import | L2-Plugin |

---

## 详细实现规范

### 1. `scripts/cpp-indexer/index.ts` 导出 buildMain

当前 `main()` 改为 `export async function buildMain(codeRoot: string)`，接收路径参数而非从 `process.argv` 读取，移除文件末尾的自动调用。

保留开发态入口：
```typescript
// 仅当直接运行时执行（bun run index.ts <path>）
if (import.meta.main) {
  const codeRoot = process.argv[2]
  if (!codeRoot) { console.error("用法: bun run index.ts <代码库路径>"); process.exit(1) }
  buildMain(codeRoot).catch((e) => { console.error(e); process.exit(1) })
}
```

### 2. `src/cli/cmd/index-cmd.ts`（新增）

```typescript
// CUSTOM: DevPilot — C++ 代码库索引构建子命令
// 用法：devpilot index <代码库路径> [--model=MINILM|BGE_M3]
// 由 /index TUI 命令通过 BashTool 调用，也可直接在终端使用
import type { CommandModule } from "yargs"
import { cmd } from "./cmd"

export const IndexCommand = cmd<{}, { path: string; model?: string; search?: boolean; "index-dir"?: string; query?: string; "top-k"?: number }>({
  command: "index <path>",
  describe: "构建 C++ 代码库的离线语义索引",
  builder: (yargs) =>
    yargs
      .positional("path", { type: "string", demandOption: true, describe: "C++ 代码库根目录" })
      .option("model", { type: "string", default: "MINILM", describe: "Embedding 模型（MINILM|BGE_M3）" })
      // --search 模式：供 cpp-code-search.ts 内部调用
      .option("search", { type: "boolean", hidden: true })
      .option("index-dir", { type: "string", hidden: true })
      .option("query", { type: "string", hidden: true })
      .option("top-k", { type: "number", default: 5, hidden: true }),
  handler: async (argv) => {
    if (argv.search) {
      // 检索模式（供 cpp-code-search.ts subprocess 调用）
      const { searchMain } = await import("../../../scripts/cpp-indexer/search")
      await searchMain({ indexDir: argv["index-dir"]!, query: argv.query!, topK: argv["top-k"]! })
    } else {
      // 构建模式
      const { buildMain } = await import("../../../scripts/cpp-indexer/index")
      await buildMain(argv.path)
    }
  },
})
```

### 3. `src/index.ts` 注册 IndexCommand

在现有 `.command(ExportCommand)` 附近添加（注意：lockdown 模式下此命令仍保留，因为是内部工具，不显示在用户面板）：

```typescript
import { IndexCommand } from "./cli/cmd/index-cmd"
// ...
.command(IndexCommand)
```

### 4. `.devpilot/commands/index.md`（新增）

```markdown
---
name: index
description: 为指定 C++ 代码库构建离线语义索引，支持后续需求-代码关联检索
---

# /index 命令

用户输入 `/index <代码库路径>` 时，执行以下操作：

## 执行步骤

1. 从 `$ARGUMENTS` 提取代码库路径（若未提供，询问用户）
2. 调用 BashTool 执行索引构建，**必须传入 timeout: 600000**（10 分钟）：
   ```
   devpilot index <代码库路径>
   ```
3. 实时展示 BashTool 输出的进度（5 个阶段：扫描→解析→BM25→Embedding→HNSW）
4. 构建完成后，告知用户：
   - 索引位置：`<代码库路径>/.opencode-index/`
   - 文件数和代码单元数
   - 下一步：在该目录启动 devpilot 后可直接使用需求检索

## 注意事项

- 首次运行会下载 Embedding 模型（~90MB），需要网络，之后离线可用
- 大型项目（>10万行）构建时间可能超过 5 分钟，请耐心等待
- 若路径不存在，立即提示错误，不要执行构建
```

### 5. `.devpilot/tools/cpp-code-search.ts` 修改

删除所有 `../../scripts/cpp-indexer/` 的 import（包括 type import 和 dynamic import），改为：

**类型定义内联**（替换 `import type { IndexMetadata, CodeChunk }`）：
```typescript
interface IndexMetadata {
  code_root: string; built_at: string; file_count: number
  chunk_count: number; embedding_model: string; version: string
}
```

**execute 内检索逻辑替换**（替换所有 dynamic import + BM25/Vector/RRF 调用）：
```typescript
execute: async (args) => {
  const check = checkIndex()
  if (!check.ok) return JSON.stringify({ error: check.error })

  const queryText = [args.requirement.description, ...(args.requirement.acceptance_criteria ?? [])].join(" ")

  const result = spawnSync(
    process.execPath,
    ["index", "--search", `--index-dir=${INDEX_DIR}`, `--query=${queryText}`, `--top-k=${args.top_k}`],
    { encoding: "utf-8", timeout: 10000 }
  )

  if (result.status !== 0) {
    return JSON.stringify({ error: result.stderr || "检索失败，请确认索引已构建（/index <路径>）" })
  }

  const searchResult: { index_info: any; results: any[] } = JSON.parse(result.stdout)
  const meta = check.meta!
  const indexAge = Math.round((Date.now() - new Date(meta.built_at).getTime()) / 1000 / 60)

  const mdTable = [
    `## 需求-代码关联检索结果（${args.requirement.id}）`,
    "",
    `**查询：** ${queryText.slice(0, 80)}${queryText.length > 80 ? "..." : ""}`,
    `**索引：** ${meta.code_root}（${indexAge} 分钟前构建，共 ${meta.chunk_count} 个代码单元）`,
    "",
    "| # | 文件 | 类 | 函数 | 关联度 | 等级 |",
    "|---|------|----|------|--------|------|",
    ...searchResult.results.map((r: any) =>
      `| ${r.rank} | \`${r.file}\` | ${r.class ?? "-"} | \`${r.function ?? "-"}\` | ${r.score} | **${r.label}** |`
    ),
  ].join("\n")

  return JSON.stringify({ json: { requirement_id: args.requirement.id, query: queryText, ...searchResult }, markdown: mdTable })
}
```

同时新增 import：
```typescript
import { spawnSync } from "child_process"
```

删除：
```typescript
// 删除这行
import type { IndexMetadata, CodeChunk } from "../../scripts/cpp-indexer/types"
// 删除 loadChunks() 函数
```

---

## 约束

1. `index-cmd.ts` 标注 `// CUSTOM: DevPilot — C++ 索引构建命令`
2. lockdown 的 `bin/devpilot` 不需要修改（`devpilot index` 是内部子命令，不暴露给用户面板）
3. `src/index.ts` 的注册行标注 `// CUSTOM: DevPilot — 注册索引构建命令`

---

## 验证步骤

```bash
# 1. 开发态验证（bun run dev）
cd /path/to/cpp-project
bun run --cwd /path/to/opencode --conditions=browser src/index.ts
# 在 TUI 输入：/index /path/to/cpp-project
# 预期：BashTool 输出 5 阶段进度，完成后 LLM 回复摘要

# 2. 检索验证
# TUI 输入：检索需求 { id: "REQ-01", description: "传感器数据采集" }
# 预期：cpp-code-search 工具通过 process.execPath 调用自身 --search 子命令，返回 Top-5

# 3. 编译验证
bun run build --single --skip-embed-web-ui
./dist/devpilot-ai-darwin-*/bin/devpilot index /path/to/cpp-project
```

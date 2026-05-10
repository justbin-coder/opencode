# CR-01 实现任务（delta）

> **Base spec**：`oss-adapter/20260404_opencode_codesearch/specs/E10-cpp-code-search-design.md`
> **变更范围**：仅修复 REQ-10（索引构建独立化）和 REQ-12（Tool 消除源码依赖），
> REQ-11/13/14/15 逻辑不变，不重新实现。

## 目标

将 `scripts/cpp-indexer/` 编译为独立 binary `devpilot-indexer`，
`cpp-code-search.ts` 改用 subprocess 调用，客户不再依赖 opencode 源码。

## 交付物

| 文件 | 动作 |
|------|------|
| `scripts/cpp-indexer/cli.ts` | 新增：统一 CLI 入口（build/search 子命令） |
| `scripts/cpp-indexer/search.ts` | 新增：search 子命令（从 tool 中抽出检索逻辑） |
| `scripts/cpp-indexer/index.ts` | 修改：改为 build 子命令，索引写到 `<codeRoot>/.opencode-index/` |
| `packages/opencode/script/build.ts` | 修改：新增 `devpilot-indexer` compile target |
| `.devpilot/tools/cpp-code-search.ts` | 修改：替换 dynamic import 为 subprocess 调用 |
| `package.json` | 修改：`index` script 指向 cli.ts |

## Task 1：新增 search 子命令（从 Tool 抽出检索逻辑）

**文件**：
- 新建：`scripts/cpp-indexer/search.ts`

将 `cpp-code-search.ts` 中的检索逻辑（BM25 + VectorStore + RRF）抽到此文件，
接受 CLI 参数，输出 JSON 到 stdout。

```typescript
// scripts/cpp-indexer/search.ts
// 用法：devpilot-indexer search --index-dir=<dir> --query=<text> --top-k=5
import path from "path"
import { Bm25Index } from "./bm25"
import { VectorStore } from "./vector-store"
import { initEmbedder, embed } from "./embedder"
import { rrfFuse } from "./rrf"
import { readFileSync, existsSync } from "fs"
import type { CodeChunk, IndexMetadata } from "./types"

export async function searchMain() {
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter(a => a.startsWith("--"))
      .map(a => { const [k, v] = a.slice(2).split("="); return [k, v] })
  )

  const indexDir = args["index-dir"]
  const query = args["query"]
  const topK = parseInt(args["top-k"] ?? "5")

  if (!indexDir || !query) {
    console.error(JSON.stringify({ error: "缺少参数: --index-dir 和 --query 必填" }))
    process.exit(1)
  }

  const metaPath = path.join(indexDir, "metadata.json")
  if (!existsSync(metaPath)) {
    console.error(JSON.stringify({ error: `索引不存在: ${indexDir}` }))
    process.exit(1)
  }

  const meta: IndexMetadata = JSON.parse(readFileSync(metaPath, "utf-8"))
  const chunksPath = path.join(indexDir, "chunks.jsonl")
  const allChunks: CodeChunk[] = readFileSync(chunksPath, "utf-8")
    .trim().split("\n").filter(Boolean).map(l => JSON.parse(l))

  const bm25 = new Bm25Index(path.join(indexDir, "bm25.db"))
  const modelId = await initEmbedder("MINILM")
  const store = new VectorStore(modelId)
  store.load(path.join(indexDir, "vectors.bin"), path.join(indexDir, "vectors.idmap"))

  const [bm25Results, vectorResults] = await Promise.all([
    Promise.resolve(bm25.search(query, 20)),
    embed(query).then(vec => store.search(vec, 20, allChunks)),
  ])
  bm25.close()

  const results = rrfFuse(bm25Results, vectorResults, topK)

  const output = {
    index_info: { code_root: meta.code_root, built_at: meta.built_at, chunk_count: meta.chunk_count },
    results: results.map((r, i) => ({
      rank: i + 1,
      file: r.chunk.file,
      class: r.chunk.class,
      function: r.chunk.function,
      signature: r.chunk.signature,
      lines: `${r.chunk.start_line}-${r.chunk.end_line}`,
      score: r.score,
      label: r.label,
      doc_comment: r.chunk.doc_comment || null,
    })),
  }
  console.log(JSON.stringify(output))
}
```

## Task 2：新增统一 CLI 入口

**文件**：
- 新建：`scripts/cpp-indexer/cli.ts`

```typescript
// scripts/cpp-indexer/cli.ts
// devpilot-indexer build <codeRoot>  — 构建索引
// devpilot-indexer search --index-dir=<dir> --query=<text> [--top-k=5]  — 检索
const sub = process.argv[2]

if (sub === "build") {
  // 将 build 逻辑内联（原 index.ts main()，index.ts 改为只导出 buildMain）
  const { buildMain } = await import("./index")
  await buildMain()
} else if (sub === "search") {
  const { searchMain } = await import("./search")
  await searchMain()
} else {
  console.error("用法: devpilot-indexer <build|search> [options]")
  process.exit(1)
}
```

## Task 3：修改 index.ts 导出 buildMain

**文件**：
- 修改：`scripts/cpp-indexer/index.ts`

将 `main()` 改名为 `buildMain()` 并导出，移除文件末尾的 `main()` 直接调用（由 cli.ts 触发）。

```typescript
// 末尾改为：
export async function buildMain() {
  // ... 原 main() 全部逻辑不变 ...
}
```

## Task 4：新增 build.ts 的 devpilot-indexer compile target

**文件**：
- 修改：`packages/opencode/script/build.ts`

在现有 devpilot binary 构建循环之后，新增独立编译 devpilot-indexer：

```typescript
// 在 for (const item of targets) { ... } 循环结束后追加：

// 编译 devpilot-indexer（仅当前平台，--single 模式下）
if (singleFlag) {
  const indexerOutfile = `dist/${targets[0] ? [pkg.name, ...].join("-") : "devpilot-ai-" + process.platform + "-" + process.arch}/bin/devpilot-indexer`
  console.log("building devpilot-indexer")
  await Bun.build({
    entrypoints: ["./scripts/cpp-indexer/cli.ts"],
    compile: {
      autoloadBunfig: false,
      autoloadDotenv: false,
      target: ("bun-" + process.platform + "-" + process.arch) as any,
      outfile: indexerOutfile,
    },
    tsconfig: "./tsconfig.json",
  })
  console.log(`devpilot-indexer built: ${indexerOutfile}`)
}
```

## Task 5：修改 cpp-code-search.ts 改用 subprocess

**文件**：
- 修改：`.devpilot/tools/cpp-code-search.ts`

删除所有 `../../scripts/cpp-indexer/` 的动态 import，改为 subprocess 调用：

```typescript
import { spawnSync } from "child_process"
import path from "path"
// ... 其他 import 保持不变 ...

// 删除以下动态 import：
// import("../../scripts/cpp-indexer/bm25")
// import("../../scripts/cpp-indexer/vector-store")
// import("../../scripts/cpp-indexer/embedder")
// import("../../scripts/cpp-indexer/rrf")

// execute 中替换检索逻辑：
execute: async (args) => {
  const check = checkIndex()
  if (!check.ok) return JSON.stringify({ error: check.error })

  const queryText = [args.requirement.description, ...(args.requirement.acceptance_criteria ?? [])].join(" ")

  // 查找 devpilot-indexer（同目录或 PATH）
  const indexerBin = findIndexerBin()
  if (!indexerBin) {
    return JSON.stringify({ error: "devpilot-indexer 未找到，请确认已正确安装" })
  }

  const result = spawnSync(indexerBin, [
    "search",
    `--index-dir=${INDEX_DIR}`,
    `--query=${queryText}`,
    `--top-k=${args.top_k}`,
  ], { encoding: "utf-8", timeout: 10000 })

  if (result.status !== 0) {
    return JSON.stringify({ error: result.stderr || "检索失败" })
  }

  const searchResult = JSON.parse(result.stdout)
  // 格式化输出（Markdown 表格）保持原有逻辑不变
  // ...
}
```

新增 `findIndexerBin()`：

```typescript
function findIndexerBin(): string | null {
  // 1. 同 binary 目录（正式交付）
  const scriptPath = process.execPath  // devpilot binary 路径
  const sameDir = path.join(path.dirname(scriptPath), "devpilot-indexer")
  if (existsSync(sameDir)) return sameDir

  // 2. PATH 中查找（开发态）
  const whichResult = spawnSync("which", ["devpilot-indexer"], { encoding: "utf-8" })
  if (whichResult.status === 0) return whichResult.stdout.trim()

  return null
}
```

## Task 6：更新 package.json index script

**文件**：
- 修改：`package.json`

```json
"index": "bun run scripts/cpp-indexer/cli.ts build"
```

## 验证步骤

```bash
# 1. 构建（单平台）
cd /path/to/opencode
bun run build --single --skip-embed-web-ui

# 2. 验证两个 binary 都存在
ls dist/devpilot-ai-darwin-*/bin/
# 应看到: devpilot  devpilot-indexer

# 3. 构建索引（使用独立 binary）
./dist/devpilot-ai-darwin-*/bin/devpilot-indexer build /tmp/test-cpp

# 4. 在客户 C++ 项目根启动 devpilot，验证检索
cd /tmp/test-cpp
/path/to/devpilot
```

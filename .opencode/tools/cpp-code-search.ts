/**
 * cpp-code-search：C++ 需求-代码关联检索工具
 *
 * 输入：E1 结构化需求卡片（JSON）
 * 输出：Top-5 相关代码单元（文件路径、类名、函数名、关联度分数、等级标签）
 *
 * 前置条件：必须先运行 `bun run index <代码库路径>` 构建索引
 */
import { tool } from "@opencode-ai/plugin"
import { z } from "zod"
import { existsSync, readFileSync } from "fs"
import path from "path"
import type { IndexMetadata, CodeChunk } from "../../scripts/cpp-indexer/types"

// 索引目录路径（相对于 opencode 工作目录）
const INDEX_DIR = path.join(process.cwd(), ".opencode-index")
const METADATA_PATH = path.join(INDEX_DIR, "metadata.json")
const BM25_DB_PATH = path.join(INDEX_DIR, "bm25.db")
const VECTORS_BIN_PATH = path.join(INDEX_DIR, "vectors.bin")
const VECTORS_IDMAP_PATH = path.join(INDEX_DIR, "vectors.idmap")
const CHUNKS_JSONL_PATH = path.join(INDEX_DIR, "chunks.jsonl")

/** 检查索引是否就绪 */
function checkIndex(): { ok: boolean; error?: string; meta?: IndexMetadata } {
  if (!existsSync(METADATA_PATH)) {
    return { ok: false, error: "索引未构建，请先运行：bun run index <代码库路径>" }
  }
  const meta: IndexMetadata = JSON.parse(readFileSync(METADATA_PATH, "utf-8"))
  if (meta.version !== "1.0.0") {
    return { ok: false, error: `索引版本 ${meta.version} 不兼容，请重新构建：bun run index <代码库路径>` }
  }
  return { ok: true, meta }
}

/** 从 chunks.jsonl 加载全量 chunk 元数据 */
function loadChunks(): CodeChunk[] {
  const lines = readFileSync(CHUNKS_JSONL_PATH, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
  return lines.map((l) => JSON.parse(l))
}

export default tool({
  description: `搜索与 C++ 代码库相关的需求-代码关联信息。

输入：E1 结构化需求卡片（JSON 格式，含 id、description、acceptance_criteria）
输出：Top-5 最相关代码单元，包含文件路径、类名、函数名、关联度分数（0~1）、等级标签（High/Medium/Low）

使用场景：
- 用户输入需求卡片，需要找到对应的 C++ 实现代码
- 需要了解某个功能由哪些类/函数实现

注意：索引必须提前构建（运行 bun run index <代码库路径>），否则返回错误提示。`,

  args: {
    requirement: z
      .object({
        id: z.string().describe("需求卡片 ID，如 REQ-01"),
        description: z.string().describe("需求功能描述（必填，查询主要依据）"),
        acceptance_criteria: z.array(z.string()).optional().describe("验收标准列表（可选，辅助查询）"),
      })
      .describe("E1 结构化需求卡片"),
    top_k: z.number().int().min(1).max(10).default(5).describe("返回结果数量，默认 5"),
  },

  execute: async (args) => {
    // 1. 检查索引
    const check = checkIndex()
    if (!check.ok) {
      return JSON.stringify({ error: check.error, suggestion: "bun run index <代码库路径>" })
    }
    const meta = check.meta!

    // 2. 拼接查询文本
    const queryText = [args.requirement.description, ...(args.requirement.acceptance_criteria ?? [])].join(" ")

    // 3. 加载索引模块（动态 import，避免启动时加载）
    const [{ Bm25Index }, { VectorStore }, { initEmbedder, embed }] = await Promise.all([
      import("../../scripts/cpp-indexer/bm25"),
      import("../../scripts/cpp-indexer/vector-store"),
      import("../../scripts/cpp-indexer/embedder"),
    ])

    const allChunks = loadChunks()

    // 4. 并行执行 BM25 + 向量检索（设 8s 超时）
    const bm25 = new Bm25Index(BM25_DB_PATH)
    const modelId = await initEmbedder("MINILM")
    const store = new VectorStore(modelId)
    store.load(VECTORS_BIN_PATH, VECTORS_IDMAP_PATH)

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("检索超时")), 8000),
    )

    const [bm25Results, vectorResults] = await Promise.race([
      Promise.all([
        Promise.resolve(bm25.search(queryText, 20)),
        embed(queryText).then((vec) => store.search(vec, 20, allChunks)),
      ]),
      timeout,
    ])
    bm25.close()

    // 5. RRF 融合排序
    const { rrfFuse } = await import("../../scripts/cpp-indexer/rrf")
    const results = rrfFuse(bm25Results, vectorResults, args.top_k)

    // 6. 格式化输出（JSON + Markdown 双格式）
    const indexAge = Math.round((Date.now() - new Date(meta.built_at).getTime()) / 1000 / 60)

    const jsonOutput = {
      requirement_id: args.requirement.id,
      query: queryText,
      index_info: {
        code_root: meta.code_root,
        built_at: meta.built_at,
        age_minutes: indexAge,
        chunk_count: meta.chunk_count,
      },
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

    const mdTable = [
      `## 需求-代码关联检索结果（${args.requirement.id}）`,
      "",
      `**查询：** ${queryText.slice(0, 80)}${queryText.length > 80 ? "..." : ""}`,
      `**索引：** ${meta.code_root}（${indexAge} 分钟前构建，共 ${meta.chunk_count} 个代码单元）`,
      "",
      "| # | 文件 | 类 | 函数 | 关联度 | 等级 |",
      "|---|------|----|------|--------|------|",
      ...results.map(
        (r, i) =>
          `| ${i + 1} | \`${r.chunk.file}\` | ${r.chunk.class ?? "-"} | \`${r.chunk.function ?? "-"}\` | ${r.score} | **${r.label}** |`,
      ),
    ].join("\n")

    return JSON.stringify({ json: jsonOutput, markdown: mdTable })
  },
})

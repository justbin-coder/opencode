/**
 * C++ 代码库语义检索子命令
 * 供 devpilot index --search 调用，读取索引，输出 JSON 到 stdout
 */
import path from "path"
import { existsSync, readFileSync } from "fs"
import { Bm25Index } from "./bm25"
import { VectorStore } from "./vector-store"
import { initEmbedder, embed } from "./embedder"
import { rrfFuse } from "./rrf"
import type { CodeChunk, IndexMetadata } from "./types"

export async function searchMain({
  indexDir,
  query,
  topK,
}: {
  indexDir: string
  query: string
  topK: number
}) {
  const metaPath = path.join(indexDir, "metadata.json")
  if (!existsSync(metaPath)) {
    console.error(JSON.stringify({ error: `索引不存在: ${indexDir}，请先运行 /index <代码库路径>` }))
    process.exit(1)
  }

  const meta: IndexMetadata = JSON.parse(readFileSync(metaPath, "utf-8"))
  const chunksPath = path.join(indexDir, "chunks.jsonl")
  const allChunks: CodeChunk[] = readFileSync(chunksPath, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))

  const bm25 = new Bm25Index(path.join(indexDir, "bm25.db"))
  const modelId = await initEmbedder("MINILM")
  const store = new VectorStore(modelId)
  store.load(path.join(indexDir, "vectors.bin"), path.join(indexDir, "vectors.idmap"))

  const [bm25Results, vectorResults] = await Promise.all([
    Promise.resolve(bm25.search(query, 20)),
    embed(query).then((vec) => store.search(vec, 20, allChunks)),
  ])
  bm25.close()

  const results = rrfFuse(bm25Results, vectorResults, topK)

  const output = {
    index_info: {
      code_root: meta.code_root,
      built_at: meta.built_at,
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

  console.log(JSON.stringify(output))
}

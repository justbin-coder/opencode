/**
 * C++ 代码库离线索引构建 CLI
 * 用法：devpilot index <代码库路径>
 *
 * Embedding 通过 HTTP 调用 OpenAI-compatible /v1/embeddings API，
 * API 配置从 ~/.config/devpilot/devpilot.json 读取。
 *
 * 输出目录：<代码库路径>/.opencode-index/
 *   metadata.json   索引元信息
 *   bm25.db         SQLite FTS5 索引
 *   vectors.bin     向量索引（��� JS 格式）
 *   vectors.idmap   向量 id 映射
 *   chunks.jsonl    代码单元元数据
 */
import { readdir } from "fs/promises"
import { writeFileSync, existsSync, mkdirSync, appendFileSync } from "fs"
import path from "path"
import { parseFile } from "./parser"
import { Bm25Index } from "./bm25"
import { initEmbedder, embedBatch, chunkToEmbedText } from "./embedder"
import { VectorStore } from "./vector-store"
import type { CodeChunk, IndexMetadata } from "./types"

/** 递归收集代码库中所有 C++ 源文件 */
async function collectCppFiles(rootDir: string): Promise<string[]> {
  const files: string[] = []
  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        // 跳过 build/output 目录
        if (["build", "cmake-build", ".git", "node_modules"].includes(entry.name)) continue
        await walk(full)
      } else if (/\.(cpp|cc|cxx|h|hpp|hxx)$/i.test(entry.name)) {
        files.push(full)
      }
    }
  }
  await walk(rootDir)
  return files
}

export async function buildMain(codeRoot: string) {
  const codeRootAbs = path.resolve(codeRoot)
  if (!existsSync(codeRootAbs)) {
    console.error(`代码库路径不存在: ${codeRootAbs}`)
    process.exit(1)
  }

  // 索引写到 C++ 项目根目录下，与 devpilot 启动目录解耦
  const INDEX_DIR = path.join(codeRootAbs, ".opencode-index")
  const METADATA_PATH = path.join(INDEX_DIR, "metadata.json")
  const BM25_DB_PATH = path.join(INDEX_DIR, "bm25.db")
  const VECTORS_BIN_PATH = path.join(INDEX_DIR, "vectors.bin")
  const VECTORS_IDMAP_PATH = path.join(INDEX_DIR, "vectors.idmap")
  const CHUNKS_JSONL_PATH = path.join(INDEX_DIR, "chunks.jsonl")

  // 创建索引目录
  mkdirSync(INDEX_DIR, { recursive: true })

  console.log(`[1/5] 扫描 C++ 文件: ${codeRootAbs}`)
  const files = await collectCppFiles(codeRootAbs)
  console.log(`    发现 ${files.length} 个文件`)

  console.log("[2/5] 解析代码单元...")
  const allChunks: CodeChunk[] = []
  // 清空 chunks.jsonl
  writeFileSync(CHUNKS_JSONL_PATH, "")
  for (let i = 0; i < files.length; i++) {
    const abs = files[i]
    const rel = path.relative(codeRootAbs, abs)
    try {
      const chunks = await parseFile(abs, rel)
      allChunks.push(...chunks)
      for (const c of chunks) appendFileSync(CHUNKS_JSONL_PATH, JSON.stringify(c) + "\n")
    } catch {
      console.warn(`    跳过解析失败文件: ${rel}`)
    }
    if ((i + 1) % 100 === 0) console.log(`    已处理 ${i + 1}/${files.length} 个文件`)
  }
  console.log(`    提取代码单元: ${allChunks.length} 个`)

  console.log("[3/5] 构建 BM25 索引...")
  const bm25 = new Bm25Index(BM25_DB_PATH)
  bm25.insertBatch(allChunks)
  bm25.close()
  console.log("    BM25 索引完成")

  console.log("[4/5] 生成 Embedding 向量（调用 Embedding API）...")
  const modelId = await initEmbedder()
  const texts = allChunks.map(chunkToEmbedText)
  const vectors = await embedBatch(texts, (cur, total) => {
    if (cur % 100 === 0 || cur === total) process.stdout.write(`\r    向量化进度: ${cur}/${total}`)
  })
  console.log("\n    Embedding 生成完成")

  console.log("[5/5] 构建 HNSW 向量索引...")
  const store = new VectorStore(modelId)
  store.initIndex(allChunks.length + 100) // 留余量
  store.insertBatch(vectors, allChunks.map((c) => c.id))
  store.save(VECTORS_BIN_PATH, VECTORS_IDMAP_PATH)
  console.log("    向量索引完成")

  // 写入元信息
  const metadata: IndexMetadata = {
    code_root: codeRootAbs,
    built_at: new Date().toISOString(),
    file_count: files.length,
    chunk_count: allChunks.length,
    embedding_model: modelId,
    version: "1.0.0",
  }
  writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2))

  console.log(`\n✅ 索引构建完成！输出目录: ${INDEX_DIR}`)
  console.log(`   文件数: ${files.length}，代码单元: ${allChunks.length}`)
}

// 开发态入口（仅 bun run index.ts 直接运行时执行）
if (import.meta.main) {
  const codeRoot = process.argv[2]
  if (!codeRoot) {
    console.error("用法: bun run index.ts <代码库路径>")
    process.exit(1)
  }
  buildMain(codeRoot).catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

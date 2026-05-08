/**
 * 向量索引 — 纯 JS 实现
 * 使用暴力 cosine similarity 检索，零 native 依赖。
 * 代码库量级（几千个 chunk）下性能完全够用（<100ms）。
 */
import { readFileSync, writeFileSync, existsSync } from "fs"
import type { SearchResult, CodeChunk } from "./types"

export class VectorStore {
  /** 所有向量，按插入顺序存储 */
  private vectors: Float32Array[] = []
  /** int index → chunk id 映射 */
  private idMap: Map<number, string> = new Map()
  private dim: number = 0
  private modelId: string

  constructor(modelId: string) {
    this.modelId = modelId
  }

  /** 初始化（兼容旧接口，纯 JS 实现无需预分配） */
  initIndex(_maxElements: number) {
    this.vectors = []
    this.idMap = new Map()
  }

  /**
   * 批量插入向量
   * @param vectors embedding 向量列表
   * @param chunkIds 对应的 chunk id 列表
   */
  insertBatch(vectors: Float32Array[], chunkIds: string[]): number[] {
    const embeddingIds: number[] = []
    for (let i = 0; i < vectors.length; i++) {
      const idx = this.vectors.length
      if (this.dim === 0 && vectors[i].length > 0) {
        this.dim = vectors[i].length
      }
      this.vectors.push(vectors[i])
      this.idMap.set(idx, chunkIds[i])
      embeddingIds.push(idx)
    }
    return embeddingIds
  }

  /**
   * cosine similarity 计算
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    return denom === 0 ? 0 : dot / denom
  }

  /**
   * 向量近邻检索（暴力搜索）
   */
  search(queryVec: Float32Array, topK: number, allChunks: CodeChunk[]): SearchResult[] {
    if (this.vectors.length === 0) return []

    // 计算所有向量的 cosine similarity
    const scores = this.vectors.map((vec, idx) => ({
      idx,
      score: this.cosineSimilarity(queryVec, vec),
    }))

    // 按分数降序排序，取 topK
    scores.sort((a, b) => b.score - a.score)
    const topResults = scores.slice(0, topK)

    return topResults.map((item, rank) => {
      const chunkId = this.idMap.get(item.idx)
      const chunk = allChunks.find((c) => c.id === chunkId)
      if (!chunk) throw new Error(`向量索引中 idx=${item.idx} 对应的 chunk 不存在`)
      return {
        chunk,
        bm25_rank: null,
        vector_rank: rank + 1,
        score: 0,
        label: "Low" as const,
      }
    })
  }

  /**
   * 持久化索引到文件
   * 格式：维度(4B) + 向量数(4B) + 向量数据(float32)
   */
  save(binPath: string, idMapPath: string) {
    // 写向量数据
    const count = this.vectors.length
    const header = new Uint32Array([this.dim, count])
    const headerBuf = Buffer.from(header.buffer)

    const dataBuf = Buffer.alloc(count * this.dim * 4)
    for (let i = 0; i < count; i++) {
      const vec = this.vectors[i]
      for (let j = 0; j < this.dim; j++) {
        dataBuf.writeFloatLE(vec[j], (i * this.dim + j) * 4)
      }
    }

    writeFileSync(binPath, Buffer.concat([headerBuf, dataBuf]))
    // 写 id 映射
    writeFileSync(idMapPath, JSON.stringify(Array.from(this.idMap.entries())))
  }

  /** 从文件加载索引 */
  load(binPath: string, idMapPath: string) {
    const buf = readFileSync(binPath)
    const header = new Uint32Array(buf.buffer, buf.byteOffset, 2)
    this.dim = header[0]
    const count = header[1]

    this.vectors = []
    const dataOffset = 8 // 2 * 4 bytes header
    for (let i = 0; i < count; i++) {
      const vec = new Float32Array(this.dim)
      for (let j = 0; j < this.dim; j++) {
        vec[j] = buf.readFloatLE(dataOffset + (i * this.dim + j) * 4)
      }
      this.vectors.push(vec)
    }

    // 读 id 映射
    const entries: [number, string][] = JSON.parse(readFileSync(idMapPath, "utf-8"))
    this.idMap = new Map(entries)
  }

  static exists(binPath: string): boolean {
    return existsSync(binPath)
  }
}

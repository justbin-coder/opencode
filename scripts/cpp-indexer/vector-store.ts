/**
 * HNSW 向量索引
 * 基于 hnswlib-node，支持离线持久化和近邻检索
 */
import { HierarchicalNSW } from "hnswlib-node"
import { readFileSync, writeFileSync, existsSync } from "fs"
import type { SearchResult, CodeChunk } from "./types"

/** 向量维度：MiniLM-L6 = 384，BGE-M3 = 1024 */
const DIMENSIONS: Record<string, number> = {
  "Xenova/all-MiniLM-L6-v2": 384,
  "Xenova/bge-m3": 1024,
}

export class VectorStore {
  private index: HierarchicalNSW
  /** int id → chunk id 的映射（HNSW 只支持整数 ID） */
  private idMap: Map<number, string> = new Map()
  private dim: number

  constructor(modelId: string) {
    this.dim = DIMENSIONS[modelId] ?? 384
    this.index = new HierarchicalNSW("cosine", this.dim)
  }

  /** 初始化索引容量（必须在插入前调用） */
  initIndex(maxElements: number) {
    this.index.initIndex(maxElements, 16, 200)
  }

  /**
   * 批量插入向量
   * @param vectors embedding 向量列表
   * @param chunkIds 对应的 chunk id 列表（与 vectors 等长）
   * @returns 分配的 embedding_id 列表（与输入等长）
   */
  insertBatch(vectors: Float32Array[], chunkIds: string[]): number[] {
    const embeddingIds: number[] = []
    for (let i = 0; i < vectors.length; i++) {
      const embId = this.index.getCurrentCount()
      this.index.addPoint(Array.from(vectors[i]), embId)
      this.idMap.set(embId, chunkIds[i])
      embeddingIds.push(embId)
    }
    return embeddingIds
  }

  /**
   * 向量近邻检索
   * @param queryVec 查询向量
   * @param topK 返回结果数量
   * @param allChunks 全量 chunk 列表（按 embedding_id 索引）
   */
  search(queryVec: Float32Array, topK: number, allChunks: CodeChunk[]): SearchResult[] {
    const count = this.index.getCurrentCount()
    if (count === 0) return []
    const k = Math.min(topK, count)
    const result = this.index.searchKnn(Array.from(queryVec), k)

    return result.neighbors.map((embId, rank) => {
      const chunkId = this.idMap.get(embId)
      const chunk = allChunks.find((c) => c.id === chunkId)
      if (!chunk) throw new Error(`向量索引中 embId=${embId} 对应的 chunk 不存在`)
      return {
        chunk,
        bm25_rank: null,
        vector_rank: rank + 1,
        score: 0,
        label: "Low" as const,
      }
    })
  }

  /** 持久化索引到文件 */
  save(binPath: string, idMapPath: string) {
    this.index.writeIndex(binPath)
    writeFileSync(idMapPath, JSON.stringify(Array.from(this.idMap.entries())))
  }

  /** 从文件加载索引 */
  load(binPath: string, idMapPath: string) {
    this.index.readIndex(binPath, true)
    const entries: [number, string][] = JSON.parse(readFileSync(idMapPath, "utf-8"))
    this.idMap = new Map(entries)
  }

  static exists(binPath: string): boolean {
    return existsSync(binPath)
  }
}

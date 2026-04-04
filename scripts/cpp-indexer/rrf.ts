/**
 * RRF（Reciprocal Rank Fusion）融合排序
 * 将 BM25 和向量检索的排名列表合并为统一分数
 */
import type { SearchResult } from './types'

/** RRF 常数 k，控制高排名的奖励幅度，通常取 60 */
const K = 60

/**
 * 将分数（0~1）转换为等级标签
 */
export function scoreToLabel(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 0.7) return 'High'
  if (score >= 0.4) return 'Medium'
  return 'Low'
}

/**
 * RRF 融合两路检索结果
 * @param bm25 BM25 召回列表
 * @param vec 向量召回列表
 * @param topK 最终返回数量
 */
export function rrfFuse(
  bm25: SearchResult[],
  vec: SearchResult[],
  topK: number,
): SearchResult[] {
  if (bm25.length === 0 && vec.length === 0) return []

  // 收集所有唯一 chunk id
  const ids = new Set([
    ...bm25.map(r => r.chunk.id),
    ...vec.map(r => r.chunk.id),
  ])

  // 建立 id → rank 映射
  const bmap = new Map(bm25.map((r, i) => [r.chunk.id, i + 1]))
  const vmap = new Map(vec.map((r, i) => [r.chunk.id, i + 1]))

  // 建立 id → SearchResult 映射
  const map = new Map(
    [...bm25, ...vec]
      .filter((r, i, arr) => arr.findIndex(x => x.chunk.id === r.chunk.id) === i)
      .map(r => [r.chunk.id, r] as const),
  )

  // 计算 RRF 原始分数
  const list = [...ids].map(id => {
    const bm25 = bmap.get(id) ?? null
    const vec = vmap.get(id) ?? null
    const score = (bm25 ? 1 / (K + bm25) : 0) + (vec ? 1 / (K + vec) : 0)
    return { id, bm25, vec, score }
  })

  // 归一化到 [0, 1]
  const max = Math.max(...list.map(r => r.score), 1e-9)

  return list
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(r => {
      const score = parseFloat((r.score / max).toFixed(2))
      return {
        chunk: map.get(r.id)!.chunk,
        bm25_rank: r.bm25,
        vector_rank: r.vec,
        score,
        label: scoreToLabel(score),
      }
    })
}

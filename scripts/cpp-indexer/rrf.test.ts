import { describe, it, expect } from 'bun:test'
import { rrfFuse, scoreToLabel } from './rrf'
import type { SearchResult, CodeChunk } from './types'

function mockResult(id: string, bm25Rank: number | null, vectorRank: number | null): SearchResult {
  const chunk: CodeChunk = {
    id, file: `${id}.cpp`, class: null, function: id,
    signature: id, doc_comment: '', body_snippet: '',
    start_line: 1, end_line: 5, embedding_id: -1,
  }
  return { chunk, bm25_rank: bm25Rank, vector_rank: vectorRank, score: 0, label: 'Low' }
}

describe('rrfFuse', () => {
  it('两路都命中时分数高于单路', () => {
    const bm25 = [mockResult('a', 1, null), mockResult('b', 2, null)]
    const vec  = [mockResult('a', null, 1), mockResult('c', null, 2)]
    const results = rrfFuse(bm25, vec, 5)
    const a = results.find(r => r.chunk.id === 'a')!
    const b = results.find(r => r.chunk.id === 'b')!
    const c = results.find(r => r.chunk.id === 'c')!
    expect(a.score).toBeGreaterThan(b.score)
    expect(a.score).toBeGreaterThan(c.score)
  })

  it('结果按分数降序排列', () => {
    const bm25 = [mockResult('x', 1, null), mockResult('y', 2, null), mockResult('z', 3, null)]
    const vec  = [mockResult('z', null, 1), mockResult('y', null, 2)]
    const results = rrfFuse(bm25, vec, 3)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  it('返回数量不超过 topK', () => {
    const bm25 = Array.from({ length: 10 }, (_, i) => mockResult(`id${i}`, i + 1, null))
    const results = rrfFuse(bm25, [], 5)
    expect(results).toHaveLength(5)
  })

  it('空输入返回空数组', () => {
    expect(rrfFuse([], [], 5)).toHaveLength(0)
  })
})

describe('scoreToLabel', () => {
  it('0.7 → High', () => expect(scoreToLabel(0.7)).toBe('High'))
  it('0.5 → Medium', () => expect(scoreToLabel(0.5)).toBe('Medium'))
  it('0.3 → Low', () => expect(scoreToLabel(0.3)).toBe('Low'))
  it('1.0 → High', () => expect(scoreToLabel(1.0)).toBe('High'))
  it('0.0 → Low', () => expect(scoreToLabel(0.0)).toBe('Low'))
})

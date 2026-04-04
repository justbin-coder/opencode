import { describe, it, expect, afterEach } from 'bun:test'
import { Bm25Index } from './bm25'
import { unlinkSync, existsSync } from 'fs'
import type { CodeChunk } from './types'

const TEST_DB = '/tmp/test-bm25-' + Date.now() + '.db'

function makeChunk(id: string, file: string, cls: string | null, fn: string, sig: string, doc: string): CodeChunk {
  return { id, file, class: cls, function: fn, signature: sig, doc_comment: doc,
    body_snippet: '', start_line: 1, end_line: 10, embedding_id: -1 }
}

describe('Bm25Index', () => {
  afterEach(() => { if (existsSync(TEST_DB)) unlinkSync(TEST_DB) })

  it('应写入并按关键词召回', () => {
    const idx = new Bm25Index(TEST_DB)
    idx.insertBatch([
      makeChunk('a1', 'sensor.cpp', 'SensorFusion', 'update', 'void SensorFusion::update(float dt)', '更新余度传感器状态'),
      makeChunk('b2', 'fc.cpp', 'FlightController', 'engage', 'void FlightController::engage()', '启动飞控系统'),
    ])
    const results = idx.search('传感器', 5)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].chunk.id).toBe('a1')
    idx.close()
  })

  it('搜索不存在关键词返回空数组', () => {
    const idx = new Bm25Index(TEST_DB)
    idx.insertBatch([makeChunk('c3', 'x.cpp', null, 'foo', 'void foo()', '普通函数')])
    const results = idx.search('航电xxx不存在词zzzqqqabc', 5)
    expect(results).toHaveLength(0)
    idx.close()
  })

  it('应按 chunk id 查询元数据', () => {
    const idx = new Bm25Index(TEST_DB)
    const chunk = makeChunk('d4', 'nav.cpp', 'Navigator', 'compute', 'float Navigator::compute()', '计算导航偏差')
    idx.insertBatch([chunk])
    const found = idx.getById('d4')
    expect(found?.function).toBe('compute')
    expect(found?.class).toBe('Navigator')
    idx.close()
  })

  it('getAllChunks 应返回全部已插入的 chunk', () => {
    const idx = new Bm25Index(TEST_DB)
    const chunks = [
      makeChunk('e1', 'a.cpp', null, 'alpha', 'void alpha()', ''),
      makeChunk('e2', 'b.cpp', null, 'beta', 'void beta()', ''),
    ]
    idx.insertBatch(chunks)
    const all = idx.getAllChunks()
    expect(all.length).toBe(2)
    idx.close()
  })
})

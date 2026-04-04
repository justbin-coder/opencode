/**
 * BM25 全文索引
 * 基于 SQLite FTS5，支持中英文混合检索
 */
import { Database } from "bun:sqlite"
import { existsSync, unlinkSync } from "fs"
import type { CodeChunk, SearchResult } from "./types"

export class Bm25Index {
  private db: Database
  private path: string

  constructor(path: string) {
    this.path = path
    this.db = new Database(path)
    this.db.exec("PRAGMA journal_mode = WAL")
    this.init()
  }

  /** 初始化 FTS5 表和元数据表 */
  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `)
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        id UNINDEXED,
        search_text,
        tokenize='trigram'
      )
    `)
  }

  /**
   * 批量写入代码单元
   * search_text = 文件路径 + 类名 + 函数名 + 签名 + 注释（拼接供 FTS5 索引）
   */
  insertBatch(chunks: CodeChunk[]) {
    const chunk = this.db.prepare("INSERT OR REPLACE INTO chunks (id, data) VALUES (?, ?)")
    const fts = this.db.prepare("INSERT INTO chunks_fts (rowid, id, search_text) VALUES ((SELECT rowid FROM chunks_fts WHERE id = ?), ?, ?)")
    const all = this.db.transaction((items: CodeChunk[]) => {
      items.forEach((c) => {
        const text = [
          c.file,
          c.class ?? "",
          c.function ?? "",
          c.signature,
          c.doc_comment,
          c.body_snippet.slice(0, 200),
        ].join(" ")
        chunk.run(c.id, JSON.stringify(c))
        fts.run(c.id, c.id, text)
      })
    })
    all(chunks)
  }

  /**
   * BM25 关键词检索
   * @param query 查询文本
   * @param topK 返回数量上限
   */
  search(query: string, topK: number): SearchResult[] {
    try {
      return (
        this.db
          .prepare(`
            SELECT c.data
            FROM chunks_fts f
            JOIN chunks c ON c.id = f.id
            WHERE chunks_fts MATCH ?
            ORDER BY bm25(chunks_fts)
            LIMIT ?
          `)
          .all(query, topK) as { data: string }[]
      ).map((r, i) => ({
        chunk: JSON.parse(r.data),
        bm25_rank: i + 1,
        vector_rank: null,
        score: 0,
        label: "Low",
      }))
    } catch {
      // FTS5 查询语法错误时返回空结果，例如用户输入特殊字符
      return []
    }
  }

  /** 按 ID 获取单个 chunk */
  getById(id: string): CodeChunk | null {
    const row = this.db.prepare("SELECT data FROM chunks WHERE id = ?").get(id) as { data: string } | undefined
    if (!row) return null
    return JSON.parse(row.data)
  }

  /** 获取全部 chunk */
  getAllChunks(): CodeChunk[] {
    const rows = this.db.prepare("SELECT data FROM chunks").all() as { data: string }[]
    return rows.map((r) => JSON.parse(r.data))
  }

  /** 更新 embedding_id */
  updateEmbeddingId(id: string, embeddingId: number) {
    const chunk = this.getById(id)
    if (!chunk) return
    chunk.embedding_id = embeddingId
    this.db.prepare("UPDATE chunks SET data = ? WHERE id = ?").run(JSON.stringify(chunk), id)
  }

  /** 关闭数据库连接 */
  close() {
    this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)")
    this.db.close()
    ;[`${this.path}-wal`, `${this.path}-shm`].forEach((file) => {
      if (existsSync(file)) unlinkSync(file)
    })
  }
}

export interface CodeChunk {
  /** 代码块唯一标识 */
  id: string
  /** 源文件路径 */
  file: string
  /** 所属类名，若无则为 null */
  class: string | null
  /** 所属函数名，若无则为 null */
  function: string | null
  /** 函数或方法签名 */
  signature: string
  /** 文档注释内容 */
  doc_comment: string
  /** 代码体摘要片段 */
  body_snippet: string
  /** 起始行号 */
  start_line: number
  /** 结束行号 */
  end_line: number
  /** 向量库中的嵌入编号 */
  embedding_id: number
}

export interface IndexMetadata {
  /** C++ 代码根目录 */
  code_root: string
  /** 索引构建时间 */
  built_at: string
  /** 索引覆盖的文件数量 */
  file_count: number
  /** 代码块数量 */
  chunk_count: number
  /** 嵌入模型名称 */
  embedding_model: string
  /** 索引格式版本 */
  version: string
}

export interface SearchResult {
  /** 命中的代码块 */
  chunk: CodeChunk
  /** BM25 排名，若无则为 null */
  bm25_rank: number | null
  /** 向量检索排名，若无则为 null */
  vector_rank: number | null
  /** 融合得分 */
  score: number
  /** 置信度标签 */
  label: "High" | "Medium" | "Low"
}

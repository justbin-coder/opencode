/**
 * Embedding 生成器 — HTTP API 模式
 * 通过 OpenAI-compatible /v1/embeddings 端点生成向量，零 native 依赖。
 * API 配置从 ~/.config/devpilot/devpilot.json 中读取（复用 LLM provider 配置）。
 */
import { readFileSync, existsSync } from "fs"
import path from "path"
import os from "os"

interface EmbeddingConfig {
  baseURL: string
  apiKey: string
  model: string
}

let config: EmbeddingConfig | null = null

/**
 * 从 devpilot 配置文件中读取 embedding API 配置
 * 优先使用环境变量，回退到配置文件中第一个 enabled provider
 */
function loadConfig(): EmbeddingConfig {
  // 环境变量优先（方便测试和覆盖）
  if (process.env.EMBEDDING_API_URL) {
    return {
      baseURL: process.env.EMBEDDING_API_URL,
      apiKey: process.env.EMBEDDING_API_KEY ?? "",
      model: process.env.EMBEDDING_MODEL ?? "text-embedding-ada-002",
    }
  }

  // 读取 devpilot 配置文件
  const configPath = path.join(os.homedir(), ".config/devpilot/devpilot.json")
  if (!existsSync(configPath)) {
    throw new Error(`找不到配置文件 ${configPath}，请先配置 devpilot`)
  }

  const raw = JSON.parse(readFileSync(configPath, "utf-8"))
  const enabledProviders: string[] = raw.enabled_providers ?? []
  const providerId = enabledProviders[0]

  if (!providerId || !raw.provider?.[providerId]?.options) {
    throw new Error("配置文件中未找到可用的 provider，请检查 enabled_providers")
  }

  const opts = raw.provider[providerId].options
  return {
    baseURL: opts.baseURL,
    apiKey: opts.apiKey ?? "",
    model: process.env.EMBEDDING_MODEL ?? "text-embedding-ada-002",
  }
}

/**
 * 初始化 embedding 配置
 * @returns 模型标识（用于记录到索引元信息）
 */
export async function initEmbedder(): Promise<string> {
  config = loadConfig()
  // 验证 API 可达
  console.log(`    Embedding API: ${config.baseURL}/embeddings`)
  console.log(`    Embedding 模型: ${config.model}`)
  return config.model
}

/**
 * 调用 /v1/embeddings API 生成向量
 */
async function callEmbeddingAPI(texts: string[]): Promise<number[][]> {
  if (!config) throw new Error("请先调用 initEmbedder()")

  const url = `${config.baseURL}/embeddings`
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      input: texts,
      model: config.model,
    }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => "")
    throw new Error(`Embedding API 返回 ${resp.status}: ${body}`)
  }

  const json = (await resp.json()) as {
    data: Array<{ embedding: number[]; index: number }>
  }

  // 按 index 排序确保顺序一致
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

/**
 * 生成单条文本的 embedding 向量
 */
export async function embed(text: string): Promise<Float32Array> {
  const [vec] = await callEmbeddingAPI([text])
  return new Float32Array(vec)
}

/** 每批发送的文本数量（避免单次请求过大） */
const BATCH_SIZE = 32

/**
 * 批量生成 embedding，带进度回调
 */
export async function embedBatch(
  texts: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<Float32Array[]> {
  const results: Float32Array[] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const vecs = await callEmbeddingAPI(batch)
    for (const vec of vecs) {
      results.push(new Float32Array(vec))
    }
    onProgress?.(Math.min(i + BATCH_SIZE, texts.length), texts.length)
  }

  return results
}

/**
 * 将代码单元转换为 embedding 输入文本
 * 拼接策略：函数签名（权重最高）+ 注释 + 代码片段摘要
 */
export function chunkToEmbedText(chunk: {
  signature: string
  doc_comment: string
  body_snippet: string
  class: string | null
  function: string | null
}): string {
  const parts = [
    chunk.signature,
    chunk.doc_comment,
    chunk.body_snippet.split("\n").slice(0, 5).join(" "),
  ].filter(Boolean)
  return parts.join(" | ")
}

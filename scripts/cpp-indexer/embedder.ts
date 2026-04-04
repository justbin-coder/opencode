/**
 * Embedding 生成器
 * 使用本地 ONNX 模型（@xenova/transformers），无需 GPU，支持离线部署
 * 默认模型：Xenova/all-MiniLM-L6-v2（90MB，通用语义相似度）
 */
import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers"

/** 支持的模型列表（按精度排序） */
export const MODELS = {
  /** 90MB，快速，适合 CI/测试 */
  MINILM: "Xenova/all-MiniLM-L6-v2",
  /** 500MB，精度更高，适合生产 */
  BGE_M3: "Xenova/bge-m3",
} as const

export type ModelName = keyof typeof MODELS

let extractor: FeatureExtractionPipeline | null = null
let currentModel = ""

/**
 * 初始化 embedding 模型（首次调用时下载，后续使用缓存）
 * @param model 模型标识，默认 MINILM
 */
export async function initEmbedder(model: ModelName = "MINILM"): Promise<string> {
  const modelId = MODELS[model]
  if (extractor && currentModel === modelId) return modelId
  // 模型文件缓存在 ~/.cache/huggingface/hub/
  extractor = await pipeline("feature-extraction", modelId, { quantized: true })
  currentModel = modelId
  return modelId
}

/**
 * 生成单条文本的 embedding 向量
 * @param text 输入文本（函数签名+注释+代码片段拼接）
 * @returns Float32Array 向量
 */
export async function embed(text: string): Promise<Float32Array> {
  if (!extractor) throw new Error("请先调用 initEmbedder() 初始化模型")
  const output = await extractor(text, { pooling: "mean", normalize: true })
  return output.data as Float32Array
}

/**
 * 批量生成 embedding，带进度回调
 * @param texts 文本列表
 * @param onProgress 进度回调（当前索引, 总数）
 */
export async function embedBatch(
  texts: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<Float32Array[]> {
  const results: Float32Array[] = []
  for (let i = 0; i < texts.length; i++) {
    results.push(await embed(texts[i]))
    onProgress?.(i + 1, texts.length)
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
    chunk.body_snippet.split("\n").slice(0, 5).join(" "), // 仅取前5行
  ].filter(Boolean)
  return parts.join(" | ")
}

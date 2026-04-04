/**
 * 端到端集成测试
 * 构建一个小型 C++ 测试代码库的索引，验证检索流程
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs"
import path from "path"
import { parseCppCode } from "./parser"
import { Bm25Index } from "./bm25"
import { initEmbedder, embed, chunkToEmbedText, embedBatch } from "./embedder"
import { VectorStore } from "./vector-store"
import { rrfFuse } from "./rrf"
import type { CodeChunk } from "./types"

const TEST_ROOT = "/tmp/cpp-integration-test"
const TEST_INDEX = "/tmp/cpp-integration-index"

// 10 个有代表性的 C++ 函数，涵盖余度管理、飞控、传感器等航电常见场景
const TEST_SOURCES: Record<string, string> = {
  "sensor_fusion.cpp": `
// 余度传感器数据融合，输入多路传感器值，输出加权平均
class SensorFusion {
public:
  // 更新传感器状态，dt 为时间步长（秒）
  void update(float dt) { state_ += dt * gain_; }
  // 获取当前融合后的传感器值
  float getValue() const { return state_; }
  // 设置融合增益
  void setGain(float gain) { gain_ = gain; }
private:
  float state_ = 0.0f;
  float gain_ = 1.0f;
};`,
  "flight_controller.cpp": `
// 飞行控制律计算模块
class FlightController {
public:
  // 初始化飞控，mode: 0=手动 1=自动
  FlightController(int mode) : mode_(mode), engaged_(false) {}
  // 接管飞控系统，切换到自动驾驶
  void engage() { engaged_ = true; }
  // 断开自动驾驶，切换到手动
  void disengage() { engaged_ = false; }
  // 计算控制指令，返回舵面偏转角（度）
  float computeControl(float error) { return kp_ * error; }
private:
  int mode_;
  bool engaged_;
  float kp_ = 0.5f;
};`,
  "redundancy_manager.cpp": `
// 余度管理模块，监控多路系统健康状态
class RedundancyManager {
public:
  // 检查所有余度通道健康状态，返回故障通道数
  int checkHealth() { return faultCount_; }
  // 切换到备用通道
  void switchToBackup(int channel) { activeChannel_ = channel; }
  // 注册故障回调函数
  void onFault(void (*cb)(int)) { faultCallback_ = cb; }
private:
  int faultCount_ = 0;
  int activeChannel_ = 0;
  void (*faultCallback_)(int) = nullptr;
};`,
}

// 人工标注的 ground truth：需求描述 → 应该命中的函数
const GROUND_TRUTH: Array<{ query: string; expectedFunctions: string[] }> = [
  { query: "余度传感器数据融合状态更新", expectedFunctions: ["update", "getValue"] },
  { query: "飞控系统自动驾驶接管切换", expectedFunctions: ["engage", "disengage"] },
  { query: "获取传感器当前融合数值", expectedFunctions: ["getValue"] },
  { query: "检查余度系统故障健康状态", expectedFunctions: ["checkHealth"] },
  { query: "飞控控制指令舵面偏转计算", expectedFunctions: ["computeControl"] },
]

let allChunks: CodeChunk[] = []
let bm25: Bm25Index
let store: VectorStore
let modelId: string

beforeAll(async () => {
  // 构建测试目录和索引
  mkdirSync(TEST_ROOT, { recursive: true })
  mkdirSync(TEST_INDEX, { recursive: true })

  for (const [file, code] of Object.entries(TEST_SOURCES)) {
    writeFileSync(path.join(TEST_ROOT, file), code)
  }

  // 解析所有文件
  for (const [file, code] of Object.entries(TEST_SOURCES)) {
    allChunks.push(...parseCppCode(code, file))
  }

  // 构建 BM25
  bm25 = new Bm25Index(path.join(TEST_INDEX, "bm25.db"))
  bm25.insertBatch(allChunks)

  // 构建向量索引
  modelId = await initEmbedder("MINILM")
  const texts = allChunks.map(chunkToEmbedText)
  const vectors = await embedBatch(texts)
  store = new VectorStore(modelId)
  store.initIndex(allChunks.length + 10)
  store.insertBatch(vectors, allChunks.map((c) => c.id))
}, 120_000) // 等待模型下载（最多2分钟）

afterAll(() => {
  bm25?.close()
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true })
  if (existsSync(TEST_INDEX)) rmSync(TEST_INDEX, { recursive: true })
})

describe("端到端检索集成测试", () => {
  it(
    "Top-5 命中率应 ≥ 60%（基于测试集）",
    async () => {
      let hitCount = 0

      for (const gt of GROUND_TRUTH) {
        const queryVec = await embed(gt.query)
        const bm25Results = bm25.search(gt.query, 20)
        const vectorResults = store.search(queryVec, 20, allChunks)
        const results = rrfFuse(bm25Results, vectorResults, 5)

        const topFunctions = results.map((r) => r.chunk.function).filter(Boolean)
        const hit = gt.expectedFunctions.some((f) => topFunctions.includes(f))
        if (hit) hitCount++
      }

      const hitRate = hitCount / GROUND_TRUTH.length
      console.log(`命中率: ${hitCount}/${GROUND_TRUTH.length} = ${(hitRate * 100).toFixed(0)}%`)
      // 测试数据集较小，阈值设 60%（生产环境目标 70%）
      expect(hitRate).toBeGreaterThanOrEqual(0.6)
    },
    30_000,
  )

  it("查询响应时间应 ≤ 3s（测试集规模）", async () => {
    const start = Date.now()
    const queryVec = await embed("余度传感器状态更新")
    bm25.search("余度传感器", 20)
    store.search(queryVec, 20, allChunks)
    const elapsed = Date.now() - start
    console.log(`查询耗时: ${elapsed}ms`)
    expect(elapsed).toBeLessThan(3000)
  })
})

# C++ 需求-代码精准检索系统 Design Spec
> **OSS 定制场景：由 oss-adapter 生成，替代 superpowers:brainstorming 输出。**
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to generate the implementation plan from this spec. Process one Epic spec at a time.

**Goal:** 为航电 C++ 项目（15w行）构建离线代码索引+语义检索层，注册为 opencode 自定义 Tool，实现「输入 E1 结构化需求卡片 → 输出 Top-5 关联代码（文件路径+类名+函数名+关联度分数+等级标签）」，满足命中率 ≥70%、响应 ≤10s。

**Architecture:** 三层解耦设计——①离线索引层（tree-sitter 解析 C++，提取文件/类/函数三级单元，BM25+embedding 混合建索引持久化至本地）；②检索层（BM25关键词召回 + 向量语义重排，RRF融合排序，输出分数+等级标签）；③接入层（`.opencode/tools/cpp-code-search.ts` 注册为 opencode L2-Plugin 自定义 Tool，LLM 在处理需求卡片时自动调用）。

**Tech Stack:**
- 代码解析：`tree-sitter` + `tree-sitter-cpp`（离线，毫秒级，精确提取类/函数/方法）
- BM25 全文检索：`better-sqlite3` + SQLite FTS5（零依赖，离线，<5ms查询）
- 向量检索：`@xenova/transformers`（本地 ONNX 模型，无需 GPU）或调用已有 LLM provider embedding API
- 向量存储：本地 `.jsonl` 文件 + `hnswlib-node`（HNSW近邻搜索，~100MB，<2s查询）
- 接入：opencode `.opencode/tools/*.ts` L2-Plugin 机制（`registry.ts:88-101` 自动加载）

**OSS Version:** v1.3.9（77f8b53b4）— 实施前确认版本未变更

---

## 需求范围

| REQ | 需求名称 | 定制级别 | 优先级 |
|-----|---------|---------|--------|
| REQ-10 | C++ 代码库全量索引构建 | L2-Plugin（独立 CLI 脚本） | P1 |
| REQ-11 | 需求卡片解析与查询向量化 | L2-Plugin（Tool 内实现） | P1 |
| REQ-12 | 需求-代码精准关联检索 | L2-Plugin（Tool 核心逻辑） | P1 |
| REQ-13 | 关联度计算与排序 | L2-Plugin（Tool 内实现） | P1 |
| REQ-14 | 结果输出格式规范 | L1-Skill（输出模板） | P1 |
| REQ-15 | 索引增量更新 | L2-Plugin（可选） | P2 |

---

## 架构方案

### 扩展点选择理由

Codex + Gemini + Claude 三方一致结论：opencode 现有机制（grep/glob/lsp）在 15w 行 C++ 下无法满足 ≤10s + top5≥70%。唯一符合要求的路径是：

1. **L2-Plugin 自定义 Tool**（`registry.ts:88-101`）：将检索能力封装为 opencode 识别的工具，LLM 在处理需求卡片时可自然调用
2. **不修改 opencode 核心**：索引构建、检索逻辑全部在 `.opencode/tools/` 和独立 CLI 中实现

### 组件结构

```
.opencode/
├── tools/
│   └── cpp-code-search.ts        # L2-Plugin：注册 cpp_code_search 工具
└── skills/
    └── cpp-code-search/
        └── SKILL.md              # L1-Skill：引导 LLM 使用检索工具的规范

scripts/
└── cpp-indexer/
    ├── index.ts                  # 离线索引构建 CLI（bun run index <code-dir>）
    ├── parser.ts                 # tree-sitter C++ 解析，提取代码单元
    ├── bm25.ts                   # SQLite FTS5 索引写入/查询
    ├── embedder.ts               # embedding 生成（本地模型 or LLM API）
    └── vector-store.ts           # HNSW 向量存储写入/查询

.opencode-index/                  # 索引持久化目录（.gitignore）
├── metadata.json                 # 索引元信息（代码库路径、构建时间、文件数量）
├── bm25.db                       # SQLite FTS5 全文索引
├── vectors.bin                   # HNSW 向量索引
└── chunks.jsonl                  # 代码单元元数据（path/class/func/lines）
```

### 关键数据流

```
[离线构建阶段]
C++ 代码库路径
  → parser.ts: tree-sitter 解析 .cpp/.h/.hpp
  → 提取代码单元：{ file, class, function, signature, docComment, bodySnippet, startLine, endLine }
  → bm25.ts: 写入 SQLite FTS5（可关键词搜索）
  → embedder.ts: 生成 embedding 向量（函数签名+注释+摘要）
  → vector-store.ts: 写入 HNSW 索引
  → chunks.jsonl: 存储元数据映射

[查询阶段（≤10s）]
E1 需求卡片（JSON）
  → cpp-code-search.ts: 提取 functionDescription + acceptanceCriteria 拼接查询文本
  → 并行执行：
    ① BM25 检索（SQLite FTS5）：<5ms，返回 Top-20 候选
    ② 向量检索（HNSW）：<2s，返回 Top-20 候选
  → RRF 融合排序（Reciprocal Rank Fusion）
  → 取 Top-5，计算最终分数（0~1）+ 等级标签（≥0.7=High, 0.4~0.7=Medium, <0.4=Low）
  → 返回：[{ file, class, function, score, label, lines }]
```

---

## 关键实现路径

| 需求 | 定制级别 | 实现方式 | 关键文件/扩展点 |
|------|---------|---------|----------------|
| REQ-10 索引构建 | L2-Plugin | 独立 CLI 脚本，bun 运行 | `scripts/cpp-indexer/index.ts` |
| REQ-11 需求卡片解析 | L2-Plugin | Tool 内提取 JSON 字段 | `tools/cpp-code-search.ts` |
| REQ-12 关联检索 | L2-Plugin | BM25+向量并行检索 | `tools/cpp-code-search.ts` + `scripts/cpp-indexer/` |
| REQ-13 关联度计算 | L2-Plugin | RRF 融合 + 分段映射 | `tools/cpp-code-search.ts` 内联实现 |
| REQ-14 输出格式 | L1-Skill | SKILL.md 规范输出模板 | `.opencode/skills/cpp-code-search/SKILL.md` |
| REQ-15 增量更新 | L2-Plugin | 对比文件 mtime 增量重建 | `scripts/cpp-indexer/index.ts --incremental` |

**扩展点实现规范**

```
扩展点：Custom Tool via .opencode/tools/
目录：{project}/.opencode/tools/
文件格式：*.ts，export default { description, args, execute } (ToolDefinition)
注册方式：自动发现 — registry.ts:88 Glob.scanSync("{tool,tools}/*.{js,ts}")
关联方式：工具注册后出现在 LLM tool list，LLM 自主决策调用
官方示例：.opencode/tools/cpp-test-validator.ts（当前项目已有，但注意：需 export ToolDefinition 格式，而非普通函数）
关键陷阱：cpp-test-validator.ts 目前仅导出普通函数/类型，未被 opencode 识别（Codex 验证结论 registry.ts:88-92）
修复：新建 cpp-code-search.ts 时必须使用 plugin SDK 的 tool() 包装

扩展点：L1-Skill
目录：{project}/.opencode/skills/cpp-code-search/
文件：SKILL.md（含 YAML frontmatter: name/description）
注册方式：自动发现 — skill/index.ts:24 OPENCODE_SKILL_PATTERN
用途：引导 LLM 在处理需求卡片时优先调用 cpp_code_search 工具，规范输出格式
```

---

## 组件设计

### cpp-code-search.ts（Tool 接入层）

```typescript
// 接口定义（ToolDefinition 格式）
export default {
  description: `搜索与 C++ 代码相关的需求-代码关联信息。
    输入 E1 结构化需求卡片（JSON），返回 Top-5 相关代码单元（文件路径、类名、函数名、关联度分数、等级标签）。
    索引必须提前通过 cpp-indexer 构建。`,
  args: {
    requirement: z.object({
      id: z.string(),
      description: z.string(),
      acceptance_criteria: z.array(z.string()).optional(),
    }),
    top_k: z.number().min(1).max(10).default(5),
  },
  execute: async (args, ctx) => {
    // 1. 检查索引是否就绪
    // 2. 拼接查询文本（description + acceptance_criteria）
    // 3. 并行 BM25 + 向量检索
    // 4. RRF 融合排序
    // 5. 格式化输出（JSON + Markdown 双格式）
  }
}
```

### 代码单元数据结构（chunks.jsonl）

```typescript
interface CodeChunk {
  id: string              // 唯一标识（file:class:func 哈希）
  file: string            // 相对于代码库根路径
  class: string | null    // 所属类名
  function: string | null // 函数/方法名
  signature: string       // 完整签名（含参数类型）
  doc_comment: string     // 函数注释（用于 embedding）
  body_snippet: string    // 函数体前 20 行
  start_line: number
  end_line: number
  embedding_id: number    // 在 HNSW 中的索引 ID
}
```

### 关联度分数计算

```
BM25 分数（0~1 归一化）×0.4 + 向量相似度（cosine）×0.6 = 融合分数
等级映射：≥0.7 → High；0.4~0.69 → Medium；<0.4 → Low
```

---

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| 索引未构建 | 返回明确错误提示："请先运行 bun run index <code-dir> 构建索引" |
| 索引版本过期 | metadata.json 记录最后构建时间，Tool 调用时比较并告警 |
| 需求卡片格式错误 | zod 校验，返回字段缺失提示 |
| 向量模型加载失败 | 降级为纯 BM25 模式，在结果中标注 "semantic_disabled" |
| 查询超时（>8s） | 取已完成的检索结果返回，不等向量检索 |

---

## 测试策略

1. **单元测试**（`scripts/cpp-indexer/*.test.ts`）
   - `parser.ts`：对 10 个典型 C++ 模式（类/模板/宏/回调/枚举）验证提取正确性
   - `bm25.ts`：插入 100 条记录后，验证关键词查询召回
   - RRF 融合函数：构造 mock 排名列表，验证分数计算

2. **集成测试**（`scripts/cpp-indexer/integration.test.ts`）
   - 对 opencode 自身的 TypeScript 代码库（已知内容）构建索引，验证端到端流程
   - 10 条人工标注的需求→代码对，验证 top-5 命中率

3. **性能测试**
   - 在 1w 行 C++ 样本（模拟 1/15 规模）测试索引构建时间和查询响应时间
   - 以此推算 15w 行的预期性能

---

## 约束与注意事项

- **不修改 opencode 核心**：所有代码在 `scripts/` 和 `.opencode/tools/` 内，零侵入
- **离线部署**：embedding 模型必须使用本地 ONNX 模型（`@xenova/transformers`），禁止在交付后调用外部 API
- **注释语言**：中文（航电合规要求）
- **索引目录**：`.opencode-index/` 需加入 `.gitignore`，不提交至版本库
- **Tool 格式陷阱**：新 Tool 必须使用 `@opencode-ai/plugin` 的 `tool()` 接口，普通 export 不被 registry 识别（`registry.ts:98`）
- **C++ 方言兼容**：tree-sitter-cpp 对 C++17/C++20 特性解析覆盖率约 95%，模板元编程等边界场景需人工标注补充
- **航电专业术语**：通用 embedding 模型对领域术语表达不充分，建议在测试集中验证命中率达标后再交付

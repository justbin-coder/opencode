# 项目总览
项目：opencode  客户：航电软件  日期：2026-04-04

---
> **分析基准版本**
> 仓库：`opencode`　版本：**`v1.3.9`**　Branch：`hd-dev`
> Commit：`77f8b53b4fe83b346235144938530558ab36ec1d`
> ⚠️ 本方案基于上述版本快照，实施前请确认 OSS 项目版本未发生重大变更。
---

## 核心结论（三方验证）

opencode v1.3.9 的代码感知机制是**工具驱动的迭代检索**（LLM 自主调用 grep/glob/read/lsp），不含预建语义索引。在 15w 行 C++ 项目下：
- 响应时间预估：30~120s（远超 ≤10s 要求）
- top-5 命中率：不可预测（关键词匹配，无语义排序）

**结论：必须构建独立索引层，通过 L2-Plugin 接入 opencode。**

---

## 分期实施排序

### Phase 1（核心交付，约 8d）

| Epic | 说明 | spec 文件 | 估算 | 前置 |
|------|------|----------|------|------|
| **E10: C++ 需求-代码检索系统** | 离线索引构建 + 语义检索 Tool | `specs/E10-cpp-code-search-design.md` | 8d | 无 |

**E10 内部拆解**：

| 任务 | 描述 | 估算 |
|------|------|------|
| T1: 代码解析器 | tree-sitter C++ 解析，提取文件/类/函数三级单元 | 2d |
| T2: BM25 索引 | SQLite FTS5 全文索引构建+查询 | 1d |
| T3: Embedding + 向量存储 | 本地 ONNX 模型 + HNSW 近邻索引 | 2d |
| T4: opencode Tool 接入 | `.opencode/tools/cpp-code-search.ts` 注册 + SKILL.md | 1d |
| T5: 端到端测试+调优 | 人工标注测试集，验证 top-5≥70% + ≤10s | 2d |

### Phase 2（增强，约 2d，可选）

| Epic | 说明 | spec 文件 | 估算 | 前置 |
|------|------|----------|------|------|
| E10-incr: 索引增量更新 | REQ-15，检测文件变更，增量重建索引 | E10 spec 附录 | 2d | E10 |

---

## 工作量汇总

| Epic | spec 文件 | 估算（人天） | 置信度 |
|------|----------|------------|--------|
| E10: C++ 需求-代码检索系统 | specs/E10-cpp-code-search-design.md | 8d | 中（依赖 embedding 模型选型确认） |
| E10-incr: 增量更新（P2） | E10 spec 附录 | 2d | 高 |
| **合计** | | **8~10d** | |

---

## 依赖关系

```
E10（索引构建+检索 Tool）
  └─ 依赖：tree-sitter-cpp npm 包可离线安装
  └─ 依赖：embedding 模型选型确认（本地 ONNX vs LLM API）
  └─ 依赖：航电客户 C++ 代码库本地路径访问权限
  └─ 依赖：E1（需求卡片 JSON 格式规范，已完成）

E10-incr（增量更新）
  └─ 依赖：E10 完成
```

---

## 风险清单

| 风险 | 等级 | 说明 | 缓解方案 |
|------|------|------|---------|
| 航电专业术语命中率不足 | 🔴 高 | 通用 embedding 模型对"余度管理""飞控传感器"等术语表达不充分，可能导致 top-5<70% | 先在小规模测试集验证，必要时 fine-tune 或换领域模型（如 CodeBERT） |
| tree-sitter C++ 解析边界 | 🟡 中 | 复杂模板元编程、宏定义展开无法正确解析（约5%代码） | 解析失败时降级为文件级别索引（文件名+注释全文） |
| 离线 ONNX 模型体积 | 🟡 中 | BGE-M3 约 500MB，交付包体积大 | 改用量化版本（约 150MB）或 MiniLM-L6（90MB，精度略低） |
| opencode Tool 格式兼容 | 🟢 低 | cpp-test-validator.ts 的教训：普通 export 不被 registry 识别 | 新 Tool 直接使用 @opencode-ai/plugin 的 tool() 接口 |
| 索引构建时间（15w行） | 🟢 低 | 预估 5~20min（一次性，离线），不影响查询 | 可并行分片构建，支持断点续建 |

---

## 待确认项（不纳入排期）

以下 ❓ 项需人工确认后决策：

1. **embedding 模型选型**：离线本地 ONNX（`@xenova/transformers`）vs 调用已有 LLM provider 的 embedding API？
   - 影响：本地模型无网络依赖但体积大；API 方式需要网络但精度高
   - **建议**：优先本地（航电离线部署要求）

2. **C++ 代码库目录结构**：是否有标准的 `include/` + `src/` 结构？是否有 CMakeLists.txt？
   - 影响：解析器的文件发现策略（glob 规则）

3. **top-5 命中率验证基准**：是否已有人工标注的"需求→代码"对照集？
   - 影响：测试策略和交付验收标准

---

## 下一步（接入 superpowers 开发流程）

按分期排序，取 **E10** 的 design spec 输入 `superpowers:writing-plans`：

### 标准路径（L2-Plugin）
```
specs/E10-cpp-code-search-design.md
  → superpowers:writing-plans
  → superpowers:subagent-driven-development（T1→T2→T3→T4→T5 顺序执行）
```

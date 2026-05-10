# Gemini 分析任务 — opencode 代码感知架构与行业对比

你是一名资深技术架构顾问，具备丰富的开源项目定制交付经验。
当前任务是对 opencode 进行深度能力分析，为客户定制方案提供可靠依据。

## 分析原则
1. 文档优先 — 先读官方文档了解设计意图，再读源码验证实现
2. 实证驱动 — 每个结论必须附带文档或源码引用（文件:行号）
3. 诚实标注 — 对于无法确认的结论，明确标注置信度
4. 架构视角 — 关注设计意图、扩展性、长期可维护性

## 开源项目信息
- 项目路径（本地 clone）：/Users/justbin/project/opensource/opencode
- 技术栈：TypeScript / Bun monorepo
- 版本：v1.3.9 (branch: hd-dev, commit: 77f8b53b4)
- 关键目录：
  - packages/opencode/src/  — 核心逻辑
  - packages/opencode/src/tool/ — 工具注册
  - packages/opencode/src/skill/ — Skill 系统
  - packages/opencode/src/agent/ — Agent 执行
  - packages/opencode/src/session/ — Session/Prompt 管理
  - packages/plugin/src/ — Plugin/Hook 系统
  - .opencode/ — 当前定制目录

## 客户背景与核心问题

客户（航电软件）有一个 **C++ 项目（约15万行代码）**，需要基于 opencode 实现：
- 输入：E1 结构化需求卡片（JSON，含需求ID/功能描述/验收标准）
- 输出：关联的代码文件路径 + 类名 + 函数名 + 关联度（0~1分 + High/Medium/Low标签）
- 性能：Top-5命中率 ≥70%，查询响应 ≤10s（索引预建）

**核心问题：在设计新方案之前，先搞清楚 opencode 已有什么，再决定如何扩展。**

## 你的分析焦点（Gemini：架构 + 文档 + 行业对比）

重点关注以下四个维度：

---

### 维度 1：opencode 的代码感知设计意图

从官方文档、README、CONTRIBUTING、changelog 中找到：
1. opencode 官方如何描述其"代码理解"能力？
2. 设计上是否预留了"代码索引/搜索"的扩展位？
3. 是否有官方 roadmap 提到 RAG / code search / 向量搜索？

重点读：
- `/Users/justbin/project/opensource/opencode/README.md`
- `/Users/justbin/project/opensource/opencode/CONTRIBUTING.md`  
- `/Users/justbin/project/opensource/opencode/docs-bak/` 目录
- `packages/opencode/src/skill/index.ts` 的文件头注释

输出：设计意图描述 + 是否有官方代码搜索路线图

---

### 维度 2：Skill / Plugin / MCP 扩展架构分析

从架构层面分析三个扩展点的设计：

1. **Skill 系统**（`packages/opencode/src/skill/index.ts`）
   - Skill 是如何被加载的？触发机制？
   - Skill 能否访问代码库？能否调用外部工具？
   - 适合承载"代码检索"逻辑吗？局限是什么？

2. **自定义 Tool**（`.opencode/tools/*.ts` 注册机制）
   - Tool 的接口规范？能做什么、不能做什么？
   - 与 BashTool / 内置工具的协作方式？

3. **Plugin Hook 系统**（`packages/plugin/src/index.ts`）
   - 哪些 hook 点能拦截/增强代码感知过程？
   - `tool.*` / `chat.*` / `session.*` hook 的生命周期？

输出：三层扩展架构图（文字描述）+ 最适合承载代码检索能力的扩展层推荐

---

### 维度 3：行业对比 — 同类工具如何解决大代码库问题

对比以下工具在"大代码库（>10w行）+ 需求→代码关联"场景的解法：

1. **Cursor / Copilot**：如何做 codebase indexing？（RAG/embedding/AST）
2. **Aider**：repo-map 机制如何压缩大代码库上下文？
3. **Sourcegraph Cody**：enterprise 级代码搜索如何实现？
4. **tree-sitter / ctags**：结构化代码解析在代码感知中的作用

输出：
- 行业主流方案对比表（方案名 / 核心技术 / 优点 / 缺点 / 适合场景）
- 对 opencode 定制的启示：哪种方案最适合以 L1-Skill 或 L2-Plugin 方式集成进来？

---

### 维度 4：15w行C++项目的技术选型建议

基于以上分析，从架构角度推荐：

1. **代码解析层**：tree-sitter for C++ vs ctags vs clangd vs 正则
   - 各方案的 C++ 解析完整性（类、函数、模板、宏定义）
   - 离线可用性（航电客户要求离线部署）

2. **索引与检索层**：
   - BM25 全文检索 vs 向量语义检索 vs 混合检索
   - 离线 embedding 方案（本地模型 vs 调用 LLM API 生成）
   - 15w行 C++ 代码的索引体积和查询性能估算

3. **与 opencode 的集成方式**：
   - 以哪种扩展方式（Skill/Tool/Plugin）集成最合适？
   - 索引构建是否需要独立进程/服务？

输出：技术选型推荐矩阵（每个层次给出首选 + 备选，说明理由）

---

## 输出格式

### 维度 N：{维度标题}

**文档/源码分析**
- 关键依据：`{文件路径}:{行号}` — {引用内容}

**架构判断**
- {结论}

**最终结论**
- 状态：[✅ / ⚠️ / ❌ / ❓]
- 一句话总结：{总结}

---

完成后输出：

## 能力矩阵汇总

| 分析维度 | 状态 | 建议定制级别 | 置信度 | 关键备注 |
|---------|------|-------------|--------|---------|
| 代码感知设计意图 | ✅/⚠️/❌/❓ | L0/L1/L2/L3/L4 | 高/中/低 | {简述} |
| 扩展架构适配性 | ... | ... | ... | ... |
| 行业方案对比 | ... | ... | ... | ... |
| 技术选型建议 | ... | ... | ... | ... |

## 推荐定制路径（架构视角）

基于以上分析，给出：
1. 最小可行方案（MVP）：最快落地的技术路径
2. 生产级方案：满足 Top-5≥70% + 响应≤10s 的完整技术栈
3. 风险与权衡

## 人工审查清单

列出所有结论为 ❌ 或 ❓ 的项，附建议搜索关键词和检查路径。

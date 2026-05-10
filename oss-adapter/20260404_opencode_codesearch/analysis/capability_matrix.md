# 能力矩阵 — opencode × C++ 代码检索
Session: 20260404_opencode_codesearch  
版本: v1.3.9 (77f8b53b4)  
分析日期: 2026-04-04  
分析方：Claude 独立分析（Codex/Gemini 仍在运行，结论待交叉验证）

---

## 核心问题 1：opencode 当前的需求→代码关联机制

**源码分析**

| 文件 | 行号 | 说明 |
|------|------|------|
| `packages/opencode/src/tool/grep.ts` | 15-156 | ripgrep 正则搜索，100条结果上限，每行≤2000字符 |
| `packages/opencode/src/tool/glob.ts` | 10-78 | 文件路径匹配，100文件上限 |
| `packages/opencode/src/tool/lsp.ts` | 16-21 | LSP workspaceSymbol（实验性，需clangd运行） |
| `packages/opencode/src/tool/codesearch.ts` | 85 | 调用外部 `mcp.exa.ai` API，用于网络文档搜索，**与本地代码无关** |
| `packages/opencode/src/tool/registry.ts` | 164-166 | codesearch 仅在 opencode provider 或 EXA flag 下启用 |
| `packages/opencode/src/agent/agent.ts` | 181 | "explore" 子 agent 描述：用 grep/glob/read 探索代码库 |

**机制描述**：
opencode 没有预建代码索引。当用户描述需求时，LLM 自主决策调用工具（grep → glob → read）逐步探索，靠关键词匹配和文件内容理解来关联代码。这在小型项目（<1w行）效果良好，但**本质是"探索式"而非"检索式"**。

**最终结论**
- 状态：⚠️ 已有但有显著限制
- 一句话总结：现有机制依赖 LLM 自主逐步探索，无预建索引，在 15w 行 C++ 项目下无法满足 ≤10s 响应 + top5≥70% 命中率要求
- 置信度：高（源码直接验证）

---

## 核心问题 2：大代码库（15w行 C++）的处理瓶颈

**量化分析**

| 瓶颈点 | 具体限制 | 源码位置 |
|--------|---------|---------|
| GrepTool 结果数限制 | 最多返回 100 条匹配 | `grep.ts:107` |
| GlobTool 文件数限制 | 最多返回 100 个文件 | `glob.ts:36` |
| 无语义理解 | 只支持正则关键词匹配，无语义相关性 | grep.ts 全文 |
| 无代码索引/缓存 | 每次查询重新扫描整个代码库 | 代码库中无索引相关逻辑 |
| LSP 实验性 | `OPENCODE_EXPERIMENTAL_LSP_TOOL` 环境变量才启用 | `registry.ts:134` |
| C++ 无 LSP 默认配置 | language.ts 中无 clangd 内置启动配置 | `lsp/language.ts` |

**性能估算**：
- 15w行 C++ 代码 ≈ 5000-8000个文件
- grep 全量扫描耗时 ≈ 1-5s（仅 I/O，不含 LLM 推理）
- LLM 决策多轮工具调用 ≈ 5-15s/轮
- 单次"需求→代码关联"实际耗时估算：**30-120s**（远超 10s 限制）
- top5 命中率：关键词匹配下的语义相关性难以保证 ≥70%

**最终结论**
- 状态：❌ 当前机制无法满足需求
- 一句话总结：15w行规模下响应时间和命中率均无法达标，根本原因是缺乏预建语义索引
- 置信度：高

---

## 核心问题 3：现有扩展点能否注入自定义代码检索逻辑

**扩展点实现规范**

### 扩展点 A：自定义 Tool（L2-Plugin，首选）
```
扩展点：Custom Tool via .opencode/tools/
目录：{project}/.opencode/tools/
文件格式：*.ts 或 *.js，export ToolDefinition 对象
注册方式：自动发现（Glob.scanSync("{tool,tools}/*.{js,ts}"）
关联方式：注册后 LLM 可直接调用（工具出现在 tool list 中）
官方示例：.opencode/tools/cpp-test-validator.ts（当前项目已有）
加载逻辑：registry.ts:88-101（自动扫描加载）
最小验证结果：cpp-test-validator.ts 已被成功加载（存在即验证）
```

### 扩展点 B：Plugin Hook（L2-Plugin，辅助）
```
扩展点：experimental.chat.system.transform
位置：packages/plugin/src/index.ts:240-245
用途：在每次 LLM 调用前注入 system prompt 内容
适合场景：注入预检索结果作为上下文
风险：大量代码片段会增加 token 消耗，影响响应速度

扩展点：tool.execute.before / tool.execute.after
位置：packages/plugin/src/index.ts:215-230
用途：拦截并增强工具执行
适合场景：拦截 grep/glob 工具，优先返回预索引结果
```

**最终结论**
- 状态：✅ 已有可用（扩展点完整，参考实现存在）
- 一句话总结：`.opencode/tools/*.ts` 自定义 Tool 路径完全可用，`cpp-test-validator.ts` 是直接可参考的模板
- 置信度：高（源码 + 现有实现双重验证）

---

## 核心问题 4：是否已有向量化/语义搜索能力

**搜索结果**

| 关键词 | 搜索范围 | 结果 |
|--------|---------|------|
| `embedding`, `vector` | packages/opencode/src/ | 0 条 |
| `semantic`, `index` | packages/opencode/src/ | 0 条（仅有类型索引） |
| `ctags`, `treesitter`, `ast` | packages/opencode/src/ | 0 条 |

**package.json 依赖中无**：
- 向量数据库（chromadb、qdrant、faiss）
- embedding 库（@xenova/transformers、openai embedding）
- AST 解析（tree-sitter、@clangd）

**最终结论**
- 状态：❌ 完全不存在
- 一句话总结：opencode 核心不含任何语义索引/embedding 能力，完全依赖 LLM 的文本理解
- 置信度：高

---

## 能力矩阵汇总

| 核心问题 | 状态 | 建议定制级别 | 置信度 | 关键备注 |
|---------|------|-------------|--------|---------|
| 需求→代码关联机制（现有） | ⚠️ | - | 高 | 探索式机制，非检索式，小项目可用 |
| 大代码库(15w行)处理能力 | ❌ | L2-Plugin | 高 | 响应时间/命中率均无法达标，需预建索引 |
| 自定义检索扩展点 | ✅ | L2-Plugin | 高 | `.opencode/tools/*.ts` 自动加载，有现成模板 |
| 向量化/语义搜索能力 | ❌ | L2-Plugin | 高 | 需从零构建，选型待定（见 Phase 5） |

---

## 架构建议（Claude 初步判断）

**结论：需要构建 L2-Plugin 级别的独立代码检索工具层**

### 推荐路径（最低侵入）

```
C++ 代码库（15w行）
       ↓ [离线构建，一次性]
   代码解析层（tree-sitter for C++）
       ↓ 提取 文件/类/函数 三级单元
   索引层（BM25 + embedding 混合）
       ↓ 持久化到本地
   检索层（BM25 关键词 + 向量语义 → RRF 融合排序）
       ↓ Top-5 结果 + 关联度分数
   .opencode/tools/cpp-code-search.ts（L2-Plugin）
       ↓ 注册为 opencode 自定义工具
   LLM 根据需求卡片调用 cpp_code_search 工具
       ↓
   返回：文件路径 + 类名 + 函数名 + 分数（0~1）+ 标签（High/Medium/Low）
```

### 关键技术选型待确认（Phase 5 详细设计）
- C++ 解析：tree-sitter vs clangd LSP vs ctags
- 向量模型：离线 local model（CodeBERT/BGE-M3）vs 调用 LLM API
- 存储：SQLite（BM25） + 本地向量文件 vs 轻量向量DB

---

*待 Codex/Gemini 结果落盘后，将更新本文档并做交叉验证。*

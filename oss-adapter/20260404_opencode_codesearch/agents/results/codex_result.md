<!-- AGENT_REVIEW_RESULT -->
<!-- agent: codex -->
<!-- timestamp: 2026-04-03T18:21:52Z -->
<!-- duration_seconds: 1319.98 -->
<!-- exit_code: 0 -->
<!-- session_id: 019d5480-5f03-7ae3-8274-37058a6054d7 -->

### 核心问题 1：opencode 当前如何实现“需求→代码”关联？

**源码分析**
- 文档意图：[README.md](/Users/justbin/project/opensource/opencode/README.md):100 定义 `build/plan/general` agent，[README.md](/Users/justbin/project/opensource/opencode/README.md):133 声明支持 LSP。
- 工具集合：[registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts):118 注册 `read/grep/glob/lsp/task/codesearch/skill` 等工具，[registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts):163 按 provider/model 过滤 `codesearch/apply_patch`。
- Prompt 注入：[prompt.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/prompt.ts):1485 每轮组装 `system + tools + messages`，[system.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/system.ts):34 只注入工作目录/git/date/skills，不自动注入代码树，[prompt.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/prompt.ts):1066 只有显式 file/directory parts 或 tool 输出才进入上下文。
- Agent 决策：[agent.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/agent/agent.ts):164 `explore` 子代理专门做代码检索，允许 `grep/glob/read/lsp/codesearch/task`，[task.txt](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/task.txt):18 要求并行派发多个 agent。
- 数据流：用户需求文本 -> `SessionPrompt.prompt` 组 prompt -> LLM 自主选择 `grep/glob/read/lsp/task` -> 工具结果回灌 messages -> 迭代得到相关文件/符号。结论是“模型驱动的迭代检索”，不是“预建索引的确定性需求→代码匹配”。

**运行验证**
```bash
# 验证工具边界
cd /Users/justbin/project/opensource/opencode/packages/opencode
XDG_DATA_HOME=/tmp/opencode-analysis-xdg8/data \
XDG_CONFIG_HOME=/tmp/opencode-analysis-xdg8/config \
XDG_CACHE_HOME=/tmp/opencode-analysis-xdg8/cache \
XDG_STATE_HOME=/tmp/opencode-analysis-xdg8/state \
OPENCODE_DB=/tmp/opencode-analysis8.db \
OPENCODE_CONFIG_DIR=/Users/justbin/project/opensource/opencode/.opencode \
bun --conditions=browser -e '<bootstrap 后直接执行 ReadTool/GrepTool/GlobTool>'
# 输出摘要
{"read":{"truncated":true},"grep":{"matches":17,"truncated":false},"glob":{"count":100,"truncated":true}}
```
```bash
# 验证 prompt hook
OPENCODE_CONFIG_CONTENT='{"plugin":["file:///tmp/opencode-prompt-probe.ts"],"model":"anthropic/claude-sonnet-4"}' \
bun --conditions=browser -e '<创建 session 后调用 SessionPrompt.prompt(...)>'
# 输出摘要
chat.message 成功抓到用户文本；随后因离线环境 Provider 解析失败：PROBE_ERROR "Was there a typo in the url or port?"
```
- 验证结论：部分工作。工具链与 file-part 注入已验证；完整首轮模型 prompt/工具选择因当前离线环境未能抓全，置信度中高。

**边界问题**：默认不预注入仓库代码树；相关代码完全依赖 LLM 自主调用 `grep/glob/read/lsp/task`，对“稳定 Top-5 召回 + 分数可解释”不是天然闭环。

**最终结论**
- 状态：[⚠️ 已有但有限制]
- 一句话总结：opencode 现有机制是“Prompt + 工具编排式代码检索”，不是面向 E1 JSON 的内置需求-代码索引/打分引擎。

### 核心问题 2：对大代码库（15w行 C++）的处理瓶颈在哪里？

**源码分析**
- 读取截断：[read.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/read.ts):15 默认最多 2000 行、50KB、单行 2000 字符，[read.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/read.ts):158 超限返回 continuation hint。
- 搜索截断：[grep.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/grep.ts):104 最多返回 100 条 match，[glob.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/glob.ts):36 最多返回 100 个文件。
- 上下文压缩：[overflow.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/overflow.ts):6 以模型 context 和 reserved tokens 判溢出，[compaction.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/compaction.ts):34 工具输出超过阈值后被 prune/compact。
- 缓存/索引：[file/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/file/index.ts):349 只缓存 `rg --files` 的文件/目录列表，[file/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/file/index.ts):630 用 `fuzzysort` 做文件名模糊搜；未见仓库级语义向量索引。

**运行验证**
```bash
# 同上工具验证命令
# 输出摘要
ReadTool => truncated:true
GlobTool => count:100, truncated:true
GrepTool => 17 matches in 52ms for 精确词；大范围结果会受 100 条上限约束
```
- 验证结论：正常工作，但行为是“截断后多轮追问”，不是“单次索引命中”。

**边界问题**：硬上限非常明确：Read 2000 行/50KB/单行 2000 字符，Grep 100 条，Glob 100 文件；大 C++ 仓库下宽泛需求会退化成多轮 LLM+rg 探索，响应时延和 Top-5 稳定性不可直接保证。

**最终结论**
- 状态：[⚠️ 已有但有限制]
- 一句话总结：15w 行 C++ 场景的主要瓶颈不在 `rg` 本身，而在“无预建语义索引 + 工具输出强截断 + 多轮 LLM 决策”。

### 核心问题 3：现有扩展点能否注入自定义代码检索逻辑？

**源码分析**
- 自定义 Tool 加载：[registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts):54 扫描 `{tool,tools}/*.{js,ts}`，[registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts):88 支持 default export 和 named export 工具。
- Plugin Hook：[index.ts](/Users/justbin/project/opensource/opencode/packages/plugin/src/index.ts):179 支持 `tool/chat.message/chat.params/chat.headers/tool.execute.before/tool.execute.after/experimental.chat.messages.transform/experimental.chat.system.transform/tool.definition`。
- Plugin Tool 接口：[tool.ts](/Users/justbin/project/opensource/opencode/packages/plugin/src/tool.ts):29 用 `tool({ description, args, execute })` 定义工具。
- 本地加载路径：[config.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts):343 扫描 `.opencode/plugin*`，[paths.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/paths.ts):22 汇总项目级/用户级 `.opencode` 配置目录。
- 官方文档：[tui-plugins.md](/Users/justbin/project/opensource/opencode/packages/opencode/specs/tui-plugins.md):83 说明 TUI plugin 不做目录自动发现；但 server plugin/tool 扫描由上述源码实现。

**运行验证**
```bash
cd /Users/justbin/project/opensource/opencode/packages/opencode
XDG_DATA_HOME=/tmp/opencode-analysis-xdg5/data \
XDG_CONFIG_HOME=/tmp/opencode-analysis-xdg5/config \
XDG_CACHE_HOME=/tmp/opencode-analysis-xdg5/cache \
XDG_STATE_HOME=/tmp/opencode-analysis-xdg5/state \
OPENCODE_DB=/tmp/opencode-analysis5.db \
OPENCODE_CONFIG_DIR=/Users/justbin/project/opensource/opencode/.opencode \
bun --conditions=browser -e '<bootstrap 后打印 ToolRegistry.ids()>'
# 输出摘要
["codesearch","github-pr-search","github-pr-search","github-triage","github-triage","grep","read"]
```
- 验证结论：正常工作。.opencode 自定义工具可被识别；重复项来自同一 `.opencode` 被扫描两次。另 `.opencode/tools/cpp-test-validator.ts` 未被识别，因为 [cpp-test-validator.ts](/Users/justbin/project/opensource/opencode/.opencode/tools/cpp-test-validator.ts):641 只导出普通函数/类型，没有 `tool(...)` 定义。

**边界问题**：自定义检索最适合做成 `.opencode/tool/*.ts` 或 plugin `tool` hook；但若要强制模型“先查索引再回答”，还需要配合 agent prompt/`tool.definition`/`chat.*` hook 做策略约束。重复扫描去重需自行处理。

**最终结论**
- 状态：[✅ 已有可用]
- 一句话总结：opencode 已提供足够的 Tool/Plugin/Hook 扩展点，可低侵入接入自定义代码索引与检索服务。

### 核心问题 4：是否已有向量化/语义搜索相关能力？

**源码分析**
- 本地搜索实现：[grep.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/grep.ts):42 基于 `rg` 正则检索，[file/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/file/index.ts):630 基于 `fuzzysort` 文件名模糊搜，[lsp.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/lsp.ts):11 提供定义/引用/符号/调用层级查询。
- `codesearch` 不是本地仓库向量检索：[codesearch.txt](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/codesearch.txt):1 明确面向 API/SDK/库文档与示例，[codesearch.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/codesearch.ts):64 调 Exa MCP 远端 `get_code_context_exa`。
- 依赖检查：[package.json](/Users/justbin/project/opensource/opencode/packages/opencode/package.json):68 可见 `fuzzysort/glob/@modelcontextprotocol/sdk/web-tree-sitter` 等，但未见明显向量库/embedding 索引依赖。
- MCP 边界：[index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/mcp/index.ts):215 支持接入外部 MCP tools/resources；当前 [.opencode/opencode.jsonc](/Users/justbin/project/opensource/opencode/.opencode/opencode.jsonc):13 配置为 `"mcp": {}`。

**运行验证**
```bash
cd /Users/justbin/project/opensource/opencode
rg -n "embedding|vector|semantic|index|ripgrep|fzf|ast" packages/opencode/src packages/opencode/package.json
# 输出摘要
命中主要集中在 ripgrep/fuzzysort/LSP/Copilot provider 文本；未发现 opencode core 为本地仓库构建 embedding/vector index 的实现。
```
- 验证结论：未实现本地仓库级向量语义检索；仅有词法搜索、文件名模糊搜、LSP 符号能力、以及远端 Exa `codesearch`。

**边界问题**：Copilot 相关 prompt/SDK 里出现 `semantic_search/vectorStoreIds` 字样，但这是 provider 侧能力痕迹，不等价于 opencode core 的本地代码向量索引，置信度高。

**最终结论**
- 状态：[❌ 不存在]
- 一句话总结：opencode core 当前没有可直接复用的“本地 C++ 仓库 embedding + 向量召回 + 关联度打分”能力。

## 能力矩阵汇总

| 核心问题 | 状态 | 建议定制级别 | 置信度 | 关键备注 |
|---|---|---|---|---|
| 需求→代码关联机制 | ⚠️ | L2 | 中高 | 有工具编排，无确定性索引/打分链路；完整首轮 prompt 抓取受离线环境限制 |
| 大代码库处理瓶颈 | ⚠️ | L2-L3 | 高 | Read/Grep/Glob 均有硬截断，无仓库级语义索引 |
| 自定义检索扩展点 | ✅ | L1-L2 | 高 | `.opencode/tool*` + plugin hooks 足够接入外部检索引擎 |
| 向量化/语义搜索 | ❌ | L3 | 高 | core 无本地 embedding/vector index；`codesearch` 是 Exa 远端 API |

## 架构建议（初步）

1. 最优方案：保留 opencode 作为交互与执行层，新建一个“C++ 需求-代码检索服务”，通过 `.opencode/tool/req_code_search.ts` 或 plugin tool 暴露 `E1 JSON -> TopK(path,class,func,score,label)`，再用 agent/tool prompt 约束模型先调用该工具。
2. 技术选型：离线预建混合索引更符合 Top-5≥70% 和 ≤10s 目标。建议 `clangd/tree-sitter/ctags` 抽符号与定义区间，BM25/关键词召回做高召回，embedding rerank 做语义排序，存储可选 SQLite FTS + 向量库/FAISS/Qdrant，并把 path/class/function/span/score 一次性返回。
3. 需进一步确认：在线可用模型环境下抓完整首轮 prompt 与工具选择；在 15w 行真实 C++ 仓库上测 `grep/read/lsp` 时延与召回；验证 clangd/LSP 对客户工程编译数据库质量的依赖。

## 人工审查清单

| 项 | 建议搜索关键词 | 检查路径 |
|---|---|---|
| 完整首轮 prompt/工具选择仍未抓全 | `experimental.chat.system.transform`, `chat.params`, `Provider.defaultModel` | [prompt.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/prompt.ts):1485 |
| `.opencode/skills/cpp-test-gen` 未出现在 `Skill.all()` | `cpp-test-gen`, `duplicate skill name`, frontmatter `---` | [index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/skill/index.ts):89 和 `/Users/justbin/project/opensource/opencode/.opencode/skills/cpp-test-gen/SKILL.md` |
| C++ LSP 可用性与开关 | `OPENCODE_EXPERIMENTAL_LSP_TOOL`, `clangd`, `workspaceSymbol` | [registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts):134 和 [lsp.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/lsp.ts):11 |
| 自定义工具重复扫描去重 | `OPENCODE_CONFIG_DIR`, `paths.directories`, `loadPlugin`, `ToolRegistry` | [paths.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/paths.ts):22 和 [registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts):54 |

如果你要，我下一条可以直接给出一版“面向 15w 行 C++ 的 opencode 最低侵入定制架构图 + 工具接口草案 + 数据索引表结构”。

<!-- END_AGENT_REVIEW_RESULT -->

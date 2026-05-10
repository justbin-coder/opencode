<!-- AGENT_REVIEW_RESULT -->
<!-- agent: codex -->
<!-- timestamp: 2026-03-31T03:18:28Z -->
<!-- duration_seconds: 473.40 -->
<!-- exit_code: 0 -->
<!-- session_id: 019d41df-2a40-7e90-a7aa-cc7c7b1e2d2b -->

基线说明：本次分析基于 `hd-dev` 分支、仓库内版本 `[packages/opencode/package.json](/Users/justbin/project/opensource/opencode/packages/opencode/package.json#L3)` 第 3 行为 `1.3.9`。运行验证存在统一环境阻塞：当前工作区缺少 `node_modules`，且 CLI/测试启动时会报 `preload not found "@opentui/solid/preload"`；因此 R01-R09 的“运行层”结论以“当前环境不可完成验收”为主，不等同于源码一定有 bug。

### 需求 1：自然语言需求 → 结构化需求卡片
**第一层：文档**
- 官方声明：[未提及]
- 依据：[commands.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/commands.mdx#L3) 第 3 行仅声明“为重复任务创建自定义命令”；公开文档未声明“需求卡片/需求编号/验收标准/时序图”专项能力。
- 版本/状态：v1.3.9；`未提及`

**第二层：源码**
- 实现状态：[部分]
- 依据：[prompt.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/prompt.ts#L1455) 第 1455 行在 `json_schema` 场景下注入 `StructuredOutput` 工具；[prompt.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/prompt.ts#L1865) 第 1865 行定义通用结构化输出工具；[message-v2.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/message-v2.ts#L72) 第 72 行定义 `json_schema` 输出格式。
- 判断：存在“通用结构化输出底座”，不存在“需求卡片”领域模板、字段标准、准确率控制和 30s SLA 实现。

**第三层：运行验证**
```bash
# 执行的命令
cd /Users/justbin/project/opensource/opencode/packages/opencode
bun test test/session/structured-output.test.ts
# 输出
bun test v1.3.11 (af24e281)
error: preload not found "@opentui/solid/preload"
```
- 验证结论：[不可用]

**边界问题**
- 问题1：结构化输出是通用 JSON Schema 机制，不是固定“需求卡片”产品能力。建议修复：增加专用 schema、系统提示词模板、字段校验与质量评估。
- 问题2：当前环境无法跑结构化输出测试。建议修复：先补齐依赖，再做真实 prompt 验证。

**最终结论**
- 状态：[⚠️ 已有但需修复]
- 一句话总结：有通用 structured output 底座，但没有现成“自然语言需求卡片化”能力。

### 需求 2：需求批量处理
**第一层：文档**
- 官方声明：[未提及]
- 依据：[commands.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/commands.mdx#L45) 第 45 行只说明可通过配置或 Markdown 文件添加自定义命令，未声明“5～10 条需求批处理”。
- 版本/状态：v1.3.9；`未提及`

**第二层：源码**
- 实现状态：[部分]
- 依据：[structured-output-integration.test.ts](/Users/justbin/project/opensource/opencode/packages/opencode/test/session/structured-output-integration.test.ts#L86) 第 86 行开始验证嵌套对象/数组结构化输出；[prompt.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/prompt.ts#L1505) 第 1505 行在结构化输出场景强制 `toolChoice: "required"`。
- 判断：能承载“数组型结构化输出”，但没有“批量需求拆分、逐条卡片输出、总量 5～10、耗时约束”的专项实现。

**第三层：运行验证**
```bash
# 执行的命令
cd /Users/justbin/project/opensource/opencode/packages/opencode
bun test test/session/structured-output-integration.test.ts
# 输出
bun test v1.3.11 (af24e281)
error: preload not found "@opentui/solid/preload"
```
- 验证结论：[不可用]

**边界问题**
- 问题1：源码只能证明“支持结构化数组输出”，不能证明“批量需求卡片化”正确率与性能。建议修复：补批处理 schema、分条失败重试、超时控制。

**最终结论**
- 状态：[⚠️ 已有但需修复]
- 一句话总结：平台能做批量结构化输出，但没有需求批处理产品化实现与性能证明。

### 需求 3：需求输入格式支持（Markdown）
**第一层：文档**
- 官方声明：[部分支持]
- 依据：[commands.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/commands.mdx#L18) 第 18 行声明在 `commands/` 中创建 Markdown 文件定义命令；[commands.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/commands.mdx#L200) 第 200 行声明可用 `@文件名` 将文件内容注入 prompt；[config.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/config.mdx#L56) 第 56 行说明支持 `commands/` 等目录。
- 版本/状态：v1.3.9；通用能力 `stable`，非需求处理专项

**第二层：源码**
- 实现状态：[完整]
- 依据：[config.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L230) 第 230 行扫描 `{command,commands}/**/*.md`；[config.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L256) 第 256 行将 Markdown 内容写入 `template`；[markdown.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/markdown.ts#L71) 第 71 行实现 Markdown/frontmatter 解析；[config.test.ts](/Users/justbin/project/opensource/opencode/packages/opencode/test/config/config.test.ts#L655) 第 655 行覆盖 `.opencode/commands` 加载测试；[markdown.test.ts](/Users/justbin/project/opensource/opencode/packages/opencode/test/config/markdown.test.ts#L93) 第 93 行覆盖 frontmatter 解析测试。
- 判断：Markdown 作为命令模板和文件内容输入是完整实现；但“Markdown 需求文档 → 需求卡片”流程本身未内建。

**第三层：运行验证**
```bash
# 执行的命令
cd /Users/justbin/project/opensource/opencode/packages/opencode
bun test test/config/markdown.test.ts
# 输出
bun test v1.3.11 (af24e281)
error: preload not found "@opentui/solid/preload"
```
- 验证结论：[部分工作]

**边界问题**
- 问题1：文档站主文档使用复数 `commands/`，而 TUI tip 里仍写过单数目录。建议修复：统一文案，避免误导。
- 问题2：支持 Markdown 输入，不等于支持 Markdown 需求抽取。建议修复：补一个专用命令或插件工作流。

**最终结论**
- 状态：[⚠️ 已有但需修复]
- 一句话总结：Markdown 读入能力是现成的，但需求文档解析流程仍需定制。

### 需求 4：C++ 单元测试自动生成
**第一层：文档**
- 官方声明：[部分支持]
- 依据：[lsp.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/lsp.mdx#L18) 第 18 行声明 `clangd` 支持 C/C++；[tools.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/tools.mdx#L48) 第 48 行声明有 `bash` 工具；公开文档未声明 gtest/CppUnit 自动生成器。
- 版本/状态：v1.3.9；通用 C/C++ 能力 `stable`，测试生成专项 `未提及`

**第二层：源码**
- 实现状态：[部分]
- 依据：[lsp/server.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/lsp/server.ts#L898) 第 898 行定义 `Clangd`，第 900 行识别 `CMakeLists.txt`；[tool/registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts#L118) 第 118 行开始注册 `BashTool/ReadTool/EditTool/WriteTool` 等通用工具。
- 补充检索：`rg -n "gtest|CppUnit|cppunit" packages/opencode/src packages/opencode/test packages/plugin packages/sdk/js/src` 无命中。
- 判断：具备“读源码、改文件、跑命令、C++ LSP”底座；不存在 gtest/CppUnit 自动生成专项实现。

**第三层：运行验证**
```bash
# 执行的命令
rg -n "gtest|CppUnit|cppunit" packages/opencode/src packages/opencode/test packages/plugin packages/sdk/js/src --glob '!**/dist/**'
# 输出
# （无输出，退出码 1）
```
- 验证结论：[部分工作]

**边界问题**
- 问题1：没有 gtest/CppUnit 模板库、覆盖率策略、异常路径生成规则。建议修复：增加专用命令/插件和测试风格模板。
- 问题2：无法证明“单函数 ≤ 2min、分支覆盖 ≥ 70%”。建议修复：引入编译/覆盖率闭环。

**最终结论**
- 状态：[⚠️ 已有但需修复]
- 一句话总结：平台能支撑 C++ 测试生成定制，但仓库里没有现成自动测试生成器。

### 需求 5：测试框架配置化（CppUnit / gtest）
**第一层：文档**
- 官方声明：[未提及]
- 依据：公开文档只描述通用 `command`/`tool`/`provider`/`agent` 配置，如 [config.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/config.mdx#L214) 第 214 行开始的 `tools` 配置；未声明测试框架选择配置项。
- 版本/状态：v1.3.9；`未提及`

**第二层：源码**
- 实现状态：[不存在]
- 依据：[config.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L885) 第 885 行开始定义全局配置 schema，覆盖 `server/command/agent/provider/mcp/formatter/tools` 等，但没有与测试生成器或测试框架选择相关字段。
- 补充检索：`rg -n "gtest|CppUnit|cppunit" ...` 无命中。

**第三层：运行验证**
```bash
# 执行的命令
rg -n "gtest|CppUnit|cppunit" packages/opencode/src packages/opencode/test packages/plugin packages/sdk/js/src --glob '!**/dist/**'
# 输出
# （无输出，退出码 1）
```
- 验证结论：[不可用]

**最终结论**
- 状态：[❌ 不存在需新建]
- 一句话总结：没有“测试框架选择”配置模型，需要新建专用配置和执行逻辑。

### 需求 6：增量测试生成（末尾追加，不覆盖）
**第一层：文档**
- 官方声明：[未提及]
- 依据：公开文档说明有通用编辑能力，如 [tools.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/tools.mdx#L65) 第 65 行 `edit`、[tools.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/tools.mdx#L194) 第 194 行 `apply_patch`；未声明“测试增量追加模式”。
- 版本/状态：v1.3.9；`未提及`

**第二层：源码**
- 实现状态：[部分]
- 依据：[edit.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/edit.ts#L37) 第 37 行定义 `edit` 工具，支持按 `oldString/newString` 精确替换；[tool/registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts#L133) 第 133 行注册 `ApplyPatchTool`。
- 补充检索：`rg -n "append.*test|incremental test|覆盖已有" ...` 无命中。
- 判断：通用编辑能力足够实现“追加”，但没有“测试增量生成策略”。

**第三层：运行验证**
```bash
# 执行的命令
rg -n "append.*test|末尾追加|覆盖已有|incremental test" packages/opencode/src packages/opencode/test packages/plugin packages/sdk/js/src --glob '!**/dist/**'
# 输出
# （无输出，退出码 1）
```
- 验证结论：[部分工作]

**最终结论**
- 状态：[❌ 不存在需新建]
- 一句话总结：有底层编辑工具，但没有“只追加新用例、不覆盖旧内容”的专项能力。

### 需求 7：测试样板学习
**第一层：文档**
- 官方声明：[未提及]
- 依据：公开文档仅说明可读取文件/编写自定义命令，没有“学习既有测试样板并对齐编码风格”的专项声明。
- 版本/状态：v1.3.9；`未提及`

**第二层：源码**
- 实现状态：[部分]
- 依据：[read.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/read.ts#L21) 第 21 行定义 `read` 工具；[grep.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/grep.ts) 存在全仓检索能力；但 repo 未找到与“样板学习/风格继承”有关的专用实现。
- 补充检索：`rg -n "learn.*style|style.*test|sample learning|样板学习" ...` 无命中。

**第三层：运行验证**
```bash
# 执行的命令
rg -n "learn.*style|style.*test|sample learning|样板学习" packages/opencode/src packages/opencode/test packages/plugin packages/sdk/js/src --glob '!**/dist/**'
# 输出
# （无输出，退出码 1）
```
- 验证结论：[部分工作]

**最终结论**
- 状态：[❌ 不存在需新建]
- 一句话总结：可以读已有测试文件，但没有“显式学习样板并复用”的流程或参数。

### 需求 8：自动编译验证（CMake）
**第一层：文档**
- 官方声明：[部分支持]
- 依据：[tools.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/tools.mdx#L48) 第 48 行声明 `bash` 可执行 shell 命令；[commands.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/commands.mdx#L166) 第 166 行支持把 shell 输出注入 prompt；但文档未声明“生成测试后自动调用 cmake 并解析错误”专项流程。
- 版本/状态：v1.3.9；通用命令执行 `stable`，自动编译验证 `未提及`

**第二层：源码**
- 实现状态：[部分]
- 依据：[tool/registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts#L121) 第 121 行注册 `BashTool`；[lsp/server.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/lsp/server.ts#L900) 第 900 行把 `CMakeLists.txt` 作为 `clangd` 根检测条件。
- 补充检索：`rg -n "CMakeLists|cmake" ...` 仅命中权限词典和 clangd 根检测，没有自动编译工作流实现。

**第三层：运行验证**
```bash
# 执行的命令
rg -n "CMakeLists|cmake" packages/opencode/src packages/opencode/test packages/plugin packages/sdk/js/src --glob '!**/dist/**'
# 输出
packages/opencode/src/permission/arity.ts:63:    cmake: 2, // cmake build
packages/opencode/src/lsp/server.ts:900:    root: NearestRoot(["compile_commands.json", "compile_flags.txt", ".clangd", "CMakeLists.txt", "Makefile"]),
```
- 验证结论：[部分工作]

**最终结论**
- 状态：[❌ 不存在需新建]
- 一句话总结：能跑 `cmake`，也能识别 CMake 项目，但没有“生成后自动编译校验并解析错误”的现成闭环。

### 需求 9：编译错误自动修复（≤ 3 轮）
**第一层：文档**
- 官方声明：[未提及]
- 依据：[agents.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/agents.mdx#L287) 第 287 行开始只有通用 `steps` 限制；未声明“仅修复生成测试代码的编译错误、最多 3 轮”。
- 版本/状态：v1.3.9；`未提及`

**第二层：源码**
- 实现状态：[部分]
- 依据：[agent.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/agent/agent.ts#L47) 第 47 行 agent 支持 `steps`；[prompt.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/prompt.ts#L1413) 第 1413 行在循环中读取 `maxSteps`；但没有“编译错误解析器/重编译回路/3轮上限/仅改单测文件”专用逻辑。
- 补充检索：`rg -n "compile error|retry compile|autofix compile" ...` 仅命中通用提示词，没有实现代码。

**第三层：运行验证**
```bash
# 执行的命令
rg -n "compile error|编译错误|recompile|retry compile|autofix compile" packages/opencode/src packages/opencode/test packages/plugin packages/sdk/js/src --glob '!**/dist/**'
# 输出
packages/opencode/src/session/prompt/gemini.txt:34:5. **Verify:** ... build the application and ensure there are no compile errors.
```
- 验证结论：[部分工作]

**最终结论**
- 状态：[❌ 不存在需新建]
- 一句话总结：只有通用 agent 迭代上限，没有“编译失败→修复→重编译≤3轮”的专用工作流。

## 能力矩阵汇总

| 需求 | 状态 | 置信度 | 关键备注 |
|------|------|--------|---------|
| R01 自然语言→需求卡片 | ⚠️ | 高 | 有通用 `json_schema` structured output，但无需求卡片模板/SLA |
| R02 需求批量处理 | ⚠️ | 中 | 结构化数组输出底座存在，但无批处理实现与性能证明 |
| R03 Markdown 输入 | ⚠️ | 高 | Markdown 命令与文件注入完整，需求解析流程需编排 |
| R04 C++ 单测生成 | ⚠️ | 高 | 有 C/C++ LSP + bash/edit/read 底座，无 gtest/CppUnit 生成器 |
| R05 测试框架配置化 | ❌ | 高 | 配置 schema 中无测试框架选择项 |
| R06 增量测试追加 | ❌ | 高 | 只有通用编辑工具，无“只追加”专项模式 |
| R07 测试样板学习 | ❌ | 中 | 可读现有文件，但无样板学习/风格继承实现 |
| R08 自动 cmake 编译验证 | ❌ | 高 | 能执行 shell，但无生成后自动编译闭环 |
| R09 编译错误自动修复≤3轮 | ❌ | 高 | 只有通用 `steps` 限制，无 compile-fix-retry 流程 |

## 平台底座观察
- `command` 系统是完整的：文档声明 Markdown 命令；源码会扫描 `.opencode/commands/*.md` 并解析 frontmatter，[commands.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/commands.mdx#L18)、[config.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L230)、[command/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/command/index.ts#L106)。
- `tool` 系统是完整的：内置工具 + `.opencode/tools/*.ts` + plugin tool + MCP tool 并存，[custom-tools.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/custom-tools.mdx#L18)、[tool/registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts#L88)、[tool/registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts#L103)。
- `provider` 集成是完整的：官方文档宣称 75+ provider；源码内置大量 AI SDK provider 映射，[providers.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/providers.mdx#L9)、[provider.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/provider/provider.ts#L117)。
- `prompt/plugin` 机制是完整的：SessionPrompt 统一装配 system/env/instructions/tools，插件可 hook `tool.definition`、`chat.message` 等，[prompt.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/prompt.ts#L1485)、[plugin/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/plugin/index.ts#L268)、[plugins.mdx](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/plugins.mdx#L199)。

## 人工审查清单

### 待人工确认：R05 测试框架配置化
- Agent 结论：不支持
- 建议搜索关键词：`gtest`, `CppUnit`, `test framework`
- 建议检查路径：`/Users/justbin/project/opensource/opencode/packages/opencode/src/config`, `/Users/justbin/project/opensource/opencode/packages/opencode/src/command`, `/Users/justbin/project/opensource/opencode/packages/opencode/src/plugin`
- 原因说明：源码和配置 schema 未见相关字段，但若客户接受“通过自定义命令/插件间接实现”，仍可定制。

### 待人工确认：R06 增量测试生成
- Agent 结论：不支持
- 建议搜索关键词：`incremental test`, `append`, `apply_patch`
- 建议检查路径：`/Users/justbin/project/opensource/opencode/packages/opencode/src/tool`, `/Users/justbin/project/opensource/opencode/packages/opencode/src/session`
- 原因说明：底层编辑工具足够，但未见面向测试生成的模式约束。

### 待人工确认：R07 测试样板学习
- Agent 结论：不支持
- 建议搜索关键词：`style learning`, `template`, `sample`
- 建议检查路径：`/Users/justbin/project/opensource/opencode/packages/opencode/src/tool`, `/Users/justbin/project/opensource/opencode/packages/opencode/src/session/prompt`
- 原因说明：可读取样板文件，但未见专门的“学习并对齐风格”实现。

### 待人工确认：R08 自动编译验证
- Agent 结论：不支持
- 建议搜索关键词：`cmake`, `compile`, `build verification`
- 建议检查路径：`/Users/justbin/project/opensource/opencode/packages/opencode/src/tool`, `/Users/justbin/project/opensource/opencode/packages/opencode/src/command`, `/Users/justbin/project/opensource/opencode/packages/opencode/src/session`
- 原因说明：有 shell/tool 底座，但未见“生成后自动编译”工作流。

### 待人工确认：R09 编译错误自动修复≤3轮
- Agent 结论：不支持
- 建议搜索关键词：`retry`, `compile error`, `steps`
- 建议检查路径：`/Users/justbin/project/opensource/opencode/packages/opencode/src/session`, `/Users/justbin/project/opensource/opencode/packages/opencode/src/agent`
- 原因说明：有通用 agent 循环和 `steps` 上限，但未见编译错误专项回路与 3 轮约束。

<!-- END_AGENT_REVIEW_RESULT -->

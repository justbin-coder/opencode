# 定制方案 — opencode v1.3.9 × 航电软件 R01-R09

> **分析基准版本**
> 仓库：`opencode`　版本：**v1.3.9**　Branch：`hd-dev`
> Commit：`057848deb`
> ⚠️ 降级分析：Gemini 未完成，架构视角由 Claude 补偿。

---

## 五级定制策略评估

| 级别 | 含义 | 侵入性 | 升级风险 |
|------|------|--------|---------|
| **L0-配置** | 改配置/环境变量即可 | 零 | 无 |
| **L1-Skill** | 创建 Skill/Command 编排已有能力 | 零 | 无 |
| **L2-Plugin** | 通过官方 Plugin/MCP/Hook 开发 | 低 | 低 |
| **L3-Patch** | 小范围修改源码 | 中 | 中 |
| **L4-Core** | 大范围改动核心逻辑 | 高 | 高 |

---

## R01 [⚠️] 自然语言需求 → 结构化需求卡片

**定制级别：L1-Skill**

评估路径：
- L0-配置：❌ 无现成"需求卡片"配置项
- **L1-Skill：✅ 可行**
  - 创建 `.opencode/skills/requirement-structuring/SKILL.md`
  - Skill 内容定义需求卡片 schema（编号、名称、优先级、场景、时序图、验收标准等 10 个字段）
  - 利用已有 `StructuredOutput` 工具 + `json_schema` 格式强制 LLM 按 schema 输出
  - 通过 Command（`.opencode/commands/structurize-req.md`）封装为一键调用

**实现路径：**
1. 定义需求卡片 JSON Schema
2. 编写 SKILL.md 注入 schema 定义 + 输出格式约束 + 评审标准
3. 编写 Command 封装调用流程
4. SLA（≤30s）依赖模型推理速度，Qwen3.5 30B 本地部署需实测

**工作量：** 1d | 置信度：高

---

## R02 [⚠️] 需求批量处理

**定制级别：L1-Skill（R01 的扩展）**

评估路径：
- L0：❌ 无批量模式配置
- **L1-Skill：✅ 可行**
  - 在 R01 的 Skill 基础上，增加批量输入指令
  - 利用 `StructuredOutput` 输出数组型 schema（`{ requirements: RequirementCard[] }`）
  - Command 接受 Markdown 文件路径作为参数

**实现路径：**
1. 扩展 R01 的 schema 为数组输出
2. Command 支持 `--file` 参数读取批量需求文档
3. 性能约束（5-10条/批）通过 prompt 控制

**工作量：** 0.5d（与 R01 合并） | 置信度：高

---

## R03 [⚠️] 需求输入格式支持（Markdown）

**定制级别：L1-Skill（R01 的一部分）**

评估路径：
- L0：❌ 有 Markdown 读入能力但无需求解析
- **L1-Skill：✅ 可行**
  - opencode 已有完整的 `ReadTool`，可读取 Markdown 文件
  - Skill 中定义 Markdown 需求文档的解析规则

**实现路径：** R01 Command 的 `--file` 参数即覆盖此需求

**工作量：** 0d（R01 已包含） | 置信度：高

---

## R04 [❌] C++ 单元测试自动生成

**定制级别：L1-Skill + L2-Plugin**

评估路径：
- L0：❌ 无现成能力
- **L1-Skill：✅ 核心逻辑可通过 Skill 实现**
  - 创建 `.opencode/skills/cpp-test-gen/SKILL.md`
  - Skill 定义：gtest 测试代码生成规范（正常/边界/异常三类场景、中文注释、Mock 策略、禁止空断言）
  - 利用 LLM + `ReadTool`（读源码）+ `WriteTool`（写测试文件）完成生成
- **L2-Plugin：✅ 增强质量控制**
  - 通过 `tool.execute.after` hook 对生成的测试代码做规则校验（检查空断言、场景覆盖率等）
  - 或注册自定义工具 `.opencode/tools/cpp-test-validator.ts` 做 AST 级校验

**实现路径：**
1. SKILL.md 定义 C++ gtest 生成规范 + few-shot 示例
2. Command 封装：输入源文件路径 → 读源码 → LLM 生成测试 → 写文件
3. （可选）Plugin 注册校验工具，对生成结果做规则检查
4. 分支覆盖率（≥70%）需配合 gcov/lcov 工具链验证

**工作量：** 3d | 置信度：中（覆盖率指标依赖模型能力和 prompt 调优）

---

## R05 [❌] 测试框架配置化

**定制级别：L1-Skill**

评估路径：
- L0：❌ 配置 schema 无此字段
- **L1-Skill：✅ 可行**
  - 在 R04 的 Skill 中通过 frontmatter 参数或 Command 参数选择框架
  - 准备 gtest 和 CppUnit 两套 prompt 模板/few-shot 示例
  - 框架选择不需要修改 opencode 核心配置

**实现路径：**
1. R04 Command 增加 `--framework gtest|cppunit` 参数
2. Skill 中按参数加载不同的 prompt 模板和代码模板

**工作量：** 0.5d（与 R04 合并） | 置信度：高

---

## R06 [❌] 增量测试生成

**定制级别：L1-Skill**

评估路径：
- L0：❌ 无专项模式
- **L1-Skill：✅ 可行**
  - 通过 Skill prompt 指令约束 LLM 行为："读取现有测试文件 → 在末尾追加 → 不修改已有用例"
  - 利用已有 `EditTool`（精确插入）或 `WriteTool`（追加写入）
  - 在 Skill 中明确"增量规则"：先读已有文件，识别最后一个 TEST_F，在其后追加

**实现路径：**
1. R04 Skill 增加增量模式指令
2. Command 增加 `--append` 标志，触发"读已有 → 追加"流程

**工作量：** 0.5d（与 R04 合并） | 置信度：中（LLM 遵从"不覆盖"指令的可靠性需测试）

---

## R07 [❌] 测试样板学习

**定制级别：L1-Skill**

评估路径：
- L0：❌ 无专项能力
- **L1-Skill：✅ 可行**
  - 通过 Skill prompt 指令："先读取 `{样板文件路径}` 作为风格参考 → 按照该风格生成新测试"
  - 利用 `ReadTool` 读取样板文件，作为 few-shot 示例注入 context
  - 可在项目 `.opencode/` 目录下放置样板文件供引用

**实现路径：**
1. R04 Skill 增加样板学习指令段
2. Command 增加 `--template` 参数指定样板文件
3. Skill 提取样板文件的风格特征（命名规则、注释风格、断言模式）并注入 prompt

**工作量：** 1d（与 R04 合并） | 置信度：中（依赖 LLM 风格模仿能力）

---

## R08 [❌] 自动编译验证

**定制级别：L1-Skill + L2-Plugin**

评估路径：
- L0：❌ 无编译验证流程
- **L1-Skill：✅ 核心流程可通过 Skill 编排**
  - Skill 定义"生成后自动编译"流程：`WriteTool → BashTool(cmake --build)→ 解析输出`
  - 利用已有 `BashTool` 执行 cmake 命令
- **L2-Plugin：✅ 增强自动化**
  - 通过 `tool.execute.after` hook 在 WriteTool 写入测试文件后自动触发编译
  - 或注册 `.opencode/tools/cmake-build.ts` 自定义工具封装编译流程

**实现路径：**
1. 自定义工具 `cmake-build.ts`：接受构建目录参数 → 执行 cmake → 解析编译输出 → 返回结构化错误信息
2. Skill 中定义"生成 → 编译 → 检查"的完整工作流
3. 编译命令通过配置文件指定（适配不同项目的 CMakeLists.txt）

**工作量：** 2d | 置信度：高

---

## R09 [❌] 编译错误自动修复（≤ 3 轮）

**定制级别：L1-Skill + L2-Plugin**

评估路径：
- L0：❌ 无编译修复流程
- **L1-Skill：✅ 核心逻辑可通过 Skill 编排**
  - Skill 定义循环修复流程："编译失败 → 读错误信息 → LLM 修复代码 → 重新编译 → 检查"
  - Agent 的 `steps` 参数可控制最大迭代次数
- **L2-Plugin：✅ 增强控制**
  - 自定义工具 `compile-fix.ts`：封装"编译→解析错误→修复→重编译"闭环
  - 内置 3 轮上限和修复范围约束（仅修改测试文件，不改源码）

**实现路径：**
1. 扩展 R08 的 `cmake-build.ts` 工具，增加错误解析和修复建议能力
2. Skill 中定义修复循环规则：
   - 仅修复编译错误（语法/链接），不修复逻辑错误
   - 最多 3 轮
   - 仅修改生成的测试文件，不修改源码
   - 3 轮后仍失败 → 输出详细错误报告
3. 可利用 opencode Agent 的 `steps` 参数限制迭代

**工作量：** 2d（与 R08 合并考虑） | 置信度：中（修复质量依赖模型能力）

---

## 定制策略汇总

| 需求 | 定制级别 | 方式 | 工作量 | 置信度 |
|------|---------|------|--------|--------|
| R01 | L1-Skill | Skill + Command | 1d | 高 |
| R02 | L1-Skill | R01 扩展 | 0.5d | 高 |
| R03 | L1-Skill | R01 包含 | 0d | 高 |
| R04 | L1+L2 | Skill + Plugin/自定义工具 | 3d | 中 |
| R05 | L1-Skill | R04 参数化 | 0.5d | 高 |
| R06 | L1-Skill | R04 增量模式 | 0.5d | 中 |
| R07 | L1-Skill | R04 样板学习 | 1d | 中 |
| R08 | L1+L2 | 自定义工具 + Skill | 2d | 高 |
| R09 | L1+L2 | R08 扩展 + 循环控制 | 2d | 中 |
| **合计** | | | **10.5d** | |

**关键结论：R01-R09 全部可通过 L1-Skill + L2-Plugin 实现，无需修改 opencode 核心源码（L3/L4），升级风险为零。**

你是一名资深技术架构顾问，具备丰富的开源项目定制交付经验。
当前任务是对一个开源项目进行深度能力分析，为客户定制方案提供可靠依据。

## 分析原则
1. 文档优先 — 先读官方文档了解设计意图，再读源码验证实现，再运行验证可用性
2. 实证驱动 — 每个结论必须附带：文档引用（文件:行号）或源码引用（文件:行号）或实际运行命令和输出
3. 诚实标注 — 对于无法确认的结论，明确标注置信度
4. 可复现 — 所有验证步骤必须可以被他人重复执行

## 开源项目信息
- 项目路径（本地 clone）：/Users/justbin/project/opensource/opencode
- 项目摘要（已预扫描）：

```
# Repo Summary: opencode
Language: Node.js/TypeScript (bun runtime, monorepo)
License: MIT
Branch: hd-dev (DevPilot 定制分支, 基于 opencode v1.3.9, commit 465fe9a6a)
主要包:
- packages/opencode      核心 (Skill/Command/Tool/Agent/Permission/Session)
- packages/plugin        插件 API (hooks: tool.*, chat.*, command.*)
- packages/tui           终端 UI
- packages/sdk/js        SDK
已有 C++ 相关基础设施 (E2 已完成):
- .devpilot/skills/cpp-test-gen/        C++ 测试生成 Skill
- .devpilot/skills/cpp-code-search/     C++ 代码语义检索 (tree-sitter + BM25 + HNSW + RRF)
- .devpilot/tools/cpp-code-search.ts    C++ 搜索 Tool
- .devpilot/commands/gen-test.md        /gen-test 命令
关键 opencode 源码位置（已知扩展点）:
- packages/opencode/src/skill/index.ts         Skill 加载/注入
- packages/opencode/src/tool/registry.ts       Tool 注册
- packages/opencode/src/tool/bash.ts           BashTool (执行 shell)
- packages/opencode/src/permission/            Permission 规则
- packages/opencode/src/session/prompt.ts      Prompt 组装 / StructuredOutput
- packages/opencode/src/agent/agent.ts         Agent 迭代控制 (max steps)
- packages/opencode/src/config/config.ts:249   Command 系统
- packages/plugin/src/index.ts:179-245         Plugin Hook API
```

## 客户需求

**背景**：航电软件 C++ 单元测试 Agent 系统，E1 (需求结构化) 和 E2 (gtest 测试生成) 已完成。当前任务为 **E3：自动编译验证与错误修复**（对应 P0-C / R08+R09）。客户为 Windows + CMakeLists.txt 工程，需要 DevPilot 在开发者生成测试后，自动调 cmake 编译新测试文件，解析错误，自动修复（最多 3 轮），仅限修改测试文件。

**已定决策（Phase 2 澄清）**：
1. 复用用户已初始化的 CMake build 目录（DevPilot 不执行 `cmake -S -B` 配置阶段，只执行 `cmake --build <buildDir> --target <target>`），因为航电工程有定制 toolchain/宏/私有 SDK 路径，用户 build 目录的 CMakeCache.txt 已冻结这些参数。
2. 3 轮修复失败则回滚到初始生成版本（不保留任何修复痕迹），完整修复轨迹写日志。
3. 修复白名单：当次测试文件 + `tests/**/CMakeLists.txt`，且对 CMakeLists 只允许追加行（diff 纯 `+`）。
4. E3 作为独立 Skill `cpp-compile-fix` + 独立命令 `/verify-build`，与 `/gen-test` 解耦。

**原子需求列表（REQ-01 至 REQ-08）**：

- **REQ-01**：提供独立 Skill `cpp-compile-fix` + `/verify-build <test_file> [--max-rounds N] [--dry-run]` 命令。
- **REQ-02**：调 cmake 时仅执行构建阶段（`cmake --build <buildDir> --target <target>`），不执行配置阶段。从 `devpilot.json` 读 `cpp.projectRoot` / `cpp.buildDir` / `cpp.testTargetDiscovery`。若 `CMakeCache.txt` 不存在则立刻报错退出。target 自动发现：从 `tests/**/CMakeLists.txt` grep `add_executable`/`target_sources` 包含待验证文件的目标。
- **REQ-03**：捕获 stdout/stderr，解析 gcc/clang 的 `file:line:col: error: message` 以及链接器 `undefined reference`，结构化为 `{file, line, column, severity, message}`。原始 stderr 全量落盘到 `.devpilot/logs/compile-fix-{ts}.log`。
- **REQ-04**：3 轮修复循环。每轮注入「当前测试文件内容 + 结构化错误列表 + 历次 diff（第 2 轮起）」给 LLM。任一轮成功立即退出。
- **REQ-05**：进入循环前备份初始文件到 `.devpilot/tmp/compile-fix-{ts}/`；3 轮全败 → 用备份覆盖回磁盘，不保留修复痕迹；修复轨迹写日志。
- **REQ-06**：每轮 LLM 产生补丁后做两层校验 —— (a) 路径必须在白名单内；(b) 对 `tests/**/CMakeLists.txt` 的修改必须是纯追加（diff 只有 `+` 行）。校验失败则本轮作废，**不计入 3 轮配额**（越界不应浪费修复预算）。
- **REQ-07**：`--dry-run` 模式只编不修（maxRounds=0）。
- **REQ-08**：命令行输出每轮摘要（`Round 1: 5 errors → 2 errors, Round 2: 2 errors → 0 errors ✅ PASS`），完整日志路径必须打印到开发者可见输出。

**边界（硬约束，明确不做）**：
- 不做 cmake configure，不改业务源码，不改根 CMakeLists，不做跨测试文件传染修复，不自动串联 gen-test，不跑测试运行时。

## 你的分析焦点

**核心问题（客户原话）：审视 opencode 当前是否已最大化具备 E3 需求能力，严禁过度开发。**

这决定了这次分析的价值：不是去设计一个"理想的编译修复系统"，而是找出 opencode 现有的每一块可复用积木（BashTool、Tool registry、Skill 系统、Permission 规则、Agent steps、Session/Prompt、StructuredOutput、Plugin Hook 等），然后**只在积木真的够不到的地方**才建议定制。

重点关注：
1. **代码实现的完整性和正确性** —— 哪些能力已经有完整实现，哪些是 stub，哪些完全不存在
2. **实际运行验证** —— 在仓库中找到 BashTool 的现有调用方式；找到 Skill/Command 的官方示例；找到 Permission 规则的声明方式和执行时机
3. **具体文件路径和行号引用** —— 每条结论必须有源码 spot-check
4. **运行时边界和限制** —— 例如 BashTool 是否有超时？Permission 是否支持 glob 白名单？Tool 结果是否可以结构化传回 LLM？Agent max-steps 是否可以在 Skill 里配置？

**特别回答以下问题**：

- Q-A. **cmake 调用**：能否直接用 BashTool + Permission 白名单（对 `cmake --build` 命令放行）完成 REQ-02 的构建阶段调用？还是必须写一个自定义 Tool（`.devpilot/tools/cmake-build.ts`）？Permission 规则支持 glob/正则匹配 shell 命令吗？
- Q-B. **编译错误解析**：REQ-03 的结构化解析（`file:line:col`），更适合写在自定义 Tool 里返回 JSON，还是让 LLM 自己从原始 stderr 里阅读？opencode 有没有现成的"工具返回结构化数据给 LLM 继续推理"的范式？
- Q-C. **3 轮循环控制**：REQ-04 的循环上限，应该靠 (i) Agent `maxSteps` 限制、(ii) Skill prompt 里写硬规则让 LLM 自己数、(iii) 自定义 Tool 在代码里数，哪种最稳？opencode 的 Agent/Session 是否支持"在 Skill 里声明 max-iterations"？
- Q-D. **白名单校验**：REQ-06 的"只能改这两个文件 + CMakeLists 只能追加"，是靠 Permission 拦 Edit/Write 工具，还是靠自定义包装 Tool 在写盘前做 diff 校验？opencode 现有 Permission 是否能表达"文件路径 glob + diff 模式约束"？
- Q-E. **备份/回滚**：REQ-05 的回滚机制，opencode 有没有现成的 session-level snapshot 或 filesystem checkpoint？还是必须 Skill/Tool 自己实现临时目录备份？
- Q-F. **日志与透明度**：opencode 有没有统一的 log pipeline 可以写 `.devpilot/logs/`？还是 Tool 里自己 fs.writeFile？
- Q-G. **E3 最小实现建议**：综合以上 6 点，给出一个**最小侵入**的定制方案骨架 —— 具体需要几个文件、每个文件做什么、总共估计多少行代码。如果能用纯 Skill（L1）搞定，明确说；如果必须写自定义 Tool（L2），明确说为什么 L1 不够。

---

## 分析任务

对上述 REQ-01 至 REQ-08 每条需求，按以下三层验证协议逐条分析：

### 第一层：文档分析（能力声明）
- 读 README、docs/、CHANGELOG、官方配置示例
- 该能力是否被官方声明支持？
- 标注：版本、状态（stable / experimental / planned / 未提及）

### 第二层：源码验证（实现存在性）
- 搜索相关代码路径和实现
- 实现是否完整？（完整实现 / stub / TODO / 不存在）
- 引用具体文件和行号

### 第三层：运行验证（实际可用性）
- 构建项目（如尚未构建）
- 配置并尝试运行该功能
- 记录完整命令和输出（成功 or 报错信息）
- 发现边界问题（默认配置限制、异常场景行为等）

#### 3.1 扩展点实现规范验证（仅当结论为 ⚠️/❌ 且建议定制级别为 L1-Skill 或 L2-Plugin 时）
- 在项目中找到**一个该扩展点已有的官方实现例子**（如官方内置的 skill、command、plugin、tool）
- 记录并输出该示例的：文件位置、目录结构、配置格式（如 frontmatter 字段）、注册方式
- 验证：构造一个最小示例（不需要真正实现业务逻辑），确认系统能识别和加载它
- 输出：该扩展点的**实现规范摘要**（5-10 行），格式如下：
  ```
  扩展点：{扩展点名称}
  目录：{标准存放路径}
  文件格式：{frontmatter 字段 / 文件结构}
  注册方式：{自动发现 / 需在配置中声明}
  关联方式：{如何与其他组件关联}
  官方示例：{文件:行号}
  最小验证结果：{识别成功 / 失败及原因}
  ```

---

## 输出格式（每条需求必须按此结构输出）

### 需求 N：{需求描述}

**第一层：文档**
- 官方声明：[支持 / 部分支持 / 未提及 / 明确不支持]
- 依据：`{文件路径}` 第 N 行："{引用内容}"

**第二层：源码**
- 实现状态：[完整 / 部分 / stub/TODO / 不存在]
- 依据：`{文件路径}:{行号}` — {简述}

**第三层：运行验证**
```bash
# 执行的命令
{command}
# 输出
{output}
```
- 验证结论：[正常工作 / 部分工作 / 不可用]

**边界问题**（如有）：
- 问题1：{描述} — 建议修复：{修复方式}

**最终结论**
- 状态：[✅ 已有可用 / ⚠️ 已有但需修复 / ❌ 不存在需新建 / ❓ 需人工确认]
- 一句话总结：{总结}

---

完成所有需求分析后，输出以下两个汇总部分：

## 能力矩阵汇总

| 需求 | 状态 | 建议定制级别 | 置信度 | 关键备注 |
|------|------|-------------|--------|---------|
| {需求1} | ✅/⚠️/❌/❓ | L0/L1/L2/L3/L4 | 高/中/低 | {简述} |

定制级别说明：
- L0-配置：改配置/环境变量即可启用
- L1-Skill：创建 Skill/Command 编排已有能力（零侵入，零升级风险）
- L2-Plugin：通过官方扩展机制开发（Plugin/Tool/Hook）
- L3-Patch：小范围修改源码（标记 `// CUSTOM:`）
- L4-Core：大范围改动核心逻辑

## 人工审查清单

列出所有结论为 ❌（不存在）或 ❓（需确认）的需求，附上建议的人工验证步骤：

### 待人工确认：{需求名称}
- Agent 结论：不支持/不确定
- 建议搜索关键词：{同义词1}, {同义词2}, {上位概念}
- 建议检查路径：{目录或文件}
- 原因说明：{为何需要人工确认}

---

**最后**，请在所有需求分析之后，单独回答 Q-A 到 Q-G 这七个问题，并给出 E3 最小实现骨架（文件清单 + 每文件职责 + 估算 LOC）。这是本次分析的核心交付物。

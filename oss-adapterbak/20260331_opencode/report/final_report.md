# OSS 定制方案报告
项目：opencode　客户：航电软件　日期：2026-03-31

---
> **分析基准版本**
> 仓库：`opencode`　版本：**v1.3.9**　Branch：`hd-dev`
> Commit：`057848deb`
> 客户：`航电软件`　分析时间：`2026-03-31T10:50:00+08:00`
>
> ⚠️ 降级分析：Gemini 未完成（429 容量不足），架构视角由 Claude 补偿，置信度降低。
> ⚠️ 本报告结论基于上述版本快照，若 OSS 项目已更新请重新验证。
---

## 执行摘要

opencode v1.3.9 是一个功能完备的开源 AI 编码 Agent 平台，具备 Provider 抽象（75+ provider）、Tool 注册、Plugin Hook、Skill 系统、Command 系统、Structured Output 等丰富的扩展机制。

**核心结论：R01-R09 全部需求可通过 L1-Skill（零侵入） + L2-Plugin（低侵入）实现，无需修改 opencode 核心源码，升级风险为零。**

预估总工作量：**10.5 人天**（不含离线部署和环境搭建）。

## 能力矩阵

| 需求 | 状态 | 定制级别 | 定制策略 | 工作量 |
|------|------|---------|---------|--------|
| R01 自然语言→需求卡片 | ⚠️ 底座可用 | L1-Skill | Skill + Command + StructuredOutput | 1d |
| R02 需求批量处理 | ⚠️ 底座可用 | L1-Skill | R01 扩展，数组输出 | 0.5d |
| R03 Markdown 输入 | ⚠️ 底座可用 | L1-Skill | ReadTool + R01 Command 参数 | 0d |
| R04 C++ 单测生成 | ❌ 需新建 | L1+L2 | Skill 定义规范 + 自定义校验工具 | 3d |
| R05 测试框架配置化 | ❌ 需新建 | L1-Skill | R04 Command 参数化 | 0.5d |
| R06 增量测试生成 | ❌ 需新建 | L1-Skill | R04 增量模式 + EditTool | 0.5d |
| R07 测试样板学习 | ❌ 需新建 | L1-Skill | ReadTool + prompt 注入 | 1d |
| R08 自动编译验证 | ❌ 需新建 | L1+L2 | 自定义工具 cmake-build.ts | 2d |
| R09 编译错误修复 | ❌ 需新建 | L1+L2 | R08 扩展 + 循环控制 | 2d |
| **合计** | | | | **10.5d** |

## 已有能力详情（⚠️）

### R01-R03：需求理解与结构化

opencode 已有的底座能力：
- **Structured Output**（`prompt.ts:1454`）：`json_schema` 格式 + `StructuredOutput` tool，可强制 LLM 按指定 schema 输出
- **Skill 系统**（`skill/index.ts`）：`SKILL.md` 自动发现和加载，按场景注入上下文
- **Command 系统**（`config.ts:249`）：`.opencode/commands/*.md` 封装可复用的指令流
- **ReadTool**（`tool/read.ts`）：可读取 Markdown 文件内容

**需要定制的部分：**
- 需求卡片 JSON Schema 定义（10 个字段）
- SKILL.md 编写（领域规范 + 评审标准）
- Command 封装（批量处理 + 文件输入）

## 新建方案（❌）

### R04-R07：C++ 单元测试生成体系

**扩展点选择：** L1-Skill + L2-Plugin（自定义工具）

实现架构：
```
.opencode/
├── skills/
│   └── cpp-test-gen/
│       └── SKILL.md          # 测试生成规范（gtest/CppUnit 模板、场景要求、中文注释）
├── commands/
│   └── gen-test.md           # 测试生成命令（--framework, --append, --template 参数）
└── tools/
    └── cpp-test-validator.ts  # 测试代码校验工具（空断言检查、场景覆盖检查）
```

关键设计决策：
1. **框架配置化（R05）**：Command 参数 `--framework gtest|cppunit`，Skill 按参数加载不同 prompt 模板
2. **增量生成（R06）**：Skill 指令约束 LLM "读已有文件 → 定位最后 TEST_F → 在其后追加"
3. **样板学习（R07）**：Command `--template` 参数 → ReadTool 读样板 → 注入 prompt 作为 few-shot
4. **覆盖率保障**：Skill 要求"正常/边界/异常三类缺一不可"；可选配合 gcov/lcov 验证

### R08-R09：自动编译验证与错误修复

**扩展点选择：** L1-Skill + L2-Plugin（自定义工具）

实现架构：
```
.opencode/
├── skills/
│   └── cpp-compile-fix/
│       └── SKILL.md          # 编译修复规范（3 轮上限、仅改测试文件、错误分类）
└── tools/
    └── cmake-build.ts        # cmake 编译工具（执行编译 → 解析错误 → 结构化输出）
```

关键设计决策：
1. **cmake-build.ts 自定义工具**：封装 `cmake --build` 执行 + 编译输出解析 + 结构化错误报告
2. **3 轮上限**：Skill 指令 + Agent `steps` 参数双重控制
3. **修复范围约束**：Skill 明确"仅修改生成的测试文件，不修改源码"
4. **失败处理**：3 轮后仍失败 → 输出完整错误报告（编译日志 + 已尝试修复 + 建议人工操作）

## 分期实施建议

### Phase 1：需求理解能力（1.5d）
- R01 + R02 + R03：Skill + Command + StructuredOutput
- 最小可验证：输入 Markdown 需求 → 输出结构化卡片

### Phase 2：测试生成核心（5d）
- R04 + R05 + R06 + R07：Skill + Command + 自定义工具
- 最小可验证：输入 C++ 源文件 → 输出可编译的 gtest 测试文件

### Phase 3：编译验证闭环（4d）
- R08 + R09：自定义工具 + Skill
- 最小可验证：生成 → 编译 → 修复 → 通过的完整闭环

## 风险评估

| 风险项 | 影响 | 缓解措施 |
|--------|------|---------|
| 本地模型（Qwen3.5 30B）生成质量 | R04 覆盖率 ≥70% 指标达成不确定 | 预留 prompt 调优时间（2d buffer） |
| LLM 遵从"不覆盖"指令的可靠性 | R06 增量生成可能误改已有用例 | Plugin hook 做写入前校验 |
| 编译错误修复范围 | R09 可能修改源码而非测试代码 | Skill 约束 + Permission 规则限制可编辑文件范围 |
| 升级兼容性 | 未来 opencode 版本升级 | 全部定制在 L1-L2 级别，无 fork 风险 |

# 定制开发方案
项目：opencode　客户：航电软件　日期：2026-03-31

---
> **分析基准版本**
> 仓库：`opencode`
> Commit：`057848deb`（完整：`057848deb`）
> Branch：`hd-dev`
> 分析时间：`2026-03-31T10:50:00+08:00`
>
> ⚠️ 本方案基于上述版本快照，实施前请确认 OSS 项目版本未发生重大变更。
---

## Epic 概览

| Epic | 名称 | 优先级 | 需求 | 工作量 | 定制级别 |
|------|------|--------|------|--------|---------|
| E1 | 需求理解与结构化 | P1 | R01, R02, R03 | 1.5d | L1-Skill |
| E2 | C++ 单元测试生成 | P1 | R04, R05, R06, R07 | 5d | L1+L2 |
| E3 | 编译验证与自动修复 | P1 | R08, R09 | 4d | L1+L2 |

**总计：10.5d**（不含环境搭建、集成测试 buffer）

---

## Epic 1: 需求理解与结构化 [P1]

**目标：** 输入 Markdown 需求文档 → 输出结构化需求卡片（单条/批量）

**输入需求：** R01, R02, R03

### 技术实现路径

| 需求 | 策略 | 实现方式 | 关键文件/扩展点 |
|------|------|---------|----------------|
| R01 | L1-Skill | Skill 定义卡片 schema + StructuredOutput | `.opencode/skills/req-structuring/SKILL.md` |
| R02 | L1-Skill | R01 扩展为数组输出 | `.opencode/commands/structurize-req.md` |
| R03 | L1-Skill | Command `--file` 参数 + ReadTool | 同上 |

### 交付物

```
.opencode/
├── skills/
│   └── req-structuring/
│       └── SKILL.md          # 需求卡片 schema + 输出规范 + 评审标准
└── commands/
    └── structurize-req.md    # 封装调用命令（支持 --file 批量输入）
```

### 实现细节

**1. 需求卡片 JSON Schema**
```json
{
  "type": "object",
  "properties": {
    "req_id": { "type": "string", "pattern": "^REQ-\\d{4}-\\d{2}-\\d{3}$" },
    "name": { "type": "string", "maxLength": 30 },
    "author": { "type": "string" },
    "priority": { "enum": ["P0", "P1", "P2", "P3"] },
    "status": { "enum": ["草稿", "已确认", "开发中", "已完成"] },
    "objective": { "type": "string" },
    "user_scenario": {
      "type": "object",
      "properties": {
        "role": { "type": "string" },
        "precondition": { "type": "string" },
        "steps": { "type": "array", "items": { "type": "string" } },
        "expected_result": { "type": "string" }
      }
    },
    "sequence_diagram": { "type": "string", "description": "Mermaid 时序图代码" },
    "acceptance_criteria": { "type": "array", "items": { "type": "string" }, "minItems": 3 },
    "constraints": { "type": "string" },
    "interface_def": { "type": "string" }
  }
}
```

**2. SKILL.md 核心内容**
- 卡片字段定义与填充规则
- 时序图生成指令（Mermaid 格式）
- 验收标准编写规范（可测试、可量化）
- 优先级判定规则（AI 推荐，标注理由）
- 批量模式指令（数组输出，5-10 条/批）

**3. Command 封装**
- 单条模式：`/structurize-req <自然语言需求描述>`
- 批量模式：`/structurize-req --file path/to/requirements.md`
- 输出：Markdown 格式需求卡片，便于 Git 版本管理

### 工作量估算

| 任务 | 估算（人天） | 置信度 | 说明 |
|------|------------|--------|------|
| Schema 定义 + SKILL.md 编写 | 0.5d | 高 | 参照需求文档字段 |
| Command 封装 + 调试 | 0.5d | 高 | 标准 opencode 扩展 |
| 批量模式 + 测试 | 0.5d | 高 | 数组输出验证 |
| **Epic 合计** | **1.5d** | | |

### 依赖关系
- 前置 Epic：无
- 外部依赖：本地 LLM 部署（Qwen3.5 30B+ 推荐）

### 风险
- SLA（≤30s/条）依赖本地模型推理速度，Qwen3.5 30B INT8 在单 GPU 上需实测
- 准确率（≥80%）依赖 prompt 调优，预留 0.5d buffer

---

## Epic 2: C++ 单元测试生成 [P1]

**目标：** 输入 C++ 源文件 → 输出可编译的 gtest/CppUnit 测试代码（支持增量追加和样板学习）

**输入需求：** R04, R05, R06, R07

### 技术实现路径

| 需求 | 策略 | 实现方式 | 关键文件/扩展点 |
|------|------|---------|----------------|
| R04 | L1-Skill | Skill 定义生成规范 + 三类场景要求 | `.opencode/skills/cpp-test-gen/SKILL.md` |
| R05 | L1-Skill | Command 参数 `--framework` | `.opencode/commands/gen-test.md` |
| R06 | L1-Skill | Skill 增量指令 + EditTool | Skill 内指令段 |
| R07 | L1-Skill | `--template` 参数 + ReadTool 注入 | Command + Skill |

### 交付物

```
.opencode/
├── skills/
│   └── cpp-test-gen/
│       ├── SKILL.md              # 测试生成规范
│       └── references/
│           ├── gtest-template.md  # gtest few-shot 示例
│           └── cppunit-template.md # CppUnit few-shot 示例
├── commands/
│   └── gen-test.md               # 测试生成命令
└── tools/
    └── cpp-test-validator.ts     # （可选）测试代码校验工具
```

### 实现细节

**1. SKILL.md 核心规范**
- 生成规则：
  - 正常路径 + 边界条件 + 异常路径（三类缺一不可）
  - 中文注释（项目合规要求）
  - 合理使用 Mock（不引入真实硬件依赖）
  - 禁止空断言或 `SUCCEED()` 占位
  - 每个 `TEST_F` 必须有明确的 `EXPECT_*` / `ASSERT_*` 断言
- 框架模板（按 `--framework` 参数切换）：
  - gtest：`TEST_F(ClassName, TestName)` 格式 + `EXPECT_EQ/NE/TRUE/FALSE` 断言
  - CppUnit：`CPPUNIT_TEST_SUITE` 格式 + `CPPUNIT_ASSERT` 断言
- 增量模式（`--append`）：
  - 先 ReadTool 读取已有测试文件
  - 识别最后一个 `TEST_F` 或 `CPPUNIT_TEST` 位置
  - 在其后追加新用例
  - 不修改、不删除已有用例
- 样板学习（`--template`）：
  - ReadTool 读取指定样板文件
  - 提取命名规则、注释风格、断言模式
  - 注入 prompt 作为风格约束

**2. Command 参数**
```
/gen-test <source_file>
  --framework gtest|cppunit    # 默认 gtest
  --append                      # 增量模式
  --template <template_file>    # 样板文件路径
  --req <requirement_card>      # 关联需求卡片（可选）
  --output <output_file>        # 输出文件路径（可选，默认同目录 *_test.cpp）
```

**3. cpp-test-validator.ts（L2-Plugin，可选增强）**
- 注册为自定义工具 `.opencode/tools/cpp-test-validator.ts`
- 输入：测试文件路径
- 检查项：
  - 是否有空断言（`SUCCEED()` / 无断言的 TEST_F）
  - 是否覆盖三类场景（通过注释关键词检测）
  - 注释是否为中文
- 输出：校验报告（通过/不通过 + 问题列表）

### 工作量估算

| 任务 | 估算（人天） | 置信度 | 说明 |
|------|------------|--------|------|
| SKILL.md 编写（生成规范 + 模板） | 1d | 高 | 含 gtest/CppUnit 双模板 |
| Command 封装 + 参数化 | 0.5d | 高 | 标准 opencode 扩展 |
| 增量模式实现 + 测试 | 0.5d | 中 | LLM 遵从指令可靠性需验证 |
| 样板学习实现 + 测试 | 1d | 中 | 风格模仿质量依赖模型 |
| cpp-test-validator.ts | 1d | 高 | AST 级校验 |
| prompt 调优（覆盖率 ≥70%） | 1d | 低 | 预留 buffer |
| **Epic 合计** | **5d** | | |

### 依赖关系
- 前置 Epic：无（可与 E1 并行）
- 外部依赖：
  - 客户提供 gtest/CppUnit 版本信息
  - 客户提供现有测试文件样板
  - gcov/lcov 用于覆盖率验证

### 风险
- **分支覆盖率 ≥70%**：高度依赖 LLM 能力，Qwen3.5 30B 对 C++ 复杂函数的覆盖质量需实测，可能需要多轮 prompt 调优
- **增量生成可靠性**：LLM 可能误改已有用例，建议 Plugin hook 做写入前 diff 校验
- **样板风格一致性**：LLM 风格模仿非确定性，复杂风格可能需要多轮调优

---

## Epic 3: 编译验证与自动修复 [P1]

**目标：** 测试代码生成后自动 cmake 编译 → 编译错误自动修复（≤3 轮）→ 输出结果

**输入需求：** R08, R09

### 技术实现路径

| 需求 | 策略 | 实现方式 | 关键文件/扩展点 |
|------|------|---------|----------------|
| R08 | L2-Plugin | 自定义工具 cmake-build.ts | `.opencode/tools/cmake-build.ts` |
| R09 | L1+L2 | Skill 修复循环 + cmake-build.ts | `.opencode/skills/cpp-compile-fix/SKILL.md` |

### 交付物

```
.opencode/
├── skills/
│   └── cpp-compile-fix/
│       └── SKILL.md          # 编译修复规范（3 轮、仅改测试、错误分类）
└── tools/
    └── cmake-build.ts        # cmake 编译 + 错误解析工具
```

### 实现细节

**1. cmake-build.ts 自定义工具**

```typescript
// .opencode/tools/cmake-build.ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "执行 cmake 构建并解析编译输出。返回结构化的编译结果（成功/失败+错误列表）。",
  args: {
    build_dir: tool.schema.string().describe("cmake 构建目录路径"),
    target: tool.schema.string().optional().describe("构建目标（可选）"),
  },
  async execute(args, ctx) {
    // 1. 执行 cmake --build {build_dir} --target {target}
    // 2. 捕获 stdout/stderr
    // 3. 解析编译错误（文件:行号:错误类型:错误信息）
    // 4. 返回结构化 JSON：{ success, errors: [{file, line, type, message}] }
  }
})
```

**2. SKILL.md 编译修复规范**
- 修复流程：
  1. 调用 `cmake-build` 工具编译
  2. 若失败，读取错误信息
  3. 仅修改**生成的测试文件**（不修改源码），用 EditTool 精确修复
  4. 重新编译，循环最多 3 轮
  5. 成功 → 输出测试文件 + 编译日志
  6. 3 轮后仍失败 → 输出详细错误报告
- 修复范围约束：
  - 仅修复编译错误（语法/链接），不修复逻辑错误
  - 文件范围限制：仅编辑 `*_test.cpp` / `*_test.h` 文件
  - 通过 opencode Permission 规则强制限制可编辑文件范围
- 错误分类：
  - 语法错误（missing semicolon, undeclared identifier）→ 直接修复
  - 头文件缺失（#include not found）→ 补充 include
  - 链接错误（undefined reference）→ 调整 Mock 或修正函数签名
  - 其他错误 → 标记为"需人工介入"

**3. Permission 规则配置**
在项目 `.opencode/config.yaml` 中限制修复范围：
```yaml
permission:
  edit:
    "*_test.cpp": allow
    "*_test.h": allow
    "*": deny  # 禁止修改源码
```

### 工作量估算

| 任务 | 估算（人天） | 置信度 | 说明 |
|------|------------|--------|------|
| cmake-build.ts 开发 | 1.5d | 高 | 执行+解析+结构化输出 |
| SKILL.md 编写（修复规范） | 0.5d | 高 | 流程编排 |
| 3 轮循环控制 + 测试 | 1d | 中 | 修复质量依赖模型 |
| 错误报告模板 | 0.5d | 高 | 失败时的详细输出 |
| Permission 配置 + 集成测试 | 0.5d | 高 | 安全约束 |
| **Epic 合计** | **4d** | | |

### 依赖关系
- 前置 Epic：E2（需先有测试生成能力）
- 外部依赖：
  - 客户编译环境（Windows + gcc + cmake）
  - 客户项目的 CMakeLists.txt

### 风险
- **编译环境差异**：Windows gcc + cmake 环境需客户配合搭建，错误输出格式可能与 Linux 不同
- **修复质量**：复杂链接错误的修复依赖 LLM 对 C++ 构建系统的理解
- **文件范围泄漏**：LLM 可能尝试修改源码，Permission 规则是关键防线

---

## 分期实施排序

### Phase 1（必做，1.5d）
- **Epic 1: 需求理解与结构化** — 最快可交付，低风险，可独立验证

### Phase 2（必做，5d）
- **Epic 2: C++ 单元测试生成** — 核心交付物，可与 E1 并行开发

### Phase 3（必做，4d）
- **Epic 3: 编译验证与自动修复** — 依赖 E2，串行执行

```
时间线（总计 10.5d，E1/E2 可并行）：

Day 1-2:   [E1 需求理解] + [E2 测试生成 Skill/Command]
Day 3-5:   [E2 测试生成 增量/样板/校验]
Day 6-7:   [E2 prompt 调优] + [E3 cmake-build.ts]
Day 8-9:   [E3 修复循环 + 集成测试]
Day 10:    [集成验证 + buffer]
```

## 人工审查项（不纳入排期）
- R05-R09 的 ❌ 结论已归档到 `report/human_review.md`
- 人工确认后可通过 Phase 8 回填结论并调整方案

---

## 下一步

`dev_plan.md` 可作为以下工具的输入：
- `agile-workflow:ln-210-epic-coordinator` — Epic 规划和 Story 拆解
- `solution-architect` skill — 方案深化和技术决策
- 直接作为 Claude Code 开发任务上下文

建议下一步：将 Phase 1 的 Epic 1 输入 `ln-210-epic-coordinator` 启动开发规划。

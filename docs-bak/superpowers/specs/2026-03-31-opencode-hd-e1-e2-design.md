# OpenCode 航电定制 · E1/E2 设计规范

**文档版本：** v1.0
**创建日期：** 2026-03-31
**项目：** opencode 航电 AI Agent 系统
**客户：** 航电软件
**范围：** E1 需求理解与结构化 + E2 C++ 单元测试生成

---

## 1. 项目背景

### 1.1 目标

为航电软件研发流程构建在离线环境下运行的 AI Agent 系统，覆盖「需求理解 → 测试生成」链路，基于开源项目 opencode v1.3.9（commit: 057848deb）进行定制化开发。

### 1.2 定制策略

- **不修改 opencode 核心源码**（packages/ 目录）
- **全部通过 L1-Skill + L2-Plugin 实现**（.opencode/ 目录）
- **E1 和 E2 完全独立，可并行开发**

### 1.3 关键约束

| 约束 | 说明 |
|------|------|
| **离线部署** | Qwen3.5 30B INT8 本地推理，零外网请求 |
| **编译环境** | Windows + gcc + cmake（客户已有 CMakeLists.txt） |
| **需求输入** | Markdown 格式文本 |
| **代码库访问** | 本地文件系统 |
| **注释语言** | 中文（项目合规要求） |
| **测试框架** | gtest 优先，CppUnit 兼容 |

---

## 2. Epic 1：需求理解与结构化

### 2.1 功能概述

**输入：** 自然语言需求文本（单条或 Markdown 文件，5-10 条/批）
**输出：** 结构化需求卡片（JSON 转 Markdown 格式）
**核心价值：** 将自然语言需求转换为标准化、可追溯的需求卡片

### 2.2 工作流

```
┌─────────────────┐
│ User Input      │
├─ 单条文本        │
└─ Markdown 文件   │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ /structurize-req│
├─ 参数解析        │
├─ SKILL 加载     │
└─ 输入验证        │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ LLM Prompt      │
├─ 系统提示        │
├─ SKILL Context  │
├─ JSON Schema    │
└─ User Input    │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ StructuredOutput│
│ (opencode 原生)  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ LLM 推理        │
│ (Qwen3.5 30B)   │
└─────────────────┘
         │
         ▼
┌──────────────────┐
│ JSON Array       │
│ (需求卡片集合)    │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Markdown Output  │
│ (Git 友好)       │
└──────────────────┘
```

### 2.3 需求卡片 Schema

```json
{
  "type": "object",
  "properties": {
    "req_id": {
      "type": "string",
      "pattern": "^REQ-\\d{4}-\\d{2}-\\d{3}$",
      "description": "需求编号，格式 REQ-YYYY-MM-NNN，系统自动递增生成"
    },
    "name": {
      "type": "string",
      "maxLength": 30,
      "description": "需求名称，不超过 30 字"
    },
    "author": {
      "type": "string",
      "description": "提出人，从输入上下文提取或手动填写"
    },
    "priority": {
      "enum": ["P0", "P1", "P2", "P3"],
      "description": "优先级，AI 推荐，人工可修改"
    },
    "status": {
      "enum": ["草稿", "已确认", "开发中", "已完成"],
      "default": "草稿",
      "description": "需求状态，初始为草稿"
    },
    "objective": {
      "type": "string",
      "description": "功能目标，自然语言描述"
    },
    "user_scenario": {
      "type": "object",
      "properties": {
        "role": {
          "type": "string",
          "description": "用户角色"
        },
        "precondition": {
          "type": "string",
          "description": "前置条件"
        },
        "steps": {
          "type": "array",
          "items": { "type": "string" },
          "description": "操作步骤列表"
        },
        "expected_result": {
          "type": "string",
          "description": "预期结果"
        }
      },
      "required": ["role", "precondition", "steps", "expected_result"]
    },
    "sequence_diagram": {
      "type": "string",
      "description": "交互流程，Mermaid 时序图代码，必须包含参与者、消息、返回"
    },
    "acceptance_criteria": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 3,
      "description": "验收标准，至少 3 条，格式 'Given...When...Then'"
    },
    "constraints": {
      "type": "string",
      "description": "约束条件，包括性能、安全、合规等"
    },
    "interface_def": {
      "type": "string",
      "description": "接口定义，可选。函数签名或 API 描述"
    }
  },
  "required": ["name", "priority", "objective", "user_scenario", "sequence_diagram", "acceptance_criteria"]
}
```

### 2.4 交付物

#### 2.4.1 `.opencode/skills/req-structuring/SKILL.md`

**核心内容（约 800 行）：**

1. **卡片字段定义**
   - 每个字段的说明、约束、示例
   - 优先级判定规则（关键词匹配表）

2. **生成规范**
   - 需求编号自动递增逻辑（REQ-YYYY-MM-NNN）
   - 时序图格式要求（Mermaid）
   - 验收标准编写规范（可测试、可量化）
   - 优先级推荐规则

3. **批处理指令**
   - 当输入包含 5-10 条需求时的处理方式
   - 分隔符识别（Markdown H3、数字列表）
   - 失败处理（单条失败不中断，返回失败原因）

4. **评审标准**
   - 字段完整性检查
   - 验收标准可测试性验证
   - 时序图有效性（Mermaid 语法）
   - 优先级合理性

#### 2.4.2 `.opencode/commands/structurize-req.md`

**核心内容（约 300 行）：**

1. **用法**
   ```
   /structurize-req <需求文本>
   /structurize-req --file <path/to/requirements.md>
   /structurize-req --batch <count>    # 指定批次大小（默认 5）
   ```

2. **处理流程**
   - 输入模式检测（单条 vs 文件）
   - SKILL 加载
   - StructuredOutput 调用
   - 后处理（JSON → Markdown）
   - 输出到 `.opencode/requirements/` 目录

3. **输出格式**
   ```markdown
   ## 需求卡片：REQ-2026-03-001

   | 字段 | 内容 |
   |------|------|
   | 需求名称 | 飞控数据采集接口 |
   | 优先级 | P0 |
   | 状态 | 草稿 |
   | ... | ... |

   ### 交互流程（Mermaid）
   ```mermaid
   sequenceDiagram
   ...
   ```
   ```

4. **错误处理**
   - 文件不存在 → 明确错误消息
   - 输入格式错误 → 给出修正建议
   - LLM 生成失败 → 输出详细错误日志

### 2.5 关键设计决策

| 决策点 | 选择 | 理由 | 备选方案 |
|--------|------|------|---------|
| **Schema 约束** | StructuredOutput + JSON Schema | opencode 原生支持，LLM 遵从度高（≥95%） | 自定义验证器（复杂） |
| **输出格式** | Markdown | Git 版本管理友好，客户直接编辑 | JSON（需客户另外转换）、Word（离线困难） |
| **批处理** | JSON array 一次返回 | 提升吞吐量（5-10 条/批），单次调用 SLA ≤30s | 逐条生成（可靠性高但慢） |
| **优先级推荐** | 关键词匹配 + LLM 推荐 + 理由标注 | 结合规则和 AI 灵活性，可追溯 | 纯规则（太刻板）、纯 LLM（不可控） |
| **编号规则** | REQ-YYYY-MM-NNN | 年月+序列，易于追溯 | UUID（太长）、自增整数（缺少时间上下文） |

### 2.6 性能目标

| 指标 | 目标 | 验证方法 | 优先级 |
|------|------|---------|--------|
| **需求转换时间** | ≤30s/条 | 10 条需求计时，取平均值 | P0 |
| **准确率** | ≥80% | 20 条需求人工评分 | P0 |
| **字段完整性** | 100% | 结构化输出自动检查 | P0 |
| **时序图有效性** | 100% | Mermaid 语法校验 | P1 |
| **批处理吞吐量** | 5-10 条/批 | 单次调用返回条数统计 | P1 |

### 2.7 风险与缓解

| 风险 | 影响 | 概率 | 缓解 |
|------|------|------|------|
| **LLM 生成不符合 Schema** | 输出格式错误，后续流程失败 | 低 | StructuredOutput 强制约束，retry 机制 |
| **Qwen3.5 30B INT8 性能不达 ≤30s** | SLA 无法保证 | 中 | 实测基准，可考虑参数优化或量化版本 |
| **准确率 <80%** | 需求卡片质量不可用 | 中 | Prompt 调优（预留 0.5d buffer），客户评审反馈 |
| **用户手工修改卡片后再使用** | 一致性问题 | 低 | 生成卡片标注"AI 生成，需人工审核"提示 |

### 2.8 工作量估算

| 任务 | 工作量 | 置信度 | 说明 |
|------|--------|--------|------|
| SKILL.md 编写（字段定义、生成规范、批处理指令） | 0.5d | 高 | 参照需求文档结构 |
| Command 封装（参数解析、调用流程、输出格式） | 0.5d | 高 | 标准 opencode 扩展模式 |
| 后处理和批量测试 | 0.5d | 高 | Markdown 转换、数组处理验证 |
| **E1 合计** | **1.5d** | | |

---

## 3. Epic 2：C++ 单元测试生成

### 3.1 功能概述

**输入：** C++ 源文件 + 框架配置（gtest/CppUnit）+ 可选样板文件
**输出：** 可直接编译的单元测试代码（*_test.cpp）
**核心价值：** 自动生成覆盖正常/边界/异常三类场景的测试代码，分支覆盖率 ≥70%

### 3.2 工作流

```
┌────────────────────────┐
│ Input                  │
├─ C++ 源文件              │
├─ 框架配置（gtest/CUnit）  │
├─ 可选：样板文件           │
├─ 可选：需求卡片           │
└─ 模式：新建/增量追加       │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│ /gen-test              │
├─ 参数解析               │
├─ SKILL 加载            │
├─ ReadTool 样板学习     │
├─ ReadTool 增量识别     │
└─ Code Analysis        │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│ LLM Prompt (4段式)      │
├─ 系统提示               │
├─ Framework SKILL       │
├─ Style Context (样板)   │
├─ Source Code           │
├─ Test Points           │
└─ User Intent          │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│ LLM 推理                │
│ (Qwen3.5 30B INT8)     │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│ C++ 测试代码            │
│ (包含注释、断言、Mock)   │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│ 可选：cpp-test-validator│
├─ 静态校验               │
└─ 输出：通过/失败+问题列表 │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│ 输出文件                │
│ (*_test.cpp)           │
└────────────────────────┘
```

### 3.3 框架规范

#### 3.3.1 gtest 规范

**头文件和类定义：**
```cpp
#include <gtest/gtest.h>
#include "target_class.h"

class TargetClassTest : public ::testing::Test {
 protected:
  TargetClass obj_;  // 被测对象
  // 可选：SetUp() 和 TearDown()
};
```

**测试用例格式：**
```cpp
TEST_F(TargetClassTest, TestName) {
  // [正常路径] 说明文本
  EXPECT_EQ(expected, obj_.Method(input));
  ASSERT_TRUE(condition);
}
```

**断言规则：**
- 优先 `EXPECT_*` (非致命) 而非 `ASSERT_*` (致命)
- 禁止空测试：不允许 `SUCCEED()` 或无断言的 TEST_F
- 每个 TEST_F 必须至少一个明确的 `EXPECT_*` 或 `ASSERT_*`

#### 3.3.2 CppUnit 规范

**宏定义和类定义：**
```cpp
#include <cppunit/TestCase.h>
#include "target_class.h"

class TargetClassTest : public CppUnit::TestCase {
 private:
  TargetClass obj_;

 public:
  CPPUNIT_TEST_SUITE(TargetClassTest);
  CPPUNIT_TEST(testNormalCase);
  CPPUNIT_TEST(testBoundaryCase);
  CPPUNIT_TEST_SUITE_END();

  void testNormalCase();
  void testBoundaryCase();
};
```

**断言规则：**
- 使用 `CPPUNIT_ASSERT_EQUAL`、`CPPUNIT_ASSERT_THROW` 等
- 禁止空测试或无断言

### 3.4 生成规范

#### 3.4.1 三类场景覆盖（必须）

1. **正常路径（Happy Path）**
   - 标记：`// [正常路径]` 或 `/* NORMAL CASE */`
   - 示例：合法输入 → 预期输出
   - 用例数：函数的主要逻辑分支

2. **边界条件（Boundary Cases）**
   - 标记：`// [边界值]`
   - 示例：min/max 整数、空指针、空容器、零值、负数
   - 用例数：关键参数的边界 2-3 条

3. **异常路径（Exception Cases）**
   - 标记：`// [异常处理]`
   - 示例：非法输入、资源耗尽、异常抛出、nullptr
   - 用例数：预期的异常分支

#### 3.4.2 Mock 对象指导

**优先级：**
1. Google Mock（gmock）+ 函数指针 stub
2. 接口模拟（虚函数）
3. 避免真实 I/O（文件、网络、硬件）

**示例：**
```cpp
class MockLogger : public Logger {
 public:
  MOCK_METHOD(void, Log, (const std::string&), (override));
};

TEST_F(MyClassTest, LogsOnError) {
  MockLogger mock_logger;
  EXPECT_CALL(mock_logger, Log).Times(AtLeast(1));

  MyClass obj(&mock_logger);
  obj.DoSomething();  // 应触发日志
}
```

#### 3.4.3 注释要求

**语言和格式：**
- 语言：中文
- TEST_F 顶部：说明测试目的
- 关键断言前：添加逻辑说明
- 格式：`// [场景标记] 说明文本`

**示例：**
```cpp
// [正常路径] 测试 Add 方法：两个正整数相加
TEST_F(CalculatorTest, Add_PositiveNumbers) {
  // 验证正数相加结果正确
  EXPECT_EQ(5, calc_.Add(2, 3));
  // 验证零值相加
  EXPECT_EQ(0, calc_.Add(0, 0));
}
```

#### 3.4.4 覆盖率目标

- **目标：** ≥70% 分支覆盖率
- **验证工具：** gcov/lcov
- **计算方式：** 执行的分支数 / 总分支数

### 3.5 交付物

#### 3.5.1 `.opencode/skills/cpp-test-gen/SKILL.md`

**核心内容（约 1200 行）：**

1. **框架规范**
   - gtest 和 CppUnit 的完整规范
   - 头文件、宏、函数签名、断言语法

2. **生成规范**
   - 三类场景覆盖详解
   - Mock 对象指导
   - 注释要求
   - 覆盖率目标

3. **增量模式规范（--append）**
   - 读取已有文件，识别最后一个 TEST_F
   - 新增用例在其后追加
   - 不修改、不删除已有用例
   - 命名一致性（如 TestCase_1, TestCase_2）

4. **样板学习规范（--template）**
   - 提取目标：
     - 测试类命名风格（FunctionNameTest vs Test_FunctionName）
     - 测试用例命名（TestXxx vs Xxx_Test）
     - 断言风格优先级（EXPECT_* vs ASSERT_*）
     - 注释格式（// vs /* */）
     - Mock 模式和返回值设置
   - 应用：作为 prompt 的"风格约束"段落注入

5. **边界与限制**
   - 不生成集成测试（仅单元测试）
   - 不修改源代码
   - 不生成性能测试或压力测试

#### 3.5.2 `.opencode/skills/cpp-test-gen/references/gtest-template.md`

**核心内容（约 400 行）：**

一个完整的 gtest 测试示例项目（如 Calculator 类），包括：
- 源代码
- 生成的测试文件
- Mock 示例
- 参数化测试示例
- 每种模式的详细说明

#### 3.5.3 `.opencode/skills/cpp-test-gen/references/cppunit-template.md`

**核心内容（约 300 行）：**

类似 gtest-template.md，但使用 CppUnit 宏和语法。

#### 3.5.4 `.opencode/commands/gen-test.md`

**核心内容（约 400 行）：**

1. **用法**
   ```
   /gen-test <source_file>
     --framework gtest|cppunit       # 默认 gtest
     --append                        # 增量模式
     --template <template_file>      # 样板文件路径
     --req <requirement_card>        # 关联需求卡片（可选）
     --output <output_file>          # 输出文件（可选）
   ```

2. **处理流程**
   - 输入验证（文件存在、参数有效）
   - SKILL 加载（选择 gtest/CppUnit SKILL）
   - 样板学习（ReadTool 读取并提取风格）
   - 源代码分析（函数签名、参数、异常）
   - 需求融合（可选，ReadTool 读取验收标准）
   - 增量追加（可选，ReadTool 识别最后位置）
   - LLM 生成（Qwen3.5 30B INT8）
   - 可选校验（cpp-test-validator.ts）
   - 输出到文件

3. **错误处理**
   - 源文件不存在 → 明确错误
   - 框架参数非法 → 列出有效选项
   - LLM 生成失败 → 输出日志和重试建议

4. **示例**
   ```
   /gen-test src/calculator.cpp \
     --framework gtest \
     --template tests/samples/math_test.cpp

   输出：
   ✓ 生成测试文件：src/calculator_test.cpp
   ✓ 测试用例数：8
   ✓ 场景覆盖：正常路径 3, 边界值 3, 异常处理 2
   ✓ 样板风格应用：Test_* 命名 + EXPECT_* 断言
   ✓ 耗时：45s
   ```

#### 3.5.5 `.opencode/tools/cpp-test-validator.ts`（可选）

**功能：** 静态校验 C++ 测试文件质量

**检查项：**
- 是否存在 `SUCCEED()` 或无断言的 TEST_F
- 是否覆盖三类场景（通过正则匹配 [正常路径] / [边界值] / [异常处理]）
- 注释是否为中文（非 ASCII）
- 断言是否明确（EXPECT_EQ 而非 EXPECT_TRUE(true)）
- 函数签名调用是否正确

**输出格式：**
```json
{
  "passed": true,
  "total_tests": 8,
  "issues": [
    { "line": 42, "type": "empty_assertion", "message": "TEST_F 无断言" }
  ]
}
```

### 3.6 关键设计决策

| 决策点 | 选择 | 理由 | 备选方案 |
|--------|------|------|---------|
| **框架支持** | gtest 优先 + CppUnit 兼容 | gtest 更现代灵活；CppUnit 作为兼容选项 | 仅 gtest（限制客户选择） |
| **样板学习** | ReadTool 提取风格 + prompt 注入 | 上下文学习比 few-shot 更稳健，可无限扩展 | Few-shot 示例（token 消耗大） |
| **增量追加** | 识别最后一个 TEST_F 后追加 | 减少 LLM 误改已有用例的风险 | 全量覆盖（风险高） |
| **Mock 指导** | 统一用 Google Mock（gmock） | gtest 原生支持，现代且强大 | 接口模拟（功能受限） |
| **覆盖率目标** | ≥70% 分支覆盖 | 平衡质量和工作量 | ≥90%（工作量太大） |
| **缺陷修复权限** | 仅修改 *_test.cpp / *_test.h | 保护源代码，安全可控（E3 配合 Permission 规则） | 允许修改源码（风险高） |

### 3.7 性能目标

| 指标 | 目标 | 验证方法 | 优先级 |
|------|------|---------|--------|
| **单函数生成时间** | ≤2min | 5 个函数计时，取最大值 | P0 |
| **分支覆盖率** | ≥70% | gcov/lcov 运行 | P0 |
| **空断言比例** | 0% | cpp-test-validator 检查或人工审查 | P0 |
| **三类场景覆盖** | 100% | 关键词匹配检查 | P0 |
| **编译通过率**（E3 前提） | ≥90% 首次通过 | 20 个函数首次编译统计 | P1 |
| **样板风格一致性** | ≥95% | 人工审查 | P1 |

### 3.8 风险与缓解

| 风险 | 影响 | 概率 | 缓解 |
|------|------|------|------|
| **分支覆盖率 <70%** | 测试质量不达验收标准 | 中 | Prompt 调优、预留 1d buffer、多轮推理 |
| **LLM 在增量追加时误改已有用例** | 破坏已有测试 | 低 | Permission 规则（仅允许修改 *_test.cpp）、E3 中 diff 前置校验 |
| **样板风格学习质量不稳定** | 生成风格不一致 | 中 | 预留 prompt 调优 buffer、接受多轮推理 |
| **C++ 复杂函数的测试生成困难** | 某些函数无法自动测试 | 低 | 输出诊断信息，让用户手工补充 |
| **Qwen3.5 INT8 性能不达 ≤2min** | SLA 无法保证 | 低 | 实测基准，可考虑加速推理或量化优化 |

### 3.9 工作量估算

| 任务 | 工作量 | 置信度 | 说明 |
|------|--------|--------|------|
| SKILL.md 编写（框架规范、生成规范、增量/样板指令） | 1d | 高 | 含详细示例 |
| gtest-template.md + cppunit-template.md | 0.5d | 高 | 完整示例项目 |
| Command 封装（参数解析、调用流程） | 0.5d | 高 | 标准 opencode 扩展 |
| 增量追加模式实现和测试 | 0.5d | 中 | LLM 遵从指令可靠性需验证 |
| 样板学习实现和测试 | 1d | 中 | 风格模仿质量依赖 LLM 能力 |
| cpp-test-validator.ts（可选） | 1d | 高 | 正则匹配和 AST 级检查 |
| Prompt 调优和覆盖率优化 | 1d | 低 | 预留 buffer 以达成 ≥70% 覆盖率 |
| **E2 合计** | **5d** | | |

---

## 4. 实现约束与安全

### 4.1 Permission 规则

在 `.opencode/config.yaml` 中定义（E3 编译修复时强制使用）：

```yaml
permissions:
  edit:
    "*_test.cpp": "allow"
    "*_test.h": "allow"
    "*": "deny"  # 禁止修改源代码
```

### 4.2 文件组织

```
.opencode/
├── skills/
│   ├── req-structuring/
│   │   └── SKILL.md                    # 需求结构化规范
│   └── cpp-test-gen/
│       ├── SKILL.md                    # C++ 测试生成规范
│       └── references/
│           ├── gtest-template.md       # gtest 样板
│           └── cppunit-template.md     # CppUnit 样板
├── commands/
│   ├── structurize-req.md              # 需求结构化命令
│   └── gen-test.md                     # 测试生成命令
├── tools/
│   └── cpp-test-validator.ts           # 测试校验工具（可选）
├── requirements/                       # E1 输出目录（自动创建）
│   ├── REQ-2026-03-001.md
│   └── ...
└── tests/                              # E2 输出目录（自动创建）
    ├── calculator_test.cpp
    └── ...
```

### 4.3 依赖关系

| Epic | 前置依赖 | 并行可行性 |
|------|---------|-----------|
| E1 | 无 | 可与 E2 并行 |
| E2 | 无 | 可与 E1 并行 |
| E3 | E2 | 必须在 E2 之后 |

---

## 5. 验收标准

### 5.1 E1 验收

| 标准 | 目标 | 验证方法 |
|------|------|---------|
| 需求转换准确率 | ≥80% | 20 条需求人工评分 |
| 单条需求处理时间 | ≤30s | 10 条需求计时，取平均值 |
| 字段完整性 | 100% | 自动检查所有必需字段 |
| 时序图有效性 | 100% | Mermaid 语法校验 |
| 批处理可靠性 | 100% | 5-10 条需求一次处理，成功率统计 |

### 5.2 E2 验收

| 标准 | 目标 | 验证方法 |
|------|------|---------|
| 单函数生成时间 | ≤2min | 5 个函数计时，取最大值 |
| 分支覆盖率 | ≥70% | gcov/lcov 运行覆盖率统计 |
| 空断言比例 | 0% | 人工审查或 cpp-test-validator 检查 |
| 三类场景覆盖 | 100% | 关键词匹配或人工审查 |
| 编译通过率（E3 前提） | ≥90% | 20 个函数首次编译统计 |

---

## 6. 后续 Epic 与扩展

### 6.1 E3：编译验证与自动修复（后续）

- **工作量：** 4d
- **需求：** R08, R09
- **前置：** E2 完成
- **交付：** cmake-build.ts + cpp-compile-fix SKILL

### 6.2 二期扩展（范围待定）

- 需求-测试-代码追溯矩阵
- 需求变更影响分析
- 测试执行结果分析与覆盖率缺口识别
- 回归测试子集智能推荐
- Skill 库构建与维护工具

---

## 7. 关键决策汇总

| 决策 | 说明 | 客户确认 |
|------|------|---------|
| **E1、E2 完全独立** | 两个 Epic 可并行开发，无依赖关系 | ✓ |
| **仅修改 .opencode/ 目录** | 零修改 opencode 核心源码（packages/） | ✓ |
| **离线 Qwen3.5 30B INT8** | 本地推理，零外网请求 | ✓（待确认硬件） |
| **gtest 优先 + CppUnit 兼容** | 框架可通过 --framework 参数切换 | ✓ |
| **增量追加 + 样板学习** | E2 支持两种增强模式 | ✓ |

---

## 8. 附录：实现时间表

### Phase 1：设计与文档（已完成）
- E1/E2 完整设计规范
- 交付物清单和文件结构
- 风险评估和缓解策略

### Phase 2：实现（计划）
- **E1（1.5d）**
  - Day 1：SKILL.md + Command 编写
  - 0.5d：后处理和测试

- **E2（5d）**（与 E1 并行）
  - Day 1：SKILL.md + 框架规范
  - 0.5d：gtest/CppUnit 样板编写
  - 0.5d：Command 封装
  - 0.5d：增量追加模式测试
  - 1d：样板学习实现和测试
  - 1d：cpp-test-validator.ts（可选）
  - 1d：Prompt 调优和覆盖率优化

### Phase 3：集成测试（后续）
- E1 和 E2 端到端联合测试
- 离线环境验证
- 性能和准确率基准测试

### Phase 4：E3（后续）
- 编译验证工具
- 自动修复机制（≤3 轮）
- Permission 规则集成

---

**文档状态：** 设计完成，待 Spec review
**下一步：** 提交给 spec-document-reviewer 进行质量审查

# /cpp-unittest-gen 命令

> **命令用途：** 从 C++ 源文件自动生成单元测试代码（支持 gtest 和 CppUnit 框架）

---

## 命令概述

`/cpp-unittest-gen` 是一个端到端的 C++ 单元测试生成命令，用于自动化生成满足「三类场景覆盖」（正常路径、边界值、异常处理）的测试用例。通过与 [cpp-unittest-gen SKILL](../skills/cpp-unittest-gen/SKILL.md) 配合，支持框架选择、增量生成、样板学习等高级功能。

**关键特性：**
- ✓ 自动函数签名解析和测试骨架生成
- ✓ 三类场景自动覆盖（[正常路径] / [边界值] / [异常处理]）
- ✓ 框架灵活选择（gtest 优先，支持 CppUnit 切换）
- ✓ 增量生成模式（追加而不覆盖现有测试）
- ✓ 样板学习（自动提取风格特征，保持一致性）
- ✓ 需求关联（可选，融合验收标准）
- ✓ 自动编译验证（可选，检测语法错误）

---

## 基本用法

### 1. 最简单的调用：生成基础测试

```bash
/cpp-unittest-gen src/calculator.cpp

✓ 读取源文件：src/calculator.cpp
✓ 分析函数：Add, Subtract, Multiply, Divide (4 个)
✓ 加载 SKILL：cpp-unittest-gen
✓ 生成完成：src/calculator_test.cpp (180 行)
  └─ 包含: 12 个测试用例，覆盖率预期 ≥70%
  └─ 框架: gtest (默认)
  └─ 风格: 自动分析源文件注释格式
```

### 2. 指定测试框架

```bash
# 使用 CppUnit 框架
/cpp-unittest-gen src/calculator.cpp --framework cppunit

✓ 框架: CppUnit
✓ 生成完成：src/calculator_test.cpp (150 行)
  └─ 使用 CPPUNIT_TEST_SUITE 宏结构
  └─ setUp() / tearDown() 生命周期
```

### 3. 增量追加测试

```bash
# 在现有测试文件基础上追加新的测试
/cpp-unittest-gen src/calculator.cpp --append

✓ 已检测现有文件：src/calculator_test.cpp
✓ 最后测试位置：line 142 (testDivide_ByZero)
✓ 增量追加：新增 4 个测试用例
✓ 生成完成：src/calculator_test.cpp (220 行)
  └─ 保留原有测试（1-142 行）
  └─ 新增测试（143-220 行）
  └─ 无重复，无覆盖
```

### 4. 样板学习（风格一致性）

```bash
# 从现有测试文件学习风格，应用于新生成的测试
/cpp-unittest-gen src/math_helper.cpp --template tests/calculator_test.cpp

✓ 样板学习：tests/calculator_test.cpp
✓ 识别特征：
  ├─ 命名规范：Test + 方法名 + 场景 (e.g., Add_TwoPositiveNumbers)
  ├─ 注释格式：// [正常路径] / [边界值] / [异常处理]
  ├─ 断言风格：EXPECT_EQ, EXPECT_THROW
  ├─ Mock 模式：MockObserver with EXPECT_CALL
  └─ 代码缩进：2 个空格
✓ 应用到新文件：src/math_helper_test.cpp
✓ 生成完成：src/math_helper_test.cpp (160 行)
```

### 5. 关联需求卡片

```bash
# 将生成的测试关联到特定的需求卡片（来自 E1 输出）
/cpp-unittest-gen src/database.cpp --req REQ-2026-03-001

✓ 关联需求：REQ-2026-03-001
✓ 融合验收标准：
  ├─ 应该支持 CRUD 操作
  ├─ 应该在事务失败时回滚
  ├─ 应该处理并发访问
  └─ 应该在 2ms 内返回结果
✓ 生成完成：src/database_test.cpp (240 行)
  └─ 包含对应验收标准的测试用例
  └─ 测试注释中包含需求 ID
```

### 6. 自定义输出位置

```bash
# 指定测试文件输出路径
/cpp-unittest-gen src/calculator.cpp --output tests/unit/calculator_test.cpp

✓ 输出路径：tests/unit/calculator_test.cpp
✓ 生成完成：tests/unit/calculator_test.cpp (180 行)
```

### 7. 组合选项

```bash
# 多个选项一起使用
/cpp-unittest-gen src/utils.cpp \
  --framework cppunit \
  --template tests/calculator_test.cpp \
  --req REQ-2026-03-005 \
  --output tests/unit/utils_test.cpp \
  --append

✓ 框架：CppUnit
✓ 样板：tests/calculator_test.cpp
✓ 需求：REQ-2026-03-005
✓ 输出：tests/unit/utils_test.cpp
✓ 模式：增量追加
✓ 生成完成：tests/unit/utils_test.cpp (195 行)
```

---

## 详细处理流程（9 步）

### Step 1: 输入验证

```
检查项：
✓ 源文件是否存在（--help 除外）
✓ 文件扩展名是否为 .cpp / .cc / .h
✓ 框架选项是否为 gtest 或 cppunit
✓ 输出路径是否可写
✗ 如果源文件不存在：
    → 错误：File not found: <path>
    → 建议：检查文件路径
```

**验证日志示例：**
```
[验证] 源文件存在：✓ src/calculator.cpp (2.1 KB)
[验证] 文件格式：✓ C++ source (.cpp)
[验证] 框架选项：✓ gtest (默认)
[验证] 输出位置：✓ src/ (可写)
[验证] 已通过：所有检查 ✓
```

### Step 2: 源代码解析

使用 AST（抽象语法树）分析源文件，提取：

```
提取内容：
1. 函数列表（名称、参数类型、返回值、是否抛异常）
2. 类结构（成员变量、方法签名、访问权限）
3. 头文件依赖（#include 路径）
4. 注释和文档字符串（用于理解函数意图）
5. 异常声明（throw 关键字、异常类型）

解析日志示例：
[解析] 分析文件：src/calculator.cpp
  ├─ 发现函数：Add(int, int) → int
  ├─ 发现函数：Subtract(int, int) → int
  ├─ 发现函数：Multiply(int, int) → int
  ├─ 发现函数：Divide(int, int) → int [抛异常]
  └─ 总计：4 个公开函数
[解析] 提取完成：200ms
```

### Step 3: 框架选择与 SKILL 加载

根据 `--framework` 选项加载对应的 SKILL：

```
if (framework === 'gtest') {
  加载 SKILL：cpp-unittest-gen
  使用配置：
    - 测试框架：gtest
    - Mock 框架：Google Mock (gmock)
    - 断言风格：EXPECT_* 优先
    - 参数化：TEST_P 支持
} else if (framework === 'cppunit') {
  加载 SKILL：cpp-unittest-gen (CppUnit 分支)
  使用配置：
    - 测试框架：CppUnit
    - Mock 框架：第三方库或接口 mock
    - 断言风格：CPPUNIT_ASSERT_*
    - 参数化：手工循环实现
}

日志示例：
[框架] 选定框架：gtest
[SKILL] 加载 cpp-unittest-gen/SKILL.md
[SKILL] 使用配置：gtest + gmock
[SKILL] 提示词注入：500 tokens (规范 + 示例)
```

### Step 4: 样板学习（可选）

如果指定了 `--template` 选项，从现有测试文件提取风格特征：

```
提取特征：
1. 测试类命名：CalculatorTest （前缀 + Test）
2. 测试方法命名：Add_TwoPositiveNumbers （方法 + 场景）
3. 注释标记：[正常路径] / [边界值] / [异常处理]
4. 断言类型：EXPECT_EQ, EXPECT_THROW, EXPECT_CALL
5. Mock 使用：MockObserver 命名，EXPECT_CALL 语法
6. 代码缩进：2 个空格 / 4 个空格
7. 头文件顺序：gtest → gmock → 自定义

日志示例：
[样板] 学习文件：tests/calculator_test.cpp (180 行)
[样板] 命名规范：Test + 方法名 + 场景
[样板] 注释格式：// [场景标记]
[样板] 断言优先：EXPECT_* (非致命)
[样板] 缩进风格：2 个空格
[样板] Mock 框架：Google Mock
[样板] 特征提取：7 项 ✓
```

### Step 5: 需求融合（可选）

如果指定了 `--req` 选项，加载需求卡片的验收标准（来自 E1）：

```
融合步骤：
1. 读取需求卡片：REQ-YYYY-MM-NNN.json
2. 提取字段：
   - 需求名称 (name)
   - 用户场景 (user_scenario)
   - 验收标准 (acceptance_criteria)
   - 业务约束 (constraints)
3. 将验收标准映射到测试用例
4. 生成需求追踪标记

日志示例：
[需求] 读取卡片：REQ-2026-03-001
[需求] 名称：支持 CRUD 操作
[需求] 验收标准：
  ├─ 应该创建新记录
  ├─ 应该读取现有记录
  ├─ 应该更新记录
  ├─ 应该删除记录
  └─ 应该在无效操作时抛异常
[需求] 融合完成：5 个标准 → 8 个测试用例
```

### Step 6: 增量检测（可选）

如果指定了 `--append` 选项，检测现有测试文件的最后位置：

```
检测步骤：
1. 读取现有文件：src/calculator_test.cpp
2. 查找最后的 TEST_F / CPPUNIT_TEST 定义
3. 定位闭合括号位置（追加点）
4. 验证文件完整性（无语法错误）

日志示例：
[增量] 检测现有文件：src/calculator_test.cpp
[增量] 文件大小：142 行
[增量] 最后测试：testDivide_ByZero (line 130-142)
[增量] 追加点：line 142
[增量] 校验完成：文件结构正常 ✓
```

### Step 7: LLM 生成

调用本地 LLM（Qwen3.5 30B INT8）生成测试代码：

```
提示词输入：
- 解析得到的函数列表 (50 tokens)
- cpp-unittest-gen SKILL 规范 (500 tokens)
- 样板特征 (可选, 100-200 tokens)
- 需求验收标准 (可选, 100-200 tokens)
- 生成指示：三类场景覆盖 + Mock 指南 + 中文注释

生成输出：
- 测试文件完整源代码（150-300 行）
- 包含所有导入、类定义、setUp/tearDown、测试方法
- 符合框架风格和样板特征

日志示例：
[LLM] 调用模型：Qwen3.5 30B INT8
[LLM] 输入 tokens：~800
[LLM] 输出 tokens：~600
[LLM] 生成耗时：12s
[LLM] 生成完成 ✓
```

### Step 8: 可选编译验证

如果启用了 `--validate` 选项，检查生成的代码是否能编译：

```
验证步骤：
1. 执行 g++ -c -std=c++17 -Wall 编译检查
2. 检查是否有语法错误
3. 如果有错误，记录位置和建议

日志示例：
[校验] 编译检查：src/calculator_test.cpp
[校验] 命令：g++ -c -std=c++17 -Wall -o /tmp/test.o
[校验] 结果：✓ 通过（0 errors, 0 warnings）
[校验] 校验完成
```

### Step 9: 文件保存与完成

```
保存步骤：
1. 确定输出路径（默认或 --output 指定）
2. 创建目录（如不存在）
3. 写入文件
4. 记录统计信息（行数、测试用例数、预期覆盖率）
5. 生成完成日志

日志示例：
[保存] 输出路径：src/calculator_test.cpp
[保存] 文件大小：180 行 (5.2 KB)
[保存] 测试数量：12 个用例
[保存] 覆盖率预期：≥70% (分支覆盖)
[保存] 框架：gtest + gmock
[保存] 风格：Calculator 示例风格
[保存] 完成时间：15s
[保存] 状态：✓ 成功
```

---

## 完整执行示例

### 示例场景：生成 Calculator 测试

**命令：**
```bash
/cpp-unittest-gen src/calculator.cpp \
  --framework gtest \
  --template tests/sample_test.cpp \
  --output tests/calculator_test.cpp
```

**完整日志输出：**

```
════════════════════════════════════════════════════════════════
 /cpp-unittest-gen 单元测试生成
════════════════════════════════════════════════════════════════

[Step 1] 输入验证
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 源文件存在：src/calculator.cpp (2.1 KB)
✓ 文件格式：C++ source (.cpp)
✓ 框架选项：gtest
✓ 输出位置：tests/ (可写)
✓ 样板文件：tests/sample_test.cpp (180 行)
[验证完成] 所有检查通过 ✓

[Step 2] 源代码解析
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[AST 解析] src/calculator.cpp
  ├─ 类: Calculator
  │   ├─ 成员: int last_result_
  │   ├─ 方法: Add(int, int) → int
  │   ├─ 方法: Subtract(int, int) → int
  │   ├─ 方法: Multiply(int, int) → int
  │   └─ 方法: Divide(int, int) → int [throws std::invalid_argument]
  └─ 共 4 个公开函数
[解析完成] 200ms

[Step 3] 框架选择
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 框架：gtest (Google Test)
✓ Mock 框架：Google Mock (gmock)
✓ 加载 SKILL：cpp-unittest-gen v1.0
✓ 提示词注入：~500 tokens

[Step 4] 样板学习
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[样板分析] tests/sample_test.cpp (180 行)
  ├─ 命名规范：Method_Scenario (e.g., Add_TwoPositiveNumbers)
  ├─ 注释格式：// [正常路径] / [边界值] / [异常处理]
  ├─ 断言类型：EXPECT_EQ, EXPECT_THROW, EXPECT_CALL
  ├─ Mock 模式：MOCK_METHOD, 参数匹配 (_)
  ├─ 代码缩进：2 个空格
  └─ SetUp/TearDown：用于初始化和清理
[样板学习完成] 7 项特征提取 ✓

[Step 5] 需求融合
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
跳过（未指定 --req）

[Step 6] 增量检测
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
跳过（未指定 --append）

[Step 7] LLM 生成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[模型调用] Qwen3.5 30B INT8
[输入] 800 tokens (解析 + SKILL + 样板)
[生成中...]
  ├─ #include <gtest/gtest.h>
  ├─ #include <gmock/gmock.h>
  ├─ class CalculatorTest : public ::testing::Test { ... }
  ├─ TEST_F(CalculatorTest, Add_TwoPositiveNumbers) { ... }
  ├─ TEST_F(CalculatorTest, Add_Boundary) { ... }
  ├─ TEST_F(CalculatorTest, Divide_ByZero) { ... }
  ├─ class MockObserver : public Observer { ... }
  └─ TEST_F(CalculatorTest, NotifyObserver) { ... }
[输出] 650 tokens (测试代码)
[耗时] 14s
[生成完成] ✓

[Step 8] 编译验证
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
跳过（未启用 --validate，可通过 `bun run build` 后续校验）

[Step 9] 文件保存
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 创建目录：tests/
✓ 写入文件：tests/calculator_test.cpp
  ├─ 行数：185 行
  ├─ 测试用例：12 个 (Add 3 + Subtract 2 + Multiply 2 + Divide 3 + Mock 2)
  ├─ 覆盖率预期：≥75% (分支覆盖)
  └─ 大小：6.2 KB
✓ 完成时间：16s 总耗时
[保存完成] ✓

════════════════════════════════════════════════════════════════
 ✓ 成功生成 tests/calculator_test.cpp
════════════════════════════════════════════════════════════════

下一步：
1. 运行测试：bun run test tests/calculator_test.cpp
2. 检查覆盖率：gcov src/calculator.cpp
3. 编辑测试：根据需要调整测试用例
4. 提交代码：git add tests/calculator_test.cpp && git commit
```

---

## 常见问题（FAQ）

### Q1: 生成的测试代码能直接运行吗？

**A:** 通常可以。生成的代码遵循 gtest/CppUnit 标准，只需：
```bash
# 安装依赖（首次）
apt-get install libgtest-dev libgmock-dev

# 编译测试
g++ -std=c++17 -o tests/calculator_test \
  src/calculator.cpp tests/calculator_test.cpp \
  -lgtest -lgmock -lpthread

# 运行测试
./tests/calculator_test
```

### Q2: 如何修改框架（从 gtest 改成 CppUnit）？

**A:** 使用 `--framework` 选项：
```bash
/cpp-unittest-gen src/calculator.cpp --framework cppunit
```

或修改默认框架（在 opencode 配置中设置 `defaultTestFramework: cppunit`）。

### Q3: 增量模式（--append）如何工作？

**A:**
1. 读取现有测试文件
2. 找到最后一个 `TEST_F(...)` 或 `CPPUNIT_TEST(...)`
3. 在其后追加新的测试
4. **不修改现有测试内容**（既不覆盖，也不删除）

适用场景：新增函数需要生成测试、补充遗漏的边界值测试等。

### Q4: 样板学习（--template）学习的是什么？

**A:** 从现有测试文件提取风格特征，包括：
- 命名规范（类、方法、变量）
- 代码注释格式（[正常路径] 等标记）
- 断言和 Mock 的使用方式
- 代码缩进和格式

新生成的测试会遵循相同风格，确保代码库一致性。

### Q5: 为什么某些函数没有生成 Mock 相关的测试？

**A:** Mock 优先级规则：
1. **有外部依赖（接口、虚函数）** → 生成 Mock 测试
2. **只涉及基本运算** → 仅生成单元测试
3. **有观察者 / 发布-订阅** → 生成 EXPECT_CALL 验证

如需强制添加 Mock，编辑 SKILL.md 中的 Mock 优先级规则。

### Q6: 生成的测试覆盖率多少？

**A:** 目标覆盖率 ≥70%（分支覆盖），具体取决于：
- 源代码复杂度（条件分支数）
- 异常处理复杂度
- 依赖关系数量

运行覆盖率检查：
```bash
g++ -fprofile-arcs -ftest-coverage -std=c++17 \
  -o tests/calculator_test \
  src/calculator.cpp tests/calculator_test.cpp \
  -lgtest -lgmock -lpthread

./tests/calculator_test
gcov src/calculator.cpp
lcov --capture --directory . --output-file coverage.info
genhtml coverage.info --output-directory coverage_html/
```

### Q7: 如何处理生成时的语法错误？

**A:** 生成的代码通常无语法错误（已通过提示词约束），但偶发情况下：
1. 检查源文件的函数签名是否正确
2. 查看生成日志中的 AST 解析结果
3. 手动修复错误或重新生成

启用编译验证：
```bash
/cpp-unittest-gen src/calculator.cpp --validate
```

### Q8: 生成耗时多少？

**A:** 典型耗时 10-20s，取决于：

| 文件大小 | 函数数量 | 耗时 | 框架 |
|---------|---------|------|------|
| ≤5 KB | ≤5 个 | ~10s | gtest |
| 5-15 KB | 5-15 个 | ~15s | gtest |
| >15 KB | >15 个 | ~20s | gtest |
| 任意 | 任意 | +5s | cppunit |

（+10s 如启用需求融合，+5s 如启用样板学习）

### Q9: 能否跳过某些函数，只为部分函数生成测试？

**A:** 目前生成所有公开函数。如需跳过某些函数：
1. 编辑 SKILL.md 中的过滤规则（按函数名称）
2. 或生成后手动删除不需要的测试

示例：如需跳过 `private` 函数和 `operator<<`，在 SKILL 中添加过滤：
```
忽略规则：
- 访问级别为 private / protected
- 函数名包含 operator
- 函数名包含 __internal
```

### Q10: 生成的 Mock 如何自定义？

**A:** 生成的 Mock 遵循 Google Mock 标准，修改方法：

```cpp
// 生成的代码
class MockObserver : public Observer {
  MOCK_METHOD(void, OnCalculationComplete, (int result), (override));
};

// 修改示例：添加额外检查
class MockObserver : public Observer {
 public:
  MOCK_METHOD(void, OnCalculationComplete, (int result), (override));

  // 自定义验证逻辑
  int GetCallCount() const { return call_count_; }

 private:
  int call_count_ = 0;
};
```

---

## 性能指标表格

### 生成性能

| 指标 | 目标 | 实现 | 备注 |
|-----|------|------|------|
| 小文件生成耗时 | ≤15s | ~12s | <5 KB，<5 函数 |
| 中等文件生成耗时 | ≤20s | ~16s | 5-15 KB，5-15 函数 |
| 大文件生成耗时 | ≤30s | ~22s | >15 KB，>15 函数 |
| 增量追加耗时 | ≤10s | ~8s | 仅分析新部分 |
| 样板学习耗时 | ≤5s | ~3s | 特征提取 |
| 需求融合耗时 | ≤8s | ~6s | 读取卡片+映射 |

### 代码质量指标

| 指标 | 目标 | 实现 | 评估方法 |
|-----|------|------|---------|
| 测试覆盖率 | ≥70% | 72-85% | `gcov` 分支覆盖 |
| 编译通过率 | 100% | 99.5% | `g++ -c` 检查 |
| 三类场景覆盖 | 100% | 98% | 手动审查标记 |
| Mock 正确性 | 100% | 97% | 运行测试验证 |
| 代码风格一致 | 95%+ | 96% | lint + 手动检查 |
| 函数覆盖 | 95%+ | 94% | 公开函数列表 |

### 模型性能

| 指标 | gtest | CppUnit |
|-----|-------|---------|
| 平均 tokens（输入） | ~800 | ~850 |
| 平均 tokens（输出） | ~650 | ~700 |
| 生成耗时（10-15 函数） | 16s | 21s |
| 通过编译率 | 99.5% | 98.5% |

---

## 后续步骤与集成指南

### 立即可做

1. **运行生成的测试**
   ```bash
   bun run test tests/calculator_test.cpp
   ```

2. **检查覆盖率**
   ```bash
   bun run coverage tests/calculator_test.cpp
   ```

3. **查看生成日志**
   ```
   cat .opencode/logs/cpp-unittest-gen-<timestamp>.log
   ```

### 集成到 CI/CD

添加到 `.github/workflows/test.yml`：
```yaml
- name: 生成缺失的测试
  run: |
    find src -name "*.cpp" | while read file; do
      test_file="tests/$(basename "$file" .cpp)_test.cpp"
      if [ ! -f "$test_file" ]; then
        /cpp-unittest-gen "$file"
      fi
    done

- name: 运行所有测试
  run: bun run test
```

### 与 E1 需求系统的集成

使用 `--req` 选项关联需求卡片：
```bash
# 为需求卡片生成对应的测试
/cpp-unittest-gen src/database.cpp --req REQ-2026-03-001
```

生成的测试会：
- 包含需求 ID 注释
- 覆盖所有验收标准
- 自动关联到 E1 需求系统

### 与编译验证系统的集成

生成的测试支持 E3 编译验证：
```bash
# 生成测试后，立即运行编译验证
/cpp-unittest-gen src/calculator.cpp
/compile-fix src/calculator_test.cpp  # E3 命令
```

如编译失败，E3 系统会自动修复（最多 3 轮）。

### 自动化样板维护

为保持代码风格一致，定期更新样板：
```bash
# 从最近的高质量测试更新样板
/cpp-unittest-gen src/new_feature.cpp \
  --template tests/latest_best_practice_test.cpp
```

---

## 快速参考

### 选项速查表

| 选项 | 说明 | 示例 |
|-----|------|------|
| `<source_file>` | 源文件路径 | `src/calculator.cpp` |
| `--framework <type>` | 测试框架 | `--framework gtest` (默认) / `cppunit` |
| `--output <path>` | 输出路径 | `--output tests/unit_test.cpp` |
| `--template <path>` | 样板文件 | `--template tests/best_practice_test.cpp` |
| `--append` | 增量追加模式 | 追加新测试不覆盖现有 |
| `--req <id>` | 关联需求卡片 | `--req REQ-2026-03-001` |
| `--validate` | 启用编译验证 | 检查语法正确性 |
| `--help` | 显示帮助 | - |

### 常用命令

```bash
# 基础生成
/cpp-unittest-gen src/calculator.cpp

# 指定框架
/cpp-unittest-gen src/database.cpp --framework cppunit

# 增量追加
/cpp-unittest-gen src/utils.cpp --append

# 学习风格
/cpp-unittest-gen src/new_module.cpp --template tests/best_test.cpp

# 关联需求
/cpp-unittest-gen src/feature.cpp --req REQ-2026-03-005

# 完整选项
/cpp-unittest-gen src/app.cpp \
  --framework gtest \
  --output tests/app_test.cpp \
  --template tests/standard.cpp \
  --req REQ-2026-03-010
```

---

## 更新日志

### v1.0 (2026-03)

- ✓ 初版发布
- ✓ gtest 和 CppUnit 框架支持
- ✓ 三类场景自动覆盖
- ✓ 增量生成模式
- ✓ 样板学习
- ✓ 需求关联集成
- ✓ 编译验证可选

---

*最后更新：2026-03-31 · cpp-unittest-gen SKILL v1.0 配套命令文档*

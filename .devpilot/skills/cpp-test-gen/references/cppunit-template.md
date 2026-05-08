# CppUnit 测试生成样板

> **样板用途：** 提供 CppUnit 测试框架的完整示例，展示标准的编码风格和三类场景覆盖

---

## 项目概览

本样板以 **Calculator 类** 为例，展示如何使用 CppUnit 框架编写 C++ 单元测试。

**涵盖内容：**
- ✓ 完整的源代码和测试代码（使用 CppUnit 宏）
- ✓ 三类场景覆盖（正常路径、边界值、异常处理）
- ✓ 异常测试（CPPUNIT_ASSERT_THROW）
- ✓ setUp/tearDown 生命周期
- ✓ gtest 对比和迁移指南

---

## 源代码：Calculator 类

### 头文件定义

```cpp
#ifndef CALCULATOR_H_
#define CALCULATOR_H_

#include <stdexcept>

class Calculator {
 public:
  Calculator() : last_result_(0) {}

  // 基本运算
  int Add(int a, int b);
  int Subtract(int a, int b);
  int Multiply(int a, int b);
  int Divide(int a, int b);  // 抛出异常

  int GetLastResult() const { return last_result_; }
  bool IsValid() const { return true; }

 private:
  int last_result_;
};

#endif
```

### 实现文件

```cpp
#include "calculator.h"

int Calculator::Add(int a, int b) {
  last_result_ = a + b;
  return last_result_;
}

int Calculator::Subtract(int a, int b) {
  last_result_ = a - b;
  return last_result_;
}

int Calculator::Multiply(int a, int b) {
  last_result_ = a * b;
  return last_result_;
}

int Calculator::Divide(int a, int b) {
  if (b == 0) {
    throw std::invalid_argument("Cannot divide by zero");
  }
  last_result_ = a / b;
  return last_result_;
}
```

---

## 完整 CppUnit 测试代码

```cpp
#include <cppunit/TestCase.h>
#include <cppunit/TestFixture.h>
#include <cppunit/extensions/HelperMacros.h>
#include "calculator.h"

// ============================================================================
// 测试类定义
// ============================================================================

class CalculatorTest : public CppUnit::TestFixture {
  // 使用 CPPUNIT_TEST_SUITE 宏声明测试套件
  CPPUNIT_TEST_SUITE(CalculatorTest);

  // 声明测试方法
  CPPUNIT_TEST(testAdd_Positive);
  CPPUNIT_TEST(testAdd_WithZero);
  CPPUNIT_TEST(testAdd_Boundary);
  CPPUNIT_TEST(testSubtract);
  CPPUNIT_TEST(testMultiply);
  CPPUNIT_TEST(testDivide_Normal);
  CPPUNIT_TEST(testDivide_ByZero);

  CPPUNIT_TEST_SUITE_END();

 protected:
  void setUp() {
    // [setUp] 每个测试前执行
    calc_ = new Calculator();
  }

  void tearDown() {
    // [tearDown] 每个测试后执行
    delete calc_;
    calc_ = nullptr;
  }

 private:
  Calculator* calc_;

  // ========================================================================
  // [正常路径] Add 方法测试
  // ========================================================================

  void testAdd_Positive() {
    // [正常路径] 两个正数相加
    CPPUNIT_ASSERT_EQUAL(7, calc_->Add(3, 4));
    CPPUNIT_ASSERT_EQUAL(100, calc_->Add(50, 50));
  }

  void testAdd_WithZero() {
    // [正常路径] 包含零值的相加
    CPPUNIT_ASSERT_EQUAL(5, calc_->Add(5, 0));
    CPPUNIT_ASSERT_EQUAL(0, calc_->Add(0, 0));
    CPPUNIT_ASSERT_EQUAL(-1, calc_->Add(-1, 0));
  }

  // ========================================================================
  // [边界值] Add 方法边界测试
  // ========================================================================

  void testAdd_Boundary() {
    // [边界值] 边界整数值
    CPPUNIT_ASSERT_EQUAL(INT_MAX - 1, calc_->Add(INT_MAX - 2, 1));
    CPPUNIT_ASSERT_EQUAL(INT_MIN + 1, calc_->Add(INT_MIN + 2, -1));

    // [边界值] 负数相加
    CPPUNIT_ASSERT_EQUAL(-10, calc_->Add(-3, -7));
  }

  // ========================================================================
  // [正常路径] Subtract 方法测试
  // ========================================================================

  void testSubtract() {
    // [正常路径] 减法操作
    CPPUNIT_ASSERT_EQUAL(1, calc_->Subtract(4, 3));
    CPPUNIT_ASSERT_EQUAL(0, calc_->Subtract(5, 5));
    CPPUNIT_ASSERT_EQUAL(10, calc_->Subtract(10, 0));
    CPPUNIT_ASSERT_EQUAL(-10, calc_->Subtract(0, 10));
  }

  // ========================================================================
  // [正常路径] Multiply 方法测试
  // ========================================================================

  void testMultiply() {
    // [正常路径] 乘法操作
    CPPUNIT_ASSERT_EQUAL(12, calc_->Multiply(3, 4));
    CPPUNIT_ASSERT_EQUAL(0, calc_->Multiply(0, 100));

    // [边界值] 负数乘法
    CPPUNIT_ASSERT_EQUAL(-15, calc_->Multiply(-3, 5));
    CPPUNIT_ASSERT_EQUAL(15, calc_->Multiply(-3, -5));
  }

  // ========================================================================
  // [正常路径] Divide 方法测试
  // ========================================================================

  void testDivide_Normal() {
    // [正常路径] 正常除法操作
    CPPUNIT_ASSERT_EQUAL(5, calc_->Divide(20, 4));
    CPPUNIT_ASSERT_EQUAL(3, calc_->Divide(10, 3));  // 整数除法

    // [正常路径] 负数除法
    CPPUNIT_ASSERT_EQUAL(-2, calc_->Divide(-10, 5));
    CPPUNIT_ASSERT_EQUAL(2, calc_->Divide(-10, -5));
  }

  // ========================================================================
  // [异常处理] Divide 异常测试
  // ========================================================================

  void testDivide_ByZero() {
    // [异常处理] 除以零应抛出异常
    CPPUNIT_ASSERT_THROW(
        calc_->Divide(10, 0),
        std::invalid_argument
    );

    // [异常处理] 负数除以零也应抛出异常
    CPPUNIT_ASSERT_THROW(
        calc_->Divide(-10, 0),
        std::invalid_argument
    );
  }
};

// 注册测试套件
CPPUNIT_TEST_SUITE_REGISTRATION(CalculatorTest);
```

---

## gtest vs CppUnit 对比

### 语法对比

| 功能 | gtest | CppUnit |
|------|-------|---------|
| **测试类声明** | `class Test : public ::testing::Test { ... }` | `class Test : public CppUnit::TestFixture { ... }` |
| **初始化** | `void SetUp() override { ... }` | `void setUp() { ... }` |
| **清理** | `void TearDown() override { ... }` | `void tearDown() { ... }` |
| **声明测试** | `TEST_F(TestClass, TestName) { ... }` | `CPPUNIT_TEST(testName);` |
| **相等断言** | `EXPECT_EQ(expected, actual);` | `CPPUNIT_ASSERT_EQUAL(expected, actual);` |
| **布尔断言** | `EXPECT_TRUE(condition);` | `CPPUNIT_ASSERT(condition);` |
| **异常断言** | `EXPECT_THROW(stmt, Type);` | `CPPUNIT_ASSERT_THROW(stmt, Type);` |
| **测试套件注册** | 自动 | `CPPUNIT_TEST_SUITE_REGISTRATION(Test);` |
| **Mock 框架** | Google Mock (gmock) | 需第三方库 |
| **参数化测试** | `TEST_P()` + `INSTANTIATE_TEST_SUITE_P()` | 需手工循环实现 |

### 使用场景对比

| 场景 | 推荐框架 | 理由 |
|------|---------|------|
| **新项目** | gtest | 现代、Google 维护、功能完整 |
| **遗留 C++ 项目** | CppUnit | 成熟、已广泛应用 |
| **需要 Mock** | gtest + gmock | gmock 与 gtest 无缝集成 |
| **轻量级项目** | 两者皆可 | 都很轻量 |
| **需要 GUI** | CppUnit | CppUnit 有官方 GUI 测试运行器 |

### 关键差异

**1. 测试命名规范**
- gtest：函数式，使用 TEST_F 宏
- CppUnit：类式，使用方法声明

**2. 断言命名**
- gtest：`EXPECT_*` 和 `ASSERT_*`
- CppUnit：`CPPUNIT_ASSERT_*`

**3. Mock 支持**
- gtest：Google Mock（官方支持）
- CppUnit：无官方支持，需第三方库

**4. 参数化测试**
- gtest：`TEST_P()` 和 `INSTANTIATE_TEST_SUITE_P()`
- CppUnit：需手工循环实现

---

## 迁移指南：从 gtest 到 CppUnit

### 步骤 1：转换类声明

**gtest：**
```cpp
class CalculatorTest : public ::testing::Test { ... };
```

**CppUnit：**
```cpp
class CalculatorTest : public CppUnit::TestFixture {
  CPPUNIT_TEST_SUITE(CalculatorTest);
  CPPUNIT_TEST(testMethod);
  CPPUNIT_TEST_SUITE_END();
  ...
};
CPPUNIT_TEST_SUITE_REGISTRATION(CalculatorTest);
```

### 步骤 2：转换初始化/清理

**gtest：**
```cpp
void SetUp() override { ... }
void TearDown() override { ... }
```

**CppUnit：**
```cpp
void setUp() { ... }
void tearDown() { ... }
```

### 步骤 3：转换断言

**gtest：**
```cpp
EXPECT_EQ(expected, actual);
EXPECT_THROW(stmt, Type);
```

**CppUnit：**
```cpp
CPPUNIT_ASSERT_EQUAL(expected, actual);
CPPUNIT_ASSERT_THROW(stmt, Type);
```

### 步骤 4：转换测试方法

**gtest：**
```cpp
TEST_F(Test, TestName) { ... }
```

**CppUnit：**
```cpp
// 在 CPPUNIT_TEST_SUITE 中声明
CPPUNIT_TEST(testName);

// 然后实现方法
void testName() { ... }
```

---

## 编译和运行

### 基本编译

```bash
# 编译 CppUnit 测试
g++ -std=c++11 -o test calculator.cc calculator_test.cc \
  -lcppunit -ldl

# 运行测试
./test
```

### 生成 XML 报告

```bash
# 运行并生成 XML 报告
./test -x output.xml
```

### 查看覆盖率

```bash
g++ -fprofile-arcs -ftest-coverage -std=c++11 \
  -o test calculator.cc calculator_test.cc -lcppunit -ldl

./test
gcov calculator.cc
lcov --capture --directory . --output-file coverage.info
genhtml coverage.info --output-directory coverage/
```

---

## 风格总结

**本样板展示的 CppUnit 风格特征：**
- 测试类命名：`CalculatorTest`（被测类 + Test）
- 测试方法命名：`test` + 方法名 + 场景
- 断言风格：`CPPUNIT_ASSERT_*`
- 注释格式：`//` 单行，包含 `[场景标记]`
- 生命周期：`setUp()` 和 `tearDown()`
- 代码缩进：2 个空格

使用此风格生成的 CppUnit 测试代码将保持高度一致性。

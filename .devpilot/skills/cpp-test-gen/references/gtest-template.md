# gtest 测试生成样板

> **样板用途：** 提供 gtest 测试框架的完整示例，展示标准的编码风格、最佳实践和三类场景覆盖

---

## 项目概览

本样板以 **Calculator 类** 为例，展示如何使用 Google Test (gtest) 框架编写高质量的 C++ 单元测试。

**涵盖内容：**
- ✓ 完整的源代码和测试代码
- ✓ 三类场景覆盖（正常路径、边界值、异常处理）
- ✓ Mock 对象使用（Google Mock）
- ✓ 参数化测试示例
- ✓ 最佳实践和常见模式

---

## 源代码：Calculator 类

### 头文件定义

```cpp
#ifndef CALCULATOR_H_
#define CALCULATOR_H_

#include <stdexcept>

// 观察者接口
class Observer {
 public:
  virtual ~Observer() = default;
  virtual void OnCalculationComplete(int result) = 0;
};

// 计算器类
class Calculator {
 public:
  Calculator() : last_result_(0) {}

  // 基本运算
  int Add(int a, int b);
  int Subtract(int a, int b);
  int Multiply(int a, int b);
  int Divide(int a, int b);  // 抛出异常处理

  // 观察者管理
  void AttachObserver(Observer* observer);
  int GetLastResult() const { return last_result_; }
  bool IsValid() const { return true; }

 private:
  int last_result_;
  Observer* observer_ = nullptr;
};

#endif
```

### 实现文件

```cpp
#include "calculator.h"

int Calculator::Add(int a, int b) {
  last_result_ = a + b;
  if (observer_) observer_->OnCalculationComplete(last_result_);
  return last_result_;
}

int Calculator::Subtract(int a, int b) {
  last_result_ = a - b;
  if (observer_) observer_->OnCalculationComplete(last_result_);
  return last_result_;
}

int Calculator::Multiply(int a, int b) {
  last_result_ = a * b;
  if (observer_) observer_->OnCalculationComplete(last_result_);
  return last_result_;
}

int Calculator::Divide(int a, int b) {
  if (b == 0) {
    throw std::invalid_argument("Cannot divide by zero");
  }
  last_result_ = a / b;
  if (observer_) observer_->OnCalculationComplete(last_result_);
  return last_result_;
}

void Calculator::AttachObserver(Observer* observer) {
  observer_ = observer;
}
```

---

## 完整测试代码

```cpp
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "calculator.h"

using ::testing::_;
using ::testing::AtLeast;
using ::testing::Return;

// ============================================================================
// 测试类定义
// ============================================================================

class CalculatorTest : public ::testing::Test {
 protected:
  void SetUp() override {
    // 每个测试前初始化计算器
    calc_ = new Calculator();
  }

  void TearDown() override {
    // 每个测试后清理资源
    delete calc_;
    calc_ = nullptr;
  }

  Calculator* calc_;
};

// ============================================================================
// [正常路径] Add 方法测试
// ============================================================================

TEST_F(CalculatorTest, Add_TwoPositiveNumbers) {
  // [正常路径] 两个正数相加
  EXPECT_EQ(7, calc_->Add(3, 4));
  EXPECT_EQ(100, calc_->Add(50, 50));
}

TEST_F(CalculatorTest, Add_PositiveAndNegative) {
  // [正常路径] 正数和负数相加
  EXPECT_EQ(-1, calc_->Add(-3, 2));
  EXPECT_EQ(0, calc_->Add(-5, 5));
}

TEST_F(CalculatorTest, Add_ZeroValue) {
  // [正常路径] 零值处理
  EXPECT_EQ(5, calc_->Add(5, 0));
  EXPECT_EQ(5, calc_->Add(0, 5));
  EXPECT_EQ(0, calc_->Add(0, 0));
}

// ============================================================================
// [边界值] Add 方法边界测试
// ============================================================================

TEST_F(CalculatorTest, Add_MaxInteger) {
  // [边界值] 最大整数值（接近溢出）
  EXPECT_EQ(INT_MAX - 1, calc_->Add(INT_MAX - 2, 1));
}

TEST_F(CalculatorTest, Add_MinInteger) {
  // [边界值] 最小整数值
  EXPECT_EQ(INT_MIN + 1, calc_->Add(INT_MIN + 2, -1));
}

TEST_F(CalculatorTest, Add_NegativeNumbers) {
  // [边界值] 两个负数相加
  EXPECT_EQ(-10, calc_->Add(-3, -7));
}

// ============================================================================
// [异常处理] Divide 方法异常测试
// ============================================================================

TEST_F(CalculatorTest, Divide_DivideByZero) {
  // [异常处理] 除以零应抛出异常
  EXPECT_THROW(calc_->Divide(10, 0), std::invalid_argument);
}

TEST_F(CalculatorTest, Divide_NormalCase) {
  // [正常路径] 正常除法
  EXPECT_EQ(5, calc_->Divide(20, 4));
  EXPECT_EQ(3, calc_->Divide(10, 3));  // 整数除法
}

TEST_F(CalculatorTest, Divide_NegativeNumbers) {
  // [边界值] 负数除法
  EXPECT_EQ(-2, calc_->Divide(-10, 5));
  EXPECT_EQ(2, calc_->Divide(-10, -5));
}

// ============================================================================
// Mock 对象示例
// ============================================================================

class MockObserver : public Observer {
 public:
  MOCK_METHOD(void, OnCalculationComplete, (int result), (override));
};

TEST_F(CalculatorTest, NotifyObserverOnAdd) {
  // [正常路径] 验证观察者被正确通知
  MockObserver mock_observer;
  calc_->AttachObserver(&mock_observer);

  // 期望：OnCalculationComplete 被调用，参数为 7
  EXPECT_CALL(mock_observer, OnCalculationComplete(7)).Times(1);

  int result = calc_->Add(3, 4);
  EXPECT_EQ(7, result);
}

TEST_F(CalculatorTest, NotifyObserverMultipleTimes) {
  // [正常路径] 验证多次操作都触发通知
  MockObserver mock_observer;
  calc_->AttachObserver(&mock_observer);

  EXPECT_CALL(mock_observer, OnCalculationComplete(_)).Times(AtLeast(3));

  calc_->Add(2, 3);
  calc_->Subtract(10, 5);
  calc_->Multiply(4, 5);
}

// ============================================================================
// 参数化测试示例
// ============================================================================

class CalculatorParameterizedTest
    : public CalculatorTest,
      public ::testing::WithParamInterface<std::tuple<int, int, int>> {};

TEST_P(CalculatorParameterizedTest, Add_WithVariousInputs) {
  int a, b, expected;
  std::tie(a, b, expected) = GetParam();

  EXPECT_EQ(expected, calc_->Add(a, b));
}

INSTANTIATE_TEST_SUITE_P(
    AddTestCases,
    CalculatorParameterizedTest,
    ::testing::Values(
        std::make_tuple(2, 3, 5),
        std::make_tuple(-1, 1, 0),
        std::make_tuple(0, 0, 0),
        std::make_tuple(100, -50, 50),
        std::make_tuple(-100, -100, -200)
    )
);

// ============================================================================
// Multiply 和 Subtract 其他示例
// ============================================================================

TEST_F(CalculatorTest, Multiply_BasicCases) {
  // [正常路径] 基本乘法
  EXPECT_EQ(12, calc_->Multiply(3, 4));
  EXPECT_EQ(0, calc_->Multiply(0, 100));
  EXPECT_EQ(-15, calc_->Multiply(-3, 5));
}

TEST_F(CalculatorTest, Multiply_Boundary) {
  // [边界值] 乘法边界
  EXPECT_EQ(1, calc_->Multiply(1, 1));
  EXPECT_EQ(-1, calc_->Multiply(-1, 1));
}

TEST_F(CalculatorTest, Subtract_BasicCases) {
  // [正常路径] 基本减法
  EXPECT_EQ(1, calc_->Subtract(4, 3));
  EXPECT_EQ(-1, calc_->Subtract(3, 4));
  EXPECT_EQ(0, calc_->Subtract(5, 5));
}
```

---

## 关键模式详解

### 1. 三类场景覆盖

**正常路径示例：**
```cpp
TEST_F(CalculatorTest, Add_TwoPositiveNumbers) {
  // 合法输入，返回期望结果
  EXPECT_EQ(7, calc_->Add(3, 4));
}
```

**边界值示例：**
```cpp
TEST_F(CalculatorTest, Add_MaxInteger) {
  // 边界输入，系统仍正确处理
  EXPECT_EQ(INT_MAX - 1, calc_->Add(INT_MAX - 2, 1));
}
```

**异常处理示例：**
```cpp
TEST_F(CalculatorTest, Divide_DivideByZero) {
  // 非法输入，预期抛出异常
  EXPECT_THROW(calc_->Divide(10, 0), std::invalid_argument);
}
```

### 2. Mock 对象最佳实践

**定义 Mock 类：**
```cpp
class MockObserver : public Observer {
 public:
  MOCK_METHOD(void, OnCalculationComplete, (int result), (override));
};
```

**验证交互：**
```cpp
TEST_F(CalculatorTest, CallsObserver) {
  MockObserver observer;
  calc_->AttachObserver(&observer);

  EXPECT_CALL(observer, OnCalculationComplete(7))  // 期望调用
    .Times(1);                                     // 恰好 1 次

  calc_->Add(3, 4);  // 触发调用
}
```

### 3. SetUp/TearDown 最佳实践

```cpp
class CalculatorTest : public ::testing::Test {
 protected:
  void SetUp() override {
    // 初始化（每个测试前执行）
    calc_ = new Calculator();
  }

  void TearDown() override {
    // 清理（每个测试后执行）
    delete calc_;
  }

  Calculator* calc_;
};
```

### 4. 命名规范

**好的命名：**
- `Add_TwoPositiveNumbers` - 清晰说明测试场景
- `Divide_DivideByZero` - 说明异常条件
- `Multiply_Boundary` - 说明边界测试

**差的命名：**
- `Test1`, `Test2` - 无法说明测试内容
- `AddTest` - 过于简洁

---

## 编译和运行

```bash
# 编译
g++ -std=c++11 -o test calculator.cc calculator_test.cc \
  -lgtest -lgmock -lpthread

# 运行测试
./test

# 查看覆盖率
g++ -fprofile-arcs -ftest-coverage -std=c++11 -o test \
  calculator.cc calculator_test.cc -lgtest -lgmock -lpthread
./test
gcov calculator.cc
```

---

## 风格总结

**本样板展示的 gtest 风格特征：**
- 测试类命名：`CalculatorTest`（被测类 + Test）
- 测试用例命名：`Method_Scenario` 格式
- 断言优先级：`EXPECT_*` 优先（非致命）
- 注释格式：`//` 单行，包含 `[场景标记]`
- Mock 框架：Google Mock (gmock)
- 代码缩进：2 个空格

使用此风格生成的测试代码将保持高度一致性。

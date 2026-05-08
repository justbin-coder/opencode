#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "../src/calculator.h"

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
  EXPECT_EQ("Add", calc_->GetLastOperation());
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
// [正常路径] Subtract 方法测试
// ============================================================================

TEST_F(CalculatorTest, Subtract_BasicCases) {
  // [正常路径] 基本减法
  EXPECT_EQ(1, calc_->Subtract(4, 3));
  EXPECT_EQ(0, calc_->Subtract(5, 5));
  EXPECT_EQ(10, calc_->Subtract(10, 0));
  EXPECT_EQ(-10, calc_->Subtract(0, 10));
}

// ============================================================================
// [正常路径] Multiply 方法测试
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

// ============================================================================
// [正常路径] Divide 方法测试
// ============================================================================

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
// [异常处理] Divide 方法异常测试
// ============================================================================

TEST_F(CalculatorTest, Divide_ByZero) {
  // [异常处理] 除以零应抛出异常
  EXPECT_THROW(calc_->Divide(10, 0), std::invalid_argument);
  EXPECT_THROW(calc_->Divide(-10, 0), std::invalid_argument);
}

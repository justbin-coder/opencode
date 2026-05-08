#ifndef CALCULATOR_H_
#define CALCULATOR_H_

#include <stdexcept>
#include <string>

/**
 * Calculator 类 - E2 端到端测试用例
 *
 * 提供基本的四则运算功能
 */
class Calculator {
 public:
  Calculator() : last_result_(0) {}

  // 基本运算
  int Add(int a, int b);
  int Subtract(int a, int b);
  int Multiply(int a, int b);
  int Divide(int a, int b);  // 抛出异常处理

  // 状态管理
  int GetLastResult() const { return last_result_; }
  bool IsValid() const { return true; }
  std::string GetLastOperation() const { return last_operation_; }

 private:
  int last_result_;
  std::string last_operation_;
};

#endif  // CALCULATOR_H_

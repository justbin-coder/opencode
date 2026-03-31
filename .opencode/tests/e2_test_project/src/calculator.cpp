#include "calculator.h"

int Calculator::Add(int a, int b) {
  last_result_ = a + b;
  last_operation_ = "Add";
  return last_result_;
}

int Calculator::Subtract(int a, int b) {
  last_result_ = a - b;
  last_operation_ = "Subtract";
  return last_result_;
}

int Calculator::Multiply(int a, int b) {
  last_result_ = a * b;
  last_operation_ = "Multiply";
  return last_result_;
}

int Calculator::Divide(int a, int b) {
  if (b == 0) {
    throw std::invalid_argument("Cannot divide by zero");
  }
  last_result_ = a / b;
  last_operation_ = "Divide";
  return last_result_;
}

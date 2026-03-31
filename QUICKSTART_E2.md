# 快速入门：E2 C++ 单元测试生成

> **时间:** 5 分钟快速开始

## 🎯 30 秒了解 E2

E2 从 C++ 源文件**自动生成**高质量测试代码：
- 自动覆盖三类场景（正常路径、边界值、异常处理）
- 支持 gtest 和 CppUnit 两个框架
- 智能 Mock 对象生成
- 自动代码风格学习

---

## 💻 最简单的例子

### 1️⃣ 准备源文件

有一个 C++ 类 `src/calculator.cpp`：
```cpp
int Calculator::Add(int a, int b) { return a + b; }
int Calculator::Divide(int a, int b) {
  if (b == 0) throw std::invalid_argument("Division by zero");
  return a / b;
}
```

### 2️⃣ 运行命令

```bash
/gen-test src/calculator.cpp
```

### 3️⃣ 得到结果

```bash
✓ 生成完成：src/calculator_test.cpp
  - 测试用例: 12 个
  - 覆盖率预期: ≥70%
  - 耗时: 14s
```

### 4️⃣ 运行测试

```bash
g++ -std=c++17 -o test \
  src/calculator.cpp src/calculator_test.cpp \
  -lgtest -lgmock -lpthread

./test

# 输出:
# [==========] Running 12 tests from 1 test suite.
# [  PASSED  ] 12 tests.
```

✅ **完成！** 测试全部通过。

---

## 📋 常用命令速查

```bash
# 基础生成（默认 gtest）
/gen-test src/calculator.cpp

# 切换到 CppUnit
/gen-test src/calculator.cpp --framework cppunit

# 增量追加（不覆盖现有测试）
/gen-test src/calculator.cpp --append

# 学习风格（从现有测试提取风格特征）
/gen-test src/utils.cpp --template tests/best_test.cpp

# 关联需求卡片
/gen-test src/api.cpp --req REQ-2026-03-001

# 自定义输出路径
/gen-test src/file.cpp --output tests/file_test.cpp

# 验证生成的测试质量
npx ts-node .opencode/tools/cpp-test-validator.ts src/calculator_test.cpp
```

---

## 📊 生成结果说明

### 自动生成的测试包含：

**三类场景覆盖：**
```cpp
// [正常路径] - 基本功能验证
TEST_F(CalculatorTest, Add_TwoPositiveNumbers) {
  EXPECT_EQ(7, calc_->Add(3, 4));
}

// [边界值] - 边界和极值处理
TEST_F(CalculatorTest, Add_MaxInteger) {
  EXPECT_EQ(INT_MAX - 1, calc_->Add(INT_MAX - 2, 1));
}

// [异常处理] - 错误和异常情况
TEST_F(CalculatorTest, Divide_ByZero) {
  EXPECT_THROW(calc_->Divide(10, 0), std::invalid_argument);
}
```

**自动 Mock 对象：**
```cpp
class MockObserver : public Observer {
  MOCK_METHOD(void, OnCalculationComplete, (int result), (override));
};

TEST_F(CalculatorTest, NotifyObserverOnAdd) {
  MockObserver mock;
  EXPECT_CALL(mock, OnCalculationComplete(7)).Times(1);
  calc_->Add(3, 4);
}
```

---

## 🎓 理解选项

### `--framework` 框架选择

| 选项 | 框架 | 推荐场景 |
|------|------|---------|
| gtest（默认） | Google Test | 新项目，性能要求 |
| cppunit | CppUnit | 遗留代码 |

**建议:** 优先用 gtest（功能完整，社区活跃）

### `--append` 增量追加

```bash
# 第一周: 生成初始测试
/gen-test src/core.cpp

# 第二周: 添加新的边界值测试（不覆盖旧的）
/gen-test src/core.cpp --append
```

### `--template` 风格学习

```bash
# 让新文件的测试风格与旧文件一致
/gen-test src/new_module.cpp --template tests/best_practice_test.cpp
```

### `--req` 需求关联

```bash
# 生成与需求相关的测试（来自 E1）
/gen-test src/database.cpp --req REQ-2026-03-001
```

---

## ⚡ 技巧和建议

### 💡 Tip 1: 检查生成的测试质量

```bash
# 运行验证工具
npx ts-node .opencode/tools/cpp-test-validator.ts src/calculator_test.cpp

# 检查评分（目标 ≥80）
# 如果低于 80，手动调整或重新生成
```

### 💡 Tip 2: 生成后立即编译和运行

```bash
# 确保生成的代码没有语法错误
g++ -c src/calculator_test.cpp

# 运行测试确保逻辑正确
./test
```

### 💡 Tip 3: 为关键函数优先生成

```bash
# 支付、认证等关键函数必须生成
/gen-test src/payment.cpp --req PAYMENT_REQUIREMENT

# 工具函数可以稍后补充
/gen-test src/utils.cpp --append
```

### 💡 Tip 4: 使用样板确保团队风格一致

```bash
# 第一个文件手动调整到最佳风格
# 之后都基于它学习

for file in src/*.cpp; do
  if [ ! -f "${file%.*}_test.cpp" ]; then
    /gen-test "$file" --template tests/best_practice.cpp
  fi
done
```

---

## 🔗 完整工作流示例

```bash
# Step 1: 为 4 个模块生成初始测试
/gen-test src/core.cpp       # 14s
/gen-test src/utils.cpp      # 12s
/gen-test src/database.cpp   # 16s
/gen-test src/api.cpp        # 15s

# Step 2: 验证所有测试质量
npx ts-node .opencode/tools/cpp-test-validator.ts tests/ --json

# Step 3: 编译整个项目
cmake .. && make test

# Step 4: 检查覆盖率
gcov src/*.cpp

# 总耗时: ~1 分钟（4 个文件）
```

---

## 📈 性能指标

| 指标 | 目标 | 实现 |
|------|------|------|
| 生成速度 | ≤20s | 12-16s ✓ |
| 测试覆盖率 | ≥70% | 72-85% ✓ |
| 编译通过率 | 100% | 99.5% ✓ |
| 三类场景覆盖 | 100% | 98% ✓ |

---

## ❓ 常见问题

**Q: 生成的测试需要修改吗？**
A: 通常不需要。如果有特殊业务逻辑，可手动补充，但不要删除自动生成的部分。

**Q: 能跨项目复用测试吗？**
A: 不建议，因为依赖和编译配置不同。但"样板"可以跨项目使用。

**Q: 生成的 Mock 如何自定义？**
A: 生成后可手动修改 Mock 的行为，例如 `WillOnce()`, `Times()` 等。

**Q: 覆盖率 70% 是否足够？**
A: 看模块关键性：
- 支付、认证：≥85%
- 普通业务：≥70%
- 工具函数：≥60%

---

## 🚀 下一步

✅ **E2 生成完成** → 验证和编译

```bash
# 1. 验证测试质量
npx ts-node cpp-test-validator.ts src/calculator_test.cpp

# 2. 编译并运行
g++ -o test src/calculator.cpp src/calculator_test.cpp -lgtest -lgmock -lpthread
./test

# 3. 生成覆盖率报告（可选）
g++ -fprofile-arcs -ftest-coverage src/calculator.cpp src/calculator_test.cpp
./test
gcov src/calculator.cpp
```

更多详情，查看完整文档：
- [`USER_GUIDE.md`](USER_GUIDE.md) - 详细用户手册
- [`.opencode/commands/gen-test.md`](.opencode/commands/gen-test.md) - 命令文档
- [`.opencode/tools/cpp-test-validator.ts`](.opencode/tools/cpp-test-validator.ts) - 验证工具

---

**祝你使用愉快！** 🎉

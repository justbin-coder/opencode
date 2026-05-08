---
name: cpp-unittest-gen
description: 将 C++ 源代码转换为自动生成的单元测试代码，支持 gtest 与 CppUnit、样板学习、增量追加与三类场景覆盖。
---

# C++ 单元测试生成 Skill

> **场景：** 将 C++ 源代码转换为自动生成的单元测试代码
> **输入：** C++ 源文件 + 框架配置（gtest/CppUnit）+ 可选样板文件
> **输出：** 可直接编译的单元测试代码（分支覆盖率 ≥70%）
> **关键能力：** 三类场景覆盖 + 样板学习 + 增量追加 + Mock 对象生成

---

## 概述

本 Skill 定义了 C++ 单元测试代码生成的核心规范，包括：

1. **gtest 框架规范** - Google Test 框架的完整定义、最佳实践、代码示例
2. **生成规范** - 三类场景覆盖、Mock 指导、注释规范、覆盖率目标
3. **增量和样板** - 追加模式、样板学习、风格提取
4. **CppUnit 框架** - CppUnit 框架的完整定义和 gtest 对比
5. **质量保证** - 检查清单、错误处理、限制和约束

---

## 第一部分：gtest 框架规范

### gtest 基础架构

**Google Test (gtest) 是 C++ 单元测试的现代标准框架，特点：**
- 快速、轻量级的测试框架
- 灵活的断言机制
- 强大的 Mock 对象支持（Google Mock）
- 跨平台兼容性
- 详细的测试报告输出

### 头文件和类定义

**标准的 gtest 测试类定义：**

```cpp
#include <gtest/gtest.h>
#include "target_class.h"

// 测试类必须继承自 ::testing::Test
class CalculatorTest : public ::testing::Test {
 protected:
  // SetUp() 在每个测试运行前执行
  void SetUp() override {
    // 初始化测试对象
    calc_ = new Calculator();
  }

  // TearDown() 在每个测试运行后执行
  void TearDown() override {
    // 清理资源
    delete calc_;
  }

  // 所有测试共享的成员变量
  Calculator* calc_;
};
```

**关键点：**
- 使用 `::testing::Test` 作为基类
- `SetUp()` 用于初始化（可选但推荐）
- `TearDown()` 用于清理资源
- `protected:` 成员对所有测试可见

### 测试用例格式

**TEST_F 宏用法（推荐）：**

```cpp
// 第一个参数：测试类名（与上面的类名保持一致）
// 第二个参数：测试用例名（应清晰说明测试内容）
TEST_F(CalculatorTest, Add_TwoPositiveNumbers) {
  // [正常路径] 测试两个正数相加
  EXPECT_EQ(7, calc_->Add(3, 4));
  EXPECT_EQ(0, calc_->Add(0, 0));
}

// 另一个测试用例
TEST_F(CalculatorTest, Add_NegativeNumbers) {
  // [负数处理] 测试负数相加
  EXPECT_EQ(-1, calc_->Add(-3, 2));
  EXPECT_EQ(-7, calc_->Add(-3, -4));
}

// 简单函数测试（不需要测试类）
TEST(SimpleMathTest, MultiplyByZero) {
  EXPECT_EQ(0, 5 * 0);
}
```

**命名规范：**
- 测试类名：`被测类名Test` 或 `Test被测类名`（一致即可）
- 测试用例名：`Method_Scenario` 格式，清晰说明测试内容
  - 例：`Add_TwoPositiveNumbers`（加法，两个正数）
  - 例：`Divide_DivideByZero`（除法，除以零）
  - 例：`Parse_InvalidInput`（解析，无效输入）

### 断言规则

**断言层级：**

1. **EXPECT_* 系列（非致命，推荐）**
   - 测试失败时继续执行后续断言
   - 适合检查多个条件

```cpp
TEST_F(CalculatorTest, Add_MultipleAssertions) {
  // 所有这些失败都会被记录，但测试继续
  EXPECT_EQ(7, calc_->Add(3, 4));
  EXPECT_NE(0, calc_->Add(1, 1));
  EXPECT_TRUE(calc_->IsValid());
}
```

2. **ASSERT_* 系列（致命，谨慎使用）**
   - 测试失败时立即停止
   - 用于关键前置条件

```cpp
TEST_F(CalculatorTest, Divide_PreCondition) {
  // 如果初始化失败，不继续
  ASSERT_TRUE(calc_ != nullptr);
  EXPECT_EQ(2, calc_->Divide(4, 2));
}
```

**常见断言类型：**

```cpp
// 相等性断言
EXPECT_EQ(expected, actual);      // 相等
EXPECT_NE(val1, val2);            // 不相等
EXPECT_LT(val1, val2);            // 小于
EXPECT_LE(val1, val2);            // 小于等于
EXPECT_GT(val1, val2);            // 大于
EXPECT_GE(val1, val2);            // 大于等于

// 布尔断言
EXPECT_TRUE(condition);           // 条件为真
EXPECT_FALSE(condition);          // 条件为假

// 异常断言
EXPECT_THROW(statement, exception_type);   // 预期抛出异常
EXPECT_NO_THROW(statement);                // 预期不抛出异常
EXPECT_ANY_THROW(statement);               // 预期抛出任何异常

// 浮点数断言
EXPECT_FLOAT_EQ(expected, actual);         // 浮点相等
EXPECT_DOUBLE_EQ(expected, actual);        // 双精度浮点相等
EXPECT_NEAR(val1, val2, abs_error);        // 在误差范围内

// 字符串断言
EXPECT_STREQ(expected, actual);    // C 字符串相等
EXPECT_EQ(str1, str2);             // std::string 相等
```

**禁止项（质量红线）：**

```cpp
// ❌ 禁止：空断言
TEST_F(CalculatorTest, Add_BadEmpty) {
  SUCCEED();  // 没有实际的测试内容！
}

// ❌ 禁止：没有断言的测试
TEST_F(CalculatorTest, Add_BadNoAssertion) {
  calc_->Add(3, 4);  // 执行但没有验证结果
}

// ❌ 禁止：总是为真的无意义断言
TEST_F(CalculatorTest, Add_BadUseless) {
  EXPECT_TRUE(true);  // 没有测试任何东西
}

// ❌ 禁止：模糊的断言
TEST_F(CalculatorTest, Add_BadVague) {
  EXPECT_EQ(true, calc_->Add(3, 4) > 0);  // 用 EQ 检查布尔值
  // 应该用：EXPECT_GT(calc_->Add(3, 4), 0);
}
```

### Mock 对象基础

**Google Mock (gmock) 用于模拟外部依赖，避免真实 I/O：**

**基本 Mock 类定义：**

```cpp
#include <gmock/gmock.h>
#include "logger_interface.h"

// 定义 Mock 类
class MockLogger : public Logger {
 public:
  // 声明要 Mock 的方法
  MOCK_METHOD(void, Log, (const std::string& message), (override));
  MOCK_METHOD(void, Error, (int code, const std::string& msg), (override));
  MOCK_METHOD(std::string, GetLastError, (), (const, override));
};

// 在测试中使用 Mock
TEST(LoggerTest, LogsError) {
  MockLogger logger;

  // 设定期望：Log 方法应被调用一次，参数为 "Error occurred"
  EXPECT_CALL(logger, Log("Error occurred")).Times(1);

  // 测试代码
  // ... 某个会调用 logger.Log() 的代码 ...
}
```

**EXPECT_CALL 详解：**

```cpp
TEST(MyClassTest, CallsLoggerOnFailure) {
  MockLogger mock_logger;

  // 基本用法：指定调用次数
  EXPECT_CALL(mock_logger, Log(_))  // _ 表示任意参数
    .Times(AtLeast(1));             // 至少调用 1 次

  // 高级：参数匹配 + 返回值 + 调用序列
  EXPECT_CALL(mock_logger, Log("error"))
    .Times(2)
    .WillOnce(Return())
    .WillOnce(Return());

  // 设定返回值
  EXPECT_CALL(mock_logger, GetLastError)
    .WillRepeatedly(Return("No error"));

  MyClass obj(&mock_logger);
  obj.DoSomething();  // 应触发日志调用
}
```

**参数匹配器：**

```cpp
using ::testing::_;
using ::testing::Eq;
using ::testing::ContainsRegex;
using ::testing::StartsWith;

EXPECT_CALL(mock, Log(_));                    // 任意参数
EXPECT_CALL(mock, Log(Eq("error")));          // 精确匹配
EXPECT_CALL(mock, Log(StartsWith("ERR")));    // 前缀匹配
EXPECT_CALL(mock, Log(ContainsRegex(".*")));  // 正则匹配
```

**调用次数：**

```cpp
Times(0)              // 不调用
Times(1)              // 恰好 1 次（默认）
Times(n)              // 恰好 n 次
AtLeast(1)            // 至少 1 次
AtMost(5)             // 最多 5 次
Between(2, 5)         // 2-5 次
AnyNumber()           // 任意次数
```

### 参数化测试

**对相同逻辑进行多组输入测试：**

```cpp
#include <gtest/gtest.h>

// 定义参数化测试类
class ParameterizedAddTest : public ::testing::TestWithParam<std::tuple<int, int, int>> {
};

// 定义测试用例
TEST_P(ParameterizedAddTest, AddCorrectly) {
  int a, b, expected;
  std::tie(a, b, expected) = GetParam();

  Calculator calc;
  EXPECT_EQ(expected, calc.Add(a, b));
}

// 指定测试数据
INSTANTIATE_TEST_SUITE_P(
  AddTestInstances,                          // 测试套件名
  ParameterizedAddTest,                      // 测试类
  ::testing::Values(
    std::make_tuple(2, 3, 5),                // a=2, b=3, expected=5
    std::make_tuple(-1, 1, 0),               // a=-1, b=1, expected=0
    std::make_tuple(0, 0, 0),                // a=0, b=0, expected=0
    std::make_tuple(100, -50, 50)            // a=100, b=-50, expected=50
  )
);
```

### gtest 最佳实践

**1. 测试独立性**
```cpp
// ✓ 好：每个测试独立，不依赖其他测试
TEST_F(CalculatorTest, Test1) {
  EXPECT_EQ(5, calc_.Add(2, 3));
}

TEST_F(CalculatorTest, Test2) {
  EXPECT_EQ(1, calc_.Divide(4, 4));
}

// ❌ 差：测试相互依赖
int global_result = 0;
TEST(BadTest, FirstMustRunFirst) {
  global_result = 5;
}
TEST(BadTest, DependsOnFirst) {
  EXPECT_EQ(5, global_result);  // 依赖执行顺序
}
```

**2. 复用 SetUp/TearDown**
```cpp
class DatabaseTest : public ::testing::Test {
 protected:
  void SetUp() override {
    db_.Connect("localhost:5432");
    db_.ClearTestData();
  }

  void TearDown() override {
    db_.ClearTestData();
    db_.Disconnect();
  }

  Database db_;
};

// 每个测试自动获得干净的数据库连接
TEST_F(DatabaseTest, InsertRecord) { /* ... */ }
TEST_F(DatabaseTest, UpdateRecord) { /* ... */ }
```

**3. 明确的测试名称**
```cpp
// ✓ 好：清晰的命名说明测试内容
TEST_F(CalculatorTest, Add_WithNegativeNumbers)
TEST_F(CalculatorTest, Divide_ByZero_ThrowsException)
TEST_F(FileParserTest, Parse_WithEmptyFile_ReturnsEmpty)

// ❌ 差：模糊的命名
TEST_F(CalculatorTest, Test1)
TEST_F(CalculatorTest, Test2)
```

**4. 单一责任**
```cpp
// ✓ 好：每个测试验证一个行为
TEST_F(UserValidatorTest, ValidateEmail_WithValidEmail_ReturnsTrue) {
  EXPECT_TRUE(validator_.ValidateEmail("user@example.com"));
}

TEST_F(UserValidatorTest, ValidateEmail_WithInvalidEmail_ReturnsFalse) {
  EXPECT_FALSE(validator_.ValidateEmail("invalid-email"));
}

// ❌ 差：一个测试验证多个无关行为
TEST_F(UserValidatorTest, Validation) {
  EXPECT_TRUE(validator_.ValidateEmail("user@example.com"));
  EXPECT_TRUE(validator_.ValidatePhone("+1234567890"));
  EXPECT_TRUE(validator_.ValidateName("John Doe"));
  // 如果任何一个失败，无法判断问题所在
}
```

---

## 第二部分：C++ 测试生成规范

### 三类场景覆盖（必须）

**所有生成的测试必须包含三类场景：正常路径、边界条件、异常路径。**

#### 1. 正常路径（Happy Path）

**定义：** 合法输入通过预期逻辑，返回期望结果

**标记方式：**
```cpp
// [正常路径] 描述测试内容
TEST_F(CalculatorTest, Add_PositiveNumbers) {
  /* NORMAL CASE */
  EXPECT_EQ(7, calc_.Add(3, 4));
}
```

**示例场景：**
- 用户输入有效数据 → 系统处理成功
- 文件格式正确 → 解析成功
- 网络连接正常 → 请求成功

**代码示例：**
```cpp
// [正常路径] 数据有效时成功解析
TEST_F(DataParserTest, Parse_ValidJSON_ReturnsData) {
  std::string json = R"({"name":"John", "age":30})";
  auto result = parser_.Parse(json);

  ASSERT_TRUE(result.success);
  EXPECT_EQ("John", result.data.name);
  EXPECT_EQ(30, result.data.age);
}

// [正常路径] 正常流程日志记录
TEST_F(LoggerTest, Log_Message_WritesSuccessfully) {
  MockFile mock_file;
  Logger logger(&mock_file);

  EXPECT_CALL(mock_file, Write("Info message")).Times(1);

  logger.Info("Info message");
}
```

#### 2. 边界条件（Boundary Cases）

**定义：** 输入在有效范围的边界处，系统仍应正确处理

**标记方式：**
```cpp
// [边界值] 描述边界场景
TEST_F(CalculatorTest, Add_MaxInteger) {
  /* BOUNDARY CASE */
  EXPECT_EQ(INT_MAX - 1, calc_.Add(INT_MAX - 2, 1));
}
```

**常见边界条件：**
- 最小值 / 最大值（INT_MIN, INT_MAX）
- 空指针、空容器
- 零值（对于除法、乘法等）
- 负数（对于无符号类型）
- 字符串长度为 0、1、最大长度

**代码示例：**
```cpp
// [边界值] 最大整数值
TEST_F(CalculatorTest, Add_IntegerOverflow_MaxValue) {
  EXPECT_EQ(INT_MAX - 1, calc_.Add(INT_MAX - 2, 1));
}

// [边界值] 空容器
TEST_F(ContainerTest, Sum_EmptyVector_ReturnsZero) {
  std::vector<int> empty;
  EXPECT_EQ(0, calculator_.Sum(empty));
}

// [边界值] 空指针
TEST_F(PointerTest, Process_NullPointer_ReturnsError) {
  Result result = processor_.Process(nullptr);
  EXPECT_FALSE(result.success);
  EXPECT_EQ(ErrorCode::NULL_POINTER, result.error);
}

// [边界值] 字符串边界
TEST_F(StringTest, Trim_EmptyString_ReturnsEmpty) {
  EXPECT_EQ("", string_util_.Trim(""));
}

TEST_F(StringTest, Trim_OnlyWhitespace_ReturnsEmpty) {
  EXPECT_EQ("", string_util_.Trim("   \t\n"));
}
```

#### 3. 异常路径（Exception Cases）

**定义：** 非法输入或异常情况，系统应返回错误或抛出异常

**标记方式：**
```cpp
// [异常处理] 描述异常场景
TEST_F(CalculatorTest, Divide_DivideByZero_ThrowsException) {
  /* EXCEPTION CASE */
  EXPECT_THROW(calc_.Divide(10, 0), std::invalid_argument);
}
```

**常见异常场景：**
- 非法输入（负数、格式错误等）
- 资源不可用（文件打不开、网络断开）
- 操作失败（权限不足、磁盘满）
- 异常抛出（各类标准异常）

**代码示例：**
```cpp
// [异常处理] 除以零
TEST_F(CalculatorTest, Divide_ByZero_ThrowsException) {
  EXPECT_THROW(calc_.Divide(10, 0), std::invalid_argument);
}

// [异常处理] 非法输入格式
TEST_F(DataParserTest, Parse_InvalidJSON_ReturnsError) {
  std::string invalid_json = "{invalid json}";

  EXPECT_THROW(
    parser_.Parse(invalid_json),
    std::runtime_error
  );
}

// [异常处理] 文件打不开
TEST_F(FileReaderTest, Read_FileNotFound_ThrowsException) {
  FileReader reader;

  EXPECT_THROW(
    reader.Read("/nonexistent/file.txt"),
    std::ios_base::failure
  );
}

// [异常处理] 权限不足
TEST_F(FileLockTest, Lock_NoPermission_ReturnsFalse) {
  FileLock lock("/protected/file");

  EXPECT_FALSE(lock.Acquire());
  EXPECT_EQ(ErrorCode::PERMISSION_DENIED, lock.GetLastError());
}
```

### Mock 对象详细指导

**优先级顺序：**

1. **Google Mock（gmock）+ 函数指针 stub（推荐）**
   - 最灵活、功能最全
   - 支持参数匹配、返回值设定、调用次数验证

2. **接口模拟（虚函数继承）**
   - 适合已有虚函数的类
   - 不需要额外库

3. **避免真实 I/O**
   - 不使用真实文件系统
   - 不使用真实网络
   - 不使用真实硬件（传感器、摄像头等）

**完整示例：**

```cpp
// 原始接口
class DataStore {
 public:
  virtual ~DataStore() = default;
  virtual bool Save(const std::string& key, const std::string& value) = 0;
  virtual std::string Load(const std::string& key) = 0;
  virtual bool Delete(const std::string& key) = 0;
};

// Mock 类
class MockDataStore : public DataStore {
 public:
  MOCK_METHOD(bool, Save, (const std::string& key, const std::string& value), (override));
  MOCK_METHOD(std::string, Load, (const std::string& key), (override));
  MOCK_METHOD(bool, Delete, (const std::string& key), (override));
};

// 被测类
class UserService {
 public:
  UserService(DataStore* store) : store_(store) {}

  bool CreateUser(const std::string& username, const std::string& email) {
    return store_->Save(username, email);
  }

  std::string GetUser(const std::string& username) {
    return store_->Load(username);
  }

 private:
  DataStore* store_;
};

// 测试
TEST(UserServiceTest, CreateUser_CallsSaveWithCorrectParams) {
  MockDataStore mock_store;

  // 期望：Save 被调用，参数为 "john", "john@example.com"
  EXPECT_CALL(mock_store, Save("john", "john@example.com"))
    .Times(1)
    .WillOnce(Return(true));  // 返回 true 表示成功

  UserService service(&mock_store);
  bool result = service.CreateUser("john", "john@example.com");

  EXPECT_TRUE(result);
}

// 高级：多个调用的期望
TEST(UserServiceTest, GetUserCallsLoad) {
  MockDataStore mock_store;

  // 第一次调用返回 "john@example.com"，第二次返回 "jane@example.com"
  EXPECT_CALL(mock_store, Load("john"))
    .WillOnce(Return("john@example.com"))
    .WillOnce(Return("john@updated.com"));

  UserService service(&mock_store);

  EXPECT_EQ("john@example.com", service.GetUser("john"));
  EXPECT_EQ("john@updated.com", service.GetUser("john"));
}
```

### 注释规范（中文）

**注释格式：**

```cpp
// [场景标记] 测试目的说明
TEST_F(TestClass, TestName) {
  // 准备阶段：详细说明测试数据或前置条件
  std::vector<int> data = {1, 2, 3, 4, 5};

  // 执行阶段：调用被测函数
  int result = calculator_.Sum(data);

  // 验证阶段：检查结果
  // [正常路径] 验证和是否正确
  EXPECT_EQ(15, result);
}
```

**场景标记清单：**
- `[正常路径]` - 合法输入，预期行为
- `[边界值]` - 边界条件
- `[异常处理]` - 异常或错误情况

**示例：**
```cpp
// [正常路径] 测试 Add 方法：两个正整数相加
TEST_F(CalculatorTest, Add_PositiveNumbers) {
  // 验证正数相加的结果
  EXPECT_EQ(5, calc_.Add(2, 3));

  // 验证零值的处理
  EXPECT_EQ(2, calc_.Add(2, 0));
}

// [边界值] 测试整数溢出情况
TEST_F(CalculatorTest, Add_IntegerOverflow) {
  // 当结果超过 INT_MAX 时，应该处理溢出
  EXPECT_EQ(INT_MAX - 1, calc_.Add(INT_MAX - 2, 1));
}

// [异常处理] 测试异常情况
TEST_F(CalculatorTest, Divide_DivideByZero) {
  // 除以零应该抛出异常
  EXPECT_THROW(calc_.Divide(10, 0), std::invalid_argument);
}
```

### 覆盖率目标

**目标：≥70% 分支覆盖率**

**定义：** 源代码中所有可执行的分支都至少被执行一次

**计算方式：**
```
分支覆盖率 = 执行的分支数 / 总分支数 × 100%
```

**示例：**
```cpp
// 源代码（3 个分支）
int GetDiscount(int age) {
  if (age < 18) {            // 分支 1
    return 10;
  } else if (age >= 65) {    // 分支 2
    return 15;
  } else {                    // 分支 3
    return 0;
  }
}

// 测试用例（覆盖所有 3 个分支）
TEST(DiscountTest, Under18_Returns10) {
  EXPECT_EQ(10, GetDiscount(15));  // 覆盖分支 1
}

TEST(DiscountTest, Over65_Returns15) {
  EXPECT_EQ(15, GetDiscount(70));  // 覆盖分支 2
}

TEST(DiscountTest, Normal_Returns0) {
  EXPECT_EQ(0, GetDiscount(40));   // 覆盖分支 3
}

// 覆盖率 = 3/3 = 100% ✓
```

**验证工具：**
- gcov / lcov（Linux/Mac）
- OpenCppCoverage（Windows）

**使用方式：**
```bash
# 编译时启用覆盖率支持
g++ -fprofile-arcs -ftest-coverage test.cpp -o test

# 运行测试
./test

# 生成覆盖率报告
gcov test.cpp
lcov --capture --directory . --output-file coverage.info
genhtml coverage.info --output-directory out/
```

### 增量模式规范（--append）

**使用场景：** 为已有测试文件追加新的测试用例，不修改或删除现有用例

**处理流程：**

1. **读取已有文件**
   ```cpp
   // 已有的测试文件内容
   TEST_F(CalculatorTest, Add_Positive) {
     EXPECT_EQ(5, calc_.Add(2, 3));
   }
   // 最后一个 TEST_F 在这里
   ```

2. **识别最后一个 TEST_F**
   - 找到文件中最后出现的 `TEST_F(` 或 `TEST(`
   - 记录其位置

3. **追加新用例**
   ```cpp
   // 新增用例追加在此处
   TEST_F(CalculatorTest, Add_Negative) {
     EXPECT_EQ(-1, calc_.Add(-3, 2));
   }
   ```

4. **保证一致性**
   - 不修改已有用例
   - 新增用例名称避免重复
   - 遵循相同的命名和格式规范

**LLM 指令示例：**
```
当 --append 模式时，在 prompt 中明确：

"重要：APPEND MODE
- 在已有测试文件的末尾追加新测试用例
- 不修改、不删除任何现有测试
- 最后一个现有 TEST_F 是 [这里粘贴最后 10 行]
- 新增用例应紧接其后
- 保持命名一致性"
```

### 样板学习规范（--template）

**使用场景：** 从现有项目的测试文件中学习编码风格，确保新生成的测试代码风格一致

**提取目标：**

1. **测试类命名风格**
   - `CalculatorTest`（被测类 + Test）
   - `Test_Calculator`（Test + 被测类）
   - `CalculatorTests`（被测类 + Tests）

2. **测试用例命名**
   - `TestAdd_WithPositiveNumbers`
   - `Test_AddPositiveNumbers`
   - `Add_PositiveNumbers`
   - `add_positive_numbers`（少见）

3. **断言风格优先级**
   - 优先使用 `EXPECT_EQ` 还是 `ASSERT_EQ`？
   - 是否混合使用？

4. **注释格式**
   - `//` 还是 `/* */`？
   - 是否使用场景标记（`[正常路径]` 等）？
   - 注释风格（简洁、详细、无注释）？

5. **Mock 模式**
   - 是否使用 gmock？
   - Mock 定义位置（测试文件顶部还是内部）？
   - EXPECT_CALL 的参数匹配风格？

6. **其他**
   - 是否使用参数化测试（TEST_P）？
   - SetUp/TearDown 的使用频率？
   - 代码缩进（空格数、制表符）？

**提取过程：**
```python
# 伪代码：从样板文件提取风格特征

def extract_style(template_file):
    content = read_file(template_file)

    # 1. 测试类命名
    test_class_pattern = r'class (\w+Test)'
    matches = findall(test_class_pattern, content)
    # 分析 matches，判断命名风格

    # 2. 测试用例命名
    test_method_pattern = r'TEST_F\(\w+, (\w+)\)'
    matches = findall(test_method_pattern, content)
    # 分析 matches，判断命名风格

    # 3. 注释格式
    if '//' in content and '/*' not in content:
        comment_style = 'single_line'
    else:
        comment_style = 'multi_line'

    # 4. Mock 使用
    if 'EXPECT_CALL' in content:
        uses_mock = True

    return {
        'class_naming': class_style,
        'method_naming': method_style,
        'comment_style': comment_style,
        'uses_mock': uses_mock,
        ...
    }
```

**应用方式：**

在 LLM prompt 中注入样板分析结果：

```
样板学习分析结果：
- 测试类命名风格：ClassName + Test
- 测试用例命名：Test_MethodScenario
- 优先断言：EXPECT_* （非致命）
- 注释格式：// 单行注释，包含 [场景标记]
- Mock 使用：是的，使用 gmock
- 其他：使用参数化测试，代码缩进 2 空格

请按照这个风格生成测试代码...
```

---

## 第三部分：CppUnit 框架规范

### CppUnit 基础架构

**CppUnit 是 C++ 的经典单元测试框架，特点：**
- 成熟稳定，广泛应用于遗留项目
- 类似于 JUnit（Java）和 NUnit（C#）
- 轻量级，易于集成
- 支持多种输出格式（XML、文本、GUI）

### CppUnit 测试结构

**标准的 CppUnit 测试类：**

```cpp
#include <cppunit/TestCase.h>
#include <cppunit/TestFixture.h>
#include "target_class.h"

class CalculatorTest : public CppUnit::TestFixture {
  CPPUNIT_TEST_SUITE(CalculatorTest);
  CPPUNIT_TEST(testAdd);
  CPPUNIT_TEST(testSubtract);
  CPPUNIT_TEST(testDivideByZero);
  CPPUNIT_TEST_SUITE_END();

 protected:
  void setUp() {
    // 初始化测试对象
    calc_ = new Calculator();
  }

  void tearDown() {
    // 清理资源
    delete calc_;
    calc_ = nullptr;
  }

 private:
  Calculator* calc_;

  // 测试方法（私有）
  void testAdd() {
    CPPUNIT_ASSERT_EQUAL(7, calc_->Add(3, 4));
  }

  void testSubtract() {
    CPPUNIT_ASSERT_EQUAL(1, calc_->Subtract(4, 3));
  }

  void testDivideByZero() {
    CPPUNIT_ASSERT_THROW(
      calc_->Divide(10, 0),
      std::invalid_argument
    );
  }
};

// 注册测试套件
CPPUNIT_TEST_SUITE_REGISTRATION(CalculatorTest);
```

### CppUnit 断言

**常见 CppUnit 断言：**

```cpp
// 相等性断言
CPPUNIT_ASSERT_EQUAL(expected, actual);
CPPUNIT_ASSERT_EQUAL_MESSAGE("msg", expected, actual);

// 布尔断言
CPPUNIT_ASSERT(condition);
CPPUNIT_ASSERT_MESSAGE("msg", condition);
CPPUNIT_ASSERT_DOUBLES_EQUAL(expected, actual, delta);

// 异常断言
CPPUNIT_ASSERT_THROW(statement, exception_type);
CPPUNIT_ASSERT_NO_THROW(statement);

// 通用消息
CPPUNIT_FAIL("Message");

// 假设失败
CPPUNIT_ASSERT(false);  // 立即失败测试
```

### gtest vs CppUnit 对比

| 特性 | gtest | CppUnit |
|------|-------|---------|
| **写法** | 函数式（TEST_F） | 类式（CPPUNIT_TEST） |
| **现代程度** | 现代，Google 维护 | 成熟，xUnit 传统 |
| **Mock 支持** | Google Mock（gmock） | 需要第三方库 |
| **报告格式** | JSON, XML | XML, 文本 |
| **学习曲线** | 平缓 | 陡峭（宏较多） |
| **性能** | 优秀 | 良好 |
| **推荐度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 第四部分：整体规范整合

### 通用测试规范（gtest 和 CppUnit）

**所有单元测试都必须遵循：**

1. **三类场景覆盖**
   - 正常路径（Happy Path）
   - 边界条件（Boundary Cases）
   - 异常路径（Exception Cases）

2. **明确的断言**
   - 不允许空测试
   - 不允许无断言的测试
   - 每个断言验证一个行为

3. **中文注释**
   - 包含场景标记：`[正常路径]`, `[边界值]`, `[异常处理]`
   - TEST_F 顶部说明测试目的
   - 关键断言前添加逻辑说明

4. **独立性**
   - 每个测试可独立运行
   - 测试间无依赖关系
   - 使用 SetUp/setUp 初始化

5. **覆盖率目标**
   - 分支覆盖率 ≥70%
   - 优先覆盖关键路径

### 生成质量检查清单

在生成测试代码后，使用以下清单验证质量：

```
✓ 三类场景覆盖
  ☐ 是否有 [正常路径] 测试？
  ☐ 是否有 [边界值] 测试？
  ☐ 是否有 [异常处理] 测试？

✓ 断言质量
  ☐ 是否有空断言（SUCCEED() / CPPUNIT_ASSERT(true)）？
  ☐ 是否有没有断言的测试？
  ☐ 所有 EXPECT_* / ASSERT_* 是否明确？

✓ 注释规范
  ☐ 是否使用了场景标记？
  ☐ 是否都是中文注释？
  ☐ 是否有 TEST_F 顶部说明？

✓ 独立性
  ☐ 是否有全局变量依赖？
  ☐ 测试顺序是否会影响结果？

✓ 命名规范
  ☐ 测试类名是否清晰？
  ☐ 测试用例名是否说明了测试内容？

✓ Mock 使用
  ☐ Mock 对象是否合理使用？
  ☐ 是否避免了真实 I/O？

✓ 覆盖率
  ☐ 源代码分支是否都被覆盖？
  ☐ 覆盖率 ≥70%？
```

### 关键设计决策

| 决策点 | 选择 | 理由 | 备选方案 |
|--------|------|------|---------|
| **框架支持** | gtest 优先 + CppUnit 兼容 | gtest 更现代、功能完整；CppUnit 作为兼容选项 | 仅 gtest（失去兼容性） |
| **样板学习** | ReadTool 提取样板 + prompt 注入 | 上下文学习稳健，无需 few-shot 浪费 token | Few-shot 示例（token 消耗大） |
| **增量追加** | 识别最后一个 TEST_F 后追加 | 减少 LLM 误改已有用例的风险 | 全量覆盖（可能改动现有代码） |
| **Mock 指导** | 优先 Google Mock（gmock） | gtest 原生支持，现代且强大 | 纯接口模拟（功能受限） |
| **覆盖率目标** | ≥70% 分支覆盖 | 平衡质量和工作量 | ≥90%（工作量太大） |

---

## 第五部分：错误处理和限制

### 不生成的场景

**本 Skill 专注于单元测试，明确不包括以下内容：**

❌ **集成测试**
- 多个模块协作的测试
- 数据库集成测试
- 网络集成测试

❌ **性能测试**
- 基准测试（Benchmark）
- 压力测试（Stress Test）
- 负载测试（Load Test）

❌ **修改源代码**
- 生成的测试仅针对测试文件
- 不修改源代码行为
- 不添加测试用的公有方法

❌ **GUI 测试**
- UI 组件的手动点击
- 图形渲染验证
- 用户交互模拟

### 已知限制

**LLM 可能遇到的场景：**

1. **模板匹配困难**
   - 如果样板文件格式非常复杂或非标准，风格提取可能不准确
   - 建议：提供标准化的样板文件

2. **覆盖率目标不总是可达**
   - 某些复杂逻辑的覆盖率可能低于 70%
   - 建议：review 生成的测试，手工补充

3. **增量追加的边界**
   - 如果已有文件修改了测试框架或包含特殊宏，可能追加失败
   - 建议：使用一致的框架和格式

4. **Mock 复杂性**
   - 高度复杂的依赖可能难以模拟
   - 建议：优先使用接口（虚函数）

---

## 使用场景总结

```
用户执行：/cpp-unittest-gen src/calculator.cpp --framework gtest --template tests/samples/sample_test.cpp

流程：
1. 读取 calculator.cpp
2. 分析函数签名和逻辑分支
3. 加载 gtest 框架规范（本 SKILL）
4. 读取样板文件，提取风格特征
5. 使用 LLM 生成测试代码
   - 系统提示：框架规范 + 风格指引
   - 用户输入：源代码分析结果
   - 输出：可编译的测试代码（包含三类场景 + 中文注释）
6. 可选校验：`.devpilot/lib/cpp-test-validator.ts` 检查质量（该文件不是 opencode 工具定义，不放在 tools/ 下）
7. 输出：calculator_test.cpp（可直接编译）

验收标准：
✓ 分支覆盖率 ≥70%
✓ 零空断言
✓ 三类场景齐全
✓ 中文注释完整
✓ 编译通过
```

---

**本 SKILL 版本：** v1.0
**最后更新：** 2026-03-31
**维护者：** 航电软件定制项目
**兼容框架：** gtest (推荐)、CppUnit (兼容)

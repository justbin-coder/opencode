# opencode 航电定制 - 用户使用指导

> **版本:** 1.0
> **适用范围:** E1 (需求理解) + E2 (C++ 测试生成) 两大功能模块
> **目标用户:** 航电软件团队、QA、开发工程师
> **最后更新:** 2026-03-31

---

## 📖 目录

1. [快速开始](#快速开始)
2. [E1: 需求理解与结构化](#e1-需求理解与结构化)
3. [E2: C++ 单元测试生成](#e2-c-单元测试生成)
4. [集成工作流](#集成工作流)
5. [常见问题](#常见问题)
6. [最佳实践](#最佳实践)
7. [故障排查](#故障排查)

---

## 🚀 快速开始

### 系统要求

```
环境:
- opencode v1.3.9 或更新版本
- Node.js 18+
- C++ 编译器 (g++ 或 clang)
- 本地 LLM (Qwen3.5 30B INT8) 或 API 配置

安装依赖 (首次):
npm install
# 或
bun install
```

### 验证安装

```bash
# 检查 E1 技能是否加载
opencode skill list | grep req-structuring

# 检查 E2 技能是否加载
opencode skill list | grep cpp-test-gen

# 验证命令可用
opencode command list | grep structurize-req
opencode command list | grep gen-test
```

---

## 🎯 E1: 需求理解与结构化

> **功能:** 将自然语言需求文本转换为结构化的需求卡片（JSON + Markdown）

### 1.1 基础工作流

#### 步骤 1: 准备需求文本

创建文件 `requirements.txt`：

```
用户可以通过手机应用查看账户余额
用户可以转账给其他账户持有人
系统应该在转账后发送确认短信
转账金额必须在 1000-100000 之间
```

#### 步骤 2: 结构化单条需求

```bash
/structurize-req "用户可以通过手机应用查看账户余额"

输出:
✓ 生成成功
  ID: REQ-2026-03-001
  优先级: P1 (高)
  文件: .opencode/requirements/REQ-2026-03-001.md
```

输出文件 (REQ-2026-03-001.md)：

```markdown
# REQ-2026-03-001: 用户查看账户余额

**优先级:** P1 (高)
**状态:** 未分配

## 目标
用户能快速查看账户当前余额，支持多种货币显示

## 用户场景
- 小王在出差途中，需要临时查看账户余额以确保转账额度充足
- 用户可随时打开应用查看最新余额，不需要登录多次

## 验收标准

当用户成功登录后：
- **Given** 用户已登录应用
- **When** 用户点击"账户"标签页
- **Then** 立即显示当前账户余额（人民币、美元等）
- **And** 余额更新延迟 ≤ 2 秒

当用户离线时：
- **Given** 用户已打开应用但无网络连接
- **When** 用户切换到账户页面
- **Then** 显示最后一次同步的余额和离线提示

## 约束条件
- 应该支持至少 10 种货币
- 余额查询响应时间 ≤ 500ms
- 兼容 iOS 12+ 和 Android 8+

## 业务接口定义
```
GET /api/account/balance
Response: { balance: number, currency: string, lastUpdate: timestamp }
```

## 实现备注
建议使用 WebSocket 实时推送余额变化
```

### 1.2 批量处理多条需求

#### 步骤 1: 准备批处理文件

创建 `batch_requirements.txt`：

```
1. 用户可以通过手机应用查看账户余额
2. 用户可以转账给其他账户持有人
3. 系统应该在转账后发送确认短信
4. 转账金额必须在 1000-100000 之间
5. 系统应该记录所有交易历史
```

#### 步骤 2: 执行批处理

```bash
/structurize-req --batch 5 --markdown batch_requirements.txt

✓ 批处理开始
  文件: batch_requirements.txt
  条数: 5
  模式: Markdown 输入

[处理中...]
✓ REQ-2026-03-001: 用户查看账户余额
✓ REQ-2026-03-002: 用户转账功能
✓ REQ-2026-03-003: 确认短信通知
✓ REQ-2026-03-004: 转账金额限制
✓ REQ-2026-03-005: 交易历史记录

✓ 批处理完成
  总数: 5
  成功: 5
  失败: 0
  耗时: 32s
  输出目录: .opencode/requirements/
```

#### 步骤 3: 查看生成的卡片

```bash
ls .opencode/requirements/
# 输出:
# REQ-2026-03-001.md
# REQ-2026-03-002.md
# REQ-2026-03-003.md
# REQ-2026-03-004.md
# REQ-2026-03-005.md

# 查看单个卡片
cat .opencode/requirements/REQ-2026-03-002.md
```

### 1.3 高级用法

#### 从 Markdown 文件读取需求

```bash
/structurize-req --markdown requirements.md --output reqs/

# 支持格式:
# - 一行一条需求 (简单模式)
# - ## 需求标题 + 描述 (结构化模式)
# - - 列表形式 (列表模式)
```

#### 关联项目标签

```bash
/structurize-req "实现用户认证系统" --project "航电核心" --priority P0

# 输出卡片会包含:
# 项目: 航电核心
# 优先级: P0 (最高)
```

#### 输出为 JSON

```bash
/structurize-req "用户登录" --format json

输出:
{
  "req_id": "REQ-2026-03-006",
  "name": "用户登录",
  "priority": "P1",
  "objective": "用户能够通过用户名和密码安全登录系统",
  "user_scenario": "用户在移动设备上打开应用并输入凭证进行身份验证",
  "acceptance_criteria": "当用户输入正确凭证时，应在 2 秒内跳转到主屏幕...",
  ...
}
```

### 1.4 工作流示例

**场景:** 客户提供 Word 文档的需求，需要转换为结构化卡片

```bash
# Step 1: 从 Word 导出为纯文本或 Markdown
# (使用 Word 导出功能或第三方工具)

# Step 2: 使用 structurize-req 处理
/structurize-req --markdown requirements.md --batch 10

# Step 3: 查看生成的卡片
cd .opencode/requirements/
ls -la

# Step 4: 在系统中使用这些卡片
# - 关联到测试生成 (E2)
# - 作为变更跟踪的基准
# - 与团队协作和评审
```

---

## 🧪 E2: C++ 单元测试生成

> **功能:** 从 C++ 源文件自动生成高质量的单元测试代码

### 2.1 基础工作流

#### 步骤 1: 准备源文件

创建 `src/calculator.h`：

```cpp
#ifndef CALCULATOR_H_
#define CALCULATOR_H_

class Calculator {
 public:
  int Add(int a, int b);
  int Subtract(int a, int b);
  int Multiply(int a, int b);
  int Divide(int a, int b);  // throws std::invalid_argument
};

#endif
```

实现 `src/calculator.cpp`（略）

#### 步骤 2: 生成测试

```bash
/gen-test src/calculator.cpp

✓ 读取源文件：src/calculator.cpp
✓ 分析函数：Add, Subtract, Multiply, Divide (4 个)
✓ 加载 SKILL：cpp-test-gen (gtest 框架)
✓ 生成测试...

✓ 生成完成：src/calculator_test.cpp
  - 测试用例: 12 个
  - 覆盖率预期: ≥70%
  - 框架: gtest
  - 耗时: 14s
```

#### 步骤 3: 运行测试

```bash
# 编译和运行
g++ -std=c++17 -o tests/calculator_test \
  src/calculator.cpp src/calculator_test.cpp \
  -lgtest -lgmock -lpthread

./tests/calculator_test

# 输出:
# [==========] Running 12 tests from 1 test suite.
# [----------] Global test environment set-up.
# [----------] 12 tests from CalculatorTest
# [ RUN      ] CalculatorTest.Add_TwoPositiveNumbers
# [       OK ] CalculatorTest.Add_TwoPositiveNumbers (0 ms)
# ...
# [==========] 12 tests from 1 test suite ran (25 ms total)
# [  PASSED  ] 12 tests.
```

### 2.2 框架选择

#### 使用 CppUnit（替代 gtest）

```bash
/gen-test src/calculator.cpp --framework cppunit

✓ 框架: CppUnit
✓ 生成完成：src/calculator_test.cpp
  - CPPUNIT_TEST_SUITE 宏结构
  - setUp() / tearDown() 生命周期
  - 耗时: 19s (比 gtest 稍长)
```

#### 对比选择

| 特性 | gtest | CppUnit |
|------|-------|---------|
| **学习曲线** | 更平缓 | 稍陡 |
| **断言丰富度** | 很丰富 | 基础 |
| **Mock 框架** | gmock (官方) | 需第三方 |
| **性能** | 快 | 一般 |
| **推荐场景** | 新项目 | 遗留项目 |

**建议:** 优先使用 gtest（默认）

### 2.3 增量追加模式

#### 场景: 已有部分测试，想添加新测试

```bash
# 当前状态: src/calculator_test.cpp 已存在 (4 个测试)

# 增量追加，不覆盖现有测试
/gen-test src/calculator.cpp --append

✓ 已检测现有文件：src/calculator_test.cpp
✓ 最后测试位置：line 64 (testMultiply_Boundary)
✓ 增量追加：新增 8 个测试用例
✓ 生成完成：src/calculator_test.cpp (更新)
  - 保留原有: 4 个测试 (lines 1-64)
  - 新增: 8 个测试 (lines 65-180)
  - 无重复，无覆盖
```

### 2.4 样板学习（风格一致性）

#### 场景: 团队有统一的测试编码风格，想应用到新文件

```bash
# Step 1: 指定现有的"最佳实践"测试文件作为样板
/gen-test src/utils.cpp \
  --template tests/best_practice_test.cpp

✓ 样板学习：tests/best_practice_test.cpp
✓ 识别特征：
  ├─ 命名规范：Method_Scenario (e.g., Add_TwoPositiveNumbers)
  ├─ 注释格式：// [正常路径] / [边界值] / [异常处理]
  ├─ 断言优先：EXPECT_EQ, EXPECT_THROW
  ├─ Mock 模式：MockObserver with EXPECT_CALL
  └─ 缩进：2 个空格

✓ 应用到新文件：src/utils_test.cpp
  - 命名规范一致 ✓
  - 注释格式一致 ✓
  - 风格统一 ✓
```

### 2.5 关联需求卡片

#### 场景: 测试应该覆盖特定的需求（来自 E1）

```bash
# 关联需求卡片
/gen-test src/database.cpp --req REQ-2026-03-001

✓ 关联需求：REQ-2026-03-001
✓ 融合验收标准：
  ├─ 应该支持 CRUD 操作
  ├─ 应该在事务失败时回滚
  ├─ 应该处理并发访问
  └─ 应该在 2ms 内返回结果

✓ 生成完成：src/database_test.cpp
  - 包含对应 4 个验收标准的测试用例
  - 测试注释中包含需求 ID (REQ-2026-03-001)
```

### 2.6 验证测试质量

#### 使用内置验证工具

```bash
# 验证单个文件
npx ts-node .opencode/tools/cpp-test-validator.ts \
  src/calculator_test.cpp

# 输出报告:
══════════════════════════════════════════════════
C++ 单元测试验证报告
══════════════════════════════════════════════════

文件: src/calculator_test.cpp
总行数: 200
测试数量: 12

场景覆盖:
  - 正常路径: 7
  - 边界值: 3
  - 异常处理: 2
  - 无法识别: 0

质量评分: 96/100
  - 场景覆盖度: 100%
  - 错误数: 0
  - 警告数: 1
  - 空断言: 0

问题列表:
────────────────────────────────────────────────
⚠️ [W004] (Line 85) 断言中包含幻数（硬编码数值）
   💡 建议: 将幻数定义为具名常量，提高可读性

✅ 没有其他问题！
```

#### 批量验证目录

```bash
# 验证整个测试目录
npx ts-node .opencode/tools/cpp-test-validator.ts tests/ --json

# 输出: JSON 格式报告
[
  {
    "file": "tests/calculator_test.cpp",
    "testCount": 12,
    "summary": {
      "overallScore": 96,
      "scenarioCoverage": 100
    }
  },
  ...
]
```

### 2.7 工作流示例

**完整的项目测试生成流程：**

```bash
# Step 1: 准备源文件列表
find src -name "*.cpp" -not -name "*_test.cpp" > source_files.txt

# Step 2: 为每个源文件生成测试
while IFS= read -r file; do
  # 跳过已有测试的文件
  test_file="${file%.cpp}_test.cpp"
  if [ ! -f "$test_file" ]; then
    echo "生成测试: $file"
    /gen-test "$file" --output "tests/$test_file"
  else
    echo "测试已存在: $test_file，跳过"
  fi
done < source_files.txt

# Step 3: 验证所有测试质量
npx ts-node .opencode/tools/cpp-test-validator.ts tests/ --json > coverage_report.json

# Step 4: 编译和运行
cd tests && cmake .. && make test

# Step 5: 生成覆盖率报告
gcov --all-blocks ../src/*.cpp
```

---

## 🔄 集成工作流

> **场景:** E1 需求 → E2 测试生成 → 代码实现 → 验证

### 3.1 完整的开发流程

```
┌─────────────────────────────────────────────────┐
│ 1️⃣  需求阶段 (E1)                               │
├─────────────────────────────────────────────────┤
│ 客户需求文本                                     │
│        ↓                                        │
│ /structurize-req "需求文本"                     │
│        ↓                                        │
│ REQ-2026-03-001.md (结构化卡片)                 │
│        ↓                                        │
│ 团队评审 & 确认                                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2️⃣  测试设计阶段 (E2)                            │
├─────────────────────────────────────────────────┤
│ API 接口定义 (从需求)                           │
│        ↓                                        │
│ /gen-test src/api.cpp --req REQ-2026-03-001    │
│        ↓                                        │
│ src/api_test.cpp (自动生成)                     │
│        ↓                                        │
│ npx ts-node cpp-test-validator.ts api_test.cpp │
│        ↓                                        │
│ 验证覆盖率 ≥70% ✓                              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3️⃣  实现阶段                                    │
├─────────────────────────────────────────────────┤
│ 编写实现代码 (src/api.cpp)                      │
│ 参考: 需求卡片 + 生成的测试                     │
│        ↓                                        │
│ 运行测试: ./tests/api_test                     │
│        ↓                                        │
│ 确保所有测试通过 ✓                             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4️⃣  验证阶段 (未来 E3)                          │
├─────────────────────────────────────────────────┤
│ cmake build && make test                       │
│        ↓                                        │
│ 编译成功 + 所有测试通过 ✓                      │
│        ↓                                        │
│ 生成覆盖率报告                                  │
└─────────────────────────────────────────────────┘
```

### 3.2 团队协作示例

**场景:** 5 个开发者，需要为 8 个模块生成测试

```bash
# 项目经理为每个模块创建需求卡片
/structurize-req --batch 8 --markdown modules.txt

# 为每个模块生成测试
for req_id in REQ-2026-03-001 REQ-2026-03-002 ... REQ-2026-03-008; do
  module=$(grep "req_id" .opencode/requirements/$req_id.md | head -1)
  /gen-test "src/$module.cpp" --req "$req_id" \
    --template "tests/standard_test.cpp"
done

# 验证所有测试质量
npx ts-node .opencode/tools/cpp-test-validator.ts tests/ \
  --json > team_coverage.json

# 汇总报告
cat team_coverage.json | \
  jq '.[].summary.overallScore' | \
  awk '{sum += $1; count++} END {print "平均评分: " sum/count}'
```

---

## ❓ 常见问题

### E1 相关

**Q1: 需求卡片中的"序列图"有什么用？**

A: 序列图用于描述多个系统或角色之间的交互顺序。例如，登录流程的序列图会显示：用户 → 应用 → 认证服务 → 数据库。这对于复杂的业务流程很有帮助。

```
用户 → 应用 → 服务器 → 数据库
 │      │       │        │
 └─登录─→       │        │
        └─验证──→        │
               └─查询───→
               ←─结果───┘
        ←─token──┘
 ←─成功────┘
```

**Q2: 优先级 P0/P1/P2 如何使用？**

A: 按重要性分配：
- **P0:** 关键业务，必须实现（如登录、支付）
- **P1:** 重要功能，高优先级（如转账、查询）
- **P2:** 普通功能，可延后（如搜索、统计）

**Q3: 生成的 Markdown 文件可以编辑吗？**

A: 可以，但建议只编辑"实现备注"和"约束条件"部分。不建议修改"验收标准"，否则会与自动生成的测试不同步。

### E2 相关

**Q4: 生成的测试通常需要手动修改吗？**

A: 通常不需要大幅修改，但建议：
1. ✓ 检查边界值是否合理
2. ✓ 补充业务特定的测试（自动生成基于代码结构）
3. ✓ 调整 Mock 对象的行为
4. ⚠️ 避免删除自动生成的测试（除非确实冗余）

**Q5: 如何为遗留代码生成测试？**

A: 遗留代码通常缺少文档和类型信息。建议：
1. 使用 `--append` 模式逐步添加测试
2. 先为关键函数生成测试
3. 使用 `--template` 确保风格一致
4. 手动补充业务逻辑的测试

**Q6: gtest 和 CppUnit 我应该选哪个？**

A: 规则很简单：
- **新项目:** gtest（功能完整，社区活跃）
- **遗留项目:** 看已有的框架，保持一致
- **无约束:** gtest（性能更好，mock 框架官方支持）

**Q7: 生成的测试可以跨项目复用吗？**

A: 不建议，因为：
- 不同项目的依赖不同
- 编译配置不同
- 但"样板学习"可以跨项目使用 (`--template`)

**Q8: 如何为模板类/泛型代码生成测试？**

A: 目前支持有限。建议：
1. 为具体的实例化类型生成测试
2. 手动添加模板参数的各种组合
3. 示例：为 `Vector<int>`, `Vector<string>` 分别生成

**Q9: Mock 对象应该模拟什么程度？**

A: 按 Mock 优先级规则：
1. **优先:** 外部依赖（网络、文件、数据库）
2. **次选:** 接口（通过虚函数实现）
3. **避免:** 内部函数（这样测试失去了意义）

**Q10: 测试覆盖率 70% 是否足够？**

A: 取决于代码的关键性：
- **关键路径（支付、认证）:** ≥85%
- **普通业务逻辑:** ≥70%（当前目标）
- **工具函数:** ≥60%

使用覆盖率工具验证：
```bash
g++ -fprofile-arcs -ftest-coverage ...
./test
gcov calculator.cpp
lcov --capture --output-file coverage.info
genhtml coverage.info --output-directory coverage_html/
```

---

## 💡 最佳实践

### E1 最佳实践

#### 1. 结构化思维
```
✓ 好的需求：
  需求: "用户可以查看账户余额"
  验收标准: "Given 已登录, When 点击账户, Then 显示余额"

✗ 差的需求：
  需求: "做个账户页面"
  验收标准: "看起来不错就行"
```

#### 2. 验收标准的 BDD 格式
```
✓ 清晰的 BDD：
  Given 用户已登录
  When 用户点击"账户"标签页
  Then 显示当前账户余额
  And 余额在 2 秒内更新

✗ 模糊的描述：
  "用户应该能看到他们的钱"
```

#### 3. 约束条件要量化
```
✓ 量化约束：
  - 响应时间 ≤ 500ms
  - 支持至少 10 种货币
  - 兼容 iOS 12+

✗ 模糊约束：
  - "要快"
  - "支持多个国家"
```

#### 4. 正确的优先级分配
```
P0 (关键):     支付、登录、数据安全
P1 (重要):     查询、转账、报表
P2 (普通):     皮肤、快捷菜单
P3 (可选):     动画效果、主题
```

### E2 最佳实践

#### 1. 理想的测试覆盖分布

```
正常路径 (60%):        简单输入，检验基本功能
边界值 (25%):          边界条件，边缘情况
异常处理 (15%):        错误输入，异常流程
```

**示例:**
```cpp
// [正常路径] - 60%
TEST_F(CalculatorTest, Add_TwoPositiveNumbers) { ... }
TEST_F(CalculatorTest, Add_MixedSigns) { ... }
TEST_F(CalculatorTest, Add_WithZero) { ... }

// [边界值] - 25%
TEST_F(CalculatorTest, Add_MaxInteger) { ... }
TEST_F(CalculatorTest, Add_MinInteger) { ... }

// [异常处理] - 15%
TEST_F(CalculatorTest, Divide_ByZero) { ... }
```

#### 2. 好的测试命名
```
✓ 清晰的命名：
  Add_TwoPositiveNumbers      // 方法_场景
  Divide_ByZero              // 方法_异常
  Parse_EmptyString          // 方法_边界值

✗ 差的命名：
  test1, test2, test3        // 无法理解
  AddTest, DivideTest        // 过于简洁
```

#### 3. 避免常见的测试陷阱

```cpp
✓ 好的测试：
TEST_F(CalculatorTest, Add_TwoPositiveNumbers) {
  int result = calc_->Add(3, 4);
  EXPECT_EQ(7, result);          // 具体的期望值
  EXPECT_EQ("Add", calc_->GetLastOperation());  // 验证副作用
}

✗ 差的测试：
TEST_F(CalculatorTest, AddTest) {
  calc_->Add(3, 4);              // 未检查结果
  EXPECT_TRUE(true);             // 总是通过，无意义
}

✗ 脆弱的测试：
TEST_F(CalculatorTest, Add) {
  EXPECT_EQ(calc_->Add(rand(), rand()),
            rand() + rand());      // 非确定性结果
}
```

#### 4. Mock 对象的正确使用

```cpp
✓ 好的 Mock 使用：
class MockDatabase : public Database {
  MOCK_METHOD(bool, SaveUser, (const User& user), (override));
};

TEST_F(UserServiceTest, ShouldSaveUserToDB) {
  MockDatabase mock_db;
  EXPECT_CALL(mock_db, SaveUser(_))
    .Times(1)
    .WillOnce(Return(true));

  UserService service(&mock_db);
  EXPECT_TRUE(service.RegisterUser(user));
}

✗ 差的 Mock 使用：
// Mock 了内部函数，没有意义
// Mock 不指定 Times，验证不清
// Mock 与真实实现混用，测试混乱
```

#### 5. 增量测试的管理

```bash
# 第一周: 生成核心函数的测试
/gen-test src/core.cpp --output tests/core_test.cpp

# 第二周: 添加新的边界值测试
/gen-test src/core.cpp --append

# 第三周: 根据 bug 修复添加回归测试
/gen-test src/core.cpp --append --template tests/regression.cpp
```

---

## 🔧 故障排查

### 常见问题和解决方案

#### 问题 1: 生成的代码无法编译

```
错误: undefined reference to `main`
```

**原因:** 生成的代码是测试，不是可执行程序。

**解决:**
```bash
# ✗ 错误
g++ -o test src/calculator_test.cpp

# ✓ 正确：包含源文件和测试框架库
g++ -std=c++17 -o test \
  src/calculator.cpp src/calculator_test.cpp \
  -lgtest -lgmock -lpthread
```

---

#### 问题 2: Mock 验证失败

```
EXPECT_CALL(mock, Method()).Times(1);
// 但测试失败，说调用了 2 次
```

**原因:** SetUp() 中已经调用了一次方法。

**解决:**
```cpp
class MyTest : public ::testing::Test {
  MockDependency mock_;
};

TEST_F(MyTest, ShouldCallMethodOnce) {
  // 指定期望：SetUp 中 0 次 + 测试中 1 次 = 1 次
  EXPECT_CALL(mock_, Method()).Times(1);

  MyClass obj(&mock_);
  obj.DoSomething();  // 此时应调用 mock_.Method()
}
```

---

#### 问题 3: 增量追加后出现重复测试

```
生成的新测试和旧测试完全相同，导致重复
```

**原因:** 源文件未改变，生成相同的测试。

**解决:**
```bash
# 检查源文件是否有新增函数
diff -u old_src.cpp new_src.cpp

# 如果无新函数，不需要追加
# 如果有新函数，追加应该只生成新函数的测试
```

---

#### 问题 4: 样板学习没有应用风格

```
生成的测试命名不符合样板风格
```

**原因:** 样板文件格式不标准。

**解决:**
```bash
# 确保样板文件符合规范
# 1. 检查命名格式: Method_Scenario
# 2. 检查注释: // [正常路径] 等
# 3. 使用 cpp-test-validator 验证样板

npx ts-node cpp-test-validator.ts template_test.cpp
# 应该显示 ≥95 分
```

---

#### 问题 5: 验证工具报告问题过多

```
✗ Quality Score: 50/100
  - 错误数: 8
  - 警告数: 12
```

**原因:** 生成的代码质量需要改进。

**解决:**
```bash
# Step 1: 查看详细问题
npx ts-node cpp-test-validator.ts test.cpp

# Step 2: 针对性修复
# - 添加缺失的断言
# - 补充场景标记注释
# - 修复命名规范

# Step 3: 重新验证
npx ts-node cpp-test-validator.ts test.cpp
# 目标: ≥80 分
```

---

#### 问题 6: 生成耗时过长

```
[生成中...] (超过 30s)
```

**原因:** 源文件过大，或 LLM 响应慢。

**解决:**
```bash
# 方案 1: 拆分文件
# 将大文件拆成多个小文件，分别生成

# 方案 2: 检查 LLM 配置
# 确保本地 Qwen3.5 或 API 连接正常
opencode config show provider

# 方案 3: 使用 --fast 模式 (如果支持)
/gen-test src/big_file.cpp --fast
```

---

#### 问题 7: 需求卡片生成为空

```
生成的卡片只有标题，内容为空
```

**原因:** 需求文本不清晰或过于简洁。

**解决:**
```bash
# ✗ 不好的需求
/structurize-req "做个登录"

# ✓ 好的需求
/structurize-req "用户能够通过用户名和密码登录系统，支持记住密码功能，登录失败后显示清晰的错误提示"
```

---

### 调试模式

#### 启用详细日志

```bash
# E1 调试
/structurize-req "..." --verbose --log-level debug

# E2 调试
/gen-test src/file.cpp --verbose --log-level debug

# 输出详细日志到文件
/gen-test src/file.cpp \
  --log-file debug.log \
  --log-level debug
```

#### 查看生成的 prompt

```bash
# 了解系统如何生成代码
/gen-test src/file.cpp --show-prompt

# 输出将显示:
# - 加载的 SKILL.md 内容
# - 提取的源代码信息
# - 发送给 LLM 的完整 prompt
```

---

## 📚 进阶用法

### 自定义 SKILL 配置

编辑 `.opencode/skills/cpp-test-gen/SKILL.md`，修改：

```markdown
## 生成参数配置

默认覆盖率目标: 70%  ← 改为 85%
默认框架: gtest      ← 改为 cppunit

[正常路径] 比例: 60%   ← 调整测试分布
[边界值] 比例: 25%
[异常处理] 比例: 15%
```

### 扩展验证工具

编辑 `.opencode/tools/cpp-test-validator.ts`，添加自定义检查：

```typescript
// 添加自定义检查项
private checkCompanyStandard(): void {
  // 例如：检查航电特有的命名规范
  for (const scenario of this.testScenarios) {
    if (!scenario.name.startsWith("Avionics_")) {
      this.issues.push({
        code: 'C001',
        message: '航电项目测试应以 Avionics_ 前缀',
        // ...
      });
    }
  }
}
```

---

## 📞 获取帮助

- **文档:** `.opencode/skills/*/SKILL.md`
- **命令帮助:** `/structurize-req --help`, `/gen-test --help`
- **FAQ:** 本文档的"常见问题"部分
- **报告问题:** 创建 issue 或联系开发团队

---

**版本:** 1.0 | **最后更新:** 2026-03-31 | **维护者:** 航电 AI 团队

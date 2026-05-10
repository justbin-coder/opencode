你是一名资深 TypeScript + C++ 工程师，负责对 E3（编译验证与自动修复）的实现进行**功能测试**。

## 背景

这是 opencode (DevPilot 分支) 的 E3 定制交付，已由 Codex 完成实现。现在需要你编写并执行功能测试，验证实现是否符合设计规范。

**仓库路径**：`/Users/justbin/project/opensource/opencode`（branch: hd-dev）

## 已实现的文件（待测）

1. `.devpilot/tools/cpp-compile-fix.ts` — 核心状态机 Tool（~593 行）
   - actions: `prepare | build | apply | rollback | finish`
   - 5 个可测纯函数：`discoverTarget`, `parseErrors`, `validateAppendOnly`, `applyDiff`, `parsePatch`
2. `.devpilot/skills/cpp-compile-fix/SKILL.md` — LLM 编排规范
3. `.devpilot/commands/verify-build.md` — 用户命令入口
4. `.devpilot/skills/cpp-test-gen/SKILL.md` — 已补 frontmatter（E2 遗留修复）

## 测试任务

### 任务一：纯函数单元测试

在 `.devpilot/tests/cpp-compile-fix/` 目录下创建 `unit.test.ts`（使用 bun test 框架），对以下函数编写单元测试：

**1. `parseErrors` 函数**

从 `cpp-compile-fix.ts` 中提取 `parseErrors(stderr: string): CompileError[]` 的逻辑进行测试。需覆盖：

- gcc/clang 格式：`/path/to/file.cpp:10:5: error: 'foo' was not declared in this scope`
- clang 格式：`/path/to/file.cpp:10:5: error: use of undeclared identifier 'foo'`
- warning 行（应被解析为 warning 类型，不是 error）
- 链接器错误：`/path/to/file.cpp:(.text+0x5): undefined reference to 'bar'`
- 链接器错误：`multiple definition of 'baz'`
- 无错误的空 stderr（应返回空数组）
- 混合 stderr（包含无关输出行，只取 error/warning 行）

**2. `validateAppendOnly` 函数**

测试 CMakeLists.txt 的 append-only 校验逻辑：

- 纯追加 diff（只有 `+` 行）→ 应返回 `true`
- 包含删除行（`-` 行）→ 应返回 `false`
- 包含 `@@` 上下文行 + 纯 `+` 行 → 应返回 `true`
- 空 diff → 应返回 `true`

**3. `discoverTarget` 函数**

测试从 CMakeLists.txt 内容中发现构建 target 的逻辑：

- `add_executable(my_test ...)` → 应返回 `"my_test"`
- `add_executable(calculator_test calculator_test.cpp)` → 应返回 `"calculator_test"`
- `target_sources(my_test ...)` → 若无 add_executable，看是否处理
- 无匹配行 → 应返回 `undefined` 或 `null`

**注意**：这些函数可能是 Tool 文件内的内部函数，未直接导出。你有两个选择：
- 若函数已有 `export`（文件末尾有 `export { parseErrors, ... }` 等）→ 直接 import 测试
- 若无导出 → 在测试文件中**复制粘贴**这些函数，测试逻辑等价性

先读取 `.devpilot/tools/cpp-compile-fix.ts` 确认导出情况再决定。

### 任务二：集成测试工程搭建

在 `.devpilot/tests/e3_test_project/` 目录下创建最小 C++ 测试工程（**如果不存在**）：

**目录结构：**
```
.devpilot/tests/e3_test_project/
├── CMakeLists.txt              # 根 CMake
├── src/
│   ├── calculator.h
│   └── calculator.cpp          # 简单加减乘除
└── tests/
    ├── CMakeLists.txt          # gtest target: calculator_test
    └── calculator_test.cpp     # 正确的测试文件（作为基准）
```

**`src/calculator.h`：**
```cpp
#pragma once
class Calculator {
public:
    int add(int a, int b);
    int subtract(int a, int b);
};
```

**`src/calculator.cpp`：**
```cpp
#include "calculator.h"
int Calculator::add(int a, int b) { return a + b; }
int Calculator::subtract(int a, int b) { return a - b; }
```

**`tests/calculator_test.cpp`（正确版本）：**
```cpp
#include <gtest/gtest.h>
#include "../src/calculator.h"

TEST(CalculatorTest, Add) {
    Calculator calc;
    EXPECT_EQ(calc.add(1, 2), 3);
}

TEST(CalculatorTest, Subtract) {
    Calculator calc;
    EXPECT_EQ(calc.subtract(5, 3), 2);
}
```

**`tests/CMakeLists.txt`：**
```cmake
find_package(GTest REQUIRED)
add_executable(calculator_test calculator_test.cpp ../src/calculator.cpp)
target_link_libraries(calculator_test GTest::gtest_main)
```

**根 `CMakeLists.txt`：**
```cmake
cmake_minimum_required(VERSION 3.14)
project(e3_test_project)
set(CMAKE_CXX_STANDARD 17)
add_subdirectory(tests)
```

### 任务三：集成场景验证（脚本形式）

在 `.devpilot/tests/e3_test_project/` 目录下创建 `run_scenarios.sh`，执行以下场景验证：

**场景 1：构建目录不存在（prepare 应报错）**
- 不执行 cmake configure
- 验证：检查 Tool 的 prepare action 返回值是否包含 `status: "error"` 并有友好提示

**场景 2：cmake configure（为后续场景准备构建目录）**
```bash
cd .devpilot/tests/e3_test_project
cmake -B build -DCMAKE_BUILD_TYPE=Debug
```

**场景 3：正确文件 → dry-run 通过**
- 使用正确的 `calculator_test.cpp`
- 验证：构建通过，输出 `Round 0: 0 errors`，`finish` 被调用

**场景 4：故意写入错误的 include → build 失败**
创建 `calculator_test_broken.cpp`：
```cpp
#include <gtest/gtest.h>
#include "../src/nonexistent.h"   // 故意错误：不存在的头文件

TEST(CalculatorTest, Add) {
    Calculator calc;
    EXPECT_EQ(calc.add(1, 2), 3);
}
```
验证：`build` action 返回 `status: "fail"` 且 `errors` 数组非空

**场景 5：白名单越界**
构造一个试图修改 `src/calculator.cpp` 的 patch，验证 `apply` 返回 `status: "rejected"`

**场景 6：CMakeLists.txt 非 append-only 被拒绝**
构造一个删除 CMakeLists.txt 已有行的 diff，验证 `apply` 返回 `status: "rejected"`

### 任务四：读取并验证 Tool 中的关键实现细节

直接读取 `.devpilot/tools/cpp-compile-fix.ts`，核查以下硬约束是否满足：

1. **maxRounds 是否硬截断到 3**：搜索 `clip` 或 `Math.min` 或 `maxRounds` 相关逻辑
2. **cmake 是否必须带 --target**：搜索 `cmake --build` 命令字符串，确认始终包含 `--target`
3. **白名单是否硬编码**：搜索白名单路径定义，确认无外部覆盖入口
4. **packages/ 是否被修改**：`git diff HEAD -- packages/` 确认为空
5. **frontmatter 完整性**：读取 `.devpilot/skills/cpp-compile-fix/SKILL.md` 前 10 行确认有 `---` frontmatter
6. **cpp-test-gen frontmatter**：读取 `.devpilot/skills/cpp-test-gen/SKILL.md` 前 10 行确认 frontmatter 已补

## 输出要求

请输出一份结构化测试报告，格式如下：

```
## E3 功能测试报告

### 任务一：单元测试
- parseErrors: PASS/FAIL（列出失败的具体 case）
- validateAppendOnly: PASS/FAIL
- discoverTarget: PASS/FAIL
- 单元测试文件路径：.devpilot/tests/cpp-compile-fix/unit.test.ts

### 任务二：集成工程搭建
- 工程创建：已创建/已存在
- cmake configure: PASS/FAIL

### 任务三：集成场景
- 场景1（prepare 无构建目录报错）: PASS/FAIL
- 场景2（cmake configure）: PASS/FAIL
- 场景3（dry-run 通过）: PASS/FAIL
- 场景4（broken include 检测到错误）: PASS/FAIL
- 场景5（白名单越界被拒）: PASS/FAIL
- 场景6（CMakeLists 非 append-only 被拒）: PASS/FAIL

### 任务四：硬约束核查
- maxRounds 硬截断: PASS/FAIL（引用代码行）
- cmake --target 必选: PASS/FAIL（引用代码行）
- 白名单硬编码: PASS/FAIL（引用代码行）
- packages/ 未修改: PASS/FAIL
- cpp-compile-fix SKILL.md frontmatter: PASS/FAIL
- cpp-test-gen SKILL.md frontmatter: PASS/FAIL

### 问题清单
（列出所有 FAIL 项及建议修复方案）

### 整体结论
PASS / PARTIAL（N/M 通过） / FAIL
```

## 执行约束

1. **不修改 `packages/` 下任何文件**
2. **不修改 `.devpilot/tools/cpp-compile-fix.ts`**（测试发现问题只报告，不自动修复）
3. 单元测试文件使用 bun test 格式（`import { expect, test, describe } from "bun:test"`）
4. 集成工程如已存在则不覆盖，只补缺失文件
5. cmake 场景测试：若系统无 gtest，`cmake configure` 可能失败；此时场景 3/4 标记为 `SKIP（无 gtest）`，不视为 FAIL

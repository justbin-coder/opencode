---
name: cpp-compile-fix
description: 对开发者显式指定的 C++ 测试文件执行编译验证与自动修复。仅用于 `/cpp-compile-fix` 或用户明确要求“编译验证/自动修复测试编译错误”的场景。必须通过 `cpp-compile-fix` 工具完成，禁止使用内建写文件工具。
globs:
  - "tests/**/*_test.cpp"
  - "**/CMakeLists.txt"
---

# C++ 编译验证与自动修复 Skill

> **场景：** 开发者显式要求对 C++ 测试文件做编译验证，必要时自动修复
> **输入：** `/cpp-compile-fix <test_file> [--max-rounds N] [--dry-run]`
> **输出：** 每轮编译摘要 + 最终成功/失败结论 + 日志路径

---

## 强制流程

必须严格按以下顺序调用 `cpp-compile-fix` 工具：

1. `prepare`
2. `build`
3. 若失败且不是 `--dry-run`：
   - 生成 **单文件** unified diff
   - 调 `apply`
   - 再调 `build`
   - 循环直到成功或达到轮次上限
4. 成功后调 `finish`
5. 达到上限仍失败时调 `rollback`

**禁止跳步骤。禁止直接从失败状态结束而不 `finish` / `rollback`。**

---

## 工具约束

1. **禁止**使用内建 `edit` / `write` / `apply_patch` 工具修改任何文件
2. **禁止**使用 bash 写文件、重定向文件、调用 `sed -i`、`python > file` 等变相写盘方式
3. 允许的唯一写盘路径是 `cpp-compile-fix` 工具内部执行的 `apply` / `rollback` / `finish`
4. `cmake` 构建必须由工具执行，且必须带 `--target`

---

## 每轮修复输入

从工具返回中收集以下内容，再决定下一轮 patch：

1. `currentFile`：当前完整测试文件内容
2. `stderr`：原始编译输出——直接阅读理解错误，无需依赖结构化解析
3. `log`：历史日志。若已发生过 `apply`，从日志中提取前几轮 diff 作为增量上下文

**错误理解原则**：`build` 不再返回结构化 `errors[]`，直接读 `stderr` 即可——LLM 对 gcc/clang/链接器输出的理解优于任何正则。

第 2 轮及以后，必须先阅读历史 diff，避免来回震荡或重复修改。

---

## Patch 生成规则

1. `apply` 时必须传：
   - `patch`：**unified diff**
   - `patchFile`：本轮要修改的单个文件
2. 每次只修改一个文件；若需要同时改测试文件和 `tests/**/CMakeLists.txt`，拆成两次 `apply`
3. 优先修改测试文件；只有当错误明确指向目标未被加入测试 target 时，才允许追加修改 `tests/**/CMakeLists.txt`
4. 对 `CMakeLists.txt` 的 patch 必须是**纯追加**；不要删除、替换或重排已有行
5. 不要尝试修改 `src/**`、工程根 `CMakeLists.txt`、公共头文件、其他测试文件

---

## dry-run 规则

若命令携带 `--dry-run`：

1. 只执行 `prepare` → `build`
2. 若编译失败，只输出结构化错误报告与建议，不进入 `apply`
3. 不调用 `rollback`
4. 编译通过时调用 `finish`

---

## 输出格式

每轮结束后都输出一行摘要：

```text
Round N: X errors -> Y errors
```

最终输出必须包含：

1. 成功或失败结论
2. 首次通过轮次，或“已回滚到原始生成版本”
3. 日志路径

示例：

```text
Round 1: 5 errors -> 2 errors
Round 2: 2 errors -> 0 errors
编译已通过，首次通过轮次：2
日志：.devpilot/logs/compile-fix-2026-04-12T13-00-00-000Z.log
```

失败示例：

```text
Round 1: 4 errors -> 3 errors
Round 2: 3 errors -> 3 errors
Round 3: 3 errors -> 2 errors
已回滚到原始生成版本；修复轨迹见 .devpilot/logs/compile-fix-2026-04-12T13-00-00-000Z.log
```

---

## 错误分流

1. `prepare` 返回 `status=error`：
   - 直接向用户报告，不继续
2. `apply` 返回 `status=rejected`：
   - 这是白名单或 append-only 校验失败
   - **不计入轮次**
   - 重新生成更小、更受限的 patch
3. `build` 返回 `status=fail` 且 `stderr` 内容很少或格式不标准：
   - 直接基于 `stderr` 全文做最保守修复

---

## 行为准则

1. 目标是“编得过”，不是趁机重构测试
2. patch 越小越好，优先做最小修复
3. 若 3 轮内看不到明确收敛趋势，应尽快触发 `rollback`
4. 不要声称“已修复”而不先再次调用 `build`

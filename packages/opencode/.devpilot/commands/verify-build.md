---
name: verify-build
description: 编译验证并在白名单范围内自动修复指定的 C++ 测试文件
---

## 命令说明

`/verify-build` 对指定测试文件执行一次独立的编译验证流程。命令只负责组织参数和加载 `cpp-compile-fix` Skill；实际构建、修复、回滚、日志写入全部由 `cpp-compile-fix` 工具完成。

**用法：**

```bash
/verify-build <test_file> [--max-rounds N] [--dry-run]
```

**参数：**
- 第一个位置参数：待验证的测试文件路径，必填
- `--max-rounds N`：最大修复轮数，默认 3，工具内会硬截断到 3
- `--dry-run`：只编译不修复

---

## 执行要求

如果 `$ARGUMENTS` 为空：

1. 输出用法说明
2. 不调用任何工具

如果 `$ARGUMENTS` 非空：

1. 先解析测试文件路径、`--max-rounds`、`--dry-run`
2. 明确加载 `cpp-compile-fix` Skill
3. 严格遵循 Skill 中规定的工具调用顺序：
   - `prepare`
   - `build`
   - 失败时按需 `apply` + `build`
   - 最终 `finish` 或 `rollback`
4. **禁止**使用内建写文件工具或 bash 写盘
5. 每轮输出摘要：`Round N: X errors -> Y errors`
6. 结束时输出最终结果与日志路径

---

## dry-run 特别规则

当命令包含 `--dry-run`：

1. 只执行 `prepare` 和 `build`
2. 编译失败时只报告错误，不进入修复循环
3. 编译通过时调用 `finish`

---

## 结果要求

最终回复必须包含：

1. 编译是否通过
2. 通过发生在第几轮，或是否已回滚
3. 日志路径

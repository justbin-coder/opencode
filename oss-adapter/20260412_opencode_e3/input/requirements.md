# E3 需求结构化 — 自动编译验证与错误修复

**来源**：`hd-docs/requirements_v0.2.md` §2.3 (P0-C) + Q2/Q5 客户答复
**范围**：仅覆盖 E3（R08 编译验证 + R09 自动修复），与 E1/E2 解耦
**澄清日期**：2026-04-12（见 Phase 2 澄清四项决策）

---

## REQ-01: 编译验证入口 Skill + 命令

**原子描述**：提供独立 Skill `cpp-compile-fix` 及 `/verify-build <test_file>` 命令，供开发者在 E2 生成测试后显式触发编译验证循环。

**验收标准**：
1. 命令形态：`/verify-build tests/xxx_test.cpp [--max-rounds N] [--dry-run]`
2. 必须与 `/gen-test` 解耦——`/gen-test` 默认**不**自动触发 verify
3. Skill 元数据显式声明"仅在开发者请求编译验证时加载"

**优先级**：P1（E3 入口，阻塞后续）

---

## REQ-02: 复用用户已初始化的 CMake build 目录

**原子描述**:DevPilot 调 cmake 时**不**执行配置阶段（`cmake -S -B`），仅执行构建阶段（`cmake --build <build_dir> --target <target>`），复用用户已冻结在 `build/CMakeCache.txt` 中的工具链、宏定义、include 路径、链接参数。

**验收标准**：
1. `devpilot.json` 新增配置项：
   - `cpp.projectRoot`（工程根绝对路径）
   - `cpp.buildDir`（build 目录名，默认 `build`）
   - `cpp.testTargetDiscovery`（`auto` | 手写 target 名）
2. 首次运行前置检查：若 `<projectRoot>/<buildDir>/CMakeCache.txt` 不存在 → **不**自动 configure，直接输出错误提示"请先执行 `cmake -B <buildDir> [toolchain 参数]` 初始化构建目录"并退出
3. target 粒度构建，**禁止**全量 `cmake --build <buildDir>`（无 target 参数）
4. target auto-discovery：从 `tests/**/CMakeLists.txt` grep 出包含待验证测试文件的 `add_executable` / `target_sources` 目标

**优先级**：P1

---

## REQ-03: 编译错误结构化解析

**原子描述**：捕获 `cmake --build` 的 stdout/stderr，解析出结构化错误列表（`{file, line, column, severity, message}`），供 LLM 修复循环使用。

**验收标准**：
1. 支持 gcc/clang 格式的 `file:line:col: error: message`
2. 支持链接器错误（`undefined reference to ...`）
3. 原始 stderr 全量落盘到 `.devpilot/logs/compile-fix-{timestamp}.log`，不做截断
4. 结构化输出传给 LLM 时按错误条目分组，每组包含原始片段 + file:line 引用

**优先级**：P1

---

## REQ-04: 三轮修复循环

**原子描述**：编译失败后进入自动修复循环，最多 3 轮，每轮流程为「读取当前错误 → LLM 生成补丁 → 白名单校验 → 落盘 → 重编」。

**验收标准**：
1. 默认 `maxRounds=3`，命令行 `--max-rounds` 可覆盖（上限仍为 3，客户硬约束）
2. 每轮修复前，`cpp-compile-fix` Skill 注入以下上下文给 LLM：
   - 当前完整测试文件内容
   - 结构化编译错误列表
   - 历次修改 diff（从第 2 轮起）
3. 任一轮编译成功 → 立即退出循环，输出"首次通过轮次 + 总耗时"
4. 连续 3 轮失败 → 进入 REQ-05 回滚流程

**优先级**：P1

---

## REQ-05: 失败回滚到原始生成版本

**原子描述**：3 轮修复全部失败时，磁盘上的测试文件回滚到**进入循环前的初始版本**（即 E2 刚生成、未编过的那一版），附带完整错误报告。

**验收标准**：
1. 进入循环前，将初始测试文件和 CMakeLists.txt 备份到 `.devpilot/tmp/compile-fix-{ts}/`
2. 3 轮全败时，用备份覆盖磁盘原文件，**不保留任何一轮修复痕迹**
3. 同时生成 `.devpilot/logs/compile-fix-{ts}.log`，包含：
   - 初始版本 hash
   - 每轮 diff（完整）
   - 每轮编译 stderr
   - 最终失败原因
4. 命令行输出结尾明确提示：`已回滚到原始生成版本；修复轨迹见 <log 路径>`

**优先级**：P1

---

## REQ-06: 修复白名单强制约束

**原子描述**：修复循环中 LLM 只被允许修改**当次验证的测试文件** + `tests/**/CMakeLists.txt`，其余文件（业务源码、根 CMakeLists、其他测试文件、共享 fixture）一律拒绝。

**验收标准**：
1. 白名单 glob 配置（硬编码在 Skill，不开放覆盖）：
   - `<当次 test 文件绝对路径>`
   - `<cpp.projectRoot>/tests/**/CMakeLists.txt`
2. 每轮 LLM 生成补丁后，做两层校验：
   - **路径校验**：所有被改文件必须匹配白名单
   - **CMakeLists 增量校验**：对 `tests/**/CMakeLists.txt` 的修改必须是**纯追加**（diff 只有 `+` 行，没有 `-` 行）
3. 任一校验失败 → 本轮作废，保留上一轮状态，**不计入 3 轮总数**（避免越界浪费修复预算）
4. 越界事件写入修复日志，供后期 Skill 调优

**优先级**：P1

---

## REQ-07: 干跑模式（dry-run）

**原子描述**：`/verify-build --dry-run` 只执行编译验证，不触发修复循环。

**验收标准**：
1. `--dry-run` 时 `maxRounds` 隐式为 0
2. 编译失败时输出结构化错误报告，不动任何文件，不写修复日志（但写编译日志）
3. 返回值能区分"编译通过" vs "编译失败"，便于 CI 脚本集成

**优先级**：P2（便利特性，不影响 P0-C 验收）

---

## REQ-08: 日志与透明度

**原子描述**：修复循环所有中间状态必须可追溯，不得存在黑盒行为。

**验收标准**：
1. `.devpilot/logs/compile-fix-{ts}.log` 为单文件完整记录（初始版本 + 每轮 diff + 每轮错误 + 最终结果）
2. 命令行输出以"每轮摘要"形式展示（Round 1: 5 errors → 2 errors, Round 2: 2 errors → 0 errors ✅ PASS）
3. 日志文件路径在每次运行结束时必须打印到开发者可见输出

**优先级**：P1

---

## 边界声明（明确**不**做的事）

1. ❌ **不**做 `cmake -S -B` 初始化——用户环境由用户自己配
2. ❌ **不**改业务源码（`src/**`）——即便 AI 认为"问题在源码"
3. ❌ **不**改工程根 `CMakeLists.txt`——避免全局配置污染
4. ❌ **不**做跨文件传染修复（例如为了让 A_test 编过去改 common_fixture.h）
5. ❌ **不**做编译成功后的运行时测试执行——R08/R09 只管"编得过"，不管"跑得对"
6. ❌ **不**自动从 gen-test 串联到 verify-build——两个 Skill 解耦，开发者显式触发
7. ❌ **不**支持 CppUnit 之外的第三种测试框架——gtest 优先，CppUnit 次之，其他不在本期

---

## 依赖与前置

- **E2 完成**：`/gen-test` 能产出 `tests/*_test.cpp`
- **Q2 已确认**：Windows + CMakeLists.txt + 用户已有构建脚本
- **Q5 已确认**：修复边界 = 仅测试代码编译错误
- **opencode 扩展点**：BashTool / Tool registry / Skill 系统 / Permission 规则（Phase 3 由 Codex 验证具体可复用程度）

# E3 自动编译验证与错误修复 Design Spec

> **OSS 定制场景：由 oss-adapter 生成，替代 superpowers:brainstorming 输出。**
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to generate the implementation plan from this spec. Process one Epic spec at a time.

**Goal:** 为航电 C++ 开发者提供独立的编译验证 + 自动修复能力——E2 `/gen-test` 生成测试代码后，开发者通过 `/verify-build` 显式触发编译验证，DevPilot 自动调 cmake 构建、解析错误、LLM 修复测试文件（≤3 轮），失败则回滚到原始版本。

**Architecture:** L2 Custom Tool（`cpp-compile-fix.ts`）作为核心状态机，封装 cmake 调用 → 错误解析 → 白名单校验 → 备份/回滚 → 日志；L1 Skill（`cpp-compile-fix/SKILL.md`）编排 LLM 与 Tool 的交互规范（3 轮上限、每轮注入内容、输出格式）；L1 Command（`verify-build.md`）作为用户入口。LLM 通过 Tool 的 action 子命令驱动状态机，**不使用内建 Edit/Write 工具**（Permission deny），所有文件写盘均由 Tool 自行完成。

**Tech Stack:** TypeScript（bun runtime）、opencode Custom Tool API（`.devpilot/tools/*.ts`）、opencode Skill/Command 系统、cmake CLI、gcc/clang stderr 解析正则

**OSS Version:** devpilot-e1-complete（465fe9a6a）— 实施前确认版本未变更

---

## 需求范围

| REQ | 需求名称 | 定制级别 | 优先级 |
|-----|---------|---------|--------|
| REQ-01 | Skill `cpp-compile-fix` + `/verify-build` 命令 | L1 | P1 |
| REQ-02 | 复用用户 CMake build 目录 | L2 | P1 |
| REQ-03 | 编译错误结构化解析 | L2 | P1 |
| REQ-04 | 三轮修复循环 | L2 | P1 |
| REQ-05 | 失败回滚到原始版本 | L2 | P1 |
| REQ-06 | 白名单 + CMakeLists append-only | L0+L2 | P1 |
| REQ-07 | `--dry-run` 干跑 | L1+L2 | P2 |
| REQ-08 | 日志与透明度 | L2 | P1 |

## 架构方案

### 为什么选 L2 Custom Tool 而非 Plugin Hook？

| 决策点 | Plugin Hook 方案 | Custom Tool 方案 ✅ |
|--------|-----------------|-------------------|
| 写盘执行方 | 内建 Edit（第三方） | Tool 自己 |
| diff 校验 | 在别人代码里插脚（`tool.execute.before`） | 在自己代码里顺序执行 |
| 轮次计数 | 跨多次 Edit 调用织状态 | Tool 内局部变量 |
| 越界风险 | LLM 可能绕过 Edit 用 write/apply_patch | Permission deny 所有内建写工具 |
| 调试定位 | LLM ↔ Edit ↔ Plugin 三方 | **一个文件** |

**核心原则：写盘的决策方和执行方合并为同一块代码，消除协调面。**

### 为什么不用 opencode Snapshot/Revert 做回滚？

- Snapshot API 是核心包内部服务（`packages/opencode/src/snapshot/index.ts`），自定义 Tool 无法 import
- Revert 是消息粒度（`session/revert.ts:31-53`），不能精确到"只回退 verify-build 期间改的文件"
- E3 scope 下最多回滚 2 个文件（测试文件 + CMakeLists），`fs.copyFile` 20 行代码搞定
- 若将来 scope 扩大（允许跨文件修复），可考虑 L3 patch 暴露 Snapshot API 钩子

### 为什么不用 `Config.get()` 读 `cpp.*` 配置？（已确认方案 A）

- `config.ts` 多处 `.strict()`（:433, :447, :472, :809），未声明的顶层键会被 zod 拒绝
- L3 patch 可以加 `cpp` schema（~30-50 LOC），但引入升级面
- **最终决策 [人工确认 2026-04-12]**：Tool 自己 `JSON.parse(fs.readFileSync('devpilot.json'))` 读原始文件，取 `cpp.*` 字段，Tool 自行做参数校验。零核心改动。

### 组件协作数据流

```
用户: /verify-build tests/calculator_test.cpp
  ↓
Command (verify-build.md): 解析参数 → 加载 Skill
  ↓
Skill (cpp-compile-fix/SKILL.md): 注入编排规范到 LLM 上下文
  ↓
LLM: 调 cpp-compile-fix Tool {action: "prepare", testFile: "tests/calculator_test.cpp"}
  ↓
Tool: 读 devpilot.json → 校验 CMakeCache.txt → 备份原文件 → 发现 target → 返回配置摘要
  ↓
LLM: 调 cpp-compile-fix Tool {action: "build"}
  ↓
Tool: cmake --build <buildDir> --target <target> → 捕获 stderr → 结构化解析错误 → 返回错误列表 JSON
  ↓
[如果编译成功] LLM: 调 {action: "finish"} → Tool 清理备份，写最终日志 → 结束
[如果编译失败] LLM: 基于错误列表生成补丁 → 调 {action: "apply", patch: {...}}
  ↓
Tool: 白名单校验（路径 + append-only）→ 通过则写盘 + 轮次+1 → 返回 {round: N, applied: true}
  ↓ (循环回到 build)
[3 轮全败] LLM: 调 {action: "rollback"}
  ↓
Tool: 用备份覆盖回磁盘 → 写完整日志 → 返回日志路径
```

## 关键实现路径

| 需求 | 定制级别 | 实现方式 | 关键文件/扩展点 |
|------|---------|---------|----------------|
| REQ-01 | L1 | 新建 Skill + Command 文件 | `.devpilot/skills/cpp-compile-fix/SKILL.md` / `.devpilot/commands/verify-build.md` |
| REQ-02 | L2 | Tool 内 `prepare` action：读原始 devpilot.json、校验 CMakeCache、grep CMakeLists 发现 target | `.devpilot/tools/cpp-compile-fix.ts` |
| REQ-03 | L2 | Tool 内 `build` action：`child_process.execSync('cmake --build ...')` + 正则解析 stderr | 同上 |
| REQ-04 | L2 | Tool 内 `roundCounter` 局部变量 + Skill prompt 编排调用顺序 | 同上 + SKILL.md |
| REQ-05 | L2 | Tool 内 `prepare` 时 `fs.copyFile` 到 `.devpilot/tmp/`；`rollback` 时覆盖回 | 同上 |
| REQ-06 | L0+L2 | Permission 规则 deny `edit`/`write` 路径白名单（零代码）+ Tool 内 `apply` action diff 校验（代码） | `devpilot.json` permission 配置 + Tool |
| REQ-07 | L1+L2 | Command 解析 `--dry-run` → Skill 指示"只调 prepare+build 不调 apply"→ Tool `build` 返回后即结束 | Command + SKILL.md |
| REQ-08 | L2 | Tool 每个 action 返回时附带摘要字符串 + `finish`/`rollback` 时 `fs.writeFile` 日志到 `.devpilot/logs/` | Tool |

### 扩展点实现规范

**Custom Tool（L2）**
```
扩展点：Custom Tool
目录：.devpilot/tools/cpp-compile-fix.ts
文件格式：默认导出 ToolDefinition；args: (z) => shape 定义参数
注册方式：自动发现（opencode 扫描 .devpilot/tools/*.ts）
关联方式：LLM 在会话中调用，结果以 string 返回给 LLM
官方示例：.devpilot/tools/cpp-code-search.ts:65-149
最小验证结果：ToolRegistry.ids() 包含 cpp-code-search ✅ (Codex 已验证)
```

**Skill（L1）**
```
扩展点：Skill
目录：.devpilot/skills/cpp-compile-fix/SKILL.md
文件格式：Markdown，需要 frontmatter（name/description/globs 等）
注册方式：自动发现（opencode 扫描 .devpilot/skills/*/SKILL.md）
关联方式：Skill 内容在匹配场景时注入 LLM system prompt
官方示例：packages/opencode/src/skill/index.ts（加载器）
⚠️ 注意：需要 frontmatter，E2 的 cpp-test-gen SKILL.md 疑似缺 frontmatter（Codex 发现，Phase 6 待确认）
```

**Command（L1）**
```
扩展点：Command
目录：.devpilot/commands/verify-build.md
文件格式：Markdown 模板（参数用 $ARGUMENTS 占位）
注册方式：自动发现（opencode 扫描 .devpilot/commands/*.md）
关联方式：用户输入 /verify-build 时触发
官方示例：.devpilot/commands/gen-test.md / .devpilot/commands/index.md
最小验证结果：Config.get() 返回 index/gen-test/structurize-req ✅ (Codex 已验证)
```

## 组件设计

### `.devpilot/tools/cpp-compile-fix.ts` — 核心状态机

**参数 schema**（zod）：
```typescript
args: (z) => ({
  action: z.enum(["prepare", "build", "apply", "rollback", "finish"]),
  testFile: z.string().optional(),      // prepare 时必填
  patch: z.string().optional(),         // apply 时必填（unified diff 格式）
  patchFile: z.string().optional(),     // apply 时可选（被 patch 的目标文件路径）
  dryRun: z.boolean().optional(),       // prepare 时传入
  maxRounds: z.number().optional(),     // prepare 时传入（默认 3，上限 3）
})
```

**内部状态**（Tool 模块级，单次 session 内存活）：
```typescript
interface CompileFixState {
  testFile: string           // 当前验证的测试文件绝对路径
  projectRoot: string        // 工程根
  buildDir: string           // build 目录绝对路径
  target: string             // cmake target 名
  backupDir: string          // .devpilot/tmp/compile-fix-{ts}/
  maxRounds: number          // 最大修复轮数
  currentRound: number       // 当前轮次
  dryRun: boolean            // 干跑模式
  errors: CompileError[]     // 最近一次编译错误
  log: string[]              // 累积的日志行
  whitelist: string[]        // 允许修改的文件路径列表
}
```

**各 action 职责**：

| Action | 输入 | 做什么 | 返回 |
|--------|------|--------|------|
| `prepare` | testFile, dryRun?, maxRounds? | 读 devpilot.json `cpp.*`；校验 CMakeCache.txt 存在；从 `tests/**/CMakeLists.txt` grep 出 target；备份 testFile 和相关 CMakeLists 到 `.devpilot/tmp/`；初始化 state | `{status: "ready", target, projectRoot, buildDir}` 或 `{status: "error", message: "CMakeCache.txt 不存在..."}` |
| `build` | (无额外参数，读 state) | `execSync('cmake --build <buildDir> --target <target>')` 捕获 stderr；正则解析 `file:line:col: error:` + `undefined reference`；写入 state.errors；追加日志 | `{status: "pass"}` 或 `{status: "fail", round: N, errors: [...], errorsRemaining: M}` |
| `apply` | patch, patchFile | **白名单校验**：patchFile 必须在 `state.whitelist` 内；若是 CMakeLists，diff 只能有 `+` 行。通过 → `fs.writeFile`；`currentRound++`。不通过 → 拒绝，**不计入轮次** | `{status: "applied", round: N}` 或 `{status: "rejected", reason: "..."}` |
| `rollback` | (无) | 用备份文件覆盖磁盘原文件；生成完整日志写 `.devpilot/logs/compile-fix-{ts}.log`；清理 `.devpilot/tmp/` | `{status: "rolled_back", logFile: "..."}` |
| `finish` | (无) | 删除备份；写最终成功日志 | `{status: "done", round: N, logFile: "..."}` |

### `.devpilot/skills/cpp-compile-fix/SKILL.md` — LLM 编排规范

核心内容（注入 LLM system prompt）：

1. **流程强制规定**：
   - 必须先 `prepare` → 再 `build` → 根据结果 `apply`+`build`（循环）→ 最终 `finish` 或 `rollback`
   - **禁止**使用内建 `edit`/`write`/`apply_patch` 工具修改任何文件
   - **禁止**使用 `bash` 工具修改文件（`bash` 只允许执行读操作和 cmake 构建）

2. **每轮修复 prompt 注入**：
   - 当前完整测试文件内容（从 `build` 返回的 state 中获取）
   - 结构化编译错误列表（`{file, line, col, severity, message}`）
   - 历次修改 diff（第 2 轮起，从日志中获取）

3. **输出格式**：
   - 每轮结束后输出摘要：`Round N: X errors → Y errors`
   - 最终输出成功/失败总结 + 日志路径

4. **dry-run 行为**：`prepare` → `build` → 若失败只输出错误报告，不进入 apply 循环

### `.devpilot/commands/verify-build.md` — 用户入口

```markdown
---
description: 编译验证并自动修复生成的 C++ 测试文件
---
对 $ARGUMENTS 指定的测试文件执行编译验证。
使用 cpp-compile-fix skill 指导的流程，调用 cpp-compile-fix 工具完成。
参数说明：
- 第一个参数：测试文件路径（必填）
- --max-rounds N：最大修复轮数（默认 3，上限 3）
- --dry-run：只编译不修复
```

### `devpilot.json` Permission 追加 — 路径白名单（L0 零代码）

```jsonc
{
  "permission": [
    // E3 作用域：deny 内建写工具，强制走 cpp-compile-fix Tool
    { "permission": "edit", "pattern": "**", "action": "deny" },
    { "permission": "bash", "pattern": "cmake --build *", "action": "allow" }
  ]
}
```

> **注意**：上述 Permission 规则应**仅在 verify-build 执行期间生效**。实现方式待定——可能是 Skill prompt 里告知 LLM "不要用 edit"（软约束），也可能需要 Tool 在 prepare/finish 时动态写入/移除 Permission 规则（硬约束）。Phase 7 确认。

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| `CMakeCache.txt` 不存在 | `prepare` 返回明确错误："请先执行 `cmake -B <buildDir>` 初始化"，Skill 指示 LLM 直接输出给用户 |
| `devpilot.json` 缺 `cpp.*` 配置 | `prepare` 返回错误 + 配置模板示例 |
| target 自动发现失败（CMakeLists 里找不到包含当前测试文件的 target） | `prepare` 返回 warning + 提示用户手动在 devpilot.json 配置 `cpp.testTarget` |
| cmake 进程超时 | Tool 用 `execSync` 的 `timeout` 参数（默认 120s），超时则视为本轮失败 |
| 白名单校验拒绝 | `apply` 返回 `{status: "rejected"}`，LLM 重新生成限定在白名单内的补丁，**不计入轮次** |
| 3 轮全败 | Skill 指示 LLM 调 `rollback`，Tool 恢复原文件，输出完整日志路径 |
| 备份文件丢失（`.devpilot/tmp/` 被意外删除） | `rollback` 检测到缺失时保留当前版本，日志中警告"无法回滚" |

## 测试策略

### 单元测试（Tool 内部函数）

| 测试目标 | 方法 |
|---------|------|
| gcc 错误解析正则 | 构造 10+ 条典型 gcc/clang stderr 输入，验证解析输出 |
| 链接器错误解析 | 构造 `undefined reference to` / `multiple definition` 样本 |
| 白名单 glob 匹配 | 边界 case：路径拼写变体、Windows 反斜杠、相对/绝对路径 |
| CMakeLists append-only 校验 | 构造纯追加 diff / 混合增删 diff，验证通过/拒绝 |
| target 自动发现（grep CMakeLists） | 构造多种 `add_executable` / `target_sources` 写法 |

### 集成测试（端到端）

需要一个最小 C++ 样例工程（`tests/e3_test_project/`）：
- `src/calculator.cpp` + `src/calculator.h`（简单加减法）
- `tests/CMakeLists.txt`（gtest target）
- `CMakeLists.txt`（根）
- 预构建的 `build/` 目录（测试前 `cmake -B build`）

| 场景 | 预期 |
|------|------|
| 正确的测试文件 → build 一次通过 | `finish` + 日志显示 Round 0 PASS |
| 故意写错 include → build 失败 → LLM 修复 → 通过 | `finish` + 日志显示 Round 1 修复 |
| 不可修复的错误（缺少源码函数）→ 3 轮全败 | `rollback` + 原始文件恢复 + 完整日志 |
| `--dry-run` | 只输出错误报告，不改文件 |
| 白名单越界（LLM 试图改 src/） | `apply` 拒绝，不计入轮次 |
| `CMakeCache.txt` 不存在 | `prepare` 报错 + 友好提示 |

## 约束与注意事项

1. **不修改 opencode 核心源码**（`packages/` 下的文件）— 零 L3/L4 patch
2. **注释语言为中文**（航电合规要求）
3. **cmake 编译仅限 target 粒度**，禁止全量 `cmake --build <buildDir>`（无 target 参数）
4. **修复白名单硬编码在 Tool 内**，不开放用户覆盖（安全约束）
5. **maxRounds 上限 3**，即使命令行传入更大值也截断为 3（客户硬约束）
6. **E3 与 E2 解耦**：`/verify-build` 不自动触发 `/gen-test`，反之亦然
7. **E3 不做运行时测试执行**：只验证"编得过"，不验证"跑得对"
8. **E2 的 SKILL.md frontmatter 缺失问题**：已确认缺 frontmatter [人工确认 2026-04-12]，E3 实施时同步补上 `cpp-test-gen/SKILL.md` 的 frontmatter；新建 `cpp-compile-fix/SKILL.md` 必须包含正确 frontmatter

## 产出物清单

| 文件 | 类型 | 估算 LOC | 说明 |
|------|------|---------|------|
| `.devpilot/tools/cpp-compile-fix.ts` | L2 Custom Tool | 350-500 | 核心状态机 |
| `.devpilot/skills/cpp-compile-fix/SKILL.md` | L1 Skill | 80-120 | LLM 编排规范（含 frontmatter） |
| `.devpilot/skills/cpp-test-gen/SKILL.md` 补 frontmatter | L1 修复 | 5-10 | E2 遗留修复 |
| `.devpilot/commands/verify-build.md` | L1 Command | 40-80 | 用户入口 |
| `devpilot.json` permission 追加 | L0 Config | 5-10 | 路径白名单 |
| `tests/e3_test_project/` | 测试工程 | ~100 | 端到端集成测试样例 |
| **合计** | | **~580-820** | |

## 工作量估算

| 任务 | 估算（人天） | 置信度 |
|------|------------|--------|
| Tool 核心状态机 (`cpp-compile-fix.ts`) | 2d | 高 |
| Skill + Command + Permission | 0.5d | 高 |
| 单元测试（错误解析、白名单、target 发现） | 0.5d | 高 |
| 集成测试工程 + 端到端测试 | 1d | 中 |
| **合计** | **4d** | |

> 与 CLAUDE.md 原计划一致（E3 = 4d）

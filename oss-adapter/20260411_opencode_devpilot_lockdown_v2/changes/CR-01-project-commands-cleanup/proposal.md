# CR-01: 非交付命令文件清理

**类型：** 遗漏项修复（E5 审计盲区）  
**优先级：** P1  
**发现方式：** 手动验证时，在 DevPilot 命令面板中观察到 `/ai-deps`、`/changelog`、`/commit` 等非交付命令  
**修复日期：** 2026-04-11  
**状态：** completed

---

## 背景

E5 实施完成后，用户在 DevPilot TUI 中按 `/` 打开命令面板，发现以下非交付命令仍然可见：

```
/ai-deps
/changelog
/commit
/issues
/learn
/rmslop
/spellcheck
```

这些命令不在 R01-R09 交付范围内，不应暴露给客户。

---

## 根因分析

### 命令加载路径

`packages/opencode/src/config/config.ts:233` 的 `loadCommand()` 函数使用以下 glob 模式扫描：

```typescript
Glob.scan("{command,commands}/**/*.md", { cwd: dir, ... })
```

即**同时扫描** `command/`（单数）和 `commands/`（复数）两个目录。

### E5 审计盲区

E5 的 REQ-17/21 只关注了 `session/index.tsx` 中已注册命令的 `hidden:true` 处理，以及 `config.directories()` 返回路径下的 `commands/`（复数）目录。

**未覆盖的路径**：项目根目录 `.opencode/command/`（单数），该目录是开发阶段积累的工具命令，在一期/二期定制工作中用于开发辅助，从未为客户交付清理。

### 命令来源对比

| 目录 | 文件 | 状态 | 说明 |
|------|------|------|------|
| `.opencode/commands/gen-test.md` | gen-test | ✅ 保留 | R04 交付命令 |
| `.opencode/commands/structurize-req.md` | structurize-req | ✅ 保留 | R01 交付命令 |
| `.opencode/command/ai-deps.md` | ai-deps | ❌ 删除 | 开发辅助命令，非交付 |
| `.opencode/command/changelog.md` | changelog | ❌ 删除 | 开发辅助命令，非交付 |
| `.opencode/command/commit.md` | commit | ❌ 删除 | 开发辅助命令，非交付 |
| `.opencode/command/issues.md` | issues | ❌ 删除 | 开发辅助命令，非交付 |
| `.opencode/command/learn.md` | learn | ❌ 删除 | 开发辅助命令，非交付 |
| `.opencode/command/rmslop.md` | rmslop | ❌ 删除 | 开发辅助命令，非交付 |
| `.opencode/command/spellcheck.md` | spellcheck | ❌ 删除 | 开发辅助命令，非交付 |

---

## 修复方案

### 方案选择

| 方案 | 描述 | 结论 |
|------|------|------|
| A：删除 `.opencode/command/` 目录下非交付文件 | 直接移除根源 | ✅ 采用 |
| B：在 config.ts 加载逻辑中增加白名单过滤 | 代码侵入，升级风险高 | ❌ 过度工程 |
| C：给每个命令文件加 `hidden: true` frontmatter | 依赖 hidden 机制完整性，不如直接删除干净 | ❌ 非最优 |

选择方案 A：这些命令本就是开发工具残留，不是需要隐藏的"已注册命令"，直接删除最干净，无升级冲突风险。

### 实施内容

```bash
# 删除 .opencode/command/ 下全部 7 个非交付命令文件
rm .opencode/command/ai-deps.md
rm .opencode/command/changelog.md
rm .opencode/command/commit.md
rm .opencode/command/issues.md
rm .opencode/command/learn.md
rm .opencode/command/rmslop.md
rm .opencode/command/spellcheck.md
```

操作后 `.opencode/command/` 目录为空（目录本身保留，无副作用）。

---

## E5 Spec 补丁说明

本 CR 不更新 E5 spec 中的 REQ 列表（E5 已完成），而是通过此 CR 文档单独追溯。  
建议在下一轮升级检查时，将以下内容加入升级 checklist：

```
□ 检查 .opencode/command/ 和 .opencode/commands/ 目录，确认只含交付命令
□ grep 命令：find .opencode/command* -name "*.md" | sort
```

---

## 影响评估

| 维度 | 评估 |
|------|------|
| 功能回归风险 | 无 — 删除的均为开发辅助命令，不参与任何 R01-R09 流程 |
| 上游同步影响 | 无 — 这些文件是我方自行创建，不在 opencode 上游仓库中 |
| 客户可见命令变化 | `/ai-deps`、`/changelog`、`/commit`、`/issues`、`/learn`、`/rmslop`、`/spellcheck` 从面板消失 |
| 交付命令完整性 | `/gen-test`、`/structurize-req` 不受影响 |

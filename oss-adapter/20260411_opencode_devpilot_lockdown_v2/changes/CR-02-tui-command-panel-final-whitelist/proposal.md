# CR-02: TUI 命令面板最终白名单清理

**类型：** 遗漏项修复（E5 REQ-17/21 覆盖盲区）  
**优先级：** P1  
**发现方式：** 手动验证命令面板，观察到 `/agents`、`/mcps`、`/models`、`/review` 仍可见  
**修复日期：** 2026-04-11  
**状态：** completed

---

## 背景

E5 实施后，用户打开命令面板（`/`）仍看到 4 个非交付命令：
- `/agents` — Switch agent
- `/mcps` — Toggle MCPs
- `/models` — Switch model
- `/review` — review changes [commit|branch|pr]

## 根因分析

### 命令来源分类

TUI 中的 `/` 命令来自两个独立系统：

| 系统 | 来源文件 | 隐藏机制 | E5 覆盖情况 |
|------|---------|---------|-----------|
| `CommandOption` | `app.tsx` + `session/index.tsx` | `hidden: true` | session/index.tsx 已覆盖；**app.tsx Agent 类未覆盖** |
| `Command.Info` | `command/index.ts` + `.opencode/commands/*.md` | 注释掉注册代码 | `.opencode/command/` 已清理；**内置 Default.REVIEW 未覆盖** |

### 遗漏明细

**app.tsx 中 Agent category 的三个命令（REQ-17/21 未审计此文件此类别）：**

```typescript
// app.tsx ~502 — Switch model
{ title: "Switch model", value: "model.list", slash: { name: "models" }, ... }

// app.tsx ~554 — Switch agent
{ title: "Switch agent", value: "agent.list", slash: { name: "agents" }, ... }

// app.tsx ~566 — Toggle MCPs
{ title: "Toggle MCPs", value: "mcp.list", slash: { name: "mcps" }, ... }
```

**command/index.ts 内置命令（未纳入 E5 屏蔽清单）：**

```typescript
// command/index.ts ~95 — 内置 code review 命令
commands[Default.REVIEW] = {
  name: Default.REVIEW,           // "review"
  description: "review changes [commit|branch|pr], ...",
  ...
}
```

## 修复内容

### app.tsx — 三个 CommandOption 加 hidden: true

```typescript
// Switch model
{
  title: "Switch model",
  value: "model.list",
  // CUSTOM: DevPilot lockdown — 模型切换不在 R01-R09 交付范围，由管理员预配置
  hidden: true,
  slash: { name: "models" },
  ...
}

// Switch agent
{
  title: "Switch agent",
  value: "agent.list",
  // CUSTOM: DevPilot lockdown — Agent 切换不在 R01-R09 交付范围
  hidden: true,
  slash: { name: "agents" },
  ...
}

// Toggle MCPs
{
  title: "Toggle MCPs",
  value: "mcp.list",
  // CUSTOM: DevPilot lockdown — MCP 管理不在 R01-R09 交付范围
  hidden: true,
  slash: { name: "mcps" },
  ...
}
```

### command/index.ts — 注释掉 Default.REVIEW

```typescript
// CUSTOM: DevPilot lockdown — code review 不在 R01-R09 交付范围
// commands[Default.REVIEW] = { ... }
```

## 交付后命令面板白名单

| 命令 | 来源 | 保留理由 |
|------|------|---------|
| `/copy` | app.tsx CommandOption | 基础操作 |
| `/editor` | app.tsx CommandOption | Phase 6 保留 |
| `/exit` | app.tsx CommandOption | 必须有 |
| `/export` | session/index.tsx | Phase 6 保留 |
| `/gen-test` | `.opencode/commands/gen-test.md` | R04 交付 |
| `/help` | app.tsx CommandOption | Phase 6 保留 |
| `/init` | command/index.ts Default.INIT | 用户明确保留 |
| `/new` | session/index.tsx | 基础操作 |
| `/rename` | session/index.tsx | Phase 6 保留 |
| `/structurize-req` | `.opencode/commands/structurize-req.md` | R01 交付 |

## 升级检查项

```bash
# 检查 app.tsx Agent 类命令是否有新增 slash 命令
grep -A5 "category.*Agent" packages/opencode/src/cli/cmd/tui/app.tsx | grep "slash\|name"

# 检查 command/index.ts 是否新增内置命令
grep "commands\[Default\." packages/opencode/src/command/index.ts
```

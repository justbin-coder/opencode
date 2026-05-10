# E5: DevPilot 功能锁定 v2 全面审计 Design Spec
> **OSS 定制场景：由 oss-adapter 生成，替代 superpowers:brainstorming 输出。**
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to generate the implementation plan from this spec. Process one Epic spec at a time.

**Goal:** 系统性屏蔽 opencode 中 R01-R09 交付范围之外的全部用户可见功能入口（CLI、命令面板、键盘快捷键、斜杠命令、Skill 加载、网络调用、内建插件、品牌泄漏），实现「白名单模式」UI + 运行时双层锁定，同时把改动集中到我方私有文件 `bin/devpilot` 与最小化 patch，把上游同步成本压到最低。

**Architecture:** 三层防御 — **L0-Config**：在我方私有的 `bin/devpilot` 启动脚本注入一组 `OPENCODE_*` 环境变量，禁用外部 skill / plugin / 网络能力（零代码改动，零升级冲突）；**L3-Patch**：对 opencode 源码做最小 diff（注释 `agent` 命令、修补 `dialog-command.tsx` 的 keybind 绕过漏洞、给残留 commands 加 `hidden:true`、给 internal TUI plugins 列表裁剪），全部带 `// CUSTOM: DevPilot lockdown` 注释；**L4-Logic**：极少量的逻辑层改动（skill 白名单强化、品牌/链接清洗），同样标注 CUSTOM。

**Tech Stack:** TypeScript、Bun、yargs（CLI 注册）、Ink/React（TUI）、opencode 已有的 `Flag.OPENCODE_*` 子系统、内建 `INTERNAL_TUI_PLUGINS` 数组。

**OSS Version:** v1.3.9+hd-dev（fc5407132）— 实施前确认版本未变更。

---

## 需求范围

| REQ | 需求名称 | 定制级别 | 优先级 |
|-----|---------|---------|--------|
| REQ-14 | bin/devpilot 注入全套 lockdown env flags | L0-Config | P1 |
| REQ-15 | 注释剩余 CLI 命令（`agent`） | L3-Patch | P1 |
| REQ-16 | 修补 dialog-command.tsx keybind 绕过漏洞 | L3-Patch | **P0（关键修复）** |
| REQ-17 | session/index.tsx 中残留命令加 hidden:true（/share、/compact、/undo、/redo、/timeline、/fork、/unshare 等） | L3-Patch | P1 |
| REQ-18 | Skill 白名单强化：跳过 skills.paths 与 skills.urls 加载 | L4-Logic | P1 |
| REQ-19 | 内建 TUI Plugin 裁剪（移除 SidebarMcp、SidebarTodo、PluginManager） | L3-Patch | P1 |
| REQ-20 | 品牌/文本泄漏清洗（prompt/default.txt、error-component、retry hint、provider Referer、schema URL、proxy fallback） | L4-Logic | P2 |
| REQ-21 | Phase 6 决策落地（保留/屏蔽 5 类边界功能，详见末尾"Phase 6 决策"章节） | L3-Patch | P1 |

> REQ 编号从 `session.json.req_id_start = 14` 续接。

---

## 架构方案

### 扩展点选择理由

**为什么三层而不是单一方案？**

| 防御层 | 解决什么 | 为什么不只用其中一层 |
|-------|---------|-------------------|
| L0-Config | 网络、外部 plugin、外部 skill、自动行为 | opencode 已有这些 flag，但默认 OFF；只需我方启动器注入即可 — 零成本最高收益。**单独使用不够：UI 上仍可见命令、keybind 仍可触发 hidden 命令** |
| L3-Patch | UI 隐藏 + 运行时入口截断 | hidden:true 一期已用，但有 keybind 绕过漏洞；以及 internal plugin 数组只能改源码 — patch 不可避免，但要最小化 |
| L4-Logic | skill 路径白名单 + 品牌清洗 | skill 加载逻辑里有 5 条扫描路径，env flag 只覆盖 2 条；品牌字符串散布在 prompt/error/HTTP 头中 — 必须改逻辑 |

**为什么 L0 是首选？**
- 改动落在 `packages/opencode/bin/devpilot`（我方私有文件，已存在 `// CUSTOM: DevPilot rebrand` 注释）
- 零 upstream 冲突 — 无论 opencode 如何升级 flag 实现，env 注入永远生效
- 用户/客户无法绕过（命令被 wrapper 启动器固定）

### 关键数据流

```
DevPilot 启动 → bin/devpilot wrapper
  ├─ 注入 OPENCODE_PURE / DISABLE_AUTOUPDATE / DISABLE_MODELS_FETCH / ...
  ├─ exec opencode CLI
  └─ opencode 启动时
        ├─ 网络层：upgrade.ts / models.ts / lsp/server.ts 各自检查 flag → 短路返回
        ├─ Plugin 层：plugin/index.ts:145 + tui/plugin/runtime.ts:949 因 PURE=1 → 不加载外部 plugin
        ├─ Skill 层：skill/index.ts 因 DISABLE_EXTERNAL_SKILLS=1 → 跳过 ~/.claude/, ~/.agents/
        │            （L4 patch 进一步跳过 cfg.skills.paths/urls）
        ├─ TUI Internal Plugin：INTERNAL_TUI_PLUGINS 静态数组裁掉 SidebarMcp/Todo/PluginManager
        ├─ 命令面板：app.tsx 命令通过 hidden:true 隐藏
        └─ keybind：dialog-command.tsx isVisible 检查 → hidden 命令快捷键失效
```

---

## 关键实现路径

| 需求 | 定制级别 | 实现方式 | 关键文件/扩展点 |
|------|---------|---------|----------------|
| REQ-14 | L0-Config | 在 `bin/devpilot` 顶部 `export OPENCODE_*=1` | `packages/opencode/bin/devpilot`（私有文件） |
| REQ-15 | L3-Patch | 注释 `.command(AgentCommand)` | `packages/opencode/src/index.ts:148` |
| REQ-16 | L3-Patch | 1 行修复：`if (!isEnabled(option))` → `if (!isVisible(option))` | `packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx:66` |
| REQ-17 | L3-Patch | 给残留 session 命令加 `hidden: true` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`（搜 `/share` `/compact` `/undo` `/redo` `/timeline` `/fork` `/unshare`） |
| REQ-18 | L4-Logic | 在 `loadSkills()` 中加白名单条件，跳过 `cfg.skills.paths` 与 `cfg.skills.urls` 路径 | `packages/opencode/src/skill/index.ts:137-187` |
| REQ-19 | L3-Patch | 从 `INTERNAL_TUI_PLUGINS` 数组移除 SidebarMcp/SidebarTodo/PluginManager | `packages/opencode/src/cli/cmd/tui/plugin/internal.ts:17-27` |
| REQ-20 | L4-Logic | 清洗硬编码 URL/链接为占位符或 DevPilot 文案 | 见下方"品牌清洗清单" |

### REQ-14 详细 env flag 配置

在 `packages/opencode/bin/devpilot` 顶部（在 `exec` 之前）注入：

```bash
# CUSTOM: DevPilot lockdown — L0-Config layer
export OPENCODE_PURE=1                          # 禁止所有外部 server/TUI plugin
export OPENCODE_DISABLE_AUTOUPDATE=1            # 禁止后台 update 检查
export OPENCODE_DISABLE_MODELS_FETCH=1          # 禁止 models.dev 拉取
export OPENCODE_DISABLE_LSP_DOWNLOAD=1          # 禁止 LSP 自动下载
export OPENCODE_DISABLE_CLAUDE_CODE=1           # 禁止 .claude prompt + skills
export OPENCODE_DISABLE_EXTERNAL_SKILLS=1       # 禁止 ~/.claude/skills, ~/.agents/skills
export OPENCODE_DISABLE_AUTOCOMPACT=1           # 禁止自动 compact
export OPENCODE_DISABLE_EMBEDDED_WEB_UI=1       # 禁止 web UI fallback 到 app.opencode.ai
# 不设置 OPENCODE_EXPERIMENTAL_WORKSPACES（默认 OFF）
```

### REQ-16 keybind 绕过修复（最关键）

**漏洞**：`dialog-command.tsx:63-73` 的 useKeyboard handler 只检查 `isEnabled(option)`，不检查 `option.hidden`，导致一期所有 `hidden:true` 命令仍可通过键盘快捷键触发。

**修复**：
```typescript
// 文件：packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx
// 第 49 行已存在：const isVisible = (option) => isEnabled(option) && !option.hidden
// 第 66 行修改：
//   FROM: if (!isEnabled(option)) continue
//   TO:   if (!isVisible(option)) continue   // CUSTOM: DevPilot lockdown
```

只改 1 行，影响极小，上游冲突风险低（即便 opencode 自己改 useKeyboard 实现，也只需重新应用 1 行）。

### REQ-18 Skill 白名单强化

**问题**：`OPENCODE_DISABLE_EXTERNAL_SKILLS=1` 只屏蔽 `~/.claude/skills` 与 `~/.agents/skills`，未覆盖 `cfg.skills.paths`（用户配置中显式声明的目录）和 `cfg.skills.urls`（远程 skill 拉取）。

**修复**：在 `skill/index.ts:loadSkills()` 内，对应分支加上：
```typescript
// CUSTOM: DevPilot lockdown — only .opencode/skills/* allowed
if (Flag.OPENCODE_DISABLE_EXTERNAL_SKILLS) {
  // skip cfg.skills.paths and cfg.skills.urls scanning
  return
}
```

### REQ-20 品牌清洗清单

| 文件:行号 | 当前内容 | 清洗策略 |
|----------|---------|---------|
| `session/prompt/default.txt:7` | GitHub issues URL | 移除整行或替换为内部反馈渠道 |
| `session/prompt/anthropic.txt:10` | GitHub repo URL | 同上 |
| `tool/retry.ts:57` | "add credits https://opencode.ai/zen" | 改为通用错误文案 |
| `cli/cmd/tui/component/error-component.tsx:33` | GitHub issues new URL | 移除或替换为占位 |
| `provider/provider.ts:412/423/522/766` | HTTP-Referer: opencode.ai | 改为 devpilot 占位（内网无影响） |
| `config/config.ts:1223-1307` | schema URLs | 改为内部 schema 路径 / 占位 |
| `server/instance.ts:269` | proxy fallback to app.opencode.ai | 配合 `OPENCODE_DISABLE_EMBEDDED_WEB_UI` 移除 |

---

## 组件设计

### 1. DevPilot Launcher (`bin/devpilot`)
**职责**：所有 lockdown env flag 的唯一注入点。  
**接口**：bash wrapper，最终 `exec` opencode 主程序。  
**为何独立**：私有文件，零升级冲突，客户/用户无法绕过。

### 2. CommandDialog Keybind 路由 (`dialog-command.tsx`)
**职责**：根据可见性过滤键盘快捷键触发。  
**修复后约束**：`option.hidden = true` ⇒ 命令面板不显示 + 快捷键失效 + slash 命令不可用（`visibleOptions` 也走 `isVisible`）。

### 3. Skill Loader (`skill/index.ts`)
**职责**：在 lockdown 模式下，仅扫描 `.opencode/skills/` 与 `.opencode/commands/`。  
**约束**：白名单 skill 仅 4 个 — `req-structuring`、`cpp-test-gen`、`cpp-code-search`、`cpp-compile-fix`。

### 4. Internal TUI Plugin Registry (`tui/plugin/internal.ts`)
**职责**：声明哪些内建 TUI 面板加载。  
**裁剪后**：保留 HomeFooter、SidebarContext、SidebarLsp、SidebarFiles、SidebarFooter；移除 HomeTips、SidebarMcp、SidebarTodo、PluginManager。  
（其中 HomeTips、SidebarContext、SidebarLsp 等待 Phase 6 用户决策）

---

## 错误处理

| 场景 | 处理 |
|------|------|
| 用户绕过 wrapper 直接调 `bun packages/opencode/...` | 不可能 — 客户拿到的二进制即 `devpilot`，源码不下发 |
| env flag 在升级后被 opencode 重命名/移除 | CI 中加 smoke test：启动 devpilot → 检查 flag 是否生效（grep 启动日志） |
| `dialog-command.tsx` 上游重构 useKeyboard | 1 行改动易于 cherry-pick；附 git grep `CUSTOM: DevPilot lockdown` 找回 |
| skill loader 上游加新扫描路径 | 通过 grep `loadSkills` 在升级时检查；测试用例校验只有 .opencode/ 路径生效 |

---

## 测试策略

### 单元测试
- `dialog-command.test.tsx`：验证 hidden:true 命令的 keybind 不触发 onSelect
- `skill-loader.test.ts`：mock cfg.skills.paths/urls，验证 lockdown 模式下不加载

### 集成测试（手工 + 自动化）
1. **Smoke**：启动 `devpilot`，命令面板键入 `/` 列举所有命令 → 仅出现白名单
2. **Keybind**：尝试 ctrl+a (provider list)、<leader>t (theme)、<leader>c (compact) 等 → 全部无响应
3. **Skill**：在 `~/.claude/skills/` 放一个外部 skill → 启动后该 skill 不出现在 `/` 列表
4. **网络**：tcpdump/strace 验证 opencode.ai、models.dev、github.com 无外联请求
5. **Plugin**：在 opencode.jsonc 加 `"plugin": ["@some/external"]` → 不加载

### 升级回归测试
- 拉取 opencode 上游最新版后，运行 `git grep "CUSTOM: DevPilot lockdown"` 验证所有改动点存在
- 重新跑 smoke + keybind + skill + 网络四组用例

---

## 约束与注意事项

1. **不修改 opencode 核心源码**这条原则在 v2 必须**有限放宽**：dialog-command.tsx + internal.ts + skill/index.ts 是 patch 层不可避免的小改动，全部带 `// CUSTOM: DevPilot lockdown` 标记
2. **改动总量上限**：本 Epic 的 patch 总行数应 ≤ 30 行（除品牌清洗外），以保证升级 cherry-pick 成本可控
3. **品牌清洗**仅针对**用户可见**的字符串；HTTP-Referer 等内部字符串只在网络隔离失败时有意义，可降级 P2
4. **航电合规**：所有改动注释中文化
5. **5 个 Phase 6 待审查项**未确认前不锁定决策，spec 末尾标注 ⚠️
6. **不引入新依赖**，所有改动都是字符串替换 / 短路 return / 数组裁剪

---

## Phase 6 人工决策（已确认 2026-04-11）

### 决策汇总

| # | 条目 | 决策 | 落实到 REQ |
|---|------|------|----------|
| 1 | Session 斜杠命令 | ✅ 保留 `/rename` `/copy` `/editor`；❌ 屏蔽 `/timestamps` `/thinking` | REQ-17 + REQ-21 |
| 2 | 键盘快捷键残留 | ✅ 保留 `session_rename` `messages_copy` `tool_details` `scrollbar_toggle`；❌ 屏蔽 `display_thinking` `messages_toggle_conceal` | REQ-21（与条目 1 一致性） |
| 3 | 侧边栏面板 | ✅ 保留 `SidebarContext` 和 `SidebarLsp` | REQ-19（不裁剪这两项） |
| 4 | Model favorite / cycle | ❌ 屏蔽 | REQ-21（命令面板对应条目加 hidden:true） |
| 5 | `/help` 斜杠命令 | ✅ 保留 | 不动 dialog-help.tsx |

### REQ-17 / REQ-21 最终屏蔽清单（routes/session/index.tsx + 命令面板）

**斜杠命令屏蔽**（加 `hidden: true`）：
- `/share` `/unshare` `/compact` `/undo` `/redo` `/timeline` `/fork`（无条件）
- `/timestamps` `/thinking`（条目 1 决策）
- model favorite + model cycle 相关命令（条目 4 决策）

**斜杠命令保留**：
- `/rename` `/copy` `/editor`（条目 1 决策）
- `/help`（条目 5 决策）

**对应键盘快捷键屏蔽**（条目 2 决策 + REQ-16 keybind 修复后自动失效）：
- `display_thinking` `messages_toggle_conceal`
- 上述 share/compact/undo/redo/timeline/fork 等的 keybind

**键盘快捷键保留**：
- `session_rename` `messages_copy` `tool_details` `scrollbar_toggle`

### REQ-19 INTERNAL_TUI_PLUGINS 最终列表

```typescript
// CUSTOM: DevPilot lockdown — TUI plugin whitelist
export const INTERNAL_TUI_PLUGINS: InternalTuiPlugin[] = [
  HomeFooter,        // 保留：主聊天底栏
  // HomeTips,       // 移除：可能含品牌 tips
  SidebarContext,    // 保留（条目 3）：token 用量监控
  // SidebarMcp,     // 移除：MCP 不在交付范围
  SidebarLsp,        // 保留（条目 3）：C++ LSP 诊断对 R04/R08 有价值
  // SidebarTodo,    // 移除：todo 非交付
  SidebarFiles,      // 保留：文件浏览
  SidebarFooter,     // 保留：侧边栏 chrome
  // PluginManager,  // 移除：与 OPENCODE_PURE 一致
]
```

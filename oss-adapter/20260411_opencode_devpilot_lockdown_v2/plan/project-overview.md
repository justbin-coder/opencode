# 项目总览 — DevPilot 功能锁定 v2
项目：opencode（DevPilot 定制）  客户：航电软件  日期：2026-04-11

---
> **分析基准版本**
> 仓库：`opencode`　版本：**`v1.3.9+hd-dev`**　Branch：`hd-dev`
> Commit：`fc5407132`
> ⚠️ 本方案基于上述版本快照，实施前请确认 OSS 项目版本未发生重大变更。
---

## 背景

一期锁定（commit fc5407132）已注释 13 个 CLI 命令、隐藏 10 个 TUI 命令面板条目，并完成核心品牌替换。但 Codex 全面审计发现：

1. **关键漏洞**：`hidden:true` 命令仍可通过键盘快捷键触发（dialog-command.tsx:66 只检查 isEnabled，不检查 hidden）
2. **遗漏命令**：CLI `agent` 命令未注释、session 路由中 `/share` `/compact` `/undo` `/redo` `/timeline` `/fork` 等斜杠命令未处理
3. **Skill 加载未封口**：`OPENCODE_DISABLE_EXTERNAL_SKILLS=1` 仅覆盖 2 条扫描路径，`cfg.skills.paths/urls` 仍可加载外部 skill
4. **网络与 plugin**：8 个已有 env flag 可通过 `bin/devpilot` 一次性注入，零代码改动屏蔽自动更新、模型拉取、LSP 下载、外部 plugin、嵌入式 Web UI 等
5. **品牌泄漏**：prompt/error/HTTP 头/schema URL 中仍有 `opencode.ai` `github.com/sst/opencode` 等硬编码

## 分期实施排序

### Phase 1（必做，约 1.5d）— 安全闭环 + 零成本快速胜利

| Epic | spec 文件 | 包含 REQ | 工作量 | 理由 |
|------|----------|---------|-------|------|
| **E5: DevPilot 功能锁定 v2 全面审计** | [specs/E5-lockdown-v2-design.md](../specs/E5-lockdown-v2-design.md) | REQ-14 ~ REQ-21 | 1.5d | 修补 keybind 绕过漏洞（P0）+ env flag 注入（即时收益）+ skill 白名单强化 + 内建 plugin 裁剪 |

> Phase 1 内部子分批：
> - **批次 A（半日）**：REQ-14 (env flags) + REQ-15 (注释 agent) + REQ-16 (keybind 修复) — **必须先做**，最高优先级，关闭运行时入口
> - **批次 B（半日）**：REQ-17 (session 命令 hidden) + REQ-18 (skill 白名单) + REQ-19 (internal plugin 裁剪) — UI 与 skill 加载最终封口
> - **批次 C（半日）**：REQ-20 (品牌清洗) — P2，可与批次 B 并行

### ~~Phase 2（已并入 Phase 1）~~

Phase 6 全部 5 个 ⚠️ 条目已确认（2026-04-11），决策已折叠进 E5 spec 的 REQ-17/REQ-19/REQ-21，无需独立分期。

### 不在本期范围
- 一期已完成：CLI 命令注释（13 个）、TUI 命令面板隐藏（10 个）、Provider 选择器简化、品牌核心替换（brand.ts）
- 后续需求：R10-R16（离线部署）、R17-R21（二期）

## 工作量汇总

| Epic | spec 文件 | 估算（人天） | 置信度 |
|------|----------|------------|--------|
| E5: 锁定 v2 全面审计 | specs/E5-lockdown-v2-design.md | 1.5d | 高（已 spot-check 验证 6 处关键代码） |
| **合计** | | **1.5d** | |

## 依赖关系

- **REQ-16（keybind 修复）必须先于 REQ-17**：先修漏洞，再加 hidden:true，否则 hidden 命令仍能被 keybind 触发，等于没加
- **REQ-14（env flags）独立**，可与任何 REQ 并行
- **REQ-18（skill 白名单）独立**
- **REQ-19（internal plugin 裁剪）独立**，但等 Phase 6 第 3 项决策后定最终列表
- **REQ-20（品牌清洗）独立**

## 变更请求（CR）记录

| CR | 标题 | 类型 | 状态 | 日期 | 详情 |
|----|------|------|------|------|------|
| [CR-01](../changes/CR-01-project-commands-cleanup/proposal.md) | 非交付命令文件清理（.opencode/command/ 目录） | 遗漏项修复 | completed | 2026-04-11 | E5 审计未覆盖单数目录；删除 7 个非交付开发命令 |
| [CR-02](../changes/CR-02-tui-command-panel-final-whitelist/proposal.md) | TUI 命令面板最终白名单（/agents /mcps /models /review） | 遗漏项修复 | completed | 2026-04-11 | app.tsx Agent 类命令 + Default.REVIEW 内置命令未在 E5 中屏蔽 |
| [CR-03](../changes/CR-03-tui-brand-leak-sidebar-statusbar/proposal.md) | TUI 品牌泄漏修复（sidebar footer + 状态栏 provider 名） | 品牌清洗 | completed | 2026-04-11 | JSX 拼接渲染绕过 grep 扫描；local.tsx 未走 Brand.providerDisplayName |

## 风险清单

| 风险 | 等级 | 缓解 |
|------|------|------|
| dialog-command.tsx 上游重构 useKeyboard 实现 | 中 | 1 行改动易 cherry-pick；CI smoke test 校验 hidden 命令 keybind 不响应 |
| skill/index.ts 上游加新扫描路径 | 中 | 升级时 grep `loadSkills`；测试用例覆盖外部 skill 不加载 |
| internal.ts 上游新增内建 plugin 默认开启 | 低 | 升级时 diff 该文件，按白名单决策保留/移除 |
| env flag 被上游重命名/移除 | 低 | 启动 smoke test 检查 flag 是否仍生效；保留 `bin/devpilot` 作为唯一注入点 |
| 品牌字符串清洗遗漏 | 低 | 升级前/后 `git grep -i "opencode.ai\|sst/opencode"` 全量扫描 |
| 客户绕过 wrapper 直接调 opencode 二进制 | 极低 | 客户拿到的是 devpilot 单一入口，源码不下发 |
| `.opencode/command/`（单数）目录残留非交付命令 | 中 | 升级后执行 `find .opencode/command* -name "*.md" \| sort` 核查，只允许交付命令 |

## Phase 6 决策记录（已完成 2026-04-11）

| # | 条目 | 决策 |
|---|------|------|
| 1 | `/rename` `/timestamps` `/thinking` `/copy` `/editor` | 保留 rename/copy/editor，屏蔽 timestamps/thinking |
| 2 | session_rename / messages_copy / tool_details / scrollbar_toggle / display_thinking / messages_toggle_conceal | 保留前 4，屏蔽后 2 |
| 3 | SidebarContext / SidebarLsp | 全部保留 |
| 4 | Model favorite / cycle | 屏蔽 |
| 5 | `/help` | 保留 |

详见 `analysis/capability_matrix.md` ⚠️ 章节与 `specs/E5-lockdown-v2-design.md` "Phase 6 人工决策"章节。

## 下一步（接入 superpowers 开发流程）

E5 全部为 L0/L3/L4 改动，无 L4-Core 重构，走标准路径：

```
specs/E5-lockdown-v2-design.md → superpowers:writing-plans → superpowers:subagent-driven-development
```

Phase 6 用户确认所有 ⚠️ 条目并在 Phase 7 GATE 通过后，自动 Skill 调用 `superpowers:writing-plans`，将本 spec 作为 plan 输入。

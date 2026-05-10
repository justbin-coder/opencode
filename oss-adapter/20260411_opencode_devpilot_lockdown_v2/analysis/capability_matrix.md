# 能力矩阵 — DevPilot 功能锁定 v2 全面审计
## Session: 20260411_opencode_devpilot_lockdown_v2
## 日期: 2026-04-11
## 来源: Codex gpt-5.4 审计 + Claude Opus 交叉验证

---

## 一期覆盖验证

| 维度 | 一期处理数 | 本次枚举总数 | 遗漏数 | 关键遗漏项 |
|------|----------|-----------|-------|----------|
| 1. CLI 命令 | 13 | 23 | 1 | `agent` 命令未注释 |
| 2. TUI 命令面板 | 10 | 32 | ~12 | keybind 绕过 hidden:true |
| 3. TUI 键盘快捷键 | 0 | 30 | ~10 | theme_list/provider_list/share 等仍可触发 |
| 4. 斜杠命令 | 2 | 26 | ~14 | /share /compact /undo /redo /timeline /fork 等 |
| 5. Skill 加载路径 | 0 | 8 | 6 | skills.paths/urls/configDirs 未屏蔽 |
| 6. Feature Flag | 0 | 49 | N/A | 一期未做策略层 |
| 7. TUI 面板/组件 | 3 | 9 | ~4 | sidebar/mcp, sidebar/todo, plugin manager 加载层 |
| 8. 网络调用 | 0 | 15 | 15 | 全部未处理 |
| 9. Plugin 系统 | 2 | 7 | ~4 | 外部 plugin/内建 plugin 白名单/PURE flag |
| 10. 品牌/文本泄漏 | ~partial | 14 | ~14 | prompt/schema URL/OAuth/tips/error page |

---

## 新增需屏蔽项（按实现层级分类）

### L0-Config 层（环境变量注入，零代码改动）

| # | 功能 | Flag | 效果 | spot-check |
|---|------|------|------|-----------|
| 1 | 外部 Skill 目录 | `OPENCODE_DISABLE_EXTERNAL_SKILLS=1` | 屏蔽 ~/.claude/skills/ 和 ~/.agents/skills/ | skill/index.ts:146 ✅验证 |
| 2 | Claude Code 集成 | `OPENCODE_DISABLE_CLAUDE_CODE=1` | 禁用 .claude prompt + skills | flag.ts:33 ✅验证 |
| 3 | 外部 Plugin | `OPENCODE_PURE=1` | 禁止所有外部 server/TUI plugin | plugin/index.ts:145 + runtime.ts:949 ✅验证 |
| 4 | 自动更新 | `OPENCODE_DISABLE_AUTOUPDATE=1` | 禁止后台更新检查 | upgrade.ts:18 ✅验证 |
| 5 | 模型列表拉取 | `OPENCODE_DISABLE_MODELS_FETCH=1` | 禁止从 models.dev 外网拉取 | models.ts:96 ✅验证 |
| 6 | LSP 下载 | `OPENCODE_DISABLE_LSP_DOWNLOAD=1` | 禁止 LSP 自动下载 | lsp/server.ts:141 ✅验证 |
| 7 | 自动 Compact | `OPENCODE_DISABLE_AUTOCOMPACT=1` | 禁止自动 compact 行为 | flag.ts:31 |
| 8 | 实验 Workspaces | `OPENCODE_EXPERIMENTAL_WORKSPACES=` (不设置) | 不开启实验功能 | app.tsx:461 ✅验证 |
| 9 | 嵌入式 Web UI | `OPENCODE_DISABLE_EMBEDDED_WEB_UI=1` | 禁止 Web UI fallback 到 app.opencode.ai | server/instance.ts:32 ✅验证 |

**改动位置：** `packages/opencode/bin/devpilot`（我方文件，升级零冲突）

### L3-Patch 层（最小 diff，标注 CUSTOM）

| # | 功能 | 文件 | 改动 | 上游冲突 |
|---|------|------|------|---------|
| 1 | `agent` CLI 命令 | index.ts:148 | 注释 `.command(AgentCommand)` | 低 |
| 2 | **keybind 绕过修复** | dialog-command.tsx:66 | `if (!isEnabled(option)) continue` 改为 `if (!isVisible(option)) continue` | **低（1 行，关键修复）** |

### L4-逻辑改动层（需评审，标注 CUSTOM）

| # | 功能 | 维度 | 描述 | 工作量 | 上游冲突 |
|---|------|------|------|-------|---------|
| 1 | Session 级命令屏蔽 | 4 | routes/session/index.tsx 中 /share /compact /undo /redo /timeline /fork /unshare 加 hidden:true（修复 keybind 绕过后生效） | 1h | 低 |
| 2 | Skill 白名单强化 | 5 | skill/index.ts 跳过 skills.paths 和 skills.urls | 0.5h | 低 |
| 3 | 内建 TUI Plugin 裁剪 | 7/9 | plugin/internal.ts 移除 SidebarMcp, SidebarTodo, PluginManager | 0.5h | 中 |
| 4 | 品牌/文本清洗 | 10 | prompt/default.txt + error-component.tsx + OAuth 页面中的 opencode.ai/github 引用 | 2h | 中 |

### ⚠️ 人工审查项 — 已确认 [人工确认 2026-04-11]

| # | 条目 | 决策 | 理由 |
|---|------|------|------|
| 1 | `/rename` `/timestamps` `/thinking` `/copy` `/editor` | ✅ 保留 `/rename` `/copy` `/editor`；❌ 屏蔽 `/timestamps` `/thinking` | rename/copy/editor 属"会话管理"和"终端基础偏好"延伸，零泄漏；timestamps/thinking 是视图细节，价值低，且 thinking 暴露推理过程不利客户对话简洁 |
| 2 | `session_rename` `messages_copy` `tool_details` `messages_toggle_conceal` `scrollbar_toggle` `display_thinking` | ✅ 保留 `session_rename` `messages_copy` `tool_details` `scrollbar_toggle`；❌ 屏蔽 `display_thinking` `messages_toggle_conceal` | 与条目 1 一致性原则；tool_details 调试 C++ 测试生成时实用 |
| 3 | `SidebarContext` `SidebarLsp` | ✅ 全保留 | SidebarContext 用于实时监控 token 用量；SidebarLsp 对 R04/R08（C++ 测试与编译）有间接价值；均无泄漏 |
| 4 | Model favorite/cycle 功能 | ❌ 屏蔽 | 严格白名单 + 客户内网模型数量少 + 状态污染风险 + 屏蔽成本极低 |
| 5 | `/help` 斜杠命令 | ✅ 保留 | 内容简洁无泄漏 + 客户体验刚需 + 维护零成本 |

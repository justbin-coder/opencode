<!-- AGENT_REVIEW_RESULT -->
<!-- agent: codex -->
<!-- timestamp: 2026-04-11T04:58:35Z -->
<!-- duration_seconds: 599.92 -->
<!-- exit_code: 0 -->
<!-- session_id: 019d7ade-d908-7d43-a5ec-6a2a7061acd2 -->

## 维度 1：CLI 命令层

### 枚举结果

| # | 功能/入口 | 源码位置 | 判定 | 屏蔽方式 | 一期已处理 |
|---|----------|---------|------|---------|----------|
| 1 | 默认 TUI 启动 `thread` | `packages/opencode/src/index.ts:137` | ✅ | N/A | 否 |
| 2 | `attach` | `packages/opencode/src/index.ts:138` | ✅ | N/A | 否 |
| 3 | `run` | `packages/opencode/src/index.ts:139` | ✅ | N/A | 否 |
| 4 | `acp` | `packages/opencode/src/index.ts:135` | ✅ | N/A | 否 |
| 5 | `mcp` | `packages/opencode/src/index.ts:136` | ✅ | N/A | 否 |
| 6 | `uninstall` | `packages/opencode/src/index.ts:151` | ✅ | N/A | 否 |
| 7 | `export` | `packages/opencode/src/index.ts:160` | ✅ | N/A | 否 |
| 8 | `import` | `packages/opencode/src/index.ts:161` | ✅ | N/A | 否 |
| 9 | `session` | `packages/opencode/src/index.ts:166` | ✅ | N/A | 否 |
| 10 | `agent` | `packages/opencode/src/index.ts:148` | ❌ | L3 注释 `.command(AgentCommand)` | 否 |
| 11 | `generate` | `packages/opencode/src/index.ts:141` | ❌ | L3 已注释 | 是 |
| 12 | `debug` | `packages/opencode/src/index.ts:143` | ❌ | L3 已注释 | 是 |
| 13 | `account` | `packages/opencode/src/index.ts:145` | ❌ | L3 已注释 | 是 |
| 14 | `providers` | `packages/opencode/src/index.ts:147` | ❌ | L3 已注释 | 是 |
| 15 | `upgrade` | `packages/opencode/src/index.ts:150` | ❌ | L3 已注释 | 是 |
| 16 | `serve` | `packages/opencode/src/index.ts:153` | ❌ | L3 已注释 | 是 |
| 17 | `web` | `packages/opencode/src/index.ts:155` | ❌ | L3 已注释 | 是 |
| 18 | `models` | `packages/opencode/src/index.ts:157` | ❌ | L3 已注释 | 是 |
| 19 | `stats` | `packages/opencode/src/index.ts:159` | ❌ | L3 已注释 | 是 |
| 20 | `github` | `packages/opencode/src/index.ts:163` | ❌ | L3 已注释 | 是 |
| 21 | `pr` | `packages/opencode/src/index.ts:165` | ❌ | L3 已注释 | 是 |
| 22 | `plug` | `packages/opencode/src/index.ts:168` | ❌ | L3 已注释 | 是 |
| 23 | `db` | `packages/opencode/src/index.ts:170` | ❌ | L3 已注释 | 是 |

### 遗漏分析
- 一期已处理 13 个，本次枚举 23 个，差异 10 个
- 但白名单比一期更严格，新增漏项是 `agent`
- 运行验证补充：`bun run dev run --help` 仍可见 `run` 暴露面，且启动时已触发 `models.dev` 外网请求报错，说明 CLI 隐藏不等于运行时禁用

### 建议实现方案
- 直接把 `AgentCommand` 从顶层注册移除
- 保留白名单 9 个入口即可
- `run --help` 即触发模型拉取，需配合维度 6/8 的 env 默认值

---

## 维度 2：TUI 命令面板

### 枚举结果

| # | 功能/入口 | 源码位置 | 判定 | 屏蔽方式 | 一期已处理 |
|---|----------|---------|------|---------|----------|
| 1 | Switch session | `packages/opencode/src/cli/cmd/tui/app.tsx:448` | ✅ | N/A | 否 |
| 2 | Manage workspaces | `packages/opencode/src/cli/cmd/tui/app.tsx:464` | ❌ | L0 `OPENCODE_EXPERIMENTAL_WORKSPACES=0` | 否 |
| 3 | New session | `packages/opencode/src/cli/cmd/tui/app.tsx:478` | ✅ | N/A | 否 |
| 4 | Switch model | `packages/opencode/src/cli/cmd/tui/app.tsx:502` | ✅ | N/A | 否 |
| 5 | Model cycle | `packages/opencode/src/cli/cmd/tui/app.tsx:515` | ⚠️ | L4 或保留 | 否 |
| 6 | Model cycle reverse | `packages/opencode/src/cli/cmd/tui/app.tsx:525` | ⚠️ | L4 或保留 | 否 |
| 7 | Favorite cycle | `packages/opencode/src/cli/cmd/tui/app.tsx:535` | ❌ | L4 禁触发 | 否 |
| 8 | Favorite cycle reverse | `packages/opencode/src/cli/cmd/tui/app.tsx:545` | ❌ | L4 禁触发 | 否 |
| 9 | Switch agent | `packages/opencode/src/cli/cmd/tui/app.tsx:555` | ✅ | N/A | 否 |
| 10 | Toggle MCPs | `packages/opencode/src/cli/cmd/tui/app.tsx:567` | ❌ | L4 禁触发 | 否 |
| 11 | Agent cycle | `packages/opencode/src/cli/cmd/tui/app.tsx:578` | ✅ | N/A | 否 |
| 12 | Variant cycle | `packages/opencode/src/cli/cmd/tui/app.tsx:588` | ✅ | N/A | 否 |
| 13 | Switch model variant | `packages/opencode/src/cli/cmd/tui/app.tsx:597` | ✅ | N/A | 否 |
| 14 | Agent cycle reverse | `packages/opencode/src/cli/cmd/tui/app.tsx:609` | ✅ | N/A | 否 |
| 15 | Connect provider | `packages/opencode/src/cli/cmd/tui/app.tsx:619` | ❌ | L4 禁触发 | 是 |
| 16 | View status | `packages/opencode/src/cli/cmd/tui/app.tsx:632` | ✅ | N/A | 否 |
| 17 | Switch theme | `packages/opencode/src/cli/cmd/tui/app.tsx:645` | ❌ | L4 禁触发 | 是 |
| 18 | Toggle Theme Mode | `packages/opencode/src/cli/cmd/tui/app.tsx:658` | ❌ | L4 禁触发 | 是 |
| 19 | Lock Theme Mode | `packages/opencode/src/cli/cmd/tui/app.tsx:668` | ❌ | L4 禁触发 | 是 |
| 20 | Help | `packages/opencode/src/cli/cmd/tui/app.tsx:679` | ❌ | L4 禁触发 | 否 |
| 21 | Open docs | `packages/opencode/src/cli/cmd/tui/app.tsx:690` | ❌ | L3 已隐藏 + L4 禁触发 | 是 |
| 22 | Exit the app | `packages/opencode/src/cli/cmd/tui/app.tsx:700` | ✅ | N/A | 否 |
| 23 | Toggle debug panel | `packages/opencode/src/cli/cmd/tui/app.tsx:710` | ❌ | L3 已隐藏 + L4 禁触发 | 是 |
| 24 | Toggle console | `packages/opencode/src/cli/cmd/tui/app.tsx:720` | ❌ | L3 已隐藏 + L4 禁触发 | 是 |
| 25 | Write heap snapshot | `packages/opencode/src/cli/cmd/tui/app.tsx:730` | ❌ | L3 已隐藏 + L4 禁触发 | 是 |
| 26 | Suspend terminal | `packages/opencode/src/cli/cmd/tui/app.tsx:745` | ✅ | N/A | 否 |
| 27 | Toggle terminal title | `packages/opencode/src/cli/cmd/tui/app.tsx:761` | ✅ | N/A | 否 |
| 28 | Toggle animations | `packages/opencode/src/cli/cmd/tui/app.tsx:776` | ✅ | N/A | 否 |
| 29 | Toggle diff wrap | `packages/opencode/src/cli/cmd/tui/app.tsx:785` | ✅ | N/A | 否 |
| 30 | Tips toggle | `packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips.tsx:20` | ❌ | L4 禁触发 | 是 |
| 31 | Plugins | `packages/opencode/src/cli/cmd/tui/feature-plugins/system/plugins.tsx:246` | ❌ | L3 已隐藏 + L4 禁触发 | 是 |
| 32 | Install plugin | `packages/opencode/src/cli/cmd/tui/feature-plugins/system/plugins.tsx:256` | ❌ | L3 已隐藏 + L4 禁触发 | 是 |

### 遗漏分析
- 一期已处理 10 个，本次枚举 32 个，差异 22 个
- 新发现的需屏蔽项：`workspaces` `Toggle MCPs` `Help` `Tips toggle`，以及所有“hidden:true 但仍可触发”的非白名单项

### 建议实现方案
- 仅靠 `hidden:true` 不够
- 根因在 `dialog-command.tsx:63-73`：隐藏项仍参与 keybind 触发
- 最优做法：对白名单外命令直接不注册；次优做法是在 `useKeyboard` 和 `trigger()` 中同时检查 `!hidden`

---

## 维度 3：TUI 键盘快捷键

### 说明
- `packages/opencode/src/cli/cmd/tui/keybind/` 目录不存在
- 实际定义在 `packages/opencode/src/config/config.ts:647`
- 实际触发逻辑在 `packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx:63`，这里对所有 `entries()` 匹配 keybind，不过滤 `hidden`

### 枚举结果

| # | 快捷键功能 | 源码位置 | 判定 | 屏蔽方式 | 一期已处理 |
|---|-----------|---------|------|---------|----------|
| 1 | `command_list` `ctrl+p` | `packages/opencode/src/config/config.ts:704` | ✅ | N/A | 否 |
| 2 | `session_new` | `packages/opencode/src/config/config.ts:658` | ✅ | N/A | 否 |
| 3 | `session_list` | `packages/opencode/src/config/config.ts:659` | ✅ | N/A | 否 |
| 4 | `model_list` | `packages/opencode/src/config/config.ts:699` | ✅ | N/A | 否 |
| 5 | `agent_list` | `packages/opencode/src/config/config.ts:705` | ✅ | N/A | 否 |
| 6 | `agent_cycle` `tab` | `packages/opencode/src/config/config.ts:706` | ✅ | N/A | 否 |
| 7 | `agent_cycle_reverse` `shift+tab` | `packages/opencode/src/config/config.ts:707` | ✅ | N/A | 否 |
| 8 | `variant_cycle` `ctrl+t` | `packages/opencode/src/config/config.ts:708` | ✅ | N/A | 否 |
| 9 | `status_view` | `packages/opencode/src/config/config.ts:656` | ✅ | N/A | 否 |
| 10 | `terminal_suspend` | `packages/opencode/src/config/config.ts:796` | ✅ | N/A | 否 |
| 11 | `terminal_title_toggle` | `packages/opencode/src/config/config.ts:797` | ✅ | N/A | 否 |
| 12 | `theme_list` | `packages/opencode/src/config/config.ts:652` | ❌ | L4 禁触发 | 一期仅隐藏 |
| 13 | `tips_toggle` | `packages/opencode/src/config/config.ts:798` | ❌ | L4 禁触发 | 一期仅隐藏 |
| 14 | `plugin_manager` | `packages/opencode/src/config/config.ts:799` | ❌ | L4 禁触发 | 一期仅隐藏 |
| 15 | `model_provider_list` | `packages/opencode/src/config/config.ts:665` | ❌ | L4 禁触发 | 一期仅隐藏 |
| 16 | `session_share` | `packages/opencode/src/config/config.ts:667` | ❌ | L4 禁触发 | 否 |
| 17 | `session_unshare` | `packages/opencode/src/config/config.ts:668` | ❌ | L4 禁触发 | 否 |
| 18 | `session_compact` | `packages/opencode/src/config/config.ts:670` | ❌ | L4 禁触发 | 否 |
| 19 | `session_timeline` | `packages/opencode/src/config/config.ts:660` | ❌ | L4 禁触发 | 否 |
| 20 | `session_fork` | `packages/opencode/src/config/config.ts:661` | ❌ | L4 禁触发 | 否 |
| 21 | `session_rename` | `packages/opencode/src/config/config.ts:662` | ⚠️ | L4 或保留 | 否 |
| 22 | `messages_undo` | `packages/opencode/src/config/config.ts:691` | ❌ | L4 禁触发 | 否 |
| 23 | `messages_redo` | `packages/opencode/src/config/config.ts:692` | ❌ | L4 禁触发 | 否 |
| 24 | `messages_toggle_conceal` | `packages/opencode/src/config/config.ts:693` | ⚠️ | L4 或保留 | 否 |
| 25 | `display_thinking` | `packages/opencode/src/config/config.ts:800` | ⚠️ | L4 或保留 | 否 |
| 26 | `tool_details` | `packages/opencode/src/config/config.ts:698` | ⚠️ | L4 或保留 | 否 |
| 27 | `scrollbar_toggle` | `packages/opencode/src/config/config.ts:654` | ⚠️ | L4 或保留 | 否 |
| 28 | `messages_copy` | `packages/opencode/src/config/config.ts:690` | ⚠️ | L4 或保留 | 否 |
| 29 | `session_export` | `packages/opencode/src/config/config.ts:657` | ✅ | N/A | 否 |
| 30 | 子会话导航 `session_parent/session_child_*` | `packages/opencode/src/config/config.ts:792` | ❌ | L4 禁触发 | 否 |

### 遗漏分析
- 一期没有覆盖 keybind 运行时
- 实机验证：命令面板中搜索 `theme` 返回 “No results found”，但源码证明同名隐藏命令仍可被 keybind 直达，这是典型“UI 隐藏不等于禁用”

### 建议实现方案
- 必改 `dialog-command.tsx:66-70`，把 `hidden` 条件纳入 keybind 触发
- 更稳妥的是白名单注册，不给非交付命令分配 keybind

---

## 维度 4：斜杠命令（内置）

### 枚举结果

| # | Slash | 源码位置 | 判定 | 屏蔽方式 | 一期已处理 |
|---|------|---------|------|---------|----------|
| 1 | `/sessions` `/resume` `/continue` | `packages/opencode/src/cli/cmd/tui/app.tsx:453` | ✅ | N/A | 否 |
| 2 | `/workspaces` | `packages/opencode/src/cli/cmd/tui/app.tsx:468` | ❌ | L0 `OPENCODE_EXPERIMENTAL_WORKSPACES=0` | 否 |
| 3 | `/new` `/clear` | `packages/opencode/src/cli/cmd/tui/app.tsx:483` | ✅ | N/A | 否 |
| 4 | `/models` | `packages/opencode/src/cli/cmd/tui/app.tsx:507` | ✅ | N/A | 否 |
| 5 | `/agents` | `packages/opencode/src/cli/cmd/tui/app.tsx:559` | ✅ | N/A | 否 |
| 6 | `/mcps` | `packages/opencode/src/cli/cmd/tui/app.tsx:570` | ❌ | L4 不注册 | 否 |
| 7 | `/variants` | `packages/opencode/src/cli/cmd/tui/app.tsx:601` | ✅ | N/A | 否 |
| 8 | `/connect` | `packages/opencode/src/cli/cmd/tui/app.tsx:623` | 已隐藏 | L3 已生效 | 是 |
| 9 | `/status` | `packages/opencode/src/cli/cmd/tui/app.tsx:636` | ✅ | N/A | 否 |
| 10 | `/themes` | `packages/opencode/src/cli/cmd/tui/app.tsx:649` | 已隐藏 | L3 已生效 | 是 |
| 11 | `/help` | `packages/opencode/src/cli/cmd/tui/app.tsx:681` | ❌ | L4 不注册 | 否 |
| 12 | `/exit` `/quit` `/q` | `packages/opencode/src/cli/cmd/tui/app.tsx:702` | ✅ | N/A | 否 |
| 13 | `/share` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:368` | ❌ | L4 不注册 | 否 |
| 14 | `/rename` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:401` | ⚠️ | L4 或保留 | 否 |
| 15 | `/timeline` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:413` | ❌ | L4 不注册 | 否 |
| 16 | `/fork` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:436` | ❌ | L4 不注册 | 否 |
| 17 | `/compact` `/summarize` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:458` | ❌ | L4 不注册 | 否 |
| 18 | `/unshare` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:486` | ❌ | L4 不注册 | 否 |
| 19 | `/undo` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:509` | ❌ | L4 不注册 | 否 |
| 20 | `/redo` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:548` | ❌ | L4 不注册 | 否 |
| 21 | `/timestamps` `/toggle-timestamps` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:597` | ⚠️ | L4 或保留 | 否 |
| 22 | `/thinking` `/toggle-thinking` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:611` | ⚠️ | L4 或保留 | 否 |
| 23 | `/copy` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:832` | ⚠️ | L4 或保留 | 否 |
| 24 | `/export` | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:862` | ✅ | N/A | 否 |
| 25 | `/editor` | `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx:284` | ⚠️ | L4 或保留 | 否 |
| 26 | `/skills` | `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx:370` | ✅* | L4 仅在技能白名单完成后保留 | 否 |

### 遗漏分析
- Slash 自动补全来自 `command.slashes()`，只收集 `visibleOptions()`，见 `dialog-command.tsx:86`
- 一期只处理了 `/connect` `/themes`，未处理 session 级 slash 泄漏

### 建议实现方案
- 最稳妥：把白名单外 slash 的命令对象直接移除
- `/skills` 只能在维度 5 的 Skill 白名单彻底锁住后保留

---

## 维度 5：Skill 加载路径

### 枚举结果

| # | 路径/来源 | 源码位置 | 判定 | 屏蔽方式 | 一期已处理 |
|---|----------|---------|------|---------|----------|
| 1 | `~/.claude/skills/**/SKILL.md` | `packages/opencode/src/skill/index.ts:147` | ❌ | L0 `OPENCODE_DISABLE_EXTERNAL_SKILLS=1` | 否 |
| 2 | `~/.agents/skills/**/SKILL.md` | `packages/opencode/src/skill/index.ts:147` | ❌ | L0 同上 | 否 |
| 3 | 项目向上查找 `.claude/skills/**/SKILL.md` | `packages/opencode/src/skill/index.ts:153` | ❌ | L0 同上 | 否 |
| 4 | 项目向上查找 `.agents/skills/**/SKILL.md` | `packages/opencode/src/skill/index.ts:153` | ❌ | L0 同上 | 否 |
| 5 | 配置目录 `{skill,skills}/**/SKILL.md` | `packages/opencode/src/skill/index.ts:162` | ⚠️ | L4 改为仅 `.opencode/skills` | 否 |
| 6 | `cfg.skills.paths[]` 本地路径 | `packages/opencode/src/skill/index.ts:168` | ❌ | L4 忽略非 `.opencode/skills` | 否 |
| 7 | `cfg.skills.urls[]` 远程拉取 | `packages/opencode/src/skill/index.ts:179` | ❌ | L4 直接禁用 URL | 否 |
| 8 | 远程 index.json 拉取与文件下载 | `packages/opencode/src/skill/discovery.ts:55` | ❌ | L4 禁 Discovery.pull | 否 |

### 遗漏分析
- 一期未覆盖
- `OPENCODE_DISABLE_EXTERNAL_SKILLS` 只能挡住 `.claude/.agents` 两类外部目录
- 它挡不住 `config.directories()`、`skills.paths`、`skills.urls`
- 结论：`OPENCODE_DISABLE_EXTERNAL_SKILLS` 不足以实现“仅 .opencode/skills 白名单”

### 建议实现方案
- 必须改 `loadSkills()`：
- 仅保留 `config.directories()` 里以 `.opencode` 结尾的目录
- 仅扫描 `.opencode/skills/**/SKILL.md`
- 忽略 `skills.paths`
- 忽略 `skills.urls`
- 再对技能名做白名单过滤：`req-structuring` `cpp-test-gen` `cpp-code-search` `cpp-compile-fix`

---

## 维度 6：Feature Flag 全量枚举

### 枚举结果
来源：`packages/opencode/src/flag/flag.ts:13`

| Flag | DevPilot 推荐值 | 结论 |
|------|----------------|------|
| `OPENCODE_AUTO_SHARE` | `0` | 禁止自动分享 |
| `OPENCODE_GIT_BASH_PATH` | 空 | 平台相关 |
| `OPENCODE_CONFIG` | 空 | 非锁定开关 |
| `OPENCODE_PURE` | `1` | 禁外部 server/tui plugin |
| `OPENCODE_TUI_CONFIG` | 空 | 非锁定开关 |
| `OPENCODE_CONFIG_DIR` | 可设 | 若交付全局技能目录需指定 |
| `OPENCODE_PLUGIN_META_FILE` | 空 | 非必要 |
| `OPENCODE_CONFIG_CONTENT` | 空 | 非必要 |
| `OPENCODE_DISABLE_AUTOUPDATE` | `1` | 禁自动更新 |
| `OPENCODE_ALWAYS_NOTIFY_UPDATE` | `0` | 禁更新提示 |
| `OPENCODE_DISABLE_PRUNE` | `0` | 可保留 |
| `OPENCODE_DISABLE_TERMINAL_TITLE` | `0` | 白名单允许 |
| `OPENCODE_SHOW_TTFD` | `0` | 调试项 |
| `OPENCODE_PERMISSION` | 显式配置 | 建议交付固定权限策略 |
| `OPENCODE_DISABLE_DEFAULT_PLUGINS` | 不依赖 | 当前无实际消费 |
| `OPENCODE_DISABLE_LSP_DOWNLOAD` | `1` | 禁外网下载 LSP |
| `OPENCODE_ENABLE_EXPERIMENTAL_MODELS` | `0` | 禁实验模型 |
| `OPENCODE_DISABLE_AUTOCOMPACT` | `1` | 禁自动 compact |
| `OPENCODE_DISABLE_MODELS_FETCH` | `1` | 禁 models.dev 拉取 |
| `OPENCODE_DISABLE_CLAUDE_CODE` | `1` | 一次性关掉 Claude prompt/skills |
| `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT` | `1` | 冗余但建议显式 |
| `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` | `1` | 冗余但建议显式 |
| `OPENCODE_DISABLE_EXTERNAL_SKILLS` | `1` | 仅挡 `.claude/.agents` |
| `OPENCODE_DISABLE_PROJECT_CONFIG` | `0` | 不能开，否则 `.opencode` 也没了 |
| `OPENCODE_FAKE_VCS` | 空 | 调试项 |
| `OPENCODE_CLIENT` | `cli` | 默认即可 |
| `OPENCODE_SERVER_PASSWORD` | 按部署 | 仅 attach/acp 场景 |
| `OPENCODE_SERVER_USERNAME` | 按部署 | 同上 |
| `OPENCODE_ENABLE_QUESTION_TOOL` | `0` | 非白名单 |
| `OPENCODE_EXPERIMENTAL` | `0` | 总闸关闭 |
| `OPENCODE_EXPERIMENTAL_FILEWATCHER` | `0` | 实验项 |
| `OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER` | `0/1` | 视部署 |
| `OPENCODE_EXPERIMENTAL_ICON_DISCOVERY` | `0` | 实验项 |
| `OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT` | `0` | 体验项 |
| `OPENCODE_ENABLE_EXA` | `0` | 禁 Exa 搜索工具 |
| `OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS` | 空 | 非锁定 |
| `OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX` | 空 | 非锁定 |
| `OPENCODE_EXPERIMENTAL_OXFMT` | `0` | 实验项 |
| `OPENCODE_EXPERIMENTAL_LSP_TY` | `0` | 实验项 |
| `OPENCODE_EXPERIMENTAL_LSP_TOOL` | `0` | 实验项 |
| `OPENCODE_DISABLE_FILETIME_CHECK` | `0` | 非锁定 |
| `OPENCODE_EXPERIMENTAL_PLAN_MODE` | `0` | 非交付 |
| `OPENCODE_EXPERIMENTAL_WORKSPACES` | `0` | 禁 workspaces |
| `OPENCODE_EXPERIMENTAL_MARKDOWN` | 保持默认 | 与锁定无关 |
| `OPENCODE_MODELS_URL` | 空 | 不应走外网 |
| `OPENCODE_MODELS_PATH` | 可设本地快照 | 若要离线模型元数据 |
| `OPENCODE_DISABLE_EMBEDDED_WEB_UI` | `0` | 避免 fallback 到外网 app |
| `OPENCODE_DB` | 可设 | 可固定 DB 路径 |
| `OPENCODE_DISABLE_CHANNEL_DB` | `1` | 建议，用于规避频道 DB 哨兵 bug |
| `OPENCODE_SKIP_MIGRATIONS` | `0` | 非常规不要开 |
| `OPENCODE_STRICT_CONFIG_DEPS` | `1` | 降低配置漂移 |

### 遗漏分析
- `OPENCODE_DISABLE_DEFAULT_PLUGINS` 是伪开关：仅定义，未被消费
- `OPENCODE_DISABLE_EXTERNAL_SKILLS` 不是完整技能白名单开关
- `OPENCODE_DISABLE_CHANNEL_DB=1` 不是产品锁定需求，但可规避当前 `index.ts:96` 与 `storage/db.ts:31` 的 DB 路径不一致问题

### 建议实现方案
- `bin/devpilot` 至少注入：
  `OPENCODE_PURE=1`
  `OPENCODE_DISABLE_AUTOUPDATE=1`
  `OPENCODE_DISABLE_MODELS_FETCH=1`
  `OPENCODE_DISABLE_LSP_DOWNLOAD=1`
  `OPENCODE_DISABLE_CLAUDE_CODE=1`
  `OPENCODE_DISABLE_EXTERNAL_SKILLS=1`
  `OPENCODE_DISABLE_AUTOCOMPACT=1`
  `OPENCODE_EXPERIMENTAL_WORKSPACES=0`
  `OPENCODE_ENABLE_EXA=0`
  `OPENCODE_ENABLE_QUESTION_TOOL=0`
  `OPENCODE_DISABLE_CHANNEL_DB=1`

---

## 维度 7：TUI 面板/组件

### 枚举结果

| # | 面板/组件 | 源码位置 | 判定 | 屏蔽方式 | 一期已处理 |
|---|----------|---------|------|---------|----------|
| 1 | Home footer | `packages/opencode/src/cli/cmd/tui/feature-plugins/home/footer.tsx:77` | ✅ | N/A | 否 |
| 2 | Home tips panel | `packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips.tsx:32` | ❌ | L3 已隐藏 | 是 |
| 3 | Sidebar context | `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/context.tsx:47` | ⚠️ | L4 或保留 | 否 |
| 4 | Sidebar files | `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/files.tsx:46` | ✅ | N/A | 否 |
| 5 | Sidebar footer / Getting Started | `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx:18` | ⚠️ | L4 文案清洗 | 一期仅隐藏 Getting Started |
| 6 | Sidebar LSP | `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/lsp.tsx:50` | ⚠️ | L4 或保留 | 否 |
| 7 | Sidebar MCP | `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/mcp.tsx:80` | ❌ | L4 不加载该 plugin | 否 |
| 8 | Sidebar Todo | `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/todo.tsx:32` | ❌ | L4 不加载该 plugin | 否 |
| 9 | Plugin manager panel | `packages/opencode/src/cli/cmd/tui/feature-plugins/system/plugins.tsx:243` | ❌ | L4 不加载该 plugin | 是 |

### 遗漏分析
- 内部 TUI plugins 默认全量加载，见 `packages/opencode/src/cli/cmd/tui/plugin/internal.ts:17`
- 一期只隐藏了 Tips、Getting Started、Plugin UI，没有从加载层裁剪
- 运行验证：首页仍显示 `Build / Big Pickle / OpenCode Zen`，且 footer 暴露环境状态

### 建议实现方案
- 最优：在 `plugin/internal.ts` 只保留白名单插件
- 推荐保留：`home/footer` `sidebar/files`
- 需评估：`sidebar/context` `sidebar/lsp`
- 建议移除：`home/tips` `sidebar/mcp` `sidebar/todo` `system/plugins`

---

## 维度 8：网络调用

### 枚举结果

| # | 网络路径 | 源码位置 | 判定 | 屏蔽方式 | 一期已处理 |
|---|---------|---------|------|---------|----------|
| 1 | 自动更新检查 | `packages/opencode/src/cli/upgrade.ts:6` | ❌ | L0 `OPENCODE_DISABLE_AUTOUPDATE=1` | 否 |
| 2 | 升级版本查询/API | `packages/opencode/src/installation/index.ts:208` | ❌ | L0 同上 + CLI 已隐藏 | 否 |
| 3 | `models.dev` 拉取与后台 refresh | `packages/opencode/src/provider/models.ts:96` | ❌ | L0 `OPENCODE_DISABLE_MODELS_FETCH=1` | 否 |
| 4 | LSP 自动下载 | `packages/opencode/src/lsp/server.ts:141` | ❌ | L0 `OPENCODE_DISABLE_LSP_DOWNLOAD=1` | 否 |
| 5 | Skill 远程拉取 `skills.urls` | `packages/opencode/src/skill/index.ts:179` | ❌ | L4 禁用 | 否 |
| 6 | Skill discovery index/file 下载 | `packages/opencode/src/skill/discovery.ts:55` | ❌ | L4 禁用 | 否 |
| 7 | 远程 instructions URL | `packages/opencode/src/session/instruction.ts:127` | ❌ | L4 禁 http(s) instructions | 否 |
| 8 | Session share create/sync/remove | `packages/opencode/src/share/share-next.ts:113` | ❌ | L0 `OPENCODE_DISABLE_SHARE=1` + L4 隐藏 share 功能 | 否 |
| 9 | `import` 从 share URL 拉数据 | `packages/opencode/src/cli/cmd/import.ts:98` | ⚠️ | 若保留 import，仅允许本地文件 | 否 |
| 10 | Provider `.well-known/opencode` 登录 | `packages/opencode/src/cli/cmd/providers.ts:279` | ❌ | CLI 已隐藏 | 是 |
| 11 | Plugin npm 安装/解析 | `packages/opencode/src/plugin/shared.ts:190` | ❌ | L0 `OPENCODE_PURE=1` + L4 UI 禁装 | 否 |
| 12 | TUI plugin 依赖安装 | `packages/opencode/src/config/tui.ts:168` | ❌ | L0 `OPENCODE_PURE=1` | 否 |
| 13 | Web UI 外网代理到 `app.opencode.ai` | `packages/opencode/src/server/instance.ts:269` | ❌ | L3 CLI 已隐藏 `web/serve`，最好 L4 禁 fallback | 否 |
| 14 | `websearch` 调 Exa | `packages/opencode/src/tool/websearch.ts:103` | ❌ | L0 `OPENCODE_ENABLE_EXA=0` + L4 工具白名单去除 | 否 |
| 15 | `codesearch` 调 Exa | `packages/opencode/src/tool/codesearch.ts:85` | ❌ | L0 同上 | 否 |

### 遗漏分析
- 一期未覆盖运行时网络
- 已证实 `run --help` 就会触发 `models.dev` 外网失败
- 网络面最大漏项不是 UI，而是后台任务与隐式加载

### 建议实现方案
- 先用 env 全关：update/models/LSP/EXA/share
- 再补逻辑：禁 `skills.urls`、禁远程 instructions、禁 import URL、禁 web fallback

---

## 维度 9：Plugin 系统

### 枚举结果

| # | 功能/机制 | 源码位置 | 判定 | 屏蔽方式 | 一期已处理 |
|---|----------|---------|------|---------|----------|
| 1 | 内建 server plugins: Codex/Copilot/Gitlab/Poe auth | `packages/opencode/src/plugin/index.ts:53` | ⚠️ | L4 按交付 provider 裁剪 | 否 |
| 2 | 内建 TUI plugins 全量加载 | `packages/opencode/src/cli/cmd/tui/plugin/internal.ts:17` | ⚠️ | L4 白名单 internal plugins | 否 |
| 3 | 外部 server plugins from config | `packages/opencode/src/plugin/index.ts:145` | ❌ | L0 `OPENCODE_PURE=1` | 否 |
| 4 | 外部 TUI plugins from config | `packages/opencode/src/cli/cmd/tui/plugin/runtime.ts:949` | ❌ | L0 `OPENCODE_PURE=1` | 否 |
| 5 | Plugin 安装解析走 npm | `packages/opencode/src/plugin/shared.ts:190` | ❌ | L0 `OPENCODE_PURE=1` | 否 |
| 6 | Plugin 管理 UI | `packages/opencode/src/cli/cmd/tui/feature-plugins/system/plugins.tsx:243` | ❌ | L4 不加载 + 一期隐藏 | 是 |
| 7 | `OPENCODE_DISABLE_DEFAULT_PLUGINS` | `packages/opencode/src/flag/flag.ts:28` | ❌ 无效 | L4 修实现或不要依赖 | 否 |

### 遗漏分析
- `OPENCODE_DISABLE_DEFAULT_PLUGINS` 没有任何消费点，实际无效果
- `OPENCODE_PURE` 有效，但只挡外部 plugin，不挡内建 plugin
- 所以“plugin 系统本身是否需要禁用”的答案是：
  - 外部 plugin 系统必须禁
  - 内建 plugin 需要白名单裁剪，不能只藏 UI

### 建议实现方案
- `OPENCODE_PURE=1`
- `internal.ts` 只保留交付所需 internal TUI plugin
- `plugin/index.ts` 内建 server auth plugin 也要按交付 provider 裁剪

---

## 维度 10：品牌/文本泄漏

### 枚举结果

| # | 泄漏内容 | 源码位置 | 判定 | 屏蔽方式 | 一期已处理 |
|---|---------|---------|------|---------|----------|
| 1 | `OpenCode Zen` 首页模型文案 | 运行验证；来源 `provider` 数据 | ❌ | L4 仅保留内网 provider/model | 否 |
| 2 | `Big Pickle` 首页 agent/模型文案 | 运行验证 | ⚠️ | 取决于交付命名 | 否 |
| 3 | `OpenCode` OAuth 成功/失败页 | `packages/opencode/src/mcp/oauth-callback.ts:10` | ❌ | L4 改文案 | 否 |
| 4 | `client_name: "OpenCode"` | `packages/opencode/src/mcp/oauth-provider.ts:41` | ❌ | L4 改品牌 | 否 |
| 5 | `client_uri: https://opencode.ai` | `packages/opencode/src/mcp/oauth-provider.ts:42` | ❌ | L4 改 URI/移除 | 否 |
| 6 | docs 外链 `https://opencode.ai/docs` | `packages/opencode/src/cli/cmd/tui/app.tsx:694` | ❌ | 已隐藏，但仍需禁触发 | 一期部分 |
| 7 | bug 上报 GitHub issues | `packages/opencode/src/cli/cmd/tui/component/error-component.tsx:33` | ❌ | L4 改为内网支持地址 | 否 |
| 8 | `opencode.ai/config.json` schema | `packages/opencode/src/config/config.ts:1223` | ❌ | L4 改 schema URL | 否 |
| 9 | `opencode.ai/tui.json` schema | `packages/opencode/src/config/migrate-tui-config.ts:15` | ❌ | L4 改 schema URL | 否 |
| 10 | Theme schema URL `https://opencode.ai/theme.json` | `packages/opencode/src/cli/cmd/tui/context/theme/opencode.json:2` | ❌ | L4 批量替换 | 否 |
| 11 | `app.opencode.ai` web fallback | `packages/opencode/src/server/instance.ts:269` | ❌ | L4 禁 fallback | 否 |
| 12 | 提示文案中 `/share` `/connect` `/themes` `/review` `serve` `upgrade` `auth list` 等 | `packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips-view.tsx:53` | ❌ | L4 重写 tips 或直接不加载 | 否 |
| 13 | Prompt system 中 GitHub/docs/opencode 文案 | `packages/opencode/src/session/prompt/default.txt:6` | ❌ | L4 重写 prompt 文本 | 否 |
| 14 | `thread`/`attach` 描述仍写 opencode | `packages/opencode/src/cli/cmd/tui/thread.ts:69` `attach.ts:11` | ❌ | L4 文案替换 | 否 |

### 遗漏分析
- 一期品牌替换集中在 `brand.ts`，但大量用户可见文本仍散落在 prompt、schema URL、OAuth 页面、错误页、tips、fallback URL
- 实机首页直接出现 `OpenCode Zen`

### 建议实现方案
- 单独做一次“文本与外链清洗”
- 先扫：
  `opencode.ai`
  `app.opencode.ai`
  `github.com/anomalyco/opencode`
  `Discord`
  `OpenCode`
- 重点清洗用户可见文本，不必动包名/内部命名

---

## 能力矩阵汇总

### 一期已覆盖（验证完整性）

| 维度 | 一期处理数 | 本次枚举总数 | 遗漏数 | 遗漏项 |
|------|----------|-----------|-------|-------|
| CLI 命令层 | 13 | 23 | 1 | `agent` |
| TUI 命令面板 | 10 | 32 | 12+ | `workspaces` `mcps` `help` `tips` 及所有 hidden 直达路径 |
| TUI 键盘快捷键 | 0 | 30 | 10+ | `theme_list` `model_provider_list` `tips_toggle` `plugin_manager` 等 |
| Slash Commands | 2 | 26 | 14+ | `share` `compact` `undo` `redo` `timeline` `fork` `mcps` |
| Skill 加载路径 | 0 | 8 | 6 | `skills.paths` `skills.urls` `configDirs` |
| Feature Flag | 0 | 49 | 0 | 一期未做策略层 |
| TUI 面板/组件 | 3 | 9 | 4+ | `sidebar/mcp` `sidebar/todo` `plugin manager` 加载层未裁剪 |
| 网络调用 | 0 | 15 | 15 | update/models/LSP/share/plugin/Exa/web fallback |
| Plugin 系统 | 2 | 7 | 4 | 外部 plugin、内建 plugin 白名单、伪 flag |
| 品牌/文本泄漏 | 0 | 14 | 14 | `OpenCode Zen` `schema URL` `OAuth` `tips` `prompt` |

### 新增需屏蔽项（按优先级排序）

| # | 功能 | 维度 | 源码位置 | 屏蔽方式 | 工作量 | 上游冲突风险 |
|---|------|------|---------|---------|-------|------------|
| 1 | Hidden 命令仍可被 keybind 触发 | 2/3 | `packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx:63` | L4 | 小 | 低 |
| 2 | 外部 Skill 非白名单路径 | 5 | `packages/opencode/src/skill/index.ts:146` | L4 | 中 | 低 |
| 3 | `skills.urls` 远程拉取 | 5/8 | `packages/opencode/src/skill/index.ts:179` | L4 | 小 | 低 |
| 4 | `models.dev` 后台拉取 | 8 | `packages/opencode/src/provider/models.ts:124` | L0 | 小 | 低 |
| 5 | LSP 自动下载 | 8 | `packages/opencode/src/lsp/server.ts:141` | L0 | 小 | 低 |
| 6 | 自动更新与升级检查 | 8 | `packages/opencode/src/cli/upgrade.ts:18` | L0 | 小 | 低 |
| 7 | `agent` CLI 命令漏保留 | 1 | `packages/opencode/src/index.ts:148` | L3 | 小 | 低 |
| 8 | Session share/compact/undo/redo/fork/timeline | 4 | `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:360` | L4 | 中 | 低 |
| 9 | MCP TUI 管理与 sidebar MCP | 2/7 | `packages/opencode/src/cli/cmd/tui/app.tsx:567` | L4 | 中 | 低 |
| 10 | Plugin 系统默认装载 | 7/9 | `packages/opencode/src/cli/cmd/tui/plugin/internal.ts:17` | L4 | 中 | 中 |
| 11 | `OPENCODE_DISABLE_DEFAULT_PLUGINS` 无效 | 6/9 | `packages/opencode/src/flag/flag.ts:28` | L4 | 小 | 低 |
| 12 | 首页 provider 自动弹窗 | 2 | `packages/opencode/src/cli/cmd/tui/app.tsx:434` | L4 | 小 | 低 |
| 13 | Tips 文案大量功能泄漏 | 10 | `packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips-view.tsx:53` | L4 | 小 | 低 |
| 14 | Web fallback 到 `app.opencode.ai` | 8/10 | `packages/opencode/src/server/instance.ts:269` | L4 | 小 | 中 |
| 15 | DB 哨兵与频道 DB 路径不一致 | 运行验证 | `packages/opencode/src/index.ts:96` / `storage/db.ts:31` | L0 或 L4 | 小 | 低 |

### 推荐 env flag 配置（bin/devpilot 注入）

| Flag | 推荐值 | 效果 |
|------|-------|------|
| `OPENCODE_PURE` | `1` | 禁外部 server/tui plugin |
| `OPENCODE_DISABLE_AUTOUPDATE` | `1` | 禁更新检查 |
| `OPENCODE_ALWAYS_NOTIFY_UPDATE` | `0` | 禁更新提示 |
| `OPENCODE_DISABLE_MODELS_FETCH` | `1` | 禁 `models.dev` 拉取 |
| `OPENCODE_DISABLE_LSP_DOWNLOAD` | `1` | 禁 LSP 自动下载 |
| `OPENCODE_DISABLE_CLAUDE_CODE` | `1` | 禁 `.claude` prompt/skills |
| `OPENCODE_DISABLE_EXTERNAL_SKILLS` | `1` | 禁 `.claude/.agents` skill 扫描 |
| `OPENCODE_DISABLE_AUTOCOMPACT` | `1` | 禁自动 compact |
| `OPENCODE_EXPERIMENTAL_WORKSPACES` | `0` | 禁 workspace UI |
| `OPENCODE_ENABLE_EXA` | `0` | 禁 Exa 搜索工具 |
| `OPENCODE_ENABLE_QUESTION_TOOL` | `0` | 禁 question tool |
| `OPENCODE_DISABLE_CHANNEL_DB` | `1` | 规避当前频道 DB 启动 bug |
| `OPENCODE_STRICT_CONFIG_DEPS` | `1` | 严格依赖，减少漂移 |

### 人工审查清单
- 是否保留 `session rename`
- 是否保留 `timestamps/thinking/tool details/copy transcript`
- 是否保留 `sidebar context` 与 `sidebar lsp`
- 是否保留模型 variant/favorite/cycle 这类“增强型模型切换”
- 内建 auth plugin 需要裁掉哪些 provider
- 首页 `Big Pickle` 是否也是非交付文案

### 运行验证补充
- `bun run dev run --help` 会报 `Failed to fetch models.dev`，证实后台网络调用未锁住
- 用隔离 XDG 目录可成功启动 TUI；首页仍显示 `Build / Big Pickle / OpenCode Zen`，存在品牌与非交付模型泄漏
- `ctrl+p` 命令面板中搜索 `theme` 返回 `No results found`，但源码证明 hidden 命令仍能被 keybind 直达；这说明一期只做了显示层隐藏，没有做运行时禁用

整体结论：一期 27 处改动只完成了“部分可见层裁剪”，距离“白名单模式”还有明显缺口。最关键的漏点是 `hidden:true` 仍可直达、Skill/Plugin/Network 未收口、以及多处品牌与文案泄漏。

<!-- END_AGENT_REVIEW_RESULT -->

# 功能锁定全面审计需求
## 项目：DevPilot 非交付功能全面屏蔽
## Session：20260411_opencode_devpilot_lockdown_v2
## 日期：2026-04-11
## 锁定策略：UI 隐藏 + 运行时禁用（方案 b）

---

## 背景

DevPilot 基于 opencode v1.3.9 定制，交付功能仅覆盖 R01-R09（E1 需求理解 + E2 测试生成 + E3 编译修复）。
一期锁定（REQ-10~13）已覆盖 CLI 命令和 TUI 命令面板的部分隐藏，但未做全面审计，存在遗漏。

本次要求：**系统性枚举 opencode 全部用户可见功能入口，逐一判定保留/屏蔽，给出完整锁定方案。**

## 锁定原则

1. **白名单模式**：只有明确列入白名单的功能保留，其余全部屏蔽
2. **UI + 运行时双层**：不仅 UI 不可见，运行时也禁用（env flag / 条件跳过）
3. **上游同步成本最小**：优先使用 opencode 已有的 env flag（L0-Config），其次用 hidden:true（L3-Patch 最小 diff），最后才改逻辑
4. **所有改动可溯源**：标注 `// CUSTOM: DevPilot lockdown`，`git grep` 可找到全部改动点

## 交付功能白名单

### CLI 层保留
- `(默认 TUI 启动)` — 核心交付载体
- `run` — 脚本化使用
- `session` — 会话管理
- `attach` — 会话附着
- `acp` — 自动提交（如有使用场景）
- `mcp` — MCP server 管理
- `uninstall` / `export` / `import` — IT 管理员运维

### TUI 层保留
- 主聊天界面（消息输入/输出/工具调用展示）
- 会话管理（新建/切换/退出）
- 斜杠命令（仅 .opencode/skills/ 和 .opencode/commands/ 内的交付 skill）
- 模型/Agent 切换（支持多内网 LLM）
- 状态查看
- 终端基础偏好（动画/diff wrapping/挂起/终端标题）

### 运行时保留
- Provider 连接（已配置的内网 LLM）
- Tool 执行（BashTool、EditTool、ReadTool 等 agent 核心工具）
- Skill 加载（仅 .opencode/ 目录内）
- Session 持久化（SQLite）
- Permission 系统

### 交付 Skill 白名单
- req-structuring（E1 需求理解）
- cpp-test-gen（E2 测试生成）
- cpp-code-search（附加代码搜索）
- cpp-compile-fix（E3 编译修复，待实现）

---

## 审计范围（需 Codex 系统性枚举）

### 维度 1：CLI 命令
枚举 `packages/opencode/src/index.ts` 中所有 `.command()` 注册，逐一判定保留/屏蔽。
一期已处理 13 个命令，需验证是否有遗漏。

### 维度 2：TUI 命令面板
枚举 `app.tsx` 及 feature-plugins 目录下所有命令注册（含 keybind 触发），逐一判定。
一期已处理 8+2 个条目，需验证是否有遗漏。

### 维度 3：TUI 键盘快捷键
枚举所有 keybind 注册（`packages/opencode/src/cli/cmd/tui/keybind/`），判定哪些触发非交付功能。

### 维度 4：斜杠命令（Slash Commands）
枚举 TUI 内 `/` 触发的所有内置命令，判定白名单外的需屏蔽。

### 维度 5：Skill 加载路径
验证 `~/.claude/skills/`、`~/.agents/skills/` 等外部路径是否会被扫描加载。
验证 `opencode.jsonc` 中的 `skills.urls` / `skills.paths` 配置是否会引入外部 skill。

### 维度 6：运行时 Feature Flag
枚举 `packages/opencode/src/flag/flag.ts` 中所有已有 env flag，判定哪些应在 DevPilot 中默认启用。

### 维度 7：TUI 面板/组件
枚举 `feature-plugins/` 下所有面板（sidebar、home、system 等），判定哪些应隐藏。
一期已处理 Getting Started + Tips，需验证是否有遗漏。

### 维度 8：网络调用
枚举所有向外网发起 HTTP 请求的代码路径（更新检查、模型列表拉取、LSP 下载、telemetry、skill 远程拉取等），判定哪些需禁用。

### 维度 9：Plugin 系统
枚举 default plugins 加载机制，判定是否需要通过 `OPENCODE_DISABLE_DEFAULT_PLUGINS` 禁用。

### 维度 10：其他泄漏路径
- 错误信息中是否暴露 opencode 品牌/URL
- 帮助文本中是否引用非交付功能
- 配置文件模板中是否包含非交付功能示例

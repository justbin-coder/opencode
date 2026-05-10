# Feature Lockdown 需求文档
## 项目：DevPilot 交付功能范围锁定
## Session：20260410_opencode_devpilot_lockdown_20260411
## 日期：2026-04-11
## 约束：升级上游 opencode 时合并冲突成本最小化

---

## 背景

DevPilot 基于 opencode v1.3.9 定制，交付功能为 R01-R09（E1 需求理解 + E2 测试生成 + E3 编译修复）。
opencode 上游自带大量面向开发者/社区的功能，不属于本次交付范围，须从客户界面中隐藏。

## 架构约束

- **改动集中化**：Feature Flag 统一放入 `brand.ts`（我方自定义文件，升级时零冲突）
- **上游文件最小 diff**：每处上游文件改动不超过 1-3 行，清晰标注 `// CUSTOM: DevPilot lockdown`
- **可恢复性**：所有隐藏操作均可通过修改 `brand.ts` 中的 Feature Flag 一键恢复，无需重改多处文件

---

## 交付功能白名单（保留）

| 功能 | 说明 |
|------|------|
| TUI 主聊天界面 | 核心交付载体 |
| 会话管理（新建/切换/退出） | 基础操作 |
| 斜杠命令（R01-R09 Skills） | 核心交付功能 |
| 模型/Agent 切换 | 支持多内网 LLM |
| 状态查看 | 监控连接状态 |
| 终端基础偏好（动画/diff wrapping/挂起） | 用户体验 |
| uninstall / export / import | 运维/IT 管理员使用 |
| session / attach | CLI 会话管理 |
| run | 脚本化使用 |

---

## REQ-10：CLI 命令层锁定

**描述：** 从 yargs 注册中移除非交付 CLI 命令，使其不出现在 `--help` 输出和 tab 补全中。

**需隐藏的命令：**
- `upgrade` — 离线环境无意义，调用会失败
- `serve` — Web 服务器模式，不在交付范围
- `web` — Web 界面，不在交付范围
- `pr` — GitHub PR 创建，依赖外网
- `github` — GitHub 集成，依赖外网
- `debug` — 开发者调试工具
- `account`/`console` — opencode 账户管理
- `providers` — 列出所有 75+ provider（客户只用内网 LLM）
- `models` — 列出所有模型（暴露 opencode 生态）
- `stats` — 使用统计
- `plug` — Plugin 安装管理
- `db` — 数据库操作
- `generate` — 代码生成（独立命令，非 TUI 交互）

**保留命令：**
`(默认 TUI)` / `run` / `session` / `attach` / `acp` / `mcp` / `uninstall` / `export` / `import`

**验收标准：**
- `devpilot --help` 不显示上述隐藏命令
- 用户输入隐藏命令名时提示 "Unknown command"（yargs strict 模式自动生效）
- `devpilot uninstall` / `devpilot export` / `devpilot import` 正常工作

**优先级：** P1 | **工作量：** 0.5h

---

## REQ-11：TUI 命令面板锁定

**描述：** 隐藏 TUI 命令面板（`?`/space 快捷键打开）中的非交付条目。

**需隐藏的命令面板条目：**
- `Connect provider` — 客户使用预配置内网 LLM，不需要连接外部 provider
- `Switch theme` — 主题切换（产品交付使用统一主题）
- `Toggle Theme Mode` / `Lock/Unlock Theme Mode` — 主题模式切换
- `Open docs` — 链接到 opencode 外部文档
- `Toggle debug panel` — 开发者调试面板
- `Toggle console` — 开发者控制台
- `Write heap snapshot` — 内存调试工具
- `Plugins` — Plugin 管理器
- `Install plugin` — 安装外部插件
- `Hide/Show tips` — Tips 面板将被永久移除，此条目随之无意义

**保留条目：**
Switch session / New session / Switch model / Switch agent / Model cycle / Agent cycle /
Variant cycle / View status / Exit / Suspend terminal / Enable/Disable animations /
Enable/Disable diff wrapping / Enable/Disable terminal title

**验收标准：**
- 打开命令面板（`?` 或 space），看不到上述隐藏条目
- 保留条目全部正常工作

**优先级：** P1 | **工作量：** 1h

---

## REQ-12：TUI Provider 选择器简化

**描述：** 模型选择器只展示已配置/已连接的 provider，隐藏"Connect provider"入口。

**具体变更：**
- Model 选择器底部 keybind 栏隐藏 "Connect provider" 按钮
- Provider 选择器对话框（`/connect` 命令触发）保留，但从命令面板中隐藏"Connect provider"条目（见 REQ-11）

**验收标准：**
- 模型选择器不展示"Connect provider"按钮
- 已配置的内网 LLM 模型正常显示和切换

**优先级：** P1 | **工作量：** 0.5h

---

## REQ-13：TUI 主页简化

**描述：** 移除主页的 Getting Started 面板和 Tips 面板，主页只保留 Logo + 会话列表。

**具体变更：**
- Getting Started 面板：永久移除渲染（不依赖 `has()` 判断，直接不渲染）
- Tips 面板：永久隐藏（`tips_hidden` 默认设为 `true`，或直接从插件注册中移除）

**验收标准：**
- 首次启动主页干净，只显示 Logo 和会话列表/空状态
- 无任何引导连接外部 Provider 的提示

**优先级：** P1 | **工作量：** 0.5h

---

## 澄清记录

| 问题 | 决策 |
|------|------|
| 模型切换是否保留？ | 保留，支持多内网 LLM（选项 b） |
| uninstall/export/import 是否保留？ | 保留，供 IT 管理员使用（选项 c） |
| 升级成本约束 | Feature Flag 集中在 brand.ts，上游文件最小 diff |

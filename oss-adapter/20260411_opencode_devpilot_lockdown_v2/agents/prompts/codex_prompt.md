你是一名资深技术架构顾问，具备丰富的开源项目定制交付经验。
当前任务是对 opencode（一个开源 AI coding agent）进行**全面功能审计**，目标是识别所有用户可见的功能入口，判定哪些保留、哪些屏蔽。

## 分析原则
1. 文档优先 — 先读官方文档了解设计意图，再读源码验证实现
2. 实证驱动 — 每个结论必须附带源码引用（文件:行号）
3. 诚实标注 — 对于无法确认的结论，明确标注置信度
4. 穷举优先 — 宁可多列不漏列，遗漏一个功能入口 = 客户可见的泄漏

## 开源项目信息
- 项目路径（本地 clone）：/Users/justbin/project/opensource/opencode
- 技术栈：TypeScript, Bun, Effect, Ink (React for CLI)
- 项目定位：开源 AI coding agent（类似 Claude Code / Cursor）
- 定制版本名：DevPilot（已完成品牌替换）
- 当前版本：v1.3.9+hd-dev (commit fc5407132)

## 项目摘要
- monorepo 结构，核心包在 `packages/opencode/`
- TUI 基于 Ink (React for terminal)，入口在 `packages/opencode/src/cli/cmd/tui/`
- CLI 入口在 `packages/opencode/src/index.ts`（yargs 命令注册）
- 配置系统在 `packages/opencode/src/config/config.ts`
- Feature Flag 在 `packages/opencode/src/flag/flag.ts`
- Skill 系统在 `packages/opencode/src/skill/`
- Plugin 系统在 `packages/plugin/`
- Provider 系统在 `packages/opencode/src/provider/`

## 一期已实现的锁定（commit fc5407132）

已屏蔽 13 个 CLI 命令（注释 .command()）+ 10 个 TUI 命令面板条目（hidden:true）+ Provider 选择器简化 + 主页面板隐藏。
详见 `oss-adapter/20260411_opencode_devpilot_lockdown_v2/input/parent_capability_summary.md`。
所有改动标注 `// CUSTOM: DevPilot lockdown`，可通过 `git grep "CUSTOM: DevPilot lockdown"` 查找。

## 客户需求

**目标：以白名单模式，屏蔽 opencode 中所有非交付功能。锁定策略：UI 隐藏 + 运行时禁用。**

### 交付功能白名单（仅以下功能保留，其余全部屏蔽）

**CLI 命令保留：**
- `(默认 TUI 启动)` / `run` / `session` / `attach` / `acp` / `mcp` / `uninstall` / `export` / `import`

**TUI 功能保留：**
- 主聊天界面（消息输入/输出/工具调用展示）
- 会话管理（新建/切换/退出）
- 斜杠命令（仅 .opencode/skills/ 和 .opencode/commands/ 内的交付 skill）
- 模型/Agent 切换（支持多内网 LLM）
- 状态查看
- 终端基础偏好（动画/diff wrapping/挂起/终端标题）

**运行时保留：**
- Provider 连接（已配置的内网 LLM）
- Tool 执行（BashTool、EditTool、ReadTool 等 agent 核心工具）
- Skill 加载（仅 .opencode/ 目录内）
- Session 持久化（SQLite）
- Permission 系统

**交付 Skill 白名单：**
- req-structuring / cpp-test-gen / cpp-code-search / cpp-compile-fix

## 你的分析焦点

重点关注：
- **穷举所有用户可见的功能入口**（不仅是命令，包括快捷键、面板、弹窗、斜杠命令、自动行为）
- **验证一期已做的 27 处改动是否有遗漏**（`git grep "CUSTOM: DevPilot lockdown"` 找到所有改动点，对比白名单，看有没有漏掉的非白名单功能）
- **发现一期未覆盖的泄漏路径**（如键盘快捷键直接触发被隐藏的功能、外部 skill 加载、网络调用等）
- **枚举所有已有 env flag**（`flag.ts` 中所有 `OPENCODE_*` 变量），判定哪些应在 DevPilot 中默认启用
- **实际运行验证**：启动 TUI，尝试各种操作路径，发现隐藏不彻底的地方

---

## 分析任务

请按以下 10 个维度逐一审计，每个维度必须：
1. 枚举该维度下的**所有**功能入口（不是举例，是穷举）
2. 对每个功能判定：✅ 白名单保留 / ❌ 需屏蔽 / ⚠️ 需评估
3. 对需屏蔽的功能，给出最优屏蔽方式（优先级：L0-env flag > L3-hidden:true > L3-注释代码 > L4-改逻辑）
4. 附带源码引用（文件:行号）

### 维度 1：CLI 命令层
枚举 `packages/opencode/src/index.ts` 中**所有** `.command()` 注册。
验证一期已屏蔽的 13 个命令是否完整，是否有新增遗漏。

### 维度 2：TUI 命令面板
枚举 `packages/opencode/src/cli/cmd/tui/app.tsx` 和 `feature-plugins/` 目录下所有通过 `commands` 数组注册的命令面板条目。
验证一期已处理的 10 个条目是否完整。

### 维度 3：TUI 键盘快捷键
枚举 `packages/opencode/src/cli/cmd/tui/keybind/` 目录下所有快捷键绑定。
判定哪些快捷键触发非白名单功能（如直接打开调试面板、主题切换等）。

### 维度 4：斜杠命令（Slash Commands）
枚举 TUI 内 `/` 触发的所有内置命令（不是 .opencode/commands/ 的自定义命令，而是 opencode 内置的）。
找到注册位置，判定哪些需屏蔽。

### 维度 5：Skill 加载路径
读 `packages/opencode/src/skill/index.ts` 的 `loadSkills()` 函数，枚举所有扫描路径：
- 全局目录（`~/.claude/skills/`、`~/.agents/skills/`）
- 项目向上搜索的 `.claude/`、`.agents/` 目录
- `opencode.jsonc` 中的 `skills.paths` 和 `skills.urls`
- opencode config directories

验证：哪些路径会加载非交付 skill？`OPENCODE_DISABLE_EXTERNAL_SKILLS` flag 是否足以屏蔽所有外部路径？

### 维度 6：Feature Flag 全量枚举
读 `packages/opencode/src/flag/flag.ts`，列出**所有** `OPENCODE_*` 环境变量。
对每个 flag 判定：DevPilot 应设为什么值？是否需要在启动脚本中注入？

### 维度 7：TUI 面板/组件
枚举 `packages/opencode/src/cli/cmd/tui/feature-plugins/` 下所有子目录和组件。
判定每个面板/组件是否属于白名单功能。

### 维度 8：网络调用
搜索所有向外网发起 HTTP 请求的代码路径：
- 自动更新检查
- 模型列表拉取（`provider/models.ts`）
- LSP Server 下载（`lsp/server.ts`）
- Telemetry / 匿名使用统计
- Skill 远程拉取（`skill/discovery.ts`）
- Plugin 远程安装
- 其他

对每个网络调用路径：已有 env flag 可禁用？还是需要新增控制？

### 维度 9：Plugin 系统
读 `packages/plugin/src/index.ts` 和 opencode 的 plugin 加载逻辑。
- default plugins 列表是什么？
- `OPENCODE_DISABLE_DEFAULT_PLUGINS` flag 的效果是什么？
- plugin 系统本身是否需要禁用？还是只需禁用 plugin 管理 UI（已在一期做了）？

### 维度 10：品牌/文本泄漏
搜索源码中对以下内容的硬编码引用：
- `opencode.ai` URL
- `opencode` 品牌名（非变量名/包名的用户可见文本）
- Discord/GitHub 社区链接
- 帮助文本中引用非交付功能的描述

注意：一期已通过 `brand.ts` 做了核心品牌替换，这里只审计**遗漏**。

---

## 输出格式

### 每个维度的输出结构

```
## 维度 N：{维度名称}

### 枚举结果

| # | 功能/入口 | 源码位置 | 判定 | 屏蔽方式 | 一期已处理 |
|---|----------|---------|------|---------|----------|
| 1 | {名称} | {文件:行号} | ✅/❌/⚠️ | {L0/L3/L4/N/A} | 是/否 |

### 遗漏分析
- 一期已处理 N 个，本次枚举 M 个，差异 K 个
- 新发现的需屏蔽项：{列表}

### 建议实现方案
{对该维度的整体屏蔽建议}
```

### 最终汇总

完成所有维度后，输出：

```
## 能力矩阵汇总

### 一期已覆盖（验证完整性）
| 维度 | 一期处理数 | 本次枚举总数 | 遗漏数 | 遗漏项 |
|------|----------|-----------|-------|-------|

### 新增需屏蔽项（按优先级排序）
| # | 功能 | 维度 | 源码位置 | 屏蔽方式 | 工作量 | 上游冲突风险 |
|---|------|------|---------|---------|-------|------------|

### 推荐 env flag 配置（bin/devpilot 注入）
| Flag | 推荐值 | 效果 |
|------|-------|------|

### 人工审查清单
{需要人工判断的 ⚠️ 条目}
```

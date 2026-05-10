# Capability Matrix — REQ-16 TUI 内索引构建

session: 20260412_opencode_codesearch_index-tui
date: 2026-04-12

| REQ | 能力点 | 结论 | 定制级别 | 置信度 | spot-check 引用 | 扩展点工作笔记 |
|-----|--------|------|---------|--------|----------------|--------------|
| REQ-16a | `.devpilot/commands/*.md` 加载为 `/xxx` 斜杠命令 | ✅ | L1-Command | 高 | `config.ts:231 loadCommand()` + `session/prompt.ts:1571 commands.get()` | 目录：`.devpilot/commands/`  文件：`index.md`  模板变量：`$ARGUMENTS` 接收路径 |
| REQ-16b | BashTool 可接受 LLM 传入的 `timeout` 参数 | ✅ | L1-Command | 高 | `bash.ts:461 timeout: z.number().optional()` + `bash.ts:479` | LLM 在命令 md 中被指示传 `timeout: 600000`（10 分钟），覆盖默认 2 分钟 |
| REQ-16c | `devpilot index <path>` 作为 CLI 子命令 | ✅ | L3-Patch | 高 | `src/index.ts:51-161` yargs `.command()` 模式，与 `RunCommand`/`McpCommand` 同结构 | 新建 `src/cli/cmd/index-cmd.ts`，在 `index.ts` 注册 |
| REQ-16d | `process.execPath` 在 Bun compiled binary 中返回自身路径 | ✅ | L2-Plugin | 高 | Bun 文档 + `bin/devpilot:37 scriptPath = fs.realpathSync(__filename)` 验证了路径解析模式 | `cpp-code-search.ts` 用 `process.execPath` 找 devpilot binary，调用 `index --search` |
| REQ-16e | 命令面板展示 `/index` | ✅ | L1-Command | 高 | `config.ts:233` glob `{command,commands}/**/*.md` 自动扫描，TUI 命令面板自动显示 | 无需额外注册，文件存在即可显示 |

## 关键结论

所有 5 个能力点均验证通过，无 ❌/❓ 项，无需人工审查。

**架构决策（vs CR-01 方案）：**

| 项目 | CR-01（独立 devpilot-indexer binary） | 本方案（集成进 devpilot） |
|------|--------------------------------------|--------------------------|
| 交付文件数 | 2 个 binary | 1 个 binary ✅ |
| 用户操作 | 终端运行 devpilot-indexer | TUI 内输入 /index ✅ |
| 版本一致性 | 需同步维护 | 天然一致 ✅ |
| 定制侵入 | L2+build 修改 | L1+L2+L3（增加 index-cmd.ts） |

**本方案替代 CR-01，不再需要独立 binary。**

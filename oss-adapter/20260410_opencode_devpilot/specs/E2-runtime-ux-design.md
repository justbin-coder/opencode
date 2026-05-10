# DevPilot 运行体验 Design Spec
> **OSS 定制场景：由 oss-adapter 生成，替代 superpowers:brainstorming 输出。**
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to generate the implementation plan from this spec. Process one Epic spec at a time.

**Goal:** 为 DevPilot 新增两个运行时体验增强：①首次启动时自动检测未配置模型并弹出交互向导引导填写本地推理服务地址；②提供 `devpilot config` 子命令支持事后查看和修改端点配置。

**Architecture:** 在 TUI 启动入口（`packages/opencode/src/index.ts` 或主 CLI handler）前插入首次运行检测逻辑，检测全局 opencode.json 是否存在有效 provider 配置，无则调用 `@clack/prompts` 交互向导写入配置后再启动 TUI。config 子命令以独立文件 `cli/cmd/config.ts` 实现，通过 yargs 注册为 `devpilot config` 命令族，复用 `Config.updateGlobal()` 接口读写全局配置。两处改动均不触及 agent/session/tool 等核心模块。

**Tech Stack:** TypeScript + Bun、yargs（CLI 框架）、@clack/prompts（交互式终端 UI）、Config.updateGlobal()（全局配置读写，config.ts:1561）、xdg-basedir（全局配置路径）

**OSS Version:** v1.3.9（9d3244efe）— 实施前确认版本未变更

---

## 需求范围

| REQ | 需求名称 | 定制级别 | 优先级 |
|-----|---------|---------|--------|
| REQ-03 | 首次运行模型端点配置向导 | L3-Patch | P0 |
| REQ-05 | 模型端点事后修改命令 | L3-Patch | P1 |

## 架构方案

### REQ-03：首次运行向导

**触发条件检测逻辑：**
```typescript
// 在 TUI 启动前插入
async function checkFirstRun(): Promise<void> {
  const globalConfig = await Config.get()   // 读取全局配置
  const hasProvider = globalConfig.provider &&
    Object.keys(globalConfig.provider).length > 0
  if (!hasProvider) {
    await runSetupWizard()
  }
}
```

**向导交互流程（@clack/prompts）：**
```
┌─────────────────────────────────────────────┐
│ 欢迎使用 DevPilot！                          │
│ 首次使用需要配置本地 AI 推理服务地址           │
├─────────────────────────────────────────────┤
│ 请输入推理服务地址（OpenAI-compatible）：     │
│ > http://localhost:11434                    │
├─────────────────────────────────────────────┤
│ 请输入模型名称：                             │
│ > qwen2.5-coder-32b                        │
├─────────────────────────────────────────────┤
│ ✅ 配置已保存，正在启动 DevPilot...          │
└─────────────────────────────────────────────┘
```

**写入全局配置格式：**
```json
{
  "provider": {
    "devpilot-local": {
      "options": {
        "baseURL": "<用户输入>",
        "apiKey": "not-needed"
      }
    }
  },
  "model": "devpilot-local/<用户输入的模型名>"
}
```

**插入位置：** `packages/opencode/src/cli/cmd/tui/` 下的 TUI 启动 handler，在 `bootstrap()` 调用前执行 `checkFirstRun()`。

### REQ-05：config 子命令

**新文件：** `packages/opencode/src/cli/cmd/config.ts`

**命令结构（yargs）：**
```
devpilot config
  ├── set-endpoint <url>   设置推理服务地址
  ├── set-model <name>     设置默认模型名称
  └── show                 显示当前配置
```

**实现模式**（参考 upgrade.ts:7-22）：
```typescript
export const configCmd = cmd({
  command: "config <subcommand>",
  describe: "查看或修改 DevPilot 配置",
  builder: (yargs) =>
    yargs
      .command("set-endpoint <url>", "设置推理服务地址", ...)
      .command("set-model <name>", "设置默认模型", ...)
      .command("show", "显示当前配置", ...),
  handler: async () => { /* subcommand dispatch */ }
})
```

**复用接口：**
- 读：`Config.get()` — 获取当前全局配置
- 写：`Config.updateGlobal(newConfig)` — 原子更新全局 opencode.json（config.ts:1561）

## 关键实现路径

| 需求 | 定制级别 | 实现方式 | 关键文件:行号 |
|------|---------|---------|-------------|
| REQ-03 | L3-Patch | 在 TUI 启动前插入 checkFirstRun() | TUI handler 入口（待 Codex 确认精确行号） |
| REQ-05 | L3-Patch | 新建 config.ts，yargs 注册 | `src/cli/cmd/config.ts`（新建，~80行）、`src/index.ts`（注册命令） |

**扩展点规范（L3-Patch 通用）：**
```
yargs 命令注册位置：packages/opencode/src/index.ts（主入口）
注册方式：.command(configCmd) — 参考 upgrade.ts 模式
Config 读写接口：
  - Config.get() — 读全局配置
  - Config.updateGlobal(patch) — 写全局配置（config.ts:1561）
  - 路径：Global.Path.config/opencode.json（自动 devpilot 目录）
@clack/prompts 使用参考：providers.ts（大量 prompts.text/select 示例）
```

## 组件设计

### checkFirstRun()
```typescript
// packages/opencode/src/cli/devpilot-setup.ts（新建）
export async function checkFirstRun(): Promise<void>
  - 职责：检测 → 向导 → 写配置
  - 依赖：Config.get(), Config.updateGlobal(), @clack/prompts
  - 输出：void（配置写入磁盘后返回）
  - 错误：用户取消（Ctrl+C）→ prompts.isCancel() 检测后 process.exit(0)
```

### config.ts 子命令
```typescript
// packages/opencode/src/cli/cmd/config.ts（新建）
export const configCmd: CommandModule
  - set-endpoint: 更新 provider.devpilot-local.options.baseURL
  - set-model: 更新 model 字段
  - show: 读取并格式化打印当前配置
```

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| 用户 Ctrl+C 取消向导 | `prompts.isCancel()` 检测，打印提示后 `process.exit(0)` |
| baseURL 格式不合法（非 http/https） | 向导内 validate 回调提示重新输入 |
| `Config.updateGlobal()` 写入失败 | catch → 打印错误路径 + 建议手动编辑 |
| `config show` 无配置文件 | 提示"尚未配置，运行 devpilot 完成首次配置" |

## 测试策略

- 删除 `%APPDATA%\devpilot\opencode.json`，运行 `devpilot`，确认向导弹出
- 完成向导后确认 opencode.json 内容正确写入
- 再次运行 `devpilot`，确认向导不再弹出
- `devpilot config show` 显示配置内容
- `devpilot config set-endpoint http://192.168.1.100:8080` 后 show 输出更新

## 约束与注意事项

- 改动标注 `// CUSTOM: DevPilot first-run wizard`
- 向导仅在 TUI 启动路径触发，`devpilot config` / `devpilot --version` 等纯 CLI 命令路径不触发
- 写入的 provider key 固定为 `devpilot-local`，与安装文档保持一致
- 依赖 E1 完成（global 目录已改为 devpilot）后再实施

# Claude 架构分析（补偿 Gemini 视角）
> 分析时间：2026-04-10 | 模型：claude-sonnet-4-6

---

## REQ-01：DevPilot 品牌替换

**第一层：文档**
- 官方声明：未提及（无官方 fork/rebrand 指南）
- 但架构设计天然支持：app name 集中在单一位置

**第二层：源码**
- 实现状态：完整（改动点极少）
- 关键位置：
  - `packages/opencode/src/global/index.ts:7` — `const app = "opencode"` ← **唯一的全局配置目录名来源**，改此一处，%APPDATA%\devpilot\ 自动生效
  - `packages/opencode/src/cli/logo.ts:1-4` — ASCII art logo
  - `packages/opencode/bin/opencode:54` — `const binary = platform === "windows" ? "opencode.exe" : "opencode"` ← 需同步改为 devpilot
  - `packages/opencode/package.json` — `"bin": { "opencode": "./bin/opencode" }` ← 改 key

- 架构风险评估：无其他运行时硬编码（包名 @opencode-ai/* 是 npm scope，不影响运行时配置路径）

**最终结论**
- 状态：⚠️ 已有但需 Patch（4 处改动，无业务逻辑风险）
- 定制级别：L3-Patch
- 置信度：高

---

## REQ-02：E1/E2/E3 Skills 全局内置

**第一层：文档**
- 官方声明：支持（CONFIG_PATHS 有全局目录优先加载）

**第二层：源码**
- `packages/opencode/src/config/paths.ts:22-43` — `directories()` 加载顺序：
  1. `Global.Path.config`（全局，如 %APPDATA%\devpilot\）**← 最先加载**
  2. 项目目录向上遍历的所有 .opencode/
  3. ~/.opencode/（home 目录）
- 安装包只需将 skills/commands 复制到 `%APPDATA%\devpilot\skills\` 即可全局生效
- 无需环境变量，无需客户项目有 .opencode/

**最终结论**
- 状态：✅ 已有可用（原生支持，安装包文件复制即可）
- 定制级别：L0-配置
- 置信度：高

---

## REQ-03：本地模型端点配置向导

**第一层：文档**
- 官方声明：未提及首次运行向导

**第二层：源码**
- 无 first-run 检测逻辑（全局搜索 firstRun/first_run/setup wizard 均无结果）
- 有可复用的 UI 组件：`@clack/prompts`（providers.ts 大量使用 prompts.text/select）
- 配置写入接口：`Config.updateGlobal()` — `packages/opencode/src/server/routes/global.ts:221`

**架构建议**
- 在 TUI 启动前（index.ts 入口处）检测全局 opencode.json 是否有 provider 配置
- 若无，调用 @clack/prompts 弹出交互向导
- 写入格式：
  ```json
  {
    "provider": {
      "qwen-local": {
        "options": { "baseURL": "<用户输入>" }
      }
    },
    "model": "qwen-local/<model-name>"
  }
  ```

**最终结论**
- 状态：❌ 不存在需新建（约 60 行，复用已有 prompts 组件）
- 定制级别：L3-Patch
- 置信度：高

---

## REQ-04：Windows 一键安装包

**第一层：文档**
- 官方声明：支持 Windows（scoop/choco 安装，.exe 二进制）
- postinstall.mjs:101 — "Windows detected: binary setup not needed (using packaged .exe)"
- Windows 下 .exe 已直接打包在平台包中，无需 hardlink

**第二层：源码**
- 官方构建产物：`opencode-windows-x64` npm 包，内含 opencode.exe
- 改名为 devpilot 后：`devpilot-windows-x64` 包，内含 devpilot.exe
- NSIS/Inno Setup 均支持 PATH 注册，推荐 **Inno Setup**（更现代，中文支持好）
- 安装包需做：① 安装 devpilot.exe ② 注册 PATH ③ 复制 skills 到 %APPDATA%\devpilot\ ④ 创建快捷方式

**架构风险**
- 需要新建 Inno Setup 脚本（.iss 文件）+ GitHub Actions Windows 构建 job
- 官方已有 .github/workflows/publish.yml 可参考构建流程

**最终结论**
- 状态：❌ 不存在需新建（Inno Setup 脚本 + CI job）
- 定制级别：L3-Patch（新增构建配置，不改业务逻辑）
- 置信度：高

---

## REQ-05：模型端点事后修改命令

**第一层：文档**
- 官方声明：未提及 config 子命令

**第二层：源码**
- 现有 CLI 子命令（yargs）：providers, models, mcp, upgrade, uninstall, serve, web…
- 无 config 子命令
- 可复用：
  - `@clack/prompts` 做交互（providers.ts 有完整示例）
  - `Config.updateGlobal()` 写入全局配置
  - yargs 注册方式参考 `packages/opencode/src/cli/cmd/upgrade.ts`

**实现方案**
- 新建 `packages/opencode/src/cli/cmd/config.ts`（~60 行）
- 注册子命令：
  - `devpilot config set-endpoint <url>` — 写入 baseURL
  - `devpilot config show` — 读取并展示当前配置

**最终结论**
- 状态：❌ 不存在需新建（约 60 行新文件）
- 定制级别：L3-Patch
- 置信度：高

---

## 能力矩阵汇总（Claude 视角）

| 需求 | 状态 | 定制级别 | 置信度 | 关键备注 |
|------|------|---------|--------|---------|
| REQ-01 品牌替换 | ⚠️ | L3-Patch | 高 | 4处改动：global/index.ts + logo.ts + bin/opencode + package.json |
| REQ-02 全局 Skill 内置 | ✅ | L0-配置 | 高 | 安装包复制文件到 %APPDATA%\devpilot\ 即可，原生支持 |
| REQ-03 首次运行向导 | ❌ | L3-Patch | 高 | 约60行，复用 @clack/prompts + Config.updateGlobal() |
| REQ-04 Windows 安装包 | ❌ | L3-Patch | 高 | 新建 Inno Setup .iss 脚本 + CI Windows job |
| REQ-05 config 子命令 | ❌ | L3-Patch | 高 | 新建 config.ts 约60行，yargs注册 |

## 人工审查清单

无 ❓ 条目，所有结论置信度高。

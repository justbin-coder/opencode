# 能力矩阵 — DevPilot 定制方案

**Session：** 20260410_opencode_devpilot
**OSS 版本：** opencode v1.3.9（9d3244efe，branch: hd-dev）
**分析日期：** 2026-04-10
**分析模式：** Codex + Claude（Gemini 排除）

---

| REQ | 需求名称 | 状态 | 定制级别 | 置信度 | Spot-check 引用 | 扩展点工作笔记 |
|-----|---------|------|---------|--------|----------------|-------------|
| REQ-01 | DevPilot 品牌替换 | ⚠️ | L3-Patch | 高 | `src/global/index.ts:7`、`config.ts:1103,1252,1253,1345,1414`、`mcp.ts:385,388`、`logo.ts:1`、`bin/opencode:54`、`package.json:"bin"` | 改动组4类共15+处：目录名/配置文件名/用户消息/logo/bin；全属字符串替换，无逻辑改动；工作量约1d [Codex验证：配置文件名硬编码比预期多] |
| REQ-02 | Skills 全局内置 | ⚠️ | L0-配置 | 高 | `src/config/paths.ts:24`（Global.Path.config 第一优先加载） | 加载机制✅原生支持；但cpp-compile-fix SKILL.md❌未实现，本期只打包req-structuring+cpp-test-gen两套 [Codex验证：发现资产缺失] |
| REQ-03 | 首次运行模型端点配置向导 | ❌ | L3-Patch | 高 | 全局搜索 firstRun/setupWizard 无结果；`@clack/prompts` 可复用见 providers.ts；`Config.updateGlobal` 见 config.ts:1561 | 新建 `cli/devpilot-setup.ts`（~60行）；插入 TUI 启动前；复用 @clack/prompts + Config.updateGlobal() |
| REQ-04 | Windows 一键安装包 | ❌ | L3-Patch | 高 | `script/postinstall.mjs:101`（Windows .exe 直接打包）；官方有 .github/workflows/publish.yml 参考 | 新建 `installer/devpilot.iss`（Inno Setup）+ `.github/workflows/build-windows.yml`；依赖 E1 产出 devpilot.exe |
| REQ-05 | 模型端点事后修改命令 | ❌ | L3-Patch | 高 | `src/cli/cmd/upgrade.ts:7`（yargs 命令模式参考）；`config.ts:1561`（Config.updateGlobal） | 新建 `src/cli/cmd/config.ts`（~80行）；yargs 注册为 devpilot config 子命令族 |

---

## 人工审查清单

**无 ❓ 条目。** 所有需求结论明确，置信度高，可直接进入 Phase 5 设计。

---

## 注：Codex 结果待合并

Codex 分析仍在后台运行，结果到位后将与本矩阵合并，若有分歧将标注 🚩 并深度验证。

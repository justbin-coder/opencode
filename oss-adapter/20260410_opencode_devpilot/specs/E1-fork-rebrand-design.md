# DevPilot Fork & 品牌重塑 Design Spec
> **OSS 定制场景：由 oss-adapter 生成，替代 superpowers:brainstorming 输出。**
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to generate the implementation plan from this spec. Process one Epic spec at a time.

**Goal:** Fork opencode v1.3.9，将产品名/全局配置目录名/配置文件名/TUI logo/CLI 命令名/用户可见消息全部替换为 DevPilot，并将已实现的 req-structuring、cpp-test-gen 两套预置 Skills 部署到全局配置目录（注：cpp-compile-fix 尚未实现，不纳入本期打包范围），客户安装后无需任何额外配置即可使用。

**Architecture:** 修改 fork 仓库中 4 处品牌相关代码（`global/index.ts` app name、`cli/logo.ts` ASCII art、`bin/opencode` wrapper、`package.json` bin 字段），全局配置目录名随之自动变为 `devpilot`。三套 Skills/Commands 文件通过安装包（E3 Epic）复制到 `%APPDATA%\devpilot\`，opencode 原生的 `ConfigPaths.directories()` 机制保证全局自动加载，无需每个客户项目单独配置。

**Tech Stack:** TypeScript + Bun（opencode 原生栈）、xdg-basedir（全局路径）、@opentui/core（TUI）、ASCII art（logo）

**OSS Version:** v1.3.9（9d3244efe）— 实施前确认版本未变更

---

## 需求范围

| REQ | 需求名称 | 定制级别 | 优先级 |
|-----|---------|---------|--------|
| REQ-01 | DevPilot 品牌替换 | L3-Patch | P0 |
| REQ-02 | E1/E2/E3 Skills 全局内置 | L0-配置 | P0 |

## 架构方案

### REQ-01：品牌替换（L3-Patch）

品牌信息集中度极高，全部改动在 4 处，无业务逻辑耦合：

```
改动组 A：全局路径 & 配置目录名（1处）
  packages/opencode/src/global/index.ts:7
  const app = "opencode"  →  const app = "devpilot"
  效果：~/.config/devpilot/ / %APPDATA%\devpilot\ 自动生效

改动组 B：配置文件名（config.ts 中 10+ 处字符串替换）
  packages/opencode/src/config/config.ts:1103, 1252, 1253, 1345, 1414
  "opencode.json" / "opencode.jsonc"  →  "devpilot.json" / "devpilot.jsonc"
  packages/opencode/src/cli/cmd/mcp.ts:165, 385, 388, 397（含用户提示消息）
  packages/opencode/src/cli/cmd/providers.ts:411, 420（含用户提示消息）
  packages/opencode/src/cli/error.ts:17

改动组 C：TUI logo（1处）
  packages/opencode/src/cli/logo.ts:1-6
  替换 ASCII art 为 DevPilot logo（保持相同行数，避免 TUI 布局偏移）

改动组 D：CLI 命令名 & bin wrapper（2处）
  packages/opencode/bin/opencode:54
  const binary = platform === "windows" ? "opencode.exe" : "opencode"
  →  const binary = platform === "windows" ? "devpilot.exe" : "devpilot"
  文件重命名为 bin/devpilot

  packages/opencode/package.json
  "bin": { "opencode": "./bin/opencode" }
  →  "bin": { "devpilot": "./bin/devpilot" }
```

所有改动标注 `// CUSTOM: DevPilot rebrand` 注释，便于 upstream merge 识别。
**注：改动组 B 的 installation/index.ts:219,252 两处是 Homebrew/Scoop URL，与运行时配置无关，保持不改。**

### REQ-02：Skills 全局内置（L0-配置）

opencode 原生 `ConfigPaths.directories()`（paths.ts:22-43）加载顺序：
1. `Global.Path.config`（全局）← 第一优先，技术上即 `%APPDATA%\devpilot\`
2. 项目 .opencode/ 目录（向上遍历）
3. `~/.opencode/`

安装包（E3 Epic 负责）将以下文件复制到 `%APPDATA%\devpilot\`：
```
%APPDATA%\devpilot\
  skills\
    req-structuring\SKILL.md
    cpp-test-gen\SKILL.md
    cpp-compile-fix\SKILL.md
  commands\
    structurize-req.md
    gen-test.md
  tools\
    cpp-test-validator.ts
    cmake-build.ts
```

无需改代码，纯文件部署。

## 关键实现路径

| 需求 | 定制级别 | 实现方式 | 关键文件 |
|------|---------|---------|---------|
| REQ-01 | L3-Patch | 改 4 处字符串 + 重命名 bin 文件 | `src/global/index.ts:7`、`src/cli/logo.ts`、`bin/opencode`、`package.json` |
| REQ-02 | L0-配置 | 安装包复制文件（E3 负责执行） | `%APPDATA%\devpilot\skills\`、`%APPDATA%\devpilot\commands\` |

**扩展点实现规范（REQ-02）：**
```
扩展点：Skill 自动加载
目录：{Global.Path.config}/skills/{skill-name}/SKILL.md
文件格式：frontmatter (name, description) + Markdown 内容
注册方式：自动发现（无需在配置中声明）
加载触发：Config.directories() 每次启动时扫描
官方实现参考：.opencode/skills/req-structuring/SKILL.md（本仓库已有）
```

## 组件设计

### ASCII Logo 设计约束
- 必须保持与原 logo 相同的行数（4行）和最大列宽（约 22 字符）
- 避免影响 @opentui/core 的 TUI 布局渲染

### DevPilot Logo 草稿
```
left:  ["                   ", "█▀▀█ █▀▀▀ █  █ █▀▀█", "█  █ █▀▀  ▀▄▄▀ █▄▄█", "▀▀▀▀ ▀▀▀▀ ▀  ▀ █  █"]
right: ["         █  █  ████", "█▀▀█ █  █ █  █ █   ", "█▄▄█ █▄▄█ █  █ ███ ", "▀  ▀ ▀  ▀ ▀▀▀▀ ▀▀▀▀"]
```
（可交由设计师调整，实施时确认最终版本）

## 错误处理

- Logo 行数/列宽改变可能导致 TUI 渲染异常 → 实施后在 Windows 终端目测验证
- bin 文件重命名后 postinstall.mjs 中若有引用需同步检查

## 测试策略

- `devpilot --version` 输出版本号（不含 opencode 字样）
- `devpilot` 启动后 TUI 显示 DevPilot logo
- 新建空目录，运行 `devpilot`，在 TUI 中输入 `/structurize-req`，确认命令可识别
- 检查 `%APPDATA%\devpilot\` 目录存在且含 skills/

## 约束与注意事项

- 所有改动标注 `// CUSTOM: DevPilot rebrand`，禁止修改业务逻辑
- 平台包名（opencode-windows-x64）如需改名，评估对 postinstall.mjs 的影响（可选，初期可保留平台包名不变，仅改外层命令名）
- Skills 文件由 E3（安装包 Epic）负责实际复制，本 Epic 只负责源码改动

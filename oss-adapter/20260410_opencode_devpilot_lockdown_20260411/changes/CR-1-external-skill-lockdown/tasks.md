# CR-1 Tasks — 外部 Skill 泄漏屏蔽

**Base spec：** `oss-adapter/20260410_opencode_devpilot_lockdown_20260411/specs/E4-feature-lockdown-design.md`
**Delta spec：** `oss-adapter/20260410_opencode_devpilot_lockdown_20260411/changes/CR-1-external-skill-lockdown/spec.md`

> 注意：E4 base spec 中 REQ-10~13 已完整实现（commit fc5407132），本任务**仅实现 delta 部分（REQ-14~15）**，不重新实现已有内容。

---

## Task CR-1-T1：bin/devpilot 注入运行时 Flag

**文件：** `packages/opencode/bin/devpilot`
**位置：** 文件顶部 `require` 语句之后、`function run(target)` 定义之前
**变更内容：** 追加以下代码块

```javascript
// CUSTOM: DevPilot lockdown — 隔离外部 skill 与网络调用（CR-1，REQ-14~15）
// 屏蔽 ~/.claude/skills/ 等外部目录，防止非交付 skill 泄漏
process.env.OPENCODE_DISABLE_EXTERNAL_SKILLS = '1'
// 离线环境：禁止后台自动更新检查
process.env.OPENCODE_DISABLE_AUTOUPDATE = '1'
// 离线环境：禁止从外网拉取模型列表
process.env.OPENCODE_DISABLE_MODELS_FETCH = '1'
// 离线环境：禁止 LSP Server 自动下载二进制
process.env.OPENCODE_DISABLE_LSP_DOWNLOAD = '1'
```

**验证：**
1. 运行 `devpilot`，TUI 斜杠命令中不出现飞书相关 skill
2. 断网启动，不出现更新/模型/LSP 相关错误通知
3. `.opencode/skills/` 内的交付 skill 仍正常显示

**工作量：** 0.5h（含验证）

---

## 不变内容（来自 E4 base spec，无需触碰）

- `packages/opencode/src/index.ts` — 13 个命令注释屏蔽（REQ-10）
- `packages/opencode/src/cli/cmd/tui/app.tsx` — 8 处 hidden:true（REQ-11）
- `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx` — Connect provider 按钮隐藏（REQ-12）
- `packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips.tsx` — Tips 面板隐藏（REQ-13）
- `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx` — Getting Started 隐藏（REQ-13）
- `packages/opencode/src/cli/cmd/tui/feature-plugins/system/plugins.tsx` — Plugin 管理器隐藏（REQ-11）

# CR-1: 外部 Skill 泄漏屏蔽

**变更类型：** 追加（Additive）
**所属 Epic：** E4-feature-lockdown
**工作量：** 0.5h
**上游冲突风险：** 无（仅改动我方自维护文件）

---

## 背景

E4-feature-lockdown（commit `fc5407132`）完成了 CLI 命令层和 TUI 命令面板的锁定（REQ-10~13），但遗漏了一个运行时 Skill 泄漏路径：

opencode 启动时，`packages/opencode/src/skill/index.ts:146-159` 会自动扫描：
- `~/.claude/skills/**/SKILL.md`
- `~/.agents/skills/**/SKILL.md`

若客户机器（或开发机测试时）的 `~/.claude/skills/` 目录下存在非交付 skill（如飞书相关的 lark-approval、lark-base 等），这些 skill 将被加载并在 DevPilot TUI 斜杠命令中暴露给用户。

---

## 原需求 vs 变更后

| 项 | E4 原实现（REQ-10~13） | CR-1 追加 |
|----|----------------------|----------|
| CLI 命令隐藏 | ✅ 13 个命令注释屏蔽 | 不变 |
| TUI 命令面板隐藏 | ✅ 8+2 条目 hidden:true | 不变 |
| 外部 Skill 隔离 | ❌ 未覆盖 | ✅ 新增 |
| 自动更新禁用 | ❌ 未覆盖（已隐藏命令，但后台仍检查） | ✅ 新增 |
| 离线网络调用屏蔽 | ❌ 未覆盖 | ✅ 新增 |

---

## 影响范围

**改动文件：** `packages/opencode/bin/devpilot`（我方维护文件，非上游文件）

**注入 4 个环境变量（在子进程启动前）：**

| 变量 | 效果 |
|------|------|
| `OPENCODE_DISABLE_EXTERNAL_SKILLS=1` | 阻止加载 `~/.claude/skills/` 和 `~/.agents/skills/`，只保留 `.opencode/skills/` 内交付 skill |
| `OPENCODE_DISABLE_AUTOUPDATE=1` | 禁止后台自动更新检查（离线环境防报错） |
| `OPENCODE_DISABLE_MODELS_FETCH=1` | 禁止从外网拉取模型列表（离线环境防失败） |
| `OPENCODE_DISABLE_LSP_DOWNLOAD=1` | 禁止 LSP Server 自动下载二进制（离线环境必须） |

**不受影响：** `.opencode/skills/` 内的 cpp-test-gen、req-structuring、cpp-code-search 仍正常加载。

---

## 升级成本

`bin/devpilot` 是我方在 rebrand 阶段完全重写的文件（已含 `CUSTOM: DevPilot rebrand` 注释），上游 opencode 的 `bin/opencode` 与此文件无合并关系，升级时**零冲突**。

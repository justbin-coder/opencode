# CR-1 Spec Delta — 外部 Skill 泄漏屏蔽

**Base spec：** `specs/E4-feature-lockdown-design.md`（REQ-10~13，已实现，本 CR 追加内容）

---

## ADDED: REQ-14 — 外部 Skill 目录隔离

**描述：** DevPilot 运行时仅加载 `.opencode/skills/` 内的交付 skill，屏蔽来自 `~/.claude/skills/` 和 `~/.agents/skills/` 的外部 skill。

**验收标准（BDD）：**
```
GIVEN 用户 HOME 目录的 ~/.claude/skills/ 下存在任意非交付 skill（如 lark-approval/SKILL.md）
WHEN 用户启动 devpilot
THEN TUI 斜杠命令中不显示该 skill
AND 仅显示 .opencode/skills/ 内已配置的交付 skill（cpp-test-gen、req-structuring、cpp-code-search）
```

**实现机制：** 启动时注入 `OPENCODE_DISABLE_EXTERNAL_SKILLS=1`，触发 `flag.ts:38-39` 的 Flag 判断，跳过 `skill/index.ts:146-159` 的外部目录扫描。

---

## ADDED: REQ-15 — 离线运行时网络调用屏蔽

**描述：** DevPilot 启动时不发起任何外网 HTTP 请求，防止离线环境超时报错影响用户体验。

**验收标准（BDD）：**
```
GIVEN DevPilot 运行于无外网连接的环境
WHEN 用户启动 devpilot
THEN 不出现"更新检查失败"、"模型列表拉取失败"、"LSP 下载失败"等错误通知
AND TUI 正常启动，不因网络超时卡顿
```

**实现机制：**
- `OPENCODE_DISABLE_AUTOUPDATE=1` → 禁止后台更新检查
- `OPENCODE_DISABLE_MODELS_FETCH=1` → 禁止 `provider/models.ts:96` 的模型列表拉取
- `OPENCODE_DISABLE_LSP_DOWNLOAD=1` → 禁止 `lsp/server.ts` 全部 LSP 下载路径

---

## 实现方式

**文件：** `packages/opencode/bin/devpilot`
**位置：** `run()` 函数调用之前（约第 8 行前）
**方式：** `process.env.XXX = '1'`（Node.js 进程环境变量注入，子进程自动继承）
**标注：** `// CUSTOM: DevPilot lockdown — 隔离外部 skill 与网络调用`

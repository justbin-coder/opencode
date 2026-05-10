# 能力矩阵 — opencode v1.3.9 × 航电软件 R01-R09
> 分析基准：opencode v1.3.9 (hd-dev branch, commit 057848deb)
> Codex: ✅ completed | Gemini: ❌ failed (429) | Claude: 补偿架构视角

---

| 需求 | Codex 结论 | Claude 验证 | 最终判定 | 置信度 |
|------|-----------|------------|---------|--------|
| R01 自然语言→需求卡片 | ⚠️ | AGREE | ⚠️ 已有底座需定制 | 高 |
| R02 需求批量处理 | ⚠️ | AGREE | ⚠️ 已有底座需定制 | 高 |
| R03 Markdown 输入 | ⚠️ | AGREE | ⚠️ 已有底座需定制 | 高 |
| R04 C++ 单测生成 | ⚠️ | AGREE（降为 ❌） | ❌ 不存在需新建 | 高 |
| R05 测试框架配置化 | ❌ | AGREE | ❌ 不存在需新建 | 高 |
| R06 增量测试生成 | ❌ | AGREE | ❌ 不存在需新建 | 高 |
| R07 测试样板学习 | ❌ | AGREE | ❌ 不存在需新建 | 中 |
| R08 自动编译验证 | ❌ | AGREE | ❌ 不存在需新建 | 高 |
| R09 编译错误自动修复 | ❌ | AGREE | ❌ 不存在需新建 | 高 |

## 判定说明

### R01-R03: AGREE（⚠️）
- Claude 验证确认：`prompt.ts:1455` 的 `json_schema` + `StructuredOutput` tool 确实存在
- 命令系统（`.opencode/commands/*.md`）和 Skill 系统（`SKILL.md`）可用于编排
- 差距：无"需求卡片"领域 schema、无批量处理流程、无 SLA 控制

### R04: Codex 标 ⚠️，Claude 降为 ❌
- Codex 说"有 C/C++ LSP + bash 底座"标为 ⚠️，但实际上 opencode 没有任何 C++ 测试生成逻辑
- LSP（clangd）仅用于代码导航，不是测试生成器
- 正确判定：❌ 需新建（虽然底座工具可复用）

### R05-R09: AGREE（❌）
- 配置 schema 中无测试框架字段
- 无增量追加策略、无样板学习、无 cmake 编译闭环、无 compile-fix-retry 流程
- 但平台底座（BashTool、EditTool、ReadTool、Plugin hooks）可作为实现基础

## 平台底座评估（Claude 架构补偿）

opencode 作为 AI Agent 平台，提供了强大的基础设施：

| 底座能力 | 实现状态 | 定制价值 |
|---------|---------|---------|
| Provider 抽象（75+ provider，含 OpenAI-compatible） | ✅ 完整 | 可直接连接本地 Qwen/vLLM |
| Tool 注册（内置 20+ 工具 + 自定义 .opencode/tools/*.ts） | ✅ 完整 | 可注册 C++ 测试生成专用工具 |
| Plugin 系统（Hooks: tool.*, chat.*, command.*, shell.*） | ✅ 完整 | 核心扩展点，可注入业务逻辑 |
| Skill 系统（SKILL.md 自动发现加载） | ✅ 完整 | 直接用于 Skill 辅助能力 (R12) |
| Command 系统（.opencode/commands/*.md） | ✅ 完整 | 可封装需求处理、测试生成命令 |
| Structured Output（json_schema + StructuredOutput tool） | ✅ 完整 | 需求卡片结构化输出基础 |
| Bash 执行（BashTool） | ✅ 完整 | cmake 编译、错误解析基础 |
| 文件操作（Read/Write/Edit/Grep/Glob） | ✅ 完整 | 代码读取、测试文件生成/追加 |
| Agent 多步执行（steps 参数） | ✅ 完整 | 编译修复循环基础 |
| LSP 集成（Clangd for C++） | ✅ 完整 | C++ 代码导航辅助 |

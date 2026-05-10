# Verification Notes — Phase 4 Spot-Check

## Spot-Check 引用

### R01 Structured Output 验证
- `packages/opencode/src/session/prompt.ts:1454-1455` — `json_schema` 判断 → 注入 `StructuredOutput` tool ✅
- `packages/opencode/src/session/prompt.ts:1865` — `createStructuredOutputTool()` 定义 ✅
- `packages/opencode/src/session/prompt.ts:63` — STRUCTURED_OUTPUT_SYSTEM_PROMPT 强制使用工具 ✅

### R03 Markdown 支持验证
- `packages/opencode/src/config/config.ts:249` — `.opencode/commands/` 模式匹配 ✅
- `packages/opencode/src/config/markdown.ts` — ConfigMarkdown 解析器存在 ✅
- `packages/opencode/src/skill/index.ts:24-26` — Skill 按 `SKILL.md` 模式发现 ✅

### R04 C++ LSP 验证
- `packages/opencode/src/lsp/server.ts:898-900` — Clangd 定义 + CMakeLists.txt 根检测 ✅
- `rg "gtest|CppUnit|cppunit"` 全仓无命中 → 无专用测试生成 ✅

### Plugin Hooks 验证（架构补偿）
- `packages/plugin/src/index.ts:179-245` — 完整 Hooks 接口定义 ✅
  - `tool.*` hooks（before/after）
  - `chat.message` / `chat.params` hooks
  - `command.execute.before` hook
  - `experimental.chat.system.transform` hook
  - `shell.env` hook

### Tool Registry 验证
- `packages/opencode/src/tool/registry.ts:118-143` — 内置 + 自定义工具注册 ✅
- `.opencode/tools/*.ts` 自定义工具支持 ✅

## Codex→Claude 分歧处理
- R04: Codex 标 ⚠️（有底座），Claude 降为 ❌（无专项实现）
  - 理由：底座能力（LSP/Bash/Edit）不等于"C++ 单测自动生成器"，客户交付需从零构建该能力
  - 不影响可行性判断，仅调整工作量预期

# 人工审查清单
项目：opencode　客户：航电软件　日期：2026-03-31

> 以下条目结论为 ❌（不存在），但建议人工确认以避免遗漏已有能力。
> 确认完成后，告知 Claude"人工审查已完成"触发 Phase 8 回填。

---

## 待确认项

### R05 测试框架配置化
- Agent 结论：❌ 不支持（配置 schema 无测试框架字段）
- 建议搜索关键词：`gtest`, `CppUnit`, `test framework`, `testing`
- 建议检查路径：`packages/opencode/src/config/`, `packages/opencode/src/command/`
- 原因说明：opencode 的配置系统高度可扩展，需确认是否有社区插件或未合并的 PR 已实现此功能
- **人工确认结论：** ____（✅ 支持 / ❌ 不支持）
- **备注：**

### R06 增量测试生成
- Agent 结论：❌ 不支持（无"只追加"专项模式）
- 建议搜索关键词：`incremental`, `append`, `apply_patch`, `edit mode`
- 建议检查路径：`packages/opencode/src/tool/edit.ts`, `packages/opencode/src/tool/write.ts`
- 原因说明：EditTool 支持精确替换，需确认是否有"追加到文件末尾"的内置模式
- **人工确认结论：** ____（✅ 支持 / ❌ 不支持）
- **备注：**

### R07 测试样板学习
- Agent 结论：❌ 不支持（无显式"风格学习"实现）
- 建议搜索关键词：`style`, `template`, `example`, `few-shot`, `sample`
- 建议检查路径：`packages/opencode/src/skill/`, `packages/opencode/src/session/prompt.ts`
- 原因说明：Skill 系统本身可携带 few-shot 示例，需确认是否有专用的"风格学习"扩展
- **人工确认结论：** ____（✅ 支持 / ❌ 不支持）
- **备注：**

### R08 自动编译验证
- Agent 结论：❌ 不支持（无"生成后自动编译"工作流）
- 建议搜索关键词：`cmake`, `compile`, `build`, `verification`
- 建议检查路径：`packages/opencode/src/tool/bash.ts`, `packages/opencode/src/lsp/server.ts`
- 原因说明：BashTool 可执行 cmake，需确认是否有 CI/build 相关的内置工作流
- **人工确认结论：** ____（✅ 支持 / ❌ 不支持）
- **备注：**

### R09 编译错误自动修复
- Agent 结论：❌ 不支持（无 compile-fix-retry 流程）
- 建议搜索关键词：`retry`, `fix`, `compile error`, `steps`, `loop`
- 建议检查路径：`packages/opencode/src/agent/agent.ts`, `packages/opencode/src/session/`
- 原因说明：Agent 有 `steps` 参数限制迭代次数，需确认是否有专用的"错误修复循环"机制
- **人工确认结论：** ____（✅ 支持 / ❌ 不支持）
- **备注：**

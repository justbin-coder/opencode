# 项目总览
项目：opencode (DevPilot 定制)　客户：航电软件　日期：2026-04-12

---
> **分析基准版本**
> 仓库：`opencode`　版本：**`devpilot-e1-complete`**　Branch：`hd-dev`
> Commit：`465fe9a6a`
> ⚠️ 本方案基于上述版本快照，实施前请确认 OSS 项目版本未发生重大变更。
---

## 分期实施排序

### Phase 1（必做，4d）
- **E3: 自动编译验证与错误修复** — [specs/E3-cpp-compile-fix-design.md](../specs/E3-cpp-compile-fix-design.md)
- 理由：P0-C 验收基线项，E1/E2 已完成，E3 是最后一块交付缺口
- 前置依赖：E2 `/gen-test` 可产出 `tests/*_test.cpp`（已完成）

## 工作量汇总

| Epic | Spec 文件 | 估算（人天） | 置信度 | 定制级别 |
|------|----------|------------|--------|---------|
| E3 编译验证与修复 | E3-cpp-compile-fix-design.md | 4d | 高 | L1 + L2（零 core 改动）+ E2 frontmatter 修复 |

## 依赖关系

```
E1（需求结构化）✅ 完成
  ↓ 可选输入
E2（C++ 测试生成）✅ 完成
  ↓ 产出 tests/*_test.cpp
E3（编译验证与修复）⬜ 待实施 ← 当前
```

E3 直接依赖 E2 的输出（测试文件），但两个 Skill/Command 完全解耦，可独立开发和测试。

## 风险清单

| # | 风险 | 影响 | 缓解 |
|---|------|------|------|
| 1 | **E2 SKILL.md 缺 frontmatter** — Codex 发现 `cpp-test-gen/SKILL.md` 可能未被 Skill loader 识别 | E2 可能从未真正加载 Skill（影响 gen-test 质量） | Phase 6 确认；若属实则补 frontmatter（10min 修复） |
| 2 | **Permission deny 粒度** — 在 verify-build 期间 deny `edit/**` 会同时阻止用户手动编辑 | 用户体验受限 | 方案一：仅靠 Skill prompt 软约束 LLM 不用 Edit（轻量但不绝对）；方案二：Tool prepare/finish 时动态写入/移除 Permission（硬保证但实现更复杂）。Phase 7 最终选型 |
| 3 | **cmake target 命名多样性** — 航电项目 CMakeLists 可能用非标准写法（`add_test` / 变量间接引用） | target 自动发现失败 | 提供 `cpp.testTarget` 手动配置兜底 |
| 4 | **Windows 路径** — 客户环境为 Windows，路径分隔符和 cmake 行为有差异 | 错误解析正则 / 白名单匹配可能失效 | Tool 内部统一用 `path.normalize` + 正斜杠；单元测试覆盖 Windows 路径 case |

**零 fork 风险**：E3 所有定制在 `.devpilot/` 目录内完成，不修改 `packages/` 任何文件。

## 已确认项（Phase 6 完成 2026-04-12）

1. ✅ E2 `cpp-test-gen/SKILL.md` 确实缺 frontmatter → E3 实施时同步修复
2. ✅ `cpp.*` 配置采用方案 A：Tool 自读原始 JSON，零核心改动

## 下一步（接入 superpowers 开发流程）

E3 全部为 L1+L2 需求（零 L4-Core），标准路径：

```
specs/E3-cpp-compile-fix-design.md → superpowers:writing-plans → superpowers:execute-plan
```

Phase 6 人工审查 → Phase 7 最终确认后，直接用 E3 spec 输入 `superpowers:writing-plans` 开始实施。

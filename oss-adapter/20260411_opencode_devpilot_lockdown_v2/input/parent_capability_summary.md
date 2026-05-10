# 一期能力矩阵摘要（供增量分析参考）
来源 session：20260410_opencode_devpilot_lockdown_20260411  版本：v1.3.9+hd-dev

## 已实现的锁定（E4-feature-lockdown，commit fc5407132）

| REQ | 需求名称 | 结论 | 定制级别 | 状态 |
|-----|---------|------|---------|------|
| REQ-10 | CLI 命令层锁定 | ✅ | L3-Patch | 已实现：13 个命令注释屏蔽 |
| REQ-11 | TUI 命令面板锁定 | ✅ | L3-Patch | 已实现：8+2 条目 hidden:true |
| REQ-12 | TUI Provider 选择器简化 | ✅ | L3-Patch | 已实现：Connect provider 按钮隐藏 |
| REQ-13 | TUI 主页简化 | ✅ | L3-Patch | 已实现：Getting Started + Tips 面板隐藏 |

## 已实现的改动清单

| 文件 | 改动行数 | 标注 |
|------|---------|------|
| `packages/opencode/src/index.ts` | +26/-13 | 13 个 .command() 注释 |
| `packages/opencode/src/cli/cmd/tui/app.tsx` | +8 | 8 处 hidden:true |
| `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx` | +1 | 1 处 hidden:true |
| `packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips.tsx` | +1/-3 | show=false + hidden 合并 |
| `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx` | +2/-1 | show=false |
| `packages/opencode/src/cli/cmd/tui/feature-plugins/system/plugins.tsx` | +2 | 2 处 hidden:true |

**总计：** 6 文件，27 处 `CUSTOM: DevPilot lockdown` 标注

## 已识别但未实现的问题

- 外部 Skill 目录扫描（`~/.claude/skills/`）未屏蔽 → 飞书等非交付 skill 泄漏
- 运行时网络调用（自动更新、模型拉取、LSP 下载）未禁用 → 离线环境报错
- 未做全面审计，可能遗漏其他非交付功能入口

## 交付功能白名单（保留）

R01-R09 对应的 3 个 Epic：
- E1: 需求理解与结构化（.opencode/skills/req-structuring/）
- E2: C++ 单元测试生成（.opencode/skills/cpp-test-gen/）
- E3: 编译验证与自动修复（.opencode/skills/cpp-compile-fix/ — 待实现）
- 附加：C++ 代码搜索（.opencode/skills/cpp-code-search/）

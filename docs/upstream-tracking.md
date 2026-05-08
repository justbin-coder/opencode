# 上游版本追踪

## 基线信息

| 项目 | 值 |
|------|---|
| 上游仓库 | https://github.com/anomalyco/opencode |
| 基线版本 | v1.2.27 (commit: 51fcd04a7) |
| 基线 tag | baseline/hd-v1.2.27 |
| 当前上游最新 | v1.4.11 |
| 差距 | ~2075 commits |
| 上次评估 | 2026-05-08 |

## 同步策略

- 不做整体 rebase，按需 cherry-pick 安全修复
- 基线升级仅在二期需求启动时评估
- cherry-pick 后需重新验证 .devpilot 路径重命名是否受影响

## Cherry-pick 记录

| 上游 commit | 类型 | 引入日期 | 备注 |
|-------------|------|----------|------|
| (暂无) | | | |

## 跳过的变更

| 版本范围 | 跳过原因 |
|----------|----------|
| v1.2.27 -> v1.4.11 | 无安全漏洞，客户不需要新特性，整体 rebase 冲突量过大 |

## 定制改动汇总（升级基线时重点关注的冲突点）

| 文件 | 改动类型 |
|------|---------|
| packages/opencode/src/config/paths.ts | .opencode -> .devpilot 路径重命名 |
| packages/opencode/src/config/config.ts | 配置文件名重命名 + 白名单 |
| packages/opencode/src/cli/cmd/tui/app.tsx | UI lockdown |
| packages/opencode/src/cli/cmd/tui/context/local.tsx | UI lockdown |
| packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx | 品牌替换 |
| packages/opencode/src/cli/cmd/index-cmd.ts | 新增 /index 子命令 |
| packages/opencode/src/tool/registry.ts | 自定义 tool 加载逻辑 |
| packages/opencode/src/command/index.ts | 命令白名单 lockdown |
| packages/opencode/src/cli/logo.ts | DevPilot 品牌 logo |
| packages/opencode/bin/devpilot | CLI binary 入口重命名 |
| packages/opencode/script/build.ts | 构建脚本适配 |

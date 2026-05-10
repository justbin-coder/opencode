# E4 Feature Lockdown — Epic Design Spec
## DevPilot 交付功能范围锁定

**Session：** 20260410_opencode_devpilot_lockdown_20260411  
**父 Session：** 20260410_opencode_devpilot  
**日期：** 2026-04-11  
**状态：** ✅ 已实现（commit: fc5407132）  
**需求来源：** REQ-10 ~ REQ-13  

---

## 背景与目标

DevPilot 基于 opencode v1.3.9 定制，客户侧只交付 R01-R09 功能（需求理解 + C++ 测试生成 + 编译修复）。opencode 上游自带 75+ provider 接入、Plugin 生态、调试工具、GitHub 集成等面向开源社区的功能，须从客户界面完全隐藏，避免：

1. 客户用户误操作非交付功能（调用外网 API 失败、触发不支持的命令）
2. 暴露 opencode 上游品牌/生态（已通过 brand.ts 处理显示名，但功能入口仍存在）
3. 增加客户支持成本（非交付功能报错需要解释）

---

## 架构决策

### 核心约束：升级成本最小化

本项目后续需定期同步 opencode 上游版本。改动策略必须满足：

| 约束 | 实现方式 |
|------|---------|
| 上游文件 diff 最小 | 每处改动 ≤ 3 行，不删代码 |
| 改动可溯源 | 所有改动标注 `// CUSTOM: DevPilot lockdown` |
| 升级后可快速重应用 | `git grep "CUSTOM: DevPilot lockdown"` 找到全部 27 处 |
| 功能可按需恢复 | 去掉注释或 `hidden: true` 即可恢复，无需反向工程 |

### 方案选型对比

| 方案 | 描述 | 升级成本 | 结论 |
|------|------|---------|------|
| **方案 A（采用）** | 各文件直接加 `hidden: true` / 注释掉 command | 极低（1 行/处） | ✅ 采用 |
| 方案 B | brand.ts 集中 Feature Flag，各文件引用 | 略高（2 行/处 + import）| ❌ 过度设计 |

方案 A 的 `hidden: true` 模式复用了 opencode TUI 命令面板的原生机制（所有命令对象本身支持 `hidden` 属性），无需新增抽象层。

---

## 实现范围

### 交付功能白名单（保留）

| 功能 | 路径 |
|------|------|
| TUI 主聊天界面 | 核心交付载体，完整保留 |
| 会话管理（新建/切换/退出） | `app.tsx` command 保留 |
| R01-R09 斜杠命令 | `.opencode/skills/` + `.opencode/commands/` |
| 模型/Agent 切换 | 支持多内网 LLM，保留（已配置 provider 列表） |
| 状态查看 | 监控连接状态，保留 |
| 终端基础偏好 | 动画/diff wrap/挂起，保留 |
| `uninstall` / `export` / `import` | IT 管理员使用，保留 |
| `session` / `attach` / `run` / `mcp` | CLI 管理，保留 |

---

## 实现细节

### Layer 1：CLI 命令层（`packages/opencode/src/index.ts`）

**改动方式：** 注释掉 `.command(XxxCommand)` 调用，保留 import 不变（避免 dead code 警告影响 linting）

**隐藏的 13 个命令：**

```
GenerateCommand   — 独立代码生成，非 TUI 交互
DebugCommand      — 开发者调试工具
ConsoleCommand    — opencode 账户管理
ProvidersCommand  — 列出所有 75+ provider（客户只用内网 LLM）
UpgradeCommand    — 离线环境调用失败
ServeCommand      — Web 服务器模式，不在交付范围
WebCommand        — Web 界面，不在交付范围
ModelsCommand     — 列出所有模型（暴露 opencode 生态）
StatsCommand      — 使用统计
GithubCommand     — GitHub 集成，依赖外网
PrCommand         — GitHub PR 创建，依赖外网
PluginCommand     — Plugin 安装管理
DbCommand         — 数据库操作
```

**注释格式：**
```typescript
// CUSTOM: DevPilot lockdown — 非交付功能，客户界面不暴露
// .command(UpgradeCommand)
```

**副作用：** yargs `strict()` 模式已开启，用户输入隐藏命令名时提示 "Unknown argument" 并显示帮助，行为符合预期。

---

### Layer 2：TUI 命令面板（`packages/opencode/src/cli/cmd/tui/app.tsx`）

**改动方式：** 在命令对象中追加 `hidden: true` 属性

**隐藏的 8 个条目：**

| 条目 title | 隐藏原因 |
|-----------|---------|
| `Connect provider` | 客户使用预配置内网 LLM，无需连接外部 provider |
| `Switch theme` | 产品交付使用统一主题，不暴露主题切换 |
| `Toggle Theme Mode` | 同上 |
| `Unlock/Lock Theme Mode` | 同上 |
| `Open docs` | 链接到 opencode 外部文档，离线环境无法访问 |
| `Toggle debug panel` | 开发者调试面板，非交付功能 |
| `Toggle console` | 开发者控制台，非交付功能 |
| `Write heap snapshot` | 内存调试工具，非交付功能 |

**追加格式：**
```typescript
{
  title: "Connect provider",
  hidden: true, // CUSTOM: DevPilot lockdown
  ...
}
```

---

### Layer 2b：TUI 命令面板（Plugin 管理器）

**文件：** `packages/opencode/src/cli/cmd/tui/feature-plugins/system/plugins.tsx`

隐藏 `Plugins`（plugin_manager 快捷键触发）和 `Install plugin` 两个条目。

---

### Layer 3：Model 选择器（`packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`）

隐藏底部 keybind 栏的 `Connect provider` / `View all providers` 按钮：

```typescript
{
  keybind: keybind.all.model_provider_list?.[0],
  title: connected() ? "Connect provider" : "View all providers",
  hidden: true, // CUSTOM: DevPilot lockdown
  ...
}
```

**说明：** `/connect` 命令本身保留（管理员可用），仅隐藏模型选择器中的快捷入口。

---

### Layer 4：主页简化

#### Getting Started 面板（`feature-plugins/sidebar/footer.tsx`）

```typescript
// CUSTOM: DevPilot lockdown — Getting Started 面板永久隐藏，客户界面不展示外部 provider 引导
const show = createMemo(() => false)
```

**注意：** 面板位于 **sidebar** 的 footer（不是 home 的 footer），Codex 首次执行时定位到了错误文件，已人工修正。

#### Tips 面板（`feature-plugins/home/tips.tsx`）

```typescript
// home_bottom slot 的 show 逻辑
const show = createMemo(() => false) // CUSTOM: DevPilot lockdown

// tips.toggle 命令条目（同时合并了原有 hidden 条件，消除重复属性 TypeScript 报错）
hidden: true, // CUSTOM: DevPilot lockdown — 合并了原 hidden 条件，Tips 面板永久隐藏
```

---

## 变更文件清单

| 文件 | 改动行数 | 改动性质 |
|------|---------|---------|
| `packages/opencode/src/index.ts` | +26/-13 | 注释掉 13 个 `.command()` 注册 |
| `packages/opencode/src/cli/cmd/tui/app.tsx` | +8 | 8 处追加 `hidden: true` |
| `packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx` | +1 | 1 处追加 `hidden: true` |
| `packages/opencode/src/cli/cmd/tui/feature-plugins/home/tips.tsx` | +1/-3 | show 改为 false，合并 hidden |
| `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx` | +2/-1 | show 改为 false |
| `packages/opencode/src/cli/cmd/tui/feature-plugins/system/plugins.tsx` | +2 | 2 处追加 `hidden: true` |

**总计：** 6 文件，27 处 `CUSTOM: DevPilot lockdown` 标注，净增 ~40 行

---

## 升级操作手册

当需要同步 opencode 上游新版本时：

```bash
# 1. 找到本次所有改动点
git grep "CUSTOM: DevPilot lockdown" packages/opencode/src/

# 2. 合并上游后，逐一检查每个标注点是否仍需保留
# 3. 对于上游新增的命令，评估是否需要加入 lockdown 列表
# 4. index.ts 中若上游新增了 .command(XxxCommand) 且属于非交付功能，补加注释
```

---

## 执行过程记录

1. **需求分析（Claude）**：审计 CLI + TUI 全量命令，结构化为 REQ-10 ~ REQ-13
2. **独立实现（Codex）**：基于需求文档独立生成实现，覆盖 5/6 个文件
3. **对比审视（Claude + Codex 方案收敛）**：
   - 发现 `tips.tsx` 重复 `hidden` 属性 → 修正
   - 发现 Getting Started 面板定位错误（home vs sidebar）→ 人工修正 `sidebar/footer.tsx`
4. **Commit：** `fc5407132` feat(devpilot): lockdown UI to delivery scope (R01-R09 only)

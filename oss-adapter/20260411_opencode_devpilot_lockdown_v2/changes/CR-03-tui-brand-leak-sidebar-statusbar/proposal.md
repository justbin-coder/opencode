# CR-03: TUI 品牌泄漏修复（sidebar footer + 状态栏 provider 名）

**类型：** 品牌清洗遗漏（REQ-20 覆盖盲区）  
**优先级：** P2  
**发现方式：** 手动运行时观察到两处 "OpenCode" 字样残留  
**修复日期：** 2026-04-11  
**状态：** completed

---

## 两处泄漏

### 泄漏 1：右下角 `• OpenCode local`

**文件：** `packages/opencode/src/cli/cmd/tui/feature-plugins/sidebar/footer.tsx:71-77`

**根因：** "OpenCode" 被拆成两个独立的 `<b>` JSX 标签渲染，绕过了 `grep -i opencode` 扫描：

```tsx
// 原代码 — grep 不到 "OpenCode" 整串
<text fg={theme().textMuted}>
  <span style={{ fg: theme().success }}>•</span> <b>Open</b>
  <span style={{ fg: theme().text }}>
    <b>Code</b>
  </span>{" "}
  <span>{props.api.app.version}</span>
</text>
```

**修复：**

```tsx
{/* CUSTOM: DevPilot rebrand — 将 OpenCode 品牌替换为 Brand.name */}
<text fg={theme().textMuted}>
  <span style={{ fg: theme().success }}>•</span>{" "}
  <span style={{ fg: theme().text }}>
    <b>{Brand.name}</b>
  </span>{" "}
  <span>{props.api.app.version}</span>
</text>
```

**效果：** `• OpenCode local` → `• DevPilot local`

---

### 泄漏 2：状态栏 `MiniMax M2.5 Free OpenCode Zen`

**文件：** `packages/opencode/src/cli/cmd/tui/context/local.tsx:227`

**根因：** `provider.parsed` 直接取 `provider?.name`（来自 models-snapshot.js 的原始值 "OpenCode Zen"），未走已有的 `Brand.providerDisplayName` 统一覆盖机制：

```typescript
// 原代码
provider: provider?.name ?? value.providerID,
```

`Brand.providerDisplayName` 已在 dialog-model.tsx 中正确使用（model picker 显示正确），但状态栏路径漏掉了。

**修复：**

```typescript
// CUSTOM: DevPilot rebrand — 用 Brand.providerDisplayName 覆盖上游 provider 名
provider: provider
  ? Brand.providerDisplayName(provider.id, provider.name)
  : value.providerID,
```

同时在文件顶部添加 import：

```typescript
// CUSTOM: DevPilot rebrand — 用于 provider 显示名覆盖
import { Brand } from "@/brand"
```

**效果：** `MiniMax M2.5 Free OpenCode Zen` → `MiniMax M2.5 Free DevPilot AI`

（`Brand.providerNames.opencode = "DevPilot AI"` 已在 brand.ts 配置）

---

## 品牌覆盖完整性验证

修复后，`opencode` provider 的显示名经过以下层级覆盖：

```
models-snapshot.js: "OpenCode Zen"
  ↓ models-snapshot.js REQ-20 修复
"DevPilot AI Gateway"   ← fallback（若 Brand.providerNames 查不到）
  ↓ Brand.providerDisplayName("opencode", ...)
"DevPilot AI"           ← 最终显示（brand.ts 优先级更高）
```

---

## 升级检查项

REQ-20 的 grep 扫描命令需要增强，加入 JSX 拼接场景检测：

```bash
# 常规扫描
git grep -i "opencode.ai\|sst/opencode\|OpenCode Zen" packages/opencode/src/

# JSX 拼接扫描（拆词渲染绕过）— CR-03 发现的新盲区
git grep -n '"Open"\|"Code"' packages/opencode/src/cli/cmd/tui/ | grep -v "CUSTOM\|node_modules"

# provider.name 直接使用扫描
git grep -n "provider?.name\|provider\.name" packages/opencode/src/cli/cmd/tui/ | grep -v "Brand\|CUSTOM"
```

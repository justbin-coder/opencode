# 项目总览 — DevPilot 商业化交付
项目：opencode 定制  客户：航电软件  日期：2026-04-10

---
> **分析基准版本**
> 仓库：`opencode`　版本：**`v1.3.9`**　Branch：`hd-dev`
> Commit：`9d3244efe`
> ⚠️ 本方案基于上述版本快照，实施前请确认 OSS 项目版本未发生重大变更。
---

## 分期实施排序

### Phase 1（必做，3.5d）—— 含 macOS 本机验证

- **E1: Fork + 品牌重塑** — [specs/E1-fork-rebrand-design.md]
  - REQ-01（L3-Patch，4处改动）+ REQ-02（L0-配置，Skills 文件随包发布）
  - 理由：所有 Epic 的基础，devpilot 二进制和全局目录名由此确立

- **E2: 运行体验增强** — [specs/E2-runtime-ux-design.md]
  - REQ-03（首次运行向导）+ REQ-05（config 子命令）
  - 理由：P0 需求，影响客户开箱即用体验；依赖 E1，可在 E1 分支上并行开发

- **E3a: npm 发布（macOS/Linux）** — [specs/E3a-npm-publish-design.md]
  - REQ-04a（npm 多平台构建 + 发布）
  - 理由：**开发验证关键路径**，E1/E2 完成后立即打包，在 macOS 本机完整验证功能链路

### Phase 2（重要，1.5d）—— 客户交付准备

- **E3b: Windows 安装包** — [specs/E3b-windows-installer-design.md]
  - REQ-04（Inno Setup + CI Windows job）
  - 理由：P1 需求，航电客户为 Windows 环境；macOS 验证通过后再做

---

## 工作量汇总

| Epic | Spec 文件 | 估算（人天） | 置信度 |
|------|----------|------------|--------|
| E1: Fork + 品牌重塑 | E1-fork-rebrand-design.md | 1d | 高 |
| E2: 运行体验增强 | E2-runtime-ux-design.md | 1.5d | 高 |
| E3a: npm 发布（macOS/Linux）| E3a-npm-publish-design.md | 1d | 高 |
| E3b: Windows 安装包 | E3b-windows-installer-design.md | 1.5d | 中 |
| **合计** | — | **5d** | — |

---

## 依赖关系

```
E1（品牌 Fork）
  ├──→ E2（运行体验）：在 E1 分支基础上开发，可并行
  └──→ E3a（npm 发布）：依赖 E1 产出 devpilot 二进制
         └──→ E3b（Windows 安装包）：macOS 验证通过后开始
```

**验证里程碑：**
```
E1 + E2 + E3a 完成
  → macOS 本机执行完整验证路径（见 E3a spec 测试策略）
  → 通过 → 开始 E3b
  → 不通过 → 修复后重新验证
```

---

## 风险清单

| 风险 | 等级 | 应对 |
|------|------|------|
| opencode 上游更新导致 fork 维护成本 | 中 | 所有改动标注 `// CUSTOM:`，仅 4 处品牌改动，merge 冲突极低 |
| npm 包名 `devpilot-ai` 已被占用 | 中 | 发布前 `npm info devpilot-ai` 检查；备选 `devpilot-cli` / `@yourco/devpilot` |
| Windows 二进制签名缺失，SmartScreen 告警 | 中 | 初期告知客户添加信任；后续申请 EV 证书 |
| ASCII logo 行数影响 TUI 布局 | 低 | 保持原有 4 行约束，macOS 验证时目测确认 |
| Bun `--compile` 在 macOS Intel 兼容性 | 低 | CI matrix 含 macos-13（Intel）runner 直接验证 |

---

## 待确认项

无。所有需求分析结论明确，无 ❓ 待确认项。

---

## 下一步（接入 superpowers 开发流程）

```
E1 → superpowers:writing-plans（specs/E1-fork-rebrand-design.md）
       → superpowers:subagent-driven-development

E2 → superpowers:writing-plans（specs/E2-runtime-ux-design.md）
       → superpowers:subagent-driven-development

E3a → superpowers:writing-plans（specs/E3a-npm-publish-design.md）
        → superpowers:subagent-driven-development

── macOS 验证通过 ──

E3b → superpowers:writing-plans（specs/E3b-windows-installer-design.md）
        → superpowers:subagent-driven-development
```

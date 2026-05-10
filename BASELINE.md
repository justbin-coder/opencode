# 客户开发基线 · BASELINE

本仓库的所有定制开发以下方记录的 opencode 上游版本为起点。
**升级基线时请同步更新本文件**。

---

## 基线信息

| 项 | 值 |
|---|---|
| 上游仓库 | https://github.com/anomalyco/opencode |
| 上游 Tag | `v1.14.45` |
| 完整 commit | `782a2bf06ab7d6e1fbd13c95392fc86fd5a063cf` |
| Tag 发布时间 | 2026-05-10 00:07 UTC |
| Fork 仓库 | https://github.com/justbin-coder/opencode |
| 主干分支 | `baseline/v1.14.45` |
| 建立日期 | 2026-05-10 |
| 建立人 | Jiazhibin |

---

## 分支结构

```
upstream v1.14.45 (782a2bf06)
        │
        ▼
baseline/v1.14.45              ← 客户开发主干（本文件所在）
        │
        ├── feature/F1-cpp-unittest-gen   ← 单元测试生成与编译修复
        └── feature/F2-cpp-code-review    ← 代码审查（基于 Skill 库）
```

> 其他长期保留分支：
> - `dev` — upstream/dev 镜像，仅用于跟进上游变化，不在此分支开发
> - `archive/hd-ui` — 历史探索分支档案
> - `backup/old-workspace-snapshot` — 工作区初始快照

---

## 协作纪律

### 主干 `baseline/v1.14.45`

- ✅ 允许：`.gitignore`、`BASELINE.md`、CI 配置、文档等基础设施改动
- ❌ 禁止：业务功能代码改动
- 改动要求：必须经 PR + Code Review 后合入

### Feature 分支

- 所有业务功能（F1、F2 等）一律在 `feature/*` 上开发
- 每个 feature 分支以 `baseline/v1.14.45` 为父
- 完成后通过 PR 合回主干

---

## 选择本版本的理由

- v1.14.45 为上游 2026-05-10 发布的稳定 release tag
- 早于当时刚发布数小时的 v1.14.46，规避新版潜在的边缘问题
- 该版本内置 Skill / Agent / Plugin 三套扩展机制，匹配 F2 代码审查的 Skill 化路径
- 该版本 `serve` 命令支持 HTTP API + WebSocket，满足后续 BS 部署需要

---

## 升级基线流程（未来参考）

```bash
# 1. 拉取上游最新 tag
git fetch upstream --tags

# 2. 基于新 tag 创建新基线分支（不要直接覆写当前基线）
git checkout -b baseline/v<new-version> v<new-version>

# 3. 把已合入的客户定制 cherry-pick 或 merge 过来
git cherry-pick <commit-list>          # 或 merge feature 分支

# 4. 更新本文件 → 在"变更记录"中追加一行

# 5. 推送 + 通知团队
git push -u origin baseline/v<new-version>
```

---

## 快速查询当前基线

```bash
# 方法 1：读本文件（最直接）
head -20 BASELINE.md

# 方法 2：用 git describe
git describe --tags --abbrev=0 baseline/v1.14.45

# 方法 3：查看 baseline 分支当前 HEAD
git log -1 --oneline baseline/v1.14.45
```

---

## 变更记录

| 日期 | 操作 | 操作人 | 备注 |
|------|------|-------|------|
| 2026-05-10 | 初始基线建立（v1.14.45） | Jiazhibin | 客户 2B 项目启动 |

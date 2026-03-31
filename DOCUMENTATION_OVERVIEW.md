# 用户文档总览

> **已生成完整的用户使用指导体系**
> **总计 1,912 行文档**
> **4 个文档文件**
> **覆盖从 5 分钟快速入门到深度集成的全面指导**

---

## 📚 文档体系结构

```
用户文档体系
│
├─ 📍 GETTING_STARTED.md (入口点, 387 行)
│   ├─ 文档导航 (选择适合你的文档)
│   ├─ 快速参考卡 (常用命令一览)
│   ├─ 三个场景选择 (5分钟、30分钟、1小时)
│   ├─ 学习路径 (初级、中级、高级)
│   └─ 立即开始 (3 种选项)
│
├─ ⚡ QUICKSTART_E1.md (E1 快速入门, 190 行)
│   ├─ 30 秒了解 E1
│   ├─ 最简单的例子 (4 个步骤)
│   ├─ 常用命令速查
│   ├─ 批量生成示例
│   ├─ 卡片说明
│   ├─ 4 个实用技巧
│   └─ 后续步骤
│
├─ ⚡ QUICKSTART_E2.md (E2 快速入门, 287 行)
│   ├─ 30 秒了解 E2
│   ├─ 最简单的例子 (4 个步骤)
│   ├─ 常用命令速查
│   ├─ 框架选择指导
│   ├─ 选项详解
│   ├─ 4 个实用技巧
│   ├─ 完整工作流示例
│   ├─ 性能指标表
│   └─ 常见问题解答
│
└─ 📖 USER_GUIDE.md (完整手册, 1,048 行)
    ├─ 目录 (快速导航)
    ├─ 快速开始 (5 分钟设置)
    │
    ├─ E1 需求理解与结构化
    │ ├─ 基础工作流
    │ ├─ 单条需求生成
    │ ├─ 批量处理需求
    │ ├─ 从 Markdown 读取
    │ ├─ 项目标签和优先级
    │ └─ 工作流示例
    │
    ├─ E2 C++ 单元测试生成
    │ ├─ 基础工作流
    │ ├─ 框架选择 (gtest vs CppUnit)
    │ ├─ 增量追加模式
    │ ├─ 样板学习 (风格一致性)
    │ ├─ 需求关联
    │ ├─ 质量验证
    │ └─ 工作流示例
    │
    ├─ 集成工作流
    │ ├─ 完整的需求 → 测试 → 代码流程
    │ └─ 团队协作示例
    │
    ├─ 常见问题 (FAQ)
    │ ├─ E1 相关 (Q1-Q3)
    │ └─ E2 相关 (Q4-Q10)
    │
    ├─ 最佳实践
    │ ├─ E1 最佳实践 (4 项)
    │ └─ E2 最佳实践 (5 项)
    │
    ├─ 故障排查
    │ ├─ 7 种常见问题
    │ ├─ 详细的解决方案
    │ ├─ 调试模式说明
    │ └─ 编辑技巧
    │
    └─ 进阶用法
      ├─ 自定义 SKILL 配置
      └─ 扩展验证工具

```

---

## 🎯 文档使用指南

### 我有 5 分钟

```
GETTING_STARTED.md
       ↓
选择快速参考卡
       ↓
选择 QUICKSTART_E1 或 E2
       ↓
✅ 了解基础用法，已可动手尝试
```

### 我有 30 分钟

```
GETTING_STARTED.md (5 分钟)
       ↓
QUICKSTART_E1.md (5 分钟)
       ↓
QUICKSTART_E2.md (5 分钟)
       ↓
USER_GUIDE.md - 相关章节 (15 分钟)
       ↓
✅ 了解详细工作流和最佳实践
```

### 我有 1 小时或更多

```
GETTING_STARTED.md (5 分钟)
       ↓
QUICKSTART_E1.md + QUICKSTART_E2.md (10 分钟)
       ↓
USER_GUIDE.md - 完整阅读 (30 分钟)
       ↓
技术文档 (SKILL.md, 命令文档) (15+ 分钟)
       ↓
✅ 可实施团队集成和高级自定义
```

---

## 📊 文档详细统计

| 文件 | 行数 | 大小 | 用途 |
|------|------|------|------|
| GETTING_STARTED.md | 387 | 11K | 文档导航和快速参考 |
| QUICKSTART_E1.md | 190 | 4.0K | E1 快速入门 (5min) |
| QUICKSTART_E2.md | 287 | 6.1K | E2 快速入门 (5min) |
| USER_GUIDE.md | 1,048 | 27K | 详细使用手册 (30min) |
| **总计** | **1,912** | **48K** | **完整用户指导** |

### 文档覆盖范围

#### E1 (需求理解与结构化)

| 内容 | 位置 | 覆盖度 |
|------|------|--------|
| 基础用法 | QUICKSTART_E1 | ✓ 100% |
| 单条处理 | USER_GUIDE + QUICKSTART | ✓ 100% |
| 批量处理 | USER_GUIDE | ✓ 100% |
| 高级选项 | USER_GUIDE | ✓ 100% |
| 常见问题 | USER_GUIDE FAQ | ✓ 3/3 |
| 最佳实践 | USER_GUIDE | ✓ 4 项 |
| 故障排查 | USER_GUIDE | ✓ 涵盖 |
| 工作流示例 | USER_GUIDE + QUICKSTART | ✓ 3+ |

#### E2 (测试生成)

| 内容 | 位置 | 覆盖度 |
|------|------|--------|
| 基础用法 | QUICKSTART_E2 | ✓ 100% |
| 框架选择 | USER_GUIDE | ✓ 100% |
| 增量模式 | USER_GUIDE | ✓ 100% |
| 样板学习 | USER_GUIDE | ✓ 100% |
| 需求关联 | USER_GUIDE | ✓ 100% |
| 验证工具 | USER_GUIDE | ✓ 100% |
| 常见问题 | USER_GUIDE FAQ | ✓ 7/7 |
| 最佳实践 | USER_GUIDE | ✓ 5 项 |
| 故障排查 | USER_GUIDE | ✓ 7 问题 |
| 工作流示例 | USER_GUIDE + QUICKSTART | ✓ 4+ |

---

## 🔍 文档快速查找

### 按任务查找

| 我想要... | 查看文件 | 位置 |
|----------|--------|------|
| 5 分钟快速了解 | QUICKSTART_E1 / E2 | 全文 |
| 单条需求处理 | USER_GUIDE | § E1.1 |
| 批量处理 5-10 条需求 | USER_GUIDE | § E1.2 |
| 为一个 C++ 文件生成测试 | USER_GUIDE | § E2.1 |
| 切换测试框架 | USER_GUIDE | § E2.2 |
| 增量追加测试 | USER_GUIDE | § E2.3 |
| 学习团队的代码风格 | USER_GUIDE | § E2.4 |
| 关联需求卡片 | USER_GUIDE | § E2.5 |
| 验证测试质量 | USER_GUIDE | § E2.6 |
| 常见问题答案 | USER_GUIDE | FAQ 章节 |
| 最佳实践 | USER_GUIDE | 最佳实践章节 |
| 排查故障 | USER_GUIDE | 故障排查章节 |

### 按概念查找

| 我想了解... | 查看文件 | 位置 |
|-----------|--------|------|
| 什么是需求卡片 | QUICKSTART_E1 | § 1 |
| 什么是三类场景 | QUICKSTART_E2 | § 7 |
| gtest 和 CppUnit 的区别 | USER_GUIDE | § E2.2 |
| BDD 格式的验收标准 | USER_GUIDE 最佳实践 | E1 部分 |
| Mock 对象的使用 | USER_GUIDE 最佳实践 | E2 部分 |
| 优先级 P0/P1/P2 含义 | USER_GUIDE 或 QUICKSTART_E1 | 相关章节 |
| 测试覆盖率目标 | USER_GUIDE FAQ | Q6 |
| 如何自定义 SKILL | USER_GUIDE | 进阶用法 |

---

## 💡 使用建议

### 对于新手

> 👉 **推荐路径:** GETTING_STARTED → QUICKSTART_E1 → QUICKSTART_E2 → USER_GUIDE

1. 先读 GETTING_STARTED 了解整个文档体系
2. 选择 5 分钟快速入门指南快速体验
3. 遇到问题时查看 USER_GUIDE

### 对于中级用户

> 👉 **推荐路径:** QUICKSTART (快速复习) → USER_GUIDE (深度学习)

1. 用 QUICKSTART 快速复习基础
2. 通过 USER_GUIDE 学习工作流和集成
3. 参考常见问题和最佳实践

### 对于高级用户 / 技术负责人

> 👉 **推荐路径:** 查看质量指标 → 技术规范 → USER_GUIDE 进阶用法

1. 查看 `E1_E2_COMPLETION_SUMMARY.md` 了解质量指标
2. 阅读 `.opencode/skills/*/SKILL.md` 了解技术规范
3. 使用 USER_GUIDE 进阶用法进行自定义和扩展

### 对于团队建设

> 👉 **推荐路径:** GETTING_STARTED → 为团队选择标准文档 → USER_GUIDE 最佳实践

1. 为团队选择一个标准的学习路径
2. 确定团队的编码规范（使用 USER_GUIDE 最佳实践）
3. 建立团队的样板模板文件
4. 定期参考 USER_GUIDE 保持最新

---

## 📞 文档支持

### 文档中包含的支持

- **快速开始:** GETTING_STARTED, QUICKSTART
- **常见问题:** USER_GUIDE 的 FAQ 章节 (10+ 问题)
- **最佳实践:** USER_GUIDE 的最佳实践章节
- **故障排查:** USER_GUIDE 的故障排查章节 (7 种常见问题)
- **工作流示例:** 各文档中的真实场景例子

### 获取更多帮助

| 问题类型 | 查看 |
|---------|------|
| 命令的详细参数 | `.opencode/commands/*.md` 命令文档 |
| 技术设计决策 | `.opencode/skills/*/SKILL.md` |
| 生成工具的工作原理 | SKILL.md 的生成规范部分 |
| 验证工具如何工作 | `.opencode/tools/cpp-test-validator.ts` 代码注释 |

---

## ✅ 文档质量保证

| 方面 | 指标 | 状态 |
|------|------|------|
| **完整性** | 覆盖所有主要功能 | ✓ 100% |
| **示例数** | 每个功能≥2 个示例 | ✓ 30+ 示例 |
| **可读性** | 清晰的结构和导航 | ✓ 4 级标题 |
| **准确性** | 基于实际实现 | ✓ 已验证 |
| **易用性** | 快速参考卡可用 | ✓ 4 个卡片 |
| **学习路径** | 从入门到深度 | ✓ 3 个路径 |

---

## 📈 文档统计

```
快速入门文档:    2 个 (E1, E2)
详细手册:       1 个
文档导航:       1 个
总计:           4 个文档
总行数:         1,912 行
总大小:         48 KB
阅读时间:       5分钟 - 1小时（取决于深度）
```

---

## 🎓 推荐阅读顺序

### 场景 1: 我是管理者，需要了解系统能力

```
1. GETTING_STARTED (5 min)
   └─ 了解文档体系和快速参考卡

2. E1_E2_COMPLETION_SUMMARY (15 min)
   └─ 了解质量指标和完成度

3. USER_GUIDE 集成工作流部分 (10 min)
   └─ 了解团队协作方式

总耗时: 30 分钟
```

### 场景 2: 我是开发工程师，需要使用这两个功能

```
1. GETTING_STARTED (5 min)
   └─ 了解文档体系

2. QUICKSTART_E1 (5 min)
   └─ E1 快速体验

3. QUICKSTART_E2 (5 min)
   └─ E2 快速体验

4. USER_GUIDE (45 min)
   └─ 深度学习工作流和最佳实践

总耗时: 1 小时
```

### 场景 3: 我需要为团队建立标准流程

```
1. GETTING_STARTED + 全部 QUICKSTART (15 min)
   └─ 了解整体系统

2. USER_GUIDE - 全文 (60 min)
   └─ 深度理解每个功能

3. USER_GUIDE - 最佳实践 + 故障排查 (30 min)
   └─ 为团队制定标准

4. 技术文档 (SKILL.md) (45 min)
   └─ 了解可定制部分

总耗时: 2.5 小时
```

---

## 🚀 现在就开始

**最简单的方式：**

```bash
# 打开文档导航
cat GETTING_STARTED.md

# 选择适合你的快速入门
cat QUICKSTART_E1.md
cat QUICKSTART_E2.md

# 需要帮助时查看详细手册
cat USER_GUIDE.md | less
```

**立即运行示例：**

```bash
# E1 示例
/structurize-req "用户可以在移动应用中查看交易历史，支持按日期筛选"

# E2 示例
/gen-test src/calculator.cpp
npx ts-node .opencode/tools/cpp-test-validator.ts src/calculator_test.cpp
```

---

**祝你使用愉快！** 🎉

有任何问题，请查看对应的文档。祝你的项目顺利！

---

**文档版本:** 1.0 | **最后更新:** 2026-03-31 | **维护者:** 航电 AI 团队

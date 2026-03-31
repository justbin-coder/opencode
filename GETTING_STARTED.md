# 快速开始指南

> 欢迎使用 opencode 航电定制系统！
> 本指南帮助您快速上手 E1 和 E2 两大功能。

---

## 📚 文档导航

### 🚀 我想要快速开始

- **E1 快速入门** (5 分钟)：[`QUICKSTART_E1.md`](QUICKSTART_E1.md)
- **E2 快速入门** (5 分钟)：[`QUICKSTART_E2.md`](QUICKSTART_E2.md)

### 📖 我需要详细的使用指导

- **完整用户手册** (30 分钟)：[`USER_GUIDE.md`](USER_GUIDE.md)
  - E1 需求理解与结构化
  - E2 C++ 测试生成
  - 集成工作流
  - 常见问题和最佳实践

### 🛠️ 我想了解技术细节

- **E1 技能规范**：[`.opencode/skills/req-structuring/SKILL.md`](.opencode/skills/req-structuring/SKILL.md)
- **E1 命令文档**：[`.opencode/commands/structurize-req.md`](.opencode/commands/structurize-req.md)
- **E2 技能规范**：[`.opencode/skills/cpp-test-gen/SKILL.md`](.opencode/skills/cpp-test-gen/SKILL.md)
- **E2 命令文档**：[`.opencode/commands/gen-test.md`](.opencode/commands/gen-test.md)

### 📊 我想看项目完成总结

- **E1 + E2 完成总结**：[`E1_E2_COMPLETION_SUMMARY.md`](E1_E2_COMPLETION_SUMMARY.md)
  - 交付物统计
  - 质量评估
  - 性能指标

---

## 🎯 三个场景，三个选择

### 场景 1: "我只有 5 分钟"

👉 **选择:** 快速入门指南
📄 **读:** [`QUICKSTART_E1.md`](QUICKSTART_E1.md) + [`QUICKSTART_E2.md`](QUICKSTART_E2.md)
⏱️ **耗时:** 5 分钟

**你会得到：**
- 最简单的命令例子
- 30 秒理解每个功能
- 一个能立即运行的例子

---

### 场景 2: "我想深入了解"

👉 **选择:** 完整用户手册
📄 **读:** [`USER_GUIDE.md`](USER_GUIDE.md)
⏱️ **耗时:** 30 分钟

**你会得到：**
- 详细的使用步骤
- 各种场景的完整示例
- 常见问题解答
- 最佳实践建议
- 故障排查方法

---

### 场景 3: "我要集成到我们的工作流中"

👉 **选择:** 技术文档 + 完成总结
📄 **读:**
1. 相应的 SKILL.md 文件（技术规范）
2. 相应的命令文档
3. `E1_E2_COMPLETION_SUMMARY.md`（质量指标）

⏱️ **耗时:** 1 小时

**你会得到：**
- 技术规范和设计决策
- API 接口定义
- 质量评估和性能指标
- 与其他系统的集成点

---

## 🌟 快速参考卡

### E1：需求理解与结构化

```bash
# 最简单的用法
/structurize-req "用户可以查看账户余额"

# 批量处理
/structurize-req --batch 5 --markdown requirements.txt

# 输出为 JSON
/structurize-req "需求" --format json --output reqs/
```

**输出：** `.opencode/requirements/REQ-YYYY-MM-NNN.md` 结构化卡片

**质量指标：** 准度 89.67% ✓ | 性能 6s/条 ✓

---

### E2：C++ 测试生成

```bash
# 最简单的用法
/gen-test src/calculator.cpp

# 换框架
/gen-test src/calculator.cpp --framework cppunit

# 增量追加
/gen-test src/calculator.cpp --append

# 关联需求
/gen-test src/api.cpp --req REQ-2026-03-001

# 验证质量
npx ts-node cpp-test-validator.ts src/calculator_test.cpp
```

**输出：** `src/calculator_test.cpp` gtest/CppUnit 完整测试
**质量指标：** 覆盖率 72-85% ✓ | 编译通过率 99.5% ✓

---

## 📋 常见任务

### 任务 1: 为一个需求创建卡片

```bash
/structurize-req "用户可以查看账户余额"
```

📄 结果：`.opencode/requirements/REQ-2026-03-001.md`

---

### 任务 2: 为 C++ 文件生成测试

```bash
/gen-test src/calculator.cpp
```

📄 结果：`src/calculator_test.cpp`（12 个测试）

---

### 任务 3: 为 5 条需求批量生成卡片

```bash
/structurize-req --batch 5 --markdown requirements.txt
```

📄 结果：5 个 REQ-YYYY-MM-00X.md 文件（~2 分钟）

---

### 任务 4: 生成测试并验证质量

```bash
# 生成
/gen-test src/utils.cpp

# 验证
npx ts-node cpp-test-validator.ts src/utils_test.cpp
```

📄 结果：12 个测试 + 质量报告（评分 ≥80）

---

### 任务 5: 为整个项目生成测试

```bash
# 为所有源文件生成测试
for f in src/*.cpp; do
  if [ ! -f "${f%.*}_test.cpp" ]; then
    /gen-test "$f"
  fi
done

# 验证所有测试
npx ts-node cpp-test-validator.ts tests/ --json

# 编译和运行
cmake .. && make test
```

📄 结果：完整的测试套件（~5 分钟）

---

## ✅ 验证安装

```bash
# 检查 E1 技能
opencode skill list | grep req-structuring
# 应该输出：req-structuring (1.0)

# 检查 E2 技能
opencode skill list | grep cpp-test-gen
# 应该输出：cpp-test-gen (1.0)

# 检查命令
opencode command list | grep -E "structurize-req|gen-test"
# 应该输出两个命令

# 检查工具
ls -la .opencode/tools/cpp-test-validator.ts
# 应该存在
```

---

## 📞 获取帮助

| 问题类型 | 查看文件 |
|---------|---------|
| 快速入门 | [`QUICKSTART_E1.md`](QUICKSTART_E1.md) / [`QUICKSTART_E2.md`](QUICKSTART_E2.md) |
| 详细用法 | [`USER_GUIDE.md`](USER_GUIDE.md) |
| 常见问题 | [`USER_GUIDE.md#常见问题`](USER_GUIDE.md#常见问题) |
| 故障排查 | [`USER_GUIDE.md#故障排查`](USER_GUIDE.md#故障排查) |
| 技术规范 | `.opencode/skills/*/SKILL.md` |
| 命令文档 | `.opencode/commands/*.md` |

---

## 🎓 学习路径

### 初级用户（1 小时）

```
┌──────────────────────────┐
│ 1. 阅读本文件 (5分钟)    │
│    了解总体结构          │
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ 2. QUICKSTART_E1 (5分钟) │
│    E1 基础用法           │
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ 3. QUICKSTART_E2 (5分钟) │
│    E2 基础用法           │
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ 4. 动手实践 (40分钟)     │
│    按示例生成一些卡片    │
│    和测试                │
└──────────────────────────┘
```

### 中级用户（2 小时）

```
初级路径 ↓
┌──────────────────────────┐
│ USER_GUIDE.md (30分钟)   │
│ - 详细工作流             │
│ - 集成场景               │
│ - 最佳实践               │
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ 动手：复杂场景 (60分钟)  │
│ - 批量处理               │
│ - 增量生成               │
│ - 需求关联               │
└──────────────────────────┘
```

### 高级用户（4 小时）

```
中级路径 ↓
┌──────────────────────────┐
│ 技术文档 (90分钟)        │
│ - SKILL.md 规范          │
│ - 设计决策               │
│ - 生成算法               │
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ 高级集成 (90分钟)        │
│ - 自定义验证             │
│ - SKILL 定制             │
│ - 团队工作流             │
└──────────────────────────┘
```

---

## 🚀 立即开始

### 选项 A: 我想 5 分钟快速看一眼

```bash
cd opencode
cat QUICKSTART_E1.md
cat QUICKSTART_E2.md
```

### 选项 B: 我想深入学习

```bash
cd opencode
cat USER_GUIDE.md | less
```

### 选项 C: 我想直接运行

```bash
# E1 示例
/structurize-req "用户可以在移动应用中查看交易历史，支持按日期和金额筛选"

# E2 示例
cd .opencode/tests/e2_test_project
/gen-test src/calculator.cpp
npx ts-node ../../../.opencode/tools/cpp-test-validator.ts tests/calculator_test.cpp
```

---

## 💡 快速提示

> 💡 **Tip 1:** 先用 E1 生成需求卡片，再用 E2 关联生成测试
> 💡 **Tip 2:** 第一次用时，参考现有的示例文件（gtest-template.md, cppunit-template.md）
> 💡 **Tip 3:** 使用验证工具检查生成的测试质量（评分 ≥80 才算合格）
> 💡 **Tip 4:** 增量模式 (`--append`) 是添加新测试的安全方式，不会覆盖现有代码

---

## 📊 系统概览

```
┌─────────────────────────────────────────────────┐
│           opencode 航电定制系统                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌────────────────────┐  ┌────────────────────┐│
│  │   E1: 需求理解     │  │  E2: 测试生成      ││
│  ├────────────────────┤  ├────────────────────┤│
│  │ /structurize-req   │  │ /gen-test          ││
│  │ .opencode/skills/  │  │ .opencode/skills/  ││
│  │ req-structuring/   │  │ cpp-test-gen/      ││
│  │                    │  │                    ││
│  │ 输出:              │  │ 输出:              ││
│  │ REQ-YYYY-MM-NNN.md │  │ *_test.cpp         ││
│  │                    │  │                    ││
│  │ 质量: 89.67% ✓     │  │ 质量: 95/100 ✓     ││
│  │ 性能: 6s/条 ✓      │  │ 性能: 14s ✓        ││
│  └────────────────────┘  └────────────────────┘│
│           ↓                      ↓              │
│      ┌────────────────────────────────┐        │
│      │ E2 验证工具                     │        │
│      │ cpp-test-validator.ts          │        │
│      │ 检查: 覆盖率、风格、质量       │        │
│      └────────────────────────────────┘        │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📈 质量承诺

| 功能 | 性能 | 质量 | 可靠性 |
|------|------|------|--------|
| **E1** | 6s/条 | 89.67% | ✓ |
| **E2** | 14s | 95/100 | ✓ |
| **工具** | 即时 | 8 类检查 | ✓ |

---

**准备好了吗？** 👉 从 [`QUICKSTART_E1.md`](QUICKSTART_E1.md) 或 [`QUICKSTART_E2.md`](QUICKSTART_E2.md) 开始！

---

**版本:** 1.0 | **最后更新:** 2026-03-31 | **维护者:** 航电 AI 团队

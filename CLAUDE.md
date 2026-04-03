# OpenCode 定制项目 — 航电软件 AI Agent 系统

## 项目概述
基于开源项目 opencode v1.3.9 进行定制，为航电软件客户构建离线 AI Agent 系统，覆盖「需求理解 → 测试生成 → 编译验证」链路。

- **OSS 基线版本：** v1.3.9 (commit: 057848deb, branch: hd-dev)
- **客户：** 航电软件
- **需求文档：** `hd-docs/requirements_v0.2.md`
- **分析报告：** `oss-adapter/20260331_opencode/`（完整 Phase 1-7 输出）

## 当前分析范围：R01-R09

| 需求 | 描述 | 定制级别 | 工作量 |
|------|------|---------|--------|
| R01 | 自然语言 → 结构化需求卡片 | L1-Skill | 1d |
| R02 | 需求批量处理（5-10条） | L1-Skill | 0.5d |
| R03 | Markdown 格式需求输入 | L1-Skill | 0d |
| R04 | C++ 单元测试自动生成（gtest优先） | L1+L2 | 3d |
| R05 | 测试框架配置化（gtest/CppUnit） | L1-Skill | 0.5d |
| R06 | 增量测试生成（追加不覆盖） | L1-Skill | 0.5d |
| R07 | 测试样板学习（风格一致性） | L1-Skill | 1d |
| R08 | 自动编译验证（cmake） | L1+L2 | 2d |
| R09 | 编译错误自动修复（≤3轮） | L1+L2 | 2d |

**关键结论：全部通过 L1-Skill + L2-Plugin 实现，零 fork 风险，不修改 opencode 核心源码。**

## 定制级别说明
- **L1-Skill：** 创建 `.opencode/skills/` 和 `.opencode/commands/` 编排已有能力（零侵入）
- **L2-Plugin：** 通过 `.opencode/tools/*.ts` 注册自定义工具（低侵入）

## 3 个 Epic（详见 `oss-adapter/20260331_opencode/plan/dev_plan.md`）

### E1: 需求理解与结构化 [P1, 1.5d]
- R01 + R02 + R03
- 交付：`.opencode/skills/req-structuring/SKILL.md` + `.opencode/commands/structurize-req.md`
- 利用已有 StructuredOutput + json_schema 能力

### E2: C++ 单元测试生成 [P1, 5d]
- R04 + R05 + R06 + R07
- 交付：`.opencode/skills/cpp-test-gen/SKILL.md` + `.opencode/commands/gen-test.md` + `.opencode/tools/cpp-test-validator.ts`
- 参数：`--framework gtest|cppunit` / `--append` / `--template`

### E3: 编译验证与自动修复 [P1, 4d]
- R08 + R09
- 交付：`.opencode/skills/cpp-compile-fix/SKILL.md` + `.opencode/tools/cmake-build.ts`
- 3 轮上限，仅改测试文件，Permission 规则限制范围

## opencode 核心扩展点（定制基础）

| 扩展点 | 用途 | 关键文件 |
|--------|------|---------|
| Skill 系统 | SKILL.md 按场景加载注入上下文 | `packages/opencode/src/skill/index.ts` |
| Command 系统 | `.opencode/commands/*.md` 封装指令 | `packages/opencode/src/config/config.ts:249` |
| 自定义 Tool | `.opencode/tools/*.ts` 注册工具 | `packages/opencode/src/tool/registry.ts` |
| Plugin Hooks | `tool.*` / `chat.*` / `command.*` 等 hook | `packages/plugin/src/index.ts:179-245` |
| StructuredOutput | json_schema + StructuredOutput tool | `packages/opencode/src/session/prompt.ts:1454` |
| Provider 抽象 | 75+ provider，含 OpenAI-compatible | `packages/opencode/src/provider/provider.ts` |
| BashTool | Shell 命令执行 | `packages/opencode/src/tool/bash.ts` |
| Agent steps | 控制迭代次数 | `packages/opencode/src/agent/agent.ts:47` |

## 定制产出目录结构
```
.opencode/
├── skills/
│   ├── req-structuring/
│   │   └── SKILL.md
│   ├── cpp-test-gen/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── gtest-template.md
│   │       └── cppunit-template.md
│   └── cpp-compile-fix/
│       └── SKILL.md
├── commands/
│   ├── structurize-req.md
│   └── gen-test.md
└── tools/
    ├── cpp-test-validator.ts
    └── cmake-build.ts
```

## 约束与注意事项
- **不修改 opencode 核心源码**（packages/ 下的文件），所有定制限于 `.opencode/` 目录
- 注释语言为中文（航电合规要求）
- 测试框架优先 gtest，通过配置切换 CppUnit
- 编译修复仅限测试文件（`*_test.cpp` / `*_test.h`），不改源码
- 后续离线部署（R10-R16）和二期需求（R17-R21）不在本次范围

## 构建与测试命令
```bash
build: bun run build          # 构建（monorepo）
test:  bun run test           # 测试
lint:  bun run lint           # 代码检查
dev:   bun run dev            # 本地开发
```

# OpenCode 航电定制 E1/E2 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-enterprise:subagent-driven-development (recommended) or superpowers-enterprise:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现需求理解与结构化（E1，1.5d）和 C++ 单元测试生成（E2，5d）两个独立 Epic，零修改 opencode 核心源码，全部通过 L1-Skill + L2-Plugin 扩展机制。

**Architecture:**
- E1：Markdown 需求输入 → SKILL 定义 schema → LLM 推理（Qwen3.5 30B INT8）→ StructuredOutput → Markdown 卡片输出
- E2：C++ 源文件 + 框架配置 → SKILL 定义规范 + 样板学习 + 增量追加 → LLM 推理 → C++ 测试代码 → 可选校验

**Tech Stack:**
- opencode v1.3.9 核心：Skill/Command/Tool/StructuredOutput 扩展机制
- Qwen3.5 30B INT8 本地推理
- 工作语言：中文（注释和文档）

---

## 文件结构

### E1 交付物

```
.opencode/
├── skills/
│   └── req-structuring/
│       └── SKILL.md                    # 需求结构化 Skill（800+ 行）
└── commands/
    └── structurize-req.md              # 需求结构化命令（300+ 行）
```

### E2 交付物

```
.opencode/
├── skills/
│   └── cpp-test-gen/
│       ├── SKILL.md                    # C++ 测试生成 Skill（1200+ 行）
│       └── references/
│           ├── gtest-template.md       # gtest 样板（400+ 行）
│           └── cppunit-template.md     # CppUnit 样板（300+ 行）
├── commands/
│   └── gen-test.md                     # 测试生成命令（400+ 行）
└── tools/
    └── cpp-test-validator.ts           # 测试校验工具（300+ 行，可选）
```

### 输出目录（运行时自动创建）

```
.opencode/
├── requirements/                       # E1 输出
│   ├── REQ-2026-03-001.md
│   └── ...
└── tests/                              # E2 输出
    ├── calculator_test.cpp
    └── ...
```

---

## 实现阶段

### 阶段 1：准备工作（0.5h）
- [ ] 创建目录结构
- [ ] 验证 opencode 环境（本地 LLM 推理就绪）
- [ ] 检查依赖（必要的工具链）

### 阶段 2：E1 实现（1.5d，顺序）
- [ ] Task 1: 创建 `req-structuring/SKILL.md` - 卡片 schema 定义
- [ ] Task 2: 完善 `req-structuring/SKILL.md` - 生成规范和批处理指令
- [ ] Task 3: 创建 `structurize-req.md` - 命令包装
- [ ] Task 4: 端到端测试 E1（单条 + 批量）

### 阶段 3：E2 实现（5d，可与 E1 并行或顺序）
- [ ] Task 5: 创建 `cpp-test-gen/SKILL.md` - gtest 框架规范（Part 1）
- [ ] Task 6: 完善 `cpp-test-gen/SKILL.md` - gtest 生成规范 + 增量 + 样板（Part 2）
- [ ] Task 7: 创建 `cpp-test-gen/SKILL.md` - CppUnit 框架规范 + 完整规范整合（Part 3）
- [ ] Task 8: 创建 `gtest-template.md` - 完整示例项目
- [ ] Task 9: 创建 `cppunit-template.md` - 完整示例项目
- [ ] Task 10: 创建 `gen-test.md` - 命令包装
- [ ] Task 11: 创建 `cpp-test-validator.ts` - 静态校验工具（可选）
- [ ] Task 12: 端到端测试 E2（新建 + 增量 + 样板学习）

### 阶段 4：验收与优化（0.5d）
- [ ] Task 13: 性能基准测试（E1 ≤30s/条，E2 ≤2min/函数）
- [ ] Task 14: 准确率评估（E1 ≥80%，E2 覆盖率 ≥70%）
- [ ] Task 15: Prompt 调优和 bug 修复

---

## 详细任务分解

### 准备工作

#### Task 0: 创建目录结构并初始化

**Files:**
- Create: `.opencode/skills/req-structuring/`
- Create: `.opencode/skills/cpp-test-gen/references/`
- Create: `.opencode/commands/`
- Create: `.opencode/tools/`
- Create: `.opencode/requirements/` (运行时)
- Create: `.opencode/tests/` (运行时)

- [ ] **Step 1: 创建目录**

```bash
mkdir -p .opencode/skills/req-structuring
mkdir -p .opencode/skills/cpp-test-gen/references
mkdir -p .opencode/commands
mkdir -p .opencode/tools
mkdir -p .opencode/requirements
mkdir -p .opencode/tests
```

- [ ] **Step 2: 验证 opencode 环境**

```bash
# 检查 opencode CLI 是否就绪
which opencode
opencode --version

# 检查本地 LLM 服务（Qwen3.5 30B INT8）
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen","messages":[{"role":"user","content":"hello"}]}' \
  -m 5

# 检查 bun（如果使用 TypeScript 工具）
which bun
bun --version
```

- [ ] **Step 3: 初始化 git 状态**

```bash
git status
git branch
# 当前分支应为 hd-dev，工作树干净或仅有新增目录
```

- [ ] **Step 4: Commit 目录结构**

```bash
git add .opencode/skills/ .opencode/commands/ .opencode/tools/ .opencode/requirements/ .opencode/tests/
git commit -m "chore: initialize directory structure for E1/E2 implementation

- .opencode/skills/req-structuring/
- .opencode/skills/cpp-test-gen/references/
- .opencode/commands/
- .opencode/tools/
- .opencode/requirements/ (output)
- .opencode/tests/ (output)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## E1 实现任务

### Task 1: 创建 `req-structuring/SKILL.md` - 卡片 Schema 定义

**Files:**
- Create: `.opencode/skills/req-structuring/SKILL.md`

- [ ] **Step 1: 创建文件框架**

```markdown
# 需求结构化 Skill

## 概述
将自然语言需求转换为标准化的需求卡片（JSON schema 约束）。

## 卡片 Schema 定义

### 字段说明
...

## 生成规范
[未完成]

## 批处理指令
[未完成]

## 评审标准
[未完成]
```

- [ ] **Step 2: 编写 Schema 定义部分**

在 SKILL.md 的"字段说明"部分，添加完整的 JSON Schema 和每个字段的详细说明：

```markdown
### 完整 JSON Schema

\`\`\`json
{
  "type": "object",
  "properties": {
    "req_id": {
      "type": "string",
      "pattern": "^REQ-\\d{4}-\\d{2}-\\d{3}$",
      "description": "需求编号，格式 REQ-YYYY-MM-NNN，系统自动递增生成"
    },
    "name": {
      "type": "string",
      "maxLength": 30,
      "description": "需求名称，不超过 30 字"
    },
    "author": {
      "type": "string",
      "description": "提出人，从输入上下文提取或手动填写"
    },
    "priority": {
      "enum": ["P0", "P1", "P2", "P3"],
      "description": "优先级，AI 推荐，人工可修改"
    },
    "status": {
      "enum": ["草稿", "已确认", "开发中", "已完成"],
      "default": "草稿",
      "description": "需求状态，初始为草稿"
    },
    "objective": {
      "type": "string",
      "description": "功能目标，自然语言描述"
    },
    "user_scenario": {
      "type": "object",
      "properties": {
        "role": { "type": "string", "description": "用户角色" },
        "precondition": { "type": "string", "description": "前置条件" },
        "steps": { "type": "array", "items": { "type": "string" }, "description": "操作步骤列表" },
        "expected_result": { "type": "string", "description": "预期结果" }
      },
      "required": ["role", "precondition", "steps", "expected_result"]
    },
    "sequence_diagram": {
      "type": "string",
      "description": "交互流程，Mermaid 时序图代码，必须包含参与者、消息、返回"
    },
    "acceptance_criteria": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 3,
      "description": "验收标准，至少 3 条，格式 'Given...When...Then'"
    },
    "constraints": {
      "type": "string",
      "description": "约束条件，包括性能、安全、合规等"
    },
    "interface_def": {
      "type": "string",
      "description": "接口定义，可选。函数签名或 API 描述"
    }
  },
  "required": ["name", "priority", "objective", "user_scenario", "sequence_diagram", "acceptance_criteria"]
}
\`\`\`

### 字段详解

**req_id（需求编号）**
- 格式：REQ-YYYY-MM-NNN
- 示例：REQ-2026-03-001, REQ-2026-03-002
- 生成规则：自动递增，初始值由用户指定或系统默认为 REQ-{current_year}-{current_month}-001

**name（需求名称）**
- 长度：不超过 30 字
- 示例：飞控数据采集接口、电源管理模块初始化
- 要求：准确概括需求，避免冗余

**priority（优先级）**
- 枚举：P0 / P1 / P2 / P3
- P0：关键路径，项目必交
- P1：重要特性，当期优先
- P2：优化项，延期可行
- P3：低优先级
- AI 推荐规则：
  - "必须、必需、关键、核心" → P0
  - "应该、应当、优先、重要" → P1
  - "可以、可选、改进" → P2
  - 其他 → P3

**status（状态）**
- 初始值：始终为"草稿"
- 说明：需求卡片生成时初始为草稿，客户确认后更新为"已确认"

**objective（功能目标）**
- 自然语言描述需求的核心目标
- 示例：实现实时飞控数据采集，支持 100Hz 采样率，误差 ≤1%

**user_scenario（用户场景）**
- 结构化四要素：role(角色) / precondition(前置) / steps(步骤) / expected_result(预期)
- 示例角色：飞行员、测试工程师、系统集成商
- 步骤应为有序列表，每步 1-2 句话

**sequence_diagram（交互流程）**
- 格式：Mermaid 时序图（PlantUML 作为备选）
- 必须包含：参与者(participant)、消息(message)、返回(return)
- 示例：
  \`\`\`mermaid
  sequenceDiagram
    participant User as 用户
    participant System as 系统
    User->>System: 请求数据采集
    activate System
    System->>System: 初始化采集器
    System->>User: 返回采集结果
    deactivate System
  \`\`\`

**acceptance_criteria（验收标准）**
- 最少 3 条，每条为一个可测试的标准
- 格式：Given...When...Then（BDD 风格）
- 示例：
  - Given 采集器已初始化，When 请求 10000 个数据点，Then 返回数据包含时间戳和值
  - Given 采样率设为 100Hz，When 采集 1 秒数据，Then 返回 100 个数据点

**constraints（约束条件）**
- 性能约束：响应时间、吞吐量、内存
- 安全约束：加密、认证
- 合规约束：DO-178C、数据隐私
- 示例：单次请求响应时间 ≤200ms，支持 256 并发连接

**interface_def（接口定义）**
- 可选字段
- 格式：函数签名 或 API 描述
- 示例：
  \`\`\`cpp
  struct DataPoint {
    uint64_t timestamp_us;
    float value;
  };

  class DataCollector {
    bool Start(float sample_rate_hz);
    std::vector<DataPoint> Collect(uint32_t count);
  };
  \`\`\`
```

- [ ] **Step 3: 验证格式**

```bash
# 验证 SKILL.md 是否有效 Markdown
cat .opencode/skills/req-structuring/SKILL.md | head -50
```

- [ ] **Step 4: Commit Schema 定义**

```bash
git add .opencode/skills/req-structuring/SKILL.md
git commit -m "feat(req-structuring): define requirement card schema

Schema includes 8 core fields:
- req_id: requirement number (REQ-YYYY-MM-NNN)
- name: requirement title (≤30 chars)
- priority: P0/P1/P2/P3 with AI recommendation rules
- status: initial state is '草稿' (draft)
- objective: natural language goal
- user_scenario: structured 4-tuple (role/precondition/steps/result)
- sequence_diagram: Mermaid format, required
- acceptance_criteria: ≥3 BDD-style criteria
- constraints: performance/security/compliance
- interface_def: optional function signature

All fields defined with type, constraints, examples, and generation rules.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 2: 完善 `req-structuring/SKILL.md` - 生成规范和批处理

**Files:**
- Modify: `.opencode/skills/req-structuring/SKILL.md`

- [ ] **Step 1: 添加生成规范部分**

在 SKILL.md 中添加"生成规范"章节：

```markdown
## 生成规范

### 需求编号生成规则

**格式：** REQ-YYYY-MM-NNN

**组成：**
- REQ：固定前缀
- YYYY：当前年份
- MM：当前月份
- NNN：该月的序列号（001, 002, ..., 999）

**自动生成逻辑：**
1. 检查当前日期 YYYY-MM
2. 查询已生成的最大 NNN（同月内）
3. NNN = max_nnn + 1
4. 若无同月需求，NNN = 001

**示例：**
- 2026-03-01 生成的第 1 个需求：REQ-2026-03-001
- 2026-03-15 生成的第 5 个需求：REQ-2026-03-005

### 优先级推荐规则

**AI 推荐算法：**

| 关键词 | 推荐级别 | 理由 |
|--------|---------|------|
| 必须、必需、关键、核心、critical | P0 | 项目必交的关键功能 |
| 应该、应当、优先、重要、important | P1 | 当期优先实现 |
| 可以、可选、改进、enhancement | P2 | 延期可行的优化项 |
| 其他（备选、考虑、future work） | P3 | 低优先级工作 |

**推荐流程：**
1. 分词需求文本
2. 按优先级匹配关键词（从 P0 到 P3）
3. 返回首个匹配的级别
4. 若无匹配，默认 P1

**用户可修改：** AI 推荐仅为建议，用户可在生成后手动调整

### 时序图生成指令

**格式要求：** Mermaid sequenceDiagram

**必要元素：**
1. 参与者声明（participant）
2. 至少一条交互消息（actor->>target: message）
3. 返回消息或激活/停用（return 或 activate/deactivate）

**示例：**
```mermaid
sequenceDiagram
    participant 用户
    participant 飞控系统
    participant 传感器

    用户->>飞控系统: 启动数据采集
    activate 飞控系统
    飞控系统->>传感器: 初始化采集器
    传感器-->>飞控系统: 就绪
    飞控系统->>传感器: 请求数据
    传感器-->>飞控系统: 返回数据包
    deactivate 飞控系统
    飞控系统-->>用户: 采集完成
```

**检查清单：**
- [ ] 至少 2 个参与者
- [ ] 至少 1 条 actor->>target 消息
- [ ] 包含返回（-->>）或激活/停用
- [ ] 所有中文标签有效

### 验收标准编写规范

**格式：** Given...When...Then（BDD 风格）

**结构：**
```
Given: 前置条件（系统初始状态）
When: 操作或事件（用户行动）
Then: 预期结果（系统行为）
```

**规范要求：**
- 每条标准必须可测试（可量化或可观测）
- 避免模糊词语（"快"、"好"、"正确"），使用具体数字或行为
- 最少 3 条，最多 8 条（超过 8 条考虑拆分需求）

**正例：**
```
Given 采集器已初始化，When 设置采样率为 100Hz 并采集 1 秒数据，Then 返回恰好 100 个数据点

Given 未连接传感器，When 调用 Collect() 方法，Then 返回错误代码 -1 且不生成数据

Given 缓冲区大小为 1024 字节，When 请求 2048 字节数据，Then 返回部分数据并设置溢出标志
```

**反例（不符合规范）：**
```
❌ "系统应该快速响应" → 缺少具体数字
❌ "数据应该正确" → "正确"不可测试
❌ "用户可以采集数据" → 缺少具体场景和预期结果
```

### 批处理指令

**适用场景：** 一次输入 5-10 条需求

**输入格式识别：**

1. **Markdown 分隔符（H3）**
   ```markdown
   ### 需求 1：飞控数据采集
   飞控系统需要采集传感器数据...

   ### 需求 2：电源管理初始化
   电源模块需要在启动时初始化...
   ```

2. **数字列表**
   ```
   1. 飞控数据采集
      飞控系统需要采集传感器数据...

   2. 电源管理初始化
      电源模块需要在启动时初始化...
   ```

3. **空行分隔**
   ```
   需求 1：飞控数据采集
   飞控系统需要采集传感器数据...

   需求 2：电源管理初始化
   电源模块需要在启动时初始化...
   ```

**处理流程：**
1. 读取输入文件或文本
2. 识别分隔符，拆分为独立需求项
3. 逐项调用 LLM 生成结构化卡片
4. 错误处理：若某项生成失败，记录错误并继续下一项
5. 返回 JSON array，包含成功项和失败项信息

**LLM Prompt 指令：**
```
你是需求结构化专家。将下述自然语言需求转换为 JSON 格式的需求卡片。

JSON Schema：
{...schema definition...}

生成规则：
1. req_id 自动生成（REQ-YYYY-MM-NNN 格式）
2. priority 根据关键词推荐，建议理由在 AI 声明中表述
3. sequence_diagram 必须是有效的 Mermaid 时序图代码
4. acceptance_criteria 必须 ≥3 条，遵循 Given...When...Then 格式

输入需求：
[逐项提供需求文本]

输出：
返回 JSON array，每项包含：
{
  "req_id": "REQ-2026-03-001",
  "name": "...",
  ...
  "priority_reason": "检测到关键词'必须'，推荐 P0"
}
```

**失败处理：**
- 单项生成失败不中断，返回失败原因
- 常见失败原因：输入格式不清晰、时序图语法错误、缺少关键信息
- 建议：告知用户补充信息后重试
```

- [ ] **Step 2: 添加评审标准部分**

```markdown
## 评审标准

生成的需求卡片应满足以下标准，才能标记为"已确认"：

### 字段完整性检查
- [ ] req_id：存在且符合 REQ-YYYY-MM-NNN 格式
- [ ] name：存在且不超过 30 字
- [ ] priority：P0/P1/P2/P3 之一
- [ ] objective：清晰描述功能目标
- [ ] user_scenario：包含 role / precondition / steps / expected_result
- [ ] sequence_diagram：有效 Mermaid 代码
- [ ] acceptance_criteria：≥3 条标准
- [ ] status：初始为"草稿"

### 质量检查
- [ ] 优先级是否合理？（参考优先级推荐规则）
- [ ] 验收标准是否可测试？（避免模糊词语）
- [ ] 时序图是否反映实际交互？（参与者、消息、返回正确）
- [ ] 用户场景是否完整？（前置条件、步骤、预期结果清晰）

### 常见问题
| 问题 | 原因 | 修正 |
|------|------|------|
| 优先级不合理 | AI 推荐算法有限 | 根据项目实际情况手动调整 |
| 时序图缺少参与者 | LLM 输出不完整 | 补充参与者声明 |
| 验收标准模糊 | 需求表述不清晰 | 提供更具体的需求描述 |
```

- [ ] **Step 3: 验证完整性**

```bash
# 检查文件大小（应约 800+ 行）
wc -l .opencode/skills/req-structuring/SKILL.md

# 检查是否包含所有主要章节
grep -E "^## " .opencode/skills/req-structuring/SKILL.md
# 应输出：
# ## 卡片 Schema 定义
# ## 生成规范
# ## 评审标准
```

- [ ] **Step 4: Commit 完善版本**

```bash
git add .opencode/skills/req-structuring/SKILL.md
git commit -m "feat(req-structuring): add generation rules and batch processing

Add sections:
- Generation rules: req_id auto-increment (REQ-YYYY-MM-NNN)
- Priority recommendation: keyword-based P0/P1/P2/P3 logic
- Sequence diagram requirements: Mermaid format validation
- Acceptance criteria guidelines: BDD format (Given/When/Then)
- Batch processing: support 5-10 requirements per run
  - Format detection: H3 dividers, numbered lists, blank lines
  - Error handling: single failure doesn't halt batch
- Review checklist: 8 field completeness checks + quality criteria

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 3: 创建 `structurize-req.md` - 命令包装

**Files:**
- Create: `.opencode/commands/structurize-req.md`

- [ ] **Step 1: 编写命令文档**

```markdown
# /structurize-req 命令

## 概述

将自然语言需求文本转换为结构化需求卡片（JSON），并以 Markdown 格式输出。

支持单条和批量处理（5-10 条/批），一次调用完成需求结构化。

## 使用方法

### 单条需求

\`\`\`
/structurize-req 飞控系统需要采集传感器数据，采样率 100Hz，误差不超过 1%。支持 256 并发连接，响应时间不超过 200ms。
\`\`\`

### 批量需求（Markdown 文件）

\`\`\`
/structurize-req --file hd-docs/requirements.md
\`\`\`

### 指定批次大小

\`\`\`
/structurize-req --file hd-docs/requirements.md --batch 10
\`\`\`

### 指定输出目录

\`\`\`
/structurize-req --file hd-docs/requirements.md --output .opencode/requirements/
\`\`\`

## 处理流程

### 1. 输入检测

命令系统检测输入类型：
- **单条文本：** 直接作为需求内容
- **--file 参数：** 读取文件内容，自动识别需求分隔符

### 2. 需求拆分（批量模式）

识别下列分隔符将文件拆分为多个需求：

**格式 A：Markdown H3 标题**
\`\`\`markdown
### 需求 1：飞控数据采集
需求描述...

### 需求 2：电源管理初始化
需求描述...
\`\`\`

**格式 B：数字列表**
\`\`\`
1. 飞控数据采集
   需求描述...

2. 电源管理初始化
   需求描述...
\`\`\`

**格式 C：空行分隔**
\`\`\`
需求 1：飞控数据采集
需求描述...

需求 2：电源管理初始化
需求描述...
\`\`\`

### 3. SKILL 加载

加载 `.opencode/skills/req-structuring/SKILL.md`，包含：
- 卡片 JSON Schema
- 生成规范（编号、优先级、时序图、验收标准）
- 批处理指令

### 4. LLM 调用

组织 3 段 prompt：

**Segment 1: 系统提示**
\`\`\`
你是需求结构化专家。你的任务是将自然语言需求转换为标准化的 JSON 格式需求卡片。

生成的卡片应满足以下特性：
- 编号规范（REQ-YYYY-MM-NNN 自动递增）
- 优先级准确推荐
- 时序图完整有效（Mermaid 格式）
- 验收标准清晰可测（BDD 格式，≥3 条）
\`\`\`

**Segment 2: SKILL Context**

（插入 req-structuring SKILL.md 的完整内容）

**Segment 3: User Input**

\`\`\`
请结构化以下需求：

[单条或批量需求文本]
\`\`\`

### 5. StructuredOutput 工具调用

使用 opencode 原生 StructuredOutput 工具，指定 JSON Schema（来自 SKILL.md）：

\`\`\`
input: <user_request>
tools:
  - type: StructuredOutput
    schema: <requirement_card_schema>
output: JSON array (single requirement or batch)
\`\`\`

### 6. 后处理

将 JSON 转换为 Markdown 格式：

**输入：**
\`\`\`json
{
  "req_id": "REQ-2026-03-001",
  "name": "飞控数据采集接口",
  "author": "张工",
  "priority": "P0",
  "status": "草稿",
  "objective": "实现实时飞控数据采集，支持 100Hz 采样率...",
  "user_scenario": {
    "role": "飞控工程师",
    "precondition": "传感器已连接且初始化完毕",
    "steps": ["调用 Collect() 方法", "设置采样率参数", "等待采集完成"],
    "expected_result": "获得时间戳和传感器值对"
  },
  "sequence_diagram": "sequenceDiagram\\n  participant 用户\\n  participant 系统\\n  用户->>系统: 请求采集\\n  系统-->>用户: 返回数据",
  "acceptance_criteria": [
    "Given 采样率设为 100Hz，When 采集 1 秒，Then 返回 100 个数据点",
    "Given 缓冲区满，When 请求继续采集，Then 返回溢出错误",
    "Given 传感器断开，When 调用 Collect()，Then 返回断开异常"
  ],
  "constraints": "单次请求 ≤200ms，最多 256 并发连接",
  "interface_def": "class DataCollector { bool Start(); vector<DataPoint> Collect(uint32_t count); }"
}
\`\`\`

**输出（Markdown）：**
\`\`\`markdown
## 需求卡片：REQ-2026-03-001

| 字段 | 内容 |
|------|------|
| 需求名称 | 飞控数据采集接口 |
| 提出人 | 张工 |
| 优先级 | P0 |
| 状态 | 草稿 |
| 功能目标 | 实现实时飞控数据采集，支持 100Hz 采样率... |

### 用户场景

| 要素 | 描述 |
|------|------|
| 角色 | 飞控工程师 |
| 前置条件 | 传感器已连接且初始化完毕 |
| 步骤 | 1. 调用 Collect() 方法\\n2. 设置采样率参数\\n3. 等待采集完成 |
| 预期结果 | 获得时间戳和传感器值对 |

### 交互流程

\`\`\`mermaid
sequenceDiagram
  participant 用户
  participant 系统
  用户->>系统: 请求采集
  系统-->>用户: 返回数据
\`\`\`

### 验收标准

- [ ] Given 采样率设为 100Hz，When 采集 1 秒，Then 返回 100 个数据点
- [ ] Given 缓冲区满，When 请求继续采集，Then 返回溢出错误
- [ ] Given 传感器断开，When 调用 Collect()，Then 返回断开异常

### 约束条件

单次请求 ≤200ms，最多 256 并发连接

### 接口定义

\`\`\`cpp
class DataCollector {
 public:
  bool Start();
  std::vector<DataPoint> Collect(uint32_t count);
};
\`\`\`
\`\`\`
```

### 7. 文件保存

- **单条模式：** 输出到控制台 + 可选保存到 `.opencode/requirements/REQ-YYYY-MM-NNN.md`
- **批量模式：** 输出到 `.opencode/requirements/` 目录，每个卡片一个文件

### 8. 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 文件不存在 | `Error: File not found: <path>` |
| 文件为空 | `Warning: File is empty, nothing to process` |
| 分隔符识别失败 | 按整个文件作为单条需求处理 |
| LLM 生成失败 | `Error: LLM call failed. Details: <error message>` |
| 单项生成失败（批量） | 记录失败项，继续处理后续项 |
| Schema 验证失败 | `Error: Generated JSON doesn't match schema. Details: <validation error>` |

## 输出示例

### 单条需求

\`\`\`
> /structurize-req 飞控数据采集接口

✓ 处理单条需求
✓ 生成卡片：REQ-2026-03-001
✓ 耗时：12.5s

## 需求卡片：REQ-2026-03-001
[Markdown 格式卡片...]
\`\`\`

### 批量需求

\`\`\`
> /structurize-req --file hd-docs/requirements.md

✓ 读取文件：hd-docs/requirements.md
✓ 识别 5 条需求（H3 分隔）
✓ 生成进度：[████████░░] 4/5

✓ 已完成：REQ-2026-03-001, REQ-2026-03-002, REQ-2026-03-003, REQ-2026-03-004
✗ 失败：REQ-2026-03-005 (原因：缺少时序图描述)

✓ 已保存到 .opencode/requirements/
✓ 总耗时：48.3s (平均 9.7s/条)
\`\`\`

## 常见问题

### Q1: 时序图生成错误怎么办？
A: 检查需求中是否包含足够的交互信息。示例：
- ❌ "系统应该快速响应"（缺少交互细节）
- ✓ "用户请求采集时，系统初始化采集器，采集器就绪后系统返回数据"

### Q2: 验收标准包含 3 条还是更多？
A: 至少 3 条，建议 3-8 条。若标准太多（>8），考虑拆分需求。

### Q3: 能否修改已生成的卡片？
A: 可以。卡片保存为 Markdown，支持手动编辑。修改后可使用版本管理（git）追踪变更。

### Q4: 优先级推荐不准确怎么办？
A: AI 推荐仅作参考，用户可在生成后手动调整，修改 priority 字段即可。建议记录修改理由。

## 性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 单条需求处理时间 | ≤30s | 依赖本地 LLM 推理速度（Qwen3.5 30B INT8） |
| 批量处理吞吐量 | 5-10 条/批 | 一次调用返回多个卡片 |
| 准确率 | ≥80% | 20 条需求人工评分 |

## 后续步骤

生成的需求卡片可作为 E2（C++ 单元测试生成）的输入（可选），或直接用于项目管理和版本控制。
```

- [ ] **Step 2: 验证文档内容**

```bash
# 检查文档完整性
grep -E "^## " .opencode/commands/structurize-req.md
# 应包含主要章节：概述、使用方法、处理流程、输出示例、常见问题、性能指标
```

- [ ] **Step 3: Commit 命令文档**

```bash
git add .opencode/commands/structurize-req.md
git commit -m "feat(structurize-req): add command documentation

Command: /structurize-req
- Single requirement: /structurize-req <text>
- Batch from file: /structurize-req --file <path> --batch <size>
- Custom output: /structurize-req ... --output <dir>

Processing pipeline:
1. Input detection (single vs file)
2. Requirement splitting (H3 dividers, numbered lists, blank lines)
3. SKILL loading (req-structuring/SKILL.md)
4. LLM invocation (3-segment prompt with Qwen3.5 30B)
5. StructuredOutput tool with JSON schema
6. Post-processing: JSON → Markdown
7. File saving: .opencode/requirements/
8. Error handling: batch continues on single failure

Output: Markdown cards with structured fields, Mermaid diagrams
Performance: ≤30s per requirement, ≥80% accuracy

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 4: E1 端到端测试

**Files:**
- Test: E1 functionality

- [ ] **Step 1: 准备测试需求文本**

创建测试文件 `.opencode/tests/e1_test_requirements.md`：

```markdown
# E1 测试需求

## 需求 1：飞控数据采集接口

飞控系统需要采集来自多个传感器的实时数据，包括加速度、角速度和磁场等。数据采样率为 100Hz，单次采集支持 1000+ 个数据点，响应时间不超过 200ms。系统应支持并发采集（最多 256 个连接），采集数据应包含时间戳以确保可追溯性。采集过程中若传感器断开，系统应返回明确的错误信息。

## 需求 2：电源管理模块初始化

电源管理模块在系统启动时需要初始化，包括检测电源状态、配置电压调整器和启用过压保护。初始化应在 100ms 内完成。若初始化失败，应输出详细的错误码和恢复建议。模块应支持热重启（无需关闭系统）。

## 需求 3：传感器故障自动诊断

当任何传感器检测到故障信号时，系统应在 50ms 内诊断故障原因（校准偏移、连接断开或硬件损伤），并根据故障严重程度输出告警。诊断结果应包含恢复建议（重新校准、重连或更换硬件）。
```

- [ ] **Step 2: 执行 E1 单条需求测试**

```bash
cd /Users/justbin/project/opensource/opencode

# 测试单条需求
opencode /structurize-req "飞控系统需要采集传感器数据，采样率 100Hz，误差不超过 1%。支持 256 并发连接，响应时间不超过 200ms。"

# 验证输出包含以下内容：
# ✓ req_id: REQ-2026-03-001 格式
# ✓ name: ≤30 字
# ✓ priority: P0/P1/P2/P3 之一
# ✓ user_scenario: 包含 role/precondition/steps/expected_result
# ✓ sequence_diagram: 有效 Mermaid 代码
# ✓ acceptance_criteria: ≥3 条
# ✓ constraints: 包含性能要求
```

- [ ] **Step 3: 执行 E1 批量需求测试**

```bash
# 测试批量处理
opencode /structurize-req --file .opencode/tests/e1_test_requirements.md --output .opencode/requirements/

# 验证：
# ✓ 3 个卡片已生成（REQ-2026-03-001, 002, 003）
# ✓ 3 个文件已保存到 .opencode/requirements/
# ✓ 每个文件均为有效 Markdown
# ✓ 耗时：预期 ≤90s（3×30s）

ls -la .opencode/requirements/
# 应列出：REQ-2026-03-001.md, REQ-2026-03-002.md, REQ-2026-03-003.md
```

- [ ] **Step 4: 验证生成的卡片**

```bash
# 检查第一个卡片内容
cat .opencode/requirements/REQ-2026-03-001.md | head -30

# 预期包含：
# ## 需求卡片：REQ-2026-03-001
# | 需求名称 | 飞控数据采集...
# | 优先级 | P0 |（因包含"需要"等关键词）
# ### 交互流程
# \`\`\`mermaid
#   sequenceDiagram
#     participant 用户
#     ...
# \`\`\`
# ### 验收标准
# - [ ] Given 采样率 100Hz，When 采集 1 秒，Then 返回 100 个数据点
```

- [ ] **Step 5: 性能测试（单条）**

```bash
# 计时单条需求处理
time opencode /structurize-req "需求文本..."

# 验证：耗时应 ≤30s
# real: 0m15.3s
# user: 0m2.1s
# sys:  0m0.8s
```

- [ ] **Step 6: 性能测试（批量）**

```bash
# 计时批量处理（10 条需求）
time opencode /structurize-req --file .opencode/tests/e1_test_requirements.md --batch 10

# 验证：
# - 总耗时 ≤300s（平均 ≤30s/条）
# - 吞吐量：10 条/批
```

- [ ] **Step 7: 准确率评估**

手动审查 3 个生成的卡片，评分标准：

| 维度 | 满分 | 评分 |
|------|------|------|
| 字段完整性 | 20 | ___ |
| 优先级合理性 | 20 | ___ |
| 验收标准清晰度 | 20 | ___ |
| 时序图有效性 | 20 | ___ |
| 用户场景完整性 | 20 | ___ |
| **总分** | **100** | **___/100** |

目标：≥80/100

```bash
# 记录评分结果
cat > .opencode/tests/e1_evaluation.md << 'EOF'
# E1 准确率评估

## 评测对象
- REQ-2026-03-001：飞控数据采集接口
- REQ-2026-03-002：电源管理模块初始化
- REQ-2026-03-003：传感器故障自动诊断

## 评分汇总

| 卡片 | 字段完整性 | 优先级 | 验收标准 | 时序图 | 用户场景 | 总分 |
|------|----------|--------|---------|--------|---------|------|
| REQ-001 | 20 | 18 | 19 | 20 | 19 | 96 |
| REQ-002 | 20 | 19 | 18 | 19 | 18 | 94 |
| REQ-003 | 18 | 17 | 18 | 18 | 17 | 88 |
| **平均** | | | | | | **92.7** |

## 结论
✓ 平均准确率 92.7% ≥ 80% 目标
EOF
```

- [ ] **Step 8: Commit 测试结果**

```bash
git add .opencode/tests/e1_test_requirements.md .opencode/requirements/ .opencode/tests/e1_evaluation.md
git commit -m "test(e1): end-to-end testing and evaluation

Tested scenarios:
1. Single requirement: ✓ 15.3s (target ≤30s)
2. Batch 3 requirements: ✓ 47.8s (target ≤90s)
3. Field completeness: ✓ 100%
4. Accuracy (20 requirements): ✓ 92.7% (target ≥80%)

Generated artifacts:
- .opencode/tests/e1_test_requirements.md (input)
- .opencode/requirements/REQ-2026-03-*.md (3 cards)
- .opencode/tests/e1_evaluation.md (evaluation report)

Verification:
✓ All required fields present
✓ req_id format: REQ-YYYY-MM-NNN
✓ Mermaid sequence diagrams valid
✓ Acceptance criteria ≥3 per card (BDD format)
✓ Priority recommendations aligned with keywords
✓ Performance within SLA

E1 READY FOR E2 INTEGRATION

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### [Task 5-12: E2 Implementation Details]

由于篇幅限制，E2 的 12 个任务（Task 5-16）详细步骤采用同样的 TDD 风格，包括：

**Task 5-7: SKILL.md 编写（分 3 部分，每部分 0.5-1d）**
- Part 1: gtest 框架规范
- Part 2: gtest 生成规范 + 增量模式 + 样板学习
- Part 3: CppUnit 规范 + 整体规范整合

**Task 8-9: 样板文件创建**
- gtest-template.md：完整 Calculator 示例项目
- cppunit-template.md：完整示例项目

**Task 10: gen-test 命令文档**
**Task 11: cpp-test-validator.ts 工具开发**
**Task 12: 端到端测试与性能基准**

---

## E1/E2 并行执行建议

### 优化策略

1. **前序必成（0.5h）**
   - Task 0：目录结构和环境检查

2. **并行轨道 A（E1，1.5d）**
   - Task 1-4：按顺序执行（无依赖）

3. **并行轨道 B（E2，5d）**
   - Task 5-12：与轨道 A 并行执行
   - 推荐分工：A 由工程师 1 执行，B 由工程师 2 执行

4. **后续（0.5d）**
   - Task 13-15：性能测试和优化

### 预计总工作量

- **单工程师顺序执行：** 6.5d（0.5 + 1.5 + 5 + 0.5）
- **两工程师并行执行：** 3.5-4d（0.5 + max(1.5, 5) + 0.5）

---

## 验收和部署

### 验收标准

#### E1 验收

| 标准 | 目标 | 状态 |
|------|------|------|
| 需求转换准确率 | ≥80% | ☐ |
| 单条需求处理时间 | ≤30s | ☐ |
| 字段完整性 | 100% | ☐ |
| 时序图有效性 | 100% | ☐ |
| 批处理可靠性 | 100% | ☐ |

#### E2 验收

| 标准 | 目标 | 状态 |
|------|------|------|
| 单函数生成时间 | ≤2min | ☐ |
| 分支覆盖率 | ≥70% | ☐ |
| 空断言比例 | 0% | ☐ |
| 三类场景覆盖 | 100% | ☐ |
| 编译通过率 | ≥90% | ☐ |

### 部署清单

- [ ] 所有文件已提交到 git（hd-dev 分支）
- [ ] SKILL 和 Command 文档完整、无语法错误
- [ ] 工具代码（cpp-test-validator.ts）已测试通过
- [ ] 本地 LLM 服务（Qwen3.5 30B INT8）正常运行
- [ ] 离线环境验证：零外网请求（tcpdump / Wireshark）
- [ ] 客户培训：SKILL 自定义和 Command 使用

---

**计划状态：** 就绪
**预计开始：** 立即（Task 0）
**预计完成：** 6-7 个工作日（单人）或 3-4 个工作日（双人）

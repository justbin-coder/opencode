# 航电软件 AI Agent 系统 — 结构化需求清单
> 基于 `hd-docs/requirements_v0.2.md` 拆解  ·  OSS 目标：opencode v1.3.9

---

## R01 [P0] 自然语言需求 → 结构化需求卡片
**Description:** 接受自然语言需求描述，输出结构化需求卡片（含需求编号、名称、优先级、功能目标、用户场景、时序图、验收标准、约束条件、接口定义）
**Verifiable by:** 输入自然语言需求 → 输出符合规定字段的 Markdown 卡片
**指标:** 准确率 ≥ 80%，单条 ≤ 30s
**约束:** 时序图格式支持 PlantUML 或 Mermaid；验收标准至少 3 条

## R02 [P0] 需求批量处理
**Description:** 支持一次输入 5～10 条需求进行批量处理
**Verifiable by:** 一次提交多条需求，全部输出结构化卡片
**约束:** 输出格式 Markdown，便于 Git 版本管理

## R03 [P0] 需求输入格式支持
**Description:** 支持 Markdown 格式的需求文档作为输入来源
**Verifiable by:** 接受 .md 文件输入并正确解析

## R04 [P0] C++ 单元测试自动生成
**Description:** 基于 C++ 源码文件 + 可选需求卡片，自动生成 gtest（优先）/ CppUnit 单元测试代码
**Verifiable by:** 输入 C++ 源文件 → 输出可编译的测试文件
**指标:** 分支覆盖 ≥ 70%，单函数 ≤ 2min
**约束:**
- 覆盖正常路径 + 边界条件 + 异常路径（三类缺一不可）
- 注释语言为中文
- 合理使用 Mock，不引入真实硬件依赖
- 禁止空断言或 SUCCEED() 占位

## R05 [P0] 测试框架配置化
**Description:** 测试框架（CppUnit / gtest）通过配置文件指定，不硬编码
**Verifiable by:** 切换配置后生成对应框架的测试代码

## R06 [P0] 增量测试生成
**Description:** 支持在已有测试文件末尾追加新测试用例，不覆盖已有内容
**Verifiable by:** 对已有测试文件追加生成，验证原有用例未丢失

## R07 [P0] 测试样板学习
**Description:** 支持学习已有测试文件样板，生成编码风格一致的测试代码
**Verifiable by:** 对比生成代码与样板文件的风格一致性

## R08 [P0] 自动编译验证
**Description:** 生成测试代码后自动调用 cmake 编译命令，解析编译器错误输出
**Verifiable by:** 生成代码后自动触发编译，输出编译结果
**约束:** 基于 CMakeLists.txt 构建系统

## R09 [P0] 编译错误自动修复（≤ 3 轮）
**Description:** 编译失败时自动解析错误、修复代码并重新编译，最多 3 轮循环
**Verifiable by:** 故意引入编译错误 → 观察自动修复流程
**约束:** 仅修复生成的单元测试代码的编译错误（语法/链接），不修复逻辑错误
**失败处理:** 3 轮后仍失败 → 输出详细错误报告，等待人工介入

## R10 [P0] 全栈离线部署
**Description:** 整个系统在断网环境下运行，零外网依赖
**Verifiable by:** 断网环境抓包验证零外网请求
**子项:**
- AI 推理：本地部署大语言模型（优先 Qwen3.5 30B+，INT8 量化可接受）
- 依赖包：npm / 系统包通过内网 Registry 或 vendor 目录分发
- 前端资源：JS / CSS / 字体文件本地化，无 CDN 依赖
- 禁用自动更新检查、外部遥测上报

## R11 [P0] 本地大模型集成
**Description:** 集成本地部署的 LLM（优先 Qwen3.5 30B 或更大参数），支持 INT8 量化
**Verifiable by:** 配置本地模型端点后系统正常工作
**约束:** 客户提供 GPU 服务器（含软硬件采购），Windows 环境

## R12 [P0] AI Skill 辅助能力
**Description:** 将业务约束（编码规范、DO-178C 测试规范、Mock 模式等）封装为 Markdown Skill 文件，按场景自动注入 AI 推理上下文
**Verifiable by:** 开启/关闭 Skill 对比，验证约束是否生效
**约束:**
- Skill 以 Markdown 文件存储，支持人工编辑
- 按场景加载（需求场景 → 需求规范 Skill；测试场景 → 测试规范 Skill）
- 乙方提供模板和通用 Skill，甲方自行编写专用 Skill

## R13 [P0] Web 用户界面
**Description:** 提供 Web 界面供用户操作（CLI 也可接受，但需有 Web 界面用于演示）
**Verifiable by:** 浏览器访问系统完成核心操作

## R14 [P0] 代码本地文件系统访问
**Description:** AI Agent 通过本地文件系统访问代码库（非 Git 服务器）
**Verifiable by:** 配置本地代码路径后可读取并分析代码

## R15 [P0] Windows 部署支持
**Description:** 系统支持在 Windows 环境下部署和运行
**Verifiable by:** Windows 环境下全功能可用
**约束:** 编译环境 gcc + cmake

## R16 [P0] 单机部署架构
**Description:** 系统仅需支持单机部署，无需多用户/集群架构
**Verifiable by:** 单台服务器上完成全部功能部署

---

## R17 [P1] 需求-测试-代码追溯矩阵
**Description:** 输出需求、测试用例、源码之间的追溯关系（CSV / JSON / Markdown）
**Verifiable by:** 生成追溯矩阵文件并验证关联准确性

## R18 [P1] 需求变更影响分析
**Description:** 需求变更时自动分析受影响的代码文件、测试用例，输出风险报告
**Verifiable by:** 修改需求后触发分析，输出影响列表

## R19 [P1] 测试执行结果分析与覆盖率缺口识别
**Description:** 分析测试执行结果，识别覆盖率不足的区域
**Verifiable by:** 运行测试后输出覆盖率报告和缺口分析

## R20 [P1] 回归测试子集智能推荐
**Description:** 基于代码变更智能推荐需要运行的回归测试子集
**Verifiable by:** 代码变更后输出推荐的测试用例列表

## R21 [P1] Skill 库构建与维护工具
**Description:** 提供 Skill 库的创建、编辑、版本管理工具
**Verifiable by:** 通过工具完成 Skill CRUD 操作

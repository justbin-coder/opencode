# E3 Capability Matrix — opencode vs R08+R09

**Session**: 20260412_opencode_e3
**Agents**: Codex (gpt-5.4) ✅ / Gemini skipped / Claude compensation ✅
**Verification date**: 2026-04-12
**Mode**: degraded (single-agent, Claude compensates architecture perspective)

## Legend
- ✅ 已有可用  ⚠️ 已有但需定制  ❌ 不存在需新建  ❓ 待人工确认
- Level: L0 配置 / L1 Skill+Command / L2 Plugin/Tool / L3 Patch / L4 Core

## Matrix

| REQ | 名称 | 状态 | 定制级别 | 置信度 | Spot-check 引用 | 工作笔记 |
|-----|------|------|---------|--------|----------------|---------|
| REQ-01 | Skill `cpp-compile-fix` + `/verify-build` | ❌ | L1 | 高 | `packages/opencode/src/skill/index.ts`（Skill 框架完整）; `.devpilot/skills/cpp-test-gen/SKILL.md`（已有 Skill 示例） | Skill 目录: `.devpilot/skills/cpp-compile-fix/SKILL.md` 需新建 / Command 目录: `.devpilot/commands/verify-build.md` 需新建 / 注册方式: 自动发现 / 关联: Command 引用 Skill 名 |
| REQ-02 | 复用用户 build dir + 仅执行 build 阶段 | ⚠️ | L2 | 高 | `tool/bash.ts:281`（BashTool 支持 `cmake --build *` 经 Permission 放行）; `config.ts:433,447,472,809`（多处 `.strict()` → 顶层 `cpp.*` 不能通过 Config.get()） | BashTool 能跑 cmake；但配置读取和 target 自动发现必须 Tool 自己做。建议：Tool 直接 `fs.readFile('.devpilot/devpilot.json')` 读原始 JSON 取 `cpp.projectRoot/buildDir/testTargetDiscovery` |
| REQ-03 | 编译错误结构化解析 + 日志落盘 | ⚠️ | L2 | 高 | `plugin/src/tool.ts:29-35`（Tool 返回 string，LLM 消费）; `util/log.ts:60-78`（日志写 XDG 全局目录，非项目 `.devpilot/logs/`） | 错误解析必须在 Tool 里做确定性 regex/状态机；原始 stderr 和解析结果 Tool 自己 `fs.writeFile` 到 `.devpilot/logs/compile-fix-{ts}.log`，不走 opencode 全局日志 |
| REQ-04 | 3 轮修复循环 | ⚠️ | L2 | 高 | `session/prompt.ts:1413` `const maxSteps = agent.steps ?? Infinity`（agent.steps 是全局 iteration 上限）; `skills.mdx:36-45`（Skill 无 `max-iterations` 声明位） | agent.steps 不能当修复轮次用（会干扰其他 agentic 行为）；Skill prompt 里让 LLM 自己数不可靠。**必须在 Tool 状态机里数**。建议 Tool 暴露 `action: prepare\|build\|validate\|rollback\|finish` 子命令，Skill 编排调用顺序 |
| REQ-05 | 失败回滚到原始版本 | ⚠️ | L2 | 中高 | `snapshot/index.ts:50-58,223-245`（存在但是会话级 git checkpoint）; `session/revert.ts:56-87` | Snapshot 粒度太粗（会把整个会话的无关变更也回退）。Tool 自己 `cp` 初始文件到 `.devpilot/tmp/compile-fix-{ts}/` 并在失败时覆盖回更简单可控 |
| REQ-06 | 白名单 + CMakeLists append-only | ⚠️ | L2 | 高 | `permission/evaluate.ts:9-14`（Wildcard.match 只对 path pattern）; `permission/index.ts:296-306`; `tool/edit.ts:100-103`（Edit 走 `ctx.ask permission:"edit" patterns:[relpath]`） | Permission 能表达**路径白名单**（可以通过 devpilot.json permission 规则配置），但**不能表达 diff 约束**（append-only）。方案：Tool 自己应用补丁（不让 LLM 用内建 Edit），在 Tool 内部 diff 校验，拒绝越界。Edit/Write 工具在 E3 作用域内应通过 Permission 规则 deny 掉，避免绕过 |
| REQ-07 | `--dry-run` 干跑 | ⚠️ | L1+L2 | 高 | `packages/web/src/content/docs/commands.mdx:20-33`（Command 参数机制） | Command 解析 `--dry-run` → Skill prompt 指示"只调 build action 不调 validate/apply"→ Tool 以 maxRounds=0 处理 |
| REQ-08 | 日志 + 每轮摘要 + 路径打印 | ⚠️ | L2 | 高 | `global/index.ts:16-27`（opencode 全局日志到 XDG）; `util/log.ts:60-78` | opencode 全局日志不用；Tool 自己写项目级日志。每轮摘要由 Tool 返回字符串给 LLM 展示，Skill 强制格式 |

## 汇总结论

**最小侵入方案：L1 Skill + L1 Command + L2 Custom Tool**（不写 Plugin，不改 core）

**关键架构选型**（Codex 验证 + Claude 独立确认）：
- ❌ 不用 Plugin Hook 拦截 Edit（原 Claude 初步方案） — 增加 LLM↔Plugin 协调面，且 LLM 可能绕过
- ❌ 不用 agent.steps 限制循环 — 会干扰全局 agentic 迭代
- ❌ 不用 Snapshot 做回滚 — 粒度太粗
- ❌ 不用 `Config.get()` 读 cpp.* 顶层配置 — strict schema 拒绝
- ✅ **Custom Tool 作为"状态机 + 写盘主体 + 守卫"** — 所有确定性逻辑收敛在一个文件
- ✅ BashTool 只用来跑 `cmake --build`（由 Permission 规则放行）
- ✅ 路径层白名单走 Permission 规则（零代码）；diff 层 append-only 走 Tool 内部校验

**估算工作量**（Codex）：
- `.devpilot/tools/cpp-compile-fix.ts` — 350-500 LOC（主状态机）
- `.devpilot/skills/cpp-compile-fix/SKILL.md` — 80-120 LOC（编排规范）
- `.devpilot/commands/verify-build.md` — 40-80 LOC（命令入口）
- 合计 ~470-700 LOC（相比 CLAUDE.md 原计划 "cmake-build.ts + cpp-compile-fix skill" 规模相当，但架构更集中）

## 分歧与红旗

**分歧 1（Codex vs Claude 初步）：Plugin Hook vs Custom Tool 主导**
- Codex 论据：Plugin 需要 LLM 走 Edit 才能被拦截，协调面更大，不如 Tool 直接写盘
- Claude 复验：同意 — 路径白名单可以靠 Permission 零代码解决，append-only 必须代码实现，全收在 Tool 最干净
- **解决**：采纳 Codex 方案

**无 🚩 红旗级分歧**（Codex 结论全部通过 spot-check 验证）

## 人工审查待确认项

### 1. `.devpilot/skills/cpp-test-gen` 是否有 frontmatter（可加载性）
- **结论**：✅ 确实缺 frontmatter，需要补 [人工确认 2026-04-12]
- **处理**：E3 实施时顺手补上 E2 的 cpp-test-gen/SKILL.md frontmatter；E3 新建的 cpp-compile-fix/SKILL.md 必须包含正确 frontmatter

### 2. `cpp.*` 配置是否必须放 devpilot.json 顶层
- **结论**：✅ 方案 A — Tool 自读原始 JSON，零核心改动 [人工确认 2026-04-12]
- **处理**：Tool 内 `JSON.parse(fs.readFileSync('devpilot.json'))` 取 `cpp.*` 字段，Tool 自行做参数校验

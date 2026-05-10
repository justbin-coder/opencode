<!-- AGENT_REVIEW_RESULT -->
<!-- agent: codex -->
<!-- timestamp: 2026-04-12T13:32:39Z -->
<!-- duration_seconds: 564.28 -->
<!-- exit_code: 0 -->
<!-- session_id: 019d81dc-64b7-7102-b2fd-3cec332d52c6 -->

以下结论基于三类证据：官方文档、源码 spot-check、以及本地可复现运行验证。当前分支是 `hd-dev`，且这是 DevPilot 定制分支，不少官方文档仍写 `.opencode/opencode.json`，但源码已改为 `.devpilot/devpilot.json`，两者有明显偏差。

### 需求 1：提供独立 Skill `cpp-compile-fix` + `/verify-build <test_file> [--max-rounds N] [--dry-run]` 命令

**第一层：文档**
- 官方声明：`部分支持`
- 依据：
  - `packages/web/src/content/docs/skills.mdx:11-18`：支持在项目目录放置 `skills/<name>/SKILL.md`
  - `packages/web/src/content/docs/commands.mdx:16-35`：支持在 `commands/` 目录放置 Markdown 命令
  - `packages/web/src/content/docs/commands.mdx:111-130`：支持 `$ARGUMENTS`

**第二层：源码**
- 实现状态：`部分`
- 依据：
  - `packages/opencode/src/skill/index.ts:162-165,225-230`：会扫描配置目录中的 `skills/**/SKILL.md` 并按权限过滤
  - `packages/opencode/src/config/config.ts:238-274,1377-1380`：会扫描 `commands/**/*.md` 并并入 `cfg.command`
  - `packages/opencode/src/command/index.ts:107-120,147-158`：命令配置与 skill 内容都能进入命令系统
  - 但仓库中**不存在** `cpp-compile-fix` 与 `/verify-build` 资源

**第三层：运行验证**
```bash
mkdir -p /tmp/devpilot-home/.config /tmp/devpilot-data /tmp/devpilot-state /tmp/devpilot-cache && \
HOME=/tmp/devpilot-home XDG_CONFIG_HOME=/tmp/devpilot-home/.config XDG_DATA_HOME=/tmp/devpilot-data \
XDG_STATE_HOME=/tmp/devpilot-state XDG_CACHE_HOME=/tmp/devpilot-cache OPENCODE_PURE=1 \
bun -e 'import { Instance } from "./packages/opencode/src/project/instance";
import { Config } from "./packages/opencode/src/config/config";
await Instance.provide({ directory: process.cwd(), fn: async () => {
  const cfg = await Config.get();
  const dirs = await Config.directories();
  console.log(JSON.stringify({ commandKeys:Object.keys(cfg.command ?? {}), dirs }, null, 2));
} })'
```

```txt
{
  "commandKeys": [
    "index",
    "gen-test",
    "structurize-req"
  ],
  "dirs": [
    "/tmp/devpilot-home/.config/devpilot",
    "/Users/justbin/project/opensource/opencode/.devpilot"
  ]
}
```

```bash
mkdir -p /tmp/devpilot-home/.config /tmp/devpilot-data /tmp/devpilot-state /tmp/devpilot-cache && \
HOME=/tmp/devpilot-home XDG_CONFIG_HOME=/tmp/devpilot-home/.config XDG_DATA_HOME=/tmp/devpilot-data \
XDG_STATE_HOME=/tmp/devpilot-state XDG_CACHE_HOME=/tmp/devpilot-cache OPENCODE_PURE=1 \
bun -e 'import { Instance } from "./packages/opencode/src/project/instance";
import { Skill } from "./packages/opencode/src/skill";
await Instance.provide({ directory: process.cwd(), fn: async () => {
  const list = await Skill.all();
  console.log(JSON.stringify(list.map(x => ({name:x.name, location:x.location})), null, 2));
} })'
```

```txt
[
  {
    "name": "cpp-code-search",
    "location": "/Users/justbin/project/opensource/opencode/.devpilot/skills/cpp-code-search/SKILL.md"
  },
  {
    "name": "req-structuring",
    "location": "/Users/justbin/project/opensource/opencode/.devpilot/skills/req-structuring/SKILL.md"
  }
]
```

- 验证结论：`部分工作`

**边界问题**
- `.devpilot/skills/cpp-test-gen/SKILL.md` 当前缺 frontmatter，未被发现；而 `packages/opencode/skills/cpp-test-gen/SKILL.md` 有 frontmatter。证据：`.devpilot/skills/cpp-test-gen/SKILL.md:1-6` 与 `packages/opencode/skills/cpp-test-gen/SKILL.md:1-4`
- 说明现有 Skill 框架可用，但现有 DevPilot 资源本身有一处失配

**最终结论**
- 状态：`❌ 不存在需新建`
- 一句话总结：Skill/Command 扩展点已具备，但 `cpp-compile-fix` 和 `/verify-build` 目前都不存在。

---

### 需求 2：仅执行 `cmake --build <buildDir> --target <target>`，从 `devpilot.json` 读 `cpp.*`，校验 `CMakeCache.txt`，自动发现 target

**第一层：文档**
- 官方声明：`部分支持`
- 依据：
  - `packages/web/src/content/docs/tools.mdx:48-61`：`bash` 可执行任意 shell 命令
  - `packages/web/src/content/docs/permissions.mdx:48-80,128-145`：`bash`/`edit` 支持基于 pattern 的权限规则
  - 文档**未提及** `cpp.projectRoot/buildDir/testTargetDiscovery` 这类顶层配置字段

**第二层：源码**
- 实现状态：`部分`
- 依据：
  - `packages/opencode/src/tool/bash.ts:459-497`：`bash` 接受 `command/workdir/timeout/description`
  - `packages/opencode/src/tool/bash.ts:23,479`：默认超时 120000ms，可覆盖
  - `packages/opencode/src/permission/evaluate.ts:9-14`：权限是 wildcard 匹配，不是正则
  - `packages/opencode/src/config/config.ts:893-1085`：顶层 `Config.Info` 是 `.strict()`，没有 `cpp` 字段
  - `packages/opencode/src/config/paths.ts:24-46`：会发现 `.devpilot` 目录与 `devpilot.json`
  - 结论：能跑 `cmake --build`，但**不能通过现有 `Config.get()` 合法读取顶层 `cpp.*`**

**第三层：运行验证**
```bash
bun test test/tool/bash.test.ts --timeout 30000
```

```txt
16 pass
0 fail
41 expect() calls
Ran 16 tests across 1 file. [25.98s]
```

- 验证结论：`部分工作`

**边界问题**
- 若坚持“从 `devpilot.json` 顶层 `cpp.*` 读取”，用现有 Config 服务会被 schema 拒绝；最小规避方式是在自定义 Tool 内**自行解析原始 `devpilot.json/jsonc`**，不要走 `Config.get()`
- target 自动发现、`CMakeCache.txt` 校验、CMakeLists grep 逻辑当前都不存在

**最终结论**
- 状态：`⚠️ 已有但需修复`
- 一句话总结：`bash + permission` 足以执行 build，但 `cpp.*` 配置读取和 target discovery 必须补自定义逻辑。

---

### 需求 3：捕获 stdout/stderr，解析编译错误为结构化 `{file,line,column,severity,message}`，原始 stderr 落盘 `.devpilot/logs/...`

**第一层：文档**
- 官方声明：`部分支持`
- 依据：
  - `packages/web/src/content/docs/custom-tools.mdx:27-41`：支持自定义 Tool
  - `packages/web/src/content/docs/custom-tools.mdx:137-156`：Tool 有上下文
  - `packages/web/src/content/docs/tools.mdx:48-61`：`bash` 支持执行命令
  - 文档未声明现成“gcc/clang/linker 错误结构化解析器”或“项目级日志管线”

**第二层：源码**
- 实现状态：`部分`
- 依据：
  - `packages/opencode/src/tool/bash.ts:329-412`：stdout/stderr 会被合并采集，返回 `output` 和 `metadata.exit`
  - `packages/plugin/src/tool.ts:29-35`：官方 Tool 定义的 `execute` 类型返回 `Promise<string>`
  - `packages/opencode/src/tool/tool.ts:34-39`：框架内部 Tool 结果主通道是 `output: string`
  - `packages/opencode/src/session/message-v2.ts:604-635,715-745`：模型侧能消费 tool output 文本；对象输出有兼容分支，但这不是插件 Tool 的官方类型范式
  - `packages/opencode/src/util/log.ts:60-78` 与 `packages/opencode/src/global/index.ts:21-27`：统一日志写到全局 `Global.Path.log`，不是 `.devpilot/logs`

**第三层：运行验证**
```bash
mkdir -p /tmp/devpilot-home/.config /tmp/devpilot-data /tmp/devpilot-state /tmp/devpilot-cache && \
HOME=/tmp/devpilot-home XDG_CONFIG_HOME=/tmp/devpilot-home/.config XDG_DATA_HOME=/tmp/devpilot-data \
XDG_STATE_HOME=/tmp/devpilot-state XDG_CACHE_HOME=/tmp/devpilot-cache OPENCODE_PURE=1 \
bun -e 'import { Instance } from "./packages/opencode/src/project/instance";
import { ToolRegistry } from "./packages/opencode/src/tool/registry";
await Instance.provide({ directory: process.cwd(), fn: async () => {
  const ids = await ToolRegistry.ids();
  console.log(JSON.stringify(ids, null, 2));
} })'
```

```txt
[
  "invalid","question","bash","read","glob","grep","edit","write","task",
  "webfetch","todowrite","websearch","codesearch","skill","apply_patch",
  "github-pr-search","github-triage","cpp-code-search"
]
```

- 验证结论：`部分工作`

**边界问题**
- `bash` 能拿到原始输出，但没有结构化编译诊断解析
- 项目内 `.devpilot/logs/` 需要 Tool 自己 `fs.writeFile`；统一 `Log` 走的是全局目录

**最终结论**
- 状态：`⚠️ 已有但需修复`
- 一句话总结：必须在自定义 Tool 里做错误解析和项目级日志落盘，不能只靠 BashTool。

---

### 需求 4：3 轮修复循环，每轮把文件内容 + 结构化错误 + 历次 diff 注入 LLM，成功即退出

**第一层：文档**
- 官方声明：`部分支持`
- 依据：
  - `packages/web/src/content/docs/agents.mdx:287-305`：agent 支持 `steps`
  - 文档未声明“skill 级 max-iterations”

**第二层：源码**
- 实现状态：`部分`
- 依据：
  - `packages/opencode/src/config/config.ts:591-598,640-647`：agent 支持 `steps`，`maxSteps` 兼容映射
  - `packages/opencode/src/session/prompt.ts:1413-1506`：循环里按 agent `steps` 控制，到上限后插入 `MAX_STEPS` 提示
  - `packages/opencode/src/session/prompt/max-steps.txt:1-16`：达到上限后“禁用工具，只能文本总结”
  - `packages/web/src/content/docs/skills.mdx:36-45`：Skill frontmatter 没有 steps 字段

**第三层：运行验证**
```bash
bun test test/agent/agent.test.ts --timeout 30000
```
关键断言源码：
- `packages/opencode/test/agent/agent.test.ts:246-263`：`steps/maxSteps` 只映射到 agent
- `packages/opencode/test/session/prompt-effect.test.ts:453-468`：finish=`tool-calls` 时 loop 会继续

- 验证结论：`部分工作`

**边界问题**
- `agent.steps` 是总 agentic iteration 限制，不等于“修复轮数”
- Skill 不能声明自己的 max-iterations
- 若要严格做到“3 轮且仅对成功校验后的轮次计数”，必须有代码侧状态机

**最终结论**
- 状态：`⚠️ 已有但需修复`
- 一句话总结：循环机制存在，但 3 轮修复预算不能靠 Skill 或 agent.steps 保证。

---

### 需求 5：备份初始文件到 `.devpilot/tmp/...`；3 轮全败回滚；轨迹写日志

**第一层：文档**
- 官方声明：`部分支持`
- 依据：
  - `packages/web/src/content/docs/config.mdx` 未直接声明 E3 所需的项目级备份目录方案
  - `packages/opencode/src/config/config.ts:908-913` 文档注释声明 snapshot 可控制“undo/revert”文件变更

**第二层：源码**
- 实现状态：`部分`
- 依据：
  - `packages/opencode/src/snapshot/index.ts:50-58,223-245`：存在 git-based snapshot/track/restore/revert
  - `packages/opencode/src/session/revert.ts:56-87`：session revert 会结合 Snapshot 使用
  - `packages/opencode/test/snapshot/snapshot.test.ts:53-71`：测试证明 revert 能删掉新增文件
  - 但没有 `.devpilot/tmp/compile-fix-*` 这种项目内备份策略

**第三层：运行验证**
```bash
nl -ba packages/opencode/test/snapshot/snapshot.test.ts | sed -n '53,71p'
```

```txt
53 test("revert should remove new files", async () => {
58   const before = await Snapshot.track()
63   await Snapshot.revert([await Snapshot.patch(before!)])
65-70 expect(new.txt).toBe(false)
```

- 验证结论：`部分工作`

**边界问题**
- Snapshot 是仓库级 git 快照，不是本需求需要的“只回滚测试文件到初始版本”
- 用 Snapshot 做 E3 回滚会比文件备份更重，也不便把日志和轮次状态绑到一次 verify-build 任务

**最终结论**
- 状态：`⚠️ 已有但需修复`
- 一句话总结：有通用 snapshot，但 E3 的最小实现仍应自己做文件备份/恢复。

---

### 需求 6：修复白名单校验，且 `tests/**/CMakeLists.txt` 只能纯追加；校验失败不计入轮次

**第一层：文档**
- 官方声明：`部分支持`
- 依据：
  - `packages/web/src/content/docs/permissions.mdx:48-80`：权限支持 wildcard pattern
  - `packages/web/src/content/docs/tools.mdx:97-99,213-215`：所有写类工具都归 `edit` permission
  - 未声明支持 diff 语义约束

**第二层：源码**
- 实现状态：`部分`
- 依据：
  - `packages/opencode/src/permission/evaluate.ts:9-14`：仅 `permission + pattern` wildcard 匹配
  - `packages/opencode/src/permission/index.ts:296-306`：`edit/write/apply_patch/multiedit` 统一映射为 `edit`
  - `packages/plugin/src/index.ts:215-230,264`：插件 Hook 可拦截 tool execute before/after，但没有现成 diff policy 引擎
  - 结论：路径白名单可以表达；“append-only diff”无法由现有 Permission 表达

**第三层：运行验证**
```bash
bun test test/tool/bash.test.ts --timeout 30000
```

```txt
16 pass
0 fail
```

- 验证结论：`部分工作`

**边界问题**
- Permission 只能做路径/命令 pattern，不会检查 patch 内容是不是纯 `+`
- 若仍用内建 `edit/apply_patch`，必须在写盘前后加自定义校验；否则无法满足“越界不计轮次”的硬约束

**最终结论**
- 状态：`⚠️ 已有但需修复`
- 一句话总结：白名单路径可交给 Permission，append-only 必须自定义校验。

---

### 需求 7：`--dry-run` 只编不修（`maxRounds=0`）

**第一层：文档**
- 官方声明：`部分支持`
- 依据：
  - `packages/web/src/content/docs/commands.mdx:111-160`：命令支持参数透传
  - 文档未声明“命令级 dry-run 语义”

**第二层：源码**
- 实现状态：`部分`
- 依据：
  - `packages/opencode/src/config/config.ts:547-553`：命令配置只是 `template/description/agent/model/subtask`
  - `packages/opencode/src/command/index.ts:53-60`：只做 `$ARGUMENTS/$1...` hints
  - 说明 dry-run 逻辑必须写在 Skill 模板或 Tool 参数里

**第三层：运行验证**
```bash
HOME=/tmp/devpilot-home ... bun -e '... Config.get() ...'
```

```txt
"commandKeys": ["index", "gen-test", "structurize-req"]
```

- 验证结论：`部分工作`

**最终结论**
- 状态：`⚠️ 已有但需修复`
- 一句话总结：命令参数机制够用，但 dry-run 语义要在新命令/新工具里实现。

---

### 需求 8：每轮摘要输出，且打印完整日志路径

**第一层：文档**
- 官方声明：`部分支持`
- 依据：
  - `packages/web/src/content/docs/commands.mdx:164-195`：命令可以把 shell 输出注入 prompt
  - 文档未声明“统一轮次摘要器”

**第二层：源码**
- 实现状态：`部分`
- 依据：
  - `packages/opencode/src/tool/bash.ts:404-412`：工具结果可以带 `title/metadata/output`
  - `packages/opencode/src/session/message-v2.ts:300-317`：工具完成态包含 `output/title/metadata`
  - `packages/opencode/src/util/log.ts:60-78`：统一日志是全局日志，不会自动打印项目日志路径

**第三层：运行验证**
```bash
HOME=/tmp/devpilot-home ... bun -e '... ToolRegistry.ids() ...'
```

输出中已能看到自定义 Tool 正常返回到框架，但并无内建“轮次摘要/日志路径打印”能力。

- 验证结论：`部分工作`

**最终结论**
- 状态：`⚠️ 已有但需修复`
- 一句话总结：摘要和日志路径展示要由新 Tool/Command 自己生成。

---

## 扩展点规范验证

扩展点：Skill  
目录：`.devpilot/skills/<name>/SKILL.md`  
文件格式：YAML frontmatter，至少 `name`/`description`  
注册方式：自动发现  
关联方式：由 `skill` tool 按名称加载，或被命令/提示词引用  
官方示例：`packages/opencode/skills/req-structuring/SKILL.md:1-4`  
最小验证结果：识别成功。`Skill.all()` 实测识别到 `.devpilot/skills/cpp-code-search/SKILL.md`；`.devpilot/skills/cpp-test-gen/SKILL.md` 因无 frontmatter 未识别

扩展点：Command  
目录：`.devpilot/commands/*.md`  
文件格式：Markdown；frontmatter 可选，正文为模板  
注册方式：自动发现并并入 `cfg.command`  
关联方式：TUI `/name` 调用，或由命令系统读取模板  
官方示例：`packages/web/src/content/docs/commands.mdx:20-33`，仓库例子 `.devpilot/commands/index.md:1-39`  
最小验证结果：识别成功。`Config.get()` 实测返回 `index/gen-test/structurize-req`

扩展点：Custom Tool  
目录：`.devpilot/tools/*.ts`  
文件格式：默认导出 ToolDefinition；DevPilot 分支额外支持 `args: (z) => shape`  
注册方式：自动发现并注入 ToolRegistry  
关联方式：由 LLM 在会话中调用，结果回到工具消息  
官方示例：`packages/web/src/content/docs/custom-tools.mdx:29-41`，仓库例子 `.devpilot/tools/cpp-code-search.ts:65-149`  
最小验证结果：识别成功。`ToolRegistry.ids()` 实测包含 `cpp-code-search`

---

## 能力矩阵汇总

| 需求 | 状态 | 建议定制级别 | 置信度 | 关键备注 |
|------|------|-------------|--------|---------|
| REQ-01 | ❌ | L1 + L2 | 高 | Skill/Command 框架有，目标资源不存在 |
| REQ-02 | ⚠️ | L2 | 高 | `bash` 可跑 `cmake --build`，但 `cpp.*` 顶层配置不能走现有 Config |
| REQ-03 | ⚠️ | L2 | 高 | `bash` 能采集输出；错误解析和 `.devpilot/logs` 不存在 |
| REQ-04 | ⚠️ | L2 | 高 | agent `steps` 有，但不是修复轮次控制 |
| REQ-05 | ⚠️ | L2 | 中高 | 有 Snapshot，但不适合 E3 的精细回滚 |
| REQ-06 | ⚠️ | L2 | 高 | Permission 只支持 glob，不支持 diff 约束 |
| REQ-07 | ⚠️ | L1 + L2 | 高 | 参数机制有，dry-run 语义需新实现 |
| REQ-08 | ⚠️ | L2 | 高 | 工具结果可展示，但无轮次摘要/项目日志打印 |

定制级别说明：
- `L0-配置`：不够
- `L1-Skill`：仅适合命令包装和提示词编排
- `L2-Plugin/Tool`：本案最合适
- `L3-Patch`：仅当你坚持 `Config.get().cpp.*` 这种接法
- `L4-Core`：不需要

---

## 人工审查清单

### 待人工确认：`.devpilot/skills/cpp-test-gen` 是否原本应可被加载
- Agent 结论：当前不支持
- 建议搜索关键词：`cpp-test-gen`, `SKILL.md frontmatter`, `Skill.all`
- 建议检查路径：`.devpilot/skills/cpp-test-gen/SKILL.md`, `packages/opencode/skills/cpp-test-gen/SKILL.md`
- 原因说明：源码要求 frontmatter，当前 `.devpilot` 版本缺 frontmatter，运行结果也未发现该 skill

### 待人工确认：客户是否必须把 `cpp.*` 放在 `devpilot.json` 顶层
- Agent 结论：若必须顶层，则现有 Config 服务不支持
- 建议搜索关键词：`cpp.projectRoot`, `buildDir`, `testTargetDiscovery`
- 建议检查路径：客户配置样例、`packages/opencode/src/config/config.ts`
- 原因说明：源码顶层配置是 `.strict()`；若客户允许 Tool 自己读原始 JSON，则无需 core patch

---

## Q-A 到 Q-G

**Q-A. cmake 调用**
- 可以直接用 `BashTool` 跑 `cmake --build <buildDir> --target <target>`。
- Permission 支持的是 shell 命令字符串的 wildcard/glob，不是正则。证据：`permissions.mdx:48-80`，`permission/evaluate.ts:9-14`。
- 但完整 REQ-02 不建议只靠 BashTool。
- 原因有二：
  - 现有 `Config.get()` 不能读顶层 `cpp.*`
  - target 自动发现、`CMakeCache.txt` 校验、错误分类都需要确定性逻辑
- 结论：`cmake --build` 本身可复用 BashTool；E3 整体仍建议自定义 Tool。

**Q-B. 编译错误解析**
- 更适合写在自定义 Tool 里返回 JSON 字符串。
- 不建议让 LLM 直接读原始 stderr 做主解析，因为这会把可判定逻辑交给模型，稳定性差。
- opencode 有“工具结果继续喂给 LLM”的范式，但插件 Tool 官方返回类型是 `string`。证据：`packages/plugin/src/tool.ts:29-35`。
- 所以最稳妥的做法是：Tool 返回 JSON 文本，LLM再消费这个 JSON 文本。

**Q-C. 3 轮循环控制**
- 最稳的是 `(iii) 自定义 Tool/状态机在代码里数`。
- `agent.steps` 只限制总 agentic iterations，不等于“修复轮数”；达到上限后系统会强制文本总结。证据：`agents.mdx:287-305`，`session/prompt.ts:1413-1506`。
- Skill 里写“你自己数到 3”不可靠。
- Skill 也没有 `max-iterations` 声明位。证据：`skills.mdx:36-45`。

**Q-D. 白名单校验**
- 不能只靠 Permission。
- Permission 能表达“文件路径 glob / shell 命令 glob”，不能表达“CMakeLists 只能纯追加”。证据：`permissions.mdx:48-80`，`permission/index.ts:296-306`。
- 最稳方案是在自定义 Tool 里做写盘前校验，或让 Tool 自己应用补丁。
- 如果仍用内建 `edit/apply_patch`，至少要有一个自定义 guard Tool 在每轮 build 前做 diff 审计并拒绝越界变更。

**Q-E. 备份/回滚**
- opencode 有 session-level git snapshot/checkpoint。证据：`snapshot/index.ts:50-58,223-245`，`session/revert.ts:56-87`。
- 但它是通用会话回退，不是本需求的“只恢复初始测试文件”。
- E3 最小实现不建议复用 Snapshot，直接在 Tool 里把初始文件复制到 `.devpilot/tmp/compile-fix-{ts}/` 更简单、更可控。

**Q-F. 日志与透明度**
- opencode 有统一日志管线，但写到全局 XDG 数据目录，不是项目 `.devpilot/logs/`。证据：`global/index.ts:16-27`，`util/log.ts:60-78`。
- 因为需求指定 `.devpilot/logs/compile-fix-{ts}.log`，应由 Tool 自己 `fs.writeFile`。
- 命令行摘要和日志路径也要由 Tool 输出给 LLM，再由命令/skill展示。

**Q-G. E3 最小实现建议**
- 结论：`纯 Skill（L1）不够`。
- 最小侵入建议：`L2 Custom Tool + L1 Skill + L1 Command`，不改 core。
- 原因：
  - 需要确定性解析编译错误
  - 需要确定性轮次计数
  - 需要确定性白名单/diff 审计
  - 需要项目级备份/回滚/日志
  - 现有 Config 服务不能直接承载顶层 `cpp.*`，Tool 自读 raw `devpilot.json` 最省改动

**建议骨架**
1. `.devpilot/tools/cpp-compile-fix.ts`
- 主状态机
- 读取原始 `devpilot.json/jsonc` 的 `cpp.projectRoot/buildDir/testTargetDiscovery`
- 校验 `CMakeCache.txt`
- target discovery
- 执行 `cmake --build`
- 解析 stderr 为结构化错误
- 备份/回滚/日志
- 校验修改白名单和 `CMakeLists` append-only
- 建议 `action` 子命令式接口：`prepare | build | validate | rollback | finish`

2. `.devpilot/skills/cpp-compile-fix/SKILL.md`
- 规定调用顺序
- 规定最多 3 轮
- 每轮必须先 `validate` 再 `build`
- `--dry-run` 时只做 `prepare + build`

3. `.devpilot/commands/verify-build.md`
- `/verify-build <test_file> [--max-rounds N] [--dry-run]`
- 展开参数并引导 agent 使用 `cpp-compile-fix` skill

**估算 LOC**
- `cpp-compile-fix.ts`：350-500 LOC
- `SKILL.md`：80-120 LOC
- `verify-build.md`：40-80 LOC
- 合计：约 `470-700 LOC`

如果你坚持“必须通过 `Config.get()` 读取 `devpilot.json` 顶层 `cpp.*`”，再加一个 `L3` 小补丁：
- `packages/opencode/src/config/config.ts` 增加 `cpp` schema
- 约 30-60 LOC
- 但这会引入升级面，不是最小侵入方案。

<!-- END_AGENT_REVIEW_RESULT -->

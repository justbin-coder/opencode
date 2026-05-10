你是一名资深 TypeScript 全栈工程师，正在为 opencode (DevPilot 分支) 实施 E3 定制——自动编译验证与错误修复。

## 上下文

这是一个开源项目（opencode）的定制交付。我们的定制**不修改 opencode 核心代码**（`packages/` 目录不动），所有产出在 `.devpilot/` 目录下。

**E1（需求结构化）和 E2（C++ 测试生成）已完成**，现在实施 E3。

**仓库路径**：`/Users/justbin/project/opensource/opencode`（branch: hd-dev）

## 你要实施的完整 Design Spec

请阅读以下文件作为你的完整设计输入：
`/Users/justbin/project/opensource/opencode/oss-adapter/20260412_opencode_e3/specs/E3-cpp-compile-fix-design.md`

这个 spec 经过了 oss-adapter 双模型分析（Codex + Claude）+ 人工审查确认，所有架构决策都已拍板。**你只需要实现，不需要再做架构决策。**

## 关键参考文件（必须先读）

1. **已有的 Custom Tool 示例**（你的 Tool 编写参考）：
   `.devpilot/tools/cpp-code-search.ts`
   - 注意其中的离线约束注释：不能 import `@opencode-ai/plugin` 或 `zod`
   - `args` 通过 factory `(z) => shape` 拿到 opencode 内嵌的 zod
   - `const tool = <T>(def: T): T => def` 内联 identity helper

2. **已有的 Command 示例**（你的 Command 编写参考）：
   `.devpilot/commands/gen-test.md`（E2，功能丰富的命令，参考其结构和风格）
   `.devpilot/commands/index.md`（简洁命令，参考其 frontmatter 格式）

3. **已有的 Skill 示例**（你的 Skill 编写参考）：
   `.devpilot/skills/cpp-test-gen/SKILL.md`
   - **⚠️ 注意**：这个文件缺 frontmatter，你需要同时修复它——给它加上正确的 frontmatter 块（参考 index.md 的 frontmatter 格式）

4. **opencode Skill 加载器**（确认 frontmatter 要求）：
   `packages/opencode/src/skill/index.ts`

5. **opencode Tool 注册器**（理解 Tool 加载机制）：
   `packages/opencode/src/tool/registry.ts`

## 你需要创建/修改的文件清单

### 新建文件

1. **`.devpilot/tools/cpp-compile-fix.ts`** (~350-500 行)
   - 核心状态机 Tool
   - actions: `prepare | build | apply | rollback | finish`
   - 详细 schema、状态管理、各 action 职责见 spec 的"组件设计"章节
   - **离线约束**：参照 `cpp-code-search.ts` 的模式——不 import 外部 npm 包，用内联 identity helper
   - **配置读取**：`JSON.parse(fs.readFileSync('devpilot.json'))` 读 `cpp.*` 字段，自行做参数校验
   - **编译调用**：`execSync('cmake --build <buildDir> --target <target>', {timeout: 120000})`
   - **错误解析**：正则匹配 gcc/clang `file:line:col: error/warning: message` + `undefined reference to`
   - **白名单校验**：路径必须在 `[testFile, tests/**/CMakeLists.txt]` 内；CMakeLists 只允许追加（diff 只有 `+` 行）
   - **备份/回滚**：`prepare` 时 `fs.copyFileSync` 到 `.devpilot/tmp/compile-fix-{timestamp}/`；`rollback` 时覆盖回
   - **日志**：每个 action 追加到内存 log 数组；`finish`/`rollback` 时 `fs.writeFileSync` 到 `.devpilot/logs/compile-fix-{timestamp}.log`
   - **注释语言为中文**（航电合规要求）

2. **`.devpilot/skills/cpp-compile-fix/SKILL.md`** (~80-120 行)
   - **必须包含 frontmatter**（name, description, globs 等）
   - 内容：LLM 编排规范（流程强制规定、每轮注入内容、输出格式、dry-run 行为）
   - 参考 spec 的"SKILL 编排规范"章节
   - 注释语言为中文

3. **`.devpilot/commands/verify-build.md`** (~40-80 行)
   - **必须包含 frontmatter**（name, description）
   - 用户入口，参数解析，指导 LLM 使用 cpp-compile-fix skill + tool
   - 参考 gen-test.md 的结构，但要简洁得多

### 修改文件

4. **`.devpilot/skills/cpp-test-gen/SKILL.md`** — 补 frontmatter
   - 读取当前内容，在文件最开头添加 frontmatter 块（`---\nname: ...\ndescription: ...\n---`）
   - 不改其他内容

## 硬约束（违反任何一条都会被拒绝）

1. **不修改 `packages/` 下的任何文件**
2. **不 import 外部 npm 包**（包括 `@opencode-ai/plugin`、`zod`、任何 `node_modules` 的包）
3. **注释语言为中文**
4. **maxRounds 上限硬编码为 3**，即使传入更大值也截断
5. **白名单硬编码在 Tool 内**，不开放用户覆盖
6. **cmake 构建必须指定 --target**，禁止全量构建
7. **失败回滚用 fs.copyFileSync 自己做**，不碰 opencode Snapshot API
8. **Skill 和 Command 文件必须有 frontmatter**

## 实施顺序建议

1. 先读 spec（E3-cpp-compile-fix-design.md）
2. 再读参考文件（cpp-code-search.ts, gen-test.md, index.md, cpp-test-gen/SKILL.md）
3. 读 opencode skill loader（packages/opencode/src/skill/index.ts）确认 frontmatter 字段要求
4. 读 opencode tool registry（packages/opencode/src/tool/registry.ts）确认 Tool 加载和 args 格式
5. 实现 `cpp-compile-fix.ts`（最大工作量）
6. 实现 `cpp-compile-fix/SKILL.md`
7. 实现 `verify-build.md`
8. 修复 `cpp-test-gen/SKILL.md` 补 frontmatter

## 质量要求

- 每个文件写完后自检：是否符合 spec 中对应章节的所有要求
- Tool 的每个 action 返回值必须与 spec 中的 JSON 结构一致
- 错误解析正则必须覆盖 spec 中列出的两种模式（gcc 格式 + 链接器格式）
- 白名单校验必须覆盖 spec 中列出的两层校验（路径 + append-only）

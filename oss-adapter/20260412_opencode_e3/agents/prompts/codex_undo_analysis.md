你是一名资深 TypeScript 架构师，正在分析 opencode 项目的 undo/revert 机制是否可以被自定义 Tool 复用。

## 背景

我们在做 opencode 的定制（DevPilot 分支），需要实现一个"编译修复循环"功能：
- LLM 生成 C++ 测试文件 → 编译 → 失败 → LLM 修复 → 再编译（最多 3 轮）
- **如果 3 轮全败，需要把文件回滚到修复循环开始前的状态**

目前我们的方案是：在自定义 Tool（`.devpilot/tools/cpp-compile-fix.ts`）里自己用 `fs.copyFile` 做备份和恢复。

但用户指出 opencode 自带 undo 功能（可以撤销 LLM 的修改）。我们需要搞清楚：**能不能直接复用 opencode 的 undo/snapshot/revert 机制，而不是自己实现备份？**

## 你需要深入分析的问题

### Q1: Snapshot 服务的 API 暴露方式
- `packages/opencode/src/snapshot/index.ts` 导出了 `track()`、`revert()`、`restore()` 等函数
- 这些函数是否可以被自定义 Tool（`.devpilot/tools/*.ts`）直接 import 和调用？
- 自定义 Tool 的运行时环境是什么？它能 import `packages/opencode/src/` 下的内部模块吗？
- 找到自定义 Tool 的加载和执行机制（`packages/opencode/src/tool/registry.ts` 或相关文件），看 Tool 的 runtime context 里有什么

### Q2: Plugin Hook 是否能触发 Snapshot 操作
- `packages/plugin/src/index.ts` 的 Hooks 接口里有没有与 snapshot 相关的钩子？
- `tool.execute.before` / `tool.execute.after` 钩子的 context 里是否能访问 Snapshot 服务？
- 有没有其他 hook 点可以做"在某个时间点拍快照，在另一个时间点恢复"？

### Q3: Session Revert 的实际工作方式
- `packages/opencode/src/session/revert.ts` 的 `revert()` 函数：
  - 它是按消息粒度还是按文件粒度回退？
  - 如果在修复循环中 LLM 改了 3 次同一个文件，revert 能精确回退到"第一次改之前"吗？
  - revert 会不会把修复循环之外的其他改动也一起回退？
- TUI 里的 undo 命令是怎么调到 revert 的？找到调用链

### Q4: patch 记录机制
- `Snapshot.Patch` 类型记录了 `{hash, files}`
- 这些 patch 是什么时候被创建的？是每次工具（edit/write/bash）执行后自动记录，还是需要手动调用？
- 自定义 Tool 通过 `fs.writeFile` 直接写盘的改动，会不会被 Snapshot 追踪到？
  - 如果不会 → Snapshot 对自定义 Tool 的写盘操作是盲区
  - 如果会 → 可能可以复用

### Q5: 最终可行性判断
综合以上分析，回答：
1. **自定义 Tool 能否直接调用 `Snapshot.track()` / `Snapshot.revert()`？** 给出具体的 import 路径或说明为什么不行
2. **如果不能直接调用，是否有间接路径？**（通过 Plugin Hook / 通过暴露的 SDK / 通过 CLI 命令）
3. **如果复用 Snapshot，比自己 `fs.copyFile` 做备份有什么优劣？** 从可靠性、复杂度、维护成本三个维度对比
4. **你的最终建议是什么？** 复用 Snapshot 还是自己备份？

## 分析要求
- 每个结论必须有源码引用（文件:行号）
- 如果不确定，实际运行验证（构建项目、写最小测试）
- 不要猜测，看代码说话

## 项目路径
/Users/justbin/project/opensource/opencode

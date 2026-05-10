<!-- AGENT_REVIEW_RESULT -->
<!-- agent: codex -->
<!-- timestamp: 2026-04-12T13:58:27Z -->
<!-- duration_seconds: 255.41 -->
<!-- exit_code: 0 -->
<!-- session_id: 019d81f8-b77c-7a10-b97c-58863534b8e6 -->

**结论先行**

不建议为你这个“编译修复循环”复用 opencode 现有的 session undo/snapshot 机制。它更适合“按消息撤销 LLM 已记录的修改”，不适合“在一个自定义 Tool 内部做 3 轮局部事务，失败后只回到循环起点”。对这个场景，自己做文件备份/恢复更直接、更可控。

1. **Q1: 自定义 Tool 能不能直接 import/call Snapshot API**
   
   自定义 Tool 文件会被主进程直接动态 `import()`，不是子进程；加载位置就是配置目录下的 `{tool,tools}/*.{js,ts}`，然后把导出的 `ToolDefinition` 包成可执行工具。[registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts:115) [registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts:123) [registry.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/tool/registry.ts:142)

   Tool 执行时拿到的 runtime context 只有 `sessionID/messageID/agent/directory/worktree/abort/metadata/ask`，没有 Snapshot service。[tool.ts](/Users/justbin/project/opensource/opencode/packages/plugin/src/tool.ts:3)

   `packages/opencode/src/snapshot/index.ts` 确实导出了 `track/patch/restore/revert/diff` 这些 async 函数。[snapshot/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/snapshot/index.ts:458)

   但它们不是“纯函数 API”，内部依赖 `InstanceState`，而 `InstanceState` 又依赖 `Instance.current` / `Instance.directory` 上下文。[snapshot/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/snapshot/index.ts:84) [snapshot/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/snapshot/index.ts:428) [instance-state.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/effect/instance-state.ts:17) [instance-state.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/effect/instance-state.ts:31) [instance.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/project/instance.ts:84)

   实测结果：
   - 从 `.devpilot/tools` 用相对路径 `../../packages/opencode/src/snapshot/index.ts` 可以 `import` 成功。
   - 用 `@/snapshot` 不能解析，报 `Cannot find module '@/snapshot'`。
   - 在 opencode 实例上下文之外直接调用 `Snapshot.track()`，报 `No context found for instance`。
   
   所以答案是：
   - “能不能 import” = **技术上可以，用相对路径 import 内部源码**。
   - “能不能稳定调用” = **只有在 opencode 运行时已经包在 `Instance.provide()` 的实例上下文里才可能工作**；这不是公开 API，也不是自定义 Tool SDK 保证的能力。[router.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/server/router.ts:49)

2. **Q2: Plugin Hook 能不能触发 Snapshot**
   
   `Hooks` 接口里没有任何 snapshot 专用 hook；只有 `tool.execute.before/after`、`chat.*`、`shell.env` 等。[plugin/index.ts](/Users/justbin/project/opensource/opencode/packages/plugin/src/index.ts:179)

   `tool.execute.before` 只能拿到 `{ tool, sessionID, callID }` 和可改写的 `{ args }`；`tool.execute.after` 只能拿到 tool 基本信息、args、output/metadata，没有 Snapshot service，没有 snapshot hash。[plugin/index.ts](/Users/justbin/project/opensource/opencode/packages/plugin/src/index.ts:215)

   hook 的触发点也只是包在工具执行前后，纯粹顺序调用各插件 hook，不注入额外能力。[prompt.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/prompt.ts:442) [prompt.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/prompt.ts:458) [plugin/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/plugin/index.ts:268)

   间接路径只有一个：插件初始化时拿得到 `client`，理论上可以调用 HTTP API `client.session.revert()/unrevert()`，因为 `PluginInput` 暴露了 `client`。[plugin/index.ts](/Users/justbin/project/opensource/opencode/packages/plugin/src/index.ts:26) 但那是 **session/message 级撤销**，不是任意时间点的 snapshot 控制；并且 hook 本身拿不到 message 边界之外的 snapshot handle。

3. **Q3: Session revert 的实际语义**
   
   `SessionRevert.revert()` 是 **按消息/part 边界决定回滚范围**，不是按文件或任意事务边界。[revert.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/revert.ts:23)

   它会扫描目标 message/part 之后的所有 `patch` part，收集成 `patches`，然后调用 `Snapshot.revert(patches)`。[revert.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/revert.ts:31) [revert.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/revert.ts:59)

   `Snapshot.revert()` 是 **按文件回退**：对每个 patch 里的每个文件执行 `git checkout <hash> -- <file>`；同一文件只处理第一次见到的 patch，后续重复文件会被 `seen` 跳过。[snapshot/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/snapshot/index.ts:301)

   这意味着：
   - 如果修复循环跨了 3 个 assistant step/message，且都改了同一个文件，revert 会把该文件恢复到“第一个被回滚 patch 对应的 hash”状态，也就是第一次被撤销消息之前的状态。
   - 但如果你的 3 轮修复都发生在 **同一个自定义 Tool 调用内部**，session 层只会看到“这一整次 assistant step 的净效果”，不会知道 Tool 内部第 1/2/3 轮边界。
   - revert 还会把目标 message 之后的其它消息效果一起算进去，所以它天然可能把修复循环之外、但位于同一撤销范围后的改动一起撤掉。[revert.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/revert.ts:61) [revert.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/revert.ts:90)

   TUI undo 调用链是：
   `session.undo` → `sdk.client.session.revert(...)` → `POST /session/:id/revert` → `SessionRevert.revert(...)`。[session/index.tsx](/Users/justbin/project/opensource/opencode/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:524) [server/routes/session.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/server/routes/session.ts:931)

4. **Q4: patch 什么时候产生，自定义 Tool 直写会不会被追踪**
   
   patch 不是“每次 write/edit/bash 后立即生成”。真正的 snapshot 生命周期在 `SessionProcessor`：
   - `start-step` 时 `snapshot.track()` 记一个起点。[processor.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/processor.ts:252)
   - `finish-step` 或异常 cleanup 时，用 `snapshot.patch(ctx.snapshot)` 生成一个 `patch` part。[processor.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/processor.ts:283) [processor.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/session/processor.ts:365)

   `Snapshot.Patch` 只记录 `{ hash, files }`。[snapshot/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/snapshot/index.ts:16)

   `snapshot.patch()`/`track()` 内部不是依赖 edit/write 工具事件，而是每次都跑 git 层扫描：`diff-files` 找已跟踪变更，`ls-files --others` 找未跟踪文件，然后 `git add --sparse .` 更新快照索引。[snapshot/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/snapshot/index.ts:153) [snapshot/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/snapshot/index.ts:196)

   所以：
   - 自定义 Tool 用 `fs.writeFile` 直接写盘，**只要发生在 `track()` 和后续 `patch()` 之间，就会被 snapshot 看见**。
   - 但 snapshot **不会因为你的自定义 Tool 内部每一轮写盘自动打 checkpoint**。对 session 来说，它只会在 step 结束时拿到一个总 patch。
   - `snapshot: false` 时这套机制整体关闭，undo/revert 也不会恢复文件。[config.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts:908)

5. **Q5: 最终可行性判断**
   
   1. 自定义 Tool 能否直接调用 `Snapshot.track()/revert()`  
   **可以 import 内部模块，但不是正式支持路径。** 在你这个仓库里可用的路径大致是 `.devpilot/tools` 下的 `../../packages/opencode/src/snapshot/index.ts`。`@/snapshot` 不可用。  
   但它依赖实例上下文；脱离 opencode request/tool 执行上下文会直接失败。这个能力属于“内部耦合”，不是 SDK 能力，也没有兼容性承诺。

   2. 不能直接调用时，有没有间接路径  
   有，但都不理想：
   - 插件可通过 `PluginInput.client` 调 `session.revert/unrevert` HTTP API。[plugin/index.ts](/Users/justbin/project/opensource/opencode/packages/plugin/src/index.ts:26) [server/routes/session.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/server/routes/session.ts:931)
   - 这只能做 message 级 undo/redo，不能表达“Tool 内部第 1 轮前拍快照，第 3 轮失败后只回到这个点”。

   3. 复用 Snapshot vs `fs.copyFile` 备份
   - 可靠性：你自己的备份对“单文件/指定文件集合回滚到循环起点”更可靠。Snapshot 依赖 session step 边界和实例上下文，粒度不匹配。
   - 复杂度：复用 Snapshot 表面少写代码，实际要侵入内部模块、承担路径和上下文问题；总体更复杂。
   - 维护成本：`fs.copyFile` 是本地、显式、可测试的。Snapshot 是 opencode 内部机制，未来改目录结构、上下文注入方式、patch 语义，都可能把你的 Tool 搞坏。

   4. 我的建议  
   **这个“编译修复循环”继续自己备份/恢复，不要复用 session undo。**  
   如果要借 snapshot，也只建议在 opencode 核心里正式暴露一个“Tool 可用的事务式 snapshot API”后再用；当前直接 import 内部模块属于脆弱方案。

**验证说明**

我做了最小运行验证：
- `import("../../packages/opencode/src/snapshot/index.ts")` 成功。
- `import("@/snapshot")` 失败。
- 直接 `Snapshot.track()` 报 `No context found for instance`。
- 我尝试在 `Instance.provide()` 下进一步验证，但被当前环境的只读 SQLite 阻断，报 `attempt to write a readonly database`，所以没有把“真实 Tool 调用路径下的成功执行”跑通。静态调用链已经足够说明其依赖实例上下文，且不属于公开 Tool API。

<!-- END_AGENT_REVIEW_RESULT -->

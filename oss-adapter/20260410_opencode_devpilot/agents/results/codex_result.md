<!-- AGENT_REVIEW_RESULT -->
<!-- agent: codex -->
<!-- timestamp: 2026-04-10T13:08:29Z -->
<!-- duration_seconds: 646.50 -->
<!-- exit_code: 0 -->
<!-- session_id: 019d7778-432e-7df3-bfda-c7a790530f3e -->

### 需求 1：DevPilot 品牌替换

**第一层：文档**
- 官方声明：`未提及`
- 依据：[packages/web/src/content/docs/index.mdx:133](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/index.mdx#L133) 起文档只描述“配置 provider”，没有任何品牌抽象或 rename 机制；[packages/web/src/content/docs/index.mdx:97](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/index.mdx#L97) 仍以 `opencode` 为安装命令。

**第二层：源码**
- 实现状态：`部分`
- 依据：[packages/opencode/src/global/index.ts:7-12](/Users/justbin/project/opensource/opencode/packages/opencode/src/global/index.ts#L7) 的 `const app = "opencode"` 只决定 XDG `data/cache/config/state` 目录名，不是唯一 app name 来源。
- 依据：[packages/opencode/src/index.ts:51](/Users/justbin/project/opensource/opencode/packages/opencode/src/index.ts#L51) CLI 名称硬编码为 `.scriptName("opencode")`。
- 依据：[packages/opencode/package.json:23-25](/Users/justbin/project/opensource/opencode/packages/opencode/package.json#L23) `bin` 入口名硬编码为 `opencode`。
- 依据：[packages/opencode/bin/opencode:20-55](/Users/justbin/project/opensource/opencode/packages/opencode/bin/opencode#L20) wrapper 同时依赖 `OPENCODE_BIN_PATH`、缓存文件 `.opencode`、平台包名 `opencode-{platform}-{arch}`、二进制名 `opencode(.exe)`。
- 依据：[packages/opencode/script/postinstall.mjs:50-53](/Users/justbin/project/opensource/opencode/packages/opencode/script/postinstall.mjs#L50) 安装后查找的平台包名仍是 `opencode-{platform}-{arch}`。
- 依据：[packages/opencode/script/build.ts:186-219](/Users/justbin/project/opensource/opencode/packages/opencode/script/build.ts#L186) 构建产物目录、二进制文件名、`--user-agent=opencode/...` 都是硬编码。
- 依据：[packages/opencode/src/config/config.ts:1102-1109](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L1102) 全局配置文件名候选仍是 `opencode.jsonc` / `opencode.json`。
- 依据：[packages/opencode/src/cli/logo.ts:1-4](/Users/justbin/project/opensource/opencode/packages/opencode/src/cli/logo.ts#L1) + [packages/opencode/src/cli/ui.ts:43-89](/Users/justbin/project/opensource/opencode/packages/opencode/src/cli/ui.ts#L43) TUI logo 由固定字形渲染，不是外部配置。

**第三层：运行验证**
```bash
# 执行的命令
tmp=$(mktemp -d); export XDG_DATA_HOME=$tmp/data XDG_CONFIG_HOME=$tmp/config XDG_CACHE_HOME=$tmp/cache XDG_STATE_HOME=$tmp/state OPENCODE_DISABLE_MODELS_FETCH=1; mkdir -p "$XDG_DATA_HOME" "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" "$XDG_STATE_HOME"; bun run --cwd packages/opencode src/index.ts debug paths
# 输出
Performing one time database migration, may take a few minutes...
sqlite-migration:done
Database migration complete.
home       /Users/justbin
data       /var/folders/.../data/opencode
bin        /var/folders/.../cache/opencode/bin
log        /var/folders/.../data/opencode/log
cache      /var/folders/.../cache/opencode
config     /var/folders/.../config/opencode
state      /var/folders/.../state/opencode
```
- 验证结论：`部分工作`
- 结论补充：当前 `app` 常量确实驱动 XDG 目录名，但 CLI 名、wrapper、构建产物、配置文件名、logo 并不会随它自动切换。

**边界问题**：
- 问题：品牌名不是单点配置，`src/global/index.ts:7` 不是唯一来源。建议修复：集中抽出 brand 常量，统一驱动 `scriptName`、bin 名、wrapper 包名、postinstall、build outfile、user-agent、config filename。
- 问题：`OPENCODE_TEST_HOME` 只影响 `home`，不影响 XDG `data/config/cache/state`。建议修复：测试/安装场景统一通过 XDG 环境变量或新增 `OPENCODE_TEST_XDG_*` 覆盖。
- 问题：默认全局配置文件仍叫 `opencode.jsonc/opencode.json`。建议修复：若 DevPilot 也要求文件名去品牌化，需要同步改 `globalConfigFile()`。

**最终结论**
- 状态：`⚠️ 已有但需修复`
- 一句话总结：目录名替换只改一处不够，品牌字符串分散在 CLI、安装、构建、配置文件名和 logo，多处核心补丁是必需的。

---

### 需求 2：E1/E2/E3 Skills 全局内置

**第一层：文档**
- 官方声明：`支持`
- 依据：[packages/web/src/content/docs/skills.mdx:14-18](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/skills.mdx#L14) 明确支持全局 `~/.config/opencode/skills/<name>/SKILL.md`。
- 依据：[packages/web/src/content/docs/commands.mdx:80-83](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/commands.mdx#L80) 明确支持全局 `~/.config/opencode/commands/`。

**第二层：源码**
- 实现状态：`部分`
- 依据：[packages/opencode/src/config/paths.ts:22-42](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/paths.ts#L22) `ConfigPaths.directories()` 首位就是 `Global.Path.config`，随后才是项目 `.opencode`、home 下 `.opencode`、`OPENCODE_CONFIG_DIR`。
- 依据：[packages/opencode/src/skill/index.ts:162-177](/Users/justbin/project/opensource/opencode/packages/opencode/src/skill/index.ts#L162) skill loader 会扫描 `config.directories()` 返回目录下的 `{skill,skills}/**/SKILL.md`，并额外支持 `cfg.skills.paths`。
- 依据：[packages/opencode/src/config/config.ts:548-555](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L548) + [packages/opencode/src/config/config.ts:894](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L894) `skills.paths`/`skills.urls` 可注入额外 skill 目录或远程 skill 源。
- 依据：[packages/opencode/src/config/config.ts:230-266](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L230) command loader 会扫描 `{command,commands}/**/*.md`。
- 依据：[packages/opencode/src/command/index.ts:106-157](/Users/justbin/project/opensource/opencode/packages/opencode/src/command/index.ts#L106) slash command 最终来自 `cfg.command`、MCP prompt、以及每个发现到的 skill。
- 依据：[.opencode/commands/structurize-req.md:1-7](/Users/justbin/project/opensource/opencode/.opencode/commands/structurize-req.md#L1) + [.opencode/skills/req-structuring/SKILL.md:1-4](/Users/justbin/project/opensource/opencode/.opencode/skills/req-structuring/SKILL.md#L1) E1 资产存在。
- 依据：[.opencode/commands/gen-test.md:1-9](/Users/justbin/project/opensource/opencode/.opencode/commands/gen-test.md#L1) + [.opencode/skills/cpp-test-gen/SKILL.md:1-6](/Users/justbin/project/opensource/opencode/.opencode/skills/cpp-test-gen/SKILL.md#L1) E2 资产存在。
- 依据：[.opencode/commands/gen-test.md:676-683](/Users/justbin/project/opensource/opencode/.opencode/commands/gen-test.md#L676) 文档引用 `/compile-fix` 为 E3，但仓库目录清单中不存在对应 command/skill 文件；`.opencode` 当前只有 `req-structuring`、`cpp-test-gen`、`cpp-code-search` 三套 skill。

**第三层：运行验证**
```bash
# 执行的命令
bun test test/skill/skill.test.ts --timeout 30000 -t 'discovers repo req-structuring skill'
# 输出
bun test v1.3.11 (af24e281)

 1 pass
 11 filtered out
 0 fail
 3 expect() calls
Ran 1 test across 1 file. [3.85s]
```

```bash
# 执行的命令
bun test test/config/config.test.ts --timeout 30000 -t 'repo structurize-req command exposes executable template'
# 输出
bun test v1.3.11 (af24e281)

 1 pass
 69 filtered out
 0 fail
 4 expect() calls
Ran 1 test across 1 file. [3.79s]
```

```bash
# 执行的命令
bun test test/config/config.test.ts --timeout 30000 -t 'skips project .opencode/ directories when flag is set'
# 输出
bun test v1.3.11 (af24e281)

 1 pass
 69 filtered out
 0 fail
 1 expect() calls
Ran 1 test across 1 file. [2.32s]
```
- 验证结论：`部分工作`
- 结论补充：全局 skill/command 装载机制是现成的；E1/E2 已有；E3 当前只有文档引用，没有实际资产。

**边界问题**：
- 问题：E3 `cpp-compile-fix` 缺失，`gen-test.md` 只引用了 `/compile-fix`。建议修复：补齐 `.opencode/commands/compile-fix.md` 和对应 `skills/cpp-compile-fix/SKILL.md`，再做全局部署。
- 问题：若只靠仓库内 `.opencode`，客户新建目录不会自动拥有这些资产。建议修复：安装包或首次启动时把命令/skill 复制到 `Global.Path.config/{commands,skills}`。
- 问题：命令和 skill 名冲突时，`Command` 层会跳过同名 skill。建议修复：全局预置时统一命名，避免后续客户项目覆盖冲突。

**最终结论**
- 状态：`⚠️ 已有但需修复`
- 一句话总结：全局内置机制本身已支持，但当前仓库只实装了 E1/E2，E3 仍需补齐资产并加入安装部署流程。

---

### 需求 3：本地模型端点配置向导

**第一层：文档**
- 官方声明：`未提及`
- 依据：[packages/web/src/content/docs/index.mdx:135-158](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/index.mdx#L135) 官方只说明“配置 provider / 使用 `/connect`”，没有首次运行 wizard 描述。

**第二层：源码**
- 实现状态：`部分`
- 依据：[packages/opencode/src/cli/bootstrap.ts:1-16](/Users/justbin/project/opensource/opencode/packages/opencode/src/cli/bootstrap.ts#L1) bootstrap 仅包装 `InstanceBootstrap`，没有 setup wizard 钩子。
- 依据：[packages/opencode/src/index.ts:72-131](/Users/justbin/project/opensource/opencode/packages/opencode/src/index.ts#L72) 启动中间件只做日志、环境变量、数据库迁移，没有首次运行检测逻辑。
- 依据：[packages/opencode/src/config/config.ts:824-850](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L824) provider schema 明确支持 `options.baseURL`。
- 依据：[packages/opencode/src/config/config.ts:966-969](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L966) `provider` 为 `record(string, Provider)`，可写入 `qwen-local`。
- 依据：[packages/opencode/src/provider/provider.ts:1224-1248](/Users/justbin/project/opensource/opencode/packages/opencode/src/provider/provider.ts#L1224) 运行时会解析并应用 `options.baseURL`。
- 依据：[packages/opencode/src/config/config.ts:1509-1527](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L1509) 已有 `Config.updateGlobal()` 可直接写全局配置。

**第三层：运行验证**
```bash
# 执行的命令
OPENCODE_DISABLE_MODELS_FETCH=1 bun run --cwd packages/opencode src/index.ts debug config
# 输出
Error: Unexpected error, check log file at /Users/justbin/.local/share/opencode/log/dev.log for more details

Failed to run the query 'PRAGMA wal_checkpoint(PASSIVE)'
```
- 验证结论：`不可用`
- 结论补充：当前没有首次运行向导；且默认环境下启动链路还暴露出 DB 状态问题，新增 wizard 时不能假设启动前置步骤总是健康。

**边界问题**：
- 问题：没有“首次运行”判定点。建议修复：在进入 TUI 前检查全局配置里 `provider.qwen-local.options.baseURL` 是否存在，不存在则走向导。
- 问题：当前默认环境下可能先在 DB 阶段失败。建议修复：把向导放在 DB 依赖最少的位置，或先修复 `wal_checkpoint` 错误处理。
- 问题：若 DevPilot 同时改品牌目录/文件名，`updateGlobal()` 仍会写 `opencode.jsonc`。建议修复：先完成 REQ-01 的 config filename 抽象，再实现 wizard。

**最终结论**
- 状态：`❌ 不存在需新建`
- 一句话总结：底层配置 schema 和全局写入能力都已具备，但首次运行检测、交互向导和跳过逻辑都需要新增。

---

### 需求 4：Windows 一键安装包

**第一层：文档**
- 官方声明：`部分支持`
- 依据：[packages/web/src/content/docs/index.mdx:93-129](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/index.mdx#L93) 官方建议 Windows 优先用 WSL，并提供 `choco/scoop/npm/releases` 安装方式；未提供 CLI `setup.exe` 安装器。
- 依据：[packages/web/src/content/docs/index.mdx:127](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/index.mdx#L127) 明确写着 “Support for installing OpenCode on Windows using Bun is currently in progress.”

**第二层：源码**
- 实现状态：`部分`
- 依据：[.github/workflows/publish.yml:98-108](/Users/justbin/project/opensource/opencode/.github/workflows/publish.yml#L98) 官方会构建并上传 `opencode-windows*` CLI 产物。
- 依据：[.github/workflows/publish.yml:147-200](/Users/justbin/project/opensource/opencode/.github/workflows/publish.yml#L147) 官方对 Windows CLI 做签名并重打包为 zip，不是安装器。
- 依据：[packages/opencode/script/postinstall.mjs:101-107](/Users/justbin/project/opensource/opencode/packages/opencode/script/postinstall.mjs#L101) Windows 分支直接返回“binary setup not needed”，没有 PATH 注册、快捷方式、全局 skill 部署。
- 依据：[packages/desktop/src-tauri/tauri.conf.json:35-56](/Users/justbin/project/opensource/opencode/packages/desktop/src-tauri/tauri.conf.json#L35) 仓库现有 NSIS 仅用于 Desktop/Tauri 包，不是 CLI 安装器。
- 依据：[packages/desktop/src-tauri/tauri.conf.json:47-56](/Users/justbin/project/opensource/opencode/packages/desktop/src-tauri/tauri.conf.json#L47) 仓库里已有 Windows `nsis` 目标和自定义图标资源，说明选 NSIS 复用成本低于引入 Inno 的全新链路。

**第三层：运行验证**
```bash
# 执行的命令
tmp=$(mktemp -d); export XDG_DATA_HOME=$tmp/data XDG_CONFIG_HOME=$tmp/config XDG_CACHE_HOME=$tmp/cache XDG_STATE_HOME=$tmp/state OPENCODE_DISABLE_MODELS_FETCH=1; mkdir -p "$XDG_DATA_HOME" "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" "$XDG_STATE_HOME"; bun run --cwd packages/opencode src/index.ts --version
# 输出
local
```
- 验证结论：`部分工作`
- 结论补充：本地源码可作为 CLI 运行，但当前仓库没有可在 Windows 上双击安装的 `devpilot-setup.exe` 流程。

**边界问题**：
- 问题：官方只有 zip/包管理器分发，没有 CLI 安装器。建议修复：新增单独的 Windows installer pipeline。
- 问题：全局 skill 部署、PATH 注册、桌面快捷方式、控制面板卸载条目都不在现有 CLI 脚本覆盖范围内。建议修复：把这些动作放入安装器，而不是 postinstall。
- 问题：NSIS vs Inno。建议修复：优先 NSIS。原因是仓库已存在 NSIS 打包配置和签名链路；PATH 注册/快捷方式这类动作两者都能做，但 NSIS 集成成本更低。
- 问题：当前主机不是 Windows，未实际验证控制面板条目和新 PowerShell PATH 生效。建议修复：在 Windows CI 或实体机补验。

**最终结论**
- 状态：`❌ 不存在需新建`
- 一句话总结：Windows CLI 二进制发布已存在，但“一键安装器”整条交付链路目前没有，需要新建 installer 流程，优先选 NSIS。

---

### 需求 5：模型端点事后修改命令

**第一层：文档**
- 官方声明：`未提及`
- 依据：[packages/web/src/content/docs/index.mdx:141-158](/Users/justbin/project/opensource/opencode/packages/web/src/content/docs/index.mdx#L141) 只描述 TUI `/connect`，没有 `config set-endpoint` 或 `config show` 子命令。

**第二层：源码**
- 实现状态：`部分`
- 依据：[packages/opencode/src/index.ts:51-57](/Users/justbin/project/opensource/opencode/packages/opencode/src/index.ts#L51) + [packages/opencode/src/index.ts:126-148](/Users/justbin/project/opensource/opencode/packages/opencode/src/index.ts#L126) yargs 顶层命令集中注册，当前没有 `config` 子命令。
- 依据：[packages/opencode/src/cli/cmd/cmd.ts:1-5](/Users/justbin/project/opensource/opencode/packages/opencode/src/cli/cmd/cmd.ts#L1) 命令模块封装很薄，新增一个 `cli/cmd/config.ts` 成本低。
- 依据：[packages/opencode/src/config/config.ts:1509-1527](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L1509) 已有 `Config.updateGlobal()`，可以直接实现 `set-endpoint`。
- 依据：[packages/opencode/src/config/config.ts:1102-1110](/Users/justbin/project/opensource/opencode/packages/opencode/src/config/config.ts#L1102) `show` 需注意当前全局文件名解析顺序仍固定为 `opencode.jsonc` / `opencode.json` / `config.json`。
- 依据：[packages/opencode/src/provider/provider.ts:1224-1248](/Users/justbin/project/opensource/opencode/packages/opencode/src/provider/provider.ts#L1224) 写入后的 `baseURL` 会在 provider 解析时生效。

**第三层：运行验证**
```bash
# 执行的命令
OPENCODE_DISABLE_MODELS_FETCH=1 bun run --cwd packages/opencode src/index.ts debug config
# 输出
Error: Unexpected error, check log file at /Users/justbin/.local/share/opencode/log/dev.log for more details

Failed to run the query 'PRAGMA wal_checkpoint(PASSIVE)'
```
- 验证结论：`不可用`
- 结论补充：仓库当前没有 `config` 子命令可测；现有最接近的配置调试入口在默认环境下也失败，因此最终交付应附带单元测试而不能只靠手工验证。

**边界问题**：
- 问题：`config` 命令不存在。建议修复：新增 `packages/opencode/src/cli/cmd/config.ts`，并在 [packages/opencode/src/index.ts](/Users/justbin/project/opensource/opencode/packages/opencode/src/index.ts) 注册。
- 问题：若品牌已改为 DevPilot，但全局配置文件名仍保留 `opencode.jsonc`，用户心智会不一致。建议修复：与 REQ-01 一并抽象文件名。
- 问题：`show` 建议显示“当前生效文件路径 + provider.qwen-local.options.baseURL”，避免多文件来源下误判。

**最终结论**
- 状态：`❌ 不存在需新建`
- 一句话总结：全局配置写入底座已经有，但 CLI 命令入口不存在，需要新增一个很小的命令模块并接入 yargs。

## 能力矩阵汇总

| 需求 | 状态 | 建议定制级别 | 置信度 | 关键备注 |
|------|------|-------------|--------|---------|
| REQ-01 品牌替换 | ⚠️ 已有但需修复 | L4-Core | 高 | `app="opencode"` 不是唯一来源，CLI/bin/build/postinstall/config filename/logo 都需改 |
| REQ-02 全局内置 E1/E2/E3 | ⚠️ 已有但需修复 | L3-Patch | 高 | 全局加载机制现成；E1/E2 已有；E3 `compile-fix` 资产缺失 |
| REQ-03 首次运行端点向导 | ❌ 不存在需新建 | L4-Core | 高 | schema 和 `updateGlobal()` 已有，但无 first-run hook/wizard |
| REQ-04 Windows 一键安装包 | ❌ 不存在需新建 | L3-Patch | 中 | 有 Windows CLI zip 和 Desktop NSIS；无 CLI setup.exe 安装器 |
| REQ-05 `config set-endpoint/show` | ❌ 不存在需新建 | L3-Patch | 高 | yargs 注册点清晰，新增命令成本低，但当前完全未实现 |

## 人工审查清单

- REQ-02 E3 缺失
  建议验证：在仓库根执行 `find .opencode -maxdepth 3 | sort` 与 `rg -n "compile-fix" .opencode`，确认是否仅有文档引用而无实体文件。
- REQ-03 首次运行链路
  建议验证：在干净 XDG 环境下补做一次“无全局配置”启动实验，确认最合适的插入点是在 CLI middleware 前还是 TUI 入口前。
- REQ-04 Windows 安装器
  建议验证：在 Windows CI 或实体机完成 4 项验收：安装后 `devpilot --version`、新 PowerShell PATH、生效的全局 skill 部署、控制面板卸载项。
- REQ-05 配置命令
  建议验证：实现后补 3 条测试：`set-endpoint` 写 `provider.qwen-local.options.baseURL`、`config show` 显示当前值、品牌改名后仍写入正确的全局配置文件。

<!-- END_AGENT_REVIEW_RESULT -->

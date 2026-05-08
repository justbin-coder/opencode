/**
 * cpp-compile-fix：C++ 编译验证与错误修复状态机
 *
 * 离线交付约束（CUSTOM）：
 *   本文件不得 import 任何外部 npm 包（包括 @opencode-ai/plugin、zod），
 *   因为离线客户侧 ~/.devpilot/ 下没有 node_modules，devpilot 二进制也不会
 *   把 bundled 依赖暴露给用户工具的动态 import 解析路径。
 *   —— args 通过 factory `(z) => shape` 拿到 opencode 内嵌的 zod。
 *   —— tool() 直接内联成 identity helper。
 */

import { createHash } from "crypto"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tool = <T>(def: T): T => def

type Action = "prepare" | "build" | "apply" | "rollback" | "finish"

type Hunk = {
  oldStart: number
  oldCount: number
  newStart: number
  newCount: number
  lines: string[]
}

type FilePatch = {
  hunks: Hunk[]
}

type State = {
  stamp: string
  testFile: string
  projectRoot: string
  buildDir: string
  target: string
  backupDir: string
  logFile: string
  maxRounds: number
  currentRound: number
  dryRun: boolean
  log: string[]
  whitelist: string[]
  backups: Record<string, string>
}

type Args = {
  action: Action
  testFile?: string
  patch?: string
  patchFile?: string
  dryRun?: boolean
  maxRounds?: number
}

type Cfg = {
  projectRoot: string
  buildDir: string
  testTargetDiscovery: string
}

let state: State | undefined

const ROOT = process.cwd()
const TMP = path.join(ROOT, ".devpilot", "tmp")
const LOG = path.join(ROOT, ".devpilot", "logs")
const CFG = path.join(ROOT, "devpilot.json")

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-")
}

function norm(file: string) {
  return path.resolve(file).replace(/\\/g, "/")
}

function unix(txt: string) {
  return txt.replace(/\r\n/g, "\n")
}

function clip(n?: number) {
  if (!n || Number.isNaN(n)) return 3
  return Math.max(0, Math.min(3, Math.trunc(n)))
}

function line(msg: string) {
  return `[${new Date().toISOString()}] ${msg}`
}

function push(msg: string) {
  if (!state) return
  state.log.push(line(msg))
}

function flush() {
  if (!state) return
  mkdir(LOG)
  fs.writeFileSync(state.logFile, `${state.log.join("\n")}\n`)
}

function fail(message: string, extra?: Record<string, unknown>) {
  return JSON.stringify({ status: "error", message, ...extra })
}

function ok(data: Record<string, unknown>) {
  return JSON.stringify(data)
}

function hash(txt: string) {
  return createHash("sha1").update(txt).digest("hex")
}

function need() {
  if (!state) throw new Error("请先执行 prepare")
  return state
}

function mkdir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function clean(dir: string) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

function read(file: string) {
  return fs.readFileSync(file, "utf-8")
}

function write(file: string, txt: string) {
  mkdir(path.dirname(file))
  fs.writeFileSync(file, txt)
}

function rel(root: string, file: string) {
  return path.relative(root, file).replace(/\\/g, "/")
}

function under(root: string, file: string) {
  const base = norm(root)
  const abs = norm(file)
  return abs === base || abs.startsWith(`${base}/`)
}

function list(dir: string, name: string, out: string[] = []) {
  if (!fs.existsSync(dir)) return out
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name)
    if (item.isDirectory()) {
      list(file, name, out)
      continue
    }
    if (item.name === name) out.push(norm(file))
  }
  return out
}

function split(txt: string) {
  const next = unix(txt)
  if (next === "") return { lines: [] as string[], eof: false }
  if (next.endsWith("\n")) return { lines: next.slice(0, -1).split("\n"), eof: true }
  return { lines: next.split("\n"), eof: false }
}

function parseCfg() {
  if (!fs.existsSync(CFG)) {
    throw new Error("未找到 devpilot.json，请在当前工作目录提供配置文件")
  }
  const raw = JSON.parse(fs.readFileSync(CFG, "utf-8")) as { cpp?: Record<string, unknown> }
  if (!raw.cpp || typeof raw.cpp !== "object") {
    throw new Error(
      `devpilot.json 缺少 cpp 配置。示例：{"cpp":{"projectRoot":"${ROOT}","buildDir":"build","testTargetDiscovery":"auto"}}`,
    )
  }
  const root = raw.cpp.projectRoot
  const dir = raw.cpp.buildDir
  const mode = raw.cpp.testTargetDiscovery
  if (typeof root !== "string" || !root.trim()) {
    throw new Error("devpilot.json 缺少 cpp.projectRoot，且必须是绝对路径字符串")
  }
  if (!path.isAbsolute(root)) {
    throw new Error("cpp.projectRoot 必须是绝对路径")
  }
  return {
    projectRoot: norm(root),
    buildDir: typeof dir === "string" && dir.trim() ? dir.trim() : "build",
    testTargetDiscovery: typeof mode === "string" && mode.trim() ? mode.trim() : "auto",
  } satisfies Cfg
}

function parseTokens(txt: string) {
  return txt
    .replace(/#[^\n]*/g, " ")
    .replace(/[\r\n\t]/g, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function matchFile(base: string, tok: string, testFile: string) {
  const raw = tok.replace(/^"(.*)"$/, "$1")
  if (!raw || raw.startsWith("$") || raw.includes("${")) return false
  const file = raw.startsWith("/") ? norm(raw) : norm(path.join(base, raw))
  return file === testFile || path.basename(file) === path.basename(testFile)
}

export function discoverTarget(projectRoot: string, testFile: string) {
  const dir = path.join(projectRoot, "tests")
  const files = list(dir, "CMakeLists.txt")
  const hits: string[] = []
  for (const file of files) {
    const txt = read(file)
    const base = path.dirname(file)
    const add = [...txt.matchAll(/add_executable\s*\(\s*([^\s\)]+)([\s\S]*?)\)/g)]
    for (const item of add) {
      const body = parseTokens(item[2] ?? "")
      if (body.some((tok) => matchFile(base, tok, testFile))) hits.push(item[1])
    }
    const src = [...txt.matchAll(/target_sources\s*\(\s*([^\s\)]+)([\s\S]*?)\)/g)]
    for (const item of src) {
      const body = parseTokens(item[2] ?? "")
      if (body.some((tok) => matchFile(base, tok, testFile))) hits.push(item[1])
    }
  }
  return { target: hits[0], files }
}

function parsePatch(txt: string) {
  const rows = unix(txt).split("\n")
  const hunks: Hunk[] = []
  let i = 0

  while (i < rows.length) {
    const row = rows[i]
    const head = row.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    if (!head) {
      i += 1
      continue
    }
    const hunk: Hunk = {
      oldStart: Number(head[1]),
      oldCount: Number(head[2] ?? "1"),
      newStart: Number(head[3]),
      newCount: Number(head[4] ?? "1"),
      lines: [],
    }
    i += 1
    while (i < rows.length && !rows[i].startsWith("@@ ")) {
      if (rows[i] === "\\ No newline at end of file") {
        i += 1
        continue
      }
      hunk.lines.push(rows[i])
      i += 1
    }
    hunks.push(hunk)
  }

  if (!hunks.length) throw new Error("patch 缺少有效 hunk")
  return { hunks } satisfies FilePatch
}

export function validateAppendOnly(txt: string) {
  const rows = unix(txt).split("\n")
  for (const row of rows) {
    if (!row.startsWith("-")) continue
    if (row.startsWith("---")) continue
    return false
  }
  return true
}

export function applyDiff(src: string, txt: string) {
  const patch = parsePatch(txt)
  const old = split(src)
  const out: string[] = []
  let cur = 0

  for (const hunk of patch.hunks) {
    const start = Math.max(0, hunk.oldStart - 1)
    while (cur < start) {
      out.push(old.lines[cur] ?? "")
      cur += 1
    }
    for (const row of hunk.lines) {
      const tag = row[0]
      const body = row.slice(1)
      if (tag === " ") {
        if ((old.lines[cur] ?? "") !== body) throw new Error(`patch 上下文不匹配：${body}`)
        out.push(body)
        cur += 1
        continue
      }
      if (tag === "-") {
        if ((old.lines[cur] ?? "") !== body) throw new Error(`patch 删除行不匹配：${body}`)
        cur += 1
        continue
      }
      if (tag === "+") {
        out.push(body)
        continue
      }
      throw new Error(`patch 行格式非法：${row}`)
    }
  }

  while (cur < old.lines.length) {
    out.push(old.lines[cur] ?? "")
    cur += 1
  }

  return `${out.join("\n")}${old.eof || out.length ? "\n" : ""}`
}

function backup(file: string, dir: string, root: string) {
  const to = path.join(dir, rel(root, file))
  mkdir(path.dirname(to))
  fs.copyFileSync(file, to)
  return to
}

function writeLog(result: string) {
  const s = need()
  mkdir(LOG)
  s.log.push(line(`result: ${result}`))
  fs.writeFileSync(s.logFile, `${s.log.join("\n")}\n`)
  return s.logFile
}

function prepare(args: Args) {
  if (!args.testFile) return fail("prepare 需要 testFile")

  const cfg = parseCfg()
  const testFile = norm(path.isAbsolute(args.testFile) ? args.testFile : path.join(cfg.projectRoot, args.testFile))
  if (!fs.existsSync(testFile)) return fail(`测试文件不存在：${testFile}`)
  if (!under(cfg.projectRoot, testFile)) return fail("testFile 必须位于 cpp.projectRoot 内")

  const buildDir = norm(path.join(cfg.projectRoot, cfg.buildDir))
  const cache = path.join(buildDir, "CMakeCache.txt")
  if (!fs.existsSync(cache)) {
    return fail(`CMakeCache.txt 不存在，请先执行 cmake -B ${cfg.buildDir} 初始化构建目录`, {
      projectRoot: cfg.projectRoot,
      buildDir,
    })
  }

  const found = discoverTarget(cfg.projectRoot, testFile)
  const target =
    cfg.testTargetDiscovery !== "auto" ? cfg.testTargetDiscovery : found.target
  if (!target) {
    return fail("target 自动发现失败，请在 devpilot.json 配置 cpp.testTarget 或 cpp.testTargetDiscovery", {
      projectRoot: cfg.projectRoot,
      buildDir,
    })
  }

  const id = stamp()
  const backupDir = path.join(TMP, `compile-fix-${id}`)
  const logFile = path.join(LOG, `compile-fix-${id}.log`)
  const whitelist = Array.from(new Set([testFile, ...found.files]))
  const backups: Record<string, string> = {}

  mkdir(backupDir)
  mkdir(LOG)
  for (const file of whitelist) {
    if (!fs.existsSync(file)) continue
    backups[file] = backup(file, backupDir, cfg.projectRoot)
  }

  state = {
    stamp: id,
    testFile,
    projectRoot: cfg.projectRoot,
    buildDir,
    target,
    backupDir,
    logFile,
    maxRounds: args.dryRun ? 0 : clip(args.maxRounds),
    currentRound: 0,
    dryRun: Boolean(args.dryRun),
    log: [],
    whitelist,
    backups,
  }

  push(`prepare: test=${rel(cfg.projectRoot, testFile)} target=${target} dryRun=${Boolean(args.dryRun)}`)
  push(`prepare: whitelist=${whitelist.map((x) => rel(cfg.projectRoot, x)).join(", ")}`)
  push(`prepare: initial_hash=${hash(read(testFile))}`)
  flush()

  return ok({
    status: "ready",
    target,
    projectRoot: cfg.projectRoot,
    buildDir,
    dryRun: state.dryRun,
    maxRounds: state.maxRounds,
    whitelist: whitelist.map((x) => rel(cfg.projectRoot, x)),
  })
}

function build() {
  const s = need()
  const cmd = `cmake --build ${JSON.stringify(s.buildDir)} --target ${JSON.stringify(s.target)}`
  push(`build: round=${s.currentRound} cmd=${cmd}`)

  try {
    const out = execSync(cmd, {
      cwd: s.projectRoot,
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 120000,
    })
    s.errors = []
    push(`build: pass`)
    if (out.trim()) push(`build_stdout:\n${out}`)
    flush()
    return ok({
      status: "pass",
      round: s.currentRound,
      currentFile: read(s.testFile),
      logFile: s.logFile,
      log: s.log,
    })
  } catch (err) {
    const out = String((err as { stdout?: Buffer | string }).stdout ?? "")
    const stderr = String((err as { stderr?: Buffer | string; message?: string }).stderr ?? (err as Error).message)
    const raw = `${out}${out && stderr ? "\n" : ""}${stderr}`
    push(`build: fail round=${s.currentRound}`)
    push(`build_stderr:\n${raw}`)
    flush()
    return ok({
      status: "fail",
      round: s.currentRound,
      currentFile: read(s.testFile),
      logFile: s.logFile,
      log: s.log,
      stderr: raw,
    })
  }
}

function apply(args: Args) {
  const s = need()
  if (s.dryRun) return ok({ status: "rejected", reason: "dry-run 模式禁止 apply" })
  if (!args.patch) return fail("apply 需要 patch")
  if (!args.patchFile) return fail("apply 需要 patchFile")
  if (s.currentRound >= s.maxRounds) return ok({ status: "rejected", reason: "已达到最大修复轮数" })

  const file = norm(path.isAbsolute(args.patchFile) ? args.patchFile : path.join(s.projectRoot, args.patchFile))
  if (!s.whitelist.includes(file)) {
    push(`apply: rejected path=${file}`)
    return ok({ status: "rejected", reason: "patchFile 超出白名单" })
  }
  if (!fs.existsSync(file)) {
    push(`apply: rejected missing=${file}`)
    return ok({ status: "rejected", reason: "patchFile 不存在" })
  }
  if (path.basename(file) === "CMakeLists.txt" && !validateAppendOnly(args.patch)) {
    push(`apply: rejected append_only=${file}`)
    return ok({ status: "rejected", reason: "CMakeLists.txt 仅允许纯追加修改" })
  }

  const next = applyDiff(read(file), args.patch)
  write(file, next)
  s.currentRound += 1
  push(`apply: round=${s.currentRound} file=${rel(s.projectRoot, file)}`)
  push(`apply_diff:\n${args.patch}`)
  flush()

  return ok({
    status: "applied",
    round: s.currentRound,
    patchFile: rel(s.projectRoot, file),
  })
}

function rollback() {
  const s = need()
  for (const [file, from] of Object.entries(s.backups)) {
    if (!fs.existsSync(from)) {
      push(`rollback_warn: 备份缺失，无法回滚 ${rel(s.projectRoot, file)}`)
      continue
    }
    mkdir(path.dirname(file))
    fs.copyFileSync(from, file)
  }
  const logFile = writeLog("rolled_back")
  clean(s.backupDir)
  state = undefined
  return ok({ status: "rolled_back", logFile })
}

function finish() {
  const s = need()
  const logFile = writeLog("done")
  clean(s.backupDir)
  const round = s.currentRound
  state = undefined
  return ok({ status: "done", round, logFile })
}

export default tool({
  description: `执行 C++ 测试文件的编译验证与自动修复状态机。

支持 action：
- prepare：读取 devpilot.json 的 cpp 配置，校验 build 目录，发现 target，建立备份
- build：执行 cmake --build <buildDir> --target <target>，返回 raw stderr 供 LLM 直接理解
- apply：对白名单内文件应用 unified diff，并执行 append-only 校验
- rollback：恢复备份并输出日志
- finish：结束流程并输出日志`,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: (z: any) => ({
    action: z.enum(["prepare", "build", "apply", "rollback", "finish"]).describe("状态机动作"),
    testFile: z.string().optional().describe("待验证的测试文件路径，仅 prepare 必填"),
    patch: z.string().optional().describe("unified diff 格式补丁，仅 apply 必填"),
    patchFile: z.string().optional().describe("补丁目标文件，仅 apply 必填"),
    dryRun: z.boolean().optional().describe("是否只编译不修复，仅 prepare 使用"),
    maxRounds: z.number().optional().describe("最大修复轮数，默认 3，上限硬截断为 3"),
  }),

  execute: async (args: Args) => {
    try {
      if (args.action === "prepare") return prepare(args)
      if (args.action === "build") return build()
      if (args.action === "apply") return apply(args)
      if (args.action === "rollback") return rollback()
      return finish()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (state) push(`error: ${message}`)
      return fail(message)
    }
  },
})

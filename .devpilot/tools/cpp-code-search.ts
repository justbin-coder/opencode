/**
 * cpp-code-search：C++ 需求-代码关联检索工具
 *
 * 输入：E1 结构化需求卡片（JSON）
 * 输出：Top-5 相关代码单元（文件路径、类名、函数名、关联度分数、等级标签）
 *
 * 前置条件：必须先在 devpilot TUI 中运行 `/index <C++代码库路径>` 构建索引。
 *
 * 离线交付约束（CUSTOM）：
 *   本文件不得 import 任何外部 npm 包（包括 @opencode-ai/plugin、zod），
 *   因为离线客户侧 ~/.devpilot/ 下没有 node_modules，devpilot 二进制也不会
 *   把 bundled 依赖暴露给用户工具的动态 import 解析路径。
 *   —— args 通过 factory `(z) => shape` 拿到 opencode 内嵌的 zod。
 *   —— tool() 直接内联成 identity helper。
 */

import { spawnSync } from "child_process"
import { existsSync, readFileSync } from "fs"
import path from "path"

// CUSTOM: 内联 identity helper，替代 @opencode-ai/plugin 的 tool()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tool = <T>(def: T): T => def

interface IndexMetadata {
  code_root: string
  built_at: string
  file_count: number
  chunk_count: number
  embedding_model: string
  version: string
}

// 索引目录路径：相对于 devpilot 的 session 工作目录（即客户 C++ 项目根目录）
// 构建索引时通过 TUI /index <代码库路径> 触发，索引写到 <代码库路径>/.opencode-index/
// 启动 devpilot 时需在同一个 C++ 项目根目录下运行，两者路径保持一致
const INDEX_DIR = path.join(process.cwd(), ".opencode-index")
const METADATA_PATH = path.join(INDEX_DIR, "metadata.json")

/** 检查索引是否就绪 */
function checkIndex(): { ok: boolean; error?: string; meta?: IndexMetadata } {
  if (!existsSync(METADATA_PATH)) {
    return {
      ok: false,
      error: `索引未构建。请在 devpilot TUI 中输入：/index <C++代码库路径>\n索引会写到 <C++代码库路径>/.opencode-index/\n然后在该 C++ 代码库根目录启动 devpilot 即可自动读取索引。`,
    }
  }
  const meta: IndexMetadata = JSON.parse(readFileSync(METADATA_PATH, "utf-8"))
  if (meta.version !== "1.0.0") {
    return { ok: false, error: `索引版本 ${meta.version} 不兼容，请重新构建：/index <代码库路径>` }
  }
  return { ok: true, meta }
}

// 用户工具回调参数类型（运行时由 opencode 内部的 zod schema 校验后传入）
interface CppSearchArgs {
  requirement: {
    id: string
    description: string
    acceptance_criteria?: string[]
  }
  top_k: number
}

export default tool({
  description: `搜索与 C++ 代码库相关的需求-代码关联信息。

输入：E1 结构化需求卡片（JSON 格式，含 id、description、acceptance_criteria）
输出：Top-5 最相关代码单元，包含文件路径、类名、函数名、关联度分数（0~1）、等级标签（High/Medium/Low）

使用场景：
- 用户输入需求卡片，需要找到对应的 C++ 实现代码
- 需要了解某个功能由哪些类/函数实现

注意：索引必须提前通过 devpilot TUI 的 /index <代码库路径> 构建，否则返回错误提示。`,

  // CUSTOM: args 使用 factory 形式，避免 import zod；z 由 opencode 注入
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: (z: any) => ({
    requirement: z
      .object({
        id: z.string().describe("需求卡片 ID，如 REQ-01"),
        description: z.string().describe("需求功能描述（必填，查询主要依据）"),
        acceptance_criteria: z.array(z.string()).optional().describe("验收标准列表（可选，辅助查询）"),
      })
      .describe("E1 结构化需求卡片"),
    top_k: z.number().int().min(1).max(10).default(5).describe("返回结果数量，默认 5"),
  }),

  execute: async (args: CppSearchArgs) => {
    // 1. 检查索引元信息
    const check = checkIndex()
    if (!check.ok) {
      return JSON.stringify({ error: check.error })
    }
    const meta = check.meta!

    // 2. 拼接查询文本
    const queryText = [args.requirement.description, ...(args.requirement.acceptance_criteria ?? [])].join(" ")

    // 3. 通过 process.execPath 调用自身 index --search 子命令
    //    process.execPath 在 Bun compiled binary 中指向 devpilot binary 本身
    const result = spawnSync(
      process.execPath,
      [
        "index",
        "_", // <path> positional arg（search 模式下忽略实际值）
        "--search",
        `--index-dir=${INDEX_DIR}`,
        `--query=${queryText}`,
        `--top-k=${args.top_k}`,
      ],
      { encoding: "utf-8", timeout: 10000 },
    )

    if (result.status !== 0) {
      return JSON.stringify({
        error: result.stderr || "检索失败，请确认索引已构建（使用 /index <路径>）",
      })
    }

    const searchResult: { index_info: unknown; results: Array<Record<string, unknown>> } = JSON.parse(result.stdout)
    const indexAge = Math.round((Date.now() - new Date(meta.built_at).getTime()) / 1000 / 60)

    // 4. 格式化输出（JSON + Markdown 双格式）
    const mdTable = [
      `## 需求-代码关联检索结果（${args.requirement.id}）`,
      "",
      `**查询：** ${queryText.slice(0, 80)}${queryText.length > 80 ? "..." : ""}`,
      `**索引：** ${meta.code_root}（${indexAge} 分钟前构建，共 ${meta.chunk_count} 个代码单元）`,
      "",
      "| # | 文件 | 类 | 函数 | 关联度 | 等级 |",
      "|---|------|----|------|--------|------|",
      ...searchResult.results.map(
        (r) =>
          `| ${r.rank} | \`${r.file}\` | ${r.class ?? "-"} | \`${r.function ?? "-"}\` | ${r.score} | **${r.label}** |`,
      ),
    ].join("\n")

    return JSON.stringify({
      json: {
        requirement_id: args.requirement.id,
        query: queryText,
        ...searchResult,
      },
      markdown: mdTable,
    })
  },
})

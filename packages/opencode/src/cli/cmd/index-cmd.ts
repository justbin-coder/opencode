// CUSTOM: DevPilot — C++ 代码库索引构建子命令
// 用法（build 模式）：devpilot index <代码库路径>
// 用法（search 模式）：devpilot index <ignored> --search --index-dir=<dir> --query=<text> [--top-k=5]
// Embedding 通过 HTTP 调用 /v1/embeddings API（零 native 依赖）
import { cmd } from "./cmd"

export const IndexCommand = cmd<
  {},
  {
    path: string
    search?: boolean
    "index-dir"?: string
    query?: string
    "top-k"?: number
  }
>({
  command: "index <path>",
  describe: "构建 C++ 代码库的离线语义索引",
  builder: (yargs) =>
    yargs
      .positional("path", {
        type: "string",
        demandOption: true,
        describe: "C++ 代码库根目录",
      })
      // 以下选项仅供 cpp-code-search.ts 内部调用，隐藏不展示给用户
      .option("search", { type: "boolean", hidden: true })
      .option("index-dir", { type: "string", hidden: true })
      .option("query", { type: "string", hidden: true })
      .option("top-k", { type: "number", default: 5, hidden: true }),
  handler: async (argv) => {
    if (argv.search) {
      // 检索模式（供 cpp-code-search.ts subprocess 调用）
      const { searchMain } = await import("../../../../../scripts/cpp-indexer/search")
      await searchMain({
        indexDir: argv["index-dir"]!,
        query: argv.query!,
        topK: argv["top-k"]!,
      })
    } else {
      // 构建模式（用户通过 /index 命令触发）
      const { buildMain } = await import("../../../../../scripts/cpp-indexer/index")
      await buildMain(argv.path)
    }
  },
})

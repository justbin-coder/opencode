import tool from "../../tools/cpp-compile-fix"
import fs from "fs"

const arg = process.argv[2]
const txt = arg && fs.existsSync(arg) ? fs.readFileSync(arg, "utf-8") : arg ?? await Bun.stdin.text()
const seq = JSON.parse(txt) as Record<string, unknown>[]
const out: unknown[] = []

for (const arg of seq) {
  out.push(JSON.parse(await tool.execute(arg)))
}

console.log(JSON.stringify(out, null, 2))

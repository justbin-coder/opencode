import { createHash } from "node:crypto"
import { createRequire } from "node:module"
import { readFile } from "node:fs/promises"
import type { CodeChunk } from "./types"

type NodeLike = {
  type: string
  text: string
  startIndex: number
  endIndex: number
  startPosition: {
    row: number
    column: number
  }
  endPosition: {
    row: number
    column: number
  }
  namedChildren: NodeLike[]
  childForFieldName(name: string): NodeLike | null
}

type ParserLike = {
  parse(source: string): {
    rootNode: NodeLike
  }
}

const req = createRequire(import.meta.url)
const parser = init()

/** 读取文件并解析 C++ 代码单元（abs=绝对路径，rel=索引中存储的相对路径） */
export async function parseFile(abs: string, rel: string): Promise<CodeChunk[]> {
  const source = await readFile(abs, "utf-8")
  return parseCppCode(source, rel)
}

export function parseCppCode(source: string, file: string): CodeChunk[] {
  const lines = source.split(/\r?\n/)
  if (parser) return ast(parser.parse(source).rootNode, source, lines, file)
  return scan(source, lines, file)
}

function init() {
  try {
    const Parser = req("tree-sitter")
    const Cpp = req("tree-sitter-cpp")
    const parser = new Parser()
    parser.setLanguage(Cpp)
    return parser as ParserLike
  } catch {
    return null
  }
}

function ast(root: NodeLike, source: string, lines: string[], file: string) {
  const chunks: CodeChunk[] = []

  function walk(node: NodeLike, cls: string | null) {
    const next = node.type === "class_specifier" || node.type === "struct_specifier" ? cname(node) : cls
    if (node.type === "function_definition") chunks.push(chunk(node, source, lines, file, next))
    node.namedChildren.forEach((child) => walk(child, next))
  }

  walk(root, null)
  return chunks
}

function scan(source: string, lines: string[], file: string) {
  const chunks: CodeChunk[] = []
  const stack: Array<{ cls: string; depth: number }> = []
  const rows = starts(source, lines)
  let depth = 0

  lines.forEach((line, row) => {
    const cls = line.match(/^\s*(?:template\s*<[^>]+>\s*)?(class|struct)\s+([A-Za-z_]\w*)\b/)
    if (cls && line.includes("{")) stack.push({ cls: cls[2], depth: depth + brace(line) })

    const fn = line.match(
      /^\s*(?!if\b|for\b|while\b|switch\b|catch\b|return\b)(?:[\w:<>~*&]+\s+)*([A-Za-z_~]\w*)\s*\([^;{}]*\)\s*(?::\s*[^{}]+)?\s*\{/,
    )
    if (fn) {
      const start = rows[row] + line.indexOf(fn[0])
      const end = body(source, line.indexOf("{", line.indexOf(fn[0])) + rows[row])
      const text = source.slice(start, end + 1)
      const node = {
        type: "function_definition",
        text,
        startIndex: start,
        endIndex: end + 1,
        startPosition: {
          row,
          column: line.indexOf(fn[0]),
        },
        endPosition: point(source, end + 1),
        namedChildren: [
          {
            type: "identifier",
            text: fn[1],
            startIndex: start,
            endIndex: start + fn[0].length,
            startPosition: {
              row,
              column: line.indexOf(fn[0]),
            },
            endPosition: point(source, start + fn[0].length),
            namedChildren: [],
            childForFieldName() {
              return null
            },
          },
        ],
        childForFieldName(name: string) {
          if (name === "body") {
            return {
              type: "compound_statement",
              text: source.slice(line.indexOf("{", line.indexOf(fn[0])) + rows[row], end + 1),
              startIndex: line.indexOf("{", line.indexOf(fn[0])) + rows[row],
              endIndex: end + 1,
              startPosition: point(source, line.indexOf("{", line.indexOf(fn[0])) + rows[row]),
              endPosition: point(source, end + 1),
              namedChildren: [],
              childForFieldName() {
                return null
              },
            }
          }
          if (name === "declarator") return this.namedChildren[0]
          return null
        },
      }
      chunks.push(chunk(node, source, lines, file, stack.at(-1)?.cls ?? null))
    }

    depth += brace(line)
    while (stack.length && depth < stack[stack.length - 1].depth) stack.pop()
  })

  return chunks
}

function chunk(node: NodeLike, source: string, lines: string[], file: string, cls: string | null): CodeChunk {
  const body = node.childForFieldName("body") ?? node.namedChildren.find((child) => child.type === "compound_statement")
  const fn = fname(node.childForFieldName("declarator") ?? node) ?? null
  const signature = source.slice(node.startIndex, body?.startIndex ?? node.endIndex).trim()
  const doc_comment = doc(lines, node.startPosition.row)

  return {
    id: createHash("sha256")
      .update(`${file}:${cls ?? ""}:${fn ?? ""}:${signature}`)
      .digest("hex")
      .slice(0, 8),
    file,
    class: cls,
    function: fn,
    signature,
    doc_comment,
    body_snippet: (body?.text ?? node.text).replace(/\s+/g, " ").trim().slice(0, 200),
    start_line: node.startPosition.row + 1,
    end_line: node.endPosition.row + 1,
    embedding_id: -1,
  }
}

function cname(node: NodeLike): string | null {
  return node.childForFieldName("name")?.text ?? node.namedChildren.find((child) => child.type === "type_identifier")?.text ?? null
}

function fname(node: NodeLike): string | null {
  if (
    node.type === "identifier" ||
    node.type === "field_identifier" ||
    node.type === "type_identifier" ||
    node.type === "destructor_name"
  )
    return node.text

  if (node.type === "qualified_identifier") return fname(node.namedChildren[node.namedChildren.length - 1])

  const next =
    node.childForFieldName("declarator") ??
    node.namedChildren.find((child) => child.type !== "parameter_list" && child.type !== "field_initializer_list") ??
    null
  if (!next) return null
  return fname(next)
}

function doc(lines: string[], row: number) {
  const docs: string[] = []
  for (let i = row - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (!line) break
    if (!line.startsWith("//")) break
    docs.unshift(line.replace(/^\/\/\s?/, ""))
  }
  return docs.join("\n")
}

function starts(source: string, lines: string[]) {
  return lines.reduce(
    (all, line, i) => {
      if (i > 0) all.push(all[i - 1] + lines[i - 1].length + 1)
      return all
    },
    [0],
  )
}

function brace(line: string) {
  return [...line].reduce((sum, char) => sum + (char === "{" ? 1 : char === "}" ? -1 : 0), 0)
}

function body(source: string, start: number) {
  let depth = 0
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++
    if (source[i] === "}") depth--
    if (depth === 0) return i
  }
  return source.length - 1
}

function point(source: string, pos: number) {
  const text = source.slice(0, pos)
  const lines = text.split(/\r?\n/)
  return {
    row: lines.length - 1,
    column: lines[lines.length - 1].length,
  }
}

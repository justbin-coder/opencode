import { expect, test } from "bun:test"
import { parseCppCode } from "./parser"

test("提取普通函数", () => {
  const chunks = parseCppCode(
    `
// 计算加法
int add(int a, int b) {
  return a + b;
}
`,
    "src/math.cpp",
  )

  expect(chunks).toHaveLength(1)
  expect(chunks[0].file).toBe("src/math.cpp")
  expect(chunks[0].class).toBeNull()
  expect(chunks[0].function).toBe("add")
  expect(chunks[0].signature).toBe("int add(int a, int b)")
  expect(chunks[0].doc_comment).toBe("计算加法")
  expect(chunks[0].start_line).toBe(3)
  expect(chunks[0].end_line).toBe(5)
})

test("提取类方法并记录类名", () => {
  const chunks = parseCppCode(
    `
class Counter {
public:
  // 递增计数
  int inc(int delta) {
    return delta + 1;
  }
};
`,
    "src/counter.cpp",
  )

  expect(chunks).toHaveLength(1)
  expect(chunks[0].class).toBe("Counter")
  expect(chunks[0].function).toBe("inc")
  expect(chunks[0].signature).toBe("int inc(int delta)")
  expect(chunks[0].doc_comment).toBe("递增计数")
})

test("提取构造函数", () => {
  const chunks = parseCppCode(
    `
struct Point {
  // 初始化坐标
  Point(int x, int y) : x_(x), y_(y) {}
  int x_;
  int y_;
};
`,
    "src/point.cpp",
  )

  expect(chunks).toHaveLength(1)
  expect(chunks[0].class).toBe("Point")
  expect(chunks[0].function).toBe("Point")
  expect(chunks[0].signature).toBe("Point(int x, int y) : x_(x), y_(y)")
  expect(chunks[0].doc_comment).toBe("初始化坐标")
})

test("每个 chunk 有唯一 id", () => {
  const chunks = parseCppCode(
    `
int add(int a, int b) {
  return a + b;
}

int sub(int a, int b) {
  return a - b;
}
`,
    "src/math.cpp",
  )

  expect(chunks).toHaveLength(2)
  expect(chunks[0].id).toMatch(/^[0-9a-f]{8}$/)
  expect(chunks[1].id).toMatch(/^[0-9a-f]{8}$/)
  expect(chunks[0].id).not.toBe(chunks[1].id)
})

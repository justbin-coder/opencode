import { afterEach, describe, expect, test } from "bun:test"
import fs from "fs"
import os from "os"
import path from "path"

import { discoverTarget, validateAppendOnly } from "../../tools/cpp-compile-fix"

const dirs: string[] = []

function temp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cpp-compile-fix-"))
  dirs.push(dir)
  return dir
}

function write(file: string, txt: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, txt)
}

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

describe("validateAppendOnly", () => {
  test("accepts pure append diffs", () => {
    const txt = ["--- a/tests/CMakeLists.txt", "+++ b/tests/CMakeLists.txt", "@@ -1,1 +1,2 @@", "+add_executable(foo foo.cpp)"].join(
      "\n",
    )
    expect(validateAppendOnly(txt)).toBe(true)
  })

  test("rejects diffs with deletion lines", () => {
    const txt = ["--- a/tests/CMakeLists.txt", "+++ b/tests/CMakeLists.txt", "@@ -1,2 +1,1 @@", "-add_executable(foo foo.cpp)"].join(
      "\n",
    )
    expect(validateAppendOnly(txt)).toBe(false)
  })

  test("accepts context hunks with appended lines", () => {
    const txt = [
      "--- a/tests/CMakeLists.txt",
      "+++ b/tests/CMakeLists.txt",
      "@@ -1,2 +1,3 @@",
      " find_package(GTest REQUIRED)",
      " add_executable(calculator_test calculator_test.cpp ../src/calculator.cpp)",
      "+target_compile_features(calculator_test PRIVATE cxx_std_17)",
    ].join("\n")
    expect(validateAppendOnly(txt)).toBe(true)
  })

  test("accepts empty diffs", () => {
    expect(validateAppendOnly("")).toBe(true)
  })
})

describe("discoverTarget", () => {
  test("finds targets from add_executable", () => {
    const dir = temp()
    const file = path.join(dir, "tests", "calculator_test.cpp")
    write(
      path.join(dir, "tests", "CMakeLists.txt"),
      "add_executable(calculator_test calculator_test.cpp ../src/calculator.cpp)\n",
    )
    write(file, "// test\n")
    expect(discoverTarget(dir, file).target).toBe("calculator_test")
  })

  test("finds executable names with multiple sources", () => {
    const dir = temp()
    const file = path.join(dir, "tests", "my_test.cpp")
    write(
      path.join(dir, "tests", "CMakeLists.txt"),
      "add_executable(my_test my_test.cpp helper.cpp)\n",
    )
    write(file, "// test\n")
    expect(discoverTarget(dir, file).target).toBe("my_test")
  })

  test("finds targets from target_sources without add_executable", () => {
    const dir = temp()
    const file = path.join(dir, "tests", "my_test.cpp")
    write(
      path.join(dir, "tests", "CMakeLists.txt"),
      ["add_library(core STATIC ../src/core.cpp)", "target_sources(my_test PRIVATE my_test.cpp helper.cpp)"].join("\n"),
    )
    write(file, "// test\n")
    expect(discoverTarget(dir, file).target).toBe("my_test")
  })

  test("returns undefined when no target matches", () => {
    const dir = temp()
    const file = path.join(dir, "tests", "missing_test.cpp")
    write(path.join(dir, "tests", "CMakeLists.txt"), "add_executable(other other.cpp)\n")
    write(file, "// test\n")
    expect(discoverTarget(dir, file).target).toBeUndefined()
  })
})

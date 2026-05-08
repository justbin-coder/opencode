#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
out="$root/scenario-results.json"
log="$root/scenario.log"
seq="$root/.seq.json"
res="$root/.res.json"

rm -f "$out" "$log" "$seq" "$res"
rm -rf "$root/build"

orig="$root/tests/calculator_test.cpp"
tmp="$root/tests/calculator_test.orig.cpp"
bad="$root/tests/calculator_test_broken.cpp"

run() {
  printf '%s' "$1" >"$seq"
  local txt
  txt="$(bun "$root/tool.ts" "$seq")"
  printf '%s\n' "$txt" >>"$log"
  printf '%s' "$txt" >"$res"
  printf '%s' "$txt"
}

json() {
  bun -e 'const data = await Bun.file(process.argv[1]).json(); console.log(eval(process.argv[2]))' "$1" "$2"
}

printf '%s\n' "Running E3 scenarios in $root" >>"$log"

s1="FAIL"
s2="FAIL"
s3="FAIL"
s4="FAIL"
s5="FAIL"
s6="FAIL"
note=""

r1="$(run '[{"action":"prepare","testFile":"tests/calculator_test.cpp"}]')"
if [ "$(json "$res" 'data[0].status')" = "error" ] && [[ "$(json "$res" 'data[0].message')" == *"CMakeCache.txt 不存在"* ]]; then
  s1="PASS"
fi

if cmake -S "$root" -B "$root/build" -DCMAKE_BUILD_TYPE=Debug >>"$log" 2>&1; then
  s2="PASS"
else
  if grep -qi "gtest" "$log"; then
    s2="SKIP"
    s3="SKIP"
    s4="SKIP"
    note="gtest unavailable"
  fi
fi

if [ "$s2" = "PASS" ]; then
  r3="$(run '[{"action":"prepare","testFile":"tests/calculator_test.cpp","dryRun":true},{"action":"build"},{"action":"finish"}]')"
  if [ "$(json "$res" 'data[1].status')" = "pass" ] && [ "$(json "$res" 'data[2].status')" = "done" ]; then
    printf '%s\n' "Round 0: 0 errors"
    s3="PASS"
  fi

  cp "$orig" "$tmp"
  cat >"$bad" <<'EOF'
#include <gtest/gtest.h>
#include "../src/nonexistent.h"

TEST(CalculatorTest, Add) {
    Calculator calc;
    EXPECT_EQ(calc.add(1, 2), 3);
}
EOF
  cp "$bad" "$orig"
  find "$root/build" \( -name 'calculator_test.cpp.o' -o -name 'calculator_test.cpp.o.d' \) -delete
  r4="$(run '[{"action":"prepare","testFile":"tests/calculator_test.cpp"},{"action":"build"},{"action":"rollback"}]')"
  cp "$tmp" "$orig"
  rm -f "$tmp"
  if [ "$(json "$res" 'data[1].status')" = "fail" ] && [ "$(json "$res" 'String(data[1].errors.length > 0)')" = "true" ]; then
    s4="PASS"
  fi
fi

cat >"$seq" <<'EOF'
[
  {
    "action": "prepare",
    "testFile": "tests/calculator_test.cpp"
  },
  {
    "action": "apply",
    "patchFile": "src/calculator.cpp",
    "patch": "@@ -1,2 +1,2 @@\n #include \"calculator.h\"\n-int Calculator::add(int a, int b) { return a + b; }\n+int Calculator::add(int a, int b) { return a + b + 1; }"
  },
  {
    "action": "finish"
  }
]
EOF
r5="$(bun "$root/tool.ts" "$seq")"
printf '%s\n' "$r5" >>"$log"
printf '%s' "$r5" >"$res"
if [ "$(json "$res" 'data[1].status')" = "rejected" ] && [[ "$(json "$res" 'data[1].reason')" == *"白名单"* ]]; then
  s5="PASS"
fi

cat >"$seq" <<'EOF'
[
  {
    "action": "prepare",
    "testFile": "tests/calculator_test.cpp"
  },
  {
    "action": "apply",
    "patchFile": "tests/CMakeLists.txt",
    "patch": "@@ -1,2 +1,1 @@\n-find_package(GTest REQUIRED)\n add_executable(calculator_test calculator_test.cpp ../src/calculator.cpp)"
  },
  {
    "action": "finish"
  }
]
EOF
r6="$(bun "$root/tool.ts" "$seq")"
printf '%s\n' "$r6" >>"$log"
printf '%s' "$r6" >"$res"
if [ "$(json "$res" 'data[1].status')" = "rejected" ] && [[ "$(json "$res" 'data[1].reason')" == *"仅允许纯追加"* ]]; then
  s6="PASS"
fi

cat >"$out" <<EOF
{
  "scenario1": "$s1",
  "scenario2": "$s2",
  "scenario3": "$s3",
  "scenario4": "$s4",
  "scenario5": "$s5",
  "scenario6": "$s6",
  "note": "$note"
}
EOF

cat "$out"

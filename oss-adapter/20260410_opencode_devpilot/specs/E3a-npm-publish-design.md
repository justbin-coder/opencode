# DevPilot npm 发布（macOS/Linux）Design Spec
> **OSS 定制场景：由 oss-adapter 生成，替代 superpowers:brainstorming 输出。**
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to generate the implementation plan from this spec. Process one Epic spec at a time.

**Goal:** 将 DevPilot fork 发布到 npm，支持 macOS（arm64/x64）和 Linux（x64）通过 `npm i -g devpilot-ai` 安装，开发者本机可直接验证 E1/E2 功能，同时为 E3b Windows 安装包提供统一的构建基础设施。

**Architecture:** 复用 opencode 现有的多平台 npm 分发架构（主包 + 平台子包模式）：主包 `devpilot-ai` 包含 Node wrapper（`bin/devpilot`）和 `postinstall.mjs`，平台子包 `devpilot-darwin-arm64` / `devpilot-darwin-x64` / `devpilot-linux-x64` 各含对应预编译二进制。GitHub Actions 增加多平台 build matrix，通过 Bun 的 `--compile` 产出各平台单文件二进制，发布到 npm。Skills/Commands 文件随主包分发，postinstall 时自动部署到全局配置目录。

**Tech Stack:** Bun `--compile`（单文件二进制编译）、npm（包发布）、GitHub Actions matrix（macOS-14/macOS-13/ubuntu-latest runner）、Node.js wrapper（bin/devpilot）、xdg-basedir（全局路径 `~/.config/devpilot/`）

**OSS Version:** v1.3.9（9d3244efe）— 实施前确认版本未变更

---

## 需求范围

| REQ | 需求名称 | 定制级别 | 优先级 |
|-----|---------|---------|--------|
| REQ-04a | macOS/Linux npm 发布（开发验证） | L3-Patch | P0（验证用） |

## 架构方案

### npm 包结构（参考 opencode 现有分发方式）

```
devpilot-ai（主包）
  bin/
    devpilot          ← Node wrapper（改自 bin/opencode）
  script/
    postinstall.mjs   ← 安装后 hardlink 平台二进制 + 部署 Skills
  skills/             ← 打包进主包的预置 Skills 文件
    req-structuring/
    cpp-test-gen/
    cpp-compile-fix/
  commands/
    structurize-req.md
    gen-test.md
  package.json        ← name: "devpilot-ai", bin: { devpilot: "./bin/devpilot" }

devpilot-darwin-arm64（平台子包）
  bin/
    devpilot          ← Bun 编译的 macOS ARM64 二进制

devpilot-darwin-x64（平台子包）
  bin/
    devpilot          ← Bun 编译的 macOS x64 二进制

devpilot-linux-x64（平台子包）
  bin/
    devpilot          ← Bun 编译的 Linux x64 二进制
```

### postinstall.mjs 改造

在 opencode 原 postinstall.mjs 基础上（L3-Patch），新增 Skills 部署逻辑：

```javascript
// 新增：部署 Skills 到全局配置目录
async function deploySkills() {
  const skillsSrc = path.join(__dirname, "skills")
  const commandsSrc = path.join(__dirname, "commands")

  // macOS/Linux: ~/.config/devpilot/
  // (xdg-basedir 已在 global/index.ts 改为 devpilot)
  const configDir = process.env.XDG_CONFIG_HOME
    ? path.join(process.env.XDG_CONFIG_HOME, "devpilot")
    : path.join(os.homedir(), ".config", "devpilot")

  await fs.cp(skillsSrc, path.join(configDir, "skills"), { recursive: true, force: true })
  await fs.cp(commandsSrc, path.join(configDir, "commands"), { recursive: true, force: true })
  console.log(`DevPilot skills deployed to ${configDir}`)
}
```

### GitHub Actions 构建 Matrix

```yaml
# .github/workflows/build-npm.yml
jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-14        # Apple Silicon
            target: bun-darwin-arm64
            pkg: devpilot-darwin-arm64
          - os: macos-13        # Intel Mac
            target: bun-darwin-x64
            pkg: devpilot-darwin-x64
          - os: ubuntu-latest   # Linux
            target: bun-linux-x64-baseline
            pkg: devpilot-linux-x64
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - name: Build binary
        run: |
          bun build packages/opencode/src/index.ts \
            --compile --target=${{ matrix.target }} \
            --outfile packages/${{ matrix.pkg }}/bin/devpilot
      - name: Publish platform package
        run: npm publish packages/${{ matrix.pkg }} --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  publish-main:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: npm publish packages/devpilot-ai --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 关键实现路径

| 任务 | 类型 | 关键文件 |
|------|------|---------|
| 主包 package.json 改名 | L3-Patch | `packages/opencode/package.json` → name: `devpilot-ai`，bin: `devpilot` |
| bin wrapper 改名 | L3-Patch | `packages/opencode/bin/opencode` → `bin/devpilot`，内部 binary 名改为 `devpilot` |
| postinstall.mjs 新增 Skills 部署 | L3-Patch | `packages/opencode/script/postinstall.mjs`（新增 deploySkills()，~20行） |
| 平台子包 package.json | L3-Patch | 各平台包 name 改为 `devpilot-{platform}-{arch}` |
| Skills 文件纳入主包 | L0-配置 | 将 `.opencode/skills/` 复制到 `packages/opencode/skills/` 随包发布 |
| GitHub Actions build matrix | 新建 | `.github/workflows/build-npm.yml` |
| npm 账号配置 | 运维 | npm 组织 or 个人账号，secrets.NPM_TOKEN |

## 安装体验（开发者验证）

```bash
# 安装
npm i -g devpilot-ai

# 验证
devpilot --version                    # 显示 DevPilot x.x.x
devpilot                              # 进入 TUI，显示 DevPilot logo
                                      # 首次运行弹出配置向导（E2 功能）

# 确认 Skills 已部署
ls ~/.config/devpilot/skills/         # req-structuring/ cpp-test-gen/ cpp-compile-fix/

# 任意目录验证 Skills 全局可用
mkdir /tmp/test-project && cd /tmp/test-project
devpilot                              # TUI 内 /structurize-req 命令可用
```

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| npm 包名 `devpilot-ai` 已被占用 | 发布前用 `npm info devpilot-ai` 检查；备选名：`devpilot-cli`、`@yourco/devpilot` |
| Skills 部署目录权限不足 | postinstall catch 错误，提示手动运行 `devpilot --deploy-skills` |
| Bun 编译产物在目标平台不可执行 | CI 矩阵各平台实际运行 `devpilot --version` 做冒烟测试 |

## 测试策略

**本机（macOS）验证路径：**
1. `npm i -g devpilot-ai` → `devpilot --version` ✓
2. `devpilot` → TUI 显示 DevPilot logo，logo 无布局异常 ✓
3. 首次运行向导弹出（E2），填写 `http://localhost:11434` ✓
4. `ls ~/.config/devpilot/skills/` 含三套 Skills ✓
5. 新建空目录，`devpilot` → TUI 内 `/structurize-req` 可触发 ✓
6. `devpilot config show` 显示已配置端点 ✓

## 约束与注意事项

- 依赖 E1 完成（global/index.ts app name 已改为 devpilot）
- npm 包名需提前注册，避免抢注风险
- Skills 文件随包发布会暴露内容，但客户安装后可在 `~/.config/devpilot/` 查看——此为可接受范围（Skills 是业务配置，非核心算法）
- 本 Epic 不包含 Windows 构建，Windows 由 E3b 独立处理
- Bun `--compile` 产物包含运行时，无需客户预装 Bun/Node

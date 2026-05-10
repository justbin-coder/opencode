# Repo Summary: opencode
Generated: 2026-04-10T06:13:48Z

## Metadata
- Language: Node.js/TypeScript
- Name: opencode
- Version: ?
- License: MIT License

## Directory Structure (depth=3)
```
/Users/justbin/project/opensource/opencode
├── docs
│   └── superpowers
│       └── plans
├── docs-bak
│   └── superpowers
│       ├── plans
│       └── specs
├── github
│   └── script
├── hd-docs
├── infra
├── nix
│   └── scripts
├── node_modules
│   ├── @actions
│   │   └── artifact -> ../.bun/@actions+artifact@5.0.1/node_modules/@actions/artifact
│   ├── @aws-sdk
│   │   └── client-s3 -> ../.bun/@aws-sdk+client-s3@3.933.0/node_modules/@aws-sdk/client-s3
│   ├── @opencode-ai
│   │   ├── plugin -> ../../packages/plugin
│   │   ├── script -> ../../packages/script
│   │   └── sdk -> ../../packages/sdk/js
│   ├── @tsconfig
│   │   └── bun -> ../.bun/@tsconfig+bun@1.0.9/node_modules/@tsconfig/bun
│   ├── @types
│   │   ├── better-sqlite3 -> ../.bun/@types+better-sqlite3@7.6.13/node_modules/@types/better-sqlite3
│   │   ├── mime-types -> ../.bun/@types+mime-types@3.0.1/node_modules/@types/mime-types
│   │   └── node -> ../.bun/@types+node@22.13.9/node_modules/@types/node
│   ├── @typescript
│   │   └── native-preview -> ../.bun/@typescript+native-preview@7.0.0-dev.20251207.1/node_modules/@typescript/native-preview
│   ├── @xenova
│   │   └── transformers -> ../.bun/@xenova+transformers@2.17.2/node_modules/@xenova/transformers
│   ├── better-sqlite3 -> .bun/better-sqlite3@12.8.0/node_modules/better-sqlite3
│   ├── glob -> .bun/glob@13.0.5/node_modules/glob
│   ├── hnswlib-node -> .bun/hnswlib-node@3.0.0/node_modules/hnswlib-node
│   ├── husky -> .bun/husky@9.1.7/node_modules/husky
│   ├── prettier -> .bun/prettier@3.6.2/node_modules/prettier
│   ├── semver -> .bun/semver@7.7.4/node_modules/semver
│   ├── sharp -> .bun/sharp@0.34.5/node_modules/sharp
│   ├── sst -> .bun/sst@3.18.10/node_modules/sst
│   ├── tree-sitter -> .bun/tree-sitter@0.25.0/node_modules/tree-sitter
│   ├── tree-sitter-cpp -> .bun/tree-sitter-cpp@0.23.4+7aa2583e580bc282/node_modules/tree-sitter-cpp
│   ├── turbo -> .bun/turbo@2.8.13/node_modules/turbo
│   └── typescript -> .bun/typescript@5.8.2/node_modules/typescript
├── oss-adapter
│   ├── 20260404_opencode_codesearch
│   │   ├── agents
│   │   ├── analysis
│   │   ├── changes
│   │   ├── input
│   │   ├── plan
│   │   ├── report
│   │   └── specs
│   └── 20260410_opencode_devpilot
│       ├── agents
│       ├── analysis
│       ├── changes
│       ├── input
│       ├── plan
│       ├── report
│       └── specs
├── oss-adapterbak
│   └── 20260331_opencode
│       ├── agents
│       ├── analysis
│       ├── input
│       ├── plan
│       └── report
├── packages
│   ├── app
│   │   ├── e2e
│   │   ├── node_modules
│   │   ├── public
│   │   ├── script
│   │   └── src
│   ├── console
│   │   ├── app
│   │   ├── core
│   │   ├── function
```

## File Stats
- Total files: 4580
- By extension (top 10):
  - .svg: 1249
  - .ts: 1050
  - .mdx: 643
  - .tsx: 377
  - .png: 356
  - .json: 246
  - .md: 139
  - .css: 122
  - .sql: 68
  - .aac: 45

## README (excerpt)
```markdown
<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/opencode-ai"><img alt="npm" src="https://img.shields.io/npm/v/opencode-ai?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/opencode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/opencode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

### Installation

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Package managers
npm i -g opencode-ai@latest        # or bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
```

## Docs Directory
docs/superpowers/plans/2026-04-04-cpp-code-search.md

## Key Files Detected
- tsconfig.json
- .github/workflows

## Probable Entry Points


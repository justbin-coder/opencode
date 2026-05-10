# Repo Summary: opencode
Generated: 2026-03-31T02:49:45Z

## Metadata
- Language: Node.js/TypeScript
- Name: opencode
- Version: ?
- License: MIT License

## Directory Structure (depth=3)
```
/Users/justbin/project/opensource/opencode
├── github
│   └── script
├── hd-docs
├── infra
├── nix
│   └── scripts
├── oss-adapter
│   └── 20260331_opencode
│       ├── agents
│       ├── analysis
│       ├── input
│       ├── plan
│       └── report
├── packages
│   ├── app
│   │   ├── e2e
│   │   ├── public
│   │   ├── script
│   │   └── src
│   ├── console
│   │   ├── app
│   │   ├── core
│   │   ├── function
│   │   ├── mail
│   │   └── resource
│   ├── containers
│   │   ├── base
│   │   ├── bun-node
│   │   ├── publish
│   │   ├── rust
│   │   ├── script
│   │   └── tauri-linux
│   ├── desktop
│   │   ├── scripts
│   │   ├── src
│   │   └── src-tauri
│   ├── desktop-electron
│   │   ├── icons
│   │   ├── resources
│   │   ├── scripts
│   │   └── src
│   ├── docs
│   │   ├── ai-tools
│   │   ├── essentials
│   │   ├── images
│   │   ├── logo
│   │   └── snippets
│   ├── enterprise
│   │   ├── public
│   │   ├── script
│   │   ├── src
│   │   └── test
│   ├── extensions
│   │   └── zed
│   ├── function
│   │   └── src
│   ├── identity
│   ├── opencode
│   │   ├── bin
│   │   ├── migration
│   │   ├── script
│   │   ├── specs
│   │   ├── src
│   │   └── test
│   ├── plugin
│   │   ├── script
│   │   └── src
│   ├── script
│   │   └── src
│   ├── sdk
│   │   └── js
│   ├── slack
│   │   └── src
│   ├── storybook
│   ├── ui
│   │   ├── script
│   │   └── src
│   ├── util
│   │   └── src
```

## File Stats
- Total files: 4437
- By extension (top 10):
  - .svg: 1249
  - .ts: 1037
  - .mdx: 643
  - .tsx: 377
  - .png: 356
  - .json: 221
  - .css: 122
  - .md: 93
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

## Key Files Detected
- tsconfig.json
- .github/workflows

## Probable Entry Points


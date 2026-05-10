# DevPilot 定制需求 — 航电软件

**项目：** opencode v1.3.9 → DevPilot 商业化交付
**客户：** 航电软件
**日期：** 2026-04-10

---

## REQ-01: DevPilot 品牌替换
**描述：** Fork opencode v1.3.9，将产品名、全局配置目录名、TUI logo、CLI 命令名全部替换为 DevPilot，不修改任何业务逻辑
**验收标准：**
- 运行 `devpilot` 进入 TUI，logo 显示 DevPilot 而非 opencode
- 全局配置目录为 `%APPDATA%\devpilot\`（Windows）/ `~/.config/devpilot/`（macOS/Linux）
- `which devpilot` 可找到可执行文件，opencode 命令不对客户暴露
**优先级：** P0

---

## REQ-02: E1/E2/E3 Skills 全局内置
**描述：** 将已实现的 req-structuring、cpp-test-gen、cpp-compile-fix 三套 skills/commands 预置到全局配置目录，客户项目无需手动放置 .opencode/
**验收标准：**
- 在任意新建项目目录下运行 devpilot，/structurize-req、/gen-test 命令可用
- 客户项目根目录无需存在 .opencode/ 目录
- skills 文件对客户不可见（位于系统级安装目录）
**优先级：** P0

---

## REQ-03: 本地模型端点配置向导
**描述：** 安装完成后首次运行时，引导用户填写本地推理服务地址（baseURL），写入全局 opencode.json，后续无需重复配置
**验收标准：**
- 首次运行 devpilot 时弹出配置向导提示
- 输入地址后写入全局 opencode.json 的 provider.qwen-local.options.baseURL 字段
- 配置完成后正常进入 TUI，可与模型正常对话
**优先级：** P0

---

## REQ-04: Windows 一键安装包
**描述：** 打包为 Windows .exe 安装程序（NSIS 或 Inno Setup），完成 CLI 安装 + PATH 注册 + 全局 skill 部署 + 快捷方式创建
**验收标准：**
- 管理员运行 devpilot-setup.exe，点击下一步完成安装
- 安装后打开新 PowerShell，`devpilot --version` 可执行
- 安装目录下存在 skills/ 子目录（含三套预置 skill）
- 控制面板「添加/删除程序」可见 DevPilot 条目
**优先级：** P1

---

## REQ-05: 模型端点事后修改命令
**描述：** 提供 `devpilot config set-endpoint <url>` 子命令，允许客户在安装后修改模型服务地址
**验收标准：**
- `devpilot config set-endpoint http://192.168.1.100:8080` 执行成功
- 执行后全局 opencode.json 中 baseURL 字段更新
- `devpilot config show` 可查看当前端点地址
**优先级：** P1

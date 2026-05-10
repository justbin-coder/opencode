# DevPilot Windows 安装包 Design Spec
> **OSS 定制场景：由 oss-adapter 生成，替代 superpowers:brainstorming 输出。**
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to generate the implementation plan from this spec. Process one Epic spec at a time.

**Goal:** 为 DevPilot 构建 Windows 一键安装包（devpilot-setup.exe），实现：安装 devpilot.exe 到 Program Files、注册 PATH 环境变量、将预置 Skills/Commands 部署到 `%APPDATA%\devpilot\`、创建桌面/开始菜单快捷方式、支持控制面板卸载。

**Architecture:** 使用 Inno Setup 编写 .iss 安装脚本，打包 devpilot.exe（E1 构建产物）+ 预置 Skills 文件。安装脚本负责：①将二进制安装到 `C:\Program Files\DevPilot\`；②向系统 PATH 注册该目录；③将 Skills/Commands 复制到 `%APPDATA%\devpilot\`（opencode 全局配置目录，E1 已改名）；④注册卸载信息。GitHub Actions 增加 Windows 构建 job，产出 devpilot-setup.exe artifact。

**Tech Stack:** Inno Setup 6.x（Windows 安装包，免费，支持中文、PATH 注册、卸载）、GitHub Actions（CI 构建，windows-latest runner）、Bun 编译（产出 devpilot.exe Windows 二进制）

**OSS Version:** v1.3.9（9d3244efe）— 实施前确认版本未变更

---

## 需求范围

| REQ | 需求名称 | 定制级别 | 优先级 |
|-----|---------|---------|--------|
| REQ-04 | Windows 一键安装包 | L3-Patch | P1 |

## 架构方案

### 文件结构

```
devpilot/                       ← 本 Epic 新增文件
  installer/
    devpilot.iss                ← Inno Setup 脚本（主文件）
    LICENSE.txt                 ← 安装协议（中文）
    assets/
      icon.ico                  ← DevPilot 应用图标
  .github/workflows/
    build-windows.yml           ← CI: 构建 devpilot.exe + 打包安装程序
```

### 安装包行为

```
用户双击 devpilot-setup.exe
  ├── 欢迎页（DevPilot 品牌、版本号）
  ├── 许可协议页
  ├── 安装目录选择（默认 C:\Program Files\DevPilot\）
  ├── 安装中：
  │    ├── 复制 devpilot.exe → {app}\devpilot.exe
  │    ├── 复制 skills\ → {app}\skills\（静默，不显示进度）
  │    ├── 注册 PATH：{app} 添加到系统 PATH
  │    ├── 复制 skills/commands → %APPDATA%\devpilot\
  │    └── 创建桌面快捷方式 + 开始菜单条目
  └── 完成页（勾选"立即启动 DevPilot"）
```

### Inno Setup 脚本关键段

```pascal
[Setup]
AppName=DevPilot
AppVersion=1.0.0
AppPublisher=航电软件 AI 研发团队
DefaultDirName={autopf}\DevPilot
DefaultGroupName=DevPilot
ChangesEnvironment=yes        ; 触发 PATH 变更通知

[Files]
Source: "dist\devpilot.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "skills\*"; DestDir: "{userappdata}\devpilot\skills"; Flags: recursesubdirs createallsubdirs

[Dirs]
Name: "{userappdata}\devpilot\commands"
Name: "{userappdata}\devpilot\skills"

[Registry]
; 注册 PATH
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Control\Session Manager\Environment";
  ValueType: expandsz; ValueName: "Path";
  ValueData: "{olddata};{app}";
  Check: NeedsAddPath(ExpandConstant('{app}'))

[Icons]
Name: "{group}\DevPilot"; Filename: "{app}\devpilot.exe"
Name: "{commondesktop}\DevPilot"; Filename: "{app}\devpilot.exe"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
; 注意：%APPDATA%\devpilot\ 保留（含用户配置），不随卸载删除
```

### GitHub Actions 构建流程

```yaml
# .github/workflows/build-windows.yml
jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run build          # 产出 devpilot.exe
      - name: Build Installer
        run: iscc installer/devpilot.iss
      - uses: actions/upload-artifact@v4
        with:
          name: devpilot-setup
          path: Output/devpilot-setup.exe
```

## 关键实现路径

| 任务 | 类型 | 关键文件 |
|------|------|---------|
| Inno Setup 脚本 | 新建 | `installer/devpilot.iss` |
| CI Windows 构建 job | 新建 | `.github/workflows/build-windows.yml` |
| Skills 文件打包 | 配置 | 从 `.opencode/skills/` 复制到 `installer/skills/` |
| 应用图标 | 新建 | `installer/assets/icon.ico`（需设计或生成） |

## 组件设计

### Skills 部署路径

| 源文件（仓库） | 安装目标 |
|-------------|---------|
| `.opencode/skills/req-structuring/` | `%APPDATA%\devpilot\skills\req-structuring\` |
| `.opencode/skills/cpp-test-gen/` | `%APPDATA%\devpilot\skills\cpp-test-gen\` |
| `.opencode/skills/cpp-compile-fix/` | `%APPDATA%\devpilot\skills\cpp-compile-fix\` |
| `.opencode/commands/structurize-req.md` | `%APPDATA%\devpilot\commands\structurize-req.md` |
| `.opencode/commands/gen-test.md` | `%APPDATA%\devpilot\commands\gen-test.md` |

### 卸载策略

- `{app}\`（Program Files）：完整删除
- `%APPDATA%\devpilot\`：**保留**（含用户的 opencode.json 配置）
- PATH 注册：Inno Setup 自动清理

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| 非管理员运行安装包 | Inno Setup `PrivilegesRequired=admin` 自动提示 UAC |
| devpilot 已运行时安装 | 安装前检测进程，提示关闭后继续 |
| PATH 已包含旧版本路径 | `NeedsAddPath()` 检查避免重复添加 |
| %APPDATA%\devpilot\ 已有旧 skills | `Flags: recursesubdirs` 覆盖更新 |

## 测试策略

- 全新 Windows 10/11 虚拟机：双击安装，验证 PATH、快捷方式、%APPDATA%\devpilot\ 内容
- 新开 PowerShell：`devpilot --version` 可执行
- 任意空目录：运行 `devpilot`，确认首次向导弹出（E2 功能）
- 控制面板 → 卸载，确认 Program Files 清除，%APPDATA%\devpilot\ 保留
- 升级场景：旧版已安装，新 setup.exe 覆盖安装，配置文件不丢失

## 约束与注意事项

- 依赖 E1（devpilot.exe 构建产物）完成后才可打包
- Inno Setup 需在 CI 环境预装（`choco install innosetup` 或使用 `Miramontes/setup-innosetup` action）
- 安装包大小目标：< 60MB（仅含 devpilot.exe + skills 文件，不含模型）
- Windows 代码签名（EV 证书）：本期不做，后续版本按需添加
- `%APPDATA%\devpilot\` 路径由 E1（global/index.ts app name 改为 devpilot）保证，E1 必须先于 E3 完成

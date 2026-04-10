#!/usr/bin/env node

import fs from "fs"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function detectPlatformAndArch() {
  // Map platform names
  let platform
  switch (os.platform()) {
    case "darwin":
      platform = "darwin"
      break
    case "linux":
      platform = "linux"
      break
    case "win32":
      platform = "windows"
      break
    default:
      platform = os.platform()
      break
  }

  // Map architecture names
  let arch
  switch (os.arch()) {
    case "x64":
      arch = "x64"
      break
    case "arm64":
      arch = "arm64"
      break
    case "arm":
      arch = "arm"
      break
    default:
      arch = os.arch()
      break
  }

  return { platform, arch }
}

function findBinary() {
  const { platform, arch } = detectPlatformAndArch()
  // CUSTOM: DevPilot rebrand — 平台包名与二进制文件名
  const packageName = `devpilot-${platform}-${arch}`
  const binaryName = platform === "windows" ? "devpilot.exe" : "devpilot"

  try {
    // Use require.resolve to find the package
    const packageJsonPath = require.resolve(`${packageName}/package.json`)
    const packageDir = path.dirname(packageJsonPath)
    const binaryPath = path.join(packageDir, "bin", binaryName)

    if (!fs.existsSync(binaryPath)) {
      throw new Error(`Binary not found at ${binaryPath}`)
    }

    return { binaryPath, binaryName }
  } catch (error) {
    throw new Error(`Could not find package ${packageName}: ${error.message}`)
  }
}

function prepareBinDirectory(binaryName) {
  const binDir = path.join(__dirname, "bin")
  const targetPath = path.join(binDir, binaryName)

  // Ensure bin directory exists
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true })
  }

  // Remove existing binary/symlink if it exists
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath)
  }

  return { binDir, targetPath }
}

function symlinkBinary(sourcePath, binaryName) {
  const { targetPath } = prepareBinDirectory(binaryName)

  fs.symlinkSync(sourcePath, targetPath)
  console.log(`devpilot binary symlinked: ${targetPath} -> ${sourcePath}`)

  // Verify the file exists after operation
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Failed to symlink binary to ${targetPath}`)
  }
}

// CUSTOM: DevPilot rebrand — 将预置 Skills 部署到全局配置目录
async function deploySkills() {
  const skillsSrc = path.join(__dirname, "..", "skills")
  const commandsSrc = path.join(__dirname, "..", "commands")

  // 全局配置目录（xdg-basedir：macOS/Linux=~/.config/devpilot，Windows=%APPDATA%\devpilot）
  const configBase = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config")
  const configDir = path.join(configBase, "devpilot")

  const skillsDest = path.join(configDir, "skills")
  const commandsDest = path.join(configDir, "commands")

  fs.mkdirSync(skillsDest, { recursive: true })
  fs.mkdirSync(commandsDest, { recursive: true })

  // 复制 skills
  if (fs.existsSync(skillsSrc)) {
    fs.cpSync(skillsSrc, skillsDest, { recursive: true, force: true })
    console.log(`DevPilot skills deployed to ${skillsDest}`)
  }
  // 复制 commands
  if (fs.existsSync(commandsSrc)) {
    fs.cpSync(commandsSrc, commandsDest, { recursive: true, force: true })
    console.log(`DevPilot commands deployed to ${commandsDest}`)
  }
}

async function main() {
  try {
    if (os.platform() === "win32") {
      // On Windows, the .exe is already included in the package and bin field points to it
      // No postinstall setup needed
      console.log("Windows detected: binary setup not needed (using packaged .exe)")
      await deploySkills()  // CUSTOM: 部署 Skills
      return
    }

    // On non-Windows platforms, just verify the binary package exists
    // Don't replace the wrapper script - it handles binary execution
    try {
      const { binaryPath } = findBinary()
      // CUSTOM: DevPilot rebrand — 本地缓存二进制路径
      const target = path.join(__dirname, "bin", ".devpilot")
      if (fs.existsSync(target)) fs.unlinkSync(target)
      try {
        fs.linkSync(binaryPath, target)
      } catch {
        fs.copyFileSync(binaryPath, target)
      }
      fs.chmodSync(target, 0o755)
    } catch (binaryError) {
      console.error("Failed to setup devpilot binary:", binaryError.message)
    }
    await deploySkills()  // CUSTOM: 部署 Skills（即使二进制安装失败也要执行）
  } catch (error) {
    console.error("Postinstall error:", error.message)
    process.exit(1)
  }
}

try {
  main()
} catch (error) {
  console.error("Postinstall script error:", error.message)
  process.exit(0)
}

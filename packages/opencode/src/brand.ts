// CUSTOM: DevPilot rebrand — 品牌配置集中管理，升级 opencode 版本时只需维护此文件
// 所有用户可见的品牌字符串从此文件导入，不在各组件中硬编码

export const Brand = {
  /** 产品显示名（用于 UI 展示） */
  name: "DevPilot",
  /** CLI 命令名（小写） */
  cmd: "devpilot",
  /** 配置文件前缀 */
  config: "devpilot",
  /** 全局配置目录名 */
  configDir: "devpilot",

  /**
   * Provider 显示名覆盖表
   * 用于屏蔽上游 models-snapshot.js 中的 opencode 品牌名
   * key = provider.id, value = 对外显示的名称
   */
  providerNames: {
    opencode: "DevPilot AI",
    "opencode-go": "DevPilot Pro",
  } as Record<string, string>,

  /**
   * 获取 provider 显示名，优先使用覆盖表，否则用原始名称
   */
  providerDisplayName(providerId: string, fallback: string): string {
    return Brand.providerNames[providerId] ?? fallback
  },
} as const

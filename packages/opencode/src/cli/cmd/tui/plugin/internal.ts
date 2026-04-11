import HomeFooter from "../feature-plugins/home/footer"
// CUSTOM: DevPilot lockdown — 移除非交付内建 TUI 面板
// import HomeTips from "../feature-plugins/home/tips"
import SidebarContext from "../feature-plugins/sidebar/context"
// CUSTOM: DevPilot lockdown — 移除非交付内建 TUI 面板
// import SidebarMcp from "../feature-plugins/sidebar/mcp"
import SidebarLsp from "../feature-plugins/sidebar/lsp"
// CUSTOM: DevPilot lockdown — 移除非交付内建 TUI 面板
// import SidebarTodo from "../feature-plugins/sidebar/todo"
import SidebarFiles from "../feature-plugins/sidebar/files"
import SidebarFooter from "../feature-plugins/sidebar/footer"
// CUSTOM: DevPilot lockdown — 移除非交付内建 TUI 面板
// import PluginManager from "../feature-plugins/system/plugins"
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"

export type InternalTuiPlugin = TuiPluginModule & {
  id: string
  tui: TuiPlugin
}

// CUSTOM: DevPilot lockdown — 内建 TUI 面板白名单
export const INTERNAL_TUI_PLUGINS: InternalTuiPlugin[] = [
  HomeFooter,
  SidebarContext,
  SidebarLsp,
  SidebarFiles,
  SidebarFooter,
]

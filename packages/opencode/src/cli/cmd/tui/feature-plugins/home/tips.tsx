import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createMemo, Show } from "solid-js"
import { Tips } from "./tips-view"

const id = "internal:home-tips"

function View(props: { show: boolean }) {
  return (
    <box height={4} minHeight={0} width="100%" maxWidth={75} alignItems="center" paddingTop={3} flexShrink={1}>
      <Show when={props.show}>
        <Tips />
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: api.kv.get("tips_hidden", false) ? "Show tips" : "Hide tips",
      value: "tips.toggle",
      hidden: true, // CUSTOM: DevPilot lockdown — 合并了原 hidden 条件，Tips 面板永久隐藏
      keybind: "tips_toggle",
      category: "System",
      onSelect() {
        api.kv.set("tips_hidden", !api.kv.get("tips_hidden", false))
        api.ui.dialog.clear()
      },
    },
  ])

  api.slots.register({
    order: 100,
    slots: {
      home_bottom() {
        const hidden = createMemo(() => api.kv.get("tips_hidden", false))
        const first = createMemo(() => api.state.session.count() === 0)
        const show = createMemo(() => false) // CUSTOM: DevPilot lockdown
        return <View show={show()} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin

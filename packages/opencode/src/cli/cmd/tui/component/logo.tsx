import { TextAttributes, RGBA } from "@opentui/core"
import { For, type JSX } from "solid-js"
import { useTheme, tint } from "@tui/context/theme"
import { logo, marks } from "@/cli/logo"

// Shadow markers (rendered chars in parens):
// _ = full shadow cell (space with bg=shadow)
// ^ = letter top, shadow bottom (▀ with fg=letter, bg=shadow)
// ~ = shadow top only (▀ with fg=shadow)
const SHADOW_MARKER = new RegExp(`[${marks}]`)

export function Logo() {
  const { theme } = useTheme()

  const renderLine = (line: string, fg: RGBA, bold: boolean): JSX.Element[] => {
    const shadow = tint(theme.background, fg, 0.25)
    const attrs = bold ? TextAttributes.BOLD : undefined
    const elements: JSX.Element[] = []
    let i = 0

    while (i < line.length) {
      const rest = line.slice(i)
      const markerIndex = rest.search(SHADOW_MARKER)

      if (markerIndex === -1) {
        elements.push(
          <text fg={fg} attributes={attrs} selectable={false}>
            {rest}
          </text>,
        )
        break
      }

      if (markerIndex > 0) {
        elements.push(
          <text fg={fg} attributes={attrs} selectable={false}>
            {rest.slice(0, markerIndex)}
          </text>,
        )
      }

      const marker = rest[markerIndex]
      switch (marker) {
        case "_":
          elements.push(
            <text fg={fg} bg={shadow} attributes={attrs} selectable={false}>
              {" "}
            </text>,
          )
          break
        case "^":
          elements.push(
            <text fg={fg} bg={shadow} attributes={attrs} selectable={false}>
              ▀
            </text>,
          )
          break
        case "~":
          elements.push(
            <text fg={shadow} attributes={attrs} selectable={false}>
              ▀
            </text>,
          )
          break
      }

      i += markerIndex + 1
    }

    return elements
  }

  // CUSTOM: DevPilot rebrand — 左右边栏按行三色配色
  // row 0: textMuted（空行）
  // row 1: primary（橙）— 产品名 + 左侧边栏高亮
  // row 2: textMuted（灰）— 分隔线
  // row 3: accent（紫）— 标语 + 左侧边栏色点
  const leftColor = (index: number): RGBA => {
    if (index === 1) return theme.primary
    if (index === 3) return theme.accent
    return theme.textMuted
  }

  const rightColor = (index: number): RGBA => {
    if (index === 1) return theme.primary
    if (index === 3) return theme.accent
    return theme.textMuted
  }

  return (
    <box>
      <For each={logo.left}>
        {(line, index) => (
          <box flexDirection="row" gap={1}>
            <box flexDirection="row">{renderLine(line, leftColor(index()), false)}</box>
            <box flexDirection="row">{renderLine(logo.right[index()], rightColor(index()), index() === 1)}</box>
          </box>
        )}
      </For>
    </box>
  )
}

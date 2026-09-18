import type { WidgetSnapshot } from '@doan-labs/duo-sdk/protocol.ts'
import * as stylex from '@stylexjs/stylex'
import { shared } from './styles.ts'
import { colors } from './tokens.stylex.ts'

export function widgetAge(updatedAt: number, now = Date.now()) {
  const age = now - updatedAt
  return age >= 86400000 ? 'Open to refresh' : age >= 3600000 ? `Updated ${Math.floor(age / 3600000)} h ago` : ''
}
/** Host-rendered declarative snapshot. Refresh remains the app owner's responsibility. */
export type WidgetProps = {
  snapshot: WidgetSnapshot
  updatedAt: number
  onOpen: (element: HTMLElement, arg?: string) => void
}
export function Widget({ snapshot, updatedAt, onOpen }: WidgetProps) {
  return (
    <button
      type="button"
      {...stylex.props(shared.glass, shared.widget, styles.widget)}
      onClick={(e) => onOpen(e.currentTarget, snapshot.arg)}
    >
      {snapshot.lines.map((line, i) => (
        <span
          // Text slots have no identity or component state and are replaced atomically.
          // biome-ignore lint/suspicious/noArrayIndexKey: declarative snapshot slots are positional
          key={`${i}:${line.role}`}
          {...stylex.props(
            styles.line,
            line.role === 'value' && styles.value,
            line.role === 'caption' && styles.caption
          )}
        >
          {line.text}
        </span>
      ))}
      {widgetAge(updatedAt) && <small>{widgetAge(updatedAt)}</small>}
    </button>
  )
}
const styles = stylex.create({
  widget: {
    color: colors.white,
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    overflow: 'hidden',
    padding: 12
  },
  line: { fontSize: 12, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  value: { fontSize: 38, lineHeight: 1.15 },
  caption: { fontSize: 10 }
})

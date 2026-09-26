// The memo row and the selection bar every list screen shares, so Library,
// a folder and Recently Deleted never drift apart.

import { mmss } from '@doan-labs/duo-fixtures'
import { Button, Checkbox, Row, Sym } from '@doan-labs/duo-uikit'
import { app, appAppearance, colors, radius, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { Glyph } from './glyphs.tsx'
import type { Memo } from './store.ts'

const when = (at: number) => {
  const d = new Date(at)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return time
  return `${d.toLocaleDateString('en', { month: 'short', day: 'numeric' })} ${time}`
}
export const daysLeft = (m: Memo) => Math.max(0, 30 - Math.floor((Date.now() - (m.deletedAt ?? 0)) / 86_400_000))

export function MemoRow({
  memo,
  editing,
  selected,
  deleted,
  onOpen,
  onToggle
}: {
  memo: Memo
  editing: boolean
  selected?: boolean
  /** Recently Deleted rows swap the subtitle for the countdown. */
  deleted?: boolean
  onOpen: () => void
  onToggle: () => void
}) {
  const subtitle = deleted ? `Erases in ${daysLeft(memo)} days` : `${when(memo.at)} · ${mmss(memo.ms / 1000)}`
  return (
    <Row
      as="button"
      xstyle={[styles.row]}
      onClick={() => (editing ? onToggle() : onOpen())}
      label={
        <span {...stylex.props(styles.name)}>
          {editing && (
            <Checkbox
              checked={!!selected}
              onChange={onToggle}
              aria-label={`Select ${memo.name}`}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {memo.name}
          {memo.fav && <Sym name="heartFill" size={12} />}
        </span>
      }
      subtitle={
        <span {...stylex.props(styles.sub)}>
          {subtitle}
          {memo.demo && <span {...stylex.props(styles.demo)}>Demo</span>}
        </span>
      }
      detail={!editing && mmss(memo.ms / 1000)}
      chevron={!editing}
    />
  )
}

/** The bottom bar while selecting: what the actions do depends on the screen. */
export function SelectionBar({
  count,
  actions
}: {
  count: number
  actions: { label: string; danger?: boolean; onSelect: () => void }[]
}) {
  return (
    <div {...stylex.props(styles.bar)}>
      <span {...stylex.props(styles.count)}>{count} selected</span>
      {actions.map((a) => (
        <Button
          key={a.label}
          type="button"
          variant="plain"
          disabled={!count}
          xstyle={[a.danger && styles.danger]}
          onClick={a.onSelect}
        >
          {a.label}
        </Button>
      ))}
    </div>
  )
}

/** Transport glyph button shared by the detail and edit pages. */
export function Transport({
  name,
  size = 30,
  label,
  onPress,
  disabled
}: {
  name: 'play' | 'pause' | 'back15' | 'fwd15' | 'mic' | 'micOff'
  size?: number
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <button type="button" aria-label={label} disabled={disabled} {...stylex.props(styles.transport)} onClick={onPress}>
      <Glyph name={name} size={size} />
    </button>
  )
}

const styles = stylex.create({
  row: { backgroundColor: appAppearance.memosFill, borderBottomColor: app.separator, width: '100%' },
  name: { display: 'inline-flex', alignItems: 'center', gap: 8, color: app.fg },
  sub: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  demo: {
    fontSize: typeScale.caption2,
    color: colors.yellowDark,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.yellowDark,
    borderRadius: radius.xs,
    paddingInline: 4
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBlock: 10,
    paddingInline: 16,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: app.separator,
    backgroundColor: app.bg
  },
  count: { flexGrow: 1, color: app.label2, fontSize: typeScale.footnote },
  danger: { color: colors.red },
  transport: {
    width: 52,
    height: 52,
    borderWidth: 0,
    borderRadius: radius.circle,
    backgroundColor: 'transparent',
    color: app.fg,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer'
  }
})

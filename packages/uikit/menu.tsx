import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { usePresence } from './presence.ts'
import { appearance, type KitStyle, type PrimitiveProps } from './primitive.ts'
import { animations, shared } from './styles.ts'
import { Sym, type SymProps } from './sym.tsx'
import { app, glass, leading, radius, shadow, space, typeScale } from './tokens.stylex.ts'

/**
 * The iOS pop-up menu: a sheet of actions that floats out of the control which
 * opened it and sinks back once one is chosen. The caller keeps `open` and puts
 * `aria-expanded` on that control; `onClose` runs after the chosen action.
 *
 * The sheet carries no coordinates of its own, so `xstyle` both places it —
 * pinned to a corner, or stacked above a toolbar — and tints it: a menu over a
 * map wants a near-opaque white, one over a night sky wants the dark glass.
 * `itemStyle` is the app's type step and padding for a row.
 *
 * `items` is the column of rows, with `'separator'` where iOS rules a line
 * between groups. `footer` is the row of glyph-over-caption buttons some menus
 * end in, Safari's Bookmarks and All Tabs.
 */
export type MenuProps = Omit<PrimitiveProps<'div'>, 'children' | 'as'> & {
  open: boolean
  onClose: () => void
  items: MenuEntry[]
  footer?: MenuItem[]
  /** Row glyph size; a menu set in a smaller type step wants a smaller one. */
  size?: number
  itemStyle?: KitStyle
}

/**
 * One action. The glyph sits on the leading edge, as iOS 26 draws it; `checked`
 * present makes the row a radio and puts a tick on the trailing edge. `name` is
 * what a screen reader says when the visible label is not enough on its own.
 */
export type MenuItem = {
  label: ReactNode
  icon?: SymProps['name']
  checked?: boolean
  disabled?: boolean
  name?: string
  onSelect: () => void
}
export type MenuEntry = MenuItem | 'separator'

export function Menu({ open, onClose, items, footer, size = 16, itemStyle, xstyle, animate, ...props }: MenuProps) {
  const { mounted, closing } = usePresence(open)
  if (!mounted) return null
  const pick = (item: MenuItem) => () => {
    item.onSelect()
    onClose()
  }
  return (
    <div
      role="menu"
      {...props}
      // Still on screen while it sinks: a tap through it now was meant for
      // whatever the menu was covering.
      {...appearance(
        [styles.menu, closing ? animations.floatOut : animations.float, closing && styles.gone],
        xstyle,
        animate
      )}
    >
      {items.map((item, i) =>
        item === 'separator' ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: the items are literal
          <hr key={i} {...stylex.props(styles.rule)} />
        ) : (
          <button
            // Positional: a menu is a written-out list of actions and never reorders.
            // biome-ignore lint/suspicious/noArrayIndexKey: the items are literal
            key={i}
            type="button"
            // A row that can be ticked is a radio and carries its state; a plain
            // action says nothing about being checked.
            {...(item.checked === undefined
              ? { role: 'menuitem' as const }
              : { role: 'menuitemradio' as const, 'aria-checked': item.checked })}
            aria-label={item.name}
            disabled={item.disabled}
            onClick={pick(item)}
            {...stylex.props(styles.item, shared.press, itemStyle)}
          >
            {item.icon && (
              <i {...stylex.props(styles.lead)}>
                <Sym name={item.icon} size={size} />
              </i>
            )}
            {item.label}
            {item.checked && (
              <i {...stylex.props(styles.trail, styles.tick)}>
                <Sym name="tick" size={size} />
              </i>
            )}
          </button>
        )
      )}
      {footer && (
        <div {...stylex.props(styles.foot)}>
          {footer.map((item, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: the items are literal
              key={i}
              type="button"
              role="menuitem"
              aria-label={item.name}
              disabled={item.disabled}
              onClick={pick(item)}
              {...stylex.props(styles.footItem, shared.press)}
            >
              {item.icon && <Sym name={item.icon} size={size + 6} />}
              <span {...stylex.props(styles.footLabel)}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = stylex.create({
  menu: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 3,
    borderRadius: radius.lg,
    backgroundColor: glass.tint,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: shadow.float,
    // A menu is usually a child of something the pointer passes through,
    // a floating toolbar or a map's chrome.
    pointerEvents: 'auto'
  },
  gone: { pointerEvents: 'none' },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    width: '100%',
    paddingTop: 11,
    paddingRight: space.lg,
    paddingBottom: 11,
    paddingLeft: space.lg,
    textAlign: 'left',
    cursor: { default: 'pointer', ':disabled': 'not-allowed' },
    opacity: { default: 1, ':disabled': 0.5 }
  },
  lead: { display: 'flex', justifyContent: 'center', minWidth: space.xxl },
  trail: { display: 'flex', marginLeft: 'auto' },
  tick: { color: app.link },
  rule: {
    height: 1,
    marginTop: space.xs,
    marginRight: space.lg,
    marginBottom: space.xs,
    marginLeft: space.lg,
    borderWidth: 0,
    backgroundColor: app.separator
  },
  foot: {
    display: 'flex',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: app.separator
  },
  footItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xs,
    flexGrow: 1,
    paddingTop: space.md,
    paddingBottom: space.md,
    cursor: { default: 'pointer', ':disabled': 'not-allowed' },
    opacity: { default: 1, ':disabled': 0.5 }
  },
  footLabel: { fontSize: typeScale.caption1, lineHeight: leading.caption1 }
})

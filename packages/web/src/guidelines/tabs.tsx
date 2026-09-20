// The strip across the top of the guidelines, in the shape of Apple's developer
// reference pages: a label with the number of tokens behind it, a hairline the
// width of the page, and a 2 px underline that slides to whichever tab is open.
// Keyboard follows the ARIA tabs pattern, so the whole strip is one stop in the
// tab order and the arrows move inside it.
import * as stylex from '@stylexjs/stylex'
import { motion, useReducedMotion } from 'motion/react'
import { type KeyboardEvent, useRef } from 'react'
import { SLIDE } from '../motion'
import { color, font } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export type Tab = { id: string; label: string; count?: number }

export const panelId = (id: string) => `guidelines-panel-${id}`
export const tabId = (id: string) => `guidelines-tab-${id}`

export function Tabs({ tabs, open, onOpen }: { tabs: Tab[]; open: string; onOpen: (id: string) => void }) {
  const still = useReducedMotion()
  const strip = useRef<HTMLDivElement>(null)
  const at = tabs.findIndex((t) => t.id === open)

  function move(e: KeyboardEvent<HTMLDivElement>) {
    const last = tabs.length - 1
    const to =
      e.key === 'ArrowRight'
        ? (at + 1) % tabs.length
        : e.key === 'ArrowLeft'
          ? (at + last) % tabs.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1
    const next = tabs[to]
    if (!next) return
    e.preventDefault()
    onOpen(next.id)
    // The strip scrolls sideways on a phone, so focus is what brings the tab
    // back into view; the roving tabindex has already moved to it by then.
    strip.current?.querySelectorAll('button')[to]?.focus()
  }

  return (
    <div {...stylex.props(styles.strip)}>
      <div ref={strip} role="tablist" aria-label="Guidelines sections" onKeyDown={move} {...stylex.props(styles.list)}>
        {tabs.map((t) => {
          const on = t.id === open
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={tabId(t.id)}
              aria-selected={on}
              aria-controls={panelId(t.id)}
              tabIndex={on ? 0 : -1}
              onClick={() => onOpen(t.id)}
              {...stylex.props(styles.tab, on && styles.tabOn)}
            >
              {t.label}
              {t.count !== undefined && <span {...stylex.props(styles.count)}>{t.count}</span>}
              {on && (
                <motion.span
                  layoutId="guidelines-underline"
                  initial={false}
                  transition={still ? { duration: 0 } : SLIDE}
                  {...stylex.props(styles.underline)}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const styles = stylex.create({
  strip: {
    marginTop: '40px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    overflowX: 'auto',
    overflowY: 'hidden',
    // The strip is a horizontal rail on a phone; a scrollbar under it would
    // sit on the hairline.
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' }
  },
  list: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: { default: '30px', [SMALL]: '22px' },
    width: 'max-content',
    minWidth: '100%',
    paddingRight: '24px'
  },
  tab: {
    position: 'relative',
    appearance: 'none',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderRadius: '6px',
    margin: 0,
    paddingTop: '8px',
    paddingBottom: '15px',
    paddingLeft: 0,
    paddingRight: 0,
    fontFamily: font.sans,
    fontSize: { default: '16px', [SMALL]: '15px' },
    lineHeight: 1.2,
    // Fixed weight: a bolder active tab would reflow the strip under the
    // sliding underline.
    fontWeight: 500,
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    color: { default: color.text3, ':hover': color.text },
    transitionProperty: 'color',
    transitionDuration: '0.18s',
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    // Inset: the strip clips its own overflow, so a ring outside the tab would
    // lose its top and bottom edges.
    outlineOffset: '-2px'
  },
  tabOn: { color: color.text },
  count: {
    marginLeft: '4px',
    fontFamily: font.mono,
    fontSize: '10px',
    fontVariantNumeric: 'tabular-nums',
    verticalAlign: 'super',
    color: color.text3
  },
  underline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '-1px',
    height: '2px',
    borderRadius: '2px',
    backgroundColor: color.text
  }
})

// The documentation sidebar, shared by /docs and /kit/docs: a pill that slides
// down the list under the pointer and settles on the current page when the
// pointer leaves. Both sidebars hold several groups inside one <aside>, and a
// layoutId only animates between elements that share it, so the scope comes
// from context: every link under one aside slides against the same pill, and
// two asides on the site never collide.
import * as stylex from '@stylexjs/stylex'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { createContext, type ReactNode, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useMedia } from './media'
import { CURVE, SHEET, SLIDE } from './motion'
import { color, ease, font, radius } from './tokens.stylex'

type Scope = {
  /** Unique per aside; prefixes both layoutIds. */
  id: string
  /** The item under the pointer or the focus ring, null when the list is cold. */
  hot: string | null
  setHot: (key: string | null) => void
  /** The active item's label, for the collapsed narrow header. */
  setLabel: (label: string) => void
  /** Collapses the narrow disclosure after a link is taken. */
  close: () => void
  still: boolean
}

const noop = () => {}
const Ctx = createContext<Scope>({ id: 'side', hot: null, setHot: noop, setLabel: noop, close: noop, still: false })

/** Sidebar on the left, article on the right; under 833 px the sidebar collapses into a disclosure. */
export function Split({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  const id = useId()
  const still = useReducedMotion() ?? false
  const narrow = useMedia(NARROW_Q)
  const [hot, setHot] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLElement>(null)
  const scope = useMemo<Scope>(
    () => ({ id, hot, setHot, setLabel, close: () => setOpen(false), still }),
    [id, hot, still]
  )

  // A page deep in the list loads with its entry out of sight. Move the column,
  // never the window: `scrollIntoView` would drag the article out of view too.
  useEffect(() => {
    const el = box.current
    const on = el?.querySelector<HTMLElement>('[data-on]')
    if (!el || !on || el.scrollHeight <= el.clientHeight) return
    const below = on.offsetTop + on.offsetHeight > el.scrollTop + el.clientHeight
    if (below || on.offsetTop < el.scrollTop) el.scrollTop = on.offsetTop - (el.clientHeight - on.offsetHeight) / 2
  }, [])

  const list = <div onPointerLeave={() => setHot(null)}>{aside}</div>
  return (
    <div {...stylex.props(styles.split)}>
      <aside ref={box} data-lenis-prevent {...stylex.props(styles.aside)}>
        <Ctx.Provider value={scope}>
          {narrow ? (
            <>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                {...stylex.props(styles.toggle)}
              >
                <span {...stylex.props(styles.toggleLabel)}>{label || 'Documentation'}</span>
                <motion.svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  aria-hidden="true"
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={still ? { duration: 0 } : SLIDE}
                  {...stylex.props(styles.chevron)}
                >
                  <path
                    d="M3.5 5.5 7 9l3.5-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    {...stylex.props(styles.panel)}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={still ? { duration: 0 } : SHEET}
                  >
                    {list}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            list
          )}
        </Ctx.Provider>
      </aside>
      <div {...stylex.props(styles.main)}>{children}</div>
    </div>
  )
}

export function SideList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} {...stylex.props(styles.group)}>
      <h2 {...stylex.props(styles.groupTitle)}>{title}</h2>
      <ul {...stylex.props(styles.list)}>{children}</ul>
    </nav>
  )
}

export function SideLink({
  to,
  params,
  children
}: {
  to: string
  params?: Record<string, string>
  children: ReactNode
}) {
  const scope = useContext(Ctx)
  const matchRoute = useMatchRoute()
  const on = !!matchRoute({ to, params })
  const key = params ? `${to}:${Object.values(params).join('/')}` : to
  const { setLabel } = scope

  useEffect(() => {
    if (on && typeof children === 'string') setLabel(children)
  }, [on, children, setLabel])

  // With nothing hot the hover pill parks on the active item, invisible: it has
  // somewhere to come from on the first hover and somewhere to return to.
  const carries = scope.hot ? scope.hot === key : on
  return (
    <li {...stylex.props(styles.item)}>
      <Link
        to={to}
        params={params}
        aria-current={on ? 'page' : undefined}
        data-on={on ? '' : undefined}
        onPointerEnter={() => scope.setHot(key)}
        onFocus={() => scope.setHot(key)}
        onBlur={() => scope.setHot(null)}
        onClick={scope.close}
        {...stylex.props(styles.link, on && styles.linkOn)}
      >
        {/* Both pills render the same markup either way. `useReducedMotion` is
            null on the server and a boolean on the first client render, so
            branching the tree on it made a reduced-motion reader hydrate against
            markup that assumed the opposite and React threw the sidebar away.
            The reader who wants less motion gets the same pills, placed at once. */}
        {carries && (
          <motion.span
            layoutId={`${scope.id}-hover`}
            initial={false}
            animate={{ opacity: scope.hot ? 1 : 0 }}
            transition={scope.still ? { duration: 0 } : { ...SLIDE, opacity: { duration: 0.18, ease: CURVE } }}
            {...stylex.props(styles.pill, styles.pillHover)}
          />
        )}
        {on && (
          <motion.span
            layoutId={`${scope.id}-on`}
            initial={false}
            transition={scope.still ? { duration: 0 } : SLIDE}
            {...stylex.props(styles.pill, styles.pillOn)}
          />
        )}
        <span {...stylex.props(styles.label)}>{children}</span>
      </Link>
    </li>
  )
}

const NARROW = '@media (max-width: 833px)'
const NARROW_Q = '(max-width: 833px)'
// The pill overhangs the text by this much, and the column pulls back by the
// same amount so the labels still line up with the article above them.
const BLEED = '10px'
const FADE = '14px'

const styles = stylex.create({
  split: {
    display: 'grid',
    gridTemplateColumns: { default: '240px minmax(0, 1fr)', [NARROW]: 'minmax(0, 1fr)' },
    gap: { default: '64px', [NARROW]: '28px' },
    maxWidth: '1120px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingTop: '56px',
    paddingBottom: '112px',
    paddingLeft: '24px',
    paddingRight: '24px',
    backgroundColor: color.bg,
    fontFamily: font.sans
  },
  aside: {
    // Keeps the pills' z-index inside the column: they order against each other
    // and the labels, never against the article beside them.
    isolation: 'isolate',
    position: { default: 'sticky', [NARROW]: 'static' },
    top: '88px',
    alignSelf: 'start',
    marginLeft: { default: `calc(0px - ${BLEED})`, [NARROW]: 0 },
    paddingTop: { default: FADE, [NARROW]: 0 },
    paddingBottom: { default: FADE, [NARROW]: 0 },
    paddingRight: { default: '6px', [NARROW]: 0 },
    maxHeight: { default: 'calc(100vh - 120px)', [NARROW]: 'none' },
    overflowY: { default: 'auto', [NARROW]: 'visible' },
    // Items dissolve at the edges of the column instead of being cut in half.
    maskImage: {
      default: `linear-gradient(to bottom, transparent, #000 ${FADE}, #000 calc(100% - ${FADE}), transparent)`,
      [NARROW]: 'none'
    },
    // The bar is a guest: absent until the column is touched, and never fat.
    scrollbarWidth: 'thin',
    scrollbarColor: {
      default: 'transparent transparent',
      ':hover': `${color.borderStrong} transparent`,
      ':focus-within': `${color.borderStrong} transparent`
    }
  },
  main: { minWidth: 0 },
  group: { marginBottom: '28px' },
  groupTitle: {
    margin: 0,
    marginBottom: '8px',
    paddingLeft: BLEED,
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: color.text3
  },
  list: { listStyleType: 'none', margin: 0, padding: 0 },
  item: { display: 'block' },
  link: {
    display: 'block',
    position: 'relative',
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: BLEED,
    paddingRight: BLEED,
    borderRadius: radius.sm,
    fontSize: '14px',
    lineHeight: 1.4,
    color: { default: color.text2, ':hover': color.text },
    textDecoration: 'none',
    transitionProperty: 'color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out,
    outlineColor: color.ring,
    outlineOffset: '1px',
    outlineWidth: '2px',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' }
  },
  linkOn: { color: { default: color.accent, ':hover': color.accent }, fontWeight: 500 },
  // A pill travelling between two links is still a child of one of them, so it
  // crosses the labels in between. Paint order alone would put it over the ones
  // that come earlier in the list; the positive z-index on the label is what
  // keeps every label above every pill, whichever link owns it.
  pill: { position: 'absolute', inset: 0, zIndex: 0, borderRadius: radius.sm },
  pillHover: { backgroundColor: color.well },
  pillOn: { backgroundColor: color.accentSoft },
  label: { position: 'relative', zIndex: 1 },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    width: '100%',
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '16px',
    paddingRight: '14px',
    backgroundColor: { default: color.surface, ':hover': color.well },
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    fontFamily: font.sans,
    fontSize: '15px',
    fontWeight: 500,
    color: color.text,
    textAlign: 'left',
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '0.2s',
    outlineColor: color.ring,
    outlineOffset: '2px',
    outlineWidth: '2px',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' }
  },
  toggleLabel: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chevron: { flexShrink: 0, color: color.text3 },
  panel: { overflow: 'hidden', paddingTop: '12px' }
})

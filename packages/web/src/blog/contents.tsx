import * as stylex from '@stylexjs/stylex'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import { color, ease, font } from '../tokens.stylex'
import type { Post } from './posts'

// A post's outline beside the column on wide screens, after rare-ui's hook
// sidebar: a dashed rail runs down from the top and hooks into the section in
// view; a fainter one follows the pointer. It steps aside whenever a figure
// that breaks out of the column (the film, the live phone) passes beneath it.

const CORNER = 6
/** Where a heading counts as read: just under the nav and the progress bar. */
const LINE = 140

export function Contents({ toc }: { toc: Post['toc'] }) {
  const { scrollY } = useScroll()
  const nav = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLButtonElement | null)[]>([])
  const [centers, setCenters] = useState<number[]>([])
  const [active, setActive] = useState(-1)
  const [hover, setHover] = useState<number | null>(null)
  const [clear, setClear] = useState(false)

  useLayoutEffect(() => {
    const list = nav.current
    if (!list) return
    const measure = () => setCenters(rows.current.map((el) => (el ? el.offsetTop + el.offsetHeight / 2 : 0)))
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [])

  useMotionValueEvent(scrollY, 'change', () => {
    let now = -1
    toc.forEach((h, i) => {
      const el = document.getElementById(h.id)
      // The upper third, not the bar: the last short sections never reach the bar, yet are read.
      if (el && el.getBoundingClientRect().top < Math.max(LINE, window.innerHeight * 0.35)) now = i
    })
    setActive(now)
    // Hidden over the header, and while anything wider than the column shares its band.
    const box = nav.current?.getBoundingClientRect()
    const body = document.querySelector('[data-post-body]')
    const edge = body?.getBoundingClientRect().left ?? 0
    const blocked =
      !!box &&
      [...(body?.children ?? [])].some((el) => {
        const r = el.getBoundingClientRect()
        return r.left < edge - 1 && r.bottom > box.top - 24 && r.top < box.bottom + 24
      })
    setClear(window.scrollY > 420 && !blocked)
  })

  const activeY = active < 0 ? null : (centers[active] ?? null)
  const hoverY = hover === null ? null : (centers[hover] ?? null)
  // Above the active row its rail already covers the span, so the hover draws only the hook.
  const hoverFrom =
    activeY !== null && hoverY !== null && hoverY <= activeY ? Math.max(0, hoverY - CORNER) : (activeY ?? 0)

  return (
    <nav aria-label="Contents" {...stylex.props(styles.nav, clear && styles.navOn)}>
      <span {...stylex.props(styles.label)}>Contents</span>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: leaving only clears the pointer's rail; each row handles focus itself. */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: same handler, same reason. */}
      <div ref={nav} onMouseLeave={() => setHover(null)} {...stylex.props(styles.list)}>
        <Rail from={hoverFrom} y={hoverY} on={hover !== null && hover !== active} tone={styles.faint} />
        <Rail from={0} y={activeY} on={activeY !== null} tone={styles.accent} />
        {toc.map((h, i) => (
          <button
            key={h.id}
            ref={(el) => {
              rows.current[i] = el
            }}
            type="button"
            aria-current={i === active ? 'location' : undefined}
            tabIndex={clear ? 0 : -1}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() => goTo(h.id)}
            {...stylex.props(styles.row, i === active && styles.rowOn)}
          >
            {h.text}
          </button>
        ))}
      </div>
    </nav>
  )
}

/** Scrolls a heading to just under the bar, where it counts as read. */
export function goTo(id: string) {
  const el = document.getElementById(id)
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - LINE + 20, behavior: 'smooth' })
}

function Rail({ from, y, on, tone }: { from: number; y: number | null; on: boolean; tone: stylex.StyleXStyles }) {
  const still = useReducedMotion()
  const travel = still ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.7 }
  return (
    <motion.span
      aria-hidden="true"
      initial={false}
      animate={{ opacity: on && y !== null ? 1 : 0 }}
      transition={{ duration: still ? 0 : 0.2 }}
      {...stylex.props(styles.rail, tone)}
    >
      <motion.span
        initial={false}
        animate={{ top: from, height: Math.max(0, (y ?? 0) - CORNER - from) }}
        transition={travel}
        {...stylex.props(styles.line)}
      />
      <motion.svg
        initial={false}
        animate={{ top: (y ?? 0) - CORNER }}
        transition={travel}
        width="12"
        height="7"
        viewBox="0 0 12 7"
        fill="none"
        {...stylex.props(styles.hook)}
      >
        <path d="M0.5 0a6 6 0 0 0 6 6H12" stroke="currentColor" strokeDasharray="2 2" />
      </motion.svg>
    </motion.span>
  )
}

const WIDE = '@media (min-width: 1200px)'

const styles = stylex.create({
  nav: {
    display: { default: 'none', [WIDE]: 'flex' },
    flexDirection: 'column',
    position: 'fixed',
    top: '120px',
    // The 720px column's left edge, less the outline's width and a gutter.
    left: 'calc(50% - 360px - 232px)',
    zIndex: 10,
    width: '200px',
    opacity: 0,
    transform: 'translateX(-8px)',
    pointerEvents: 'none',
    transitionProperty: 'opacity, transform',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out
  },
  navOn: { opacity: 1, transform: 'translateX(0)', pointerEvents: 'auto' },
  label: {
    paddingBottom: '12px',
    paddingLeft: '2px',
    fontFamily: font.sans,
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: color.text
  },
  list: { position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' },
  rail: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
  accent: { color: color.accent },
  faint: { color: color.text3 },
  line: {
    position: 'absolute',
    left: '2px',
    width: '1px',
    backgroundImage: 'repeating-linear-gradient(to top, transparent 0 2px, currentColor 2px 4px)'
  },
  hook: { position: 'absolute', left: '2px' },
  row: {
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '20px',
    paddingRight: '8px',
    borderWidth: 0,
    borderRadius: '8px',
    backgroundColor: 'transparent',
    textAlign: 'left',
    fontFamily: font.sans,
    fontSize: '14px',
    lineHeight: 1.35,
    color: { default: color.text3, ':hover': color.text2 },
    cursor: 'pointer',
    transitionProperty: 'color',
    transitionDuration: '0.2s',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '-2px'
  },
  rowOn: { color: { default: color.text, ':hover': color.text } }
})

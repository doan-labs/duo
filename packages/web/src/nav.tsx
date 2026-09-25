import * as stylex from '@stylexjs/stylex'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { useLenis } from 'lenis/react'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CURVE, SHEET, SLIDE, TAP } from './motion'
import { GITHUB_MARK, NAV, REPO } from './site'
import { setTheme, type Theme, useTheme } from './theme'
import { color, ease, font, radius } from './tokens.stylex'

/** Reduced motion keeps every end state and drops only the travel. */
const NOW = { duration: 0 } as const
const FADE = { duration: 0.24, ease: CURVE } as const
/** Leaving is always a tween: a spring exit makes a dismissed sheet linger. */
const LEAVE = { duration: 0.16, ease: CURVE } as const
const FOLD = 1068

/**
 * The sheet's id is a constant, not `useId()`. There is exactly one global bar
 * per page so nothing can collide, and a generated id would have to survive
 * `SmoothScroll` mounting its children at one tree depth on the server and
 * another on a reduced-motion client: same DOM, but `useId()` encodes the tree
 * path, so the two disagree and `aria-controls` aborts hydration.
 */
const SHEET_ID = 'nav-sheet'

/**
 * Motion renders `tabIndex` itself for anything carrying a gesture prop, and
 * those props are gated on `useReducedMotion()`, which is null on the server and
 * a boolean on the client. A reader with reduced motion on therefore hydrated a
 * server `tabindex="0"` against a client that had none. Every gesture element
 * below states its own `tabIndex` so the attribute cannot depend on the gate.
 */
const KEEP = 0
const SKIP = -1

/**
 * One quiet bar: the wordmark, five links, GitHub, the theme toggle and the
 * call to action. It gains a hairline and deeper blur once the page leaves the
 * top, so the bar only asserts itself when there is content behind it.
 */
export function Nav() {
  const matchRoute = useMatchRoute()
  const still = useReducedMotion() ?? false
  const [lifted, setLifted] = useState(false)
  // Lenis scrolls the window itself, so the native scroll position stays authoritative.
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => setLifted(y > 4))
  return (
    <header {...stylex.props(styles.bar, lifted && styles.barLifted)}>
      <motion.span
        aria-hidden="true"
        {...stylex.props(styles.hairline)}
        initial={false}
        animate={{ opacity: lifted ? 1 : 0 }}
        transition={still ? NOW : FADE}
      />
      <nav {...stylex.props(styles.inner)} aria-label="Global">
        <Link to="/" {...stylex.props(styles.logo)} aria-label="Duo home">
          <img src="/icon.svg" alt="" width="22" height="22" {...stylex.props(styles.glyph)} />
          Duo
        </Link>
        <ul {...stylex.props(styles.list)}>
          {NAV.map((n) => {
            const on = !!matchRoute({ to: n.to, fuzzy: true })
            return (
              <li key={n.to} {...stylex.props(styles.item)}>
                <Link
                  to={n.to}
                  aria-current={on ? 'page' : undefined}
                  {...stylex.props(styles.link, 'highlight' in n && styles.highlight, on && styles.on)}
                >
                  <Icon d={n.icon} />
                  {n.label}
                  {on && (
                    <motion.span
                      layoutId="nav-on"
                      {...stylex.props(styles.mark)}
                      initial={false}
                      transition={still ? NOW : SLIDE}
                    />
                  )}
                </Link>
              </li>
            )
          })}
          <li {...stylex.props(styles.item)}>
            <a href={REPO} {...stylex.props(styles.link)}>
              <Icon d={GITHUB_MARK} fill />
              GitHub
            </a>
          </li>
        </ul>
        <div {...stylex.props(styles.right)}>
          <ThemeToggle />
          {/* The link inside is the real tab stop; this wrapper only carries the press. */}
          <motion.span
            tabIndex={SKIP}
            {...stylex.props(styles.ctaWrap)}
            whileHover={still ? undefined : { scale: 1.035 }}
            whileTap={still ? undefined : { scale: TAP }}
          >
            <Link to="/simulator" {...stylex.props(styles.cta)}>
              Try Duo
            </Link>
          </motion.span>
          <Menu />
        </div>
      </nav>
    </header>
  )
}

/**
 * The fold's disclosure. It was a native `<details>` so the menu needed no
 * script, but that buys nothing here: the bar already ships React for the theme
 * toggle and the indicator, and `<details>` cannot fade, stagger or animate
 * out. The trade accepted: with JavaScript off the menu button does nothing,
 * so every destination in it is also reachable from the footer.
 */
function Menu() {
  const matchRoute = useMatchRoute()
  const still = useReducedMotion() ?? false
  const lenis = useLenis()
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const wrap = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    toggle.current?.focus()
  }, [])

  // A resize past the fold hands the links back to the desktop list, which would
  // leave the sheet open over a bar that no longer has a way to close it. Tab is
  // caught on the window rather than the wrapper so a stray focus cannot escape.
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close()
      if (e.key !== 'Tab' || !wrap.current) return
      const able = wrap.current.querySelectorAll<HTMLElement>('a[href], button:not([tabindex="-1"])')
      const first = able[0]
      const last = able[able.length - 1]
      if (!first || !last || document.activeElement !== (e.shiftKey ? first : last)) return
      e.preventDefault()
      ;(e.shiftKey ? last : first).focus()
    }
    const resize = () => window.innerWidth > FOLD && setOpen(false)
    window.addEventListener('keydown', key)
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('resize', resize)
    }
  }, [open, close])

  // Lenis owns the scroll: stopping it both freezes the glide and clips the page
  // through its own `lenis-stopped` class. Reduced-motion readers have no Lenis.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const was = root.style.overflow
    if (lenis) lenis.stop()
    else root.style.overflow = 'hidden'
    return () => {
      if (lenis) lenis.start()
      else root.style.overflow = was
    }
  }, [open, lenis])

  return (
    <div ref={wrap} {...stylex.props(styles.menu)}>
      <motion.button
        ref={toggle}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={SHEET_ID}
        tabIndex={KEEP}
        {...stylex.props(styles.icon)}
        whileTap={still ? undefined : { scale: TAP }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          {/* Two lines, not two icons: each slides to the middle and turns half a right angle. */}
          <motion.path
            d="M2 5.5h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={false}
            animate={open ? { y: 3.5, rotate: 45 } : { y: 0, rotate: 0 }}
            transition={still ? NOW : SHEET}
          />
          <motion.path
            d="M2 12.5h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={false}
            animate={open ? { y: -3.5, rotate: -45 } : { y: 0, rotate: 0 }}
            transition={still ? NOW : SHEET}
          />
        </svg>
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            {/*
             * Portalled to the body because the bar's own `backdrop-filter` opens a
             * backdrop root: a scrim nested inside it would filter the bar's contents
             * rather than the page, so its blur would be dead CSS.
             */}
            {createPortal(
              <motion.button
                key="scrim"
                type="button"
                tabIndex={SKIP}
                aria-label="Close the menu"
                onClick={close}
                {...stylex.props(styles.scrim)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={still ? NOW : FADE}
              />,
              document.body
            )}
            <motion.div
              key="sheet"
              id={SHEET_ID}
              data-lenis-prevent
              {...stylex.props(styles.sheet)}
              variants={still ? STILL_SHEET : OPEN_SHEET}
              initial="shut"
              animate="open"
              exit="shut"
            >
              <ul {...stylex.props(styles.sheetList)}>
                {NAV.map((n) => (
                  <Row key={n.to} to={n.to} on={!!matchRoute({ to: n.to, fuzzy: true })} still={still} onClick={close}>
                    <Icon d={n.icon} />
                    {n.label}
                  </Row>
                ))}
                <Row href={REPO} still={still} onClick={close}>
                  <Icon d={GITHUB_MARK} fill />
                  GitHub
                </Row>
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Rows arrive one after another and leave together, so dismissal reads as a single gesture. */
const OPEN_SHEET = {
  shut: { opacity: 0, y: -14, scale: 0.97, transition: { ...LEAVE, staggerChildren: 0 } },
  open: { opacity: 1, y: 0, scale: 1, transition: { ...SHEET, delayChildren: 0.04, staggerChildren: 0.035 } }
}
const STILL_SHEET = { shut: { opacity: 0, transition: NOW }, open: { opacity: 1, transition: NOW } }
const OPEN_ROW = {
  shut: { opacity: 0, y: -8, transition: LEAVE },
  open: { opacity: 1, y: 0, transition: SHEET }
}

function Row({
  to,
  href,
  on = false,
  still,
  onClick,
  children
}: {
  to?: string
  href?: string
  /** The route the visitor is already on, marked rather than merely coloured. */
  on?: boolean
  still: boolean
  onClick: () => void
  children: ReactNode
}) {
  const s = stylex.props(styles.sheetLink, on && styles.sheetOn)
  return (
    <motion.li {...stylex.props(styles.sheetItem)} variants={still ? undefined : OPEN_ROW}>
      {to ? (
        <Link to={to} onClick={onClick} {...s}>
          {children}
          {on && <span aria-hidden="true" {...stylex.props(styles.dot)} />}
        </Link>
      ) : (
        <a href={href} onClick={onClick} {...s}>
          {children}
        </a>
      )}
    </motion.li>
  )
}

/** A 16 × 16 glyph before a link's label, tinted by the link. Stroked by default; `fill` for a logo. */
function Icon({ d, fill = false }: { d: string; fill?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" {...stylex.props(styles.linkIcon)}>
      <path
        d={d}
        fill={fill ? 'currentColor' : 'none'}
        stroke={fill ? 'none' : 'currentColor'}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const SAYS: Record<Theme, string> = { system: 'following the system', light: 'light', dark: 'dark' }
const GLYPH: Record<Theme, ReactNode> = {
  light: (
    <>
      <circle cx="8" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </>
  ),
  dark: (
    <path
      d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  ),
  system: (
    <>
      <rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  )
}

/** Cycles system → light → dark. The label names the current state, not the next one. */
function ThemeToggle() {
  const theme = useTheme()
  const still = useReducedMotion() ?? false
  return (
    <motion.button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`Theme: ${SAYS[theme]}. Switch to ${SAYS[NEXT[theme]]}.`}
      tabIndex={KEEP}
      {...stylex.props(styles.icon)}
      whileTap={still ? undefined : { scale: 0.92 }}
    >
      {/* `initial={false}`: the glyph for the saved theme is already correct on first paint. */}
      <AnimatePresence initial={false}>
        <motion.svg
          key={theme}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          {...stylex.props(styles.themeGlyph)}
          initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 70, scale: 0.6 }}
          transition={still ? NOW : { duration: 0.3, ease: CURVE }}
        >
          {GLYPH[theme]}
        </motion.svg>
      </AnimatePresence>
    </motion.button>
  )
}

const MID = '@media (max-width: 1068px)'

const styles = stylex.create({
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: color.navBg,
    backdropFilter: 'saturate(160%) blur(14px)',
    transitionProperty: 'backdrop-filter',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out
  },
  barLifted: { backdropFilter: 'saturate(180%) blur(22px)' },
  /** The bottom edge, held back until there is page under the bar to separate from. */
  hairline: {
    position: 'absolute',
    insetInlineStart: 0,
    insetInlineEnd: 0,
    bottom: 0,
    height: '1px',
    backgroundColor: color.border,
    pointerEvents: 'none'
  },
  inner: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: { default: '40px', [MID]: '24px' },
    paddingRight: { default: '40px', [MID]: '24px' },
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: color.text,
    textDecoration: 'none',
    fontFamily: font.display,
    fontSize: '18px',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    borderRadius: radius.sm,
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineOffset: '4px'
  },
  glyph: { display: 'block', borderRadius: '5px' },
  list: {
    display: { default: 'flex', [MID]: 'none' },
    alignItems: 'center',
    gap: '4px',
    listStyleType: 'none',
    margin: 0,
    padding: 0
  },
  item: { display: 'block' },
  link: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radius.pill,
    color: { default: color.text2, ':hover': color.text },
    textDecoration: 'none',
    fontFamily: font.sans,
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: '-0.005em',
    whiteSpace: 'nowrap',
    transitionProperty: 'color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out,
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineOffset: '2px'
  },
  on: { color: color.text },
  linkIcon: { display: 'block', flexShrink: 0, opacity: 0.85 },
  /** The one link that is an invitation rather than a section: the accent, and it keeps it when active. */
  highlight: { color: { default: color.accent, ':hover': color.accent }, fontWeight: 600 },
  /** The moving indicator: one element shared across links via `layoutId`, tinted by whichever it lands on. */
  mark: {
    position: 'absolute',
    insetInlineStart: '13px',
    insetInlineEnd: '13px',
    bottom: '-1px',
    height: '2px',
    borderRadius: radius.pill,
    backgroundColor: 'currentColor'
  },
  right: { display: 'flex', alignItems: 'center', gap: '8px' },
  icon: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    padding: 0,
    borderRadius: radius.pill,
    borderWidth: 0,
    backgroundColor: { default: 'transparent', ':hover': color.well },
    color: { default: color.text2, ':hover': color.text },
    cursor: 'pointer',
    transitionProperty: 'background-color, color',
    transitionDuration: '0.2s',
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineOffset: '2px'
  },
  themeGlyph: { position: 'absolute', display: 'block' },
  ctaWrap: { display: 'inline-flex', willChange: 'transform' },
  cta: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '34px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radius.pill,
    backgroundColor: { default: color.text, ':hover': color.text2 },
    color: color.bg,
    textDecoration: 'none',
    fontFamily: font.sans,
    fontSize: '13px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    boxShadow: { default: 'none', ':hover': color.shadow },
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out,
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineOffset: '2px'
  },
  menu: { display: { default: 'none', [MID]: 'block' } },
  /**
   * Portalled to the body, so this one is measured from the viewport and sits
   * just under the bar's own z-index. It starts below the bar so the bar keeps
   * its material and stays tappable while the sheet is open.
   */
  scrim: {
    position: 'fixed',
    insetInlineStart: 0,
    insetInlineEnd: 0,
    top: '60px',
    bottom: 0,
    zIndex: 99,
    padding: 0,
    borderWidth: 0,
    backgroundColor: color.scrim,
    backdropFilter: 'saturate(140%) blur(12px)',
    cursor: 'default'
  },
  /**
   * Still inside the bar, whose `backdrop-filter` makes it this one's containing
   * block: `top` is measured from the top of the bar, not the viewport.
   */
  sheet: {
    position: 'fixed',
    top: '68px',
    insetInlineStart: '12px',
    insetInlineEnd: '12px',
    transformOrigin: 'top center',
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    boxShadow: color.shadow,
    padding: '8px'
  },
  sheetList: { listStyleType: 'none', margin: 0, padding: 0 },
  sheetItem: { display: 'block' },
  sheetLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '13px',
    paddingBottom: '13px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radius.md,
    color: { default: color.text, ':hover': color.text },
    textDecoration: 'none',
    fontFamily: font.sans,
    fontSize: '16px',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    backgroundColor: { default: 'transparent', ':hover': color.well, ':active': color.well },
    transform: { default: 'scale(1)', ':active': 'scale(0.985)' },
    transitionProperty: 'background-color, transform',
    transitionDuration: '0.15s',
    transitionTimingFunction: ease.out,
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineOffset: '-2px'
  },
  sheetOn: { backgroundColor: { default: color.well, ':hover': color.well }, fontWeight: 600 },
  dot: {
    marginInlineStart: 'auto',
    width: '6px',
    height: '6px',
    borderRadius: radius.pill,
    backgroundColor: color.accent
  }
})

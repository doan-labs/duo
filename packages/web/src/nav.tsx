import * as stylex from '@stylexjs/stylex'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { NAV, REPO } from './site'
import { setTheme, type Theme, useTheme } from './theme'
import { color, ease, font, radius } from './tokens.stylex'

/**
 * One quiet bar: the wordmark, four links, GitHub, the theme toggle and the
 * call to action. Under 1068 px the links fold into a native `<details>`
 * sheet so the menu needs no script.
 */
export function Nav() {
  const matchRoute = useMatchRoute()
  return (
    <header {...stylex.props(styles.bar)}>
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
                <Link to={n.to} {...stylex.props(styles.link, on && styles.on)}>
                  {n.label}
                  {on && <motion.span layoutId="nav-on" {...stylex.props(styles.mark)} />}
                </Link>
              </li>
            )
          })}
          <li {...stylex.props(styles.item)}>
            <a href={REPO} {...stylex.props(styles.link)}>
              GitHub
            </a>
          </li>
        </ul>
        <div {...stylex.props(styles.right)}>
          <ThemeToggle />
          <Link to="/simulator" {...stylex.props(styles.cta)}>
            Try Duo
          </Link>
          <details {...stylex.props(styles.menu)}>
            <summary {...stylex.props(styles.summary)} aria-label="Menu">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M2 5.5h14M2 12.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </summary>
            <ul {...stylex.props(styles.sheet)}>
              {NAV.map((n) => (
                <li key={n.to} {...stylex.props(styles.sheetItem)}>
                  <Link to={n.to} {...stylex.props(styles.sheetLink)}>
                    {n.label}
                  </Link>
                </li>
              ))}
              <li {...stylex.props(styles.sheetItem)}>
                <a href={REPO} {...stylex.props(styles.sheetLink)}>
                  GitHub
                </a>
              </li>
            </ul>
          </details>
        </div>
      </nav>
    </header>
  )
}

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const SAYS: Record<Theme, string> = { system: 'following the system', light: 'light', dark: 'dark' }

/** Cycles system → light → dark. The label names the current state, not the next one. */
function ThemeToggle() {
  const theme = useTheme()
  const still = useReducedMotion()
  return (
    <motion.button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`Theme: ${SAYS[theme]}. Switch to ${SAYS[NEXT[theme]]}.`}
      {...stylex.props(styles.icon)}
      whileTap={still ? undefined : { scale: 0.92 }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {theme === 'light' && (
          <>
            <circle cx="8" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </>
        )}
        {theme === 'dark' && (
          <path
            d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        )}
        {theme === 'system' && (
          <>
            <rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M5.5 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </>
        )}
      </svg>
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
    backdropFilter: 'saturate(160%) blur(14px)'
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
    letterSpacing: '-0.03em'
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
    display: 'block',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
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
    transitionTimingFunction: ease.out
  },
  on: { color: color.text },
  /** The moving indicator: one element shared across links via `layoutId`. */
  mark: {
    position: 'absolute',
    insetInlineStart: '12px',
    insetInlineEnd: '12px',
    bottom: '1px',
    height: '1px',
    backgroundColor: color.text
  },
  right: { display: 'flex', alignItems: 'center', gap: '8px' },
  icon: {
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
    transitionDuration: '0.2s'
  },
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
    transitionProperty: 'background-color',
    transitionDuration: '0.2s'
  },
  menu: {
    display: { default: 'none', [MID]: 'block' },
    position: 'relative'
  },
  summary: {
    listStyleType: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    borderRadius: radius.pill,
    color: color.text,
    '::-webkit-details-marker': { display: 'none' }
  },
  sheet: {
    position: 'absolute',
    top: '44px',
    insetInlineEnd: '-24px',
    width: '100vw',
    backgroundColor: color.bg,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    listStyleType: 'none',
    margin: 0,
    paddingTop: '8px',
    paddingBottom: '16px',
    paddingLeft: '24px',
    paddingRight: '24px'
  },
  sheetItem: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border
  },
  sheetLink: {
    display: 'block',
    paddingTop: '14px',
    paddingBottom: '14px',
    color: color.text,
    textDecoration: 'none',
    fontFamily: font.sans,
    fontSize: '16px',
    fontWeight: 500
  }
})

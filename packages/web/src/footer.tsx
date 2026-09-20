import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { TAP } from './motion'
import { DOAN, LICENSE, MORE, NAV, REPO } from './site'
import { color, ease, font, radius } from './tokens.stylex'

/**
 * The Doan mark: a half disc, a ring, a triangle and a tilted square on a 24
 * grid, one to a cell. Copied from doan-labs.com's handoff file
 * (public/doan-mark.svg); strokes are outlined so it fills in currentColor.
 */
const DoanMark = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" {...stylex.props(styles.markSvg)}>
    <path fill="currentColor" d="M5.6 3.4A4.1 4.1 0 0 1 5.6 11.6Z" />
    <path
      fill="currentColor"
      d="M21 7.5A4.5 4.5 0 1 1 12 7.5A4.5 4.5 0 1 1 21 7.5ZM19.2 7.5A2.7 2.7 0 1 0 13.8 7.5A2.7 2.7 0 1 0 19.2 7.5Z"
    />
    <path fill="currentColor" d="M7.5 12.9L3.5 20.1L11.5 20.1Z" />
    <path
      fill="currentColor"
      d="M16.5 11.586L21.414 16.5L16.5 21.414L11.586 16.5ZM16.5 14.061L14.061 16.5L16.5 18.939L18.939 16.5Z"
    />
  </svg>
)

/** The pages the bar already carries, so the two columns never disagree about where a page lives. */
const IN_NAV = new Set<string>(NAV.map((n) => n.to))
const PROJECT = MORE.filter((m) => !IN_NAV.has(m.to))

/**
 * The end of the page, not a link dump: the wordmark and what Duo is, then the
 * pages in two named columns, then the small print on its own hairline. Every
 * link draws its underline rather than switching it on.
 */
export function Footer() {
  // `?? false`, and the gesture props are always present with their values
  // gated instead of the props themselves. The server cannot read the media
  // query, so a reader who prefers less motion would otherwise hydrate a
  // different set of props than the server rendered. `tabIndex` is stated
  // because motion makes anything with a gesture focusable, which would put a
  // second, empty tab stop in front of the wordmark's own link.
  const still = useReducedMotion() ?? false
  return (
    <footer {...stylex.props(styles.foot)}>
      <div {...stylex.props(styles.top)}>
        <div>
          <motion.span
            tabIndex={-1}
            whileHover={still ? undefined : { scale: 1.02 }}
            whileTap={still ? undefined : { scale: TAP }}
            {...stylex.props(styles.markWrap)}
          >
            <Link to="/" {...stylex.props(styles.mark)}>
              <img src="/icon.svg" alt="" width="24" height="24" {...stylex.props(styles.glyph)} />
              Duo
            </Link>
          </motion.span>
          <p {...stylex.props(styles.blurb)}>
            A working simulator of a phone that folds, and the SDK to build apps for it.
          </p>
        </div>
        <div {...stylex.props(styles.columns)}>
          <nav aria-label="Platform" {...stylex.props(styles.column)}>
            <h2 {...stylex.props(styles.heading)}>Platform</h2>
            {NAV.map((n) => (
              <Item key={n.to} to={n.to}>
                {n.label}
              </Item>
            ))}
          </nav>
          <nav aria-label="Project" {...stylex.props(styles.column)}>
            <h2 {...stylex.props(styles.heading)}>Project</h2>
            <Item href={REPO}>GitHub</Item>
            {PROJECT.map((m) => (
              <Item key={m.to} to={m.to}>
                {m.label}
              </Item>
            ))}
            <Item href={LICENSE}>License</Item>
          </nav>
        </div>
      </div>
      <div {...stylex.props(styles.base)}>
        <a href={DOAN} {...stylex.props(styles.link, styles.studio)}>
          <DoanMark />
          An experiment by Doan Labs
        </a>
        <p {...stylex.props(styles.fine)}>Built in the open. Not affiliated with Apple.</p>
      </div>
    </footer>
  )
}

/** One footer link, internal or out to GitHub; the two look and behave the same. */
function Item({ to, href, children }: { to?: string; href?: string; children: ReactNode }) {
  if (to) {
    return (
      <Link to={to} {...stylex.props(styles.link)}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} {...stylex.props(styles.link)}>
      {children}
    </a>
  )
}

const SMALL = '@media (max-width: 734px)'
const NARROW = '@media (max-width: 460px)'

const styles = stylex.create({
  foot: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingTop: { default: '88px', [SMALL]: '64px' },
    paddingBottom: { default: '56px', [SMALL]: '48px' },
    paddingLeft: { default: '40px', [SMALL]: '24px' },
    paddingRight: { default: '40px', [SMALL]: '24px' },
    fontFamily: font.sans,
    color: color.text,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  top: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr) auto', [SMALL]: 'minmax(0, 1fr)' },
    alignItems: 'start',
    gap: { default: '64px', [SMALL]: '48px' }
  },
  // The wrapper scales, not the link, so the press never fights the underline.
  markWrap: { display: 'inline-block', transformOrigin: 'left center' },
  mark: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    fontFamily: font.display,
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    color: { default: color.text, ':hover': color.text },
    textDecoration: 'none',
    borderRadius: radius.sm,
    outlineWidth: '2px',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.ring,
    outlineOffset: '4px'
  },
  glyph: {
    display: 'block',
    borderRadius: '6px',
    // The mark is the one place the near-black icon sits on a warm page; a
    // hairline keeps it from looking pasted on.
    boxShadow: `0 0 0 1px ${color.border}`
  },
  blurb: {
    marginTop: '16px',
    marginBottom: 0,
    maxWidth: '30ch',
    fontSize: '14px',
    lineHeight: 1.6,
    color: color.text2
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, minmax(0, auto))', [NARROW]: 'minmax(0, 1fr)' },
    gap: { default: '72px', [SMALL]: '48px' }
  },
  // `align-content: start`, or the shorter column's rows stretch to match the
  // taller one and the two lists stop sharing a baseline grid.
  column: { display: 'grid', alignContent: 'start', gap: '12px', justifyItems: 'start' },
  heading: {
    margin: 0,
    marginBottom: '4px',
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.text3
  },
  link: {
    // The underline is a painted gradient so it can grow from the left instead
    // of appearing all at once; `text-decoration` cannot be animated.
    backgroundImage: 'linear-gradient(currentColor, currentColor)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '0 100%',
    backgroundSize: { default: '0% 1px', ':hover': '100% 1px', ':focus-visible': '100% 1px' },
    paddingBottom: '2px',
    fontSize: '14px',
    lineHeight: 1.3,
    color: { default: color.text2, ':hover': color.text, ':focus-visible': color.text },
    opacity: { default: 1, ':active': 0.55 },
    textDecoration: 'none',
    borderRadius: radius.sm,
    outlineWidth: '2px',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.ring,
    outlineOffset: '4px',
    transitionProperty: 'background-size, color, opacity',
    transitionDuration: { default: '0.34s', ':active': '0.06s' },
    transitionTimingFunction: ease.out
  },
  base: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: { default: '64px', [SMALL]: '48px' },
    paddingTop: '24px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  studio: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    // Repeats the hover keys because a flat `color` here would replace the
    // whole conditional the shared link style sets.
    color: { default: color.text3, ':hover': color.text, ':focus-visible': color.text }
  },
  fine: { margin: 0, fontSize: '13px', color: color.text3 },
  markSvg: { display: 'block', flexShrink: 0 }
})

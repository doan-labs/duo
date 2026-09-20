// The launch page's building blocks: a 1280 px block, editorial headlines, a
// mono caption, the reveals that bring them in, and the near-black wrapper for
// cinematic moments.
import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { CURVE } from '../motion'
import { color, dark, ease, font, radius } from '../tokens.stylex'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

// Re-exported because `hero.tsx` reaches for the curve through this module.
export { CURVE }

/**
 * A reveal must never be able to strand its content, and `whileInView` on its
 * own can. An IntersectionObserver only reports a *change*, so a jump longer
 * than the viewport - a hash link, a scroll position restored on reload, the
 * End key - carries an element from below the fold to above it between two
 * ticks. The observer reads "not intersecting" both times, never fires, and the
 * content sits at opacity 0 for good, with no scroll that brings it back.
 *
 * Expanding the observer's root far above the viewport redefines "seen" as "at
 * or above the fold". Anything scrolled past is inside the root, so the state
 * does change, the observer fires, and the element reveals itself. The page
 * keeps its scroll rhythm and the content cannot be lost.
 *
 * Measured on the home page, two 6000 px jumps, counting the elements this
 * module reveals: 14 of 16 left hidden with no margin, all 14 above the
 * viewport; 0 with this one. The margin only has to exceed the tallest page on
 * the site, about 12000 px, and 30000 px measured the same as this; the larger
 * value is headroom, not a requirement.
 */
const seen = (amount: number) => ({ once: true, amount, margin: '200000px 0px 0px 0px' })

/**
 * Fades and lifts its children into view once.
 *
 * Reduced motion shortens the transition to nothing rather than dropping
 * `initial`: the server has no media query to read, so a reader who prefers
 * less motion would hydrate against markup that assumed the opposite and React
 * would discard the tree. Same markup either way, no movement in it.
 *
 * `height: 100%` keeps the wrapper out of the way of a grid. It is invisible in
 * normal flow, where a percentage height against an auto-height parent computes
 * to `auto`, but inside a stretched grid item it passes the row's height
 * through, so a card with `min-height: 100%` still matches its neighbours.
 */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const still = useReducedMotion() ?? false
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={seen(0.25)}
      transition={still ? { duration: 0 } : { duration: 0.7, delay, ease: CURVE }}
      {...stylex.props(styles.pass)}
    >
      {children}
    </motion.div>
  )
}

/** The handful of elements a stagger ever needs to be, so the markup stays honest. */
const TAGS = { div: motion.div, ul: motion.ul, li: motion.li, span: motion.span }

/**
 * A section whose children arrive one after another instead of as one slab.
 * The container only schedules; each `Rise` inside owns how it moves, so a
 * page can vary the gesture (lift, slide, settle) without re-timing anything.
 *
 * Motion carries the variant down through plain DOM, so a `Rise` does not have
 * to be an immediate child: a row of buttons inside a `<div>` is still part of
 * the same sequence. Nesting a second `Stagger` is the thing to avoid, because
 * its own `whileInView` would start a sequence of its own.
 */
export function Stagger({
  children,
  gap = 0.07,
  delay = 0,
  amount = 0.25,
  as = 'div',
  styles: s
}: {
  children: ReactNode
  /** Seconds between one child and the next. */
  gap?: number
  /** Seconds before the first child moves. */
  delay?: number
  /** How much of the container must be on screen before it runs. */
  amount?: number
  /** The element to render, so a staggered list stays a real list. */
  as?: keyof typeof TAGS
  styles?: stylex.StyleXStyles
}) {
  const still = useReducedMotion() ?? false
  const M = TAGS[as]
  return (
    <M
      initial="out"
      whileInView="in"
      viewport={seen(amount)}
      variants={{ in: { transition: { staggerChildren: still ? 0 : gap, delayChildren: still ? 0 : delay } } }}
      {...stylex.props(s)}
    >
      {children}
    </M>
  )
}

/** The gestures a `Rise` can arrive with. Distances stay small: this is punctuation, not travel. */
const MOVES: Record<'up' | 'left' | 'right' | 'in', Variants> = {
  up: { out: { opacity: 0, y: 22 }, in: { opacity: 1, y: 0 } },
  left: { out: { opacity: 0, x: -18 }, in: { opacity: 1, x: 0 } },
  right: { out: { opacity: 0, x: 18 }, in: { opacity: 1, x: 0 } },
  in: { out: { opacity: 0, scale: 0.96 }, in: { opacity: 1, scale: 1 } }
}

/** One beat of a `Stagger`. Renders the element itself, so it can carry the grid styles. */
export function Rise({
  children,
  move = 'up',
  as = 'div',
  styles: s
}: {
  children: ReactNode
  move?: keyof typeof MOVES
  as?: keyof typeof TAGS
  styles?: stylex.StyleXStyles
}) {
  const still = useReducedMotion() ?? false
  const M = TAGS[as]
  return (
    <M
      variants={MOVES[move]}
      transition={still ? { duration: 0 } : { duration: 0.66, ease: CURVE }}
      {...stylex.props(s)}
    >
      {children}
    </M>
  )
}

/** A page section: generous vertical room, a 1280 px column. `cinema` switches to the near-black palette. */
export function Block({
  children,
  cinema = false,
  id,
  labelledBy
}: {
  children: ReactNode
  cinema?: boolean
  id?: string
  labelledBy?: string
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} {...stylex.props(cinema && dark, styles.block)}>
      <div {...stylex.props(styles.inner)}>{children}</div>
    </section>
  )
}

/** Mono, small, letter-spaced: the technical caption above a headline. */
export function Cap({ children }: { children: ReactNode }) {
  return <p {...stylex.props(styles.cap)}>{children}</p>
}

/** The editorial headline. Line breaks are the author's: pass an array of lines. */
export function Headline({
  lines,
  id,
  size = 'lg',
  as: H = 'h2'
}: {
  lines: string[]
  id?: string
  size?: 'lg' | 'md'
  /** A page's first headline is its `h1`. */
  as?: 'h1' | 'h2'
}) {
  return (
    <H id={id} {...stylex.props(styles.headline, size === 'md' && styles.headlineMd)}>
      {lines.map((l, i) => (
        <span key={l} {...stylex.props(styles.line)}>
          {l}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </H>
  )
}

/** The short supporting paragraph under a headline. */
export function Lede({ children }: { children: ReactNode }) {
  return <p {...stylex.props(styles.lede)}>{children}</p>
}

/** Big, short, one thought per line: the mid-page statements the plan calls for. */
export function Statement({ lines }: { lines: string[] }) {
  return (
    <p {...stylex.props(styles.statement)}>
      {lines.map((l, i) => (
        <span key={l}>
          {l}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  )
}

/** A code or terminal block. Mono only here. */
export function Code({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div {...stylex.props(styles.code)}>
      {title && <div {...stylex.props(styles.codeTitle)}>{title}</div>}
      <pre {...stylex.props(styles.pre)}>{children}</pre>
    </div>
  )
}

/**
 * A link in running text, internal or out. The underline is painted rather than
 * decorated so it can grow from the left; `text-decoration` cannot be animated.
 * `lead` is the standalone variant that ends a paragraph of its own.
 */
export function TextLink({
  to,
  href,
  lead = false,
  children
}: {
  to?: string
  href?: string
  lead?: boolean
  children: ReactNode
}) {
  const props = stylex.props(styles.textLink, lead && styles.textLinkLead)
  if (to) {
    return (
      <Link to={to} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} {...props}>
      {children}
    </a>
  )
}

/** Two columns, 5:7, that stack under 1068 px. `flip` makes it 7:5 for a wide first child. */
export function Columns({
  children,
  flip = false,
  align = 'center'
}: {
  children: ReactNode
  flip?: boolean
  align?: 'center' | 'start'
}) {
  return (
    <div {...stylex.props(styles.columns, flip && styles.flip, align === 'start' && styles.alignStart)}>{children}</div>
  )
}

const styles = stylex.create({
  // See `Reveal`: a no-op in normal flow, a height pass-through inside a grid.
  pass: { height: '100%' },
  block: {
    paddingTop: { default: '160px', [MID]: '120px', [SMALL]: '88px' },
    paddingBottom: { default: '160px', [MID]: '120px', [SMALL]: '88px' },
    paddingLeft: { default: '40px', [SMALL]: '24px' },
    paddingRight: { default: '40px', [SMALL]: '24px' },
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: font.sans
  },
  inner: { maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto' },
  cap: {
    margin: 0,
    marginBottom: '24px',
    fontFamily: font.mono,
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: color.text3
  },
  headline: {
    margin: 0,
    fontFamily: font.display,
    fontSize: { default: '64px', [MID]: '48px', [SMALL]: '36px' },
    lineHeight: 1.04,
    fontWeight: 600,
    letterSpacing: '-0.035em',
    color: color.text,
    textWrap: 'balance'
  },
  headlineMd: { fontSize: { default: '44px', [MID]: '36px', [SMALL]: '30px' } },
  line: { display: 'inline' },
  lede: {
    marginTop: '24px',
    marginBottom: 0,
    maxWidth: '38ch',
    fontSize: { default: '20px', [SMALL]: '17px' },
    lineHeight: 1.5,
    color: color.text2
  },
  statement: {
    margin: 0,
    fontFamily: font.display,
    fontSize: { default: '40px', [MID]: '32px', [SMALL]: '26px' },
    lineHeight: 1.15,
    fontWeight: 500,
    letterSpacing: '-0.025em',
    color: color.text
  },
  code: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: '14px',
    backgroundColor: color.surface,
    overflow: 'hidden'
  },
  codeTitle: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '18px',
    paddingRight: '18px',
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.06em',
    color: color.text3,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border
  },
  pre: {
    margin: 0,
    paddingTop: '18px',
    paddingBottom: '18px',
    paddingLeft: '18px',
    paddingRight: '18px',
    fontFamily: font.mono,
    fontSize: '13.5px',
    lineHeight: 1.7,
    color: color.text,
    overflowX: 'auto',
    whiteSpace: 'pre'
  },
  textLink: {
    backgroundImage: 'linear-gradient(currentColor, currentColor)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '0 100%',
    // Starts drawn, because in running text a link has to read as one before it
    // is pointed at; hover thickens it instead of inventing it.
    backgroundSize: { default: '100% 1px', ':hover': '100% 2px', ':focus-visible': '100% 2px' },
    paddingBottom: '2px',
    color: color.text,
    textDecoration: 'none',
    opacity: { default: 1, ':active': 0.55 },
    borderRadius: radius.sm,
    outlineWidth: '2px',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.ring,
    outlineOffset: '4px',
    transitionProperty: 'background-size, opacity',
    transitionDuration: { default: '0.3s', ':active': '0.06s' },
    transitionTimingFunction: ease.out
  },
  textLinkLead: { display: 'inline-block', fontSize: '16px' },
  columns: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 5fr) minmax(0, 7fr)', [MID]: 'minmax(0, 1fr)' },
    alignItems: 'center',
    gap: { default: '80px', [MID]: '56px' }
  },
  flip: { gridTemplateColumns: { default: 'minmax(0, 7fr) minmax(0, 5fr)', [MID]: 'minmax(0, 1fr)' } },
  alignStart: { alignItems: 'start' }
})

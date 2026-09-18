// The launch page's building blocks: a 1280 px block, editorial headlines, a
// mono caption, one reveal, and the near-black wrapper for cinematic moments.
import * as stylex from '@stylexjs/stylex'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { color, dark, font } from '../tokens.stylex'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'
export const CURVE = [0.22, 1, 0.36, 1] as const

/** Fades and lifts its children into view once. Reduced motion gets the content without movement. */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const still = useReducedMotion()
  return (
    <motion.div
      initial={still ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: CURVE }}
    >
      {children}
    </motion.div>
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
  columns: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 5fr) minmax(0, 7fr)', [MID]: 'minmax(0, 1fr)' },
    alignItems: 'center',
    gap: { default: '80px', [MID]: '56px' }
  },
  flip: { gridTemplateColumns: { default: 'minmax(0, 7fr) minmax(0, 5fr)', [MID]: 'minmax(0, 1fr)' } },
  alignStart: { alignItems: 'start' }
})

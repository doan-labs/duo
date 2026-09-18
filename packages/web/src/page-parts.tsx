// The pieces the shared layout primitives do not cover, used by more than one
// route: the mono eyebrow over a page's headline, a reduced-motion-aware
// entrance, and the code and table shapes several pages repeat. Anything used
// by a single page stays in that page's own stylex.create.
import * as stylex from '@stylexjs/stylex'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { color, font, radius } from './tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

const IN = { opacity: 0, transform: 'translateY(14px)' }
const OUT = { opacity: 1, transform: 'translateY(0px)' }

/**
 * Fades a section top in the first time it scrolls into view. The element is
 * always a `motion.div` so the server and client trees match; when the visitor
 * asks for less motion the animation props are simply dropped.
 */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const still = useReducedMotion()
  return (
    <motion.div
      initial={still ? false : IN}
      whileInView={still ? undefined : OUT}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** A page's top: mono uppercase eyebrow, display headline, lead paragraph. */
export function PageTop({
  eyebrow,
  title,
  lead,
  badge
}: {
  eyebrow: string
  title: string
  lead?: ReactNode
  badge?: ReactNode
}) {
  return (
    <Reveal>
      <p {...stylex.props(styles.eyebrow)}>{eyebrow}</p>
      <h1 {...stylex.props(styles.h1)}>
        {title}
        {badge && <span {...stylex.props(styles.badge)}>{badge}</span>}
      </h1>
      {lead && <p {...stylex.props(styles.lead)}>{lead}</p>}
    </Reveal>
  )
}

/** The same shape one level down: mono eyebrow over an `h2`, revealed on scroll. */
export function SectionTop({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: ReactNode }) {
  return (
    <Reveal>
      <p {...stylex.props(styles.eyebrow)}>{eyebrow}</p>
      <h2 {...stylex.props(styles.h2)}>{title}</h2>
      {lead && <p {...stylex.props(styles.lead)}>{lead}</p>}
    </Reveal>
  )
}

export function Code({ children }: { children: ReactNode }) {
  return <code {...stylex.props(styles.code)}>{children}</code>
}

/** A code block: surface, hairline, scrolls rather than overflowing. */
export function Pre({ children }: { children: string }) {
  return (
    <pre {...stylex.props(styles.pre)}>
      <code>{children}</code>
    </pre>
  )
}

/** A data table that scrolls inside its own box on a narrow screen. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div {...stylex.props(styles.tableWrap)}>
      <table {...stylex.props(styles.table)}>{children}</table>
    </div>
  )
}

export function Th({ children }: { children: ReactNode }) {
  return <th {...stylex.props(styles.th)}>{children}</th>
}

export function Td({ children, nowrap = false }: { children: ReactNode; nowrap?: boolean }) {
  return <td {...stylex.props(styles.td, nowrap && styles.nowrap)}>{children}</td>
}

const styles = stylex.create({
  eyebrow: {
    margin: 0,
    marginBottom: '14px',
    fontFamily: font.mono,
    fontSize: '12px',
    lineHeight: 1.2,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: color.text3
  },
  h1: {
    margin: 0,
    fontFamily: font.display,
    fontSize: { default: '52px', [SMALL]: '38px' },
    lineHeight: 1.04,
    fontWeight: 600,
    letterSpacing: '-0.03em',
    color: color.text
  },
  h2: {
    margin: 0,
    fontFamily: font.display,
    fontSize: { default: '34px', [SMALL]: '27px' },
    lineHeight: 1.12,
    fontWeight: 600,
    letterSpacing: '-0.025em',
    color: color.text
  },
  badge: { display: 'inline-block', marginLeft: '12px', verticalAlign: 'middle' },
  lead: {
    marginTop: '18px',
    marginBottom: '32px',
    maxWidth: '680px',
    fontFamily: font.sans,
    fontSize: { default: '20px', [SMALL]: '18px' },
    lineHeight: 1.5,
    color: color.text2
  },
  code: {
    fontFamily: font.mono,
    fontSize: '0.86em',
    backgroundColor: color.well,
    borderRadius: '6px',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '5px',
    paddingRight: '5px',
    overflowWrap: 'anywhere'
  },
  pre: {
    margin: 0,
    marginBottom: '16px',
    fontFamily: font.mono,
    fontSize: '13px',
    lineHeight: 1.6,
    color: color.text,
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    paddingTop: '18px',
    paddingBottom: '18px',
    paddingLeft: '20px',
    paddingRight: '20px',
    overflowX: 'auto',
    whiteSpace: 'pre'
  },
  tableWrap: {
    marginBottom: '24px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    overflowX: 'auto'
  },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    // The last row's rule would otherwise double up with the box's own bottom edge.
    marginBottom: '-1px',
    minWidth: '420px',
    fontFamily: font.sans,
    fontSize: '15px',
    lineHeight: 1.5
  },
  th: {
    textAlign: 'left',
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.text3,
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: '18px',
    paddingRight: '18px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    whiteSpace: 'nowrap'
  },
  td: {
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: '18px',
    paddingRight: '18px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    verticalAlign: 'top',
    color: color.text
  },
  nowrap: { whiteSpace: 'nowrap' }
})

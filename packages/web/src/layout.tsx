// The page building blocks: eyebrow, section, prose, title and the pill button.
// A 1120 px content column, 720 px measure for reading, and the folds at
// 1068 / 833 / 734. The docs sidebar lives in side-nav.tsx, the scroll reveal
// in page-parts.tsx.
import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { SLIDE, TAP } from './motion'
import { color, ease, font, radius } from './tokens.stylex'

/** Mono, uppercase, letter-spaced: the small label that sits above a title. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p {...stylex.props(styles.eyebrow)}>{children}</p>
}

export function Button({
  to,
  href,
  children,
  outline = false
}: {
  to?: string
  href?: string
  children: ReactNode
  /** The quiet variant: soft fill, hairline border. */
  outline?: boolean
}) {
  const still = useReducedMotion() ?? false
  const s = stylex.props(styles.button, outline ? styles.buttonSoft : styles.buttonFill)
  // Two traps live in this one object. motion makes any element carrying a
  // gesture prop focusable, which would leave an empty tab stop in front of
  // every button. And `useReducedMotion` is null on the server but a real
  // boolean on the first client render, so a prop that appears or disappears
  // with `still` changes the markup and breaks hydration; note that `?? false`
  // does not save you, since the divergence is server-null against client-true.
  // State the tabIndex, keep every prop present, and gate only the values.
  const motions = {
    tabIndex: -1,
    whileHover: { scale: still ? 1 : 1.02 },
    whileTap: { scale: still ? 1 : TAP },
    transition: SLIDE
  }
  if (to) {
    return (
      <motion.span {...stylex.props(styles.buttonWrap)} {...motions}>
        <Link to={to} {...s}>
          {children}
        </Link>
      </motion.span>
    )
  }
  return (
    <motion.span {...stylex.props(styles.buttonWrap)} {...motions}>
      <a href={href} {...s}>
        {children}
      </a>
    </motion.span>
  )
}

export function Section({
  title,
  heading: H = 'h2',
  lead,
  alt = false,
  narrow = false,
  eyebrow,
  children
}: {
  title?: string
  /** The page's first section carries the `h1`; the rest are `h2`. */
  heading?: 'h1' | 'h2'
  lead?: ReactNode
  alt?: boolean
  narrow?: boolean
  eyebrow?: ReactNode
  children?: ReactNode
}) {
  return (
    <section {...stylex.props(styles.section, alt && styles.sectionAlt)}>
      <div {...stylex.props(styles.content, narrow && styles.narrow)}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {title && <H {...stylex.props(styles.sectionTitle)}>{title}</H>}
        {lead && <p {...stylex.props(styles.lead)}>{lead}</p>}
        {children}
      </div>
    </section>
  )
}

/** Article body: 17 px text on a 720 px measure. */
export function Prose({ children }: { children: ReactNode }) {
  return <article {...stylex.props(styles.prose)}>{children}</article>
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 {...stylex.props(styles.title)}>{children}</h1>
}

const MID = '@media (max-width: 1068px)'
const NARROW = '@media (max-width: 833px)'
const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  eyebrow: {
    margin: 0,
    marginBottom: '16px',
    fontFamily: font.mono,
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: color.text3
  },
  buttonWrap: { display: 'inline-flex', willChange: 'transform' },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: font.sans,
    fontSize: '15px',
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: '-0.01em',
    paddingTop: '15px',
    paddingBottom: '15px',
    paddingLeft: '24px',
    paddingRight: '24px',
    borderRadius: radius.pill,
    borderWidth: '1px',
    borderStyle: 'solid',
    textDecoration: 'none',
    transitionProperty: 'background-color, border-color, color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out
  },
  buttonFill: {
    backgroundColor: { default: color.accent, ':hover': color.accentHover },
    borderColor: { default: color.accent, ':hover': color.accentHover },
    color: color.onAccent
  },
  buttonSoft: {
    backgroundColor: { default: 'transparent', ':hover': color.accentSoft },
    borderColor: { default: color.border, ':hover': color.borderStrong },
    color: color.text
  },
  section: {
    paddingTop: { default: '112px', [MID]: '88px', [NARROW]: '72px' },
    paddingBottom: { default: '112px', [MID]: '88px', [NARROW]: '72px' },
    paddingLeft: '24px',
    paddingRight: '24px',
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: font.sans
  },
  sectionAlt: { backgroundColor: color.well },
  content: { maxWidth: '1120px', marginLeft: 'auto', marginRight: 'auto' },
  narrow: { maxWidth: '720px' },
  sectionTitle: {
    margin: 0,
    fontFamily: font.display,
    fontSize: { default: '44px', [MID]: '38px', [SMALL]: '30px' },
    lineHeight: 1.05,
    fontWeight: 600,
    letterSpacing: '-0.03em',
    color: color.text,
    maxWidth: '20ch'
  },
  lead: {
    marginTop: '18px',
    marginBottom: '48px',
    fontSize: { default: '18px', [SMALL]: '16px' },
    lineHeight: 1.55,
    color: color.text2,
    maxWidth: '62ch'
  },
  prose: { fontFamily: font.sans, fontSize: '17px', lineHeight: 1.6, color: color.text, maxWidth: '720px' },
  title: {
    margin: 0,
    marginBottom: '12px',
    fontFamily: font.display,
    fontSize: { default: '44px', [SMALL]: '32px' },
    lineHeight: 1.05,
    fontWeight: 600,
    letterSpacing: '-0.03em',
    color: color.text
  }
})

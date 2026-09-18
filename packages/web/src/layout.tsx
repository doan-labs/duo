// The page building blocks: hero, section, tiles, prose, sidebar split, reveal
// and the pill button. A 1120 px content column, 720 px measure for reading,
// and the folds at 1068 / 833 / 734 shared from tokens.stylex.ts.
import * as stylex from '@stylexjs/stylex'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { color, ease, font, radius } from './tokens.stylex'

/** Mono, uppercase, letter-spaced: the small label that sits above a title. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p {...stylex.props(styles.eyebrow)}>{children}</p>
}

/**
 * Fades and lifts its children into view once. Reduced motion gets the content
 * with no movement rather than no content.
 */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const still = useReducedMotion()
  return (
    <motion.div
      {...stylex.props(styles.reveal)}
      initial={still ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function Hero({
  title,
  tagline,
  meta,
  actions,
  eyebrow,
  dark = false,
  children
}: {
  title: string
  tagline?: string
  meta?: ReactNode
  actions?: ReactNode
  /** Mono label above the title. */
  eyebrow?: ReactNode
  /** Deepens the wash; the page itself follows the theme either way. */
  dark?: boolean
  children?: ReactNode
}) {
  const still = useReducedMotion()
  const rise = (i: number) => ({
    initial: still ? false : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as const }
  })
  return (
    <section {...stylex.props(styles.hero, dark && styles.heroDeep)}>
      <div {...stylex.props(styles.heroInner)}>
        {eyebrow && (
          <motion.div {...rise(0)}>
            <Eyebrow>{eyebrow}</Eyebrow>
          </motion.div>
        )}
        <motion.h1 {...stylex.props(styles.heroTitle)} {...rise(1)}>
          {title}
        </motion.h1>
        {tagline && (
          <motion.p {...stylex.props(styles.heroTagline)} {...rise(2)}>
            {tagline}
          </motion.p>
        )}
        {meta && (
          <motion.p {...stylex.props(styles.heroMeta)} {...rise(3)}>
            {meta}
          </motion.p>
        )}
        {actions && (
          <motion.div {...stylex.props(styles.actions)} {...rise(4)}>
            {actions}
          </motion.div>
        )}
        {children && (
          <motion.div {...stylex.props(styles.heroExtra)} {...rise(5)}>
            {children}
          </motion.div>
        )}
      </div>
    </section>
  )
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
  const still = useReducedMotion()
  const s = stylex.props(styles.button, outline ? styles.buttonSoft : styles.buttonFill)
  const motions = still ? {} : { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } }
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

export function Tiles({ children }: { children: ReactNode }) {
  return <div {...stylex.props(styles.tiles)}>{children}</div>
}

export function Tile({
  title,
  to,
  href,
  children,
  wide = false
}: {
  title: string
  to?: string
  href?: string
  children: ReactNode
  wide?: boolean
}) {
  const body = (
    <>
      <h3 {...stylex.props(styles.tileTitle)}>{title}</h3>
      <p {...stylex.props(styles.tileText)}>{children}</p>
      <span {...stylex.props(styles.more)}>Learn more →</span>
    </>
  )
  const s = stylex.props(styles.tile, wide && styles.tileWide)
  if (to) {
    return (
      <Link to={to} {...s}>
        {body}
      </Link>
    )
  }
  return (
    <a href={href} {...s}>
      {body}
    </a>
  )
}

/** Sidebar on the left, article on the right; the sidebar stacks above on narrow screens. */
export function Split({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div {...stylex.props(styles.split)}>
      <aside {...stylex.props(styles.aside)}>{aside}</aside>
      <div {...stylex.props(styles.main)}>{children}</div>
    </div>
  )
}

export function SideList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} {...stylex.props(styles.sideGroup)}>
      <h2 {...stylex.props(styles.sideTitle)}>{title}</h2>
      <ul {...stylex.props(styles.sideList)}>{children}</ul>
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
  const matchRoute = useMatchRoute()
  const on = !!matchRoute({ to, params })
  return (
    <li {...stylex.props(styles.sideItem)}>
      <Link to={to} params={params} {...stylex.props(styles.sideLink, on && styles.sideOn)}>
        {children}
      </Link>
    </li>
  )
}

/** Article body: 17 px text on a 720 px measure. */
export function Prose({ children }: { children: ReactNode }) {
  return <article {...stylex.props(styles.prose)}>{children}</article>
}

export function Title({ children, badge }: { children: ReactNode; badge?: ReactNode }) {
  return (
    <h1 {...stylex.props(styles.title)}>
      {children}
      {badge && <span {...stylex.props(styles.titleBadge)}>{badge}</span>}
    </h1>
  )
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
  reveal: { display: 'block' },
  hero: {
    position: 'relative',
    isolation: 'isolate',
    overflow: 'hidden',
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: font.sans,
    paddingTop: { default: '120px', [MID]: '96px', [SMALL]: '72px' },
    paddingBottom: { default: '96px', [MID]: '80px', [SMALL]: '56px' },
    paddingLeft: '24px',
    paddingRight: '24px'
  },
  heroDeep: { backgroundColor: color.well },
  heroInner: { maxWidth: '1120px', marginLeft: 'auto', marginRight: 'auto' },
  heroTitle: {
    margin: 0,
    fontFamily: font.display,
    fontSize: 'clamp(40px, 7vw, 76px)',
    lineHeight: 1.02,
    fontWeight: 600,
    letterSpacing: '-0.035em',
    maxWidth: '16ch'
  },
  heroTagline: {
    marginTop: '20px',
    marginBottom: 0,
    fontSize: { default: '22px', [SMALL]: '18px' },
    lineHeight: 1.4,
    fontWeight: 400,
    letterSpacing: '-0.01em',
    color: color.text2,
    maxWidth: '54ch'
  },
  heroMeta: {
    marginTop: '14px',
    marginBottom: 0,
    fontSize: { default: '16px', [SMALL]: '15px' },
    lineHeight: 1.5,
    color: color.text3,
    maxWidth: '60ch'
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px',
    marginTop: '36px'
  },
  heroExtra: { marginTop: '40px' },
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
  tiles: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [SMALL]: 'minmax(0, 1fr)' },
    gap: '20px'
  },
  tile: {
    display: 'block',
    position: 'relative',
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    paddingTop: '32px',
    paddingBottom: '32px',
    paddingLeft: '28px',
    paddingRight: '28px',
    color: color.text,
    textDecoration: 'none',
    willChange: 'transform',
    transitionProperty: 'transform, border-color, box-shadow',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out,
    transform: { default: 'translateY(0)', ':hover': 'translateY(-4px)' },
    boxShadow: { default: 'none', ':hover': color.shadow }
  },
  tileWide: { gridColumn: { default: 'span 2', [SMALL]: 'span 1' } },
  tileTitle: {
    margin: 0,
    fontFamily: font.display,
    fontSize: '22px',
    lineHeight: 1.2,
    fontWeight: 600,
    letterSpacing: '-0.02em'
  },
  tileText: { marginTop: '12px', marginBottom: '20px', fontSize: '16px', lineHeight: 1.55, color: color.text2 },
  more: {
    fontFamily: font.mono,
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: color.accent
  },
  split: {
    display: 'grid',
    gridTemplateColumns: { default: '240px minmax(0, 1fr)', [NARROW]: 'minmax(0, 1fr)' },
    gap: { default: '64px', [NARROW]: '32px' },
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
    position: { default: 'sticky', [NARROW]: 'static' },
    top: '88px',
    alignSelf: 'start',
    maxHeight: { default: 'calc(100vh - 120px)', [NARROW]: 'none' },
    overflowY: 'auto'
  },
  main: { minWidth: 0 },
  sideGroup: { marginBottom: '32px' },
  sideTitle: {
    margin: 0,
    marginBottom: '12px',
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: color.text3
  },
  sideList: { listStyleType: 'none', margin: 0, padding: 0 },
  sideItem: { display: 'block' },
  sideLink: {
    display: 'block',
    paddingTop: '7px',
    paddingBottom: '7px',
    fontSize: '14px',
    lineHeight: 1.4,
    color: { default: color.text2, ':hover': color.text },
    textDecoration: 'none',
    transitionProperty: 'color',
    transitionDuration: '0.15s'
  },
  sideOn: { color: color.accent, fontWeight: 500 },
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
  },
  titleBadge: { display: 'inline-block', marginLeft: '12px', verticalAlign: 'middle' }
})

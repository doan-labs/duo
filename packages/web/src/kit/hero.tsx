// The kit's only viewport: what it is, one line to install it, and every
// component drifting past as the real thing. Hovering stops the strip, so a
// visitor can press what caught their eye before following it to the reference.
import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { versions } from '../generated/api'
import { KitFrame } from '../kit-preview'
import { Button } from '../layout'
import { useNarrow } from '../media'
import { color, font, radius } from '../tokens.stylex'
import { counts, kit, live, summary } from './data'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'
const REDUCE = '@media (prefers-reduced-motion: reduce)'
const CURVE = [0.22, 1, 0.36, 1] as const

const INSTALL = 'bun add @doan-labs/duo-uikit'

const STATS = [
  `${counts.components} components`,
  `${counts.hooks} hooks`,
  `${counts.helpers} types and helpers`,
  `${counts.live} live demos`,
  '387 and 790 point displays'
]

export function KitHero() {
  const still = useReducedMotion()
  const narrow = useNarrow()
  const rise = (i: number) => ({
    initial: still ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: 0.1 + i * 0.08, ease: CURVE }
  })
  return (
    <section {...stylex.props(styles.hero)} aria-labelledby="kit-title">
      <div {...stylex.props(styles.inner)}>
        <motion.p {...stylex.props(styles.eyebrow)} {...rise(0)}>
          @doan-labs/duo-uikit · v{versions.uikit?.version} · {kit.length} exports
        </motion.p>
        <motion.h1 id="kit-title" {...stylex.props(styles.title)} {...rise(1)}>
          {counts.components} components that
          <br />
          already know the phone folds.
        </motion.h1>
        <motion.p {...stylex.props(styles.sub)} {...rise(2)}>
          Buttons, rows, lists, navigation stacks and widgets, drawn the way iOS draws them. Everything below is the
          real package running in your browser.
        </motion.p>
        <motion.div {...stylex.props(styles.actions)} {...rise(3)}>
          <Button to="/kit/docs">See all components</Button>
          <Install />
        </motion.div>
      </div>
      <motion.div
        {...stylex.props(styles.strip)}
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.45, ease: CURVE }}
      >
        {/* Two identical runs: the track slides exactly one run, then repeats.
            Narrow screens scroll the strip by hand, so one run is the whole of it. */}
        <div {...stylex.props(styles.track)}>
          <Run />
          {!narrow && <Run copy />}
        </div>
      </motion.div>
      <div {...stylex.props(styles.inner)}>
        <p {...stylex.props(styles.hint)}>
          Hover to hold the strip still. Every card is live: press a button, flip a switch, push a page.
        </p>
        <ul {...stylex.props(styles.stats)}>
          {STATS.map((s) => (
            <li key={s} {...stylex.props(styles.stat)}>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** One pass over every live component. The second pass is scenery: hide it from assistive tech. */
function Run({ copy = false }: { copy?: boolean }) {
  return (
    <ul {...stylex.props(styles.run)} aria-hidden={copy || undefined} inert={copy}>
      {live.map((e) => (
        <li key={e.name} {...stylex.props(styles.card)}>
          <header {...stylex.props(styles.head)}>
            {copy ? (
              <span {...stylex.props(styles.name)}>{e.name}</span>
            ) : (
              <Link to="/kit/docs/$name" params={{ name: e.name }} {...stylex.props(styles.name)}>
                {e.name}
              </Link>
            )}
            <p {...stylex.props(styles.doc)}>{summary(e)}</p>
          </header>
          <KitFrame name={e.name} height={270} />
        </li>
      ))}
    </ul>
  )
}

/** The install line, copied on click. */
function Install() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      {...stylex.props(styles.install)}
      onClick={() => {
        navigator.clipboard?.writeText(INSTALL)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }}
    >
      <span {...stylex.props(styles.prompt)}>$</span>
      <code {...stylex.props(styles.cmd)}>{INSTALL}</code>
      <span {...stylex.props(styles.copyTag)}>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

// One run of cards wide, so the loop is seamless wherever it restarts.
const drift = stylex.keyframes({ from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } })

const styles = stylex.create({
  hero: {
    paddingTop: { default: '104px', [MID]: '80px', [SMALL]: '56px' },
    paddingBottom: { default: '96px', [SMALL]: '64px' },
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: font.sans,
    overflow: 'hidden'
  },
  inner: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: { default: '40px', [SMALL]: '24px' },
    paddingRight: { default: '40px', [SMALL]: '24px' }
  },
  eyebrow: {
    margin: 0,
    marginBottom: '20px',
    fontFamily: font.mono,
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    color: color.text3
  },
  title: {
    margin: 0,
    fontFamily: font.display,
    fontSize: { default: '76px', [MID]: '54px', [SMALL]: '38px' },
    lineHeight: 1.02,
    fontWeight: 600,
    letterSpacing: '-0.04em',
    textWrap: 'balance'
  },
  sub: {
    marginTop: '24px',
    marginBottom: 0,
    maxWidth: '58ch',
    fontSize: { default: '22px', [SMALL]: '18px' },
    lineHeight: 1.45,
    color: color.text2
  },
  actions: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginTop: '36px' },
  install: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '11px',
    paddingBottom: '11px',
    paddingLeft: '16px',
    paddingRight: '12px',
    borderRadius: radius.pill,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    backgroundColor: color.surface,
    cursor: 'pointer'
  },
  prompt: { fontFamily: font.mono, fontSize: '13px', color: color.text3 },
  cmd: { fontFamily: font.mono, fontSize: '13px', color: color.text },
  copyTag: {
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    paddingTop: '5px',
    paddingBottom: '5px',
    paddingLeft: '9px',
    paddingRight: '9px',
    borderRadius: radius.pill,
    backgroundColor: color.accentSoft,
    color: color.accent
  },
  // Full bleed: the strip runs off both edges of the page and fades out there.
  // Where the drift is off there is nothing to hover, so the strip becomes a
  // plain scroller the visitor pushes themselves.
  strip: {
    marginTop: { default: '72px', [SMALL]: '48px' },
    overflowX: { default: 'visible', [SMALL]: 'auto', [REDUCE]: 'auto' },
    maskImage: {
      default: 'linear-gradient(to right, transparent, #000 120px, #000 calc(100% - 120px), transparent)',
      [SMALL]: 'none'
    }
  },
  track: {
    display: 'flex',
    width: 'max-content',
    animationName: { default: drift, [SMALL]: 'none', [REDUCE]: 'none' },
    animationDuration: '160s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    // Stopping is how the visitor presses something: the strip holds while the
    // pointer is over it, and while anything inside has focus.
    animationPlayState: { default: 'running', ':hover': 'paused', ':focus-within': 'paused' }
  },
  run: { listStyleType: 'none', display: 'flex', gap: '20px', margin: 0, padding: 0, paddingRight: '20px' },
  card: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '18px',
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    backgroundColor: color.surface,
    transitionProperty: 'border-color',
    transitionDuration: '0.2s'
  },
  head: { maxWidth: '387px' },
  name: {
    fontFamily: font.display,
    fontSize: '19px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: { default: color.text, ':hover': color.accent },
    textDecoration: 'none'
  },
  doc: {
    margin: 0,
    marginTop: '6px',
    fontSize: '14px',
    lineHeight: 1.5,
    color: color.text2,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 1,
    overflow: 'hidden'
  },
  hint: {
    marginTop: { default: '32px', [SMALL]: '24px' },
    marginBottom: 0,
    fontFamily: font.mono,
    fontSize: '12px',
    color: color.text3
  },
  stats: {
    listStyleType: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    margin: 0,
    marginTop: '28px',
    padding: 0,
    paddingTop: '24px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  stat: {
    fontFamily: font.mono,
    fontSize: '12px',
    letterSpacing: '0.04em',
    color: color.text2,
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '13px',
    paddingRight: '13px',
    borderRadius: radius.pill,
    backgroundColor: color.well
  }
})

// The kit's only viewport: what it is, one line to install it, and every
// component drifting past as the real thing. Nothing on the page says the strip
// can be held still and pressed; hovering does it, and the card lifting under
// the pointer is the whole of the instruction.
import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { versions } from '../generated/api'
import { KitFrame } from '../kit-preview'
import { Button } from '../layout'
import { useNarrow } from '../media'
import { CURVE, TAP } from '../motion'
import { color, ease, font, radius } from '../tokens.stylex'
import { counts, kit, live, summary } from './data'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'
const REDUCE = '@media (prefers-reduced-motion: reduce)'

const INSTALL = 'bun add @doan-labs/duo-uikit'

// Reduced motion cuts the duration, never the `initial` pose. `useReducedMotion()`
// is null on the server and a boolean on the client, so gating `initial` on it
// renders opacity 0 into the HTML and opacity 1 into the hydration, which fails the
// whole tree for exactly the readers least able to absorb a re-render.
const NONE = { duration: 0 }

const STATS = [
  `${counts.components} components`,
  `${counts.hooks} hooks`,
  `${counts.helpers} types and helpers`,
  `${counts.live} live demos`,
  '387 and 790 point displays'
]

export function KitHero() {
  const still = useReducedMotion() ?? false
  const narrow = useNarrow()
  const rise = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: still ? NONE : { duration: 0.8, delay: 0.1 + i * 0.08, ease: CURVE }
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
          <Button to="/guidelines" outline>
            Human Interface Guidelines
          </Button>
          <Install />
        </motion.div>
      </div>
      <motion.div
        {...stylex.props(styles.strip)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={still ? NONE : { duration: 1, delay: 0.45, ease: CURVE }}
      >
        {/* Two identical runs: the track slides exactly one run, then repeats.
            Narrow screens scroll the strip by hand, so one run is the whole of it. */}
        <div {...stylex.props(styles.track)}>
          <Run />
          {!narrow && <Run copy />}
        </div>
      </motion.div>
      <div {...stylex.props(styles.inner)}>
        <ul {...stylex.props(styles.stats)}>
          {STATS.map((s, i) => (
            <motion.li
              key={s}
              {...stylex.props(styles.stat)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={still ? NONE : { duration: 0.5, delay: 0.6 + i * 0.05, ease: CURVE }}
            >
              {s}
            </motion.li>
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

/**
 * The install line, copied on click. The confirmation is the whole control
 * answering, not one word swapping: the tag turns green and takes a beat, and
 * the line it copied stays on screen to be checked against the clipboard.
 */
function Install() {
  const still = useReducedMotion() ?? false
  const [copied, setCopied] = useState(false)
  return (
    <motion.button
      type="button"
      // Stated, not left to motion: it writes `tabIndex` into the HTML for any
      // element carrying a gesture prop, so a `whileTap` that disappears under
      // reduced motion would take the attribute with it and break hydration.
      tabIndex={0}
      {...stylex.props(styles.install, copied && styles.installDone)}
      whileTap={{ scale: still ? 1 : TAP }}
      onClick={() => {
        navigator.clipboard?.writeText(INSTALL)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }}
    >
      <span {...stylex.props(styles.prompt)}>$</span>
      <code {...stylex.props(styles.cmd)}>{INSTALL}</code>
      <motion.span
        {...stylex.props(styles.copyTag, copied && styles.copyTagDone)}
        aria-live="polite"
        initial={false}
        animate={{ scale: copied && !still ? [1, 1.16, 1] : 1 }}
        transition={still ? NONE : { duration: 0.4, ease: CURVE }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </motion.span>
    </motion.button>
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
    cursor: 'pointer',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '3px',
    transitionProperty: 'border-color, background-color',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out
  },
  installDone: { borderColor: color.green, backgroundColor: color.greenBg },
  prompt: { fontFamily: font.mono, fontSize: '13px', color: color.text3 },
  cmd: { fontFamily: font.mono, fontSize: '13px', color: color.text },
  // A fixed width: the row must not reflow around the word that changes.
  copyTag: {
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    minWidth: '86px',
    textAlign: 'center',
    paddingTop: '5px',
    paddingBottom: '5px',
    paddingLeft: '9px',
    paddingRight: '9px',
    borderRadius: radius.pill,
    backgroundColor: color.accentSoft,
    color: color.accent,
    transitionProperty: 'background-color, color',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out
  },
  copyTagDone: { backgroundColor: color.greenBg, color: color.green },
  // Full bleed: the strip runs off both edges of the page and fades out there.
  // Where the drift is off there is nothing to hover, so the strip becomes a
  // plain scroller the visitor pushes themselves.
  strip: {
    marginTop: { default: '62px', [SMALL]: '38px' },
    // Room for the lift and the shadow a hovered card grows. It is not
    // decoration: `overflow-x: auto` below takes `overflow-y` off `visible` by
    // the spec's own rule, and a card flush with that edge had its top three
    // pixels cut off the moment the pointer picked it up, with no scrollbar to
    // say so. The margin above is shortened by the same amount.
    paddingTop: '10px',
    paddingBottom: '10px',
    overflowX: { default: 'visible', [SMALL]: 'auto', [REDUCE]: 'auto' },
    // Where the strip is pushed by hand, the push stops at its own ends rather
    // than becoming the browser's back gesture.
    overscrollBehaviorX: 'contain',
    // Three stops rather than two: a straight ramp reads as a grey wash over the
    // cards, and the cards should look like they are leaving, not fading.
    maskImage: {
      default:
        'linear-gradient(to right, transparent 0, rgba(0,0,0,0.35) 44px, #000 156px, #000 calc(100% - 156px), rgba(0,0,0,0.35) calc(100% - 44px), transparent 100%)',
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
    // The strip is already still under the pointer; the card under it lifts so
    // the one that will answer a press is obvious before the press.
    transform: { default: 'translateY(0)', ':hover': 'translateY(-3px)' },
    boxShadow: { default: 'none', ':hover': color.shadow },
    transitionProperty: 'border-color, box-shadow, transform',
    transitionDuration: { default: '0.24s', [REDUCE]: '0s' },
    transitionTimingFunction: ease.out
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
  stats: {
    listStyleType: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    margin: 0,
    marginTop: { default: '56px', [SMALL]: '40px' },
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

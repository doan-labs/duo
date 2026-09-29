// The kit's section of /kit: one row naming it with the install line beside,
// and under that the showcase grid, every tile a small app composed from the
// real package. The tiles say the rest.
import * as stylex from '@stylexjs/stylex'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { versions } from '../generated/api'
import { Button } from '../layout'
import { CURVE, TAP } from '../motion'
import { color, ease, font, radius } from '../tokens.stylex'
import { counts, kit } from './data'
import { Showcase } from './showcase'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

const INSTALL = 'bun add @doan-labs/duo-uikit'

// Reduced motion cuts the duration, never the `initial` pose. `useReducedMotion()`
// is null on the server and a boolean on the client, so gating `initial` on it
// renders opacity 0 into the HTML and opacity 1 into the hydration, which fails the
// whole tree for exactly the readers least able to absorb a re-render.
const NONE = { duration: 0 }

export function KitHero() {
  const still = useReducedMotion() ?? false
  const rise = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: still ? NONE : { duration: 0.8, delay: 0.1 + i * 0.08, ease: CURVE }
  })
  return (
    <section id="kit" {...stylex.props(styles.hero)} aria-labelledby="kit-title">
      <div {...stylex.props(styles.inner, styles.head)}>
        <div>
          <motion.p {...stylex.props(styles.eyebrow)} {...rise(0)}>
            @doan-labs/duo-uikit · v{versions.uikit?.version} · {kit.length} exports
          </motion.p>
          <motion.h2 id="kit-title" {...stylex.props(styles.title)} {...rise(1)}>
            {counts.components} components that
            <br />
            already know the phone folds.
          </motion.h2>
        </div>
        <motion.div {...stylex.props(styles.actions)} {...rise(2)}>
          <Button to="/kit/docs">See all components</Button>
          <Install />
        </motion.div>
      </div>
      <div {...stylex.props(styles.inner, styles.showcase)}>
        <Showcase />
      </div>
    </section>
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

const styles = stylex.create({
  hero: {
    paddingTop: { default: '64px', [SMALL]: '40px' },
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
    fontSize: { default: '44px', [MID]: '38px', [SMALL]: '30px' },
    lineHeight: 1.02,
    fontWeight: 600,
    letterSpacing: '-0.04em',
    textWrap: 'balance'
  },
  head: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '24px'
  },
  actions: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' },
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
  showcase: { marginTop: { default: '40px', [SMALL]: '28px' } }
})

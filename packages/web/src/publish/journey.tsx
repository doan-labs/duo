// What happens after the pull request, on /publish: four stops on a line, each saying
// who acts and what it means. They are different states on purpose; passing checks
// is not acceptance, and a merge is not yet an installable app.
import * as stylex from '@stylexjs/stylex'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { CURVE } from '../motion'
import { color, ease, font, radius } from '../tokens.stylex'

const SMALL = '@media (max-width: 734px)'

const STOPS: { name: string; who: string; text: string }[] = [
  {
    name: 'Checks pass',
    who: 'CI',
    text: 'The submission gate validates the folder, runs duo check and builds the release, with no secrets and read-only access. Green means eligible for review, nothing more.'
  },
  {
    name: 'Reviewed',
    who: 'Maintainers',
    text: 'A person installs the build in a running Duo, folds it, reads the diff, the dependencies and the declared origins, and looks at your screenshots. Expect questions; they are part of it.'
  },
  {
    name: 'Merged',
    who: 'Maintainers',
    text: 'Accepted. The source is in the repository, and the publish workflow starts on its own. You do nothing here.'
  },
  {
    name: 'Live',
    who: 'Publish workflow',
    text: 'The release lands in the curated catalog and the site redeploys. Now it installs from the Store on any Duo and shows under your tab on /apps.'
  }
]

export function Journey() {
  const still = useReducedMotion()
  const [at, setAt] = useState(0)
  const stop = STOPS[at]!
  return (
    <div {...stylex.props(styles.box)}>
      <div {...stylex.props(styles.wrap)}>
        <span {...stylex.props(styles.rail)} aria-hidden="true">
          <motion.span
            {...stylex.props(styles.railFill)}
            initial={false}
            animate={{ scaleX: at / (STOPS.length - 1) }}
            transition={still ? { duration: 0 } : { duration: 0.5, ease: CURVE }}
          />
        </span>
        <ol {...stylex.props(styles.line)}>
          {STOPS.map((s, i) => (
            <li key={s.name} {...stylex.props(styles.stop)}>
              <button type="button" aria-pressed={i === at} onClick={() => setAt(i)} {...stylex.props(styles.button)}>
                <span {...stylex.props(styles.dot, i <= at && styles.dotOn, i === at && styles.dotAt)}>
                  {i < at ? '✓' : i + 1}
                </span>
                <span {...stylex.props(styles.name, i === at && styles.nameOn)}>{s.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <motion.div
        key={stop.name}
        aria-live="polite"
        initial={{ opacity: 0, transform: 'translateY(6px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={still ? { duration: 0 } : { duration: 0.3, ease: CURVE }}
        {...stylex.props(styles.detail)}
      >
        <span {...stylex.props(styles.who)}>{stop.who}</span>
        <p {...stylex.props(styles.text)}>{stop.text}</p>
      </motion.div>
    </div>
  )
}

const styles = stylex.create({
  box: {
    marginTop: '8px',
    marginBottom: '20px',
    paddingTop: '26px',
    paddingBottom: '22px',
    paddingLeft: { default: '24px', [SMALL]: '14px' },
    paddingRight: { default: '24px', [SMALL]: '14px' },
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    backgroundColor: color.surface
  },
  wrap: { position: 'relative' },
  line: {
    position: 'relative',
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
  },
  // From the first dot's centre to the last's: an eighth of the width in from each side.
  rail: {
    position: 'absolute',
    top: '15px',
    left: '12.5%',
    right: '12.5%',
    height: '2px',
    borderRadius: radius.pill,
    backgroundColor: color.well,
    overflow: 'hidden'
  },
  railFill: {
    display: 'block',
    height: '100%',
    backgroundColor: color.accent,
    transformOrigin: 'left center'
  },
  stop: { position: 'relative', display: 'flex', justifyContent: 'center' },
  button: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    paddingTop: 0,
    paddingBottom: '4px',
    paddingLeft: '4px',
    paddingRight: '4px',
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  dot: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: radius.pill,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    backgroundColor: color.surface,
    color: color.text3,
    fontFamily: font.mono,
    fontSize: '12px',
    transitionProperty: 'background-color, border-color, color, transform',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out
  },
  dotOn: { borderColor: color.accent, color: color.accent },
  dotAt: { backgroundColor: color.accent, color: color.onAccent, transform: 'scale(1.08)' },
  name: {
    fontFamily: font.sans,
    fontSize: { default: '14px', [SMALL]: '12px' },
    fontWeight: 500,
    textAlign: 'center',
    color: { default: color.text2, ':hover': color.text },
    transitionProperty: 'color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out
  },
  nameOn: { color: color.text },
  detail: {
    marginTop: '20px',
    paddingTop: '18px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border,
    minHeight: '96px'
  },
  who: {
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.accent
  },
  text: {
    marginTop: '6px',
    marginBottom: 0,
    fontFamily: font.sans,
    fontSize: '16px',
    lineHeight: 1.6,
    color: color.text
  }
})

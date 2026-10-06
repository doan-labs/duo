// The pre-flight step on /publish: the template's checklist as boxes to tick, with a
// bar that fills as you go and the submit button waiting at the end. It is a memory
// aid, not a gate; the real gate runs in CI on the pull request.
import * as stylex from '@stylexjs/stylex'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Button } from '../layout'
import { CURVE } from '../motion'
import { SUBMIT } from '../site'
import { color, ease, font, radius } from '../tokens.stylex'

const RULES: [string, string][] = [
  [
    'Runs on both displays',
    'The cover is a real layout, not a placeholder. Fold with the app open and it keeps its place.'
  ],
  ['Public API only', 'Imports come from @doan-labs/duo-sdk and @doan-labs/duo-uikit, never the shell or another app.'],
  [
    'Tokens, not hand-typed values',
    'Colours, type, radii, spacing and easing come from the kit. duo check fails a raw value.'
  ],
  ['Complete metadata', 'icon.png at 1024 px, both screenshots, README.md, and a CHANGELOG.md entry for this version.'],
  ['Community lane, no permissions', '"lane": "community" and an empty permissions list in the manifest.'],
  ['Network declared', 'Every origin the app contacts is listed in network. The sandbox blocks everything else.'],
  ['Under 4 MiB', 'The built single-file document fits the cap that check enforces.'],
  [
    'Registry entry and MIT licence',
    'Your app is in registry.json with you as developer, and LICENSE holds the MIT text.'
  ]
]

export function Readiness() {
  const still = useReducedMotion()
  const [done, setDone] = useState<boolean[]>(() => RULES.map(() => false))
  const count = done.filter(Boolean).length
  const ready = count === RULES.length
  return (
    <div {...stylex.props(styles.box)}>
      <div {...stylex.props(styles.top)}>
        <span {...stylex.props(styles.title)}>{ready ? 'Ready to submit' : 'Before you push'}</span>
        <span {...stylex.props(styles.count)}>
          {count} of {RULES.length}
        </span>
      </div>
      <div {...stylex.props(styles.track)} aria-hidden="true">
        <motion.div
          {...stylex.props(styles.fill, ready && styles.fillReady)}
          initial={false}
          animate={{ width: `${(count / RULES.length) * 100}%` }}
          transition={still ? { duration: 0 } : { duration: 0.45, ease: CURVE }}
        />
      </div>
      <ul {...stylex.props(styles.list)}>
        {RULES.map(([rule, detail], i) => (
          <li key={rule}>
            <label {...stylex.props(styles.row)}>
              <input
                type="checkbox"
                checked={done[i]}
                onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
                {...stylex.props(styles.check)}
              />
              <span {...stylex.props(styles.mark, done[i] && styles.markOn)} aria-hidden="true">
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  <path
                    d="M3.4 8.6 6.4 11.6 12.6 4.8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    {...stylex.props(styles.tick, done[i] && styles.tickOn)}
                  />
                </svg>
              </span>
              <span {...stylex.props(styles.text)}>
                <span {...stylex.props(styles.rule)}>{rule}</span>
                <span {...stylex.props(styles.detail)}>{detail}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div {...stylex.props(styles.foot)}>
        <p {...stylex.props(styles.footText)}>
          {ready
            ? 'Run the check one last time, push your branch, and open the pull request.'
            : 'Tick what you have covered. Nothing here is saved or sent; CI runs the real checks.'}
        </p>
        {ready && (
          <motion.span
            initial={{ opacity: 0, transform: 'translateY(6px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={still ? { duration: 0 } : { duration: 0.35, ease: CURVE }}
          >
            <Button href={SUBMIT}>Open the pull request</Button>
          </motion.span>
        )}
      </div>
    </div>
  )
}

const styles = stylex.create({
  box: {
    marginTop: '8px',
    marginBottom: '20px',
    paddingTop: '20px',
    paddingBottom: '20px',
    paddingLeft: '20px',
    paddingRight: '20px',
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    backgroundColor: color.surface
  },
  top: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' },
  title: { fontFamily: font.display, fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em', color: color.text },
  count: { fontFamily: font.mono, fontSize: '12px', color: color.text3, fontVariantNumeric: 'tabular-nums' },
  track: {
    marginTop: '12px',
    height: '6px',
    borderRadius: radius.pill,
    backgroundColor: color.well,
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    transitionProperty: 'background-color',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out
  },
  fillReady: { backgroundColor: color.green },
  list: { listStyleType: 'none', margin: 0, marginTop: '14px', padding: 0 },
  row: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '10px',
    paddingRight: '10px',
    marginLeft: '-10px',
    marginRight: '-10px',
    borderRadius: radius.md,
    backgroundColor: { default: 'transparent', ':hover': color.well },
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out
  },
  // The native box stays for keyboard and screen readers; the drawn one is what the eye sees.
  check: {
    position: 'absolute',
    opacity: 0,
    width: '20px',
    height: '20px',
    margin: 0,
    top: '11px',
    left: '10px',
    cursor: 'pointer'
  },
  mark: {
    flexShrink: 0,
    marginTop: '1px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: '6px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: color.borderStrong,
    color: color.onAccent,
    backgroundColor: 'transparent',
    transitionProperty: 'background-color, border-color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out
  },
  markOn: { backgroundColor: color.accent, borderColor: color.accent },
  tick: {
    strokeDasharray: 16,
    strokeDashoffset: 16,
    transitionProperty: 'stroke-dashoffset',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out
  },
  tickOn: { strokeDashoffset: 0 },
  text: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  rule: { fontFamily: font.sans, fontSize: '15px', fontWeight: 600, color: color.text },
  detail: { fontFamily: font.sans, fontSize: '14px', lineHeight: 1.5, color: color.text2 },
  foot: {
    marginTop: '14px',
    paddingTop: '16px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px'
  },
  footText: {
    margin: 0,
    flexBasis: '320px',
    flexGrow: 1,
    fontFamily: font.sans,
    fontSize: '14px',
    lineHeight: 1.5,
    color: color.text2
  }
})

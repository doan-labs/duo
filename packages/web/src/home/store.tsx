// The platform reveal: the App Store running inside the device, and the six
// steps from Get to launch. The install path is the stage 2 runtime, so the
// section says so rather than pretending.
import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { Simulator } from '../simulator'
import { color, font } from '../tokens.stylex'
import { Block, Cap, Columns, Headline, Lede, Reveal } from './parts'

const STEPS = [
  'Open the App Store.',
  'Pick a third-party app.',
  'Tap Get.',
  'It installs into its own runtime.',
  'The icon lands on the Home Screen.',
  'Launch it. Fold the phone. It follows.'
]

export function Store() {
  return (
    <Block labelledBy="store-title">
      <Columns flip>
        <Reveal>
          <Simulator deg={180} app="App Store" />
        </Reveal>
        <div>
          <Cap>03 · The twist</Cap>
          <Headline id="store-title" lines={['And then we gave it', 'an App Store.']} />
          <Lede>
            Apps do not ship with Duo. They install into their own isolated runtime, keep their own storage, and update
            on their own. The simulator’s source never changes.
          </Lede>
          <ol {...stylex.props(styles.steps)}>
            {STEPS.map((s, i) => (
              <li key={s} {...stylex.props(styles.step)}>
                <span {...stylex.props(styles.num)}>{String(i + 1).padStart(2, '0')}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p {...stylex.props(styles.annotation)}>
            The sandboxed runtime is stage 2, being built from the{' '}
            <Link to="/docs/$" params={{ _splat: 'platform/progress/contract' }} {...stylex.props(styles.link)}>
              accepted contract
            </Link>
            . The store in the frame is the baked one: Get, wait, Open.
          </p>
        </div>
      </Columns>
    </Block>
  )
}

const styles = stylex.create({
  steps: { listStyleType: 'none', margin: 0, marginTop: '40px', padding: 0, display: 'grid', gap: '14px' },
  step: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '18px',
    paddingBottom: '14px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    fontSize: '18px',
    lineHeight: 1.4,
    color: color.text
  },
  num: { fontFamily: font.mono, fontSize: '12px', letterSpacing: '0.06em', color: color.text3 },
  annotation: {
    marginTop: '32px',
    marginBottom: 0,
    maxWidth: '44ch',
    fontFamily: font.mono,
    fontSize: '12.5px',
    lineHeight: 1.6,
    color: color.text3
  },
  link: { color: color.text2, textDecorationLine: 'underline', textUnderlineOffset: '3px' }
})

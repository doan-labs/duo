// The end of /sdk: the whole surface as one call, and the reader's own session as the proof.
// Every count is what the page above heard, so an honest zero is shown as a zero.
import type { DeviceEvent } from '@doan-labs/duo-sdk'
import * as stylex from '@stylexjs/stylex'
import { useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Block, Cap, Headline, Rise, Stagger } from '../home/parts'
import { Button } from '../layout'
import { color, ease, font } from '../tokens.stylex'
import { Glyph } from './wire'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

export function Finale({ types, heard }: { types: DeviceEvent[]; heard: Record<DeviceEvent, number> }) {
  const still = useReducedMotion() ?? false
  const [i, setI] = useState(0)
  useEffect(() => {
    if (still) return
    const id = setInterval(() => setI((n) => (n + 1) % types.length), 1600)
    return () => clearInterval(id)
  }, [still, types.length])
  const total = types.reduce((n, t) => n + heard[t], 0)

  return (
    <Block cinema labelledBy="sdk-end-title">
      <Stagger gap={0.09} amount={0.3}>
        <Rise>
          <Cap>SDK · The whole surface</Cap>
        </Rise>
        <Rise>
          <p {...stylex.props(styles.call)} aria-hidden="true">
            os.device.on(
            <span key={types[i]} {...stylex.props(styles.slot)}>
              '{types[i]}'
            </span>
            )
          </p>
        </Rise>
        <Rise styles={styles.title}>
          <Headline id="sdk-end-title" size="md" lines={['One call. Five events.', 'No manifest entry. No mocks.']} />
        </Rise>
        <Rise>
          <ol {...stylex.props(styles.board)} aria-label="Events this page heard">
            {types.map((t, n) => (
              <li key={t} {...stylex.props(styles.row, heard[t] > 0 && styles.rowOn)}>
                <span {...stylex.props(styles.index)}>{String(n + 1).padStart(2, '0')}</span>
                <span {...stylex.props(styles.type)}>
                  <Glyph type={t} size={22} />'{t}'
                </span>
                <span {...stylex.props(styles.count)}>{heard[t]}</span>
              </li>
            ))}
          </ol>
        </Rise>
        <Rise>
          <p {...stylex.props(styles.proof)}>
            {total} real payloads reached this page, each one exactly what a listening app receives. Nothing crossed the
            bridge until the page listened.
          </p>
        </Rise>
        <div {...stylex.props(styles.actions)}>
          <Rise move="in" styles={styles.action}>
            <Button to="/docs/hardware">Read the guide</Button>
          </Rise>
          <Rise move="in" styles={styles.action}>
            <Button to="/docs/sdk" outline>
              SDK reference
            </Button>
          </Rise>
        </div>
      </Stagger>
    </Block>
  )
}

const swap = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(0.25em)', filter: 'blur(6px)' },
  to: { opacity: 1, transform: 'none', filter: 'none' }
})

const styles = stylex.create({
  // Sized to the viewport so the longest type, 'camera-control', still fits the line.
  call: {
    margin: 0,
    fontFamily: font.mono,
    fontSize: { default: 'min(76px, 4.9vw)', [SMALL]: '8vw' },
    fontWeight: 500,
    letterSpacing: '-0.04em',
    lineHeight: 1.1,
    // On a phone the slot wraps as one piece under the call instead of shrinking the line to fit.
    whiteSpace: { default: 'nowrap', [SMALL]: 'normal' },
    color: color.text
  },
  slot: {
    display: 'inline-block',
    color: color.accent,
    animationName: swap,
    animationDuration: '0.5s',
    animationTimingFunction: ease.out
  },
  title: { marginTop: { default: '48px', [SMALL]: '32px' }, marginBottom: 0 },
  board: {
    listStyleType: 'none',
    margin: 0,
    marginTop: { default: '72px', [SMALL]: '48px' },
    padding: 0,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  row: {
    display: 'grid',
    gridTemplateColumns: { default: '64px minmax(0, 1fr) auto', [SMALL]: '32px minmax(0, 1fr) auto' },
    alignItems: 'baseline',
    gap: '16px',
    paddingTop: { default: '22px', [SMALL]: '16px' },
    paddingBottom: { default: '22px', [SMALL]: '16px' },
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    color: color.text3,
    transitionProperty: 'color',
    transitionDuration: '0.4s',
    transitionTimingFunction: ease.out
  },
  rowOn: { color: color.text },
  index: { fontFamily: font.mono, fontSize: '12px', letterSpacing: '0.08em' },
  type: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: { default: '16px', [SMALL]: '10px' },
    fontFamily: font.mono,
    fontSize: { default: '28px', [MID]: '22px', [SMALL]: '17px' }
  },
  count: {
    fontFamily: font.display,
    fontSize: { default: '44px', [MID]: '34px', [SMALL]: '26px' },
    fontWeight: 600,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums'
  },
  proof: {
    marginTop: '32px',
    marginBottom: 0,
    maxWidth: '52ch',
    fontSize: '18px',
    lineHeight: 1.55,
    color: color.text2
  },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '40px' },
  action: { display: 'inline-flex' }
})

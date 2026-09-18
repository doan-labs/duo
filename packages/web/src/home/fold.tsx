// The core idea: the fold is input. Four postures the visitor can pick; the
// device animates to each and a readout beside the code shows what
// `useDisplay()` would hand the app in that state.
import * as stylex from '@stylexjs/stylex'
import { animate, useMotionValue, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Device } from '../device'
import { useNarrow } from '../media'
import { color, font, radius } from '../tokens.stylex'
import { Block, Cap, Code, Columns, Headline, Lede } from './parts'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

const OPEN = { deg: 180, name: 'Fully open', mode: 'open', screen: 'inner', size: '790 × 850' }
const STATES = [
  OPEN,
  { deg: 120, name: 'Partially folded', mode: 'folding', screen: 'inner', size: '790 × 850' },
  { deg: 90, name: 'Desk', mode: 'half-open', screen: 'inner', size: '790 × 850' },
  { deg: 0, name: 'Closed', mode: 'closed', screen: 'cover', size: '387 × 850' }
]

const CODE = `const { mode, foldAngle, width, height } = useDisplay()

if (mode === 'half-open') {
  return <DeskMode />
}`

export function Fold() {
  const still = useReducedMotion()
  const narrow = useNarrow()
  const [s, setS] = useState(OPEN)
  const open = useMotionValue(1)
  const pick = (st: typeof OPEN) => {
    setS(st)
    animate(open, st.deg / 180, still ? { duration: 0 } : { duration: 1.1, ease: [0.65, 0, 0.35, 1] })
  }

  return (
    <Block cinema labelledBy="fold-title">
      <Cap>04 · The core idea</Cap>
      <Headline id="fold-title" lines={['The fold is not a breakpoint.', 'It is input.']} />
      <Lede>
        Most responsive software asks one question: how wide is the screen? Duo also asks what shape the device is in
        right now, and tells your app every time that changes.
      </Lede>

      <div {...stylex.props(styles.scene)}>
        <Columns align="start">
          <div>
            <fieldset {...stylex.props(styles.states)} aria-label="Posture">
              {STATES.map((st) => (
                <button
                  key={st.deg}
                  type="button"
                  aria-pressed={st === s}
                  onClick={() => pick(st)}
                  {...stylex.props(styles.state, st === s && styles.stateOn)}
                >
                  <span {...stylex.props(styles.deg)}>{st.deg}°</span>
                  <span>{st.name}</span>
                </button>
              ))}
            </fieldset>
            <Code title="app.tsx">{CODE}</Code>
            <dl {...stylex.props(styles.readout)} aria-live="polite">
              <Field k="mode" v={`"${s.mode}"`} />
              <Field k="foldAngle" v={String(s.deg)} />
              <Field k="screen" v={`"${s.screen}"`} />
              <Field k="width × height" v={s.size} />
            </dl>
            <p {...stylex.props(styles.list)}>
              Apps react to display mode, fold angle, active screen, hinge position and transition state. Nothing else;
              the fold is the API.
            </p>
          </div>
          <div {...stylex.props(styles.device)}>
            <Device open={open} width={narrow ? 300 : 600} />
          </div>
        </Columns>
      </div>
    </Block>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div {...stylex.props(styles.field)}>
      <dt {...stylex.props(styles.key)}>{k}</dt>
      <dd {...stylex.props(styles.val)}>{v}</dd>
    </div>
  )
}

const styles = stylex.create({
  scene: { marginTop: { default: '72px', [SMALL]: '48px' } },
  states: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    margin: 0,
    marginBottom: '24px',
    padding: 0,
    borderWidth: 0,
    minWidth: 0
  },
  state: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '8px',
    paddingTop: '9px',
    paddingBottom: '9px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radius.pill,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    backgroundColor: 'transparent',
    color: color.text2,
    fontFamily: font.sans,
    fontSize: '14px',
    cursor: 'pointer',
    transitionProperty: 'border-color, background-color, color',
    transitionDuration: '0.2s'
  },
  stateOn: { backgroundColor: color.text, borderColor: color.text, color: color.bg },
  deg: { fontFamily: font.mono, fontSize: '12px' },
  readout: {
    margin: 0,
    marginTop: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '1px',
    backgroundColor: color.border,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: '14px',
    overflow: 'hidden'
  },
  field: {
    backgroundColor: color.bg,
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: '18px',
    paddingRight: '18px'
  },
  key: { fontFamily: font.mono, fontSize: '11px', letterSpacing: '0.06em', color: color.text3 },
  val: { margin: 0, marginTop: '6px', fontFamily: font.mono, fontSize: '15px', color: color.text },
  list: {
    marginTop: '28px',
    marginBottom: 0,
    maxWidth: '44ch',
    fontSize: '16px',
    lineHeight: 1.55,
    color: color.text2
  },
  device: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: { default: '680px', [MID]: '0' },
    paddingTop: { default: '24px', [MID]: '0' }
  }
})

// The core idea: the fold is input. Four postures the visitor can pick; the
// real shell eases to each, the line of code that posture would run lights
// up, and a readout shows what `useDisplay()` hands the app in that state.
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { Field, LiveCode, Readout } from '../live-code'
import { Segmented } from '../segmented'
import { Simulator } from '../simulator'
import { color } from '../tokens.stylex'
import { Block, Cap, Columns, Headline, Lede, TextLink } from './parts'

const SMALL = '@media (max-width: 734px)'

type Posture = { deg: number; name: string; display: 'inner' | 'cover'; size: string; runs: number }
const OPEN: Posture = { deg: 180, name: 'Fully open', display: 'inner', size: '790 × 850', runs: 4 }
const STATES: Posture[] = [
  OPEN,
  { deg: 120, name: 'Partially folded', display: 'inner', size: '790 × 850', runs: 3 },
  { deg: 90, name: 'Desk', display: 'inner', size: '790 × 850', runs: 3 },
  { deg: 0, name: 'Closed', display: 'cover', size: '387 × 850', runs: 2 }
]

// What `useDisplay()` really returns: display, placement, size and the hinge
// angle. `runs` above points at the line each posture reaches.
const CODE = [
  'const { display, angle, width, height } = useDisplay()',
  '',
  "if (display === 'cover') return <PocketCard />",
  'if (angle < 150) return <Workspace angle={angle} />',
  'return <Board width={width} height={height} />'
]

export function Fold() {
  // The hinge angle is the identity of a posture, so the control can key on a plain value.
  const [deg, setDeg] = useState(OPEN.deg)
  const s = STATES.find((st) => st.deg === deg) ?? OPEN

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
            <Segmented
              id="fold-posture"
              label="Posture"
              value={deg}
              onChange={(d) => setDeg(d)}
              options={STATES.map((st) => ({ value: st.deg, label: st.name }))}
            />

            <LiveCode title="app.tsx" lines={CODE} on={s.runs} />

            <Readout>
              <Field k="display" v={`"${s.display}"`} />
              <Field k="angle" v={String(s.deg)} />
              <Field k="placement" v={'"full"'} />
              <Field k="width × height" v={s.size} />
            </Readout>
            <p {...stylex.props(styles.list)}>
              Apps hear about the display in use, their placement on it, its size and the hinge angle, every time one
              changes. The buttons and sensors are events too, <TextLink to="/docs/sdk">in the SDK</TextLink>.
            </p>
          </div>
          <div {...stylex.props(styles.device)}>
            <Simulator deg={s.deg} bare />
          </div>
        </Columns>
      </div>
    </Block>
  )
}

const styles = stylex.create({
  scene: { marginTop: { default: '72px', [SMALL]: '48px' } },
  list: {
    marginTop: '28px',
    marginBottom: 0,
    maxWidth: '44ch',
    fontSize: '16px',
    lineHeight: 1.55,
    color: color.text2
  },
  device: { position: 'sticky', top: '96px', display: 'flex', justifyContent: 'center', alignItems: 'center' }
})

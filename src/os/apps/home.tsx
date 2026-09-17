// Home, the HomeKit app: accessory tiles that light up, and a thermostat dial you drag.
import * as stylex from '@stylexjs/stylex'
import { type PointerEvent, useRef, useState } from 'react'
import { shared } from '../uikit/styles.ts'
import { colors } from '../uikit/tokens.stylex.ts'
import { beep } from './shared.ts'

// Local, not shared's: the StyleX compiler only follows keyframes imported from
// a `.stylex.ts` module, and uikit/styles.ts is not one.
const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

type Acc = { name: string; room: string; on: boolean; glow: string; kind?: 'fan' }

const ACCS: Acc[] = [
  { name: 'Desk Lamp', room: 'Studio', on: true, glow: 'rgba(255,206,110,.7)' },
  { name: 'Key Light', room: 'Studio', on: true, glow: 'rgba(255,255,255,.6)' },
  { name: 'Rim Lights', room: 'Studio', on: false, glow: 'rgba(150,200,255,.6)' },
  { name: 'Front Door', room: 'Entry', on: false, glow: 'rgba(120,255,170,.6)' },
  { name: 'Fan', room: 'Studio', on: false, glow: 'rgba(150,220,255,.6)', kind: 'fan' },
  { name: 'Speaker', room: 'Living', on: true, glow: 'rgba(255,140,200,.6)' }
]

const glyph = (a: Acc) =>
  a.kind === 'fan' ? '✳︎' : a.name.includes('Door') ? '🚪' : a.name.includes('Speaker') ? '🔊' : '💡'

const Tile = ({ a }: { a: Acc }) => {
  const [on, setOn] = useState(a.on)
  const toggle = () => {
    setOn(!on)
    beep([on ? 620 : 880], 0.05, 0.05)
  }
  return (
    <div {...stylex.props(styles.acc, on && styles.accOn, on && styles.glow(a.glow))} onClick={toggle}>
      <div {...stylex.props(styles.accTop)}>
        <div {...stylex.props(styles.glyph, on && a.kind === 'fan' && styles.fan)}>{glyph(a)}</div>
      </div>
      <div>
        <div {...stylex.props(styles.t)}>{a.name}</div>
        <div {...stylex.props(styles.st)}>{on ? 'On' : 'Off'}</div>
      </div>
    </div>
  )
}

// Thermostat: drag anywhere on the dial, the arc and the number follow. The
// track is a circle with a dash gap, rotated so the 90 deg it is missing sits
// at the bottom — one element instead of an arc path with trigonometry in it.
const C = 2 * Math.PI * 52
const Ring = ({ stroke, dash }: { stroke: string; dash: number }) => (
  <circle
    cx={65}
    cy={65}
    r={52}
    fill="none"
    stroke={stroke}
    strokeWidth={9}
    strokeLinecap="round"
    strokeDasharray={`${dash} ${C}`}
  />
)

const Thermostat = ({ temp, onChange }: { temp: number; onChange: (t: number) => void }) => {
  const drag = useRef(false)
  const at = (e: PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    // Angle from the dial centre. The panel can be rotated in 3D, so this is
    // only exact face-on — good enough for a drag, and it never gets stuck.
    const a = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2))
    const f = Math.min(1, Math.max(0, (((a * 180) / Math.PI + 360 - 45) % 360) / 270))
    onChange(Math.round(12 + f * 18))
  }
  return (
    <div
      {...stylex.props(styles.dialw)}
      onPointerDown={(e) => {
        drag.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        at(e)
      }}
      onPointerMove={(e) => {
        if (drag.current) at(e)
      }}
      onPointerUp={() => {
        drag.current = false
        beep([760], 0.05, 0.05)
      }}
    >
      <svg viewBox="0 0 130 130" {...stylex.props(styles.dialSvg)}>
        <defs>
          <linearGradient id="hg" x1={0} y1={0} x2={1} y2={1}>
            <stop offset={0} stopColor="#59c8ff" />
            <stop offset={1} stopColor="#ff9f0a" />
          </linearGradient>
        </defs>
        <Ring stroke="rgba(255,255,255,.12)" dash={C * 0.75} />
        <Ring stroke="url(#hg)" dash={C * 0.75 * ((temp - 12) / 18)} />
      </svg>
      <b {...stylex.props(styles.read)}>{temp}°</b>
    </div>
  )
}

export const Home = () => {
  const [temp, setTemp] = useState(21)
  return (
    <div {...stylex.props(shared.body)}>
      <div {...stylex.props(shared.hero)}>My Home</div>
      <div {...stylex.props(styles.center)}>
        <Thermostat temp={temp} onChange={setTemp} />
        <div {...stylex.props(shared.sub, styles.caption)}>Thermostat · Heating to {temp}°</div>
      </div>
      <div {...stylex.props(shared.hdr, styles.hdr18)}>Favourites</div>
      <div {...stylex.props(styles.accs)}>
        {ACCS.map((a) => (
          <Tile key={a.name} a={a} />
        ))}
      </div>
    </div>
  )
}

const styles = stylex.create({
  acc: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRadius: 18,
    paddingBlock: 12,
    paddingInline: 12,
    minHeight: 88,
    backgroundColor: 'rgba(255,255,255,.09)',
    cursor: 'pointer',
    color: colors.white,
    transitionProperty: 'background-color, box-shadow, color',
    transitionDuration: '.3s, .35s, .3s'
  },
  accOn: { backgroundColor: colors.white, color: '#111' },
  glow: (g: string) => ({ boxShadow: `0 0 28px -2px ${g}` }),
  accTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  glyph: { fontSize: 19 },
  fan: {
    animationName: spin,
    animationDuration: '1.1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite'
  },
  t: { fontSize: 13, fontWeight: 600, lineHeight: 1.2 },
  st: { fontSize: 11, opacity: 0.6 },
  accs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(108px,1fr))',
    gap: 10,
    paddingInline: 16,
    paddingBottom: 16
  },
  dialw: { position: 'relative', display: 'grid', placeItems: 'center', paddingTop: 8, paddingBottom: 18 },
  dialSvg: { width: 130, height: 130, transform: 'rotate(135deg)' },
  read: { position: 'absolute', fontSize: 42, fontWeight: 300 },
  center: { textAlign: 'center' },
  caption: { marginTop: -6 },
  hdr18: { fontSize: 18 }
})

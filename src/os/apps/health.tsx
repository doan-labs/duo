import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import type { Os } from '../uikit/app.ts'
import { delay, shared } from '../uikit/styles.ts'
import { colors } from '../uikit/tokens.stylex.ts'
import { Bars, card } from './rings.tsx'
import { poly, walk } from './shared.ts'

const Card = ({
  cap,
  colour,
  val,
  unit,
  i,
  children
}: {
  cap: string
  colour: string
  val: string
  unit: string
  i: number
  children: ReactNode
}) => (
  <div {...stylex.props(card.hcard, delay.ms(i * 70))}>
    <div {...stylex.props(card.cap, card.capTint(colour))}>
      {cap}
      <span {...stylex.props(styles.chev)}>›</span>
    </div>
    <div {...stylex.props(card.val)}>
      {val}
      <s {...stylex.props(card.unit)}>{unit}</s>
    </div>
    {children}
  </div>
)

const Line = ({ seed, colour }: { seed: string; colour: string }) => (
  <svg viewBox="0 0 300 70" aria-hidden="true" {...stylex.props(styles.line)}>
    <path
      d={poly(walk(seed, 40), 300, 70)}
      fill="none"
      stroke={colour}
      strokeWidth={2}
      strokeLinejoin="round"
      {...stylex.props(styles.draw)}
    />
  </svg>
)

export const Health = (_: { os: Os }) => (
  <div {...stylex.props(shared.body)}>
    <div {...stylex.props(shared.hero)}>Summary</div>
    <div {...stylex.props(shared.sub, styles.date)}>
      {new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}
    </div>
    <div {...stylex.props(card.cols)}>
      <Card cap="👟 Steps" colour="#ff9500" val="8,412" unit="steps" i={0}>
        <Bars seed="health-steps" colour="#ff9500" />
      </Card>
      <Card cap="❤️ Heart Rate" colour="#ff375f" val="62" unit="BPM" i={1}>
        <Line seed="health-hr" colour="#ff375f" />
      </Card>
      <Card cap="🛏 Sleep" colour="#5e5ce6" val="7h 12m" unit="last night" i={2}>
        <Bars seed="health-sleep" colour="#5e5ce6" />
      </Card>
      <Card cap="🫁 Respiratory" colour="#00c7be" val="14" unit="br/min" i={3}>
        <Line seed="health-resp" colour="#00c7be" />
      </Card>
    </div>
  </div>
)

const draw = stylex.keyframes({ to: { strokeDashoffset: 0 } })

const styles = stylex.create({
  date: { paddingInline: 16, paddingBottom: 12 },
  chev: { marginLeft: 'auto', color: colors.grey3, fontWeight: 400 },
  line: { width: '100%', height: 70, marginTop: 6 },
  draw: {
    strokeDasharray: 2400,
    strokeDashoffset: 2400,
    animationName: draw,
    animationDuration: '1.2s',
    animationTimingFunction: 'cubic-bezier(.3,.9,.3,1)',
    animationFillMode: 'forwards'
  }
})

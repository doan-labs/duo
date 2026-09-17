import type { Os } from '@doan-labs/ipduo-sdk'
import { Bars, card, RINGS, Rings } from '@doan-labs/ipduo-uikit/rings.tsx'
import { delay, shared } from '@doan-labs/ipduo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { styles } from './styles.ts'

const WORKOUTS = [
  ['🏃', 'Outdoor Run', '5.02 KM · 24:18'],
  ['🚴', 'Cycling', '18.4 KM · 41:02'],
  ['🏊', 'Pool Swim', '1,200 M · 28:44']
] as const

export const Fitness = (_: { os: Os }) => (
  <div {...stylex.props(shared.body)}>
    <div {...stylex.props(shared.hero)}>Summary</div>
    <Rings />
    <div {...stylex.props(styles.legend)}>
      {RINGS.map(([label, c, done, goal, unit]) => (
        <div key={label} {...stylex.props(styles.tint(c))}>
          {label}
          <b {...stylex.props(styles.legendVal)}>
            {done}/{goal}
          </b>
          <span {...stylex.props(styles.dim)}>{unit}</span>
        </div>
      ))}
    </div>
    <div {...stylex.props(card.cols)}>
      <div {...stylex.props(card.hcard, card.hcardDark, delay.ms(100))}>
        <div {...stylex.props(card.cap, card.capTint('#a6f425'))}>Move · this week</div>
        <div {...stylex.props(card.val)}>
          3,411<s {...stylex.props(card.unit)}>KCAL</s>
        </div>
        <Bars seed="fitness-move" colour="#fa114f" />
      </div>
      <div {...stylex.props(card.hcard, card.hcardDark, delay.ms(150))}>
        <div {...stylex.props(card.cap, card.capTint('#22e0f5'))}>Stand · this week</div>
        <div {...stylex.props(card.val)}>
          68<s {...stylex.props(card.unit)}>HRS</s>
        </div>
        <Bars seed="fitness-stand" colour="#22e0f5" />
      </div>
    </div>
    <div {...stylex.props(shared.hdr, styles.hdrSm)}>Workouts</div>
    <div {...stylex.props(card.cols)}>
      {WORKOUTS.map(([e, n, sub], i) => (
        <div key={n} {...stylex.props(card.hcard, card.hcardDark, styles.workout, delay.ms(200 + i * 50))}>
          <span {...stylex.props(styles.emoji)}>{e}</span>
          <div>
            <div {...stylex.props(styles.name)}>{n}</div>
            <div {...stylex.props(shared.sub)}>{sub}</div>
          </div>
          <span {...stylex.props(styles.chev)}>›</span>
        </div>
      ))}
    </div>
  </div>
)

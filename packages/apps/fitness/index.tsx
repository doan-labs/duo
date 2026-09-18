import type { Os } from '@doan-labs/duo-sdk'
import { LargeTitle, Screen, Text, Title } from '@doan-labs/duo-uikit'
import { Bars, card, RINGS, Rings } from '@doan-labs/duo-uikit/rings.tsx'
import { delay } from '@doan-labs/duo-uikit/styles.ts'
import { appAppearance } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { styles } from './styles.ts'

const WORKOUTS = [
  ['🏃', 'Outdoor Run', '5.02 KM · 24:18'],
  ['🚴', 'Cycling', '18.4 KM · 41:02'],
  ['🏊', 'Pool Swim', '1,200 M · 28:44']
] as const

export const Fitness = (_: { os: Os }) => (
  <Screen>
    <LargeTitle>Summary</LargeTitle>
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
        <div {...stylex.props(card.cap, card.capTint(appAppearance.fitnessColor))}>Move · this week</div>
        <div {...stylex.props(card.val)}>
          3,411<s {...stylex.props(card.unit)}>KCAL</s>
        </div>
        <Bars seed="fitness-move" colour={appAppearance.fitnessColor2} />
      </div>
      <div {...stylex.props(card.hcard, card.hcardDark, delay.ms(150))}>
        <div {...stylex.props(card.cap, card.capTint(appAppearance.fitnessColor3))}>Stand · this week</div>
        <div {...stylex.props(card.val)}>
          68<s {...stylex.props(card.unit)}>HRS</s>
        </div>
        <Bars seed="fitness-stand" colour={appAppearance.fitnessColor3} />
      </div>
    </div>
    <Title xstyle={[styles.hdrSm]}>Workouts</Title>
    <div {...stylex.props(card.cols)}>
      {WORKOUTS.map(([e, n, sub], i) => (
        <div key={n} {...stylex.props(card.hcard, card.hcardDark, styles.workout, delay.ms(200 + i * 50))}>
          <span {...stylex.props(styles.emoji)}>{e}</span>
          <div>
            <div {...stylex.props(styles.name)}>{n}</div>
            <Text as="div" size="caption">
              {sub}
            </Text>
          </div>
          <span {...stylex.props(styles.chev)}>›</span>
        </div>
      ))}
    </div>
  </Screen>
)

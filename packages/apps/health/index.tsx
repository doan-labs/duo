import type { Os } from '@doan-labs/duo-sdk'
import { LargeTitle, Screen, Text } from '@doan-labs/duo-uikit'
import { Bars, card } from '@doan-labs/duo-uikit/rings.tsx'
import { poly, walk } from '@doan-labs/duo-uikit/shared.ts'
import { delay, shared } from '@doan-labs/duo-uikit/styles.ts'
import { appAppearance } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { styles } from './styles.ts'

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
  <Screen>
    <LargeTitle>Summary</LargeTitle>
    <Text as="div" size="caption" xstyle={[styles.date]}>
      {new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}
    </Text>
    <div {...stylex.props(card.cols)}>
      <Card cap="👟 Steps" colour={appAppearance.healthColor} val="8,412" unit="steps" i={0}>
        <Bars seed="health-steps" colour={appAppearance.healthColor} />
      </Card>
      <Card cap="❤️ Heart Rate" colour={appAppearance.healthColor2} val="62" unit="BPM" i={1}>
        <Line seed="health-hr" colour={appAppearance.healthColor2} />
      </Card>
      <Card cap="🛏 Sleep" colour={appAppearance.healthColor3} val="7h 12m" unit="last night" i={2}>
        <Bars seed="health-sleep" colour={appAppearance.healthColor3} />
      </Card>
      <Card cap="🫁 Respiratory" colour={appAppearance.healthColor4} val="14" unit="br/min" i={3}>
        <Line seed="health-resp" colour={appAppearance.healthColor4} />
      </Card>
    </div>
  </Screen>
)

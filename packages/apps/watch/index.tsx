import type { Os } from '@doan-labs/ipduo-sdk'
import { Row as KitRow, Screen, Section, Text, Title, Toggle } from '@doan-labs/ipduo-uikit'
import { Rings } from '@doan-labs/ipduo-uikit/rings.tsx'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useState } from 'react'
import { styles } from './styles.ts'

const now = () => {
  const d = new Date()
  return {
    t: d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }),
    d: `${d.toLocaleDateString('en', { weekday: 'short' })} ${d.getDate()}`.toUpperCase()
  }
}

const Row = ({ name, right }: { name: string; right: ReactNode }) => (
  <KitRow xstyle={[styles.darkRow]}>
    {name}
    <span {...stylex.props(shared.rowR)}>{right}</span>
  </KitRow>
)

export const Watch = (_: { os: Os }) => {
  const [clock, setClock] = useState(now)
  useEffect(() => {
    const iv = setInterval(() => setClock(now()), 1000)
    return () => clearInterval(iv)
  }, [])
  return (
    <Screen>
      <div {...stylex.props(styles.face)}>
        <div {...stylex.props(styles.date)}>{clock.d}</div>
        <div {...stylex.props(styles.time)}>{clock.t}</div>
        <div {...stylex.props(styles.mini)}>
          <Rings size={120} stroke={11} />
        </div>
      </div>
      <div {...stylex.props(styles.center)}>
        <div {...stylex.props(styles.name)}>Apple Watch Ultra</div>
        <Text as="div" size="caption">
          Connected · 78%
        </Text>
      </div>
      <Title xstyle={[styles.hdrSm]}>My Watch</Title>
      <Section>
        <Row name="Notifications" right="›" />
        <Row name="App Layout" right="Grid ›" />
        <Row name="Complications" right="4 ›" />
        <Row name="Wrist Detection" right={<Toggle aria-label="Wrist Detection" defaultChecked />} />
        <Row name="Theatre Mode" right={<Toggle aria-label="Theatre Mode" />} />
      </Section>
    </Screen>
  )
}

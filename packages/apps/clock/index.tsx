import { Row, Screen, Section, Title } from '@doan-labs/duo-uikit'
// World clock: local time large, six cities below, ticking once a second.

import type { Os } from '@doan-labs/duo-sdk'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { styles } from './styles.ts'

const ZONES: [string, string][] = [
  ['Cupertino', 'America/Los_Angeles'],
  ['New York', 'America/New_York'],
  ['London', 'Europe/London'],
  ['Ho Chi Minh City', 'Asia/Ho_Chi_Minh'],
  ['Tokyo', 'Asia/Tokyo'],
  ['Sydney', 'Australia/Sydney']
]
const fmt = (d: Date, tz?: string) => d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', timeZone: tz })

export const Clock = (_: { os: Os }) => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <Screen>
      <Title>World Clock</Title>
      <div {...stylex.props(shared.big)}>{fmt(now)}</div>
      <Section>
        {ZONES.map(([n, tz]) => (
          <Row key={tz} xstyle={[styles.row]}>
            <span>{n}</span>
            <span {...stylex.props(shared.rowR, styles.time)}>{fmt(now, tz)}</span>
          </Row>
        ))}
      </Section>
    </Screen>
  )
}

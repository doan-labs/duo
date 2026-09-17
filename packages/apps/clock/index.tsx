// World clock: local time large, six cities below, ticking once a second.

import type { Os } from '@doan-labs/ipduo-sdk'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
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
    <div {...stylex.props(shared.body)}>
      <div {...stylex.props(shared.hdr)}>World Clock</div>
      <div {...stylex.props(shared.big)}>{fmt(now)}</div>
      <div {...stylex.props(shared.grp)}>
        {ZONES.map(([n, tz]) => (
          <div key={tz} {...stylex.props(shared.row, styles.row)}>
            <span>{n}</span>
            <span {...stylex.props(shared.rowR, styles.time)}>{fmt(now, tz)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

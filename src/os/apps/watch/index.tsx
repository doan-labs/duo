import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useState } from 'react'
import type { Os } from '../../uikit/app.ts'
import { shared } from '../../uikit/styles.ts'
import { Rings } from '../rings.tsx'
import { styles } from './styles.ts'

const now = () => {
  const d = new Date()
  return {
    t: d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }),
    d: `${d.toLocaleDateString('en', { weekday: 'short' })} ${d.getDate()}`.toUpperCase()
  }
}

const Row = ({ name, right }: { name: string; right: ReactNode }) => (
  <div {...stylex.props(shared.row, styles.darkRow)}>
    {name}
    <span {...stylex.props(shared.rowR)}>{right}</span>
  </div>
)

export const Watch = (_: { os: Os }) => {
  const [clock, setClock] = useState(now)
  useEffect(() => {
    const iv = setInterval(() => setClock(now()), 1000)
    return () => clearInterval(iv)
  }, [])
  return (
    <div {...stylex.props(shared.body)}>
      <div {...stylex.props(styles.face)}>
        <div {...stylex.props(styles.date)}>{clock.d}</div>
        <div {...stylex.props(styles.time)}>{clock.t}</div>
        <div {...stylex.props(styles.mini)}>
          <Rings size={120} stroke={11} />
        </div>
      </div>
      <div {...stylex.props(styles.center)}>
        <div {...stylex.props(styles.name)}>Apple Watch Ultra</div>
        <div {...stylex.props(shared.sub)}>Connected · 78%</div>
      </div>
      <div {...stylex.props(shared.hdr, styles.hdrSm)}>My Watch</div>
      <div {...stylex.props(shared.grp)}>
        <Row name="Notifications" right="›" />
        <Row name="App Layout" right="Grid ›" />
        <Row name="Complications" right="4 ›" />
        <Row name="Wrist Detection" right={<input type="checkbox" defaultChecked {...stylex.props(shared.sw)} />} />
        <Row name="Theatre Mode" right={<input type="checkbox" {...stylex.props(shared.sw)} />} />
      </div>
    </div>
  )
}

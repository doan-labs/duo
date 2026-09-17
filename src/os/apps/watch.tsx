import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useState } from 'react'
import type { Os } from '../uikit/app.ts'
import { shared } from '../uikit/styles.ts'
import { colors } from '../uikit/tokens.stylex.ts'
import { Rings } from './rings.tsx'

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

const styles = stylex.create({
  face: {
    width: 132,
    height: 162,
    borderRadius: 38,
    backgroundColor: colors.black,
    boxShadow: '0 0 0 5px #6e6e73,0 16px 34px rgba(0,0,0,.45)',
    marginTop: 14,
    marginInline: 'auto',
    marginBottom: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    color: colors.white
  },
  date: { fontSize: 11, color: colors.orange, fontWeight: 600, letterSpacing: 0.6 },
  time: { fontWeight: 600, fontSize: 30, lineHeight: 1, fontFamily: '-apple-system,system-ui', letterSpacing: -1 },
  mini: { transform: 'scale(.42)', marginBlock: -26 },
  center: { textAlign: 'center' },
  name: { fontWeight: 600 },
  hdrSm: { fontSize: 18, marginTop: 10 },
  darkRow: { backgroundColor: 'rgba(255,255,255,.07)', borderBottomColor: 'rgba(255,255,255,.08)' }
})

// Live forecast for San Francisco from Open-Meteo; the same promise feeds the
// home-screen widget, so both agree.
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import type { Os } from '../uikit/app.ts'
import { shared } from '../uikit/styles.ts'
import { day, forecast, wx } from './shared.ts'

type Forecast = Awaited<typeof forecast>

export const Weather = (_: { os: Os }) => {
  const [f, setF] = useState<Forecast | null>(null)
  useEffect(() => {
    let live = true
    forecast.then((v) => live && setF(v))
    return () => {
      live = false
    }
  }, [])
  if (!f)
    return (
      <div {...stylex.props(shared.body, styles.body)}>
        <div {...stylex.props(shared.ph)}>Loading…</div>
      </div>
    )
  const [ico, txt] = wx(f.code)
  return (
    <div {...stylex.props(shared.body, styles.body)}>
      <div {...stylex.props(styles.city)}>San Francisco</div>
      <div {...stylex.props(shared.big)}>{f.t}°</div>
      <div {...stylex.props(styles.cond)}>
        {ico} {txt}
      </div>
      <div {...stylex.props(styles.hilo)}>
        H:{f.days[0]?.hi}° L:{f.days[0]?.lo}°
      </div>
      <div {...stylex.props(styles.glass)}>
        {f.days.map((d) => (
          <div key={d.d} {...stylex.props(styles.days)}>
            <span {...stylex.props(styles.dayName)}>{day(d.d)}</span>
            <span>{wx(d.code)[0]}</span>
            <span {...stylex.props(styles.lo)}>{d.lo}°</span>
            <span>{d.hi}°</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Kept across mounts: the halves remount on unlock so the icons land again, and
// a widget that says — for a frame before the forecast arrives would flicker.
let latest: Forecast | undefined
forecast.then((f) => {
  latest = f
})

// Text and gradients only: Chrome drops the rounded corner clip on an image
// layer inside the CSS3D subtree, so widgets stay imageless.
export function WeatherWidget({ onOpen }: { onOpen: (from: HTMLElement) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const [f, setF] = useState(latest)
  useEffect(() => {
    forecast.then(setF)
  }, [])
  const [ico, txt] = f ? wx(f.code) : []
  return (
    <div ref={el} {...stylex.props(shared.glass, shared.widget, styles.wx)} onClick={() => onOpen(el.current!)}>
      <b {...stylex.props(shared.widgetLabel)}>San Francisco</b>
      <div {...stylex.props(styles.wbig)}>{f ? `${f.t}°` : '—'}</div>
      <b {...stylex.props(shared.widgetLabel, styles.wfoot)}>{f ? `${ico} ${txt}` : 'Loading…'}</b>
      <b {...stylex.props(shared.widgetLabel, styles.wsub)}>{f && `H:${f.days[0]?.hi}°  L:${f.days[0]?.lo}°`}</b>
    </div>
  )
}

const styles = stylex.create({
  body: { backgroundImage: 'linear-gradient(#1f6ee8,#5db9ff)', textAlign: 'center' },
  city: { paddingTop: 20, fontSize: 28 },
  cond: { fontSize: 18 },
  hilo: { opacity: 0.85, paddingBottom: 20 },
  // The shell's frosted material, on the forecast card.
  glass: {
    position: 'relative',
    marginInline: 16,
    borderRadius: 16,
    paddingBlock: 6,
    textAlign: 'left',
    backdropFilter: 'blur(18px) saturate(170%)',
    WebkitBackdropFilter: 'blur(18px) saturate(170%)',
    backgroundColor: 'rgba(255,255,255,.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.8),inset 0 -1px 0 rgba(255,255,255,.28),0 8px 18px rgba(0,0,0,.26)',
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      backgroundImage: 'radial-gradient(120% 60% at 30% -10%,rgba(255,255,255,.45),rgba(255,255,255,0) 60%)',
      pointerEvents: 'none'
    }
  },
  days: { display: 'flex', justifyContent: 'space-between', paddingBlock: 4, paddingInline: 20, fontSize: 15 },
  dayName: { width: 48 },
  lo: { opacity: 0.7 },
  wbig: { fontSize: 34, fontWeight: 300, lineHeight: 1.15, letterSpacing: -1 },
  wfoot: { marginTop: 'auto' },
  wsub: { opacity: 0.72, fontWeight: 500 },
  wx: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(rgba(63,143,245,.9),rgba(30,95,216,.9))'
  }
})

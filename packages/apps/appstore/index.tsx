// App Store: a Today feed of story cards, then a shelf of apps whose GET
// button walks through downloading to OPEN.

import { art, beep, hue } from '@doan-labs/ipduo-uikit/shared.ts'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { styles } from './styles.ts'

const STORE: [string, string, string][] = [
  ['Blender', 'Graphics & Design', 'Free'],
  ['Three.js Editor', 'Developer Tools', 'Free'],
  ['Bun', 'Developer Tools', 'Free'],
  ['Cycles Bench', 'Utilities', '$4.99'],
  ['Titanium', 'Photo & Video', '$2.99'],
  ['Foldable Toolkit', 'Productivity', 'Free']
]

/** GET → spinner → OPEN. The download time is per app, so a shelf of them does not finish in lockstep. */
const GetButton = ({ name }: { name: string }) => {
  const [state, setState] = useState(0)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const click = (e: MouseEvent) => {
    e.stopPropagation()
    if (state === 2) return beep([1046, 1568], 0.09, 0.06)
    if (state === 1) return
    setState(1)
    beep([700], 0.05, 0.04)
    timer.current = window.setTimeout(
      () => {
        setState(2)
        beep([1200, 1600], 0.07, 0.05)
      },
      1400 + (hue(name) % 900)
    )
  }
  return (
    <button type="button" {...stylex.props(styles.get)} onClick={click}>
      {state === 0 ? (
        <span {...stylex.props(shared.pill)}>GET</span>
      ) : state === 1 ? (
        <div {...stylex.props(styles.ring, shared.spin)} />
      ) : (
        <span {...stylex.props(shared.pill, styles.open)}>OPEN</span>
      )}
    </button>
  )
}

const Card = ({ title, kicker, blurb }: { title: string; kicker: string; blurb: string }) => (
  <div {...stylex.props(styles.card)}>
    <div {...stylex.props(styles.top, styles.bg(art(title, 50)))}>
      <div {...stylex.props(styles.kicker)}>{kicker.toUpperCase()}</div>
      <div {...stylex.props(styles.title)}>{title}</div>
    </div>
    <div {...stylex.props(styles.blurb)}>{blurb}</div>
  </div>
)

export const AppStore = () => (
  <div {...stylex.props(shared.body)}>
    <div {...stylex.props(shared.hero)}>Today</div>
    <Card
      title="Render it yourself"
      kicker="Story"
      blurb="How the titanium in this phone went from black to brushed: one environment, five area lights, and a roughness spread instead of a number."
    />
    <Card
      title="Fold, unfold, repeat"
      kicker="App of the Day"
      blurb="A hinge rig that walks its axis out as it closes, so two inner panels end up parallel with air between them instead of intersecting."
    />
    <div {...stylex.props(shared.hdr, styles.hdr18)}>Apps We Love</div>
    <div {...stylex.props(shared.grp)}>
      {STORE.map(([n, cat, price]) => (
        <div key={n} {...stylex.props(shared.row)}>
          <div {...stylex.props(styles.icon, styles.bg(art(n)))} />
          <div {...stylex.props(styles.info)}>
            <div {...stylex.props(styles.name)}>{n}</div>
            <div {...stylex.props(shared.sub)}>
              {cat} · {price}
            </div>
          </div>
          <GetButton name={n} />
        </div>
      ))}
    </div>
  </div>
)

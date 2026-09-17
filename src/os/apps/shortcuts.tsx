import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import type { Os } from '../uikit/app.ts'
import { shared } from '../uikit/styles.ts'
import { colors } from '../uikit/tokens.stylex.ts'
import { art, beep } from './shared.ts'

const Card = ({ name, glyph, act }: { name: string; glyph: string; act: () => void }) => {
  const [ran, setRan] = useState(false)
  const run = () => {
    setRan(true)
    beep([880, 1320], 0.06, 0.05)
    setTimeout(() => {
      setRan(false)
      act()
    }, 420)
  }
  return (
    <button type="button" {...stylex.props(styles.sc, styles.bg(art(name, 52)))} onClick={run}>
      <div {...stylex.props(styles.glyph)}>{glyph}</div>
      <b {...stylex.props(styles.name)}>{name}</b>
      <div {...stylex.props(styles.ok, ran && styles.okOn)}>✓</div>
    </button>
  )
}

export const Shortcuts = ({ os }: { os: Os }) => (
  <div {...stylex.props(shared.body)}>
    <div {...stylex.props(shared.hero)}>Shortcuts</div>
    <div {...stylex.props(styles.scs)}>
      <Card
        name="Open Wikipedia"
        glyph="🌐"
        act={() => os.open('Safari', 'https://en.m.wikipedia.org/wiki/Special:Random')}
      />
      <Card name="Take a Photo" glyph="📸" act={() => os.open('Camera')} />
      <Card name="Play Music" glyph="🎧" act={() => os.open('Music')} />
      <Card name="Today’s News" glyph="📰" act={() => os.open('News')} />
      <Card name="Call Home" glyph="☎️" act={() => os.open('Phone')} />
      <Card name="Find My Duo" glyph="📍" act={() => os.open('Find My')} />
      <Card name="Start Sketch" glyph="✏️" act={() => os.open('Freeform')} />
      <Card name="Go Home" glyph="🏠" act={() => os.home()} />
    </div>
    <div {...stylex.props(shared.hdr, styles.hdrSm)}>Automations</div>
    <div {...stylex.props(shared.grp)}>
      <div {...stylex.props(shared.row)}>
        When the phone unfolds<span {...stylex.props(shared.rowR)}>Open Freeform ›</span>
      </div>
      <div {...stylex.props(shared.row)}>
        At sunset<span {...stylex.props(shared.rowR)}>Dim Key Light ›</span>
      </div>
      <div {...stylex.props(shared.row)}>
        When a render finishes<span {...stylex.props(shared.rowR)}>Play sound ›</span>
      </div>
    </div>
  </div>
)

const styles = stylex.create({
  scs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))',
    gap: 14,
    paddingInline: 16,
    paddingBottom: 20
  },
  sc: {
    position: 'relative',
    borderRadius: 17,
    paddingTop: 13,
    paddingRight: 13,
    paddingBottom: 13,
    paddingLeft: 13,
    minHeight: 92,
    color: colors.white,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    textAlign: 'left',
    overflow: 'hidden',
    transitionProperty: 'transform',
    transitionDuration: '.18s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  bg: (img: string) => ({ backgroundImage: img }),
  glyph: { fontSize: 22 },
  name: { fontSize: 14, fontWeight: 600 },
  ok: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: 'rgba(0,0,0,.45)',
    fontSize: 34,
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: '.25s'
  },
  okOn: { opacity: 1 },
  hdrSm: { fontSize: 18 }
})

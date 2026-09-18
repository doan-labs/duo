import type { Os } from '@doan-labs/duo-sdk'
import { LargeTitle, Row, Screen, Section, Title } from '@doan-labs/duo-uikit'
import { art, beep } from '@doan-labs/duo-uikit/shared.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { styles } from './styles.ts'

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
  <Screen>
    <LargeTitle>Shortcuts</LargeTitle>
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
    <Title xstyle={[styles.hdrSm]}>Automations</Title>
    <Section>
      <Row>
        When the phone unfolds<span {...stylex.props(shared.rowR)}>Open Freeform ›</span>
      </Row>
      <Row>
        At sunset<span {...stylex.props(shared.rowR)}>Dim Key Light ›</span>
      </Row>
      <Row>
        When a render finishes<span {...stylex.props(shared.rowR)}>Play sound ›</span>
      </Row>
    </Section>
  </Screen>
)

import type { Os } from '@doan-labs/ipduo-sdk'
import { Button, Row, Screen, Section, Text, Title, Toggle } from '@doan-labs/ipduo-uikit'
import { art, beep } from '@doan-labs/ipduo-uikit/shared.ts'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import { Sym } from '@doan-labs/ipduo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { styles } from './styles.ts'

export const DEVICES: [string, string, number, number][] = [
  ['iPhone Duo', 'This device · Apple Park', 37.3349, -122.009],
  ['MacBook Pro', 'Home · 2 min ago', 37.7749, -122.4194],
  ['AirPods Pro', 'Studio · 1 hr ago', 37.8044, -122.2712],
  ['Apple Watch', 'With Jony · 14 min ago', 51.5074, -0.1278]
]

const osm = (lat: number, lon: number, z = 0.06) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lon - z},${lat - z / 2},${lon + z},${lat + z / 2}&layer=mapnik&marker=${lat},${lon}`

export const FindMy = (_: { os: Os }) => {
  const [sel, setSel] = useState(0)
  const [, , lat, lon] = DEVICES[sel]!
  return (
    <Screen xstyle={[shared.column, styles.flush]}>
      <div {...stylex.props(styles.mapw)}>
        <iframe title="map" src={osm(lat, lon)} />
        <div {...stylex.props(styles.pin)} />
      </div>
      <Screen>
        <Title>Devices</Title>
        <Section xstyle={[styles.white]}>
          {DEVICES.map(([name, where], i) => (
            <Row key={name} xstyle={[i === sel && styles.selected]} onClick={() => setSel(i)}>
              <span {...stylex.props(shared.rowIc, styles.devIc(art(name)))}>
                <Sym name="iphone" size={20} />
              </span>
              <div {...stylex.props(styles.grow)}>
                <div {...stylex.props(styles.name)}>{name}</div>
                <Text as="div" size="caption">
                  {where}
                </Text>
              </div>
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  beep([1046, 1568, 2093], 0.5, 0.07)
                }}
              >
                Play Sound
              </Button>
            </Row>
          ))}
        </Section>
        <Section>
          <Row>
            <Sym name="location" size={18} />
            Share My Location
            <Toggle aria-label="Share My Location" defaultChecked />
          </Row>
        </Section>
      </Screen>
    </Screen>
  )
}

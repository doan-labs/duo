import { Screen } from '@doan-labs/ipduo-uikit'
// OpenStreetMap's embed, centred on San Francisco.

import type { Os } from '@doan-labs/ipduo-sdk'
import { styles } from './styles.ts'

const osm = (lat: number, lon: number, z = 0.06) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lon - z},${lat - z / 2},${lon + z},${lat + z / 2}&layer=mapnik&marker=${lat},${lon}`

export const Maps = (_: { os: Os }) => (
  <Screen xstyle={[styles.body]}>
    <iframe title="Map" src={osm(37.7749, -122.4194)} />
  </Screen>
)

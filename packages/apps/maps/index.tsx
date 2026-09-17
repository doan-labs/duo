// OpenStreetMap's embed, centred on San Francisco.

import type { Os } from '@doan-labs/ipduo-sdk'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { styles } from './styles.ts'

const osm = (lat: number, lon: number, z = 0.06) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lon - z},${lat - z / 2},${lon + z},${lat + z / 2}&layer=mapnik&marker=${lat},${lon}`

export const Maps = (_: { os: Os }) => (
  <div {...stylex.props(shared.body, styles.body)}>
    <iframe title="Map" src={osm(37.7749, -122.4194)} />
  </div>
)

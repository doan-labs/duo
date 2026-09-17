// OpenStreetMap's embed, centred on San Francisco.
import * as stylex from '@stylexjs/stylex'
import type { Os } from '../uikit/app.ts'
import { shared } from '../uikit/styles.ts'

const osm = (lat: number, lon: number, z = 0.06) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lon - z},${lat - z / 2},${lon + z},${lat + z / 2}&layer=mapnik&marker=${lat},${lon}`

export const Maps = (_: { os: Os }) => (
  <div {...stylex.props(shared.body, styles.body)}>
    <iframe title="Map" src={osm(37.7749, -122.4194)} />
  </div>
)

const styles = stylex.create({
  body: { paddingBottom: 0 }
})

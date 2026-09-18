import { Screen, Title } from '@doan-labs/duo-uikit'
// Camera shots first, then placeholders; tap a tile for a full-bleed viewer.

import type { Os } from '@doan-labs/duo-sdk'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { styles } from './styles.ts'

export const Photos = ({ os }: { os: Os }) => {
  const [view, setView] = useState<string | null>(null)
  const srcs = [...os.shots, ...Array.from({ length: 15 }, (_, i) => `https://picsum.photos/seed/duo${i}/400/400`)]
  return (
    <Screen xstyle={[styles.body]}>
      <Title xstyle={[styles.hdr]}>
        Photos
        <Title as="span" variant="accessory">
          {srcs.length} items
        </Title>
      </Title>
      <div {...stylex.props(shared.grid)}>
        {srcs.map((s) => (
          <img key={s} {...stylex.props(shared.gridImg)} src={s} alt="" loading="lazy" onClick={() => setView(s)} />
        ))}
      </div>
      {view && (
        <div {...stylex.props(shared.viewer)} onClick={() => setView(null)}>
          <img {...stylex.props(shared.viewerImg)} src={view} alt="" />
        </div>
      )}
    </Screen>
  )
}

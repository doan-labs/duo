// Camera shots first, then placeholders; tap a tile for a full-bleed viewer.
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import type { Os } from '../../uikit/app.ts'
import { shared } from '../../uikit/styles.ts'
import { styles } from './styles.ts'

export const Photos = ({ os }: { os: Os }) => {
  const [view, setView] = useState<string | null>(null)
  const srcs = [...os.shots, ...Array.from({ length: 15 }, (_, i) => `https://picsum.photos/seed/duo${i}/400/400`)]
  return (
    <div {...stylex.props(shared.body, styles.body)}>
      <div {...stylex.props(shared.hdr, styles.hdr)}>
        Photos
        <span {...stylex.props(shared.hdrSm)}>{srcs.length} items</span>
      </div>
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
    </div>
  )
}

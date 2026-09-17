// A feed of thumbnails; tapping one opens the privacy-enhanced embed above it.
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { ICONS } from '../../icons/index.ts'
import type { Os } from '../uikit/app.ts'
import { shared } from '../uikit/styles.ts'
import { Sym } from '../uikit/sym.tsx'

const VIDEOS: [string, string, string][] = [
  ['aqz-KE-bpKQ', 'Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film', 'Blender'],
  ['LXb3EKWsInQ', 'COSTA RICA IN 4K 60fps HDR (ULTRA HD)', 'Jacob + Katie Schwarz'],
  ['jNQXAC9IVRw', 'Me at the zoo', 'jawed'],
  ['dQw4w9WgXcQ', 'Rick Astley - Never Gonna Give You Up (Official Video)', 'Rick Astley'],
  ['9bZkp7q19f0', 'PSY - GANGNAM STYLE M/V', 'officialpsy']
]

export const YouTube = ({ os }: { os: Os }) => {
  const [playing, setPlaying] = useState<string | null>(null)
  return (
    <div {...stylex.props(shared.body, styles.body)}>
      <div {...stylex.props(shared.hdr)}>
        <img {...stylex.props(styles.logo)} src={ICONS.YouTube} alt="" />
        YouTube
        <span {...stylex.props(shared.hdrSm, styles.sm)}>
          <Sym name="search" size={20} />
          <Sym name="person" size={22} />
        </span>
      </div>
      {playing && (
        <div {...stylex.props(styles.player)}>
          <iframe
            title="Player"
            src={`https://www.youtube-nocookie.com/embed/${playing}?autoplay=${os.mirror ? 0 : 1}&playsinline=1`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <div {...stylex.props(shared.body)}>
        {VIDEOS.map(([id, t, c]) => (
          <div key={id} {...stylex.props(styles.vid)} onClick={() => setPlaying(id)}>
            <img
              {...stylex.props(styles.thumb)}
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
            />
            <div {...stylex.props(styles.t)}>{t}</div>
            <div {...stylex.props(styles.c)}>
              {c} · {(id.charCodeAt(0) % 9) + 1}M views
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = stylex.create({
  body: { display: 'flex', flexDirection: 'column', paddingBottom: 0 },
  logo: { width: 26, height: 26 },
  sm: { opacity: 1 },
  player: { aspectRatio: '16/9', flexShrink: 0, backgroundColor: '#000' },
  vid: { display: 'flex', flexDirection: 'column', gap: 8, paddingBlock: 10, paddingInline: 12, cursor: 'pointer' },
  thumb: { width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12, display: 'block' },
  t: { fontWeight: 600, fontSize: 14 },
  c: { fontSize: 12, color: '#aaa' }
})

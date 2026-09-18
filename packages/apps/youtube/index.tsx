import { Screen, Title } from '@doan-labs/duo-uikit'
// A feed of thumbnails; tapping one opens the privacy-enhanced embed above it.

import type { Os } from '@doan-labs/duo-sdk'
import { ICONS } from '@doan-labs/duo-uikit/icons/index.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { styles } from './styles.ts'

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
    <Screen xstyle={[styles.body]}>
      <Title>
        <img {...stylex.props(styles.logo)} src={ICONS.YouTube} alt="" />
        YouTube
        <Title as="span" variant="accessory" xstyle={[styles.sm]}>
          <Sym name="search" size={20} />
          <Sym name="person" size={22} />
        </Title>
      </Title>
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
      <Screen>
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
      </Screen>
    </Screen>
  )
}

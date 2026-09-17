// TV. Shelves of posters generated from their titles; opening one plays a real trailer embed.

import type { Os } from '@doan-labs/ipduo-sdk'
import { art, hue } from '@doan-labs/ipduo-uikit/shared.ts'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import { Sym } from '@doan-labs/ipduo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { Fragment, useState } from 'react'
import { styles } from './styles.ts'

const SHELVES: [string, string[]][] = [
  ['Featured', ['Severance', 'For All Mankind', 'Silo', 'Ted Lasso', 'Foundation']],
  ['Documentaries', ['Big Buck Bunny', 'Costa Rica 4K', 'Tears of Steel', 'Sintel', 'Elephants Dream']],
  ['Continue Watching', ['Slow Horses', 'Pachinko', 'The Morning Show', 'Shrinking']]
]
/** YouTube's ids, copied: a title picks its trailer by hue, so the order has to match. */
const VIDEOS = ['aqz-KE-bpKQ', 'LXb3EKWsInQ', 'jNQXAC9IVRw', 'dQw4w9WgXcQ', '9bZkp7q19f0']

const Show = ({ title, mirror, onClose }: { title: string; mirror?: boolean; onClose: () => void }) => (
  <div {...stylex.props(styles.stage)}>
    <div {...stylex.props(styles.fill)}>
      <div {...stylex.props(styles.player)}>
        <iframe
          title={title}
          src={`https://www.youtube-nocookie.com/embed/${VIDEOS[hue(title) % VIDEOS.length]!}?autoplay=${mirror ? 0 : 1}&playsinline=1`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div {...stylex.props(shared.body)}>
        <div {...stylex.props(shared.hdr)}>{title}</div>
        <div {...stylex.props(shared.sub, styles.meta)}>
          {2018 + (hue(title) % 8)} · {1 + (hue(title) % 4)} seasons · Apple TV+
        </div>
        <div {...stylex.props(styles.artTxt)}>
          <p {...stylex.props(styles.para)}>
            Sample catalogue entry. The trailer above is a real embed; artwork is generated from the title so nothing
            here needs a network round-trip to look designed.
          </p>
        </div>
      </div>
    </div>
    <button type="button" {...stylex.props(styles.close)} onClick={onClose}>
      <Sym name="close" size={14} />
    </button>
  </div>
)

export const Tv = ({ os }: { os: Os }) => {
  const [show, setShow] = useState<string | null>(null)
  return (
    <div {...stylex.props(shared.body, styles.flush)}>
      <div {...stylex.props(shared.body)}>
        <div {...stylex.props(shared.hero)}>Watch Now</div>
        {SHELVES.map(([name, titles]) => (
          <Fragment key={name}>
            <div {...stylex.props(shared.hdr, styles.hdr18)}>{name}</div>
            <div {...stylex.props(styles.shelf)}>
              {titles.map((t) => (
                <div key={t} {...stylex.props(styles.poster)} onClick={() => setShow(t)}>
                  <div {...stylex.props(styles.im, styles.tint(art(t, 48)))}>{t}</div>
                </div>
              ))}
            </div>
          </Fragment>
        ))}
      </div>
      {show && <Show title={show} mirror={os.mirror} onClose={() => setShow(null)} />}
    </div>
  )
}

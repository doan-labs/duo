import type { Os } from '@doan-labs/ipduo-sdk'
import { ICONS } from '@doan-labs/ipduo-uikit/icons/index.ts'
import { delay, shared } from '@doan-labs/ipduo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { styles } from './styles.ts'

export const IN_FOLDER = ['Calculator', 'Voice Memos', 'Shortcuts', 'Podcasts', 'App Store', 'Books', 'YouTube']

/** The folder's own screen: the icons it holds, at home-screen size. */
export const Utilities = ({ os }: { os: Os }) => (
  <div {...stylex.props(shared.body, styles.body)}>
    <div {...stylex.props(styles.title)}>Utilities</div>
    <div {...stylex.props(styles.grid)}>
      {IN_FOLDER.map((name, i) => (
        <div
          key={name}
          {...stylex.props(styles.f, shared.rise, styles.riseFast, delay.ms(i * 40))}
          onClick={() => os.open(name)}
        >
          <img {...stylex.props(styles.icon)} src={ICONS[name] ?? ''} alt="" />
          <span>{name}</span>
        </div>
      ))}
    </div>
  </div>
)

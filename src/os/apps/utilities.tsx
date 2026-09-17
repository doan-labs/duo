import * as stylex from '@stylexjs/stylex'
import { ICONS } from '../../icons/index.ts'
import type { Os } from '../uikit/app.ts'
import { delay, shared } from '../uikit/styles.ts'

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

const styles = stylex.create({
  body: { paddingTop: 20 },
  title: { textAlign: 'center', fontSize: 20, fontWeight: 600, paddingBottom: 18 },
  // iOS centres the icons rather than filling the width.
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    rowGap: 24,
    columnGap: 8,
    paddingTop: 10,
    paddingInline: 16,
    paddingBottom: 24,
    maxWidth: 400,
    marginInline: 'auto'
  },
  f: {
    display: 'grid',
    justifyItems: 'center',
    gap: 6,
    fontSize: 11,
    textAlign: 'center',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.15s',
    transform: { default: null, ':active': 'scale(.92)' }
  },
  riseFast: { animationDuration: '.45s' },
  icon: { width: 52, height: 52 }
})

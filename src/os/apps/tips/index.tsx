import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { delay, shared } from '../../uikit/styles.ts'
import { styles } from './styles.ts'

const TIPS: [string, string, string, string][] = [
  [
    'Two screens, one gesture',
    '📖',
    'linear-gradient(140deg,#ff9f0a,#ff375f)',
    'Open the Duo and whatever you were reading widens into the inner display. Fold it and the same view snaps back to the cover, keeping your place.'
  ],
  [
    'Drag across the fold',
    '🫳',
    'linear-gradient(140deg,#0a84ff,#5e5ce6)',
    'Pick a photo up on the left half and drop it into a message on the right. Apps either side of the hinge share one drag session.'
  ],
  [
    'Half-fold the camera',
    '📸',
    'linear-gradient(140deg,#34c759,#00c7be)',
    'Stand the Duo at 90° and the viewfinder moves to the top half, controls to the bottom. No tripod needed for a long exposure.'
  ],
  [
    'Cover-screen widgets',
    '🧩',
    'linear-gradient(140deg,#bf5af2,#ff2d55)',
    'Widgets you place on the left four columns stay put when you fold, because the cover display shows exactly that half.'
  ],
  [
    'Battery across halves',
    '🔋',
    'linear-gradient(140deg,#ffd60a,#ff9f0a)',
    'Closing the Duo parks the inner display entirely. Reading on the cover alone roughly doubles what a charge is worth.'
  ]
]

const Tip = ({ title, emoji, bg, body, i }: { title: string; emoji: string; bg: string; body: string; i: number }) => {
  const [open, setOpen] = useState(false)
  return (
    <div {...stylex.props(styles.tip, shared.rise, delay.ms(i * 60))} onClick={() => setOpen(!open)}>
      <div {...stylex.props(styles.im, styles.bg(bg))}>{emoji}</div>
      <div {...stylex.props(styles.tx)}>
        <div {...stylex.props(styles.title)}>{title}</div>
        <div {...stylex.props(shared.sub, styles.hint)}>Tap to read</div>
        <p {...stylex.props(styles.more, open && styles.moreOpen)}>{body}</p>
      </div>
    </div>
  )
}

export const Tips = () => (
  <div {...stylex.props(shared.body)}>
    <div {...stylex.props(shared.hero)}>Tips</div>
    <div {...stylex.props(shared.sub, styles.lede)}>Getting the most out of iPhone Duo</div>
    <div {...stylex.props(styles.cols)}>
      {TIPS.map(([title, emoji, bg, body], i) => (
        <Tip key={title} title={title} emoji={emoji} bg={bg} body={body} i={i} />
      ))}
    </div>
  </div>
)

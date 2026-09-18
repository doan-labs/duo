import { LargeTitle, Screen, Text } from '@doan-labs/ipduo-uikit'
import { delay, shared } from '@doan-labs/ipduo-uikit/styles.ts'
import { appAppearance } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { styles } from './styles.ts'

const TIPS: [string, string, string, string][] = [
  [
    'Two screens, one gesture',
    '📖',
    appAppearance.tipsWarm,
    'Open the Duo and whatever you were reading widens into the inner display. Fold it and the same view snaps back to the cover, keeping your place.'
  ],
  [
    'Drag across the fold',
    '🫳',
    appAppearance.tipsCool,
    'Pick a photo up on the left half and drop it into a message on the right. Apps either side of the hinge share one drag session.'
  ],
  [
    'Half-fold the camera',
    '📸',
    appAppearance.tipsGreen,
    'Stand the Duo at 90° and the viewfinder moves to the top half, controls to the bottom. No tripod needed for a long exposure.'
  ],
  [
    'Cover-screen widgets',
    '🧩',
    appAppearance.tipsPink,
    'Widgets you place on the left four columns stay put when you fold, because the cover display shows exactly that half.'
  ],
  [
    'Battery across halves',
    '🔋',
    appAppearance.tipsYellow,
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
        <Text as="div" size="caption" xstyle={[styles.hint]}>
          Tap to read
        </Text>
        <p {...stylex.props(styles.more, open && styles.moreOpen)}>{body}</p>
      </div>
    </div>
  )
}

export const Tips = () => (
  <Screen>
    <LargeTitle>Tips</LargeTitle>
    <Text as="div" size="caption" xstyle={[styles.lede]}>
      Getting the most out of iPhone Duo
    </Text>
    <div {...stylex.props(styles.cols)}>
      {TIPS.map(([title, emoji, bg, body], i) => (
        <Tip key={title} title={title} emoji={emoji} bg={bg} body={body} i={i} />
      ))}
    </div>
  </Screen>
)

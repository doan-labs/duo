// "It behaves like a device": one sticky device that folds, turns and opens
// again as the page scrolls, with four captions taking turns. The visitor
// keeps the scroll; only the device's pose is linked to it.
import * as stylex from '@stylexjs/stylex'
import { type MotionValue, motion, useMotionValue, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { Device } from '../device'
import { useNarrow } from '../media'
import { color, font } from '../tokens.stylex'
import { Block, Cap, Headline, Lede } from './parts'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

const CAPTIONS = [
  { at: [0.0, 0.25], text: 'Fold it.', note: 'The inner display hands over to the cover as the hinge closes.' },
  { at: [0.25, 0.5], text: 'Close it mid-song.', note: 'Playback continues on the cover. Nothing remounts.' },
  { at: [0.5, 0.75], text: 'Take a screenshot.', note: 'Side button and volume up, like the phone in your pocket.' },
  { at: [0.75, 1.0], text: 'Drag an app into split screen.', note: 'Two apps, one per half, open flat.' }
]

export function Works() {
  const still = useReducedMotion()
  const narrow = useNarrow()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const open = useTransform(scrollYProgress, [0, 0.22, 0.42, 0.55, 0.72, 1], [1, 0.55, 0, 0, 1, 1])
  const spin = useTransform(scrollYProgress, [0, 0.5, 1], [-10, 26, 4])
  const fixed = useMotionValue(0.55)

  return (
    <Block labelledBy="works-title">
      <Cap>01 · Not a mockup</Cap>
      <Headline id="works-title" lines={['It looks like a concept.', 'It behaves like a device.']} />
      <Lede>
        Every pose, button and gesture below is the shell itself, driven by the same code the desktop app runs.
      </Lede>

      {still ? (
        <div {...stylex.props(styles.stillScene)}>
          <Device open={fixed} width={narrow ? 320 : 560} />
          <ul {...stylex.props(styles.list)}>
            {CAPTIONS.map((c) => (
              <li key={c.text} {...stylex.props(styles.item)}>
                <p {...stylex.props(styles.caption)}>{c.text}</p>
                <p {...stylex.props(styles.note)}>{c.note}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div ref={ref} {...stylex.props(styles.track)}>
          <div {...stylex.props(styles.sticky)}>
            <div {...stylex.props(styles.device)}>
              <Device open={open} spin={spin} width={narrow ? 300 : 560} />
            </div>
            <div {...stylex.props(styles.captions)} aria-live="off">
              {CAPTIONS.map((c) => (
                <Caption key={c.text} progress={scrollYProgress} at={c.at} text={c.text} note={c.note} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Block>
  )
}

function Caption({
  progress,
  at,
  text,
  note
}: {
  progress: MotionValue<number>
  at: number[]
  text: string
  note: string
}) {
  const [a = 0, b = 1] = at
  const span = b - a
  const opacity = useTransform(progress, [a, a + span * 0.2, b - span * 0.2, b], [0, 1, 1, 0])
  const y = useTransform(progress, [a, a + span * 0.2, b - span * 0.2, b], [16, 0, 0, -16])
  // The first caption starts visible and the last stays, so the scene never sits empty.
  const first = a === 0
  const last = b === 1
  const o = useTransform([opacity, progress], ([v = 0, p = 0]: number[]) =>
    (first && p <= a) || (last && p >= b) ? 1 : v
  )
  return (
    <motion.div {...stylex.props(styles.slide)} style={{ opacity: o, y }}>
      <p {...stylex.props(styles.caption)}>{text}</p>
      <p {...stylex.props(styles.note)}>{note}</p>
    </motion.div>
  )
}

const styles = stylex.create({
  track: { position: 'relative', height: '320vh', marginTop: '56px' },
  sticky: {
    position: 'sticky',
    top: 0,
    height: '100vh',
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 7fr) minmax(0, 5fr)', [MID]: 'minmax(0, 1fr)' },
    alignItems: 'center',
    gap: { default: '48px', [MID]: '24px' }
  },
  device: { display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 },
  captions: { position: 'relative', minHeight: '160px' },
  slide: { position: 'absolute', insetInlineStart: 0, top: 0, maxWidth: '30ch' },
  caption: {
    margin: 0,
    fontFamily: font.display,
    fontSize: { default: '44px', [MID]: '32px', [SMALL]: '26px' },
    lineHeight: 1.1,
    fontWeight: 600,
    letterSpacing: '-0.03em',
    color: color.text
  },
  note: {
    marginTop: '14px',
    marginBottom: 0,
    fontSize: '17px',
    lineHeight: 1.5,
    color: color.text2
  },
  stillScene: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 7fr) minmax(0, 5fr)', [MID]: 'minmax(0, 1fr)' },
    alignItems: 'center',
    gap: '48px',
    marginTop: '72px'
  },
  list: { listStyleType: 'none', margin: 0, padding: 0, display: 'grid', gap: '32px' },
  item: { display: 'block' }
})

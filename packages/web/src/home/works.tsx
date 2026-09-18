// "It behaves like a device": one real shell, sticky, that folds, turns and
// opens again as the page scrolls, then crosses to the other side for the
// hardware and App Store steps. Six captions take turns; the visitor keeps the
// scroll and only the device's pose and app are linked to it.
import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { type MotionValue, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { type ReactNode, useRef, useState } from 'react'
import { useMedia } from '../media'
import { Simulator } from '../simulator'
import { color, font } from '../tokens.stylex'
import { Block, Cap, Headline, Lede } from './parts'

const RAD = Math.PI / 180
const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'
const CURVE = [0.32, 0.72, 0, 1] as const

type Step = { cap?: string; text: string[]; note: string; app?: string }
const STEPS: Step[] = [
  { text: ['Fold it.'], note: 'The inner display hands over to the cover as the hinge closes.' },
  { text: ['Close it mid-song.'], note: 'Playback continues on the cover. Nothing remounts.' },
  { text: ['Take a screenshot.'], note: 'Side button and volume up, like the phone in your pocket.' },
  { text: ['Drag an app into split screen.'], note: 'Two apps, one per half, open flat.' },
  {
    cap: '02 · Real hardware',
    text: ['The simulated phone', 'can use your real camera.'],
    note: 'On the desktop it is your Mac camera, or your iPhone over Continuity Camera. Here it is your webcam.',
    app: 'Camera'
  },
  {
    cap: '03 · The twist',
    text: ['And then we gave it', 'an App Store.'],
    note: 'Apps install into their own isolated runtime, keep their own storage, and update on their own.',
    app: 'App Store'
  }
]
/** The first step that puts the device on the right and the words on the left. */
const CROSS = 4
/** The last step goes full width: words on top, the phone large beneath them. */
const FULL = 5
const N = STEPS.length
const band = (i: number) => [i / N, (i + 1) / N] as const

type Cam = 'ask' | 'granted' | 'denied'

export function Works() {
  const still = useReducedMotion()
  const stacked = useMedia('(max-width: 1068px)')
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // The fold story runs over the first four bands; the device stays open after.
  const open = useTransform(scrollYProgress, [0, 0.15, 0.28, 0.37, 0.48, 1], [1, 0.55, 0, 0, 1, 1])
  const spin = useTransform(scrollYProgress, [0, 0.33, 0.66, 1], [-10, 26, 4, -6])
  // The shell eases toward each pose itself, so whole degrees are enough and
  // keep the frame from being messaged on every scroll pixel.
  const [deg, setDeg] = useState(180)
  const [yaw, setYaw] = useState(-10 * RAD)
  const [step, setStep] = useState(0)
  const [cam, setCam] = useState<Cam>('ask')
  useMotionValueEvent(open, 'change', (v) => setDeg(Math.round(v * 180)))
  useMotionValueEvent(spin, 'change', (v) => setYaw(Math.round(v) * RAD))
  useMotionValueEvent(scrollYProgress, 'change', (p) => setStep(Math.min(N - 1, Math.floor(p * N))))

  // The page asks for the camera itself, drops the stream, and only then opens
  // the app, which finds the permission already given. A refusal still opens it.
  const allow = () =>
    Promise.resolve(navigator.mediaDevices?.getUserMedia({ video: true }))
      .then((s) => {
        s?.getTracks().forEach((t) => t.stop())
        setCam(s ? 'granted' : 'denied')
      })
      .catch(() => setCam('denied'))

  const current = STEPS[step] ?? STEPS[0]!
  // Camera waits for the visitor's word; the other steps switch on their own.
  const app = current.app === 'Camera' && cam === 'ask' ? '' : (current.app ?? '')
  const crossed = step >= CROSS && step < FULL && !stacked
  const full = step >= FULL && !stacked

  if (still) {
    return (
      <Block labelledBy="works-title">
        <Intro />
        <div {...stylex.props(styles.stillScene)}>
          <Simulator deg={100} bare />
          <ul {...stylex.props(styles.list)}>
            {STEPS.map((s) => (
              <li key={s.text[0]} {...stylex.props(styles.item)}>
                <p {...stylex.props(styles.caption)}>{s.text.join(' ')}</p>
                <p {...stylex.props(styles.note)}>{s.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </Block>
    )
  }

  return (
    <Block labelledBy="works-title">
      <Intro />
      <div ref={ref} {...stylex.props(styles.track)}>
        <div {...stylex.props(styles.sticky, full && styles.stickyFull)}>
          <motion.div
            layout="position"
            transition={{ layout: { duration: 0.9, ease: CURVE } }}
            {...stylex.props(styles.device, crossed && styles.deviceRight, full && styles.deviceFull)}
          >
            <Simulator deg={deg} yaw={yaw} app={app} bare fill={full} />
          </motion.div>
          <motion.div
            layout="position"
            transition={{ layout: { duration: 0.9, ease: CURVE } }}
            {...stylex.props(styles.captions, crossed && styles.captionsLeft, full && styles.captionsTop)}
            aria-live="off"
          >
            {STEPS.map((s, i) => (
              <Caption key={s.text[0]} progress={scrollYProgress} at={band(i)} step={s} centre={i >= FULL && !stacked}>
                {s.app === 'Camera' && <CameraAsk state={cam} onAllow={allow} />}
                {s.app === 'App Store' && <StoreNote />}
              </Caption>
            ))}
          </motion.div>
        </div>
      </div>
    </Block>
  )
}

function Intro() {
  return (
    <>
      <Cap>01 · Not a mockup</Cap>
      <Headline id="works-title" lines={['It looks like a concept.', 'It behaves like a device.']} />
      <Lede>
        Every pose, button and gesture below is the shell itself, driven by the same code the desktop app runs.
      </Lede>
    </>
  )
}

function Caption({
  progress,
  at,
  step,
  centre = false,
  children
}: {
  progress: MotionValue<number>
  at: readonly [number, number]
  step: Step
  centre?: boolean
  children?: ReactNode
}) {
  const [a, b] = at
  const span = b - a
  const opacity = useTransform(progress, [a, a + span * 0.2, b - span * 0.2, b], [0, 1, 1, 0])
  const y = useTransform(progress, [a, a + span * 0.2, b - span * 0.2, b], [16, 0, 0, -16])
  // The first caption starts visible and the last stays, so the scene never sits empty.
  const first = a === 0
  const last = b === 1
  const o = useTransform([opacity, progress], ([v = 0, p = 0]: number[]) =>
    (first && p <= a) || (last && p >= b) ? 1 : v
  )
  // A hidden slide must not catch clicks meant for the visible one.
  const events = useTransform(o, (v) => (v > 0.5 ? 'auto' : 'none'))
  return (
    <motion.div
      {...stylex.props(styles.slide, centre && styles.slideCentre)}
      style={{ opacity: o, y, pointerEvents: events }}
    >
      {step.cap && <p {...stylex.props(styles.cap)}>{step.cap}</p>}
      <p {...stylex.props(styles.caption)}>
        {step.text.map((l, i) => (
          <span key={l}>
            {l}
            {i < step.text.length - 1 && <br />}
          </span>
        ))}
      </p>
      <p {...stylex.props(styles.note)}>{step.note}</p>
      {children}
    </motion.div>
  )
}

/** The permission card: what will be asked, where the picture goes, and the button that asks. */
function CameraAsk({ state, onAllow }: { state: Cam; onAllow: () => void }) {
  return (
    <div {...stylex.props(styles.card)}>
      {state === 'ask' ? (
        <>
          <p {...stylex.props(styles.cardText)}>
            Your browser will ask for the camera. The picture goes to the phone on this page and nowhere else. Nothing
            is recorded or uploaded.
          </p>
          <button type="button" onClick={onAllow} {...stylex.props(styles.button)}>
            Allow camera
          </button>
        </>
      ) : (
        <p {...stylex.props(styles.cardText)}>
          {state === 'granted'
            ? 'Point it at the screen and the phone films itself, forever.'
            : 'No camera this time. The app still opens; it just has nothing to show.'}
        </p>
      )}
    </div>
  )
}

function StoreNote() {
  return (
    <p {...stylex.props(styles.annotation)}>
      The store in the frame is the real one. Tap Get on Notes or Weather, then open it. Paste the URL of{' '}
      <Link to="/docs/$" params={{ _splat: 'catalogs' }} {...stylex.props(styles.link)}>
        a catalog you host
      </Link>{' '}
      and yours installs the same way.
    </p>
  )
}

const styles = stylex.create({
  track: { position: 'relative', height: `${N * 90}vh`, marginTop: '56px' },
  sticky: {
    position: 'sticky',
    top: 0,
    height: '100vh',
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr) minmax(0, 1fr)', [MID]: 'minmax(0, 1fr)' },
    gridTemplateRows: { default: 'minmax(0, 1fr)', [MID]: 'auto auto' },
    alignItems: 'center',
    alignContent: { default: null, [MID]: 'center' },
    gap: { default: '48px', [MID]: '24px' }
  },
  stickyFull: {
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    alignItems: 'stretch',
    paddingTop: '112px',
    paddingBottom: '32px',
    boxSizing: 'border-box',
    gap: '24px'
  },
  device: { gridColumn: 1, gridRow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 },
  deviceRight: { gridColumn: 2 },
  deviceFull: { gridColumn: 1, gridRow: 2, minHeight: 0, display: 'block' },
  captions: {
    gridColumn: { default: 2, [MID]: 1 },
    gridRow: { default: 1, [MID]: 2 },
    position: 'relative',
    minHeight: '300px'
  },
  captionsLeft: { gridColumn: 1 },
  captionsTop: { gridColumn: 1, gridRow: 1, minHeight: '220px' },
  slide: { position: 'absolute', insetInlineStart: 0, top: 0, maxWidth: '520px' },
  slideCentre: {
    insetInlineStart: '50%',
    width: '760px',
    maxWidth: '760px',
    marginInlineStart: '-380px',
    textAlign: 'center'
  },
  cap: {
    margin: 0,
    marginBottom: '18px',
    fontFamily: font.mono,
    fontSize: '12px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: color.text3
  },
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
  card: {
    marginTop: '28px',
    padding: '20px',
    borderRadius: '16px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    backgroundColor: color.surface,
    display: 'grid',
    gap: '16px',
    justifyItems: 'start'
  },
  cardText: { margin: 0, fontSize: '15px', lineHeight: 1.5, color: color.text2 },
  button: {
    appearance: 'none',
    borderWidth: 0,
    borderRadius: '999px',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '18px',
    paddingRight: '18px',
    fontFamily: font.sans,
    fontSize: '15px',
    fontWeight: 500,
    color: color.bg,
    backgroundColor: color.text,
    cursor: 'pointer',
    opacity: { default: 1, ':hover': 0.85 }
  },
  annotation: {
    marginTop: '20px',
    marginBottom: 0,
    marginInline: 'auto',
    maxWidth: '60ch',
    fontFamily: font.mono,
    fontSize: '12.5px',
    lineHeight: 1.6,
    color: color.text3
  },
  link: { color: color.text2, textDecorationLine: 'underline', textUnderlineOffset: '3px' },
  stillScene: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr) minmax(0, 1fr)', [MID]: 'minmax(0, 1fr)' },
    alignItems: 'center',
    gap: '48px',
    marginTop: '72px'
  },
  list: { listStyleType: 'none', margin: 0, padding: 0, display: 'grid', gap: '32px' },
  item: { display: 'block' }
})

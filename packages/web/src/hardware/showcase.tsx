// The /sdk page: every `os.device.on` type as a chapter beside one real phone.
// The page hears the shell exactly as a listening app would (packages/shell/
// embed-device.ts), so each readout is the payload itself, not a mock of it.
// The chapter in the middle of the screen poses the phone to show its buttons.
import type { DeviceEvent, DeviceEvents, Switches } from '@doan-labs/duo-sdk'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useReducer, useRef, useState } from 'react'
import { Block, Cap, Headline, Lede, TextLink } from '../home/parts'
import { Field, LiveCode, Readout } from '../live-code'
import { Segmented } from '../segmented'
import { type Cue, type Heard, Simulator } from '../simulator'
import { color, ease, font, radius } from '../tokens.stylex'
import { PoseDial } from './pose-dial'
import { SwitchTiles } from './switch-tiles'
import { Viewfinder } from './viewfinder'
import { Score, VolumeKeys } from './volume-keys'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'
const RAD = Math.PI / 180
const TYPES: DeviceEvent[] = ['volume', 'camera-control', 'side', 'orientation', 'switches']

// What each sample does with what it hears, so the readouts are the code's own state.
const zoomOf = (offset: number) => 1 + offset * 4
/** The switches sample below, run for real: the case it lands on, and what it shows. */
function network(s: Switches): [line: number, shows: string] {
  switch (true) {
    case s.airplane:
      return [2, 'Airplane Mode']
    case !s.wifi && !s.cell:
      return [3, 'Offline']
    case !s.wifi:
      return [4, 'On cellular']
    default:
      return [5, 'On Wi-Fi']
  }
}

type Live = {
  last: { [K in DeviceEvent]?: DeviceEvents[K] }
  log: Record<DeviceEvent, { n: number; text: string }[]>
  /** Events heard so far; also the beat that flashes the running line. */
  n: number
  score: number
  zoom: number
  shots: number
  presses: number
}
const START: Live = {
  last: {},
  log: { volume: [], 'camera-control': [], side: [], orientation: [], switches: [] },
  n: 0,
  score: 0,
  zoom: 1,
  shots: 0,
  presses: 0
}

function hear(s: Live, e: Heard): Live {
  // The frame re-sends the current pose and switches whenever it is asked again; a repeat is not news.
  if (JSON.stringify(s.last[e.type]) === JSON.stringify(e.data)) return s
  const next = { ...s, n: s.n + 1, last: { ...s.last, [e.type]: e.data } }
  let text = literal(e.data)
  if (e.type === 'volume' && e.data.action === 'press') next.score += e.data.button === 'up' ? 1 : -1
  if (e.type === 'camera-control') {
    if (e.data.action === 'press') next.zoom = 1
    if (e.data.action === 'slide') next.zoom = zoomOf(e.data.offset)
    if (e.data.action === 'release') next.shots++
  }
  if (e.type === 'side' && e.data.action === 'press') next.presses++
  if (e.type === 'switches') {
    // Eleven booleans do not fit a line; what flipped does.
    const was = s.last.switches
    const flipped = was && Object.entries(e.data).filter(([k, v]) => was[k as keyof Switches] !== v)
    text = flipped ? flipped.map(([k, v]) => `${k}: ${v}`).join(', ') : 'current state'
  }
  next.log = { ...s.log, [e.type]: [{ n: s.n, text }, ...s.log[e.type]].slice(0, 4) }
  return next
}

type Pose = { deg: number; yaw: number }
type Chapter = {
  type: DeviceEvent
  title: string
  text: ReactNode
  code: string[]
  /** The line of `code` the last event ran. */
  runs: (l: Live) => number | undefined
  pose?: Pose
  how: ReactNode
}

// Open and turned, all four caps face the camera: volume on the top edge, side and Camera Control down the right.
const EDGE: Pose = { deg: 180, yaw: -0.5 }
// Folded, the right edge is tall and near: the two long caps are easy to find.
const SHUT: Pose = { deg: 0, yaw: -0.9 }

const CHAPTERS: Chapter[] = [
  {
    type: 'volume',
    title: 'Volume, as a controller',
    text: 'While you listen, the press is yours: the ringer does not move and no HUD comes down. A score, a page turn, a shutter.',
    code: [
      'let score = 0',
      "os.device.on('volume', (e) => {",
      "  if (e.action !== 'press') return",
      "  score += e.button === 'up' ? 1 : -1",
      '})'
    ],
    runs: (l) => (l.last.volume ? (l.last.volume.action === 'press' ? 3 : 2) : undefined),
    pose: EDGE,
    how: (
      <>
        Click the two small caps on the top edge, near the right corner. With the phone focused, <Kbd>↑</Kbd> and{' '}
        <Kbd>↓</Kbd> press them too.
      </>
    )
  },
  {
    type: 'camera-control',
    title: 'Camera Control: press, slide, release',
    text: 'The press is yours, so Camera neither opens nor shoots. Slide along the cap and you hear how far, in centimetres.',
    code: [
      "os.device.on('camera-control', (e) => {",
      "  if (e.action === 'press') focus()",
      "  if (e.action === 'slide') zoom = 1 + e.offset * 4",
      "  if (e.action === 'release') shoot()",
      '})'
    ],
    runs: (l) => {
      const a = l.last['camera-control']?.action
      return a && { press: 1, slide: 2, release: 3 }[a]
    },
    pose: SHUT,
    how: (
      <>
        Press the lower cap on the right edge and drag along it before you let go. <Kbd>C</Kbd> presses it.
      </>
    )
  },
  {
    type: 'side',
    title: 'The side button, heard',
    text: 'Heard, never taken. The phone still sleeps, wakes, opens Wallet and calls Siri; no app can stop the person locking it.',
    code: [
      "os.device.on('side', (e) => {",
      '  // the phone still sleeps and wakes',
      "  held = e.action === 'press'",
      '})'
    ],
    runs: (l) => (l.last.side ? 2 : undefined),
    pose: SHUT,
    how: (
      <>
        Click the upper cap on the right edge. The screen goes dark, as it should; click again to wake it. <Kbd>L</Kbd>{' '}
        presses it.
      </>
    )
  },
  {
    type: 'orientation',
    title: 'The pose, every frame it changes',
    text: 'How the phone is turned and how far it is open, in degrees. The first event is where it is now, then one per change, at most once a frame.',
    code: [
      "os.device.on('orientation', ({ yaw, hinge }) => {",
      '  compass.rotate = yaw',
      "  layout = hinge < 120 ? 'tent' : 'flat'",
      '})'
    ],
    runs: (l) => (l.last.orientation ? (l.last.orientation.hinge < 120 ? 2 : 1) : undefined),
    how: 'Drag the phone to turn it, or use the controls above. Every step of the ease is an event.'
  },
  {
    type: 'switches',
    title: 'The switches, read-only',
    text: 'Everything in Control Center. You hear the current state first, then every flip. Only the person flips them.',
    code: [
      "os.device.on('switches', (s) => {",
      '  switch (true) {',
      "    case s.airplane: return show('Airplane Mode')",
      "    case !s.wifi && !s.cell: return show('Offline')",
      "    case !s.wifi: return show('On cellular')",
      "    default: return show('On Wi-Fi')",
      '  }',
      '})'
    ],
    runs: (l) => l.last.switches && network(l.last.switches)[0],
    pose: { deg: 180, yaw: 0 },
    how: 'Control Center comes down when you get here. Tap Wi-Fi, Airplane Mode or the torch.'
  }
]

const TURNS = [
  { value: 0, label: 'Facing you' },
  { value: -70, label: 'Right edge' },
  { value: 70, label: 'Left edge' },
  { value: -180, label: 'Back' }
]
const HINGES = [
  { value: 180, label: 'Open' },
  { value: 110, label: 'Tent' },
  { value: 0, label: 'Closed' }
]
export function Showcase() {
  const [live, dispatch] = useReducer(hear, START)
  const [active, setActive] = useState<DeviceEvent>('volume')
  const [turn, setTurn] = useState(-30)
  const [hinge, setHinge] = useState(180)
  const [cue, setCue] = useState<Cue>({})
  const chapters = useRef<(HTMLElement | null)[]>([])

  // The chapter crossing the middle band of the screen is the one the phone is posed for. A band, not a
  // zero-height line: an engine may not report a zero-area intersection at all.
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.type as DeviceEvent)
      },
      { rootMargin: '-45% 0px -45% 0px' }
    )
    for (const el of chapters.current) if (el) io.observe(el)
    return () => io.disconnect()
  }, [])

  // Control Center is where the switches are: it comes down on arrival and on request.
  const pull = () => {
    setCue({})
    requestAnimationFrame(() => setCue({ control: true }))
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: arriving at a chapter is the trigger; `pull` only sets state.
  useEffect(() => {
    if (active === 'switches') pull()
    else setCue({})
  }, [active])

  const chapter = CHAPTERS.find((c) => c.type === active) ?? CHAPTERS[0]!
  const pose = chapter.pose ?? { deg: hinge, yaw: turn * RAD }

  return (
    <Block labelledBy="sdk-title">
      <Cap>SDK · Buttons and sensors</Cap>
      <Headline as="h1" id="sdk-title" lines={['Every button is an event.']} />
      <Lede>
        One call, <code {...stylex.props(styles.inline)}>os.device.on</code>. Press the phone; every number here is
        live.
      </Lede>

      <div {...stylex.props(styles.stage)}>
        <div {...stylex.props(styles.device)}>
          <Simulator deg={pose.deg} yaw={pose.yaw} cue={cue} hear={TYPES} onDevice={dispatch} bare fill />
        </div>
        <div>
          {CHAPTERS.map((c, i) => (
            <section
              key={c.type}
              ref={(el) => {
                chapters.current[i] = el
              }}
              data-type={c.type}
              aria-labelledby={`hw-${c.type}`}
              {...stylex.props(styles.chapter, c.type === active && styles.chapterOn)}
            >
              <p {...stylex.props(styles.type)}>
                {String(i + 1).padStart(2, '0')} · '{c.type}'
              </p>
              <h2 id={`hw-${c.type}`} {...stylex.props(styles.title)}>
                {c.title}
              </h2>
              <p {...stylex.props(styles.text)}>{c.text}</p>
              <LiveCode title="app.ts" lines={c.code} on={c.runs(live)} beat={live.log[c.type][0]?.n} />
              {c.type === 'orientation' && (
                <div {...stylex.props(styles.controls)}>
                  <Segmented id="hw-turn" label="Turn" value={turn} onChange={setTurn} options={TURNS} size="sm" />
                  <Segmented id="hw-hinge" label="Hinge" value={hinge} onChange={setHinge} options={HINGES} size="sm" />
                </div>
              )}
              <Values type={c.type} live={live} onPull={pull} />
              <Log entries={live.log[c.type]} />
              <p {...stylex.props(styles.how)}>{c.how}</p>
            </section>
          ))}
          <p {...stylex.props(styles.end)}>
            No manifest entry, and nothing crosses the bridge until something listens.{' '}
            <TextLink to="/docs/hardware">Read the guide</TextLink> or the{' '}
            <TextLink to="/docs/sdk">SDK reference</TextLink>.
          </p>
        </div>
      </div>
    </Block>
  )
}

/** The sample's own variables, as the last event left them. */
function Values({ type, live, onPull }: { type: DeviceEvent; live: Live; onPull: () => void }) {
  const { last } = live
  if (type === 'volume') {
    return (
      <Readout>
        <Field k="e.button" v={<VolumeKeys e={last.volume} />} />
        <Field k="e.action" v={q(last.volume?.action)} />
        <Field k="score" v={<Score score={live.score} up={last.volume && last.volume.button === 'up'} />} wide />
      </Readout>
    )
  }
  if (type === 'camera-control') {
    const e = last['camera-control']
    return (
      <Readout>
        <Field k="e.action" v={q(e?.action)} />
        <Field k="e.offset" v={e?.action === 'slide' ? `${e.offset.toFixed(2)} cm` : '-'} />
        <Field
          k="zoom"
          v={<Viewfinder zoom={live.zoom} focusing={!!e && e.action !== 'release'} shots={live.shots} />}
          wide
        />
        <Field k="shots" v={String(live.shots)} wide />
      </Readout>
    )
  }
  if (type === 'side') {
    return (
      <Readout>
        <Field k="e.action" v={q(last.side?.action)} />
        <Field k="held" v={String(last.side?.action === 'press')} />
        <Field k="presses" v={String(live.presses)} wide />
      </Readout>
    )
  }
  if (type === 'orientation') {
    const o = last.orientation
    return (
      <Readout>
        <Field k="yaw" v={o ? `${o.yaw.toFixed(1)}°` : '-'} />
        <Field k="hinge" v={o ? `${o.hinge.toFixed(1)}°` : '-'} />
        <Field k="from above" v={o ? <PoseDial yaw={o.yaw} hinge={o.hinge} /> : '-'} wide />
      </Readout>
    )
  }
  const s = last.switches
  return (
    <Readout>
      <Field v={<SwitchTiles s={s} />} wide />
      <Field
        k="show"
        wide
        v={
          <span {...stylex.props(styles.split)}>
            {s ? q(network(s)[1]) : '-'}
            <button type="button" onClick={onPull} {...stylex.props(styles.button)}>
              Open Control Center
            </button>
          </span>
        }
      />
    </Readout>
  )
}

/** The last few payloads, newest first, as `os.device.on` handed them over. */
function Log({ entries }: { entries: { n: number; text: string }[] }) {
  return (
    <ol {...stylex.props(styles.log)} aria-label="Events heard">
      {entries.length === 0 ? (
        <li {...stylex.props(styles.entry, styles.waiting)}>waiting for the first event…</li>
      ) : (
        entries.map((e, i) => (
          <li key={e.n} {...stylex.props(styles.entry, i === 0 && styles.entryNew)}>
            {e.text}
          </li>
        ))
      )}
    </ol>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd {...stylex.props(styles.kbd)}>{children}</kbd>
}

/** A payload as it would be written in the app: `{ action: 'press', button: 'up' }`. */
const literal = (d: object) =>
  `{ ${Object.entries(d)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : typeof v === 'number' ? +v.toFixed(3) : v}`)
    .join(', ')} }`
const q = (v: string | undefined) => (v ? `'${v}'` : '-')

const arrive = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(-6px)' },
  to: { opacity: 1, transform: 'none' }
})

const styles = stylex.create({
  inline: { fontFamily: font.mono, fontSize: '0.9em', color: color.text },
  stage: {
    marginTop: { default: '72px', [SMALL]: '48px' },
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 5fr) minmax(0, 7fr)', [MID]: 'minmax(0, 1fr)' },
    gap: { default: '80px', [MID]: '24px' },
    alignItems: 'start'
  },
  // The phone stays put while the chapters pass it; stacked, it rides along the top instead.
  device: {
    gridColumnStart: { default: 2, [MID]: 1 },
    gridRowStart: 1,
    position: 'sticky',
    top: { default: '96px', [MID]: '56px' },
    zIndex: 1,
    height: { default: 'calc(100vh - 140px)', [MID]: '40vh' },
    backgroundColor: color.bg
  },
  chapter: {
    gridColumnStart: 1,
    minHeight: { default: '92vh', [MID]: 'auto' },
    paddingTop: '40px',
    paddingBottom: { default: '40px', [MID]: '56px' },
    opacity: { default: 0.45, [MID]: 1 },
    transitionProperty: 'opacity',
    transitionDuration: '0.4s',
    transitionTimingFunction: ease.out
  },
  chapterOn: { opacity: 1 },
  type: {
    margin: 0,
    fontFamily: font.mono,
    fontSize: '12px',
    letterSpacing: '0.08em',
    color: color.accent
  },
  title: {
    marginTop: '12px',
    marginBottom: 0,
    fontFamily: font.display,
    fontSize: { default: '32px', [SMALL]: '26px' },
    lineHeight: 1.1,
    fontWeight: 600,
    letterSpacing: '-0.025em',
    color: color.text
  },
  text: { marginTop: '14px', marginBottom: 0, fontSize: '16px', lineHeight: 1.55, color: color.text2 },
  controls: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' },
  log: {
    listStyleType: 'none',
    margin: 0,
    marginTop: '12px',
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '18px',
    paddingRight: '18px',
    minHeight: '104px',
    borderRadius: '14px',
    backgroundColor: color.well,
    fontFamily: font.mono,
    fontSize: '12.5px',
    lineHeight: 1.6
  },
  entry: {
    color: color.text3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  entryNew: {
    color: color.text,
    animationName: arrive,
    animationDuration: '0.3s',
    animationTimingFunction: ease.out
  },
  waiting: { fontStyle: 'italic' },
  how: { marginTop: '14px', marginBottom: 0, fontSize: '14px', lineHeight: 1.55, color: color.text3 },
  kbd: {
    fontFamily: font.mono,
    fontSize: '12px',
    paddingTop: '1px',
    paddingBottom: '1px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.borderStrong,
    borderRadius: radius.sm,
    color: color.text2
  },
  split: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' },
  button: {
    fontFamily: font.sans,
    fontSize: '12.5px',
    paddingTop: '5px',
    paddingBottom: '5px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.borderStrong, ':hover': color.accent },
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: { default: color.text2, ':hover': color.accent },
    cursor: 'pointer',
    transitionProperty: 'border-color, color',
    transitionDuration: '0.18s',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  end: { marginTop: '24px', marginBottom: 0, fontSize: '16px', lineHeight: 1.55, color: color.text2 }
})

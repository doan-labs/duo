import * as stylex from '@stylexjs/stylex'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Fold } from '../fold'
import { appForName } from '../home/apps'
import { SHEET, SLIDE } from '../motion'
import { Pre } from '../page-parts'
import { color, ease, font, radius } from '../tokens.stylex'

const APPS = ['Pomo Timer', 'Messages', 'Calendar', 'Reminders', 'Clock', 'Fitness', 'Mail', 'Weather']
/** How long the shell holds a banner before filing it (packages/shell/springboard/notifications.tsx). */
const BANNER_MS = 4400

type Fields = { title: string; body: string; arg: string }
type Note = Fields & { app: string; id: number }
type RunState = 'idle' | 'busy' | 'done'
/** How many the lock screen keeps: the one on top and two edges under it. */
const STACK = 3

const quote = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const code = (f: Fields) => `import { os } from '@doan-labs/duo-sdk'

await os.notify.post({
  title: ${quote(f.title)},
  body: ${quote(f.body)},
  arg: ${quote(f.arg)}
})`

/**
 * `os.notify.post` played out on the Duo itself: a still of the real shell's
 * lock screen (public/blog/duo-lock.webp, captured flat and facing), with the
 * shell's banner drawn on its glass at the shell's sizes. Run drops a banner,
 * which files under the clock after the shell's 4.4 seconds, or at once when
 * the next one arrives; filed ones stack, newest on top. A tap opens the app
 * with `arg`. Banner and card share a layout id, so the filing is one move.
 */
export function NotifyRun() {
  const [app, setApp] = useState(APPS[0]!)
  const [fields, setFields] = useState<Fields>({
    title: 'Focus done',
    body: 'Twenty-five minutes, well spent. Take five.',
    arg: 'break'
  })
  const [notes, setNotes] = useState<Note[]>([])
  const [banner, setBanner] = useState<number | null>(null)
  const [opened, setOpened] = useState<Note | null>(null)
  const [state, setState] = useState<RunState>('idle')
  const [log, setLog] = useState<string[]>([])
  const timers = useRef<number[]>([])
  const filing = useRef(0)
  const n = useRef(0)
  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t)
      clearTimeout(filing.current)
    },
    []
  )
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms))

  const say = (line: string) => setLog((l) => [...l, line].slice(-4))
  const run = () => {
    if (state === 'busy') return
    const note = { ...fields, app, id: ++n.current }
    setState('busy')
    // The post's round trip to the shell, slowed enough to see.
    later(() => {
      setOpened(null)
      setNotes((all) => [...all, note].slice(-STACK))
      setBanner(note.id)
      setState('done')
      say(`${app}: os.notify.post() resolved`)
      clearTimeout(filing.current)
      filing.current = window.setTimeout(() => {
        setBanner(null)
        say('filed on the lock screen')
      }, BANNER_MS)
      later(() => setState('idle'), 1400)
    }, 520)
  }
  const open = (note: Note) => {
    if (note.id === banner) clearTimeout(filing.current)
    setBanner((b) => (b === note.id ? null : b))
    setNotes((all) => all.filter((x) => x.id !== note.id))
    setOpened(note)
    say(`opened ${note.app}, os.arg = ${quote(note.arg)}`)
  }
  const edit = (k: keyof Fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [k]: e.target.value }))

  const shown = notes.find((x) => x.id === banner)
  const filed = notes.filter((x) => x.id !== banner).reverse()
  const [top, ...under] = filed

  return (
    <figure {...stylex.props(styles.figure)}>
      <div {...stylex.props(styles.side)}>
        <fieldset {...stylex.props(styles.apps)}>
          <legend {...stylex.props(styles.label)}>Posted by</legend>
          {APPS.map((a) => (
            <button
              key={a}
              type="button"
              aria-label={a}
              aria-pressed={a === app}
              title={a}
              onClick={() => setApp(a)}
              {...stylex.props(styles.pick, a === app && styles.picked)}
            >
              {a === app && <motion.span layoutId="notify-pick" transition={SLIDE} {...stylex.props(styles.ring)} />}
              <img src={appForName(a)?.icon} alt="" width={1024} height={1024} {...stylex.props(styles.pickIcon)} />
            </button>
          ))}
        </fieldset>
        <Fold head={<span {...stylex.props(styles.foldHead)}>Edit the notification</span>}>
          <div {...stylex.props(styles.fields)}>
            {(['title', 'body', 'arg'] as const).map((k) => (
              <label key={k} {...stylex.props(styles.field, k === 'body' && styles.fieldWide)}>
                <span {...stylex.props(styles.label)}>{k}</span>
                <input value={fields[k]} onChange={edit(k)} spellCheck={false} {...stylex.props(styles.input)} />
              </label>
            ))}
          </div>
          <Pre title="notify.ts">{code(fields)}</Pre>
        </Fold>
        <Run state={state} onClick={run} />
        <ol {...stylex.props(styles.log)} aria-live="polite">
          {log.map((l) => (
            <li key={l} {...stylex.props(styles.line)}>
              <span {...stylex.props(styles.tick)}>✓</span> {l}
            </li>
          ))}
        </ol>
      </div>
      <div {...stylex.props(styles.device)}>
        <img
          src="/blog/duo-lock.webp"
          alt="iPhone Duo, open, on its lock screen"
          width={1190}
          height={851}
          {...stylex.props(styles.shot)}
        />
        {/* The glass, in the still's own proportions; 1cqw is a hundredth of the still's width. */}
        <div {...stylex.props(styles.screen)}>
          {shown && (
            <motion.div
              key={shown.id}
              initial={{ y: '-130%' }}
              animate={{ y: 0 }}
              transition={SHEET}
              {...stylex.props(styles.banner)}
            >
              <Notice note={shown} onOpen={open} />
            </motion.div>
          )}
          <div {...stylex.props(styles.list)}>
            {top && (
              <>
                <span {...stylex.props(styles.listTitle)}>Notification Center</span>
                <div {...stylex.props(styles.stack)}>
                  {/* The ones underneath show only as edges, the way iOS stacks an app's notifications. */}
                  <AnimatePresence>
                    {under.slice(0, 2).map((x, i) => (
                      <motion.span
                        key={x.id}
                        aria-hidden="true"
                        initial={{ opacity: 0, y: 0, scale: 1 }}
                        animate={{ opacity: 1, y: `${(i + 1) * 1.1}cqw`, scale: 1 - (i + 1) * 0.05 }}
                        exit={{ opacity: 0, y: 0 }}
                        transition={SHEET}
                        {...stylex.props(styles.peek, styles.depth(-(i + 1)))}
                      />
                    ))}
                  </AnimatePresence>
                  <Notice note={top} onOpen={open} />
                </div>
              </>
            )}
          </div>
          <AnimatePresence>
            {opened && (
              <motion.button
                key="app"
                type="button"
                onClick={() => setOpened(null)}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={SHEET}
                aria-label="Back to the lock screen"
                {...stylex.props(styles.opened)}
              >
                <img
                  src={appForName(opened.app)?.icon}
                  alt=""
                  width={1024}
                  height={1024}
                  {...stylex.props(styles.bigIcon)}
                />
                <span {...stylex.props(styles.openedName)}>{opened.app}</span>
                <code {...stylex.props(styles.arg)}>os.arg === {quote(opened.arg)}</code>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </figure>
  )
}

function Notice({ note, onOpen }: { note: Note; onOpen: (n: Note) => void }) {
  return (
    <motion.button
      type="button"
      layoutId={`notice-${note.id}`}
      onClick={() => onOpen(note)}
      transition={SHEET}
      {...stylex.props(styles.notice)}
    >
      <span {...stylex.props(styles.head)}>
        <img src={appForName(note.app)?.icon} alt="" width={1024} height={1024} {...stylex.props(styles.icon)} />
        <span {...stylex.props(styles.name)}>{note.app}</span>
        <span {...stylex.props(styles.time)}>now</span>
      </span>
      <span {...stylex.props(styles.title)}>{note.title}</span>
      {note.body && <span {...stylex.props(styles.body)}>{note.body}</span>}
    </motion.button>
  )
}

/** Run, then the post in flight, then its answer: one pill that changes its words and its width. */
function Run({ state, onClick }: { state: RunState; onClick: () => void }) {
  const still = useReducedMotion()
  const words = { idle: 'Run', busy: 'Posting', done: 'Posted' }[state]
  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      aria-busy={state === 'busy'}
      transition={still ? { duration: 0 } : SLIDE}
      {...stylex.props(styles.run, state === 'done' && styles.runDone)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
          transition={still ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          {...stylex.props(styles.runFace)}
        >
          {state === 'idle' && (
            <svg viewBox="0 0 10 10" aria-hidden="true" {...stylex.props(styles.play)}>
              <path d="M2 1.2v7.6L8.6 5z" fill="currentColor" />
            </svg>
          )}
          {state === 'busy' && (
            <svg viewBox="0 0 16 16" aria-hidden="true" {...stylex.props(styles.spin)}>
              <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
              <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          {state === 'done' && (
            <svg viewBox="0 0 16 16" aria-hidden="true" {...stylex.props(styles.check)}>
              <motion.path
                d="M3.5 8.5l3 3 6-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: still ? 0 : 0.35, delay: still ? 0 : 0.08 }}
              />
            </svg>
          )}
          {words}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const WIDE = '@media (min-width: 900px)'
const GLASS = 'blur(24px) saturate(1.8)'

const styles = stylex.create({
  figure: {
    display: 'grid',
    gridTemplateColumns: { default: '1fr', [WIDE]: 'minmax(0, 1fr) minmax(0, 1.25fr)' },
    alignItems: 'start',
    gap: '32px',
    marginTop: '12px',
    marginBottom: '40px',
    marginLeft: { default: 0, [WIDE]: 'calc(50% - min(540px, 50vw - 24px))' },
    marginRight: 0,
    width: { default: 'auto', [WIDE]: 'min(1080px, 100vw - 48px)' }
  },
  side: { minWidth: 0 },
  label: {
    display: 'block',
    marginBottom: '6px',
    padding: 0,
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: color.text3
  },
  // Two rows of four on a phone; one row where there is room.
  apps: {
    display: { default: 'grid', [WIDE]: 'flex' },
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: 0,
    marginBottom: '14px',
    marginLeft: 0,
    marginRight: 0,
    padding: 0,
    borderWidth: 0
  },
  pick: {
    position: 'relative',
    justifySelf: 'center',
    padding: '5px',
    borderWidth: 0,
    borderRadius: '12px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    opacity: { default: 0.55, ':hover': 1 },
    transitionProperty: 'opacity',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px'
  },
  picked: { opacity: 1 },
  // One ring for the whole row: it slides from the old pick to the new one.
  ring: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: color.accent,
    borderRadius: '12px',
    pointerEvents: 'none'
  },
  pickIcon: { position: 'relative', display: 'block', width: '34px', height: '34px', borderRadius: '8px' },
  foldHead: {
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: color.text3
  },
  fields: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' },
  field: { display: 'block', minWidth: 0 },
  fieldWide: { gridColumnStart: 1, gridColumnEnd: 3, gridRowStart: 2 },
  input: {
    boxSizing: 'border-box',
    width: '100%',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':focus': color.accent },
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    fontFamily: font.sans,
    fontSize: '14px',
    color: color.text,
    outlineStyle: 'none'
  },
  run: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: { default: '100%', [WIDE]: 'auto' },
    minWidth: { default: 0, [WIDE]: '112px' },
    marginTop: '16px',
    paddingTop: '11px',
    paddingBottom: '11px',
    paddingLeft: '20px',
    paddingRight: '22px',
    overflow: 'hidden',
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: { default: color.green, ':hover': color.text },
    color: color.surface,
    fontFamily: font.sans,
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  runDone: { backgroundColor: { default: color.text, ':hover': color.text } },
  runFace: { display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' },
  spin: {
    width: '15px',
    height: '15px',
    animationName: spin,
    animationDuration: '0.7s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite'
  },
  check: { width: '15px', height: '15px' },
  play: { width: '11px', height: '11px' },
  log: {
    display: { default: 'none', [WIDE]: 'block' },
    listStyleType: 'none',
    minHeight: '96px',
    marginTop: '14px',
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: '18px',
    paddingRight: 0,
    fontFamily: font.mono,
    fontSize: '13px',
    lineHeight: 1.8,
    color: color.text2
  },
  line: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tick: { color: color.green },
  device: { position: 'relative', minWidth: 0, containerType: 'inline-size' },
  shot: { display: 'block', width: '100%', height: 'auto' },
  // Where the glass sits in the still: measured off duo-lock.webp.
  screen: {
    position: 'absolute',
    left: '2.7%',
    right: '2.7%',
    top: '4%',
    bottom: '3.6%',
    overflow: 'hidden',
    borderRadius: '3cqw'
  },
  // The shell's sizes in its own px, over a display about 1000 px wide.
  banner: {
    position: 'absolute',
    top: '1.56cqw',
    left: 0,
    right: 0,
    zIndex: 2,
    display: 'flex',
    justifyContent: 'center'
  },
  list: {
    position: 'absolute',
    top: '20.5cqw',
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.04cqw'
  },
  stack: { position: 'relative', isolation: 'isolate', display: 'flex' },
  peek: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: '3.12cqw',
    backgroundColor: 'rgba(255,255,255,0.14)',
    backdropFilter: GLASS,
    WebkitBackdropFilter: GLASS,
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
    transformOrigin: 'center bottom'
  },
  depth: (z: number) => ({ zIndex: z }),
  listTitle: {
    width: '49.92cqw',
    fontFamily: font.sans,
    fontSize: '1.56cqw',
    fontWeight: 600,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)'
  },
  notice: {
    display: 'flex',
    flexDirection: 'column',
    width: '49.92cqw',
    paddingTop: '1.56cqw',
    paddingBottom: '1.56cqw',
    paddingLeft: '2.08cqw',
    paddingRight: '2.08cqw',
    borderWidth: 0,
    borderRadius: '3.12cqw',
    backgroundColor: 'rgba(255,255,255,0.18)',
    backdropFilter: GLASS,
    WebkitBackdropFilter: GLASS,
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25), 0 8px 30px rgba(0,0,0,0.18)',
    textAlign: 'left',
    color: '#fff',
    cursor: 'pointer',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px'
  },
  head: { display: 'flex', alignItems: 'center', gap: '1.04cqw', marginBottom: '0.52cqw' },
  icon: { width: '2.6cqw', height: '2.6cqw', borderRadius: '0.65cqw' },
  name: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: font.sans,
    fontSize: '1.43cqw',
    fontWeight: 500,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)'
  },
  time: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontFamily: font.sans,
    fontSize: '1.43cqw',
    color: 'rgba(255,255,255,0.75)'
  },
  title: { fontFamily: font.sans, fontSize: '1.95cqw', lineHeight: 1.3, fontWeight: 600 },
  body: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
    fontFamily: font.sans,
    fontSize: '1.95cqw',
    lineHeight: 1.3
  },
  opened: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.6cqw',
    borderWidth: 0,
    backgroundColor: '#f2f2f7',
    cursor: 'pointer'
  },
  bigIcon: { width: '9cqw', height: '9cqw', borderRadius: '2cqw' },
  openedName: { fontFamily: font.sans, fontSize: '2.2cqw', fontWeight: 600, color: '#1c1c1e' },
  arg: {
    paddingTop: '0.5cqw',
    paddingBottom: '0.5cqw',
    paddingLeft: '1cqw',
    paddingRight: '1cqw',
    borderRadius: '0.8cqw',
    backgroundColor: 'rgba(0,122,255,0.12)',
    fontFamily: font.mono,
    fontSize: '1.6cqw',
    color: '#007aff'
  }
})

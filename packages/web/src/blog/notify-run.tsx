import * as stylex from '@stylexjs/stylex'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { appForName } from '../home/apps'
import { SHEET } from '../motion'
import { Pre } from '../page-parts'
import { color, ease, font, radius } from '../tokens.stylex'

const APPS = ['Pomo Timer', 'Messages', 'Calendar', 'Reminders', 'Clock', 'Fitness', 'Mail', 'Weather']
/** How long the shell holds a banner before filing it (packages/shell/springboard/notifications.tsx). */
const BANNER_MS = 4400

type Phase = 'idle' | 'banner' | 'filed' | 'open'
type Fields = { title: string; body: string; arg: string }

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
 * shell's banner drawn on its glass at the shell's sizes. Run drops the banner,
 * which files under the clock after the shell's 4.4 seconds; a tap on either
 * opens the app with `arg`. Banner and card share a layout id, so the filing is
 * one move. The fields and the app picker rewrite the code as you type.
 */
export function NotifyRun() {
  const [app, setApp] = useState(APPS[0]!)
  const [fields, setFields] = useState<Fields>({
    title: 'Focus done',
    body: 'Twenty-five minutes, well spent. Take five.',
    arg: 'break'
  })
  const [posted, setPosted] = useState<Fields & { app: string }>({ ...fields, app })
  const [phase, setPhase] = useState<Phase>('idle')
  const [log, setLog] = useState<string[]>([])
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  const say = (line: string) => setLog((l) => [...l, line].slice(-4))
  const run = () => {
    clearTimeout(timer.current)
    setPosted({ ...fields, app })
    setPhase('banner')
    setLog([`${app}: os.notify.post() resolved`, 'banner on screen'])
    timer.current = window.setTimeout(() => {
      setPhase('filed')
      say('filed on the lock screen')
    }, BANNER_MS)
  }
  const open = () => {
    clearTimeout(timer.current)
    setPhase('open')
    say(`opened ${posted.app}, os.arg = ${quote(posted.arg)}`)
  }
  const edit = (k: keyof Fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [k]: e.target.value }))

  const icon = appForName(posted.app)?.icon
  const notice = (
    <motion.button type="button" layoutId="notice" onClick={open} transition={SHEET} {...stylex.props(styles.notice)}>
      <span {...stylex.props(styles.head)}>
        <img src={icon} alt="" width={1024} height={1024} {...stylex.props(styles.icon)} />
        <span {...stylex.props(styles.name)}>{posted.app}</span>
        <span {...stylex.props(styles.time)}>now</span>
      </span>
      <span {...stylex.props(styles.title)}>{posted.title}</span>
      {posted.body && <span {...stylex.props(styles.body)}>{posted.body}</span>}
    </motion.button>
  )

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
              <img src={appForName(a)?.icon} alt="" width={1024} height={1024} {...stylex.props(styles.pickIcon)} />
            </button>
          ))}
        </fieldset>
        <div {...stylex.props(styles.fields)}>
          {(['title', 'body', 'arg'] as const).map((k) => (
            <label key={k} {...stylex.props(styles.field, k === 'body' && styles.fieldWide)}>
              <span {...stylex.props(styles.label)}>{k}</span>
              <input value={fields[k]} onChange={edit(k)} spellCheck={false} {...stylex.props(styles.input)} />
            </label>
          ))}
        </div>
        <Pre
          title="notify.ts"
          action={
            <button type="button" onClick={run} {...stylex.props(styles.run)}>
              <svg viewBox="0 0 10 10" aria-hidden="true" {...stylex.props(styles.play)}>
                <path d="M2 1.2v7.6L8.6 5z" fill="currentColor" />
              </svg>
              Run
            </button>
          }
        >
          {code(fields)}
        </Pre>
        <ol {...stylex.props(styles.log)} aria-live="polite">
          {log.length === 0 ? (
            <li {...stylex.props(styles.hint)}>Edit anything, then press Run.</li>
          ) : (
            log.map((l) => (
              <li key={l} {...stylex.props(styles.line)}>
                <span {...stylex.props(styles.tick)}>✓</span> {l}
              </li>
            ))
          )}
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
          {phase === 'banner' && (
            <motion.div initial={{ y: '-130%' }} animate={{ y: 0 }} transition={SHEET} {...stylex.props(styles.banner)}>
              {notice}
            </motion.div>
          )}
          <div {...stylex.props(styles.list)}>
            {phase === 'filed' && (
              <>
                <span {...stylex.props(styles.listTitle)}>Notification Center</span>
                {notice}
              </>
            )}
          </div>
          <AnimatePresence>
            {phase === 'open' && (
              <motion.button
                key="app"
                type="button"
                onClick={() => setPhase('idle')}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={SHEET}
                aria-label="Back to the lock screen"
                {...stylex.props(styles.opened)}
              >
                <img src={icon} alt="" width={1024} height={1024} {...stylex.props(styles.bigIcon)} />
                <span {...stylex.props(styles.openedName)}>{posted.app}</span>
                <code {...stylex.props(styles.arg)}>os.arg === {quote(posted.arg)}</code>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </figure>
  )
}

const WIDE = '@media (min-width: 900px)'
const GLASS = 'blur(24px) saturate(1.8)'

const styles = stylex.create({
  figure: {
    display: 'grid',
    gridTemplateColumns: { default: '1fr', [WIDE]: 'minmax(0, 1fr) minmax(0, 1.25fr)' },
    alignItems: 'center',
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
  apps: {
    display: 'flex',
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
    padding: '3px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderRadius: '12px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    opacity: { default: 0.55, ':hover': 1 },
    transitionProperty: 'opacity, border-color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px'
  },
  picked: { borderColor: color.accent, opacity: 1 },
  pickIcon: { display: 'block', width: '34px', height: '34px', borderRadius: '8px' },
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '5px',
    paddingBottom: '5px',
    paddingLeft: '12px',
    paddingRight: '14px',
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: { default: color.green, ':hover': color.text },
    color: color.surface,
    fontFamily: font.sans,
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  play: { width: '10px', height: '10px' },
  log: {
    listStyleType: 'none',
    minHeight: '70px',
    marginTop: '-12px',
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
  hint: { color: color.text3 },
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

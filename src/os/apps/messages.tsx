// Messages: a chat list, and threads that answer back. The reply is what sells
// it: a pause, three bouncing dots, then a bubble.
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import type { Os } from '../uikit/app.ts'
import { Nav, Page, useNav } from '../uikit/nav.tsx'
import { delay, shared } from '../uikit/styles.ts'
import { Sym } from '../uikit/sym.tsx'
import { colors, easing } from '../uikit/tokens.stylex.ts'
import { art, beep } from './shared.ts'

const CHATS: [string, string[]][] = [
  ['Jony', ['The chamfer catches the strip light beautifully.', 'Did you ship the titanium yet?']],
  ['Mum', ['Call me when you land ❤️']],
  ['Ada Lovelace', ['The Analytical Engine weaves algebraic patterns.', 'Send me the render when it finishes?']],
  ['Kim Minh', ['quán cà phê 8h nhé', 'mang laptop đi']],
  ['Blender Foundation', ['Cycles 5.2 is out. AgX by default.']]
]
const WHEN = ['9:41', 'Yesterday', 'Mon', 'Sun', '12/03']
const REPLIES = [
  'Haha, fair.',
  'On it 👍',
  'Sending it over now.',
  'Let me check and get back to you.',
  'Nice — that actually looks great.',
  'Can we talk later? In a meeting.',
  '😂',
  'Agreed.'
]

export const Messages = ({ os }: { os: Os }) => (
  <Nav>
    <Chats os={os} />
  </Nav>
)

function Chats({ os }: { os: Os }) {
  const { push } = useNav()
  return (
    <Page title="Messages">
      <div>
        {CHATS.map(([who, msgs], i) => (
          <div
            key={who}
            {...stylex.props(styles.li)}
            onClick={() => push((back) => <Thread os={os} who={who} seed={msgs} back={back} />)}
          >
            <div {...stylex.props(styles.avatar, styles.bg(art(who)))}>{who[0]}</div>
            <div {...stylex.props(styles.tx)}>
              <b {...stylex.props(styles.txB)}>{who}</b>
              <p {...stylex.props(styles.txP)}>{msgs[msgs.length - 1]}</p>
            </div>
            <span {...stylex.props(shared.sub)}>{WHEN[i]}</span>
          </div>
        ))}
      </div>
    </Page>
  )
}

type Bubble = { id: number; me: boolean; text: string }
let seq = 0

function Thread({ os, who, seed, back }: { os: Os; who: string; seed: string[]; back: () => void }) {
  const [log, setLog] = useState<Bubble[]>(() => seed.map((text) => ({ id: seq++, me: false, text })))
  // How many replies are being "typed"; one dots bubble per pending reply.
  const [typing, setTyping] = useState(0)
  const [draft, setDraft] = useState('')
  const body = useRef<HTMLDivElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Pinned to the newest bubble: every append or dots change scrolls the log down.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the deps are the trigger, not inputs
  useEffect(() => {
    const el = body.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log, typing])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const send = () => {
    const txt = draft.trim()
    if (!txt) return
    setDraft('')
    setLog((l) => [...l, { id: seq++, me: true, text: txt }])
    beep([1100, 1650], 0.05, 0.05)
    timers.current.push(
      setTimeout(() => setTyping((n) => n + 1), 600),
      setTimeout(
        () => {
          setTyping((n) => n - 1)
          setLog((l) => [...l, { id: seq++, me: false, text: REPLIES[(txt.length + who.length) % REPLIES.length]! }])
          beep([880, 1320], 0.06, 0.05)
        },
        600 + 900 + txt.length * 22
      )
    )
  }

  return (
    <>
      <div {...stylex.props(shared.hdr, styles.hdr)}>
        <button type="button" {...stylex.props(shared.bk, styles.bkAbs)} onClick={back}>
          <Sym name="back" size={20} />
        </button>
        {who}
        <button type="button" {...stylex.props(styles.ft)} onClick={() => os.open('FaceTime', who)}>
          <Sym name="person" size={22} />
        </button>
      </div>
      <div ref={body} {...stylex.props(shared.body, styles.flush)}>
        <div {...stylex.props(styles.thread)}>
          {log.map((b, i) => (
            <div
              key={b.id}
              {...stylex.props(styles.bub, b.me && styles.me, i > 0 && log[i - 1]!.me !== b.me && styles.turn)}
            >
              {b.text}
            </div>
          ))}
          {Array.from({ length: typing }, (_, i) => i).map((n) => (
            <div key={n} {...stylex.props(styles.typing)}>
              {DOTS.map((d) => (
                <i key={d} {...stylex.props(styles.dot, delay.ms(d * 150))} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div {...stylex.props(styles.compose)}>
        <input
          {...stylex.props(styles.input)}
          placeholder="iMessage"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button type="button" {...stylex.props(styles.send)} disabled={!draft.trim()} onClick={send}>
          ↑
        </button>
      </div>
    </>
  )
}

const DOTS = [0, 1, 2]

// Local copies of the shared keyframes: StyleX only resolves imports from
// `.stylex.ts` files inside `stylex.create`, so a keyframe from shared.ts
// cannot be referenced here.
const pop = stylex.keyframes({ from: { transform: 'scale(.55) translateY(12px)', opacity: 0 } })
const bob = stylex.keyframes({
  '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
  '30%': { transform: 'translateY(-5px)', opacity: 1 }
})

const styles = stylex.create({
  li: {
    display: 'flex',
    gap: 10,
    paddingTop: 11,
    paddingRight: 16,
    paddingBottom: 11,
    paddingLeft: 16,
    backgroundColor: { default: colors.white, ':active': colors.fillThin },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.14)',
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  txB: { display: 'block', fontSize: 15, fontWeight: 600 },
  txP: { fontSize: 13, color: colors.grey, lineHeight: 1.35, maxHeight: '2.7em', overflow: 'hidden' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    color: colors.white,
    fontSize: 18,
    fontWeight: 500
  },
  bg: (image: string) => ({ backgroundImage: image }),
  hdr: { fontSize: 17, justifyContent: 'center', position: 'relative' },
  bkAbs: { position: 'absolute', left: 16 },
  ft: { position: 'absolute', right: 16, color: colors.blueBright },
  flush: { paddingBottom: 0 },
  thread: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 4,
    paddingLeft: 12
  },
  bub: {
    maxWidth: '74%',
    paddingTop: 8,
    paddingRight: 13,
    paddingBottom: 8,
    paddingLeft: 13,
    borderRadius: 19,
    fontSize: 15,
    lineHeight: 1.34,
    alignSelf: 'flex-start',
    backgroundColor: colors.trackLight,
    color: colors.black,
    animationName: pop,
    animationDuration: '.32s',
    animationTimingFunction: easing.spring
  },
  me: {
    alignSelf: 'flex-end',
    backgroundColor: colors.blueBright,
    backgroundImage: 'linear-gradient(#2ca5ff,#0a7cff)',
    color: colors.white
  },
  /** A bubble that changes sender gets a little air before it. */
  turn: { marginTop: 8 },
  typing: {
    display: 'flex',
    gap: 5,
    alignSelf: 'flex-start',
    paddingTop: 13,
    paddingRight: 15,
    paddingBottom: 13,
    paddingLeft: 15,
    borderRadius: 19,
    backgroundColor: colors.trackLight
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#8a8a8e',
    animationName: bob,
    animationDuration: '.95s',
    animationIterationCount: 'infinite'
  },
  compose: {
    flexShrink: 0,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 8,
    paddingLeft: 12,
    backgroundColor: 'rgba(249,249,249,.94)',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#d7d7dc'
  },
  input: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#d7d7dc',
    borderRadius: 17,
    paddingTop: 8,
    paddingRight: 14,
    paddingBottom: 8,
    paddingLeft: 14,
    backgroundColor: colors.white,
    outline: 0,
    fontSize: 15
  },
  send: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: colors.blueBright,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    transitionProperty: 'transform, opacity',
    transitionDuration: '.15s, .2s',
    opacity: { default: null, ':disabled': 0.3 },
    transform: { default: null, ':active': 'scale(.85)' }
  }
})

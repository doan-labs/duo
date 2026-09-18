import { Screen, Text, Title } from '@doan-labs/ipduo-uikit'
// Messages: a chat list, and threads that answer back. The reply is what sells
// it: a pause, three bouncing dots, then a bubble.

import type { Os } from '@doan-labs/ipduo-sdk'
import { Nav, Page, useNav } from '@doan-labs/ipduo-uikit/nav.tsx'
import { art, beep } from '@doan-labs/ipduo-uikit/shared.ts'
import { delay, shared } from '@doan-labs/ipduo-uikit/styles.ts'
import { Sym } from '@doan-labs/ipduo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { styles } from './styles.ts'

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
            <Text size="caption">{WHEN[i]}</Text>
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
      <Title xstyle={[styles.hdr]}>
        <button type="button" {...stylex.props(shared.bk, styles.bkAbs)} onClick={back}>
          <Sym name="back" size={20} />
        </button>
        {who}
        <button type="button" {...stylex.props(styles.ft)} onClick={() => os.open('FaceTime', who)}>
          <Sym name="person" size={22} />
        </button>
      </Title>
      <Screen ref={body} xstyle={[styles.flush]}>
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
      </Screen>
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

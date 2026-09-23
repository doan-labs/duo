import { beep, mmss } from '@doan-labs/duo-fixtures'
import { Row, Screen, Section, Text, Title } from '@doan-labs/duo-uikit'
import { dark, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { Fragment, useEffect, useRef, useState } from 'react'
import { styles } from './styles.ts'

// Phone's recents and Contacts' A-Z list read off the same book.
export const PEOPLE: [string, string][] = [
  ['Jony', '+1 (408) 555‑0134'],
  ['Ada Lovelace', '+44 20 7946 0812'],
  ['Mum', '+1 (415) 555‑0177'],
  ['Kim Minh', '+84 90 555 214'],
  ['Blender Foundation', '+31 20 555 9011'],
  ['Alan Turing', '+44 161 555 0918'],
  ['Apple Park Reception', '+1 (408) 555‑0100'],
  ['Grace Hopper', '+1 (202) 555‑0146'],
  ['Hideo Kojima', '+81 3 5555 2049'],
  ['Katherine Johnson', '+1 (757) 555‑0163'],
  ['Nguyễn Thanh', '+84 28 555 771'],
  ['Radia Perlman', '+1 (617) 555‑0129'],
  ['Susan Kare', '+1 (415) 555‑0188'],
  ['Tim', '+1 (408) 555‑0111'],
  ['Vera Rubin', '+1 (520) 555‑0154']
]
// Real DTMF: each key is its row tone plus its column tone, which is why a
// keypad sounds like a chord and not a blip.
const DTMF_R = [697, 770, 852, 941]
const DTMF_C = [1209, 1336, 1477]
const KEYS: [string, string][] = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', '+'],
  ['#', '']
]

/** The in-call screen, shared by Phone and by a tapped Messages contact. */
export const CallScreen = ({ who, off, onEnd }: { who: string; off?: boolean; onEnd: () => void }) => {
  const [state, setState] = useState('calling…')
  const timer = useRef(0)
  useEffect(() => {
    let secs = -3
    timer.current = window.setInterval(() => {
      secs++
      if (secs >= 0) setState(mmss(secs))
      if (secs === 0) beep([440, 660], 0.1, 0.07)
    }, 1000)
    return () => clearInterval(timer.current)
  }, [])
  const end = () => {
    clearInterval(timer.current)
    onEnd()
  }
  return (
    <div {...stylex.props(styles.call, off && styles.callOff)}>
      <div {...stylex.props(styles.av)}>
        <div {...stylex.props(styles.rip)} />
        {who.charAt(0).toUpperCase()}
      </div>
      <div {...stylex.props(styles.who)}>{who}</div>
      <div {...stylex.props(styles.state)}>{state}</div>
      <div {...stylex.props(styles.ctl)}>
        <button type="button" {...stylex.props(styles.ctlBtn)} onClick={() => beep([600], 0.08)}>
          <Sym name="volume" size={22} />
        </button>
        <button type="button" {...stylex.props(styles.ctlBtn)} onClick={() => beep([300], 0.08)}>
          <Sym name="privacy" size={22} />
        </button>
        <button type="button" {...stylex.props(styles.ctlBtn)} onClick={() => beep([900], 0.08)}>
          <Sym name="person" size={22} />
        </button>
      </div>
      <button type="button" {...stylex.props(styles.grn, styles.red, styles.hangUp)} onClick={end}>
        <Sym name="close" size={26} />
      </button>
    </div>
  )
}

type Call = { id: number; who: string; off: boolean }
let seq = 0

const FAVORITES = ['Mum', 'Jony', 'Kim Minh', 'Tim']
const VOICEMAIL: [string, string, string][] = [
  ['Mum', 'Yesterday', '0:42'],
  ['Apple Park Reception', 'Monday', '1:05'],
  ['Kim Minh', 'Sep 18', '0:17']
]
// Contacts' A-Z list: the book grouped under each name's first letter.
const BOOK = new Map<string, string[]>()
for (const [name] of [...PEOPLE].sort((a, b) => a[0].localeCompare(b[0])))
  BOOK.set(name[0]!, [...(BOOK.get(name[0]!) ?? []), name])
const TABS = [
  ['Favorites', 'starFill'],
  ['Recents', 'clockFill'],
  ['Contacts', 'personFill'],
  ['Keypad', 'keypad'],
  ['Voicemail', 'voicemail']
] as const
const KEYPAD = 3

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const Phone = () => {
  const [n, setN] = useState('')
  const [tab, setTab] = useState(KEYPAD)
  const [heard, setHeard] = useState<string[]>([])
  const [calls, setCalls] = useState<Call[]>([])
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const call = (who: string) => setCalls((c) => [...c, { id: ++seq, who, off: false }])
  const hangUp = (id: number) => {
    setCalls((c) => c.map((x) => (x.id === id ? { ...x, off: true } : x)))
    timers.current.push(window.setTimeout(() => setCalls((c) => c.filter((x) => x.id !== id)), 300))
  }
  const tap = (i: number) => {
    beep([DTMF_R[(i / 3) | 0]!, DTMF_C[i % 3]!], 0.1, 0.09)
    setN((n) => (n + KEYS[i]![0]).slice(0, 16))
  }

  return (
    // Phone is the one dark app in the dock: the UIKit dark appearance, so rows,
    // separators and secondary labels inside it read against black.
    <Screen xstyle={[dark, styles.root]}>
      <div {...stylex.props(styles.panes)}>
        <Screen xstyle={[styles.pane, tab !== 0 && shared.hide]}>
          <Title>Favorites</Title>
          <Section xstyle={[styles.list]}>
            {FAVORITES.map((name) => (
              <Row
                key={name}
                as="button"
                xstyle={[styles.dark]}
                icon={<span {...stylex.props(styles.mono)}>{initials(name)}</span>}
                label={name}
                subtitle="mobile"
                detail={
                  <span {...stylex.props(styles.info)}>
                    <Sym name="info" size={22} />
                  </span>
                }
                onClick={() => call(name)}
              />
            ))}
          </Section>
        </Screen>
        <Screen xstyle={[styles.pane, tab !== 1 && shared.hide]}>
          <Title>Recents</Title>
          <Section xstyle={[styles.list]}>
            {PEOPLE.map(([name, num], i) => (
              <Row key={name} as="button" xstyle={[styles.dark]} onClick={() => call(name)}>
                <div>
                  <div {...stylex.props(styles.name, i % 3 === 0 && styles.missed)}>{name}</div>
                  <Text as="div" size="caption">
                    {i % 2 ? 'mobile' : 'iPhone'} · {num}
                  </Text>
                </div>
                <span {...stylex.props(shared.rowR)}>
                  <Sym name="more" size={20} />
                </span>
              </Row>
            ))}
          </Section>
        </Screen>
        <Screen xstyle={[styles.pane, tab !== 2 && shared.hide]}>
          <Title>Contacts</Title>
          {[...BOOK].map(([letter, names]) => (
            <Fragment key={letter}>
              <div {...stylex.props(styles.letter)}>{letter}</div>
              <Section xstyle={[styles.list]}>
                {names.map((name) => (
                  <Row key={name} as="button" xstyle={[styles.dark]} label={name} onClick={() => call(name)} />
                ))}
              </Section>
            </Fragment>
          ))}
        </Screen>
        <div {...stylex.props(styles.pane, tab !== KEYPAD && shared.hide)}>
          <div {...stylex.props(styles.keypad)}>
            <div {...stylex.props(styles.dial)}>{n}</div>
            <div {...stylex.props(styles.keys)}>
              {KEYS.map(([k, sub], i) => (
                <button key={k} type="button" {...stylex.props(styles.key)} onClick={() => tap(i)}>
                  {k}
                  {sub && <s {...stylex.props(styles.keySub)}>{sub}</s>}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Call"
              {...stylex.props(styles.grn, styles.dialBtn)}
              onClick={() => n && call(n)}
            >
              <Sym name="call" size={30} />
            </button>
          </div>
        </div>
        <Screen xstyle={[styles.pane, tab !== 4 && shared.hide]}>
          <Title>Voicemail</Title>
          <Section xstyle={[styles.list]}>
            {VOICEMAIL.map(([name, when, length]) => (
              <Row
                key={name}
                as="button"
                xstyle={[styles.dark]}
                icon={<span {...stylex.props(styles.unheard, heard.includes(name) && styles.heard)} />}
                label={name}
                subtitle={length}
                detail={when}
                // Tapping a message calls back, the one thing its row can do without audio.
                onClick={() => {
                  setHeard((h) => [...h, name])
                  call(name)
                }}
              />
            ))}
          </Section>
        </Screen>
      </div>
      <nav aria-label="Phone" {...stylex.props(styles.bar)}>
        {TABS.map(([label, glyph], i) => (
          <button
            key={label}
            type="button"
            aria-pressed={tab === i}
            {...stylex.props(styles.tab, tab === i && styles.tabOn)}
            onClick={() => setTab(i)}
          >
            <Sym name={glyph} size={24} />
            {label}
          </button>
        ))}
      </nav>
      {calls.map((c) => (
        <CallScreen key={c.id} who={c.who} off={c.off} onEnd={() => hangUp(c.id)} />
      ))}
    </Screen>
  )
}

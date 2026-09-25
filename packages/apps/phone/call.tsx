// The call surfaces: the full-screen call, the incoming ring, the pill a
// minimised call leaves behind, and the contact picker "add call" opens.
// All of it is simulated; nothing touches a real radio.

import { mmss } from '@doan-labs/duo-fixtures'
import { animations, Row, Section, Text } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useState } from 'react'
import type { Book, Contact } from './data.ts'
import { fullName, initials, nameInitials } from './data.ts'
import { Glyph } from './glyphs.tsx'
import { Pad } from './keypad.tsx'
import { answer, decline, end, type Incoming, type LiveCall, screenCall, swapCalls, toggleCall } from './store.ts'
import { styles } from './styles.ts'

/**
 * A live call, full screen over the app. Status line walks
 * calling… → timer → call ended; controls toggle where a tap means something.
 */
export function CallScreen({
  call,
  held,
  onHide,
  onAdd
}: {
  call: LiveCall
  held?: LiveCall
  onHide: (intent: 'facetime' | 'contacts') => void
  onAdd: () => void
}) {
  const state =
    call.phase === 'calling'
      ? call.dir === 'in'
        ? 'Duo mobile'
        : 'calling…'
      : call.phase === 'held'
        ? 'on hold'
        : call.phase === 'ended'
          ? 'call ended'
          : mmss(call.secs)
  return (
    <div {...stylex.props(styles.call, call.phase === 'ended' && styles.callOff)}>
      {held && (
        <button type="button" {...stylex.props(styles.swap)} onClick={() => swapCalls(held.id)}>
          <span {...stylex.props(styles.swapName)}>{held.name}</span>
          <Text as="span" size="footnote" color="secondary">
            on hold
          </Text>
          <span {...stylex.props(styles.swapBtn)}>swap</span>
        </button>
      )}
      {!call.keypad && (
        <div {...stylex.props(styles.av)}>
          {call.phase === 'calling' && <div {...stylex.props(styles.rip)} />}
          {nameInitials(call.name) || <Sym name="personFill" size={44} />}
        </div>
      )}
      <div {...stylex.props(styles.who)}>{call.name}</div>
      <div {...stylex.props(styles.state)}>{state}</div>
      {call.keypad ? (
        <Dtmf call={call} />
      ) : (
        <div {...stylex.props(styles.grid)}>
          <Ctl
            label="mute"
            on={call.muted}
            sym={<Glyph name={call.muted ? 'micOff' : 'mic'} />}
            onClick={() => toggleCall(call.id, 'muted')}
          />
          <Ctl label="keypad" sym={<Sym name="keypad" size={24} />} onClick={() => toggleCall(call.id, 'keypad')} />
          <Ctl
            label="speaker"
            on={call.speaker}
            sym={<Glyph name="speaker" />}
            onClick={() => toggleCall(call.id, 'speaker')}
          />
          <Ctl label="add call" sym={<Sym name="plus" size={24} />} onClick={onAdd} />
          <Ctl label="FaceTime" sym={<Sym name="video" size={24} />} onClick={() => onHide('facetime')} />
          <Ctl label="contacts" sym={<Sym name="person" size={24} />} onClick={() => onHide('contacts')} />
        </div>
      )}
      <button
        type="button"
        aria-label="End call"
        {...stylex.props(styles.grn, styles.red, styles.hangUp)}
        onClick={() => end(call.id)}
      >
        <Sym name="close" size={26} />
      </button>
    </div>
  )
}

type CtlProps = {
  label: string
  sym: ReactNode
  onClick: () => void
  on?: boolean
}
const Ctl = ({ label, sym, onClick, on }: CtlProps) => (
  <button type="button" {...stylex.props(styles.ctl, on && styles.ctlOn)} onClick={onClick}>
    <span {...stylex.props(styles.ctlBtn, on && styles.ctlBtnOn)}>{sym}</span>
    {label}
  </button>
)

/** The in-call DTMF pad: digits scroll across the top, hide returns to the controls. */
const Dtmf = ({ call }: { call: LiveCall }) => {
  const [n, setN] = useState('')
  return (
    <div {...stylex.props(styles.dtmf)}>
      <div {...stylex.props(styles.dtmfNum)}>{n || ' '}</div>
      <Pad small onKey={(k) => setN((s) => (s + k).slice(0, 24))} />
      <button type="button" {...stylex.props(styles.hidePad)} onClick={() => toggleCall(call.id, 'keypad')}>
        Hide
      </button>
    </div>
  )
}

/** The incoming ring: avatar, name, screening line, and the two big answers. */
export function IncomingScreen({ inc }: { inc: Incoming }) {
  return (
    <div {...stylex.props(styles.call, animations.pop)}>
      <div {...stylex.props(styles.av)}>
        <div {...stylex.props(styles.rip)} />
        {nameInitials(inc.name) || <Sym name="personFill" size={44} />}
      </div>
      <div {...stylex.props(styles.who)}>{inc.name}</div>
      <div {...stylex.props(styles.state)}>{inc.screening ? 'screening the call…' : 'Duo mobile'}</div>
      {inc.screening && (
        <div {...stylex.props(styles.screen)}>
          “Hi, it is {inc.name.split(' ')[0]}. Do you have a minute? I have that thing to tell you about.”
        </div>
      )}
      <div {...stylex.props(styles.ringRow)}>
        <button type="button" {...stylex.props(styles.ringOpt)} onClick={() => screenCall(!inc.screening)}>
          <Sym name="privacy" size={20} />
          {inc.screening ? 'Screening on' : 'Screen Call'}
        </button>
      </div>
      <div {...stylex.props(styles.ringCtl)}>
        <button type="button" {...stylex.props(styles.ringBtn)} onClick={decline}>
          <span {...stylex.props(styles.ringDisc, styles.redDisc)}>
            <Sym name="close" size={26} />
          </span>
          Decline
        </button>
        <button type="button" {...stylex.props(styles.ringBtn)} onClick={answer}>
          <span {...stylex.props(styles.ringDisc, styles.grnDisc)}>
            <Sym name="call" size={26} />
          </span>
          Accept
        </button>
      </div>
    </div>
  )
}

/** The green strip a minimised call leaves under the status bar; tap it to go back. */
export function ReturnPill({ call, onShow }: { call: LiveCall; onShow: () => void }) {
  return (
    <button type="button" {...stylex.props(styles.pill)} onClick={onShow}>
      <Sym name="call" size={14} />
      <span {...stylex.props(styles.pillWho)}>{call.name}</span>
      {call.phase === 'active' && <span>{mmss(call.secs)}</span>}
      {call.phase === 'held' && <span>on hold</span>}
      {call.phase === 'calling' && <span>calling…</span>}
    </button>
  )
}

/** Who to dial: the add-call sheet, and the favourites picker share the shape. */
export function Picker({
  book,
  title,
  onPick,
  onClose
}: {
  book: Book
  title: string
  onPick: (c: Contact) => void
  onClose: () => void
}) {
  return (
    <div {...stylex.props(styles.pick)}>
      <div {...stylex.props(styles.pickHd)}>
        <span {...stylex.props(styles.pickTitle)}>{title}</span>
        <button type="button" {...stylex.props(shared.pill)} onClick={onClose}>
          Done
        </button>
      </div>
      <div {...stylex.props(styles.pickBody)}>
        <Section xstyle={[styles.pickList]}>
          {book.contacts.map((c) => (
            <Row
              key={c.id}
              as="button"
              xstyle={[styles.dark]}
              icon={<span {...stylex.props(styles.mono)}>{initials(c)}</span>}
              label={fullName(c)}
              subtitle={c.phone}
              onClick={() => onPick(c)}
            />
          ))}
        </Section>
      </div>
    </div>
  )
}

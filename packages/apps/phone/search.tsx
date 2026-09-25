// The Phone app's search: one field searches contacts, the call log and
// voicemail together, results grouped the way the native app's unified list
// groups them.

import { Row, Section, TextField } from '@doan-labs/duo-uikit'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import type { Book, Contact, Recent, Voicemail } from './data.ts'
import { digits, fullName, initials, when } from './data.ts'
import { styles } from './styles.ts'

/** The field: grey pill, magnifier, clearing ×. Lives at the top of a list pane. */
export function SearchBar({ q, onQuery }: { q: string; onQuery: (v: string) => void }) {
  return (
    <div {...stylex.props(styles.search)}>
      <span {...stylex.props(styles.searchIc)}>
        <Sym name="search" size={14} />
      </span>
      <TextField
        placeholder="Search"
        aria-label="Search"
        value={q}
        onChange={(e) => onQuery(e.target.value)}
        xstyle={[styles.searchIn]}
      />
      {!!q && (
        <button type="button" aria-label="Clear search" {...stylex.props(styles.searchX)} onClick={() => onQuery('')}>
          <Sym name="close" size={13} />
        </button>
      )}
    </div>
  )
}

const hit = (s: string, n: string) => s.toLowerCase().includes(n)

/** Grouped results; each row opens the same detail its own tab would. */
export function SearchResults({
  q,
  book,
  recents,
  voicemails,
  onContact,
  onRecent,
  onVoicemail
}: {
  q: string
  book: Book
  recents: Recent[]
  voicemails: Voicemail[]
  onContact: (c: Contact) => void
  onRecent: (r: Recent) => void
  onVoicemail: (v: Voicemail) => void
}) {
  const n = q.toLowerCase().trim()
  const d = digits(q).replace(/^\+/, '')
  const contacts = book.contacts.filter(
    (c) => hit(fullName(c), n) || hit(c.company, n) || hit(c.email, n) || (d.length > 1 && digits(c.phone).includes(d))
  )
  const calls = recents.filter((r) => hit(r.name, n) || (d.length > 1 && digits(r.number).includes(d)))
  const vms = voicemails.filter(
    (v) => hit(v.name, n) || hit(v.transcript, n) || (d.length > 1 && digits(v.number).includes(d))
  )
  return (
    <div>
      {!!contacts.length && (
        <Results title="Contacts">
          {contacts.map((c) => (
            <Row
              key={c.id}
              as="button"
              xstyle={[styles.dark]}
              icon={<span {...stylex.props(styles.mono)}>{initials(c)}</span>}
              label={fullName(c)}
              subtitle={c.phone}
              onClick={() => onContact(c)}
            />
          ))}
        </Results>
      )}
      {!!calls.length && (
        <Results title="Recents">
          {calls.map((r) => (
            <Row
              key={r.id}
              as="button"
              xstyle={[styles.dark]}
              label={r.name}
              subtitle={`${r.dir === 'out' ? 'Outgoing' : r.missed ? 'Missed' : 'Incoming'} · ${r.number}`}
              detail={when(r.at)}
              onClick={() => onRecent(r)}
            />
          ))}
        </Results>
      )}
      {!!vms.length && (
        <Results title="Voicemail">
          {vms.map((v) => (
            <Row
              key={v.id}
              as="button"
              xstyle={[styles.dark]}
              icon={<span {...stylex.props(styles.unheard, v.heard && styles.heard)} />}
              label={v.name}
              subtitle={v.transcript.slice(0, 46)}
              detail={when(v.at)}
              onClick={() => onVoicemail(v)}
            />
          ))}
        </Results>
      )}
      {!contacts.length && !calls.length && !vms.length && (
        <div {...stylex.props(styles.noHits)}>No Results for “{q}”</div>
      )}
    </div>
  )
}

const Results = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <div {...stylex.props(styles.letter)}>{title}</div>
    <Section xstyle={[styles.list]}>{children}</Section>
  </div>
)

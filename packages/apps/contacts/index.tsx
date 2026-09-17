import type { Os } from '@doan-labs/ipduo-sdk'
import { Nav, Page, useNav } from '@doan-labs/ipduo-uikit/nav.tsx'
import { art } from '@doan-labs/ipduo-uikit/shared.ts'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import { Sym } from '@doan-labs/ipduo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useState } from 'react'
import { styles } from './styles.ts'

const PEOPLE: [string, string][] = [
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

const initials = (n: string) =>
  n
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** Monogram disc: the contact's initials over artwork derived from their name. */
const Mono = ({ name, size, font }: { name: string; size: number; font: number }) => (
  <div {...stylex.props(styles.mono, styles.monoSize(size, font, art(name)))}>{initials(name)}</div>
)

/** The circle shrinks while the whole button is held, so the press is tracked here and not with `:active`. */
const Act = ({ label, glyph, onClick }: { label: string; glyph: string; onClick: () => void }) => {
  const [down, setDown] = useState(false)
  const up = () => setDown(false)
  return (
    <button
      type="button"
      {...stylex.props(styles.act)}
      onClick={onClick}
      onPointerDown={() => setDown(true)}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
    >
      <b {...stylex.props(styles.actGlyph, down && styles.actDown)}>{glyph}</b>
      {label}
    </button>
  )
}

const Detail = ({ name, tel, back, os }: { name: string; tel: string; back: () => void; os: Os }) => (
  <div {...stylex.props(shared.column)}>
    <div {...stylex.props(shared.hdr, styles.hdr17)}>
      <button type="button" {...stylex.props(shared.bk)} onClick={back}>
        <Sym name="back" size={20} />
        Contacts
      </button>
    </div>
    <div {...stylex.props(shared.body)}>
      <div {...stylex.props(styles.head)}>
        <Mono name={name} size={88} font={30} />
        <div {...stylex.props(styles.name)}>{name}</div>
      </div>
      <div {...stylex.props(styles.acts)}>
        <Act label="call" glyph="📞" onClick={() => os.open('Phone')} />
        <Act label="message" glyph="💬" onClick={() => os.open('Messages')} />
        <Act label="video" glyph="🎥" onClick={() => os.open('FaceTime')} />
        <Act label="mail" glyph="✉️" onClick={() => os.open('Mail')} />
      </div>
      <div {...stylex.props(shared.grp, styles.white)}>
        <div {...stylex.props(shared.row)}>
          <div>
            <div {...stylex.props(shared.sub)}>mobile</div>
            <div {...stylex.props(styles.blue)}>{tel}</div>
          </div>
        </div>
        <div {...stylex.props(shared.row)}>
          <div>
            <div {...stylex.props(shared.sub)}>email</div>
            <div {...stylex.props(styles.blue)}>{`${name.split(' ')[0]!.toLowerCase()}@icloud.com`}</div>
          </div>
        </div>
      </div>
      <div {...stylex.props(shared.grp, styles.white)}>
        <div {...stylex.props(shared.row)}>
          Send Message
          <span {...stylex.props(shared.rowR)}>›</span>
        </div>
        <div {...stylex.props(shared.row)}>
          Share Contact
          <span {...stylex.props(shared.rowR)}>›</span>
        </div>
        <div {...stylex.props(shared.row, styles.red)}>Block this Caller</div>
      </div>
    </div>
  </div>
)

const List = ({ os }: { os: Os }) => {
  const { push } = useNav()
  const sorted = [...PEOPLE].sort((a, b) => a[0].localeCompare(b[0]))
  const rows: ReactNode[] = []
  let letter = ''
  for (const [name, tel] of sorted) {
    if (name[0]! !== letter) {
      letter = name[0]!
      rows.push(
        <div key={`#${letter}`} {...stylex.props(styles.sec)}>
          {letter}
        </div>
      )
    }
    rows.push(
      <div
        key={name}
        {...stylex.props(shared.row)}
        onClick={() => push((b) => <Detail name={name} tel={tel} back={b} os={os} />)}
      >
        <Mono name={name} size={34} font={13} />
        <span {...stylex.props(styles.rowName)}>{name}</span>
        <span {...stylex.props(shared.rowR)}>›</span>
      </div>
    )
  }
  return <Page title="Contacts">{rows}</Page>
}

export const Contacts = ({ os }: { os: Os }) => (
  <Nav>
    <List os={os} />
  </Nav>
)

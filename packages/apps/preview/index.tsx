import type { Os } from '@doan-labs/ipduo-sdk'
import { Nav, Page, useNav } from '@doan-labs/ipduo-uikit/nav.tsx'
import { art } from '@doan-labs/ipduo-uikit/shared.ts'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import { Sym } from '@doan-labs/ipduo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { styles } from './styles.ts'

const DOCS: [string, string, number][] = [
  ['Duo Teardown.pdf', '📐', 12],
  ['Hinge Tolerances.pdf', '📏', 4],
  ['Titanium Finish.pdf', '🪞', 7]
]

/** Nine grey text lines, every fourth one a short paragraph end. */
const LINES = Array.from({ length: 9 }, (_, i) => ({ id: `l${i}`, short: i % 4 === 3 }))

/** A page of a PDF, faked from the file name: a tint bar, a heading, and grey lines. */
const Viewer = ({ name, pages, back }: { name: string; pages: number; back: () => void }) => {
  const [p, setP] = useState(0)
  const [z, setZ] = useState(1)
  const step = (d: number) => setP(Math.min(pages - 1, Math.max(0, p + d)))
  return (
    <div {...stylex.props(shared.column)}>
      <div {...stylex.props(shared.hdr, styles.hdr17)}>
        <button type="button" {...stylex.props(shared.bk)} onClick={back}>
          <Sym name="back" size={20} />
          Files
        </button>
        <span {...stylex.props(shared.hdrSm)}>
          <button type="button" {...stylex.props(shared.pill)} onClick={() => setZ(Math.max(0.6, z - 0.2))}>
            −
          </button>
          <button type="button" {...stylex.props(shared.pill)} onClick={() => setZ(Math.min(2, z + 0.2))}>
            +
          </button>
          <Sym name="share" size={17} />
        </span>
      </div>
      <div {...stylex.props(shared.body, styles.viewerBody)}>
        <div {...stylex.props(styles.sheet, styles.zoom(z))}>
          <div {...stylex.props(styles.tint, styles.bg(art(name + p)))} />
          <div {...stylex.props(styles.title)}>{`${name.replace('.pdf', '')} — §${p + 1}`}</div>
          {LINES.map((l) => (
            <div key={l.id} {...stylex.props(styles.line, l.short ? styles.lineShort : styles.lineFull)} />
          ))}
          <div {...stylex.props(styles.figure, styles.bg(art(name + (p + 1), 62)))} />
        </div>
        <div {...stylex.props(shared.sub, styles.cap)}>{`Page ${p + 1} of ${pages}`}</div>
        <div {...stylex.props(styles.pager)}>
          <button type="button" {...stylex.props(shared.pill)} onClick={() => step(-1)}>
            ‹ Prev
          </button>
          <button type="button" {...stylex.props(shared.pill)} onClick={() => step(1)}>
            Next ›
          </button>
        </div>
      </div>
    </div>
  )
}

const Recents = ({ os }: { os: Os }) => {
  const { push } = useNav()
  const shots = os.shots.map((_src, i): [string, string, number] => [`Camera ${i + 1}.jpg`, '📷', 1])
  return (
    <Page title="Files">
      <div {...stylex.props(styles.sec)}>RECENTS</div>
      {[...DOCS, ...shots].map(([n, e, pages]) => (
        <div
          key={n}
          {...stylex.props(shared.row)}
          onClick={() => push((b) => <Viewer name={n} pages={pages} back={b} />)}
        >
          <span {...stylex.props(styles.emoji)}>{e}</span>
          <div {...stylex.props(styles.grow)}>
            <div {...stylex.props(styles.name)}>{n}</div>
            <div {...stylex.props(shared.sub)}>{`${pages} page${pages > 1 ? 's' : ''}`}</div>
          </div>
          <span {...stylex.props(shared.rowR)}>›</span>
        </div>
      ))}
    </Page>
  )
}

export const Preview = ({ os }: { os: Os }) => (
  <Nav>
    <Recents os={os} />
  </Nav>
)

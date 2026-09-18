import { art } from '@doan-labs/duo-fixtures'
import type { Os } from '@doan-labs/duo-sdk'
import { Button, Row, Screen, Text, Title, VStack } from '@doan-labs/duo-uikit'
import { Nav, Page, useNav } from '@doan-labs/duo-uikit/nav.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
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
    <VStack>
      <Title xstyle={[styles.hdr17]}>
        <button type="button" {...stylex.props(shared.bk)} onClick={back}>
          <Sym name="back" size={20} />
          Files
        </button>
        <Title as="span" variant="accessory">
          <Button type="button" onClick={() => setZ(Math.max(0.6, z - 0.2))}>
            −
          </Button>
          <Button type="button" onClick={() => setZ(Math.min(2, z + 0.2))}>
            +
          </Button>
          <Sym name="share" size={17} />
        </Title>
      </Title>
      <Screen xstyle={[styles.viewerBody]}>
        <div {...stylex.props(styles.sheet, styles.zoom(z))}>
          <div {...stylex.props(styles.tint, styles.bg(art(name + p)))} />
          <div {...stylex.props(styles.title)}>{`${name.replace('.pdf', '')} — §${p + 1}`}</div>
          {LINES.map((l) => (
            <div key={l.id} {...stylex.props(styles.line, l.short ? styles.lineShort : styles.lineFull)} />
          ))}
          <div {...stylex.props(styles.figure, styles.bg(art(name + (p + 1), 62)))} />
        </div>
        <Text as="div" size="caption" xstyle={[styles.cap]}>{`Page ${p + 1} of ${pages}`}</Text>
        <div {...stylex.props(styles.pager)}>
          <Button type="button" onClick={() => step(-1)}>
            ‹ Prev
          </Button>
          <Button type="button" onClick={() => step(1)}>
            Next ›
          </Button>
        </div>
      </Screen>
    </VStack>
  )
}

const Recents = ({ os }: { os: Os }) => {
  const { push } = useNav()
  const shots = os.shots.map((_src, i): [string, string, number] => [`Camera ${i + 1}.jpg`, '📷', 1])
  return (
    <Page title="Files">
      <div {...stylex.props(styles.sec)}>RECENTS</div>
      {[...DOCS, ...shots].map(([n, e, pages]) => (
        <Row key={n} onClick={() => push((b) => <Viewer name={n} pages={pages} back={b} />)}>
          <span {...stylex.props(styles.emoji)}>{e}</span>
          <div {...stylex.props(styles.grow)}>
            <div {...stylex.props(styles.name)}>{n}</div>
            <Text as="div" size="caption">{`${pages} page${pages > 1 ? 's' : ''}`}</Text>
          </div>
          <span {...stylex.props(shared.rowR)}>›</span>
        </Row>
      ))}
    </Page>
  )
}

export const Preview = ({ os }: { os: Os }) => (
  <Nav>
    <Recents os={os} />
  </Nav>
)

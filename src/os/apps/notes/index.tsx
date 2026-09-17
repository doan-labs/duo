import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import type { Os } from '../../uikit/app.ts'
import { Nav, Page, useNav } from '../../uikit/nav.tsx'
import { shared } from '../../uikit/styles.ts'
import { Sym } from '../../uikit/sym.tsx'
import { NOTES } from './data.ts'
import { NotePane, NoteSheet } from './editor.tsx'
import { Folders } from './folders.tsx'
import { NoteList } from './note-list.tsx'
import { styles } from './styles.ts'

export const Notes = (_: { os: Os }) => {
  const root = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)
  // The box decides, not the display: a split half of the inner panel is as
  // narrow as the cover, and gets the same one-column Notes.
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWide(e!.contentRect.width > 600))
    ro.observe(root.current!)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={root} {...stylex.props(shared.column)}>
      {wide ? <Columns /> : <Stack />}
    </div>
  )
}

// ---------- unfolded: folders | list | note ----------

const Columns = () => {
  const [sel, setSel] = useState(NOTES[0]!)
  const [ink, setInk] = useState(0)
  return (
    <div {...stylex.props(styles.cols)}>
      <Folders />
      <div {...stylex.props(styles.list)}>
        <div {...stylex.props(styles.listHdr)}>
          <div>
            <div {...stylex.props(styles.listTitle)}>Notes</div>
            <div {...stylex.props(shared.sub, styles.listCount)}>{NOTES.length} Notes</div>
          </div>
          <span {...stylex.props(styles.round, styles.push)}>
            <Sym name="more" size={17} />
          </span>
        </div>
        <div {...stylex.props(styles.scroll)}>
          <NoteList sel={sel.id} onPick={setSel} />
        </div>
      </div>
      <NotePane key={sel.id} note={sel} ink={ink} onInk={setInk} />
    </div>
  )
}

const Stack = () => (
  <Nav>
    <Page
      title={
        <>
          Notes
          <span {...stylex.props(shared.hdrSm, styles.gold)}>
            <Sym name="more" size={19} />
            <Sym name="compose" size={19} />
          </span>
        </>
      }
    >
      <Picker />
    </Page>
  </Nav>
)

const Picker = () => {
  const { push } = useNav()
  return <NoteList onPick={(n) => push((back) => <NoteSheet note={n} back={back} />)} />
}

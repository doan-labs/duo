import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import type { Os } from '../uikit/app.ts'
import { Nav, Page, useNav } from '../uikit/nav.tsx'
import { shared } from '../uikit/styles.ts'
import { Sym } from '../uikit/sym.tsx'
import { colors } from '../uikit/tokens.stylex.ts'
import { NOTES } from './notes/data.ts'
import { NotePane, NoteSheet } from './notes/editor.tsx'
import { Folders } from './notes/folders.tsx'
import { NoteList } from './notes/note-list.tsx'

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

const styles = stylex.create({
  cols: {
    position: 'relative',
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: colors.black,
    color: colors.white
  },
  gold: { color: colors.yellow, opacity: 1 },
  scroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingBottom: 22 },
  list: {
    width: 208,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: 'rgba(255,255,255,.08)'
  },
  listHdr: { display: 'flex', alignItems: 'center', paddingInline: 12, paddingTop: 4, paddingBottom: 6, flexShrink: 0 },
  listTitle: { fontSize: 15, fontWeight: 700 },
  listCount: { fontSize: 11 },
  push: { marginLeft: 'auto' },
  round: {
    width: 27,
    height: 27,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    backgroundColor: 'rgba(255,255,255,.1)',
    color: colors.white,
    flexShrink: 0
  }
})

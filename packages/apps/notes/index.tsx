import { type Os, os } from '@doan-labs/ipduo-sdk'
import { useKV } from '@doan-labs/ipduo-sdk/react.ts'
import { Text, Title, VStack } from '@doan-labs/ipduo-uikit'
import { Page } from '@doan-labs/ipduo-uikit/nav.tsx'
import { Sym } from '@doan-labs/ipduo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { NOTES } from './data.ts'
import { NotePane, NoteSheet } from './editor.tsx'
import { Folders } from './folders.tsx'
import { NoteList } from './note-list.tsx'
import { styles } from './styles.ts'

export const Notes = (_: { os: Os }) => {
  const root = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)
  const selected = useKV(os.session, 'selected')
  const pushed = useKV(os.session, 'pushed')
  const note = NOTES.find((n) => n.id === selected.value) ?? NOTES[0]!
  const pick = (n: typeof note) => {
    selected.set(n.id)
    pushed.set('true')
  }
  // The box decides, not the display: a split half of the inner panel is as
  // narrow as the cover, and gets the same one-column Notes.
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWide(e!.contentRect.width > 600))
    ro.observe(root.current!)
    return () => ro.disconnect()
  }, [])
  return (
    <VStack ref={root}>
      {wide ? (
        <Columns sel={note} onPick={pick} />
      ) : pushed.value === 'true' ? (
        <NoteSheet note={note} back={() => pushed.set('false')} />
      ) : (
        <Stack onPick={pick} />
      )}
    </VStack>
  )
}

// ---------- unfolded: folders | list | note ----------

const Columns = ({ sel, onPick }: { sel: (typeof NOTES)[number]; onPick: (note: (typeof NOTES)[number]) => void }) => {
  const [ink, setInk] = useState(0)
  return (
    <div {...stylex.props(styles.cols)}>
      <Folders />
      <div {...stylex.props(styles.list)}>
        <div {...stylex.props(styles.listHdr)}>
          <div>
            <div {...stylex.props(styles.listTitle)}>Notes</div>
            <Text as="div" size="caption" xstyle={[styles.listCount]}>
              {NOTES.length} Notes
            </Text>
          </div>
          <span {...stylex.props(styles.round, styles.push)}>
            <Sym name="more" size={17} />
          </span>
        </div>
        <div {...stylex.props(styles.scroll)}>
          <NoteList sel={sel.id} onPick={onPick} />
        </div>
      </div>
      <NotePane key={sel.id} note={sel} ink={ink} onInk={setInk} />
    </div>
  )
}

const Stack = ({ onPick }: { onPick: (note: (typeof NOTES)[number]) => void }) => (
  <Page
    title={
      <>
        Notes
        <Title as="span" variant="accessory" xstyle={[styles.gold]}>
          <Sym name="more" size={19} />
          <Sym name="compose" size={19} />
        </Title>
      </>
    }
  >
    <NoteList onPick={onPick} />
  </Page>
)

import { type Os, os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Push, Text, Title, VStack } from '@doan-labs/duo-uikit'
import { Page } from '@doan-labs/duo-uikit/nav.tsx'
import { dark, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import type { Note } from './data.ts'
import { NotePane, NoteSheet } from './editor.tsx'
import { Folders } from './folders.tsx'
import { NoteList } from './note-list.tsx'
import { useFolder, useFolders, useNotes } from './store.ts'
import { styles } from './styles.ts'

type Model = {
  notes: Note[]
  title: string
  sel?: Note
  pick: (n: Note) => void
  compose: () => void
  trash: (n: Note) => void
}

export const Notes = (_: { os: Os }) => {
  const root = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)
  const selected = useKV(os.session, 'selected')
  const pushed = useKV(os.session, 'pushed')
  const { notes: all, add, remove } = useNotes()
  const { folders } = useFolders()
  const [folder] = useFolder()
  const notes = all.filter((n) => n.folder === folder)
  const sel = notes.find((n) => n.id === selected.value)
  const pick = (n: Note) => {
    selected.set(n.id)
    pushed.set('true')
  }
  const model: Model = {
    notes,
    title: folders.find((f) => f.id === folder)?.name ?? 'Notes',
    sel,
    pick,
    compose: () => pick(add(folder)),
    trash: (n) => {
      remove(n)
      selected.del()
      pushed.set('false')
    }
  }
  // The box decides, not the display: a split half of the inner panel is as
  // narrow as the cover, and gets the same one-column Notes.
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWide(e!.contentRect.width > 600))
    ro.observe(root.current!)
    return () => ro.disconnect()
  }, [])
  return (
    <VStack ref={root} xstyle={[dark]}>
      {wide ? (
        <Columns m={model} />
      ) : (
        <Phone m={model} open={pushed.value === 'true' && !!sel} back={() => pushed.set('false')} />
      )}
    </VStack>
  )
}

// ---------- folded: list, with the note pushed over it like a nav stack ----------

const Phone = ({ m, open, back }: { m: Model; open: boolean; back: () => void }) => {
  // The sheet keeps the note it was opened with so it can slide out after the selection clears.
  const [held, setHeld] = useState<Note | undefined>(m.sel)
  useEffect(() => {
    if (m.sel) setHeld(m.sel)
  }, [m.sel])
  return (
    <Push
      open={open}
      sheet={held && <NoteSheet note={held} back={back} compose={m.compose} trash={() => m.trash(held)} />}
    >
      <Stack m={m} />
    </Push>
  )
}

/** Rows whose text contains the query; every row already subscribes to its text, so this is free. */
const useSearch = () => {
  const q = useKV(os.session, 'q')
  return [q.value ?? '', (v: string) => (v ? q.set(v) : q.del())] as const
}

// ---------- unfolded: folders | list | note ----------

const Columns = ({ m }: { m: Model }) => {
  const [ink, setInk] = useState(0)
  const [q, setQ] = useSearch()
  return (
    <div {...stylex.props(styles.cols)}>
      <Folders />
      <div {...stylex.props(styles.list)}>
        <div {...stylex.props(styles.listHdr)}>
          <div>
            <div {...stylex.props(styles.listTitle)}>{m.title}</div>
            <Text as="div" size="caption" xstyle={[styles.listCount]}>
              {m.notes.length} {m.notes.length === 1 ? 'Note' : 'Notes'}
            </Text>
          </div>
          <button
            type="button"
            {...stylex.props(styles.round, styles.push, shared.press)}
            onClick={m.compose}
            aria-label="New note"
          >
            <Sym name="compose" size={15} />
          </button>
        </div>
        <label {...stylex.props(styles.search)}>
          <Sym name="search" size={13} />
          <input
            {...stylex.props(styles.searchIn)}
            placeholder="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div {...stylex.props(styles.scroll)}>
          <NoteList notes={m.notes} q={q} sel={m.sel?.id} onPick={m.pick} />
        </div>
      </div>
      <NotePane
        key={m.sel?.id}
        note={m.sel}
        ink={ink}
        onInk={setInk}
        compose={m.compose}
        trash={() => m.sel && m.trash(m.sel)}
      />
    </div>
  )
}

const Stack = ({ m }: { m: Model }) => (
  <Page
    title={
      <>
        {m.title}
        <Title as="span" variant="accessory" xstyle={[styles.gold]}>
          <Sym name="more" size={19} />
          <button type="button" {...stylex.props(styles.gold, styles.flat)} onClick={m.compose} aria-label="New note">
            <Sym name="compose" size={19} />
          </button>
        </Title>
      </>
    }
  >
    <NoteList notes={m.notes} onPick={m.pick} />
  </Page>
)

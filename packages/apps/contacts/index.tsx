// Contacts. The iPadOS shape: a Lists page with the A-Z directory pushed over
// it, and the card beside it when the box is wide, pushed over it when it is
// not. The book and every selection live in the SDK's storage and session,
// so both displays agree on them.

import type { Os } from '@doan-labs/duo-sdk'
import { Push, useWide } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useState } from 'react'
import type { Contact } from './data.ts'
import { Blank, Detail } from './detail.tsx'
import { ContactForm, ListPicker, NewList } from './form.tsx'
import { ALL, Directory, inList, Lists, listTitle } from './list.tsx'
import { blank, useBook, useShared } from './store.ts'
import { styles } from './styles.ts'

export const Contacts = ({ os }: { os: Os }) => {
  const [root, wide] = useWide()
  const { book, contacts, me, save, remove, toggle, addList, removeList } = useBook()
  const [list, setList] = useShared('list')
  const [lists, setLists] = useShared('lists')
  const [selected, setSelected] = useShared('selected')
  const [pushed, setPushed] = useShared('pushed')
  const [query, setQuery] = useShared('q')
  const [draft, setDraft] = useState<Contact | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [picking, setPicking] = useState(false)
  const [naming, setNaming] = useState(false)

  const shown = contacts.filter((c) => inList(c, list) || c.id === me?.id)
  const sel = contacts.find((c) => c.id === selected)
  const pick = (c: Contact) => {
    setSelected(c.id)
    setPushed('true')
  }
  const edit = (c: Contact, fresh: boolean) => {
    setIsNew(fresh)
    setDraft(c)
  }
  const onSave = (c: Contact) => {
    save(c)
    setDraft(null)
    pick(c)
  }
  const onDelete = (c: Contact) => {
    remove(c.id)
    setSelected('')
    setPushed('')
  }
  const chooseList = (id: string) => {
    setList(id)
    setLists('')
    setQuery('')
  }
  // The rows of another list may not hold the card that was open; the pane clears rather than keeping a stranger.
  useEffect(() => {
    if (sel && !inList(sel, list) && sel.id !== me?.id) setSelected('')
  }, [list, sel, me?.id, setSelected])

  const directory = (
    <Directory
      title={listTitle(list, book.lists)}
      contacts={shown}
      me={list === ALL ? me : undefined}
      sel={sel?.id}
      query={query}
      onQuery={setQuery}
      onPick={pick}
      onAdd={() => edit(blank(), true)}
      onBack={() => setLists('true')}
      wide={wide}
    />
  )
  const page = (
    <Lists
      contacts={contacts}
      lists={book.lists}
      current={list}
      onPick={chooseList}
      onAdd={() => setNaming(true)}
      onRemove={(id) => {
        removeList(id)
        if (list === id) chooseList(ALL)
      }}
      wide={wide}
    />
  )
  const column = (
    <Push open={lists !== 'true'} sheet={directory}>
      {page}
    </Push>
  )
  const card = (c: Contact) => (
    <Detail
      contact={c}
      lists={book.lists}
      isMe={c.id === me?.id}
      wide={wide}
      onBack={() => setPushed('')}
      onEdit={() => edit(c, false)}
      onToggle={(key) => toggle(c.id, key)}
      onLists={() => setPicking(true)}
      onDelete={() => onDelete(c)}
      open={os.open}
    />
  )
  return (
    <div ref={root} {...stylex.props(styles.root)}>
      {wide ? (
        <div {...stylex.props(styles.split)}>
          <div {...stylex.props(styles.side)}>{column}</div>
          <div {...stylex.props(styles.pane, styles.paneWide)}>{sel ? card(sel) : <Blank />}</div>
        </div>
      ) : (
        <Phone open={pushed === 'true' && !!sel} sel={sel} card={card}>
          {column}
        </Phone>
      )}
      <ContactForm draft={draft} isNew={isNew} onSave={onSave} onClose={() => setDraft(null)} />
      <ListPicker
        contact={picking && sel ? sel : null}
        lists={book.lists}
        onChange={save}
        onAdd={(name) => addList(name, sel?.id)}
        onClose={() => setPicking(false)}
      />
      <NewList open={naming} onAdd={(name) => chooseList(addList(name).id)} onClose={() => setNaming(false)} />
    </div>
  )
}

// ---------- folded: the card pushed over the list like a nav stack ----------

type PhoneProps = { open: boolean; sel?: Contact; card: (c: Contact) => ReactNode; children: ReactNode }
const Phone = ({ open, sel, card, children }: PhoneProps) => {
  // The sheet keeps the card it was opened with so it can slide out after the selection clears.
  const [held, setHeld] = useState<Contact | undefined>(sel)
  useEffect(() => {
    if (sel) setHeld(sel)
  }, [sel])
  return (
    <Push open={open} sheet={held && <div {...stylex.props(styles.pane)}>{card(held)}</div>}>
      {children}
    </Push>
  )
}

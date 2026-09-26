// The inbox: the conversation list in recency order, with search, unread
// dots, the two-step edit delete Phone's Recents uses, a context menu for
// marking read and deleting, and the empty states for both ends of a search.

import { art } from '@doan-labs/duo-fixtures'
import {
  IconButton,
  List,
  Menu,
  type MenuEntry,
  Placeholder,
  Screen,
  Text,
  TextField,
  Title
} from '@doan-labs/duo-uikit'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { type Conversation, convName, digits, lastAt, nameInitials, personById, visible, when } from './data.ts'
import { removeConv, select, setUnread, useConvs, useShared, useTick } from './store.ts'
import { styles } from './styles.ts'

const hit = (s: string, n: string) => s.toLowerCase().includes(n)

export function Inbox() {
  const convs = useConvs()
  const [q, setQ] = useShared('q', '')
  const [editing, setEditing] = useShared('edit', false)
  const shown = convs
    .filter(visible)
    .sort((a, b) => lastAt(b) - lastAt(a))
    .filter((c) => {
      const n = q.trim().toLowerCase()
      if (!n) return true
      const d = digits(q).replace(/^\+/, '')
      return (
        hit(convName(c), n) ||
        hit(c.draft, n) ||
        c.messages.some((m) => hit(m.text, n)) ||
        (d.length > 1 && digits(personById(c.personId)?.number ?? c.to ?? '').includes(d))
      )
    })
  return (
    <>
      <Title>
        Messages
        <Title as="span" variant="accessory" xstyle={[styles.hdrActs]}>
          {!!convs.length && (
            <button
              type="button"
              {...stylex.props(styles.plain)}
              onClick={() => setEditing(!editing)}
              aria-pressed={editing}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
          )}
          <IconButton name="compose" size={19} aria-label="New Message" onClick={() => select('new')} />
        </Title>
      </Title>
      <Screen>
        <SearchBar q={q} onQuery={setQ} />
        {!convs.some(visible) ? (
          <Placeholder>No Messages Yet</Placeholder>
        ) : !shown.length ? (
          <Placeholder>{`No Results for “${q}”`}</Placeholder>
        ) : (
          <List xstyle={[styles.list]}>
            {shown.map((c) => (
              <ConvRow key={c.id} conv={c} editing={editing} />
            ))}
          </List>
        )}
        {!!q && !!shown.length && (
          <Text as="div" size="footnote" color="secondary" xstyle={[styles.searchFoot]}>
            {shown.length} conversation{shown.length === 1 ? '' : 's'}
          </Text>
        )}
      </Screen>
    </>
  )
}

function SearchBar({ q, onQuery }: { q: string; onQuery: (v: string) => void }) {
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

/** The line a row shows: the draft while one is open, else the newest text. */
const preview = (c: Conversation, now: number) =>
  c.draft.trim() ? c.draft : c.pending && now >= c.pending.typeAt ? c.pending.text : (c.messages.at(-1)?.text ?? '')

function ConvRow({ conv, editing }: { conv: Conversation; editing: boolean }) {
  useTick()
  const [armed, setArmed] = useState(false)
  const [menu, setMenu] = useState(false)
  const name = convName(conv)
  const items: MenuEntry[] = [
    {
      label: conv.unread ? 'Mark as Read' : 'Mark as Unread',
      icon: conv.unread ? 'eye' : 'eyeSlash',
      onSelect: () => setUnread(conv.id, !conv.unread)
    },
    'separator',
    { label: 'Delete', icon: 'trash', onSelect: () => removeConv(conv.id) }
  ]
  return (
    <li {...stylex.props(styles.rowWrap)}>
      {editing && (
        <button
          type="button"
          aria-label={`Delete ${name}`}
          {...stylex.props(styles.minus)}
          onClick={() => setArmed(!armed)}
        >
          <Sym name="minus" size={16} />
        </button>
      )}
      <button
        type="button"
        {...stylex.props(styles.row)}
        onClick={() => (editing ? setArmed(!armed) : select(conv.id))}
        onContextMenu={(e) => {
          e.preventDefault()
          setMenu(true)
        }}
        aria-label={`${name}${conv.unread ? `, ${conv.unread} unread` : ''}`}
      >
        <span {...stylex.props(styles.avatar, styles.bg(art(name)))}>
          {nameInitials(name) || <Sym name="person" size={20} />}
        </span>
        <span {...stylex.props(styles.tx)}>
          <b {...stylex.props(styles.txB)}>{name}</b>
          <p {...stylex.props(styles.txP)}>
            {conv.draft.trim() ? (
              <>
                <span {...stylex.props(styles.draftTag)}>Draft:</span> {preview(conv, Date.now())}
              </>
            ) : (
              preview(conv, Date.now())
            )}
          </p>
        </span>
        <span {...stylex.props(styles.trail)}>
          <Text size="caption" color="secondary" xstyle={[styles.stamp]}>
            {when(lastAt(conv) || Date.now())}
          </Text>
          {conv.unread > 0 && <span {...stylex.props(styles.unread)}>{conv.unread}</span>}
        </span>
      </button>
      {armed && editing && (
        <button type="button" {...stylex.props(styles.deleteBtn)} onClick={() => removeConv(conv.id)}>
          Delete
        </button>
      )}
      <Menu open={menu} onClose={() => setMenu(false)} items={items} size={14} xstyle={[styles.rowMenuPop]} />
    </li>
  )
}

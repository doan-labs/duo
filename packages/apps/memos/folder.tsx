// One folder: the same filtered list Library shows, plus its own Menu for
// rename and delete. Deleting a folder frees its recordings back to All
// Recordings rather than trashing them.

import { Button, List, Menu, Page, Placeholder, Section, Sheet, TextField, useNav } from '@doan-labs/duo-uikit'
import { app, space, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState, useSyncExternalStore } from 'react'
import { Detail } from './detail.tsx'
import { MemoRow } from './list.tsx'
import { type Folder, folderOps, memoOps, memosCell, useShared } from './store.ts'

export function FolderPage({ folder, back }: { folder: Folder; back: () => void }) {
  const memos = useSyncExternalStore(memosCell.subscribe, memosCell.get)
  const items = memos.filter((m) => !m.deletedAt && m.folder === folder.id).sort((a, b) => b.at - a.at)
  const [editing, setEditing] = useShared('fediting', false)
  const [selection, setSelection] = useShared<Set<string>>('fsel', new Set())
  const [menu, setMenu] = useState(false)
  const [rename, setRename] = useState(false)
  const nav = useNav()
  const toggle = (id: string) => {
    const next = new Set(selection)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelection(next)
  }
  return (
    <Page
      title={
        <span {...stylex.props(styles.title)}>
          {folder.name}
          <button
            type="button"
            aria-expanded={menu}
            aria-label="Folder actions"
            {...stylex.props(styles.more)}
            onClick={() => setMenu(true)}
          >
            ···
          </button>
        </span>
      }
      back={back}
    >
      <Menu
        open={menu}
        onClose={() => setMenu(false)}
        xstyle={[styles.menu]}
        items={[
          { label: 'Rename Folder…', icon: 'compose', onSelect: () => setRename(true) },
          {
            label: editing ? 'Done' : 'Select Recordings',
            icon: 'list',
            onSelect: () => {
              setEditing(!editing)
              setSelection(new Set())
            }
          },
          'separator',
          {
            label: 'Delete Folder',
            icon: 'trash',
            onSelect: () => {
              folderOps.remove(folder.id)
              back()
            }
          }
        ]}
      />
      {items.length === 0 ? (
        <Placeholder xstyle={[styles.empty]}>No recordings in this folder. Move some from All Recordings.</Placeholder>
      ) : (
        <Section xstyle={[styles.section]}>
          <List>
            {items.map((m) => (
              <MemoRow
                key={m.id}
                memo={m}
                editing={editing}
                selected={selection.has(m.id)}
                onOpen={() => nav.push((b) => <Detail memo={m} back={b} />)}
                onToggle={() => toggle(m.id)}
              />
            ))}
          </List>
        </Section>
      )}
      {editing && (
        <div {...stylex.props(styles.bar)}>
          <span {...stylex.props(styles.count)}>{selection.size} selected</span>
          <Button
            variant="plain"
            disabled={!selection.size}
            onClick={() => {
              memoOps.moveTo(selection, undefined)
              setSelection(new Set())
            }}
          >
            Remove from Folder
          </Button>
        </div>
      )}
      {rename && <RenameSheet folder={folder} onClose={() => setRename(false)} />}
    </Page>
  )
}

function RenameSheet({ folder, onClose }: { folder: Folder; onClose: () => void }) {
  const [name, setName] = useState(folder.name)
  return (
    <Sheet open onClose={onClose}>
      <div {...stylex.props(styles.sheet)}>
        <div {...stylex.props(styles.sheetTitle)}>Rename Folder</div>
        <TextField
          autoFocus
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              folderOps.rename(folder.id, name)
              onClose()
            }
          }}
        />
        <div {...stylex.props(styles.rowBtns)}>
          <Button variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="plain"
            disabled={!name.trim()}
            onClick={() => {
              folderOps.rename(folder.id, name)
              onClose()
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

const styles = stylex.create({
  title: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  more: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.link,
    fontSize: typeScale.title3,
    cursor: 'pointer',
    padding: 4
  },
  menu: { position: 'absolute', top: 40, right: space.lg },
  section: { paddingInline: space.lg, paddingTop: space.sm },
  empty: { padding: space.xl, color: app.label2 },
  bar: {
    position: 'sticky',
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBlock: 10,
    paddingInline: 16,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: app.separator,
    backgroundColor: app.bg
  },
  count: { flexGrow: 1, color: app.label2, fontSize: typeScale.footnote },
  sheet: { padding: space.lg, display: 'flex', flexDirection: 'column', gap: space.md },
  sheetTitle: { fontSize: typeScale.headline, fontWeight: weight.semibold },
  rowBtns: { display: 'flex', justifyContent: 'flex-end', gap: space.sm }
})

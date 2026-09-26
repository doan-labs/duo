// Recently Deleted: trashed memos keep their files for the grace window, then
// reconcileFiles erases them for real. Selection is always on here because
// every action on this page is destructive or a recovery.

import { List, Page, Placeholder, Section } from '@doan-labs/duo-uikit'
import { app, appAppearance, space, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useSyncExternalStore } from 'react'
import { eraseMemo } from './engine.ts'
import { MemoRow, SelectionBar } from './list.tsx'
import { type Memo, memoOps, memosCell, useShared } from './store.ts'

export function Deleted({ back }: { back: () => void }) {
  const memos = useSyncExternalStore(memosCell.subscribe, memosCell.get)
  const deleted = memos.filter((m) => m.deletedAt).sort((a, b) => b.deletedAt! - a.deletedAt!)
  const [selection, setSelection] = useShared<Set<string>>('trashsel', new Set())
  const toggle = (id: string) => {
    const next = new Set(selection)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelection(next)
  }
  const chosen = deleted.filter((m) => selection.has(m.id))
  const each = (fn: (m: Memo) => void) => {
    for (const m of chosen) fn(m)
    setSelection(new Set())
  }
  return (
    <Page title="Recently Deleted" back={back}>
      <div {...stylex.props(styles.hint)}>Recordings are available here for 30 days, then erased.</div>
      {deleted.length === 0 ? (
        <Placeholder xstyle={[styles.empty]}>Nothing recently deleted.</Placeholder>
      ) : (
        <Section xstyle={[styles.section]}>
          <List>
            {deleted.map((m) => (
              <MemoRow
                key={m.id}
                memo={m}
                editing
                deleted
                selected={selection.has(m.id)}
                onOpen={() => {}}
                onToggle={() => toggle(m.id)}
              />
            ))}
          </List>
        </Section>
      )}
      {deleted.length > 0 && (
        <div {...stylex.props(styles.barWrap)}>
          <SelectionBar
            count={selection.size}
            actions={[
              { label: 'Recover', onSelect: () => each((m) => memoOps.recover([m.id])) },
              {
                label: 'Erase',
                danger: true,
                onSelect: () => each((m) => void eraseMemo(m))
              }
            ]}
          />
        </div>
      )}
    </Page>
  )
}

const styles = stylex.create({
  hint: { paddingInline: space.lg, paddingTop: space.xs, color: app.label3, fontSize: typeScale.footnote },
  section: { paddingInline: space.lg, paddingTop: space.sm },
  row: { backgroundColor: appAppearance.memosFill },
  empty: { padding: space.xl, color: app.label2 },
  barWrap: { position: 'sticky', bottom: 0, marginTop: 'auto' }
})

// Recents: the call log. A row dials back, its i opens the call card; Edit
// arms the minus and a Clear, and a tapped minus turns into a Delete, the
// same two-step a swipe ends in.

import { Section, Segmented, Text, Title } from '@doan-labs/duo-uikit'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import type { Recent } from './data.ts'
import { when } from './data.ts'
import { Glyph } from './glyphs.tsx'
import { place } from './store.ts'
import { styles } from './styles.ts'

export function Recents({
  recents,
  filter,
  onFilter,
  editing,
  onEdit,
  onClear,
  onDelete,
  onInfo
}: {
  recents: Recent[]
  filter: 'All' | 'Missed'
  onFilter: (f: 'All' | 'Missed') => void
  editing: boolean
  onEdit: (on: boolean) => void
  onClear: () => void
  onDelete: (id: string) => void
  onInfo: (id: string) => void
}) {
  // The minus arms a Delete: two taps, the same result as a full swipe.
  const [armed, setArmed] = useState('')
  const shown = recents.filter((r) => filter === 'All' || r.missed)
  const del = (id: string) => {
    onDelete(id)
    setArmed('')
  }
  return (
    <>
      <Title>
        Recents
        <Title as="span" variant="accessory" xstyle={[styles.hdrActs]}>
          <Segmented options={['All', 'Missed'] as const} value={filter} onChange={onFilter} />
          {editing ? (
            <button type="button" {...stylex.props(styles.plain)} onClick={() => onEdit(false)}>
              Done
            </button>
          ) : (
            <button type="button" {...stylex.props(styles.plain)} onClick={() => onEdit(true)}>
              Edit
            </button>
          )}
        </Title>
      </Title>
      {editing && !!shown.length && (
        <button type="button" {...stylex.props(styles.clearAll)} onClick={onClear}>
          Clear All Recents
        </button>
      )}
      <Section xstyle={[styles.list]}>
        {shown.map((r) => (
          <div key={r.id} {...stylex.props(styles.recRow)}>
            {editing && (
              <button
                type="button"
                aria-label={`Delete ${r.name}`}
                {...stylex.props(styles.minus)}
                onClick={() => setArmed(r.id)}
              >
                <Glyph name="minus" size={22} />
              </button>
            )}
            <button
              type="button"
              {...stylex.props(styles.recHit)}
              onClick={() =>
                armed === r.id
                  ? setArmed('')
                  : editing
                    ? setArmed(r.id)
                    : place({ number: r.number, contactId: r.contactId })
              }
            >
              <span {...stylex.props(styles.name, r.missed && styles.missed)}>{r.name}</span>
              <Text as="div" size="caption" xstyle={[styles.recSub]}>
                <span {...stylex.props(styles.recDir)}>
                  {r.dir === 'out' ? <Glyph name="callOut" size={11} /> : <Glyph name="callIn" size={11} />}
                </span>
                mobile · {when(r.at)}
              </Text>
            </button>
            {armed === r.id && editing ? (
              <button type="button" {...stylex.props(styles.deleteBtn)} onClick={() => del(r.id)}>
                Delete
              </button>
            ) : (
              <button
                type="button"
                aria-label={`${r.name} info`}
                {...stylex.props(styles.infoBtn)}
                onClick={() => onInfo(r.id)}
              >
                <Sym name="info" size={22} />
              </button>
            )}
          </div>
        ))}
        {!shown.length && <div {...stylex.props(styles.empty)}>No {filter === 'Missed' ? 'Missed ' : ''}Calls</div>}
      </Section>
    </>
  )
}

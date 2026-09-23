// The iPadOS sidebar: the account block, the root list as selectable
// destinations, and the search field floating over the end of the scroll. It
// renders the same `Group[]` the folded list pushes through, so a row exists in
// one place and shows up in both layouts.

import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { type Dest, Glyph, type Group } from './parts.tsx'
import { styles } from './styles.ts'

export function Sidebar({ groups, current, pick }: { groups: Group[]; current: string; pick: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const found = needle
    ? [{ rows: groups.flatMap((g) => g.rows).filter((r) => r.label.toLowerCase().includes(needle)) }]
    : groups
  return (
    <nav aria-label="Settings" {...stylex.props(styles.side)}>
      <div {...stylex.props(styles.sideScroll)}>
        <div {...stylex.props(styles.account)}>
          <span {...stylex.props(shared.rowIc, styles.tint(colors.grey), styles.avatar)}>
            <Sym name="person" size={26} />
          </span>
          <span>
            <div {...stylex.props(typography.headline)}>Apple Account</div>
            <div {...stylex.props(typography.footnote, styles.accountSub)}>
              Sign in to use iCloud and the App Store. Nothing signs in here.
            </div>
          </span>
        </div>
        {found.map((group, i) => (
          // The groups are positional: the root list is written out, not keyed data.
          // biome-ignore lint/suspicious/noArrayIndexKey: the list is literal and never reorders
          <div key={i}>
            {i > 0 && <div {...stylex.props(styles.destGap)} />}
            {group.rows.map((row) => (
              <DestRow key={row.id} dest={row} on={row.id === current} pick={pick} />
            ))}
          </div>
        ))}
        {found[0]?.rows.length === 0 && (
          <p {...stylex.props(shared.sub, styles.empty)}>No setting matches “{query.trim()}”.</p>
        )}
      </div>
      <div {...stylex.props(styles.find)}>
        <Sym name="search" size={15} />
        <input
          type="search"
          value={query}
          placeholder="Search"
          aria-label="Search Settings"
          onChange={(e) => setQuery(e.target.value)}
          {...stylex.props(styles.findField)}
        />
      </div>
    </nav>
  )
}

/** A destination, or - when it carries a switch instead of a pane - a plain line. */
function DestRow({ dest, on, pick }: { dest: Dest; on: boolean; pick: (id: string) => void }) {
  const body = (
    <>
      <Glyph name={dest.glyph} bg={dest.tint} />
      <span {...stylex.props(styles.destName)}>{dest.label}</span>
      {dest.detail != null && <span {...stylex.props(typography.subheadline, styles.destValue)}>{dest.detail}</span>}
      {dest.control}
    </>
  )
  return dest.page ? (
    <button
      type="button"
      aria-current={on || undefined}
      onClick={() => pick(dest.id)}
      {...stylex.props(styles.dest, styles.destLink, shared.select, on && styles.destOn)}
    >
      {body}
    </button>
  ) : (
    <div {...stylex.props(styles.dest)}>{body}</div>
  )
}

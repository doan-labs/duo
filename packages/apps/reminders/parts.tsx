// The pieces the sidebar and the cover's Lists page share: the smart-list
// tiles, a My Lists row, the tag chips, the search capsule and the context
// menu that shows a list's actions.

import { Menu, Sym } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { allTags, countFor, type GlyphKind, LIST_TINT, type RList, SMARTS } from './data.ts'
import { SmartGlyph } from './glyphs.tsx'
import { useEditLists, useGo, useListSheet, useLists, useQuery, useReminders } from './store.ts'
import { styles } from './styles.ts'

/** One dispatch for every smart-list badge: a tinted circle, its glyph inside. */
export const SmartBadge = ({ kind, tint, size = 30 }: { kind: GlyphKind; tint: string; size?: number }) => (
  <span {...stylex.props(styles.badge(tint, size))}>
    <SmartGlyph kind={kind} size={Math.round(size * 0.53)} tint={tint} back={tint} />
  </span>
)

// ---------- the five smart tiles ----------

export function Tiles({ sel, pick }: { sel?: string; pick: (dest: string) => void }) {
  const { items } = useReminders()
  return (
    <div {...stylex.props(styles.tiles)}>
      {SMARTS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => pick(s.id)}
          aria-current={sel === s.id || undefined}
          {...stylex.props(styles.tile, sel === s.id && styles.tileOn, shared.press)}
        >
          <SmartBadge kind={s.glyph} tint={s.tint} size={30} />
          <span {...stylex.props(styles.tileNum)}>{countFor(s.id, items)}</span>
          <span {...stylex.props(styles.tileName)}>{s.name}</span>
        </button>
      ))}
    </div>
  )
}

// ---------- My Lists ----------

function ListRow({
  list,
  count,
  on,
  last,
  pick,
  edit
}: {
  list: RList
  count: number
  on: boolean
  last?: boolean
  pick: () => void
  edit: () => void
}) {
  const [editing] = useEditLists()
  return (
    <button
      type="button"
      aria-current={on || undefined}
      onClick={editing ? edit : pick}
      {...stylex.props(styles.lrow, on && styles.lrowOn, shared.select)}
    >
      {editing && (
        <span {...stylex.props(styles.minus)}>
          <Sym name="minus" size={11} />
        </span>
      )}
      <span {...stylex.props(styles.badge(LIST_TINT[list.color], 29))}>
        <Sym name={list.icon} size={15} />
      </span>
      <span {...stylex.props(styles.lname)}>{list.name}</span>
      <span {...stylex.props(styles.lcount)}>{count}</span>
      <span {...stylex.props(styles.lchev)}>
        <Sym name="forward" size={12} />
      </span>
      {!last && <span {...stylex.props(styles.flatSep)} />}
    </button>
  )
}

/** The collection under the "My Lists" header, used by both layouts. */
export function MyLists({ sel }: { sel?: string }) {
  const { lists } = useLists()
  const { items } = useReminders()
  const { open } = useGo()
  const [, setSheet] = useListSheet()
  const [editing] = useEditLists()
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const menuList = lists.find((l) => l.id === menu?.id)
  return (
    <>
      {lists.map((l, i) => (
        <div
          key={l.id}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu({ id: l.id, x: e.clientX, y: e.clientY })
          }}
        >
          <ListRow
            list={l}
            count={items.filter((r) => r.list === l.id && !r.done).length}
            on={sel === `list:${l.id}`}
            last={i === lists.length - 1}
            pick={() => open(`list:${l.id}`)}
            edit={() => setSheet(l.id)}
          />
        </div>
      ))}
      {editing && (
        <button type="button" onClick={() => setSheet('new')} {...stylex.props(styles.lrow, shared.select)}>
          <span {...stylex.props(styles.badge(LIST_TINT.blue, 29))}>
            <Sym name="plus" size={15} />
          </span>
          <span {...stylex.props(styles.lname)}>Add List</span>
        </button>
      )}
      {menuList && menu && (
        <Menu
          open
          onClose={() => setMenu(null)}
          xstyle={styles.menuAt(menu.x, menu.y)}
          items={[
            { label: 'Edit List', icon: 'markup', onSelect: () => setSheet(menuList.id) },
            'separator',
            { label: 'Delete List', icon: 'trash', onSelect: () => setSheet(menuList.id) }
          ]}
        />
      )}
    </>
  )
}

// ---------- tags ----------

export function TagCloud({ sel }: { sel?: string }) {
  const { items } = useReminders()
  const { open } = useGo()
  const tags = allTags(items)
  if (!tags.length) return null
  return (
    <>
      <div {...stylex.props(styles.sideSec)}>Tags</div>
      <div {...stylex.props(styles.tagWrap)}>
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            aria-current={sel === `tag:${t}` || undefined}
            onClick={() => open(`tag:${t}`)}
            {...stylex.props(styles.tag, sel === `tag:${t}` && styles.tagOn, shared.press)}
          >
            #{t}
          </button>
        ))}
      </div>
    </>
  )
}

// ---------- the search capsule ----------

export function Find() {
  const [q, setQ] = useQuery()
  return (
    <label {...stylex.props(styles.sideFind)}>
      <Sym name="search" size={14} />
      <input
        type="search"
        value={q}
        placeholder="Search"
        aria-label="Search reminders"
        onChange={(e) => setQ(e.target.value)}
        {...stylex.props(styles.field)}
      />
      {q !== '' && (
        <button type="button" aria-label="Clear search" onClick={() => setQ('')} {...stylex.props(styles.clearBtn)}>
          <Sym name="close" size={11} />
        </button>
      )}
    </label>
  )
}

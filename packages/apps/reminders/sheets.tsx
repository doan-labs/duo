// The list editor sheet: the name field under a live badge preview, the
// colour dots and the glyph grid iOS shows, and Delete List when it is
// editing an existing one.

import { Sheet, Sym } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { LIST_COLORS, LIST_ICONS, LIST_TINT, type ListColor, type RList } from './data.ts'
import { useListSheet, useLists, useReminders } from './store.ts'
import { styles } from './styles.ts'

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function ListSheet() {
  const [sel, setSel] = useListSheet()
  const { lists, put, remove } = useLists()
  const { removeList } = useReminders()
  const editing = lists.find((l) => l.id === sel)
  const [name, setName] = useState('')
  const [color, setColor] = useState<ListColor>('blue')
  const [icon, setIcon] = useState<RList['icon']>('list')
  const [seen, setSeen] = useState<string | null>(null)

  // Re-arm the form each time the sheet reopens for another list.
  if (sel !== seen) {
    setSeen(sel)
    setName(editing?.name ?? '')
    setColor(editing?.color ?? 'blue')
    setIcon(editing?.icon ?? 'list')
  }
  if (!sel) return null

  const close = () => setSel()
  const commit = () => {
    const t = name.trim() || 'New List'
    put({ id: editing?.id ?? `l-${uid()}`, name: t, color, icon })
    close()
  }

  return (
    <Sheet open onClose={close} xstyle={styles.detSheet}>
      <div {...stylex.props(styles.detHead)}>
        <button type="button" onClick={close} {...stylex.props(styles.detDone, shared.press)}>
          Cancel
        </button>
        <span {...stylex.props(styles.detTitle)}>{editing ? 'List Info' : 'New List'}</span>
        <button type="button" onClick={commit} {...stylex.props(styles.detDone, shared.press)}>
          {editing ? 'Done' : 'Create'}
        </button>
      </div>
      <div {...stylex.props(styles.sheetPad)}>
        <div {...stylex.props(styles.sheetBadgeRow)}>
          <span {...stylex.props(styles.badge(LIST_TINT[color], 58))}>
            <Sym name={icon} size={30} />
          </span>
        </div>
        <input
          autoFocus
          value={name}
          placeholder="List Name"
          aria-label="List name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          {...stylex.props(styles.sheetName)}
        />
        <div>
          <div {...stylex.props(styles.segLabel)}>Colour</div>
          <div {...stylex.props(styles.pickGrid)}>
            {LIST_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                {...stylex.props(styles.dot(LIST_TINT[c], color === c), shared.press)}
              >
                {color === c && (
                  <span {...stylex.props(styles.dotCheck)}>
                    <Sym name="tick" size={13} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div {...stylex.props(styles.segLabel)}>Icon</div>
          <div {...stylex.props(styles.iconGrid)}>
            {LIST_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                aria-label={ic}
                aria-pressed={icon === ic}
                onClick={() => setIcon(ic)}
                {...stylex.props(styles.icBtn(icon === ic), shared.press)}
              >
                <Sym name={ic} size={19} />
              </button>
            ))}
          </div>
        </div>
        {editing && (
          <button
            type="button"
            onClick={() => {
              remove(editing.id)
              removeList(editing.id)
              close()
            }}
            {...stylex.props(styles.delRow, shared.press)}
          >
            Delete List
          </button>
        )}
      </div>
    </Sheet>
  )
}

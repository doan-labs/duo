// Favorites: tap calls, the i opens the card, and Edit swaps the list into
// minus-and-grip order mode where a grip drags a favorite to its new slot.

import { Section, Text, Title } from '@doan-labs/duo-uikit'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type PointerEvent, useRef } from 'react'
import type { Contact } from './data.ts'
import { fullName, initials } from './data.ts'
import { Glyph } from './glyphs.tsx'
import { place } from './store.ts'
import { styles } from './styles.ts'

export function Favorites({
  favorites,
  editing,
  onEdit,
  onInfo,
  onAdd,
  onRemove,
  onMove
}: {
  favorites: Contact[]
  editing: boolean
  onEdit: (on: boolean) => void
  onInfo: (id: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
  onMove: (id: string, to: number) => void
}) {
  const drag = useRef<{ id: string; from: number; y: number } | null>(null)
  const grip = (e: PointerEvent, id: string, index: number) => {
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    drag.current = { id, from: index, y: e.clientY }
  }
  const move = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    // 52 px a row; a drag through one moves the favorite one slot.
    const to = d.from + Math.round((e.clientY - d.y) / 52)
    onMove(d.id, to)
  }
  const drop = () => (drag.current = null)

  return (
    <>
      <Title>
        Favorites
        <Title as="span" variant="accessory">
          {editing ? (
            <button type="button" {...stylex.props(styles.plain)} onClick={() => onEdit(false)}>
              Done
            </button>
          ) : (
            <>
              <button type="button" aria-label="Add favorite" {...stylex.props(styles.plain)} onClick={onAdd}>
                <Sym name="plus" size={20} />
              </button>
              <button type="button" {...stylex.props(styles.plain)} onClick={() => onEdit(true)}>
                Edit
              </button>
            </>
          )}
        </Title>
      </Title>
      <Section xstyle={[styles.list]}>
        {favorites.map((c, i) => (
          <div key={c.id} {...stylex.props(styles.favRow)}>
            {editing ? (
              <button
                type="button"
                aria-label={`Remove ${fullName(c)}`}
                {...stylex.props(styles.minus)}
                onClick={() => onRemove(c.id)}
              >
                <Glyph name="minus" size={22} />
              </button>
            ) : (
              <span {...stylex.props(styles.mono)}>{initials(c)}</span>
            )}
            <button
              type="button"
              {...stylex.props(styles.favHit)}
              onClick={() => place({ number: c.phone, contactId: c.id })}
              disabled={editing}
            >
              <span {...stylex.props(styles.name)}>{fullName(c)}</span>
              <Text as="div" size="caption">
                mobile
              </Text>
            </button>
            {editing ? (
              <button
                type="button"
                {...stylex.props(styles.grip)}
                aria-label="Drag to reorder"
                onPointerDown={(e) => grip(e, c.id, i)}
                onPointerMove={move}
                onPointerUp={drop}
                onPointerCancel={drop}
              >
                <Glyph name="grip" size={18} />
              </button>
            ) : (
              <button
                type="button"
                aria-label={`${fullName(c)} info`}
                {...stylex.props(styles.infoBtn)}
                onClick={() => onInfo(c.id)}
              >
                <Sym name="info" size={22} />
              </button>
            )}
          </div>
        ))}
        {!favorites.length && <div {...stylex.props(styles.empty)}>No Favorites</div>}
      </Section>
    </>
  )
}

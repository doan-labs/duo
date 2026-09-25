// The pieces the panes share: a cover cell with its caption, a horizontal
// shelf of them, the reading progress line and the tinted action pill.

import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { Cover, type CoverSize } from './cover.tsx'
import type { Book } from './data.ts'
import { useLib } from './store.ts'
import { styles } from './styles.ts'
import { openBook } from './ui.ts'

/** The thin orange line under an in-progress cover. */
export const Progress = ({ id }: { id: string }) => {
  const p = useLib().progress[id]
  if (!p || p.frac <= 0 || p.frac >= 1) return null
  return (
    <div {...stylex.props(styles.prog)}>
      <div {...stylex.props(styles.progFill, styles.progW(Math.round(p.frac * 100)))} />
    </div>
  )
}

/** Cover plus the two caption lines a shelf carries under it. */
export const Cell = ({ b, size = 'm' }: { b: Book; size?: CoverSize }) => (
  <button type="button" {...stylex.props(styles.cell, shared.press)} onClick={() => openBook(b.id)}>
    <Cover b={b} size={size} />
    <span {...stylex.props(styles.cellTitle)}>{b.title}</span>
    <span {...stylex.props(styles.cellAuthor)}>{b.author}</span>
    <Progress id={b.id} />
  </button>
)

/** A titled, horizontally scrolling row of covers. */
export const Shelf = ({ title, books, size = 'm' }: { title?: string; books: Book[]; size?: CoverSize }) =>
  books.length ? (
    <section {...stylex.props(styles.shelfBox)}>
      {title ? <h2 {...stylex.props(styles.shelfTitle)}>{title}</h2> : null}
      <div {...stylex.props(styles.shelfRow)}>
        {books.map((b) => (
          <Cell key={b.id} b={b} size={size} />
        ))}
      </div>
    </section>
  ) : null

/** The store's GET pill; owned books read OPEN instead. */
export const GetButton = ({ b, onGet }: { b: Book; onGet: () => void }) => {
  const owned = useLib().owned.includes(b.id)
  return (
    <button
      type="button"
      {...stylex.props(styles.get, owned && styles.getOn, shared.press)}
      onClick={(e) => {
        e.stopPropagation()
        if (!owned) onGet()
        else openBook(b.id)
      }}
    >
      {owned ? 'OPEN' : 'GET'}
    </button>
  )
}

/** A list row: small cover, title, author, a right-side adornment. */
export const BookRow = ({ b, right, onClick }: { b: Book; right?: React.ReactNode; onClick?: () => void }) => (
  <button type="button" {...stylex.props(styles.brow, shared.press)} onClick={onClick ?? (() => openBook(b.id))}>
    <Cover b={b} size="s" />
    <span {...stylex.props(styles.browText)}>
      <span {...stylex.props(styles.browTitle)}>{b.title}</span>
      <span {...stylex.props(styles.browAuthor)}>{b.author}</span>
      <Progress id={b.id} />
    </span>
    {right}
  </button>
)

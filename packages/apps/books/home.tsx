// Home: the "Reading Now" hero and horizontal shelves underneath - Apple's
// first screen is the book you're in, then things it thinks you might open.

import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { Shelf } from './bits.tsx'
import { Cover } from './cover.tsx'
import { BOOKS, byId } from './data.ts'
import { readingNow, useLib } from './store.ts'
import { styles } from './styles.ts'
import { go, openBook, openReader } from './ui.ts'

const Hero = () => {
  const lib = useLib()
  const now = readingNow(lib)
  const book = (lib.last && now.find((b) => b.id === lib.last)) || now[0]
  if (!book) return null
  const frac = lib.progress[book.id]?.frac ?? 0
  return (
    <section {...stylex.props(styles.hero)}>
      <button type="button" {...stylex.props(styles.heroIn, shared.press)} onClick={() => openBook(book.id)}>
        <Cover b={book} size="xl" />
        <span {...stylex.props(styles.heroText)}>
          <span {...stylex.props(styles.heroKicker)}>Reading Now</span>
          <span {...stylex.props(styles.heroTitle)}>{book.title}</span>
          <span {...stylex.props(styles.heroAuthor)}>{book.author}</span>
          <span {...stylex.props(styles.heroMeta)}>
            <span {...stylex.props(styles.prog, styles.heroProg)}>
              <span {...stylex.props(styles.progFill, styles.progW(Math.round(frac * 100)))} />
            </span>
            {Math.round(frac * 100)}% read
          </span>
        </span>
      </button>
      <button type="button" {...stylex.props(styles.heroGo, shared.press)} onClick={() => openReader(book.id)}>
        <Sym name="bookOutline" size={14} />
        Continue
      </button>
    </section>
  )
}

export function Home() {
  const lib = useLib()
  const now = readingNow(lib)
  const [first, ...rest] = now
  const store = BOOKS.filter((b) => !lib.owned.includes(b.id))
  const because = first ? BOOKS.filter((b) => b.genre === first.genre && b.id !== first.id) : []
  const want = lib.want.map(byId)
  return (
    <>
      <h1 {...stylex.props(styles.headTitle)}>Home</h1>
      <Hero />
      {rest.length ? <Shelf title="Continue Reading" books={rest} /> : null}
      <Shelf title="From the Book Store" books={store} />
      {because.length ? <Shelf title={`Because You're Reading ${first!.title}`} books={because} /> : null}
      {want.length ? <Shelf title="Want to Read" books={want} /> : null}
      {!now.length && (
        <div {...stylex.props(styles.empty)}>
          <p {...stylex.props(styles.emptyTitle)}>No books in progress</p>
          <p {...stylex.props(styles.emptySub)}>Open something from your library or the Book Store to start reading.</p>
          <button type="button" {...stylex.props(styles.get, shared.press)} onClick={() => go('store')}>
            Book Store
          </button>
        </div>
      )}
    </>
  )
}

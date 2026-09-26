// The Book Store: a featured hero on top and genre shelves under it. Apple's
// classics sit under Free Charts, so everything here is a GET, not a price.

import { art } from '@doan-labs/duo-fixtures'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { GetButton } from './bits.tsx'
import { Cover } from './cover.tsx'
import { BOOKS, GENRES } from './data.ts'
import { own, useLib } from './store.ts'
import { styles } from './styles.ts'
import { openBook } from './ui.ts'

const Hero = () => {
  const b = BOOKS.find((x) => x.id === 'gatsby')!
  return (
    <section {...stylex.props(styles.shopHero, styles.bg(art(`${b.title} shop`, 30)))}>
      <div {...stylex.props(styles.shopShade)} />
      <button type="button" {...stylex.props(styles.shopHeroIn, shared.press)} onClick={() => openBook(b.id)}>
        <Cover b={b} size="xl" />
        <span {...stylex.props(styles.shopHeroText)}>
          <span {...stylex.props(styles.shopKicker)}>Featured Classic</span>
          <span {...stylex.props(styles.shopTitle)}>{b.title}</span>
          <span {...stylex.props(styles.shopAuthor)}>{b.author}</span>
        </span>
      </button>
      <span {...stylex.props(styles.shopGet)}>
        <GetButton b={b} onGet={() => own(b.id)} />
      </span>
    </section>
  )
}

const ShelfRow = ({ title, books }: { title: string; books: typeof BOOKS }) => {
  const lib = useLib()
  return (
    <section {...stylex.props(styles.shelfBox)}>
      <h2 {...stylex.props(styles.shelfTitle)}>{title}</h2>
      <div {...stylex.props(styles.shelfRow)}>
        {books.map((b) => (
          <div key={b.id} {...stylex.props(styles.shopCell)}>
            <button type="button" {...stylex.props(styles.cell, shared.press)} onClick={() => openBook(b.id)}>
              <Cover b={b} size="m" />
              <span {...stylex.props(styles.cellTitle)}>{b.title}</span>
              <span {...stylex.props(styles.cellAuthor)}>{b.author}</span>
              {lib.owned.includes(b.id) && <span {...stylex.props(styles.cellMeta)}>In Library</span>}
            </button>
            <GetButton b={b} onGet={() => own(b.id)} />
          </div>
        ))}
      </div>
    </section>
  )
}

export function Shop() {
  const lib = useLib()
  const free = BOOKS.filter((b) => !lib.owned.includes(b.id))
  return (
    <>
      <h1 {...stylex.props(styles.headTitle)}>Book Store</h1>
      <Hero />
      {free.length ? <ShelfRow title="Free Classics" books={free} /> : null}
      {GENRES.map((g) => (
        <ShelfRow key={g} title={g} books={BOOKS.filter((b) => b.genre === g)} />
      ))}
      <section {...stylex.props(styles.shopFoot)}>
        <Sym name="cart" size={18} />
        <span>Every classic in the store is free. GET adds it to your library.</span>
      </section>
    </>
  )
}

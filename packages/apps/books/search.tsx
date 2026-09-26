// Search: a field up top, genre tiles when it's empty, and title/author/
// genre hits once you type - the same query the sidebar field edits.

import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { BookRow, GetButton } from './bits.tsx'
import { Field } from './chrome.tsx'
import { BOOKS, GENRES } from './data.ts'
import { own, useLib } from './store.ts'
import { styles } from './styles.ts'
import { setQuery, useUi } from './ui.ts'

export function Search() {
  const ui = useUi()
  const lib = useLib()
  const q = ui.q.trim().toLowerCase()
  const hits = q ? BOOKS.filter((b) => `${b.title} ${b.author} ${b.genre}`.toLowerCase().includes(q)) : []
  return (
    <>
      <h1 {...stylex.props(styles.headTitle)}>Search</h1>
      <div {...stylex.props(styles.searchBox)}>
        <Field />
      </div>
      {!q ? (
        <>
          <h2 {...stylex.props(styles.shelfTitle)}>Browse Genres</h2>
          <div {...stylex.props(styles.genreGrid)}>
            {GENRES.map((g) => (
              <button key={g} type="button" {...stylex.props(styles.genre, shared.press)} onClick={() => setQuery(g)}>
                {g}
                <span {...stylex.props(styles.genreN)}>{BOOKS.filter((b) => b.genre === g).length}</span>
              </button>
            ))}
          </div>
        </>
      ) : hits.length ? (
        <div {...stylex.props(styles.hitList)}>
          {hits.map((b) => (
            <BookRow
              key={b.id}
              b={b}
              right={!lib.owned.includes(b.id) ? <GetButton b={b} onGet={() => own(b.id)} /> : undefined}
            />
          ))}
        </div>
      ) : (
        <div {...stylex.props(styles.empty)}>
          <p {...stylex.props(styles.emptyTitle)}>No results</p>
          <p {...stylex.props(styles.emptySub)}>Try a title, an author, or a genre like "Mystery".</p>
        </div>
      )}
    </>
  )
}

// The book page: the detail sheet pushed over the pane. Cover, the Read/Get
// pair, the heart, the description, the contents list, the info table and a
// more-by-the-author shelf, with an ellipsis menu for collections.

import { Menu, type MenuEntry } from '@doan-labs/duo-uikit/menu.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { Shelf } from './bits.tsx'
import { Cover } from './cover.tsx'
import { audioLength, BOOKS, byId, chapterStarts } from './data.ts'
import { own, toggleFinished, toggleOnShelf, toggleWant, useLib } from './store.ts'
import { styles } from './styles.ts'
import { openCard, openReader } from './ui.ts'

export function Detail({ id, back }: { id: string; back: () => void }) {
  const b = byId(id)
  const lib = useLib()
  const [menu, setMenu] = useState(false)
  const owned = lib.owned.includes(id)
  const wanted = lib.want.includes(id)
  const finished = lib.finished.includes(id)
  const frac = lib.progress[id]?.frac ?? 0
  const more = BOOKS.filter((x) => x.author === b.author && x.id !== id)
  const items: MenuEntry[] = [
    {
      label: 'Want to Read',
      icon: 'heart',
      checked: wanted,
      onSelect: () => toggleWant(id)
    },
    {
      label: 'Finished',
      icon: 'check',
      checked: finished,
      onSelect: () => toggleFinished(id)
    },
    'separator',
    ...lib.shelves.map(
      (s): MenuEntry => ({
        label: s.ids.includes(id) ? `Remove from ${s.name}` : `Add to ${s.name}`,
        icon: 'folder',
        onSelect: () => toggleOnShelf(s.id, id)
      })
    ),
    {
      label: 'New Collection...',
      icon: 'plus',
      onSelect: () => openCard('shelf')
    }
  ]
  return (
    <div {...stylex.props(styles.det)}>
      <div {...stylex.props(styles.detTop)}>
        <button type="button" aria-label="Back" {...stylex.props(styles.detBack, shared.press)} onClick={back}>
          <Sym name="back" size={18} />
        </button>
        <span {...stylex.props(styles.detTopTitle)}>{b.title}</span>
        <button
          type="button"
          aria-label="Book actions"
          aria-expanded={menu}
          {...stylex.props(styles.detBack, shared.press)}
          onClick={() => setMenu((m) => !m)}
        >
          <Sym name="ellipsis" size={17} />
        </button>
        <Menu open={menu} onClose={() => setMenu(false)} xstyle={[styles.detMenu]} items={items} />
      </div>
      <div {...stylex.props(styles.detScroll)}>
        <div {...stylex.props(styles.detHero)}>
          <Cover b={b} size="xl" />
          <h1 {...stylex.props(styles.detTitle)}>{b.title}</h1>
          <div {...stylex.props(styles.detAuthor)}>{b.author}</div>
          <div {...stylex.props(styles.detChips)}>
            <span {...stylex.props(styles.chip)}>{b.genre}</span>
            <span {...stylex.props(styles.chip)}>{b.year}</span>
            <span {...stylex.props(styles.chip)}>{b.pages} pages</span>
            {b.audio ? <span {...stylex.props(styles.chip)}>{audioLength(b)} audio</span> : null}
          </div>
          {frac > 0 && !finished && (
            <div {...stylex.props(styles.detProg)}>
              <div {...stylex.props(styles.prog)}>
                <div {...stylex.props(styles.progFill, styles.progW(Math.round(frac * 100)))} />
              </div>
              {Math.round(frac * 100)}% · {finished ? 'Finished' : 'In progress'}
            </div>
          )}
          <div {...stylex.props(styles.detBtns)}>
            <button
              type="button"
              {...stylex.props(styles.btn, shared.press)}
              onClick={() => (owned ? openReader(id) : own(id))}
            >
              {owned ? (frac > 0 ? 'Continue Reading' : 'Read') : 'Get · Free'}
            </button>
            <button
              type="button"
              aria-label="Want to Read"
              aria-pressed={wanted}
              {...stylex.props(styles.heart, wanted && styles.heartOn, shared.press)}
              onClick={() => toggleWant(id)}
            >
              <Sym name={wanted ? 'heartFill' : 'heart'} size={17} />
            </button>
          </div>
        </div>
        <section {...stylex.props(styles.detSec)}>
          <p {...stylex.props(styles.about)}>{b.about}</p>
        </section>
        <section {...stylex.props(styles.detSec)}>
          <h2 {...stylex.props(styles.detH)}>Contents</h2>
          <div {...stylex.props(styles.toc)}>
            {b.chapters.map((c, i) => (
              <button
                key={c.title}
                type="button"
                {...stylex.props(styles.tocRow, shared.press)}
                onClick={() => openReader(id, chapterStarts(b)[i])}
              >
                <span {...stylex.props(styles.tocN)}>{i + 1}</span>
                <span {...stylex.props(styles.tocT)}>{c.title}</span>
              </button>
            ))}
          </div>
        </section>
        <section {...stylex.props(styles.detSec)}>
          <h2 {...stylex.props(styles.detH)}>Information</h2>
          <div {...stylex.props(styles.info)}>
            {[
              ['Released', String(b.year)],
              ['Pages', String(b.pages)],
              ['Language', 'English'],
              ['Genre', b.genre],
              ['Publisher', 'Project Gutenberg'],
              ...(b.audio
                ? [
                    ['Narrator', b.audio.narrator],
                    ['Length', `${b.audio.hours} hr`]
                  ]
                : [])
            ].map(([k, v]) => (
              <div key={k} {...stylex.props(styles.infoRow)}>
                <span {...stylex.props(styles.infoK)}>{k}</span>
                <span {...stylex.props(styles.infoV)}>{v}</span>
              </div>
            ))}
          </div>
        </section>
        {more.length ? <Shelf title={`More by ${b.author}`} books={more} /> : null}
      </div>
    </div>
  )
}

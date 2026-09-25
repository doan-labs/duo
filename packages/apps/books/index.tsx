// Books: the app's own iPadOS chrome - a glass sidebar when the Duo is open
// and a floating tab bar on the cover - over panes for Home, Library, the
// Book Store, Audiobooks and Search, with a book page pushed on top and the
// reader above everything. Both displays share the module stores, so the fold
// keeps the same page, the same shelf and the same spot in the book.

import { Push } from '@doan-labs/duo-uikit/nav.tsx'
import { Sheet } from '@doan-labs/duo-uikit/sheet.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { TextField } from '@doan-labs/duo-uikit/text-field.tsx'
import { useWide } from '@doan-labs/duo-uikit/wide.ts'
import * as stylex from '@stylexjs/stylex'
import { useRef, useState } from 'react'
import { Audio, NowPlaying } from './audio.tsx'
import { Sidebar, Tabs } from './chrome.tsx'
import { Detail } from './detail.tsx'
import { Home } from './home.tsx'
import { Library } from './library.tsx'
import { Reader } from './reader.tsx'
import { Search } from './search.tsx'
import { Shop } from './shop.tsx'
import { addShelf } from './store.ts'
import { styles } from './styles.ts'
import { closeBook, openCard, useUi } from './ui.ts'

const Pane = ({ tab }: { tab: string }) => {
  if (tab === 'library' || tab.startsWith('shelf:')) return <Library shelf={tab === 'library' ? undefined : tab} />
  if (tab === 'store') return <Shop />
  if (tab === 'audio') return <Audio />
  if (tab === 'search') return <Search />
  return <Home />
}

/** The last-opened book keeps rendering while its sheet slides out. */
const DetailSheet = () => {
  const ui = useUi()
  const last = useRef(ui.detail)
  if (ui.detail) last.current = ui.detail
  return last.current ? <Detail id={last.current} back={closeBook} /> : null
}

const ReaderSheet = () => {
  const ui = useUi()
  const last = useRef(ui.reading)
  if (ui.reading) last.current = ui.reading
  return last.current ? <Reader id={last.current} /> : null
}

/** The New Collection card, shared by the sidebar's + and the book menu. */
const NewShelf = () => {
  const ui = useUi()
  const [name, setName] = useState('')
  const make = () => {
    const n = name.trim()
    if (n) addShelf(n)
    setName('')
    openCard(undefined)
  }
  return (
    <Sheet open={ui.card === 'shelf'} onClose={() => openCard(undefined)} xstyle={[styles.newShelf]}>
      <div {...stylex.props(styles.newShelfBody)}>
        <h2 {...stylex.props(styles.newShelfTitle)}>New Collection</h2>
        <TextField
          aria-label="Collection name"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && make()}
        />
        <button type="button" {...stylex.props(styles.btn, shared.press)} onClick={make}>
          Create
        </button>
      </div>
    </Sheet>
  )
}

export const Books = () => {
  const [ref, wide] = useWide<HTMLDivElement>()
  const ui = useUi()
  return (
    <div ref={ref} {...stylex.props(styles.root)}>
      <Push open={!!ui.reading} sheet={<ReaderSheet />}>
        <div {...stylex.props(styles.fill)}>
          <Push open={!!ui.detail} sheet={<DetailSheet />}>
            <div {...stylex.props(styles.scroll, wide && styles.paneSide, !wide && styles.paneScroll)}>
              <Pane tab={ui.tab} />
            </div>
          </Push>
          {ui.detail || ui.reading ? null : wide ? <Sidebar /> : <Tabs />}
          {ui.reading ? null : <NowPlaying />}
          <NewShelf />
        </div>
      </Push>
    </div>
  )
}

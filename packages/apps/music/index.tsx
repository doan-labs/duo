// Music. The app's own shape on the Duo, taken from Apple Music: a sidebar of
// sections beside the pane on a wide box, a floating tab bar plus the separate
// search circle under it on the cover, the mini player floating over
// whichever, and the Now Playing sheet above them all. Home leads with the
// catalog's newest shelf; New and Radio present it as editorial and as
// stations; Library, Search and the pushed pages are the catalog itself.
//
// `nowPlaying` and `useNowPlaying` keep their old contract: Control Center and
// the launch cues drive the same deck the app's own chrome reads.

import { art, mmss } from '@doan-labs/duo-fixtures'
import { ALBUMS, type Album } from '@doan-labs/duo-fixtures/tracks.ts'
import type { Os } from '@doan-labs/duo-sdk'
import { LargeTitle, Placeholder, Screen, useWide } from '@doan-labs/duo-uikit'
import { Nav, useNav } from '@doan-labs/duo-uikit/nav.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useState } from 'react'
import { albumOf, byArtist, CATEGORIES, type Collection, MIXES, newest, STATIONS, search } from './data.ts'
import { nowPlaying, useNowPlaying } from './deck.ts'
import { Glyph, type GlyphName } from './glyphs.tsx'
import { MiniPlayer } from './mini-player.tsx'
import { NowPlaying } from './now-playing.tsx'
import {
  AlbumGrid,
  AlbumPage,
  ArtistPage,
  ListPage,
  ListView,
  type Open,
  PlaylistPage,
  PlaylistView
} from './pages.tsx'
import { styles } from './styles.ts'
import { Collage, Field, Shelf, SongRow, Tile } from './widgets.tsx'

export { nowPlaying, useNowPlaying }

/** A sidebar row or tab: either a Sym name or one of the app's own glyphs. */
type Sec = { key: string; label: string; sym?: SymProps['name']; glyph?: GlyphName }

const MAIN: Sec[] = [
  { key: 'home', label: 'Home', glyph: 'home' },
  { key: 'new', label: 'New', sym: 'collections' },
  { key: 'radio', label: 'Radio', sym: 'antenna' }
]

const LIBRARY: Sec[] = [
  { key: 'recent', label: 'Recently Added', sym: 'clockSym' },
  { key: 'artists', label: 'Artists', sym: 'people' },
  { key: 'albums', label: 'Albums', sym: 'albums' },
  { key: 'songs', label: 'Songs', glyph: 'note' },
  { key: 'madeforyou', label: 'Made For You', sym: 'star' }
]

/** The cover's four tabs; search is the circle beside the bar, as on the phone. */
const TABS: Sec[] = [...MAIN, { key: 'library', label: 'Library', sym: 'albums' }]

const titleOf = (view: string) => {
  if (view === 'search') return 'Search'
  if (view.startsWith('mix:')) return view.slice(4)
  return (TABS.find((s) => s.key === view) ?? LIBRARY.find((s) => s.key === view))?.label ?? 'Music'
}

const Icon = ({ s, size = 16 }: { s: Sec; size?: number }) =>
  s.glyph ? <Glyph name={s.glyph} size={size} /> : <Sym name={s.sym!} size={size} />

export const Music = (_: { os: Os }) => <Shell />

function Shell() {
  const d = useNowPlaying()
  const [box, wide] = useWide()
  const [section, setSection] = useState('home')
  const [query, setQuery] = useState('')
  const [np, setNp] = useState(false)
  const q = query.trim().toLowerCase()
  // Any text in the field reads as a search, whichever section the pane was on.
  const view = q ? 'search' : section
  return (
    <div ref={box} {...stylex.props(styles.shell, wide && styles.shellWide)}>
      {wide && <Sidebar section={view} onPick={setSection} query={query} onQuery={setQuery} />}
      <div {...stylex.props(styles.pane)}>
        {/* Keyed on the section: picking another one drops the page that was pushed over it. */}
        <Nav key={view}>
          <Pane view={view} wide={wide} query={query} onQuery={setQuery} />
        </Nav>
      </div>
      {d.started && !np && <MiniPlayer wide={wide} onOpen={() => setNp(true)} />}
      {!wide && (
        <nav aria-label="Music sections" {...stylex.props(styles.tabs)}>
          {TABS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-current={s.key === view ? 'page' : undefined}
              onClick={() => {
                setSection(s.key)
                setQuery('')
              }}
              {...stylex.props(styles.tab, s.key === view && styles.tabOn, shared.press)}
            >
              <Icon s={s} size={20} />
              {s.label}
            </button>
          ))}
        </nav>
      )}
      {!wide && (
        <button
          type="button"
          aria-label="Search"
          aria-current={view === 'search' ? 'page' : undefined}
          {...stylex.props(styles.searchOrb, view === 'search' && styles.tabOn, shared.press)}
          onClick={() => setSection('search')}
        >
          <Sym name="search" size={18} />
        </button>
      )}
      <NowPlaying open={np} onClose={() => setNp(false)} wide={wide} />
    </div>
  )
}

/** The wide box's chrome: the field, the sections, the library group, the mixes. */
function Sidebar({
  section,
  onPick,
  query,
  onQuery
}: {
  section: string
  onPick: (key: string) => void
  query: string
  onQuery: (q: string) => void
}) {
  const row = (s: Sec) => (
    <button
      key={s.key}
      type="button"
      aria-current={s.key === section ? 'page' : undefined}
      onClick={() => onPick(s.key)}
      {...stylex.props(styles.sideRow, s.key === section && styles.sideRowOn, shared.select)}
    >
      <Icon s={s} size={16} />
      <span {...stylex.props(styles.sideLabel)}>{s.label}</span>
    </button>
  )
  return (
    <nav aria-label="Music sections" {...stylex.props(styles.side)}>
      <Field value={query} onChange={onQuery} placeholder="Search" />
      <div {...stylex.props(styles.sideList)}>
        {MAIN.map(row)}
        <div {...stylex.props(styles.sideSec)}>Library</div>
        {LIBRARY.map(row)}
        <div {...stylex.props(styles.sideSec)}>Playlists</div>
        {MIXES.map((c) => (
          <button
            key={c.name}
            type="button"
            aria-current={`mix:${c.name}` === section ? 'page' : undefined}
            onClick={() => onPick(`mix:${c.name}`)}
            {...stylex.props(styles.sideRow, `mix:${c.name}` === section && styles.sideRowOn, shared.select)}
          >
            <Sym name="list" size={16} />
            <span {...stylex.props(styles.sideLabel)}>{c.name}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function Pane({
  view,
  wide,
  query,
  onQuery
}: {
  view: string
  wide: boolean
  query: string
  onQuery: (q: string) => void
}) {
  const d = useNowPlaying()
  const { push } = useNav()
  const open: Open = {
    // A pushed page's own chrome pads clear of the floating sidebar so its
    // Back stays tappable; the slide-under itself is decision 86's.
    album: (a) =>
      push((back) => (
        <div {...stylex.props(styles.pgPush, wide && styles.pgPushSide)}>
          <AlbumPage a={a} back={back} open={open} />
        </div>
      )),
    artist: (n) =>
      push((back) => (
        <div {...stylex.props(styles.pgPush, wide && styles.pgPushSide)}>
          <ArtistPage name={n} back={back} open={open} />
        </div>
      )),
    mix: (c) =>
      push((back) => (
        <div {...stylex.props(styles.pgPush, wide && styles.pgPushSide)}>
          <PlaylistPage c={c} back={back} open={open} />
        </div>
      )),
    list: (k) =>
      push((back) => (
        <div {...stylex.props(styles.pgPush, wide && styles.pgPushSide)}>
          <ListPage k={k} back={back} open={open} />
        </div>
      ))
  }
  /** Stations deal themselves shuffled under their own name; tiles just name them. */
  const playStation = (c: Collection) =>
    d.play(c.tracks, Math.floor(Math.random() * c.tracks.length), { name: c.name, shuffled: true })

  let body: ReactNode
  if (view === 'home') body = <Home open={open} />
  else if (view === 'new') body = <New open={open} />
  else if (view === 'radio') body = <Radio onPlay={playStation} />
  else if (view === 'library') body = <Library onPick={open.list} open={open} />
  else if (view === 'search') body = <SearchPane wide={wide} query={query} onQuery={onQuery} open={open} />
  else if (view.startsWith('mix:')) {
    const c = MIXES.find((m) => `mix:${m.name}` === view)
    body = c ? <PlaylistView c={c} open={open} /> : <Placeholder>Playlist not found.</Placeholder>
  } else body = <ListView k={view} open={open} />

  return (
    <Screen xstyle={[styles.paneRoot, wide ? styles.paneSide : d.started ? styles.paneScrollMini : styles.paneScroll]}>
      <div {...stylex.props(styles.top)}>
        <LargeTitle as="h1">{titleOf(view)}</LargeTitle>
      </div>
      {body}
    </Screen>
  )
}

/** The cover's Library: the five lists, then the shelf of what was added last. */
function Library({ onPick, open }: { onPick: (key: string) => void; open: Open }) {
  return (
    <>
      <div {...stylex.props(styles.libList)}>
        {LIBRARY.map((s) => (
          <button
            key={s.key}
            type="button"
            {...stylex.props(styles.libRow, shared.press)}
            onClick={() => onPick(s.key)}
          >
            <span {...stylex.props(styles.libIc)}>
              <Icon s={s} size={16} />
            </span>
            <span {...stylex.props(styles.libLabel)}>{s.label}</span>
            <Sym name="forward" size={13} />
          </button>
        ))}
      </div>
      <Shelf title="Recently Added" onMore={() => onPick('recent')}>
        {newest(6).map((a) => (
          <Tile
            key={a.title}
            media={<img src={a.cover} alt="" {...stylex.props(styles.tileArt)} />}
            title={a.title}
            sub={a.artist}
            onPress={() => open.album(a)}
          />
        ))}
      </Shelf>
    </>
  )
}

/** Home: the catalog's own shelves — its picks, its recents, its mixes, its stations. */
function Home({ open }: { open: Open }) {
  const d = useNowPlaying()
  const recent = [...new Map(d.history.map((t) => [t.album, albumOf(t)!])).values()]
    .filter((a): a is Album => !!a)
    .slice(0, 10)
  return (
    <>
      <Shelf title="Top Picks">
        {newest(8).map((a) => (
          <Tile
            key={a.title}
            xstyle={styles.tileBig}
            media={<img src={a.cover} alt="" {...stylex.props(styles.tileArt)} />}
            title={a.title}
            sub={a.artist}
            onPress={() => open.album(a)}
          />
        ))}
      </Shelf>
      {recent.length > 0 && (
        <Shelf title="Recently Played">
          {recent.map((a) => (
            <Tile
              key={a.title}
              media={<img src={a.cover} alt="" {...stylex.props(styles.tileArt)} />}
              title={a.title}
              sub={a.artist}
              onPress={() => open.album(a)}
            />
          ))}
        </Shelf>
      )}
      <Shelf title="Made For You">
        {MIXES.map((c) => (
          <Tile
            key={c.name}
            media={<Collage arts={c.arts} xstyle={styles.tileArt} />}
            title={c.name}
            sub={c.blurb}
            onPress={() => open.mix(c)}
          />
        ))}
      </Shelf>
      <Shelf title="New Releases">
        {[...newest()].reverse().map((a) => (
          <Tile
            key={a.title}
            media={<img src={a.cover} alt="" {...stylex.props(styles.tileArt)} />}
            title={a.title}
            sub={a.artist}
            onPress={() => open.album(a)}
          />
        ))}
      </Shelf>
    </>
  )
}

/** New: the featured release over the latest shelves and the newest songs. */
function New({ open }: { open: Open }) {
  const featured = newest(1)[0]!
  const fresh = newest(3)
    .flatMap((a) => a.tracks)
    .slice(0, 8)
  return (
    <>
      <div {...stylex.props(styles.heroWrap)}>
        <button type="button" {...stylex.props(styles.hero, shared.press)} onClick={() => open.album(featured)}>
          <img src={featured.cover} alt="" {...stylex.props(styles.heroImg)} />
          <span {...stylex.props(styles.heroShade)} />
          <span {...stylex.props(styles.heroText)}>
            <span {...stylex.props(styles.heroKicker)}>Featured Album</span>
            <span {...stylex.props(styles.heroTitle)}>{featured.title}</span>
            <span {...stylex.props(styles.heroSub)}>
              {featured.artist}
              {featured.year ? ` · ${featured.year}` : ''}
            </span>
          </span>
        </button>
      </div>
      <Shelf title="Latest Albums">
        {newest(8).map((a) => (
          <Tile
            key={a.title}
            media={<img src={a.cover} alt="" {...stylex.props(styles.tileArt)} />}
            title={a.title}
            sub={a.artist}
            onPress={() => open.album(a)}
          />
        ))}
      </Shelf>
      <div {...stylex.props(styles.shelfHead)}>
        <h2 {...stylex.props(styles.shelfTitle)}>New Songs</h2>
      </div>
      <div {...stylex.props(styles.songWrap)}>
        {fresh.map((t) => (
          <SongRow key={t.src} t={t} list={fresh} name="New Songs" showArt />
        ))}
      </div>
      <Shelf title="More Releases">
        {[...ALBUMS].reverse().map((a) => (
          <Tile
            key={a.title}
            media={<img src={a.cover} alt="" {...stylex.props(styles.tileArt)} />}
            title={a.title}
            sub={a.artist}
            onPress={() => open.album(a)}
          />
        ))}
      </Shelf>
    </>
  )
}

/** Radio: the live card over the station list — every one plays the moment it is picked. */
function Radio({ onPlay }: { onPlay: (c: Collection) => void }) {
  const d = useNowPlaying()
  const live = STATIONS[0]!
  return (
    <>
      <div {...stylex.props(styles.heroWrap)}>
        <button type="button" {...stylex.props(styles.liveCard, shared.press)} onClick={() => onPlay(live)}>
          <Collage arts={live.arts} xstyle={styles.liveArt} />
          <span {...stylex.props(styles.liveMain)}>
            <span {...stylex.props(styles.heroChip)}>Live</span>
            <span {...stylex.props(styles.liveTitle)}>{live.name}</span>
            <span {...stylex.props(styles.heroSub)}>{live.blurb}</span>
          </span>
          <span {...stylex.props(styles.liveGo)}>
            <Glyph name="play" size={16} />
          </span>
        </button>
      </div>
      <div {...stylex.props(styles.shelfHead)}>
        <h2 {...stylex.props(styles.shelfTitle)}>Stations</h2>
      </div>
      <div {...stylex.props(styles.songWrap)}>
        {STATIONS.map((s) => {
          const on = d.started && d.context === s.name
          return (
            <button
              key={s.name}
              type="button"
              {...stylex.props(styles.song, shared.press)}
              onClick={() => (on ? d.toggle() : onPlay(s))}
            >
              <Collage arts={s.arts} xstyle={styles.songArt} />
              <span {...stylex.props(styles.songMain)}>
                <span {...stylex.props(styles.songName, on && styles.songLive)}>{s.name}</span>
                <span {...stylex.props(styles.songSub)}>{s.blurb}</span>
              </span>
              <Glyph name={on && d.playing ? 'pause' : 'play'} size={16} />
            </button>
          )
        })}
      </div>
    </>
  )
}

/** Search: the categories the catalog can answer, or the results when there is text. */
function SearchPane({
  wide,
  query,
  onQuery,
  open
}: {
  wide: boolean
  query: string
  onQuery: (q: string) => void
  open: Open
}) {
  const q = query.trim().toLowerCase()
  const r = q ? search(q) : null
  return (
    <>
      {!wide && (
        <Field value={query} onChange={onQuery} placeholder="Artists, songs and albums" xstyle={styles.searchTop} />
      )}
      {r ? (
        <Results r={r} open={open} />
      ) : (
        <>
          <div {...stylex.props(styles.shelfHead)}>
            <h2 {...stylex.props(styles.shelfTitle)}>Browse Categories</h2>
          </div>
          <div {...stylex.props(styles.catGrid)}>
            {CATEGORIES.map((c) => (
              <button
                key={c.name}
                type="button"
                {...stylex.props(styles.catTile, styles.catBg(art(c.name)), shared.press)}
                onClick={() => open.list(`genre:${c.name}`)}
              >
                <span {...stylex.props(styles.catShade)} />
                <span {...stylex.props(styles.catName)}>{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/** Search results: the best single match as a card, then Songs, Albums and Artists. */
function Results({ r, open }: { r: ReturnType<typeof search>; open: Open }) {
  const d = useNowPlaying()
  const top = r.albums[0] ?? null
  const topArtist = !top ? (r.artists[0] ?? null) : null
  const topSong = !top && !topArtist ? (r.songs[0] ?? null) : null
  const none = !top && !topArtist && !topSong && !r.songs.length
  return (
    <>
      {(top || topArtist || topSong) && (
        <div {...stylex.props(styles.shelfHead)}>
          <h2 {...stylex.props(styles.shelfTitle)}>Top Result</h2>
        </div>
      )}
      {top && (
        <button type="button" {...stylex.props(styles.topCard, shared.press)} onClick={() => open.album(top)}>
          <img src={top.cover} alt="" {...stylex.props(styles.topArt)} />
          <span {...stylex.props(styles.songMain)}>
            <span {...stylex.props(styles.topName)}>{top.title}</span>
            <span {...stylex.props(styles.songSub)}>
              Album · {top.artist}
              {top.year ? ` · ${top.year}` : ''}
            </span>
          </span>
        </button>
      )}
      {topArtist && (
        <button type="button" {...stylex.props(styles.topCard, shared.press)} onClick={() => open.artist(topArtist)}>
          <Collage arts={byArtist(topArtist).map((a) => a.cover)} xstyle={styles.topArt} />
          <span {...stylex.props(styles.songMain)}>
            <span {...stylex.props(styles.topName)}>{topArtist}</span>
            <span {...stylex.props(styles.songSub)}>Artist</span>
          </span>
        </button>
      )}
      {topSong && (
        <button
          type="button"
          {...stylex.props(styles.topCard, shared.press)}
          onClick={() => d.play([topSong], 0, { name: 'Search' })}
        >
          <img src={topSong.cover} alt="" {...stylex.props(styles.topArt)} />
          <span {...stylex.props(styles.songMain)}>
            <span {...stylex.props(styles.topName)}>{topSong.title}</span>
            <span {...stylex.props(styles.songSub)}>
              Song · {topSong.artist} · {mmss(topSong.secs)}
            </span>
          </span>
        </button>
      )}
      {r.songs.length > 1 && (
        <>
          <div {...stylex.props(styles.shelfHead)}>
            <h2 {...stylex.props(styles.shelfTitle)}>Songs</h2>
          </div>
          <div {...stylex.props(styles.songWrap)}>
            {r.songs.slice(0, 8).map((t) => (
              <SongRow key={t.src} t={t} list={r.songs} name="Search" showArt />
            ))}
          </div>
        </>
      )}
      {r.albums.length > 0 && (
        <>
          <div {...stylex.props(styles.shelfHead)}>
            <h2 {...stylex.props(styles.shelfTitle)}>Albums</h2>
          </div>
          <AlbumGrid albums={r.albums} open={open} />
        </>
      )}
      {r.artists.length > 0 && (
        <>
          <div {...stylex.props(styles.shelfHead)}>
            <h2 {...stylex.props(styles.shelfTitle)}>Artists</h2>
          </div>
          <div {...stylex.props(styles.songWrap)}>
            {r.artists.map((a) => (
              <button key={a} type="button" {...stylex.props(styles.song, shared.press)} onClick={() => open.artist(a)}>
                <Collage arts={byArtist(a).map((x) => x.cover)} xstyle={styles.songArt} />
                <span {...stylex.props(styles.songMain)}>
                  <span {...stylex.props(styles.songName)}>{a}</span>
                  <span {...stylex.props(styles.songSub)}>
                    {byArtist(a).length} {byArtist(a).length === 1 ? 'release' : 'releases'}
                  </span>
                </span>
                <Sym name="forward" size={13} />
              </button>
            ))}
          </div>
        </>
      )}
      {none && <Placeholder xstyle={styles.center}>No results.</Placeholder>}
    </>
  )
}

// The pushed pages: an album's track list under its art, an artist's top
// songs over their releases, a mix's shelf of songs, and the lists Library
// names. Every page gets the deck's queue when it needs one, so a tap here is
// a tap in a real queue, never a lone preview.

import { ALBUMS, type Album, TRACKS, type Track } from '@doan-labs/duo-fixtures/tracks.ts'
import { Page } from '@doan-labs/duo-uikit/nav.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { ARTISTS, byArtist, CATEGORIES, type Collection, MIXES, newest } from './data.ts'
import { styles } from './styles.ts'
import { Collage, PlayPills, Shelf, SongRow, Tile } from './widgets.tsx'

/** Where a page sends the pane: another page to push. */
export type Open = {
  album: (a: Album) => void
  artist: (name: string) => void
  mix: (c: Collection) => void
  list: (key: string) => void
}

const totalMins = (tracks: Track[]) => Math.max(1, Math.round(tracks.reduce((n, t) => n + t.secs, 0) / 60))

/** An album's page: its art and count first, then every track in order. */
export function AlbumPage({ a, back, open }: { a: Album; back: () => void; open: Open }) {
  return (
    <Page title={a.title} back={back}>
      <div {...stylex.props(styles.alh)}>
        <img src={a.cover} alt="" {...stylex.props(styles.alhArt)} />
        <div {...stylex.props(styles.alhTitle)}>{a.title}</div>
        <button
          type="button"
          {...stylex.props(styles.bare, styles.alhArtist, shared.press)}
          onClick={() => open.artist(a.artist)}
        >
          {a.artist}
        </button>
        <div {...stylex.props(styles.alhMeta)}>
          {a.genre}
          {a.year ? ` · ${a.year}` : ''}
        </div>
        <PlayPills name={a.title} tracks={a.tracks} />
      </div>
      <div {...stylex.props(styles.tracks)}>
        {a.tracks.map((t, i) => (
          <SongRow key={t.src} t={t} list={a.tracks} name={a.title} index={i} sub="" />
        ))}
      </div>
      <div {...stylex.props(styles.alhFoot)}>
        {a.year ? `${a.year} · ` : ''}
        {a.tracks.length} songs, {totalMins(a.tracks)} min
        <br />℗ {a.license} · {new URL(a.source).host}
      </div>
      {byArtist(a.artist).filter((o) => o !== a).length > 0 && (
        <Shelf title={`More by ${a.artist}`}>
          {byArtist(a.artist)
            .filter((o) => o !== a)
            .map((o) => (
              <Tile
                key={o.title}
                media={<img src={o.cover} alt="" {...stylex.props(styles.tileArt)} />}
                title={o.title}
                sub={o.year ? String(o.year) : o.genre}
                onPress={() => open.album(o)}
              />
            ))}
        </Shelf>
      )}
    </Page>
  )
}

/** An artist's page: their name, their five first tracks, their releases. */
export function ArtistPage({ name, back, open }: { name: string; back: () => void; open: Open }) {
  const albums = byArtist(name)
  const top = albums.flatMap((a) => a.tracks).slice(0, 5)
  return (
    <Page title={name} back={back}>
      <div {...stylex.props(styles.alh)}>
        <Collage arts={albums.map((a) => a.cover)} xstyle={styles.alhCollage} />
        <div {...stylex.props(styles.alhTitle)}>{name}</div>
        <div {...stylex.props(styles.alhMeta)}>
          {albums.length} {albums.length === 1 ? 'release' : 'releases'} ·{' '}
          {albums.reduce((n, a) => n + a.tracks.length, 0)} songs
        </div>
        <PlayPills name={name} tracks={albums.flatMap((a) => a.tracks)} />
      </div>
      <div {...stylex.props(styles.shelfHead)}>
        <h2 {...stylex.props(styles.shelfTitle)}>Top Songs</h2>
      </div>
      <div {...stylex.props(styles.songWrap)}>
        {top.map((t) => (
          <SongRow key={t.src} t={t} list={top} name={`${name}: Top Songs`} showArt />
        ))}
      </div>
      <Shelf title="Albums">
        {albums.map((a) => (
          <Tile
            key={a.title}
            media={<img src={a.cover} alt="" {...stylex.props(styles.tileArt)} />}
            title={a.title}
            sub={a.year ? String(a.year) : a.genre}
            onPress={() => open.album(a)}
          />
        ))}
      </Shelf>
    </Page>
  )
}

/** A mix's contents without chrome: the sidebar draws it inside the pane's own title. */
export function PlaylistView({ c, open }: { c: Collection; open: Open }) {
  return (
    <>
      <div {...stylex.props(styles.alh)}>
        <Collage arts={c.arts} xstyle={styles.alhCollage} />
        <div {...stylex.props(styles.alhTitle)}>{c.name}</div>
        <div {...stylex.props(styles.alhMeta)}>{c.blurb}</div>
        <PlayPills name={c.name} tracks={c.tracks} />
      </div>
      <div {...stylex.props(styles.tracks)}>
        {c.tracks.map((t) => (
          <SongRow key={t.src} t={t} list={c.tracks} name={c.name} showArt />
        ))}
      </div>
      <div {...stylex.props(styles.alhFoot)}>
        {c.tracks.length} songs, {totalMins(c.tracks)} min
      </div>
      <Shelf title="Featured On">
        {ALBUMS.filter((a) => a.tracks.some((t) => c.tracks.includes(t)))
          .slice(0, 8)
          .map((a) => (
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

/** A mix or station opened: its collage, its name and what it is, then every song in it. */
export function PlaylistPage({ c, back, open }: { c: Collection; back?: () => void; open: Open }) {
  return (
    <Page title={c.name} back={back}>
      <PlaylistView c={c} open={open} />
    </Page>
  )
}

/**
 * The shelves Library names as lists: recent releases, the roster, everything,
 * the mixes, and the shelf a browse category names. Rendered inside a pushed
 * Page on the cover, and in place as the pane's body when the sidebar picks it.
 */
export function ListView({ k, open }: { k: string; open: Open }) {
  if (k.startsWith('genre:')) {
    // A browse category's name is its own label, not a genre, so look the
    // category up whole; splitting it loses 'Singer-Songwriter' to 'Folk'.
    const cat = CATEGORIES.find((c) => `genre:${c.name}` === k)
    const albums = cat?.albums ?? []
    const songs = albums.flatMap((a) => a.tracks)
    return (
      <>
        <AlbumGrid albums={albums} open={open} />
        <div {...stylex.props(styles.songWrap)}>
          {songs.map((t) => (
            <SongRow key={t.src} t={t} list={songs} name={cat?.name} showArt />
          ))}
        </div>
      </>
    )
  }
  if (k === 'artists')
    return (
      <div {...stylex.props(styles.songWrap)}>
        {ARTISTS.map((a) => {
          const releases = byArtist(a)
          return (
            <button key={a} type="button" {...stylex.props(styles.song, shared.press)} onClick={() => open.artist(a)}>
              <Collage arts={releases.map((r) => r.cover)} xstyle={styles.songArt} />
              <span {...stylex.props(styles.songMain)}>
                <span {...stylex.props(styles.songName)}>{a}</span>
                <span {...stylex.props(styles.songSub)}>
                  {releases.length} {releases.length === 1 ? 'release' : 'releases'}
                </span>
              </span>
              <Sym name="forward" size={13} />
            </button>
          )
        })}
      </div>
    )
  if (k === 'songs')
    return (
      <div {...stylex.props(styles.songWrap)}>
        {TRACKS.map((t, i) => (
          <SongRow key={t.src} t={t} list={TRACKS} name="Songs" index={i} showArt />
        ))}
      </div>
    )
  if (k === 'madeforyou')
    return (
      <div {...stylex.props(styles.songWrap)}>
        {MIXES.map((c) => (
          <button key={c.name} type="button" {...stylex.props(styles.song, shared.press)} onClick={() => open.mix(c)}>
            <Collage arts={c.arts} xstyle={styles.songArt} />
            <span {...stylex.props(styles.songMain)}>
              <span {...stylex.props(styles.songName)}>{c.name}</span>
              <span {...stylex.props(styles.songSub)}>{c.blurb}</span>
            </span>
            <Sym name="forward" size={13} />
          </button>
        ))}
      </div>
    )
  if (k === 'albums') return <AlbumGrid albums={ALBUMS} open={open} />
  return <AlbumGrid albums={newest()} open={open} />
}

const PAGE_TITLE: Record<string, string> = {
  recent: 'Recently Added',
  artists: 'Artists',
  albums: 'Albums',
  songs: 'Songs',
  madeforyou: 'Made For You'
}

/** A Library list pushed over the cover's pane; the wide sidebar renders `ListView` in place. */
export function ListPage({ k, back, open }: { k: string; back: () => void; open: Open }) {
  const title = k.startsWith('genre:') ? k.slice('genre:'.length) : (PAGE_TITLE[k] ?? 'Library')
  return (
    <Page title={title} back={back}>
      <ListView k={k} open={open} />
    </Page>
  )
}

/** The 2-across grid of albums used by Recently Added and a genre's page. */
export function AlbumGrid({ albums, open }: { albums: Album[]; open: Open }) {
  return (
    <div {...stylex.props(styles.grid)}>
      {albums.map((a) => (
        <button key={a.title} type="button" {...stylex.props(styles.tile, shared.press)} onClick={() => open.album(a)}>
          <img src={a.cover} alt="" {...stylex.props(styles.tileArt)} />
          <span {...stylex.props(styles.tileName)}>{a.title}</span>
          <span {...stylex.props(styles.tileSub)}>{a.artist}</span>
        </button>
      ))}
    </div>
  )
}

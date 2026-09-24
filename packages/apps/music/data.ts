// The catalog's derived shelves: artists, mixes, stations and browse
// categories over the real releases in fixtures/tracks. Everything a card
// names is the thing the card plays; nothing here invents a chart position,
// a rating or a listener count.

import { ALBUMS, type Album, TRACKS, type Track } from '@doan-labs/duo-fixtures/tracks.ts'

/** A named, playable list: a mix, a station or a category's shelf. */
export type Collection = {
  name: string
  blurb: string
  /** Album covers behind the tile; a Collage draws four of them. */
  arts: string[]
  tracks: Track[]
}

/** First-appearance order keeps the roster stable. */
export const ARTISTS: string[] = [...new Set(ALBUMS.map((a) => a.artist))]

export const byArtist = (artist: string) => ALBUMS.filter((a) => a.artist === artist)

export const byGenre = (...genres: string[]) => ALBUMS.filter((a) => genres.includes(a.genre))

/** Dated releases newest first, undated ones behind them. */
export const newest = (n = ALBUMS.length): Album[] =>
  [...ALBUMS].sort((x, y) => (y.year ?? 0) - (x.year ?? 0)).slice(0, n)

/** The album a track belongs to; song rows offer the whole release from it. */
export const albumOf = (t: Track) => ALBUMS.find((a) => a.tracks.includes(t))

const collection = (name: string, blurb: string, tracks: Track[]): Collection => {
  const arts = [...new Map(tracks.map((t) => [t.cover, t.cover])).values()].slice(0, 4)
  return { name, blurb, arts, tracks }
}

const firstOf = (albums: Album[], n: number) => albums.flatMap((a) => a.tracks.slice(0, n))

/** Home's Made For You shelf: fixed selections, each honestly named after its rule. */
export const MIXES: Collection[] = [
  collection('Favourites Mix', 'A couple off every release', firstOf(ALBUMS, 2)),
  collection('Chill Mix', 'The ambient and acoustic side', firstOf(byGenre('Ambient', 'Acoustic'), 3)),
  collection('New Music Mix', 'Off the newest releases', firstOf(newest(4), 4)),
  collection('Get Up! Mix', 'The electronic shelf, turned up', firstOf(byGenre('Electronic'), 3))
]

/** Radio: the whole library live, then a station per artist and per broad genre. */
export const STATIONS: Collection[] = [
  collection('Duo Radio', 'Every release in the library, non-stop', TRACKS),
  ...ARTISTS.map((a) =>
    collection(
      `${a} Radio`,
      `Tracks and deep cuts by ${a}`,
      byArtist(a).flatMap((al) => al.tracks)
    )
  ),
  collection(
    'Electronic Station',
    'Synths and breakbeats',
    byGenre('Electronic').flatMap((a) => a.tracks)
  ),
  collection(
    'Wind Down',
    'Ambient and acoustic',
    byGenre('Ambient', 'Acoustic').flatMap((a) => a.tracks)
  )
]

/** Browse tiles on Search: each maps onto the releases it names. */
export const CATEGORIES: { name: string; albums: Album[] }[] = [
  { name: 'Electronic', albums: byGenre('Electronic') },
  { name: 'Ambient', albums: byGenre('Ambient') },
  { name: 'Acoustic & Folk', albums: byGenre('Acoustic', 'Singer-Songwriter') },
  { name: 'Alternative', albums: byGenre('Alternative') },
  { name: 'Beats', albums: byArtist('Broke For Free') }
].filter((c) => c.albums.length)

export type Results = { artists: string[]; albums: Album[]; songs: Track[] }

export const search = (q: string): Results => ({
  artists: ARTISTS.filter((a) => a.toLowerCase().includes(q)),
  albums: ALBUMS.filter((a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)),
  songs: TRACKS.filter(
    (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q)
  )
})

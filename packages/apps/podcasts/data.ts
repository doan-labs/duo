// The mock catalog: three shows, nine episodes, each episode's audio a real
// licensed track off the fixtures catalog (the shows are a mockup; what comes
// out of the speaker is a real recording).

import { TRACKS } from '@doan-labs/duo-fixtures/tracks.ts'

export type Show = { title: string; author: string; desc: string }
export type Ep = {
  id: string
  show: string
  title: string
  /** Its show's author, kept flat so rows never look the show up. */
  author: string
  desc: string
  /** Invented running time in seconds; the scrubber reads right before the audio loads. */
  secs: number
  src: string
}

export const SHOWS: Show[] = [
  {
    title: 'The Talk Show',
    author: 'John Gruber',
    desc: 'A weekly conversation about Apple, design and the details in between.'
  },
  {
    title: 'Accidental Tech',
    author: 'ATP',
    desc: 'Three developers on technology, programming and whatever Apple shipped this week.'
  },
  {
    title: 'Blender Today',
    author: 'Blender',
    desc: 'Daily notes from the Blender community: releases, renders and workflows.'
  }
]

const episodes: [string, [string, string][]][] = [
  [
    'The Talk Show',
    [
      ['Titanium, Folded', 'On the hinge Apple will not ship and the cases it does.'],
      ['On Cycles and Colour', 'Release cadence, marketing names and the good purples.'],
      ['The Chamfer Episode', 'Forty minutes on edge geometry. You know the drill.']
    ]
  ],
  [
    'Accidental Tech',
    [
      ['Anisotropy Explained', 'Brushed metal, broken assumptions and a drive-by on ARM.'],
      ['Hinges Are Hard', 'Why every folding phone review reads the same.'],
      ['Why Metal Renders Black', 'A lighting walkthrough that turns into GPU history.']
    ]
  ],
  [
    'Blender Today',
    [
      ['AgX and You', 'What the new colour management changes for your renders.'],
      ['Path Tracing a Phone', 'Modeling the Duo in Cycles, live in the comments.'],
      ['5.2 Release Notes', 'The big list, read properly for once.']
    ]
  ]
]

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const EPS: Ep[] = episodes.flatMap(([show, list]) =>
  list.map(([title, desc], i) => ({
    id: `${slug(show)}/${slug(title)}`,
    show,
    title,
    author: SHOWS.find((s) => s.title === show)!.author,
    desc,
    secs: (28 + (title.length % 30)) * 60,
    src: TRACKS[(i + show.length) % TRACKS.length]!.src
  }))
)

export const showOf = (ep: Ep) => SHOWS.find((s) => s.title === ep.show)!
export const epById = (id: string | undefined) => EPS.find((e) => e.id === id)
export const epsOf = (show: string) => EPS.filter((e) => e.show === show)

/** Shows and episodes whose title, author or description contains the query. */
export const searchPodcasts = (q: string) => {
  const needle = q.trim().toLowerCase()
  const hit = (s: string) => s.toLowerCase().includes(needle)
  return {
    shows: SHOWS.filter((s) => hit(s.title) || hit(s.author) || hit(s.desc)),
    eps: EPS.filter((e) => hit(e.title) || hit(e.show) || hit(e.author) || hit(e.desc))
  }
}

// Real recordings, not invented ones: five releases under Creative Commons or
// public domain, streamed from the Internet Archive item they were published in.
// Nothing here is bundled: `<audio>` fetches the MP3 on the first play. The covers
// are baked into /covers instead, so the card is never waiting on archive.org.
//
// Adding one: take the MP3 and the square art off an item whose `licenseurl` is
// CC BY, CC BY-SA or CC0, then credit it in docs/credits.md. Nothing under a
// NonCommercial or NoDerivatives licence belongs in here.

/** Anything the decks in Music and Podcasts can play. */
export type Playable = { title: string; artist: string; src: string }

export type Track = Playable & {
  /** The release it came off; shown under the transport with the licence. */
  album: string
  /** Square art under /covers, already sized for the card. */
  cover: string
  /** Named the way the licence asks to be credited. */
  license: string
  /** The Internet Archive item, for the credits page. */
  source: string
  /** Real running time, so the scrubber reads right before the file has loaded. */
  secs: number
}

const ia = (item: string, file: string) => `https://archive.org/download/${item}/${encodeURIComponent(file)}`

export const TRACKS: Track[] = [
  {
    title: 'Night Owl',
    artist: 'Broke For Free',
    album: 'Directionless EP',
    src: ia('Directionless_EP-8295', 'Broke_For_Free_-_01_-_Night_Owl.mp3'),
    cover: '/covers/directionless-ep.webp',
    license: 'CC BY 3.0',
    source: 'https://archive.org/details/Directionless_EP-8295',
    secs: 194
  },
  {
    title: 'Ships',
    artist: 'Josh Woodward',
    album: 'The Simple Life',
    src: ia('The_Simple_Life_Part_2_1667-16369', 'Josh_Woodward_-_01_-_Ships.mp3'),
    cover: '/covers/the-simple-life.webp',
    license: 'CC BY 4.0',
    source: 'https://archive.org/details/The_Simple_Life_Part_2_1667-16369',
    secs: 122
  },
  {
    title: 'Candlelight',
    artist: 'Jahzzar',
    album: 'Grab Bag',
    src: ia('Grab_Bag-12446', '02_-_Candlelight.mp3'),
    cover: '/covers/grab-bag.webp',
    license: 'CC BY-SA 3.0',
    source: 'https://archive.org/details/Grab_Bag-12446',
    secs: 308
  },
  {
    title: 'Caught In The Beat',
    artist: 'Broke For Free',
    album: 'Slam Funk',
    src: ia('Slam_Funk-7603', 'Broke_For_Free_-_04_-_Caught_In_The_Beat.mp3'),
    cover: '/covers/slam-funk.webp',
    license: 'CC BY 3.0',
    source: 'https://archive.org/details/Slam_Funk-7603',
    secs: 263
  },
  {
    title: 'Red Hair, Blue Sky',
    artist: 'Monplaisir',
    album: 'Relaxing Ukulele',
    src: ia('Monplaisir-RelaxingUkulele', 'Monplaisir - Relaxing Ukulele - 01 Red Hair, Blue Sky.mp3'),
    cover: '/covers/relaxing-ukulele.webp',
    license: 'CC0 1.0',
    source: 'https://archive.org/details/Monplaisir-RelaxingUkulele',
    secs: 136
  }
]

// Real recordings, not invented ones: full releases under Creative Commons or
// public domain, streamed from the Internet Archive item they were published in.
// Nothing here is bundled: `<audio>` fetches the MP3 on the first play. The covers
// are baked into /covers instead, so the shelf is never waiting on archive.org.
//
// Adding one: take the MP3s and the square art off an item whose `licenseurl` is
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
  /** Carries the publisher's own explicit mark. */
  explicit?: boolean
}

/** A release in the Music catalog: its identity, its own art and its track list in order. */
export type Album = {
  title: string
  artist: string
  /** The item's release year; absent when the item does not date itself. */
  year?: number
  genre: string
  cover: string
  license: string
  source: string
  tracks: Track[]
}

const ia = (item: string, file: string) => `https://archive.org/download/${item}/${encodeURIComponent(file)}`

/**
 * One release off the Archive: `files` is `[title, file, secs, explicit?][]` in
 * running order, `cover` the /covers slug for the release's own square art.
 */
function album(
  item: string,
  title: string,
  artist: string,
  year: number | undefined,
  genre: string,
  cover: string,
  license: string,
  files: [string, string, number, boolean?][]
): Album {
  const source = `https://archive.org/details/${item}`
  return {
    title,
    artist,
    year,
    genre,
    cover: `/covers/${cover}.webp`,
    license,
    source,
    tracks: files.map(([t, file, secs, explicit]) => ({
      title: t,
      artist,
      src: ia(item, file),
      album: title,
      cover: `/covers/${cover}.webp`,
      license,
      source,
      secs,
      explicit
    }))
  }
}

/** The catalog Music shelves: thirteen releases off five artists, whole track lists each. */
export const ALBUMS: Album[] = [
  album('BrokeForFreeLayers', 'Layers', 'Broke For Free', 2012, 'Electronic', 'layers', 'CC BY 3.0', [
    ['As Colourful As Ever', 'Broke For Free - Layers - 01 As Colourful As Ever.mp3', 234],
    ['Knock Knock', 'Broke For Free - Layers - 02 Knock Knock.mp3', 156],
    ['Only Knows', 'Broke For Free - Layers - 03 Only Knows.mp3', 179],
    ['If', 'Broke For Free - Layers - 04 If.mp3', 200],
    ['Note Drop', 'Broke For Free - Layers - 05 Note Drop.mp3', 190],
    ['Murmur', 'Broke For Free - Layers - 06 Murmur.mp3', 248],
    ['Spellbound', 'BrokeForFree-Layers-07Spellbound.mp3', 174],
    ['The Collector', 'BrokeForFree-Layers-08TheCollector.mp3', 134],
    ['Quit Bitching', 'BrokeForFree-Layers-09QuitBitching.mp3', 244, true],
    ['A Year', 'BrokeForFree-Layers-10AYear.mp3', 194]
  ]),
  album(
    'Directionless_EP-8295',
    'Directionless EP',
    'Broke For Free',
    2011,
    'Electronic',
    'directionless-ep',
    'CC BY 3.0',
    [
      ['Night Owl', 'Broke_For_Free_-_01_-_Night_Owl.mp3', 194],
      ['My Always Mood', 'Broke_For_Free_-_02_-_My_Always_Mood.mp3', 188],
      ['Day Bird', 'Broke_For_Free_-_03_-_Day_Bird.mp3', 223],
      ['My Luck', 'Broke_For_Free_-_04_-_My_Luck.mp3', 322],
      ["Mell's Parade", 'Broke_For_Free_-_05_-_Mells_Parade.mp3', 198],
      ['Only Instrumental', 'Broke_For_Free_-_06_-_Only_Instrumental.mp3', 158]
    ]
  ),
  album('Slam_Funk-7603', 'Slam Funk', 'Broke For Free', 2010, 'Electronic', 'slam-funk', 'CC BY 3.0', [
    ['Nothing Like Captain Crunch', 'Broke_For_Free_-_01_-_Nothing_Like_Captain_Crunch.mp3', 310],
    ['Calm The Fuck Down', 'Broke_For_Free_-_02_-_Calm_The_Fuck_Down.mp3', 275, true],
    ['The Great', 'Broke_For_Free_-_03_-_The_Great.mp3', 356],
    ['Caught In The Beat', 'Broke_For_Free_-_04_-_Caught_In_The_Beat.mp3', 262],
    ['Hella', 'Broke_For_Free_-_05_-_Hella.mp3', 268],
    ['High School Snaps', 'Broke_For_Free_-_06_-_High_School_Snaps.mp3', 271],
    ['At The Count', 'Broke_For_Free_-_07_-_At_The_Count.mp3', 246],
    ['Living In Reverse', 'Broke_For_Free_-_08_-_Living_In_Reverse.mp3', 208],
    ['Drop of Water In the Ocean', 'Broke_For_Free_-_09_-_Drop_of_Water_In_the_Ocean.mp3', 296],
    ['Covered In Oil', 'Broke_For_Free_-_10_-_Covered_In_Oil.mp3', 255],
    ['Simple Hop', 'Broke_For_Free_-_11_-_Simple_Hop.mp3', 306],
    ['Our Ego [Feat. Different Visitor]', 'Broke_For_Free_-_12_-_Our_Ego_Feat_Different_Visitor.mp3', 334]
  ]),
  album(
    'The_Simple_Life_Part_2_1667-16369',
    'The Simple Life (Part 2)',
    'Josh Woodward',
    2008,
    'Singer-Songwriter',
    'the-simple-life',
    'CC BY 4.0',
    [
      ['Ships', 'Josh_Woodward_-_01_-_Ships.mp3', 122],
      ['Flutter By, Butterfly', 'Josh_Woodward_-_03_-_Flutter_By_Butterfly.mp3', 158],
      ['On Brevity', 'Josh_Woodward_-_05_-_On_Brevity.mp3', 190],
      ['Shadows in the Moonlight', 'Josh_Woodward_-_11_-_Shadows_in_the_Moonlight.mp3', 265],
      ["Don't Close Your Eyes", 'Josh_Woodward_-_07_-_Dont_Close_Your_Eyes.mp3', 214],
      ['Me and Billy Barnum', 'Josh_Woodward_-_09_-_Me_and_Billy_Barnum.mp3', 210],
      ['I Wanna Know', 'Josh_Woodward_-_19_-_I_Wanna_Know.mp3', 158],
      ['Good to Go', 'Josh_Woodward_-_13_-_Good_to_Go.mp3', 189],
      ['Memorized', 'Josh_Woodward_-_15_-_Memorized.mp3', 265],
      ['The Mission', 'Josh_Woodward_-_17_-_The_Mission.mp3', 229],
      ['Afterglow', 'Josh_Woodward_-_21_-_Afterglow.mp3', 207]
    ]
  ),
  album('Grab_Bag-12446', 'Grab Bag', 'Jahzzar', undefined, 'Electronic', 'grab-bag', 'CC BY-SA 3.0', [
    ['Dummy', '01_-_Dummy.mp3', 234],
    ['Candlelight', '02_-_Candlelight.mp3', 308],
    ['Trust', '03_-_Trust.mp3', 254],
    ['Guilty', '04_-_Guilty.mp3', 266],
    ['Storm', '05_-_Storm.mp3', 266]
  ]),
  album('Kuddelmuddel', 'Kuddelmuddel', 'Jahzzar', 2015, 'Electronic', 'kuddelmuddel', 'CC BY-SA 3.0', [
    ['2014', 'Jahzzar - Kuddelmuddel - 01 2014.mp3', 226],
    ['Forgiven Not Forgotten', 'Jahzzar - Kuddelmuddel - 02 Forgiven Not Forgotten.mp3', 248],
    ['Invisible', 'Jahzzar - Kuddelmuddel - 03 Invisible.mp3', 326],
    ['L&H', 'Jahzzar - Kuddelmuddel - 04 L&H.mp3', 276],
    ['Missing You', 'Jahzzar - Kuddelmuddel - 05 Missing You.mp3', 191],
    ['Superconductivity', 'Jahzzar - Kuddelmuddel - 06 Superconductivity.mp3', 304],
    ['Not Today, Once Again', 'Jahzzar - Kuddelmuddel - 07 Not Today, Once Again.mp3', 241],
    ['Ulyses', 'Jahzzar - Kuddelmuddel - 08 Ulyses.mp3', 189]
  ]),
  album('Jahzzar_Sele', 'Sele', 'Jahzzar', 2013, 'Electronic', 'sele', 'CC BY-SA 3.0', [
    ['Eve', 'Jahzzar - Sele - 01 Eve.mp3', 158],
    ['Family Tree', 'Jahzzar - Sele - 02 Family Tree.mp3', 157],
    ['Snowman', 'Jahzzar - Sele - 03 Snowman.mp3', 141],
    ['Good Night', 'Jahzzar - Sele - 04 Good Night.mp3', 84],
    ['Avientu', 'Jahzzar - Sele - 05 Avientu.mp3', 130],
    ['#1 Wish', 'Jahzzar - Sele - 06 #1 Wish.mp3', 121],
    ['Clap Your Hands', 'Jahzzar - Sele - 07 Clap Your Hands.mp3', 241],
    ['Playtime', 'Jahzzar - Sele - 08 Playtime.mp3', 142],
    ['Xmas Carol', 'Jahzzar - Sele - 09 Xmas Carol.mp3', 131],
    ['The Next Day', 'Jahzzar - Sele - 10 The Next Day.mp3', 156]
  ]),
  album(
    'Monplaisir-RelaxingUkulele',
    'Relaxing Ukulele',
    'Monplaisir',
    2017,
    'Acoustic',
    'relaxing-ukulele',
    'CC0 1.0',
    [
      ['Red Hair, Blue Sky', 'Monplaisir - Relaxing Ukulele - 01 Red Hair, Blue Sky.mp3', 136],
      ['Sincere Love', 'Monplaisir - Relaxing Ukulele - 02 Sincere Love.mp3', 100],
      ['Time Gap', 'Monplaisir - Relaxing Ukulele - 03 Time Gap.mp3', 115],
      ['First', 'Monplaisir - Relaxing Ukulele - 04 First.mp3', 109],
      ['Stay Quiet', 'Monplaisir - Relaxing Ukulele - 05 Stay Quiet.mp3', 133],
      [
        'On the road, looking at your feet',
        'Monplaisir - Relaxing Ukulele - 06 On the road, looking at your feet.mp3',
        118
      ],
      ['Floating Temple', 'Monplaisir - Relaxing Ukulele - 07 Floating Temple.mp3', 165],
      ['Hop', 'Monplaisir - Relaxing Ukulele - 08 Hop.mp3', 158]
    ]
  ),
  album('Monplaisir-Power_Animal', 'Power Animal', 'Monplaisir', undefined, 'Alternative', 'power-animal', 'CC0 1.0', [
    ['Dog Bird Pig Frog', 'Monplaisir_-_01_-_Dog_Bird_Pig_Frog.mp3', 281],
    ['Evol', 'Monplaisir_-_02_-_Evol.mp3', 296],
    ['Dumbo', 'Monplaisir_-_03_-_Dumbo.mp3', 196],
    ['Shy', 'Monplaisir_-_04_-_Shy.mp3', 174],
    ['Ridiculous', 'Monplaisir_-_05_-_Ridiculous.mp3', 249],
    ['Asturiass Hole', 'Monplaisir_-_06_-_Asturiass_Hole.mp3', 420],
    ['Sad Floor', 'Monplaisir_-_07_-_Sad_Floor.mp3', 172],
    ['Les pieds sur le carreau froid', 'Monplaisir_-_08_-_Les_pieds_sur_le_carreau_froid.mp3', 174],
    ['Siamo Tutti Antifascisti', 'Monplaisir_-_09_-_Siamo_Tutti_Antifascisti.mp3', 278],
    ['No Filter', 'Monplaisir_-_10_-_No_Filter.mp3', 74],
    ['Some Bad Joke', 'Monplaisir_-_11_-_Some_Bad_Joke.mp3', 186],
    ['Nobody Cares lalala', 'Monplaisir_-_12_-_Nobody_Cares_lalala.mp3', 133],
    ['Mind your ear', 'Monplaisir_-_13_-_Mind_your_ear.mp3', 66],
    ['Overdriven Melancholic Guitar', 'Monplaisir_-_14_-_Overdriven_Melancholic_Guitar.mp3', 182],
    ['The Pass', 'Monplaisir_-_15_-_The_Pass.mp3', 129],
    ['Jam With Me', 'Monplaisir_-_16_-_Jam_With_Me.mp3', 221],
    ['Fire', 'Monplaisir_-_17_-_Fire.mp3', 184],
    ['Stunned', 'Monplaisir_-_18_-_Stunned.mp3', 184]
  ]),
  album(
    'Monplaisir-Cheap_Imitation',
    'Cheap Imitation',
    'Monplaisir',
    undefined,
    'Alternative',
    'cheap-imitation',
    'CC0 1.0',
    [
      ['Terror Party', 'Monplaisir_-_01_-_Terror_Party.mp3', 166],
      [
        'Explosion in Motion, Closer and You Will Die',
        'Monplaisir_-_02_-_Explosion_in_Motion_Closer_and_You_Will_Die.mp3',
        167
      ],
      ['Grab your guitar, we have to fight', 'Monplaisir_-_03_-_Grab_your_guitar_we_have_to_fight.mp3', 576],
      ["At This Point, I Don't Know", 'Monplaisir_-_04_-_At_This_Point_I_Dont_Know.mp3', 169],
      [
        'Technical Difficulties Lullaby (Pigeon Song)',
        'Monplaisir_-_05_-_Technical_Difficulties_Lullaby_Pigeon_Song.mp3',
        158
      ],
      ['Watch Your Step', 'Monplaisir_-_06_-_Watch_Your_Step.mp3', 584],
      ['12', 'Monplaisir_-_07_-_12.mp3', 294]
    ]
  ),
  album(
    'ChrisZabriskieDirectToVideo',
    'Direct to Video',
    'Chris Zabriskie',
    2015,
    'Ambient',
    'direct-to-video',
    'CC BY 3.0',
    [
      ['Direct to Video', 'Chris Zabriskie - Direct to Video - 01 Direct to Video.mp3', 345],
      [
        'What Does Anybody Know About Anything',
        'Chris Zabriskie - Direct to Video - 02 What Does Anybody Know About Anything.mp3',
        256
      ],
      [
        "I Don't See the Branches, I See the Leaves",
        "Chris Zabriskie - Direct to Video - 03 I Don't See the Branches, I See the Leaves.mp3",
        616
      ],
      [
        'I Want to Fall in Love on Snapchat',
        'Chris Zabriskie - Direct to Video - 04 I Want to Fall in Love on Snapchat.mp3',
        245
      ],
      [
        'But Enough About Me, Bill Paxton',
        'Chris Zabriskie - Direct to Video - 05 But Enough About Me, Bill Paxton.mp3',
        434
      ],
      [
        'God Be With You Till We Meet Again',
        'Chris Zabriskie - Direct to Video - 06 God Be With You Till We Meet Again.mp3',
        285
      ],
      [
        "It's Always Too Late to Start Over",
        "Chris Zabriskie - Direct to Video - 07 It's Always Too Late to Start Over.mp3",
        300
      ]
    ]
  ),
  album('ChrisZabriskieThoughtless', 'Thoughtless', 'Chris Zabriskie', 2015, 'Ambient', 'thoughtless', 'CC BY 3.0', [
    [
      "Everybody's Got Problems That Aren't Mine",
      "Chris Zabriskie - Thoughtless - 01 Everybody's Got Problems That Aren't Mine.mp3",
      497
    ],
    ['Another Version of You', 'Chris Zabriskie - Thoughtless - 02 Another Version of You.mp3', 369],
    [
      "There's a Special Place for Some People",
      "Chris Zabriskie - Thoughtless - 03 There's a Special Place for Some People.mp3",
      384
    ],
    [
      "I Can't Imagine Where I'd Be Without It",
      "Chris Zabriskie - Thoughtless - 04 I Can't Imagine Where I'd Be Without It.mp3",
      492
    ],
    ['Rewound', 'Chris Zabriskie - Thoughtless - 05 Rewound.mp3', 438]
  ]),
  album('Reappear-11948', 'Reappear', 'Chris Zabriskie', 2012, 'Ambient', 'reappear', 'CC BY 3.0', [
    [
      'Unfoldment, Revealment, Evolution, Exposition, Integration, Arson',
      'Chris_Zabriskie_-_01_-_Unfoldment_Revealment_Evolution_Exposition_Integration_Arson.mp3',
      667
    ],
    ['Readers! Do You Read?', 'Chris_Zabriskie_-_02_-_Readers_Do_You_Read.mp3', 319],
    ['Out of the Skies, Under the Earth', 'Chris_Zabriskie_-_03_-_Out_of_the_Skies_Under_the_Earth.mp3', 377],
    ['Is That You or Are You You?', 'Chris_Zabriskie_-_04_-_Is_That_You_or_Are_You_You.mp3', 315],
    [
      "What True Self? Feels Bogus, Let's Watch Jason X",
      'Chris_Zabriskie_-_05_-_What_True_Self_Feels_Bogus_Lets_Watch_Jason_X.mp3',
      385
    ],
    [
      'Chance, Luck, Errors in Nature, Fate, Destruction As a Finale',
      'Chris_Zabriskie_-_06_-_Chance_Luck_Errors_in_Nature_Fate_Destruction_As_a_Finale.mp3',
      670
    ],
    ['Virtues Inherited, Vices Passed On', 'Chris_Zabriskie_-_07_-_Virtues_Inherited_Vices_Passed_On.mp3', 386]
  ])
]

/** Every song in the catalog, in album order: the deck's default queue and Library's Songs list. */
export const TRACKS: Track[] = ALBUMS.flatMap((a) => a.tracks)

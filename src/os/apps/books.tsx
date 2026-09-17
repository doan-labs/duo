// Books: a shelf of covers, and a reader that pages through the text.
import * as stylex from '@stylexjs/stylex'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Nav, Page, useNav } from '../uikit/nav.tsx'
import { shared } from '../uikit/styles.ts'
import { Sym } from '../uikit/sym.tsx'
import { art } from './shared.ts'

const LIB: [string, string, string[]][] = [
  [
    'Moby-Dick',
    'Herman Melville',
    [
      'Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.',
      'It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet.',
      'Then, I account it high time to get to sea as soon as I can. This is my substitute for pistol and ball. With a philosophical flourish Cato throws himself upon his sword; I quietly take to the ship.',
      'There is nothing surprising in this. If they but knew it, almost all men in their degree, some time or other, cherish very nearly the same feelings towards the ocean with me.',
      'There now is your insular city of the Manhattoes, belted round by wharves as Indian isles by coral reefs—commerce surrounds it with her surf. Right and left, the streets take you waterward.',
      'Its extreme downtown is the battery, where that noble mole is washed by waves, and cooled by breezes, which a few hours previous were out of sight of land. Look at the crowds of water-gazers there.'
    ]
  ],
  [
    'Alice in Wonderland',
    'Lewis Carroll',
    [
      'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.',
      '"And what is the use of a book," thought Alice, "without pictures or conversations?" So she was considering in her own mind, as well as she could, for the hot day made her feel very sleepy and stupid.',
      'Whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.',
      'There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!"',
      'But when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it.',
      'Burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.'
    ]
  ],
  [
    'Frankenstein',
    'Mary Shelley',
    [
      'You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.',
      'I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.',
      'I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight.',
      'Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes.',
      'Inspirited by this wind of promise, my daydreams become more fervent and vivid. I try in vain to be persuaded that the pole is the seat of frost and desolation.',
      'It ever presents itself to my imagination as the region of beauty and delight. There, Margaret, the sun is for ever visible.'
    ]
  ]
]

/** Gutter between two columns, which is also the distance one page turn travels. */
const GAP = 52

const Shelf = () => {
  const { push } = useNav()
  return (
    <div {...stylex.props(styles.shelf)}>
      {LIB.map(([t, who], i) => (
        <div key={t} onClick={() => push((back) => <Reader i={i} back={back} />)}>
          <div {...stylex.props(styles.cov, styles.bg(art(t, 40)))}>{t}</div>
          <div {...stylex.props(styles.title)}>{t}</div>
          <div {...stylex.props(shared.sub, styles.who)}>{who}</div>
        </div>
      ))}
    </div>
  )
}

const Reader = ({ i, back }: { i: number; back: () => void }) => {
  const [title, , paras] = LIB[i]!
  const col = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  const [pages, setPages] = useState(1)
  const [at, setAt] = useState(0)
  // CSS columns do the pagination: one column per page width, then translate by
  // whole pages. No measuring text, and it reflows if the panel unfolds.
  useEffect(() => {
    const el = col.current!
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // scrollWidth only means anything once the column width is on the element,
  // so the page count waits for the render that applies `w`.
  useLayoutEffect(() => {
    if (!w) return
    const n = Math.max(1, Math.round(col.current!.scrollWidth / (w + GAP)))
    setPages(n)
    setAt((a) => Math.min(n - 1, a))
  }, [w])
  const go = (d: number) => setAt((a) => Math.min(pages - 1, Math.max(0, a + d)))
  return (
    <>
      <div {...stylex.props(shared.hdr, styles.readHdr)}>
        <button type="button" {...stylex.props(shared.bk)} onClick={back}>
          <Sym name="back" size={18} />
          Library
        </button>
      </div>
      <div {...stylex.props(styles.read)}>
        <div ref={col} {...stylex.props(styles.col, w > 0 && styles.colW(w), styles.shift(-at * (w + GAP)))}>
          {paras.map((p) => (
            <p key={p} {...stylex.props(styles.p)}>
              {p}
            </p>
          ))}
        </div>
        <div {...stylex.props(styles.pgn)}>
          {title} · {at + 1} of {pages}
        </div>
        <div {...stylex.props(styles.tap, styles.tapL)} onClick={() => go(-1)} />
        <div {...stylex.props(styles.tap, styles.tapR)} onClick={() => go(1)} />
      </div>
    </>
  )
}

export const Books = () => (
  <Nav>
    <Page title="Library">
      <Shelf />
    </Page>
  </Nav>
)

const SERIF = '"New York",Georgia,serif'

const styles = stylex.create({
  shelf: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(108px,1fr))',
    rowGap: 22,
    columnGap: 16,
    paddingTop: 8,
    paddingInline: 18,
    paddingBottom: 24
  },
  cov: {
    aspectRatio: '2/3',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 9,
    borderBottomRightRadius: 9,
    borderBottomLeftRadius: 4,
    boxShadow: '0 10px 22px rgba(0,0,0,.3),inset 7px 0 12px -6px rgba(0,0,0,.45)',
    paddingBlock: 14,
    paddingInline: 12,
    fontWeight: 600,
    fontSize: 14,
    lineHeight: 1.25,
    fontFamily: SERIF,
    color: '#fff9f0',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.2s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  bg: (image: string) => ({ backgroundImage: image }),
  title: { fontSize: 12, fontWeight: 600, marginTop: 8 },
  who: { fontSize: 11 },
  readHdr: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, fontSize: 15, fontWeight: 500 },
  read: { position: 'absolute', inset: 0, backgroundColor: '#f6f1e6', color: '#241f18', overflow: 'hidden' },
  col: {
    position: 'absolute',
    top: 52,
    right: 26,
    bottom: 40,
    left: 26,
    columnGap: GAP,
    fontSize: 17,
    lineHeight: 1.62,
    fontFamily: SERIF,
    textAlign: 'justify',
    transitionProperty: 'transform',
    transitionDuration: '.42s',
    transitionTimingFunction: 'cubic-bezier(.3,.85,.3,1)'
  },
  colW: (w: number) => ({ columnWidth: w }),
  shift: (x: number) => ({ transform: `translateX(${x}px)` }),
  p: { marginBottom: 12 },
  pgn: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11,
    color: '#8a7f6d',
    letterSpacing: 0.5
  },
  tap: { position: 'absolute', top: 0, bottom: 0, width: '36%', cursor: 'pointer' },
  tapL: { left: 0 },
  tapR: { right: 0 }
})

import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { shared } from '../uikit/styles.ts'
import { colors } from '../uikit/tokens.stylex.ts'
import { art, beep } from './shared.ts'

const CHART: [string, string, string][] = [
  ['Titanium Nights', 'The Hinge', '$1.29'],
  ['Fold / Unfold', 'Halide', '$1.29'],
  ['Star White', 'Aluminium Kid', '$0.99'],
  ['Cover Display', 'Duo Sound System', '$1.29'],
  ['Rail Chamfer', 'Anodise', '$1.29'],
  ['Six Point Four', 'PMREM', '$0.99'],
  ['Liquid Glass', 'Cupertino Strings', '$1.29']
]

/** Price → spinner → owned. A purchase that lands instantly reads as a label swap, not a transaction. */
const Buy = ({ label }: { label: string }) => {
  const [state, setState] = useState<'price' | 'buying' | 'own'>('price')
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const buy = () => {
    if (state !== 'price') return
    setState('buying')
    beep([1174, 1568], 0.1, 0.06)
    timer.current = window.setTimeout(() => setState('own'), 900)
  }
  return (
    <button type="button" {...stylex.props(styles.buy, state === 'own' && styles.own)} onClick={buy}>
      {state === 'buying' ? <div {...stylex.props(styles.ring, shared.spin)} /> : state === 'own' ? '✓ OWNED' : label}
    </button>
  )
}

export const Itunes = () => (
  <div {...stylex.props(shared.body)}>
    <div {...stylex.props(shared.hero)}>Music</div>
    <div {...stylex.props(styles.shelf)}>
      {CHART.slice(0, 4).map(([t, a]) => (
        <div key={t} {...stylex.props(styles.poster)}>
          <div {...stylex.props(styles.cover, styles.bg(art(t)))} />
          <div {...stylex.props(styles.posterTitle)}>{t}</div>
          <div {...stylex.props(shared.sub, styles.posterArtist)}>{a}</div>
        </div>
      ))}
    </div>
    <div {...stylex.props(shared.hdr, styles.hdr18)}>
      Top Songs
      <span {...stylex.props(shared.hdrSm)}>See All</span>
    </div>
    {CHART.map(([t, a, p], i) => (
      <div key={t} {...stylex.props(styles.rank)}>
        <span {...stylex.props(styles.n)}>{String(i + 1)}</span>
        <div {...stylex.props(styles.co, styles.bg(art(t)))} />
        <div {...stylex.props(styles.grow)}>
          <div {...stylex.props(styles.song)}>{t}</div>
          <div {...stylex.props(shared.sub)}>{a}</div>
        </div>
        <Buy label={p} />
      </div>
    ))}
  </div>
)

const styles = stylex.create({
  bg: (img: string) => ({ backgroundImage: img }),
  shelf: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    paddingTop: 2,
    paddingInline: 16,
    paddingBottom: 16,
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' }
  },
  poster: {
    flexShrink: 0,
    width: 126,
    borderRadius: 12,
    overflow: 'hidden',
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '.2s',
    transform: { default: null, ':active': 'scale(.95)' }
  },
  cover: { aspectRatio: 1, borderRadius: 9 },
  posterTitle: { fontSize: 12, fontWeight: 600, paddingTop: 6, paddingInline: 2, paddingBottom: 0 },
  posterArtist: { fontSize: 11, paddingInline: 2 },
  hdr18: { fontSize: 18 },
  rank: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 9,
    paddingBottom: 9,
    paddingInline: 16,
    cursor: 'pointer',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.14)'
  },
  n: { width: 18, textAlign: 'center', color: colors.grey, fontSize: 13, flexShrink: 0 },
  co: { width: 52, height: 52, borderRadius: 8, flexShrink: 0 },
  grow: { flexGrow: 1, minWidth: 0 },
  song: { fontWeight: 600, fontSize: 14 },
  buy: {
    paddingTop: 5,
    paddingBottom: 5,
    paddingInline: 14,
    borderRadius: 13,
    backgroundColor: colors.fill,
    color: colors.blue,
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    transitionProperty: 'background-color, color, transform',
    transitionDuration: '.25s, .25s, .15s',
    transform: { default: null, ':active': 'scale(.9)' }
  },
  own: { backgroundColor: colors.green, color: colors.white },
  ring: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    borderWidth: 2.5,
    borderStyle: 'solid',
    borderColor: 'rgba(10,124,255,.22)',
    borderTopColor: colors.blueDark
  }
})

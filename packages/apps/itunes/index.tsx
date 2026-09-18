import { LargeTitle, Screen, Text, Title } from '@doan-labs/duo-uikit'
import { art, beep } from '@doan-labs/duo-uikit/shared.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { styles } from './styles.ts'

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
  <Screen>
    <LargeTitle>Music</LargeTitle>
    <div {...stylex.props(styles.shelf)}>
      {CHART.slice(0, 4).map(([t, a]) => (
        <div key={t} {...stylex.props(styles.poster)}>
          <div {...stylex.props(styles.cover, styles.bg(art(t)))} />
          <div {...stylex.props(styles.posterTitle)}>{t}</div>
          <Text as="div" size="caption" xstyle={[styles.posterArtist]}>
            {a}
          </Text>
        </div>
      ))}
    </div>
    <Title xstyle={[styles.hdr18]}>
      Top Songs
      <Title as="span" variant="accessory">
        See All
      </Title>
    </Title>
    {CHART.map(([t, a, p], i) => (
      <div key={t} {...stylex.props(styles.rank)}>
        <span {...stylex.props(styles.n)}>{String(i + 1)}</span>
        <div {...stylex.props(styles.co, styles.bg(art(t)))} />
        <div {...stylex.props(styles.grow)}>
          <div {...stylex.props(styles.song)}>{t}</div>
          <Text as="div" size="caption">
            {a}
          </Text>
        </div>
        <Buy label={p} />
      </div>
    ))}
  </Screen>
)

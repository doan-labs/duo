// The iOS 26 system hues from the kit's tokens, arriving one after another.
// Pointing at one names the token it is. In a dark appearance each swatch
// shows its `*Dark` sibling, which is the row of colours a dark app reads.
import { app, colors, easing, fonts, leading, space, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { useDark } from '../../theme'

const HUES = [
  ['red', colors.red, colors.redDark],
  ['orange', colors.orange, colors.orangeDark],
  ['yellow', colors.yellow, colors.yellowDark],
  ['green', colors.green, colors.greenDark],
  ['mint', colors.mint, colors.mintDark],
  ['teal', colors.teal, colors.tealDark],
  ['cyan', colors.cyan, colors.cyanDark],
  ['blue', colors.blue, colors.blueDark],
  ['indigo', colors.indigo, colors.indigoDark],
  ['purple', colors.purple, colors.purpleDark],
  ['pink', colors.pink, colors.pinkDark],
  ['brown', colors.brown, colors.brownDark]
] as const

export default function Palette() {
  const [hover, setHover] = useState<string>()
  const night = useDark()
  return (
    <div {...stylex.props(styles.scene)}>
      <ul {...stylex.props(styles.grid)}>
        {HUES.map(([name, day, dark], i) => (
          <li
            key={name}
            onPointerEnter={() => setHover(name)}
            onPointerLeave={() => setHover(undefined)}
            {...stylex.props(styles.swatch, styles.fill(night ? dark : day, i * 45))}
          />
        ))}
      </ul>
      <p {...stylex.props(styles.name)}>
        {hover ? `colors.${hover}${night ? 'Dark' : ''}` : 'Dark siblings for every one'}
      </p>
    </div>
  )
}

const pop = stylex.keyframes({ from: { opacity: 0, transform: 'scale(.4)' } })

const styles = stylex.create({
  scene: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: space.md,
    paddingLeft: space.xl,
    paddingRight: space.xl,
    paddingBottom: space.lg
  },
  grid: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: space.md
  },
  swatch: {
    aspectRatio: '1',
    borderRadius: '50%',
    animationName: pop,
    animationDuration: '.6s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'backwards',
    transform: { default: 'scale(1)', ':hover': 'scale(1.14)' },
    transitionProperty: 'transform',
    transitionDuration: '.25s',
    transitionTimingFunction: easing.spring
  },
  fill: (c: string, delay: number) => ({ backgroundColor: c, animationDelay: `${delay}ms` }),
  name: {
    margin: 0,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    color: app.label2,
    textAlign: 'center'
  }
})

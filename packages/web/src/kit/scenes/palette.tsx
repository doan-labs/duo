// The iOS 26 system hues from the kit's tokens, arriving one after another.
// Pointing at one names the token it is.
import { app, colors, easing, fonts, leading, space, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'

const HUES = [
  ['red', colors.red],
  ['orange', colors.orange],
  ['yellow', colors.yellow],
  ['green', colors.green],
  ['mint', colors.mint],
  ['teal', colors.teal],
  ['cyan', colors.cyan],
  ['blue', colors.blue],
  ['indigo', colors.indigo],
  ['purple', colors.purple],
  ['pink', colors.pink],
  ['brown', colors.brown]
] as const

export default function Palette() {
  const [hover, setHover] = useState<string>()
  return (
    <div {...stylex.props(styles.scene)}>
      <ul {...stylex.props(styles.grid)}>
        {HUES.map(([name, c], i) => (
          <li
            key={name}
            onPointerEnter={() => setHover(name)}
            onPointerLeave={() => setHover(undefined)}
            {...stylex.props(styles.swatch, styles.fill(c, i * 45))}
          />
        ))}
      </ul>
      <p {...stylex.props(styles.name)}>{hover ? `colors.${hover}` : 'Dark siblings for every one'}</p>
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

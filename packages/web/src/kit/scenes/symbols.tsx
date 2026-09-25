// A wall of the kit's SF Symbols. They arrive in a wave, and one at a time a
// symbol lights up in a system hue, which is all `Sym` needs to be tinted: a colour.
import { Sym, type SymProps } from '@doan-labs/duo-uikit'
import { SYM } from '@doan-labs/duo-uikit/icons/index.ts'
import { app, colors, easing, fonts, leading, radius, space, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useDark } from '../../theme'

type Name = SymProps['name']

export const SYMBOL_COUNT = Object.keys(SYM).length

// A hand-picked wall rather than all of them: the ones a visitor recognises.
const WALL: Name[] = [
  'wifi',
  'bluetooth',
  'cellular',
  'battery',
  'airplane',
  'bolt',
  'sun',
  'moon',
  'moonStars',
  'cloudSun',
  'rain',
  'snow',
  'heartFill',
  'starFill',
  'bookmark',
  'pin',
  'location',
  'map',
  'person',
  'people',
  'call',
  'video',
  'share',
  'search',
  'compose',
  'note',
  'checklist',
  'calendarSym',
  'clockSym',
  'lock',
  'photo',
  'film',
  'globe',
  'leaf',
  'cup',
  'cart',
  'walk',
  'bus',
  'tram',
  'umbrella',
  'thermometer',
  'drop'
]

// The tint a lit cell takes, dark siblings in a dark appearance like the swatches in palette.
const TINTS = [
  [colors.blue, colors.blueDark],
  [colors.orange, colors.orangeDark],
  [colors.pink, colors.pinkDark],
  [colors.green, colors.greenDark],
  [colors.indigo, colors.indigoDark],
  [colors.teal, colors.tealDark],
  [colors.yellow, colors.yellowDark],
  [colors.purple, colors.purpleDark]
]

export default function Symbols() {
  const still = useReducedMotion() ?? false
  const night = useDark()
  const [lit, setLit] = useState<[number, number]>([0, 0])
  const [hover, setHover] = useState<Name>()
  useEffect(() => {
    if (still) return
    const t = setInterval(() => setLit(([, n]) => [Math.floor(Math.random() * WALL.length), n + 1]), 700)
    return () => clearInterval(t)
  }, [still])
  return (
    <div {...stylex.props(styles.scene)}>
      <ul {...stylex.props(styles.grid)}>
        {WALL.map((name, i) => {
          const on = hover ? hover === name : !still && lit[0] === i && lit[1] > 0
          return (
            <li
              key={name}
              onPointerEnter={() => setHover(name)}
              onPointerLeave={() => setHover(undefined)}
              {...stylex.props(
                styles.cell,
                styles.arrive(((i % 6) + Math.floor(i / 6)) * 40),
                on && styles.on,
                on && styles.tint(TINTS[(hover ? i : lit[1]) % TINTS.length]![night ? 1 : 0]!)
              )}
            >
              <Sym name={name} size={22} />
            </li>
          )
        })}
      </ul>
      <p {...stylex.props(styles.name)}>{hover ? `<Sym name="${hover}" />` : 'Masks tinted by currentColor'}</p>
    </div>
  )
}

const pop = stylex.keyframes({ from: { opacity: 0, transform: 'scale(.3)' } })

const styles = stylex.create({
  scene: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingTop: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.lg,
    paddingBottom: space.lg
  },
  grid: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    flexGrow: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: space.sm
  },
  cell: {
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: app.surface,
    color: app.fg,
    animationName: pop,
    animationDuration: '.55s',
    animationTimingFunction: easing.spring,
    animationFillMode: 'backwards',
    transform: 'scale(1)',
    transitionProperty: 'color, background-color, transform',
    transitionDuration: '.4s',
    transitionTimingFunction: easing.spring
  },
  arrive: (ms: number) => ({ animationDelay: `${ms}ms` }),
  on: { color: colors.white, transform: 'scale(1.08)' },
  tint: (c: string) => ({ backgroundColor: c }),
  name: {
    margin: 0,
    fontFamily: fonts.mono,
    fontSize: typeScale.caption1,
    lineHeight: leading.caption1,
    color: app.label2,
    textAlign: 'center'
  }
})

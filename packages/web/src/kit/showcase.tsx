// The grid under the kit hero: each tile a small app composed from the kit,
// running. A tile mounts its scene the first time it is seen, so the rings fill,
// the bars grow and the menu floats out in front of the visitor rather than
// having finished somewhere below the fold before anyone scrolled there.
import { dark as kitDark, light as kitLight } from '@doan-labs/duo-uikit/styles.ts'
import { app, colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { type ComponentType, useState } from 'react'
import { CURVE } from '../motion'
import { useDark } from '../theme'
import { color, dark, ease, font, light, radius } from '../tokens.stylex'
import { kit } from './data'
import Activity from './scenes/activity'
import Controls from './scenes/controls'
import Fold from './scenes/fold'
import Form from './scenes/form'
import Menus from './scenes/menus'
import Palette from './scenes/palette'
import Settings from './scenes/settings'
import Symbols, { SYMBOL_COUNT } from './scenes/symbols'
import Type from './scenes/type'
import Widgets from './scenes/widgets'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

type Shape = 'full' | 'tall' | 'half' | 'small'

type Tile = {
  title: string
  /** The exports the scene is built from, linked to their reference page where one exists. */
  uses: string[]
  Scene: ComponentType
  shape: Shape
  /** The scene draws on black in both appearances, so the caption above it does too. */
  night?: boolean
}

const TILES: Tile[] = [
  { title: 'One layout, both displays.', uses: ['useWide', 'Push', 'Row', 'LargeTitle'], Scene: Fold, shape: 'full' },
  {
    title: 'Rings that fill like today did.',
    uses: ['Rings', 'Bars', 'Num'],
    Scene: Activity,
    shape: 'tall',
    night: true
  },
  { title: 'A real navigation stack.', uses: ['Nav', 'Page', 'Row', 'Toggle'], Scene: Settings, shape: 'tall' },
  {
    title: 'Controls that answer.',
    uses: ['Segmented', 'Button', 'Checkbox', 'IconButton'],
    Scene: Controls,
    shape: 'small'
  },
  { title: 'Every system hue.', uses: ['colors'], Scene: Palette, shape: 'small' },
  { title: 'Widgets on real glass.', uses: ['Widget'], Scene: Widgets, shape: 'half', night: true },
  { title: 'Menus that float out of their control.', uses: ['Menu', 'IconButton'], Scene: Menus, shape: 'half' },
  { title: 'Forms, fields and sheets.', uses: ['TextField', 'Select', 'Sheet'], Scene: Form, shape: 'tall' },
  { title: 'Dynamic Type, every step.', uses: ['Text'], Scene: Type, shape: 'tall' },
  { title: `${SYMBOL_COUNT} SF Symbols, tinted by colour.`, uses: ['Sym'], Scene: Symbols, shape: 'tall' }
]

const documented = new Set(kit.map((e) => e.name))

// "At or above the fold" counts as seen, for the reason `home/parts.tsx` gives:
// a long jump can carry a tile past the viewport between two observer ticks.
const SEEN = { once: true, amount: 0.2, margin: '200000px 0px 0px 0px' }

export function Showcase() {
  return (
    <ul {...stylex.props(styles.grid)} aria-label="The kit, running">
      {TILES.map((t, i) => (
        <Card key={t.title} tile={t} delay={(i % 3) * 0.08} />
      ))}
    </ul>
  )
}

function Card({ tile, delay }: { tile: Tile; delay: number }) {
  const still = useReducedMotion() ?? false
  const [seen, setSeen] = useState(false)
  const { Scene } = tile
  const page = useDark()
  // A `night` tile is dark in either appearance; the rest take the page's, so a
  // dark page makes every tile a night one. The caption is ink on the tile's
  // own ground, so it takes the theme that ground is in.
  const night = tile.night || page
  return (
    <motion.li
      {...stylex.props(night ? dark : light, styles.card, styles[tile.shape], night && styles.night)}
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={SEEN}
      onViewportEnter={() => setSeen(true)}
      transition={still ? { duration: 0 } : { duration: 0.8, delay, ease: CURVE }}
    >
      <header {...stylex.props(styles.head)}>
        <p {...stylex.props(styles.uses)}>
          {tile.uses.map((name, i) => (
            <span key={name}>
              {i > 0 && ' · '}
              {documented.has(name) ? (
                <Link to="/kit/docs/$name" params={{ name }} {...stylex.props(styles.use)}>
                  {name}
                </Link>
              ) : (
                name
              )}
            </span>
          ))}
        </p>
        <h3 {...stylex.props(styles.title)}>{tile.title}</h3>
      </header>
      <div data-kit-frame="" {...stylex.props(night ? kitDark : kitLight, styles.scene)}>
        {seen && <Scene />}
      </div>
    </motion.li>
  )
}

const styles = stylex.create({
  // Six columns at 1200 px make a two-column tile 387 px: the cover display.
  grid: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(6, minmax(0, 1fr))', [MID]: 'repeat(2, minmax(0, 1fr))', [SMALL]: '1fr' },
    gridAutoRows: '300px',
    gridAutoFlow: 'dense',
    gap: { default: '20px', [SMALL]: '16px' }
  },
  full: { gridColumn: '1 / -1', gridRow: 'span 2' },
  tall: { gridColumn: { default: 'span 2', [MID]: 'span 1' }, gridRow: 'span 2' },
  half: { gridColumn: { default: 'span 3', [MID]: 'span 1' } },
  small: { gridColumn: { default: 'span 2', [MID]: 'span 1' } },
  // The tile is the scene's own ground, so the kit's grey reaches the corners
  // and the caption reads as a label printed on the screen, not a card header.
  // `contain: paint` makes it the box a Sheet's fixed scrim fills, not the page.
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
    contain: 'paint',
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    backgroundColor: colors.grey6,
    color: color.text,
    boxShadow: { default: 'none', ':hover': color.shadow },
    transitionProperty: 'border-color, box-shadow',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out
  },
  night: { backgroundColor: colors.black },
  head: { paddingTop: '20px', paddingLeft: '22px', paddingRight: '22px', paddingBottom: '4px', flexShrink: 0 },
  uses: {
    margin: 0,
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.06em',
    color: color.text3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  use: { color: { default: 'inherit', ':hover': color.accent }, textDecoration: 'none' },
  title: {
    margin: 0,
    marginTop: '6px',
    fontFamily: font.display,
    fontSize: '19px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.25
  },
  // The shell's body font: 400 15px/1.4 on the system stack, as in KitFrame.
  scene: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: '15px',
    lineHeight: 1.4
  }
})

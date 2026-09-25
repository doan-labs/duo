// The `switches` payload as Control Center's own glyphs, grouped as it groups them:
// the radios on the left, the rest on the right. Hover a tile for its name.
import type { Switches } from '@doan-labs/duo-sdk'
import { Sym, type SymProps } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useState } from 'react'
import { color, ease, font, radius } from '../tokens.stylex'

type Tile = [keyof Switches, string, (on: boolean) => ReactNode]
const sym = (name: SymProps['name']) => () => <Sym name={name} size={17} />
// The kit's `bluetooth` symbol is AirDrop's; the Bluetooth rune is drawn, as control-center.tsx does.
const GROUPS: Tile[][] = [
  [
    ['airplane', 'Airplane Mode', sym('airplane')],
    ['cell', 'Cellular', sym('antenna')],
    ['wifi', 'Wi-Fi', sym('wifi')],
    ['bt', 'Bluetooth', () => <Rune />],
    ['drop', 'AirDrop', sym('bluetooth')],
    ['hotspot', 'Personal Hotspot', sym('iphone')]
  ],
  [
    ['focus', 'Focus', sym('moon')],
    ['darkMode', 'Dark Mode', sym('moonStars')],
    ['rotate', 'Rotation Lock', sym('lock')],
    ['mirror', 'Screen Mirroring', sym('tabs')],
    ['torch', 'Torch', (on) => <Sym name={on ? 'torchOn' : 'torchOff'} size={17} />]
  ]
]

export function SwitchTiles({ s }: { s?: Switches }) {
  const [tip, setTip] = useState<keyof Switches | null>(null)
  return (
    <span {...stylex.props(styles.groups)}>
      {GROUPS.map((group, g) => (
        <span key={group[0]![0]} {...stylex.props(styles.group, g > 0 && styles.rest)}>
          {group.map(([k, label, glyph]) => (
            <span
              key={k}
              role="img"
              aria-label={`${label}: ${s?.[k] ? 'on' : 'off'}`}
              onPointerEnter={() => setTip(k)}
              onPointerLeave={() => setTip((t) => (t === k ? null : t))}
              {...stylex.props(styles.tile, s?.[k] && styles.on)}
            >
              {glyph(!!s?.[k])}
              {tip === k && (
                <span aria-hidden="true" {...stylex.props(styles.tip)}>
                  {label}
                </span>
              )}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}

const Rune = () => (
  <svg
    viewBox="0 0 24 24"
    width={17}
    height={17}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 7.5l10 9-5 4.5V3l5 4.5-10 9" />
  </svg>
)

const show = stylex.keyframes({
  from: { opacity: 0, transform: 'translate(-50%, -3px)' },
  to: { opacity: 1, transform: 'translate(-50%, 0)' }
})

const styles = stylex.create({
  groups: { display: 'flex', flexWrap: 'wrap', gap: '20px' },
  group: { display: 'grid', gridTemplateColumns: 'repeat(3, 34px)', gap: '8px' },
  rest: {
    paddingLeft: '20px',
    borderLeftWidth: '1px',
    borderLeftStyle: 'solid',
    borderLeftColor: color.border
  },
  tile: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    borderRadius: radius.pill,
    backgroundColor: color.well,
    color: color.text3,
    transitionProperty: 'background-color, color',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out
  },
  on: { backgroundColor: color.accent, color: color.onAccent },
  // Below the tile: the readout clips anything above its top row.
  tip: {
    position: 'absolute',
    zIndex: 2,
    top: 'calc(100% + 6px)',
    left: '50%',
    transform: 'translate(-50%, 0)',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radius.sm,
    backgroundColor: color.text,
    color: color.bg,
    fontFamily: font.sans,
    fontSize: '12px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    animationName: show,
    animationDuration: '0.16s',
    animationTimingFunction: ease.out
  }
})

// Every colour in the kit, grouped the way it is reached for. The values come
// from src/generated/tokens.ts because `colors` and `app` are `defineVars`:
// their runtime value is a `var(--x)` reference, so the swatch has to be
// painted from the generated literal rather than from the token itself.
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { app, colors, type Token, wallpaper } from '../generated/tokens'
import { color, ease, font, radius } from '../tokens.stylex'
import { Group } from './group'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

const NEUTRAL = /^(grey|white$|black$|pen)/

// The translucent labels and fills are drawn for the kit's light surface, so
// every swatch is painted on the kit's own white. On a dark page they would
// otherwise be dark ink on a dark card, which is not what they look like.
const PAPER = colors.find((t) => t.name === 'white')?.value ?? '#fff'

const GROUPS = [
  {
    title: 'Hues',
    note: 'Tinting only: an icon square, a chart, a switch. Blue is the one interaction colour.',
    tokens: colors.filter((t) => !NEUTRAL.test(t.name))
  },
  {
    title: 'Greys',
    note: 'systemGray through systemGray6, and the same steps in a dark app.',
    tokens: colors.filter((t) => NEUTRAL.test(t.name))
  },
  {
    title: 'Labels and fills',
    note: 'The UIKit dynamic colours, themed per app. Text and surfaces come from here, never from a hue.',
    tokens: app
  },
  {
    title: 'Wallpaper',
    note: 'One group of colours per wallpaper. Consts, because both displays bake the same picture.',
    tokens: wallpaper
  }
]

export const COLOUR_COUNT = GROUPS.reduce((n, g) => n + g.tokens.length, 0)

export function Colour() {
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(''), 1400)
    return () => clearTimeout(t)
  }, [copied])

  const copy = (t: Token) =>
    void navigator.clipboard?.writeText(t.value).then(
      () => setCopied(t.name),
      () => setCopied('')
    )

  return (
    <div>
      {GROUPS.map((g) => (
        <Group key={g.title} title={g.title} note={g.note}>
          <div {...stylex.props(styles.grid)}>
            {g.tokens.map((t) => (
              <button
                key={t.name}
                type="button"
                title={t.doc || undefined}
                onClick={() => copy(t)}
                {...stylex.props(styles.card)}
              >
                <span {...stylex.props(styles.swatch, styles.fill(PAPER, t.value))} />
                <span {...stylex.props(styles.name)}>{t.name}</span>
                <span {...stylex.props(styles.value, copied === t.name && styles.copied)}>
                  {copied === t.name ? 'Copied' : t.value}
                </span>
              </button>
            ))}
          </div>
        </Group>
      ))}
    </div>
  )
}

const styles = stylex.create({
  grid: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(auto-fill, minmax(148px, 1fr))', [SMALL]: 'repeat(2, minmax(0, 1fr))' },
    gap: '12px'
  },
  card: {
    display: 'block',
    appearance: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    margin: 0,
    padding: '10px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.md,
    transitionProperty: 'border-color, box-shadow, transform',
    transitionDuration: '0.22s',
    transitionTimingFunction: ease.out,
    transform: { default: 'translateY(0)', ':hover': 'translateY(-2px)', ':active': 'translateY(0)' },
    boxShadow: { default: 'none', ':hover': color.shadow },
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineOffset: '3px'
  },
  swatch: {
    display: 'block',
    height: '74px',
    borderRadius: '10px',
    // The inset hairline keeps a white swatch from dissolving into the card.
    boxShadow: `inset 0 0 0 1px ${color.border}`
  },
  // The colour is a flat gradient rather than a background colour so that the
  // paper underneath it stays visible through a translucent fill.
  fill: (paper: string, value: string) => ({
    backgroundColor: paper,
    backgroundImage: `linear-gradient(${value}, ${value})`
  }),
  name: {
    display: 'block',
    marginTop: '10px',
    fontFamily: font.sans,
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    color: color.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  // An `rgba()` fill is longer than a card is wide, and a truncated colour is
  // worth less than an uneven card, so the value wraps instead.
  value: {
    display: 'block',
    marginTop: '3px',
    fontFamily: font.mono,
    fontSize: '11px',
    lineHeight: 1.4,
    color: color.text3,
    overflowWrap: 'anywhere'
  },
  copied: { color: color.accent }
})

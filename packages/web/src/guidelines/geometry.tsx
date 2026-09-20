// Space, radius and the home-grid numbers, drawn at their real values: a bar
// actually that wide, a corner actually that round. All three scales are
// `defineConsts`, so the generated literal is also what the kit compiles in.
import * as stylex from '@stylexjs/stylex'
import { layout, radius as radii, space } from '../generated/tokens'
import { color, font, radius } from '../tokens.stylex'
import { Group } from './group'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const GEOMETRY_COUNT = space.length + radii.length + layout.length

export function Geometry() {
  return (
    <div>
      <Group title="Space" note="A 4 px grid. Gaps, padding and insets pick a step, never a number.">
        <div {...stylex.props(styles.rows, styles.bars)}>
          {space.map((t) => (
            <div key={t.name} {...stylex.props(styles.row)}>
              <span {...stylex.props(styles.name)}>{t.name}</span>
              <span {...stylex.props(styles.metrics)}>{t.value}</span>
              <span {...stylex.props(styles.bar, styles.wide(t.value))} />
            </div>
          ))}
        </div>
      </Group>

      <Group title="Radius" note="Continuous corners, one per role. Nothing in between.">
        <div {...stylex.props(styles.grid)}>
          {radii.map((t) => (
            <div key={t.name} {...stylex.props(styles.tile)} title={t.doc || undefined}>
              <span {...stylex.props(styles.corner, styles.round(t.value))} />
              <span {...stylex.props(styles.name)}>{t.name}</span>
              <span {...stylex.props(styles.metrics)}>{t.value}</span>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Home grid" note="CSS px at 5 px/mm. The shell bakes the same numbers at 12 px/mm.">
        <div {...stylex.props(styles.rows)}>
          {layout.map((t) => (
            <div key={t.name} {...stylex.props(styles.measure)}>
              <span {...stylex.props(styles.name)}>{t.name}</span>
              <span {...stylex.props(styles.metrics, styles.figure)}>{t.value}</span>
              <span {...stylex.props(styles.note)}>{t.doc}</span>
            </div>
          ))}
        </div>
      </Group>
    </div>
  )
}

const styles = stylex.create({
  rows: { display: 'grid', gap: 0 },
  // A 2 px bar next to a value a thousand pixels away is a chart nobody can
  // read; the whole scale stays inside one measure.
  bars: { maxWidth: '480px' },
  row: {
    display: 'grid',
    gridTemplateColumns: { default: '96px 56px minmax(0, 1fr)', [SMALL]: '76px 48px minmax(0, 1fr)' },
    alignItems: 'center',
    gap: '12px',
    paddingTop: '11px',
    paddingBottom: '11px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border
  },
  measure: {
    display: 'grid',
    maxWidth: '880px',
    gridTemplateColumns: { default: '150px 80px minmax(0, 1fr)', [SMALL]: '110px minmax(0, 1fr)' },
    alignItems: 'baseline',
    gap: { default: '16px', [SMALL]: '8px' },
    paddingTop: '11px',
    paddingBottom: '11px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border
  },
  name: {
    display: 'block',
    fontFamily: font.mono,
    fontSize: '12px',
    lineHeight: 1.5,
    color: color.text
  },
  bar: { height: '14px', borderRadius: '3px', backgroundColor: color.accent },
  wide: (value: string) => ({ width: value }),
  metrics: {
    display: 'block',
    fontFamily: font.mono,
    fontSize: '12px',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.5,
    color: color.text3
  },
  figure: { color: color.accent },
  note: { fontFamily: font.sans, fontSize: '14px', lineHeight: 1.5, color: color.text3 },
  // Eight radii, four to a row: a narrower measure squares the block off
  // instead of leaving one tile stranded on a second line.
  grid: {
    display: 'grid',
    maxWidth: '680px',
    gridTemplateColumns: { default: 'repeat(4, minmax(0, 1fr))', [SMALL]: 'repeat(2, minmax(0, 1fr))' },
    gap: '12px'
  },
  tile: {
    padding: '14px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md
  },
  corner: {
    display: 'block',
    height: '64px',
    marginBottom: '12px',
    backgroundColor: color.accentSoft,
    boxShadow: `inset 0 0 0 1.5px ${color.accent}`
  },
  round: (value: string) => ({ borderRadius: value })
})

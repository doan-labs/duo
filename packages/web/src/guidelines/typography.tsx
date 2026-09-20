// The faces, the Dynamic Type ramp and the weight ladder, each specimen set at
// the size, leading, tracking and weight it names, so the step is read rather
// than looked up. The values come from src/generated/tokens.ts; leading and
// tracking are keyed by the same names, and a step missing from them is meant
// to be set solid. The font stacks arrive as strings at runtime, so the face is
// applied through a dynamic style rather than a static one.
import * as stylex from '@stylexjs/stylex'
import { fonts, leading, tracking, typeScale, weight } from '../generated/tokens'
import { color, font } from '../tokens.stylex'
import { Group } from './group'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

const LEADING = new Map(leading.map((t) => [t.name, t.value]))
const TRACKING = new Map(tracking.map((t) => [t.name, t.value]))
const SYSTEM = fonts.find((f) => f.name === 'system')?.value ?? 'sans-serif'

export const TYPE_COUNT = fonts.length + typeScale.length + weight.length

export function Typography() {
  return (
    <div>
      <Group title="Faces" note="SF Pro and its siblings. Every app draws in one of these four.">
        <div {...stylex.props(styles.rows)}>
          {fonts.map((f) => (
            <div key={f.name} {...stylex.props(styles.row)}>
              <span {...stylex.props(styles.sample, styles.stack(f.value))}>{f.name}</span>
              <span {...stylex.props(styles.note)}>{f.doc || f.value.split(',')[0]}</span>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Dynamic Type" note="At the Large size, the default. Size / leading / tracking, in CSS px.">
        <div {...stylex.props(styles.rows)}>
          {typeScale.map((t) => {
            const line = LEADING.get(t.name)
            const track = TRACKING.get(t.name) ?? '0px'
            const spec = stylex.props(styles.specimen, styles.stack(SYSTEM), styles.step(t.value, line ?? '1', track))
            return (
              <div key={t.name} {...stylex.props(styles.row)}>
                <span {...spec}>{t.name}</span>
                <span {...stylex.props(styles.metrics)}>
                  {t.value} / {line ?? 'solid'} / {track}
                </span>
              </div>
            )
          })}
        </div>
      </Group>

      <Group title="Weight" note="Nothing lighter than regular, except thin for an oversized numeral.">
        <div {...stylex.props(styles.rows)}>
          {weight.map((w) => (
            <div key={w.name} {...stylex.props(styles.row)}>
              <span {...stylex.props(styles.sample, styles.stack(SYSTEM), styles.weighted(w.value))}>{w.name}</span>
              <span {...stylex.props(styles.metrics)}>{w.value}</span>
            </div>
          ))}
        </div>
      </Group>
    </div>
  )
}

const styles = stylex.create({
  rows: { display: 'grid', gap: 0 },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: { default: '24px', [SMALL]: '2px' },
    paddingTop: '14px',
    paddingBottom: '14px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border
  },
  specimen: {
    minWidth: 0,
    fontWeight: 400,
    color: color.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  sample: { fontSize: '22px', lineHeight: 1.4, color: color.text },
  stack: (family: string) => ({ fontFamily: family }),
  step: (size: string, line: string, track: string) => ({ fontSize: size, lineHeight: line, letterSpacing: track }),
  weighted: (value: string) => ({ fontWeight: value }),
  metrics: {
    flexShrink: 0,
    fontFamily: font.mono,
    fontSize: '12px',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.5,
    color: color.text3
  },
  // A face is described in prose, not in numbers, so it keeps the sans.
  note: {
    maxWidth: '44ch',
    fontFamily: font.sans,
    fontSize: '14px',
    lineHeight: 1.5,
    textAlign: { default: 'right', [SMALL]: 'left' },
    color: color.text3
  }
})

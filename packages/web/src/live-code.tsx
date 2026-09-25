// A code sample whose running line lights up, and the readout of what that code
// has in hand: the pair the fold section and the /sdk page show beside a live phone.
import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { Line } from './highlight'
import { color, font } from './tokens.stylex'

const REDUCE = '@media (prefers-reduced-motion: reduce)'

/**
 * `on` is the line that just ran. `beat` changes on every run, so the same line
 * running twice still flashes twice.
 */
export function LiveCode({ title, lines, on, beat }: { title: string; lines: string[]; on?: number; beat?: number }) {
  return (
    <div {...stylex.props(styles.code)}>
      <div {...stylex.props(styles.codeTitle)}>{title}</div>
      <pre {...stylex.props(styles.pre)}>
        {lines.map((line, i) => (
          <div
            key={i === on ? `${i}-${beat}` : line || `blank-${i}`}
            {...stylex.props(styles.line, i === on && styles.lineOn, i === on && beat !== undefined && styles.flash)}
          >
            <span {...stylex.props(styles.gutter)}>{i + 1}</span>
            <code {...stylex.props(styles.text)}>
              <Line code={line} />
            </code>
          </div>
        ))}
      </pre>
    </div>
  )
}

export function Readout({ children }: { children: ReactNode }) {
  return (
    <dl {...stylex.props(styles.readout)} aria-live="polite">
      {children}
    </dl>
  )
}

export function Field({ k, v, wide = false }: { k: string; v: ReactNode; wide?: boolean }) {
  return (
    <div {...stylex.props(styles.field, wide && styles.wide)}>
      <dt {...stylex.props(styles.key)}>{k}</dt>
      <dd {...stylex.props(styles.val)}>{v}</dd>
    </div>
  )
}

const flash = stylex.keyframes({
  from: { backgroundColor: color.ring },
  to: { backgroundColor: color.accentSoft }
})

const styles = stylex.create({
  code: {
    marginTop: '24px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: '14px',
    backgroundColor: color.surface,
    overflow: 'hidden'
  },
  codeTitle: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '18px',
    paddingRight: '18px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    fontFamily: font.mono,
    fontSize: '11.5px',
    letterSpacing: '0.04em',
    color: color.text3
  },
  pre: {
    margin: 0,
    paddingTop: '14px',
    paddingBottom: '14px',
    fontFamily: font.mono,
    fontSize: '13.5px',
    lineHeight: 1.7,
    color: color.text,
    overflowX: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: `${color.borderStrong} transparent`
  },
  line: {
    display: 'flex',
    gap: '16px',
    paddingLeft: '14px',
    paddingRight: '18px',
    borderLeftWidth: '2px',
    borderLeftStyle: 'solid',
    borderLeftColor: 'transparent',
    transitionProperty: 'background-color, border-color',
    transitionDuration: '0.35s'
  },
  lineOn: { backgroundColor: color.accentSoft, borderLeftColor: color.accent },
  flash: {
    animationName: { default: flash, [REDUCE]: 'none' },
    animationDuration: '0.6s',
    animationTimingFunction: 'ease-out'
  },
  gutter: {
    flexShrink: 0,
    width: '1.5ch',
    textAlign: 'right',
    color: color.text3,
    userSelect: 'none'
  },
  text: { whiteSpace: 'pre', fontFamily: 'inherit' },
  readout: {
    margin: 0,
    marginTop: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '1px',
    backgroundColor: color.border,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: '14px',
    overflow: 'hidden'
  },
  field: {
    backgroundColor: color.bg,
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: '18px',
    paddingRight: '18px'
  },
  wide: { gridColumnStart: 1, gridColumnEnd: -1 },
  key: { fontFamily: font.mono, fontSize: '11px', letterSpacing: '0.06em', color: color.text3 },
  val: {
    margin: 0,
    marginTop: '6px',
    fontFamily: font.mono,
    fontSize: '15px',
    color: color.text,
    transitionProperty: 'color',
    transitionDuration: '0.35s'
  }
})

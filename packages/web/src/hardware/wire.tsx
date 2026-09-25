// The top of /sdk: every payload the phone below sends, across all five types, as it arrives.
// Nothing is scripted; until the phone speaks, the wire says it is waiting.
import type { DeviceEvent } from '@doan-labs/duo-sdk'
import * as stylex from '@stylexjs/stylex'
import { Line } from '../highlight'
import { color, ease, font, radius } from '../tokens.stylex'

const REDUCE = '@media (prefers-reduced-motion: reduce)'

/** One 16 × 16 stroked glyph per type, drawn like the nav's: a speaker, a camera, power, a turn, a toggle. */
const GLYPHS: Record<DeviceEvent, string> = {
  volume: 'M2.25 6.25h2.5L8 3.5v9L4.75 9.75h-2.5zM10.75 5.75a3.25 3.25 0 0 1 0 4.5M12.75 3.75a6 6 0 0 1 0 8.5',
  'camera-control':
    'M2 5.25h2.5l1.25-1.75h4.5l1.25 1.75H14v7.25H2zM10.25 8.75a2.25 2.25 0 1 1-4.5 0a2.25 2.25 0 1 1 4.5 0',
  side: 'M8 1.75v5.5M4.75 4a5 5 0 1 0 6.5 0',
  orientation: 'M13.25 8A5.25 5.25 0 1 1 11.7 4.3M13.25 2v2.75H10.5',
  switches: 'M5.5 4.5h5a3.5 3.5 0 0 1 0 7h-5a3.5 3.5 0 0 1 0-7zM12.25 8a1.75 1.75 0 1 1-3.5 0a1.75 1.75 0 1 1 3.5 0'
}

export function Glyph({ type, size = 14 }: { type: DeviceEvent; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" {...stylex.props(styles.glyph)}>
      <path
        d={GLYPHS[type]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export type Wired = { n: number; type: DeviceEvent; text: string }

export function Wire({
  feed,
  types,
  heard,
  onJump
}: {
  /** Newest first. */
  feed: Wired[]
  types: DeviceEvent[]
  heard: Record<DeviceEvent, number>
  onJump: (i: number) => void
}) {
  return (
    <div {...stylex.props(styles.wrap)}>
      <div {...stylex.props(styles.panel)}>
        <div {...stylex.props(styles.bar)}>
          <span {...stylex.props(styles.dot, feed.length > 0 && styles.dotOn)} key={feed[0]?.n} />
          os.device.on
          <span {...stylex.props(styles.status)}>{feed.length ? 'listening' : 'connecting…'}</span>
        </div>
        <ol {...stylex.props(styles.feed)} aria-label="Every event heard, newest first">
          {feed.length === 0 ? (
            <li {...stylex.props(styles.row, styles.waiting)}>waiting for the phone to speak…</li>
          ) : (
            feed.map((e, i) => (
              <li key={e.n} {...stylex.props(styles.row, i === 0 && styles.rowNew, i > 2 && styles.rowOld)}>
                <span {...stylex.props(styles.type)}>
                  <Glyph type={e.type} />'{e.type}'
                </span>
                <code {...stylex.props(styles.payload)}>
                  <Line code={e.text} />
                </code>
              </li>
            ))
          )}
        </ol>
      </div>
      <nav aria-label="Chapters" {...stylex.props(styles.chips)}>
        {types.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => onJump(i)}
            {...stylex.props(styles.chip, heard[t] > 0 && styles.chipOn)}
          >
            <Glyph type={t} />
            {t}
            <span {...stylex.props(styles.count)}>{heard[t]}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

const arrive = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(-8px)', backgroundColor: color.accentSoft },
  to: { opacity: 1, transform: 'none', backgroundColor: 'transparent' }
})
const ping = stylex.keyframes({
  from: { boxShadow: `0 0 0 0 ${color.green}` },
  to: { boxShadow: '0 0 0 8px transparent' }
})

const styles = stylex.create({
  wrap: { minWidth: 0 },
  panel: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    boxShadow: color.shadow,
    overflow: 'hidden'
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '18px',
    paddingRight: '18px',
    fontFamily: font.mono,
    fontSize: '12px',
    color: color.text,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border
  },
  dot: { width: '8px', height: '8px', borderRadius: radius.pill, backgroundColor: color.text3 },
  // Keyed on the newest event, so the dot pings once per payload.
  dotOn: {
    backgroundColor: color.green,
    animationName: { default: ping, [REDUCE]: 'none' },
    animationDuration: '0.6s',
    animationTimingFunction: ease.out
  },
  status: { marginLeft: 'auto', color: color.text3 },
  feed: {
    listStyleType: 'none',
    margin: 0,
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: 0,
    paddingRight: 0,
    // Five rows tall from the start, so the first event does not push the page.
    minHeight: '190px',
    fontFamily: font.mono,
    fontSize: '12.5px',
    lineHeight: 1.6
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'calc(17ch + 22px) minmax(0, 1fr)',
    gap: '12px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '18px',
    paddingRight: '18px',
    whiteSpace: 'nowrap'
  },
  rowNew: {
    animationName: { default: arrive, [REDUCE]: 'none' },
    animationDuration: '0.5s',
    animationTimingFunction: ease.out
  },
  rowOld: { opacity: 0.5 },
  waiting: { display: 'block', color: color.text3, fontStyle: 'italic' },
  type: { display: 'inline-flex', alignItems: 'center', gap: '8px', color: color.accent },
  glyph: { display: 'block', flexShrink: 0 },
  payload: { fontFamily: font.mono, overflow: 'hidden', textOverflow: 'ellipsis' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '10px',
    paddingRight: '8px',
    fontFamily: font.mono,
    fontSize: '12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: color.text3,
    cursor: 'pointer',
    transitionProperty: 'color, border-color, background-color',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  chipOn: { color: color.accent, borderColor: color.accentSoft, backgroundColor: color.accentSoft },
  count: {
    minWidth: '20px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: radius.pill,
    backgroundColor: color.grayBg,
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums'
  }
})

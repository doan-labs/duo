// Glyphs the shared webp set lacks, drawn small for the tinted badges the
// tiles and list rows wear. Everything is currentColor or a caller's ink so a
// glyph tints exactly like a Sym mask.

import { Sym } from '@doan-labs/duo-uikit'
import type { GlyphKind } from './data.ts'

export const FlagGlyph = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4.4 2.2a1.4 1.4 0 0 1 1.4 1.4v16.6a1.4 1.4 0 0 1-2.8 0V3.6a1.4 1.4 0 0 1 1.4-1.4Z" />
    <path d="M7 3.4c3.8.9 7.5-1.5 13 .7l-3.2 4 3.2 3.9c-5.5-2.1-9.2.3-13-.6Z" />
  </svg>
)

/**
 * tray.full: the box plus the slip of paper inside. `back` is whatever the
 * badge behind is, so the slip reads as cut out; transparent leaves a tray.
 */
export const TrayGlyph = ({ size = 16, back = 'transparent' }: { size?: number; back?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M3.2 10.6h4l1.8-2.8a1.6 1.6 0 0 1 1.3-.7h3.4a1.6 1.6 0 0 1 1.3.7l1.8 2.8h4a1.5 1.5 0 0 1 1.5 1.5v6.4a3.5 3.5 0 0 1-3.5 3.5H5.2a3.5 3.5 0 0 1-3.5-3.5v-6.4a1.5 1.5 0 0 1 1.5-1.5Z"
    />
    <rect x="7" y="14.4" width="10" height="1.9" rx=".95" fill={back} />
  </svg>
)

/** The Today tile's calendar page: white card, tint strip, today's day number. */
export const TodayGlyph = ({
  size = 16,
  tint = 'currentColor',
  day = new Date().getDate()
}: {
  size?: number
  tint?: string
  day?: number
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4.6" y="3.8" width="14.8" height="16" rx="3.2" fill="currentColor" />
    <rect x="4.6" y="7.5" width="14.8" height="1.4" fill={tint} />
    <text x="12" y="17.4" textAnchor="middle" fontSize="8.6" fontWeight="700" fill={tint} fontFamily="inherit">
      {day}
    </text>
  </svg>
)

/** The Scheduled tile's calendar page: tint strip over a dot grid. */
export const ScheduledGlyph = ({ size = 16, tint = 'currentColor' }: { size?: number; tint?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4.6" y="3.8" width="14.8" height="16" rx="3.2" fill="currentColor" />
    <rect x="4.6" y="7.5" width="14.8" height="1.4" fill={tint} />
    {[10.9, 13.6, 16.3].map((y) =>
      [7.2, 10.4, 13.6, 16.8].map((x) => <circle key={`${x}:${y}`} cx={x} cy={y} r=".95" fill={tint} />)
    )}
  </svg>
)

/** The tag chip's hash, drawn so `#tag` pages get a real glyph. */
export const HashGlyph = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M9.4 4.4 7.6 19.6M16.4 4.4l-1.8 15.2M4.8 8.8h15.2M4 15.2h15.2" />
  </svg>
)

/** One dispatch for every smart-list badge. */
export const SmartGlyph = ({
  kind,
  size = 16,
  tint,
  back
}: {
  kind: GlyphKind
  size?: number
  tint?: string
  back?: string
}) => {
  if (kind === 'today') return <TodayGlyph size={size} tint={tint} />
  if (kind === 'scheduled') return <ScheduledGlyph size={size} tint={tint} />
  if (kind === 'tray') return <TrayGlyph size={size} back={back} />
  if (kind === 'flag') return <FlagGlyph size={size} />
  if (kind === 'hash') return <HashGlyph size={size} />
  return <Sym name="tick" size={size} />
}

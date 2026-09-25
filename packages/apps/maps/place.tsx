import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import type { Place } from './data.ts'
import { Glyph } from './glyphs.tsx'
import { formatLength, formatMin } from './live.ts'
import { styles } from './styles.ts'

/** The drive-time estimate the card shows once the router has answered. */
export type Estimate = { duration: number; distance: number }

/** Apple's place card: a header, the directions button, the details it knows, and the tray. */
export function PlaceCard({
  place,
  estimate,
  onDirections,
  onClose
}: {
  place: Place
  estimate: Estimate | null
  onDirections: () => void
  onClose: () => void
}) {
  const [pinned, setPinned] = useState(false)
  const [starred, setStarred] = useState(false)
  return (
    <>
      <div {...stylex.props(styles.cardTop)}>
        <button type="button" aria-label="Close" onClick={onClose} {...stylex.props(styles.round, styles.cardClose)}>
          <Sym name="close" size={11} />
        </button>
      </div>
      <div {...stylex.props(styles.scroll)}>
        <h1 {...stylex.props(styles.title)}>{place.name}</h1>
        <div {...stylex.props(styles.kind)}>{place.kind}</div>
        <button type="button" onClick={onDirections} {...stylex.props(styles.go)}>
          <Glyph name="car" size={16} />
          {estimate ? `${formatMin(estimate.duration)} · ${formatLength(estimate.distance)}` : 'Directions'}
        </button>
        <div {...stylex.props(styles.hdr)}>Details</div>
        <Field label="Phone" value={place.phone} />
        <Field label="Website" value={place.site} />
        <div {...stylex.props(styles.detail)}>
          <span {...stylex.props(styles.label)}>Address</span>
          <span {...stylex.props(styles.value)}>
            {place.address.length ? (
              place.address.map((line) => <span key={line}>{line}</span>)
            ) : (
              <span>
                {place.lat.toFixed(5)}, {place.lon.toFixed(5)}
              </span>
            )}
          </span>
        </div>
        <button type="button" aria-pressed={pinned} onClick={() => setPinned(!pinned)} {...stylex.props(styles.action)}>
          <i {...stylex.props(styles.actionGlyph)}>
            <Sym name="pin" size={15} />
          </i>
          {pinned ? 'Pinned' : 'Pin'}
        </button>
        <div {...stylex.props(styles.gap)} />
      </div>
      <div {...stylex.props(styles.tray)}>
        <button
          type="button"
          aria-label="Favourite"
          aria-pressed={starred}
          onClick={() => setStarred(!starred)}
          {...stylex.props(styles.ghost, starred && styles.starred)}
        >
          <Sym name="star" size={14} />
        </button>
      </div>
    </>
  )
}

/** A detail Apple knows about the place. What it doesn't know, it leaves out. */
const Field = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <div {...stylex.props(styles.detail)}>
      <span {...stylex.props(styles.label)}>{label}</span>
      <span {...stylex.props(styles.value)}>{value}</span>
    </div>
  ) : null

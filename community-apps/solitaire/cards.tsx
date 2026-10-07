// Original vector card art: the faces, courts and back are drawn here, not
// lifted from a deck asset. Suit glyphs are hand-written paths on a 24 grid;
// faces use kit colours so the reds and inks match the rest of the device.
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type Card, isRed, RANK_NAMES, type Suit } from './game.ts'
import { styles } from './styles.ts'

export const suitColor = (suit: Suit) => (isRed(suit) ? colors.red : colors.grey6Dark)

/** One hand-drawn pip path per suit, drawn in `currentColor`. */
export function SuitGlyph({ suit, grow }: { suit: Suit; grow?: boolean }) {
  const path =
    suit === 0
      ? // Spade: an inverted heart with a stem.
        'M12 2.6c-3.6 4.6-8.1 8-8.1 12.2 0 2.6 2 4.3 4.3 4.3 1.6 0 2.9-.7 3.8-1.8-.2 1.7-1 2.9-2.5 3.7h5c-1.5-.8-2.3-2-2.5-3.7.9 1.1 2.2 1.8 3.8 1.8 2.3 0 4.3-1.7 4.3-4.3 0-4.2-4.5-7.6-8.1-12.2z'
      : suit === 1
        ? // Heart.
          'M12 20.4C6.9 15.9 3.3 12.4 3.3 8.6 3.3 5.9 5.5 4 7.9 4c1.7 0 3.2.9 4.1 2.2C12.9 4.9 14.4 4 16.1 4c2.4 0 4.6 1.9 4.6 4.6 0 3.8-3.6 7.3-8.7 11.8z'
        : suit === 2
          ? // Diamond.
            'M12 2.8l6.2 9.2-6.2 9.2-6.2-9.2z'
          : // Club: three lobes and a stem.
            'M12 2.9a4.2 4.2 0 0 0-4.2 4.2c0 .3 0 .6.1.8a4.2 4.2 0 1 0 2.6 7.5c-.4 1.5-1.2 2.7-2.5 3.4-.6.3-.2 1.2.4 1.2h7.2c.6 0 1-.9.4-1.2-1.3-.7-2.1-1.9-2.5-3.4a4.2 4.2 0 1 0 2.6-7.5c.1-.2.1-.5.1-.8A4.2 4.2 0 0 0 12 2.9z'
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stylex.props(styles.suitGlyph, grow && styles.suitGrow)}>
      <path d={path} fill="currentColor" />
    </svg>
  )
}

// Pip grid for the number ranks, positions in a 3-wide by 4-tall centre field.
// Each entry is [column, row]; symmetric top/bottom like a printed deck.
const PIPS: Record<number, [number, number][]> = {
  2: [
    [1, 0],
    [1, 3]
  ],
  3: [
    [1, 0],
    [1, 1.5],
    [1, 3]
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 3],
    [2, 3]
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1.5],
    [0, 3],
    [2, 3]
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1.5],
    [2, 1.5],
    [0, 3],
    [2, 3]
  ],
  7: [
    [0, 0],
    [2, 0],
    [1, 0.75],
    [0, 1.5],
    [2, 1.5],
    [0, 3],
    [2, 3]
  ],
  8: [
    [0, 0],
    [2, 0],
    [1, 0.75],
    [0, 1.5],
    [2, 1.5],
    [1, 2.25],
    [0, 3],
    [2, 3]
  ],
  9: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [1, 1.5],
    [0, 2],
    [2, 2],
    [0, 3],
    [2, 3]
  ],
  10: [
    [0, 0],
    [2, 0],
    [1, 0.5],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
    [1, 2.5],
    [0, 3],
    [2, 3]
  ]
}

/** Face-card medallions: an original geometric court, a letter under its own emblem. */
function CourtArt({ rank, suit }: { rank: number; suit: Suit }) {
  const ink = suitColor(suit)
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" {...stylex.props(styles.courtArt)}>
      {/* A shared bevelled medallion; the emblem above the letter marks the rank. */}
      <rect x="7" y="4" width="26" height="32" rx="8" fill="none" stroke={ink} strokeWidth="1.6" />
      <rect x="10.5" y="7.5" width="19" height="25" rx="5" fill="none" stroke={ink} strokeWidth="0.9" opacity="0.5" />
      {rank === 12 ? (
        // King: a three-point crown.
        <path d="M12.5 13.5l2.5 3.4 5-5.6 5 5.6 2.5-3.4-1.2 6.8h-12.6z" fill={ink} opacity="0.92" />
      ) : null}
      {rank === 11 ? (
        // Queen: a ring of laurel beads over a double band.
        <g fill={ink} opacity="0.92">
          <circle cx="14.5" cy="13" r="1.5" />
          <circle cx="20" cy="11.8" r="1.5" />
          <circle cx="25.5" cy="13" r="1.5" />
          <path d="M12.5 17.5a8.6 8.6 0 0 0 15 0l-1.7-1.1a6.5 6.5 0 0 1-11.6 0z" />
        </g>
      ) : null}
      {rank === 10 ? (
        // Jack: the squire's spear, a single rising stroke.
        <path d="M14.5 18.5l11-8.5-1.2 3.4 2.6-.9-2.9 8.5.8-2.6-8.2 5.6z" fill={ink} opacity="0.92" />
      ) : null}
      <text x="20" y="31" textAnchor="middle" fill={ink} fontSize="11.5" fontWeight="700" fontFamily="inherit">
        {RANK_NAMES[rank]}
      </text>
    </svg>
  )
}

/** The card's face: corner indices top-left and bottom-right, pips or a medallion in the middle.
    `bare` strips the corner to the rank alone for a mostly-covered card,
    where a clipped suit glyph reads worse than none. */
export function CardFace({ card, small, bare }: { card: Card; small?: boolean; bare?: boolean }) {
  const ink = suitColor(card.suit)
  const rank = RANK_NAMES[card.rank]!
  const court = card.rank >= 10 // J, Q, K
  if (bare)
    return (
      <span {...stylex.props(styles.face)} aria-hidden="true">
        <span {...stylex.props(styles.corner, styles.cornerTop, styles.suitInk(ink))}>
          <b {...stylex.props(styles.cornerRank)}>{rank}</b>
        </span>
        <i {...stylex.props(styles.soloPip, styles.suitInk(ink))}>
          <SuitGlyph suit={card.suit} />
        </i>
      </span>
    )
  return (
    <span {...stylex.props(styles.face)} aria-hidden="true">
      <span {...stylex.props(styles.corner, styles.cornerTop)}>
        <b {...stylex.props(styles.cornerRank)}>{rank}</b>
        <i {...stylex.props(styles.cornerSuit, styles.suitInk(ink))}>
          <SuitGlyph suit={card.suit} />
        </i>
      </span>
      <span {...stylex.props(styles.corner, styles.cornerBottom)}>
        <b {...stylex.props(styles.cornerRank)}>{rank}</b>
        <i {...stylex.props(styles.cornerSuit, styles.suitInk(ink))}>
          <SuitGlyph suit={card.suit} />
        </i>
      </span>
      {card.rank === 0 ? (
        // The ace gets its suit at full size.
        <i {...stylex.props(styles.acePip, styles.suitInk(ink))}>
          <SuitGlyph suit={card.suit} grow />
        </i>
      ) : court ? (
        <Court rank={card.rank} suit={card.suit} />
      ) : small ? (
        // Cover-sized cards keep one readable centre pip instead of a blur of ten.
        <i {...stylex.props(styles.soloPip, styles.suitInk(ink))}>
          <SuitGlyph suit={card.suit} />
        </i>
      ) : (
        <Pips card={card} />
      )}
    </span>
  )
}

function Court({ rank, suit }: { rank: number; suit: Suit }) {
  return (
    <span {...stylex.props(styles.court)}>
      <CourtArt rank={rank} suit={suit} />
    </span>
  )
}

function Pips({ card }: { card: Card }) {
  const ink = suitColor(card.suit)
  const pips = PIPS[card.rank] ?? []
  return (
    <span {...stylex.props(styles.pipGrid)}>
      {pips.map(([x, y], i) => (
        <i
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed layout, never reorders
          key={i}
          {...stylex.props(styles.pip, styles.pipAt(x, y), styles.suitInk(ink), y >= 1.9 && styles.pipFlip)}
        >
          <SuitGlyph suit={card.suit} />
        </i>
      ))}
    </span>
  )
}

/**
 * The card back: a deep indigo field, a woven lattice and the two-fold mark -
 * the deck is Duo's own, drawn for this table.
 */
export function CardBack() {
  return (
    <span {...stylex.props(styles.back)} aria-hidden="true">
      <span {...stylex.props(styles.backFrame)}>
        <svg viewBox="0 0 40 56" {...stylex.props(styles.backMark)}>
          <g fill="none" stroke={colors.white} strokeWidth="2.4" opacity="0.9">
            <rect x="8" y="18" width="15" height="20" rx="4.5" />
            <rect x="17" y="18" width="15" height="20" rx="4.5" opacity="0.55" />
          </g>
        </svg>
      </span>
    </span>
  )
}

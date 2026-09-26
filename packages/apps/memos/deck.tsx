// The record deck, pinned to the bottom of the app like iOS's. Collapsed it is
// one red dot; open it is the take in progress: elapsed time, the live level
// waveform, pause/resume and Done. Denied and unavailable states get real
// cards with honest copy and a retry, never a fake take.

import { mmss } from '@doan-labs/duo-fixtures'
import { Button } from '@doan-labs/duo-uikit'
import {
  app,
  appAppearance,
  colors,
  glass,
  radius,
  space,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { discardRec, pauseRec, replaceState, resumeRec, startRec, stopAndSave, useLevels, useRec } from './engine.ts'
import { Glyph } from './glyphs.tsx'
import { useMemos } from './store.ts'
import { Wave } from './wave.tsx'

export function Deck() {
  const rec = useRec()
  const levels = useLevels()
  const { deck, setDeck } = useMemos()
  const busy = ['starting', 'recording', 'paused', 'saving'].includes(rec.phase)
  // A take armed for the editor is not the deck's to control or end.
  const replacing = replaceState.get().active && (rec.phase === 'recording' || rec.phase === 'paused')
  // Not Now's latch: the denied/unavailable phase persists until the next
  // attempt, so dismissal needs to outlive it. The next Record press passes
  // through 'starting' first, which is what clears it.
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    if (rec.phase !== 'denied' && rec.phase !== 'unavailable') setDismissed(false)
  }, [rec.phase])
  // Collapse only asks to hide the card: a live take keeps running under the
  // rail, and the dot there turns into the take's indicator and its way back.
  const open =
    !replacing && (deck === 'open' || (!dismissed && (rec.phase === 'denied' || rec.phase === 'unavailable')))

  if (!open)
    return (
      <div {...stylex.props(styles.rail)}>
        <button
          type="button"
          aria-label={busy ? 'Show recorder' : 'Record'}
          {...stylex.props(styles.dot)}
          onClick={() => {
            setDeck('open')
            if (!busy) void startRec()
          }}
        >
          {busy && <Glyph name="mic" size={18} />}
        </button>
      </div>
    )

  return (
    <div {...stylex.props(styles.deck)}>
      {rec.phase === 'denied' || rec.phase === 'unavailable' ? (
        <div {...stylex.props(styles.cardBody)}>
          <Glyph name="micOff" size={26} />
          <div {...stylex.props(styles.cardTitle)}>
            {rec.phase === 'denied' ? 'Microphone access needed' : 'Recording unavailable'}
          </div>
          <div {...stylex.props(styles.cardText)}>
            {rec.phase === 'denied'
              ? 'Voice Memos cannot record until the microphone is allowed. You can still browse and play your recordings.'
              : 'This device or browser cannot capture audio. Your recordings are still available below.'}
          </div>
          <div {...stylex.props(styles.cardRow)}>
            <Button
              variant="plain"
              onClick={() => {
                setDismissed(true)
                setDeck('closed')
              }}
            >
              Not Now
            </Button>
            {rec.phase === 'denied' && (
              <Button
                variant="tinted"
                onClick={() => {
                  setDismissed(false)
                  void startRec()
                }}
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div {...stylex.props(styles.clock)}>{mmss(rec.elapsed / 1000)}</div>
          <div {...stylex.props(styles.status)}>
            {rec.phase === 'starting'
              ? 'Requesting microphone…'
              : rec.phase === 'saving'
                ? 'Saving…'
                : rec.phase === 'paused'
                  ? 'Paused'
                  : 'Recording'}
          </div>
          <div {...stylex.props(styles.live)}>
            <Wave peaks={levels} live height={64} />
          </div>
          <div {...stylex.props(styles.controls)}>
            <Button
              variant="plain"
              onClick={() => {
                setDeck('closed')
                void discardRec()
              }}
              disabled={rec.phase !== 'paused'}
            >
              Delete
            </Button>
            {rec.phase === 'recording' && (
              <button type="button" aria-label="Pause" {...stylex.props(styles.ringBtn)} onClick={pauseRec}>
                <Glyph name="pause" size={22} />
              </button>
            )}
            {rec.phase === 'paused' && (
              <button
                type="button"
                aria-label="Resume"
                {...stylex.props(styles.ringBtn, styles.ringHot)}
                onClick={resumeRec}
              >
                <Glyph name="mic" size={22} />
              </button>
            )}
            <button
              type="button"
              aria-label="Done"
              {...stylex.props(styles.ringBtn)}
              onClick={() => {
                setDeck('closed')
                void stopAndSave()
              }}
              disabled={rec.phase === 'starting' || rec.phase === 'saving'}
            >
              <span {...stylex.props(styles.stopSq)} />
            </button>
          </div>
          <button
            type="button"
            {...stylex.props(styles.collapse)}
            onClick={() => setDeck('closed')}
            aria-label="Hide recorder"
          >
            v
          </button>
        </>
      )}
    </div>
  )
}

const styles = stylex.create({
  rail: {
    position: 'absolute',
    bottom: space.lg,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none'
  },
  dot: {
    pointerEvents: 'auto',
    width: 56,
    height: 56,
    borderRadius: radius.circle,
    borderWidth: 0,
    backgroundColor: appAppearance.memosFill,
    cursor: 'pointer',
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    '::after': {
      content: '""',
      width: 34,
      height: 34,
      borderRadius: radius.circle,
      backgroundColor: colors.red
    }
  },
  deck: {
    position: 'absolute',
    bottom: space.lg,
    left: space.md,
    right: space.md,
    backgroundColor: appAppearance.memosFill,
    backdropFilter: glass.blur,
    borderRadius: radius.xl,
    paddingBlock: space.md,
    paddingInline: space.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    color: app.fg
  },
  clock: {
    fontSize: typeScale.largeTitle,
    fontWeight: weight.regular,
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums'
  },
  status: { textAlign: 'center', color: app.label3, fontSize: typeScale.caption1 },
  live: { paddingBlock: space.xs },
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  ringBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.circle,
    borderWidth: 0,
    backgroundColor: app.elevated,
    color: app.fg,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer'
  },
  ringHot: { color: colors.red },
  stopSq: { width: 16, height: 16, borderRadius: radius.xs, backgroundColor: colors.red },
  collapse: {
    position: 'absolute',
    top: space.sm,
    right: space.md,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: app.label3,
    cursor: 'pointer',
    fontSize: typeScale.footnote
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.sm,
    paddingBlock: space.sm,
    color: app.fg,
    textAlign: 'center'
  },
  cardTitle: { fontSize: typeScale.headline, fontWeight: weight.semibold },
  cardText: { fontSize: typeScale.footnote, color: app.label2, maxWidth: 260 },
  cardRow: { display: 'flex', gap: space.sm, paddingTop: space.xs }
})

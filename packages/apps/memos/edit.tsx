// The edit page: drag the crop marks to trim, or Replace to record over the
// playhead. Both edits land on a decoded buffer and re-encode to WAV; 'Save as
// New Recording' always preserves the original file. While replacing, the
// recorder is the engine's - the same singleton the deck uses.

import { mmss } from '@doan-labs/duo-fixtures'
import { Button, Page, Section, Sheet } from '@doan-labs/duo-uikit'
import {
  app,
  appAppearance,
  colors,
  leading,
  radius,
  space,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { decode, splice, wav } from './audio.ts'
import {
  hasMic,
  pausePlay,
  playMemo,
  readFile,
  replaceState,
  scrubMemo,
  startRec,
  stopPlay,
  stopReplace,
  usePlay,
  useRec,
  writeTake
} from './engine.ts'
import { Glyph } from './glyphs.tsx'
import type { Memo } from './store.ts'
import { Wave } from './wave.tsx'

export function EditMemo({ memo, back }: { memo: Memo; back: () => void }) {
  const [buf, setBuf] = useState<AudioBuffer | null>(null)
  const [error, setError] = useState('')
  const [trim, setTrim] = useState<[number, number]>([0, 1])
  const [confirm, setConfirm] = useState<'trim' | 'replace' | null>(null)
  const [busy, setBusy] = useState(false)
  const rec = useRec()
  const play = usePlay()
  const playing = play?.id === memo.id && play.playing
  const posMs = play?.id === memo.id ? play.posMs : 0

  useEffect(() => {
    let live = true
    readFile(memo.file).then(async (blob) => {
      if (!live) return
      if (!blob) return setError('The audio file could not be read from storage.')
      try {
        setBuf(await decode(blob))
      } catch {
        setError('This recording cannot be edited - the browser cannot decode its format.')
      }
    })
    return () => {
      live = false
      stopPlay(memo.id)
    }
  }, [memo.id, memo.file])

  const replacing = rec.phase === 'recording' && replaceState.get().active
  const fromSec = trim[0] * (buf?.duration ?? 0)
  const toSec = trim[1] * (buf?.duration ?? 0)
  const trimmed = buf ? Math.abs(toSec - fromSec - buf.duration) > 0.05 : false
  const replacedSec = replaceState.get().atSec

  const applyTrim = async (asNew: boolean) => {
    if (!buf) return
    setBusy(true)
    try {
      const blob = wav(buf, fromSec, toSec)
      if (asNew) {
        await saveAsNew(memo, blob)
      } else {
        await writeTake(memo, blob, 'audio/wav')
      }
      back()
    } finally {
      setBusy(false)
    }
  }

  const applyReplace = async (asNew: boolean) => {
    if (!buf || replacedSec == null) return
    setBusy(true)
    try {
      const take = replaceState.get().blob
      if (!take) throw new Error('no take')
      const insert = await decode(take)
      const blob = splice(buf, replacedSec, insert)
      if (asNew) await saveAsNew(memo, blob)
      else await writeTake(memo, blob, 'audio/wav')
      back()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page title="Edit Recording" back={back}>
      <div {...stylex.props(styles.name)}>{memo.name}</div>
      <div {...stylex.props(styles.waveWrap)}>
        <Wave
          peaks={memo.peaks}
          pos={memo.ms ? posMs / memo.ms : 0}
          trim={trim}
          onTrim={(edge, v) => setTrim(edge === 0 ? [Math.min(v, trim[1]), trim[1]] : [trim[0], Math.max(v, trim[0])])}
          onScrub={(p) => scrubMemo(memo, p * memo.ms)}
          height={110}
        />
      </div>
      <div {...stylex.props(styles.times)}>
        <span>{mmss(posMs / 1000)}</span>
        <span {...stylex.props(styles.dim)}>
          {mmss(fromSec)} - {mmss(toSec)}
        </span>
      </div>
      <div {...stylex.props(styles.transport)}>
        {replacing ? (
          <div {...stylex.props(styles.replacing)}>
            <span {...stylex.props(styles.recDot)} />
            <span>{mmss(rec.elapsed / 1000)}</span>
            <Button variant="filled" onClick={() => void stopReplace()}>
              Stop
            </Button>
          </div>
        ) : (
          <>
            <button
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              {...stylex.props(styles.playBtn)}
              onClick={() => (playing ? pausePlay() : void playMemo(memo))}
            >
              <Glyph name={playing ? 'pause' : 'play'} size={26} />
            </button>
            <Button
              variant="tinted"
              disabled={!hasMic() || rec.phase === 'denied' || rec.phase === 'unavailable'}
              onClick={() => void startRec({ replaceAtSec: posMs / 1000 })}
            >
              Replace
            </Button>
          </>
        )}
      </div>
      {rec.phase === 'denied' && (
        <div {...stylex.props(styles.notice)}>Microphone access needed - allow it and press Replace again.</div>
      )}
      {rec.phase === 'unavailable' && (
        <div {...stylex.props(styles.notice)}>Recording is not available on this device.</div>
      )}
      {error && <div {...stylex.props(styles.notice)}>{error}</div>}
      <Section xstyle={[styles.row]}>
        <Button variant="tinted" disabled={!buf || !trimmed || busy} onClick={() => setConfirm('trim')}>
          Trim
        </Button>
        <Button variant="tinted" disabled={replacedSec == null || busy} onClick={() => setConfirm('replace')}>
          Apply Replace
        </Button>
      </Section>
      {confirm && (
        <Sheet open onClose={() => setConfirm(null)}>
          <div {...stylex.props(styles.sheet)}>
            <div {...stylex.props(styles.sheetTitle)}>
              {confirm === 'trim' ? 'Trim this recording?' : 'Apply the replaced section?'}
            </div>
            <div {...stylex.props(styles.sheetText)}>
              {confirm === 'trim'
                ? 'Trim Original overwrites this recording. Save as New Recording keeps it and saves the trimmed part.'
                : 'Apply to Original overwrites this recording. Save as New Recording keeps it and saves a copy with the new audio.'}
            </div>
            <div {...stylex.props(styles.sheetBtns)}>
              <Button
                variant="tinted"
                disabled={busy}
                onClick={() => void (confirm === 'trim' ? applyTrim(false) : applyReplace(false))}
              >
                {confirm === 'trim' ? 'Trim Original' : 'Apply to Original'}
              </Button>
              <Button
                variant="filled"
                disabled={busy}
                onClick={() => void (confirm === 'trim' ? applyTrim(true) : applyReplace(true))}
              >
                Save as New Recording
              </Button>
            </div>
            <Button variant="plain" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
          </div>
        </Sheet>
      )}
    </Page>
  )
}

/** The safe path: the original file is untouched, a fresh memo appears. */
async function saveAsNew(memo: Memo, blob: Blob) {
  const { saveCopy } = await import('./engine.ts')
  await saveCopy(memo, blob)
}

const styles = stylex.create({
  name: {
    paddingInline: space.lg,
    paddingTop: space.xs,
    fontSize: typeScale.title3,
    fontWeight: weight.semibold
  },
  waveWrap: {
    marginInline: space.lg,
    marginTop: space.md,
    paddingBlock: space.sm,
    backgroundColor: appAppearance.memosFill,
    borderRadius: radius.lg,
    overflow: 'hidden'
  },
  times: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingInline: space.lg,
    paddingTop: space.xs,
    fontVariantNumeric: 'tabular-nums',
    fontSize: typeScale.caption1
  },
  dim: { color: app.label3 },
  transport: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    paddingTop: space.md
  },
  playBtn: {
    width: 52,
    height: 52,
    borderWidth: 0,
    borderRadius: radius.circle,
    backgroundColor: appAppearance.memosFill,
    color: app.fg,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer'
  },
  replacing: { display: 'flex', alignItems: 'center', gap: space.md, color: colors.red },
  recDot: { width: 10, height: 10, borderRadius: radius.circle, backgroundColor: colors.red },
  notice: {
    marginInline: space.lg,
    marginTop: space.md,
    color: colors.yellowDark,
    fontSize: typeScale.footnote,
    lineHeight: leading.body,
    textAlign: 'center'
  },
  row: {
    display: 'flex',
    justifyContent: 'center',
    gap: space.md,
    paddingTop: space.lg
  },
  sheet: { padding: space.lg, display: 'flex', flexDirection: 'column', gap: space.md },
  sheetTitle: { fontSize: typeScale.headline, fontWeight: weight.semibold },
  sheetText: { fontSize: typeScale.footnote, color: app.label2, lineHeight: leading.body },
  sheetBtns: { display: 'flex', flexDirection: 'column', gap: space.sm }
})

// Voicemail: a row expands in place into the player - play/pause, a scrubber,
// a speaker toggle, then Call Back / Share / Delete and the transcript. The
// first play clears the blue dot.

import { mmss } from '@doan-labs/duo-fixtures'
import { Section, Text, Title } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import type { Voicemail } from './data.ts'
import { when } from './data.ts'
import { Glyph } from './glyphs.tsx'
import { place, type VmPlayback, vmPause, vmPlay, vmSeek } from './store.ts'
import { styles } from './styles.ts'

export function Voicemails({
  voicemails,
  open,
  playback,
  onOpen,
  onDelete,
  onShare
}: {
  voicemails: Voicemail[]
  open: string
  playback: VmPlayback | null
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onShare: (v: Voicemail) => void
}) {
  return (
    <>
      <Title>Voicemail</Title>
      <Section xstyle={[styles.list]}>
        {voicemails.map((v) => (
          <div key={v.id} {...stylex.props(styles.vmRow)}>
            <button type="button" {...stylex.props(styles.vmHit)} onClick={() => onOpen(open === v.id ? '' : v.id)}>
              <span {...stylex.props(styles.unheard, v.heard && styles.heard)} />
              <span {...stylex.props(styles.vmWho)}>
                <span {...stylex.props(styles.name)}>{v.name}</span>
                <Text as="div" size="caption" xstyle={[styles.vmPrev]}>
                  {v.transcript}
                </Text>
              </span>
              <span {...stylex.props(styles.recTime)}>{when(v.at)}</span>
            </button>
            {open === v.id && (
              <Player v={v} play={playback?.id === v.id ? playback : null} onDelete={onDelete} onShare={onShare} />
            )}
          </div>
        ))}
        {!voicemails.length && <div {...stylex.props(styles.empty)}>No Voicemail</div>}
      </Section>
    </>
  )
}

function Player({
  v,
  play,
  onDelete,
  onShare
}: {
  v: Voicemail
  play: VmPlayback | null
  onDelete: (id: string) => void
  onShare: (v: Voicemail) => void
}) {
  const pos = play?.pos ?? 0
  const [speaker, setSpeaker] = useState(false)
  return (
    <div {...stylex.props(styles.vmPlay)}>
      <div {...stylex.props(styles.vmTrack)}>
        <button
          type="button"
          aria-label={play?.playing ? 'Pause' : 'Play'}
          {...stylex.props(styles.vmCtl)}
          onClick={() => (play?.playing ? vmPause() : vmPlay(v.id))}
        >
          <Glyph name={play?.playing ? 'pause' : 'play'} size={22} />
        </button>
        <input
          type="range"
          aria-label="Playback position"
          min={0}
          max={v.secs}
          step={0.1}
          value={pos}
          onChange={(e) => vmSeek(v.id, e.target.valueAsNumber)}
          {...stylex.props(styles.vmRange)}
        />
        <button
          type="button"
          aria-label="Speaker"
          aria-pressed={speaker}
          {...stylex.props(styles.vmCtl, speaker && styles.vmCtlOn)}
          onClick={() => setSpeaker((s) => !s)}
        >
          <Glyph name="speaker" size={20} />
        </button>
      </div>
      <div {...stylex.props(styles.vmTime)}>
        <span>{mmss(Math.floor(pos))}</span>
        <span>{mmss(v.secs)}</span>
      </div>
      <div {...stylex.props(styles.vmTranscript)}>{v.transcript}</div>
      <div {...stylex.props(styles.vmActs)}>
        <button
          type="button"
          {...stylex.props(styles.vmAct)}
          onClick={() => place({ number: v.number, contactId: v.contactId })}
        >
          Call Back
        </button>
        <button type="button" {...stylex.props(styles.vmAct)} onClick={() => onShare(v)}>
          Share
        </button>
        <button type="button" {...stylex.props(styles.vmAct, styles.danger)} onClick={() => onDelete(v.id)}>
          Delete
        </button>
      </div>
    </div>
  )
}

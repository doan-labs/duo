import type { DeviceEvent, Switches } from '@doan-labs/duo-sdk'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { CHAPTERS } from '../hardware/showcase'
import { SwitchTiles } from '../hardware/switch-tiles'
import { Tour } from '../hardware/tour'
import { type Cue, type Heard, Simulator, type Spots } from '../simulator'
import { color, ease, font, radius } from '../tokens.stylex'

const TYPES: DeviceEvent[] = ['volume', 'camera-control', 'side', 'orientation', 'switches']

/** What each type's payload says, in a line: the press, the pose. */
function sayOf(e: Heard): string {
  switch (e.type) {
    case 'volume':
      return `${e.data.button} ${e.data.action}`
    case 'camera-control':
      return e.data.action === 'slide' ? `slide ${e.data.offset.toFixed(2)} cm` : e.data.action
    case 'side':
      return e.data.action
    case 'orientation':
      return `yaw ${e.data.yaw.toFixed(1)}°  hinge ${e.data.hinge.toFixed(1)}°`
    // Drawn as Control Center's glyphs instead (SwitchTiles).
    case 'switches':
      return ''
  }
}

/**
 * The real shell, one per post (the site's WebGL budget, decision 76). With
 * `hear`, it is also an app listening to every device event: the panel beside
 * it shows the last payload of each type, straight from the shell's bridge, and
 * the volume and Camera Control presses are the page's, exactly as they would
 * be an app's. Each row's play button tours its cap as /sdk does: the phone
 * takes that chapter's pose and a ring pulses on the real button.
 */
export function Live({ deg = 150, app, hear = false }: { deg?: number; app?: string; hear?: boolean }) {
  const [last, setLast] = useState<Partial<Record<DeviceEvent, { say: string; n: number; at: number }>>>({})
  const [touring, setTouring] = useState<{ step: number; since: number } | null>(null)
  const [spots, setSpots] = useState<Spots | null>(null)
  const [switches, setSwitches] = useState<Switches>()
  const onDevice = (e: Heard) => {
    if (e.type === 'switches') setSwitches(e.data)
    setLast((l) => ({ ...l, [e.type]: { say: sayOf(e), n: (l[e.type]?.n ?? 0) + 1, at: performance.now() } }))
  }
  const chapter = touring ? CHAPTERS[touring.step] : undefined
  const tour = (step: number | null) => setTouring(step === null ? null : { step, since: performance.now() })
  // The pose eases into place and every step of that ease is an orientation event;
  // only one heard after it settles is the reader's.
  const heardAt = chapter && last[chapter.type]?.at
  const done = !!touring && !!heardAt && heardAt > touring.since + (chapter?.type === 'orientation' ? 1500 : 0)
  const cue: Cue = chapter?.type === 'switches' ? { control: true } : {}
  return (
    <figure {...stylex.props(styles.figure)}>
      <div {...stylex.props(styles.stage, hear && styles.stageSplit)}>
        <div {...stylex.props(styles.device)}>
          <Simulator
            deg={chapter?.pose?.deg ?? deg}
            yaw={chapter?.pose?.yaw}
            app={app}
            cue={cue}
            hear={hear ? TYPES : undefined}
            onDevice={hear ? onDevice : undefined}
            onSpots={chapter ? setSpots : undefined}
          />
          {chapter && touring && (
            <Tour
              stop={chapter.tour}
              step={touring.step}
              steps={CHAPTERS.length}
              spots={spots}
              done={done}
              onStep={tour}
              onClose={() => tour(null)}
            />
          )}
        </div>
        {hear && (
          <ol {...stylex.props(styles.wire)} aria-live="polite">
            {TYPES.map((t, i) => {
              const e = last[t]
              const on = touring?.step === i
              return (
                <li key={t} {...stylex.props(styles.row, on && styles.rowOn)}>
                  <code {...stylex.props(styles.type)}>os.device.on('{t}')</code>
                  <span {...stylex.props(styles.value)}>
                    {/* Re-keyed per event, so each arrival replays the flash. */}
                    {t === 'switches' && switches ? (
                      <SwitchTiles s={switches} />
                    ) : (
                      <span key={e?.n ?? 0} {...stylex.props(styles.say, e && styles.flash)}>
                        {e ? e.say : 'waiting'}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    aria-label={on ? 'Stop the tour' : `Show me: ${CHAPTERS[i]?.tour.title}`}
                    aria-pressed={on}
                    onClick={() => tour(on ? null : i)}
                    {...stylex.props(styles.play, on && styles.playOn)}
                  >
                    <svg viewBox="0 0 10 10" aria-hidden="true" {...stylex.props(styles.glyph)}>
                      <path d={on ? 'M2 2h6v6H2z' : 'M2.5 1.2v7.6L8.8 5z'} fill="currentColor" />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </figure>
  )
}

const flash = stylex.keyframes({
  from: { backgroundColor: color.accentSoft, color: color.accent },
  to: { backgroundColor: 'transparent', color: color.text }
})

const WIDE = '@media (min-width: 900px)'

const styles = stylex.create({
  // Wider than the text column, centred on it: the phone needs the room.
  figure: {
    marginTop: '12px',
    marginBottom: '40px',
    marginLeft: 'calc(50% - min(540px, 50vw - 24px))',
    marginRight: 0,
    width: 'min(1080px, 100vw - 48px)'
  },
  stage: {
    display: 'grid',
    gap: '20px',
    alignItems: 'center',
    paddingTop: '8px',
    paddingBottom: '8px',
    // An outline, not a fill: the simulator paints the page's own backdrop behind the phone.
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.lg,
    overflow: 'hidden'
  },
  stageSplit: {
    gridTemplateColumns: { default: '1fr', [WIDE]: 'minmax(0, 1.5fr) minmax(0, 1fr)' },
    paddingRight: { default: 0, [WIDE]: '24px' }
  },
  device: { position: 'relative', minWidth: 0 },
  wire: {
    listStyleType: 'none',
    margin: 0,
    paddingTop: 0,
    paddingBottom: { default: '20px', [WIDE]: 0 },
    paddingLeft: { default: '20px', [WIDE]: 0 },
    paddingRight: { default: '20px', [WIDE]: 0 },
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  // On a phone the button rides beside the label, so the value gets the row's full width.
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: '12px',
    rowGap: '6px',
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.well,
    transitionProperty: 'border-color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out
  },
  rowOn: { borderColor: color.accent },
  value: {
    display: 'flex',
    minWidth: 0,
    gridColumnStart: 1,
    gridColumnEnd: { default: 3, [WIDE]: 2 },
    gridRowStart: 2
  },
  play: {
    gridColumnStart: 2,
    gridRowStart: 1,
    gridRowEnd: { default: 2, [WIDE]: 3 },
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    width: '34px',
    height: '34px',
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: { default: color.surface, ':hover': color.accentSoft },
    color: color.accent,
    boxShadow: color.thumbShadow,
    cursor: 'pointer',
    transitionProperty: 'background-color, color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  playOn: { backgroundColor: { default: color.accent, ':hover': color.accentHover }, color: color.onAccent },
  glyph: { width: '11px', height: '11px' },
  type: { fontFamily: font.mono, fontSize: '12px', color: color.text3 },
  say: {
    alignSelf: 'flex-start',
    marginLeft: '-6px',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: '6px',
    fontFamily: font.mono,
    fontSize: '14px',
    color: color.text,
    whiteSpace: 'pre'
  },
  flash: { animationName: flash, animationDuration: '0.9s', animationTimingFunction: 'ease-out' }
})

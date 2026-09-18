// 8 seconds that fold open and fold shut again, so the last frame matches the
// first and the tag can loop without a seam.
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Device } from './device'
import { c, ease, font, typed } from './theme'

export const HERO_FRAMES = 240

const LINE1 = 'Build for the fold.'
const LINE2 = 'One app. Two displays.'

export function Hero() {
  const f = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Open on a spring slow enough to read the handover, then close on a curve
  // back to exactly zero at the end.
  const opening = spring({ frame: f - 10, fps, config: { damping: 13, mass: 4, stiffness: 12.5 } })
  const open = Math.max(0, opening * (1 - ease(f, 200, 238)))
  // One full cycle across the composition: identical at the first and last frame.
  const sway = Math.sin((f / durationInFrames) * Math.PI * 2)

  const out = 1 - ease(f, 198, 222)
  const eyebrow = ease(f, 24, 46) * out
  const line1 = typed(LINE1, f, 112, 152)
  const line2 = ease(f, 158, 180) * out
  const caret = f > 108 && f < 160 && Math.floor(f / 8) % 2 === 0

  return (
    <AbsoluteFill style={{ background: c.bg, fontFamily: font.display, overflow: 'hidden' }}>
      <Glows sway={sway} open={open} />
      <Grid />

      <div style={{ position: 'absolute', left: 520, top: 450, transform: 'translate(-50%, -50%)' }}>
        <Device open={open} sway={sway} />
      </div>

      <div style={{ position: 'absolute', left: 908, top: 332, width: 620, opacity: out }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderRadius: 999,
            border: `1px solid ${c.hair}`,
            background: 'rgba(242,241,236,0.04)',
            fontSize: 15,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: c.ink2,
            opacity: eyebrow,
            transform: `translateY(${(1 - eyebrow) * 10}px)`
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 4, background: c.accent }} />
          iPhone Duo
        </div>

        <h1
          style={{
            margin: '26px 0 0',
            fontSize: 80,
            lineHeight: 1.02,
            fontWeight: 600,
            letterSpacing: '-0.035em',
            color: c.ink,
            // Reserved, so the sub does not jump as the line types in.
            minHeight: 92
          }}
        >
          {line1}
          {caret && (
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 66,
                marginLeft: 8,
                verticalAlign: '-8px',
                background: c.accent,
                borderRadius: 3
              }}
            />
          )}
        </h1>

        <p
          style={{
            margin: '22px 0 0',
            fontSize: 32,
            lineHeight: 1.3,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            color: c.ink2,
            opacity: line2,
            transform: `translateY(${(1 - line2) * 16}px)`
          }}
        >
          {LINE2}
        </p>
      </div>

      <Vignette />
    </AbsoluteFill>
  )
}

/** The wash behind everything: two slow blobs on a one-cycle drift. */
function Glows({ sway, open }: { sway: number; open: number }) {
  const blob = (col: string, x: number, y: number, w: number, h: number, dx: number, dy: number, o: number) => (
    <div
      style={{
        position: 'absolute',
        left: x + sway * dx,
        top: y + sway * dy,
        width: w,
        height: h,
        borderRadius: '50%',
        background: col,
        filter: 'blur(120px)',
        opacity: o
      }}
    />
  )
  return (
    <AbsoluteFill>
      {blob(c.glowA, 120, 60, 900, 760, 70, -40, 0.55 + open * 0.3)}
      {blob(c.glowB, 1000, 420, 760, 620, -60, 50, 0.4 + open * 0.2)}
      {blob('rgba(143,143,255,0.30)', 700, -180, 620, 520, 40, 30, 0.5)}
    </AbsoluteFill>
  )
}

/** A faint rule grid; it gives the wash something to sit on. */
function Grid() {
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${c.hair} 1px, transparent 1px), linear-gradient(90deg, ${c.hair} 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(120% 90% at 50% 45%, #000 20%, transparent 75%)',
        opacity: 0.5
      }}
    />
  )
}

function Vignette() {
  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(130% 100% at 50% 45%, transparent 40%, rgba(0,0,0,0.55))',
        pointerEvents: 'none'
      }}
    />
  )
}

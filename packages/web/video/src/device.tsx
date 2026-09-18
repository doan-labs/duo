// The phone: two hinged panels in CSS 3D. The left panel swings on its right
// edge, so `open` 0 folds it flat onto the right panel (its back face is the
// cover display) and `open` 1 lays both panels coplanar as the inner display.
//
// Real proportions, in points: cover 387 wide, inner 790, both 850 tall.
import type { CSSProperties, ReactNode } from 'react'
import { interpolate } from 'remotion'
import { c } from './theme'

const H = 600
const HALF = Math.round((H * 395) / 850)
const FULL = HALF * 2
const BEZEL = 9
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** The app hands over as the hinge passes: cover out, then the inner columns in. */
function handover(open: number) {
  return {
    // The cross-fade lands where the hinge passes 90°, so the swap happens
    // while the cover is edge-on and never reads as two screens at once.
    cover: interpolate(open, [0.3, 0.5], [1, 0], clamp),
    left: interpolate(open, [0.5, 0.72], [0, 1], clamp),
    right: interpolate(open, [0.62, 0.88], [0, 1], clamp)
  }
}

export function Device({ open, sway }: { open: number; sway: number }) {
  const deg = open * 180
  const ui = handover(open)
  // The hinge sits at the rig's centre, so a folded phone hangs off to the right
  // until this pulls it back to the middle of frame.
  const recentre = (1 - open) * -(HALF / 2)
  const tiltY = -26 + open * 16 + sway * 3
  const lift = interpolate(open, [0, 1], [26, 0], clamp)

  return (
    <div style={{ perspective: 2200, perspectiveOrigin: '50% 45%' }}>
      <div style={{ transform: `translateX(${recentre}px) translateY(${lift}px)` }}>
        <div
          style={{
            position: 'relative',
            width: FULL,
            height: H,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${7 + sway * 1.5}deg) rotateY(${tiltY}deg) rotateZ(${sway * 0.6}deg)`
          }}
        >
          {/* Right panel: never moves. Front face carries the inner display's right half. */}
          <Panel style={{ left: HALF, transform: 'translateZ(-1px)' }} side="right">
            <Face opacity={1}>
              <InnerUi offset={-HALF} left={ui.left} right={ui.right} />
            </Face>
          </Panel>

          {/* Left panel: swings on the hinge. Front = inner's left half, back = the cover. */}
          <Panel
            style={{ left: 0, transformOrigin: 'right center', transform: `rotateY(${-(180 - deg)}deg)` }}
            side="left"
          >
            <Face opacity={1}>
              <InnerUi offset={0} left={ui.left} right={ui.right} />
            </Face>
            <Face back opacity={1}>
              <CoverUi opacity={ui.cover} />
            </Face>
          </Panel>

          <Hinge open={open} />
        </div>
      </div>
    </div>
  )
}

function Panel({ style, side, children }: { style: CSSProperties; side: 'left' | 'right'; children: ReactNode }) {
  const radius = side === 'left' ? '30px 7px 7px 30px' : '7px 30px 30px 7px'
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        width: HALF,
        height: H,
        borderRadius: radius,
        transformStyle: 'preserve-3d',
        ...style
      }}
    >
      {children}
    </div>
  )
}

/** One side of a panel: the aluminium edge, the glass, and a clipped UI layer. */
function Face({ back = false, opacity, children }: { back?: boolean; opacity: number; children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : undefined,
        borderRadius: 'inherit',
        background: `linear-gradient(150deg, #30302e, ${c.surface} 38%, #0f0f0e)`,
        boxShadow: `inset 0 0 0 1px ${c.hairStrong}, 0 30px 90px rgba(0,0,0,0.45)`,
        padding: BEZEL,
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 'inherit',
          background: `radial-gradient(120% 90% at 20% 0%, #1a1a24, ${c.bg} 70%)`,
          overflow: 'hidden'
        }}
      >
        {children}
        <Sheen />
      </div>
    </div>
  )
}

/** A raking highlight across the glass, so the panels read as surfaces not swatches. */
function Sheen() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(115deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 42%)',
        pointerEvents: 'none'
      }}
    />
  )
}

function Hinge({ open }: { open: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 6,
        left: HALF - 3,
        width: 6,
        height: H - 12,
        borderRadius: 3,
        transform: 'translateZ(0.5px)',
        background: `linear-gradient(90deg, #14141a, #4a4a55 45%, #14141a)`,
        boxShadow: `0 0 ${10 + open * 26}px rgba(143,143,255,${0.15 + open * 0.35})`
      }}
    />
  )
}

// --- the stylised app ------------------------------------------------------

function Bar({
  w,
  h = 11,
  tone = c.ink2,
  r = 6,
  mt = 0
}: {
  w: number | string
  h?: number
  tone?: string
  r?: number
  mt?: number
}) {
  return <div style={{ width: w, height: h, borderRadius: r, background: tone, marginTop: mt, flexShrink: 0 }} />
}

function StatusRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Bar w={44} h={8} tone={c.ink3} r={4} />
      <div style={{ flex: 1 }} />
      <Bar w={8} h={8} tone={c.ink3} r={4} />
      <Bar w={18} h={8} tone={c.ink3} r={4} />
    </div>
  )
}

/** The hero card: the one saturated thing on the screen. */
function Card({ h }: { h: number }) {
  return (
    <div
      style={{
        height: h,
        borderRadius: 20,
        padding: 16,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        gap: 8,
        background: `linear-gradient(145deg, ${c.accent}, rgba(143,143,255,0.18) 65%, rgba(255,140,90,0.22))`,
        boxShadow: '0 12px 30px rgba(120,110,255,0.25)'
      }}
    >
      <div
        style={{ width: 26, height: 26, borderRadius: 13, background: 'rgba(11,11,10,0.35)', marginBottom: 'auto' }}
      />
      <Bar w="72%" h={13} tone="rgba(11,11,10,0.55)" />
      <Bar w="40%" h={9} tone="rgba(11,11,10,0.3)" />
    </div>
  )
}

function Tile({ h = 74 }: { h?: number }) {
  return (
    <div
      style={{
        height: h,
        borderRadius: 16,
        background: c.surface,
        boxShadow: `inset 0 0 0 1px ${c.hair}`,
        padding: 12,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        gap: 7
      }}
    >
      <Bar w="60%" h={8} tone={c.ink3} r={4} />
      <Bar w="85%" h={10} tone="rgba(242,241,236,0.55)" />
    </div>
  )
}

function Row() {
  return (
    <div
      style={{
        height: 52,
        borderRadius: 14,
        background: c.surface,
        boxShadow: `inset 0 0 0 1px ${c.hair}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        paddingLeft: 12,
        paddingRight: 12
      }}
    >
      <div style={{ width: 24, height: 24, borderRadius: 8, background: c.accentSoft, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Bar w="70%" h={8} tone="rgba(242,241,236,0.5)" r={4} />
        <Bar w="42%" h={7} tone={c.ink3} r={4} />
      </div>
    </div>
  )
}

function Chart() {
  const hs = [28, 52, 40, 68, 46, 84, 62]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
      {hs.map((h) => (
        <div
          key={h}
          style={{
            flex: 1,
            height: h,
            borderRadius: 5,
            background: i === 5 ? c.accent : 'rgba(143,143,255,0.28)'
          }}
        />
      ))}
    </div>
  )
}

/** The app's primary column. Identical on the cover and on the inner display's
 *  left half: that sameness is the handover the video is about. */
function AppColumn({ cardH }: { cardH: number }) {
  return (
    <>
      <StatusRow />
      <Card h={cardH} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Bar w="68%" h={12} tone="rgba(242,241,236,0.7)" />
        <Bar w="44%" h={10} tone={c.ink3} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Tile />
        <Tile />
      </div>
      <Row />
      <Row />
      <div style={{ flex: 1 }} />
      <div style={{ alignSelf: 'center' }}>
        <Bar w={84} h={5} tone={c.hairStrong} r={3} />
      </div>
    </>
  )
}

/** The single-column app, as it lives on the cover display. */
function CoverUi({ opacity }: { opacity: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        transform: `scale(${0.96 + opacity * 0.04})`,
        padding: 16,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }}
    >
      <AppColumn cardH={140} />
    </div>
  )
}

/**
 * The same app with the room the inner display gives it. Both panels render
 * this full-width layer and shift it by `offset`, so it stays continuous
 * across the hinge while the two halves are separate 3D elements.
 */
function InnerUi({ offset, left, right }: { offset: number; left: number; right: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: offset,
        width: FULL - BEZEL * 2,
        height: '100%',
        padding: 16,
        boxSizing: 'border-box',
        display: 'flex',
        gap: 16
      }}
    >
      <div
        style={{
          flex: `0 0 ${HALF - BEZEL * 2 - 8}px`,
          opacity: left,
          transform: `translateY(${(1 - left) * 14}px)`,
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}
      >
        <AppColumn cardH={158} />
      </div>

      <div
        style={{
          flex: 1,
          opacity: right,
          transform: `translateY(${(1 - right) * 20}px)`,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <Bar w="46%" h={12} tone="rgba(242,241,236,0.7)" mt={4} />
        <Row />
        <Row />
        <Row />
        <Row />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Tile h={84} />
          <Tile h={84} />
        </div>
        <div style={{ flex: 1 }} />
        <Chart />
      </div>
    </div>
  )
}

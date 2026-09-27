import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { color, ease, font, radius } from '../tokens.stylex'
import { keyed, useAutoplay } from './autoplay'
import { diagram, Stat } from './diagram'

// The inner display in the live panel's CSS px: 158 x 111 mm at 5 px/mm
// (INNER in packages/shell/main.ts). The grid is os.ts's: eight 70 px columns,
// 4 + a 36 px seam + 4, so nothing sits on the hinge.
const PW = 790
const PH = 555
const CELL = 70
const SEAM = 36
const ICON = 51
const TOP = 47
const LEFT = PW / 2 - SEAM / 2 - 4 * CELL
const APPS = ['maps', 'photos', 'notes', 'music', 'mail', 'calendar', 'safari', 'clock']
const PHRASE = 'Type here while it is flat'
const LOOP: [number, number][] = [
  [0, 180],
  [2.4, 180],
  [3.6, 118],
  [5.4, 118],
  [6.6, 180]
]

const pct = (v: number, of: number) => `${(v / of) * 100}%`
const colX = (i: number, cell: number) => LEFT + (i < 4 ? i * cell : 4 * cell + SEAM + (i - 4) * cell)

/** One copy of the home screen. `cell` is the column the layer was laid out with. */
function Screen({ cell, text, onType }: { cell: number; text: string; onType?: (v: string) => void }) {
  return (
    <div {...stylex.props(styles.screen)}>
      {APPS.map((a, i) => (
        <img
          key={a}
          src={`/icons/${a}.webp`}
          alt=""
          width={ICON}
          height={ICON}
          {...stylex.props(
            styles.icon,
            styles.at(pct(colX(i, cell) + (CELL - ICON) / 2, PW), pct(TOP, PH), pct(ICON, PW))
          )}
        />
      ))}
      {onType ? (
        <input
          value={text}
          onChange={(e) => onType(e.target.value)}
          placeholder="Search"
          aria-label="A real text field"
          {...stylex.props(styles.field, styles.at(pct(LEFT, PW), '52%', pct(PW - 2 * LEFT, PW)))}
        />
      ) : (
        <span {...stylex.props(styles.field, styles.at(pct(LEFT, PW), '52%', pct(PW - 2 * LEFT, PW)))}>
          {text || <span {...stylex.props(styles.hint)}>Search</span>}
        </span>
      )}
    </div>
  )
}

/**
 * One display, drawn the two ways the shell draws it (packages/shell/main.ts).
 * Flat, it is live DOM: the field is a real input. The moment the hinge moves
 * it is a baked texture split at the hinge, which can bend and shade but is a
 * picture. Both layers lay the grid out from the same numbers; "Mismatch" puts
 * one column 3 px wide in the bake, and the icons jump at every swap.
 */
export function TwoPaths() {
  const [deg, setDeg] = useState(180)
  const [text, setText] = useState('')
  const [skew, setSkew] = useState(false)
  const auto = useAutoplay<HTMLDivElement>((t) => {
    const x = t % 6.6
    setDeg(keyed(t, LOOP))
    if (x < 2.2) setText(PHRASE.slice(0, Math.round((x / 1.8) * PHRASE.length)))
  })

  const live = deg >= 179.5
  const fold = 180 - deg
  const bake = skew ? CELL + 3 : CELL

  return (
    <figure {...stylex.props(diagram.figure)}>
      <div ref={auto.ref} {...stylex.props(styles.stage)}>
        <div {...stylex.props(styles.panel)}>
          {live ? (
            <div {...stylex.props(styles.flat)}>
              <Screen
                cell={CELL}
                text={text}
                onType={(v) => {
                  auto.stop()
                  setText(v)
                }}
              />
            </div>
          ) : (
            <>
              <div {...stylex.props(styles.half)}>
                <div {...stylex.props(styles.inner)}>
                  <Screen cell={bake} text={text} />
                </div>
                <span {...stylex.props(styles.pixels)} />
              </div>
              <div {...stylex.props(styles.half, styles.right, styles.turn(fold))}>
                <div {...stylex.props(styles.inner, styles.innerRight)}>
                  <Screen cell={bake} text={text} />
                </div>
                <span {...stylex.props(styles.pixels)} />
                {/* The shader's darkening toward the free edge. */}
                <span {...stylex.props(styles.shade, styles.dim(Math.min(1, fold / 90)))} />
              </div>
            </>
          )}
        </div>
        <span {...stylex.props(styles.badge, !live && styles.badgeBaked)}>
          {live ? 'Live DOM · 5 px/mm' : 'Canvas texture · 12 px/mm'}
        </span>
      </div>
      <div {...stylex.props(diagram.controls)}>
        <button
          type="button"
          onClick={() => (auto.on ? auto.stop() : auto.play())}
          aria-pressed={auto.on}
          {...stylex.props(diagram.button)}
        >
          {auto.on ? 'Pause' : 'Fold it'}
        </button>
        <input
          type="range"
          min={60}
          max={180}
          step={1}
          value={Math.round(deg)}
          onChange={(e) => {
            auto.stop()
            setDeg(Number(e.target.value))
          }}
          aria-label="Hinge angle"
          {...stylex.props(diagram.range)}
        />
        <output {...stylex.props(diagram.deg)}>{Math.round(deg)}°</output>
        <label {...stylex.props(styles.toggle)}>
          <input type="checkbox" checked={skew} onChange={(e) => setSkew(e.target.checked)} />
          Mismatch
        </label>
      </div>
      <dl {...stylex.props(diagram.stats)}>
        <Stat label="Surface" value={live ? 'Live DOM' : 'Texture'} />
        <Stat label="Typeable" value={live ? 'Yes' : 'No'} />
        <Stat label="Bends" value={live ? 'No' : 'Yes'} />
        <Stat label="Column" value={live ? `${CELL} px` : `${bake} px × 12/5`} />
      </dl>
    </figure>
  )
}

const flash = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0.35 }
})

const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  stage: {
    position: 'relative',
    paddingTop: '36px',
    paddingBottom: '12px',
    paddingLeft: { default: '40px', [SMALL]: '0' },
    paddingRight: { default: '40px', [SMALL]: '0' },
    perspective: '1400px'
  },
  panel: { position: 'relative', aspectRatio: `${PW} / ${PH}`, transformStyle: 'preserve-3d' },
  // The bezel travels with the glass: whole when flat, split with the halves in a fold.
  flat: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    borderWidth: '6px',
    borderStyle: 'solid',
    borderColor: color.text,
    borderRadius: radius.md
  },
  screen: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(155deg, ${color.accent}, ${color.rec} 70%, ${color.orange})`
  },
  icon: { position: 'absolute', height: 'auto', borderRadius: '22%', transitionProperty: 'none' },
  at: (left: string, top: string, width: string) => ({ left, top, width }),
  field: {
    position: 'absolute',
    boxSizing: 'border-box',
    height: '11%',
    paddingLeft: '3%',
    paddingRight: '3%',
    display: 'flex',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    color: '#1c1c1e',
    fontFamily: font.sans,
    fontSize: { default: '16px', [SMALL]: '12px' },
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px'
  },
  hint: { color: '#8e8e93' },
  half: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '50%',
    overflow: 'hidden',
    borderWidth: '6px',
    borderRightWidth: 0,
    borderStyle: 'solid',
    borderColor: color.text,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md
  },
  right: {
    left: '50%',
    borderLeftWidth: 0,
    borderRightWidth: '6px',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    transformOrigin: 'left center'
  },
  // Away from the eye, the way the shader foreshortens it.
  turn: (fold: number) => ({ transform: `rotateY(${fold}deg)` }),
  inner: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '200%' },
  innerRight: { left: '-100%' },
  shade: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(90deg, transparent, #000)'
  },
  dim: (k: number) => ({ opacity: k * 0.75 }),
  // The texture's texels, drawn large: a picture has pixels, a document does not.
  pixels: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage:
      'repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 6px), repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 6px)',
    opacity: 0.35,
    animationName: flash,
    animationDuration: '0.5s',
    animationTimingFunction: ease.out
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    paddingTop: '5px',
    paddingBottom: '5px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radius.pill,
    backgroundColor: color.greenBg,
    color: color.green,
    fontFamily: font.mono,
    fontSize: '12px',
    whiteSpace: 'nowrap',
    transitionProperty: 'background-color, color',
    transitionDuration: '0.25s'
  },
  badgeBaked: { backgroundColor: color.orangeBg, color: color.orange },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
    fontFamily: font.sans,
    fontSize: '14px',
    color: color.text2,
    accentColor: color.accent,
    cursor: 'pointer'
  }
})

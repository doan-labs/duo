// A lightweight Duo in CSS 3D: two hinged panels, the cover on the back of the
// moving one. `open` is a motion value from 0 (closed, cover facing you) to 1
// (flat, inner display). It draws a stylised app that hands over from the cover
// to two columns as the hinge passes, so sections can fold it on scroll or on
// click without a second WebGL scene. The real shell is `simulator.tsx`.
import * as stylex from '@stylexjs/stylex'
import { type MotionValue, motion, useMotionValue, useTransform } from 'motion/react'
import type { ReactNode } from 'react'
import { color, font } from './tokens.stylex'

/** Intrinsic size in CSS px: the inner display is 790 × 850 points, the cover 387 wide. */
const FULL = 640
const HALF = FULL / 2
const H = Math.round((FULL * 850) / 790)
const BEZEL = 10

export type Posture = 'closed' | 'desk' | 'open'

export function Device({
  open,
  spin,
  width = FULL,
  accent
}: {
  open: MotionValue<number>
  /** Extra turn about the vertical axis, in degrees; the scroll scene uses it. */
  spin?: MotionValue<number>
  /** Rendered width; the device scales from its intrinsic 640 px. */
  width?: number
  /** Colour of the hero card, so a "code change" can show on the screen. */
  accent?: MotionValue<string> | string
}) {
  const zero = useMotionValue(0)
  const turn = spin ?? zero
  const hinge = useTransform(open, (o) => -(180 - o * 180))
  const rotateY = useTransform([open, turn], ([o = 1, t = 0]: number[]) => -24 + o * 14 + t)
  const rotateX = useTransform(open, (o) => 6 - o * 2)
  const x = useTransform(open, (o) => (1 - o) * -(HALF / 2))
  const y = useTransform(open, (o) => (1 - o) * 20)
  // The cross-fade lands where the hinge passes 90°, while the cover is edge-on.
  const cover = useTransform(open, [0.3, 0.5], [1, 0])
  const left = useTransform(open, [0.5, 0.72], [0, 1])
  const right = useTransform(open, [0.62, 0.88], [0, 1])
  const scale = width / FULL

  return (
    <div style={{ width, height: H * scale }} data-device>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: FULL, height: H }}>
        <div {...stylex.props(styles.stage)}>
          <motion.div style={{ x, y }}>
            <motion.div {...stylex.props(styles.rig)} style={{ rotateX, rotateY }}>
              <div {...stylex.props(styles.panel, styles.rightPanel)}>
                <Face>
                  <Inner offset={-HALF} left={left} right={right} accent={accent} />
                </Face>
              </div>
              <motion.div {...stylex.props(styles.panel, styles.leftPanel)} style={{ rotateY: hinge }}>
                <Face>
                  <Inner offset={0} left={left} right={right} accent={accent} />
                </Face>
                <Face back>
                  <motion.div {...stylex.props(styles.coverUi)} style={{ opacity: cover }}>
                    <Column accent={accent} />
                  </motion.div>
                </Face>
              </motion.div>
              <div {...stylex.props(styles.hinge)} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

/** One side of a panel: the aluminium edge, the glass, a clipped UI layer. */
function Face({ back = false, children }: { back?: boolean; children: ReactNode }) {
  return (
    <div {...stylex.props(styles.face, back && styles.back)}>
      <div {...stylex.props(styles.glass)}>
        {children}
        <div {...stylex.props(styles.sheen)} />
      </div>
    </div>
  )
}

/**
 * The inner display: both panels draw this full-width layer shifted by
 * `offset`, so it reads as one screen across two 3D elements.
 */
function Inner({
  offset,
  left,
  right,
  accent
}: {
  offset: number
  left: MotionValue<number>
  right: MotionValue<number>
  accent?: MotionValue<string> | string
}) {
  const yl = useTransform(left, (v) => (1 - v) * 14)
  const yr = useTransform(right, (v) => (1 - v) * 20)
  return (
    <div {...stylex.props(styles.innerUi, styles.at(offset))}>
      <motion.div {...stylex.props(styles.col, styles.colLeft)} style={{ opacity: left, y: yl }}>
        <Column accent={accent} tall />
      </motion.div>
      <motion.div {...stylex.props(styles.col)} style={{ opacity: right, y: yr }}>
        <div {...stylex.props(styles.bar, styles.title)} />
        <Row />
        <Row />
        <Row />
        <Row />
        <div {...stylex.props(styles.pair)}>
          <div {...stylex.props(styles.tile, styles.tileTall)} />
          <div {...stylex.props(styles.tile, styles.tileTall)} />
        </div>
        <div {...stylex.props(styles.grow)} />
        <Chart />
      </motion.div>
    </div>
  )
}

/** The app's primary column, identical on the cover and the inner display's left half. */
function Column({ accent, tall = false }: { accent?: MotionValue<string> | string; tall?: boolean }) {
  return (
    <>
      <div {...stylex.props(styles.status)}>
        <div {...stylex.props(styles.bar, styles.time)} />
        <div {...stylex.props(styles.grow)} />
        <div {...stylex.props(styles.bar, styles.dot)} />
        <div {...stylex.props(styles.bar, styles.battery)} />
      </div>
      <motion.div {...stylex.props(styles.card, tall && styles.cardTall)} style={{ backgroundColor: accent }}>
        <div {...stylex.props(styles.orb)} />
        <div {...stylex.props(styles.bar, styles.cardTitle)} />
        <div {...stylex.props(styles.bar, styles.cardSub)} />
      </motion.div>
      <div {...stylex.props(styles.bar, styles.heading)} />
      <div {...stylex.props(styles.bar, styles.sub)} />
      <div {...stylex.props(styles.pair)}>
        <div {...stylex.props(styles.tile)} />
        <div {...stylex.props(styles.tile)} />
      </div>
      <Row />
      <Row />
      <div {...stylex.props(styles.grow)} />
      <div {...stylex.props(styles.home)} />
    </>
  )
}

function Row() {
  return (
    <div {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.rowIcon)} />
      <div {...stylex.props(styles.rowText)}>
        <div {...stylex.props(styles.bar, styles.rowA)} />
        <div {...stylex.props(styles.bar, styles.rowB)} />
      </div>
    </div>
  )
}

const HEIGHTS = [28, 52, 40, 68, 46, 84, 62]
function Chart() {
  return (
    <div {...stylex.props(styles.chart)}>
      {HEIGHTS.map((h, i) => (
        <div key={h} {...stylex.props(styles.column, styles.height(h), i === 5 && styles.columnOn)} />
      ))}
    </div>
  )
}

const INK = 'rgba(242,241,236,0.55)'
const INK2 = 'rgba(242,241,236,0.28)'
const INK3 = 'rgba(242,241,236,0.16)'
const HAIR = 'rgba(242,241,236,0.09)'
const SCREEN = '#0c0c0f'
const SURFACE = 'rgba(255,255,255,0.05)'

const styles = stylex.create({
  stage: { perspective: '2200px', perspectiveOrigin: '50% 45%', width: FULL, height: H },
  rig: { position: 'relative', width: FULL, height: H, transformStyle: 'preserve-3d' },
  panel: { position: 'absolute', top: 0, width: HALF, height: H, transformStyle: 'preserve-3d' },
  rightPanel: { left: HALF, borderRadius: '7px 34px 34px 7px', transform: 'translateZ(-1px)' },
  leftPanel: { left: 0, borderRadius: '34px 7px 7px 34px', transformOrigin: 'right center' },
  face: {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    borderRadius: 'inherit',
    backgroundImage: 'linear-gradient(150deg, #3a3a3d, #1c1c1f 38%, #0d0d0f)',
    boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.14), ${color.shadow}`,
    padding: BEZEL,
    overflow: 'hidden'
  },
  back: { transform: 'rotateY(180deg)' },
  glass: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 'inherit',
    backgroundColor: SCREEN,
    backgroundImage: 'radial-gradient(120% 90% at 20% 0%, #17171c, #0c0c0f 70%)',
    overflow: 'hidden'
  },
  sheen: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(115deg, rgba(255,255,255,0.08), rgba(255,255,255,0) 42%)',
    pointerEvents: 'none'
  },
  hinge: {
    position: 'absolute',
    top: 8,
    left: HALF - 3,
    width: 6,
    height: H - 16,
    borderRadius: 3,
    transform: 'translateZ(0.5px)',
    backgroundImage: 'linear-gradient(90deg, #14141a, #4a4a55 45%, #14141a)'
  },
  coverUi: {
    position: 'absolute',
    inset: 0,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    fontFamily: font.sans
  },
  innerUi: {
    position: 'absolute',
    top: 0,
    width: FULL - BEZEL * 2,
    height: '100%',
    padding: 18,
    display: 'flex',
    gap: 18
  },
  at: (left: number) => ({ left }),
  height: (height: number) => ({ height }),
  col: { display: 'flex', flexDirection: 'column', gap: 13, flexGrow: 1, flexBasis: 0, minWidth: 0 },
  colLeft: { flexGrow: 0, flexBasis: HALF - BEZEL * 2 - 9 },
  grow: { flexGrow: 1 },
  bar: { borderRadius: 6, flexShrink: 0 },
  status: { display: 'flex', alignItems: 'center', gap: 6 },
  time: { width: 44, height: 8, borderRadius: 4, backgroundColor: INK2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: INK2 },
  battery: { width: 18, height: 8, borderRadius: 4, backgroundColor: INK2 },
  card: {
    height: 140,
    borderRadius: 20,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: 8,
    backgroundColor: color.accent,
    transitionProperty: 'background-color',
    transitionDuration: '0.5s'
  },
  cardTall: { height: 158 },
  orb: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(11,11,10,0.35)', marginBottom: 'auto' },
  cardTitle: { width: '72%', height: 13, backgroundColor: 'rgba(11,11,10,0.55)' },
  cardSub: { width: '40%', height: 9, backgroundColor: 'rgba(11,11,10,0.3)' },
  heading: { width: '68%', height: 12, backgroundColor: INK },
  sub: { width: '44%', height: 10, backgroundColor: INK3, marginTop: -5 },
  title: { width: '46%', height: 12, backgroundColor: INK, marginTop: 4 },
  pair: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  tile: {
    height: 74,
    borderRadius: 16,
    backgroundColor: SURFACE,
    boxShadow: `inset 0 0 0 1px ${HAIR}`
  },
  tileTall: { height: 84 },
  row: {
    height: 52,
    borderRadius: 14,
    backgroundColor: SURFACE,
    boxShadow: `inset 0 0 0 1px ${HAIR}`,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 12,
    paddingRight: 12,
    flexShrink: 0
  },
  rowIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: color.accentSoft, flexShrink: 0 },
  rowText: { flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  rowA: { width: '70%', height: 8, borderRadius: 4, backgroundColor: INK },
  rowB: { width: '42%', height: 7, borderRadius: 4, backgroundColor: INK3 },
  home: { alignSelf: 'center', width: 84, height: 5, borderRadius: 3, backgroundColor: INK2 },
  chart: { display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 },
  column: { flexGrow: 1, borderRadius: 5, backgroundColor: INK3 },
  columnOn: { backgroundColor: color.accent }
})

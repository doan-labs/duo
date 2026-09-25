// The `orientation` event drawn as the phone seen from above: `yaw` turns it,
// `hinge` opens the moving half away from the fixed one, and you are at the bottom.
import * as stylex from '@stylexjs/stylex'
import { color, font } from '../tokens.stylex'

const HALF = 40
const RAD = Math.PI / 180

export function PoseDial({ yaw, hinge }: { yaw: number; hinge: number }) {
  // Maths axes, y away from you: positive yaw swings the right edge away, which is counter-clockwise from above.
  const turn = (a: number) => [HALF * Math.cos(a), -HALF * Math.sin(a)] as const
  const [fx, fy] = turn(yaw * RAD)
  // Open, the moving half points left; folding swings it toward you and onto the fixed half.
  const [mx, my] = turn((yaw + 360 - hinge) * RAD)
  return (
    <svg viewBox="-60 -60 120 120" role="img" aria-label={`Yaw ${yaw}°, hinge ${hinge}°`} {...stylex.props(styles.svg)}>
      <circle r="54" {...stylex.props(styles.ring)} />
      <line x1="0" y1="-54" x2="0" y2="-48" {...stylex.props(styles.tick)} />
      <text x="0" y="50" textAnchor="middle" {...stylex.props(styles.you)}>
        you
      </text>
      <line x1="0" y1="0" x2={fx} y2={fy} {...stylex.props(styles.half, styles.fixed)} />
      <line x1="0" y1="0" x2={mx} y2={my} {...stylex.props(styles.half, styles.moving)} />
      <circle r="3.5" {...stylex.props(styles.pin)} />
    </svg>
  )
}

const styles = stylex.create({
  svg: { display: 'block', width: '100%', maxWidth: '168px', height: 'auto' },
  ring: { fill: 'none', stroke: color.border, strokeWidth: 1 },
  tick: { stroke: color.text3, strokeWidth: 1 },
  you: { fill: color.text3, fontFamily: font.mono, fontSize: '7px', letterSpacing: '0.08em' },
  half: { strokeWidth: 6, strokeLinecap: 'round' },
  fixed: { stroke: color.text },
  moving: { stroke: color.accent },
  pin: { fill: color.bg, stroke: color.text, strokeWidth: 1.5 }
})

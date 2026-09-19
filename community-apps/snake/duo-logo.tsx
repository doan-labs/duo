import * as stylex from '@stylexjs/stylex'
import type { BoardMetrics, Point } from './game.ts'

const motion = '@media (prefers-reduced-motion: reduce)'
const easeOut = 'cubic-bezier(.23, 1, .32, 1)'
const logoPulse = stylex.keyframes({
  from: { opacity: 0.92, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.28))' },
  '50%': { opacity: 1, filter: 'drop-shadow(0 5px 10px rgba(0,0,0,.4))' },
  to: { opacity: 0.92, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.28))' }
})

export function DuoLogo({ metrics, point }: { metrics: BoardMetrics; point: Point }) {
  const size = metrics.cell + metrics.gap
  const offset = metrics.padding - metrics.gap * 0.5
  const left = offset + point.x * size
  const top = offset + point.y * size

  return (
    <div {...stylex.props(styles.root, styles.size(size), styles.position(left, top))}>
      <svg viewBox="0 0 256 256" role="img" aria-label="Duo logo" {...stylex.props(styles.svg)}>
        <rect width="256" height="256" rx="56" fill="#2A2A2E" />
        <path fill="#B9A9E6" d="M76 44 L48 72 L48 216 L76 188z" />
        <path
          fill="#F4EFE4"
          fillRule="evenodd"
          d="M80 44h56c40 0 72 32 72 72s-32 72-72 72H80z M112 76v80h24c22 0 40-18 40-40s-18-40-40-40z"
        />
      </svg>
    </div>
  )
}

const styles = stylex.create({
  root: {
    position: 'absolute',
    zIndex: 4,
    overflow: 'visible',
    pointerEvents: 'none',
    animationName: { default: logoPulse, [motion]: 'none' },
    animationDuration: '2.2s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    transitionProperty: 'transform',
    transitionDuration: { default: '.14s', [motion]: '0s' },
    transitionTimingFunction: easeOut
  },
  size: (size: number) => ({ width: `${size}px`, height: `${size}px` }),
  position: (left: number, top: number) => ({ transform: `translate(${left}px, ${top}px)` }),
  svg: { display: 'block', width: '100%', height: '100%', transform: 'scale(1.7)', transformOrigin: 'center' }
})

import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { shared } from '../uikit/styles.ts'
import { colors } from '../uikit/tokens.stylex.ts'
import { beep } from './shared.ts'

const PASSES: [string, string, string][] = [
  ['Apple Card', 'linear-gradient(150deg,#f5f5f7,#c9c9ce)', '#1c1c1e'],
  ['Duo Transit', 'linear-gradient(150deg,#0a84ff,#5e5ce6)', '#fff'],
  ['Apple Park Badge', 'linear-gradient(150deg,#1c1c1e,#3a3a3c)', '#fff'],
  ['WWDC Pass', 'linear-gradient(150deg,#ff375f,#ff9f0a)', '#fff']
]

// The stack shows the top STEP px of each card behind, so it has to clear the
// card's name and its one-line subtitle or the fan reads as coloured stripes.
const STEP = 48

// Same as shared's; StyleX only resolves keyframes defined in the file that uses them.
const pop = stylex.keyframes({ from: { transform: 'scale(.55) translateY(12px)', opacity: 0 } })

export const Wallet = () => {
  const [top, setTop] = useState(-1) // which card is pulled out, -1 for none
  const [paying, setPaying] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const pay = () => {
    setPaying(true)
    beep([1318, 1760], 0.09, 0.07)
    timer.current = window.setTimeout(() => {
      beep([2093], 0.16, 0.07)
      setPaying(false)
    }, 1600)
  }
  const height = (top < 0 ? (PASSES.length - 1) * STEP : (PASSES.length - 2) * STEP + 178) + 158
  return (
    <div {...stylex.props(shared.body)}>
      <div {...stylex.props(shared.hero)}>Wallet</div>
      <div {...stylex.props(styles.cards, styles.height(height))}>
        {PASSES.map(([name, bg, fg], i) => {
          // Pulled-out card sits at the top and everything under it drops clear.
          const y = top < 0 ? i * STEP : i === top ? 0 : (i < top ? i : i - 1) * STEP + (i > top ? 178 : 0)
          return (
            <div
              key={name}
              {...stylex.props(styles.pass, styles.look(bg, fg), styles.place(y, i === top ? 20 : i))}
              onClick={() => setTop(top === i ? -1 : i)}
            >
              <div {...stylex.props(styles.nm)}>{name}</div>
              <div {...stylex.props(styles.kind)}>{i ? 'Apple Pay' : 'Balance $1,284.10'}</div>
              <div {...stylex.props(styles.no)}>{`•••• ${4000 + i * 1111}`}</div>
            </div>
          )
        })}
      </div>
      <div {...stylex.props(styles.payWrap)}>
        <button type="button" {...stylex.props(shared.pill, styles.payBtn)} onClick={pay}>
          Apple Pay
        </button>
      </div>
      {paying && (
        <div {...stylex.props(styles.pay)}>
          <div {...stylex.props(styles.payHint)}>Double-Click to Pay</div>
          <div {...stylex.props(styles.mono)}>💳</div>
          <div {...stylex.props(styles.payTitle)}>Hold Near Reader</div>
        </div>
      )}
    </div>
  )
}

const styles = stylex.create({
  cards: {
    position: 'relative',
    marginTop: 6,
    marginInline: 'auto',
    marginBottom: 0,
    maxWidth: 340,
    transitionProperty: 'height',
    transitionDuration: '.45s',
    transitionTimingFunction: 'cubic-bezier(.3,.9,.3,1)'
  },
  height: (px: number) => ({ height: px }),
  // A tap only ever changes the translate and z-index; the transition does the rest.
  pass: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 158,
    borderRadius: 17,
    paddingTop: 15,
    paddingBottom: 15,
    paddingInline: 15,
    cursor: 'pointer',
    boxShadow: '0 -1px 0 rgba(255,255,255,.25) inset,0 14px 30px rgba(0,0,0,.4)',
    transitionProperty: 'transform',
    transitionDuration: '.45s',
    transitionTimingFunction: 'cubic-bezier(.3,.9,.3,1)',
    display: 'flex',
    flexDirection: 'column'
  },
  look: (bg: string, fg: string) => ({ backgroundImage: bg, color: fg }),
  place: (y: number, z: number) => ({ transform: `translateY(${y}px)`, zIndex: z }),
  nm: { fontWeight: 600, fontSize: 14 },
  kind: { fontSize: 11, opacity: 0.65 },
  no: {
    marginTop: 'auto',
    fontWeight: 500,
    fontSize: 15,
    lineHeight: 1,
    fontFamily: 'ui-monospace,SFMono-Regular,monospace',
    letterSpacing: 1.5
  },
  payWrap: { textAlign: 'center', paddingTop: 18, paddingBottom: 8 },
  payBtn: {
    backgroundColor: colors.white,
    color: colors.black,
    paddingTop: 9,
    paddingBottom: 9,
    paddingInline: 20,
    fontSize: 14
  },
  pay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,.55)',
    backdropFilter: 'blur(14px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 6,
    color: colors.white,
    animationName: pop,
    animationDuration: '.35s'
  },
  payHint: { fontSize: 15, opacity: 0.7 },
  payTitle: { fontSize: 19, fontWeight: 600 },
  mono: {
    width: 74,
    height: 74,
    borderRadius: '50%',
    backgroundColor: colors.white,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    fontSize: 32,
    fontWeight: 500,
    flexShrink: 0
  }
})

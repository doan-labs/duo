import { beep } from '@doan-labs/duo-fixtures'
import { Button, LargeTitle, Screen } from '@doan-labs/duo-uikit'
import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { styles } from './styles.ts'

const PASSES: [string, string, string][] = [
  ['Apple Card', appAppearance.walletAppleCard, colors.grey6Dark],
  ['Duo Transit', appAppearance.walletTransit, colors.white],
  ['Apple Park Badge', appAppearance.walletBadge, colors.white],
  ['WWDC Pass', appAppearance.walletPass, colors.white]
]

// The stack shows the top STEP px of each card behind, so it has to clear the
// card's name and its one-line subtitle or the fan reads as coloured stripes.
const STEP = 48

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
    <Screen>
      <LargeTitle>Wallet</LargeTitle>
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
        <Button type="button" xstyle={[styles.payBtn]} onClick={pay}>
          Apple Pay
        </Button>
      </div>
      {paying && (
        <div {...stylex.props(styles.pay)}>
          <div {...stylex.props(styles.payHint)}>Double-Click to Pay</div>
          <div {...stylex.props(styles.mono)}>💳</div>
          <div {...stylex.props(styles.payTitle)}>Hold Near Reader</div>
        </div>
      )}
    </Screen>
  )
}

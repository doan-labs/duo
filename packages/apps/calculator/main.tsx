import { os } from '@doan-labs/duo-sdk'
import { dark } from '@doan-labs/duo-uikit/styles.ts'
import { colors, fonts, leading, tracking, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Calculator } from './index.tsx'

function Screen() {
  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])
  return (
    <div {...stylex.props(dark, styles.root)}>
      <Calculator
        os={{
          shots: [],
          home: () => {
            void os.home()
          },
          open: (id, arg) => {
            void os.open(id, arg)
          },
          camera: { current: null }
        }}
      />
    </div>
  )
}
const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.black,
    color: colors.white,
    fontFamily: fonts.system,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body
  }
})
await os.connect()
createRoot(document.body).render(<Screen />)

import { os } from '@doan-labs/duo-sdk'
import { appAppearance, colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeWeather } from './data.ts'
import { Weather } from './index.tsx'

function Screen() {
  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])
  return (
    <div {...stylex.props(styles.root)}>
      <Weather
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
    fontFamily: fonts.system,
    color: colors.white,
    fontSize: appAppearance.musicFontSize,
    lineHeight: 1.3
  }
})
await os.connect()
await initializeWeather()
createRoot(document.body).render(<Screen />)

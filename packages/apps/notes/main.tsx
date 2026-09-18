import { os } from '@doan-labs/ipduo-sdk'
import { appAppearance, colors, fonts } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Notes } from './index.tsx'

function Screen() {
  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])
  return (
    <div {...stylex.props(styles.root)}>
      <Notes
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
    fontSize: appAppearance.musicFontSize,
    lineHeight: 1.3
  }
})
await os.connect()
createRoot(document.body).render(<Screen />)

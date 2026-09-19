import { os } from '@doan-labs/duo-sdk'
import { appAppearance, colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Calendar } from './index.tsx'

function Screen() {
  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])
  return (
    <div {...stylex.props(styles.root)}>
      <Calendar />
    </div>
  )
}
const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.groupedLight,
    color: colors.black,
    fontFamily: fonts.system,
    fontSize: appAppearance.musicFontSize,
    lineHeight: 1.3
  }
})
await os.connect()
createRoot(document.body).render(<Screen />)

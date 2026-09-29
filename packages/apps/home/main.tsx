import { hydrateBook } from '@doan-labs/duo-fixtures/home.ts'
import { os } from '@doan-labs/duo-sdk'
import { hydrateCells } from '@doan-labs/duo-uikit/kv.ts'
import { app, fonts, leading, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Home } from './index.tsx'

function Screen() {
  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])
  return (
    <div {...stylex.props(styles.root)}>
      <Home />
    </div>
  )
}
const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: app.bg,
    color: app.fg,
    fontFamily: fonts.system,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline
  }
})
await os.connect()
await Promise.all([hydrateCells(), hydrateBook(os.storage)])
createRoot(document.body).render(<Screen />)

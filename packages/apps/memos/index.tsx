// Voice Memos: capture and every file write run on the session owner through
// the engine's op dispatch, so the folded display's copy draws the same
// recorder and deck from the shared session cells and never opens a second
// stream.

import { Nav, Screen } from '@doan-labs/duo-uikit'
import { app } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect } from 'react'
import { Deck } from './deck.tsx'
import { reconcileFiles } from './engine.ts'
import { Library } from './library.tsx'

export function Memos() {
  useEffect(() => {
    void reconcileFiles()
  }, [])

  return (
    <Screen xstyle={styles.app}>
      <Nav>
        <Library />
      </Nav>
      <Deck />
    </Screen>
  )
}

const styles = stylex.create({
  // Screen's shared.body is a scroll box, not a flex column - Nav's pane is a
  // flexGrow child, so without this the stack collapses to zero height.
  app: { backgroundColor: app.bg, color: app.fg, position: 'relative', display: 'flex', flexDirection: 'column' }
})

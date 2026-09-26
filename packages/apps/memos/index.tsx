// Voice Memos, a baked app: the shell hands it `os.mic` and `os.files` as
// props, so capture never happens inside this document. One attach per mount
// keeps the engine alive while the fold copy mounts and unmounts - the running
// second copy draws this state, it never opens a second stream.

import type { Os } from '@doan-labs/duo-sdk'
import { Nav, Screen } from '@doan-labs/duo-uikit'
import { app } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect } from 'react'
import { Deck } from './deck.tsx'
import { bindHost, reconcileFiles } from './engine.ts'
import { Library } from './library.tsx'

export function Memos({ os }: { os: Os }) {
  useEffect(() => {
    bindHost(os)
    void reconcileFiles()
  }, [os])
  // attach() returns the release: React hands it to cleanup on unmount, and
  // the host's grace window rides out a fold instead of killing the take.
  useEffect(() => os.mic?.attach(), [os.mic])

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

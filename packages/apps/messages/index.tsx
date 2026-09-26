// Messages on the Duo: the inbox pushes a thread over itself on the cover and
// sits beside it on the inner display, the same split Notes makes. One module
// store drives both running copies, so they can never disagree about the list,
// the open thread, the draft or an unread dot. The demo's replies land through
// the store too - persisted, deterministic and owned by the copy in use.

import type { Os } from '@doan-labs/duo-sdk'
import { Placeholder, Push, useWide } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useRef } from 'react'
import { Inbox } from './inbox.tsx'
import { NewMessage } from './new.tsx'
import { openArg, resume, select, useConvs, useSel } from './store.ts'
import { styles } from './styles.ts'
import { Thread } from './thread.tsx'

export const Messages = ({ os }: { os: Os }) => {
  const [root, wide] = useWide()
  const sel = useSel()
  const convs = useConvs()
  const conv = sel && sel !== 'new' ? convs.find((c) => c.id === sel) : undefined

  useEffect(() => {
    // The mounting copy owns effects: it re-arms any pending demo reply and
    // spends the deep link Phone passed. The mirror copy draws everything and
    // starts nothing (decisions.md 24).
    if (os.mirror) return
    resume(os)
    if (os.arg) openArg(os.arg)
    // `os` is the scene's stable context; this runs once per copy mount.
  }, [os])

  const back = () => select('')
  const pane =
    sel === 'new' ? <NewMessage back={back} /> : conv ? <Thread key={conv.id} os={os} id={conv.id} back={back} /> : null

  return (
    <div ref={root} {...stylex.props(styles.root)}>
      {wide ? (
        <div {...stylex.props(styles.split)}>
          <div {...stylex.props(styles.side)}>
            <Inbox />
          </div>
          <div {...stylex.props(styles.main)}>
            {pane ?? <Placeholder xstyle={[styles.paneEmpty]}>Select a conversation</Placeholder>}
          </div>
        </div>
      ) : (
        <Cover pane={pane} />
      )}
    </div>
  )
}

/** The cover stack: the pane slides over the inbox; `held` keeps it renderable while it slides away. */
function Cover({ pane }: { pane: ReactNode }) {
  const held = useRef<ReactNode>(null)
  if (pane) held.current = pane
  return (
    <Push open={!!pane} sheet={held.current}>
      <div {...stylex.props(styles.pane)}>
        <Inbox />
      </div>
    </Push>
  )
}

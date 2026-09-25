// The inner display's floating glass sidebar: the search capsule, the five
// smart-list tiles, My Lists and the tag cloud, with Add List in the footer.
// Hiding it slides it away through the chrome where the pane's button brings
// it back.

import { Sym } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { Find, MyLists, TagCloud, Tiles } from './parts.tsx'
import { useGo, useListSheet, useSideOff } from './store.ts'
import { styles } from './styles.ts'

export function Sidebar({ sel }: { sel?: string }) {
  const { open } = useGo()
  const [off] = useSideOff()
  const [, setSheet] = useListSheet()
  return (
    <aside {...stylex.props(styles.side, off ? styles.sideOut : styles.sideIn)}>
      <Find />
      <div {...stylex.props(styles.sideScroll)}>
        <Tiles sel={sel} pick={open} />
        <div {...stylex.props(styles.sideSec)}>My Lists</div>
        <MyLists sel={sel} />
        <TagCloud sel={sel} />
      </div>
      <div {...stylex.props(styles.sideFoot)}>
        <button type="button" onClick={() => setSheet('new')} {...stylex.props(styles.flat, shared.select)}>
          <Sym name="plus" size={14} />
          Add List
        </button>
      </div>
    </aside>
  )
}

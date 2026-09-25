// Apple Reminders, rebuilt for the Duo: a floating glass sidebar of smart
// lists and My Lists on the inner display, the cover's push-navigated Lists
// page, and one details editor everywhere. Both displays draw the same path
// cell, so they never disagree.

import { Push, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { DetailsPage, DetailsSheet } from './details.tsx'
import { DestPage } from './list-page.tsx'
import { ListsPage } from './lists-page.tsx'
import { ListSheet } from './sheets.tsx'
import { Sidebar } from './sidebar.tsx'
import { destOf, detailOf, useGo, useNow, usePath, useReminders, useSideOff } from './store.ts'
import { styles } from './styles.ts'

export function Reminders() {
  const [ref, wide] = useWide()
  useNow(!useDisplay().active)
  const path = usePath()
  const dest = destOf(path)
  const detailId = detailOf(path)
  const { items } = useReminders()
  const { back } = useGo()
  const detail = items.find((r) => r.id === detailId)

  return (
    <div ref={ref} {...stylex.props(styles.split)}>
      {wide ? (
        <>
          <Sidebar sel={dest} />
          <Pane dest={dest} />
          <DetailsSheet open={!!detail} onClose={back} r={detail} />
        </>
      ) : (
        <Cover dest={dest} detail={detail} />
      )}
      <ListSheet />
    </div>
  )
}

/** The inner display's detail pane; `key={dest}` swaps pages with the shared fade. */
function Pane({ dest }: { dest?: string }) {
  const [off] = useSideOff()
  return (
    <div {...stylex.props(styles.pane, !off && styles.paneSide)}>
      <div key={dest ?? 'root'} {...stylex.props(shared.column, shared.swap, styles.paneRoot)}>
        <DestPage dest={dest ?? 'today'} wide />
      </div>
    </div>
  )
}

/** The cover: Lists at the root, a destination pushed over it, Details on top. */
function Cover({ dest, detail }: { dest?: string; detail?: ReturnType<typeof useReminders>['items'][number] }) {
  const { back } = useGo()
  return (
    <Push
      open={!!dest}
      sheet={
        <Push open={!!detail} sheet={<DetailsPage r={detail} back={back} />}>
          <DestPage dest={dest ?? 'today'} wide={false} />
        </Push>
      }
    >
      <ListsPage />
    </Push>
  )
}

// Podcasts: a Listen Now shelf, a Library and a Search behind the segmented
// control, with the show and episode pages pushed over it, the Now Playing
// sheet above them, and the mini player pinned under whichever pane is up.
// Tab, open pages and the toast live in the shared ui cell; subscriptions,
// downloads and history persist in store.ts; playback lives in deck.ts - so
// the fold carries the same pane, queue and position to the other display.

import type { Os } from '@doan-labs/duo-sdk'
import { IconButton, LargeTitle, Push, Screen, Segmented } from '@doan-labs/duo-uikit'
import { animations } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useRef } from 'react'
import { MiniPlayer } from './mini-player.tsx'
import { EpPage, Home, Library, Queue, Search, ShowPage } from './pages.tsx'
import { NowPlaying } from './player.tsx'
import { closeEp, closeShow, go, setPlayer, setQueueOpen, type Tab, useToastMsg, useUi } from './store.ts'
import { styles } from './styles.ts'

const TABS = { listen: 'Listen Now', library: 'Library', search: 'Search' } as const
const TABS_BY_LABEL = Object.fromEntries(Object.entries(TABS).map(([k, v]) => [v, k])) as Record<string, Tab>

/** The pushed pages keep their last target while their sheet slides out. */
const ShowSheet = () => {
  const ui = useUi()
  const last = useRef(ui.show)
  if (ui.show) last.current = ui.show
  return last.current ? <ShowPage title={last.current} back={closeShow} /> : null
}

const EpSheet = () => {
  const ui = useUi()
  const last = useRef(ui.ep)
  if (ui.ep) last.current = ui.ep
  return last.current ? <EpPage id={last.current} back={closeEp} /> : null
}

export const Podcasts = (_: { os: Os }) => {
  const ui = useUi()
  const toast = useToastMsg()
  return (
    <Screen xstyle={[styles.root]}>
      <Push open={ui.queue} sheet={<Queue back={() => setQueueOpen(false)} />}>
        <Push open={!!ui.show} sheet={<ShowSheet />}>
          <Push open={!!ui.ep} sheet={<EpSheet />}>
            <div {...stylex.props(styles.column)}>
              <Screen xstyle={[styles.pane]}>
                <div {...stylex.props(styles.headRow)}>
                  <LargeTitle xstyle={[styles.hero]}>{TABS[ui.tab]}</LargeTitle>
                  <IconButton
                    name="list"
                    size={16}
                    variant="tinted"
                    aria-label="Up Next"
                    onClick={() => setQueueOpen(true)}
                  />
                </div>
                <div {...stylex.props(styles.tabs)}>
                  <Segmented
                    options={Object.values(TABS)}
                    value={TABS[ui.tab]}
                    onChange={(v) => go(TABS_BY_LABEL[v]!)}
                    aria-label="Podcasts sections"
                  />
                </div>
                {ui.tab === 'listen' && <Home />}
                {ui.tab === 'library' && <Library />}
                {ui.tab === 'search' && <Search />}
              </Screen>
              <MiniPlayer />
            </div>
          </Push>
        </Push>
      </Push>
      <NowPlaying open={ui.player} onClose={() => setPlayer(false)} />
      {toast ? (
        <div role="status" {...stylex.props(styles.toast, animations.float)}>
          {toast}
        </div>
      ) : null}
    </Screen>
  )
}

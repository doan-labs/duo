// Tips. Apple's own shape on the Duo: the tip of the day under a large title,
// a two-column grid of collections, and whatever you bookmarked, pushing
// collection and tip pages. Unfolded, the collections are a sidebar and the
// picked one fills the pane, as iPadOS splits it; folded, the same destinations
// push. Saved ids live in a module store both displays' copies share (store.ts).

import type { Os } from '@doan-labs/duo-sdk'
import { IconButton, LargeTitle, Nav, Screen, Sym, useNav, useWide } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { CollectionBody, CollectionPage } from './collection.tsx'
import { COLLECTIONS, tipOfTheDay } from './data.ts'
import { SavedBody, SavedPage } from './saved.tsx'
import { Sidebar } from './sidebar.tsx'
import { useSaved } from './store.ts'
import { styles } from './styles.ts'
import { TipPage } from './tip.tsx'

export function Tips(_: { os: Os }) {
  // The box decides, not the display: a split half of the inner panel is as
  // narrow as the cover and gets the same one-column Tips.
  const [root, wide] = useWide()
  const [picked, setPicked] = useState(COLLECTIONS[0]!.id)
  const saved = useSaved()
  const collection = COLLECTIONS.find((c) => c.id === picked) ?? COLLECTIONS[0]!
  return (
    <div ref={root} {...stylex.props(styles.split)}>
      {wide && <Sidebar current={picked} pick={setPicked} />}
      <div {...stylex.props(styles.detail)}>
        {wide ? (
          // Keyed: picking another destination drops whatever the last one pushed.
          <Nav key={picked}>
            <div {...stylex.props(shared.column)}>
              <div {...stylex.props(styles.homeHdr)}>
                <LargeTitle as="h1">{picked === 'saved' ? 'Saved Tips' : collection.title}</LargeTitle>
              </div>
              <Screen xstyle={[shared.swap]}>
                {picked === 'saved' ? (
                  <SavedBody saved={saved} />
                ) : (
                  <CollectionBody collection={collection} saved={saved} />
                )}
              </Screen>
            </div>
          </Nav>
        ) : (
          <Nav>
            <Home saved={saved} />
          </Nav>
        )}
      </div>
    </div>
  )
}

/** The cover's root: large title, tip of the day, collections grid, saved rows. */
function Home({ saved }: { saved: ReturnType<typeof useSaved> }) {
  const { push } = useNav()
  const day = tipOfTheDay()
  return (
    <div {...stylex.props(shared.column)}>
      <div {...stylex.props(styles.homeHdr)}>
        <LargeTitle as="h1">Tips</LargeTitle>
        <IconButton
          name="bookmark"
          size={19}
          aria-label="Saved Tips"
          xstyle={styles.hdrBtn}
          onClick={() => push((back) => <SavedPage saved={saved} back={back} />)}
        />
      </div>
      <Screen>
        <div {...stylex.props(styles.inset)}>
          <div {...stylex.props(typography.footnote, styles.label)}>Tip of the Day</div>
          <button
            type="button"
            {...stylex.props(styles.hero, styles.art(day.collection.art), shared.press)}
            onClick={() =>
              push((back) => (
                <TipPage
                  collection={day.collection}
                  index={day.collection.tips.indexOf(day.tip)}
                  saved={saved}
                  back={back}
                />
              ))
            }
          >
            <span {...stylex.props(styles.heroGlyph)}>
              <Sym name={day.tip.glyph} size={56} />
            </span>
            <span {...stylex.props(styles.heroText)}>
              <span {...stylex.props(typography.title2)}>{day.tip.title}</span>
              <span {...stylex.props(typography.footnote, styles.heroSub)}>{day.tip.summary}</span>
            </span>
          </button>
          <div {...stylex.props(typography.footnote, styles.label)}>Collections</div>
          <div {...stylex.props(styles.grid)}>
            {COLLECTIONS.map((collection) => (
              <button
                key={collection.id}
                type="button"
                {...stylex.props(styles.card, shared.press)}
                onClick={() => push((back) => <CollectionPage collection={collection} saved={saved} back={back} />)}
              >
                <span {...stylex.props(styles.cardArt, styles.art(collection.art))}>
                  <Sym name={collection.glyph} size={44} />
                </span>
                <span {...stylex.props(styles.cardText)}>
                  <span {...stylex.props(typography.headline)}>{collection.title}</span>
                  <span {...stylex.props(typography.footnote, styles.savedHint)}>{collection.tips.length} tips</span>
                </span>
              </button>
            ))}
          </div>
          <div {...stylex.props(typography.footnote, styles.label)}>Saved</div>
          {saved.ids.length ? (
            <SavedBody saved={saved} />
          ) : (
            <p {...stylex.props(typography.footnote, styles.savedHint)}>Tap the bookmark on a tip to keep it here.</p>
          )}
        </div>
      </Screen>
    </div>
  )
}

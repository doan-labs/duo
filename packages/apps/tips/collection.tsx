// A collection: the gradient banner and its blurb, then every tip as a card
// with the collection's band of colour on top. `CollectionBody` is the body
// alone so the wide layout's right pane can reuse it without a back button.

import { Page, Sym, useNav } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import type { Collection } from './data.ts'
import { styles } from './styles.ts'
import { TipPage } from './tip.tsx'

export function CollectionBody({ collection }: { collection: Collection }) {
  const { push } = useNav()
  return (
    <>
      <div {...stylex.props(styles.banner, styles.art(collection.art))}>
        <Sym name={collection.glyph} size={48} />
      </div>
      <p {...stylex.props(typography.body, styles.inset, styles.blurb)}>{collection.blurb}</p>
      <div {...stylex.props(styles.inset, styles.list)}>
        {collection.tips.map((tip, i) => (
          <button
            key={tip.id}
            type="button"
            {...stylex.props(styles.tip, shared.press)}
            onClick={() => push((back) => <TipPage collection={collection} index={i} back={back} />)}
          >
            <span {...stylex.props(styles.tipBand, styles.art(collection.art))}>
              <Sym name={tip.glyph} size={36} />
            </span>
            <span {...stylex.props(styles.tipText)}>
              <span {...stylex.props(typography.headline)}>{tip.title}</span>
              <span {...stylex.props(typography.footnote, styles.savedHint)}>{tip.summary}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

export function CollectionPage({ collection, back }: { collection: Collection; back?: () => void }) {
  return (
    <Page title={collection.title} back={back}>
      <CollectionBody collection={collection} />
    </Page>
  )
}

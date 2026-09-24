// Saved tips: one flat list across collections, each row carrying the gradient
// of the collection its tip came from. Empty is a centred placeholder rather
// than a list with nothing in it. `SavedBody` is reused by the root's Saved
// section and the wide pane.

import { Page, Row, Section, Sym, useNav } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { ALL_TIPS } from './data.ts'
import { useSaved } from './store.ts'
import { styles } from './styles.ts'
import { TipPage } from './tip.tsx'

export function SavedBody() {
  const { push } = useNav()
  const saved = useSaved()
  const items = ALL_TIPS.filter(({ tip }) => saved.ids.includes(tip.id))
  if (!items.length)
    return (
      <div {...stylex.props(styles.empty)}>
        <Sym name="bookmark" size={44} />
        <span {...stylex.props(styles.emptyText)}>
          <span {...stylex.props(typography.headline)}>No Saved Tips</span>
          <span {...stylex.props(typography.footnote)}>Tap the bookmark on a tip to keep it here.</span>
        </span>
      </div>
    )
  return (
    <Section>
      {items.map(({ tip, collection }) => (
        <Row
          key={tip.id}
          as="button"
          icon={
            <span {...stylex.props(shared.rowIc, styles.rowArt, styles.art(collection.art))}>
              <Sym name={tip.glyph} size={14} />
            </span>
          }
          label={tip.title}
          subtitle={collection.title}
          chevron
          xstyle={styles.rowBtn}
          onClick={() =>
            push((back) => <TipPage collection={collection} index={collection.tips.indexOf(tip)} back={back} />)
          }
        />
      ))}
    </Section>
  )
}

export function SavedPage({ back }: { back?: () => void }) {
  return (
    <Page title="Saved Tips" back={back}>
      <SavedBody />
    </Page>
  )
}

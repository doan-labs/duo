// A tip, read: its art panel, the paragraphs and the numbered steps, then the
// pager. Previous and Next stay inside the same collection, which the page
// tracks as an index rather than pushing a new page each time.

import { Button, HStack, IconButton, Page, Row, Section, Sym } from '@doan-labs/duo-uikit'
import { typography } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import type { Collection } from './data.ts'
import type { Saved } from './store.ts'
import { styles } from './styles.ts'

export function TipPage({
  collection,
  index,
  saved,
  back
}: {
  collection: Collection
  index: number
  saved: Saved
  back?: () => void
}) {
  // The position moves within this page: pushing a fresh page per tip would
  // fill the stack with siblings the back button should not have to unwind.
  const [at, setAt] = useState(index)
  const tip = collection.tips[at]!
  const on = saved.on(tip.id)
  return (
    <Page title={collection.title} back={back}>
      <div {...stylex.props(styles.tipHero, styles.art(collection.art))}>
        <Sym name={tip.glyph} size={72} />
      </div>
      <h1 {...stylex.props(typography.title1, styles.inset, styles.tipTitle)}>{tip.title}</h1>
      {tip.body.map((para) => (
        <p key={para} {...stylex.props(typography.body, styles.inset, styles.para)}>
          {para}
        </p>
      ))}
      {tip.steps && (
        <Section>
          {tip.steps.map((step, i) => (
            <Row
              key={step}
              icon={
                <span {...stylex.props(typography.footnote, styles.step)}>
                  <span>{i + 1}</span>
                </span>
              }
              label={step}
            />
          ))}
        </Section>
      )}
      <HStack justify="between" xstyle={styles.pager}>
        <Button disabled={at === 0} onClick={() => setAt(at - 1)}>
          Previous
        </Button>
        <IconButton
          name="bookmark"
          size={19}
          variant={on ? 'tinted' : 'plain'}
          aria-label={on ? 'Remove from Saved' : 'Save Tip'}
          xstyle={on ? styles.markOn : styles.mark}
          onClick={() => saved.toggle(tip.id)}
        />
        <Button disabled={at === collection.tips.length - 1} onClick={() => setAt(at + 1)}>
          Next
        </Button>
      </HStack>
    </Page>
  )
}

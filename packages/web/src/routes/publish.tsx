import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { DocBody } from '../doc-body'
import { doc } from '../docs'
import { Section } from '../layout'
import { SectionTop } from '../page-parts'
import { Notice } from '../status'
import { color, font } from '../tokens.stylex'

export const Route = createFileRoute('/publish')({
  head: () => ({ meta: [{ title: 'Publish · Duo' }] }),
  component: Page
})

function Page() {
  const d = doc('platform/publishing')
  return (
    <Section narrow>
      {d ? <DocBody doc={d} /> : <p {...stylex.props(styles.p)}>publishing.md is missing from docs/platform.</p>}
      <div {...stylex.props(styles.gap)}>
        <SectionTop eyebrow="Not built yet" title="Pull request template" />
      </div>
      <Notice status="unfinished">
        The repository has no pull request template yet. The plan is one that asks for the app id, lane, permissions in
        words, the changelog line and the CI check results; it lands with the store's CI in a later stage.
      </Notice>
    </Section>
  )
}

const styles = stylex.create({
  p: { fontFamily: font.sans, fontSize: '17px', lineHeight: 1.6, color: color.text },
  /** The doc body ends flush; the second heading needs its own air. */
  gap: { marginTop: '56px' }
})

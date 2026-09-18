import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { known } from '../docs'
import { versions } from '../generated/api'
import { Section } from '../layout'
import { parse, render } from '../markdown'
import { PageTop, Reveal } from '../page-parts'
import { Notice } from '../status'
import { color, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const Route = createFileRoute('/changelog')({
  head: () => ({ meta: [{ title: 'Changelog · Duo' }] }),
  component: Page
})

const ORDER = ['sdk', 'uikit', 'shell', 'cli'] as const
const LABEL: Record<(typeof ORDER)[number], string> = { sdk: 'SDK', uikit: 'UI kit', shell: 'Shell', cli: 'CLI' }

function Page() {
  return (
    <Section narrow>
      <PageTop
        eyebrow="Changelog · Nothing released yet"
        title="Changelog"
        lead="The SDK's, the kit's and the shell's, on one page, read from each package's CHANGELOG.md at build time."
      />
      <Notice status="unfinished">
        No package has published a release yet, so there is no changelog to show. Every version below is the workspace
        placeholder 0.0.0. The first real entries arrive when the SDK's host contract and the kit's first components
        ship.
      </Notice>
      <Reveal>
        <ul {...stylex.props(styles.cards)}>
          {ORDER.map((k) => {
            const v = versions[k]
            if (!v) return null
            return (
              <li key={k} {...stylex.props(styles.card)}>
                <p {...stylex.props(styles.pkg)}>{LABEL[k]}</p>
                <p {...stylex.props(styles.version)}>{v.version}</p>
                <p {...stylex.props(styles.name)}>{v.name}</p>
                <p {...stylex.props(styles.note)}>{v.changelog ? 'Changelog below' : 'No changelog yet'}</p>
              </li>
            )
          })}
        </ul>
      </Reveal>
      {ORDER.map((k) => {
        const v = versions[k]
        if (!v?.changelog) return null
        return (
          <section key={k}>
            <h2 {...stylex.props(styles.h2)}>{LABEL[k]}</h2>
            {render(parse(v.changelog), { from: `packages/${k}/CHANGELOG.md`, known })}
          </section>
        )
      })}
    </Section>
  )
}

const styles = stylex.create({
  cards: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [SMALL]: 'minmax(0, 1fr)' },
    gap: '12px'
  },
  card: {
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    paddingTop: '20px',
    paddingBottom: '20px',
    paddingLeft: '22px',
    paddingRight: '22px'
  },
  pkg: {
    margin: 0,
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: color.text3
  },
  version: {
    margin: 0,
    marginTop: '10px',
    fontFamily: font.display,
    fontSize: '28px',
    lineHeight: 1.1,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: color.text
  },
  name: {
    margin: 0,
    marginTop: '6px',
    fontFamily: font.mono,
    fontSize: '13px',
    color: color.text2,
    overflowWrap: 'anywhere'
  },
  note: { margin: 0, marginTop: '10px', fontFamily: font.sans, fontSize: '14px', color: color.text3 },
  h2: {
    fontFamily: font.display,
    fontSize: { default: '28px', [SMALL]: '24px' },
    lineHeight: 1.15,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    marginTop: '48px',
    marginBottom: '8px',
    color: color.text
  }
})

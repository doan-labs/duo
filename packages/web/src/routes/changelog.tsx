import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { known } from '../docs'
import { versions } from '../generated/api'
import { Section } from '../layout'
import { type Block, parse, render } from '../markdown'
import { PageTop, Reveal } from '../page-parts'
import { color, ease, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const Route = createFileRoute('/changelog')({
  head: () => ({ meta: [{ title: 'Changelog · Duo' }] }),
  component: Page
})

const ORDER = ['sdk', 'uikit', 'shell', 'cli'] as const
const LABEL: Record<(typeof ORDER)[number], string> = { sdk: 'SDK', uikit: 'UI kit', shell: 'Shell', cli: 'CLI' }

/**
 * The package name is this page's `h2`, so a CHANGELOG's own `# 1.0.0` drops a
 * level rather than out-shouting the heading it sits under.
 */
const demote = (bs: Block[]): Block[] => bs.map((b) => (b.t === 'h' ? { ...b, level: Math.min(6, b.level + 1) } : b))

function Page() {
  return (
    <Section narrow>
      <PageTop
        eyebrow="Changelog"
        title="Changelog"
        lead="Every package on one page, read from its CHANGELOG.md at build time. Apps bundle the SDK and kit they compile against, so a new version here never breaks an installed app."
      />
      <Reveal>
        <ul {...stylex.props(styles.cards)}>
          {ORDER.map((k) => {
            const v = versions[k]
            if (!v) return null
            // "Changelog below" was a promise the card could not keep; now it is the way there.
            const body = (
              <>
                <p {...stylex.props(styles.pkg)}>{LABEL[k]}</p>
                <p {...stylex.props(styles.version)}>{v.version}</p>
                <p {...stylex.props(styles.name)}>{v.name}</p>
                <p {...stylex.props(styles.note)}>{v.changelog ? 'Changelog below' : 'No changelog yet'}</p>
              </>
            )
            return (
              <li key={k}>
                {v.changelog ? (
                  <a href={`#${k}`} {...stylex.props(styles.card, styles.cardLink)}>
                    {body}
                  </a>
                ) : (
                  <div {...stylex.props(styles.card)}>{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      </Reveal>
      {ORDER.map((k) => {
        const v = versions[k]
        if (!v?.changelog) return null
        return (
          <section key={k} id={k} {...stylex.props(styles.log)}>
            <Reveal>
              <h2 {...stylex.props(styles.h2)}>{LABEL[k]}</h2>
            </Reveal>
            {render(demote(parse(v.changelog)), { from: `packages/${k}/CHANGELOG.md`, known })}
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
    display: 'block',
    height: '100%',
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
  cardLink: {
    textDecoration: 'none',
    willChange: 'transform',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    transitionProperty: 'border-color, transform, box-shadow, outline-color',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out,
    transform: { default: 'translateY(0)', ':hover': 'translateY(-2px)' },
    boxShadow: { default: 'none', ':hover': color.shadow },
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
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
  // The cards above link down here, and the nav sits over the top of the page.
  log: { scrollMarginTop: '96px' },
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

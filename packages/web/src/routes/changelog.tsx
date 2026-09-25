import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import log from '../../../../CHANGELOG.md?raw'
import { known } from '../docs'
import { Fold } from '../fold'
import { appForName } from '../home/apps'
import { Section } from '../layout'
import { type Block, parse, render } from '../markdown'
import { PageTop } from '../page-parts'
import { color, ease, font, radius } from '../tokens.stylex'

export const Route = createFileRoute('/changelog')({
  head: () => ({ meta: [{ title: 'Changelog · Duo' }] }),
  component: Page
})

const CTX = { from: 'CHANGELOG.md', known }

type Part = { title: string; blocks: Block[] }
type Version = { head: Block; intro: Block[]; parts: Part[] }

/**
 * One log for all of Duo. A `##` is a Duo version and stays a heading; each `###`
 * under it (UI kit, SDK, Shell...) folds into an accordion. The file's own
 * `# Changelog` is dropped: PageTop carries it.
 */
const VERSIONS = parse(log).reduce<Version[]>((vs, b) => {
  const v = vs.at(-1)
  if (b.t === 'h' && b.level === 2) vs.push({ head: b, intro: [], parts: [] })
  else if (!v || (b.t === 'h' && b.level === 1)) return vs
  else if (b.t === 'h' && b.level === 3) v.parts.push({ title: b.text, blocks: [] })
  else (v.parts.at(-1)?.blocks ?? v.intro).push(b)
  return vs
}, [])

/** Settings is not on the home screen, so /apps has no entry for it: an icon, no page. */
const SETTINGS = '/icons/settings.webp'
const iconOf = (name: string) => appForName(name)?.icon ?? (name === 'Settings' ? SETTINGS : undefined)

/**
 * "Rebuilt after Apple's: Camera, Notes and the App Store." as a lead and app names,
 * when every name is a real app; anything else stays prose.
 */
function appList(text: string) {
  const at = text.indexOf(': ')
  const names = text
    .slice(at + 1)
    .replace(/\.$/, '')
    .split(/,\s+|\s+and\s+/)
    .map((n) => n.trim().replace(/^the /, ''))
  if (names.length < 2 || !names.every(iconOf)) return null
  return { lead: at < 0 ? null : text.slice(0, at), names }
}

function Page() {
  return (
    <Section narrow>
      <PageTop eyebrow="Changelog" title="Changelog" lead="What changed in Duo, version by version." />
      {VERSIONS.map((v) => (
        <section key={v.head.t === 'h' ? v.head.id : ''}>
          {render([v.head, ...v.intro], CTX)}
          {v.parts.map((p) => (
            <Accordion key={p.title} part={p} />
          ))}
        </section>
      ))}
    </Section>
  )
}

/** One `###` part of a version; a line naming apps draws them as linked icons. */
function Accordion({ part }: { part: Part }) {
  return (
    <Fold head={<span {...stylex.props(styles.title)}>{part.title}</span>}>
      {part.blocks.map((b) => {
        const items = b.t === 'list' ? b.items.map((it) => (it[0]?.t === 'p' ? appList(it[0].text) : null)) : []
        if (b.t !== 'list' || !items.some(Boolean)) return render([b], CTX)
        return b.items.map((it, i) => {
          const apps = items[i]
          const key = it[0]?.t === 'p' ? it[0].text : String(i)
          if (!apps) return <div key={key}>{render(it, CTX)}</div>
          return (
            <div key={key} {...stylex.props(styles.apps)}>
              {apps.lead && <p {...stylex.props(styles.lead)}>{apps.lead}</p>}
              <ul {...stylex.props(styles.grid)}>
                {apps.names.map((n) => {
                  const slug = appForName(n)?.slug
                  const face = (
                    <>
                      <img src={iconOf(n)} alt="" width={1024} height={1024} {...stylex.props(styles.icon)} />
                      {n}
                    </>
                  )
                  return (
                    <li key={n}>
                      {slug ? (
                        <Link to="/apps/$slug" params={{ slug }} {...stylex.props(styles.app, styles.appLink)}>
                          {face}
                        </Link>
                      ) : (
                        <span {...stylex.props(styles.app)}>{face}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })
      })}
    </Fold>
  )
}

const styles = stylex.create({
  title: { fontFamily: font.sans, fontSize: '17px', fontWeight: 600 },
  apps: { marginBottom: '20px' },
  lead: { marginTop: 0, marginBottom: '12px', fontFamily: font.sans, fontSize: '15px', color: color.text2 },
  grid: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px'
  },
  app: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    fontFamily: font.sans,
    fontSize: '15px',
    color: color.text,
    // Every tile takes the hover pad, linked or not, so Settings lines up with its row.
    marginLeft: '-6px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: radius.md
  },
  appLink: {
    textDecoration: 'none',
    backgroundColor: { default: 'transparent', ':hover': color.well },
    transitionProperty: 'background-color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  icon: { width: '32px', height: '32px', flexShrink: 0, borderRadius: '7px' }
})

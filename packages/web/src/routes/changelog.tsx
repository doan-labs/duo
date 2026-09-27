import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import log from '../../../../CHANGELOG.md?raw'
import { AppGrid, iconOf } from '../app-grid'
import { known } from '../docs'
import { Fold } from '../fold'
import { Section } from '../layout'
import { type Block, parse, render } from '../markdown'
import { PageTop } from '../page-parts'
import { color, font } from '../tokens.stylex'

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
              <AppGrid names={apps.names} />
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
  lead: { marginTop: 0, marginBottom: '12px', fontFamily: font.sans, fontSize: '15px', color: color.text2 }
})

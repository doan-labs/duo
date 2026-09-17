// News. Hacker News' front page dressed as Apple News: the stories are live,
// the artwork is generated from their titles so nothing else needs a round-trip.
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import type { Os } from '../uikit/app.ts'
import { Nav, Page, useNav } from '../uikit/nav.tsx'
import { shared } from '../uikit/styles.ts'
import { Sym } from '../uikit/sym.tsx'
import { colors } from '../uikit/tokens.stylex.ts'
import { art } from './shared.ts'

/** Strip tags first, then let a textarea decode the entities. No markup survives to be parsed. */
const detag = (s: string) => {
  const d = document.createElement('textarea')
  d.innerHTML = s.replace(/<[^>]*>/g, ' ')
  return d.value.replace(/\s+/g, ' ').trim()
}
type Story = { title: string; url?: string; author: string; points: number; num_comments: number; objectID: string }
type Comment = { id: number; author: string; text: string | null }

const Comments = ({ id }: { id: string }) => {
  const [kids, setKids] = useState<Comment[] | null>(null)
  useEffect(() => {
    const ac = new AbortController()
    fetch(`https://hn.algolia.com/api/v1/items/${id}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((j) => setKids((j.children as Comment[]).filter((c) => c.text).slice(0, 12)))
      .catch(() => {
        if (!ac.signal.aborted) setKids([])
      })
    return () => ac.abort()
  }, [id])
  return (
    <div>
      {kids ? (
        kids.map((c) => (
          <div key={c.id} {...stylex.props(styles.cmt)}>
            <b {...stylex.props(styles.cmtAuthor)}>{c.author}</b>
            {detag(c.text!).slice(0, 420)}
          </div>
        ))
      ) : (
        <div {...stylex.props(shared.ph, styles.pad20)}>Loading comments…</div>
      )}
    </div>
  )
}

/** Hand-rolled rather than `Page`: the back button carries the "Today" label and there is an Open action. */
const StoryPage = ({ s, back, os }: { s: Story; back: () => void; os: Os }) => (
  <div {...stylex.props(shared.column)}>
    <div {...stylex.props(shared.hdr, styles.hdrMd)}>
      <button type="button" {...stylex.props(shared.bk)} onClick={back}>
        <Sym name="back" size={20} />
        Today
      </button>
      {s.url && (
        <button type="button" {...stylex.props(styles.openBtn)} onClick={() => os.open('Safari', s.url)}>
          Open
        </button>
      )}
    </div>
    <div {...stylex.props(shared.body)}>
      <div {...stylex.props(styles.hero, styles.tint(art(s.title, 46)))} />
      <div {...stylex.props(styles.head)}>
        <div {...stylex.props(styles.storyTitle)}>{s.title}</div>
        <div {...stylex.props(shared.sub, styles.mt8)}>
          {s.author} · {s.points} points · {s.num_comments} comments
        </div>
      </div>
      <div {...stylex.props(shared.hdr, styles.hdr18)}>Discussion</div>
      <Comments id={s.objectID} />
    </div>
  </div>
)

const Feed = ({ os }: { os: Os }) => {
  const { push } = useNav()
  const [hits, setHits] = useState<Story[] | 'error' | null>(null)
  useEffect(() => {
    const ac = new AbortController()
    fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=18', { signal: ac.signal })
      .then((r) => r.json())
      .then((j) => setHits((j.hits as Story[]).filter((s) => s.title)))
      .catch(() => {
        if (!ac.signal.aborted) setHits('error')
      })
    return () => ac.abort()
  }, [])
  if (!hits) return <div {...stylex.props(shared.ph)}>Loading Today…</div>
  if (hits === 'error') return <div {...stylex.props(shared.ph)}>Could not reach the news service.</div>
  const [lead, ...rest] = hits
  const open = (s: Story) => push((back) => <StoryPage s={s} back={back} os={os} />)
  return (
    <div>
      {lead && (
        <div {...stylex.props(styles.lead, styles.tint(art(lead.title, 46)))} onClick={() => open(lead)}>
          <div {...stylex.props(styles.kicker)}>TOP STORY</div>
          <div {...stylex.props(styles.leadTitle)}>{lead.title}</div>
          <div {...stylex.props(styles.leadMeta)}>
            {lead.points} points · {lead.num_comments} comments
          </div>
        </div>
      )}
      {rest.map((s) => (
        <div key={s.objectID} {...stylex.props(styles.li)} onClick={() => open(s)}>
          <div {...stylex.props(styles.tx)}>
            <b {...stylex.props(styles.title)}>{s.title}</b>
            <p {...stylex.props(styles.meta)}>
              {s.author} · {s.points} points · {s.num_comments} comments
            </p>
          </div>
          <div {...stylex.props(styles.thumb, styles.tint(art(s.title)))} />
        </div>
      ))}
    </div>
  )
}

export const News = ({ os }: { os: Os }) => (
  <Nav>
    <Page
      title={
        <>
          Today
          <span {...stylex.props(shared.hdrSm)}>
            {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </>
      }
    >
      <Feed os={os} />
    </Page>
  </Nav>
)

const styles = stylex.create({
  hdrMd: { fontSize: 17 },
  hdr18: { fontSize: 18 },
  openBtn: { marginLeft: 'auto', color: colors.blueDark, fontSize: 15, fontWeight: 500 },
  lead: {
    marginInline: 16,
    marginBottom: 14,
    borderRadius: 16,
    paddingBlock: 16,
    paddingInline: 16,
    color: colors.white,
    minHeight: 150,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    cursor: 'pointer',
    boxShadow: '0 10px 26px rgba(0,0,0,.22)'
  },
  kicker: { fontSize: 11, fontWeight: 700, letterSpacing: 0.8, opacity: 0.8 },
  leadTitle: { fontSize: 21, fontWeight: 700, lineHeight: 1.25, marginTop: 6 },
  leadMeta: { fontSize: 12, opacity: 0.8, marginTop: 8 },
  li: {
    display: 'flex',
    gap: 10,
    paddingTop: 11,
    paddingInline: 16,
    paddingBottom: 11,
    backgroundColor: { default: colors.white, ':active': colors.fillThin },
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.14)',
    cursor: 'pointer',
    alignItems: 'flex-start',
    transitionProperty: 'background-color',
    transitionDuration: '.15s'
  },
  tx: { minWidth: 0, flexGrow: 1, flexBasis: 0 },
  title: { display: 'block', fontSize: 15, fontWeight: 600 },
  meta: { fontSize: 13, color: colors.grey, lineHeight: 1.35, maxHeight: '2.7em', overflow: 'hidden' },
  thumb: { width: 56, height: 56, borderRadius: 9, flexShrink: 0 },
  tint: (bg: string) => ({ backgroundImage: bg }),
  pad20: { paddingBlock: 20, paddingInline: 20 },
  hero: { height: 130, marginInline: 16, marginBottom: 14, borderRadius: 14 },
  head: { paddingInline: 18, paddingBottom: 14 },
  storyTitle: { fontSize: 23, fontWeight: 700, lineHeight: 1.24 },
  mt8: { marginTop: 8 },
  cmt: {
    paddingBlock: 10,
    paddingInline: 16,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(60,60,67,.12)',
    fontSize: 14,
    lineHeight: 1.45
  },
  cmtAuthor: { display: 'block', fontSize: 12, color: colors.grey, marginBottom: 3 }
})

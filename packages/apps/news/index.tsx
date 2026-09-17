// News. Hacker News' front page dressed as Apple News: the stories are live,
// the artwork is generated from their titles so nothing else needs a round-trip.

import type { Os } from '@doan-labs/ipduo-sdk'
import { Nav, Page, useNav } from '@doan-labs/ipduo-uikit/nav.tsx'
import { art } from '@doan-labs/ipduo-uikit/shared.ts'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import { Sym } from '@doan-labs/ipduo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { styles } from './styles.ts'

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

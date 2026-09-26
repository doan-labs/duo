// The non-feed panes: Following (channels and topics), Saved Stories, History
// and Search. They all open stories through the same Push sheet as the feeds.
import { art } from '@doan-labs/duo-fixtures'
import type { SYM } from '@doan-labs/duo-uikit/icons/index.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { CHANNELS, Field, type Section } from './chrome.tsx'
import { type Story, search } from './data.ts'
import { Head, Head2, type Open, Skeleton, StoryRow } from './feed.tsx'
import { styles } from './styles.ts'

const SUGGESTED = [
  'JavaScript',
  'Python',
  'React',
  'Rust',
  'Go',
  'DevOps',
  'Cloud',
  'Machine Learning',
  'Security',
  'Game Dev',
  'Design',
  'Beginners'
]

const mark = (seed: string) => styles.bgImg(art(seed))

const GrpRow = ({
  glyph,
  name,
  open,
  act,
  onAct
}: {
  glyph?: keyof typeof SYM
  name: string
  open?: () => void
  act?: keyof typeof SYM
  onAct?: () => void
}) => (
  <div {...stylex.props(styles.grpRow)}>
    {open ? (
      <button type="button" onClick={open} {...stylex.props(styles.grpOpen, shared.press)}>
        <span {...stylex.props(styles.grpMark, mark(name))}>{glyph ? <Sym name={glyph} size={16} /> : name[0]}</span>
        <span {...stylex.props(styles.grpLabel)}>{name}</span>
      </button>
    ) : (
      <>
        <span {...stylex.props(styles.grpMark, mark(name))}>{glyph ? <Sym name={glyph} size={16} /> : name[0]}</span>
        <span {...stylex.props(styles.grpLabel)}>{name}</span>
      </>
    )}
    {act === 'forward' ? (
      <span {...stylex.props(styles.grpAct)}>
        <Sym name="forward" size={14} />
      </span>
    ) : act ? (
      <button
        type="button"
        aria-label={act === 'minus' ? `Unfollow ${name}` : `Follow ${name}`}
        onClick={onAct}
        {...stylex.props(styles.grpAct, act === 'plus' && styles.grpActOn, shared.press)}
      >
        <Sym name={act} size={17} />
      </button>
    ) : null}
  </div>
)

/** Everything the user follows, plus the suggested pool Apple-style. */
export function Following({
  topics,
  onTopics,
  pick
}: {
  topics: string[]
  onTopics: (t: string[]) => void
  pick: (key: string) => void
}) {
  const rest = SUGGESTED.filter((t) => !topics.includes(t))
  return (
    <div {...stylex.props(shared.column, shared.swap)}>
      <div {...stylex.props(styles.scroll)}>
        <Head title="Following" sub="The channels and topics you read" />
        <Head2 title="Channels" first />
        <div {...stylex.props(styles.grp)}>
          {CHANNELS.map((c: Section) => (
            <GrpRow key={c.key} name={c.label} glyph={c.glyph} open={() => pick(c.key)} act="forward" />
          ))}
        </div>
        <Head2 title="Topics" />
        {topics.length ? (
          <div {...stylex.props(styles.grp)}>
            {topics.map((t) => (
              <GrpRow
                key={t}
                name={t}
                open={() => pick(`topic:${t}`)}
                act="minus"
                onAct={() => onTopics(topics.filter((x) => x !== t))}
              />
            ))}
          </div>
        ) : (
          <div {...stylex.props(styles.headSub)}>Nothing followed yet. Pick from below.</div>
        )}
        {!!rest.length && (
          <>
            <Head2 title="Suggested" />
            <div {...stylex.props(styles.grp)}>
              {rest.map((t) => (
                <GrpRow key={t} name={t} act="plus" onAct={() => onTopics([...topics, t])} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Bookmarked stories, newest first. */
export function Saved({ saved, open }: { saved: Record<string, Story>; open: Open }) {
  const list = Object.values(saved).reverse()
  return (
    <div {...stylex.props(shared.column, shared.swap)}>
      <div {...stylex.props(styles.scroll)}>
        <Head title="Saved Stories" sub={list.length ? `${list.length} saved` : undefined} />
        {list.length ? (
          <div {...stylex.props(styles.grid)}>
            {list.map((s, i) => (
              <StoryRow key={s.id} s={s} i={i} open={open} />
            ))}
          </div>
        ) : (
          <div {...stylex.props(shared.ph)}>
            <Sym name="bookmark" size={30} />
            <span>Stories you save appear here.</span>
          </div>
        )}
      </div>
    </div>
  )
}

/** Every story opened, until cleared. */
export function History({ history, open, onClear }: { history: Story[]; open: Open; onClear: () => void }) {
  return (
    <div {...stylex.props(shared.column, shared.swap)}>
      <div {...stylex.props(styles.scroll)}>
        <Head
          title="History"
          side={
            history.length ? (
              <button type="button" onClick={onClear} {...stylex.props(shared.pill)}>
                Clear
              </button>
            ) : undefined
          }
        />
        {history.length ? (
          <div {...stylex.props(styles.grid)}>
            {history.map((s, i) => (
              <StoryRow key={s.id} s={s} i={i} open={open} />
            ))}
          </div>
        ) : (
          <div {...stylex.props(shared.ph)}>
            <Sym name="clockSym" size={30} />
            <span>Stories you read appear here.</span>
          </div>
        )}
      </div>
    </div>
  )
}

/** Live Algolia search; the sidebar field on the wide display drives it too. */
export function Search({ q, onQ, wide, open }: { q: string; onQ: (v: string) => void; wide: boolean; open: Open }) {
  const [hits, setHits] = useState<Story[] | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const query = q.trim()
    if (!query) {
      setHits(null)
      return
    }
    const ac = new AbortController()
    const t = setTimeout(async () => {
      try {
        setHits(await search(query, ac.signal))
        setError(false)
      } catch {
        if (!ac.signal.aborted) setError(true)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      ac.abort()
    }
  }, [q])
  return (
    <div {...stylex.props(shared.column, shared.swap)}>
      <div {...stylex.props(styles.scroll)}>
        <Head title="Search" />
        {!wide && (
          <div {...stylex.props(styles.searchBox)}>
            <Field value={q} onChange={onQ} placeholder="Channels, topics and stories" />
          </div>
        )}
        {error ? (
          <div {...stylex.props(shared.ph)}>Search is unavailable right now.</div>
        ) : hits ? (
          hits.length ? (
            <div {...stylex.props(styles.grid)}>
              {hits.map((s, i) => (
                <StoryRow key={s.id} s={s} i={i} open={open} />
              ))}
            </div>
          ) : (
            <div {...stylex.props(shared.ph)}>No stories match.</div>
          )
        ) : q.trim() ? (
          <Skeleton />
        ) : (
          <div {...stylex.props(shared.ph)}>
            <Sym name="search" size={30} />
            <span>Search Hacker News.</span>
          </div>
        )}
      </div>
    </div>
  )
}

// News. Apple News for the Duo: a floating sidebar of channels and followed
// topics on the inner display, a tab bar on the cover, Today with its hero,
// and articles that push over everything. The stories are live from Hacker
// News; the artwork is generated per story so nothing needs another fetch.
import { os } from '@doan-labs/duo-sdk'
import { useJSON } from '@doan-labs/duo-sdk/react.ts'
import { Push } from '@doan-labs/duo-uikit/nav.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { useWide } from '@doan-labs/duo-uikit/wide.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import { Article } from './article.tsx'
import { Following, History, Saved, Search } from './browse.tsx'
import { Sidebar, Tabs } from './chrome.tsx'
import { fetchStory, refresh, type Story } from './data.ts'
import { Feed, type Open, Today } from './feed.tsx'
import { styles } from './styles.ts'

const TOPICS_SEED = ['Apple', 'AI', 'Space', 'Open Source']

const LABELS: Record<string, string> = {
  today: 'Today',
  latest: 'Latest',
  show: 'Show HN',
  ask: 'Ask HN',
  jobs: 'Jobs',
  following: 'Following',
  saved: 'Saved',
  history: 'History',
  search: 'Search'
}
const from = (tab: string) => (tab.startsWith('topic:') ? tab.slice(6) : (LABELS[tab] ?? 'News'))

/** The sheet keeps the last story mounted while it slides back out. */
const ArticleSheet = ({
  story,
  wide,
  back,
  from: fromName
}: {
  story: Story | null
  wide: boolean
  back: () => void
  from: string
}) => {
  const ref = useRef(story)
  if (story) ref.current = story
  return ref.current ? <Article s={ref.current} wide={wide} back={back} from={fromName} /> : null
}

export function News() {
  const [ref, wide] = useWide<HTMLDivElement>()
  const tab = useJSON(os.session, 'tab', 'today')
  const q = useJSON(os.session, 'q', '')
  const story = useJSON<Story | null>(os.session, 'story', null)
  const topics = useJSON(os.storage, 'topics', TOPICS_SEED)
  const saved = useJSON<Record<string, Story>>(os.storage, 'saved', {})
  const history = useJSON<Story[]>(os.storage, 'history', [])

  const open: Open = (s) => {
    story.set(s)
    history.set([s, ...history.value.filter((h) => h.id !== s.id)].slice(0, 40))
  }
  const closeStory = () => story.del()

  // A `?arg=<objectID>` link opens the article once the item is fetched; the
  // mirror copy delegates the fetch to the owner through commands.
  const openRef = useRef(open)
  openRef.current = open
  useEffect(() => {
    const go = (arg: string) => {
      if (arg) void fetchStory(arg).then((s) => s && openRef.current(s))
    }
    go(os.session.arg ?? '')
    return os.session.onArg(go)
  }, [])

  const view = tab.value
  const pane = view.startsWith('topic:') ? (
    <Feed
      feed={view}
      title={view.slice(6)}
      side={
        <button
          type="button"
          onClick={() =>
            topics.set(
              topics.value.includes(view.slice(6))
                ? topics.value.filter((t) => t !== view.slice(6))
                : [...topics.value, view.slice(6)]
            )
          }
          {...stylex.props(styles.chip)}
        >
          {topics.value.includes(view.slice(6)) ? '✓ Following' : '+ Follow'}
        </button>
      }
      wide={wide}
      open={open}
    />
  ) : view === 'today' ? (
    <Today wide={wide} open={open} />
  ) : view === 'latest' || view === 'show' || view === 'ask' || view === 'jobs' ? (
    <Feed feed={view} title={LABELS[view] ?? 'News'} wide={wide} open={open} />
  ) : view === 'following' ? (
    <Following topics={topics.value} onTopics={topics.set} pick={tab.set} />
  ) : view === 'saved' ? (
    <Saved saved={saved.value} open={open} />
  ) : view === 'history' ? (
    <History history={history.value} open={open} onClear={() => history.set([])} />
  ) : (
    <Search q={q.value} onQ={q.set} wide={wide} open={open} />
  )

  return (
    <div ref={ref} {...stylex.props(styles.root)}>
      <Push
        open={!!story.value}
        sheet={<ArticleSheet story={story.value} wide={wide} back={closeStory} from={from(view)} />}
      >
        <div {...stylex.props(styles.fill)}>
          {wide && (
            <Sidebar
              tab={view}
              pick={tab.set}
              query={q.value}
              onQuery={(v) => {
                q.set(v)
                tab.set('search')
              }}
              topics={topics.value}
              saved={Object.keys(saved.value).length}
              refresh={() => {
                void refresh(view, true)
                void refresh('today', true)
                void refresh('latest', true)
              }}
            />
          )}
          <div {...stylex.props(styles.pane, wide ? styles.paneSide : styles.paneScroll)}>
            {/* A section change remounts its pane, so the swap and rise animations replay. */}
            <div key={view} {...stylex.props(shared.column)}>
              {pane}
            </div>
          </div>
          {!wide && <Tabs tab={view} pick={tab.set} />}
        </div>
      </Push>
    </div>
  )
}

// The feeds: Today with its hero, the channel lists, and the rows they share.
import { art } from '@doan-labs/duo-fixtures'
import { delay, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { refresh, type Story, useFeed } from './data.ts'
import { ago, host, today } from './fmt.ts'
import { styles } from './styles.ts'

export type Open = (s: Story) => void

export const Head = ({ title, sub, side }: { title: string; sub?: string; side?: ReactNode }) => (
  <>
    <div {...stylex.props(styles.head)}>
      <h1 {...stylex.props(styles.headTitle)}>{title}</h1>
      {side && <div {...stylex.props(styles.headSide)}>{side}</div>}
    </div>
    {sub && <div {...stylex.props(styles.headSub)}>{sub}</div>}
  </>
)

export const Head2 = ({ title, sub, first }: { title: string; sub?: string; first?: boolean }) => (
  <div {...stylex.props(styles.head2, first && styles.head2First)}>
    <h2 {...stylex.props(styles.head2Title)}>{title}</h2>
    {sub && <div {...stylex.props(styles.head2Sub)}>{sub}</div>}
  </div>
)

const meta = (s: Story) =>
  [
    host(s.url),
    s.points ? `${s.points} points` : '',
    s.comments ? `${s.comments} comments` : '',
    s.time ? ago(s.time) : ''
  ]
    .filter(Boolean)
    .join(' · ')

/** What stands in for photography: a deterministic palette per story and its source's initial. */
const thumb = (s: Story) => styles.bgImg(art(s.url || s.title))
const initial = (s: Story) => (host(s.url)[0] ?? '?').toUpperCase()

export const Thumb = ({ s, small }: { s: Story; small?: boolean }) => (
  <span aria-hidden="true" {...stylex.props(styles.thumb, small && styles.thumbSm, thumb(s))}>
    {initial(s)}
  </span>
)

export const StoryRow = ({ s, i, open }: { s: Story; i: number; open: Open }) => (
  <div {...stylex.props(styles.row)}>
    <button
      type="button"
      onClick={() => open(s)}
      {...stylex.props(shared.rise, delay.ms(Math.min(i, 12) * 35), styles.rowIn, shared.press)}
    >
      <span {...stylex.props(styles.rowText)}>
        <span {...stylex.props(styles.rowTitle)}>{s.title}</span>
        <span {...stylex.props(styles.rowMeta)}>{meta(s)}</span>
      </span>
      <Thumb s={s} small />
    </button>
  </div>
)

export const Rows = ({ hits, open }: { hits: Story[]; open: Open }) => (
  <div {...stylex.props(styles.grid)}>
    {hits.map((s, i) => (
      <StoryRow key={s.id} s={s} i={i} open={open} />
    ))}
  </div>
)

const Hero = ({ s, wide, open }: { s: Story; wide: boolean; open: Open }) => (
  <button
    type="button"
    onClick={() => open(s)}
    {...stylex.props(shared.rise, styles.hero, !wide && styles.heroSm, thumb(s), shared.press)}
  >
    <span {...stylex.props(styles.heroShade)} />
    <span {...stylex.props(styles.heroText)}>
      <span {...stylex.props(styles.kicker)}>Top Story</span>
      <span {...stylex.props(styles.heroTitle, !wide && styles.heroTitleSm)}>{s.title}</span>
      <span {...stylex.props(styles.heroMeta)}>{meta(s)}</span>
    </span>
  </button>
)

export const Skeleton = ({ hero }: { hero?: boolean }) => (
  <div {...stylex.props(styles.sk)}>
    {hero && <div {...stylex.props(styles.skHero)} />}
    <div {...stylex.props(styles.grid)}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} {...stylex.props(styles.row)}>
          <div {...stylex.props(styles.rowIn)}>
            <span {...stylex.props(styles.rowText)}>
              <span {...stylex.props(styles.skLine)} />
              <span {...stylex.props(styles.skLineS)} />
            </span>
            <span {...stylex.props(styles.skThumb)} />
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const Oops = ({ error, retry }: { error: string; retry: () => void }) => (
  <div {...stylex.props(shared.ph)}>
    <Sym name="wifi" size={30} />
    <span>{error}</span>
    <button type="button" onClick={retry} {...stylex.props(shared.pill)}>
      Try Again
    </button>
  </div>
)

/** A channel or topic feed: a large-title header over hairline rows. */
export function Feed({
  feed,
  title,
  sub,
  side,
  wide,
  open
}: {
  feed: string
  title: string
  sub?: string
  side?: ReactNode
  wide: boolean
  open: Open
}) {
  const { hits, loading, error } = useFeed(feed)
  return (
    <div {...stylex.props(shared.column, shared.swap)} key={feed}>
      <div {...stylex.props(styles.scroll)}>
        <Head title={title} sub={sub} side={side} />
        {error && !hits?.length ? (
          <Oops error={error} retry={() => void refresh(feed, true)} />
        ) : hits?.length ? (
          <div {...stylex.props(styles.grid, wide && styles.gridWide)}>
            {hits.map((s, i) => (
              <StoryRow key={s.id} s={s} i={i} open={open} />
            ))}
          </div>
        ) : loading ? (
          <Skeleton />
        ) : (
          <div {...stylex.props(shared.ph)}>No stories yet.</div>
        )}
      </div>
    </div>
  )
}

/** Today: the hero, Top Stories, then the Latest wire. */
export function Today({ wide, open }: { wide: boolean; open: Open }) {
  const { hits, error } = useFeed('today')
  const wire = useFeed('latest')
  return (
    <div {...stylex.props(shared.column, shared.swap)}>
      <div {...stylex.props(styles.scroll)}>
        <Head title="Today" side={today()} />
        {error && !hits?.length ? (
          <Oops error={error} retry={() => void refresh('today', true)} />
        ) : !hits ? (
          <Skeleton hero />
        ) : (
          <>
            {hits[0] && <Hero s={hits[0]} wide={wide} open={open} />}
            <Head2 title="Top Stories" first />
            <div {...stylex.props(styles.grid, wide && styles.gridWide)}>
              {hits.slice(1, 13).map((s, i) => (
                <StoryRow key={s.id} s={s} i={i} open={open} />
              ))}
            </div>
            {hits.length > 13 && (
              <div {...stylex.props(styles.grid, wide && styles.gridWide)}>
                {hits.slice(13).map((s, i) => (
                  <StoryRow key={s.id} s={s} i={i + 12} open={open} />
                ))}
              </div>
            )}
            <Head2 title="Latest" sub="Fresh off the wire" />
            {wire.hits?.length ? (
              <div {...stylex.props(styles.grid, wide && styles.gridWide)}>
                {wire.hits.slice(0, 8).map((s, i) => (
                  <StoryRow key={s.id} s={s} i={i} open={open} />
                ))}
              </div>
            ) : wire.error ? null : (
              <Skeleton />
            )}
          </>
        )}
      </div>
    </div>
  )
}

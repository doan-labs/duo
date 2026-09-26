// The panes: Listen Now (show shelf + episode rows), a pushed show page, a
// pushed episode page, Library (subscriptions, downloads, history), Search,
// and Up Next. Everything reads the module cells in store.ts, so the cover
// copy shows the same pane.

import { art, mmss } from '@doan-labs/duo-fixtures'
import { Button, IconButton, List, Page, Placeholder, Row, Section, Text, TextField, Title } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type Ep, epById, epsOf, SHOWS, type Show, searchPodcasts, showOf } from './data.ts'
import { podcastsDeck, usePodcastsDeck } from './deck.ts'
import {
  addToQueue,
  closeEp,
  openEp,
  openShow,
  setPlayer,
  setQ,
  share,
  toggleDownload,
  toggleSub,
  useDls,
  useHist,
  useSubs,
  useUi
} from './store.ts'
import { styles } from './styles.ts'

const mins = (ep: Ep) => `${Math.round(ep.secs / 60)} min`

/** The square artwork every surface uses: a deterministic gradient per title. */
export const Art = ({ s, size, xstyle }: { s: string; size: number; xstyle?: stylex.StyleXStyles }) => (
  <div aria-hidden="true" {...stylex.props(styles.art(size), styles.bg(art(s)), xstyle)} />
)

/** An episode line anywhere: art, title, show · length; tap opens its page. */
export const EpRow = ({ ep, onPress }: { ep: Ep; onPress?: () => void }) => {
  const d = usePodcastsDeck()
  const live = d.now?.id === ep.id
  return (
    <li>
      <button type="button" {...stylex.props(styles.li, shared.press)} onClick={onPress ?? (() => openEp(ep.id))}>
        <Art s={ep.title} size={52} xstyle={styles.thumb} />
        <span {...stylex.props(styles.tx)}>
          <b {...stylex.props(typography.subheadline, styles.txB, live && styles.live)}>{ep.title}</b>
          <span {...stylex.props(typography.footnote, styles.txP)}>
            {ep.show} · {mins(ep)}
          </span>
        </span>
        <span {...stylex.props(styles.chev)}>
          <Sym name="forward" size={13} />
        </span>
      </button>
    </li>
  )
}

/** Show posters in a sideways shelf; tapping opens the show page. */
const Poster = ({ show }: { show: Show }) => (
  <button
    type="button"
    {...stylex.props(styles.poster, shared.press)}
    onClick={() => openShow(show.title)}
    aria-label={show.title}
  >
    <div {...stylex.props(typography.footnote, styles.im, styles.bg(art(show.title)))}>{show.title}</div>
    <Text as="div" size="caption" xstyle={[styles.posterSub]}>
      {show.author}
    </Text>
  </button>
)

export const Home = () => (
  <>
    <div {...stylex.props(styles.shelf)}>
      {SHOWS.map((s) => (
        <Poster key={s.title} show={s} />
      ))}
    </div>
    {SHOWS.map((s) => (
      <section key={s.title}>
        <Title xstyle={[typography.title3]}>
          <button type="button" {...stylex.props(styles.showLink)} onClick={() => openShow(s.title)}>
            {s.title}
          </button>
        </Title>
        <List>
          {epsOf(s.title).map((e) => (
            <EpRow key={e.id} ep={e} />
          ))}
        </List>
      </section>
    ))}
  </>
)

/** The pushed show page: art, metadata, the follow pill, its episodes. */
export const ShowPage = ({ title, back }: { title: string; back: () => void }) => {
  const show = SHOWS.find((s) => s.title === title)
  const subs = useSubs()
  if (!show) return null
  const eps = epsOf(show.title)
  const on = !!subs[show.title]
  return (
    <Page title={show.title} back={back}>
      <div {...stylex.props(styles.showHead)}>
        <Art s={show.title} size={120} xstyle={styles.showArt} />
        <h2 {...stylex.props(styles.showName)}>{show.title}</h2>
        <Text as="div" size="footnote" color="secondary">
          {show.author}
        </Text>
        <Button
          variant={on ? 'tinted' : 'filled'}
          aria-pressed={on}
          onClick={() => toggleSub(show.title)}
          xstyle={[styles.subBtn]}
        >
          {on ? 'Following' : 'Subscribe'}
        </Button>
      </div>
      <Text as="p" size="footnote" color="secondary" xstyle={[styles.showDesc]}>
        {show.desc}
      </Text>
      <Title xstyle={[typography.title3]}>Episodes</Title>
      <List>
        {eps.map((e) => (
          <EpRow key={e.id} ep={e} />
        ))}
      </List>
      <div {...stylex.props(styles.playAll)}>
        <Button
          variant="filled"
          onClick={() => {
            podcastsDeck.play(eps, 0)
            setPlayer(true)
          }}
        >
          Play Latest
        </Button>
      </div>
    </Page>
  )
}

/** The pushed episode page: everything about it plus its four actions. */
export const EpPage = ({ id, back }: { id: string; back: () => void }) => {
  const ep = epById(id)
  const d = usePodcastsDeck()
  const dls = useDls()
  if (!ep) return null
  const live = d.now?.id === ep.id
  const playing = live && d.playing
  const dl = !!dls[ep.id]
  return (
    <Page title={ep.title} back={back}>
      <div {...stylex.props(styles.epHead)}>
        <Art s={ep.title} size={96} xstyle={styles.showArt} />
        <h2 {...stylex.props(styles.epTitle)}>{ep.title}</h2>
        <button
          type="button"
          {...stylex.props(styles.epShow)}
          onClick={() => {
            closeEp()
            openShow(ep.show)
          }}
        >
          {ep.show}
        </button>
        <Text size="footnote" color="tertiary">
          {mins(ep)}
        </Text>
      </div>
      <div {...stylex.props(styles.epBtns)}>
        <Button
          variant="filled"
          onClick={() => {
            if (live) d.toggle()
            else podcastsDeck.playOne(ep)
            setPlayer(true)
          }}
        >
          {playing ? 'Pause' : live ? 'Resume' : 'Play'}
        </Button>
      </div>
      <Section>
        <Row
          as="button"
          label={dl ? 'Downloaded' : 'Download'}
          icon={<Sym name="down" size={17} />}
          detail={dl ? <Sym name="check" size={15} /> : undefined}
          onClick={() => toggleDownload(ep)}
        />
        <Row as="button" label="Play Next" icon={<Sym name="list" size={17} />} onClick={() => addToQueue(ep, true)} />
        <Row
          as="button"
          label="Add to Queue"
          icon={<Sym name="plus" size={17} />}
          onClick={() => addToQueue(ep, false)}
        />
        <Row as="button" label="Share Episode" icon={<Sym name="share" size={17} />} onClick={() => void share(ep)} />
      </Section>
      <Text as="p" size="footnote" color="secondary" xstyle={[styles.showDesc]}>
        {ep.desc}
      </Text>
      <Text as="p" size="footnote" color="secondary" xstyle={[styles.showDesc]}>
        {showOf(ep).desc}
      </Text>
    </Page>
  )
}

/** Library: your shows, your downloads, what you have heard. */
export const Library = () => {
  const subs = useSubs()
  const dls = useDls()
  const hist = useHist()
  const shows = SHOWS.filter((s) => subs[s.title])
  const downloaded = Object.keys(dls)
    .map(epById)
    .filter((e): e is Ep => !!e)
  const heard = hist.map((h) => epById(h.id)).filter((e): e is Ep => !!e)
  return (
    <>
      <Title xstyle={[typography.title3]}>Shows</Title>
      {shows.length === 0 ? (
        <Section>
          <div {...stylex.props(styles.empty)}>No subscriptions yet - tap Subscribe on a show.</div>
        </Section>
      ) : (
        <div {...stylex.props(styles.shelf)}>
          {shows.map((s) => (
            <Poster key={s.title} show={s} />
          ))}
        </div>
      )}
      <Title xstyle={[typography.title3]}>Downloaded</Title>
      {downloaded.length === 0 ? (
        <Section>
          <div {...stylex.props(styles.empty)}>Nothing downloaded.</div>
        </Section>
      ) : (
        <List>
          {downloaded.map((e) => (
            <EpRow key={e.id} ep={e} />
          ))}
        </List>
      )}
      <Title xstyle={[typography.title3]}>Recently Played</Title>
      {heard.length === 0 ? (
        <Section>
          <div {...stylex.props(styles.empty)}>Nothing played yet.</div>
        </Section>
      ) : (
        <List>
          {heard.slice(0, 10).map((e) => (
            <EpRow key={e.id} ep={e} />
          ))}
        </List>
      )}
    </>
  )
}

/** Search: one field over both shows and episodes. */
export const Search = () => {
  const ui = useUi()
  const { shows, eps } = searchPodcasts(ui.q)
  const typed = !!ui.q.trim()
  return (
    <>
      <div {...stylex.props(styles.searchBox)}>
        <Sym name="search" size={14} />
        <TextField
          aria-label="Search podcasts"
          placeholder="Search shows and episodes"
          value={ui.q}
          onChange={(e) => setQ(e.target.value)}
          xstyle={[styles.searchIn]}
        />
        {ui.q ? <IconButton name="xmark" size={11} aria-label="Clear search" onClick={() => setQ('')} /> : null}
      </div>
      {!typed ? (
        <Placeholder>Search shows and episodes</Placeholder>
      ) : shows.length + eps.length === 0 ? (
        <Placeholder>{`No results for “${ui.q.trim()}”`}</Placeholder>
      ) : (
        <>
          {shows.length > 0 && (
            <>
              <Title xstyle={[typography.title3]}>Shows</Title>
              <div {...stylex.props(styles.shelf)}>
                {shows.map((s) => (
                  <Poster key={s.title} show={s} />
                ))}
              </div>
            </>
          )}
          {eps.length > 0 && (
            <>
              <Title xstyle={[typography.title3]}>Episodes</Title>
              <List>
                {eps.map((e) => (
                  <EpRow key={e.id} ep={e} />
                ))}
              </List>
            </>
          )}
        </>
      )}
    </>
  )
}

/** Up Next: the deck's queue, now-playing row first. */
export const Queue = ({ back }: { back: () => void }) => {
  const d = usePodcastsDeck()
  return (
    <Page title="Up Next" back={back}>
      {d.now && (
        <>
          <Title xstyle={[typography.title3]}>Now Playing</Title>
          <List>
            <li>
              <button type="button" {...stylex.props(styles.li, shared.press)} onClick={() => setPlayer(true)}>
                <Art s={d.now.title} size={52} xstyle={styles.thumb} />
                <span {...stylex.props(styles.tx)}>
                  <b {...stylex.props(typography.subheadline, styles.txB, styles.live)}>{d.now.title}</b>
                  <span {...stylex.props(typography.footnote, styles.txP)}>
                    {d.now.show} · {mmss(d.at)} / {mmss(d.dur)}
                  </span>
                </span>
              </button>
            </li>
          </List>
        </>
      )}
      <Title xstyle={[typography.title3]}>Up Next</Title>
      {d.upcoming().length === 0 ? (
        <Section>
          <div {...stylex.props(styles.empty)}>Queue is empty - use Add to Queue on an episode.</div>
        </Section>
      ) : (
        <List>
          {d.upcoming().map(({ ep, pos }) => (
            <li key={`${ep.id}-${pos}`} {...stylex.props(styles.qRow)}>
              <button type="button" {...stylex.props(styles.qBtn, shared.press)} onClick={() => d.load(pos)}>
                <Art s={ep.title} size={44} xstyle={styles.thumb} />
                <span {...stylex.props(styles.tx)}>
                  <b {...stylex.props(typography.subheadline, styles.txB)}>{ep.title}</b>
                  <span {...stylex.props(typography.footnote, styles.txP)}>
                    {ep.show} · {mins(ep)}
                  </span>
                </span>
              </button>
              <IconButton
                name="trash"
                size={13}
                aria-label={`Remove ${ep.title} from queue`}
                onClick={() => podcastsDeck.dequeue(pos)}
              />
            </li>
          ))}
        </List>
      )}
      {d.upcoming().length > 0 && (
        <div {...stylex.props(styles.playAll)}>
          <Button variant="plain" onClick={() => podcastsDeck.clearQueue()}>
            Clear Up Next
          </Button>
        </div>
      )}
    </Page>
  )
}

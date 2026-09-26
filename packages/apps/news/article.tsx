// The article page: a serif column pushed over the whole app, with the
// discussion underneath. Everything it shows is real: the story, its body and
// the comment thread from the story's own source.
import { art } from '@doan-labs/duo-fixtures'
import { os } from '@doan-labs/duo-sdk'
import { useJSON } from '@doan-labs/duo-sdk/react.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type Comment, type Story, useBody, useComments, useImage } from './data.ts'
import { ago, detag, host, paras } from './fmt.ts'
import { styles } from './styles.ts'

const Cmt = ({ c }: { c: Comment }) => (
  <div {...stylex.props(styles.cmt)}>
    <div {...stylex.props(styles.cmtHead)}>
      <span {...stylex.props(styles.cmtBy)}>{c.author}</span>
      <span {...stylex.props(styles.cmtAgo)}>{ago(c.time)}</span>
    </div>
    <div {...stylex.props(styles.cmtText)}>{detag(c.text).slice(0, 1200)}</div>
    {!!c.kids.length && (
      <div {...stylex.props(styles.cmtKids)}>
        {c.kids.map((k) => (
          <div key={k.id} {...stylex.props(styles.cmt)}>
            <div {...stylex.props(styles.cmtHead)}>
              <span {...stylex.props(styles.cmtBy)}>{k.author}</span>
              <span {...stylex.props(styles.cmtAgo)}>{ago(k.time)}</span>
            </div>
            <div {...stylex.props(styles.cmtText)}>{detag(k.text).slice(0, 800)}</div>
          </div>
        ))}
      </div>
    )}
  </div>
)

const Discussion = ({ s }: { s: Story }) => {
  const { items, loading, error } = useComments(s.id)
  return (
    <div {...stylex.props(styles.disc)}>
      <div {...stylex.props(styles.discHead)}>
        <h2 {...stylex.props(styles.discTitle)}>Discussion</h2>
        <span {...stylex.props(styles.discN)}>{s.comments ? `${s.comments} comments` : ''}</span>
      </div>
      {error ? (
        <div {...stylex.props(styles.cmtText)}>{error}</div>
      ) : items?.length ? (
        items.map((c) => <Cmt key={c.id} c={c} />)
      ) : loading ? (
        <div {...stylex.props(styles.sk)}>
          {[0, 1, 2].map((i) => (
            <div key={i} {...stylex.props(styles.cmt)}>
              <div {...stylex.props(styles.skLineS)} />
              <div {...stylex.props(styles.skLine, styles.skPad)} />
            </div>
          ))}
        </div>
      ) : (
        <div {...stylex.props(styles.cmtText)}>No comments yet.</div>
      )}
    </div>
  )
}

export function Article({ s, wide, back, from }: { s: Story; wide: boolean; back: () => void; from: string }) {
  const saved = useJSON<Record<string, Story>>(os.storage, 'saved', {})
  const artUri = useImage(s.image, 'hero')
  const body = useBody(s)
  const on = !!saved.value[s.id]
  const toggle = () => {
    const next = { ...saved.value }
    if (on) delete next[s.id]
    else next[s.id] = s
    saved.set(next)
  }
  const safari = () => void os.open('Safari', s.url || `https://news.ycombinator.com/item?id=${s.id.replace(/^h/, '')}`)
  return (
    <div {...stylex.props(shared.column)}>
      <div {...stylex.props(styles.artTop)}>
        <button type="button" onClick={back} {...stylex.props(styles.artBack, shared.press)}>
          <Sym name="back" size={19} />
          {from}
        </button>
        <div {...stylex.props(styles.artActs)}>
          <button
            type="button"
            aria-label={on ? 'Remove from Saved Stories' : 'Save story'}
            onClick={toggle}
            {...stylex.props(styles.artAct, shared.press)}
          >
            <Sym name="bookmark" size={18} />
          </button>
          <button
            type="button"
            aria-label="Open in Safari"
            onClick={safari}
            {...stylex.props(styles.artAct, shared.press)}
          >
            <Sym name="share" size={18} />
          </button>
        </div>
      </div>
      <div {...stylex.props(styles.artWrap)}>
        <div {...stylex.props(styles.artHero, !wide && styles.artHeroSm, hero(s))}>
          {artUri && <span {...stylex.props(styles.artImg, styles.bgImg(`url("${artUri}")`))} />}
        </div>
        <div {...stylex.props(styles.artBody)}>
          <div {...stylex.props(styles.artKick)}>
            {s.tags?.length ? s.tags.map((t) => `#${t}`).join(' ') : host(s.url)}
          </div>
          <h1 {...stylex.props(styles.artTitle)}>{s.title}</h1>
          <div {...stylex.props(styles.artMeta)}>
            <span {...stylex.props(styles.artBy)}>{s.author}</span>
            <span>{ago(s.time)}</span>
            {s.points ? (
              <span>
                {s.points} {s.hn ? 'points' : 'reactions'}
              </span>
            ) : null}
            {s.comments ? <span>{s.comments} comments</span> : null}
          </div>
          <div {...stylex.props(styles.artActions)}>
            <button
              type="button"
              onClick={toggle}
              {...stylex.props(shared.press, styles.pill, on && styles.pillAccent)}
            >
              <Sym name="bookmark" size={14} />
              {on ? 'Saved' : 'Save'}
            </button>
            {s.url && (
              <button type="button" onClick={safari} {...stylex.props(shared.press, styles.pill)}>
                <Sym name="book" size={14} />
                Open in Safari
              </button>
            )}
          </div>
          {s.text &&
            paras(s.text)
              .slice(0, 1)
              .map((p) => (
                <p key={p} {...stylex.props(styles.artLede)}>
                  {p}
                </p>
              ))}
          {body.paras?.map((p) => (
            <p key={p} {...stylex.props(styles.artText)}>
              {p}
            </p>
          ))}
          {body.loading && (
            <div {...stylex.props(styles.sk)}>
              {[0, 1, 2].map((i) => (
                <div key={i} {...stylex.props(styles.skLine, i === 2 && styles.skLineS)} />
              ))}
            </div>
          )}
          {body.error && <div {...stylex.props(styles.artText)}>{body.error}</div>}
          <Discussion s={s} />
        </div>
      </div>
    </div>
  )
}
const hero = (s: Story) => styles.bgImg(art(s.url || s.title))

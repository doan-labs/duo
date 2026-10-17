import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Menu, Sym, TextField, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { light, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  type Filter,
  fitSize,
  parseFavs,
  parseLang,
  parseUi,
  phraseById,
  step,
  toggleFav,
  typeset,
  type Ui,
  visible
} from './phrasebook.ts'
import { CATS, LANGS, type LangId, type Phrase } from './phrases.ts'
import { styles } from './styles.ts'

const FILTERS: readonly { id: Filter; name: string }[] = [
  { id: 'all', name: 'All' },
  { id: 'saved', name: 'Saved' },
  ...CATS
]

// Registered before os.connect() so it runs ahead of the SDK's Escape-to-home forward: while a
// layer is open (the language menu, or a phrase on the narrow layout) Escape closes the top one,
// and at all other times the key passes through and still goes home.
const escapes: (() => void)[] = []
const pushEscape = (close: () => void) => {
  escapes.push(close)
  return () => {
    const at = escapes.indexOf(close)
    if (at >= 0) escapes.splice(at, 1)
  }
}
addEventListener(
  'keydown',
  (event) => {
    const top = escapes[escapes.length - 1]
    if (event.key !== 'Escape' || !top) return
    event.preventDefault()
    event.stopImmediatePropagation()
    top()
  },
  true
)

function Phrasebook() {
  const [root, wide] = useWide<HTMLElement>()
  const langKv = useKV(os.storage, 'lang')
  const favsKv = useKV(os.storage, 'favs')
  const uiKv = useKV(os.session, 'ui')

  const lang: LangId = parseLang(langKv.value)
  const favs = useMemo(() => parseFavs(favsKv.value), [favsKv.value])
  const ui = useMemo(() => parseUi(uiKv.value), [uiKv.value])
  const list = useMemo(() => visible(ui, favs, lang), [ui, favs, lang])
  const langName = LANGS.find((l) => l.id === lang)?.name ?? ''

  // The wide layout always shows a phrase beside the list; the narrow one shows it only once chosen.
  const shown: Phrase | undefined = phraseById(ui.sel) ?? (wide ? list[0] : undefined)
  const showing = shown !== undefined && (wide || ui.sel !== null)
  const hydrating = [langKv, favsKv, uiKv].some((kv) => kv.status === 'hydrating')

  const patch = (next: Partial<Ui>) => uiKv.set(JSON.stringify({ ...ui, ...next }))
  const open = (id: string) => patch({ sel: id })
  const back = () => patch({ sel: null })
  const go = (dir: 1 | -1) => {
    const next = shown && step(list, shown.id, dir)
    if (next) patch({ sel: next.id })
  }

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  // The handlers close over this render's list and ui; the listeners below read them through a ref
  // so they are attached once per layout rather than rebuilt on every keystroke or step.
  const latest = useRef({ back, go })
  latest.current = { back, go }
  const narrowShowing = !wide && showing

  const [menu, setMenu] = useState(false)
  useEffect(() => (menu ? pushEscape(() => setMenu(false)) : undefined), [menu])
  useEffect(() => (narrowShowing ? pushEscape(() => latest.current.back()) : undefined), [narrowShowing])

  useEffect(() => {
    if (!showing) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.matches('input, textarea, select')) return
      if (event.key === 'ArrowRight') latest.current.go(1)
      else if (event.key === 'ArrowLeft') latest.current.go(-1)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [showing])

  // Opening or leaving a phrase swaps the whole screen, so keyboard focus would be left on a node
  // that no longer exists: land it on the phrase card, and back on the row it came from.
  // Only the copy being looked at moves focus: the other display's copy draws but starts nothing.
  const live = useDisplay().active
  const lastOpen = useRef<string | null>(null)
  useEffect(() => {
    if (!narrowShowing) {
      if (lastOpen.current && live)
        document.querySelector<HTMLElement>(`[data-phrase="${lastOpen.current}"]`)?.focus({ preventScroll: true })
      lastOpen.current = null
      return
    }
    lastOpen.current = shown?.id ?? null
    // preventScroll: the root clips with overflow hidden, and focusing inside it would otherwise scroll it.
    if (live) document.querySelector<HTMLElement>('[data-card]')?.focus({ preventScroll: true })
  }, [narrowShowing, shown?.id, live])

  // A phrase picked on the other display can sit well down a long list.
  const shownId = shown?.id
  // `at` moves when a search or filter is cleared and the phrase takes its place in the longer list.
  const at = list.findIndex((phrase) => phrase.id === shownId)
  useEffect(() => {
    if (wide && at >= 0) document.querySelector(`[data-phrase="${shownId}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [wide, shownId, at])

  const empty =
    ui.filter === 'saved' && !ui.query ? 'Nothing saved yet. Open a phrase and tap the star.' : 'No phrases match.'

  const picker = (
    <>
      <header {...stylex.props(styles.header)}>
        <h1 {...stylex.props(styles.title)}>Phrasebook</h1>
        <div {...stylex.props(styles.langBox)}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label={`Language: ${langName}. Change`}
            onClick={() => setMenu(!menu)}
            {...stylex.props(shared.press, styles.langBtn)}
          >
            <span lang={lang}>{LANGS.find((l) => l.id === lang)?.native}</span>
            <Sym name="down" size={12} />
          </button>
          {menu && (
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => setMenu(false)}
              {...stylex.props(styles.catcher)}
            />
          )}
          <Menu
            open={menu}
            onClose={() => setMenu(false)}
            aria-label="Language"
            xstyle={styles.langMenu}
            items={LANGS.map((l) => ({
              label: l.native,
              name: `${l.name}, ${l.native}`,
              checked: l.id === lang,
              onSelect: () => langKv.set(l.id)
            }))}
          />
        </div>
      </header>
      <TextField
        type="search"
        aria-label="Search phrases"
        placeholder="Search"
        value={ui.query}
        onChange={(event) => patch({ query: event.target.value })}
        xstyle={styles.search}
      />
      <div role="toolbar" aria-label="Show" {...stylex.props(styles.pills)}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={f.id === ui.filter}
            onClick={() => patch({ filter: f.id })}
            {...stylex.props(shared.press, styles.pill, f.id === ui.filter && styles.pillOn)}
          >
            {f.name}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p role="status" {...stylex.props(styles.empty)}>
          {empty}
        </p>
      ) : (
        <ul aria-label="Phrases" {...stylex.props(styles.list)}>
          {list.map((phrase) => {
            const selected = wide && shown?.id === phrase.id
            return (
              <li key={phrase.id}>
                <button
                  type="button"
                  data-phrase={phrase.id}
                  aria-label={`${phrase.en}, ${phrase.to[lang].text}${favs.includes(phrase.id) ? ', saved' : ''}`}
                  aria-current={selected || undefined}
                  onClick={() => open(phrase.id)}
                  {...stylex.props(shared.press, styles.row, selected && styles.rowOn)}
                >
                  <span {...stylex.props(styles.rowText)}>
                    <span {...stylex.props(styles.rowEn)}>{phrase.en}</span>
                    <span lang={lang} {...stylex.props(styles.rowTo, selected && styles.rowToOn)}>
                      {typeset(lang, phrase.to[lang].text)}
                    </span>
                  </span>
                  {favs.includes(phrase.id) && (
                    <span aria-hidden="true" {...stylex.props(styles.rowStar)}>
                      <Sym name="starFill" size={14} />
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )

  const saved = shown ? favs.includes(shown.id) : false
  const card = shown ? (
    <>
      <div {...stylex.props(styles.bar)}>
        {!wide && (
          <button
            type="button"
            aria-label="Back to phrases"
            onClick={back}
            {...stylex.props(shared.press, styles.barBtn)}
          >
            <Sym name="back" size={18} />
          </button>
        )}
        <span {...stylex.props(styles.barTitle, wide && styles.barTitleWide)}>{langName}</span>
        <button
          type="button"
          aria-label={saved ? 'Remove from saved' : 'Save phrase'}
          aria-pressed={saved}
          onClick={() => favsKv.set(JSON.stringify(toggleFav(favs, shown.id)))}
          {...stylex.props(shared.press, styles.barBtn, saved && styles.starOn)}
        >
          <Sym name={saved ? 'starFill' : 'star'} size={18} />
        </button>
      </div>
      <section data-card tabIndex={-1} aria-label={`${shown.en} in ${langName}`} {...stylex.props(styles.card)}>
        <h2 lang={lang} {...stylex.props(styles.phrase, styles[fitSize(shown.to[lang].text)])}>
          {typeset(lang, shown.to[lang].text)}
        </h2>
        {shown.to[lang].say && <p {...stylex.props(styles.say)}>{shown.to[lang].say}</p>}
        <p {...stylex.props(styles.said)}>
          <span {...stylex.props(styles.saidLabel)}>You mean: </span>
          {shown.en}
        </p>
      </section>
      <div {...stylex.props(styles.steps)}>
        <button
          type="button"
          aria-label="Previous phrase"
          disabled={at <= 0}
          onClick={() => go(-1)}
          {...stylex.props(shared.press, styles.barBtn)}
        >
          <Sym name="back" size={18} />
        </button>
        <span {...stylex.props(styles.stepsText)}>{at >= 0 ? `${at + 1} of ${list.length}` : 'Not in this list'}</span>
        <button
          type="button"
          aria-label="Next phrase"
          disabled={at < 0 || at >= list.length - 1}
          onClick={() => go(1)}
          {...stylex.props(shared.press, styles.barBtn)}
        >
          <Sym name="forward" size={18} />
        </button>
      </div>
    </>
  ) : (
    <p {...stylex.props(styles.placeholder)}>Pick a phrase to show it here.</p>
  )

  return (
    <main
      ref={root}
      data-display={wide ? 'wide' : 'narrow'}
      {...stylex.props(light, styles.root, wide && styles.rootWide)}
    >
      {hydrating ? null : wide ? (
        <div {...stylex.props(styles.split)}>
          <div {...stylex.props(styles.pane)}>{picker}</div>
          <div {...stylex.props(styles.pane)}>{card}</div>
        </div>
      ) : showing ? (
        card
      ) : (
        picker
      )}
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Phrasebook />)

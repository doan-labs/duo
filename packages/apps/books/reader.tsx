// The reader: CSS columns paginate the whole book, one spread at a time, two
// pages wide on the open display. Tap zones, swipes and arrow keys turn, the
// chrome hides behind the page, and the aA card swaps Apple's six themes, the
// font menu, size steps and vertical scrolling.

import { Segmented } from '@doan-labs/duo-uikit/segmented.tsx'
import { Sheet } from '@doan-labs/duo-uikit/sheet.tsx'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { Toggle } from '@doan-labs/duo-uikit/toggle.tsx'
import { appAppearance, booksFonts, colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Cover } from './cover.tsx'
import { blocks, byId, chapterStarts } from './data.ts'
import { type FontId, setPrefs, setProgress, type ThemeId, toggleFinished, toggleMark, useLib } from './store.ts'
import { styles } from './styles.ts'
import { clearSeek, closeBook, closeReader, openCard, showChrome, useUi } from './ui.ts'

const GAP = 64

/** Apple's six themes, keyed to the palette rows in appAppearance. */
const THEMES: Record<ThemeId, { bg: string; ink: string; mute: string }> = {
  original: {
    bg: appAppearance.booksOriginalBg,
    ink: appAppearance.booksOriginalInk,
    mute: appAppearance.booksOriginalMute
  },
  quiet: { bg: appAppearance.booksQuietBg, ink: appAppearance.booksQuietInk, mute: appAppearance.booksQuietMute },
  paper: { bg: appAppearance.booksPaper, ink: appAppearance.booksInk, mute: appAppearance.booksInkMuted },
  bold: { bg: appAppearance.booksOriginalBg, ink: colors.black, mute: appAppearance.booksBoldMute },
  calm: { bg: appAppearance.booksCalmBg, ink: appAppearance.booksCalmInk, mute: appAppearance.booksCalmMute },
  focus: { bg: appAppearance.booksFocusBg, ink: appAppearance.booksFocusInk, mute: appAppearance.booksFocusMute }
}
const THEME_LIST = Object.keys(THEMES) as ThemeId[]
const THEME_NAME: Record<ThemeId, string> = {
  original: 'Original',
  quiet: 'Quiet',
  paper: 'Paper',
  bold: 'Bold',
  calm: 'Calm',
  focus: 'Focus'
}

const FONT_LIST: { id: FontId; name: string; family: string }[] = [
  { id: 'original', name: 'Original', family: fonts.serif },
  { id: 'athelas', name: 'Athelas', family: booksFonts.athelas },
  { id: 'charter', name: 'Charter', family: booksFonts.charter },
  { id: 'georgia', name: 'Georgia', family: booksFonts.georgia },
  { id: 'iowan', name: 'Iowan', family: booksFonts.iowan },
  { id: 'palatino', name: 'Palatino', family: booksFonts.palatino },
  { id: 'seravek', name: 'Seravek', family: booksFonts.seravek },
  { id: 'times', name: 'Times New Roman', family: booksFonts.times }
]

/** The seven stops on Apple's size slider, mapped onto the type ramp. */
const SIZES = ['caption2', 'footnote', 'subheadline', 'callout', 'body', 'title3', 'title2'] as const
type SizeKey = (typeof SIZES)[number]
const sizeKey = (i: number): SizeKey => SIZES[Math.max(0, Math.min(SIZES.length - 1, i))]!

export function Reader({ id }: { id: string }) {
  const b = byId(id)
  const lib = useLib()
  const ui = useUi()
  const prefs = lib.prefs
  const theme = THEMES[prefs.theme]
  const blks = useMemo(() => blocks(b), [b])
  const starts = useMemo(() => chapterStarts(b), [b])
  const marks = lib.marks[id] ?? []

  const wrap = useRef<HTMLDivElement>(null)
  const flow = useRef<HTMLDivElement>(null)
  const vert = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const scrollT = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollFrac = useRef<number | null>(null)
  const sought = useRef(false)
  // Which layout mode the saved position was last restored into; switching
  // modes re-restores instead of landing on a stale spread/scroll.
  const restored = useRef<'paged' | 'vert' | null>(null)
  const [w, setW] = useState(0)
  const [tick, setTick] = useState(0)
  const [map, setMap] = useState<{ spreads: number; block: number[]; bad?: boolean }>({ spreads: 1, block: [] })
  const [at, setAt] = useState(0)
  const [tocSeg, setTocSeg] = useState<'Contents' | 'Bookmarks'>('Contents')
  const [find, setFind] = useState('')

  const vertical = prefs.vertical
  const cols = w >= 640 ? 2 : 1
  const pw = (w - GAP * (cols - 1)) / cols
  const step = pw + GAP
  const spreads = map.spreads

  // Measure the page box as it resizes (fold/unfold changes the spread count).
  useEffect(() => {
    const el = wrap.current!
    const ro = new ResizeObserver(([e]) => setW(e!.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Count spreads and map every block to its spread once layout settles.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the prefs entries re-run it after the text reflows
  useLayoutEffect(() => {
    const f = flow.current
    if (vertical || !f || !w || !pw) return
    const totalCols = Math.max(1, Math.round((f.scrollWidth + GAP) / step))
    const count = Math.max(1, Math.ceil(totalCols / cols))
    const fr = f.getBoundingClientRect()
    // Rects come back projected (the panel is CSS3D-scaled); bring them back to
    // layout px so they divide evenly into the column step.
    const k = fr.width ? f.offsetWidth / fr.width : 1
    const block = blks.map((_, i) => {
      const el = f.querySelector(`[data-b="${i}"]`)
      if (!el) return 0
      const col = Math.round(((el.getBoundingClientRect().left - fr.left) * k) / step)
      return Math.max(0, Math.min(count - 1, Math.floor(col / cols)))
    })
    // Mid-fold the panel is edge-on and projected rects collapse: hinge-side
    // blocks can keep real columns while far-side blocks compress to 0, so a
    // healthy map is monotonic and its last block reaches the final spreads.
    // Don't trust anything else - re-measure once the transition settles.
    const mono = block.every((v, i) => i === 0 || v >= block[i - 1]!)
    const last = block[block.length - 1] ?? 0
    const bad = count > 1 && (!mono || last < count - 2)
    if (bad && tick < 8) {
      const t = setTimeout(() => setTick((x) => x + 1), 250)
      return () => clearTimeout(t)
    }
    setMap({ spreads: count, block, bad })
    if (ui.seek != null) {
      sought.current = true
      restored.current = 'paged'
      setAt(bad ? Math.min(count - 1, Math.round((ui.seek / (blks.length - 1)) * (count - 1))) : (block[ui.seek] ?? 0))
      clearSeek()
    } else if (!sought.current || restored.current !== 'paged') {
      sought.current = true
      const h = Math.round((lib.progress[id]?.frac ?? 0) * (blks.length - 1))
      setAt(bad ? Math.round((lib.progress[id]?.frac ?? 0) * (count - 1)) : (block[h] ?? 0))
      // A healed re-measure should re-restore to block precision.
      if (!bad) restored.current = 'paged'
    } else {
      // Follow the shared position when it moved on the other display; the
      // saved fraction round-trips to this spread, so a no-change comparison
      // keeps normal measures stable while an external advance re-syncs.
      const h = Math.round((lib.progress[id]?.frac ?? 0) * (blks.length - 1))
      const want = bad ? null : (block[h] ?? 0)
      setAt((a) => (want != null && want !== a ? want : Math.min(count - 1, a)))
    }
  }, [w, pw, cols, prefs.size, prefs.font, prefs.theme, vertical, blks, id, step, lib.progress, ui.seek, tick])

  // Vertical mode: restore the saved position once per entry into the mode.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the prefs entries re-run it after the text reflows
  useEffect(() => {
    const el = vert.current
    if (!vertical || !el) return
    const fracTo = Math.round((lib.progress[id]?.frac ?? 0) * (blks.length - 1))
    if (restored.current === 'vert' && ui.seek == null) {
      // Already restored: only follow an external move (other display) that
      // lands more than a viewport away, so local scrolling isn't fought.
      const t = el.querySelector(`[data-b="${fracTo}"]`) as HTMLElement | null
      if (t && Math.abs(el.scrollTop - (t.offsetTop - 20)) > el.clientHeight) el.scrollTop = t.offsetTop - 20
      return
    }
    sought.current = true
    restored.current = 'vert'
    const to = ui.seek ?? fracTo
    const t = el.querySelector(`[data-b="${to}"]`) as HTMLElement | null
    if (t) el.scrollTop = t.offsetTop - 20
    clearSeek()
  }, [vertical, id, prefs.size, prefs.font, lib.progress, ui.seek, blks])

  const turn = (d: number) => {
    if (vertical) {
      vert.current?.scrollBy({ top: d * (vert.current.clientHeight - 40), behavior: 'smooth' })
      return
    }
    showChrome(false)
    setAt((a) => Math.max(0, Math.min(spreads - 1, a + d)))
  }

  const jumpTo = (block: number) => {
    if (vertical) {
      const el = vert.current?.querySelector(`[data-b="${block}"]`) as HTMLElement | null
      if (el && vert.current) vert.current.scrollTop = el.offsetTop - 20
    } else {
      setAt(map.block[block] ?? 0)
    }
    openCard(undefined)
    showChrome(false)
  }

  // The block at the top of the visible spread is what the bookmark pins.
  const head = useMemo(() => {
    if (vertical) {
      let c = 0
      for (let i = 0; i < starts.length; i++) {
        const frac = lib.progress[id]?.frac ?? 0
        if (frac * blks.length >= starts[i]!) c = i
      }
      return starts[c] ?? 0
    }
    let i = 0
    while (i + 1 < blks.length && (map.block[i + 1] ?? Number.POSITIVE_INFINITY) <= at) i++
    // Pin the spread's first block when one starts there: a saved position or
    // bookmark should land on the top of the spread, not its end. Spreads with
    // no block start fall back to the closest preceding block.
    const first = map.block.indexOf(at)
    return first === -1 ? i : first
  }, [at, map, blks.length, vertical, starts, lib.progress, id])

  // Persist position (throttled): the topmost block as a book fraction, so both
  // displays agree and no precision is lost in spread rounding.
  useEffect(() => {
    if (!sought.current || spreads <= 1 || map.bad) return
    const t = setTimeout(() => setProgress(id, head / Math.max(1, blks.length - 1)), 120)
    return () => clearTimeout(t)
  }, [head, spreads, map.bad, id, blks.length])

  // A pending vertical-scroll write must not fire after the reader closes -
  // flush it on unmount instead so the final position still lands.
  useEffect(
    () => () => {
      if (scrollT.current) clearTimeout(scrollT.current)
      if (scrollFrac.current != null) setProgress(id, scrollFrac.current)
    },
    [id]
  )
  const marked = marks.some((m) => (vertical ? m.b === head : (map.block[m.b] ?? -1) === at))

  // Keyboard turns.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui.card) return
      const t = e.target as HTMLElement | null
      // Typing in a field (any app's) is never a page turn; keys aimed at
      // another mounted app aren't ours either. Unfocused keys land on body.
      if (!t || t.closest('input, textarea, select, [contenteditable="true"]')) return
      const app = t.closest('[data-app]')
      if (app && app.getAttribute('data-app') !== 'Books') return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') turn(1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') turn(-1)
      else if (e.key === 'Escape') closeReader()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const tap = (e: React.PointerEvent) => {
    if (e.type === 'pointerdown') {
      drag.current = { x: e.clientX, y: e.clientY }
      return
    }
    const d = drag.current
    drag.current = null
    if (!d) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 48) {
      turn(dx < 0 ? 1 : -1)
      return
    }
    if (Math.abs(e.clientY - d.y) > 24) return
    const box = wrap.current!.getBoundingClientRect()
    const x = (e.clientX - box.left) / box.width
    if (x < 0.24) turn(-1)
    else if (x > 0.76) turn(1)
    else showChrome(!ui.chrome)
  }

  const curChapter = useMemo(() => {
    let c = 0
    for (let i = 0; i < starts.length; i++) if (head >= starts[i]!) c = i
    return c
  }, [head, starts])

  // Pages left in the chapter, in display pages (spreads times columns).
  const pagesLeft = useMemo(() => {
    const next = starts[Math.min(curChapter + 1, starts.length - 1)]
    const end = curChapter + 1 >= starts.length ? spreads : (map.block[next!] ?? spreads)
    return Math.max(0, (end - at) * cols)
  }, [at, curChapter, map, spreads, cols, starts])

  const sizeIdx = prefs.size
  const setSize = (d: number) => setPrefs({ size: Math.max(0, Math.min(SIZES.length - 1, sizeIdx + d)) })
  const font = FONT_LIST.find((f) => f.id === prefs.font) ?? FONT_LIST[0]!
  const progFrac = lib.progress[id]?.frac ?? 0

  const hits = useMemo(() => {
    const q = find.trim().toLowerCase()
    if (!q) return []
    return blks
      .map((bl, i) => ({ i, at: bl.text.toLowerCase().indexOf(q) }))
      .filter((h) => h.at >= 0)
      .slice(0, 40)
  }, [find, blks])

  const prose = (
    <>
      {blks.map((bl, i) =>
        bl.kind === 'h' ? (
          // Positional: a book's blocks are written out once and never reorder.
          <h2
            // biome-ignore lint/suspicious/noArrayIndexKey: the blocks are the book
            key={i}
            data-b={i}
            {...stylex.props(styles.chapHead, styles.headType(sizeKey(sizeIdx + 2)), i === 0 && styles.chapHeadFirst)}
          >
            {bl.text}
          </h2>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: the blocks are the book
          <p key={i} data-b={i} {...stylex.props(styles.para, prefs.theme === 'bold' && styles.paraBold)}>
            {bl.text}
          </p>
        )
      )}
      <EndCard b={b} id={id} />
    </>
  )

  return (
    <div {...stylex.props(styles.read, styles.theme(theme))}>
      <div {...stylex.props(styles.readTop, styles.mute(theme), !ui.chrome && styles.chromeOffTop)}>
        <button
          type="button"
          aria-label={ui.detail ? 'Back to book' : 'Back to library'}
          {...stylex.props(styles.readBtn, shared.press)}
          onClick={closeReader}
        >
          <Sym name="back" size={18} />
        </button>
        <span {...stylex.props(styles.readTitle)}>{b.title}</span>
        <button
          type="button"
          aria-label="Contents"
          {...stylex.props(styles.readBtn, ui.card === 'toc' && styles.readBtnOn, shared.press)}
          onClick={() => openCard(ui.card === 'toc' ? undefined : 'toc')}
        >
          <Sym name="list" size={17} />
        </button>
        <button
          type="button"
          aria-label="Bookmark this page"
          aria-pressed={marked}
          {...stylex.props(styles.readBtn, marked && styles.readBtnOn, shared.press)}
          onClick={() => toggleMark(id, head)}
        >
          <Sym name="bookmark" size={17} />
        </button>
        <button
          type="button"
          aria-label="Appearance"
          {...stylex.props(styles.readBtn, ui.card === 'style' && styles.readBtnOn, shared.press)}
          onClick={() => openCard(ui.card === 'style' ? undefined : 'style')}
        >
          <Sym name="textLarger" size={17} />
        </button>
        <button
          type="button"
          aria-label="Find in book"
          {...stylex.props(styles.readBtn, ui.card === 'find' && styles.readBtnOn, shared.press)}
          onClick={() => openCard(ui.card === 'find' ? undefined : 'find')}
        >
          <Sym name="search" size={16} />
        </button>
      </div>

      {/* The page box owns taps and swipes, so chrome buttons can't turn pages. */}
      <div ref={wrap} {...stylex.props(styles.readBox)} onPointerDown={tap} onPointerUp={tap}>
        {vertical ? (
          <div
            ref={vert}
            {...stylex.props(styles.readVert)}
            onScroll={(e) => {
              const el = e.currentTarget
              const top = el.scrollTop + 24
              const kids = el.querySelectorAll('[data-b]')
              let h = 0
              for (let i = 0; i < kids.length; i++) {
                if ((kids[i] as HTMLElement).offsetTop <= top) h = i
                else break
              }
              const frac = h / Math.max(1, blks.length - 1)
              scrollFrac.current = frac
              if (scrollT.current) clearTimeout(scrollT.current)
              scrollT.current = setTimeout(() => {
                scrollFrac.current = null
                setProgress(id, frac)
              }, 200)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <div {...stylex.props(styles.readVertIn, styles.type(sizeKey(sizeIdx), font.family))}>{prose}</div>
          </div>
        ) : (
          pw > 0 && (
            <div
              ref={flow}
              {...stylex.props(
                styles.readFlow,
                styles.type(sizeKey(sizeIdx), font.family),
                styles.flow(pw, GAP, cols),
                styles.shift(-at * cols * step)
              )}
            >
              {prose}
            </div>
          )
        )}
      </div>

      <div {...stylex.props(styles.readBot, styles.mute(theme), !ui.chrome && styles.chromeOffBot)}>
        <span {...stylex.props(styles.readPage)}>
          {vertical ? `${Math.round(progFrac * 100)}%` : `Page ${at * cols + 1} of ${spreads * cols}`}
        </span>
        {!vertical && spreads > 1 && (
          <input
            type="range"
            aria-label="Book position"
            min={0}
            max={spreads - 1}
            value={at}
            onChange={(e) => {
              setAt(Number(e.target.value))
              showChrome(true)
            }}
            {...stylex.props(styles.scrub)}
          />
        )}
        <span {...stylex.props(styles.readPage)}>
          {vertical ? b.chapters[curChapter]?.title : `${pagesLeft} page${pagesLeft === 1 ? '' : 's'} left in chapter`}
        </span>
      </div>

      <Sheet open={ui.card === 'toc'} onClose={() => openCard(undefined)} xstyle={[styles.sheet]}>
        <div {...stylex.props(styles.sheetTop)}>
          <Segmented options={['Contents', 'Bookmarks'] as const} value={tocSeg} onChange={(v) => setTocSeg(v)} />
        </div>
        <div {...stylex.props(styles.sheetList)}>
          {tocSeg === 'Contents' ? (
            b.chapters.map((c, i) => (
              <button
                key={c.title}
                type="button"
                {...stylex.props(styles.sheetRow, shared.press)}
                onClick={() => jumpTo(starts[i]!)}
              >
                <span {...stylex.props(styles.sheetT)}>{c.title}</span>
                <span {...stylex.props(styles.sheetN)}>
                  {vertical ? '' : `Page ${(map.block[starts[i]!] ?? 0) * cols + 1}`}
                </span>
              </button>
            ))
          ) : marks.length ? (
            marks.map((m) => (
              <button
                key={m.b}
                type="button"
                {...stylex.props(styles.sheetRow, shared.press)}
                onClick={() => jumpTo(m.b)}
              >
                <span {...stylex.props(styles.sheetT)}>{blks[m.b]?.text.slice(0, 64) ?? 'Page'}...</span>
                <span {...stylex.props(styles.sheetN)}>
                  {vertical ? '' : `Page ${(map.block[m.b] ?? 0) * cols + 1}`}
                </span>
              </button>
            ))
          ) : (
            <p {...stylex.props(styles.sheetEmpty)}>No bookmarks yet. Tap the bookmark glyph while reading.</p>
          )}
        </div>
      </Sheet>

      <Sheet open={ui.card === 'find'} onClose={() => openCard(undefined)} xstyle={[styles.sheet]}>
        <div {...stylex.props(styles.sheetTop)}>
          <input
            aria-label="Find in book"
            placeholder="Find in book"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            {...stylex.props(styles.findIn)}
          />
        </div>
        <div {...stylex.props(styles.sheetList)}>
          {find.trim() ? (
            hits.length ? (
              hits.map((h) => (
                <button
                  key={h.i}
                  type="button"
                  {...stylex.props(styles.sheetRow, shared.press)}
                  onClick={() => jumpTo(h.i)}
                >
                  <span {...stylex.props(styles.sheetT)}>
                    {blks[h.i]!.text.slice(Math.max(0, h.at - 24), h.at + 48)}...
                  </span>
                  <span {...stylex.props(styles.sheetN)}>
                    {vertical ? '' : `Page ${(map.block[h.i] ?? 0) * cols + 1}`}
                  </span>
                </button>
              ))
            ) : (
              <p {...stylex.props(styles.sheetEmpty)}>No matches.</p>
            )
          ) : (
            <p {...stylex.props(styles.sheetEmpty)}>Type to search the whole book.</p>
          )}
        </div>
      </Sheet>

      {ui.card === 'style' && (
        <div {...stylex.props(styles.styleCard, styles.theme(theme))}>
          <div {...stylex.props(styles.styleCap)}>Themes</div>
          <div {...stylex.props(styles.styleRow)}>
            {THEME_LIST.map((t) => (
              <button
                key={t}
                type="button"
                aria-label={THEME_NAME[t]}
                {...stylex.props(
                  styles.dot,
                  styles.dotBg(THEMES[t].bg, THEMES[t].ink),
                  prefs.theme === t && styles.dotOn
                )}
                onClick={() => setPrefs({ theme: t })}
              >
                {prefs.theme === t && <Sym name="tick" size={10} />}
              </button>
            ))}
          </div>
          <div {...stylex.props(styles.styleRow, styles.styleRowPad)}>
            <button
              type="button"
              aria-label="Smaller text"
              disabled={sizeIdx <= 0}
              {...stylex.props(styles.sizeBtn, shared.press)}
              onClick={() => setSize(-1)}
            >
              A-
            </button>
            <span {...stylex.props(styles.sizeTrack)}>
              {SIZES.map((k, i) => (
                <span key={k} {...stylex.props(styles.sizeTick, i === sizeIdx && styles.sizeTickOn)} />
              ))}
            </span>
            <button
              type="button"
              aria-label="Larger text"
              disabled={sizeIdx >= SIZES.length - 1}
              {...stylex.props(styles.sizeBtn, shared.press)}
              onClick={() => setSize(1)}
            >
              A+
            </button>
          </div>
          <div {...stylex.props(styles.styleCap)}>Font</div>
          <div {...stylex.props(styles.fontList)}>
            {FONT_LIST.map((f) => (
              <button
                key={f.id}
                type="button"
                {...stylex.props(styles.fontRow, prefs.font === f.id && styles.fontOn, shared.select)}
                onClick={() => setPrefs({ font: f.id })}
              >
                <span {...stylex.props(styles.fontName, styles.fontFam(f.family))}>{f.name}</span>
                {prefs.font === f.id && <Sym name="tick" size={13} />}
              </button>
            ))}
          </div>
          <label htmlFor="books-vert" {...stylex.props(styles.styleToggle)}>
            Vertical scrolling
            <Toggle
              id="books-vert"
              checked={prefs.vertical}
              onChange={(e) => setPrefs({ vertical: (e.target as HTMLInputElement).checked })}
            />
          </label>
        </div>
      )}
    </div>
  )
}

/** The card after the last paragraph: close the book out like the app does. */
const EndCard = ({ b, id }: { b: ReturnType<typeof byId>; id: string }) => {
  const lib = useLib()
  const finished = lib.finished.includes(id)
  return (
    <div {...stylex.props(styles.end)}>
      <Cover b={b} size="m" />
      <div {...stylex.props(styles.endTitle)}>{b.title}</div>
      <div {...stylex.props(styles.endSub)}>The End</div>
      <button type="button" {...stylex.props(styles.btn, shared.press)} onClick={() => toggleFinished(id)}>
        {finished ? 'Finished' : 'Mark as Finished'}
      </button>
      <button
        type="button"
        {...stylex.props(styles.endLink, shared.press)}
        onClick={() => {
          closeReader()
          closeBook()
        }}
      >
        Back to {lib.owned.includes(id) ? 'Library' : 'Book Store'}
      </button>
    </div>
  )
}

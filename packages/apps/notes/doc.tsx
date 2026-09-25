// The note body editor: one contenteditable over a serialized block document.
// The DOM is the source while it has focus - keystrokes, pastes and IME land
// there - and a commit walks it back into blocks on every change. Storage is
// the source the rest of the time: an external write rebuilds the DOM and puts
// the caret back where it was. Block markers are pseudo-elements or a
// contenteditable:false circle, so they never reach the text.

import { os } from '@doan-labs/duo-sdk'
import {
  app,
  appAppearance,
  colors,
  easing,
  fonts,
  leading,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type Ref, useEffect, useImperativeHandle, useRef } from 'react'
import { type Block, type Doc, parse, serialize, type TextStyle, uid } from './data.ts'

export type EditState = {
  /** Style of the block under the caret; '' when the caret is outside text. */
  s: string
  ind: number
  b: boolean
  i: boolean
  u: boolean
  strike: boolean
  /** The caret sits in a table cell. */
  table: boolean
  undo: boolean
  redo: boolean
}

/** The toolbar's handle on the editor. */
export type EditorApi = {
  style: (s: TextStyle) => void
  inline: (cmd: 'bold' | 'italic' | 'underline' | 'strikeThrough') => void
  checklist: () => void
  indent: (d: 1 | -1) => void
  table: () => void
  image: (key: string) => void
  undo: () => void
  redo: () => void
  /** Match count after painting the marks; 0 clears them. */
  find: (q: string) => number
  /** Select match i and scroll it into view. */
  jump: (i: number) => void
  clearFind: () => void
  blur: () => void
}

const TEXT_STYLES = new Set([
  'title',
  'heading',
  'subheading',
  'body',
  'mono',
  'quote',
  'bullet',
  'dash',
  'number',
  'check'
])
const LISTY = new Set(['bullet', 'dash', 'number', 'check'])
const INDENTABLE = new Set(['bullet', 'dash', 'number', 'check', 'quote'])
const INLINE_TAGS = new Set(['B', 'I', 'U', 'S', 'A', 'BR'])
const RENAME: Record<string, string> = { STRONG: 'b', EM: 'i', DEL: 's', STRIKE: 's' }
const SAFE_HREF = /^(https?:|mailto:)/i

/**
 * Sanitize inline markup in place: spans restyle onto the four inline tags,
 * anything else unwraps back to text, and every attribute goes except a safe
 * href on a link - stored HTML can come from a paste or an older writer, so
 * event handlers and javascript: URLs never reach innerHTML again.
 */
const clean = (root: HTMLElement) => {
  for (const n of [...root.childNodes]) {
    if (n.nodeType !== 1) continue
    let el = n as HTMLElement
    if (el.dataset.mk) continue
    const rename =
      RENAME[el.tagName] ??
      (el.tagName === 'SPAN'
        ? el.style.fontWeight === 'bold' || Number(el.style.fontWeight) >= 600
          ? 'b'
          : el.style.fontStyle === 'italic'
            ? 'i'
            : /underline/.test(el.style.textDecorationLine)
              ? 'u'
              : /line-through/.test(el.style.textDecorationLine)
                ? 's'
                : undefined
        : undefined)
    if (rename) {
      const to = document.createElement(rename)
      while (el.firstChild) to.append(el.firstChild)
      el.replaceWith(to)
      el = to
    }
    if (!INLINE_TAGS.has(el.tagName)) {
      while (el.firstChild) el.before(el.firstChild)
      el.remove()
    } else {
      for (const a of [...el.attributes]) {
        if (el.tagName === 'A' && a.name === 'href' && SAFE_HREF.test(a.value)) continue
        el.removeAttribute(a.name)
      }
      el.className = TAG_CLS[el.tagName] ?? ''
      clean(el)
    }
  }
}

/** Paint a block element for its data-s/data-ind state. */
const restyle = (el: HTMLElement) => {
  const s = (el.dataset.s ?? 'body') as TextStyle
  el.className = [CLS.block, CLS.s[s] ?? '', IND[el.dataset.ind ?? ''] ?? ''].filter(Boolean).join(' ')
}
const TICK =
  '<svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.6 5.4l2.3 2.3 4.5-5.2"/></svg>'

/** The checklist circle: the one marker that is a real element, so it takes taps. */
const boxMarker = (done = false) => {
  const mk = document.createElement('span')
  mk.dataset.mk = '1'
  mk.contentEditable = 'false'
  mk.className = done ? CLS.mkDone : CLS.mk
  mk.innerHTML = TICK
  return mk
}

/** Builds the DOM child a block renders as. */
const render = (b: Block): HTMLElement => {
  if (b.s === 'table') {
    const table = document.createElement('table')
    table.dataset.b = b.id
    table.className = CLS.table
    const tbody = document.createElement('tbody')
    for (const row of b.rows) {
      const tr = document.createElement('tr')
      for (const cell of row) {
        const td = document.createElement('td')
        td.className = CLS.td
        td.innerHTML = cell || '<br>'
        clean(td)
        tr.append(td)
      }
      tbody.append(tr)
    }
    table.append(tbody)
    return table
  }
  if (b.s === 'image') {
    const figure = document.createElement('figure')
    figure.dataset.b = b.id
    figure.className = CLS.figure
    figure.contentEditable = 'false'
    const img = document.createElement('img')
    img.dataset.key = b.img
    img.className = CLS.img
    img.draggable = false
    figure.append(img)
    return figure
  }
  const div = document.createElement('div')
  div.dataset.b = b.id
  div.dataset.s = b.s
  if (b.ind) div.dataset.ind = String(b.ind)
  if (b.s === 'check') {
    div.append(boxMarker(!!b.done))
    if (b.done) div.dataset.done = '1'
  }
  const wrap = document.createElement('div')
  wrap.innerHTML = b.t
  clean(wrap)
  for (const n of [...wrap.childNodes]) div.append(n)
  if (!div.textContent) div.append(document.createElement('br'))
  restyle(div)
  return div
}

/** Trailing caret-bridging <br>s are chrome, not content. */
const strip = (html: string) => html.replace(/(\s|<br\s*\/?>)*$/s, '').trim()

/** Checklist markers drop out of serialized content; find-marks unwrap back to text. */
const unmark = (root: HTMLElement) => {
  for (const junk of [...root.querySelectorAll('[data-mk],mark')]) {
    if (junk.tagName === 'MARK') while (junk.firstChild) junk.before(junk.firstChild)
    junk.remove()
  }
}

/** The block shapes DOM children read back as; returns the doc the DOM holds. */
const readDom = (ce: HTMLElement): Doc => {
  const blocks: Block[] = []
  for (const el of [...ce.children] as HTMLElement[]) {
    if (el.tagName === 'TABLE') {
      const rows = [...el.querySelectorAll('tr')].map((tr) =>
        [...tr.children].map((td) => {
          const cell = td.cloneNode(true) as HTMLElement
          unmark(cell)
          return strip(cell.innerHTML)
        })
      )
      blocks.push({ id: el.dataset.b ?? uid(), s: 'table', rows })
      continue
    }
    if (el.tagName === 'FIGURE') {
      const img = el.querySelector('img')
      if (img?.dataset.key) blocks.push({ id: el.dataset.b ?? uid(), s: 'image', img: img.dataset.key })
      continue
    }
    const s = (TEXT_STYLES.has(el.dataset.s as TextStyle) ? el.dataset.s : 'body') as TextStyle
    const body = el.cloneNode(true) as HTMLElement
    unmark(body)
    blocks.push({
      id: el.dataset.b ?? uid(),
      s,
      t: strip(body.innerHTML),
      ...(el.dataset.ind ? { ind: Number(el.dataset.ind) } : {}),
      ...(el.dataset.done ? { done: true } : {})
    })
  }
  return { v: 2, blocks }
}

/** The top-level block element a node lives in; undefined for the root itself. */
const blockOf = (ce: HTMLElement, node: Node | null): HTMLElement | undefined => {
  if (!node || node === ce || !ce.contains(node)) return undefined
  let el: Node | null = node
  while (el && el.parentNode !== ce) el = el.parentNode
  return (el as HTMLElement) ?? undefined
}

/** A node's td ancestor when inside a table cell. */
const cellOf = (node: Node | null): HTMLElement | undefined =>
  (node as HTMLElement)?.nodeType === 1
    ? (((node as HTMLElement).closest('td') as HTMLElement) ?? undefined)
    : (((node as HTMLElement).parentElement?.closest('td') as HTMLElement) ?? undefined)

/** Character offset of the caret inside a block's editable text (markers skipped). */
const caretOffset = (block: HTMLElement, node: Node, off: number) => {
  const range = document.createRange()
  range.selectNodeContents(block)
  range.setEnd(node, off)
  const frag = range.cloneContents()
  for (const junk of [...frag.querySelectorAll('[data-mk],mark')]) {
    if (junk.tagName === 'MARK') while (junk.firstChild) junk.before(junk.firstChild)
    junk.remove()
  }
  return frag.textContent?.length ?? 0
}

const textLength = (el: HTMLElement) => {
  const clone = el.cloneNode(true) as HTMLElement
  unmark(clone)
  return clone.textContent?.length ?? 0
}

/** Caret position as (block index, char offset) - enough to restore after a rebuild. */
type Spot = { b: number; at: number }

const LINK_TEST = /^(https?:\/\/[^\s<]+|www\.[^\s<]+)$/
const LINK_ANY = /https?:\/\/[^\s<]+|www\.[^\s<]+/
const LINK_SPLIT = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/

export function Editor({
  doc,
  onDoc,
  api,
  readOnly,
  images,
  onCaret
}: {
  doc: Doc
  onDoc: (doc: Doc) => void
  api: Ref<EditorApi | null>
  readOnly?: boolean
  /** image key -> resolved data URL, from the media cache */
  images: (key: string) => string | undefined
  onCaret?: (state: EditState) => void
}) {
  const ce = useRef<HTMLDivElement>(null)
  const writing = useRef('')
  const composing = useRef(false)
  const lastBlock = useRef<HTMLElement | undefined>(undefined)
  const lastSpot = useRef<Spot | undefined>(undefined)
  const past = useRef<{ s: string; spot?: Spot }[]>([])
  const future = useRef<{ s: string; spot?: Spot }[]>([])
  const lastChange = useRef(0)
  const matches = useRef<HTMLElement[]>([])

  const blocks = () => ([...ce.current!.children] as HTMLElement[]).filter((c) => c.dataset.b !== undefined)

  const spot = (): Spot | undefined => {
    const sel = getSelection()
    if (!sel?.anchorNode || !ce.current) return undefined
    const block = blockOf(ce.current, sel.anchorNode)
    if (!block) return undefined
    return { b: blocks().indexOf(block), at: caretOffset(block, sel.anchorNode, sel.anchorOffset) }
  }

  const place = (sp?: Spot) => {
    if (!sp || !ce.current) return
    const block = blocks()[Math.min(sp.b, blocks().length - 1)]
    if (block?.tagName !== 'DIV') return
    let rest = Math.min(sp.at, textLength(block))
    const walk = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement?.closest('[data-mk]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    })
    let n = walk.nextNode()
    while (n) {
      const len = n.textContent?.length ?? 0
      if (rest <= len) {
        getSelection()?.setBaseAndExtent(n, rest, n, rest)
        return
      }
      rest -= len
      n = walk.nextNode()
    }
    getSelection()?.setBaseAndExtent(block, block.childNodes.length, block, block.childNodes.length)
  }

  const reportCaret = () => {
    if (!onCaret || !ce.current) return
    const sel = getSelection()
    const block = sel?.anchorNode ? blockOf(ce.current, sel.anchorNode) : undefined
    const td = sel?.anchorNode ? cellOf(sel.anchorNode) : undefined
    onCaret({
      s: (block?.dataset.s ?? '') as EditState['s'],
      ind: Number(block?.dataset.ind ?? 0),
      b: document.queryCommandState?.('bold') ?? false,
      i: document.queryCommandState?.('italic') ?? false,
      u: document.queryCommandState?.('underline') ?? false,
      strike: document.queryCommandState?.('strikeThrough') ?? false,
      table: !!td,
      undo: past.current.length > 0,
      redo: future.current.length > 0
    })
  }

  /** Serialize the DOM and write it back. `force` breaks typing-burst grouping in history. */
  const commit = (force: boolean) => {
    if (!ce.current) return
    const next = serialize(readDom(ce.current))
    if (next === writing.current) {
      reportCaret()
      return
    }
    const burst = !force && performance.now() - lastChange.current < 500
    if (!burst) past.current.push({ s: writing.current, spot: lastSpot.current })
    if (past.current.length > 100) past.current.shift()
    future.current = []
    lastChange.current = performance.now()
    writing.current = next
    onDoc(JSON.parse(next) as Doc)
    reportCaret()
  }

  const renumber = () => {
    if (!ce.current) return
    let run: Record<number, number> = {}
    for (const el of [...ce.current.children] as HTMLElement[]) {
      if (el.dataset.s !== 'number') {
        run = {}
        delete el.dataset.num
        continue
      }
      const ind = Number(el.dataset.ind ?? 0)
      // Outdenting continues the outer count; only deeper levels reset.
      for (const level of Object.keys(run)) if (Number(level) > ind) delete run[Number(level)]
      run[ind] = (run[ind] ?? 0) + 1
      const want = `${run[ind]}.`
      if (el.dataset.num !== want) el.dataset.num = want
    }
  }

  const fillImages = () => {
    if (!ce.current) return
    for (const img of [...ce.current.querySelectorAll('img[data-key]')] as HTMLImageElement[]) {
      if (!img.src) {
        const src = images(img.dataset.key!)
        if (src) img.src = src
      }
    }
  }

  const rebuild = (d: Doc, keep?: Spot) => {
    if (!ce.current) return
    ce.current.replaceChildren(...d.blocks.map(render))
    fillImages()
    renumber()
    writing.current = serialize(d)
    if (keep) place(keep)
  }

  // External doc writes (the other display, an undo) rebuild the DOM; our own
  // typing is already there, so a same-serialized doc is ignored.
  // biome-ignore lint/correctness/useExhaustiveDependencies: [doc] alone triggers; the helpers read live refs and rebuilding every render would kill the caret
  useEffect(() => {
    if (serialize(doc) !== writing.current) {
      clearFind()
      rebuild(doc, spot())
    }
  }, [doc])

  // Late-arriving images land on already-rendered figures.
  useEffect(fillImages)

  /**
   * Tame a browser edit: stray wrappers unwrap, every top-level node becomes a
   * block div, markers get re-pinned. Runs after input and paste, and only ever
   * moves the caret when the DOM under it went away.
   */
  const normalize = () => {
    const ceEl = ce.current
    if (!ceEl) return
    const keep = spot()
    for (const el of [...ceEl.childNodes]) {
      if (el.nodeType === 3) {
        const div = document.createElement('div')
        div.dataset.b = uid()
        div.dataset.s = 'body'
        const after = el.nextSibling
        div.append(el)
        ceEl.insertBefore(div, after)
      } else if (el.nodeType === 1) {
        const node = el as HTMLElement
        if (node.tagName === 'BR') node.remove()
        else if (node.tagName === 'TABLE' || node.tagName === 'FIGURE') {
          if (!node.dataset.b) node.dataset.b = uid()
        } else if (node.tagName !== 'DIV' || !node.dataset.s) {
          // Pasted or browser-made element: keep its text, as a paragraph.
          const s: TextStyle =
            node.tagName === 'H1'
              ? 'title'
              : node.tagName === 'H2' || node.tagName === 'H3'
                ? 'heading'
                : node.tagName === 'H4' || node.tagName === 'H5' || node.tagName === 'H6'
                  ? 'subheading'
                  : node.tagName === 'LI'
                    ? 'bullet'
                    : node.tagName === 'BLOCKQUOTE'
                      ? 'quote'
                      : node.tagName === 'PRE'
                        ? 'mono'
                        : 'body'
          const div = document.createElement('div')
          div.dataset.b = uid()
          div.dataset.s = s
          div.innerHTML = node.innerHTML || '<br>'
          node.replaceWith(div)
        }
      }
    }
    // Lists pasted as UL/OL unpack to one block per item.
    for (const list of [...ceEl.querySelectorAll('ul,ol')] as HTMLElement[]) {
      const ordered = list.tagName === 'OL'
      for (const li of [...list.children] as HTMLElement[]) {
        const div = document.createElement('div')
        div.dataset.b = uid()
        div.dataset.s = ordered ? 'number' : 'bullet'
        div.innerHTML = li.innerHTML || '<br>'
        ceEl.insertBefore(div, list)
      }
      list.remove()
    }
    for (const el of [...ceEl.children] as HTMLElement[]) {
      if (el.tagName === 'DIV') {
        if (!el.dataset.b) el.dataset.b = uid()
        clean(el)
      }
    }
    for (const td of [...ceEl.querySelectorAll('td')] as HTMLElement[]) {
      td.className = CLS.td
      clean(td)
    }
    for (const el of [...ceEl.children] as HTMLElement[]) {
      if (el.tagName !== 'DIV') continue
      // Checklist rows always lead with their circle.
      if (el.dataset.s === 'check') {
        let mk = el.querySelector(':scope > [data-mk]') as HTMLElement | null
        if (!mk) {
          mk = boxMarker(!!el.dataset.done)
          el.prepend(mk)
        } else {
          el.prepend(mk)
          mk.className = el.dataset.done ? CLS.mkDone : CLS.mk
        }
      } else {
        for (const mk of [...el.querySelectorAll(':scope > [data-mk]')]) mk.remove()
      }
      if (!el.textContent?.trim() && !el.querySelector('br')) el.append(document.createElement('br'))
      restyle(el)
    }
    renumber()
    if (!ceEl.children.length) {
      const div = document.createElement('div')
      div.dataset.b = uid()
      div.dataset.s = 'body'
      div.append(document.createElement('br'))
      ceEl.append(div)
    }
    const sel = getSelection()
    if (!sel?.anchorNode || !ceEl.contains(sel.anchorNode)) place(keep)
  }

  /** Blocks the selection touches, for line-format ops. */
  const selBlocks = (): HTMLElement[] => {
    const sel = getSelection()
    if (!sel || !ce.current || !sel.anchorNode || !sel.focusNode) return []
    const a = blockOf(ce.current, sel.anchorNode)
    const f = blockOf(ce.current, sel.focusNode)
    if (!a || !f) return []
    const all = [...ce.current.children] as HTMLElement[]
    const [lo, hi] = [all.indexOf(a), all.indexOf(f)].sort((x, y) => x - y) as [number, number]
    return all.slice(lo, hi + 1).filter((el) => el.tagName === 'DIV')
  }

  /** Split the block under the caret at the caret; the tail lands in a fresh block. */
  const split = (into: TextStyle, keepInd?: string) => {
    const sel = getSelection()!
    const block = blockOf(ce.current!, sel.anchorNode)!
    const tail = document.createRange()
    tail.setStart(sel.anchorNode!, sel.anchorOffset)
    tail.setEnd(block, block.childNodes.length)
    const frag = tail.extractContents()
    const next = document.createElement('div')
    next.dataset.b = uid()
    next.dataset.s = into
    if (keepInd && INDENTABLE.has(into)) next.dataset.ind = keepInd
    if (into === 'check') next.append(boxMarker())
    next.append(frag)
    if (!next.textContent) next.append(document.createElement('br'))
    block.after(next)
    sel.setBaseAndExtent(next, into === 'check' ? 1 : 0, next, into === 'check' ? 1 : 0)
  }

  /** Wrap bare URLs in a block as real anchors, the way Notes linkifies after a space. */
  const linkify = (block: HTMLElement) => {
    const walk = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.parentElement?.closest('a') || n.parentElement?.closest('[data-mk]') || !LINK_ANY.test(n.textContent ?? '')
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT
    })
    const hits: Text[] = []
    let n = walk.nextNode()
    while (n) {
      hits.push(n as Text)
      n = walk.nextNode()
    }
    for (const t of hits) {
      const parts = (t.textContent ?? '').split(LINK_SPLIT)
      if (parts.length < 2) continue
      const frag = document.createDocumentFragment()
      for (const part of parts) {
        if (!part) continue
        if (LINK_TEST.test(part)) {
          const a = document.createElement('a')
          a.href = part.startsWith('www.') ? `https://${part}` : part
          a.className = CLS.a
          a.textContent = part
          frag.append(a)
        } else frag.append(part)
      }
      t.replaceWith(frag)
    }
  }

  const clearFind = () => {
    matches.current = []
    for (const mark of [...(ce.current?.querySelectorAll('mark') ?? [])]) {
      while (mark.firstChild) mark.before(mark.firstChild)
      mark.remove()
    }
  }

  const paintFind = (current = -1) => {
    matches.current.forEach((m, i) => (m.className = i === current ? CLS.markAt : CLS.mark))
  }

  const apply = (state: { s: string; spot?: Spot }) => {
    const d = parse(state.s)
    rebuild(d, state.spot)
    onDoc(d)
    reportCaret()
  }

  const step = (dir: -1 | 1) => {
    const bank = dir === -1 ? past : future
    const into = dir === -1 ? future : past
    const state = bank.current.pop()
    if (!state) return
    into.current.push({ s: writing.current, spot: spot() })
    apply(state)
  }

  useImperativeHandle(api, () => ({
    style: (s: TextStyle) => {
      for (const el of selBlocks()) {
        el.dataset.s = s
        if (!INDENTABLE.has(s)) delete el.dataset.ind
        if (s !== 'check') delete el.dataset.done
      }
      normalize()
      commit(true)
    },
    inline: (cmd) => {
      document.execCommand?.('styleWithCSS', false, 'false')
      document.execCommand(cmd)
      normalize()
      commit(true)
    },
    checklist: () => {
      for (const el of selBlocks()) {
        const on = el.dataset.s === 'check'
        el.dataset.s = on ? 'body' : 'check'
        if (on) delete el.dataset.done
      }
      normalize()
      commit(true)
    },
    indent: (d) => {
      for (const el of selBlocks()) {
        if (!INDENTABLE.has(el.dataset.s ?? '')) continue
        const next = Math.min(4, Math.max(0, Number(el.dataset.ind ?? 0) + d))
        if (next) el.dataset.ind = String(next)
        else delete el.dataset.ind
      }
      normalize()
      commit(true)
    },
    table: () => {
      const sel = getSelection()
      const block = sel?.anchorNode ? blockOf(ce.current!, sel.anchorNode) : undefined
      const table = document.createElement('table')
      table.dataset.b = uid()
      table.className = CLS.table
      const tbody = document.createElement('tbody')
      for (let r = 0; r < 2; r++) {
        const tr = document.createElement('tr')
        for (let c = 0; c < 2; c++) {
          const td = document.createElement('td')
          td.className = CLS.td
          td.append(document.createElement('br'))
          tr.append(td)
        }
        tbody.append(tr)
      }
      table.append(tbody)
      const after = document.createElement('div')
      after.dataset.b = uid()
      after.dataset.s = 'body'
      after.append(document.createElement('br'))
      if (block && sel?.anchorNode) {
        const tail = document.createRange()
        tail.setStart(sel.anchorNode, sel.anchorOffset)
        tail.setEnd(block, block.childNodes.length)
        const frag = tail.extractContents()
        if ([...frag.childNodes].some((n) => n.textContent)) after.append(frag)
        block.after(after)
        block.after(table)
      } else ce.current?.append(table, after)
      const td = table.querySelector('td')
      td && sel?.setBaseAndExtent(td, 0, td, 0)
      normalize()
      commit(true)
    },
    image: (key) => {
      const sel = getSelection()
      const block = sel?.anchorNode ? blockOf(ce.current!, sel.anchorNode) : undefined
      const figure = document.createElement('figure')
      figure.dataset.b = uid()
      figure.className = CLS.figure
      figure.contentEditable = 'false'
      const img = document.createElement('img')
      img.dataset.key = key
      img.className = CLS.img
      img.src = images(key) ?? ''
      img.draggable = false
      figure.append(img)
      const after = document.createElement('div')
      after.dataset.b = uid()
      after.dataset.s = 'body'
      after.append(document.createElement('br'))
      restyle(after)
      if (block) {
        block.after(after)
        block.after(figure)
      } else ce.current?.append(figure, after)
      commit(true)
    },
    undo: () => step(-1),
    redo: () => step(1),
    find: (q) => {
      clearFind()
      if (!q.trim() || !ce.current) return 0
      const needle = q.toLowerCase()
      const found: HTMLElement[] = []
      for (const el of [...ce.current.querySelectorAll('div[data-b],td')] as HTMLElement[]) {
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
          acceptNode: (n) =>
            n.parentElement?.closest('[data-mk]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        })
        const hits: Text[] = []
        let n = walk.nextNode() as Text | null
        while (n) {
          if ((n.textContent ?? '').toLowerCase().includes(needle)) hits.push(n)
          n = walk.nextNode() as Text | null
        }
        for (const t of hits) {
          const lower = (t.textContent ?? '').toLowerCase()
          let cur = t
          let base = 0
          for (;;) {
            const at = lower.indexOf(needle, base)
            if (at < 0) break
            const mid = cur.splitText(at - base) // cur keeps the text before the match
            const tail = mid.splitText(needle.length) // mid holds just the match
            const mark = document.createElement('mark')
            mark.className = CLS.mark
            mid.replaceWith(mark)
            mark.append(mid)
            found.push(mark)
            base = at + needle.length
            cur = tail
          }
        }
      }
      matches.current = found
      paintFind()
      return found.length
    },
    jump: (i) => {
      const mark = matches.current[i]
      if (!mark || !ce.current) return
      ce.current.focus({ preventScroll: true })
      mark.scrollIntoView({ block: 'center' })
      getSelection()?.selectAllChildren(mark)
      paintFind(i)
    },
    clearFind,
    blur: () => {
      for (const el of [...(ce.current?.children ?? [])] as HTMLElement[]) if (el.tagName === 'DIV') linkify(el)
      commit(false)
      ce.current?.blur()
    }
  }))

  const onKeyDown = (e: React.KeyboardEvent) => {
    const sel = getSelection()
    if (!sel?.anchorNode || !ce.current) return
    const block = blockOf(ce.current, sel.anchorNode)
    const td = cellOf(sel.anchorNode)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      if (td) return // a newline inside the cell, like the real table
      if (!block) return
      e.preventDefault()
      const s = (block.dataset.s ?? 'body') as TextStyle
      const empty = !textLength(block)
      if (LISTY.has(s) || s === 'quote' || s === 'mono') {
        if (empty) {
          // Return on an empty structured line drops back to Body.
          block.dataset.s = 'body'
          delete block.dataset.ind
          delete block.dataset.done
          delete block.dataset.num
          block.querySelector(':scope > [data-mk]')?.remove()
        } else split(LISTY.has(s) ? s : 'body', block.dataset.ind)
      } else split('body')
      normalize()
      commit(true)
      return
    }
    if (e.key === 'Backspace') {
      if (td) {
        // Never let a cell-backspace chew through the table wall.
        if (caretOffset(td, sel.anchorNode, sel.anchorOffset) === 0) e.preventDefault()
        return
      }
      if (!block || !sel.isCollapsed || caretOffset(block, sel.anchorNode, sel.anchorOffset) !== 0) return
      e.preventDefault()
      if ((block.dataset.s ?? 'body') !== 'body') {
        block.dataset.s = 'body'
        delete block.dataset.ind
        delete block.dataset.done
        delete block.dataset.num
      } else {
        const prev = block.previousElementSibling as HTMLElement | null
        if (!prev) return
        const at = prev.tagName === 'DIV' ? textLength(prev) : 0
        const i = blocks().indexOf(prev)
        if (prev.tagName === 'FIGURE' || prev.tagName === 'TABLE') {
          prev.remove()
          place({ b: Math.min(i, blocks().length - 1), at: 0 })
        } else {
          for (const n of [...block.childNodes]) prev.append(n)
          block.remove()
          place({ b: blocks().indexOf(prev), at })
        }
      }
      normalize()
      commit(true)
      return
    }
    if (e.key === 'Delete') {
      if (!block || !sel.isCollapsed) return
      if (caretOffset(block, sel.anchorNode, sel.anchorOffset) !== textLength(block)) return
      const next = block.nextElementSibling as HTMLElement | null
      if (!next) return
      e.preventDefault()
      const at = textLength(block)
      if (next.tagName === 'FIGURE' || next.tagName === 'TABLE') next.remove()
      else {
        for (const n of [...next.childNodes]) block.append(n)
        next.remove()
      }
      place({ b: blocks().indexOf(block), at })
      normalize()
      commit(true)
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      if (td) {
        const table = td.closest('table')!
        const width = table.querySelector('tr')?.children.length || 1
        const cells = [...table.querySelectorAll('td')] as HTMLElement[]
        let at = cells.indexOf(td) + (e.shiftKey ? -1 : 1)
        if (at >= cells.length) {
          // Tab off the last cell grows the table, like the real one.
          const tr = document.createElement('tr')
          for (let i = 0; i < width; i++) {
            const c = document.createElement('td')
            c.className = CLS.td
            c.append(document.createElement('br'))
            tr.append(c)
          }
          table.querySelector('tbody')!.append(tr)
          cells.push(...([...tr.children] as HTMLElement[]))
        }
        if (at < 0) at = 0
        const next = cells[at]
        next && sel.setBaseAndExtent(next, 0, next, 0)
        normalize()
        commit(true)
        return
      }
      if (block && INDENTABLE.has(block.dataset.s ?? '')) {
        const next = Math.min(4, Math.max(0, Number(block.dataset.ind ?? 0) + (e.shiftKey ? -1 : 1)))
        if (next) block.dataset.ind = String(next)
        else delete block.dataset.ind
        normalize()
        commit(true)
      }
    }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    const mk = (e.target as HTMLElement).closest?.('[data-mk]') as HTMLElement | null
    if (mk && ce.current?.contains(mk)) {
      const block = mk.parentElement
      if (block?.dataset.s === 'check' && !readOnly) {
        e.preventDefault()
        if (block.dataset.done) delete block.dataset.done
        else block.dataset.done = '1'
        normalize()
        commit(true)
        return
      }
    }
    const a = (e.target as HTMLElement).closest?.('a') as HTMLAnchorElement | null
    if (a && ce.current?.contains(a)) {
      e.preventDefault()
      void os.open('Safari', a.href)
    }
  }

  const onFocusOut = () => {
    for (const el of [...(ce.current?.children ?? [])] as HTMLElement[]) if (el.tagName === 'DIV') linkify(el)
    commit(false)
  }

  const onSelChange = () => {
    if (!ce.current) return
    const sel = getSelection()
    const block = sel?.anchorNode ? blockOf(ce.current, sel.anchorNode) : undefined
    lastSpot.current = block
      ? { b: blocks().indexOf(block), at: caretOffset(block, sel!.anchorNode!, sel!.anchorOffset) }
      : undefined
    // Leaving a block linkifies it, so typed URLs turn into links without ever
    // moving the caret mid-word.
    if (lastBlock.current && block !== lastBlock.current && lastBlock.current.tagName === 'DIV') {
      linkify(lastBlock.current)
      commit(false)
    }
    lastBlock.current = block
    reportCaret()
  }

  // The listener registers once but must always reach the latest closure - the
  // first render's stale `commit`/`onDoc` would otherwise answer forever.
  const onSelRef = useRef(onSelChange)
  onSelRef.current = onSelChange
  useEffect(() => {
    const handler = () => onSelRef.current()
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-time build only; later doc changes flow through the other effect
  useEffect(() => {
    // Without an explicit value Chrome treats styleWithCSS as a toggle and leaves
    // it on, so inline commands emit styled spans that normalize() unwraps.
    document.execCommand?.('styleWithCSS', false, 'false')
    if (ce.current) rebuild(doc)
  }, [])

  return (
    // biome-ignore lint/a11y/useSemanticElements: a rich-text editor needs a div; input and textarea hold only plain text
    <div
      ref={ce}
      {...stylex.props(styles.ed)}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      role="textbox"
      tabIndex={0}
      aria-multiline="true"
      aria-label="Note text"
      aria-readonly={readOnly}
      onInput={() => {
        if (composing.current) return
        normalize()
        commit(false)
      }}
      onCompositionStart={() => (composing.current = true)}
      onCompositionEnd={() => {
        composing.current = false
        normalize()
        commit(false)
      }}
      onKeyDown={readOnly ? undefined : onKeyDown}
      onMouseDown={onMouseDown}
      onFocus={reportCaret}
      onBlur={onFocusOut}
    />
  )
}

const styles = stylex.create({
  ed: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    paddingTop: 6,
    paddingInline: 20,
    paddingBottom: 90,
    outline: 0,
    color: colors.white,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    caretColor: colors.yellow,
    overflowWrap: 'anywhere',
    WebkitUserSelect: 'text'
  },
  block: {
    position: 'relative',
    marginBlock: 2,
    minHeight: leading.body,
    whiteSpace: 'pre-wrap'
  },
  title: {
    fontSize: typeScale.title2,
    lineHeight: leading.title2,
    letterSpacing: tracking.title2,
    fontWeight: weight.bold,
    marginBlock: 4
  },
  heading: {
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold
  },
  subheading: {
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    letterSpacing: tracking.headline,
    fontWeight: weight.semibold
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  listed: { paddingLeft: 24 },
  bullet: {
    '::before': {
      content: '"•"',
      position: 'absolute',
      left: 6,
      top: 0,
      color: 'inherit'
    }
  },
  dash: {
    '::before': {
      content: '"-"',
      position: 'absolute',
      left: 6,
      top: 0,
      color: 'inherit'
    }
  },
  number: {
    '::before': {
      content: 'attr(data-num)',
      position: 'absolute',
      left: 0,
      top: 0,
      width: 18,
      textAlign: 'right',
      color: 'inherit'
    }
  },
  quote: {
    paddingLeft: 14,
    '::before': {
      content: '""',
      position: 'absolute',
      left: 2,
      top: 3,
      bottom: 3,
      width: 3,
      borderRadius: radius.xs,
      backgroundColor: colors.grey4Dark
    }
  },
  ind1: { paddingLeft: 46 },
  ind2: { paddingLeft: 68 },
  ind3: { paddingLeft: 90 },
  ind4: { paddingLeft: 112 },
  mk: {
    position: 'absolute',
    left: 3,
    top: '50%',
    translate: '0 -50%',
    width: 15,
    height: 15,
    borderRadius: radius.circle,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: colors.grey2Dark,
    display: 'grid',
    placeItems: 'center',
    color: 'transparent',
    cursor: 'pointer',
    transitionProperty: 'background-color, border-color, color',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.out
  },
  mkDone: {
    position: 'absolute',
    left: 3,
    top: '50%',
    translate: '0 -50%',
    width: 15,
    height: 15,
    borderRadius: radius.circle,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: 'transparent',
    backgroundColor: appAppearance.notesYellow,
    display: 'grid',
    placeItems: 'center',
    color: colors.black,
    cursor: 'pointer',
    transitionProperty: 'background-color, border-color, color',
    transitionDuration: '.18s',
    transitionTimingFunction: easing.out
  },
  table: {
    borderCollapse: 'separate',
    borderSpacing: 0,
    marginBlock: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: app.separator,
    borderRadius: radius.sm,
    overflow: 'hidden',
    tableLayout: 'auto'
  },
  td: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderRightStyle: 'solid',
    borderBottomStyle: 'solid',
    borderColor: app.separator,
    paddingBlock: 5,
    paddingInline: 10,
    minWidth: 44,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline
  },
  figure: { margin: 0, marginBlock: 6 },
  img: {
    maxWidth: '100%',
    maxHeight: 260,
    borderRadius: radius.sm,
    display: 'block'
  },
  a: { color: appAppearance.notesYellow, textDecoration: 'underline', cursor: 'pointer' },
  b: { fontWeight: weight.semibold },
  mark: { backgroundColor: appAppearance.notesFind, color: 'inherit', borderRadius: radius.xs },
  markAt: { backgroundColor: appAppearance.notesYellow, color: colors.black }
})

// Hand-built DOM can't take stylex.props, so the style objects resolve to class
// names once here and get assigned on create and in normalize.
const CLS = {
  block: stylex.props(styles.block).className!,
  s: {
    title: stylex.props(styles.title).className!,
    heading: stylex.props(styles.heading).className!,
    subheading: stylex.props(styles.subheading).className!,
    mono: stylex.props(styles.mono).className!,
    quote: stylex.props(styles.quote).className!,
    bullet: stylex.props(styles.listed, styles.bullet).className!,
    dash: stylex.props(styles.listed, styles.dash).className!,
    number: stylex.props(styles.listed, styles.number).className!,
    check: stylex.props(styles.listed).className!
  } as Partial<Record<TextStyle, string>>,
  mk: stylex.props(styles.mk).className!,
  mkDone: stylex.props(styles.mkDone).className!,
  table: stylex.props(styles.table).className!,
  td: stylex.props(styles.td).className!,
  figure: stylex.props(styles.figure).className!,
  img: stylex.props(styles.img).className!,
  a: stylex.props(styles.a).className!,
  b: stylex.props(styles.b).className!,
  mark: stylex.props(styles.mark).className!,
  markAt: stylex.props(styles.mark, styles.markAt).className!
}

const IND: Record<string, string | undefined> = {
  '1': stylex.props(styles.ind1).className!,
  '2': stylex.props(styles.ind2).className!,
  '3': stylex.props(styles.ind3).className!,
  '4': stylex.props(styles.ind4).className!
}

/** Inline-tag classes, re-pinned after any paste or unwrap pass. */
const TAG_CLS: Record<string, string | undefined> = { A: CLS.a, B: CLS.b }

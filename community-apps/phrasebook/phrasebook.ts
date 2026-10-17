import { type CatId, LANGS, type LangId, PHRASES, type Phrase } from './phrases.ts'

/** 'all' and 'saved' are views over the list rather than categories of it. */
export type Filter = 'all' | 'saved' | CatId
/** Session state both displays share: which list is open and which phrase is being shown. */
export type Ui = { filter: Filter; query: string; sel: string | null }

export const DEFAULT_LANG: LangId = 'es'
const FILTERS = new Set<string>(['all', 'saved', 'basics', 'around', 'eating', 'shopping', 'health'])
const BY_ID = new Map(PHRASES.map((phrase) => [phrase.id, phrase]))

export const phraseById = (id: string | null) => (id ? BY_ID.get(id) : undefined)
export const isLang = (v: unknown): v is LangId => LANGS.some((l) => l.id === v)

export function parseLang(raw: string | null): LangId {
  return isLang(raw) ? raw : DEFAULT_LANG
}

// Storage can hold anything an older or hand-edited copy left behind, so every
// reader narrows instead of trusting its shape.
export function parseUi(raw: string | null): Ui {
  const fresh: Ui = { filter: 'all', query: '', sel: null }
  if (!raw) return fresh
  try {
    const v = JSON.parse(raw) as Record<string, unknown> | null
    if (typeof v !== 'object' || v === null) return fresh
    return {
      filter: typeof v.filter === 'string' && FILTERS.has(v.filter) ? (v.filter as Filter) : 'all',
      query: typeof v.query === 'string' ? v.query.slice(0, 80) : '',
      sel: typeof v.sel === 'string' && BY_ID.has(v.sel) ? v.sel : null
    }
  } catch {
    return fresh
  }
}

export function parseFavs(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw) as unknown
    if (!Array.isArray(v)) return []
    return [...new Set(v.filter((id): id is string => typeof id === 'string' && BY_ID.has(id)))]
  } catch {
    return []
  }
}

export const toggleFav = (favs: string[], id: string) =>
  favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id]

// Lowercase and strip accents so "cafe" finds "café" and "dónde" matches "donde". Vietnamese đ is a
// letter of its own that NFD leaves whole, and it is the one people most often type without its stroke.
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replaceAll('đ', 'd')

/** The phrases a list shows: the filter first, then a query against English, the translation and its romanisation. */
export function visible(ui: Ui, favs: readonly string[], lang: LangId): Phrase[] {
  const q = fold(ui.query.trim())
  return PHRASES.filter((phrase) => {
    if (ui.filter === 'saved' ? !favs.includes(phrase.id) : ui.filter !== 'all' && phrase.cat !== ui.filter)
      return false
    if (!q) return true
    const line = phrase.to[lang]
    return fold(`${phrase.en} ${line.text} ${line.say ?? ''}`).includes(q)
  })
}

/** The phrase one step away in the list, or the same one at either end: stepping never wraps. */
export function step(list: readonly Phrase[], id: string, dir: 1 | -1): Phrase | undefined {
  const at = list.findIndex((phrase) => phrase.id === id)
  if (at < 0) return undefined
  return list[Math.min(list.length - 1, Math.max(0, at + dir))]
}

export type Size = 'xl' | 'lg' | 'md' | 'sm' | 'xs' | 'xxs'
// Largest first; the px is the kit's display / title step this maps to in styles.ts.
const SIZES: readonly [Size, number][] = [
  ['xl', 72],
  ['lg', 56],
  ['md', 44],
  ['sm', 34],
  ['xs', 28],
  ['xxs', 22]
]
// Kana and kanji are as wide as they are tall and a line may break between any two of them,
// where a Latin letter is about 0.55 of its size wide and words break only at spaces.
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u

/**
 * The step a phrase is shown at on a screen about 300 px of text wide. The longest unbreakable run
 * must fit on a line, because a word broken mid-way is the one thing a stranger cannot read. Beyond
 * that a Latin phrase may take about three lines, and a Japanese one two, since a kana string cut
 * into three short lines reads as noise.
 */
export function fitSize(text: string): Size {
  const chars = Math.max(1, [...text].length)
  const longest = Math.max(1, ...text.split(/\s+/).map((word) => (CJK.test(word) ? 1.8 : word.length)))
  const limit = Math.min(517 / longest, CJK.test(text) ? 600 / chars : 1500 / chars)
  return (SIZES.find(([, px]) => px <= limit) ?? SIZES[SIZES.length - 1]!)[0]
}

// Spelled as a code point: an editor or formatter that normalises whitespace would turn a literal one into a plain space.
export const NBSP = String.fromCharCode(0xa0)
/** French sets a no-break space before ? ! : ; and a bare one can strand the mark alone on the next line. */
export const typeset = (lang: LangId, text: string) => (lang === 'fr' ? text.replace(/ ([?!:;])/g, `${NBSP}$1`) : text)

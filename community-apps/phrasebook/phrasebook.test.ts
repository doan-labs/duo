// Checks for the phrase data and the list logic. Throw-based so it runs as a plain
// script (`bun community-apps/phrasebook/phrasebook.test.ts`): a community app may not
// import bun:test or node modules. Any failed check throws and exits nonzero.
import {
  DEFAULT_LANG,
  fitSize,
  NBSP,
  parseFavs,
  parseLang,
  parseUi,
  phraseById,
  step,
  toggleFav,
  typeset,
  visible
} from './phrasebook.ts'
import { CATS, LANGS, PHRASES } from './phrases.ts'

function check(name: string, ok: boolean) {
  if (!ok) throw new Error(`failed: ${name}`)
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
// Built from the code point: a literal em dash anywhere in the repository is a lint failure.
const EM_DASH = String.fromCharCode(0x2014)

// Data: every phrase is complete, so no language ever shows a hole.
check('ids are unique', new Set(PHRASES.map((p) => p.id)).size === PHRASES.length)
check(
  'every category is used',
  CATS.every((c) => PHRASES.some((p) => p.cat === c.id))
)
for (const p of PHRASES) {
  check(`${p.id} has english`, p.en.trim().length > 0)
  check(
    `${p.id} category exists`,
    CATS.some((c) => c.id === p.cat)
  )
  for (const l of LANGS) {
    const line = p.to[l.id]
    check(`${p.id}/${l.id} has text`, line.text.trim().length > 0)
    // "No" is the same word in English, Spanish and Italian; everything else must be translated.
    check(`${p.id}/${l.id} is translated`, line.text !== p.en || p.id === 'no')
    check(`${p.id}/${l.id} has no unfilled blank`, !/[…]|\.\.\.|\bX\b/.test(line.text))
    check(`${p.id}/${l.id} has no em dash`, !line.text.includes(EM_DASH) && !p.en.includes(EM_DASH))
    // Japanese is the one script a reader cannot sound out, so each line carries a romanisation.
    check(`${p.id}/${l.id} romanisation`, l.id === 'ja' ? (line.say ?? '').length > 0 : line.say === undefined)
  }
}

// Parsing: garbage in storage degrades to a default, never throws.
check('lang default', parseLang(null) === DEFAULT_LANG && parseLang('xx') === DEFAULT_LANG)
check('lang valid', parseLang('ja') === 'ja')
check('ui null', same(parseUi(null), { filter: 'all', query: '', sel: null }))
check('ui garbage', same(parseUi('{not json'), { filter: 'all', query: '', sel: null }))
check('ui array', same(parseUi('[]'), { filter: 'all', query: '', sel: null }))
check(
  'ui unknown filter and phrase',
  same(parseUi('{"filter":"zzz","sel":"nope"}'), { filter: 'all', query: '', sel: null })
)
check(
  'ui keeps valid',
  same(parseUi('{"filter":"eating","query":"ta","sel":"menu"}'), { filter: 'eating', query: 'ta', sel: 'menu' })
)
check('ui bounds query', parseUi(JSON.stringify({ query: 'x'.repeat(500) })).query.length === 80)
check('favs garbage', same(parseFavs('nope'), []) && same(parseFavs('{"a":1}'), []) && same(parseFavs(null), []))
check('favs drops unknown and duplicates', same(parseFavs('["menu","menu","gone",3]'), ['menu']))
check('fav toggle', same(toggleFav([], 'menu'), ['menu']) && same(toggleFav(['menu'], 'menu'), []))
check(
  'phraseById',
  phraseById('menu')?.en === 'The menu, please' && phraseById('gone') === undefined && phraseById(null) === undefined
)

// Filtering.
const all = { filter: 'all', query: '', sel: null } as const
check('all lists everything', visible(all, [], 'es').length === PHRASES.length)
check(
  'category filter',
  visible({ ...all, filter: 'health' }, [], 'es').every((p) => p.cat === 'health') &&
    visible({ ...all, filter: 'health' }, [], 'es').length > 0
)
check('saved is empty until starred', visible({ ...all, filter: 'saved' }, [], 'es').length === 0)
// List order follows the phrase list, not the order the stars were given.
check(
  'saved shows starred',
  same(
    visible({ ...all, filter: 'saved' }, ['help', 'menu'], 'es').map((p) => p.id),
    ['menu', 'help']
  )
)
check(
  'query matches english',
  visible({ ...all, query: 'airport' }, [], 'fr').some((p) => p.id === 'airport')
)
check(
  'query matches the target language',
  visible({ ...all, query: 'aeroport' }, [], 'fr').some((p) => p.id === 'airport')
)
check(
  'query ignores accents',
  visible({ ...all, query: 'donde' }, [], 'es').some((p) => p.id === 'toilet')
)
check(
  'query finds Vietnamese typed without marks, including the stroked d',
  visible({ ...all, query: 'ban do' }, [], 'vi').some((p) => p.id === 'map') &&
    visible({ ...all, query: 'ĐẮT' }, [], 'vi').some((p) => p.id === 'expensive')
)
check(
  'query matches romaji',
  visible({ ...all, query: 'sumimasen' }, [], 'ja').some((p) => p.id === 'excuse')
)
check(
  'query only searches the chosen language',
  !visible({ ...all, query: 'aeroport' }, [], 'de').some((p) => p.id === 'airport')
)
check('query and filter combine', visible({ ...all, filter: 'health', query: 'airport' }, [], 'fr').length === 0)
check('blank query is no query', visible({ ...all, query: '   ' }, [], 'es').length === PHRASES.length)

// Stepping stops at the ends.
const list = visible(all, [], 'es')
const first = list[0]!
const last = list[list.length - 1]!
check('step forward', step(list, first.id, 1)?.id === list[1]?.id)
check('step stops at the start', step(list, first.id, -1)?.id === first.id)
check('step stops at the end', step(list, last.id, 1)?.id === last.id)
check('step from a phrase outside the list', step(list, 'gone', 1) === undefined)

// French punctuation keeps its no-break space; other languages are untouched.
check('french nbsp', typeset('fr', 'Où est la gare ?') === `Où est la gare${NBSP}?`)
check('french nbsp replaces the plain space', !typeset('fr', 'Où est la gare ?').includes(' ?'))
check('other languages untouched', typeset('es', '¿Dónde está el baño?') === '¿Dónde está el baño?')

// Sizing: a word is never set so large that it must break mid-word.
check('short word is largest', fitSize('Hola') === 'xl')
check('a long German word steps down', fitSize('Entschuldigung') === 'sm')
check('the longest word decides, not the length', fitSize('Auf Wiedersehen') === 'md')
check('a long sentence is capped by its length', fitSize('Können Sie es mir auf der Karte zeigen?') === 'sm')
check('a medium sentence keeps to three lines', fitSize('Cho tôi một bàn cho hai người') === 'md')
check('a short kana word is large', fitSize('こんにちは') === 'xl')
check('a long kana phrase takes two lines, not three', fitSize('ありがとうございます') === 'lg')
console.log(`phrasebook: ${PHRASES.length} phrases x ${LANGS.length} languages, all checks passed`)

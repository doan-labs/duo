// Admission-gate regression checks. The reviewer's defect: the committed
// `live` callback read a React-render ref that lags the SDK's synchronous
// `os.view`, so a same-turn hide still admitted input. These checks evaluate
// the REAL committed callback source (extracted exactly as the reviewer's
// probe does) plus the shared `admitLive` predicate every admission path
// routes through. Throw-based like pantry.test.ts. Lives in `.tests/` because
// reading the committed callback needs node:fs, which the app sandbox bans.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { admitLive } from '../admission.ts'

let n = 0
const ok = (cond: boolean, label: string) => {
  n++
  if (!cond) throw new Error(`FAIL ${label}`)
}

const visDoc = { visibilityState: 'visible' }
const hidDoc = { visibilityState: 'hidden' }

// --- truth table ---------------------------------------------------------

ok(admitLive({ visible: true, active: true }, visDoc), 'live + visible document admits')
ok(!admitLive({ visible: false, active: true }, visDoc), 'current not-visible denies')
ok(!admitLive({ visible: true, active: false }, visDoc), 'current not-active denies')
ok(!admitLive({ visible: false, active: false }, visDoc), 'current neither denies')
ok(!admitLive({ visible: true, active: true }, hidDoc), 'hidden document denies (supplemental backstop)')
ok(!admitLive({ visible: true, active: true }, { visibilityState: 'prerender' }), 'prerender denies')

// --- same-turn flip: reads the current snapshot, not a frozen copy ---------

{
  const view = { visible: true, active: true }
  ok(admitLive(view, visDoc), 'admits while current view is live')
  view.visible = false // fold/hide delivered this turn - no render needed
  ok(!admitLive(view, visDoc), 'same-turn hide denies on the very next call')
  view.active = false
  view.visible = true
  ok(!admitLive(view, visDoc), 'same-turn deactivate denies')
  view.visible = true
  view.active = true
  ok(admitLive(view, visDoc), 'same-turn re-show admits again')
}

// --- the committed `live` callback rejects every stale-snapshot combo ------
//
// Mirrors the reviewer's extraction: pull `() => ...` out of
// `const live = useCallback(` and evaluate it with a stale React ref (still
// true), a visible document, and the CURRENT SDK view in each inactive
// combination. All three must deny.

const source = readFileSync(fileURLToPath(new URL('../main.tsx', import.meta.url)), 'utf8')
const gate = source.match(/const live = useCallback\(\s*(\(\) =>[^\n]+),\s*\[/)
ok(gate !== null, 'committed live callback keeps the extractable useCallback shape')
if (gate) {
  ok(gate[1].includes('os.view'), 'committed callback reads os.view, not a rendered ref')
  ok(!gate[1].includes('viewRef'), 'committed callback no longer touches the stale ref')
  const staleRef = { current: { visible: true, active: true } }
  for (const current of [
    { visible: false, active: true },
    { visible: true, active: false },
    { visible: false, active: false }
  ]) {
    const live = new Function('viewRef', 'document', 'os', 'admitLive', `return (${gate[1]})`)(
      staleRef,
      visDoc,
      { view: current },
      admitLive
    )
    ok(!live(), `stale ref + current ${JSON.stringify(current)} denies`)
  }
  const liveNow = new Function('viewRef', 'document', 'os', 'admitLive', `return (${gate[1]})`)(
    staleRef,
    visDoc,
    { view: { visible: true, active: true } },
    admitLive
  )
  ok(liveNow(), 'genuinely live current view still admits')
}

// --- deferred/hidden work routes through the gate --------------------------
//
// Every deferred callback that used to read the lagging ref now consults the
// current view at execution time; assert each committed site still does.

const sites: [RegExp, string][] = [
  [/if \(!live\(\)\) return\n\s+setToday/, 'midnight tick checks live at execution before re-arming'],
  [/if \(!el \|\| !live\(\)\) return/, 'sheet focus restore gates before the first RAF is scheduled'],
  [/if \(!el\.isConnected \|\| !live\(\)\) return/, 'deferred sheet focus restore checks live at execution'],
  [
    /if \(!admitLive\(os\.view, document\)\) return\n\s+event\.preventDefault\(\)\n\s+event\.stopImmediatePropagation\(\)/,
    'pre-connect Escape guard gates before preventDefault/stopImmediatePropagation'
  ],
  [/if \(!live\(\)\) return\n\s+window\.clearTimeout/, 'announce drops notice+timer on hidden copies'],
  [
    /if \(!admitLive\(os\.view, document\)\) return\n\s+event\.preventDefault/,
    'sheet Tab trap checks current view before moving focus'
  ],
  [
    /const mutate = useCallback\(\s*\(op[\s\S]*?if \(!live\(\)\) return null/,
    'mutate still denies before touching the engine'
  ],
  [/const add = \(\) => \{\n\s+if \(!live\(\)\) return/, 'add denies before validation sets state'],
  [/const saveEdit = \(\) => \{\n\s+if \(!live\(\)\) return/, 'saveEdit denies before validation sets state'],
  [/const addShopItem = \(\) => \{\n\s+if \(!live\(\)\) return/, 'addShopItem denies before validation sets state'],
  [
    /const openEdit = \(item: Item\) => \{\n\s+if \(!live\(\)\) return/,
    'openEdit denies before capturing focus trigger'
  ],
  [/if \(!live\(\)\) return \/\/ denied keys/, 'chip roving keys deny before preventDefault/focus'],
  [
    /const remove = \(id: string\) => \{\n\s+if \(!live\(\)\) return\n\s+const item/,
    'remove denies before even reading the doc'
  ],
  [
    /announce\('good', meta\?\.merged \? `[^`]*` : `[^`]*updated`\)/,
    'edit confirmation no longer claims a durable save'
  ]
]
for (const [re, label] of sites) ok(re.test(source), label)

console.log(`admission: ${n} checks passed`)

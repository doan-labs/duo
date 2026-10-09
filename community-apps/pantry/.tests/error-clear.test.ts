// Error-clear regression checks. The reviewer's residual defect: after an
// invalid submit then a valid add, the red field errors stayed over the
// cleared form. The fix clears errors on the successful path, gated to the
// exact accepted draft so a concurrent newer invalid draft keeps its own
// errors. These checks evaluate the REAL committed `add` callback (extracted
// from main.tsx like the reviewer's probes) with stubbed React setters.
// Lives in `.tests/` because reading committed source needs node:fs.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

let n = 0
const ok = (cond: boolean, label: string) => {
  n++
  if (!cond) throw new Error(`FAIL ${label}`)
}

const source = readFileSync(fileURLToPath(new URL('../main.tsx', import.meta.url)), 'utf8')
const cut = source.match(/const add = \(\) => \{[\s\S]+?\n\s{2}\}\n/)
ok(cut !== null, 'committed add callback keeps the extractable shape')
if (!cut) throw new Error('FAIL extraction')
const js = cut[0]
  .replace(/: Errors/g, '')
  .replace(/milli!/g, 'milli')
  .replace(/ as AddMeta \| undefined/g, '')

type Errors = Record<string, string>

const mkHarness = () => {
  const calls: { errors: Errors[]; drafts: unknown[]; mutated: unknown[]; announced: string[] } = {
    errors: [],
    drafts: [],
    mutated: [],
    announced: []
  }
  let errors: Errors = {}
  const scope: Record<string, unknown> = {
    live: () => true,
    cleanName: (s: string) => s.trim(),
    parseQty: (s: string) => {
      const v = Number(s)
      return s.trim() === '' || !Number.isFinite(v) || v <= 0 ? null : Math.round(v * 1000)
    },
    validDay: () => true,
    setErrors: (next: unknown) => {
      errors = typeof next === 'function' ? (next as (p: Errors) => Errors)(errors) : (next as Errors)
      calls.errors.push(errors)
    },
    announce: (_t: string, s: string) => calls.announced.push(s),
    mutate: (op: unknown) => {
      calls.mutated.push(op)
      return { meta: { id: 'row-1' } }
    },
    opAdd: (o: unknown) => ({ kind: 'add', o }),
    curDoc: () => ({ items: [{ id: 'row-1', name: 'Rice', milli: 2000 }] }),
    qtyText: () => '2 pcs',
    play: () => {},
    setFlashId: () => {},
    setDraft: (d: unknown) => calls.drafts.push(d),
    EMPTY_DRAFT: { name: '', qty: '', unit: 'pcs', location: 'pantry', date: '' },
    draftRef: { current: null as unknown }
  }
  const add = new Function('scope', `with (scope) { ${js}; return add }`)(scope) as () => void
  return { calls, scope, add, getErrors: () => errors, setErrorsState: (e: Errors) => (errors = e) }
}

// --- invalid submit leaves errors and never mutates -------------------------

{
  const h = mkHarness()
  const d = { name: '', qty: '', unit: 'pcs', location: 'pantry', date: '' }
  h.scope.draft = d
  h.scope.draftRef = { current: d }
  h.add()
  const errs = h.getErrors()
  ok(errs.name === 'Name the ingredient', 'invalid submit sets the name error')
  ok(typeof errs.qty === 'string' && errs.qty.length > 0, 'invalid submit sets the qty error')
  ok(h.calls.mutated.length === 0, 'invalid submit accepts no op')
}

// --- valid submit after invalid: errors clear for the accepted draft ---------

{
  const h = mkHarness()
  const d = { name: 'Rice', qty: '2', unit: 'pcs', location: 'pantry', date: '' }
  h.scope.draft = d
  h.scope.draftRef = { current: d }
  h.setErrorsState({ name: 'Name the ingredient', qty: 'Enter a quantity above 0' })
  h.add()
  ok(h.calls.mutated.length === 1, 'valid submit accepts the op')
  ok(Object.keys(h.getErrors()).length === 0, 'successful add clears the accepted draft errors')
  ok(h.calls.drafts.length === 1, 'successful add resets the draft')
}

// --- a concurrent newer invalid draft keeps its own errors ------------------

{
  const h = mkHarness()
  const d = { name: 'Rice', qty: '2', unit: 'pcs', location: 'pantry', date: '' }
  h.scope.draft = d
  // The accepted draft's render is stale: a newer draft already owns the form.
  h.scope.draftRef = { current: { name: '', qty: 'x', unit: 'pcs', location: 'pantry', date: '' } }
  h.setErrorsState({ name: 'Name the ingredient' })
  h.add()
  ok(h.calls.mutated.length === 1, 'stale-closure submit still accepted its op')
  ok(h.getErrors().name === 'Name the ingredient', 'newer invalid draft errors are preserved')
}

// --- no-race control: a plain valid submit clears errors --------------------

{
  const h = mkHarness()
  const d = { name: 'Oats', qty: '1', unit: 'pcs', location: 'pantry', date: '' }
  h.scope.draft = d
  h.scope.draftRef = { current: d }
  h.add()
  ok(h.calls.mutated.length === 1, 'control op accepted')
  ok(Object.keys(h.getErrors()).length === 0, 'control clears errors')
}

console.log(`error-clear: ${n} checks passed`)

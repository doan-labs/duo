import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Button, Sym, useWide } from '@doan-labs/duo-uikit'
import { dark } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  addTx,
  type Budget,
  CATEGORIES,
  categoryOf,
  clampDayToMonth,
  dailySpend,
  daysInMonth,
  formatMinor,
  minorInput,
  monthLabel,
  monthOfDay,
  monthTx,
  newTx,
  parseAmount,
  parseBudget,
  parseLimit,
  parseMirror,
  removeTx,
  serializeBudget,
  serializeMirror,
  setLimit,
  shiftMonth,
  shortDay,
  spendByCategory,
  type Tx,
  todayDay,
  todayKey,
  todayMonth,
  totalLimits,
  totalSpend,
  trimNote,
  updateTx,
  validDay
} from './budget.ts'
import { styles, tintBg, tintText } from './styles.ts'

// Why a writer id: both displays share one session key whose store is
// last-writer-wins, so a value not written by this copy is always the newer
// settled ledger - adopting it unconditionally is what converges the two
// displays, including the race where both seed an empty session at once.
const ME = crypto.randomUUID()

type Draft = { date: string; amount: string; category: string; note: string }
type Errors = { amount?: string; date?: string }

const freshDraft = (month: string): Draft => ({
  date: clampDayToMonth(todayKey(), month),
  amount: '',
  category: 'groceries',
  note: ''
})

function PocketBudget() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const stored = useKV(os.storage, 'budget-v1')
  const mirror = useKV(os.session, 'budget')
  // Mask the ledger with the write still in flight so a quick second submit
  // extends it instead of dropping the row that has not landed back yet.
  const pending = useRef<string | null>(null)
  const budget = parseBudget(pending.current ?? stored.value)
  const [month, setMonth] = useState(todayMonth)
  const [draft, setDraft] = useState<Draft>(() => freshDraft(todayMonth()))
  const [editing, setEditing] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [limitError, setLimitError] = useState<string | null>(null)
  const lastSeen = useRef<string | null>(null)
  const seeded = useRef(false)
  const entryRef = useRef<HTMLElement | null>(null)

  // Storage stays the source of truth; the session mirror carries the ledger
  // and the month being browsed so the fold hands the same view over.
  const publish = useCallback(
    (next: Budget, nextMonth?: string) => {
      const target = nextMonth ?? month
      if (target !== month) setMonth(target)
      const serialized = serializeBudget(next)
      pending.current = serialized
      void stored.set(serialized)
      mirror.set(serializeMirror(ME, next, target))
    },
    [stored, mirror, month]
  )

  useEffect(() => {
    if (stored.value !== null) pending.current = null
  }, [stored.value])

  const goMonth = useCallback(
    (next: string) => {
      setMonth(next)
      mirror.set(serializeMirror(ME, null, next))
    },
    [mirror]
  )

  useEffect(() => {
    if (mirror.status === 'hydrating' || mirror.status === 'saving') return
    const raw = mirror.value
    if (raw !== null && raw === lastSeen.current) return
    lastSeen.current = raw
    if (!raw) {
      if (!seeded.current && stored.status === 'ready') {
        seeded.current = true
        mirror.set(serializeMirror(ME, parseBudget(stored.value), month))
      }
      return
    }
    const next = parseMirror(raw)
    if (!next || next.by === ME) return
    if (next.state !== null && next.state !== stored.value) void stored.set(next.state)
    if (next.month !== month) setMonth(next.month)
  }, [mirror.value, mirror.status, mirror, stored.value, stored.status, stored, month])

  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])

  const submit = () => {
    const bad: Errors = {}
    if (!validDay(draft.date)) bad.date = 'Pick a valid date'
    const minor = parseAmount(draft.amount)
    if (minor === null) bad.amount = 'Use numbers like 12 or 12.50'
    setErrors(bad)
    if (bad.date || bad.amount || minor === null) return
    const note = trimNote(draft.note)
    const target = monthOfDay(draft.date)
    if (editing) {
      publish(updateTx(budget, { id: editing, date: draft.date, category: draft.category, minor, note }), target)
      setEditing(null)
    } else {
      publish(addTx(budget, newTx(draft.date, draft.category, minor, note)), target)
    }
    setDraft({ date: draft.date, amount: '', category: draft.category, note: '' })
  }

  const beginEdit = (tx: Tx) => {
    setEditing(tx.id)
    setDraft({ date: tx.date, amount: minorInput(tx.minor), category: tx.category, note: tx.note })
    setErrors({})
    entryRef.current?.scrollIntoView({ block: 'nearest' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraft(freshDraft(month))
    setErrors({})
  }

  const remove = (id: string) => {
    if (editing === id) cancelEdit()
    publish(removeTx(budget, id))
  }

  const commitLimit = (category: string, text: string, input: HTMLInputElement) => {
    const minor = parseLimit(text)
    if (minor === null) {
      setLimitError(category)
      const saved = budget.limits[category]
      input.value = saved ? minorInput(saved) : ''
      return
    }
    setLimitError(null)
    publish(setLimit(budget, category, minor))
  }

  const tx = monthTx(budget.tx, month)
  const spent = spendByCategory(budget.tx, month)
  const total = totalSpend(budget.tx, month)
  const limitsTotal = totalLimits(budget.limits)
  const overTotal = limitsTotal > 0 && total > limitsTotal
  const daily = dailySpend(budget.tx, month)
  const days = daysInMonth(month)
  const isThisMonth = month === todayMonth()
  const today = todayDay()
  const chartCats = CATEGORIES.filter((c) => (spent[c.id] ?? 0) > 0 || (budget.limits[c.id] ?? 0) > 0).sort(
    (a, b) => (spent[b.id] ?? 0) - (spent[a.id] ?? 0) || (budget.limits[b.id] ?? 0) - (budget.limits[a.id] ?? 0)
  )
  const scale = Math.max(1, ...chartCats.map((c) => Math.max(spent[c.id] ?? 0, budget.limits[c.id] ?? 0)))
  const maxDaily = Math.max(1, ...daily)

  const monthNav = (
    <div {...stylex.props(styles.nav)}>
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => goMonth(shiftMonth(month, -1))}
        {...stylex.props(styles.navBtn)}
      >
        <Sym name="back" size={14} />
      </button>
      <span aria-live="polite" {...stylex.props(styles.navLabel)}>
        {monthLabel(month)}
      </span>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => goMonth(shiftMonth(month, 1))}
        {...stylex.props(styles.navBtn)}
      >
        <Sym name="forward" size={14} />
      </button>
      {!isThisMonth && (
        <button type="button" onClick={() => goMonth(todayMonth())} {...stylex.props(styles.navToday)}>
          Today
        </button>
      )}
    </div>
  )

  const hero = (
    <section {...stylex.props(styles.card, styles.hero)}>
      <span {...stylex.props(styles.kicker)}>Spent in {monthLabel(month)}</span>
      <strong {...stylex.props(styles.heroValue, !wide && styles.heroValueCover)}>
        <span {...stylex.props(styles.heroSign)}>$</span>
        {formatMinor(total)}
      </strong>
      <span {...stylex.props(styles.heroSub, overTotal && styles.overText)}>
        {limitsTotal > 0
          ? overTotal
            ? `$${formatMinor(total - limitsTotal)} over $${formatMinor(limitsTotal)} of limits`
            : `$${formatMinor(limitsTotal - total)} left of $${formatMinor(limitsTotal)}`
          : 'No monthly limits set'}
      </span>
    </section>
  )

  const entry = (
    <section ref={entryRef} {...stylex.props(styles.card, editing !== null && styles.cardEditing)}>
      <header {...stylex.props(styles.cardHead)}>
        <h2 {...stylex.props(styles.cardTitle)}>{editing ? 'Edit expense' : 'Add expense'}</h2>
        {editing !== null && <span {...stylex.props(styles.editingBadge)}>Editing</span>}
      </header>
      <div {...stylex.props(styles.fieldGrid)}>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>Date</span>
          <input
            type="date"
            aria-label="Expense date"
            aria-invalid={errors.date ? true : undefined}
            min="2000-01-01"
            max="2100-12-31"
            value={draft.date}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            {...stylex.props(styles.input, !!errors.date && styles.inputBad)}
          />
        </label>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>Amount</span>
          <div {...stylex.props(styles.amountBox, !!errors.amount && styles.inputBad)}>
            <span {...stylex.props(styles.amountSign)}>$</span>
            <input
              aria-label="Amount in dollars"
              aria-invalid={errors.amount ? true : undefined}
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              value={draft.amount}
              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              {...stylex.props(styles.amountInput)}
            />
          </div>
        </label>
      </div>
      {(errors.date || errors.amount) && (
        <p role="alert" {...stylex.props(styles.errorText)}>
          {[errors.date, errors.amount].filter(Boolean).join(' · ')}
        </p>
      )}
      <div role="radiogroup" aria-label="Category" {...stylex.props(styles.chips)}>
        {CATEGORIES.map((c) => {
          const on = draft.category === c.id
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setDraft((d) => ({ ...d, category: c.id }))}
              {...stylex.props(styles.chip, on && styles.chipOn, on && tintBg[c.tint])}
            >
              <span {...stylex.props(styles.chipIcon, !on && tintText[c.tint])}>
                <Sym name={c.icon} size={13} />
              </span>
              {c.name}
            </button>
          )
        })}
      </div>
      <input
        aria-label="Note (optional)"
        placeholder="Note (optional)"
        autoComplete="off"
        maxLength={64}
        value={draft.note}
        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        {...stylex.props(styles.input)}
      />
      <div {...stylex.props(styles.actions)}>
        <Button variant="filled" onClick={submit} xstyle={styles.grow}>
          {editing ? 'Save expense' : 'Add expense'}
        </Button>
        {editing !== null && (
          <>
            <Button onClick={cancelEdit}>Cancel</Button>
            <button type="button" onClick={() => remove(editing)} {...stylex.props(styles.deleteBtn)}>
              Delete
            </button>
          </>
        )}
      </div>
    </section>
  )

  const breakdown = (
    <section {...stylex.props(styles.card)}>
      <header {...stylex.props(styles.cardHead)}>
        <h2 {...stylex.props(styles.cardTitle)}>Breakdown</h2>
        <span {...stylex.props(styles.cardMeta)}>vs limits</span>
      </header>
      {chartCats.length === 0 ? (
        <p {...stylex.props(styles.hint)}>No spending in {monthLabel(month)} yet.</p>
      ) : (
        <div {...stylex.props(styles.bars)}>
          {chartCats.map((c) => {
            const s = spent[c.id] ?? 0
            const limit = budget.limits[c.id] ?? 0
            const over = limit > 0 && s > limit
            const base = Math.min(s, scale) / scale
            const tick = limit > 0 ? limit / scale : 0
            return (
              <div key={c.id} {...stylex.props(styles.barRow)}>
                <div {...stylex.props(styles.barMeta)}>
                  <span {...stylex.props(styles.barLabel)}>
                    <Sym name={c.icon} size={12} />
                    {c.name}
                  </span>
                  <span {...stylex.props(styles.barValue, over && styles.overText)}>
                    ${formatMinor(s)}
                    {limit > 0 ? ` / ${formatMinor(limit)}` : ''}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${c.name} spending`}
                  aria-valuemin={0}
                  aria-valuemax={limit > 0 ? limit : scale}
                  aria-valuenow={s}
                  {...stylex.props(styles.track)}
                >
                  <div {...stylex.props(styles.barFill, tintBg[c.tint], styles.barWidth(over ? tick : base))} />
                  {over && <div {...stylex.props(styles.overFill, styles.overSpan(tick, base))} />}
                  {limit > 0 && <div {...stylex.props(styles.limitTick, styles.tickAt(tick))} />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )

  const dayBars = (
    <section {...stylex.props(styles.card)}>
      <header {...stylex.props(styles.cardHead)}>
        <h2 {...stylex.props(styles.cardTitle)}>Day by day</h2>
        {isThisMonth && <span {...stylex.props(styles.cardMeta)}>Today {shortDay(todayKey())}</span>}
      </header>
      <div role="img" aria-label={`Daily spending in ${monthLabel(month)}`} {...stylex.props(styles.days)}>
        {daily.map((amount, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: each bar is the day at that position in the month
          <div key={`${month}-${i}`} {...stylex.props(styles.dayCol)}>
            <div
              title={`${shortDay(`${month}-${String(i + 1).padStart(2, '0')}`)}: $${formatMinor(amount)}`}
              {...stylex.props(
                styles.dayBar,
                amount > 0 ? styles.dayFill(amount / maxDaily) : styles.dayEmpty,
                isThisMonth && i + 1 === today && amount > 0 && styles.dayToday
              )}
            />
          </div>
        ))}
      </div>
      <div {...stylex.props(styles.dayAxis)}>
        <span>1</span>
        <span>{Math.ceil(days / 2)}</span>
        <span>{days}</span>
      </div>
    </section>
  )

  const limitsCard = (
    <section {...stylex.props(styles.card)}>
      <header {...stylex.props(styles.cardHead)}>
        <h2 {...stylex.props(styles.cardTitle)}>Monthly limits</h2>
        <span {...stylex.props(styles.cardMeta)}>0 = no cap</span>
      </header>
      <div {...stylex.props(styles.limits)}>
        {CATEGORIES.map((c) => {
          const s = spent[c.id] ?? 0
          const limit = budget.limits[c.id] ?? 0
          return (
            <div key={c.id} {...stylex.props(styles.limitRow)}>
              <span {...stylex.props(styles.limitIcon, tintBg[c.tint])}>
                <Sym name={c.icon} size={13} />
              </span>
              <span {...stylex.props(styles.limitBody)}>
                <strong {...stylex.props(styles.limitName)}>{c.name}</strong>
                <small {...stylex.props(tintText[c.tint])}>{s > 0 ? `$${formatMinor(s)} spent` : 'No spend'}</small>
              </span>
              <div {...stylex.props(styles.limitBox, limitError === c.id && styles.inputBad)}>
                <span {...stylex.props(styles.amountSign)}>$</span>
                <input
                  key={`${c.id}:${limit}`}
                  aria-label={`${c.name} monthly limit`}
                  aria-invalid={limitError === c.id ? true : undefined}
                  inputMode="decimal"
                  placeholder="None"
                  autoComplete="off"
                  defaultValue={limit > 0 ? minorInput(limit) : ''}
                  onFocus={() => setLimitError(null)}
                  onBlur={(e) => commitLimit(c.id, e.target.value, e.target)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  {...stylex.props(styles.limitInput)}
                />
              </div>
            </div>
          )
        })}
      </div>
      {limitError && <p {...stylex.props(styles.errorText)}>Limits take numbers like 400 or 400.00; 0 clears.</p>}
    </section>
  )

  const ledger = (
    <section {...stylex.props(styles.card, styles.ledgerCard)}>
      <header {...stylex.props(styles.cardHead)}>
        <h2 {...stylex.props(styles.cardTitle)}>Ledger</h2>
        <span {...stylex.props(styles.cardMeta)}>
          {tx.length === 0 ? 'Empty' : `${tx.length} ${tx.length === 1 ? 'entry' : 'entries'}`}
        </span>
      </header>
      {tx.length === 0 ? (
        <p {...stylex.props(styles.hint)}>Nothing recorded in {monthLabel(month)} yet. Add the first expense above.</p>
      ) : (
        <ul {...stylex.props(styles.txList)}>
          {tx.map((t) => {
            const c = categoryOf(t.category)
            const on = editing === t.id
            return (
              <li key={t.id} {...stylex.props(styles.txRow, on && styles.txRowEditing)}>
                <button
                  type="button"
                  aria-label={`Edit ${t.note || c.name}, $${formatMinor(t.minor)}`}
                  onClick={() => beginEdit(t)}
                  {...stylex.props(styles.txEdit)}
                >
                  <span {...stylex.props(styles.txIcon, tintBg[c.tint])}>
                    <Sym name={c.icon} size={14} />
                  </span>
                  <span {...stylex.props(styles.txBody)}>
                    <strong {...stylex.props(styles.txName)}>{t.note || c.name}</strong>
                    <small {...stylex.props(styles.txSub)}>
                      {t.note ? `${c.name} · ` : ''}
                      {shortDay(t.date)}
                    </small>
                  </span>
                  <span {...stylex.props(styles.txAmount)}>${formatMinor(t.minor)}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${t.note || c.name}`}
                  onClick={() => remove(t.id)}
                  {...stylex.props(styles.txDel)}
                >
                  <Sym name="trash" size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )

  return (
    <main ref={rootRef} {...stylex.props(dark, styles.root, !wide && styles.rootCover)}>
      <header {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>Duo Ledger</span>
          <h1 {...stylex.props(styles.title, !wide && styles.titleCover)}>Pocket Budget</h1>
        </div>
        {monthNav}
      </header>
      {wide ? (
        <div {...stylex.props(styles.stage)}>
          <div {...stylex.props(styles.col)}>
            {entry}
            {ledger}
          </div>
          <div {...stylex.props(styles.col)}>
            {hero}
            {breakdown}
            {dayBars}
            {limitsCard}
          </div>
        </div>
      ) : (
        <>
          {hero}
          {entry}
          {breakdown}
          {dayBars}
          {limitsCard}
          {ledger}
        </>
      )}
      <small role="status" {...stylex.props(styles.saved)}>
        {stored.status === 'saving'
          ? 'Saving…'
          : stored.status === 'error'
            ? `Not saved: ${stored.error}`
            : 'Synced across both displays'}
      </small>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<PocketBudget />)

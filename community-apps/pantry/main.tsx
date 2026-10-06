import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Button, Checkbox, Select, Sheet, Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, light } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { createRoot } from 'react-dom/client'
import { type Cue, cue } from './audio.ts'
import {
  addItem,
  addShop,
  badgeFor,
  cleanName,
  clearBought,
  countOut,
  type Doc,
  FILTERS,
  type Filter,
  filterItems,
  formatQty,
  type Item,
  LIST_CAP,
  LOCATIONS,
  type Location,
  locationOf,
  metaLine,
  parseDoc,
  parseMirror,
  parseQty,
  qtyText,
  removeItem,
  removeShop,
  type Sort,
  serializeDoc,
  serializeMirror,
  soonItems,
  sortItems,
  stepFor,
  stepItem,
  todayKey,
  toggleShop,
  UNITS,
  type Unit,
  USE_SOON_DAYS,
  unitOf,
  updateItem,
  validDay
} from './pantry.ts'
import { schemeDark, schemeLight, styles, toneEdge, toneText, toneTile } from './styles.ts'

// Both displays run this file as separate copies. Stock lives in os.storage
// (last writer wins, so a foreign value is always the newer settled doc and is
// adopted unconditionally); the cover/inner "where you are looking" state -
// shelf filter, search text, sort - rides os.session so a fold keeps it.
const ME = crypto.randomUUID()

type Draft = { name: string; qty: string; unit: Unit; location: Location; date: string }
type EditDraft = Draft & { id: string }
type Errors = { name?: string; qty?: string; date?: string; form?: string }
type Notice = { tone: 'good' | 'warn'; text: string }

const EMPTY_DRAFT: Draft = { name: '', qty: '', unit: 'pcs', location: 'pantry', date: '' }

// Escape belongs to the shell's go-home by default. While the edit sheet is up
// this guard cancels the sheet instead - it registers before os.connect() so it
// runs ahead of the SDK's own window-level capture listener, and it is live
// only while `sheetCancel` is set, so every other Escape still goes home.
let sheetCancel: (() => void) | null = null
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || !sheetCancel) return
    event.preventDefault()
    event.stopImmediatePropagation()
    sheetCancel()
  },
  true
)

/**
 * The kit Sheet is a non-modal dialog on purpose, so the app keeps Tab cycling
 * through this sheet's own controls and makes the rest of the screen inert at
 * the root. Scoped to this dialog's id because an outgoing Sheet stays mounted
 * for its close animation.
 */
function GuardedSheet({
  open,
  onClose,
  label,
  children
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}) {
  const dialogId = `pantry-edit-${open ? 'on' : 'off'}`
  useEffect(() => {
    if (!open) return
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      event.preventDefault()
      const dialog = document.getElementById(dialogId)
      if (!dialog) return
      const controls = [...dialog.querySelectorAll<HTMLElement>('button, input, select, [tabindex]')].filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex >= 0
      )
      if (!controls.length) {
        dialog.focus()
        return
      }
      const at = controls.indexOf(document.activeElement as HTMLElement)
      const next = event.shiftKey ? (at <= 0 ? controls.length - 1 : at - 1) : at === controls.length - 1 ? 0 : at + 1
      controls[next]!.focus()
    }
    document.addEventListener('keydown', trap, true)
    return () => document.removeEventListener('keydown', trap, true)
  }, [open, dialogId])
  return (
    <Sheet open={open} onClose={onClose} aria-label={label} id={dialogId}>
      {children}
    </Sheet>
  )
}

function Pantry() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const view = useDisplay()
  const stored = useKV(os.storage, 'pantry-v1')
  const mirror = useKV(os.session, 'pantry-view')

  // The mirror applies local writes optimistically and foreign ones
  // last-writer-wins, so the latest settled document is always stored.value -
  // no pending-write mask on the read side. docRef.current follows publishes
  // synchronously so rapid taps in one event batch stay consistent.
  const doc = parseDoc(stored.value)

  const [darkMode, setDarkMode] = useState(false)
  const [today, setToday] = useState(todayKey)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<Errors>({})
  const [notice, setNotice] = useState<Notice | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [editErrors, setEditErrors] = useState<Errors>({})
  const [confirming, setConfirming] = useState(false)
  const [shopDraft, setShopDraft] = useState({ name: '', note: '' })
  const [shopError, setShopError] = useState('')
  const [loc, setLoc] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('soon')
  // The last row this copy touched gets the gentle mount pulse.
  const [flashId, setFlashId] = useState<string | null>(null)

  const docRef = useRef(doc)
  docRef.current = doc
  const viewRef = useRef(view)
  viewRef.current = view
  const uiRef = useRef({ loc, q, sort })
  uiRef.current = { loc, q, sort }
  const noticeTimer = useRef<number | undefined>(undefined)
  const sheetTrigger = useRef<HTMLElement | null>(null)
  const mirrorWrite = useRef(mirror.set)
  mirrorWrite.current = mirror.set
  const storedWrite = useRef(stored.set)
  storedWrite.current = stored.set

  useEffect(() => os.device.on('switches', (s) => setDarkMode(s.darkMode)), [])

  // Ready is announced after the first paint, per the view contract.
  useEffect(() => {
    const frame = requestAnimationFrame(() => os.ready())
    return () => cancelAnimationFrame(frame)
  }, [])

  // View-state mirror: adopt a filter/search/sort written by the other display.
  const lastMirror = useRef<string | null>(null)
  useEffect(() => {
    if (mirror.status !== 'ready' && mirror.status !== 'saving') return
    if (mirror.value === lastMirror.current) return
    lastMirror.current = mirror.value
    const seen = parseMirror(mirror.value)
    if (seen && seen.by !== ME) {
      setLoc(seen.loc)
      setQ(seen.q)
      setSort(seen.sort)
    }
  }, [mirror.value, mirror.status])

  // Expiry ticks over at local midnight, scheduled only by the live display so
  // the hidden copy never runs a timer nobody sees.
  useEffect(() => {
    setToday(todayKey())
    if (!view.active) return
    let timer = 0
    const arm = () => {
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 3)
      timer = window.setTimeout(() => {
        setToday(todayKey())
        arm()
      }, midnight.getTime() - now.getTime())
    }
    arm()
    return () => window.clearTimeout(timer)
  }, [view.active])

  const announce = useCallback((tone: 'good' | 'warn', text: string) => {
    window.clearTimeout(noticeTimer.current)
    setNotice({ tone, text })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4500)
  }, [])

  const publish = useCallback(
    (next: Doc, snd?: Cue, note?: { tone: 'good' | 'warn'; text: string }) => {
      // docRef follows immediately so a second tap in the same event batch
      // still steps from the freshest quantity.
      docRef.current = next
      storedWrite.current(serializeDoc(next))
      if (note) announce(note.tone, note.text)
      if (snd && viewRef.current.active && !next.muted) cue(snd)
    },
    [announce]
  )

  const setView = useCallback((patch: { loc?: Filter; q?: string; sort?: Sort }) => {
    const next = { ...uiRef.current, ...patch }
    uiRef.current = next
    if (patch.loc !== undefined) setLoc(next.loc)
    if (patch.q !== undefined) setQ(next.q)
    if (patch.sort !== undefined) setSort(next.sort)
    mirrorWrite.current(serializeMirror(ME, next.loc, next.q, next.sort))
  }, [])

  // --- inventory actions ------------------------------------------------------

  const add = () => {
    const name = cleanName(draft.name)
    const milli = parseQty(draft.qty)
    const date = draft.date.trim()
    const errs: Errors = {}
    if (!name) errs.name = 'Name the ingredient'
    if (milli === null) errs.qty = 'Enter a quantity above 0 (e.g. 2 or 1.5)'
    if (date && !validDay(date)) errs.date = 'That is not a calendar day'
    setErrors(errs)
    if (Object.keys(errs).length) {
      announce('warn', 'Check the highlighted fields')
      return
    }
    const out = addItem(docRef.current, {
      name,
      milli: milli!,
      unit: draft.unit,
      location: draft.location,
      bestBefore: date || null
    })
    if (out.full) {
      setErrors({ form: 'The pantry is full; remove something first' })
      announce('warn', 'Pantry is full')
      return
    }
    const landed = out.doc.items.find((i) => i.id === out.id)
    publish(
      out.doc,
      'add',
      out.merged && landed
        ? { tone: 'good', text: `${name} topped up to ${qtyText(landed)}` }
        : { tone: 'good', text: `${name} stocked` }
    )
    setFlashId(out.id)
    setDraft({ ...EMPTY_DRAFT, unit: draft.unit, location: draft.location })
  }

  const step = (item: Item, dir: 'use' | 'restock') => {
    const out = stepItem(docRef.current, item.id, dir)
    if (out.milli === null) return
    if (out.milli === item.milli) {
      if (dir === 'use') announce('warn', `${item.name} is empty`)
      return
    }
    publish(
      out.doc,
      dir === 'use' ? 'use' : 'restock',
      out.milli === 0 ? { tone: 'warn', text: `${item.name} ran out` } : undefined
    )
    setFlashId(item.id)
  }

  const remove = (id: string) => {
    const item = docRef.current.items.find((i) => i.id === id)
    if (!item) return
    publish(removeItem(docRef.current, id), 'trash', { tone: 'warn', text: `${item.name} removed` })
  }

  // --- edit sheet --------------------------------------------------------------

  const openEdit = (item: Item) => {
    sheetTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setEditing(item)
    setEditDraft({
      id: item.id,
      name: item.name,
      qty: formatQty(item.milli),
      unit: item.unit,
      location: item.location,
      date: item.bestBefore ?? ''
    })
    setEditErrors({})
    setConfirming(false)
  }

  const closeEdit = useCallback(() => {
    setEditing(null)
    setEditDraft(null)
    setEditErrors({})
    setConfirming(false)
  }, [])

  const saveEdit = () => {
    const d = editDraft
    const base = editing
    if (!d || !base) return
    const name = cleanName(d.name)
    const milli = parseQty(d.qty, true)
    const date = d.date.trim()
    const errs: Errors = {}
    if (!name) errs.name = 'Name the ingredient'
    if (milli === null) errs.qty = 'Enter a quantity (0 marks it out of stock)'
    if (date && !validDay(date)) errs.date = 'That is not a calendar day'
    setEditErrors(errs)
    if (Object.keys(errs).length) return
    const out = updateItem(docRef.current, {
      ...base,
      name,
      milli: milli!,
      unit: d.unit,
      location: d.location,
      bestBefore: date || null
    })
    publish(out.doc, 'save', {
      tone: 'good',
      text: out.merged ? `${name} merged into its matching batch` : `${name} saved`
    })
    closeEdit()
  }

  const confirmDelete = () => {
    const id = editing?.id
    if (!id) return
    remove(id)
    closeEdit()
  }

  // Sheet wiring: the pre-connect guard gets a cancel callback only while the
  // editor is up, and focus returns to the control that opened it.
  useEffect(() => {
    sheetCancel = editDraft !== null ? closeEdit : null
    return () => {
      sheetCancel = null
    }
  }, [editDraft, closeEdit])

  useEffect(() => {
    if (editDraft !== null) return
    const el = sheetTrigger.current
    sheetTrigger.current = null
    if (!el) return
    let tries = 0
    const restore = () => {
      if (!el.isConnected) return
      el.focus()
      if (document.activeElement !== el && ++tries < 10) requestAnimationFrame(restore)
    }
    requestAnimationFrame(restore)
  }, [editDraft])

  // --- shopping list --------------------------------------------------------------

  const addShopItem = () => {
    const name = cleanName(shopDraft.name)
    if (!name) {
      setShopError('Name what to buy')
      return
    }
    const out = addShop(docRef.current, name, shopDraft.note)
    if (out.full) {
      setShopError(`The list holds ${LIST_CAP} entries`)
      return
    }
    setShopError('')
    setShopDraft({ name: '', note: '' })
    publish(out.doc, 'add', { tone: 'good', text: `${name} on the list` })
  }

  const toggleBought = (id: string) => {
    const item = docRef.current.list.find((s) => s.id === id)
    if (!item) return
    publish(toggleShop(docRef.current, id), item.done ? 'uncheck' : 'check')
  }

  const dropShopItem = (id: string) => {
    const item = docRef.current.list.find((s) => s.id === id)
    if (!item) return
    publish(removeShop(docRef.current, id), 'trash', { tone: 'warn', text: `${item.name} off the list` })
  }

  const sweepBought = () => {
    const bought = docRef.current.list.filter((s) => s.done).length
    if (!bought) return
    publish(clearBought(docRef.current), 'trash', {
      tone: 'good',
      text: `${bought} bought ${bought === 1 ? 'item' : 'items'} cleared`
    })
  }

  // --- derived view ------------------------------------------------------------------

  const items = doc.items
  const soon = soonItems(items, today)
  const outCount = countOut(items)
  const openList = doc.list.filter((s) => !s.done).length
  const boughtList = doc.list.length - openList
  const visible = sortItems(filterItems(items, loc, q, today), sort, today)

  // --- render helpers -------------------------------------------------------------------

  const chipKeys = <T extends string>(event: ReactKeyboardEvent, ids: T[], current: T, pick: (id: T) => void) => {
    const at = ids.indexOf(current)
    let next = at
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (at + 1) % ids.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (at - 1 + ids.length) % ids.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = ids.length - 1
    else return
    event.preventDefault()
    pick(ids[next]!)
    ;(event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus()
  }

  const itemRow = (item: Item, showSteps: boolean) => {
    const badge = badgeFor(item, today)
    const l = locationOf(item.location)
    const stepText = `${formatQty(stepFor(item.unit))} ${unitOf(item.unit).name}`
    return (
      <li key={item.id} {...stylex.props(styles.row, flashId === item.id && styles.rowFlash)}>
        <span {...stylex.props(styles.tile, toneTile[l.tint], flashId === item.id && styles.tilePop)} aria-hidden>
          <Sym name={l.icon} size={15} />
        </span>
        <button
          type="button"
          {...stylex.props(styles.rowBody)}
          onClick={() => openEdit(item)}
          aria-label={`Edit ${item.name}, ${qtyText(item)}${badge ? `, ${badge.aria}` : ''}, ${l.name}`}
        >
          <span {...stylex.props(styles.rowNameWrap)}>
            <span {...stylex.props(styles.rowName)}>{item.name}</span>
            {badge && (
              <span {...stylex.props(styles.badge, toneText[badge.tone], toneEdge[badge.tone])}>{badge.text}</span>
            )}
          </span>
          <span {...stylex.props(styles.rowMeta)}>{metaLine(item, today)}</span>
        </button>
        {showSteps ? (
          <span {...stylex.props(styles.steppers)}>
            <button
              type="button"
              {...stylex.props(styles.stepBtn, item.milli === 0 && styles.stepBtnOff)}
              onClick={() => step(item, 'use')}
              aria-label={`Use ${stepText} of ${item.name}`}
            >
              <Sym name="minus" size={13} />
            </button>
            <span
              key={item.milli}
              {...stylex.props(styles.stepQty, styles.tilePop, item.milli === 0 && styles.stepQtyOut)}
            >
              {qtyText(item)}
            </span>
            <button
              type="button"
              {...stylex.props(styles.stepBtn)}
              onClick={() => step(item, 'restock')}
              aria-label={`Restock ${stepText} of ${item.name}`}
            >
              <Sym name="plus" size={13} />
            </button>
          </span>
        ) : (
          <span {...stylex.props(styles.stepQty, item.milli === 0 && styles.stepQtyOut)}>{qtyText(item)}</span>
        )}
      </li>
    )
  }

  const draftFields = (d: Draft, set: (patch: Partial<Draft>) => void, errs: Errors, idPrefix: string) => (
    <>
      <div {...stylex.props(styles.fieldGrid)}>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>Ingredient</span>
          <input
            {...stylex.props(styles.input, errs.name !== undefined && styles.inputBad)}
            id={`${idPrefix}-name`}
            value={d.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Eggs, milk, rice"
            autoComplete="off"
            maxLength={60}
            aria-invalid={errs.name !== undefined}
          />
          {errs.name && <span {...stylex.props(styles.errorText)}>{errs.name}</span>}
        </label>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>Quantity</span>
          <input
            {...stylex.props(styles.input, errs.qty !== undefined && styles.inputBad)}
            id={`${idPrefix}-qty`}
            value={d.qty}
            onChange={(e) => set({ qty: e.target.value })}
            placeholder="1"
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={errs.qty !== undefined}
          />
          {errs.qty && <span {...stylex.props(styles.errorText)}>{errs.qty}</span>}
        </label>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>Unit</span>
          <Select
            id={`${idPrefix}-unit`}
            value={d.unit}
            onChange={(e) => set({ unit: e.target.value as Unit })}
            aria-label="Quantity unit"
          >
            {UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </label>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>
            Best before <span {...stylex.props(styles.optional)}>optional</span>
          </span>
          <input
            {...stylex.props(styles.input, styles.inputDate, errs.date !== undefined && styles.inputBad)}
            id={`${idPrefix}-date`}
            type="date"
            value={d.date}
            onChange={(e) => set({ date: e.target.value })}
            aria-invalid={errs.date !== undefined}
          />
          {errs.date && <span {...stylex.props(styles.errorText)}>{errs.date}</span>}
        </label>
      </div>
      <div {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.fieldLabel)} id={`${idPrefix}-loc-label`}>
          Shelf
        </span>
        <div {...stylex.props(styles.chips)} role="radiogroup" aria-labelledby={`${idPrefix}-loc-label`}>
          {LOCATIONS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={d.location === l.id}
              tabIndex={d.location === l.id ? 0 : -1}
              {...stylex.props(styles.chip, d.location === l.id && styles.chipOn)}
              onClick={() => set({ location: l.id })}
              onKeyDown={(e) =>
                chipKeys(
                  e,
                  LOCATIONS.map((x) => x.id),
                  d.location,
                  (id) => set({ location: id })
                )
              }
            >
              <Sym name={l.icon} size={12} />
              {l.name}
            </button>
          ))}
        </div>
      </div>
    </>
  )

  const addCard = (
    <section {...stylex.props(styles.card)} aria-labelledby="pantry-add-title">
      <div {...stylex.props(styles.cardHead)}>
        <h2 {...stylex.props(styles.cardTitle)} id="pantry-add-title">
          Stock the shelf
        </h2>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
        noValidate
      >
        <div {...stylex.props(styles.formCol)}>
          {draftFields(draft, (patch) => setDraft({ ...draft, ...patch }), errors, 'add')}
          {errors.form && <p {...stylex.props(styles.errorText)}>{errors.form}</p>}
          <div {...stylex.props(styles.sheetActions)}>
            <Button type="submit" variant="filled">
              Add item
            </Button>
          </div>
        </div>
      </form>
    </section>
  )

  const soonCard = (
    <section {...stylex.props(styles.card)} aria-labelledby="pantry-soon-title">
      <div {...stylex.props(styles.cardHead)}>
        <div {...stylex.props(styles.cardTitleWrap)}>
          <Sym name="clockSym" size={14} />
          <h2 {...stylex.props(styles.cardTitle)} id="pantry-soon-title">
            Use soon
          </h2>
        </div>
        <span {...stylex.props(styles.cardMeta)}>
          {soon.length ? `${soon.length} expiring` : `within ${USE_SOON_DAYS} days`}
        </span>
      </div>
      {soon.length ? (
        <ul {...stylex.props(styles.rows)}>{soon.map((item) => itemRow(item, false))}</ul>
      ) : (
        <div {...stylex.props(styles.empty)}>
          <span {...stylex.props(styles.emptyIcon)}>
            <Sym name="checklist" size={22} />
          </span>
          <p {...stylex.props(styles.emptyTitle)}>Nothing urgent</p>
          <p {...stylex.props(styles.emptyBody)}>Dated items land here a week before their best-before day.</p>
        </div>
      )}
    </section>
  )

  const inventoryCard = (
    <section {...stylex.props(styles.card)} aria-labelledby="pantry-inv-title">
      <div {...stylex.props(styles.cardHead)}>
        <h2 {...stylex.props(styles.cardTitle)} id="pantry-inv-title">
          Inventory
        </h2>
        <span {...stylex.props(styles.cardMeta)}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
          {outCount ? ` · ${outCount} out` : ''}
        </span>
      </div>
      <div {...stylex.props(styles.searchBox)}>
        <span {...stylex.props(styles.searchIcon)} aria-hidden>
          <Sym name="search" size={13} />
        </span>
        <input
          {...stylex.props(styles.searchInput)}
          value={q}
          onChange={(e) => setView({ q: e.target.value })}
          placeholder="Search inventory"
          aria-label="Search inventory"
          autoComplete="off"
        />
        {q !== '' && (
          <button
            type="button"
            {...stylex.props(styles.searchClear)}
            onClick={() => setView({ q: '' })}
            aria-label="Clear search"
          >
            <Sym name="close" size={10} />
          </button>
        )}
      </div>
      <div {...stylex.props(styles.controlsRow)}>
        <div {...stylex.props(styles.chips)} role="radiogroup" aria-label="Filter by shelf">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={loc === f.id}
              tabIndex={loc === f.id ? 0 : -1}
              {...stylex.props(styles.chip, loc === f.id && (f.id === 'soon' ? styles.chipOnSoon : styles.chipOn))}
              onClick={() => setView({ loc: f.id })}
              onKeyDown={(e) =>
                chipKeys(
                  e,
                  FILTERS.map((x) => x.id),
                  loc,
                  (id) => setView({ loc: id })
                )
              }
            >
              {f.icon && <Sym name={f.icon} size={12} />}
              {f.name}
            </button>
          ))}
        </div>
        <span {...stylex.props(styles.grow)} />
        <span {...stylex.props(styles.segRow)} role="group" aria-label="Sort inventory">
          <button
            type="button"
            aria-pressed={sort === 'soon'}
            {...stylex.props(styles.seg, sort === 'soon' && styles.segOn)}
            onClick={() => setView({ sort: 'soon' })}
          >
            Use soon
          </button>
          <button
            type="button"
            aria-pressed={sort === 'name'}
            {...stylex.props(styles.seg, sort === 'name' && styles.segOn)}
            onClick={() => setView({ sort: 'name' })}
          >
            A-Z
          </button>
        </span>
      </div>
      {visible.length ? (
        <ul {...stylex.props(styles.rows)}>{visible.map((item) => itemRow(item, true))}</ul>
      ) : items.length ? (
        <div {...stylex.props(styles.empty)}>
          <span {...stylex.props(styles.emptyIcon)}>
            <Sym name="search" size={22} />
          </span>
          <p {...stylex.props(styles.emptyTitle)}>No matches</p>
          <p {...stylex.props(styles.emptyBody)}>Nothing on this shelf answers that search.</p>
        </div>
      ) : (
        <div {...stylex.props(styles.empty)}>
          <span {...stylex.props(styles.emptyIcon)}>
            <Sym name="stack" size={22} />
          </span>
          <p {...stylex.props(styles.emptyTitle)}>Shelves are bare</p>
          <p {...stylex.props(styles.emptyBody)}>Stock the first ingredient above.</p>
        </div>
      )}
    </section>
  )

  const shopCard = (
    <section {...stylex.props(styles.card)} aria-labelledby="pantry-shop-title">
      <div {...stylex.props(styles.cardHead)}>
        <div {...stylex.props(styles.cardTitleWrap)}>
          <Sym name="cart" size={14} />
          <h2 {...stylex.props(styles.cardTitle)} id="pantry-shop-title">
            Shopping list
          </h2>
        </div>
        <span {...stylex.props(styles.cardMeta)}>
          {doc.list.length ? `${openList} to buy${boughtList ? ` · ${boughtList} bought` : ''}` : 'clear'}
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          addShopItem()
        }}
        noValidate
      >
        <div {...stylex.props(styles.fieldRow)}>
          <label {...stylex.props(styles.field)}>
            <span {...stylex.props(styles.fieldLabel)}>Need</span>
            <input
              {...stylex.props(styles.input, shopError !== '' && styles.inputBad)}
              value={shopDraft.name}
              onChange={(e) => setShopDraft({ ...shopDraft, name: e.target.value })}
              placeholder="Olive oil"
              autoComplete="off"
              maxLength={60}
              aria-invalid={shopError !== ''}
            />
          </label>
          <label {...stylex.props(styles.field)}>
            <span {...stylex.props(styles.fieldLabel)}>
              Note <span {...stylex.props(styles.optional)}>optional</span>
            </span>
            <input
              {...stylex.props(styles.input)}
              value={shopDraft.note}
              onChange={(e) => setShopDraft({ ...shopDraft, note: e.target.value })}
              placeholder="2 bottles"
              autoComplete="off"
              maxLength={40}
            />
          </label>
          <Button type="submit" variant="filled">
            Add
          </Button>
        </div>
      </form>
      {shopError && <p {...stylex.props(styles.errorText)}>{shopError}</p>}
      {doc.list.length ? (
        <ul {...stylex.props(styles.rows)}>
          {doc.list.map((s) => (
            <li key={s.id} {...stylex.props(styles.shopRow)}>
              <span {...stylex.props(styles.shopCheck)}>
                <Checkbox
                  checked={s.done}
                  onChange={() => toggleBought(s.id)}
                  aria-label={s.done ? `${s.name} bought; tap to reopen` : `Mark ${s.name} bought`}
                />
              </span>
              <button
                type="button"
                {...stylex.props(styles.shopBody)}
                onClick={() => toggleBought(s.id)}
                aria-label={`${s.done ? 'Reopen' : 'Mark bought'}: ${s.name}`}
              >
                <span {...stylex.props(styles.rowNameWrap)}>
                  <span {...stylex.props(styles.rowName, s.done && styles.rowNameDone)}>{s.name}</span>
                  {s.done && <span {...stylex.props(styles.badge, toneText.green, toneEdge.green)}>Bought</span>}
                </span>
                {s.note !== '' && <span {...stylex.props(styles.shopNote)}>{s.note}</span>}
              </button>
              <button
                type="button"
                {...stylex.props(styles.shopDel)}
                onClick={() => dropShopItem(s.id)}
                aria-label={`Remove ${s.name} from the list`}
              >
                <Sym name="close" size={10} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div {...stylex.props(styles.empty)}>
          <span {...stylex.props(styles.emptyIcon)}>
            <Sym name="cart" size={22} />
          </span>
          <p {...stylex.props(styles.emptyTitle)}>List is clear</p>
          <p {...stylex.props(styles.emptyBody)}>Add whatever the shelves are missing.</p>
        </div>
      )}
      {boughtList > 0 && (
        <button type="button" {...stylex.props(styles.clearBtn)} onClick={sweepBought}>
          Clear bought
        </button>
      )}
    </section>
  )

  return (
    <main
      ref={rootRef}
      {...stylex.props(
        darkMode ? dark : light,
        darkMode ? schemeDark.scheme : schemeLight.scheme,
        styles.root,
        !wide && styles.rootCover
      )}
    >
      <div {...stylex.props(styles.header)} inert={editDraft !== null}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.kicker)}>Kitchen stock</span>
          <h1 {...stylex.props(styles.title, !wide && styles.titleCover)}>Pantry</h1>
          <p
            {...stylex.props(
              styles.notice,
              notice?.tone === 'good' && styles.noticeGood,
              notice?.tone === 'warn' && styles.noticeWarn
            )}
            role="status"
            aria-live="polite"
          >
            {notice ? notice.text : ' '}
          </p>
        </div>
        <button
          type="button"
          {...stylex.props(styles.muteBtn, doc.muted && styles.muteOff)}
          onClick={() =>
            publish({ ...docRef.current, muted: !docRef.current.muted }, undefined, {
              tone: 'good',
              text: docRef.current.muted ? 'Sound on' : 'Sound muted'
            })
          }
          aria-pressed={doc.muted}
          aria-label={doc.muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          <Sym name="volume" size={12} />
          {doc.muted ? 'Muted' : 'Sound'}
        </button>
      </div>
      <div inert={editDraft !== null} {...stylex.props(wide ? styles.stage : styles.col)}>
        {wide ? (
          <>
            <div {...stylex.props(styles.col)}>
              {addCard}
              {soonCard}
            </div>
            <div {...stylex.props(styles.col)}>
              {inventoryCard}
              {shopCard}
            </div>
          </>
        ) : (
          <>
            {addCard}
            {soonCard}
            {inventoryCard}
            {shopCard}
          </>
        )}
      </div>
      <GuardedSheet
        open={editDraft !== null}
        onClose={closeEdit}
        label={editing ? `Edit ${editing.name}` : 'Edit item'}
      >
        {editDraft && (
          <div {...stylex.props(styles.sheetBody)}>
            {draftFields(editDraft, (patch) => setEditDraft({ ...editDraft, ...patch }), editErrors, 'edit')}
            {confirming ? (
              <div {...stylex.props(styles.dangerZone)}>
                <p {...stylex.props(styles.dangerTitle)}>Remove {cleanName(editDraft.name) || 'this item'}?</p>
                <p {...stylex.props(styles.dangerBody)}>
                  {qtyText({ milli: parseQty(editDraft.qty, true) ?? 0, unit: editDraft.unit })} comes off the shelf.
                  This cannot be undone.
                </p>
                <div {...stylex.props(styles.sheetActions)}>
                  <Button variant="plain" onClick={() => setConfirming(false)}>
                    Keep it
                  </Button>
                  <Button
                    variant="filled"
                    onClick={confirmDelete}
                    aria-label={`Delete ${cleanName(editDraft.name) || 'item'} permanently`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div {...stylex.props(styles.sheetActions)}>
                <Button variant="plain" onClick={() => setConfirming(true)} xstyle={styles.dangerText}>
                  Delete
                </Button>
                <Button variant="tinted" onClick={closeEdit}>
                  Cancel
                </Button>
                <Button variant="filled" onClick={saveEdit}>
                  Save
                </Button>
              </div>
            )}
          </div>
        )}
      </GuardedSheet>
    </main>
  )
}

await os.connect()
createRoot(document.body).render(<Pantry />)

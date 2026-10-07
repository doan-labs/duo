import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { Button, Checkbox, Select, Sheet, Sym, useDisplay, useWide } from '@doan-labs/duo-uikit'
import { dark, light, shared } from '@doan-labs/duo-uikit/styles.ts'
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
import { admitLive } from './admission.ts'
import { type Cue, cue } from './audio.ts'
import {
  type AddMeta,
  badgeFor,
  cleanName,
  countOut,
  type Doc,
  type EditMeta,
  EMPTY_DOC,
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
  NAME_CAP,
  opAdd,
  opAddShop,
  opClearBought,
  opMute,
  opRemove,
  opRemoveShop,
  opStep,
  opToggleShop,
  opUpdate,
  parseMirror,
  parseQty,
  qtyText,
  type Sort,
  type StepMeta,
  serializeMirror,
  soonItems,
  sortItems,
  stepFor,
  todayKey,
  UNITS,
  type Unit,
  USE_SOON_DAYS,
  unitOf,
  validDay
} from './pantry.ts'
import { schemeDark, schemeLight, styles, toneEdge, toneTile } from './styles.ts'
import { type DocStore, PantrySync, type SyncStatus } from './sync.ts'

// Both displays run this file as separate copies. Stock lives in os.storage
// through PantrySync: every accepted tap becomes a replayable intent that
// survives stale watch echoes, fold transitions and the other display writing
// at the same time (see sync.ts). The cover/inner "where you are looking"
// state - shelf filter, search text, sort - rides os.session so a fold keeps it.
const ME = crypto.randomUUID()

// The engine's storage adapter: the real os.storage channel, scoped to the
// app's document key. Deterministic tests drive the same interface.
const docStore: DocStore = {
  get: () => os.storage.get('pantry-v1'),
  set: (v) => os.storage.set('pantry-v1', v).then((c) => c.rev),
  watch: (cb) =>
    os.storage.watch(0, (c) => {
      // The resync sentinel (rev -1) has no key; anything else must be ours.
      if (c.rev !== -1 && c.k !== 'pantry-v1') return
      cb({ rev: c.rev, v: c.v ?? undefined })
    })
}

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
    // Admission comes before the hidden-origin handling: a folded-away copy
    // must not consume the key at all - Escape still belongs to the shell.
    if (!admitLive(os.view, document)) return
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
      // Focus trapping is admission-gated like every other input path: a
      // forged keydown on a folded-away copy moves nothing.
      if (!admitLive(os.view, document)) return
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
  const mirror = useKV(os.session, 'pantry-view')

  // `doc` renders the engine's view document: the settled base plus this
  // copy's still-unconfirmed intents on top. The engine owns all storage
  // reads/writes; docRef mirrors it synchronously so a tap in the same event
  // batch still steps from the freshest quantity.
  const [doc, setDoc] = useState<Doc>(() => ({ ...EMPTY_DOC }))
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading')

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
  const uiRef = useRef({ loc, q, sort })
  uiRef.current = { loc, q, sort }
  const noticeTimer = useRef<number | undefined>(undefined)
  const sheetTrigger = useRef<HTMLElement | null>(null)
  const mirrorWrite = useRef(mirror.set)
  mirrorWrite.current = mirror.set
  const syncRef = useRef<PantrySync | null>(null)

  // Input, timers, audio and focus belong only to the copy the user is
  // looking at. Admission reads the SDK's synchronous `os.view` at call time,
  // never the React `view` state - that value is a render behind, so a
  // same-turn fold would admit input the shell already disowned, or deny the
  // copy that just went live. `document.visibilityState` stays supplemental:
  // it backs the painted-but-occluded iframe case, it cannot stand in for
  // current SDK activity.
  const live = useCallback(() => admitLive(os.view, document), [])
  const curDoc = () => syncRef.current?.current() ?? docRef.current

  // Engine lifecycle: one PantrySync per copy, watching the doc key.
  useEffect(() => {
    const sync = new PantrySync({
      me: ME,
      store: docStore,
      onDoc: (d) => {
        docRef.current = d
        setDoc(d)
      },
      onStatus: setSyncStatus
    })
    syncRef.current = sync
    return sync.start()
  }, [])

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

  // Expiry ticks over at local midnight, scheduled only by the live display
  // (visible AND active) so the hidden copy never runs a timer nobody sees.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the view flags are read inside live(), and the effect must re-run on fold/unfold to clear or re-arm the timer
  useEffect(() => {
    setToday(todayKey())
    if (!live()) return
    let timer = 0
    const arm = () => {
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 3)
      timer = window.setTimeout(() => {
        // Checked at execution, not just at arming: a copy folded away after
        // the timeout was set must not tick or arm another timer.
        if (!live()) return
        setToday(todayKey())
        arm()
      }, midnight.getTime() - now.getTime())
    }
    arm()
    return () => window.clearTimeout(timer)
  }, [view.active, view.visible, live])

  // Notice state and its clear timer exist only on the live copy: a hidden
  // display skips both, so the retrying recovery effect below never schedules
  // UI work where nobody is looking.
  const announce = useCallback(
    (tone: 'good' | 'warn', text: string) => {
      if (!live()) return
      window.clearTimeout(noticeTimer.current)
      setNotice({ tone, text })
      noticeTimer.current = window.setTimeout(() => setNotice(null), 4500)
    },
    [live]
  )

  // A failed drain surfaces here instead of pretending the write landed.
  useEffect(() => {
    if (syncStatus === 'retrying') announce('warn', 'Could not save - retrying')
  }, [syncStatus, announce])

  /**
   * Accept one semantic op on the live display: the engine applies it to the
   * view document now and persists it against the settled base. Returns the
   * op's accept metadata so callers can toast merge/step outcomes, or null
   * when the copy is hidden or unready and the input is rejected untouched.
   */
  const mutate = useCallback(
    (op: Parameters<PantrySync['submit']>[0]): { meta?: unknown } | null => {
      if (!live()) return null
      const sync = syncRef.current
      if (!sync) return null
      return sync.submit(op)
    },
    [live]
  )

  const play = (snd: Cue) => {
    if (live() && !curDoc().muted) cue(snd)
  }

  const setView = useCallback(
    (patch: { loc?: Filter; q?: string; sort?: Sort }) => {
      if (!live()) return
      const next = { ...uiRef.current, ...patch }
      uiRef.current = next
      if (patch.loc !== undefined) setLoc(next.loc)
      if (patch.q !== undefined) setQ(next.q)
      if (patch.sort !== undefined) setSort(next.sort)
      mirrorWrite.current(serializeMirror(ME, next.loc, next.q, next.sort))
    },
    [live]
  )

  // --- inventory actions ------------------------------------------------------

  const add = () => {
    if (!live()) return // denied events change nothing - no validation side effects
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
    const res = mutate(
      opAdd({ name, milli: milli!, unit: draft.unit, location: draft.location, bestBefore: date || null })
    )
    if (!res) return
    const meta = res.meta as AddMeta | undefined
    if (!meta || meta.id === null) {
      setErrors({ form: 'The pantry is full; remove something first' })
      announce('warn', 'Pantry is full')
      return
    }
    const landed = curDoc().items.find((i) => i.id === meta.id)
    announce('good', meta.merged && landed ? `${name} topped up to ${qtyText(landed)}` : `${name} stocked`)
    play('add')
    setFlashId(meta.id)
    setDraft({ ...EMPTY_DRAFT, unit: draft.unit, location: draft.location })
  }

  const step = (item: Item, dir: 'use' | 'restock') => {
    if (!live()) return
    const res = mutate(opStep(item.id, dir))
    if (!res) return
    const meta = res.meta as StepMeta | undefined
    const milli = meta?.milli ?? item.milli
    if (meta?.milli === null) return // row is already gone on the settled doc
    if (milli === meta?.before) {
      if (dir === 'use') announce('warn', `${item.name} is empty`)
      return
    }
    if (milli === 0) announce('warn', `${item.name} ran out`)
    play(dir === 'use' ? 'use' : 'restock')
    setFlashId(item.id)
  }

  const remove = (id: string) => {
    if (!live()) return
    const item = curDoc().items.find((i) => i.id === id)
    if (!item) return
    if (!mutate(opRemove(id))) return
    announce('warn', `${item.name} removed`)
    play('trash')
  }

  // --- edit sheet --------------------------------------------------------------

  const openEdit = (item: Item) => {
    if (!live()) return
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
    if (!live()) return
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
    const res = mutate(
      opUpdate({ ...base, name, milli: milli!, unit: d.unit, location: d.location, bestBefore: date || null })
    )
    if (!res) return
    const meta = res.meta as EditMeta | undefined
    if (meta?.gone) announce('warn', `${name} was already removed`)
    else {
      announce('good', meta?.merged ? `${name} merged into its matching batch` : `${name} updated`)
      play('save')
    }
    closeEdit()
  }

  const confirmDelete = () => {
    if (!live()) return
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
    // Denied copies schedule no focus work at all: the gate runs before the
    // first frame is requested, not just inside the callback.
    if (!el || !live()) return
    let tries = 0
    const restore = () => {
      // Only the live display may take focus - a copy that was folded away
      // mid-restore must not steal it back from the active one.
      if (!el.isConnected || !live()) return
      el.focus()
      if (document.activeElement !== el && ++tries < 10) requestAnimationFrame(restore)
    }
    requestAnimationFrame(restore)
  }, [editDraft, live])

  // --- shopping list --------------------------------------------------------------

  const addShopItem = () => {
    if (!live()) return
    const name = cleanName(shopDraft.name)
    if (!name) {
      setShopError('Name what to buy')
      return
    }
    const res = mutate(opAddShop(name, shopDraft.note))
    if (!res) return
    const meta = res.meta as { id: string | null } | undefined
    if (!meta || meta.id === null) {
      setShopError(`The list holds ${LIST_CAP} entries`)
      return
    }
    setShopError('')
    setShopDraft({ name: '', note: '' })
    announce('good', `${name} on the list`)
    play('add')
  }

  const toggleBought = (id: string) => {
    if (!live()) return
    const item = curDoc().list.find((s) => s.id === id)
    if (!item) return
    if (!mutate(opToggleShop(id))) return
    play(item.done ? 'uncheck' : 'check')
  }

  const dropShopItem = (id: string) => {
    if (!live()) return
    const item = curDoc().list.find((s) => s.id === id)
    if (!item) return
    if (!mutate(opRemoveShop(id))) return
    announce('warn', `${item.name} off the list`)
    play('trash')
  }

  const sweepBought = () => {
    if (!live()) return
    const bought = curDoc().list.filter((s) => s.done).length
    if (!bought) return
    if (!mutate(opClearBought())) return
    announce('good', `${bought} bought ${bought === 1 ? 'item' : 'items'} cleared`)
    play('trash')
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
    if (!live()) return // denied keys move neither state nor focus
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
          {...stylex.props(styles.rowBody, shared.press, styles.pressCalm)}
          onClick={() => openEdit(item)}
          aria-label={`Edit ${item.name}, ${qtyText(item)}${badge ? `, ${badge.aria}` : ''}, ${l.name}`}
        >
          <span {...stylex.props(styles.rowNameWrap)}>
            <span {...stylex.props(styles.rowName)}>{item.name}</span>
          </span>
          <span {...stylex.props(styles.rowMetaWrap)}>
            <span {...stylex.props(styles.rowMeta)}>{metaLine(item, today)}</span>
            {badge && (
              <span {...stylex.props(styles.badge, toneEdge[badge.tone])}>
                <span {...stylex.props(styles.badgeDot, toneTile[badge.tone])} aria-hidden />
                {badge.text}
              </span>
            )}
          </span>
        </button>
        {showSteps ? (
          <span {...stylex.props(styles.steppers)}>
            <button
              type="button"
              {...stylex.props(styles.stepBtn, shared.press, styles.pressCalm, item.milli === 0 && styles.stepBtnOff)}
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
              {...stylex.props(styles.stepBtn, shared.press, styles.pressCalm)}
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

  // Errors clear as soon as the field they flag changes, not on the next submit.
  const stripErrors = (patch: Partial<Draft>, setter: (fn: (prev: Errors) => Errors) => void) => {
    setter((prev) => {
      const next = { ...prev }
      for (const key of ['name', 'qty', 'date', 'form'] as const) {
        if (key === 'form' || patch[key] !== undefined) delete next[key]
      }
      return next
    })
  }

  // Enter inside a field submits: the app iframe sandbox has no allow-forms
  // token, so real form submission never fires.
  const enterKey = (onEnter: () => void) => (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEnter()
    }
  }

  const draftFields = (
    d: Draft,
    set: (patch: Partial<Draft>) => void,
    errs: Errors,
    idPrefix: string,
    onEnter: () => void
  ) => (
    <>
      <div {...stylex.props(styles.fieldGrid)}>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>Ingredient</span>
          <input
            {...stylex.props(styles.input, errs.name !== undefined && styles.inputBad)}
            id={`${idPrefix}-name`}
            value={d.name}
            onChange={(e) => set({ name: e.target.value })}
            onKeyDown={enterKey(onEnter)}
            maxLength={NAME_CAP}
            placeholder="Eggs, milk, rice"
            autoComplete="off"
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
            onKeyDown={enterKey(onEnter)}
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
            xstyle={styles.select44}
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
            onKeyDown={enterKey(onEnter)}
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
              {...stylex.props(styles.chip, shared.press, styles.pressCalm, d.location === l.id && styles.chipOn)}
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
      <div {...stylex.props(styles.formCol)}>
        {draftFields(
          draft,
          (patch) => {
            if (!live()) return
            setDraft({ ...draft, ...patch })
            stripErrors(patch, setErrors)
          },
          errors,
          'add',
          add
        )}
        {errors.form && <p {...stylex.props(styles.errorText)}>{errors.form}</p>}
        <div {...stylex.props(styles.sheetActions)}>
          <Button type="button" variant="filled" onClick={add} xstyle={styles.btnH}>
            Add item
          </Button>
        </div>
      </div>
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
            {...stylex.props(styles.searchClear, shared.press, styles.pressCalm)}
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
              {...stylex.props(
                styles.chip,
                shared.press,
                styles.pressCalm,
                loc === f.id && (f.id === 'soon' ? styles.chipOnSoon : styles.chipOn)
              )}
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
            {...stylex.props(styles.seg, shared.press, styles.pressCalm, sort === 'soon' && styles.segOn)}
            onClick={() => setView({ sort: 'soon' })}
          >
            Use soon
          </button>
          <button
            type="button"
            aria-pressed={sort === 'name'}
            {...stylex.props(styles.seg, shared.press, styles.pressCalm, sort === 'name' && styles.segOn)}
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
      <div {...stylex.props(styles.fieldRow)}>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>Need</span>
          <input
            {...stylex.props(styles.input, shopError !== '' && styles.inputBad)}
            value={shopDraft.name}
            onChange={(e) => {
              if (!live()) return
              setShopDraft({ ...shopDraft, name: e.target.value })
              setShopError('')
            }}
            onKeyDown={enterKey(addShopItem)}
            placeholder="Olive oil"
            autoComplete="off"
            maxLength={NAME_CAP}
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
            onChange={(e) => {
              if (!live()) return
              setShopDraft({ ...shopDraft, note: e.target.value })
            }}
            onKeyDown={enterKey(addShopItem)}
            placeholder="2 bottles"
            autoComplete="off"
            maxLength={40}
          />
        </label>
        <Button type="button" variant="filled" onClick={addShopItem} xstyle={styles.btnH}>
          Add
        </Button>
      </div>
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
                {...stylex.props(styles.shopBody, shared.press, styles.pressCalm)}
                onClick={() => toggleBought(s.id)}
                aria-label={`${s.done ? 'Reopen' : 'Mark bought'}: ${s.name}`}
              >
                <span {...stylex.props(styles.rowNameWrap)}>
                  <span {...stylex.props(styles.rowName, s.done && styles.rowNameDone)}>{s.name}</span>
                </span>
                <span {...stylex.props(styles.rowMetaWrap)}>
                  {s.done && (
                    <span {...stylex.props(styles.badge, toneEdge.green)}>
                      <span {...stylex.props(styles.badgeDot, toneTile.green)} aria-hidden />
                      Bought
                    </span>
                  )}
                  {s.note !== '' && <span {...stylex.props(styles.shopNote)}>{s.note}</span>}
                </span>
              </button>
              <button
                type="button"
                {...stylex.props(styles.shopDel, shared.press, styles.pressCalm)}
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
        <button type="button" {...stylex.props(styles.clearBtn, shared.press, styles.pressCalm)} onClick={sweepBought}>
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
            {notice ? notice.text : syncStatus === 'retrying' ? 'Could not save - retrying' : ' '}
          </p>
        </div>
        <button
          type="button"
          {...stylex.props(styles.muteBtn, shared.press, styles.pressCalm, doc.muted && styles.muteOff)}
          onClick={() => {
            const res = mutate(opMute(!curDoc().muted))
            if (res) announce('good', curDoc().muted ? 'Sound muted' : 'Sound on')
          }}
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
            {draftFields(
              editDraft,
              (patch) => {
                if (!live()) return
                setEditDraft({ ...editDraft, ...patch })
                stripErrors(patch, setEditErrors)
              },
              editErrors,
              'edit',
              saveEdit
            )}
            {confirming ? (
              <div {...stylex.props(styles.dangerZone)}>
                <p {...stylex.props(styles.dangerTitle)}>Remove {cleanName(editDraft.name) || 'this item'}?</p>
                <p {...stylex.props(styles.dangerBody)}>
                  {qtyText({ milli: parseQty(editDraft.qty, true) ?? 0, unit: editDraft.unit })} comes off the shelf.
                  This cannot be undone.
                </p>
                <div {...stylex.props(styles.sheetActions)}>
                  {/* Keep lands focus first: the armed-delete state should hand the
                      safe choice to the finger, not the destructive one. */}
                  <Button variant="plain" autoFocus onClick={() => setConfirming(false)} xstyle={styles.btnH}>
                    Keep it
                  </Button>
                  <Button
                    variant="filled"
                    onClick={confirmDelete}
                    xstyle={styles.btnH}
                    aria-label={`Delete ${cleanName(editDraft.name) || 'item'} permanently`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div {...stylex.props(styles.sheetActions)}>
                <Button
                  variant="plain"
                  onClick={() => live() && setConfirming(true)}
                  xstyle={[styles.dangerText, styles.btnH]}
                >
                  Delete
                </Button>
                <Button variant="tinted" onClick={closeEdit} xstyle={styles.btnH}>
                  Cancel
                </Button>
                <Button variant="filled" onClick={saveEdit} xstyle={styles.btnH}>
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

// Trip Planner - an offline trip organizer. Multiple named trips with date
// ranges hold ordered day-by-day stops, transport legs, stays and a packing
// list. Everything here is user data: no feeds, no bookings, no network.
//
// Sync model: each trip is one `trip.<id>` record in os.storage, with the list
// order under `index`, so two displays editing different trips never collide.
// The two copies are separate processes; remote writes land through a raw
// snapshot+watch port feed (useSpace below), which keeps working while a copy
// is folded away - useKV's view-transition gate would freeze a hidden copy's
// state instead. Session keys carry the shared screen (ui), the in-flight
// editor (draft) and the undo slot, so the fold and a relaunch restore the
// same place with the same work.
import { type KV, os } from '@doan-labs/duo-sdk'
import {
  Button,
  Checkbox,
  IconButton,
  Menu,
  type MenuEntry,
  Placeholder,
  Push,
  Screen,
  Select,
  Sheet,
  Sym,
  Text,
  TextField,
  Title,
  useDisplay,
  usePresence,
  useWide
} from '@doan-labs/duo-uikit'
import { animations, dark, light, shared } from '@doan-labs/duo-uikit/styles.ts'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import {
  type ComponentProps,
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { createRoot } from 'react-dom/client'
import { cue, setCueGate, setMuted } from './audio.ts'
import { styles } from './styles.ts'
import {
  addLeg,
  addPack,
  addStay,
  addStop,
  addTrip,
  assembleLibrary,
  clampDay,
  clearPacked,
  dayCount,
  dayDate,
  dayLabel,
  diffDays,
  getTrip,
  insertLeg,
  insertPack,
  insertStay,
  insertStop,
  type Leg,
  type LegKind,
  type Library,
  legKindLabel,
  MAX_TRIP_DAYS,
  moveStop,
  newId,
  type PackItem,
  packProgress,
  parseTime,
  rangeLabel,
  removeLeg,
  removePack,
  removeStay,
  removeStop,
  removeTrip,
  restoreTrip,
  type Stay,
  type Stop,
  serializeIndex,
  serializeTrip,
  shortDay,
  stopsForDay,
  type Trip,
  timeLabel,
  todayIndex,
  todayISO,
  togglePack,
  tripStatus,
  unscheduled,
  updateLeg,
  updateStay,
  updateStop,
  updateTrip,
  validDate
} from './trips.ts'

const ME = crypto.randomUUID()

// Registered before os.connect() so it runs ahead of the SDK's window-capture
// Escape-to-home forward: while an app sheet or menu is live, Escape cancels
// the top layer inside the app; otherwise the key still goes home.
const escapeStack: (() => void)[] = []
const pushEscape = (cancel: () => void) => {
  escapeStack.push(cancel)
  return () => {
    const i = escapeStack.indexOf(cancel)
    if (i >= 0) escapeStack.splice(i, 1)
  }
}
addEventListener(
  'keydown',
  (event) => {
    if (event.key !== 'Escape' || escapeStack.length === 0) return
    const top = escapeStack[escapeStack.length - 1]
    if (!top) return
    event.preventDefault()
    event.stopImmediatePropagation()
    top()
  },
  true
)

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
// offsetParent is null under a position:fixed ancestor in Blink, so a visible
// check has to measure rects instead of trusting the layout parent.
const focusablesIn = (box: HTMLElement) =>
  [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)

/**
 * The kit Sheet is deliberately non-modal: it focuses itself and swallows
 * Escape but leaves the page behind it tabbable. A destructive choice and an
 * editor need real modality - while `active` this trap cycles Tab among the
 * sheet's own controls and hands focus back to the element that opened it.
 */
function useFocusTrap(
  boxRef: RefObject<HTMLElement | null>,
  active: boolean,
  initial: 'first' | 'last' = 'first',
  explicitTrigger?: HTMLElement | null,
  mayFocus?: () => boolean
) {
  const trigger = useRef<HTMLElement | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref contents are read live during the trap, not captured as deps
  useEffect(() => {
    if (!active) return
    // A session-mirrored sheet exists on BOTH copies; only the visible one may
    // move DOM focus, or a folded display would steal it from the live one.
    const canFocus = mayFocus ?? (() => true)
    trigger.current = explicitTrigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const box = boxRef.current
      if (!box) return
      const els = focusablesIn(box)
      const first = els[0]
      const last = els[els.length - 1]
      if (!first || !last) return
      const at = document.activeElement
      if (e.shiftKey ? at === first || !box.contains(at) : at === last || !box.contains(at)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    const frame = requestAnimationFrame(() => {
      if (!canFocus()) return
      const els = boxRef.current ? focusablesIn(boxRef.current) : []
      ;(initial === 'last' ? els[els.length - 1] : els[0])?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey, true)
      // Restore to the control that opened the layer. If it is gone (a deleted
      // row, a closed menu), fall back to the surviving screen's stable anchor,
      // re-querying each frame so an anchor on an exiting Push sheet is skipped
      // once it detaches instead of stranding focus on BODY.
      let tries = 0
      const restore = () => {
        if (!canFocus()) return
        const el = trigger.current?.isConnected ? trigger.current : anchorFallback()
        if (!el) return
        el.focus()
        if (document.activeElement !== el && ++tries < 12) requestAnimationFrame(restore)
      }
      requestAnimationFrame(restore)
    }
  }, [active, initial])
}

/** Stable chrome buttons that survive a deleted record: the trip screen's
 * actions menu first, then any marked control, then any button. */
const anchorFallback = () =>
  document.querySelector<HTMLElement>('main [data-focus-anchor="trip"]:not([disabled])') ??
  document.querySelector<HTMLElement>('main [data-focus-anchor]:not([disabled])') ??
  document.querySelector<HTMLElement>('main button:not([disabled])')

/** A destructive confirmation: the kit card plus the modality it leaves out. */
function DestructiveSheet({
  open,
  label,
  onClose,
  restoreTo,
  mayFocus,
  xstyle,
  children
}: {
  open: boolean
  label: string
  onClose: () => void
  restoreTo?: HTMLElement | null
  mayFocus?: () => boolean
  xstyle?: stylex.StyleXStyles
  children: React.ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  useFocusTrap(box, open, 'last', restoreTo, mayFocus)
  useEffect(() => (open ? pushEscape(onClose) : undefined), [open, onClose])
  return (
    <Sheet open={open} onClose={onClose} aria-label={label} xstyle={xstyle}>
      <div ref={box} {...stylex.props(styles.confirm)}>
        {children}
      </div>
    </Sheet>
  )
}

// --- shared KV space ---------------------------------------------------------
// A raw snapshot+watch feed for one key space. Remote writes apply on the port
// message, so a folded copy keeps its truth current instead of waiting on a
// view transition that cannot run on an occluded surface. Own writes apply
// optimistically and are acknowledged (never reverted) when their event comes
// back in order; a failed write marks the space and rehydrates.

const ownsStorage = (k: string) => k === 'index' || k === 'prefs' || k.startsWith('trip.')
const ownsSession = (k: string) => k === 'ui' || k === 'draft' || k === 'undo' || k === 'confirm'

function useSpace(space: KV, owns: (k: string) => boolean) {
  const [values, setValues] = useState<Map<string, string> | null>(null)
  const [error, setError] = useState(false)
  const pending = useRef(new Map<string, (string | null)[]>())
  const queue = useRef<Promise<void>>(Promise.resolve())
  const bootRef = useRef<() => void>(() => {})

  useEffect(() => {
    let dead = false
    let off = () => {}
    const boot = async () => {
      try {
        let cursor: string | undefined
        let rev = 0
        const seen = new Map<string, string>()
        do {
          const page = await space.snapshot(cursor)
          rev = page.rev
          for (const [k, v] of page.entries) if (owns(k)) seen.set(k, v)
          cursor = page.cursor
        } while (cursor)
        if (dead) return
        setError(false)
        setValues(new Map(seen))
        off()
        off = space.watch(rev, (e) => {
          if (e.rev < 0) {
            void boot()
            return
          }
          if (!owns(e.k)) return
          const q = pending.current.get(e.k)
          if (q?.length && q[0] === e.v) {
            q.shift()
            if (!q.length) pending.current.delete(e.k)
          }
          setValues((cur) => {
            const next = new Map(cur ?? [])
            if (e.v === null) next.delete(e.k)
            else next.set(e.k, e.v)
            return next
          })
        })
      } catch {
        if (!dead) setTimeout(() => void boot(), 2000)
      }
    }
    bootRef.current = boot
    void boot()
    return () => {
      dead = true
      off()
      bootRef.current = () => {}
    }
  }, [space, owns])

  const write = useCallback(
    (k: string, v: string | null) => {
      const q = pending.current.get(k) ?? []
      q.push(v)
      pending.current.set(k, q)
      setValues((cur) => {
        const next = new Map(cur ?? [])
        if (v === null) next.delete(k)
        else next.set(k, v)
        return next
      })
      queue.current = queue.current.then(async () => {
        try {
          if (v === null) await space.del(k)
          else await space.set(k, v)
        } catch {
          // The write never landed: drop this copy's pending mask for the key
          // and re-snapshot so the display converges on the stored truth.
          pending.current.delete(k)
          setError(true)
          bootRef.current()
        }
      })
    },
    [space]
  )

  return useMemo(
    () => ({
      ready: values !== null,
      error,
      get: (k: string) => values?.get(k) ?? null,
      values,
      put: (k: string, v: string) => write(k, v),
      del: (k: string) => write(k, null),
      /** Resolves once every write queued so far has been flushed to the port. */
      settled: () => queue.current
    }),
    [values, error, write]
  )
}

// --- session wire formats -----------------------------------------------------

const TABS = ['Plan', 'Travel', 'Pack'] as const
type Tab = (typeof TABS)[number]
const tabFor = (v: unknown): Tab => (v === 'Travel' || v === 'Pack' ? v : 'Plan')

type Ui = { v: 1; tripId?: string; day?: number; sel?: string; tab: Tab; arrange?: boolean }

/**
 * The live destructive confirmation, mirrored through os.session so a fold
 * mid-confirm shows (or clears) the same sheet on the other display. `by`
 * names the copy that opened it: only that copy remembers the DOM trigger for
 * focus restore - the element itself is never persisted.
 */
type Confirm = { v: 1; kind: 'trip' | 'stop' | 'leg' | 'stay'; tripId: string; id?: string; label: string; by?: string }
const CONFIRM_KINDS = ['trip', 'stop', 'leg', 'stay'] as const

/**
 * Keeps the last non-null value mounted briefly after it clears, so a kit
 * Sheet's 200ms presence-exit never plays over an empty card.
 */
function useHeld<T>(value: T | null, ms = 260): T | null {
  const [held, setHeld] = useState<T | null>(null)
  useEffect(() => {
    if (value !== null) {
      setHeld(value)
      return
    }
    if (held === null) return
    const t = setTimeout(() => setHeld(null), ms)
    return () => clearTimeout(t)
  }, [value, held, ms])
  return value ?? held
}

function parseConfirm(raw: string | null): Confirm | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<Confirm>
    if (p.v !== 1 || typeof p.tripId !== 'string' || typeof p.label !== 'string') return null
    if (!(CONFIRM_KINDS as readonly string[]).includes(String(p.kind))) return null
    return {
      v: 1,
      kind: p.kind as Confirm['kind'],
      tripId: p.tripId,
      id: typeof p.id === 'string' ? p.id : undefined,
      label: p.label,
      by: typeof p.by === 'string' ? p.by : undefined
    }
  } catch {
    return null
  }
}

function parseUi(raw: string | null): Ui {
  const base: Ui = { v: 1, tab: 'Plan' }
  if (!raw) return base
  try {
    const p = JSON.parse(raw) as Partial<Ui>
    if (p.v !== 1) return base
    return {
      v: 1,
      tripId: typeof p.tripId === 'string' ? p.tripId : undefined,
      day: typeof p.day === 'number' && Number.isFinite(p.day) ? p.day : undefined,
      sel: typeof p.sel === 'string' ? p.sel : undefined,
      tab: tabFor(p.tab),
      arrange: p.arrange === true
    }
  } catch {
    return base
  }
}

type DraftKind = 'trip-new' | 'trip-edit' | 'stop-new' | 'stop-edit' | 'leg-new' | 'leg-edit' | 'stay-new' | 'stay-edit'

/**
 * The live editor, mirrored to os.session so it survives the fold and a
 * relaunch mid-typing. Field names are a flat union; each kind reads its own.
 * `createdId` is assigned when the draft opens so a retried or double commit
 * still names the same record. `saving` is the commit lock timestamp.
 */
type Draft = {
  v: 1
  kind: DraftKind
  tripId?: string
  entityId?: string
  createdId?: string
  saving?: number
  err?: string
  by?: string
  name?: string
  start?: string
  end?: string
  title?: string
  day?: number
  time?: string
  address?: string
  notes?: string
  kindLeg?: LegKind
  from?: string
  to?: string
  date?: string
  depart?: string
  arrive?: string
  ref?: string
  checkIn?: string
  checkOut?: string
}

const DRAFT_KINDS: readonly DraftKind[] = [
  'trip-new',
  'trip-edit',
  'stop-new',
  'stop-edit',
  'leg-new',
  'leg-edit',
  'stay-new',
  'stay-edit'
]

function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Draft
    if (p.v !== 1 || typeof p.kind !== 'string' || !DRAFT_KINDS.includes(p.kind)) return null
    return p
  } catch {
    return null
  }
}

/** Undo slot: the payload needed to restore what a delete removed. */
type Undo = {
  v: 1
  by: string
  at: number
  label: string
  kind: 'trip' | 'stop' | 'leg' | 'stay' | 'pack' | 'packs'
  tripId: string
  item?: Trip | Stop | Leg | Stay | PackItem
  items?: PackItem[]
  index?: number
  /** Recorded packing positions for a batch clear, parallel to `items`. */
  indexes?: number[]
}

function parseUndo(raw: string | null): Undo | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Undo
    if (p.v !== 1 || typeof p.by !== 'string' || typeof p.tripId !== 'string') return null
    return p
  } catch {
    return null
  }
}

function applyUndo(lib: Library, u: Undo): Library {
  const trip = getTrip(lib, u.tripId)
  switch (u.kind) {
    case 'trip':
      return u.item && !getTrip(lib, (u.item as Trip).id)
        ? restoreTrip(lib, u.item as Trip, u.index ?? lib.order.length)
        : lib
    case 'stop':
      return trip && u.item && !trip.stops.some((s) => s.id === (u.item as Stop).id)
        ? insertStop(lib, u.tripId, u.item as Stop, u.index ?? trip.stops.length)
        : lib
    case 'leg':
      return trip && u.item && !trip.legs.some((l) => l.id === (u.item as Leg).id)
        ? insertLeg(lib, u.tripId, u.item as Leg, u.index ?? trip.legs.length)
        : lib
    case 'stay':
      return trip && u.item && !trip.stays.some((s) => s.id === (u.item as Stay).id)
        ? insertStay(lib, u.tripId, u.item as Stay, u.index ?? trip.stays.length)
        : lib
    case 'pack':
      return trip && u.item && !trip.packing.some((p) => p.id === (u.item as PackItem).id)
        ? insertPack(lib, u.tripId, [u.item as PackItem], u.index === undefined ? undefined : [u.index])
        : lib
    case 'packs':
      return trip && u.items ? insertPack(lib, u.tripId, u.items, u.indexes) : lib
  }
}

// A draft whose `saving` stamp is older than this means the committing copy
// went away mid-write: any copy may clear the lock so the editor unblocks.
const SAVE_LOCK_MS = 30_000
const UNDO_MS = 8_000

const TRIP_HUES = [colors.indigo, colors.teal, colors.orange, colors.pink, colors.green, colors.purple]
const tripHue = (index: number) => TRIP_HUES[index % TRIP_HUES.length] ?? colors.indigo

/** Ids currently playing their removal fade - rows render `styles.leaving`. */
const LeavingCtx = createContext<ReadonlySet<string>>(new Set())

const LEG_ICON: Record<LegKind, ComponentProps<typeof Sym>['name']> = {
  flight: 'airplane',
  train: 'tram',
  drive: 'mapOutline',
  bus: 'bus',
  ferry: 'drop',
  walk: 'walk',
  other: 'star'
}

// --- small pieces ---------------------------------------------------------------

function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <IconButton
      name="volume"
      size={16}
      aria-label={muted ? 'Turn sound on' : 'Mute sounds'}
      aria-pressed={muted}
      onClick={onToggle}
      xstyle={[styles.hit, muted && styles.mutedIcon]}
    />
  )
}

/** One trip card on the trips list. */
function TripCard({ trip, index, today, onOpen }: { trip: Trip; index: number; today: string; onOpen: () => void }) {
  const exiting = useContext(LeavingCtx).has(trip.id)
  const days = dayCount(trip)
  const status = tripStatus(trip, today)
  const { done, total } = packProgress(trip)
  const sub = [
    `${rangeLabel(trip.start, trip.end)} · ${days} ${days === 1 ? 'day' : 'days'}`,
    trip.stops.length ? `${trip.stops.length} ${trip.stops.length === 1 ? 'stop' : 'stops'}` : null,
    total ? `${done}/${total} packed` : null
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <button
      type="button"
      onClick={onOpen}
      {...stylex.props(styles.tripCard, shared.press, styles.pressRm, animations.rise, exiting && styles.leaving)}
    >
      <span aria-hidden="true" {...stylex.props(styles.tripIcon, styles.tripTint(tripHue(index)))}>
        <Sym name="mapOutline" size={17} />
      </span>
      <span {...stylex.props(styles.tripMain)}>
        <div {...stylex.props(styles.tripName)}>{trip.name}</div>
        <div {...stylex.props(styles.tripSub)}>{sub}</div>
      </span>
      {status === 'ongoing' && <span {...stylex.props(styles.badge, styles.badgeLive)}>Now</span>}
      <Sym name="forward" size={14} />
    </button>
  )
}

/** Roving-focus radio helpers: arrows/Home/End move BOTH selection and focus
 * (per the radiogroup pattern), scrolling the new chip into view. */
function useRovingKeys<T>(
  options: readonly T[],
  selected: T,
  refs: RefObject<Map<T, HTMLButtonElement>>,
  onPick: (t: T) => void
) {
  return (e: React.KeyboardEvent) => {
    const at = options.indexOf(selected)
    let next: T | undefined
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = options[Math.min(options.length - 1, at + 1)]
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = options[Math.max(0, at - 1)]
    else if (e.key === 'Home') next = options[0]
    else if (e.key === 'End') next = options[options.length - 1]
    else return
    e.preventDefault()
    const el = refs.current.get(next!)
    el?.focus()
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    onPick(next!)
  }
}

/** The day strip: a radio group of the trip's days plus a "Later" slot. */
function DayChips({ trip, day, onPick }: { trip: Trip; day: number; onPick: (d: number) => void }) {
  const refs = useRef(new Map<number, HTMLButtonElement>())
  const n = dayCount(trip)
  const days = Array.from({ length: n }, (_, i) => i)
  const options: { d: number; label: string; sub: string }[] = days.map((i) => ({
    d: i,
    label: `Day ${i + 1}`,
    sub: shortDay(dayDate(trip, i))
  }))
  options.push({ d: -1, label: 'Later', sub: `${unscheduled(trip).length}` })
  const onKey = useRovingKeys(
    options.map((o) => o.d),
    day,
    refs,
    onPick
  )
  return (
    <div role="radiogroup" aria-label="Trip day" onKeyDown={onKey} {...stylex.props(styles.chipRow)}>
      {options.map((o) => (
        <button
          key={o.d}
          ref={(el) => {
            if (el) refs.current.set(o.d, el)
            else refs.current.delete(o.d)
          }}
          type="button"
          role="radio"
          aria-checked={o.d === day}
          tabIndex={o.d === day ? 0 : -1}
          onClick={() => {
            onPick(o.d)
            cue('move')
          }}
          {...stylex.props(styles.chip, shared.press, styles.pressRm, o.d === day && styles.chipOn)}
        >
          <span {...stylex.props(styles.chipDay)}>{o.label}</span>
          <span {...stylex.props(styles.chipDate)}>{o.sub}</span>
        </button>
      ))}
    </div>
  )
}

/** Plan/Travel/Pack switcher: the kit segmented look with 44pt targets and
 * focus-following arrows. */
function SegTabs({ options, value, onChange }: { options: readonly Tab[]; value: Tab; onChange: (v: Tab) => void }) {
  const refs = useRef(new Map<Tab, HTMLButtonElement>())
  const onKey = useRovingKeys(options, value, refs, onChange)
  return (
    <div role="radiogroup" aria-label="Trip sections" onKeyDown={onKey} {...stylex.props(styles.segTrack)}>
      {options.map((o) => (
        <button
          key={o}
          ref={(el) => {
            if (el) refs.current.set(o, el)
            else refs.current.delete(o)
          }}
          type="button"
          role="radio"
          aria-checked={o === value}
          tabIndex={o === value ? 0 : -1}
          onClick={() => onChange(o)}
          {...stylex.props(styles.segBtn, shared.press, styles.pressRm, o === value && styles.segOn)}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

/** Transport-kind radio chips inside the leg editor. */
function LegKindChips({ value, onChange }: { value: LegKind; onChange: (k: LegKind) => void }) {
  const refs = useRef(new Map<LegKind, HTMLButtonElement>())
  const onKey = useRovingKeys(LEG_KINDS_UI, value, refs, onChange)
  return (
    <div role="radiogroup" aria-label="Transport kind" onKeyDown={onKey} {...stylex.props(styles.kindChips)}>
      {LEG_KINDS_UI.map((k) => (
        <button
          key={k}
          ref={(el) => {
            if (el) refs.current.set(k, el)
            else refs.current.delete(k)
          }}
          type="button"
          role="radio"
          aria-checked={value === k}
          tabIndex={value === k ? 0 : -1}
          onClick={() => onChange(k)}
          {...stylex.props(styles.kindChip, shared.press, styles.pressRm, value === k && styles.kindChipOn)}
        >
          <Sym name={LEG_ICON[k]} size={12} /> {legKindLabel(k)}
        </button>
      ))}
    </div>
  )
}

/**
 * One day's ordered stops on a rail. Reorder is FLIP: `beginMove` snapshots
 * row tops before the commit lands, then the layout effect eases the rows
 * that moved into their new slots.
 */
function Timeline({
  trip,
  day,
  arrange,
  isToday,
  onOpen,
  onMove
}: {
  trip: Trip
  day: number
  arrange: boolean
  isToday: boolean
  onOpen: (s: Stop) => void
  onMove: (s: Stop, toIndex: number) => void
}) {
  const stops = stopsForDay(trip, day)
  const leaving = useContext(LeavingCtx)
  const tops = useRef<Map<string, number> | null>(null)
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current = matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const capture = () => {
    const m = new Map<string, number>()
    for (const [id, el] of rowRefs.current) m.set(id, el.getBoundingClientRect().top)
    tops.current = m
  }

  useLayoutEffect(() => {
    const before = tops.current
    tops.current = null
    if (!before || reduced.current || !stops.length) return
    for (const [id, el] of rowRefs.current) {
      const was = before.get(id)
      if (was === undefined) continue
      const delta = was - el.getBoundingClientRect().top
      if (!delta) continue
      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`
      void el.offsetWidth
      el.style.transition = ''
      el.style.transform = ''
    }
  }, [stops])

  const move = (s: Stop, dir: -1 | 1) => {
    const at = stops.findIndex((x) => x.id === s.id)
    const to = at + dir
    if (to < 0 || to >= stops.length) return
    capture()
    onMove(s, to)
    cue('move')
  }

  if (!stops.length) return null
  return (
    <ol {...stylex.props(styles.tl)}>
      {stops.map((s, i) => (
        <li key={s.id} {...stylex.props(styles.tlRow)}>
          <span {...stylex.props(styles.tlTime)}>{s.time ? timeLabel(s.time) : ''}</span>
          <span aria-hidden="true" {...stylex.props(styles.tlRail)}>
            <span {...stylex.props(styles.tlLineTop, i === 0 && styles.tlLineHide)} />
            <span {...stylex.props(styles.tlDot, isToday && styles.tlDotToday)} />
            <span {...stylex.props(styles.tlLine, i === stops.length - 1 && styles.tlLineHide)} />
          </span>
          <span
            ref={(el) => {
              if (el) rowRefs.current.set(s.id, el)
              else rowRefs.current.delete(s.id)
            }}
            {...stylex.props(styles.tlCardWrap)}
          >
            {arrange ? (
              <span {...stylex.props(styles.tlCard, styles.tlCardFlat, leaving.has(s.id) && styles.leaving)}>
                <span {...stylex.props(styles.grow)}>
                  <div {...stylex.props(styles.tlTitle)}>{s.title}</div>
                  {s.address ? <div {...stylex.props(styles.tlSub)}>{s.address}</div> : null}
                </span>
                <span {...stylex.props(styles.arrangeCol)}>
                  <IconButton
                    name="up"
                    size={13}
                    aria-label={`Move ${s.title} earlier`}
                    disabled={i === 0}
                    onClick={() => move(s, -1)}
                    xstyle={styles.stepHit}
                  />
                  <IconButton
                    name="down"
                    size={13}
                    aria-label={`Move ${s.title} later`}
                    disabled={i === stops.length - 1}
                    onClick={() => move(s, 1)}
                    xstyle={styles.stepHit}
                  />
                </span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onOpen(s)}
                {...stylex.props(styles.tlCard, shared.press, styles.pressRm, leaving.has(s.id) && styles.leaving)}
              >
                <span {...stylex.props(styles.grow)}>
                  <div {...stylex.props(styles.tlTitle)}>{s.title}</div>
                  {s.address ? <div {...stylex.props(styles.tlSub)}>{s.address}</div> : null}
                </span>
                <Sym name="forward" size={13} />
              </button>
            )}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Transport + stays for the Travel tab. */
function TravelTab({
  trip,
  onNewLeg,
  onEditLeg,
  onDelLeg,
  onNewStay,
  onEditStay,
  onDelStay
}: {
  trip: Trip
  onNewLeg: () => void
  onEditLeg: (l: Leg) => void
  onDelLeg: (l: Leg) => void
  onNewStay: () => void
  onEditStay: (s: Stay) => void
  onDelStay: (s: Stay) => void
}) {
  return (
    <div {...stylex.props(styles.tabPad)}>
      <div {...stylex.props(styles.sectionTitle)}>Getting there</div>
      {trip.legs.length === 0 ? (
        <Placeholder>
          <Sym name="airplane" size={26} />
          <Text size="subheadline" color="secondary">
            No transport yet - add the flights and drives between stops.
          </Text>
        </Placeholder>
      ) : (
        <ul {...stylex.props(styles.entityList)}>
          {trip.legs.map((leg) => (
            <LegRow key={leg.id} leg={leg} onEdit={() => onEditLeg(leg)} onDel={() => onDelLeg(leg)} />
          ))}
        </ul>
      )}
      <button type="button" onClick={onNewLeg} {...stylex.props(styles.addRow, shared.press, styles.pressRm)}>
        <Sym name="plus" size={14} /> Add transport
      </button>
      <div {...stylex.props(styles.sectionTitle)}>Staying</div>
      {trip.stays.length === 0 ? (
        <Placeholder>
          <Sym name="building" size={26} />
          <Text size="subheadline" color="secondary">
            No stays yet - hotels, campsites and friends' sofas go here.
          </Text>
        </Placeholder>
      ) : (
        <ul {...stylex.props(styles.entityList)}>
          {trip.stays.map((stay) => (
            <StayRow key={stay.id} stay={stay} onEdit={() => onEditStay(stay)} onDel={() => onDelStay(stay)} />
          ))}
        </ul>
      )}
      <button type="button" onClick={onNewStay} {...stylex.props(styles.addRow, shared.press, styles.pressRm)}>
        <Sym name="plus" size={14} /> Add stay
      </button>
    </div>
  )
}

function LegRow({ leg, onEdit, onDel }: { leg: Leg; onEdit: () => void; onDel: () => void }) {
  const when = [
    leg.date ? shortDay(leg.date) : null,
    leg.depart ? timeLabel(leg.depart) : null,
    leg.arrive ? `to ${timeLabel(leg.arrive)}` : null
  ]
    .filter(Boolean)
    .join(' · ')
  const title = [leg.from, leg.to].filter(Boolean).join(' → ') || legKindLabel(leg.kind)
  const exiting = useContext(LeavingCtx).has(leg.id)
  return (
    <li {...stylex.props(styles.entityRow, exiting && styles.leaving)}>
      <button type="button" onClick={onEdit} {...stylex.props(styles.entityMain, shared.press, styles.pressRm)}>
        <span aria-hidden="true" {...stylex.props(styles.legIcon, styles.tripTint(colors.indigo))}>
          <Sym name={LEG_ICON[leg.kind]} size={15} />
        </span>
        <span {...stylex.props(styles.grow)}>
          <div {...stylex.props(styles.tlTitle)}>{title}</div>
          <div {...stylex.props(styles.tlSub)}>
            {[legKindLabel(leg.kind), when, leg.ref].filter(Boolean).join(' · ')}
          </div>
        </span>
      </button>
      <IconButton name="trash" size={13} aria-label={`Delete ${title}`} onClick={onDel} xstyle={styles.hit} />
    </li>
  )
}

function StayRow({ stay, onEdit, onDel }: { stay: Stay; onEdit: () => void; onDel: () => void }) {
  const when =
    stay.checkIn && stay.checkOut
      ? `${shortDay(stay.checkIn)} - ${shortDay(stay.checkOut)}`
      : stay.checkIn
        ? `from ${shortDay(stay.checkIn)}`
        : ''
  const exiting = useContext(LeavingCtx).has(stay.id)
  return (
    <li {...stylex.props(styles.entityRow, exiting && styles.leaving)}>
      <button type="button" onClick={onEdit} {...stylex.props(styles.entityMain, shared.press, styles.pressRm)}>
        <span aria-hidden="true" {...stylex.props(styles.legIcon, styles.tripTint(colors.teal))}>
          <Sym name="building" size={15} />
        </span>
        <span {...stylex.props(styles.grow)}>
          <div {...stylex.props(styles.tlTitle)}>{stay.name}</div>
          <div {...stylex.props(styles.tlSub)}>{[when, stay.address].filter(Boolean).join(' · ')}</div>
        </span>
      </button>
      <IconButton name="trash" size={13} aria-label={`Delete ${stay.name}`} onClick={onDel} xstyle={styles.hit} />
    </li>
  )
}

/** The packing checklist. */
function PackTab({
  trip,
  onToggle,
  onAdd,
  onRemove,
  onClear
}: {
  trip: Trip
  onToggle: (p: PackItem) => void
  onAdd: (label: string) => void
  onRemove: (p: PackItem) => void
  onClear: () => void
}) {
  const { done, total } = packProgress(trip)
  const leaving = useContext(LeavingCtx)
  const [text, setText] = useState('')
  const add = () => {
    const label = text.trim()
    if (!label) return
    setText('')
    onAdd(label)
    cue('check')
  }
  return (
    <div>
      <div {...stylex.props(styles.packHead)}>
        <div
          {...stylex.props(styles.progress)}
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Packed"
        >
          <div {...stylex.props(styles.progressFill(total ? done / total : 0))} />
        </div>
        <Text size="footnote" color="secondary">
          {total ? `${done} of ${total} packed` : 'Nothing to pack yet'}
        </Text>
      </div>
      {trip.packing.length > 0 && (
        <ul {...stylex.props(styles.packList)}>
          {trip.packing.map((p) => (
            <li key={p.id} {...stylex.props(styles.packRow, leaving.has(p.id) && styles.leaving)}>
              <label htmlFor={`pk-${p.id}`} {...stylex.props(styles.packCheck)}>
                <Checkbox
                  id={`pk-${p.id}`}
                  checked={p.done}
                  onChange={() => {
                    onToggle(p)
                    cue(p.done ? 'uncheck' : 'check')
                  }}
                  aria-label={`Packed: ${p.label}`}
                />
              </label>
              <span {...stylex.props(styles.packLabel, p.done && styles.packDone)}>{p.label}</span>
              <IconButton
                name="close"
                size={11}
                aria-label={`Remove ${p.label}`}
                onClick={() => {
                  onRemove(p)
                  cue('delete')
                }}
                xstyle={styles.hit}
              />
            </li>
          ))}
        </ul>
      )}
      <div {...stylex.props(styles.packAdd)}>
        <TextField
          value={text}
          onChange={(e) => setText((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
          placeholder="Add to the list…"
          aria-label="New packing item"
          xstyle={[styles.grow, styles.fieldCtl]}
        />
        <Button variant="tinted" onClick={add} disabled={!text.trim()} xstyle={styles.segAction}>
          Add
        </Button>
      </div>
      {done > 0 && (
        <div {...stylex.props(styles.packAdd)}>
          <Button variant="plain" onClick={onClear} xstyle={styles.segAction}>
            Clear packed items
          </Button>
        </div>
      )}
    </div>
  )
}

/** The stop readout: shared by the cover's pushed page and the inner inspector. */
function StopDetail({
  trip,
  stop,
  onEdit,
  onDelete
}: {
  trip: Trip
  stop: Stop
  onEdit: () => void
  onDelete: () => void
}) {
  const date = stop.day >= 0 ? dayDate(trip, stop.day) : null
  return (
    <div>
      <div {...stylex.props(styles.detailHero)}>
        <div {...stylex.props(styles.detailTitle)}>{stop.title}</div>
        <Text size="subheadline" color="secondary">
          {stop.day >= 0 ? `Day ${stop.day + 1}${date ? ` · ${dayLabel(date)}` : ''}` : 'Later'}
        </Text>
      </div>
      {stop.time && (
        <div {...stylex.props(styles.metaRow)}>
          <span {...stylex.props(styles.metaKey)}>Time</span>
          <span {...stylex.props(styles.metaVal)}>{timeLabel(stop.time)}</span>
        </div>
      )}
      {stop.address ? (
        <div {...stylex.props(styles.metaRow)}>
          <span {...stylex.props(styles.metaKey)}>Address</span>
          <span {...stylex.props(styles.metaVal)}>{stop.address}</span>
        </div>
      ) : null}
      {stop.notes ? (
        <div {...stylex.props(styles.metaRow)}>
          <span {...stylex.props(styles.metaKey)}>Notes</span>
          <span {...stylex.props(styles.metaVal)}>
            <div {...stylex.props(styles.notesBox)}>{stop.notes}</div>
          </span>
        </div>
      ) : null}
      <div {...stylex.props(styles.actionRow)}>
        <Button variant="tinted" onClick={onEdit} xstyle={[styles.grow, styles.minTall]}>
          Edit stop
        </Button>
        <Button variant="plain" onClick={onDelete} xstyle={[styles.minTall, styles.dangerText]}>
          Delete
        </Button>
      </div>
    </div>
  )
}

/** Trip overview shown in the inspector when no stop is selected. */
function TripOverview({
  trip,
  today,
  onEdit,
  onDelete
}: {
  trip: Trip
  today: string
  onEdit: () => void
  onDelete: () => void
}) {
  const days = dayCount(trip)
  const status = tripStatus(trip, today)
  const { done, total } = packProgress(trip)
  return (
    <div>
      <div {...stylex.props(styles.detailHero)}>
        <div {...stylex.props(styles.detailTitle)}>{trip.name}</div>
        <Text size="subheadline" color="secondary">
          {rangeLabel(trip.start, trip.end)} · {dayLabel(trip.start)}
        </Text>
        <div>
          <span {...stylex.props(styles.badge, status === 'ongoing' ? styles.badgeLive : styles.badgeCalm)}>
            {status === 'ongoing' ? 'Ongoing' : status === 'upcoming' ? 'Upcoming' : 'Past'}
          </span>
        </div>
      </div>
      <div {...stylex.props(styles.statGrid)}>
        <div {...stylex.props(styles.stat)}>
          <span {...stylex.props(styles.statNum)}>{days}</span>
          <span {...stylex.props(styles.statKey)}>{days === 1 ? 'day' : 'days'}</span>
        </div>
        <div {...stylex.props(styles.stat)}>
          <span {...stylex.props(styles.statNum)}>{trip.stops.length}</span>
          <span {...stylex.props(styles.statKey)}>stops</span>
        </div>
        <div {...stylex.props(styles.stat)}>
          <span {...stylex.props(styles.statNum)}>{trip.legs.length + trip.stays.length}</span>
          <span {...stylex.props(styles.statKey)}>travel entries</span>
        </div>
        <div {...stylex.props(styles.stat)}>
          <span {...stylex.props(styles.statNum)}>{total ? `${done}/${total}` : '0'}</span>
          <span {...stylex.props(styles.statKey)}>packed</span>
        </div>
      </div>
      {trip.notes ? (
        <div {...stylex.props(styles.metaRow)}>
          <span {...stylex.props(styles.metaVal)}>
            <div {...stylex.props(styles.notesBox)}>{trip.notes}</div>
          </span>
        </div>
      ) : null}
      <div {...stylex.props(styles.actionRow)}>
        <Button variant="tinted" onClick={onEdit} xstyle={[styles.grow, styles.minTall]}>
          Edit trip
        </Button>
        <Button variant="plain" onClick={onDelete} xstyle={[styles.minTall, styles.dangerText]}>
          Delete
        </Button>
      </div>
    </div>
  )
}

// --- editors -------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label {...stylex.props(styles.field)}>
      <span {...stylex.props(styles.fieldLabel)}>{label}</span>
      {children}
    </label>
  )
}

const EDITOR_TITLE: Record<DraftKind, string> = {
  'trip-new': 'New trip',
  'trip-edit': 'Edit trip',
  'stop-new': 'New stop',
  'stop-edit': 'Edit stop',
  'leg-new': 'Add transport',
  'leg-edit': 'Edit transport',
  'stay-new': 'Add stay',
  'stay-edit': 'Edit stay'
}

const LEG_KINDS_UI: readonly LegKind[] = ['flight', 'train', 'drive', 'bus', 'ferry', 'walk', 'other']

// --- the app -----------------------------------------------------------------------

function TripPlanner() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const view = useDisplay()
  const vis = view.visible
  const [darkMode, setDarkMode] = useState(false)
  const [today, setToday] = useState(todayISO)
  const [menuOpen, setMenuOpen] = useState(false)
  const editorBox = useRef<HTMLDivElement>(null)

  // The control that opened the current sheet - kept locally (never written
  // to session) for focus restore. The last activated control under main is
  // tracked on pointerdown/focusin so a menu item that unmounts on open still
  // names a trigger.
  const lastControl = useRef<HTMLElement | null>(null)
  const draftTrigger = useRef<HTMLElement | null>(null)
  const confirmTrigger = useRef<HTMLElement | null>(null)
  // `vis` captured per render is enough for handlers; the cue gate needs a
  // stable accessor for the audio module.
  const visRef = useRef(vis)
  visRef.current = vis
  useEffect(() => setCueGate(() => visRef.current), [])

  useEffect(() => os.device.on('switches', (s) => setDarkMode(s.darkMode)), [])

  const storage = useSpace(os.storage, ownsStorage)
  const session = useSpace(os.session, ownsSession)

  const lib = useMemo(() => {
    const records = new Map<string, string>()
    storage.ready &&
      storage.values?.forEach((v, k) => {
        if (k.startsWith('trip.')) records.set(k, v)
      })
    return assembleLibrary(storage.get('index'), records)
  }, [storage])

  const ui = useMemo(() => parseUi(session.get('ui')), [session])
  const draft = useMemo(() => parseDraft(session.get('draft')), [session])
  const undo = useMemo(() => parseUndo(session.get('undo')), [session])
  const confirm = useMemo(() => parseConfirm(session.get('confirm')), [session])
  // Held snapshots exist only for the visible copy's sheet exits - a hidden
  // copy keeps held null, so no exit timers ever arm on it.
  const viewDraft = useHeld(vis ? draft : null)
  const viewConfirm = useHeld(vis ? confirm : null)

  // Finite removal feedback: ids marked leaving render a short fade before
  // the delete write lands. libRef keeps the deferred write on latest state.
  const libRef = useRef(lib)
  libRef.current = lib
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set())
  const markLeaving = useCallback((id: string, commit: (cur: Library) => Library) => {
    setLeaving((s) => new Set(s).add(id))
    setTimeout(() => {
      setLeaving((s) => {
        const n = new Set(s)
        n.delete(id)
        return n
      })
      const cur = libRef.current
      applyLibRef.current(commit(cur), cur)
    }, 190)
  }, [])

  const prefs = useMemo(() => {
    try {
      const p = JSON.parse(storage.get('prefs') ?? '{}') as { muted?: boolean } | null
      return p && typeof p === 'object' ? p : {}
    } catch {
      return {}
    }
  }, [storage])
  const muted = prefs.muted === true

  useEffect(() => setMuted(muted), [muted])

  // Re-derive "today" whenever this copy becomes visible, so a night folded
  // over the date line still lands on the right day.
  useEffect(() => {
    if (view.visible) setToday(todayISO())
  }, [view.visible])

  // Ready: after the first hydrated frame has painted.
  const announced = useRef(false)
  useEffect(() => {
    if (announced.current || !storage.ready || !session.ready) return
    announced.current = true
    requestAnimationFrame(() => os.ready())
  }, [storage.ready, session.ready])

  // A folded-away copy must not steer shared state: every user-path write
  // (navigation, drafts, confirmations, undo, library mutations) is ignored
  // when this display is hidden. Corrective effect writes (stale save lock,
  // undo expiry, confirm whose target vanished) bypass the gate so either
  // copy can keep the space clean.
  const setUi = useCallback(
    (patch: Partial<Ui>) => {
      if (!vis) return
      const next: Ui = {
        ...parseUi(session.get('ui')),
        ...patch,
        v: 1,
        tab: tabFor(patch.tab ?? parseUi(session.get('ui')).tab)
      }
      session.put('ui', JSON.stringify(next))
    },
    [session, vis]
  )

  const setDraft = useCallback(
    (d: Draft | null) => {
      if (!vis) return
      if (d) session.put('draft', JSON.stringify(d))
      else session.del('draft')
    },
    [session, vis]
  )

  /** Apply a new library: one storage write per changed trip plus the index. */
  const applyLibRef = useRef<(n: Library, p: Library) => void>(() => {})

  /** Apply a new library: one storage write per changed trip plus the index. */
  const applyLib = useCallback(
    (next: Library, prev: Library) => {
      if (!vis) return
      const prevById = new Map(prev.trips.map((t) => [t.id, t]))
      for (const id of prev.order) if (!next.order.includes(id)) storage.del(`trip.${id}`)
      for (const t of next.trips) if (prevById.get(t.id) !== t) storage.put(`trip.${t.id}`, serializeTrip(t))
      if (next.order.join('') !== prev.order.join('')) storage.put('index', serializeIndex(next.order))
    },
    [storage, vis]
  )
  applyLibRef.current = applyLib

  const pushUndo = useCallback(
    (u: Omit<Undo, 'v' | 'by' | 'at'>) => {
      if (!vis) return
      session.put('undo', JSON.stringify({ ...u, v: 1, by: ME, at: Date.now() } satisfies Undo))
    },
    [session, vis]
  )

  const dismissUndo = useCallback(() => {
    if (!vis) return
    session.del('undo')
  }, [session, vis])

  const openConfirm = useCallback(
    (c: Omit<Confirm, 'v'>) => {
      if (!vis) return
      confirmTrigger.current = lastControl.current
      session.put('confirm', JSON.stringify({ ...c, v: 1, by: ME } satisfies Confirm))
    },
    [session, vis]
  )
  const closeConfirm = useCallback(() => {
    if (!vis) return
    session.del('confirm')
  }, [session, vis])

  const doUndo = useCallback(() => {
    if (!undo) return
    applyLib(applyUndo(lib, undo), lib)
    dismissUndo()
    cue('undo')
  }, [undo, applyLib, lib, dismissUndo])

  // One auto-dismiss timer, owned by the active/visible copy only.
  const undoAt = undo?.at
  useEffect(() => {
    if (undoAt === undefined || !view.visible) return
    const left = UNDO_MS - (Date.now() - undoAt)
    if (left <= 0) {
      session.del('undo')
      return
    }
    const t = setTimeout(() => session.del('undo'), left)
    return () => clearTimeout(t)
  }, [undoAt, view.visible, session])

  const openDraft = useCallback(
    (d: Omit<Draft, 'v'>) => {
      if (!vis) return
      draftTrigger.current = lastControl.current
      setDraft({ ...d, v: 1, by: ME })
    },
    [setDraft, vis]
  )

  const openStopNew = (trip: Trip, day: number) =>
    openDraft({
      kind: 'stop-new',
      tripId: trip.id,
      createdId: newId(),
      day,
      title: '',
      time: '',
      address: '',
      notes: ''
    })
  const openTripNew = () =>
    openDraft({ kind: 'trip-new', createdId: newId(), name: '', start: today, end: today, notes: '' })

  /** Validate + commit the current draft. The save lock prevents doubles. */
  const commitDraft = () => {
    if (!vis || !draft || draft.saving) return
    const res = buildCommit(draft, lib)
    if ('err' in res) {
      setDraft({ ...draft, err: res.err, saving: undefined })
      cue('error')
      return
    }
    const stamp = Date.now()
    setDraft({ ...draft, err: undefined, saving: stamp })
    applyLib(res.lib, lib)
    if (draft.kind === 'trip-new' && draft.createdId) setUi({ tripId: draft.createdId, day: 0 })
    void storage.settled().then(async () => {
      const cur = await os.session.get('draft').catch(() => null)
      if (parseDraft(cur)?.saving === stamp) session.del('draft')
    })
    cue('save')
  }

  // A peer's commit left a saving flag behind when its watch went quiet;
  // clear it once it is older than the lock window.
  useEffect(() => {
    if (!draft?.saving || !vis) return
    const left = SAVE_LOCK_MS - (Date.now() - draft.saving)
    if (left <= 0) {
      session.del('draft')
      return
    }
    const t = setTimeout(() => session.del('draft'), left)
    return () => clearTimeout(t)
  }, [draft?.saving, session, vis])

  // The editor only makes sense against an existing trip for edit kinds; a
  // peer that deleted the trip mid-draft gets the sheet closed cleanly.
  // Maintenance writes run even on a hidden copy, so they del directly.
  useEffect(() => {
    if (!draft || draft.saving) return
    const needsTrip = draft.kind !== 'trip-new'
    if (needsTrip && draft.tripId && !getTrip(lib, draft.tripId)) session.del('draft')
  }, [draft, lib, session])

  // A live confirm whose target disappeared (deleted on the other display, or
  // the trip itself is gone) closes instead of keeping a stale action alive.
  useEffect(() => {
    if (!confirm) return
    const t = getTrip(lib, confirm.tripId)
    const live =
      t &&
      (confirm.kind === 'trip' ||
        (confirm.kind === 'stop'
          ? t.stops.some((s) => s.id === confirm.id)
          : confirm.kind === 'leg'
            ? t.legs.some((l) => l.id === confirm.id)
            : t.stays.some((s) => s.id === confirm.id)))
    if (!live) session.del('confirm')
  }, [confirm, lib, session])

  const trip = getTrip(lib, ui.tripId)
  const day = trip ? clampDay(trip, ui.day ?? todayIndex(trip, today) ?? 0) : 0
  const selStop = trip && ui.sel ? trip.stops.find((s) => s.id === ui.sel) : undefined

  // Keep the last shown records mounted for each Push's slide-out tail.
  const lastTrip = useRef<Trip | undefined>(undefined)
  if (trip) lastTrip.current = trip
  const shownTrip = trip ?? lastTrip.current
  const lastStop = useRef<Stop | undefined>(undefined)
  if (selStop) lastStop.current = selStop
  const shownStop = selStop ?? lastStop.current

  const confirmGo = () => {
    if (!vis || !confirm) return
    const t = getTrip(lib, confirm.tripId)
    closeConfirm()
    if (!t) return
    // The row fades first; the write lands when the fade ends, against the
    // latest library so interleaved edits survive.
    const targetId = confirm.id ?? confirm.tripId
    if (confirm.kind === 'trip') {
      if (ui.tripId === t.id) setUi({ tripId: undefined, sel: undefined })
      pushUndo({ kind: 'trip', tripId: t.id, label: `Deleted "${t.name}"`, item: t, index: lib.order.indexOf(t.id) })
    } else if (confirm.kind === 'stop') {
      const s = t.stops.find((x) => x.id === confirm.id)
      if (!s) return
      if (ui.sel === s.id) setUi({ sel: undefined })
      pushUndo({ kind: 'stop', tripId: t.id, label: `Deleted "${s.title}"`, item: s, index: t.stops.indexOf(s) })
    } else if (confirm.kind === 'leg') {
      const l = t.legs.find((x) => x.id === confirm.id)
      if (!l) return
      pushUndo({
        kind: 'leg',
        tripId: t.id,
        label: `Deleted ${[l.from, l.to].filter(Boolean).join(' → ') || 'transport'}`,
        item: l,
        index: t.legs.indexOf(l)
      })
    } else {
      const s = t.stays.find((x) => x.id === confirm.id)
      if (!s) return
      pushUndo({ kind: 'stay', tripId: t.id, label: `Deleted "${s.name}"`, item: s, index: t.stays.indexOf(s) })
    }
    markLeaving(targetId, (cur) => {
      const t2 = getTrip(cur, confirm.tripId)
      if (!t2) return cur
      if (confirm.kind === 'trip') return removeTrip(cur, t2.id).lib
      if (confirm.kind === 'stop') return removeStop(cur, t2.id, confirm.id!).lib
      if (confirm.kind === 'leg') return removeLeg(cur, t2.id, confirm.id!).lib
      return removeStay(cur, t2.id, confirm.id!).lib
    })
    cue('delete')
  }

  const modalOpen = !!draft || !!confirm
  useFocusTrap(editorBox, !!draft, 'first', draft?.by === ME ? draftTrigger.current : null, () => vis)
  useEffect(() => (draft ? pushEscape(() => setDraft(null)) : undefined), [draft, setDraft])
  useEffect(() => (menuOpen ? pushEscape(() => setMenuOpen(false)) : undefined), [menuOpen])

  const mute = (m: boolean) => {
    if (!vis) return
    storage.put('prefs', JSON.stringify({ v: 1, muted: m }))
    if (!m) cue('check')
  }

  // Track the last activated control so a sheet opened from it can return
  // focus even when the control itself never took focus (Safari/Chrome mouse
  // clicks do not focus buttons) or has since unmounted.
  const rememberControl = (e: React.SyntheticEvent) => {
    const el = (e.target as HTMLElement | null)?.closest?.('button, select, input, textarea, a, [tabindex]')
    if (el instanceof HTMLElement) lastControl.current = el
  }

  const statusText = !storage.ready
    ? 'Loading…'
    : storage.error
      ? 'Not all changes may be saved'
      : muted
        ? 'Saved on this device · sounds off'
        : 'Saved on this device'

  // --- screens ------------------------------------------------------------

  const tripsScreen = (
    <div {...stylex.props(styles.stage)} data-screen="trips">
      <Title as="h1">
        Trip Planner
        <Title variant="accessory">
          <MuteButton muted={muted} onToggle={() => mute(!muted)} />
          <IconButton
            name="plus"
            aria-label="New trip"
            onClick={openTripNew}
            xstyle={styles.hit}
            data-focus-anchor="trips"
          />
        </Title>
      </Title>
      <Screen>
        {lib.trips.length === 0 ? (
          <Placeholder>
            <Sym name="mapOutline" size={32} />
            <Text size="headline" weight="semibold">
              No trips yet
            </Text>
            <Text size="subheadline" color="secondary">
              Plan the days, the travel and the packing - all offline.
            </Text>
            <Button variant="filled" onClick={openTripNew} xstyle={styles.minTall}>
              New trip
            </Button>
          </Placeholder>
        ) : (
          <div {...stylex.props(styles.listPad)}>
            {lib.trips.map((t, i) => (
              <TripCard
                key={t.id}
                trip={t}
                index={i}
                today={today}
                onOpen={() => setUi({ tripId: t.id, sel: undefined, day: undefined })}
              />
            ))}
          </div>
        )}
      </Screen>
    </div>
  )

  const tripMenu: MenuEntry[] = shownTrip
    ? [
        { label: 'Edit trip', icon: 'compose', onSelect: () => openTripEdit(shownTrip) },
        'separator',
        {
          label: 'Delete trip',
          icon: 'trash',
          name: 'Delete trip',
          onSelect: () => openConfirm({ kind: 'trip', tripId: shownTrip.id, label: shownTrip.name })
        }
      ]
    : []

  function openTripEdit(t: Trip) {
    openDraft({
      kind: 'trip-edit',
      tripId: t.id,
      entityId: t.id,
      name: t.name,
      start: t.start,
      end: t.end,
      notes: t.notes
    })
  }

  const tripScreenBody = (t: Trip) => (
    <>
      <DayChips trip={t} day={day} onPick={(d) => setUi({ day: d, sel: undefined })} />
      <div {...stylex.props(styles.tabsWrap)}>
        <SegTabs options={TABS} value={ui.tab} onChange={(v) => setUi({ tab: v })} />
        {ui.tab === 'Plan' && stopsForDay(t, day).length > 1 && (
          <Button variant="plain" onClick={() => setUi({ arrange: !ui.arrange })} xstyle={styles.segAction}>
            {ui.arrange ? 'Done' : 'Arrange'}
          </Button>
        )}
      </div>
      <Screen>
        {ui.tab === 'Plan' && (
          <div>
            {stopsForDay(t, day).length === 0 ? (
              <Placeholder>
                <Sym name="pin" size={26} />
                <Text size="subheadline" color="secondary">
                  {day === -1 ? 'No ideas parked yet.' : 'No stops this day yet.'}
                </Text>
              </Placeholder>
            ) : (
              <Timeline
                trip={t}
                day={day}
                arrange={ui.arrange === true}
                isToday={day >= 0 && dayDate(t, day) === today}
                onOpen={(s) => setUi({ sel: s.id })}
                onMove={(s, toIndex) => applyLib(moveStop(lib, t.id, s.id, day, toIndex), lib)}
              />
            )}
            <div {...stylex.props(styles.listPad)}>
              <button
                type="button"
                onClick={() => openStopNew(t, day)}
                {...stylex.props(styles.addRow, shared.press, styles.pressRm)}
              >
                <Sym name="plus" size={14} /> Add stop
              </button>
            </div>
          </div>
        )}
        {ui.tab === 'Travel' && (
          <TravelTab
            trip={t}
            onNewLeg={() =>
              openDraft({
                kind: 'leg-new',
                tripId: t.id,
                createdId: newId(),
                kindLeg: 'flight',
                from: '',
                to: '',
                date: t.start,
                depart: '',
                arrive: '',
                ref: '',
                notes: ''
              })
            }
            onEditLeg={(l) =>
              openDraft({
                kind: 'leg-edit',
                tripId: t.id,
                entityId: l.id,
                kindLeg: l.kind,
                from: l.from,
                to: l.to,
                date: l.date ?? '',
                depart: l.depart ?? '',
                arrive: l.arrive ?? '',
                ref: l.ref,
                notes: l.notes
              })
            }
            onDelLeg={(l) =>
              openConfirm({
                kind: 'leg',
                tripId: t.id,
                id: l.id,
                label: [l.from, l.to].filter(Boolean).join(' → ') || legKindLabel(l.kind)
              })
            }
            onNewStay={() =>
              openDraft({
                kind: 'stay-new',
                tripId: t.id,
                createdId: newId(),
                name: '',
                address: '',
                checkIn: t.start,
                checkOut: t.end,
                notes: ''
              })
            }
            onEditStay={(s) =>
              openDraft({
                kind: 'stay-edit',
                tripId: t.id,
                entityId: s.id,
                name: s.name,
                address: s.address,
                checkIn: s.checkIn ?? '',
                checkOut: s.checkOut ?? '',
                notes: s.notes
              })
            }
            onDelStay={(s) => openConfirm({ kind: 'stay', tripId: t.id, id: s.id, label: s.name })}
          />
        )}
        {ui.tab === 'Pack' && (
          <PackTab
            trip={t}
            onToggle={(p) => applyLib(togglePack(lib, t.id, p.id), lib)}
            onAdd={(label) => {
              const r = addPack(lib, t.id, label)
              if (r) applyLib(r.lib, lib)
            }}
            onRemove={(p) => {
              pushUndo({
                kind: 'pack',
                tripId: t.id,
                label: `Removed "${p.label}"`,
                item: p,
                index: t.packing.indexOf(p)
              })
              markLeaving(p.id, (cur) => removePack(cur, t.id, p.id).lib)
            }}
            onClear={() => {
              const res = clearPacked(lib, t.id)
              if (!res.items.length) return
              pushUndo({
                kind: 'packs',
                tripId: t.id,
                label: `Cleared ${res.items.length} packed`,
                items: res.items,
                indexes: res.indexes
              })
              for (const [i, it] of res.items.entries()) {
                setLeaving((s) => new Set(s).add(it.id))
                // One write after the fade clears all marked rows at once.
                if (i === res.items.length - 1)
                  setTimeout(() => {
                    setLeaving((s) => {
                      const n = new Set(s)
                      for (const it2 of res.items) n.delete(it2.id)
                      return n
                    })
                    const cur = libRef.current
                    applyLibRef.current(clearPacked(cur, t.id).lib, cur)
                  }, 190)
              }
            }}
          />
        )}
      </Screen>
    </>
  )

  const stopDetail = (t: Trip, s: Stop) => (
    <StopDetail
      trip={t}
      stop={s}
      onEdit={() =>
        openDraft({
          kind: 'stop-edit',
          tripId: t.id,
          entityId: s.id,
          title: s.title,
          day: s.day,
          time: s.time ?? '',
          address: s.address,
          notes: s.notes
        })
      }
      onDelete={() => openConfirm({ kind: 'stop', tripId: t.id, id: s.id, label: s.title })}
    />
  )

  const stopDetailPage = (t: Trip, s: Stop) => (
    <div {...stylex.props(styles.stage)} data-screen="stop">
      <Title as="h1">
        <IconButton
          name="back"
          size={18}
          aria-label="Back to itinerary"
          onClick={() => setUi({ sel: undefined })}
          xstyle={styles.hitStart}
        />
        <span {...stylex.props(styles.grow, styles.tripName)}>{s.title}</span>
      </Title>
      <Screen>
        <div {...stylex.props(styles.detailPad)}>{stopDetail(t, s)}</div>
      </Screen>
    </div>
  )

  const coverTrip = shownTrip ? (
    <Push
      open={!!selStop}
      sheet={shownStop ? stopDetailPage(shownTrip, shownStop) : <div {...stylex.props(styles.detailPage)} />}
    >
      <div {...stylex.props(styles.stage)} data-screen="trip">
        <Title as="h1">
          <IconButton
            name="back"
            size={18}
            aria-label="Back to trips"
            onClick={() => setUi({ tripId: undefined, sel: undefined })}
            xstyle={styles.hitStart}
          />
          <span {...stylex.props(styles.grow, styles.tripName)}>{shownTrip.name}</span>
          <Title variant="accessory" xstyle={styles.hdrAcc}>
            <MuteButton muted={muted} onToggle={() => mute(!muted)} />
            <IconButton
              name="ellipsis"
              aria-label="Trip actions"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              xstyle={styles.hit}
              data-focus-anchor="trip"
            />
          </Title>
        </Title>
        {tripScreenBody(shownTrip)}
        <div {...stylex.props(styles.menuWrap)}>
          <Menu open={menuOpen} onClose={() => setMenuOpen(false)} items={tripMenu} xstyle={styles.menuPos} />
        </div>
      </div>
    </Push>
  ) : null

  // -- render ------------------------------------------------------------------

  return (
    <LeavingCtx.Provider value={leaving}>
      <main
        ref={rootRef}
        data-app="trip-planner"
        data-display={view.width ? view.display : undefined}
        onPointerDownCapture={rememberControl}
        onFocusCapture={rememberControl}
        {...stylex.props(darkMode ? dark : light, styles.root)}
      >
        <div inert={modalOpen} {...stylex.props(styles.stage)}>
          {!storage.ready && (
            <Screen>
              <Placeholder>
                <Sym name="mapOutline" size={28} />
                <Text size="subheadline" color="secondary">
                  Loading trips…
                </Text>
              </Placeholder>
            </Screen>
          )}
          {storage.ready && !wide && (
            <Push open={!!trip} sheet={coverTrip ?? <div {...stylex.props(styles.detailPage)} />}>
              {tripsScreen}
            </Push>
          )}
          {storage.ready && wide && (
            <>
              <Title as="h1">
                <span {...stylex.props(styles.hdrText)}>Trip Planner</span>
                <Title variant="accessory" xstyle={styles.hdrAcc}>
                  {lib.trips.length > 0 && (
                    <Select
                      aria-label="Trip"
                      value={trip?.id ?? ''}
                      data-focus-anchor="trip"
                      xstyle={styles.selectCap}
                      onChange={(e) =>
                        setUi({ tripId: (e.target as HTMLSelectElement).value || undefined, sel: undefined })
                      }
                    >
                      {!trip && <option value="">Pick a trip</option>}
                      {lib.trips.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  )}
                  <MuteButton muted={muted} onToggle={() => mute(!muted)} />
                  <IconButton
                    name="plus"
                    aria-label="New trip"
                    onClick={openTripNew}
                    xstyle={styles.hit}
                    data-focus-anchor="trips"
                  />
                </Title>
              </Title>
              <div {...stylex.props(styles.split)}>
                <div {...stylex.props(styles.pane)}>
                  {trip ? (
                    tripScreenBody(trip)
                  ) : (
                    <Screen>
                      {lib.trips.length === 0 ? (
                        <Placeholder>
                          <Sym name="mapOutline" size={32} />
                          <Text size="headline" weight="semibold">
                            No trips yet
                          </Text>
                          <Text size="subheadline" color="secondary">
                            Plan the days, the travel and the packing - all offline.
                          </Text>
                          <Button variant="filled" onClick={openTripNew} xstyle={styles.minTall}>
                            New trip
                          </Button>
                        </Placeholder>
                      ) : (
                        <div {...stylex.props(styles.listPad)}>
                          {lib.trips.map((t, i) => (
                            <TripCard
                              key={t.id}
                              trip={t}
                              index={i}
                              today={today}
                              onOpen={() => setUi({ tripId: t.id, sel: undefined, day: undefined })}
                            />
                          ))}
                        </div>
                      )}
                    </Screen>
                  )}
                </div>
                <div {...stylex.props(styles.rail)}>
                  <div {...stylex.props(styles.railHead)}>
                    <span {...stylex.props(styles.railTitle)}>{selStop && trip ? 'Stop' : 'Details'}</span>
                  </div>
                  <div {...stylex.props(styles.railBody)}>
                    {trip ? (
                      selStop ? (
                        stopDetail(trip, selStop)
                      ) : (
                        <TripOverview
                          trip={trip}
                          today={today}
                          onEdit={() => openTripEdit(trip)}
                          onDelete={() => openConfirm({ kind: 'trip', tripId: trip.id, label: trip.name })}
                        />
                      )
                    ) : (
                      <Placeholder>
                        <Sym name="map" size={26} />
                        <Text size="subheadline" color="secondary">
                          {lib.trips.length ? 'Pick a trip to see its details.' : 'Create a trip to get started.'}
                        </Text>
                      </Placeholder>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          <div {...stylex.props(styles.status)}>{statusText}</div>
        </div>

        {/* Sheets and the toast mount only on the visible copy: a folded-away
         * display must not run their presence timers, focus work or Escape. */}
        {vis ? <UndoToast undo={undo} onUndo={doUndo} onDismiss={dismissUndo} /> : null}

        {vis && (
          <Sheet
            open={!!draft}
            onClose={() => setDraft(null)}
            aria-label={viewDraft ? EDITOR_TITLE[viewDraft.kind] : 'Editor'}
            xstyle={styles.sheetCard}
          >
            <div ref={editorBox} {...stylex.props(styles.sheetBody)}>
              <div {...stylex.props(styles.sheetHead)}>
                <span {...stylex.props(styles.sheetTitle)}>{viewDraft ? EDITOR_TITLE[viewDraft.kind] : ''}</span>
                <IconButton
                  name="close"
                  size={13}
                  aria-label="Close editor"
                  onClick={() => setDraft(null)}
                  xstyle={styles.stepHit}
                />
              </div>
              {/* inert while the sheet is exiting: the held snapshot is for
               * pixels only, it must not take input or a stray write. */}
              <div {...stylex.props(styles.sheetScroll)} inert={!draft ? true : undefined}>
                {viewDraft && (
                  <EditorFields
                    draft={viewDraft}
                    trip={viewDraft.tripId ? getTrip(lib, viewDraft.tripId) : undefined}
                    setDraft={(d) => {
                      if (draft) setDraft(d)
                    }}
                  />
                )}
                {viewDraft?.err && (
                  <div role="alert" {...stylex.props(styles.errorText)}>
                    {viewDraft.err}
                  </div>
                )}
              </div>
              <div {...stylex.props(styles.actionPad)}>
                <div {...stylex.props(styles.actionRow)}>
                  <Button variant="tinted" onClick={() => setDraft(null)} xstyle={styles.actionBtn}>
                    Cancel
                  </Button>
                  <Button variant="filled" onClick={commitDraft} disabled={!!draft?.saving} xstyle={styles.actionBtn}>
                    {draft?.saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </Sheet>
        )}

        {vis && (
          <DestructiveSheet
            open={!!confirm}
            label={viewConfirm ? `Delete ${viewConfirm.label}` : 'Delete'}
            onClose={closeConfirm}
            restoreTo={confirm?.by === ME ? confirmTrigger.current : null}
            mayFocus={() => vis}
            xstyle={styles.sheetCard}
          >
            {viewConfirm && (
              <>
                <span {...stylex.props(styles.confirmTitle)}>
                  {viewConfirm.kind === 'trip'
                    ? 'Delete trip?'
                    : viewConfirm.kind === 'stop'
                      ? 'Delete stop?'
                      : viewConfirm.kind === 'leg'
                        ? 'Delete transport?'
                        : 'Delete stay?'}
                </span>
                <span {...stylex.props(styles.confirmBody)}>
                  {viewConfirm.kind === 'trip'
                    ? `"${viewConfirm.label}" and all its stops, travel and packing go away. You can undo right after.`
                    : `"${viewConfirm.label}" is removed. You can undo right after.`}
                </span>
                <div {...stylex.props(styles.actionRow)}>
                  <Button variant="tinted" onClick={closeConfirm} xstyle={styles.actionBtn}>
                    Cancel
                  </Button>
                  <Button variant="filled" onClick={confirmGo} xstyle={[styles.actionBtn, styles.dangerFill]}>
                    Delete
                  </Button>
                </div>
              </>
            )}
          </DestructiveSheet>
        )}
      </main>
    </LeavingCtx.Provider>
  )
}

/** Editor fields per draft kind, driven off the shared session draft. */
function EditorFields({ draft, trip, setDraft }: { draft: Draft; trip?: Trip; setDraft: (d: Draft) => void }) {
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch, err: undefined })
  const tf = (v: string | undefined) => v ?? ''
  switch (draft.kind) {
    case 'trip-new':
    case 'trip-edit':
      return (
        <>
          <Field label="Name">
            <TextField
              value={tf(draft.name)}
              onChange={(e) => set({ name: (e.target as HTMLInputElement).value })}
              placeholder="Kyoto in autumn"
              xstyle={styles.fieldCtl}
            />
          </Field>
          <div {...stylex.props(styles.fieldRow)}>
            <Field label="Starts">
              <input
                type="date"
                value={tf(draft.start)}
                onChange={(e) => set({ start: (e.target as HTMLInputElement).value })}
                {...stylex.props(styles.dateInput)}
              />
            </Field>
            <Field label="Ends">
              <input
                type="date"
                value={tf(draft.end)}
                onChange={(e) => set({ end: (e.target as HTMLInputElement).value })}
                {...stylex.props(styles.dateInput)}
              />
            </Field>
          </div>
          <Field label="Notes">
            <TextField
              multiline
              value={tf(draft.notes)}
              onChange={(e) => set({ notes: (e.target as HTMLInputElement).value })}
              placeholder="Anything to remember"
            />
          </Field>
        </>
      )
    case 'stop-new':
    case 'stop-edit': {
      const n = trip ? dayCount(trip) : 1
      return (
        <>
          <Field label="Stop">
            <TextField
              value={tf(draft.title)}
              onChange={(e) => set({ title: (e.target as HTMLInputElement).value })}
              placeholder="Fushimi Inari shrine"
              xstyle={styles.fieldCtl}
            />
          </Field>
          <div {...stylex.props(styles.fieldRow)}>
            <Field label="Day">
              <Select
                value={String(draft.day ?? 0)}
                onChange={(e) => set({ day: Number((e.target as HTMLSelectElement).value) })}
                aria-label="Day"
                xstyle={styles.fieldCtl}
              >
                {[...Array(n).keys()].map((d) => (
                  <option key={d} value={d}>
                    Day {d + 1}
                    {trip ? ` · ${shortDay(dayDate(trip, d))}` : ''}
                  </option>
                ))}
                <option value={-1}>Later</option>
              </Select>
            </Field>
            <Field label="Time (optional)">
              <input
                type="time"
                value={tf(draft.time)}
                onChange={(e) => set({ time: (e.target as HTMLInputElement).value })}
                {...stylex.props(styles.dateInput)}
              />
            </Field>
          </div>
          <Field label="Address">
            <TextField
              value={tf(draft.address)}
              onChange={(e) => set({ address: (e.target as HTMLInputElement).value })}
              placeholder="68 Fukakusa Yabunouchicho"
              xstyle={styles.fieldCtl}
            />
          </Field>
          <Field label="Notes">
            <TextField
              multiline
              value={tf(draft.notes)}
              onChange={(e) => set({ notes: (e.target as HTMLInputElement).value })}
              placeholder="Tickets, tips, what to see"
            />
          </Field>
        </>
      )
    }
    case 'leg-new':
    case 'leg-edit':
      return (
        <>
          <LegKindChips value={draft.kindLeg ?? 'flight'} onChange={(k) => set({ kindLeg: k })} />
          <div {...stylex.props(styles.fieldRow)}>
            <Field label="From">
              <TextField
                value={tf(draft.from)}
                onChange={(e) => set({ from: (e.target as HTMLInputElement).value })}
                placeholder="SFO"
                xstyle={styles.fieldCtl}
              />
            </Field>
            <Field label="To">
              <TextField
                value={tf(draft.to)}
                onChange={(e) => set({ to: (e.target as HTMLInputElement).value })}
                placeholder="KIX"
                xstyle={styles.fieldCtl}
              />
            </Field>
          </div>
          <div {...stylex.props(styles.fieldRow)}>
            <Field label="Date">
              <input
                type="date"
                value={tf(draft.date)}
                onChange={(e) => set({ date: (e.target as HTMLInputElement).value })}
                {...stylex.props(styles.dateInput)}
              />
            </Field>
            <Field label="Departs">
              <input
                type="time"
                value={tf(draft.depart)}
                onChange={(e) => set({ depart: (e.target as HTMLInputElement).value })}
                {...stylex.props(styles.dateInput)}
              />
            </Field>
            <Field label="Arrives">
              <input
                type="time"
                value={tf(draft.arrive)}
                onChange={(e) => set({ arrive: (e.target as HTMLInputElement).value })}
                {...stylex.props(styles.dateInput)}
              />
            </Field>
          </div>
          <Field label="Reference">
            <TextField
              value={tf(draft.ref)}
              onChange={(e) => set({ ref: (e.target as HTMLInputElement).value })}
              placeholder="Confirmation or flight no."
              xstyle={styles.fieldCtl}
            />
          </Field>
          <Field label="Notes">
            <TextField
              multiline
              value={tf(draft.notes)}
              onChange={(e) => set({ notes: (e.target as HTMLInputElement).value })}
            />
          </Field>
        </>
      )
    case 'stay-new':
    case 'stay-edit':
      return (
        <>
          <Field label="Name">
            <TextField
              value={tf(draft.name)}
              onChange={(e) => set({ name: (e.target as HTMLInputElement).value })}
              placeholder="Hotel Granvia"
              xstyle={styles.fieldCtl}
            />
          </Field>
          <Field label="Address">
            <TextField
              value={tf(draft.address)}
              onChange={(e) => set({ address: (e.target as HTMLInputElement).value })}
              placeholder="Kyoto Station"
              xstyle={styles.fieldCtl}
            />
          </Field>
          <div {...stylex.props(styles.fieldRow)}>
            <Field label="Check in">
              <input
                type="date"
                value={tf(draft.checkIn)}
                onChange={(e) => set({ checkIn: (e.target as HTMLInputElement).value })}
                {...stylex.props(styles.dateInput)}
              />
            </Field>
            <Field label="Check out">
              <input
                type="date"
                value={tf(draft.checkOut)}
                onChange={(e) => set({ checkOut: (e.target as HTMLInputElement).value })}
                {...stylex.props(styles.dateInput)}
              />
            </Field>
          </div>
          <Field label="Notes">
            <TextField
              multiline
              value={tf(draft.notes)}
              onChange={(e) => set({ notes: (e.target as HTMLInputElement).value })}
            />
          </Field>
        </>
      )
  }
}

/** The shared undo toast: whichever copy holds the slot, both displays see it. */
function UndoToast({ undo, onUndo, onDismiss }: { undo: Undo | null; onUndo: () => void; onDismiss: () => void }) {
  const { mounted, closing } = usePresence(!!undo, 250)
  // The float-in holds opacity 0 until the animation advances; on a stalled
  // frame clock the toast would never appear, so drop the animation class on
  // a wall-clock timer and let the static style take over.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!mounted) {
      setSettled(false)
      return
    }
    const t = setTimeout(() => setSettled(true), 400)
    return () => clearTimeout(t)
  }, [mounted])
  if (!mounted || !undo) return null
  return (
    <div
      role="status"
      {...stylex.props(styles.toast, closing ? animations.floatOut : settled ? undefined : animations.float)}
    >
      <span {...stylex.props(styles.toastText)}>{undo.label}</span>
      <button type="button" onClick={onUndo} {...stylex.props(styles.toastBtn, shared.press, styles.pressRm)}>
        Undo
      </button>
      <IconButton name="close" size={11} aria-label="Dismiss" onClick={onDismiss} xstyle={styles.iconFix} />
    </div>
  )
}

// --- draft commit ------------------------------------------------------------

function buildCommit(d: Draft, lib: Library): { lib: Library } | { err: string } {
  const blank = (s?: string) => (s ?? '').trim()
  const optDate = (s?: string) => {
    const v = blank(s)
    return v ? (validDate(v) ? v : undefined) : null
  }
  const optTime = (s?: string) => {
    const v = blank(s)
    return v ? parseTime(v) : null
  }
  switch (d.kind) {
    case 'trip-new':
    case 'trip-edit': {
      const name = blank(d.name)
      const start = blank(d.start)
      const end = blank(d.end)
      if (!name) return { err: 'Give the trip a name.' }
      if (!validDate(start)) return { err: 'The start date is not a real date.' }
      if (!validDate(end)) return { err: 'The end date is not a real date.' }
      if (diffDays(start, end) < 0) return { err: 'The trip ends before it starts.' }
      if (diffDays(start, end) >= MAX_TRIP_DAYS)
        return { err: `A trip can be up to ${MAX_TRIP_DAYS} days - shorten the range.` }
      if (d.kind === 'trip-new') {
        const r = addTrip(lib, { name, start, end, notes: blank(d.notes) }, Date.now(), d.createdId)
        return { lib: r.lib }
      }
      const t = getTrip(lib, d.tripId ?? '')
      if (!t) return { err: 'That trip is gone.' }
      return { lib: updateTrip(lib, t.id, { name, start, end, notes: blank(d.notes) }) }
    }
    case 'stop-new':
    case 'stop-edit': {
      const t = getTrip(lib, d.tripId ?? '')
      if (!t) return { err: 'That trip is gone.' }
      const title = blank(d.title)
      if (!title) return { err: 'Give the stop a name.' }
      const time = optTime(d.time)
      if (blank(d.time) && !time) return { err: 'Time needs HH:MM, like 14:30.' }
      const day = clampDay(t, typeof d.day === 'number' ? d.day : -1)
      if (d.kind === 'stop-new') {
        const r = addStop(
          lib,
          t.id,
          { day, title, time, address: blank(d.address), notes: blank(d.notes) },
          d.createdId
        )
        return r ? { lib: r.lib } : { err: 'Could not add the stop.' }
      }
      const s = t.stops.find((x) => x.id === d.entityId)
      if (!s) return { err: 'That stop is gone.' }
      let next = updateStop(lib, t.id, s.id, { title, time, address: blank(d.address), notes: blank(d.notes) })
      if (s.day !== day) next = moveStop(next, t.id, s.id, day, stopsForDay(getTrip(next, t.id)!, day).length)
      return { lib: next }
    }
    case 'leg-new':
    case 'leg-edit': {
      const t = getTrip(lib, d.tripId ?? '')
      if (!t) return { err: 'That trip is gone.' }
      const from = blank(d.from)
      const to = blank(d.to)
      if (!from && !to) return { err: 'Name at least one end of the trip leg.' }
      const date = optDate(d.date)
      if (date === undefined) return { err: 'That date is not a real date.' }
      const depart = optTime(d.depart)
      if (blank(d.depart) && !depart) return { err: 'Departure needs HH:MM, like 11:20.' }
      const arrive = optTime(d.arrive)
      if (blank(d.arrive) && !arrive) return { err: 'Arrival needs HH:MM, like 15:45.' }
      const fields = {
        kind: d.kindLeg ?? 'other',
        from,
        to,
        date: date ?? null,
        depart,
        arrive,
        ref: blank(d.ref),
        notes: blank(d.notes)
      }
      if (d.kind === 'leg-new') {
        const r = addLeg(lib, t.id, fields, d.createdId)
        return r ? { lib: r.lib } : { err: 'Could not add the transport.' }
      }
      const l = t.legs.find((x) => x.id === d.entityId)
      if (!l) return { err: 'That entry is gone.' }
      return { lib: updateLeg(lib, t.id, l.id, fields) }
    }
    case 'stay-new':
    case 'stay-edit': {
      const t = getTrip(lib, d.tripId ?? '')
      if (!t) return { err: 'That trip is gone.' }
      const name = blank(d.name)
      if (!name) return { err: 'Give the stay a name.' }
      const checkIn = optDate(d.checkIn)
      if (checkIn === undefined) return { err: 'The check-in date is not a real date.' }
      const checkOut = optDate(d.checkOut)
      if (checkOut === undefined) return { err: 'The check-out date is not a real date.' }
      if (checkIn && checkOut && diffDays(checkIn, checkOut) < 0) return { err: 'Check-out is before check-in.' }
      const fields = {
        name,
        address: blank(d.address),
        checkIn: checkIn ?? null,
        checkOut: checkOut ?? null,
        notes: blank(d.notes)
      }
      if (d.kind === 'stay-new') {
        const r = addStay(lib, t.id, fields, d.createdId)
        return r ? { lib: r.lib } : { err: 'Could not add the stay.' }
      }
      const s = t.stays.find((x) => x.id === d.entityId)
      if (!s) return { err: 'That stay is gone.' }
      return { lib: updateStay(lib, t.id, s.id, fields) }
    }
  }
}

// togglePack lives in trips.ts; the alias keeps the call sites above readable.
await os.connect()
createRoot(document.body).render(<TripPlanner />)

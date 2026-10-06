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
  Segmented,
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
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { createRoot } from 'react-dom/client'
import { cue, setMuted } from './audio.ts'
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
  explicitTrigger?: HTMLElement | null
) {
  const trigger = useRef<HTMLElement | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref contents are read live during the trap, not captured as deps
  useEffect(() => {
    if (!active) return
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
      const els = boxRef.current ? focusablesIn(boxRef.current) : []
      ;(initial === 'last' ? els[els.length - 1] : els[0])?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey, true)
      const el = trigger.current
      if (el?.isConnected) {
        // The trigger sits inside the inert subtree until the close commits,
        // so retry across frames until inert lifts and it takes focus again.
        let tries = 0
        const restore = () => {
          if (!el.isConnected) return
          el.focus()
          if (document.activeElement !== el && ++tries < 10) requestAnimationFrame(restore)
        }
        requestAnimationFrame(restore)
      } else {
        document.querySelector<HTMLElement>('main button:not([disabled])')?.focus()
      }
    }
  }, [active, initial])
}

/** A destructive confirmation: the kit card plus the modality it leaves out. */
function DestructiveSheet({
  open,
  label,
  onClose,
  restoreTo,
  children
}: {
  open: boolean
  label: string
  onClose: () => void
  restoreTo?: HTMLElement | null
  children: React.ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  useFocusTrap(box, open, 'last', restoreTo)
  useEffect(() => (open ? pushEscape(onClose) : undefined), [open, onClose])
  return (
    <Sheet open={open} onClose={onClose} aria-label={label}>
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
const ownsSession = (k: string) => k === 'ui' || k === 'draft' || k === 'undo'

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
        ? insertPack(lib, u.tripId, [u.item as PackItem])
        : lib
    case 'packs':
      return trip && u.items ? insertPack(lib, u.tripId, u.items) : lib
  }
}

// A draft whose `saving` stamp is older than this means the committing copy
// went away mid-write: any copy may clear the lock so the editor unblocks.
const SAVE_LOCK_MS = 30_000
const UNDO_MS = 8_000

const TRIP_HUES = [colors.indigo, colors.teal, colors.orange, colors.pink, colors.green, colors.purple]
const tripHue = (index: number) => TRIP_HUES[index % TRIP_HUES.length] ?? colors.indigo

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
    <button type="button" onClick={onOpen} {...stylex.props(styles.tripCard, shared.press, animations.rise)}>
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

/** The day strip: a radio group of the trip's days plus a "Later" slot. */
function DayChips({ trip, day, onPick }: { trip: Trip; day: number; onPick: (d: number) => void }) {
  const n = dayCount(trip)
  const days = Array.from({ length: n }, (_, i) => i)
  const options: { d: number; label: string; sub: string }[] = days.map((i) => ({
    d: i,
    label: `Day ${i + 1}`,
    sub: shortDay(dayDate(trip, i))
  }))
  options.push({ d: -1, label: 'Later', sub: `${unscheduled(trip).length}` })
  const pick = (d: number) => onPick(d)
  const onKey = (e: React.KeyboardEvent) => {
    const list = options.map((o) => o.d)
    const at = list.indexOf(day)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      pick(list[Math.min(list.length - 1, at + 1)]!)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      pick(list[Math.max(0, at - 1)]!)
    } else if (e.key === 'Home') {
      e.preventDefault()
      pick(list[0]!)
    } else if (e.key === 'End') {
      e.preventDefault()
      pick(list[list.length - 1]!)
    }
  }
  return (
    <div role="radiogroup" aria-label="Trip day" onKeyDown={onKey} {...stylex.props(styles.chipRow)}>
      {options.map((o) => (
        <button
          key={o.d}
          type="button"
          role="radio"
          aria-checked={o.d === day}
          tabIndex={o.d === day ? 0 : -1}
          onClick={() => {
            pick(o.d)
            cue('move')
          }}
          {...stylex.props(styles.chip, shared.press, o.d === day && styles.chipOn)}
        >
          <span {...stylex.props(styles.chipDay)}>{o.label}</span>
          <span {...stylex.props(styles.chipDate)}>{o.sub}</span>
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
              <span {...stylex.props(styles.tlCard, styles.tlCardFlat)}>
                <span {...stylex.props(styles.grow)}>
                  <div {...stylex.props(styles.tlTitle)}>{s.title}</div>
                  {s.address ? <div {...stylex.props(styles.tlSub)}>{s.address}</div> : null}
                </span>
                <span {...stylex.props(styles.arrangeCol)}>
                  <IconButton
                    name="up"
                    size={13}
                    variant="round"
                    aria-label={`Move ${s.title} earlier`}
                    disabled={i === 0}
                    onClick={() => move(s, -1)}
                  />
                  <IconButton
                    name="down"
                    size={13}
                    variant="round"
                    aria-label={`Move ${s.title} later`}
                    disabled={i === stops.length - 1}
                    onClick={() => move(s, 1)}
                  />
                </span>
              </span>
            ) : (
              <button type="button" onClick={() => onOpen(s)} {...stylex.props(styles.tlCard, shared.press)}>
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
    <div>
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
      <button type="button" onClick={onNewLeg} {...stylex.props(styles.addRow, shared.press)}>
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
      <button type="button" onClick={onNewStay} {...stylex.props(styles.addRow, shared.press)}>
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
  return (
    <li {...stylex.props(styles.entityRow)}>
      <button type="button" onClick={onEdit} {...stylex.props(styles.entityMain, shared.press)}>
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
  return (
    <li {...stylex.props(styles.entityRow)}>
      <button type="button" onClick={onEdit} {...stylex.props(styles.entityMain, shared.press)}>
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
            <li key={p.id} {...stylex.props(styles.packRow)}>
              <Checkbox
                checked={p.done}
                onChange={() => {
                  onToggle(p)
                  cue(p.done ? 'uncheck' : 'check')
                }}
                aria-label={`Packed: ${p.label}`}
              />
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
          xstyle={styles.grow}
        />
        <Button variant="tinted" onClick={add} disabled={!text.trim()}>
          Add
        </Button>
      </div>
      {done > 0 && (
        <div {...stylex.props(styles.packAdd)}>
          <Button variant="plain" onClick={onClear}>
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
        <Button variant="tinted" onClick={onEdit} xstyle={styles.grow}>
          Edit stop
        </Button>
        <Button variant="plain" onClick={onDelete} xstyle={styles.dangerText}>
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
        <Button variant="tinted" onClick={onEdit} xstyle={styles.grow}>
          Edit trip
        </Button>
        <Button variant="plain" onClick={onDelete} xstyle={styles.dangerText}>
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

type Confirm = {
  kind: 'trip' | 'stop' | 'leg' | 'stay'
  tripId: string
  id?: string
  label: string
  trigger?: HTMLElement | null
}

function TripPlanner() {
  const [rootRef, wide] = useWide<HTMLElement>()
  const view = useDisplay()
  const [darkMode, setDarkMode] = useState(false)
  const [today, setToday] = useState(todayISO)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const editorBox = useRef<HTMLDivElement>(null)

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
  const prefs = useMemo(() => {
    try {
      return JSON.parse(storage.get('prefs') ?? '{}') as { muted?: boolean }
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

  const setUi = useCallback(
    (patch: Partial<Ui>) => {
      const next: Ui = {
        ...parseUi(session.get('ui')),
        ...patch,
        v: 1,
        tab: tabFor(patch.tab ?? parseUi(session.get('ui')).tab)
      }
      session.put('ui', JSON.stringify(next))
    },
    [session]
  )

  const setDraft = useCallback(
    (d: Draft | null) => {
      if (d) session.put('draft', JSON.stringify(d))
      else session.del('draft')
    },
    [session]
  )

  /** Apply a new library: one storage write per changed trip plus the index. */
  const applyLib = useCallback(
    (next: Library, prev: Library) => {
      const prevById = new Map(prev.trips.map((t) => [t.id, t]))
      for (const id of prev.order) if (!next.order.includes(id)) storage.del(`trip.${id}`)
      for (const t of next.trips) if (prevById.get(t.id) !== t) storage.put(`trip.${t.id}`, serializeTrip(t))
      if (next.order.join('') !== prev.order.join('')) storage.put('index', serializeIndex(next.order))
    },
    [storage]
  )

  const pushUndo = useCallback(
    (u: Omit<Undo, 'v' | 'by' | 'at'>) => {
      session.put('undo', JSON.stringify({ ...u, v: 1, by: ME, at: Date.now() } satisfies Undo))
    },
    [session]
  )

  const dismissUndo = useCallback(() => session.del('undo'), [session])

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

  const openDraft = useCallback((d: Omit<Draft, 'v'>) => setDraft({ ...d, v: 1 }), [setDraft])

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
    if (!draft || draft.saving) return
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
    if (!draft?.saving) return
    const left = SAVE_LOCK_MS - (Date.now() - draft.saving)
    if (left <= 0) {
      session.del('draft')
      return
    }
    const t = setTimeout(() => session.del('draft'), left)
    return () => clearTimeout(t)
  }, [draft?.saving, session])

  // The editor only makes sense against an existing trip for edit kinds; a
  // peer that deleted the trip mid-draft gets the sheet closed cleanly.
  useEffect(() => {
    if (!draft || draft.saving) return
    const needsTrip = draft.kind !== 'trip-new'
    if (needsTrip && draft.tripId && !getTrip(lib, draft.tripId)) setDraft(null)
  }, [draft, lib, setDraft])

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

  const removeStopNow = (t: Trip, s: Stop) => {
    const res = removeStop(lib, t.id, s.id)
    applyLib(res.lib, lib)
    pushUndo({ kind: 'stop', tripId: t.id, label: `Deleted "${s.title}"`, item: res.stop, index: res.index })
    if (ui.sel === s.id) setUi({ sel: undefined })
    cue('delete')
  }

  const removeTripNow = (t: Trip) => {
    const res = removeTrip(lib, t.id)
    applyLib(res.lib, lib)
    pushUndo({ kind: 'trip', tripId: t.id, label: `Deleted "${t.name}"`, item: res.trip, index: res.index })
    if (ui.tripId === t.id) setUi({ tripId: undefined, sel: undefined })
    cue('delete')
  }

  const confirmGo = () => {
    if (!confirm) return
    const t = getTrip(lib, confirm.tripId)
    setConfirm(null)
    if (!t) return
    if (confirm.kind === 'trip') removeTripNow(t)
    else if (confirm.kind === 'stop') {
      const s = t.stops.find((x) => x.id === confirm.id)
      if (s) removeStopNow(t, s)
    } else if (confirm.kind === 'leg') {
      const l = t.legs.find((x) => x.id === confirm.id)
      if (l) {
        const res = removeLeg(lib, t.id, l.id)
        applyLib(res.lib, lib)
        pushUndo({
          kind: 'leg',
          tripId: t.id,
          label: `Deleted ${l.from || l.to || 'transport'}`,
          item: res.leg,
          index: res.index
        })
        cue('delete')
      }
    } else if (confirm.kind === 'stay') {
      const s = t.stays.find((x) => x.id === confirm.id)
      if (s) {
        const res = removeStay(lib, t.id, s.id)
        applyLib(res.lib, lib)
        pushUndo({ kind: 'stay', tripId: t.id, label: `Deleted "${s.name}"`, item: res.stay, index: res.index })
        cue('delete')
      }
    }
  }

  const modalOpen = !!draft || !!confirm
  useFocusTrap(editorBox, !!draft, 'first')
  useEffect(() => (draft ? pushEscape(() => setDraft(null)) : undefined), [draft, setDraft])
  useEffect(() => (menuOpen ? pushEscape(() => setMenuOpen(false)) : undefined), [menuOpen])

  const mute = (m: boolean) => {
    storage.put('prefs', JSON.stringify({ v: 1, muted: m }))
    if (!m) cue('check')
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
          <IconButton name="plus" aria-label="New trip" onClick={openTripNew} xstyle={styles.hit} />
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
            <Button variant="filled" onClick={openTripNew}>
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
          onSelect: () => setConfirm({ kind: 'trip', tripId: shownTrip.id, label: shownTrip.name })
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
        <Segmented options={TABS} value={ui.tab} onChange={(v) => setUi({ tab: v })} />
        {ui.tab === 'Plan' && stopsForDay(t, day).length > 1 && (
          <Button variant="plain" onClick={() => setUi({ arrange: !ui.arrange })}>
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
              <button type="button" onClick={() => openStopNew(t, day)} {...stylex.props(styles.addRow, shared.press)}>
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
              setConfirm({
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
            onDelStay={(s) => setConfirm({ kind: 'stay', tripId: t.id, id: s.id, label: s.name })}
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
              const res = removePack(lib, t.id, p.id)
              applyLib(res.lib, lib)
              pushUndo({ kind: 'pack', tripId: t.id, label: `Removed "${p.label}"`, item: res.item, index: res.index })
            }}
            onClear={() => {
              const res = clearPacked(lib, t.id)
              applyLib(res.lib, lib)
              if (res.items.length)
                pushUndo({ kind: 'packs', tripId: t.id, label: `Cleared ${res.items.length} packed`, items: res.items })
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
      onDelete={() => setConfirm({ kind: 'stop', tripId: t.id, id: s.id, label: s.title })}
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
          <Title variant="accessory">
            <MuteButton muted={muted} onToggle={() => mute(!muted)} />
            <IconButton
              name="ellipsis"
              aria-label="Trip actions"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              xstyle={styles.hit}
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
    <main
      ref={rootRef}
      data-app="trip-planner"
      data-display={view.width ? view.display : undefined}
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
              Trip Planner
              <Title variant="accessory">
                {lib.trips.length > 0 && (
                  <Select
                    aria-label="Trip"
                    value={trip?.id ?? ''}
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
                <IconButton name="plus" aria-label="New trip" onClick={openTripNew} xstyle={styles.hit} />
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
                        <Button variant="filled" onClick={openTripNew}>
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
                        onDelete={() => setConfirm({ kind: 'trip', tripId: trip.id, label: trip.name })}
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

      <UndoToast undo={undo} onUndo={doUndo} onDismiss={dismissUndo} />

      <Sheet open={!!draft} onClose={() => setDraft(null)} aria-label={draft ? EDITOR_TITLE[draft.kind] : 'Editor'}>
        <div ref={editorBox} {...stylex.props(styles.sheetBody)}>
          <div {...stylex.props(styles.sheetHead)}>
            <span {...stylex.props(styles.sheetTitle)}>{draft ? EDITOR_TITLE[draft.kind] : ''}</span>
            <IconButton name="close" size={13} aria-label="Close editor" onClick={() => setDraft(null)} />
          </div>
          {draft && (
            <EditorFields
              draft={draft}
              trip={draft.tripId ? getTrip(lib, draft.tripId) : undefined}
              setDraft={setDraft}
            />
          )}
          {draft?.err && (
            <div role="alert" {...stylex.props(styles.errorText)}>
              {draft.err}
            </div>
          )}
          <div {...stylex.props(styles.actionRow)}>
            <Button variant="tinted" onClick={() => setDraft(null)} xstyle={styles.grow}>
              Cancel
            </Button>
            <Button variant="filled" onClick={commitDraft} disabled={!!draft?.saving} xstyle={styles.grow}>
              {draft?.saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Sheet>

      <DestructiveSheet
        open={!!confirm}
        label={confirm ? `Delete ${confirm.label}` : 'Delete'}
        onClose={() => setConfirm(null)}
        restoreTo={confirm?.trigger}
      >
        {confirm && (
          <>
            <span {...stylex.props(styles.confirmTitle)}>
              Delete{' '}
              {confirm.kind === 'trip'
                ? 'trip'
                : confirm.kind === 'stop'
                  ? 'stop'
                  : confirm.kind === 'leg'
                    ? 'transport'
                    : 'stay'}
              ?
            </span>
            <span {...stylex.props(styles.confirmBody)}>
              {confirm.kind === 'trip'
                ? `"${confirm.label}" and all its stops, travel and packing go away. You can undo right after.`
                : `"${confirm.label}" is removed. You can undo right after.`}
            </span>
            <div {...stylex.props(styles.actionRow)}>
              <Button variant="tinted" onClick={() => setConfirm(null)} xstyle={styles.grow}>
                Cancel
              </Button>
              <Button variant="filled" onClick={confirmGo} xstyle={[styles.grow, styles.dangerFill]}>
                Delete
              </Button>
            </div>
          </>
        )}
      </DestructiveSheet>
    </main>
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
            />
          </Field>
          <div {...stylex.props(styles.fieldRow)}>
            <Field label="Day">
              <Select
                value={String(draft.day ?? 0)}
                onChange={(e) => set({ day: Number((e.target as HTMLSelectElement).value) })}
                aria-label="Day"
                xstyle={styles.grow}
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
          <div {...stylex.props(styles.kindChips)} role="radiogroup" aria-label="Transport kind">
            {LEG_KINDS_UI.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={draft.kindLeg === k}
                tabIndex={draft.kindLeg === k ? 0 : -1}
                onClick={() => set({ kindLeg: k })}
                onKeyDown={(e) => {
                  const at = LEG_KINDS_UI.indexOf(draft.kindLeg ?? 'flight')
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    set({ kindLeg: LEG_KINDS_UI[Math.min(LEG_KINDS_UI.length - 1, at + 1)] })
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    set({ kindLeg: LEG_KINDS_UI[Math.max(0, at - 1)] })
                  }
                }}
                {...stylex.props(styles.kindChip, shared.press, draft.kindLeg === k && styles.kindChipOn)}
              >
                <Sym name={LEG_ICON[k]} size={12} /> {legKindLabel(k)}
              </button>
            ))}
          </div>
          <div {...stylex.props(styles.fieldRow)}>
            <Field label="From">
              <TextField
                value={tf(draft.from)}
                onChange={(e) => set({ from: (e.target as HTMLInputElement).value })}
                placeholder="SFO"
              />
            </Field>
            <Field label="To">
              <TextField
                value={tf(draft.to)}
                onChange={(e) => set({ to: (e.target as HTMLInputElement).value })}
                placeholder="KIX"
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
            />
          </Field>
          <Field label="Address">
            <TextField
              value={tf(draft.address)}
              onChange={(e) => set({ address: (e.target as HTMLInputElement).value })}
              placeholder="Kyoto Station"
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
  if (!mounted || !undo) return null
  return (
    <div role="status" {...stylex.props(styles.toast, closing ? animations.floatOut : animations.float)}>
      <span>{undo.label}</span>
      <button type="button" onClick={onUndo} {...stylex.props(styles.toastBtn, shared.press)}>
        Undo
      </button>
      <IconButton name="close" size={11} aria-label="Dismiss" onClick={onDismiss} />
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

// The app's own state: the saved shortcuts, the automations, and the log of
// what ran. Persisted under `duo.shortcuts.` so it survives app swaps, and kept
// in module cells (apps/memos/store.ts) so the cover copy agrees with the
// inner one. Editor drafts and the toast are session cells: shared by both
// displays, never written to storage.

import { useSyncExternalStore } from 'react'

/** One step: an app to open, 'Go Home', or a step the simulator fakes. */
export type Step = { action: string; arg?: string }
export type Shortcut = { id: string; name: string; icon: string; steps: Step[] }
export type Automation = { id: string; trigger: string; action: string; enabled: boolean }
export type Run = { id: string; name: string; at: number; ok: boolean; detail: string }
export type RunState = 'running' | 'done' | 'failed'

export const GO_HOME = 'Go Home'
export const SIMULATED = 'Simulated Step'

/** Apps the simulator can actually open; the editor's picker offers these plus the two verbs. */
export const OPENABLE = [
  'App Store',
  'Books',
  'Calculator',
  'Calendar',
  'Camera',
  'Clock',
  'Contacts',
  'FaceTime',
  'Files',
  'Fitness',
  'Freeform',
  'Health',
  'Home',
  'Mail',
  'Maps',
  'Messages',
  'Music',
  'News',
  'Notes',
  'Phone',
  'Photos',
  'Podcasts',
  'Preview',
  'Reminders',
  'Safari',
  'Settings',
  'Siri',
  'Stocks',
  'TV',
  'Tips',
  'Voice Memos',
  'Wallet',
  'Weather'
]

/** The glyphs the icon picker offers. */
export const ICONS = ['✨', '🔗', '🌐', '📸', '🎧', '📰', '☎️', '📍', '✏️', '🏠', '📖', '🎙️', '⏰', '🗺️', '🔦', '🏃']

function cell<T>(key: string | null, initial: T) {
  let value = initial
  if (key) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) value = JSON.parse(raw) as T
    } catch {}
  }
  const subs = new Set<() => void>()
  return {
    subscribe: (fn: () => void) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    get: () => value,
    set: (v: T) => {
      value = v
      if (key) {
        try {
          localStorage.setItem(key, JSON.stringify(v))
        } catch {}
      }
      for (const fn of subs) fn()
    }
  }
}

const seedShortcuts = (): Shortcut[] => [
  {
    id: 'sc-wikipedia',
    name: 'Open Wikipedia',
    icon: '🌐',
    steps: [{ action: 'Safari', arg: 'https://en.m.wikipedia.org/wiki/Special:Random' }]
  },
  { id: 'sc-photo', name: 'Take a Photo', icon: '📸', steps: [{ action: 'Camera' }] },
  { id: 'sc-music', name: 'Play Music', icon: '🎧', steps: [{ action: 'Music' }] },
  { id: 'sc-news', name: 'Today’s News', icon: '📰', steps: [{ action: 'News' }] },
  { id: 'sc-call', name: 'Call Home', icon: '☎️', steps: [{ action: 'Phone' }] },
  { id: 'sc-memo', name: 'Record a Memo', icon: '🎙️', steps: [{ action: 'Voice Memos' }] },
  { id: 'sc-sketch', name: 'Start Sketch', icon: '✏️', steps: [{ action: 'Freeform' }] },
  { id: 'sc-home', name: 'Go Home', icon: '🏠', steps: [{ action: GO_HOME }] }
]

const seedAutomations = (): Automation[] => [
  { id: 'au-unfold', trigger: 'When the phone unfolds', action: 'Open Freeform', enabled: true },
  { id: 'au-sunset', trigger: 'At sunset', action: 'Dim Key Light', enabled: true },
  { id: 'au-render', trigger: 'When a render finishes', action: 'Play sound', enabled: false }
]

export const shortcutsCell = cell<Shortcut[]>('duo.shortcuts.v1', seedShortcuts())
export const automationsCell = cell<Automation[]>('duo.shortcuts.automations.v1', seedAutomations())
export const runsCell = cell<Run[]>('duo.shortcuts.runs.v1', [])
/** Per-shortcut execution state, so every card can show running/done/failed. */
const statesCell = cell<Record<string, RunState | undefined>>(null, {})

// ---------- session cells ----------

type AnyCell = ReturnType<typeof cell<unknown>>
const session = new Map<string, AnyCell>()
function sharedCell<T>(key: string, initial: T) {
  let c = session.get(key)
  if (!c) {
    c = cell<T>(null, initial) as unknown as AnyCell
    session.set(key, c)
  }
  return c as { subscribe: (fn: () => void) => () => void; get: () => T; set: (v: T) => void }
}

export function useShared<T>(key: string, initial: T) {
  const c = sharedCell(key, initial)
  return [useSyncExternalStore(c.subscribe, c.get), c.set] as const
}

export type Editor =
  | { kind: 'shortcut'; id?: string; name: string; icon: string; steps: Step[] }
  | { kind: 'automation'; id: string; trigger: string; action: string; enabled: boolean }

const editorCell = sharedCell<Editor | null>('editor', null)
const toastCell = sharedCell('toast', '')

export const useShortcuts = () => useSyncExternalStore(shortcutsCell.subscribe, shortcutsCell.get)
export const useAutomations = () => useSyncExternalStore(automationsCell.subscribe, automationsCell.get)
export const useRuns = () => useSyncExternalStore(runsCell.subscribe, runsCell.get)
export const useStates = () => useSyncExternalStore(statesCell.subscribe, statesCell.get)
export const useEditor = () => useSyncExternalStore(editorCell.subscribe, editorCell.get)
export const useToastMsg = () => useSyncExternalStore(toastCell.subscribe, toastCell.get)

let toastTimer: ReturnType<typeof setTimeout> | undefined
/** The one feedback line every flow shares; clears itself. */
export const say = (msg: string) => {
  toastCell.set(msg)
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toastCell.set(''), 1600)
}

let seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`

// ---------- mutations ----------

export const saveShortcut = (draft: Extract<Editor, { kind: 'shortcut' }>) => {
  const name = draft.name.trim()
  const steps = draft.steps.filter((s) => s.action.trim())
  if (!name || !steps.length) return false
  const list = shortcutsCell.get()
  if (draft.id && list.some((s) => s.id === draft.id)) {
    shortcutsCell.set(list.map((s) => (s.id === draft.id ? { ...s, name, icon: draft.icon, steps } : s)))
  } else {
    shortcutsCell.set([...list, { id: uid('sc'), name, icon: draft.icon, steps }])
  }
  return true
}

export const deleteShortcut = (id: string) => shortcutsCell.set(shortcutsCell.get().filter((s) => s.id !== id))

export const saveAutomation = (draft: Extract<Editor, { kind: 'automation' }>) => {
  const trigger = draft.trigger.trim()
  const action = draft.action.trim()
  if (!trigger || !action) return false
  automationsCell.set(
    automationsCell.get().map((a) => (a.id === draft.id ? { ...a, trigger, action, enabled: draft.enabled } : a))
  )
  return true
}

export const toggleAutomation = (id: string) =>
  automationsCell.set(automationsCell.get().map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)))

export const deleteAutomation = (id: string) => automationsCell.set(automationsCell.get().filter((a) => a.id !== id))

export const clearRuns = () => runsCell.set([])

export const openShortcutEditor = (sc?: Shortcut) =>
  editorCell.set(
    sc
      ? { kind: 'shortcut', id: sc.id, name: sc.name, icon: sc.icon, steps: sc.steps.map((s) => ({ ...s })) }
      : { kind: 'shortcut', name: '', icon: '✨', steps: [{ action: 'Safari' }] }
  )
export const openAutomationEditor = (a: Automation) =>
  editorCell.set({ kind: 'automation', id: a.id, trigger: a.trigger, action: a.action, enabled: a.enabled })
export const patchEditor = (p: Partial<Editor>) => {
  const e = editorCell.get()
  if (e) editorCell.set({ ...e, ...p } as Editor)
}
export const closeEditor = () => editorCell.set(null)

/** The minimal shell surface a run needs; tests inject a fake. */
export type Runner = { open: (app: string, arg?: string) => void; home: () => void }

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Runs a shortcut: marks it running, works the steps after a beat, then records
 * the outcome. 'Go Home' reaches os.home, a known app opens through os.open,
 * and anything the simulator cannot really do reports itself as simulated -
 * clear feedback instead of a dead tap. A shortcut with no steps fails.
 */
export async function runShortcut(sc: Shortcut, os: Runner, hold = 420): Promise<Run> {
  statesCell.set({ ...statesCell.get(), [sc.id]: 'running' })
  await sleep(hold)
  const steps = sc.steps.filter((s) => s.action.trim())
  const parts: string[] = []
  for (const step of steps) {
    if (step.action === GO_HOME) {
      os.home()
      parts.push('Went home')
    } else if (step.action === SIMULATED) {
      parts.push('Simulated a step')
    } else if (OPENABLE.includes(step.action)) {
      os.open(step.action, step.arg)
      parts.push(`Opened ${step.action}`)
    } else {
      parts.push(`Simulated: ${step.action}`)
    }
  }
  const ok = parts.length > 0
  const run: Run = {
    id: uid('run'),
    name: sc.name,
    at: Date.now(),
    ok,
    detail: ok ? parts.join(' · ') : 'No actions to run'
  }
  runsCell.set([run, ...runsCell.get()].slice(0, 20))
  statesCell.set({ ...statesCell.get(), [sc.id]: ok ? 'done' : 'failed' })
  say(ok ? `${sc.name} finished` : `${sc.name} couldn't run - add an action`)
  setTimeout(() => {
    const s = statesCell.get()
    if (s[sc.id] !== 'running') {
      const next = { ...s }
      delete next[sc.id]
      statesCell.set(next)
    }
  }, 1600)
  return run
}

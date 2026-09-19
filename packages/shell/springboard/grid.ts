// The grid as the finger has arranged it: which app or folder sits in each
// cell of the two halves. apps.ts stays the truth about what exists and where
// it ships; this is the order it is shown in, kept in localStorage and read
// back against the registry every time, so an app installed or removed since
// the order was saved still lands or leaves. Device-wide like toggles.ts: each
// display runs its own SpringBoard, and both show the one grid. screen.ts
// bakes from the same snapshot, so a fold shows what the finger left.

import type { App } from '@doan-labs/duo-uikit/app.ts'
import { useSyncExternalStore } from 'react'
import { byName, LEFT, RIGHT } from '../apps.ts'
import { registryRevision, subscribeRegistry } from '../runtime/registry.ts'

export type Folder = { name: string; apps: string[] }
/** An app, by the key `byName` resolves, or a folder of them. */
export type Slot = string | Folder
export type Half = 'left' | 'right'
export type Grid = Record<Half, Slot[]>

export const isFolder = (s: Slot): s is Folder => typeof s !== 'string'

const KEY = 'os.home'
const HALVES: Half[] = ['left', 'right']
const FACTORY: Record<Half, App[]> = { left: LEFT, right: RIGHT }
/** A release goes by its id, which outlives a rename; a baked app by its name. */
const key = (a: App) => a.id ?? a.name

/** What was saved, as far as it still parses: a bad entry is skipped, not fatal. */
const slotsOf = (x: unknown): Slot[] =>
  Array.isArray(x)
    ? x.filter(
        (s): s is Slot =>
          typeof s === 'string' ||
          (typeof s?.name === 'string' && Array.isArray(s?.apps) && s.apps.every((n: unknown) => typeof n === 'string'))
      )
    : []

let saved: Grid | null = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return raw ? { left: slotsOf(raw.left), right: slotsOf(raw.right) } : null
  } catch {
    return null
  }
})()
let rev = 0
const subs = new Set<() => void>()

/**
 * The saved order against what the registry has now. Apps that are gone drop
 * out, a folder down to one app dissolves into it, and anything apps.ts places
 * that the saved order never saw lands at the end of its half, where the
 * registry puts a new install. Nothing saved yields the factory layout itself.
 */
function resolve(): Grid {
  const placed = new Set<string>()
  const take = (n: string): string[] => {
    const a = byName(n)
    if (!a || a.folder || placed.has(key(a))) return []
    placed.add(key(a))
    return [key(a)]
  }
  const clean = (slots: Slot[]): Slot[] =>
    slots.flatMap<Slot>((s) => {
      if (!isFolder(s)) return take(s)
      const apps = s.apps.flatMap(take)
      return apps.length > 1 ? [{ name: s.name, apps }] : apps
    })
  const out: Grid = { left: clean(saved?.left ?? []), right: clean(saved?.right ?? []) }
  for (const h of HALVES)
    for (const a of FACTORY[h]) {
      const apps = a.folder ? a.folder.flatMap(take) : take(key(a))
      out[h].push(...(a.folder && apps.length > 1 ? [{ name: a.name, apps }] : apps))
    }
  return out
}

let snap: Grid | null = null
let seen = ''
/** The grid as it stands: the same object until the saved order or the registry changes. */
export function grid(): Grid {
  const now = `${rev}:${registryRevision()}`
  if (!snap || seen !== now) {
    seen = now
    snap = resolve()
  }
  return snap
}

export const subscribeGrid = (f: () => void) => {
  subs.add(f)
  const off = subscribeRegistry(f)
  return () => {
    subs.delete(f)
    off()
  }
}

/** Re-renders the caller when the grid changes. */
export const useGrid = () => useSyncExternalStore(subscribeGrid, grid)

function save(next: Grid) {
  saved = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private mode or quota: the order holds until the page reloads.
  }
  rev++
  for (const f of subs) f()
}

/** `slots` without `app`, wherever it sits: loose, or inside a folder. */
const without = (slots: Slot[], app: string): Slot[] =>
  slots.flatMap((s) =>
    s === app ? [] : isFolder(s) && s.apps.includes(app) ? [{ ...s, apps: s.apps.filter((n) => n !== app) }] : [s]
  )

/** Drops `app` on `target`: a folder takes it in; an app becomes a folder holding both. */
export function stack(app: string, target: Slot) {
  const cur = grid()
  const next = { ...cur }
  for (const h of HALVES)
    next[h] = without(cur[h], app).map((s) =>
      s !== target ? s : isFolder(s) ? { ...s, apps: [...s.apps, app] } : { name: 'Folder', apps: [s, app] }
    )
  save(next)
}

/** Takes `app` out of its folder and sets it down in the cell after it. */
export function eject(app: string) {
  const cur = grid()
  const next = { ...cur }
  for (const h of HALVES) {
    const i = cur[h].findIndex((s) => isFolder(s) && s.apps.includes(app))
    if (i < 0) continue
    next[h] = without(cur[h], app)
    next[h].splice(i + 1, 0, app)
  }
  save(next)
}

/** Names a folder. */
export function rename(folder: Folder, name: string) {
  const swap = (slots: Slot[]) => slots.map((s) => (s === folder ? { ...s, name } : s))
  save({ left: swap(grid().left), right: swap(grid().right) })
}

/** Back to the factory layout: nothing saved resolves to apps.ts's own order. */
export const reset = () => save({ left: [], right: [] })

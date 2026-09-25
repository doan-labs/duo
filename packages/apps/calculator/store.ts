// os.storage keys and the shapes under them. Anything both displays must agree
// on lives here; per-view scratch (the typed entry, pressed keys) is component
// state. History and notes persist; the pad's pending op rides os.session.

import { evaluateLine, type Scope } from './engine.ts'
import type { FxTable } from './units.ts'

export type HistoryEntry = { e: string; r: string; t: number }
export type GraphEq = { id: string; lhs: 'y' | 'z'; expr: string }
export type NotesDoc = { lines: string[] }
export type CalcState = {
  acc: number | null
  op: string | null
  cur: string
  fresh: boolean
  expr: string
  lastOp: string | null
  lastB: number | null
  second: boolean
  deg: boolean
  stack: { acc: number | null; op: string | null }[]
  curInExpr: boolean
}
export type ConvertState = { cat: string; from: string; to: string; cur: string; editing: 'from' | 'to' }

export const K_HISTORY = 'history'
export const K_MEMORY = 'memory'
export const K_NOTES = 'notes.v1'
export const K_GRAPHS = 'graphs.v1'
export const K_FX = 'fx.v1'

export const EMPTY_PAD: CalcState = {
  acc: null,
  op: null,
  cur: '0',
  fresh: true,
  expr: '',
  lastOp: null,
  lastB: null,
  second: false,
  deg: true,
  stack: [],
  curInExpr: false
}
export const EMPTY_CONVERT: ConvertState = { cat: 'length', from: 'm', to: 'ft', cur: '0', editing: 'from' }
export const EMPTY_NOTES: NotesDoc = { lines: [] }
export const EMPTY_FX: FxTable | null = null

export const HISTORY_MAX = 100

export function pushHistory(list: HistoryEntry[], e: string, r: string): HistoryEntry[] {
  const entry: HistoryEntry = { e, r, t: Date.now() }
  return [entry, ...list].slice(0, HISTORY_MAX)
}

/** The scope one notes document evaluates under: each assignment feeds the lines below it. */
export function notesScope(lines: string[], rad: boolean): Scope {
  const scope: Scope = {}
  for (const line of lines) evaluateLine(line, scope, rad)
  return scope
}

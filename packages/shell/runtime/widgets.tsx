import { useSyncExternalStore } from 'react'
import { Widget } from '../../uikit/widget.tsx'
import { changes, read, type StoredWidget, transaction } from './database.ts'

const empty: StoredWidget = {
  lines: [
    { role: 'label', text: 'Weather' },
    { role: 'value', text: '—' },
    { role: 'caption', text: 'Open to refresh' }
  ],
  updatedAt: 0,
  epoch: 0
}
let weather = empty
let revision = 0
const listeners = new Set<() => void>()
export const widgetSnapshot = () => weather
export const subscribeWidgets = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
const notify = () => {
  revision++
  for (const cb of listeners) cb()
}
const snapshotRevision = () => revision
async function load() {
  weather =
    (await transaction(['widgets'], 'readonly', (tx) =>
      read<StoredWidget>(tx, 'widgets', ['labs.doan.ipduo.weather', 'small'])
    )) ?? empty
  notify()
}
let started = false
export function startWidgets() {
  if (started) return
  started = true
  changes.addEventListener('change', () => {
    void load().catch(() => {})
  })
  void load()
  setInterval(notify, 60000)
}
export function WeatherSnapshot({ onOpen }: { onOpen: (from: HTMLElement, arg?: string) => void }) {
  useSyncExternalStore(subscribeWidgets, snapshotRevision)
  return <Widget snapshot={weather} updatedAt={weather.updatedAt} onOpen={onOpen} />
}

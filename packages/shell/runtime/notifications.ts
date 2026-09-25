// The OS notification layer's memory: what apps posted, newest first, and the
// revision that redraws the displays. Every display's SpringBoard renders the
// same list the way they share the wallpaper and toggles; the store itself
// knows nothing about React, glass or iframes, so bridge.ts can post into it.

import { noticeValid, PlatformError } from '../../sdk/guards.ts'
import { LIMITS, type Notice } from '../../sdk/protocol.ts'

/** One posted notification: the app's notice plus who posted it and when. */
export type Posted = Notice & {
  id: string
  /** The installed app id; the notice can only be cleared by its poster. */
  app: string
  /** The manifest name at post time, so a rename does not rewrite the past. */
  name: string
  at: number
}

const notices: Posted[] = []
const listeners = new Set<() => void>()
let revision = 0
export const listNotices = () => notices
export const noticesRevision = () => revision
export function subscribeNotices(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
const emit = () => {
  revision++
  for (const fn of listeners) fn()
}

/** What `notify.post` dispatches to. Newest first; caps keep a flood bounded. */
export function postNotice(app: string, name: string, p: Record<string, unknown>) {
  if (!noticeValid(p)) throw new PlatformError('E_ARGS')
  const notice: Posted = {
    id: crypto.randomUUID(),
    app,
    name,
    title: p.title,
    body: p.body,
    arg: p.arg,
    at: Date.now()
  }
  notices.unshift(notice)
  const own = notices.filter((n) => n.app === app)
  for (const stale of own.slice(LIMITS.noticesApp)) notices.splice(notices.indexOf(stale), 1)
  if (notices.length > LIMITS.notices) notices.length = LIMITS.notices
  emit()
  return { id: notice.id }
}

/** `notify.clear`: an app removes its own notices, one or all of them. */
export function clearNotices(app: string, id?: string) {
  const before = notices.length
  for (let i = notices.length - 1; i >= 0; i--)
    if (notices[i]!.app === app && (id === undefined || notices[i]!.id === id)) notices.splice(i, 1)
  if (notices.length !== before) emit()
}

/** The OS's own clear, from Notification Center: every app's notices go. */
export function clearAllNotices() {
  if (!notices.length) return
  notices.length = 0
  emit()
}

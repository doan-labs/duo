import { record } from './manifest.ts'
import { mutatingService, servicePermission } from './permissions.ts'
import { type ErrCode, LIMITS, type Req, type ViewInfo, type WidgetSnapshot } from './protocol.ts'

export class PlatformError extends Error {
  constructor(
    public code: ErrCode,
    message: string = code
  ) {
    super(message)
    this.name = 'PlatformError'
  }
}
export const bytes = (value: string) => new TextEncoder().encode(value).length
export function envelope(value: unknown): boolean {
  try {
    return bytes(JSON.stringify(value)) <= LIMITS.envelope
  } catch {
    return false
  }
}
export function keyValid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    bytes(value) <= LIMITS.key &&
    [...value].every((c) => c.charCodeAt(0) > 31 && c.charCodeAt(0) !== 127)
  )
}
export const valueValid = (value: unknown): value is string => typeof value === 'string' && bytes(value) <= LIMITS.value
export function requestValid(value: unknown): value is Req {
  return (
    record(value) &&
    Number.isSafeInteger(value.id) &&
    Number(value.id) > 0 &&
    typeof value.m === 'string' &&
    (/^(storage|session)\.(get|set|del|keys|snapshot|watch|unwatch)$/.test(value.m) ||
      ['cmd.send', 'cmd.ack', 'widget.set', 'open', 'home'].includes(value.m) ||
      !!servicePermission(value.m)) &&
    (value.epoch === undefined || (Number.isSafeInteger(value.epoch) && Number(value.epoch) > 0)) &&
    envelope(value)
  )
}
export function viewValid(v: unknown): v is ViewInfo {
  return (
    record(v) &&
    ['inner', 'cover'].includes(String(v.display)) &&
    ['full', 'left', 'right'].includes(String(v.placement)) &&
    [v.width, v.height, v.angle].every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0) &&
    Number(v.angle) <= 180 &&
    [v.visible, v.active, v.focused].every((b) => typeof b === 'boolean')
  )
}
export function widgetValid(v: unknown): v is WidgetSnapshot {
  return (
    record(v) &&
    (v.arg === undefined || (typeof v.arg === 'string' && [...v.arg].length <= 256)) &&
    (v.tint === undefined || ['glass', 'dark'].includes(String(v.tint))) &&
    Array.isArray(v.lines) &&
    v.lines.length <= 8 &&
    v.lines.every(
      (l) =>
        record(l) &&
        typeof l.text === 'string' &&
        [...l.text].length <= 64 &&
        ['label', 'value', 'caption'].includes(String(l.role))
    )
  )
}
export const mutating = (method: string) =>
  /\.(set|del)$/.test(method) || method === 'cmd.send' || method === 'cmd.ack' || mutatingService(method)

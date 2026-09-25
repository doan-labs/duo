import { record } from './manifest.ts'
import { mutatingService, servicePermission } from './permissions.ts'
import {
  DEVICE_EVENTS,
  type DeviceEvent,
  type DeviceEvents,
  type ErrCode,
  LIMITS,
  type Req,
  type Switches,
  type ViewInfo,
  type WidgetSnapshot
} from './protocol.ts'

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
      [
        'cmd.send',
        'cmd.ack',
        'widget.set',
        'open',
        'home',
        'side.claim',
        'side.release',
        'device.watch',
        'device.unwatch'
      ].includes(value.m) ||
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
export const deviceEventName = (v: unknown): v is DeviceEvent => (DEVICE_EVENTS as readonly unknown[]).includes(v)
// A record, not a list, so a switch added to the type fails here until it is checked too.
const SWITCHES = Object.keys({
  airplane: true,
  cell: true,
  wifi: true,
  bt: true,
  drop: true,
  hotspot: true,
  rotate: true,
  mirror: true,
  focus: true,
  torch: true,
  darkMode: true
} satisfies Record<keyof Switches, true>)
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
const between = (n: unknown, min: number, max: number) => finite(n) && n >= min && n <= max
const press = (v: Record<string, unknown>) => v.action === 'press' || v.action === 'release'
export function deviceEventValid<K extends DeviceEvent>(type: K, v: unknown): v is DeviceEvents[K] {
  if (!record(v)) return false
  switch (type) {
    case 'volume':
      return press(v) && (v.button === 'up' || v.button === 'down')
    case 'camera-control':
      return press(v) || (v.action === 'slide' && finite(v.offset))
    case 'side':
      return press(v)
    case 'orientation':
      return between(v.yaw, -180, 180) && v.yaw !== 180 && between(v.hinge, 0, 180)
    case 'switches':
      return SWITCHES.every((k) => typeof v[k] === 'boolean')
  }
  return false
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

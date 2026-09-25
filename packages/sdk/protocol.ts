import type { ServiceMethod } from './permissions.ts'

export const PROTOCOL = 1
export type ViewInfo = {
  display: 'inner' | 'cover'
  placement: 'full' | 'left' | 'right'
  width: number
  height: number
  visible: boolean
  active: boolean
  focused: boolean
  angle: number
}
/**
 * The device switches Control Center and Settings both flip. One definition, so
 * the shell's store (springboard/toggles.ts), the baked Settings app and the
 * `switches` device event cannot drift apart. Apps only read them.
 */
export type Switches = {
  airplane: boolean
  cell: boolean
  wifi: boolean
  bt: boolean
  drop: boolean
  hotspot: boolean
  rotate: boolean
  mirror: boolean
  focus: boolean
  torch: boolean
  /** Dark Mode: light apps wear the kit's dark theme; always-dark apps are untouched. */
  darkMode: boolean
}
/**
 * What `os.device.on(type, cb)` hands `cb`, by type. Button events reach one
 * view: the first listener whose view is visible and active when the button
 * goes down, and that view also hears the slide and the release of that press.
 */
export type DeviceEvents = {
  /** Volume up or down. While a view hears it, the ringer level does not move. */
  volume: { action: 'press' | 'release'; button: 'up' | 'down' }
  /**
   * Camera Control. While a view hears it, the Camera app neither opens nor shoots.
   * `offset` is how far the finger has slid along the cap since the press, in
   * centimetres, positive toward the top of the phone.
   */
  'camera-control': { action: 'press' | 'release' } | { action: 'slide'; offset: number }
  /** The side button. Heard, not taken: it still sleeps, wakes and calls Siri. */
  side: { action: 'press' | 'release' }
  /**
   * The phone's pose, in degrees. `yaw` turns about its long axis, 0 facing you,
   * positive as the right edge swings away, in [-180, 180). `hinge` is `view.angle`.
   * Heard first as the current pose, then on each change, at most once a frame.
   */
  orientation: { yaw: number; hinge: number }
  /** Read-only. Heard first as the current switches, then on each flip. */
  switches: Switches
}
export type DeviceEvent = keyof DeviceEvents
export const DEVICE_EVENTS = [
  'volume',
  'camera-control',
  'side',
  'orientation',
  'switches'
] as const satisfies readonly DeviceEvent[]
export type WidgetSnapshot = {
  arg?: string
  lines: { text: string; role: 'label' | 'value' | 'caption' }[]
  tint?: 'glass' | 'dark'
}
export type Limits = typeof LIMITS
export const LIMITS = {
  envelope: 300 * 1024,
  key: 128,
  value: 256 * 1024,
  keys: 4096,
  page: 256,
  storage: 5 * 1024 * 1024,
  session: 64 * 1024,
  command: 16 * 1024,
  commands: 32,
  noticeTitle: 64,
  noticeBody: 240,
  noticeArg: 4096,
  noticesApp: 10,
  notices: 100,
  inflight: 64,
  rate: 200,
  burst: 400,
  dedupe: 256
} as const
/**
 * What `os.notify.post` takes: the OS shows `name` and `title`, `body` under it,
 * and hands `arg` back to the app when the notice is opened, like `os.open`'s arg.
 */
export type Notice = { title: string; body?: string; arg?: string }
export type ErrCode =
  | 'E_ARGS'
  | 'E_QUOTA'
  | 'E_RATE'
  | 'E_CLOSED'
  | 'E_TIMEOUT'
  | 'E_PROTOCOL'
  | 'E_DENIED'
  | 'E_STALE'
  | 'E_GONE'
  | 'E_STORAGE'
export type Method =
  | `${'storage' | 'session'}.${'get' | 'set' | 'del' | 'keys' | 'snapshot' | 'watch' | 'unwatch'}`
  | 'cmd.send'
  | 'cmd.ack'
  | 'widget.set'
  | 'open'
  | 'home'
  | 'side.claim'
  | 'side.release'
  | 'device.watch'
  | 'device.unwatch'
  | 'notify.post'
  | 'notify.clear'
  | ServiceMethod
export type Hello = { t: 'hello'; protocol: number; sdk: string; nonce: string }
export type Welcome = {
  t: 'welcome'
  view: ViewInfo
  session: { arg?: string; argSeq: number; migration?: { from: string } }
  owner: { epoch: number } | null
  limits: Limits
}
export type Refused = { t: 'refused'; e: 'E_INCOMPATIBLE' | 'E_PROTOCOL' | 'E_BLOCKED'; msg: string }
export type Req = { id: number; m: Method; p?: unknown; epoch?: number }
export type Res = { id: number; ok: true; v?: unknown } | { id: number; ok: false; e: ErrCode; msg?: string }
export type Change = { rev: number; k: string; v: string | null }
export type Evt =
  | { ev: 'view'; p: ViewInfo }
  | { ev: 'kv'; p: Change & { space: 'storage' | 'session' } }
  | { ev: 'arg'; p: { arg: string; argSeq: number } }
  | { ev: 'owner'; p: { epoch: number } | null }
  | { ev: 'side'; p: { action: 'double' } }
  | { [K in DeviceEvent]: { ev: 'device'; p: { type: K; data: DeviceEvents[K] } } }[DeviceEvent]
  | { ev: 'cmd'; p: { cmdId: string; type: string; payload: string } }
  | { ev: 'command-result'; p: { cmdId: string } }
  | { ev: 'bye'; p: { reason: 'closed' | 'uninstalled' | 'updating' | 'error' | 'revoked' } }
export type AppEvt =
  | { ev: 'ack' }
  | { ev: 'ready' }
  | { ev: 'error'; p: { message: string; stack?: string } }
  | { ev: 'key'; p: { key: 'Escape' } }
export type Snapshot = { rev: number; entries: [string, string][]; cursor?: string }
export type KV = {
  get(k: string): Promise<string | null>
  set(k: string, v: string): Promise<{ rev: number }>
  del(k: string): Promise<{ rev: number }>
  keys(cursor?: string): Promise<{ keys: string[]; cursor?: string }>
  snapshot(cursor?: string): Promise<Snapshot>
  watch(since: number, cb: (e: Change) => void): () => void
}

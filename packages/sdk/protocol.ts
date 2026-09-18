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
  inflight: 64,
  rate: 200,
  burst: 400,
  dedupe: 256
} as const
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

export { PlatformError } from './guards.ts'
export type { CameraHooks, Os } from './legacy.ts'
export type { Manifest, Release, ReleaseId } from './manifest.ts'
export type { PermissionName, Photo } from './permissions.ts'
export type { ErrCode, KV, Limits, ViewInfo, WidgetSnapshot } from './protocol.ts'
export { transition } from './transition.ts'

import { createClient } from './client.ts'
export const os = createClient()

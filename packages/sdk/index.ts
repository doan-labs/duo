export { PlatformError } from './guards.ts'
export type { CameraHooks, Os, SettingsHost } from './legacy.ts'
export type { Manifest, Release, ReleaseId } from './manifest.ts'
export type { PermissionName, Photo } from './permissions.ts'
export type {
  DeviceEvent,
  DeviceEvents,
  ErrCode,
  KV,
  Limits,
  Switches,
  ViewInfo,
  WidgetSnapshot
} from './protocol.ts'
export { transition } from './transition.ts'

import { createClient } from './client.ts'
export const os = createClient()

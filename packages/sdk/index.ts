export { PlatformError } from './guards.ts'
export type { CameraHooks, FileHost, MicHost, Os, SettingsHost } from './legacy.ts'
export type { Manifest, Release, ReleaseId } from './manifest.ts'
export type { PermissionName, Photo } from './permissions.ts'
export type {
  DeviceEvent,
  DeviceEvents,
  ErrCode,
  KV,
  Limits,
  MicResult,
  MicStatus,
  Notice,
  StoredFile,
  Switches,
  ViewInfo,
  WidgetSnapshot
} from './protocol.ts'
export { transition } from './transition.ts'

import { createClient } from './client.ts'
export const os = createClient()

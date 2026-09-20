// Transitional host types for baked apps. Not the future sandbox bridge contract.
/** What the Camera app publishes for Camera Control and the volume buttons. */
export type CameraHooks = {
  shoot: () => void
  record: (on: boolean) => void
  /** Sets the zoom factor when given one; returns the current one. */
  zoom: (z?: number) => number
}

export type Os = {
  store?: import('./store.ts').Store
  /** Photos taken in Camera, newest first. One array per display. */
  shots: string[]
  /** Switch apps. `arg` arrives as `os.arg` in the app that opens. */
  open: (name: string, arg?: string) => void
  home: () => void
  arg?: string
  /** The glass this instance draws on: the folded cover or the open inner display. */
  display?: 'inner' | 'cover'
  /**
   * This instance is the copy the other display holds while the phone folds
   * (docs/decisions.md 24); the one in use is running too. A copy draws
   * everything and starts no sound of its own - shared playback (music.tsx's
   * `deck`) is module state and already plays once.
   */
  mirror?: boolean
  /** Set by the Camera app while it is open; the shell reads it for the frame buttons. */
  camera: { current: CameraHooks | null }
}

/**
 * The device switches Control Center and Settings both flip. One definition, so
 * the shell's store (springboard/toggles.ts) and the baked Settings app cannot
 * drift apart.
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
}

/**
 * What the shell hands the Settings app. Baked apps never import the shell, so
 * the switches, the eraser and the link opener arrive as a prop from apps.ts,
 * the way the Store gets `openExternal`.
 */
export type SettingsHost = {
  /** The live switch object; `subscribe` and `revision` drive `useSyncExternalStore`. */
  switches: Readonly<Switches>
  subscribe: (cb: () => void) => () => void
  revision: () => number
  flip: (key: keyof Switches, value?: boolean) => void
  /** The Wi-Fi network and the charge the status stack reports. */
  network: string
  battery: number
  /** Erase All Content and Settings: clears device storage and reloads the shell. */
  erase: () => Promise<void>
  openExternal: (url: string) => void
  /** Claim the side button's double-click while a sheet is up; the claim returns whether it consumed the press. */
  claimSide: (claim: () => boolean) => () => void
}

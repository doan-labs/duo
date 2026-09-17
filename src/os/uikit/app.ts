// The contract between the shell and an app: what an app is, and what the shell
// hands it. Its own module so the two never import each other in a cycle, and
// types only, so whoever wants nothing more than the shape — the device layer,
// the app registry — does not pull React and StyleX in with it.
import type { ComponentType } from 'react'

export type App = {
  name: string
  light?: boolean
  /** Draws under the status stack, edge to edge, and pads its own top; the shell adds no band. */
  edge?: boolean
  view: ComponentType<{ os: Os }>
  /** Names of the apps inside, when this tile is a folder rather than an app. */
  folder?: string[]
}

/** What the Camera app publishes for Camera Control and the volume buttons. */
export type CameraHooks = {
  shoot: () => void
  record: (on: boolean) => void
  /** Sets the zoom factor when given one; returns the current one. */
  zoom: (z?: number) => number
}

export type Os = {
  /** Photos taken in Camera, newest first. One array per display. */
  shots: string[]
  /** Switch apps. `arg` arrives as `os.arg` in the app that opens. */
  open: (name: string, arg?: string) => void
  home: () => void
  arg?: string
  /**
   * This instance is the copy the other display holds while the phone folds
   * (docs/decisions.md 24); the one in use is running too. A copy draws
   * everything and starts no sound of its own — shared playback (music.tsx's
   * `deck`) is module state and already plays once.
   */
  mirror?: boolean
  /** Set by the Camera app while it is open; the shell reads it for the frame buttons. */
  camera: { current: CameraHooks | null }
}

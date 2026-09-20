// React adapter for the shell's baked app registry.

import type { Os } from '@doan-labs/duo-sdk'
import type { ComponentType } from 'react'

export type App = {
  id?: string
  icon?: string
  name: string
  light?: boolean
  /** Draws under the status stack, edge to edge, and pads its own top; the shell adds no band. */
  edge?: boolean
  /** On the cover, keeps the right column free for the status stack, which stays whole; the shell adds no band. */
  rail?: boolean
  view: ComponentType<{ os: Os }>
  /** Invented data behind a static screen: the tile shows a dot and the app a 'Mockup' pill. */
  mock?: boolean
  /** Names of the apps inside, when this tile is a folder rather than an app. */
  folder?: string[]
}

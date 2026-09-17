// React adapter for the shell's baked app registry.

import type { Os } from '@doan-labs/ipduo-sdk'
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

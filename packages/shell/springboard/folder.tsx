// An open folder: its name over a glass well of the icons it holds, on the
// home screen blurred behind it. Its own file because it is a whole layer with
// a look of its own; what becomes of the icons (opened, carried out) is the
// home screen's business, so it only reports.

import { shared } from '@doan-labs/duo-uikit/styles.ts'
import {
  chrome,
  glass,
  layout,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { byName } from '../apps.ts'
import type { Folder } from './grid.ts'
import { type Open, Tile } from './tile.tsx'

export function FolderView({
  folder,
  onOpen,
  onHold,
  onRename,
  onClose
}: {
  folder: Folder
  onOpen: Open
  /** A tile inside, held still: the home screen carries it, out of the folder if it is let go outside the well. */
  onHold: (app: string, down: PointerEvent, tile: HTMLElement) => void
  onRename: (name: string) => void
  onClose: () => void
}) {
  // Leaving the way it came: the scrim fades in on open, so a close waits out
  // the same fade run backwards before the home screen unmounts it - Spotlight
  // closes itself off a `shut` the same way.
  const [closing, setClosing] = useState(false)
  const shut = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 200)
  }
  return (
    <div
      data-folder
      {...stylex.props(styles.scrim, closing && styles.scrimOut)}
      onClick={(e) => e.target === e.currentTarget && shut()}
    >
      {/* The name is a field: tap it to rename, as iOS lets you in its edit mode. */}
      <input
        key={folder.name}
        {...stylex.props(styles.name, closing && styles.away)}
        defaultValue={folder.name}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        onBlur={(e) => {
          const name = e.target.value.trim()
          if (name && name !== folder.name) onRename(name)
        }}
      />
      <div data-folder-well {...stylex.props(shared.glass, styles.well, closing && styles.away)}>
        {folder.apps.map((n, i) => {
          const a = byName(n)
          return a && <Tile key={n} a={a} i={i} onOpen={onOpen} onHold={(down, el) => onHold(n, down, el)} />
        })}
      </div>
    </div>
  )
}

const fade = stylex.keyframes({ from: { opacity: 0 } })
const unfade = stylex.keyframes({ to: { opacity: 0 } })
const settle = stylex.keyframes({ to: { transform: 'scale(.95)' } })

const styles = stylex.create({
  scrim: {
    position: 'absolute',
    inset: 0,
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: chrome.scrim,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    animationName: fade,
    animationDuration: '.22s'
  },
  // The open fade run backwards: the blur, name and well lift off together,
  // and the layer goes deaf so a tap mid-fade cannot reopen the shut.
  scrimOut: {
    animationName: { default: unfade, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.2s',
    animationFillMode: 'forwards',
    pointerEvents: 'none'
  },
  // A hint of the zoom back into the icon iOS plays out in full.
  away: {
    animationName: { default: settle, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.2s',
    animationFillMode: 'forwards'
  },
  name: {
    width: 220,
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    textAlign: 'center',
    color: 'inherit',
    textShadow: shadow.text,
    backgroundColor: { default: 'transparent', ':focus': glass.tint },
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: radius.md,
    outlineStyle: 'none',
    paddingTop: 4,
    paddingRight: 10,
    paddingBottom: 4,
    paddingLeft: 10
  },
  // Three across, as iOS lays a folder out; as many rows as it takes.
  well: {
    display: 'grid',
    gridTemplateColumns: `repeat(3,${layout.cell})`,
    gridAutoRows: layout.row,
    justifyItems: 'center',
    paddingTop: 18,
    paddingRight: 14,
    paddingBottom: 6,
    paddingLeft: 14,
    borderRadius: radius.xxl
  }
})

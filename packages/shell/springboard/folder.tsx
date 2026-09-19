// An open folder: its name over a glass well of the icons it holds, on the
// home screen blurred behind it. Its own file because it is a whole layer with
// a look of its own; what becomes of the icons (opened, carried out) is the
// home screen's business, so it only reports.

import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { layout } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
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
  return (
    <div data-folder {...stylex.props(styles.scrim)} onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* The name is a field: tap it to rename, as iOS lets you in its edit mode. */}
      <input
        key={folder.name}
        {...stylex.props(styles.name)}
        defaultValue={folder.name}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        onBlur={(e) => {
          const name = e.target.value.trim()
          if (name && name !== folder.name) onRename(name)
        }}
      />
      <div data-folder-well {...stylex.props(shared.glass, styles.well)}>
        {folder.apps.map((n, i) => {
          const a = byName(n)
          return a && <Tile key={n} a={a} i={i} onOpen={onOpen} onHold={(down, el) => onHold(n, down, el)} />
        })}
      </div>
    </div>
  )
}

const fade = stylex.keyframes({ from: { opacity: 0 } })

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
    backgroundColor: 'rgba(0,0,0,.3)',
    backdropFilter: 'blur(22px) saturate(140%)',
    WebkitBackdropFilter: 'blur(22px) saturate(140%)',
    animationName: fade,
    animationDuration: '.22s'
  },
  name: {
    width: 220,
    fontSize: 20,
    fontWeight: 600,
    textAlign: 'center',
    color: 'inherit',
    textShadow: '0 1px 4px rgba(0,0,0,.4)',
    backgroundColor: { default: 'transparent', ':focus': 'rgba(255,255,255,.18)' },
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: 10,
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
    borderRadius: 30
  }
})

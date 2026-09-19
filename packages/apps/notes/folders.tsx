import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { app, colors, leading, radius, tracking, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { useFolder, useFolders, useNotes } from './store.ts'

export const Folders = () => {
  const { notes } = useNotes()
  const { folders, add } = useFolders()
  const [current, setCurrent] = useFolder()
  const [naming, setNaming] = useState(false)
  // No prompt() inside a sandboxed frame, so the name is typed in place like the real sheet's field.
  const create = (name: string) => {
    setNaming(false)
    if (name.trim()) setCurrent(add(name.trim()).id)
  }
  return (
    <div {...stylex.props(styles.side)}>
      <div {...stylex.props(styles.sideHdr)}>
        <span {...stylex.props(styles.gold)}>Edit</span>
        <span {...stylex.props(styles.gold, styles.sideIcons)}>
          <button
            type="button"
            {...stylex.props(styles.gold, styles.flat, shared.press)}
            onClick={() => setNaming(true)}
            aria-label="New folder"
          >
            <Sym name="newFolder" size={18} />
          </button>
          <Sym name="sidebar" size={18} />
        </span>
      </div>
      <div {...stylex.props(styles.scroll)}>
        <Section name="iCloud" />
        <Row name="Notes" count={notes.filter((n) => !n.folder).length} on={!current} pick={() => setCurrent()} />
        {folders.map((f) => (
          <Row
            key={f.id}
            name={f.name}
            count={notes.filter((n) => n.folder === f.id).length}
            on={current === f.id}
            pick={() => setCurrent(f.id)}
          />
        ))}
        {naming && (
          <div {...stylex.props(styles.folder, animations.row)}>
            <Sym name="folder" size={16} />
            <input
              // biome-ignore lint/a11y/noAutofocus: the row exists only to be typed into
              autoFocus
              aria-label="Folder name"
              placeholder="New Folder"
              {...stylex.props(styles.input)}
              onBlur={(e) => create(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create(e.currentTarget.value)
                if (e.key === 'Escape') setNaming(false)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const Row = ({ name, count, on, pick }: { name: string; count: number; on: boolean; pick: () => void }) => (
  <button
    type="button"
    {...stylex.props(styles.folder, shared.select, animations.row, on && styles.folderOn)}
    onClick={pick}
  >
    <Sym name="folder" size={16} />
    <span {...stylex.props(styles.clip)}>{name}</span>
    <span {...stylex.props(styles.count)}>{count}</span>
  </button>
)

const Section = ({ name }: { name: string }) => (
  <div {...stylex.props(styles.section)}>
    {name}
    <i {...stylex.props(styles.chev, styles.gold)}>
      <Sym name="up" size={13} />
    </i>
  </div>
)

const styles = stylex.create({
  gold: { color: colors.yellow, opacity: 1 },
  flat: { display: 'flex', padding: 0 },
  side: {
    width: 198,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: app.surface,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: app.separator
  },
  sideHdr: {
    display: 'flex',
    alignItems: 'center',
    height: 40,
    paddingInline: 16,
    flexShrink: 0,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  sideIcons: { display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto' },
  scroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingBottom: 22 },
  folder: {
    width: 'calc(100% - 16px)',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    marginInline: 8,
    paddingBlock: 7,
    paddingInline: 8,
    borderRadius: radius.md,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    color: colors.yellow,
    cursor: 'pointer',
    textAlign: 'left'
  },
  // The glyph is the only yellow part of a row; the label stays white.
  clip: { color: colors.white, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  input: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: 0,
    backgroundColor: 'transparent',
    color: colors.white,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  folderOn: { backgroundColor: app.fill2 },
  count: {
    marginLeft: 'auto',
    paddingLeft: 8,
    color: colors.grey,
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
    paddingInline: 16,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline,
    letterSpacing: tracking.subheadline,
    fontWeight: weight.semibold
  },
  chev: { display: 'flex', marginLeft: 'auto', transform: 'rotate(180deg)' }
})

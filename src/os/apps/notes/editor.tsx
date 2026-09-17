import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { shared } from '../../uikit/styles.ts'
import { Sym } from '../../uikit/sym.tsx'
import { colors } from '../../uikit/tokens.stylex.ts'
import type { Note } from './data.ts'
import { useNoteText } from './store.ts'

/** Barrel colour per pencil; the nib is always pale. */
const PENS = ['#c8c9cd', '#0a84ff', '#e8453c', '#f2f2f7', '#c99a5b', '#2c2c2e']
const INKS = ['#ffffff', '#0a84ff', '#34c759', '#ffd60a', '#ff453a', '#1c1c1e']

export function NotePane({ note, ink, onInk }: { note: Note; ink: number; onInk: (i: number) => void }) {
  const [, , undo] = useNoteText(note)
  const [pen, setPen] = useState(1)
  return (
    <div {...stylex.props(styles.pane)}>
      <div {...stylex.props(styles.tools)}>
        <span {...stylex.props(styles.round)}>
          <Sym name="expand" size={14} />
        </span>
        <span {...stylex.props(styles.round)}>
          <Sym name="compose" size={15} />
        </span>
        <button type="button" {...stylex.props(styles.round)} onClick={undo}>
          <Sym name="undo" size={15} />
        </button>
        <span {...stylex.props(styles.group)}>
          <span {...stylex.props(styles.aa)}>Aa</span>
          <Sym name="checklist" size={15} />
          <Sym name="table" size={15} />
        </span>
        <span {...stylex.props(styles.group)}>
          <Sym name="markup" size={16} />
          <Sym name="share" size={15} />
          <i {...stylex.props(styles.double)}>
            <Sym name="forward" size={11} />
            <Sym name="forward" size={11} />
          </i>
        </span>
        <span {...stylex.props(styles.round, styles.push)}>
          <Sym name="search" size={14} />
        </span>
      </div>
      <NoteEditor note={note} ink={ink} />
      <div {...stylex.props(styles.palette)}>
        <button type="button" {...stylex.props(styles.flat)} onClick={undo}>
          <Sym name="undo" size={17} />
        </button>
        <i {...stylex.props(styles.flat, styles.dim, styles.mirror)}>
          <Sym name="undo" size={17} />
        </i>
        <i {...stylex.props(styles.bar)} />
        <div {...stylex.props(styles.pens)}>
          {PENS.map((c, i) => (
            <button
              key={c}
              type="button"
              {...stylex.props(styles.pen, styles.barrel(c), i === pen && styles.penUp)}
              onClick={() => setPen(i)}
            />
          ))}
        </div>
        <div {...stylex.props(styles.inks)}>
          {INKS.map((c, i) => (
            <button
              key={c}
              type="button"
              {...stylex.props(styles.ink, styles.fill(c), i === ink && styles.inkOn)}
              onClick={() => onInk(i)}
            />
          ))}
        </div>
        <i {...stylex.props(styles.flat)}>
          <Sym name="plus" size={15} />
        </i>
        <i {...stylex.props(styles.flat)}>
          <Sym name="more" size={17} />
        </i>
      </div>
    </div>
  )
}

export function NoteSheet({ note, back }: { note: Note; back: () => void }) {
  return (
    <div {...stylex.props(shared.column)}>
      <div {...stylex.props(shared.hdr, styles.hdrMd)}>
        <button type="button" {...stylex.props(shared.bk, styles.gold)} onClick={back}>
          <Sym name="back" size={20} />
          Notes
        </button>
        <span {...stylex.props(shared.hdrSm, styles.gold)}>
          <Sym name="share" size={19} />
          <Sym name="compose" size={19} />
          <Sym name="more" size={19} />
        </span>
      </div>
      <NoteEditor note={note} />
    </div>
  )
}

function NoteEditor({ note, ink }: { note: Note; ink?: number }) {
  const [body, put] = useNoteText(note)
  return (
    <textarea
      aria-label="Note text"
      {...stylex.props(styles.ta, note.ink && styles.hand, ink !== undefined && styles.tint(INKS[ink]!))}
      value={body}
      onChange={(e) => put(e.target.value)}
    />
  )
}

const styles = stylex.create({
  gold: { color: colors.yellow, opacity: 1 },
  push: { marginLeft: 'auto' },
  round: {
    width: 27,
    height: 27,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    backgroundColor: 'rgba(255,255,255,.1)',
    color: colors.white,
    flexShrink: 0
  },
  fill: (c: string) => ({ backgroundColor: c }),
  pane: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  tools: { display: 'flex', alignItems: 'center', gap: 6, paddingInline: 7, height: 40, flexShrink: 0 },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingInline: 11,
    height: 27,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,.1)'
  },
  aa: { fontSize: 13, fontWeight: 500 },
  double: { display: 'flex' },
  hdrMd: { fontSize: 17 },
  ta: {
    flexGrow: 1,
    borderWidth: 0,
    paddingTop: 12,
    paddingInline: 20,
    paddingBottom: 70,
    resize: 'none',
    outline: 0,
    backgroundColor: 'transparent',
    color: colors.white,
    fontSize: 16,
    lineHeight: 1.5,
    fontFamily: 'inherit'
  },
  // Apple Pencil, faked by the one handwriting face every Mac ships with.
  hand: {
    fontFamily: '"Bradley Hand","Marker Felt","Segoe Script",cursive',
    fontSize: 52,
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: 1
  },
  tint: (c: string) => ({ color: c }),
  // Clear of the home bar: that pill is 22 px tall, centred, and owns its
  // pointers from a layer above the app, so a palette any lower would swallow
  // the only gesture out of Notes.
  palette: {
    position: 'absolute',
    bottom: 26,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    height: 58,
    paddingInline: 12,
    borderRadius: 17,
    backgroundColor: '#2c2c2e',
    boxShadow: '0 12px 30px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.1)',
    zIndex: 5
  },
  flat: { display: 'flex', color: colors.white, flexShrink: 0 },
  dim: { opacity: 0.35 },
  mirror: { transform: 'scaleX(-1)' },
  bar: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,.2)' },
  pens: { display: 'flex', alignItems: 'flex-start', gap: 5, height: 58, overflow: 'hidden' },
  pen: {
    width: 14,
    height: 40,
    flexShrink: 0,
    clipPath: 'polygon(0 0,100% 0,100% 62%,50% 100%,0 62%)',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    // The dark barrel would be invisible against the tray without it.
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.22)',
    marginTop: 13,
    transitionProperty: 'margin-top',
    transitionDuration: '.18s'
  },
  penUp: { marginTop: 4 },
  barrel: (c: string) => ({ backgroundImage: `linear-gradient(180deg,${c} 0 60%,#e7e7ea 60%)` }),
  inks: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    gap: 4,
    padding: 4,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,.07)'
  },
  ink: { width: 14, height: 14, borderRadius: '50%' },
  inkOn: { boxShadow: '0 0 0 1.5px #2c2c2e,0 0 0 3px #fff' }
})

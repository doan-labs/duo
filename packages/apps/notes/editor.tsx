import { Title, VStack } from '@doan-labs/ipduo-uikit'
import { shared } from '@doan-labs/ipduo-uikit/styles.ts'
import { Sym } from '@doan-labs/ipduo-uikit/sym.tsx'
import { appAppearance, colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import type { Note } from './data.ts'
import { useNoteText } from './store.ts'

/** Barrel colour per pencil; the nib is always pale. */
const PENS = [
  appAppearance.notesColor,
  appAppearance.notesColor2,
  appAppearance.notesColor3,
  appAppearance.notesColor4,
  appAppearance.notesColor5,
  appAppearance.notesColor6
]
const INKS = [
  appAppearance.notesColor7,
  appAppearance.notesColor2,
  appAppearance.notesColor8,
  appAppearance.notesColor9,
  appAppearance.memosColor,
  appAppearance.notesColor10
]

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
    <VStack>
      <Title xstyle={[styles.hdrMd]}>
        <button type="button" {...stylex.props(shared.bk, styles.gold)} onClick={back}>
          <Sym name="back" size={20} />
          Notes
        </button>
        <Title as="span" variant="accessory" xstyle={[styles.gold]}>
          <Sym name="share" size={19} />
          <Sym name="compose" size={19} />
          <Sym name="more" size={19} />
        </Title>
      </Title>
      <NoteEditor note={note} />
    </VStack>
  )
}

function NoteEditor({ note, ink }: { note: Note; ink?: number }) {
  const [body, put, , state] = useNoteText(note)
  return (
    <>
      <div role="status" aria-live="polite" {...stylex.props(styles.save)}>
        {state?.status === 'error'
          ? `Not saved (${state.error})`
          : state?.status === 'saving'
            ? 'Saving…'
            : state?.status === 'hydrating'
              ? 'Loading…'
              : 'Saved'}
      </div>
      <textarea
        aria-label="Note text"
        {...stylex.props(styles.ta, note.ink && styles.hand, ink !== undefined && styles.tint(INKS[ink]!))}
        value={body}
        onChange={(e) => put(e.target.value)}
      />
    </>
  )
}

const styles = stylex.create({
  save: { fontSize: appAppearance.musicFontSize3, color: colors.white, opacity: 0.6, paddingInline: 20, minHeight: 16 },
  gold: { color: colors.yellow, opacity: 1 },
  push: { marginLeft: 'auto' },
  round: {
    width: 27,
    height: 27,
    borderRadius: appAppearance.settingsBorderRadius,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: appAppearance.podcastsBorderTopColor,
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
    borderRadius: appAppearance.musicBorderRadius,
    backgroundColor: appAppearance.podcastsBorderTopColor
  },
  aa: { fontSize: appAppearance.musicFontSize6, fontWeight: appAppearance.musicFontWeight3 },
  double: { display: 'flex' },
  hdrMd: { fontSize: appAppearance.messagesFontSize },
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
    fontSize: appAppearance.calendarFontSize,
    lineHeight: 1.5,
    fontFamily: appAppearance.notesFontFamily
  },
  // Apple Pencil, faked by the one handwriting face every Mac ships with.
  hand: {
    fontFamily: appAppearance.notesFontFamily2,
    fontSize: appAppearance.notesFontSize,
    fontWeight: appAppearance.musicFontWeight2,
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
    borderRadius: appAppearance.messagesFontSize,
    backgroundColor: appAppearance.notesColor6,
    boxShadow: appAppearance.notesBoxShadow,
    zIndex: 5
  },
  flat: { display: 'flex', color: colors.white, flexShrink: 0 },
  dim: { opacity: 0.35 },
  mirror: { transform: 'scaleX(-1)' },
  bar: { width: 1, height: 26, backgroundColor: appAppearance.musicBackgroundColor },
  pens: { display: 'flex', alignItems: 'flex-start', gap: 5, height: 58, overflow: 'hidden' },
  pen: {
    width: 14,
    height: 40,
    flexShrink: 0,
    clipPath: 'polygon(0 0,100% 0,100% 62%,50% 100%,0 62%)',
    borderTopLeftRadius: appAppearance.musicBorderRadius2,
    borderTopRightRadius: appAppearance.musicBorderRadius2,
    // The dark barrel would be invisible against the tray without it.
    boxShadow: appAppearance.notesBoxShadow2,
    marginTop: 13,
    transitionProperty: 'margin-top',
    transitionDuration: '.18s'
  },
  penUp: { marginTop: 4 },
  barrel: (c: string) => ({ backgroundImage: `linear-gradient(180deg,${c} 0 60%,${colors.penRim} 60%)` }),
  inks: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    gap: 4,
    padding: 4,
    borderRadius: appAppearance.musicFontSize3,
    backgroundColor: appAppearance.memosBackgroundColor
  },
  ink: { width: 14, height: 14, borderRadius: appAppearance.settingsBorderRadius },
  inkOn: { boxShadow: appAppearance.notesBoxShadow3 }
})

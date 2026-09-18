import { Title, usePresence, VStack } from '@doan-labs/duo-uikit'
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { appAppearance, colors, easing } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { longStamp, type Note } from './data.ts'
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

export function NotePane({
  note,
  ink,
  onInk,
  compose,
  trash
}: {
  note?: Note
  ink: number
  onInk: (i: number) => void
  compose: () => void
  trash: () => void
}) {
  const [pen, setPen] = useState(1)
  // The palette is a mode the pencil button enters, not furniture.
  const [marking, setMarking] = useState(false)
  const palette = usePresence(marking)
  if (!note) return <div {...stylex.props(styles.pane, styles.none, shared.swap)}>No Note Selected</div>
  return (
    <div {...stylex.props(styles.pane, shared.swap)}>
      <div {...stylex.props(styles.tools)}>
        <span {...stylex.props(styles.round, shared.press)}>
          <Sym name="expand" size={14} />
        </span>
        <button type="button" {...stylex.props(styles.round, shared.press)} onClick={compose} aria-label="New note">
          <Sym name="compose" size={15} />
        </button>
        <span {...stylex.props(styles.group)}>
          <span {...stylex.props(styles.aa)}>Aa</span>
          <Sym name="checklist" size={15} />
          <Sym name="table" size={15} />
        </span>
        <span {...stylex.props(styles.group)}>
          <button
            type="button"
            {...stylex.props(styles.flat, shared.press, marking && styles.gold)}
            onClick={() => setMarking(!marking)}
            aria-pressed={marking}
            aria-label="Markup"
          >
            <Sym name="markup" size={16} />
          </button>
          <Sym name="share" size={15} />
          <button type="button" {...stylex.props(styles.flat, shared.press)} onClick={trash} aria-label="Delete note">
            <Sym name="trash" size={15} />
          </button>
          <i {...stylex.props(styles.double)}>
            <Sym name="forward" size={11} />
            <Sym name="forward" size={11} />
          </i>
        </span>
        <span {...stylex.props(styles.round, styles.push, shared.press)}>
          <Sym name="search" size={14} />
        </span>
      </div>
      <NoteEditor note={note} ink={marking ? ink : undefined} />
      {palette.mounted && (
        <div
          role="toolbar"
          aria-label="Markup tools"
          {...stylex.props(styles.palette, animations.float, palette.closing && animations.floatOut)}
        >
          <i {...stylex.props(styles.flat, styles.dim)}>
            <Sym name="undo" size={17} />
          </i>
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
                {...stylex.props(styles.ink, shared.press, styles.fill(c), i === ink && styles.inkOn)}
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
      )}
    </div>
  )
}

export function NoteSheet({
  note,
  back,
  compose,
  trash
}: {
  note: Note
  back: () => void
  compose: () => void
  trash: () => void
}) {
  return (
    <VStack>
      <Title xstyle={[styles.hdrMd]}>
        <button type="button" {...stylex.props(shared.bk, styles.gold)} onClick={back}>
          <Sym name="back" size={20} />
          Notes
        </button>
        <Title as="span" variant="accessory" xstyle={[styles.gold]}>
          <button type="button" {...stylex.props(styles.flat, styles.gold)} onClick={trash} aria-label="Delete note">
            <Sym name="trash" size={19} />
          </button>
          <button type="button" {...stylex.props(styles.flat, styles.gold)} onClick={compose} aria-label="New note">
            <Sym name="compose" size={19} />
          </button>
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
        {state?.status === 'error' ? `Not saved (${state.error})` : longStamp(note)}
      </div>
      <textarea
        aria-label="Note text"
        {...stylex.props(styles.ta, ink !== undefined && styles.tint(INKS[ink]!))}
        value={body}
        onChange={(e) => put(e.target.value)}
      />
    </>
  )
}

const styles = stylex.create({
  save: {
    fontSize: appAppearance.musicFontSize3,
    color: colors.grey,
    textAlign: 'center',
    paddingTop: 10,
    minHeight: 16
  },
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
  none: { alignItems: 'center', justifyContent: 'center', color: colors.grey },
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
    fontFamily: appAppearance.notesFontFamily,
    transitionProperty: 'color',
    transitionDuration: '.3s'
  },
  tint: (c: string) => ({ color: c }),
  // Clear of the home bar: that pill is 22 px tall, centred, and owns its
  // pointers from a layer above the app, so a palette any lower would swallow
  // the only gesture out of Notes.
  palette: {
    position: 'absolute',
    bottom: 26,
    left: '50%',
    translate: '-50%',
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
    transitionDuration: '.28s',
    transitionTimingFunction: easing.spring
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
  ink: {
    width: 14,
    height: 14,
    borderRadius: appAppearance.settingsBorderRadius
  },
  inkOn: { boxShadow: appAppearance.notesBoxShadow3, transform: 'scale(1.15)' }
})

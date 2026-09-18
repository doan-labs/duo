import { art } from '@doan-labs/duo-uikit/shared.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { appAppearance, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { GROUPS, type Note } from './data.ts'
import { useNoteText } from './store.ts'

export function NoteList({ sel, onPick }: { sel?: string; onPick: (n: Note) => void }) {
  return (
    <div {...stylex.props(styles.groups)}>
      {GROUPS.map(({ name, notes }) => (
        <div key={name}>
          <div {...stylex.props(styles.groupHdr)}>{name}</div>
          {notes.map((n) => (
            <NoteRow key={n.id} note={n} sel={sel} onPick={onPick} />
          ))}
        </div>
      ))}
    </div>
  )
}

function NoteRow({ note: n, sel, onPick }: { note: Note; sel?: string; onPick: (n: Note) => void }) {
  const [body] = useNoteText(n)
  const [first, ...rest] = body.split('\n')
  const title = n.ink ? 'New Note' : first || 'New Note'
  const preview = n.ink ? 'Handwritten note' : rest.join(' ').trim() || 'No additional text'
  return (
    <button type="button" {...stylex.props(styles.li, n.id === sel && styles.liOn)} onClick={() => onPick(n)}>
      {n.mark && (
        <i {...stylex.props(styles.mark)}>
          <Sym name={n.mark} size={13} />
        </i>
      )}
      <span {...stylex.props(styles.liTx)}>
        <b {...stylex.props(styles.liTitle)}>{title}</b>
        <span {...stylex.props(styles.liSub)}>
          <span {...stylex.props(styles.when)}>{n.when}</span>
          <span {...stylex.props(styles.clip)}>{preview}</span>
        </span>
      </span>
      {n.thumb && <i {...stylex.props(styles.thumb, styles.art(art(n.body)))}>{title[0]}</i>}
    </button>
  )
}

const styles = stylex.create({
  clip: { color: colors.white, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  groups: { paddingInline: 10 },
  groupHdr: {
    fontSize: appAppearance.calendarFontSize,
    fontWeight: appAppearance.musicFontWeight,
    paddingTop: 8,
    paddingBottom: 8,
    paddingInline: 2
  },
  li: {
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    paddingBlock: 8,
    paddingInline: 8,
    borderRadius: appAppearance.calendarFontSize4,
    cursor: 'pointer',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.notesBorderBottomColor
  },
  liOn: { backgroundColor: appAppearance.notesBackgroundColor, color: colors.black, borderBottomColor: 'transparent' },
  liTx: { minWidth: 0, flexGrow: 1 },
  liTitle: {
    display: 'block',
    fontSize: appAppearance.musicFontSize6,
    fontWeight: appAppearance.musicFontWeight2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  liSub: { display: 'flex', gap: 7, fontSize: appAppearance.musicFontSize3, opacity: 0.72, marginTop: 1 },
  when: { flexShrink: 0 },
  mark: { display: 'flex', flexShrink: 0, opacity: 0.75 },
  thumb: {
    width: 30,
    height: 30,
    borderRadius: appAppearance.memosBorderRadius,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    fontSize: appAppearance.musicFontSize6,
    fontWeight: appAppearance.musicFontWeight,
    fontStyle: 'normal',
    color: colors.white
  },
  art: (bg: string) => ({ backgroundImage: bg })
})

import * as stylex from '@stylexjs/stylex'
import { Sym } from '../../uikit/sym.tsx'
import { colors } from '../../uikit/tokens.stylex.ts'
import { art } from '../shared.ts'
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
  groupHdr: { fontSize: 16, fontWeight: 700, paddingTop: 8, paddingBottom: 8, paddingInline: 2 },
  li: {
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    paddingBlock: 8,
    paddingInline: 8,
    borderRadius: 10,
    cursor: 'pointer',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(255,255,255,.11)'
  },
  liOn: { backgroundColor: '#e2b93b', color: colors.black, borderBottomColor: 'transparent' },
  liTx: { minWidth: 0, flexGrow: 1 },
  liTitle: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  liSub: { display: 'flex', gap: 7, fontSize: 11, opacity: 0.72, marginTop: 1 },
  when: { flexShrink: 0 },
  mark: { display: 'flex', flexShrink: 0, opacity: 0.75 },
  thumb: {
    width: 30,
    height: 30,
    borderRadius: 5,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    fontSize: 13,
    fontWeight: 700,
    fontStyle: 'normal',
    color: colors.white
  },
  art: (bg: string) => ({ backgroundImage: bg })
})

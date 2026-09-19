import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import {
  appAppearance,
  colors,
  leading,
  radius,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { group, type Note, stamp } from './data.ts'
import { useNotes, useNoteText } from './store.ts'

export function NoteList({
  notes,
  q = '',
  sel,
  onPick
}: {
  notes: Note[]
  q?: string
  sel?: string
  onPick: (n: Note) => void
}) {
  const { hydrating } = useNotes()
  if (!notes.length) return <div {...stylex.props(styles.empty)}>{hydrating ? 'Loading…' : 'No Notes'}</div>
  return (
    <div {...stylex.props(styles.groups)}>
      {group(notes).map(({ name, notes }) => (
        <div key={name}>
          <div {...stylex.props(styles.groupHdr)}>{name}</div>
          {notes.map((n) => (
            <NoteRow key={n.id} note={n} q={q} sel={sel} onPick={onPick} />
          ))}
        </div>
      ))}
    </div>
  )
}

function NoteRow({ note: n, q, sel, onPick }: { note: Note; q: string; sel?: string; onPick: (n: Note) => void }) {
  const [body] = useNoteText(n)
  if (q && !body.toLowerCase().includes(q.toLowerCase())) return null
  const [first, ...rest] = body.split('\n')
  const title = first || 'New Note'
  const preview = rest.join(' ').trim() || 'No additional text'
  return (
    <button
      type="button"
      {...stylex.props(styles.li, shared.select, animations.row, n.id === sel && styles.liOn)}
      onClick={() => onPick(n)}
    >
      <span {...stylex.props(styles.liTx)}>
        <b {...stylex.props(styles.liTitle)}>{title}</b>
        <span {...stylex.props(styles.liSub)}>
          <span {...stylex.props(styles.when)}>{stamp(n)}</span>
          <span {...stylex.props(styles.clip)}>{preview}</span>
        </span>
      </span>
    </button>
  )
}

const styles = stylex.create({
  clip: { color: colors.white, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  groups: { paddingInline: 10 },
  empty: { textAlign: 'center', paddingTop: 40, color: colors.grey },
  groupHdr: {
    fontSize: typeScale.callout,
    lineHeight: leading.callout,
    letterSpacing: tracking.callout,
    fontWeight: weight.bold,
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
    borderRadius: radius.md,
    cursor: 'pointer',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: appAppearance.notesHairline
  },
  liOn: { backgroundColor: appAppearance.notesYellow, color: colors.black, borderBottomColor: 'transparent' },
  liTx: { minWidth: 0, flexGrow: 1 },
  liTitle: {
    display: 'block',
    fontSize: typeScale.footnote,
    lineHeight: leading.footnote,
    letterSpacing: tracking.footnote,
    fontWeight: weight.semibold,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  liSub: {
    display: 'flex',
    gap: 7,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    opacity: 0.72,
    marginTop: 1
  },
  when: { flexShrink: 0 }
})

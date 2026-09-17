import * as stylex from '@stylexjs/stylex'
import { Sym } from '../../uikit/sym.tsx'
import { colors } from '../../uikit/tokens.stylex.ts'
import { NOTES } from './data.ts'

const FOLDERS: [name: string, count: number, icon: 'folder' | 'gear' | 'trash'][] = [
  ['All iCloud', 71, 'folder'],
  ['Notes', NOTES.length, 'folder'],
  ['Ideas', 5, 'gear'],
  ['Personal', 7, 'folder'],
  ['Professional', 1, 'folder'],
  ['Recently Deleted', 13, 'trash']
]

export const Folders = () => (
  <div {...stylex.props(styles.side)}>
    <div {...stylex.props(styles.sideHdr)}>
      <span {...stylex.props(styles.gold)}>Edit</span>
      <span {...stylex.props(styles.gold, styles.sideIcons)}>
        <Sym name="newFolder" size={18} />
        <Sym name="sidebar" size={18} />
      </span>
    </div>
    <div {...stylex.props(styles.scroll)}>
      <div {...stylex.props(styles.folder)}>
        <Sym name="note" size={16} />
        Quick Notes
        <span {...stylex.props(styles.count)}>2</span>
      </div>
      <div {...stylex.props(styles.folder)}>
        <Sym name="people" size={16} />
        Shared
        <span {...stylex.props(styles.count)}>4</span>
      </div>
      <Section name="iCloud" />
      {FOLDERS.map(([name, n, icon]) => (
        <div key={name} {...stylex.props(styles.folder, name === 'Notes' && styles.folderOn)}>
          <Sym name={icon} size={16} />
          <span {...stylex.props(styles.clip)}>{name}</span>
          <span {...stylex.props(styles.count)}>{n}</span>
        </div>
      ))}
      <Section name="Tags" />
      <div {...stylex.props(styles.tags)}>
        {['All Tags', '#Book', '#Ideas'].map((t) => (
          <span key={t} {...stylex.props(styles.tag)}>
            {t}
          </span>
        ))}
      </div>
    </div>
  </div>
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
  side: {
    width: 198,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.darkElevated,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: 'rgba(255,255,255,.08)'
  },
  sideHdr: {
    display: 'flex',
    alignItems: 'center',
    height: 40,
    paddingInline: 16,
    flexShrink: 0,
    fontSize: 14
  },
  sideIcons: { display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto' },
  scroll: { flexGrow: 1, minHeight: 0, overflow: 'auto', paddingBottom: 22 },
  folder: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    marginInline: 8,
    paddingBlock: 7,
    paddingInline: 8,
    borderRadius: 9,
    fontSize: 13,
    color: colors.yellow,
    cursor: 'pointer'
  },
  // The glyph is the only yellow part of a row; the label stays white.
  clip: { color: colors.white, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  folderOn: { backgroundColor: 'rgba(255,255,255,.12)' },
  count: { marginLeft: 'auto', paddingLeft: 8, color: colors.grey, fontSize: 13 },
  section: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
    paddingInline: 16,
    fontSize: 15,
    fontWeight: 600
  },
  chev: { display: 'flex', marginLeft: 'auto', transform: 'rotate(180deg)' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 6, paddingInline: 16, paddingTop: 6 },
  tag: {
    paddingBlock: 5,
    paddingInline: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,.1)',
    fontSize: 12,
    color: colors.grey
  }
})

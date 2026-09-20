import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { styles } from './styles.ts'

type Props = { onNavigate: (url: string) => void }
type Section = 'bookmarks' | 'reading-list' | 'history'
type Folder = 'recently-saved' | 'favorites' | 'tab-group-favorites'

const sections: [Section, string, 'bookOutline' | 'eye' | 'clockSym'][] = [
  ['bookmarks', 'Bookmarks', 'bookOutline'],
  ['reading-list', 'Reading List', 'eye'],
  ['history', 'History', 'clockSym']
]

const favorites = [
  ['Apple', 'https://www.apple.com', 'apple.com'],
  ['Wikipedia', 'https://en.m.wikipedia.org', 'en.m.wikipedia.org'],
  ['three.js', 'https://threejs.org', 'threejs.org'],
  ['Bun', 'https://bun.sh/docs', 'bun.sh/docs']
] as const

const recent = [
  ['Duo', 'https://duo.doan-labs.com', 'duo.doan-labs.com'],
  ['Wikipedia', 'https://en.m.wikipedia.org', 'en.m.wikipedia.org']
] as const

const iconFor = (label: string): 'star' | 'globe' | 'bookOutline' =>
  label === 'Apple' ? 'star' : label === 'Wikipedia' ? 'globe' : 'bookOutline'

export const Bookmarks = ({ onNavigate }: Props) => {
  const [section, setSection] = useState<Section>('bookmarks')
  const [folder, setFolder] = useState<Folder | null>(null)

  const title =
    folder === 'favorites' ? 'Favorites' : folder === 'tab-group-favorites' ? 'Tab Group Favorites' : 'Recently Saved'
  const selectSection = (next: Section) => {
    setSection(next)
    setFolder(null)
  }
  const openFolder = (next: Folder) => setFolder(next)
  const showBack = folder !== null
  const showRoot = section === 'bookmarks' && folder === null
  const folderRows = folder === 'favorites' ? favorites : folder === 'recently-saved' ? recent : []

  return (
    <div {...stylex.props(styles.bookmarks)}>
      <div {...stylex.props(styles.bookmarkHeader)}>
        {showBack && (
          <button
            type="button"
            {...stylex.props(styles.bookmarkHeaderBack)}
            aria-label="Back to bookmarks"
            onClick={() => setFolder(null)}
          >
            <Sym name="back" size={18} />
          </button>
        )}
        <button
          type="button"
          {...stylex.props(styles.bookmarkHeaderButton)}
          onClick={() => !showBack && openFolder('recently-saved')}
        >
          <span>{title}</span>
          {!showBack && <Sym name="forward" size={15} />}
        </button>
      </div>
      <div {...stylex.props(styles.bookmarkSegments)} role="tablist" aria-label="Bookmarks sections">
        {sections.map(([id, label, icon]) => (
          <button
            type="button"
            key={id}
            role="tab"
            aria-selected={section === id}
            aria-label={label}
            {...stylex.props(styles.bookmarkSegment, section === id && styles.bookmarkSegmentOn)}
            onClick={() => selectSection(id)}
          >
            <Sym name={icon} size={21} />
          </button>
        ))}
      </div>
      {showRoot ? (
        <>
          <div {...stylex.props(styles.bookmarkSection)}>Folders</div>
          <div {...stylex.props(styles.bookmarkGroup)}>
            <button type="button" {...stylex.props(styles.bookmarkRow)} onClick={() => openFolder('favorites')}>
              <span {...stylex.props(styles.bookmarkIcon, styles.bookmarkIconStar)}>
                <Sym name="star" size={17} />
              </span>
              <span>Favorites</span>
              <span {...stylex.props(styles.bookmarkCount)}>4</span>
              <Sym name="forward" size={15} />
            </button>
            <button
              type="button"
              {...stylex.props(styles.bookmarkRow)}
              onClick={() => openFolder('tab-group-favorites')}
            >
              <span {...stylex.props(styles.bookmarkIcon, styles.bookmarkIconFolder)}>
                <Sym name="folder" size={17} />
              </span>
              <span>Tab Group Favorites</span>
              <Sym name="forward" size={15} />
            </button>
          </div>
          <div {...stylex.props(styles.bookmarkSection)}>Bookmarks</div>
          <div {...stylex.props(styles.bookmarkGroup)}>
            <button
              type="button"
              {...stylex.props(styles.bookmarkRow)}
              onClick={() => onNavigate('https://support.apple.com/guide/iphone/welcome/ios')}
            >
              <span {...stylex.props(styles.bookmarkIcon, styles.bookmarkIconApple)}></span>
              <span>iPhone User Guide</span>
            </button>
          </div>
        </>
      ) : folder === 'tab-group-favorites' ? (
        <BookmarkList title="Tab Group Favorites" rows={recent} onNavigate={onNavigate} />
      ) : folderRows.length ? (
        <BookmarkList title={title} rows={folderRows} onNavigate={onNavigate} />
      ) : section === 'reading-list' ? (
        <BookmarkList title="Reading List" rows={recent} onNavigate={onNavigate} />
      ) : (
        <BookmarkList title="History" rows={favorites.slice(0, 2)} onNavigate={onNavigate} />
      )}
    </div>
  )
}

const BookmarkList = ({
  title,
  rows,
  onNavigate
}: {
  title: string
  rows: readonly (readonly [string, string, string])[]
  onNavigate: (url: string) => void
}) => (
  <>
    <div {...stylex.props(styles.bookmarkSection)}>{title}</div>
    <div {...stylex.props(styles.bookmarkGroup)}>
      {rows.map(([label, url, detail]) => (
        <button type="button" key={url} {...stylex.props(styles.bookmarkRow)} onClick={() => onNavigate(url)}>
          <span {...stylex.props(styles.bookmarkIcon, styles.bookmarkIconLink)}>
            <Sym name={iconFor(label)} size={17} />
          </span>
          <span {...stylex.props(styles.bookmarkLabel)}>
            <span>{label}</span>
            <span {...stylex.props(styles.bookmarkDetail)}>{detail}</span>
          </span>
          <Sym name="forward" size={15} />
        </button>
      ))}
    </div>
  </>
)

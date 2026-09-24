import { animations, Sym } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { type PointerEvent, type ReactNode, useRef, useState } from 'react'
import { Avatar } from './avatar.tsx'
import { type Contact, type ContactList, fullName, letterOf, matches } from './data.ts'
import { styles } from './styles.ts'

export const ALL = ''
export const FAVORITES = 'favorites'

/** How a list column names itself in its header and back button. */
export const listTitle = (id: string, lists: ContactList[]) =>
  id === ALL ? 'All Contacts' : id === FAVORITES ? 'Favorites' : (lists.find((l) => l.id === id)?.name ?? 'Contacts')

export const inList = (c: Contact, id: string) =>
  id === ALL ? true : id === FAVORITES ? c.favorite : c.lists.includes(id)

// ---------- the Lists page: All Contacts, Favorites, then the user's own ----------

type ListsProps = {
  contacts: Contact[]
  lists: ContactList[]
  current: string
  onPick: (id: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
  wide: boolean
}
export const Lists = ({ contacts, lists, current, onPick, onAdd, onRemove, wide }: ListsProps) => {
  const count = (id: string) => contacts.filter((c) => inList(c, id)).length
  const row = (id: string, name: string, icon: ReactNode, removable = false) => (
    <button
      key={id || 'all'}
      type="button"
      aria-current={wide && current === id ? 'true' : undefined}
      {...stylex.props(styles.row, wide && current === id && styles.rowOn)}
      onClick={() => onPick(id)}
      onDoubleClick={removable ? () => onRemove(id) : undefined}
      title={removable ? 'Double-click to delete list' : undefined}
    >
      <span {...stylex.props(styles.listIcon)}>{icon}</span>
      <span {...stylex.props(styles.rowName, styles.rowLast)}>{name}</span>
      <span {...stylex.props(styles.count)}>{count(id)}</span>
      {!wide && (
        <span {...stylex.props(styles.chevron)}>
          <Sym name="forward" size={13} />
        </span>
      )}
    </button>
  )
  return (
    <div {...stylex.props(styles.column)}>
      <div {...stylex.props(styles.hdr)}>
        <span {...stylex.props(styles.hdrSpace)}>
          <button type="button" aria-label="Add list" {...stylex.props(styles.circle)} onClick={onAdd}>
            <Sym name="newFolder" size={17} />
          </button>
        </span>
      </div>
      <div {...stylex.props(styles.hero, !wide && styles.heroSm)}>Lists</div>
      <div {...stylex.props(styles.scroll)}>
        <div {...stylex.props(styles.groupLabel)}>iCloud</div>
        <div {...stylex.props(styles.group)}>
          {row(ALL, 'All Contacts', <Sym name="people" size={16} />)}
          {row(FAVORITES, 'Favorites', <Sym name="starFill" size={15} />)}
          {lists.map((l) => row(l.id, l.name, <Sym name="list" size={15} />, true))}
        </div>
        {lists.length === 0 && <div {...stylex.props(styles.empty)}>Tap the folder to add a list.</div>}
      </div>
    </div>
  )
}

// ---------- the A-Z directory, with search, My Card and the index rail ----------

type DirectoryProps = {
  title: string
  contacts: Contact[]
  me?: Contact
  sel?: string
  query: string
  onQuery: (q: string) => void
  onPick: (c: Contact) => void
  onAdd: () => void
  onBack: () => void
  wide: boolean
}
export const Directory = ({
  title,
  contacts,
  me,
  sel,
  query,
  onQuery,
  onPick,
  onAdd,
  onBack,
  wide
}: DirectoryProps) => {
  const needle = query.trim().toLowerCase()
  const shown = contacts.filter((c) => c.id !== me?.id && matches(c, needle))
  const sections: [string, Contact[]][] = []
  for (const c of shown) {
    const letter = letterOf(c)
    const last = sections[sections.length - 1]
    if (last && last[0] === letter) last[1].push(c)
    else sections.push([letter, [c]])
  }
  const scroller = useRef<HTMLDivElement>(null)
  const jump = (letter: string) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-letter="${letter}"]`)
    if (el) scroller.current!.scrollTo({ top: el.offsetTop })
  }
  let i = 0
  return (
    <div {...stylex.props(styles.column)}>
      <div {...stylex.props(styles.hdr, !wide && styles.hdrInner)}>
        <button type="button" {...stylex.props(styles.hdrBack)} onClick={onBack}>
          <Sym name="back" size={20} />
          Lists
        </button>
        <span {...stylex.props(styles.hdrSpace)}>
          <button type="button" aria-label="Add contact" {...stylex.props(styles.circle)} onClick={onAdd}>
            <Sym name="plus" size={16} />
          </button>
        </span>
      </div>
      <div {...stylex.props(styles.hero, !wide && styles.heroSm)}>{title}</div>
      <label {...stylex.props(styles.search)}>
        <Sym name="search" size={15} />
        <input
          {...stylex.props(styles.searchIn)}
          placeholder="Search"
          aria-label="Search contacts"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        {query && (
          <button type="button" aria-label="Clear search" {...stylex.props(styles.clear)} onClick={() => onQuery('')}>
            <Sym name="close" size={12} />
          </button>
        )}
      </label>
      <div ref={scroller} {...stylex.props(styles.scroll, styles.withRail)}>
        {me && !needle && (
          <div {...stylex.props(styles.group)}>
            <Person c={me} on={sel === me.id} onPick={onPick} sub="My Card" size={44} />
          </div>
        )}
        {sections.map(([letter, people]) => (
          <div key={`${letter}${needle}`}>
            <div data-letter={letter} {...stylex.props(styles.sec)}>
              {letter}
            </div>
            <div {...stylex.props(styles.group)}>
              {people.map((c) => (
                <Person
                  key={c.id}
                  c={c}
                  on={sel === c.id}
                  onPick={onPick}
                  index={needle ? i++ : undefined}
                  sub={needle && !fullName(c).toLowerCase().includes(needle) ? c.phone || c.email : undefined}
                />
              ))}
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <div {...stylex.props(styles.empty, animations.fade)}>
            {needle ? `No results for "${query.trim()}"` : 'No Contacts'}
          </div>
        )}
      </div>
      {!needle && sections.length > 3 && <Rail letters={sections.map(([l]) => l)} onJump={jump} />}
    </div>
  )
}

type PersonProps = {
  c: Contact
  on: boolean
  onPick: (c: Contact) => void
  sub?: ReactNode
  size?: number
  index?: number
}
const Person = ({ c, on, onPick, sub, size = 36, index }: PersonProps) => (
  <button
    type="button"
    aria-current={on ? 'true' : undefined}
    {...stylex.props(
      styles.row,
      on && styles.rowOn,
      index != null && animations.row,
      index != null && styles.stagger(index)
    )}
    onClick={() => onPick(c)}
  >
    <Avatar contact={c} size={size} />
    <span {...stylex.props(styles.rowPair)}>
      <span {...stylex.props(styles.rowName)}>
        {c.first || c.last ? (
          <>
            <span {...stylex.props(styles.rowFirst)}>{c.first} </span>
            <span {...stylex.props(styles.rowLast)}>{c.last}</span>
          </>
        ) : (
          <span {...stylex.props(styles.rowLast)}>{fullName(c)}</span>
        )}
      </span>
      {sub && <span {...stylex.props(styles.rowSub)}>{sub}</span>}
    </span>
    {c.favorite && (
      <span {...stylex.props(styles.rowStar)}>
        <Sym name="starFill" size={11} />
      </span>
    )}
  </button>
)

/** The letters down the right edge: tap or drag along them to jump the list. */
const Rail = ({ letters, onJump }: { letters: string[]; onJump: (l: string) => void }) => {
  const [active, setActive] = useState<string | null>(null)
  const el = useRef<HTMLDivElement>(null)
  const at = (e: PointerEvent) => {
    // The glyphs sit centred in a taller strip, so the pointer maps to the nearest glyph, not the strip.
    const spans = Array.from(el.current!.querySelectorAll<HTMLElement>('[data-rail]'))
    let letter = letters[0]!
    let best = Number.POSITIVE_INFINITY
    for (const s of spans) {
      const r = s.getBoundingClientRect()
      const d = Math.abs(e.clientY - (r.top + r.height / 2))
      if (d < best) {
        best = d
        letter = s.dataset.rail!
      }
    }
    if (letter !== active) {
      setActive(letter)
      onJump(letter)
    }
  }
  return (
    <div
      ref={el}
      {...stylex.props(styles.rail)}
      onPointerDown={(e) => {
        el.current!.setPointerCapture(e.pointerId)
        at(e)
      }}
      onPointerMove={(e) => active && at(e)}
      onPointerUp={() => setActive(null)}
      onPointerCancel={() => setActive(null)}
    >
      {letters.map((l) => (
        <span key={l} data-rail={l} {...stylex.props(styles.railLetter, active === l && styles.railOn)}>
          {l}
        </span>
      ))}
      {active && (
        <span key={active} {...stylex.props(styles.railPeek)}>
          {active}
        </span>
      )}
    </div>
  )
}

import { animations, Sym, type SymProps } from '@doan-labs/duo-uikit'
import { usePresence } from '@doan-labs/duo-uikit/presence.ts'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useState } from 'react'
import { Avatar } from './avatar.tsx'
import { type Contact, type ContactList, fullName } from './data.ts'
import { styles } from './styles.ts'

type Props = {
  contact: Contact
  lists: ContactList[]
  isMe: boolean
  wide: boolean
  onBack: () => void
  onEdit: () => void
  onToggle: (key: 'favorite' | 'blocked') => void
  onLists: () => void
  onDelete: () => void
  open: (app: string, arg?: string) => void
}

/** A single-glyph SF Symbol the kit does not carry: a speech bubble and an envelope. */
const Glyph = ({ d }: { d: string }) => (
  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d={d} />
  </svg>
)
const BUBBLE =
  'M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.5 3.4 6L4.3 21l4.4-2.2c1 .3 2.1.4 3.3.4 5.5 0 10-3.6 10-8.2S17.5 3 12 3z'
const ENVELOPE =
  'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v.6l-9 5.6-9-5.6v-.6zM3 8.4l8.5 5.3c.3.2.7.2 1 0L21 8.4v10.1A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5V8.4z'

export const Detail = ({ contact: c, lists, isMe, wide, onBack, onEdit, onToggle, onLists, onDelete, open }: Props) => {
  const [toast, setToast] = useState('')
  const note = usePresence(!!toast, 260)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1600)
    return () => clearTimeout(t)
  }, [toast])
  const name = fullName(c)
  const share = () => {
    const card = [`BEGIN:VCARD`, `FN:${name}`, c.phone && `TEL:${c.phone}`, c.email && `EMAIL:${c.email}`, `END:VCARD`]
    void navigator.clipboard?.writeText(card.filter(Boolean).join('\n')).catch(() => {})
    setToast('Contact copied')
  }
  const copy = (label: string, value: string) => {
    void navigator.clipboard?.writeText(value).catch(() => {})
    setToast(`${label} copied`)
  }
  const mine = lists.filter((l) => c.lists.includes(l.id)).map((l) => l.name)
  return (
    <div {...stylex.props(styles.column)}>
      <div {...stylex.props(styles.hdr, !wide && styles.hdrInner)}>
        {!wide && (
          <button type="button" {...stylex.props(styles.hdrBack)} onClick={onBack}>
            <Sym name="back" size={20} />
            Contacts
          </button>
        )}
        <span {...stylex.props(styles.hdrSpace)}>
          <button type="button" {...stylex.props(styles.plain, styles.formBtn)} onClick={onEdit}>
            Edit
          </button>
        </span>
      </div>
      <div key={c.id} {...stylex.props(styles.card)}>
        <div {...stylex.props(styles.head)}>
          <div {...stylex.props(animations.pop)}>
            <Avatar contact={c} size={wide ? 120 : 96} />
          </div>
          <div {...stylex.props(styles.name)}>{name}</div>
          {(c.first || c.last) && c.company && <div {...stylex.props(styles.company)}>{c.company}</div>}
          {isMe && <div {...stylex.props(styles.company)}>My Card</div>}
        </div>
        <div {...stylex.props(styles.acts)}>
          <Act label="message" onClick={() => open('Messages')} glyph={<Glyph d={BUBBLE} />} />
          <Act label="call" onClick={() => open('Phone')} sym="call" disabled={!c.phone} />
          <Act label="video" onClick={() => open('FaceTime', name)} sym="video" />
          <Act label="mail" onClick={() => open('Mail')} glyph={<Glyph d={ENVELOPE} />} disabled={!c.email} />
        </div>
        {(c.phone || c.email) && (
          <div {...stylex.props(styles.group)}>
            {c.phone && (
              <button type="button" {...stylex.props(styles.field)} onClick={() => copy('Phone', c.phone)}>
                <span {...stylex.props(styles.fieldLabel)}>mobile</span>
                <span {...stylex.props(styles.fieldValue)}>{c.phone}</span>
              </button>
            )}
            {c.email && (
              <button type="button" {...stylex.props(styles.field)} onClick={() => copy('Email', c.email)}>
                <span {...stylex.props(styles.fieldLabel)}>{c.company ? 'work' : 'home'}</span>
                <span {...stylex.props(styles.fieldValue)}>{c.email}</span>
              </button>
            )}
          </div>
        )}
        {c.notes && (
          <div {...stylex.props(styles.group)}>
            <div {...stylex.props(styles.field)}>
              <span {...stylex.props(styles.fieldLabel)}>Notes</span>
              <span {...stylex.props(styles.fieldValue, styles.fieldNote)}>{c.notes}</span>
            </div>
          </div>
        )}
        <div {...stylex.props(styles.group)}>
          <Action label="Send Message" onClick={() => open('Messages')} />
          <Action label="Share Contact" onClick={share} />
          {!isMe && (
            <Action
              label={c.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
              onClick={() => onToggle('favorite')}
              trail={
                <span key={String(c.favorite)} {...stylex.props(styles.bounce, c.favorite && styles.gold)}>
                  <Sym name={c.favorite ? 'starFill' : 'star'} size={17} />
                </span>
              }
            />
          )}
          <Action label="Add to Lists" onClick={onLists} detail={mine.length ? mine.join(', ') : undefined} />
        </div>
        {!isMe && (
          <div {...stylex.props(styles.group)}>
            <Action
              label={c.blocked ? 'Unblock this Caller' : 'Block this Caller'}
              danger
              onClick={() => onToggle('blocked')}
            />
            <Action label="Delete Contact" danger onClick={onDelete} />
          </div>
        )}
      </div>
      {note.mounted && (
        <div role="status" {...stylex.props(styles.toast, animations.float, note.closing && animations.floatOut)}>
          {toast}
        </div>
      )}
    </div>
  )
}

type ActProps = { label: string; onClick: () => void; sym?: SymProps['name']; glyph?: ReactNode; disabled?: boolean }
const Act = ({ label, onClick, sym, glyph, disabled }: ActProps) => (
  <button type="button" {...stylex.props(styles.act)} onClick={onClick} disabled={disabled} aria-label={label}>
    <span {...stylex.props(styles.actGlyph)}>{sym ? <Sym name={sym} size={20} /> : glyph}</span>
    {label}
  </button>
)

type ActionProps = { label: string; onClick: () => void; danger?: boolean; detail?: string; trail?: ReactNode }
const Action = ({ label, onClick, danger, detail, trail }: ActionProps) => (
  <button type="button" {...stylex.props(styles.action, danger && styles.danger)} onClick={onClick}>
    {label}
    {detail && <span {...stylex.props(styles.count, styles.rowSub)}>{detail}</span>}
    {trail && <span {...stylex.props(styles.count)}>{trail}</span>}
  </button>
)

/** What the pane shows before a pick. */
export const Blank = () => (
  <div {...stylex.props(styles.blank, animations.fade)}>
    <span {...stylex.props(styles.blankGlyph)}>
      <Sym name="personFill" size={56} />
    </span>
    No Contact Selected
    <span {...stylex.props(styles.blankSub)}>Choose a contact from the list.</span>
  </div>
)

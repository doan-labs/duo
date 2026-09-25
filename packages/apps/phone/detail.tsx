// The detail pages: a contact's card, a call's card, and the new/edit form
// they share. Pushed over their list like a nav stack; layouts follow the
// Contacts app's card and the same action vocabulary.

import { mmss } from '@doan-labs/duo-fixtures'
import type { Os } from '@doan-labs/duo-sdk'
import { Sheet, Sym, TextField, usePresence } from '@doan-labs/duo-uikit'
import { animations } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useEffect, useState } from 'react'
import type { Contact, Recent } from './data.ts'
import { fullName, nameInitials, stamp } from './data.ts'
import { Glyph } from './glyphs.tsx'
import { place } from './store.ts'
import { styles } from './styles.ts'

/** The grey monogram disc: initials, a person glyph when a name has none. */
export const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => (
  <div aria-hidden="true" {...stylex.props(styles.mono, styles.monoSize(size, Math.round(size * 0.42)))}>
    {nameInitials(name) || (
      <span {...stylex.props(styles.monoGlyph)}>
        <Sym name="personFill" size={size} />
      </span>
    )}
  </div>
)

type ActProps = {
  label: string
  onClick: () => void
  glyph: 'call' | 'video' | 'bubble' | 'envelope'
  disabled?: boolean
}
/** One of the four action tiles under the name: message, call, video, mail. */
const Act = ({ label, onClick, glyph, disabled }: ActProps) => (
  <button type="button" {...stylex.props(styles.act)} onClick={onClick} disabled={disabled} aria-label={label}>
    <span {...stylex.props(styles.actGlyph)}>
      {glyph === 'call' ? (
        <Sym name="call" size={20} />
      ) : glyph === 'video' ? (
        <Sym name="video" size={20} />
      ) : (
        <Glyph name={glyph} size={20} />
      )}
    </span>
    {label}
  </button>
)

type ActionProps = { label: string; onClick: () => void; danger?: boolean; detail?: string; trail?: ReactNode }
const Action = ({ label, onClick, danger, detail, trail }: ActionProps) => (
  <button type="button" {...stylex.props(styles.action, danger && styles.danger)} onClick={onClick}>
    {label}
    {detail && <span {...stylex.props(styles.count)}>{detail}</span>}
    {trail && <span {...stylex.props(styles.count)}>{trail}</span>}
  </button>
)

/** The little "copied" note that floats out of the card. */
export const useToast = () => {
  const [toast, setToast] = useState('')
  const note = usePresence(!!toast, 260)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1600)
    return () => clearTimeout(t)
  }, [toast])
  return { toast: note.mounted ? toast : '', closing: note.closing, setToast }
}

export const Toast = ({ toast, closing }: { toast: string; closing: boolean }) =>
  toast ? (
    <div role="status" {...stylex.props(styles.toast, animations.float, closing && animations.floatOut)}>
      {toast}
    </div>
  ) : null

type DetailProps = {
  contact: Contact
  os: Os
  onBack: () => void
  onEdit: () => void
  onToggleFavorite: () => void
  onToggleBlocked: () => void
  onDelete: () => void
}

/** A contact's card: actions up top, fields in groups, danger at the bottom. */
export function ContactDetail({
  contact: c,
  os,
  onBack,
  onEdit,
  onToggleFavorite,
  onToggleBlocked,
  onDelete
}: DetailProps) {
  const { toast, closing, setToast } = useToast()
  const name = fullName(c)
  const share = () => {
    const card = ['BEGIN:VCARD', `FN:${name}`, c.phone && `TEL:${c.phone}`, c.email && `EMAIL:${c.email}`, 'END:VCARD']
    void navigator.clipboard?.writeText(card.filter(Boolean).join('\n')).catch(() => {})
    setToast('Contact copied')
  }
  const copy = (label: string, value: string) => {
    void navigator.clipboard?.writeText(value).catch(() => {})
    setToast(`${label} copied`)
  }
  return (
    <div {...stylex.props(styles.column)}>
      <div {...stylex.props(styles.hdr, styles.hdrInner)}>
        <button type="button" {...stylex.props(styles.hdrBack)} onClick={onBack}>
          <Sym name="back" size={20} />
          Contacts
        </button>
        <span {...stylex.props(styles.hdrSpace)}>
          <button type="button" {...stylex.props(styles.plain)} onClick={onEdit}>
            Edit
          </button>
        </span>
      </div>
      <div key={c.id} {...stylex.props(styles.card)}>
        <div {...stylex.props(styles.head)}>
          <div {...stylex.props(animations.pop)}>
            <Avatar name={name} size={96} />
          </div>
          <div {...stylex.props(styles.cardName)}>{name}</div>
          {(c.first || c.last) && c.company && <div {...stylex.props(styles.company)}>{c.company}</div>}
        </div>
        <div {...stylex.props(styles.acts)}>
          <Act label="message" glyph="bubble" onClick={() => os.open('Messages', name)} />
          <Act
            label="call"
            glyph="call"
            disabled={!c.phone}
            onClick={() => place({ number: c.phone, contactId: c.id })}
          />
          <Act label="video" glyph="video" onClick={() => os.open('FaceTime', name)} />
          <Act label="mail" glyph="envelope" disabled={!c.email} onClick={() => os.open('Mail')} />
        </div>
        {(c.phone || c.email) && (
          <div {...stylex.props(styles.group)}>
            {!!c.phone && (
              <button type="button" {...stylex.props(styles.field)} onClick={() => copy('Phone', c.phone)}>
                <span {...stylex.props(styles.fieldLabel)}>mobile</span>
                <span {...stylex.props(styles.fieldValue)}>{c.phone}</span>
              </button>
            )}
            {!!c.email && (
              <button type="button" {...stylex.props(styles.field)} onClick={() => copy('Email', c.email)}>
                <span {...stylex.props(styles.fieldLabel)}>{c.company ? 'work' : 'home'}</span>
                <span {...stylex.props(styles.fieldValue)}>{c.email}</span>
              </button>
            )}
          </div>
        )}
        {!!c.notes && (
          <div {...stylex.props(styles.group)}>
            <div {...stylex.props(styles.field)}>
              <span {...stylex.props(styles.fieldLabel)}>Notes</span>
              <span {...stylex.props(styles.fieldValue, styles.fieldNote)}>{c.notes}</span>
            </div>
          </div>
        )}
        <div {...stylex.props(styles.group)}>
          <Action label="Send Message" onClick={() => os.open('Messages', name)} />
          <Action label="Share Contact" onClick={share} />
          <Action
            label={c.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
            onClick={onToggleFavorite}
            trail={
              <span key={String(c.favorite)} {...stylex.props(styles.bounce, c.favorite && styles.gold)}>
                <Sym name={c.favorite ? 'starFill' : 'star'} size={17} />
              </span>
            }
          />
        </div>
        <div {...stylex.props(styles.group)}>
          <Action label={c.blocked ? 'Unblock this Caller' : 'Block this Caller'} danger onClick={onToggleBlocked} />
          <Action label="Delete Contact" danger onClick={onDelete} />
        </div>
      </div>
      <Toast toast={toast} closing={closing} />
    </div>
  )
}

type CallDetailProps = {
  recent: Recent
  contact: Contact | undefined
  os: Os
  onBack: () => void
  onDelete: () => void
  onNewContact: () => void
  onAddToContact: () => void
  onToggleBlocked: () => void
}

/** A Recents entry opened: the call, the person, and what to do about them. */
export function CallDetail({
  recent: r,
  contact,
  os,
  onBack,
  onDelete,
  onNewContact,
  onAddToContact,
  onToggleBlocked
}: CallDetailProps) {
  const name = contact ? fullName(contact) : r.name
  return (
    <div {...stylex.props(styles.column)}>
      <div {...stylex.props(styles.hdr, styles.hdrInner)}>
        <button type="button" {...stylex.props(styles.hdrBack)} onClick={onBack}>
          <Sym name="back" size={20} />
          Recents
        </button>
      </div>
      <div {...stylex.props(styles.card)}>
        <div {...stylex.props(styles.head)}>
          <div {...stylex.props(animations.pop)}>
            <Avatar name={name} size={96} />
          </div>
          <div {...stylex.props(styles.cardName)}>{name}</div>
          {!!contact?.company && <div {...stylex.props(styles.company)}>{contact.company}</div>}
        </div>
        <div {...stylex.props(styles.acts)}>
          <Act label="message" glyph="bubble" onClick={() => os.open('Messages', name)} />
          <Act label="call" glyph="call" onClick={() => place({ number: r.number, contactId: r.contactId })} />
          <Act label="video" glyph="video" onClick={() => os.open('FaceTime', name)} />
          <Act label="mail" glyph="envelope" disabled={!contact?.email} onClick={() => os.open('Mail')} />
        </div>
        <div {...stylex.props(styles.group)}>
          <div {...stylex.props(styles.field)}>
            <span {...stylex.props(styles.fieldLabel)}>mobile</span>
            <span {...stylex.props(styles.fieldValue)}>{r.number}</span>
          </div>
          <div {...stylex.props(styles.field)}>
            <span {...stylex.props(styles.fieldLabel)}>call type</span>
            <span {...stylex.props(styles.fieldValue)}>
              {r.missed ? 'Missed Call' : r.dir === 'out' ? 'Outgoing Call' : 'Incoming Call'}
            </span>
          </div>
          <div {...stylex.props(styles.field)}>
            <span {...stylex.props(styles.fieldLabel)}>time</span>
            <span {...stylex.props(styles.fieldValue)}>{stamp(r.at)}</span>
          </div>
          {r.secs != null && (
            <div {...stylex.props(styles.field)}>
              <span {...stylex.props(styles.fieldLabel)}>duration</span>
              <span {...stylex.props(styles.fieldValue)}>{mmss(r.secs)}</span>
            </div>
          )}
        </div>
        {!contact && (
          <div {...stylex.props(styles.group)}>
            <Action label="Create New Contact" onClick={onNewContact} />
            <Action label="Add to Existing Contact" onClick={onAddToContact} />
          </div>
        )}
        <div {...stylex.props(styles.group)}>
          <Action
            label={contact?.blocked ? 'Unblock this Caller' : 'Block this Caller'}
            danger
            onClick={onToggleBlocked}
          />
          <Action label="Remove from Recents" danger onClick={onDelete} />
        </div>
      </div>
    </div>
  )
}

type FormProps = {
  draft: Contact | null
  isNew: boolean
  onSave: (c: Contact) => void
  onClose: () => void
}
/** New and existing cards share the form; `isNew` only changes the title. */
export function ContactForm({ draft, isNew, onSave, onClose }: FormProps) {
  const [c, setC] = useState<Contact | null>(draft)
  useEffect(() => setC(draft), [draft])
  const put = (patch: Partial<Contact>) => setC((x) => x && { ...x, ...patch })
  const valid = !!c && !!(c.first.trim() || c.last.trim() || c.company.trim())
  const submit = () =>
    c &&
    valid &&
    onSave({ ...c, first: c.first.trim(), last: c.last.trim(), company: c.company.trim(), notes: c.notes.trim() })
  const FIELDS: { key: 'first' | 'last' | 'company'; label: string }[] = [
    { key: 'first', label: 'First' },
    { key: 'last', label: 'Last' },
    { key: 'company', label: 'Company' }
  ]
  const REACH: { key: 'phone' | 'email'; label: string; type: string }[] = [
    { key: 'phone', label: 'mobile', type: 'tel' },
    { key: 'email', label: 'email', type: 'email' }
  ]
  return (
    <Sheet open={!!draft} onClose={onClose} xstyle={[styles.formSheet]}>
      {c && (
        <div {...stylex.props(styles.form)}>
          <div {...stylex.props(styles.formHdr)}>
            <button type="button" {...stylex.props(styles.plain)} onClick={onClose}>
              Cancel
            </button>
            {isNew ? 'New Contact' : 'Edit Contact'}
            <button type="button" {...stylex.props(styles.plain, styles.formDone)} onClick={submit} disabled={!valid}>
              Done
            </button>
          </div>
          <div {...stylex.props(styles.formBody)}>
            <div {...stylex.props(styles.formHead)}>
              <Avatar name={fullName(c)} size={88} />
            </div>
            <div {...stylex.props(styles.formGroup)}>
              {FIELDS.map((f, i) => (
                <div key={f.key} {...stylex.props(styles.formRow)}>
                  <TextField
                    placeholder={f.label}
                    aria-label={f.label}
                    value={c[f.key]}
                    autoFocus={i === 0 && isNew}
                    onChange={(e) => put({ [f.key]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    xstyle={[styles.formIn]}
                  />
                </div>
              ))}
            </div>
            <div {...stylex.props(styles.formGroup)}>
              {REACH.map((f) => (
                <div key={f.key} {...stylex.props(styles.formRow)}>
                  <span {...stylex.props(styles.formLabel)}>{f.label}</span>
                  <TextField
                    type={f.type}
                    placeholder={f.key === 'phone' ? 'Phone' : 'Email'}
                    value={c[f.key]}
                    onChange={(e) => put({ [f.key]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    xstyle={[styles.formIn]}
                  />
                </div>
              ))}
            </div>
            <div {...stylex.props(styles.formGroup)}>
              <div {...stylex.props(styles.formRow)}>
                <TextField
                  multiline
                  placeholder="Notes"
                  aria-label="Notes"
                  value={c.notes}
                  onChange={(e) => put({ notes: e.target.value })}
                  xstyle={[styles.formIn, styles.formArea]}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}

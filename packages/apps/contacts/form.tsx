import { Sheet, Sym, TextField } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { Avatar } from './avatar.tsx'
import type { Contact, ContactList } from './data.ts'
import { styles } from './styles.ts'

type Field = { key: 'first' | 'last' | 'company' | 'phone' | 'email' | 'notes'; label: string; type?: string }
const FIELDS: Field[] = [
  { key: 'first', label: 'First' },
  { key: 'last', label: 'Last' },
  { key: 'company', label: 'Company' }
]
const REACH: Field[] = [
  { key: 'phone', label: 'mobile', type: 'tel' },
  { key: 'email', label: 'email', type: 'email' }
]

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
  return (
    <Sheet open={!!draft} onClose={onClose} xstyle={[styles.sheet]}>
      {c && (
        <div {...stylex.props(styles.form)}>
          <div {...stylex.props(styles.formHdr)}>
            <button type="button" {...stylex.props(styles.plain, styles.formBtn)} onClick={onClose}>
              Cancel
            </button>
            {isNew ? 'New Contact' : 'Edit Contact'}
            <button
              type="button"
              {...stylex.props(styles.plain, styles.formBtn, styles.formDone)}
              onClick={submit}
              disabled={!valid}
            >
              Done
            </button>
          </div>
          <div {...stylex.props(styles.formBody)}>
            <div {...stylex.props(styles.formHead)}>
              <Avatar contact={c} size={88} />
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

type ListsProps = {
  contact: Contact | null
  lists: ContactList[]
  onChange: (c: Contact) => void
  onAdd: (name: string) => void
  onClose: () => void
}
/** Which of the user's lists a card sits in; a tick eases in and out as rows are toggled. */
export function ListPicker({ contact: c, lists, onChange, onAdd, onClose }: ListsProps) {
  const [name, setName] = useState('')
  const flip = (id: string) =>
    c && onChange({ ...c, lists: c.lists.includes(id) ? c.lists.filter((l) => l !== id) : [...c.lists, id] })
  const add = () => {
    const t = name.trim()
    if (!t || !c) return
    onAdd(t)
    setName('')
  }
  return (
    <Sheet open={!!c} onClose={onClose} xstyle={[styles.sheet]}>
      {c && (
        <div {...stylex.props(styles.form)}>
          <div {...stylex.props(styles.formHdr)}>
            <span />
            Add to Lists
            <button type="button" {...stylex.props(styles.plain, styles.formBtn, styles.formDone)} onClick={onClose}>
              Done
            </button>
          </div>
          <div {...stylex.props(styles.formBody)}>
            <div {...stylex.props(styles.formGroup)}>
              {lists.map((l) => {
                const on = c.lists.includes(l.id)
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={on}
                    {...stylex.props(styles.row)}
                    onClick={() => flip(l.id)}
                  >
                    <span {...stylex.props(styles.listIcon)}>
                      <Sym name="list" size={15} />
                    </span>
                    <span {...stylex.props(styles.rowName)}>{l.name}</span>
                    <span {...stylex.props(styles.check, !on && styles.checkOff)}>
                      <Sym name="tick" size={15} />
                    </span>
                  </button>
                )
              })}
              <div {...stylex.props(styles.formRow)}>
                <span {...stylex.props(styles.listIcon)}>
                  <Sym name="plus" size={15} />
                </span>
                <TextField
                  placeholder="New List"
                  aria-label="New list name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && add()}
                  xstyle={[styles.formIn]}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}

type NameProps = { open: boolean; onAdd: (name: string) => void; onClose: () => void }
/** Naming a brand-new list from the Lists page. */
export function NewList({ open, onAdd, onClose }: NameProps) {
  const [name, setName] = useState('')
  const submit = () => {
    const t = name.trim()
    if (!t) return
    onAdd(t)
    setName('')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose}>
      <div {...stylex.props(styles.form)}>
        <div {...stylex.props(styles.formHdr)}>
          <button type="button" {...stylex.props(styles.plain, styles.formBtn)} onClick={onClose}>
            Cancel
          </button>
          New List
          <button
            type="button"
            {...stylex.props(styles.plain, styles.formBtn, styles.formDone)}
            onClick={submit}
            disabled={!name.trim()}
          >
            Done
          </button>
        </div>
        <div {...stylex.props(styles.formBody)}>
          <div {...stylex.props(styles.formGroup)}>
            <div {...stylex.props(styles.formRow)}>
              <TextField
                placeholder="List Name"
                aria-label="List name"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                xstyle={[styles.formIn]}
              />
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

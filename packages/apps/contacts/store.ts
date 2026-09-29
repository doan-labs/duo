// Contacts' stores, on the kit's KV cells: the address book lives in
// os.storage so it survives reloads and reaches both displays' copies, and
// navigation state lives in os.session so the fold hands it over whole.

import { cell } from '@doan-labs/duo-uikit/kv.ts'
import { useMemo, useSyncExternalStore } from 'react'
import { type Book, byName, type Contact, type ContactList, SEED } from './data.ts'

const bookCell = cell<Book>('storage', 'contacts.book', SEED)
const shared = new Map<string, ReturnType<typeof cell<string>>>()

export function useBook() {
  const book = useSyncExternalStore(bookCell.subscribe, bookCell.get)
  const contacts = useMemo(() => [...book.contacts].sort(byName), [book.contacts])
  const put = (patch: Partial<Book>) => bookCell.set({ ...bookCell.get(), ...patch })
  return {
    book,
    contacts,
    me: book.contacts.find((c) => c.id === book.me),
    save(c: Contact) {
      const exists = book.contacts.some((v) => v.id === c.id)
      put({ contacts: exists ? book.contacts.map((v) => (v.id === c.id ? c : v)) : [...book.contacts, c] })
    },
    remove(id: string) {
      put({ contacts: book.contacts.filter((c) => c.id !== id) })
    },
    toggle(id: string, key: 'favorite' | 'blocked') {
      put({ contacts: book.contacts.map((c) => (c.id === id ? { ...c, [key]: !c[key] } : c)) })
    },
    /** A new list, with `member` already in it: one write, so neither change overwrites the other. */
    addList(name: string, member?: string) {
      const list: ContactList = { id: Date.now().toString(36), name }
      put({
        lists: [...book.lists, list],
        contacts: member
          ? book.contacts.map((c) => (c.id === member ? { ...c, lists: [...c.lists, list.id] } : c))
          : book.contacts
      })
      return list
    },
    removeList(id: string) {
      put({
        lists: book.lists.filter((l) => l.id !== id),
        contacts: book.contacts.map((c) => ({ ...c, lists: c.lists.filter((l) => l !== id) }))
      })
    }
  }
}

export const blank = (): Contact => ({
  id: Date.now().toString(36),
  first: '',
  last: '',
  company: '',
  phone: '',
  email: '',
  notes: '',
  favorite: false,
  blocked: false,
  lists: []
})

/** Navigation state both displays share for the session; it is not persisted. */
export function useShared(key: string) {
  let c = shared.get(key)
  if (!c) {
    c = cell<string>('session', `contacts.${key}`, '')
    shared.set(key, c)
  }
  const value = useSyncExternalStore(c.subscribe, c.get)
  return [value, c.set] as const
}

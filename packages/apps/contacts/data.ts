// The address book's shape and the sample book it starts with. Phone's recents
// read the same names, so a person seen there can be found here.

export type Contact = {
  id: string
  first: string
  last: string
  company: string
  phone: string
  email: string
  notes: string
  favorite: boolean
  blocked: boolean
  /** The lists this person is in, by list id. */
  lists: string[]
}

export type ContactList = { id: string; name: string }

export type Book = {
  contacts: Contact[]
  lists: ContactList[]
  /** The card the owner keeps at the top of the book, by contact id. */
  me: string
}

const person = (
  id: string,
  first: string,
  last: string,
  phone: string,
  company = '',
  extra: Partial<Contact> = {}
): Contact => ({
  id,
  first,
  last,
  company,
  phone,
  email: extra.email ?? `${(first || company).split(' ')[0]!.toLowerCase()}@icloud.com`,
  notes: extra.notes ?? '',
  favorite: extra.favorite ?? false,
  blocked: false,
  lists: extra.lists ?? []
})

export const SEED: Book = {
  me: 'me',
  lists: [
    { id: 'family', name: 'Family' },
    { id: 'studio', name: 'Studio' }
  ],
  contacts: [
    person('me', 'Thành', 'Đoàn', '+84 90 555 0001', 'Doan Labs', { email: 'thanh@doan-labs.com' }),
    person('jony', 'Jony', '', '+1 (408) 555-0134', 'Apple', { favorite: true, lists: ['studio'] }),
    person('ada', 'Ada', 'Lovelace', '+44 20 7946 0812', '', { notes: 'Analytical Engine notes, appended.' }),
    person('mum', 'Mum', '', '+1 (415) 555-0177', '', { favorite: true, lists: ['family'] }),
    person('kim', 'Kim', 'Minh', '+84 90 555 214', '', { favorite: true, lists: ['studio'] }),
    person('blender', 'Blender', 'Foundation', '+31 20 555 9011', 'Blender Foundation', {
      email: 'foundation@blender.org'
    }),
    person('alan', 'Alan', 'Turing', '+44 161 555 0918'),
    person('apple-park', 'Apple Park', 'Reception', '+1 (408) 555-0100', 'Apple', { email: 'reception@apple.com' }),
    person('grace', 'Grace', 'Hopper', '+1 (202) 555-0146'),
    person('hideo', 'Hideo', 'Kojima', '+81 3 5555 2049', 'Kojima Productions'),
    person('katherine', 'Katherine', 'Johnson', '+1 (757) 555-0163'),
    person('thanh', 'Nguyễn', 'Thanh', '+84 28 555 771'),
    person('radia', 'Radia', 'Perlman', '+1 (617) 555-0129'),
    person('susan', 'Susan', 'Kare', '+1 (415) 555-0188', '', { lists: ['studio'] }),
    person('tim', 'Tim', '', '+1 (408) 555-0111', 'Apple', { favorite: true }),
    person('vera', 'Vera', 'Rubin', '+1 (520) 555-0154')
  ]
}

/** How the book names a person: first and last, or the company when both are blank. */
export const fullName = (c: Pick<Contact, 'first' | 'last' | 'company'>) =>
  [c.first, c.last].filter(Boolean).join(' ').trim() || c.company || 'No Name'

/** The A-Z list sorts on the last name, as Contacts does by default; one-word names sort on themselves. */
export const sortKey = (c: Contact) => (c.last || c.first || c.company || '').normalize('NFD')

/** The letter a name files under; anything outside A-Z goes to '#'. */
export function letterOf(c: Contact) {
  const ch =
    sortKey(c)
      .replace(/[\u0300-\u036f]/g, '')[0]
      ?.toUpperCase() ?? '#'
  return /[A-Z]/.test(ch) ? ch : '#'
}

export const initials = (c: Pick<Contact, 'first' | 'last' | 'company'>) =>
  (
    [c.first, c.last]
      .filter(Boolean)
      .map((w) => w[0])
      .join('') || c.company.slice(0, 1)
  ).toUpperCase()

export const byName = (a: Contact, b: Contact) => sortKey(a).localeCompare(sortKey(b)) || a.first.localeCompare(b.first)

export const matches = (c: Contact, needle: string) =>
  !needle || [fullName(c), c.company, c.phone, c.email].some((s) => s.toLowerCase().includes(needle))

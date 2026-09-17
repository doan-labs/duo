export type Note = {
  id: string
  when: string
  group: string
  body: string
  /** Written with the pencil: the pane renders it as ink, the list says so. */
  ink?: boolean
  /** Artwork tile at the end of the row, for a note carrying an attachment. */
  thumb?: boolean
  /** Leading glyph: a shared note, or a locked one. */
  mark?: 'person' | 'lock'
}

export const NOTES: Note[] = [
  { id: 'live', when: '3:15 PM', group: 'Today', body: 'Live long\nand prosper.', ink: true },
  { id: 'places', when: '2:26 PM', group: 'Today', body: 'Places to Visit or Revisit\nLondon\nKyoto\nReykjavík' },
  { id: 'zabar', when: '1:54 PM', group: 'Today', body: "Zabar's Store on Broadway\n1 attachment", thumb: true },
  {
    id: 'egg',
    when: '1:54 PM',
    group: 'Today',
    body: 'This egg cream was just right\nin Brooklyn — Tim recommended it',
    thumb: true
  },
  { id: 'issues', when: '1:53 PM', group: 'Today', body: 'Issues to get:\n- ASM 2: 5 or higher', mark: 'person' },
  {
    id: 'todo',
    when: '1:52 PM',
    group: 'Today',
    body: 'Things to do in and around\nKensington Palace',
    mark: 'person'
  },
  {
    id: 'top',
    when: '1:52 PM',
    group: 'Today',
    body: 'Here are the top things to do\nEiffel Tower: No visit to Paris is complete without it.'
  },
  {
    id: 'glass',
    when: '1:35 PM',
    group: 'Today',
    body: 'Hate Liquid Glass? You are not alone.\n1 web link',
    thumb: true
  },
  { id: 'downtime', when: '8/24/25', group: 'August', body: 'Downtime\nWho video' },
  { id: 'keys', when: '8/12/25', group: 'August', body: 'ChatGPT API keys\nRotate before launch', mark: 'lock' }
]

export const GROUPS = [...new Set(NOTES.map((note) => note.group))].map((name) => ({
  name,
  notes: NOTES.filter((note) => note.group === name)
}))

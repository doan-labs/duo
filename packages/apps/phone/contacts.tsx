// The contacts pane: an A-Z grouped list where a row pushes the contact card
// and the trailing + pushes the new-contact form.

import { Row, Section, Title } from '@doan-labs/duo-uikit'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useMemo } from 'react'
import type { Contact } from './data.ts'
import { byName, fullName, initials, letterOf } from './data.ts'
import { Avatar } from './detail.tsx'
import { styles } from './styles.ts'

export function ContactsList({
  contacts,
  onOpen,
  onNew
}: {
  contacts: Contact[]
  onOpen: (id: string) => void
  onNew: () => void
}) {
  const groups = useMemo(() => {
    const by = new Map<string, Contact[]>()
    for (const c of [...contacts].sort(byName)) {
      const letter = letterOf(c)
      by.set(letter, [...(by.get(letter) ?? []), c])
    }
    return [...by.entries()]
  }, [contacts])
  return (
    <>
      <Title>
        Contacts
        <Title as="span" variant="accessory">
          <button type="button" aria-label="Add contact" {...stylex.props(styles.plain)} onClick={onNew}>
            <Sym name="plus" size={20} />
          </button>
        </Title>
      </Title>
      {groups.map(([letter, members]) => (
        <div key={letter}>
          <div {...stylex.props(styles.letter)}>{letter}</div>
          <Section xstyle={[styles.list]}>
            {members.map((c) => (
              <Row
                key={c.id}
                as="div"
                onClick={() => onOpen(c.id)}
                icon={<Avatar name={initials(c)} size={40} />}
                label={<span {...stylex.props(styles.name)}>{fullName(c)}</span>}
                subtitle={c.company || undefined}
              />
            ))}
          </Section>
        </div>
      ))}
      {!contacts.length && <div {...stylex.props(styles.empty)}>No Contacts</div>}
    </>
  )
}

// The New Message card: a To field over the local recipient model. Picking a
// suggestion finds or creates its conversation and opens the thread, where
// the real compose bar takes over. An address typed raw gets the same honest
// landing: a thread labelled with it - and nobody replies, since the demo's
// reply model only speaks for the people it knows.

import { art } from '@doan-labs/duo-fixtures'
import { List, Screen, Text, TextField, Title } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import { digits, formatNumber, looksLikeAddress, nameInitials, PEOPLE, type Person, resolveRecipient } from './data.ts'
import { convFor, select, setComposeTo, useComposeTo } from './store.ts'
import { styles } from './styles.ts'

const hit = (s: string, n: string) => s.toLowerCase().includes(n)

export function NewMessage({ back }: { back: () => void }) {
  const to = useComposeTo()
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => field.current?.focus(), [])

  const n = to.trim().toLowerCase()
  const d = digits(to).replace(/^\+/, '')
  const people = PEOPLE.filter((p) => !n || hit(p.name, n) || (d.length > 1 && digits(p.number).includes(d)))
  const raw = looksLikeAddress(to) && !people.some((p) => p.name.toLowerCase() === n)

  const pick = (target: { person?: Person; to: string }) => {
    const conv = convFor(target)
    setComposeTo('')
    select(conv.id)
  }

  const enter = () => {
    const r = resolveRecipient(to)
    if (r) pick(r)
  }

  return (
    <>
      <Title xstyle={[styles.hdr]}>
        <button type="button" aria-label="Back" {...stylex.props(shared.bk, styles.bkAbs)} onClick={back}>
          <Sym name="back" size={20} />
        </button>
        <span {...stylex.props(styles.hdrWho)}>New Message</span>
      </Title>
      <div {...stylex.props(styles.toRow)}>
        <span {...stylex.props(styles.toLabel)}>To:</span>
        <TextField
          ref={field}
          placeholder="Name or number"
          aria-label="To"
          value={to}
          onChange={(e) => setComposeTo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              enter()
            }
          }}
          xstyle={[styles.toField]}
        />
      </div>
      <Screen>
        <List>
          {people.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                {...stylex.props(styles.row)}
                onClick={() => pick({ person: p, to: p.name })}
                aria-label={`Message ${p.name}`}
              >
                <span {...stylex.props(styles.avatar, styles.avatarSm, styles.bg(art(p.name)))}>
                  {nameInitials(p.name)}
                </span>
                <span {...stylex.props(styles.tx)}>
                  <b {...stylex.props(styles.txB)}>{p.name}</b>
                  <p {...stylex.props(styles.txP)}>{p.number}</p>
                </span>
              </button>
            </li>
          ))}
          {!!raw && (
            <li>
              <button
                type="button"
                {...stylex.props(styles.row)}
                onClick={() => pick({ to: formatNumber(to) || to.trim() })}
                aria-label={`Message ${formatNumber(to) || to.trim()}`}
              >
                <span {...stylex.props(styles.avatar, styles.avatarSm, styles.avatarRaw)}>
                  <Sym name="person" size={16} />
                </span>
                <span {...stylex.props(styles.tx)}>
                  <b {...stylex.props(styles.txB)}>{formatNumber(to) || to.trim()}</b>
                  <p {...stylex.props(styles.txP)}>Not in your contacts - sends locally, no reply</p>
                </span>
              </button>
            </li>
          )}
          {!people.length && !raw && (
            <Text as="div" color="secondary" xstyle={[styles.noHits]}>
              No matching contacts
            </Text>
          )}
        </List>
      </Screen>
    </>
  )
}

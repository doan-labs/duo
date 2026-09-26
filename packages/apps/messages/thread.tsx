// The thread: timestamped bursts of bubbles, the typing indicator a pending
// demo reply raises, an honest "Sent" status under the latest outgoing line,
// and the compose bar - Enter sends, Shift+Enter breaks a line, the draft is
// the store's. Copy lives on a bubble's context menu, Delete on the header's.

import { art } from '@doan-labs/duo-fixtures'
import type { Os } from '@doan-labs/duo-sdk'
import { IconButton, Menu, type MenuEntry, Screen, Text, Title } from '@doan-labs/duo-uikit'
import { delay, shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { type Conversation, convName, type Message, nameInitials, threadStamp } from './data.ts'
import { removeConv, send, setDraft, useConvs, useShared, useTick } from './store.ts'
import { styles } from './styles.ts'

const DOTS = [0, 1, 2]

/** A bubble opens a stamped group when eight minutes pass since the last one. */
const stamped = (prev: Message | undefined, m: Message) => !prev || m.at - prev.at > 8 * 60000

export function Thread({ os, id, back }: { os: Os; id: string; back: () => void }) {
  const convs = useConvs()
  useTick()
  const conv = convs.find((c) => c.id === id)
  if (!conv) return <Gone back={back} />
  return <Live os={os} conv={conv} back={back} />
}

const Gone = ({ back }: { back: () => void }) => (
  <>
    <Title xstyle={[styles.hdr]}>
      <button type="button" aria-label="Back" {...stylex.props(shared.bk, styles.bkAbs)} onClick={back}>
        <Sym name="back" size={20} />
      </button>
    </Title>
    <Screen>
      <Text as="div" color="secondary" xstyle={[styles.gone]}>
        This conversation was deleted.
      </Text>
    </Screen>
  </>
)

function Live({ os, conv, back }: { os: Os; conv: Conversation; back: () => void }) {
  const name = convName(conv)
  const body = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const [menu, setMenu] = useState(false)
  const [bubMenu, setBubMenu] = useState('')
  // -1 pins the pane to the newest message; a pixel value is where reading paused.
  const [scroll, setScroll] = useShared(`scroll:${conv.id}`, -1)

  const typing = !!conv.pending && Date.now() >= conv.pending.typeAt

  // Mount on the spot the store kept: the fold's other copy, or the latest line.
  // The restore runs once per conversation; every later change is the pin's job.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll is the mount snapshot; restoring on change would fight the reader
  useEffect(() => {
    const el = body.current
    if (el) el.scrollTop = scroll < 0 ? el.scrollHeight : scroll
  }, [conv.id])

  // Pin to the newest message only while the reader is already there.
  // biome-ignore lint/correctness/useExhaustiveDependencies: new lines and the typing bubble are the trigger; scroll is read, not waited on
  useEffect(() => {
    const el = body.current
    if (el && scroll < 0) el.scrollTop = el.scrollHeight
  }, [conv.messages.length, typing])

  // The textarea grows with the draft, capped at five lines.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the draft change is the trigger
  useEffect(() => {
    const el = area.current
    if (el) el.style.height = `${Math.min(Math.max(el.scrollHeight, 36), 96)}px`
  }, [conv.draft])

  const onScroll = () => {
    const el = body.current
    if (!el) return
    setScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 24 ? -1 : el.scrollTop)
  }

  const submit = () => {
    send(os, conv.id, conv.draft)
    setScroll(-1)
    const el = body.current
    if (el) el.scrollTop = el.scrollHeight
    area.current?.focus()
  }

  const items: MenuEntry[] = [{ label: 'Delete Conversation', icon: 'trash', onSelect: () => removeConv(conv.id) }]

  return (
    <>
      <Title xstyle={[styles.hdr]}>
        <button type="button" aria-label="Back" {...stylex.props(shared.bk, styles.bkAbs)} onClick={back}>
          <Sym name="back" size={20} />
        </button>
        <span {...stylex.props(styles.hdrWho)}>
          <span {...stylex.props(styles.hdrAvatar, styles.bg(art(name)))}>
            {nameInitials(name) || <Sym name="person" size={13} />}
          </span>
          {name}
        </span>
        <span {...stylex.props(styles.hdrBtns)}>
          <IconButton
            name="video"
            size={20}
            aria-label={`FaceTime ${name}`}
            onClick={() => os.open('FaceTime', name)}
          />
          <IconButton
            name="ellipsis"
            size={17}
            aria-label="Conversation actions"
            aria-expanded={menu}
            onClick={() => setMenu(true)}
          />
        </span>
        <Menu open={menu} onClose={() => setMenu(false)} items={items} size={14} xstyle={[styles.hdrMenu]} />
      </Title>
      <Screen ref={body} onScroll={onScroll} xstyle={[styles.flush]} aria-label={`Messages with ${name}`}>
        <div {...stylex.props(styles.thread)}>
          {conv.messages.map((m, i) => {
            const prev = conv.messages[i - 1]
            return (
              <div key={m.id} {...stylex.props(styles.burst)}>
                {stamped(prev, m) && (
                  <Text as="div" size="caption2" color="secondary" xstyle={[styles.stampLine]}>
                    {threadStamp(m.at)}
                  </Text>
                )}
                <div {...stylex.props(styles.bubWrap, prev && prev.me !== m.me && styles.turn)}>
                  <button
                    type="button"
                    {...stylex.props(styles.bub, m.me ? styles.me : styles.them)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setBubMenu(bubMenu === m.id ? '' : m.id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'ContextMenu') {
                        e.preventDefault()
                        setBubMenu(m.id)
                      }
                    }}
                    aria-label={`${m.me ? 'You' : name}, ${threadStamp(m.at)}`}
                  >
                    {m.text}
                  </button>
                  <Menu
                    open={bubMenu === m.id}
                    onClose={() => setBubMenu('')}
                    items={[
                      {
                        label: 'Copy',
                        icon: 'document',
                        onSelect: () => void navigator.clipboard?.writeText(m.text).catch(() => {})
                      }
                    ]}
                    size={13}
                    xstyle={[styles.bubMenu, m.me && styles.bubMenuMe]}
                  />
                </div>
                {i === conv.messages.length - 1 && m.me && (
                  <Text as="div" size="caption2" color="secondary" xstyle={[styles.status]}>
                    Sent
                  </Text>
                )}
              </div>
            )
          })}
          {typing && (
            <div {...stylex.props(styles.burst)}>
              <div {...stylex.props(styles.typing)} role="status" aria-label={`${name} is typing`}>
                {DOTS.map((d) => (
                  <i key={d} {...stylex.props(styles.dot, delay.ms(d * 150))} />
                ))}
              </div>
            </div>
          )}
        </div>
      </Screen>
      <div {...stylex.props(styles.compose)}>
        <textarea
          ref={area}
          aria-label="Message text"
          placeholder="Message"
          rows={1}
          {...stylex.props(styles.input)}
          value={conv.draft}
          onChange={(e) => setDraft(conv.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <button
          type="button"
          {...stylex.props(styles.send)}
          disabled={!conv.draft.trim()}
          onClick={submit}
          aria-label="Send"
        >
          <Sym name="up" size={16} />
        </button>
      </div>
    </>
  )
}

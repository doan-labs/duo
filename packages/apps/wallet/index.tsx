// Wallet as Reminders on iPad: a floating glass sidebar and the browse pane of
// smart-group tiles over "My Passes" unfolded, a cover that pushes the same
// pages as a stack. The card fan stays as the app's second root, one `path`
// cell is the navigation for both displays, and one book in fixtures holds the
// passes and their ledgers.

import type { Pass, PassGroup } from '@doan-labs/duo-fixtures/wallet.ts'
import { groupName, passesOf, removePass } from '@doan-labs/duo-fixtures/wallet.ts'
import type { Os } from '@doan-labs/duo-sdk'
import { Nav, Row, Section, Sym, type SymProps, useNav, useWide } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { app, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { AddPassSheet, Dot, FACES, Face, Find, PaySheet } from './parts.tsx'
import { armPay, goBack, goTo, goToPath, openAdd, selFan, useBook, useFanSel, usePath } from './store.ts'
import { styles } from './styles.ts'

/** The smart tiles, Reminders' Today/Scheduled/All/Flagged pattern. */
const TILES: { id: PassGroup | 'all'; sym: SymProps['name']; tint: string }[] = [
  { id: 'all', sym: 'stack', tint: colors.grey3Dark },
  { id: 'cards', sym: 'building', tint: colors.blue },
  { id: 'transit', sym: 'tram', tint: colors.mint },
  { id: 'passes', sym: 'star', tint: colors.orange }
]

/** What the bottom action of a pass detail does. */
const ACT: Record<PassGroup, { label: string; sym: SymProps['name'] }> = {
  cards: { label: 'Pay', sym: 'tick' },
  transit: { label: 'Hold Near Reader', sym: 'tram' },
  passes: { label: 'Present', sym: 'star' }
}

export function Wallet({ os }: { os: Os }) {
  const [box, wide] = useWide()
  // The subscription lives at the root: any write re-renders both displays' copies.
  const book = useBook()
  const path = usePath()
  const sel = path.at(-1)!
  return (
    <div ref={box} {...stylex.props(styles.split)}>
      {wide && <Sidebar sel={sel} book={book} />}
      <div {...stylex.props(styles.pane, wide && styles.paneSide)}>
        {wide ? (
          // Keyed on the destination: picking another swaps the pane with a fade.
          <div key={sel} {...stylex.props(shared.column, shared.swap, styles.paneRoot)}>
            <DestPage dest={sel} wide />
          </div>
        ) : (
          <CoverStack />
        )}
      </div>
      <AddPassSheet />
      <PaySheet mirror={os.mirror} />
    </div>
  )
}

/** The destination dispatcher: one page per id, the same set the sidebar names. */
function DestPage({ dest, wide }: { dest: string; wide: boolean }) {
  if (dest === 'stack') return <StackPage wide={wide} />
  if (dest.startsWith('g:')) return <GroupPage group={dest.slice(2)} wide={wide} />
  if (dest.startsWith('p:')) return <PassPage id={dest.slice(2)} wide={wide} />
  return <BrowsePage wide={wide} />
}

/** The cover stack: the browse root, then each deeper destination slid over it. */
function CoverStack() {
  return (
    <Nav>
      <DestPage dest="browse" wide={false} />
      <SyncPath />
    </Nav>
  )
}

/** Applies the path cell to the Nav stack: a `goTo` anywhere pushes both displays. */
function SyncPath() {
  const path = usePath()
  const { push, pop } = useNav()
  const depth = useRef(1)
  useEffect(() => {
    while (depth.current < path.length) {
      const d = path[depth.current]!
      depth.current++
      push(() => <DestPage dest={d} wide={false} />)
    }
    while (depth.current > Math.max(1, path.length)) {
      depth.current--
      pop()
    }
  }, [path, push, pop])
  return null
}

/** The floating glass sidebar: search, the roots, then every pass. */
function Sidebar({ sel, book }: { sel: string; book: { passes: Pass[] } }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const found = q ? book.passes.filter((p) => p.name.toLowerCase().includes(q)) : []
  return (
    <nav aria-label="Wallet" {...stylex.props(styles.side)}>
      <Find query={query} onQuery={setQuery} />
      <div {...stylex.props(styles.sideList)}>
        {q ? (
          found.map((p) => (
            <SideRow
              key={p.id}
              sym={p.icon as SymProps['name']}
              tint={FACES[p.face].accent}
              label={p.name}
              count={p.txns.length}
              on={sel === `p:${p.id}`}
              pick={() => goToPath(['browse', `p:${p.id}`])}
            />
          ))
        ) : (
          <>
            <SideRow sym="grid" label="Browse" on={sel === 'browse'} pick={() => goToPath(['browse'])} />
            <SideRow sym="stack" label="Card Stack" on={sel === 'stack'} pick={() => goToPath(['browse', 'stack'])} />
            <div {...stylex.props(styles.sideSec)}>My Passes</div>
            {book.passes.map((p) => (
              <SideRow
                key={p.id}
                sym={p.icon as SymProps['name']}
                tint={FACES[p.face].accent}
                label={p.name}
                count={p.txns.length}
                on={sel === `p:${p.id}`}
                pick={() => goToPath(['browse', `p:${p.id}`])}
              />
            ))}
          </>
        )}
        {q && found.length === 0 && <p {...stylex.props(shared.sub, styles.empty)}>No results for “{query.trim()}”.</p>}
      </div>
      <button
        type="button"
        onClick={() => openAdd({ group: 'cards' })}
        {...stylex.props(styles.sideFoot, shared.select)}
      >
        <Sym name="plus" size={15} />
        <span {...stylex.props(styles.sideLabel)}>New Pass</span>
      </button>
    </nav>
  )
}

function SideRow({
  sym,
  tint,
  label,
  count,
  on,
  pick
}: {
  sym: SymProps['name']
  tint?: string
  label: string
  count?: number
  on: boolean
  pick: () => void
}) {
  return (
    <button
      type="button"
      aria-current={on || undefined}
      onClick={pick}
      {...stylex.props(styles.sideRow, on && styles.sideRowOn, shared.select)}
    >
      <span {...stylex.props(styles.sideTint, tint ? styles.tint(tint) : undefined)}>
        <Sym name={sym} size={15} />
      </span>
      <span {...stylex.props(styles.sideLabel)}>{label}</span>
      {count != null && count > 0 && <span {...stylex.props(styles.sideCount)}>{count}</span>}
    </button>
  )
}

/**
 * The browse root, Reminders' home: the four smart tiles, then "My Passes" as
 * a grouped list, the "+ New Pass" / "Add Card" bar pinned at the bottom.
 */
function BrowsePage({ wide }: { wide: boolean }) {
  const book = useBook()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const found = q ? book.passes.filter((p) => p.name.toLowerCase().includes(q)) : []
  const dest = (d: string) => (wide ? goToPath(['browse', d]) : goTo(d))
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(typography.largeTitle)}>Wallet</span>
        {!wide && (
          <div {...stylex.props(styles.headSide)}>
            <Find query={query} onQuery={setQuery} />
          </div>
        )}
      </div>
      <div {...stylex.props(styles.body)}>
        {q ? (
          <Section>
            {found.map((p) => (
              <PassRow key={p.id} pass={p} pick={() => dest(`p:${p.id}`)} />
            ))}
            {found.length === 0 && <Row label={`No passes match “${query.trim()}”`} />}
          </Section>
        ) : (
          <>
            <div {...stylex.props(styles.tiles, wide && styles.tilesWide)}>
              {TILES.map((t) => (
                <button key={t.id} type="button" onClick={() => dest(`g:${t.id}`)} {...stylex.props(styles.tile)}>
                  <span {...stylex.props(styles.tileIc(t.tint))}>
                    <Sym name={t.sym} size={16} />
                  </span>
                  <span {...stylex.props(styles.tileNum)}>{passesOf(t.id).length}</span>
                  <span {...stylex.props(styles.tileLabel)}>{groupName(t.id)}</span>
                </button>
              ))}
            </div>
            <div {...stylex.props(styles.sec)}>My Passes</div>
            <div {...stylex.props(styles.col)}>
              <Section>
                {book.passes.map((p) => (
                  <PassRow key={p.id} pass={p} pick={() => dest(`p:${p.id}`)} />
                ))}
              </Section>
            </div>
          </>
        )}
      </div>
      <div {...stylex.props(styles.bar)}>
        <button type="button" onClick={() => openAdd({ group: 'cards' })} {...stylex.props(styles.barBtn)}>
          <Sym name="plus" size={16} />
          New Pass
        </button>
        <button type="button" onClick={() => dest('stack')} {...stylex.props(styles.barBtn, styles.barRight)}>
          Card Stack
        </button>
      </div>
    </>
  )
}

/** A pass row: its tinted circle, name over detail, ledger count and a chevron. */
function PassRow({ pass, pick }: { pass: Pass; pick: () => void }) {
  return (
    <Row
      as="button"
      onClick={pick}
      icon={<Dot sym={pass.icon as SymProps['name']} tint={FACES[pass.face].accent} />}
      label={pass.name}
      subtitle={pass.detail}
      detail={pass.txns.length || undefined}
      chevron
      xstyle={styles.linkRow}
    />
  )
}

/** A group's pass list: its coloured title over the rows of that group. */
function GroupPage({ group, wide }: { group: string; wide: boolean }) {
  const tile = TILES.find((t) => t.id === group)
  const passes = passesOf(group)
  const name = groupName(group)
  return (
    <>
      <div {...stylex.props(styles.head)}>
        {!wide && <BackBtn />}
        <span {...stylex.props(styles.title(tile?.tint ?? app.fg))}>{name}</span>
      </div>
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.col)}>
          <Section>
            {passes.map((p) => (
              <PassRow key={p.id} pass={p} pick={() => goTo(`p:${p.id}`)} />
            ))}
            {passes.length === 0 && <Row label="No passes" />}
          </Section>
        </div>
      </div>
      {group !== 'all' && (
        <div {...stylex.props(styles.bar)}>
          <button type="button" onClick={() => openAdd({ group: group as PassGroup })} {...stylex.props(styles.barBtn)}>
            <Sym name="plus" size={16} />
            New {name.replace(/s$/, '')}
          </button>
        </div>
      )}
    </>
  )
}

/**
 * A pass detail, Reminders' list view: the big accent title, the face hero,
 * the ledger as reminder rows, and the pass action pinned at the bottom.
 */
function PassPage({ id, wide }: { id: string; wide: boolean }) {
  const book = useBook()
  const pass = book.passes.find((p) => p.id === id)
  if (!pass) return null
  const act = ACT[pass.group]
  const accent = FACES[pass.face].accent
  return (
    <>
      <div {...stylex.props(styles.head)}>
        {!wide && <BackBtn />}
        <span {...stylex.props(styles.title(accent))}>{pass.name}</span>
      </div>
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.hero)}>
          <Face pass={pass} w={Math.min(300, wide ? 300 : 240)} />
          <span {...stylex.props(typography.footnote, styles.heroSub)}>{pass.detail}</span>
        </div>
        <div {...stylex.props(styles.sec)}>Transactions</div>
        <div {...stylex.props(styles.col)}>
          <Section>
            {pass.txns.map((t) => (
              <Row
                key={t.id}
                icon={<Dot sym={t.icon as SymProps['name']} tint={accent} />}
                label={t.merchant}
                subtitle={t.when}
                detail={t.amount}
              />
            ))}
            {pass.txns.length === 0 && <Row label="No transactions yet" />}
          </Section>
          <Section>
            <Row
              as="button"
              onClick={() => {
                removePass(pass.id)
                goToPath(['browse'])
              }}
              label={<span {...stylex.props(styles.delLabel)}>Delete This Pass</span>}
              xstyle={styles.linkRow}
            />
          </Section>
        </div>
      </div>
      <div {...stylex.props(styles.bar)}>
        <button type="button" onClick={() => armPay(pass.id)} {...stylex.props(styles.barBtn)}>
          <Sym name={act.sym} size={16} />
          {act.label}
        </button>
      </div>
    </>
  )
}

/**
 * The card stack, the app's signature: the card-group faces fanned, a tap
 * lifting one to the top, and the pay action under the fan.
 */
function StackPage({ wide }: { wide: boolean }) {
  const book = useBook()
  const cards = book.passes.filter((p) => p.group === 'cards')
  const fanSel = useFanSel()
  const order = [...cards.filter((p) => p.id !== fanSel), ...cards.filter((p) => p.id === fanSel)]
  const top = order.at(-1)
  return (
    <>
      <div {...stylex.props(styles.head)}>
        {!wide && <BackBtn />}
        <span {...stylex.props(typography.largeTitle)}>Cards</span>
      </div>
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.fan)}>
          {order.map((p, i) => {
            const lift = i === order.length - 1
            return (
              <button
                key={p.id}
                type="button"
                aria-label={p.name}
                onClick={() => selFan(p.id)}
                {...stylex.props(
                  styles.fanCard(FACES[p.face].bg),
                  p.ink === 'dark' ? styles.faceInkDark : styles.faceInk,
                  styles.fanShift(i, lift)
                )}
              >
                <span {...stylex.props(styles.faceMark)}>
                  <Sym name={p.icon as SymProps['name']} size={18} />
                </span>
                <span {...stylex.props(styles.faceBig)}>
                  <Sym name={p.icon as SymProps['name']} size={110} />
                </span>
                <span {...stylex.props(styles.faceName)}>{p.name}</span>
                <span {...stylex.props(styles.faceNum)}>{p.last4 ? `··· ${p.last4}` : p.detail}</span>
              </button>
            )
          })}
          <div {...stylex.props(typography.footnote, styles.fanHint)}>
            {top ? `${top.name} · tap a card to bring it forward` : 'No cards yet'}
          </div>
        </div>
      </div>
      <div {...stylex.props(styles.bar)}>
        <button type="button" onClick={() => top && armPay(top.id)} {...stylex.props(styles.barBtn)}>
          <Sym name="tick" size={16} />
          Pay
        </button>
        <button
          type="button"
          onClick={() => openAdd({ group: 'cards' })}
          {...stylex.props(styles.barBtn, styles.barRight)}
        >
          <Sym name="plus" size={16} />
          New Card
        </button>
      </div>
    </>
  )
}

function BackBtn() {
  return (
    <button type="button" aria-label="Back" onClick={goBack} {...stylex.props(shared.bk, shared.press)}>
      <Sym name="back" size={20} />
    </button>
  )
}

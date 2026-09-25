// Home as Reminders on iPad: a floating glass sidebar and the browse pane of
// smart-group tiles over "My Rooms" and "Scenes" unfolded, a cover that pushes
// the same pages as a stack. One `path` cell is the navigation for both
// displays, and one book in fixtures holds the house.

import { beep } from '@doan-labs/duo-fixtures'
import type { Acc, Room } from '@doan-labs/duo-fixtures/home.ts'
import {
  accOf,
  accsOf,
  applyScene,
  flipAcc,
  GROUPS,
  KIND_NAME,
  removeAcc,
  roomOf,
  SCENES,
  setLevel,
  setTemp,
  stateOf
} from '@doan-labs/duo-fixtures/home.ts'
import { Nav, Row, Section, Sym, type SymProps, Toggle, useNav, useWide } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { AddAccSheet, AddRoomSheet, Dial, Dot, Find, KIND_ICON, tintOf } from './parts.tsx'
import { goBack, goTo, goToPath, openAddAcc, openAddRoom, useBook, usePath } from './store.ts'
import { styles } from './styles.ts'

/** The smart tiles, Reminders' Today/Scheduled/All/Flagged pattern. */
const TILES: Record<string, { sym: SymProps['name']; tint: string }> = {
  lights: { sym: 'sun', tint: colors.yellow },
  climate: { sym: 'thermometer', tint: colors.orange },
  security: { sym: 'lock', tint: colors.green },
  media: { sym: 'volume', tint: colors.blue }
}

export function Home() {
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
      <AddAccSheet />
      <AddRoomSheet />
    </div>
  )
}

/** The destination dispatcher: one page per id, the same set the sidebar names. */
function DestPage({ dest, wide }: { dest: string; wide: boolean }) {
  if (dest.startsWith('g:')) return <GroupPage group={dest.slice(2)} wide={wide} />
  if (dest.startsWith('r:')) return <RoomPage id={dest.slice(2)} wide={wide} />
  if (dest.startsWith('a:')) return <AccPage id={dest.slice(2)} wide={wide} />
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

/** The floating glass sidebar: search, Browse, then every room and scene. */
function Sidebar({ sel, book }: { sel: string; book: { rooms: Room[] } }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const found = q
    ? book.rooms.flatMap((room) =>
        room.accs.filter((a) => a.name.toLowerCase().includes(q)).map((acc) => ({ room, acc }))
      )
    : []
  return (
    <nav aria-label="Home" {...stylex.props(styles.side)}>
      <Find query={query} onQuery={setQuery} />
      <div {...stylex.props(styles.sideList)}>
        {q ? (
          found.map(({ room, acc }) => (
            <SideRow
              key={acc.id}
              sym={KIND_ICON[acc.kind]}
              tint={tintOf(room.tint)}
              label={acc.name}
              on={sel === `a:${acc.id}`}
              pick={() => goToPath(['browse', `r:${room.id}`, `a:${acc.id}`])}
            />
          ))
        ) : (
          <>
            <SideRow sym="grid" label="Browse" on={sel === 'browse'} pick={() => goToPath(['browse'])} />
            <div {...stylex.props(styles.sideSec)}>My Rooms</div>
            {book.rooms.map((room) => (
              <SideRow
                key={room.id}
                sym={room.icon as SymProps['name']}
                tint={tintOf(room.tint)}
                label={room.name}
                count={room.accs.length}
                on={sel === `r:${room.id}`}
                pick={() => goToPath(['browse', `r:${room.id}`])}
              />
            ))}
            <div {...stylex.props(styles.sideSec)}>Scenes</div>
            {SCENES.map((s) => (
              <SideRow
                key={s.id}
                sym={s.icon as SymProps['name']}
                tint={tintOf(s.tint)}
                label={s.name}
                on={false}
                pick={() => applyScene(s.id)}
              />
            ))}
          </>
        )}
        {q && found.length === 0 && <p {...stylex.props(shared.sub, styles.empty)}>No results for “{query.trim()}”.</p>}
      </div>
      <button type="button" onClick={openAddRoom} {...stylex.props(styles.sideFoot, shared.select)}>
        <Sym name="plus" size={15} />
        <span {...stylex.props(styles.sideLabel)}>Add Room</span>
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
 * The browse root, Reminders' home: the four smart tiles, then "My Rooms" and
 * "Scenes" as grouped lists, the action bar pinned at the bottom.
 */
function BrowsePage({ wide }: { wide: boolean }) {
  const book = useBook()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const found = q
    ? book.rooms.flatMap((room) =>
        room.accs.filter((a) => a.name.toLowerCase().includes(q)).map((acc) => ({ room, acc }))
      )
    : []
  const dest = (d: string) => (wide ? goToPath(['browse', d]) : goTo(d))
  const firstRoom = book.rooms[0]
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(typography.largeTitle)}>My Home</span>
        {!wide && (
          <div {...stylex.props(styles.headSide)}>
            <Find query={query} onQuery={setQuery} />
          </div>
        )}
      </div>
      <div {...stylex.props(styles.body)}>
        {q ? (
          <Section>
            {found.map(({ room, acc }) => (
              <AccRow key={acc.id} room={room} acc={acc} pick={() => dest(`a:${acc.id}`)} />
            ))}
            {found.length === 0 && <Row label={`No accessories match “${query.trim()}”`} />}
          </Section>
        ) : (
          <>
            <div {...stylex.props(styles.tiles, wide && styles.tilesWide)}>
              {GROUPS.map((g) => {
                const t = TILES[g.id]!
                return (
                  <button key={g.id} type="button" onClick={() => dest(`g:${g.id}`)} {...stylex.props(styles.tile)}>
                    <span {...stylex.props(styles.tileIc(t.tint))}>
                      <Sym name={t.sym} size={16} />
                    </span>
                    <span {...stylex.props(styles.tileNum)}>{accsOf(g.kinds).length}</span>
                    <span {...stylex.props(styles.tileLabel)}>{g.name}</span>
                  </button>
                )
              })}
            </div>
            <div {...stylex.props(styles.sec)}>My Rooms</div>
            <div {...stylex.props(styles.col)}>
              <Section>
                {book.rooms.map((room) => (
                  <Row
                    key={room.id}
                    as="button"
                    onClick={() => dest(`r:${room.id}`)}
                    icon={<Dot sym={room.icon as SymProps['name']} tint={tintOf(room.tint)} />}
                    label={room.name}
                    detail={room.accs.length || undefined}
                    chevron
                    xstyle={styles.linkRow}
                  />
                ))}
                {book.rooms.length === 0 && <Row label="No rooms" />}
              </Section>
            </div>
            <div {...stylex.props(styles.sec)}>Scenes</div>
            <div {...stylex.props(styles.col)}>
              <Section>
                {SCENES.map((s) => (
                  <Row
                    key={s.id}
                    as="button"
                    onClick={() => {
                      applyScene(s.id)
                      beep([720], 0.05, 0.05)
                    }}
                    icon={<Dot sym={s.icon as SymProps['name']} tint={tintOf(s.tint)} />}
                    label={s.name}
                    xstyle={styles.linkRow}
                  />
                ))}
              </Section>
            </div>
          </>
        )}
      </div>
      <div {...stylex.props(styles.bar)}>
        <button
          type="button"
          disabled={!firstRoom}
          onClick={() => firstRoom && openAddAcc({ room: firstRoom.id, kind: 'light' })}
          {...stylex.props(styles.barBtn)}
        >
          <Sym name="plus" size={16} />
          New Accessory
        </button>
        <button type="button" onClick={openAddRoom} {...stylex.props(styles.barBtn, styles.barRight)}>
          Add Room
        </button>
      </div>
    </>
  )
}

/** An accessory row: tinted kind circle, name over room and state, switch trailing. */
function AccRow({ room, acc, pick }: { room: Room; acc: Acc; pick: () => void }) {
  return (
    <Row
      onClick={pick}
      icon={<Dot sym={KIND_ICON[acc.kind]} tint={tintOf(room.tint)} />}
      label={acc.name}
      subtitle={`${room.name} · ${stateOf(acc)}`}
      xstyle={styles.rowTap}
    >
      <Toggle
        aria-label={`${acc.name} power`}
        checked={acc.on}
        onChange={() => {
          flipAcc(acc.id)
          beep([acc.on ? 620 : 880], 0.05, 0.05)
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </Row>
  )
}

/** A group's accessory list: the tinted title over every matching accessory. */
function GroupPage({ group, wide }: { group: string; wide: boolean }) {
  const g = GROUPS.find((x) => x.id === group)
  if (!g) return <BrowsePage wide={wide} />
  const t = TILES[g.id]!
  const dest = (d: string) => (wide ? goToPath(['browse', d]) : goTo(d))
  return (
    <>
      <div {...stylex.props(styles.head)}>
        {!wide && <BackBtn />}
        <span {...stylex.props(styles.title(t.tint))}>{g.name}</span>
      </div>
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.col)}>
          <Section>
            {accsOf(g.kinds).map(({ room, acc }) => (
              <AccRow key={acc.id} room={room} acc={acc} pick={() => dest(`a:${acc.id}`)} />
            ))}
            {accsOf(g.kinds).length === 0 && <Row label={`No ${g.name.toLowerCase()}`} />}
          </Section>
        </div>
      </div>
    </>
  )
}

/** A room, Reminders' list view: tinted title, its accessories, the add bar. */
function RoomPage({ id, wide }: { id: string; wide: boolean }) {
  const room = roomOf(id)
  if (!room) return <BrowsePage wide={wide} />
  const dest = (d: string) => (wide ? goToPath(['browse', `r:${id}`, d]) : goTo(d))
  return (
    <>
      <div {...stylex.props(styles.head)}>
        {!wide && <BackBtn />}
        <span {...stylex.props(styles.title(tintOf(room.tint)))}>{room.name}</span>
      </div>
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.col)}>
          <Section>
            {room.accs.map((acc) => (
              <AccRow key={acc.id} room={room} acc={acc} pick={() => dest(`a:${acc.id}`)} />
            ))}
            {room.accs.length === 0 && <Row label="No accessories" />}
          </Section>
        </div>
      </div>
      <div {...stylex.props(styles.bar)}>
        <button
          type="button"
          onClick={() => openAddAcc({ room: room.id, kind: 'light' })}
          {...stylex.props(styles.barBtn)}
        >
          <Sym name="plus" size={16} />
          New Accessory
        </button>
      </div>
    </>
  )
}

/**
 * An accessory detail: the kind icon hero or the drag dial, a power row, and
 * the remove row - the Reminders detail's list-info equivalent.
 */
function AccPage({ id, wide }: { id: string; wide: boolean }) {
  const found = accOf(id)
  if (!found) return <BrowsePage wide={wide} />
  const { room, acc } = found
  const tint = tintOf(room.tint)
  const climate = acc.kind === 'climate'
  const level = acc.level ?? 0
  const temp = acc.temp ?? 21
  return (
    <>
      <div {...stylex.props(styles.head)}>
        {!wide && <BackBtn />}
        <span {...stylex.props(styles.title(tint))}>{acc.name}</span>
      </div>
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.hero)}>
          {acc.kind === 'lock' || acc.kind === 'tv' ? (
            <button
              type="button"
              aria-label={acc.kind === 'lock' ? 'Lock' : 'Power'}
              onClick={() => {
                flipAcc(acc.id)
                beep([acc.on ? 620 : 880], 0.05, 0.05)
              }}
              {...stylex.props(styles.lockBtn(acc.on))}
            >
              <Sym name={KIND_ICON[acc.kind]} size={44} />
            </button>
          ) : (
            <Dial
              value={climate ? (temp - 12) / 18 : level / 100}
              tint={tint}
              onChange={(f) => {
                if (!acc.on) flipAcc(acc.id, true)
                if (climate) setTemp(acc.id, 12 + f * 18)
                else setLevel(acc.id, f * 100)
              }}
            >
              <span {...stylex.props(styles.dialRead)}>
                {climate ? `${Math.round(temp)}°` : `${Math.round(level)}%`}
              </span>
            </Dial>
          )}
          <span {...stylex.props(typography.footnote, styles.heroSub)}>
            {room.name} · {KIND_NAME[acc.kind]} · {stateOf(acc)}
          </span>
        </div>
        <div {...stylex.props(styles.col)}>
          <Section>
            <Row label={acc.kind === 'lock' ? 'Locked' : 'Power'} icon={<Dot sym={KIND_ICON[acc.kind]} tint={tint} />}>
              <Toggle
                aria-label={`${acc.name} power`}
                checked={acc.on}
                onChange={() => {
                  flipAcc(acc.id)
                  beep([acc.on ? 620 : 880], 0.05, 0.05)
                }}
              />
            </Row>
          </Section>
          <Section>
            <Row
              as="button"
              onClick={() => {
                removeAcc(acc.id)
                goToPath(['browse', `r:${room.id}`])
              }}
              label={<span {...stylex.props(styles.delLabel)}>Remove This Accessory</span>}
              xstyle={styles.linkRow}
            />
          </Section>
        </div>
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

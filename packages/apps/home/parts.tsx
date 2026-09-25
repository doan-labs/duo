// Home's shared pieces: tint and kind maps, the drag dial, the tinted dot
// rows lead with, the search field, and the new-room / new-accessory sheets.

import type { AccKind } from '@doan-labs/duo-fixtures/home.ts'
import { addAcc, addRoom, KIND_NAME, roomOf } from '@doan-labs/duo-fixtures/home.ts'
import { Button, Sheet, Sym, type SymProps, TextField } from '@doan-labs/duo-uikit'
import { typography } from '@doan-labs/duo-uikit/styles.ts'
import { app, colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type PointerEvent, type ReactNode, useId, useRef, useState } from 'react'
import { closeAddAcc, closeAddRoom, goToPath, setAddKind, useAddAcc, useAddRoom, useBook } from './store.ts'
import { styles } from './styles.ts'

/** A room's tint key to a colour; the fixture stores keys, pixels live here. */
export const TINTS: Record<string, string> = {
  blue: colors.blue,
  teal: colors.teal,
  pink: colors.pink,
  purple: colors.purple,
  red: colors.red,
  yellow: colors.yellow,
  indigo: colors.indigo,
  green: colors.green,
  orange: colors.orange
}
export const tintOf = (key: string) => TINTS[key] ?? colors.blue

/** A kind's glyph. */
export const KIND_ICON: Record<AccKind, SymProps['name']> = {
  light: 'sun',
  climate: 'thermometer',
  lock: 'lock',
  fan: 'wind',
  speaker: 'volume',
  tv: 'film'
}

/** The tinted circle an accessory or a room wears at a row's leading edge. */
export function Dot({ sym, tint, size = 30 }: { sym: SymProps['name']; tint: string; size?: number }) {
  return (
    <span {...stylex.props(styles.dot(tint, size))}>
      <Sym name={sym} size={size * 0.53} />
    </span>
  )
}

/** The round search field, shared by the sidebar and the cover's browse page. */
export function Find({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  return (
    <div {...stylex.props(styles.sideFind)}>
      <Sym name="search" size={14} />
      <input
        type="search"
        value={query}
        placeholder="Search"
        aria-label="Search Home"
        onChange={(e) => onQuery(e.target.value)}
        {...stylex.props(styles.sideField)}
      />
    </div>
  )
}

const C = 2 * Math.PI * 52
const Track = ({ stroke, dash }: { stroke: string; dash: number }) => (
  <circle
    cx={65}
    cy={65}
    r={52}
    fill="none"
    stroke={stroke}
    strokeWidth={9}
    strokeLinecap="round"
    strokeDasharray={`${dash} ${C}`}
  />
)

/**
 * The drag dial: the knob anywhere on the ring, the arc and the readout
 * following. `value` is 0-1 across a 270-degree sweep missing at the bottom;
 * the panel can be rotated in 3D, so the angle is only exact face-on, which is
 * enough for a drag and never sticks.
 */
export function Dial({
  value,
  tint,
  onChange,
  children
}: {
  value: number
  tint: string
  onChange: (f: number) => void
  children?: ReactNode
}) {
  const drag = useRef(false)
  const at = (e: PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    const a = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2))
    const f = Math.min(1, Math.max(0, (((a * 180) / Math.PI + 360 - 45) % 360) / 270))
    onChange(f)
  }
  const gradId = useId()
  return (
    <div
      {...stylex.props(styles.dial)}
      onPointerDown={(e) => {
        drag.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        at(e)
      }}
      onPointerMove={(e) => {
        if (drag.current) at(e)
      }}
      onPointerUp={() => {
        drag.current = false
      }}
    >
      <svg viewBox="0 0 130 130" aria-hidden="true" {...stylex.props(styles.dialSvg)}>
        <defs>
          <linearGradient id={gradId} x1={0} y1={0} x2={1} y2={1}>
            <stop offset={0} stopColor={tint} />
            <stop offset={1} stopColor={colors.orange} />
          </linearGradient>
        </defs>
        <Track stroke={app.fill3} dash={C * 0.75} />
        <Track stroke={`url(#${gradId})`} dash={C * 0.75 * value} />
      </svg>
      {children}
    </div>
  )
}

const KINDS: AccKind[] = ['light', 'climate', 'lock', 'fan', 'speaker', 'tv']

/** The new-accessory sheet: a name field over the kind grid, for one room. */
export function AddAccSheet() {
  const add = useAddAcc()
  // Subscribed so a write on the other display re-renders the open sheet too.
  useBook()
  const [name, setName] = useState('')
  const open = add != null
  const room = add ? roomOf(add.room) : undefined
  const kind = add?.kind ?? 'light'
  const save = () => {
    if (!open || !room) return
    const id = addAcc(room.id, name, kind)
    setName('')
    closeAddAcc()
    goToPath(['browse', `r:${room.id}`, `a:${id}`])
  }
  return (
    <Sheet open={open} onClose={closeAddAcc} aria-label="New Accessory">
      <div {...stylex.props(styles.sheetPad)}>
        <div {...stylex.props(styles.sheetTitle)}>
          <span {...stylex.props(typography.title3)}>New Accessory{room ? ` · ${room.name}` : ''}</span>
        </div>
        <TextField
          autoFocus
          value={name}
          placeholder="Name"
          aria-label="Accessory name"
          onChange={(e) => setName((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <div {...stylex.props(styles.kindGrid)}>
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setAddKind(k)}
              {...stylex.props(styles.kindBtn, k === kind && styles.kindOn)}
            >
              <Sym name={KIND_ICON[k]} size={18} />
              {KIND_NAME[k]}
            </button>
          ))}
        </div>
        <div {...stylex.props(styles.sheetBtns)}>
          <Button variant="plain" onClick={closeAddAcc}>
            Cancel
          </Button>
          <Button variant="filled" onClick={save}>
            Add
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

/** The new-room sheet: a name field. */
export function AddRoomSheet() {
  const open = useAddRoom()
  const [name, setName] = useState('')
  const save = () => {
    if (!open) return
    const id = addRoom(name)
    setName('')
    closeAddRoom()
    goToPath(['browse', `r:${id}`])
  }
  return (
    <Sheet open={open} onClose={closeAddRoom} aria-label="Add Room">
      <div {...stylex.props(styles.sheetPad)}>
        <div {...stylex.props(styles.sheetTitle)}>
          <span {...stylex.props(typography.title3)}>Add Room</span>
        </div>
        <TextField
          autoFocus
          value={name}
          placeholder="Name"
          aria-label="Room name"
          onChange={(e) => setName((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <div {...stylex.props(styles.sheetBtns)}>
          <Button variant="plain" onClick={closeAddRoom}>
            Cancel
          </Button>
          <Button variant="filled" onClick={save}>
            Add
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

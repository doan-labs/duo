// World Clock: the list of cities with their live times. Edit mode swaps each
// row's leading edge for a delete circle; the + button opens the city picker.

import { Sym, TextField } from '@doan-labs/duo-uikit'
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { ClockSheet } from './sheet.tsx'
import { CITIES, useCities, useNow } from './store.ts'
import { styles } from './styles.ts'
import { clockParts, relativeDay } from './time.ts'

export const WorldClock = ({ narrow }: { narrow: boolean }) => {
  const cities = useCities()
  const [edit, setEdit] = useState(false)
  const [adding, setAdding] = useState(false)
  const now = useNow(1)
  return (
    <>
      <div {...stylex.props(styles.head)}>
        <div {...stylex.props(styles.title)}>World Clock</div>
        <div {...stylex.props(styles.actions)}>
          <button type="button" onClick={() => setEdit(!edit)} {...stylex.props(styles.editBtn, shared.press)}>
            {edit ? 'Done' : 'Edit'}
          </button>
          <button
            type="button"
            aria-label="Add city"
            onClick={() => setAdding(true)}
            {...stylex.props(styles.round, shared.press)}
          >
            <Sym name="plus" size={15} />
          </button>
        </div>
      </div>
      <div {...stylex.props(styles.body, narrow && styles.bodyNarrow)}>
        <div {...stylex.props(styles.list)}>
          {cities.value.map((c, i) => (
            <CityRow
              key={c.tz}
              city={c}
              now={now}
              last={i === cities.value.length - 1}
              edit={edit}
              remove={() => cities.set(cities.value.filter((x) => x.tz !== c.tz))}
            />
          ))}
        </div>
      </div>
      <AddCity
        open={adding}
        onClose={() => setAdding(false)}
        add={(c) => {
          cities.set([...cities.value, c])
          setAdding(false)
        }}
        taken={cities.value}
      />
    </>
  )
}

const CityRow = ({
  city,
  now,
  last,
  edit,
  remove
}: {
  city: { name: string; tz: string }
  now: number
  last: boolean
  edit: boolean
  remove: () => void
}) => {
  const { time, period } = clockParts(new Date(now), city.tz)
  return (
    <div {...stylex.props(styles.row, last && styles.rowLast, animations.row)}>
      {edit && (
        <button
          type="button"
          aria-label={`Delete ${city.name}`}
          onClick={remove}
          {...stylex.props(styles.minus, shared.press)}
        >
          <Sym name="minus" size={13} />
        </button>
      )}
      <div {...stylex.props(styles.city)}>
        <div>{city.name}</div>
        <div {...stylex.props(styles.cap)}>{relativeDay(new Date(now), city.tz)}</div>
      </div>
      <div>
        <span {...stylex.props(styles.cityTime)}>{time}</span>
        <span {...stylex.props(styles.period)}>{period}</span>
      </div>
    </div>
  )
}

const AddCity = ({
  open,
  onClose,
  add,
  taken
}: {
  open: boolean
  onClose: () => void
  add: (c: { name: string; tz: string }) => void
  taken: { name: string; tz: string }[]
}) => {
  const [q, setQ] = useState('')
  const list = CITIES.filter((c) => !taken.some((t) => t.tz === c.tz) && c.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <ClockSheet open={open} title="Choose a City" onClose={onClose} wide>
      <div {...stylex.props(styles.searchWrap)}>
        <TextField
          autoFocus
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search cities"
        />
      </div>
      {list.map((c) => (
        <button key={c.tz} type="button" onClick={() => add(c)} {...stylex.props(styles.formRow)}>
          {c.name}
        </button>
      ))}
      {!list.length && <div {...stylex.props(styles.cap, styles.empty)}>No Results</div>}
    </ClockSheet>
  )
}

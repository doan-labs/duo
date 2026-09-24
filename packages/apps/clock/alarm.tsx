// Alarms: the list with enable toggles, plus the iOS editor sheet - an hour /
// minute / AM-PM drum trio over Label, Repeat, Sound and Snooze rows.

import { Sym, TextField, Toggle } from '@doan-labs/duo-uikit'
import { animations, shared } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { ClockSheet } from './sheet.tsx'
import { type Alarm, SOUNDS, uid, useAlarms } from './store.ts'
import { styles } from './styles.ts'
import { alarmParts, DAYS, repeatName } from './time.ts'
import { Wheel } from './wheel.tsx'

export const Alarms = ({ narrow }: { narrow: boolean }) => {
  const alarms = useAlarms()
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<Alarm | null>(null)
  const [fresh, setFresh] = useState(false)

  const save = (a: Alarm) => {
    alarms.set(fresh ? [...alarms.value, a] : alarms.value.map((x) => (x.id === a.id ? a : x)))
    setDraft(null)
  }

  return (
    <>
      <div {...stylex.props(styles.head)}>
        <div {...stylex.props(styles.title)}>Alarms</div>
        <div {...stylex.props(styles.actions)}>
          <button type="button" onClick={() => setEdit(!edit)} {...stylex.props(styles.editBtn, shared.press)}>
            {edit ? 'Done' : 'Edit'}
          </button>
          <button
            type="button"
            aria-label="Add alarm"
            onClick={() => {
              const d = new Date()
              setDraft({
                id: uid(),
                hour: d.getHours(),
                minute: d.getMinutes(),
                label: 'Alarm',
                repeat: [],
                sound: 'Radar',
                snooze: true,
                on: true
              })
              setFresh(true)
            }}
            {...stylex.props(styles.round, shared.press)}
          >
            <Sym name="plus" size={15} />
          </button>
        </div>
      </div>
      <div {...stylex.props(styles.body, narrow && styles.bodyNarrow)}>
        <div {...stylex.props(styles.list)}>
          {alarms.value.map((a, i) => (
            <AlarmRow
              key={a.id}
              alarm={a}
              last={i === alarms.value.length - 1}
              edit={edit}
              open={() => {
                setDraft({ ...a })
                setFresh(false)
              }}
              toggle={() => alarms.set(alarms.value.map((x) => (x.id === a.id ? { ...x, on: !x.on } : x)))}
              remove={() => alarms.set(alarms.value.filter((x) => x.id !== a.id))}
            />
          ))}
          {!alarms.value.length && <div {...stylex.props(styles.cap3, styles.empty)}>No Alarms</div>}
        </div>
      </div>
      <AlarmEditor
        alarm={draft}
        fresh={fresh}
        onClose={() => setDraft(null)}
        onSave={save}
        remove={
          draft && !fresh
            ? () => {
                alarms.set(alarms.value.filter((x) => x.id !== draft.id))
                setDraft(null)
              }
            : undefined
        }
      />
    </>
  )
}

const AlarmRow = ({
  alarm,
  last,
  edit,
  open,
  toggle,
  remove
}: {
  alarm: Alarm
  last: boolean
  edit: boolean
  open: () => void
  toggle: () => void
  remove: () => void
}) => {
  const { time, period } = alarmParts(alarm.hour, alarm.minute)
  return (
    <div {...stylex.props(styles.row, last && styles.rowLast, animations.row)}>
      {edit && (
        <button type="button" aria-label="Delete alarm" onClick={remove} {...stylex.props(styles.minus, shared.press)}>
          <Sym name="minus" size={13} />
        </button>
      )}
      <button type="button" onClick={open} disabled={edit} {...stylex.props(styles.rowBtn, !alarm.on && styles.dim)}>
        <span {...stylex.props(styles.city)}>
          <span>
            <span {...stylex.props(styles.alarmTime)}>{time}</span>
            <span {...stylex.props(styles.period)}>{period}</span>
          </span>
          <span {...stylex.props(styles.cap3)}>
            {alarm.label === 'Alarm' ? repeatName(alarm.repeat) : `${alarm.label}, ${repeatName(alarm.repeat)}`}
          </span>
        </span>
      </button>
      <Toggle checked={alarm.on} onChange={toggle} aria-label={`${alarm.label} switch`} />
    </div>
  )
}

const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 1}`)
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const AMPM = ['AM', 'PM']

const AlarmEditor = ({
  alarm,
  fresh,
  onClose,
  onSave,
  remove
}: {
  alarm: Alarm | null
  fresh: boolean
  onClose: () => void
  onSave: (a: Alarm) => void
  remove?: () => void
}) => {
  // One sheet, three screens: the editor, the repeat picker, the sound list.
  const [page, setPage] = useState<'main' | 'repeat' | 'sound'>('main')
  const [a, setA] = useState<Alarm | null>(alarm)
  const open = !!alarm
  if (alarm && a?.id !== alarm.id) {
    setA({ ...alarm })
    setPage('main')
  }
  const d = a ?? alarm

  const h12 = (d?.hour ?? 9) % 12 || 12
  const body =
    page === 'repeat' ? (
      DAYS.map((day, i) => (
        <button
          key={day}
          type="button"
          onClick={() =>
            d && setA({ ...d, repeat: d.repeat.includes(i) ? d.repeat.filter((x) => x !== i) : [...d.repeat, i] })
          }
          {...stylex.props(styles.formRow)}
        >
          <span>Every {day}</span>
          {d?.repeat.includes(i) && <Sym name="check" size={15} />}
        </button>
      ))
    ) : page === 'sound' ? (
      SOUNDS.map((s) => (
        <button key={s} type="button" onClick={() => d && setA({ ...d, sound: s })} {...stylex.props(styles.formRow)}>
          <span>{s}</span>
          {d?.sound === s && <Sym name="check" size={15} />}
        </button>
      ))
    ) : (
      <>
        <div {...stylex.props(styles.wheels)}>
          <Wheel
            options={HOURS}
            value={h12 - 1}
            onChange={(i) => d && setA({ ...d, hour: ((i + 1) % 12) + (d.hour >= 12 ? 12 : 0) })}
            aria="Hour"
          />
          <Wheel
            options={MINUTES}
            value={d?.minute ?? 0}
            onChange={(i) => d && setA({ ...d, minute: i })}
            aria="Minutes"
          />
          <Wheel
            options={AMPM}
            value={(d?.hour ?? 9) >= 12 ? 1 : 0}
            onChange={(i) => d && setA({ ...d, hour: (d.hour % 12) + i * 12 })}
            aria="AM or PM"
          />
          <div {...stylex.props(styles.wheelHairline)} />
        </div>
        <div {...stylex.props(styles.formRow, styles.formStatic)}>
          <span>Label</span>
          <TextField
            value={d?.label ?? ''}
            onChange={(e) => d && setA({ ...d, label: e.target.value })}
            aria-label="Alarm label"
          />
        </div>
        <button type="button" onClick={() => setPage('repeat')} {...stylex.props(styles.formRow)}>
          <span>Repeat</span>
          <span {...stylex.props(styles.formValue)}>
            {d ? repeatName(d.repeat) : ''} <Sym name="forward" size={13} />
          </span>
        </button>
        <button type="button" onClick={() => setPage('sound')} {...stylex.props(styles.formRow)}>
          <span>Sound</span>
          <span {...stylex.props(styles.formValue)}>
            {d?.sound} <Sym name="forward" size={13} />
          </span>
        </button>
        <div {...stylex.props(styles.formRow, styles.formStatic)}>
          <span>Snooze</span>
          <Toggle
            checked={d?.snooze ?? true}
            onChange={() => d && setA({ ...d, snooze: !d.snooze })}
            aria-label="Snooze"
          />
        </div>
        {remove && (
          <button type="button" onClick={remove} {...stylex.props(styles.formRow, styles.dangerRow)}>
            <span>Delete Alarm</span>
          </button>
        )}
      </>
    )

  const back = page !== 'main' ? () => setPage('main') : onClose
  return (
    <ClockSheet
      open={open}
      title={page === 'repeat' ? 'Repeat' : page === 'sound' ? 'Sound' : fresh ? 'Add Alarm' : 'Edit Alarm'}
      onClose={back}
      back={page !== 'main' ? `\u2039 ${fresh ? 'Add Alarm' : 'Edit Alarm'}` : undefined}
      done={page === 'main' ? 'Save' : undefined}
      onDone={page === 'main' && d ? () => onSave(d) : undefined}
      wide
    >
      {body}
    </ClockSheet>
  )
}

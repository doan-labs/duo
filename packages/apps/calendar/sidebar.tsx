import { Checkbox, IconButton, Sheet, Text } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import type { Cal } from './data.ts'
import { addMonths, monthYear, sameDay, startOfMonth, WEEKDAYS, weeks } from './dates.ts'
import { styles } from './styles.ts'

type Props = {
  calendars: Cal[]
  hidden: Set<string>
  toggle: (id: string) => void
  date: Date
  today: Date
  setDate: (d: Date) => void
  hide: () => void
}

export function Sidebar({ calendars, hidden, toggle, date, today, setDate, hide }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(date))
  const [inbox, setInbox] = useState(false)
  const groups = [...new Set(calendars.map((c) => c.group))]
  // The mini month follows the pane. Paging it on its own is fine; the next move
  // upstairs brings it back, rather than leaving February under a September sheet.
  useEffect(() => setMonth(startOfMonth(date)), [date])
  return (
    <aside {...stylex.props(styles.side)}>
      <div {...stylex.props(styles.sideBar)}>
        <IconButton name="sidebar" variant="tinted" aria-label="Hide sidebar" onClick={hide} />
        <IconButton name="imports" aria-label="Inbox" onClick={() => setInbox(true)} />
      </div>
      <div {...stylex.props(styles.sideList)}>
        {groups.map((g) => (
          <div key={g}>
            <div {...stylex.props(styles.group)}>{g}</div>
            {calendars
              .filter((c) => c.group === g)
              .map((c) => {
                const shown = !hidden.has(c.id)
                return (
                  // The box is the calendar's colour and the only control, the way macOS lists them.
                  <label key={c.id} {...stylex.props(styles.cal)}>
                    <Checkbox tint={c.color} checked={shown} onChange={() => toggle(c.id)} />
                    <span {...stylex.props(styles.calName, !shown && styles.off)}>{c.name}</span>
                  </label>
                )
              })}
          </div>
        ))}
      </div>
      <div {...stylex.props(styles.mini)}>
        <div {...stylex.props(styles.miniHdr)}>
          <IconButton
            name="back"
            size={13}
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
          />
          <span {...stylex.props(styles.miniTitle)}>{monthYear(month)}</span>
          <IconButton name="forward" size={13} aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))} />
        </div>
        <div {...stylex.props(styles.miniGrid)}>
          {WEEKDAYS.map((d) => (
            <span key={d} {...stylex.props(styles.miniWd)}>
              {d[0]}
            </span>
          ))}
          {weeks(month, 6).map((d) => (
            <button
              type="button"
              key={d.getTime()}
              onClick={() => setDate(d)}
              {...stylex.props(
                styles.miniDay,
                d.getMonth() !== month.getMonth() && styles.miniOut,
                sameDay(d, date) && !sameDay(d, today) && styles.miniPicked,
                sameDay(d, today) && styles.miniToday
              )}
            >
              {d.getDate()}
            </button>
          ))}
        </div>
      </div>
      <Sheet open={inbox} onClose={() => setInbox(false)} xstyle={[styles.inbox]}>
        <Text as="div" size="headline">
          Inbox
        </Text>
        <Text as="div" size="subheadline" xstyle={[styles.dim]}>
          No Invitations
        </Text>
      </Sheet>
    </aside>
  )
}

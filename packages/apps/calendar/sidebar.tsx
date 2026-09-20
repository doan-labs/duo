import { IconButton, Sheet, Sym, Text } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import type { Cal } from './data.ts'
import { addMonths, monthYear, sameDay, WEEKDAYS, weeks } from './dates.ts'
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
  const [month, setMonth] = useState(() => addMonths(date, 0))
  const [inbox, setInbox] = useState(false)
  const groups = [...new Set(calendars.map((c) => c.group))]
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
                  <button
                    type="button"
                    key={c.id}
                    role="switch"
                    aria-checked={shown}
                    onClick={() => toggle(c.id)}
                    {...stylex.props(styles.cal)}
                  >
                    <i {...stylex.props(styles.calDot, shown ? styles.tint(c.color) : styles.ring(c.color))} />
                    <span {...stylex.props(styles.calName, !shown && styles.off)}>{c.name}</span>
                    {shown && (
                      <span {...stylex.props(styles.calCheck)}>
                        <Sym name="check" size={13} />
                      </span>
                    )}
                  </button>
                )
              })}
          </div>
        ))}
      </div>
      <div {...stylex.props(styles.mini)}>
        <div {...stylex.props(styles.miniHdr)}>
          <IconButton
            name="back"
            size={11}
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
          />
          {monthYear(month)}
          <IconButton name="forward" size={11} aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))} />
        </div>
        <div {...stylex.props(styles.miniGrid)}>
          {WEEKDAYS.map((d) => (
            <span key={d} {...stylex.props(styles.miniWd)}>
              {d[0]}
            </span>
          ))}
          {weeks(month).map((d) => (
            <button
              type="button"
              key={d.getTime()}
              onClick={() => setDate(d)}
              {...stylex.props(
                styles.miniDay,
                d.getMonth() !== month.getMonth() && styles.dim,
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

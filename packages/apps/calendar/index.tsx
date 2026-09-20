import { IconButton, Segmented, TextField } from '@doan-labs/duo-uikit'
import { dark } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { type Event, VIEWS } from './data.ts'
import { addDays, addMonths, local, monthYear, startOfMonth, time, week, ymd } from './dates.ts'
import { EventSheet } from './event-sheet.tsx'
import { MonthView } from './month-view.tsx'
import { Sidebar } from './sidebar.tsx'
import { useCalendars, useEvents, useSelection } from './store.ts'
import { enter, styles } from './styles.ts'
import { TimeGrid } from './time-grid.tsx'
import { YearView } from './year-view.tsx'

const STEP = { Day: 1, Week: 7 }

export const Calendar = () => {
  const root = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)
  const [query, setQuery] = useState<string | null>(null)
  const [draft, setDraft] = useState<Event | null>(null)
  /** -1 back, 1 forward, 0 a jump: which way the sheet that is arriving should come from. */
  const [dir, setDir] = useState(0)
  const { view, setView, date, setDate, sidebar, setSidebar } = useSelection()
  const { calendars, hidden, toggle } = useCalendars()
  const { events, save, remove } = useEvents()
  const today = new Date()
  const colors = new Map(calendars.map((c) => [c.id, c.color]))
  const visible = events.filter((e) => !hidden.has(e.calendar))
  const isNew = !!draft && !events.some((e) => e.id === draft.id)
  // The box decides, not the display: a split half is as narrow as the cover and drops the sidebar.
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWide(e!.contentRect.width > 600))
    ro.observe(root.current!)
    return () => ro.disconnect()
  }, [])
  const shift = (n: number) => {
    setDir(n)
    setDate(
      view === 'Month'
        ? addMonths(date, n)
        : view === 'Year'
          ? new Date(date.getFullYear() + n, 0, 1)
          : addDays(date, n * STEP[view])
    )
  }
  const compose = (at: Date, allDay = false) =>
    setDraft({
      id: Date.now().toString(36),
      title: '',
      calendar: calendars[0]?.id ?? 'home',
      start: local(at),
      end: local(allDay ? at : new Date(at.getTime() + 3600e3)),
      allDay
    })
  const plus = () => compose(new Date(date.getFullYear(), date.getMonth(), date.getDate(), today.getHours() + 1))
  const jump = (d: Date, v = view) => {
    setDir(0)
    setDate(d)
    setView(v)
  }
  // The page on screen. Month and Year redraw whole; Day and Week keep the scroller
  // they are in, so paging replays the slide without throwing you back to the morning.
  const stamp = view === 'Month' ? monthYear(date) : view === 'Year' ? String(date.getFullYear()) : ymd(date)
  const title =
    view === 'Year'
      ? String(date.getFullYear())
      : view === 'Day'
        ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : monthYear(view === 'Week' ? week(date)[3]! : date)
  const hits =
    query?.trim() &&
    events
      .filter((e) =>
        `${e.title} ${e.location ?? ''} ${e.notes ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())
      )
      .sort((a, b) => a.start.localeCompare(b.start))
  return (
    <div ref={root} {...stylex.props(dark, styles.root)}>
      {wide && sidebar && (
        <Sidebar
          calendars={calendars}
          hidden={hidden}
          toggle={toggle}
          date={date}
          today={today}
          setDate={(d) => jump(d, view === 'Year' ? 'Month' : view)}
          hide={() => setSidebar(false)}
        />
      )}
      <div {...stylex.props(styles.main)}>
        <div {...stylex.props(styles.topBar)}>
          <div {...stylex.props(styles.barSide)}>
            {wide && !sidebar && (
              <IconButton name="sidebar" aria-label="Show sidebar" onClick={() => setSidebar(true)} />
            )}
            <IconButton name="plus" size={14} aria-label="New event" onClick={plus} />
          </div>
          {/* The field takes the bar rather than floating over it: at this width there is
              room for the views or for a search, and never for both at once. */}
          {query === null ? (
            <Segmented options={VIEWS} value={view} onChange={setView} />
          ) : (
            <TextField
              type="search"
              aria-label="Search events"
              placeholder="Search"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQuery(null)}
              xstyle={[styles.search]}
            />
          )}
          <div {...stylex.props(styles.barSide, styles.barEnd)}>
            <IconButton
              name={query === null ? 'search' : 'close'}
              size={query === null ? 17 : 13}
              aria-label={query === null ? 'Search' : 'Close search'}
              onClick={() => setQuery(query === null ? '' : null)}
            />
          </div>
        </div>
        <div {...stylex.props(styles.titleRow, !wide && styles.titleRowSm)}>
          <h1 {...stylex.props(styles.title, !wide && styles.titleSm)}>
            {view === 'Day' || view === 'Year' ? (
              <b>{title}</b>
            ) : (
              <>
                <b>{title.split(' ')[0]}</b> {title.split(' ')[1]}
              </>
            )}
          </h1>
          <div {...stylex.props(styles.nav)}>
            <IconButton name="back" size={11} variant="round" aria-label="Previous" onClick={() => shift(-1)} />
            <button type="button" onClick={() => jump(today)} {...stylex.props(styles.todayBtn)}>
              Today
            </button>
            <IconButton name="forward" size={11} variant="round" aria-label="Next" onClick={() => shift(1)} />
          </div>
        </div>
        {hits ? (
          <div {...stylex.props(styles.results, styles.anim, styles.rise)}>
            {hits.length === 0 && <span {...stylex.props(styles.dim)}>No Results</span>}
            {hits.map((e) => (
              <button
                type="button"
                key={e.id}
                onClick={() => {
                  jump(new Date(e.start), 'Day')
                  setDraft(e)
                }}
                {...stylex.props(styles.result)}
              >
                <i {...stylex.props(styles.dot, styles.tint(colors.get(e.calendar)))} />
                <span {...stylex.props(styles.chipTitle)}>{e.title || 'New Event'}</span>
                <span {...stylex.props(styles.dim)}>
                  {new Date(e.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {!e.allDay && ` ${time(e.start)}`}
                </span>
              </button>
            ))}
          </div>
        ) : view === 'Month' ? (
          <MonthView
            key={stamp}
            month={startOfMonth(date)}
            today={today}
            selected={date}
            wide={wide}
            dir={dir}
            events={visible}
            colors={colors}
            onPick={setDate}
            onNew={(d) => compose(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9))}
            onOpen={(d) => jump(d, 'Day')}
            onEvent={setDraft}
          />
        ) : view === 'Year' ? (
          <YearView
            key={stamp}
            year={date.getFullYear()}
            today={today}
            dir={dir}
            onMonth={(d) => jump(d, 'Month')}
            onDay={(d) => jump(d, 'Day')}
          />
        ) : (
          <TimeGrid
            key={view}
            days={view === 'Week' ? week(date) : [date]}
            today={today}
            events={visible}
            colors={colors}
            dir={dir}
            stamp={stamp}
            onSlot={(d) => compose(d)}
            onEvent={setDraft}
          />
        )}
      </div>
      <EventSheet
        draft={draft}
        isNew={isNew}
        calendars={calendars}
        onSave={(e) => {
          save(e)
          setDraft(null)
        }}
        onDelete={(id) => {
          remove(id)
          setDraft(null)
        }}
        onClose={() => setDraft(null)}
      />
    </div>
  )
}

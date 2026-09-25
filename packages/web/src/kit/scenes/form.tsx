// A New Event form in the kit's fields, and the sheet that pops over it on Add.
import { Button, Row, Section, Select, Sheet, Text, TextField, Title, Toggle } from '@doan-labs/duo-uikit'
import { app, space, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'

export default function Form() {
  const [title, setTitle] = useState('Dinner in Alfama')
  const [allDay, setAllDay] = useState(false)
  const [repeat, setRepeat] = useState('Never')
  const [added, setAdded] = useState(false)
  return (
    <div {...stylex.props(styles.scene)}>
      <Title as="h4">New Event</Title>
      <Section>
        <Row>
          <TextField
            aria-label="Title"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            xstyle={styles.field}
          />
        </Row>
        <Row>
          <TextField aria-label="Location" placeholder="Location" xstyle={styles.field} />
        </Row>
      </Section>
      <Section>
        <Row label="All-day">
          <Toggle
            aria-label="All-day"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            xstyle={styles.trail}
          />
        </Row>
        <Row label="Starts">
          <TextField
            aria-label="Starts"
            type={allDay ? 'date' : 'time'}
            defaultValue={allDay ? undefined : '20:30'}
            key={String(allDay)}
            xstyle={styles.trail}
          />
        </Row>
        <Row label="Repeat">
          <Select aria-label="Repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)} xstyle={styles.trail}>
            {['Never', 'Every Day', 'Every Week', 'Every Month'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Row>
      </Section>
      <Section>
        <Row>
          <TextField multiline aria-label="Notes" placeholder="Notes" xstyle={styles.notes} />
        </Row>
      </Section>
      <div {...stylex.props(styles.actions)}>
        <Button variant="filled" onClick={() => setAdded(true)} disabled={!title.trim()}>
          Add Event
        </Button>
      </div>
      <Sheet open={added} onClose={() => setAdded(false)} aria-label="Event added">
        <div {...stylex.props(styles.sheet)}>
          <Text size="headline">Added to Calendar</Text>
          <Text size="subheadline" color="secondary">
            {title.trim()} · {allDay ? 'All day' : '20:30'}
            {repeat === 'Never' ? '' : ` · ${repeat}`}
          </Text>
          <Button variant="filled" onClick={() => setAdded(false)} xstyle={styles.done}>
            Done
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

const styles = stylex.create({
  scene: { flexGrow: 1, display: 'flex', flexDirection: 'column', paddingTop: space.xs, color: app.fg },
  field: { flexGrow: 1, height: 30, backgroundColor: 'transparent', paddingInline: 0, fontSize: typeScale.body },
  notes: {
    flexGrow: 1,
    minHeight: 72,
    backgroundColor: 'transparent',
    paddingInline: 0,
    fontSize: typeScale.body,
    resize: 'none'
  },
  trail: { marginLeft: 'auto' },
  actions: { display: 'flex', justifyContent: 'center' },
  sheet: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.xs,
    textAlign: 'center',
    paddingTop: space.xxl,
    paddingBottom: space.xl,
    paddingLeft: space.xl,
    paddingRight: space.xl
  },
  done: { marginTop: space.md, alignSelf: 'stretch' }
})

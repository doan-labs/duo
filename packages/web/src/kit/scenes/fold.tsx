// The kit's whole argument in one tile: a Notes screen whose frame breathes
// between the cover's 387 points and the inner display's 790, and a layout that
// follows because `useWide()` measures the frame, not the window. The note that
// is open stays open across the change, the way the fold hands a running app over.
import { IconButton, LargeTitle, Push, Row, Section, Sym, Text, TextField, Title, useWide } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { app, easing, leading, radius, shadow, space, typeScale, weight } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Segmented } from '../../segmented'
import { color, font } from '../../tokens.stylex'

const NOTES = [
  {
    title: 'Lisbon in October',
    when: 'Today',
    body: [
      'Tram 28 before nine, while it still has seats. Pastéis de Belém at the counter, not the tables.',
      'Sunset from the Miradouro da Senhora do Monte, then dinner in Alfama.'
    ]
  },
  {
    title: 'Packing list',
    when: 'Yesterday',
    body: [
      'Passport, the travel adapter, a light jacket for the evenings by the river.',
      'Charge everything the night before.'
    ]
  },
  {
    title: 'Book club',
    when: 'Monday',
    body: ['Next month: The Remains of the Day. Bring a question about the last chapter.']
  },
  {
    title: 'Ideas',
    when: 'Sunday',
    body: ['A widget that shows the tide at the nearest beach.', 'Fold the phone to switch from map to list.']
  }
]

type Width = 'cover' | 'inner'

export default function Fold() {
  const still = useReducedMotion() ?? false
  const [width, setWidth] = useState<Width>('cover')
  // The tile plays itself until the visitor picks a width or reaches into it.
  const [held, setHeld] = useState(false)
  const [hover, setHover] = useState(false)
  // A stage too narrow for 790 points shows the cover only: a control reading
  // "Inner" over a frame that cannot grow would be the one untrue thing here.
  const [stage, roomy] = useWide(790 + 2 * 16)
  const inner = roomy && width === 'inner'
  useEffect(() => {
    if (held || hover || still || !roomy) return
    const t = setInterval(() => setWidth((w) => (w === 'cover' ? 'inner' : 'cover')), 3600)
    return () => clearInterval(t)
  }, [held, hover, still, roomy])
  return (
    <div
      ref={stage}
      {...stylex.props(styles.stage)}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {roomy ? (
        <Segmented
          id="kit-fold"
          label="Display width"
          size="sm"
          value={width}
          onChange={(w) => {
            setHeld(true)
            setWidth(w)
          }}
          options={[
            { value: 'cover' as const, label: 'Cover · 387 pt' },
            { value: 'inner' as const, label: 'Inner · 790 pt' }
          ]}
        />
      ) : (
        <p {...stylex.props(styles.hint)}>Cover · 387 pt. Open the page wider to unfold it.</p>
      )}
      <div {...stylex.props(styles.frame, inner && styles.frameInner)}>
        <Notes />
      </div>
    </div>
  )
}

function Notes() {
  const [ref, wide] = useWide()
  const [open, setOpen] = useState(0)
  // Only the cover pushes: unfolded, the list and the note sit side by side.
  const [pushed, setPushed] = useState(false)
  const note = NOTES[open]!
  const list = (
    <div {...stylex.props(styles.column)}>
      <Title as="h4">
        Notes
        <Title as="span" variant="accessory">
          <IconButton name="compose" aria-label="New note" size={18} xstyle={styles.link} />
        </Title>
      </Title>
      <div {...stylex.props(styles.search)}>
        <TextField type="search" placeholder="Search" aria-label="Search notes" xstyle={styles.field} />
      </div>
      <Section>
        {NOTES.map((n, i) => (
          <Row
            key={n.title}
            as="button"
            label={n.title}
            subtitle={<span {...stylex.props(styles.clip)}>{n.body[0]}</span>}
            detail={wide ? undefined : n.when}
            chevron={!wide}
            aria-current={wide && i === open ? 'true' : undefined}
            onClick={() => {
              setOpen(i)
              if (!wide) setPushed(true)
            }}
            xstyle={[styles.row, wide && i === open && styles.picked]}
          />
        ))}
      </Section>
      <p {...stylex.props(styles.readout)}>
        useWide() <span {...stylex.props(styles.readoutValue)}>{wide ? 'true' : 'false'}</span>
      </p>
    </div>
  )
  return (
    <div ref={ref} {...stylex.props(styles.app)}>
      {wide ? (
        <div {...stylex.props(styles.split)}>
          <div {...stylex.props(styles.side)}>{list}</div>
          <Detail key={open} note={note} />
        </div>
      ) : (
        <Push open={pushed} sheet={<Detail note={note} back={() => setPushed(false)} />}>
          {list}
        </Push>
      )}
    </div>
  )
}

function Detail({ note, back }: { note: (typeof NOTES)[number]; back?: () => void }) {
  return (
    <article {...stylex.props(styles.detail, shared.swap)}>
      {back && (
        <button type="button" onClick={back} {...stylex.props(styles.back)}>
          <Sym name="back" size={20} />
          Notes
        </button>
      )}
      <Text size="footnote" color="secondary">
        {note.when}
      </Text>
      <LargeTitle as="h5" xstyle={styles.noteTitle}>
        {note.title}
      </LargeTitle>
      {note.body.map((p) => (
        <p key={p} {...stylex.props(styles.p)}>
          {p}
        </p>
      ))}
    </article>
  )
}

const styles = stylex.create({
  stage: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.lg,
    paddingTop: space.md,
    paddingLeft: space.lg,
    paddingRight: space.lg,
    fontFamily: font.sans
  },
  hint: {
    margin: 0,
    textAlign: 'center',
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.04em',
    color: color.text3
  },
  // A display's crop, not a card: it runs off the bottom of the tile.
  frame: {
    flexGrow: 1,
    width: '387px',
    maxWidth: '100%',
    marginBottom: '-1px',
    display: 'flex',
    overflow: 'hidden',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    backgroundColor: app.bg,
    boxShadow: `${shadow.float}, 0 0 0 1px ${color.border}`,
    transitionProperty: 'width',
    transitionDuration: '.7s',
    transitionTimingFunction: easing.push
  },
  frameInner: { width: '790px' },
  app: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    fontFamily: 'inherit',
    fontSize: typeScale.body,
    lineHeight: leading.body
  },
  // `minWidth: 0` all the way down: a clipped subtitle's min-content is the
  // whole unwrapped line, and without it the list pushes out of its pane.
  column: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, minHeight: 0, paddingTop: space.sm },
  split: { display: 'flex', flexGrow: 1, minHeight: 0 },
  side: {
    width: '320px',
    flexShrink: 0,
    display: 'flex',
    minWidth: 0,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: app.separator
  },
  link: { color: app.link },
  search: { paddingLeft: space.lg, paddingRight: space.lg, paddingBottom: space.xs },
  field: { width: '100%', height: '32px', borderRadius: radius.md, fontSize: typeScale.body },
  row: { width: '100%', textAlign: 'left', minWidth: 0 },
  clip: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  picked: { backgroundColor: app.fill3 },
  readout: {
    marginTop: 'auto',
    marginBottom: space.lg,
    marginLeft: space.lg,
    fontFamily: font.mono,
    fontSize: typeScale.caption1,
    color: app.label2
  },
  readoutValue: { color: app.link, fontWeight: weight.semibold },
  detail: {
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: app.surface,
    paddingTop: space.xl,
    paddingLeft: space.xxl,
    paddingRight: space.xxl,
    overflow: 'hidden'
  },
  back: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: -6,
    padding: 0,
    marginBottom: space.md,
    color: app.link,
    fontSize: typeScale.body
  },
  noteTitle: { paddingLeft: 0, paddingRight: 0, paddingTop: space.xs },
  p: {
    marginTop: 0,
    marginBottom: space.md,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    color: app.fg
  }
})

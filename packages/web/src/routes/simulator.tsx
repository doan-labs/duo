import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Section } from '../layout'
import { Code, PageTop, SectionTop, Table, Td } from '../page-parts'
import { Simulator } from '../simulator'
import { Badge } from '../status'
import { color, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export const Route = createFileRoute('/simulator')({
  head: () => ({ meta: [{ title: 'Simulator · Duo' }] }),
  component: Page
})

function Page() {
  return (
    <>
      <section {...stylex.props(styles.top)}>
        <div {...stylex.props(styles.head)}>
          <PageTop
            eyebrow="Simulator · Works today"
            title="Simulator"
            lead="The same page the desktop app wraps. Drag to orbit, use the slider on the right to fold, press the side and volume buttons on the frame, open an app from the home screen."
          />
        </div>
        <Stage />
      </section>
      <Section alt narrow>
        <SectionTop eyebrow="Query parameters" title="Drive it from the URL" />
        <p {...stylex.props(styles.p)}>
          <Badge status="works" /> The shell reads these query parameters today. They are how the repository's own
          checks put the device in a known pose.
        </p>
        <Table>
          <tbody>
            <Row k="?deg=0" v="Hinge angle in degrees. 0 is closed and shows the cover; 180 is flat open." />
            <Row k="?app=Notes" v="Opens a baked app by name at load, and skips the lock screen." />
            <Row k="?yaw=-1.2" v="Turns the view, in radians, to show the right edge and its buttons." />
            <Row k="?debug" v="Exposes __duo on the window for the headless checks in docs/debug.md." />
          </tbody>
        </Table>
        <p {...stylex.props(styles.p)}>
          <Badge status="unfinished" /> <Code>?dev=http://localhost:5173</Code> will put your own app on the home screen
          once stage 2 lands. The shell does not read it yet.
        </p>
      </Section>
    </>
  )
}

const POSES = [
  { deg: 0, label: 'Closed' },
  { deg: 110, label: 'Half open' },
  { deg: 180, label: 'Open' }
]

/** The device on the page, with three poses that reach it over the bridge rather than a reload. */
function Stage() {
  const [deg, setDeg] = useState(180)
  return (
    <>
      <Simulator deg={deg} eager tall />
      <div {...stylex.props(styles.controls)}>
        <fieldset aria-label="Fold" {...stylex.props(styles.seg)}>
          {POSES.map((p) => (
            <button
              key={p.deg}
              type="button"
              aria-pressed={deg === p.deg}
              onClick={() => setDeg(p.deg)}
              {...stylex.props(styles.segButton, deg === p.deg && styles.segOn)}
            >
              {p.label}
            </button>
          ))}
        </fieldset>
        <a href={`/device/?deg=${deg}`} target="_blank" rel="noreferrer" {...stylex.props(styles.link)}>
          Open full size
        </a>
      </div>
    </>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <Td nowrap>
        <Code>{k}</Code>
      </Td>
      <Td>{v}</Td>
    </tr>
  )
}

const styles = stylex.create({
  top: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingTop: { default: '56px', [SMALL]: '40px' },
    paddingBottom: { default: '80px', [SMALL]: '56px' },
    paddingLeft: '22px',
    paddingRight: '22px',
    fontFamily: font.sans
  },
  head: { maxWidth: '760px', marginBottom: '8px' },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    marginTop: '20px'
  },
  seg: {
    display: 'inline-flex',
    gap: '2px',
    backgroundColor: color.well,
    borderRadius: radius.pill,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    margin: 0,
    minWidth: 0,
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '3px',
    paddingRight: '3px'
  },
  segButton: {
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    lineHeight: 1,
    paddingTop: '9px',
    paddingBottom: '9px',
    paddingLeft: '16px',
    paddingRight: '16px',
    borderRadius: radius.pill,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: { default: color.text3, ':hover': color.text },
    cursor: 'pointer',
    transitionProperty: 'background-color, color',
    transitionDuration: '0.2s'
  },
  segOn: { backgroundColor: color.surface, color: color.text, boxShadow: color.shadow },
  link: {
    fontSize: '14px',
    color: { default: color.text2, ':hover': color.text },
    textDecorationLine: 'underline',
    textUnderlineOffset: '3px'
  },
  p: {
    fontFamily: font.sans,
    fontSize: '17px',
    lineHeight: 1.6,
    color: color.text,
    marginTop: 0,
    marginBottom: '20px'
  }
})

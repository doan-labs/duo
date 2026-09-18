// The first apps, as an editorial shelf: a large plate each, drawn from the
// posture the app is designed around, and one line of caption. Reused by /apps.
import * as stylex from '@stylexjs/stylex'
import { color, font } from '../tokens.stylex'
import { Block, Cap, Headline, Lede, Reveal } from './parts'

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

type Layout = 'half' | 'split' | 'cover' | 'history' | 'pad' | 'nav'
export const APPS: { name: string; text: string; layout: Layout; tint: string }[] = [
  {
    name: 'FoldCam',
    text: 'A camera built around the half-fold: viewfinder up top, controls on the desk.',
    layout: 'half',
    tint: '#e8e2d6'
  },
  {
    name: 'Notes',
    text: 'Writing on one half, the controls move to the other when the phone folds.',
    layout: 'split',
    tint: '#e3e6ec'
  },
  {
    name: 'Calculator',
    text: 'The second pane keeps the history. Close the phone and it is a calculator again.',
    layout: 'history',
    tint: '#dfe8e2'
  },
  {
    name: 'Music',
    text: 'Playback moves to the cover when you close it. Nothing stops.',
    layout: 'cover',
    tint: '#ece0e0'
  },
  { name: 'Game', text: 'One half is the screen, the other is the controller.', layout: 'pad', tint: '#e4e0ec' },
  {
    name: 'Browser',
    text: 'Navigation goes wherever your thumbs are for the posture you hold.',
    layout: 'nav',
    tint: '#e8e6dc'
  }
]

export function Apps({ all = false }: { all?: boolean }) {
  return (
    <Block labelledBy="apps-title">
      <Cap>07 · First apps</Cap>
      <Headline id="apps-title" lines={['Built for both displays', 'and the fold between them.']} />
      <Lede>
        Each of these treats the fold as the design brief, not a constraint. They are the start of an ecosystem, and the
        first pull requests in the repository.
      </Lede>
      <Shelf all={all} />
    </Block>
  )
}

export function Shelf({ all = false }: { all?: boolean }) {
  return (
    <ul {...stylex.props(styles.shelf)}>
      {APPS.map((a, i) => (
        <li key={a.name} {...stylex.props(styles.item, !all && i > 3 && styles.homeOnly)}>
          <Reveal delay={(i % 2) * 0.08}>
            <Plate layout={a.layout} tint={a.tint} />
            <h3 {...stylex.props(styles.name)}>{a.name}</h3>
            <p {...stylex.props(styles.text)}>{a.text}</p>
          </Reveal>
        </li>
      ))}
    </ul>
  )
}

/** The artwork: a tinted plate with the two halves of the device in the posture the app is for. */
function Plate({ layout, tint }: { layout: Layout; tint: string }) {
  return (
    <div {...stylex.props(styles.plate, styles.tinted(tint))} aria-hidden="true">
      {layout === 'half' && (
        <div {...stylex.props(styles.stack)}>
          <div {...stylex.props(styles.pane, styles.paneLit)} />
          <div {...stylex.props(styles.pane, styles.paneDim, styles.paneShort)} />
        </div>
      )}
      {layout === 'split' && (
        <div {...stylex.props(styles.side)}>
          <div {...stylex.props(styles.pane, styles.paneLit)} />
          <div {...stylex.props(styles.pane, styles.paneDim)} />
        </div>
      )}
      {layout === 'history' && (
        <div {...stylex.props(styles.side)}>
          <div {...stylex.props(styles.pane, styles.paneDim)} />
          <div {...stylex.props(styles.pane, styles.paneLit)} />
        </div>
      )}
      {layout === 'cover' && <div {...stylex.props(styles.pane, styles.paneLit, styles.paneCover)} />}
      {layout === 'pad' && (
        <div {...stylex.props(styles.stack)}>
          <div {...stylex.props(styles.pane, styles.paneLit)} />
          <div {...stylex.props(styles.pane, styles.paneDim, styles.paneShort, styles.paneRound)} />
        </div>
      )}
      {layout === 'nav' && (
        <div {...stylex.props(styles.side)}>
          <div {...stylex.props(styles.pane, styles.paneLit)} />
          <div {...stylex.props(styles.pane, styles.paneLit)} />
        </div>
      )}
    </div>
  )
}

const styles = stylex.create({
  shelf: {
    listStyleType: 'none',
    margin: 0,
    marginTop: '72px',
    padding: 0,
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [SMALL]: 'minmax(0, 1fr)' },
    columnGap: '40px',
    rowGap: { default: '72px', [SMALL]: '48px' }
  },
  item: { display: 'block' },
  homeOnly: { display: { default: 'block', [MID]: 'none' } },
  plate: {
    aspectRatio: '4 / 3',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10%',
    overflow: 'hidden'
  },
  tinted: (tint: string) => ({ backgroundColor: tint }),
  side: { display: 'flex', gap: '3%', width: '70%', height: '78%' },
  stack: { display: 'flex', flexDirection: 'column', gap: '3%', width: '38%', height: '86%' },
  pane: { flexGrow: 1, flexBasis: 0, borderRadius: '12%/9%', backgroundColor: '#141413' },
  paneLit: { backgroundColor: '#141413' },
  paneDim: { backgroundColor: 'rgba(20,20,19,0.35)' },
  paneShort: { flexGrow: 0.7 },
  paneRound: { borderRadius: '18%/14%' },
  paneCover: { width: '34%', height: '86%', flexGrow: 0 },
  name: {
    marginTop: '24px',
    marginBottom: 0,
    fontFamily: font.display,
    fontSize: '24px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: color.text
  },
  text: { marginTop: '8px', marginBottom: 0, maxWidth: '40ch', fontSize: '17px', lineHeight: 1.5, color: color.text2 }
})

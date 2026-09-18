// The smallest useful SDK: four primitives as four rows.
import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { color, font } from '../tokens.stylex'
import { Block, Cap, Headline, Lede, Reveal } from './parts'

const MID = '@media (max-width: 1068px)'

const API = [
  { area: 'Display', sig: 'useDisplay()', text: 'Which display, its size, the hinge angle and focus, live.' },
  { area: 'Storage', sig: 'useKV()', text: 'Durable, revisioned storage, private to each app.' },
  { area: 'Views', sig: 'os.commands', text: 'Two views of one app, one owner; the rest send it commands.' },
  { area: 'Links', sig: 'os.open()', text: 'Hand off to another app on the device, with an argument.' }
]

export function Sdk() {
  return (
    <Block labelledBy="sdk-title">
      <Cap>05 · SDK</Cap>
      <Headline id="sdk-title" lines={['Four primitives.', 'That is the whole surface.']} />
      <Lede>
        Enough to build a real app, small enough to read in a minute. The rest is React and the platform you already
        know.{' '}
        <Link to="/docs/sdk" {...stylex.props(styles.link)}>
          Read the SDK page
        </Link>{' '}
        for the full client.
      </Lede>
      <dl {...stylex.props(styles.rows)}>
        {API.map((a, i) => (
          <Reveal key={a.sig} delay={i * 0.05}>
            <div {...stylex.props(styles.row)}>
              <dt {...stylex.props(styles.area)}>{a.area}</dt>
              <dd {...stylex.props(styles.sig)}>{a.sig}</dd>
              <dd {...stylex.props(styles.text)}>{a.text}</dd>
            </div>
          </Reveal>
        ))}
      </dl>
    </Block>
  )
}

const styles = stylex.create({
  link: { color: color.text, textDecorationLine: 'underline', textUnderlineOffset: '3px' },
  rows: { margin: 0, marginTop: '72px', borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: color.border },
  row: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 2fr) minmax(0, 4fr) minmax(0, 6fr)', [MID]: 'minmax(0, 1fr)' },
    alignItems: 'baseline',
    gap: { default: '32px', [MID]: '8px' },
    paddingTop: '32px',
    paddingBottom: '32px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border
  },
  area: {
    fontFamily: font.mono,
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: color.text3
  },
  sig: {
    margin: 0,
    fontFamily: font.mono,
    fontSize: { default: '30px', [MID]: '24px' },
    fontWeight: 500,
    letterSpacing: '-0.02em',
    color: color.text
  },
  text: { margin: 0, fontSize: '18px', lineHeight: 1.5, color: color.text2 }
})

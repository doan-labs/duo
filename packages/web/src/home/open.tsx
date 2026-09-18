// Open source, said plainly: where the apps live, how one gets in, and no gate.
import * as stylex from '@stylexjs/stylex'
import { REPO } from '../site'
import { color, font } from '../tokens.stylex'
import { Block, Cap, Columns, Headline, Lede, Reveal } from './parts'

const FACTS = [
  'Apps live in the repository.',
  'Every app is MIT licensed.',
  'Contributions are pull requests.',
  'No developer account. No payments. No gatekeeping.'
]

export function Open() {
  return (
    <Block cinema labelledBy="open-title">
      <Columns align="start">
        <div>
          <Cap>07 · Open</Cap>
          <Headline id="open-title" lines={['The platform is open.', 'So are the apps.']} />
          <Lede>
            Someone in Berlin can build a calculator, open a pull request, and after review it can appear in the Duo
            Store for everyone.
          </Lede>
        </div>
        <Reveal>
          <ul {...stylex.props(styles.facts)}>
            {FACTS.map((f) => (
              <li key={f} {...stylex.props(styles.fact)}>
                {f}
              </li>
            ))}
          </ul>
          <p {...stylex.props(styles.flow)}>
            fork <span {...stylex.props(styles.arrow)}>→</span> pull request{' '}
            <span {...stylex.props(styles.arrow)}>→</span> review <span {...stylex.props(styles.arrow)}>→</span> Duo
            Store
          </p>
          <a href={REPO} {...stylex.props(styles.link)}>
            Read the source on GitHub
          </a>
        </Reveal>
      </Columns>
    </Block>
  )
}

const styles = stylex.create({
  facts: { listStyleType: 'none', margin: 0, padding: 0 },
  fact: {
    paddingTop: '22px',
    paddingBottom: '22px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    fontFamily: font.display,
    fontSize: '26px',
    fontWeight: 500,
    letterSpacing: '-0.02em',
    lineHeight: 1.25,
    color: color.text
  },
  flow: {
    marginTop: '32px',
    marginBottom: 0,
    fontFamily: font.mono,
    fontSize: '13px',
    letterSpacing: '0.04em',
    color: color.text2
  },
  arrow: { color: color.text3, paddingLeft: '6px', paddingRight: '6px' },
  link: {
    display: 'inline-block',
    marginTop: '32px',
    fontSize: '16px',
    color: color.text,
    textDecorationLine: 'underline',
    textUnderlineOffset: '4px'
  }
})

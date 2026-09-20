// Open source, said plainly: where the apps live, how one gets in, and no gate.
import * as stylex from '@stylexjs/stylex'
import { REPO } from '../site'
import { color, font } from '../tokens.stylex'
import { Block, Cap, Columns, Headline, Lede, Rise, Stagger, TextLink } from './parts'

const FACTS = [
  'Apps live in the repository.',
  'Every app is MIT licensed.',
  'Contributions are pull requests.',
  'No developer account. No payments. No gatekeeping.'
]

const STEPS = ['fork', 'pull request', 'review', 'Duo Store']

export function Open() {
  return (
    <Block cinema labelledBy="open-title">
      <Columns align="start">
        <Stagger gap={0.09} amount={0.4}>
          <Rise>
            <Cap>07 · Open</Cap>
          </Rise>
          <Rise>
            <Headline id="open-title" lines={['The platform is open.', 'So are the apps.']} />
          </Rise>
          <Rise>
            <Lede>
              Someone in Berlin can build a calculator, open a pull request, and after review it can appear in the Duo
              Store for everyone.
            </Lede>
          </Rise>
        </Stagger>
        <div>
          {/* Each fact lands on its own rule, one after the next, so the column
              reads as four statements rather than a block that appeared. */}
          <Stagger as="ul" gap={0.1} amount={0.2} styles={styles.facts}>
            {FACTS.map((f) => (
              <Rise key={f} as="li" styles={styles.fact}>
                {f}
              </Rise>
            ))}
          </Stagger>
          <Stagger gap={0.06} delay={0.15} amount={0.5}>
            {/* The pipeline is one step per beat: the arrows trace the route as it is read. */}
            <p {...stylex.props(styles.flow)}>
              {STEPS.map((s, i) => (
                <Rise key={s} as="span" move="in" styles={styles.stepWrap}>
                  {i > 0 && <span {...stylex.props(styles.arrow)}>→</span>}
                  {s}
                </Rise>
              ))}
            </p>
            <Rise>
              <p {...stylex.props(styles.linkRow)}>
                <TextLink href={REPO} lead>
                  Read the source on GitHub
                </TextLink>
              </p>
            </Rise>
          </Stagger>
        </div>
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
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: '32px',
    marginBottom: 0,
    fontFamily: font.mono,
    fontSize: '13px',
    letterSpacing: '0.04em',
    color: color.text2
  },
  stepWrap: { display: 'inline-flex', alignItems: 'center' },
  arrow: { color: color.text3, paddingLeft: '8px', paddingRight: '8px' },
  linkRow: { margin: 0, marginTop: '32px' }
})

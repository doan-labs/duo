// The end: one line, three buttons, what Duo is in a sentence, and who makes it.
import * as stylex from '@stylexjs/stylex'
import { DoanMark } from '../footer'
import { Button } from '../layout'
import { DOAN, REPO } from '../site'
import { color, ease, font, radius } from '../tokens.stylex'
import { Block, Headline, Rise, Stagger } from './parts'

const ACTIONS = [
  { to: '/simulator', label: 'Try Duo' },
  { to: '/docs', label: 'Read the docs', outline: true },
  { href: REPO, label: 'View on GitHub', outline: true }
]

export function Cta() {
  return (
    <Block labelledBy="cta-title">
      <Stagger gap={0.08} amount={0.4} styles={styles.centre}>
        <Rise>
          <Headline id="cta-title" lines={['Build something strange', 'for a phone that folds.']} />
        </Rise>
        {/* A plain row, not a second `Stagger`: motion carries the variant down
            through the DOM, so the three buttons are beats of the same sequence
            and land one at a time, left to right. */}
        <div {...stylex.props(styles.actions)}>
          {ACTIONS.map((a) => (
            <Rise key={a.label} move="in" styles={styles.action}>
              <Button to={a.to} href={a.href} outline={a.outline}>
                {a.label}
              </Button>
            </Rise>
          ))}
        </div>
        <Rise>
          <p {...stylex.props(styles.line)}>Duo is an open experiment in what foldable software could become.</p>
        </Rise>
        <Rise>
          <a href={DOAN} {...stylex.props(styles.maker)}>
            <DoanMark size={22} />A product by Doan Labs
          </a>
        </Rise>
      </Stagger>
    </Block>
  )
}

const styles = stylex.create({
  centre: { textAlign: 'center', maxWidth: '880px', marginLeft: 'auto', marginRight: 'auto' },
  actions: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '40px' },
  action: { display: 'inline-flex' },
  line: { marginTop: '40px', marginBottom: 0, fontSize: '16px', color: color.text3 },
  maker: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '56px',
    fontFamily: font.mono,
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    color: { default: color.text2, ':hover': color.text, ':focus-visible': color.text },
    borderRadius: radius.sm,
    outlineWidth: '2px',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.ring,
    outlineOffset: '4px',
    transitionProperty: 'color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out
  }
})

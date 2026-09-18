// The end: one line, three buttons, and what Duo is in a sentence.
import * as stylex from '@stylexjs/stylex'
import { Button } from '../layout'
import { REPO } from '../site'
import { color } from '../tokens.stylex'
import { Block, Headline, Reveal } from './parts'

export function Cta() {
  return (
    <Block labelledBy="cta-title">
      <Reveal>
        <div {...stylex.props(styles.centre)}>
          <Headline id="cta-title" lines={['Build something strange', 'for a phone that folds.']} />
          <div {...stylex.props(styles.actions)}>
            <Button to="/simulator">Try Duo</Button>
            <Button to="/docs" outline>
              Read the docs
            </Button>
            <Button href={REPO} outline>
              View on GitHub
            </Button>
          </div>
          <p {...stylex.props(styles.line)}>Duo is an open experiment in what foldable software could become.</p>
        </div>
      </Reveal>
    </Block>
  )
}

const styles = stylex.create({
  centre: { textAlign: 'center', maxWidth: '880px', marginLeft: 'auto', marginRight: 'auto' },
  actions: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '40px' },
  line: { marginTop: '40px', marginBottom: 0, fontSize: '16px', color: color.text3 }
})

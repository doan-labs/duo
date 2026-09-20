import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Browser } from '../home/apps'
import { Block, Cap, Headline, Lede } from '../home/parts'
import { Button } from '../layout'
import { color, ease } from '../tokens.stylex'

export const Route = createFileRoute('/apps')({
  head: () => ({ meta: [{ title: 'Apps · Duo' }] }),
  component: Page
})

function Page() {
  return (
    <Block labelledBy="apps-title">
      <Cap>Apps</Cap>
      <Headline as="h1" id="apps-title" lines={['Built for both displays', 'and the fold between them.']} />
      <Lede>
        Official apps ship in the simulator and publish to the Duo catalog; community apps arrive as pull requests,
        reviewed and published the same way. Everything is MIT licensed and installs through the Store.{' '}
        <Link to="/publish" {...stylex.props(styles.link)}>
          How to add yours.
        </Link>
      </Lede>
      <div {...stylex.props(styles.action)}>
        <Button to="/publish">Submit your app</Button>
      </div>
      <Browser />
    </Block>
  )
}

const styles = stylex.create({
  link: {
    color: { default: color.text, ':hover': color.accent },
    textDecorationLine: 'underline',
    textUnderlineOffset: '3px',
    borderRadius: '4px',
    transitionProperty: 'color, outline-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '3px'
  },
  action: { marginTop: '28px' }
})

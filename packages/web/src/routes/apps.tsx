import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Shelf } from '../home/apps'
import { Block, Cap, Headline, Lede } from '../home/parts'
import { color } from '../tokens.stylex'

export const Route = createFileRoute('/apps')({
  head: () => ({ meta: [{ title: 'Apps · Duo' }] }),
  component: Page
})

function Page() {
  return (
    <Block labelledBy="apps-title">
      <Cap>Apps</Cap>
      <Headline as="h1" id="apps-title" lines={['Built for a phone', 'that doesn’t exist yet.']} />
      <Lede>
        The first apps designed around the fold. Each one is a pull request in the repository, MIT licensed, and
        installs from the Duo Store once the stage 2 runtime lands.{' '}
        <Link to="/publish" {...stylex.props(styles.link)}>
          How to add yours.
        </Link>
      </Lede>
      <Shelf all />
    </Block>
  )
}

const styles = stylex.create({
  link: { color: color.text, textDecorationLine: 'underline', textUnderlineOffset: '3px' }
})

import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Browser } from '../home/apps'
import { Block, Cap, Headline, Lede } from '../home/parts'
import { Button } from '../layout'

export const Route = createFileRoute('/apps')({
  head: () => ({ meta: [{ title: 'Apps · Duo' }] }),
  component: Page
})

function Page() {
  return (
    <>
      <Block labelledBy="apps-title">
        <Cap>Apps</Cap>
        <Headline as="h1" id="apps-title" lines={['Apps that use', 'both displays.']} />
        <Lede>Official and community apps. All of them are open source and install through the Store.</Lede>
        <div {...stylex.props(styles.action)}>
          <Button to="/publish">Submit your app</Button>
        </div>
        <Browser />
      </Block>
      {/* /apps/<slug> sheets an app over the catalog without unmounting it. */}
      <Outlet />
    </>
  )
}

const styles = stylex.create({
  action: { marginTop: '28px' }
})

import * as stylex from '@stylexjs/stylex'
import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useEffect } from 'react'
import { Footer } from '../footer'
import { Button, Eyebrow } from '../layout'
import { CURVE } from '../motion'
import { Nav } from '../nav'
import { SafariScrollBridge } from '../safari-scroll-bridge'
import { SmoothScroll } from '../smooth-scroll'
import { BOOT } from '../theme'
import { color, font } from '../tokens.stylex'
// The reset first: a layer declared later wins, and the reset must lose to every StyleX layer.
import 'lenis/dist/lenis.css'
import '../reset.css'
import 'virtual:stylex.css'

const OG_IMAGE = 'https://duo.doan-labs.com/og/duo-og-03.png'

export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { rel: 'apple-touch-icon', href: '/icon-180.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Inter+Tight:wght@500..800&family=Geist+Mono:wght@400;500&display=swap'
      }
    ],
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Duo - Folding iPhone simulator for app builders' },
      {
        name: 'description',
        content:
          'A working simulator of Apple’s iPhone Duo: hold it, fold it, install apps, and build your own with the SDK.'
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Duo' },
      { property: 'og:title', content: 'Duo - Folding iPhone simulator for app builders' },
      {
        property: 'og:description',
        content: 'Hold it. Fold it. Build apps for a working browser simulator of Apple’s iPhone Duo.'
      },
      { property: 'og:image', content: OG_IMAGE },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Duo - Folding iPhone simulator for app builders' },
      {
        name: 'twitter:description',
        content: 'Hold it. Fold it. Build apps for a working browser simulator of Apple’s iPhone Duo.'
      },
      { name: 'twitter:image', content: OG_IMAGE }
    ],
    // The saved theme, painted before anything else renders. It goes through
    // the router's head rather than a `<script>` written into `<Document>`:
    // React refuses to create a script element on the client and logs about it
    // on every load, while the router's own head script renders on the server,
    // hydrates against that markup, and then steps aside.
    scripts: [{ children: BOOT }]
  }),
  component: Root,
  notFoundComponent: NotFound
})

function Root() {
  // The workspace is its own full-height layout: no page scroll, no footer.
  const workspace = useRouterState({
    select: (state) => state.location.pathname.replace(/\/+$/, '') === '/simulator'
  })
  return (
    <Document>
      <SafariScrollBridge />
      {workspace ? (
        <>
          <Nav />
          <Page>
            <Outlet />
          </Page>
        </>
      ) : (
        <SmoothScroll>
          <Nav />
          <Page>
            <Outlet />
          </Page>
          <Footer />
        </SmoothScroll>
      )}
    </Document>
  )
}

// Module scope, not a ref: it means "the client has painted once", and it has
// to survive the remount that moving in or out of the workspace layout causes.
// The server never runs the effect, so server renders never fade.
let painted = false

/**
 * Route changes fade instead of cutting. Two deliberate limits:
 *
 * Opacity only. A transform on `<main>` would make it the containing block for
 * every fixed child and would shift the sticky scroll scenes and the
 * `getBoundingClientRect` reads that drive them. A fade touches none of that.
 *
 * Keyed on the first path segment, not the whole path. Sections such as `/docs`
 * own a `layoutId` indicator in their sidebar; re-keying on every sub-page
 * would remount it and the indicator would jump instead of slide. Moving
 * inside a section swaps the body under a mounted sidebar; only leaving the
 * section fades. The nav's own indicator sits outside `<main>`, untouched.
 *
 * There is no exit half, so two pages can never be on screen at once and a
 * fast run of clicks cannot queue up a backlog: each arrival is a fresh
 * element starting from zero, and the one before it is already gone.
 */
function Page({ children }: { children: ReactNode }) {
  const section = useRouterState({ select: (state) => state.location.pathname.split('/')[1] ?? '' })
  const still = useReducedMotion()
  useEffect(() => {
    painted = true
  }, [])
  const fade = painted && !still
  return (
    <motion.main
      key={section}
      initial={fade ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: CURVE }}
    >
      {children}
    </motion.main>
  )
}

function Document({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Carries the theme boot script too; see the route's `head`. */}
        <HeadContent />
      </head>
      <body {...stylex.props(styles.body)}>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div {...stylex.props(styles.notFound)}>
      <Eyebrow>Error 404</Eyebrow>
      <h1 {...stylex.props(styles.notFoundTitle)}>This page does not exist.</h1>
      <p {...stylex.props(styles.notFoundText)}>
        The link is wrong, or the page moved while the platform was being built. The docs are the safest place to start.
      </p>
      <div {...stylex.props(styles.actions)}>
        <Button to="/">Back to the start</Button>
        <Button to="/docs" outline>
          Browse the docs
        </Button>
      </div>
    </div>
  )
}

const styles = stylex.create({
  body: { backgroundColor: color.bg, color: color.text, fontFamily: font.sans },
  notFound: {
    maxWidth: '720px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingTop: '140px',
    paddingBottom: '160px',
    paddingLeft: '24px',
    paddingRight: '24px',
    fontFamily: font.sans,
    color: color.text
  },
  notFoundTitle: {
    margin: 0,
    fontFamily: font.display,
    fontSize: 'clamp(34px, 6vw, 56px)',
    lineHeight: 1.05,
    fontWeight: 600,
    letterSpacing: '-0.035em'
  },
  notFoundText: { marginTop: '18px', marginBottom: 0, fontSize: '17px', lineHeight: 1.6, color: color.text2 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '32px' }
})

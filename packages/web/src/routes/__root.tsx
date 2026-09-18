import * as stylex from '@stylexjs/stylex'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Footer } from '../footer'
import { Button, Eyebrow } from '../layout'
import { Nav } from '../nav'
import { SmoothScroll } from '../smooth-scroll'
import { BOOT } from '../theme'
import { color, font } from '../tokens.stylex'
// The reset first: a layer declared later wins, and the reset must lose to every StyleX layer.
import 'lenis/dist/lenis.css'
import '../reset.css'
import 'virtual:stylex.css'

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
      { title: 'Duo — Apple’s folding iPhone, simulated, that you can build apps for' },
      {
        name: 'description',
        content:
          'A working simulator of Apple’s iPhone Duo: hold it, fold it, install apps, and build your own with the SDK.'
      },
      { property: 'og:image', content: 'https://duo.doan-labs.com/icon-512.png' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:image', content: 'https://duo.doan-labs.com/icon-512.png' }
    ]
  }),
  component: Root,
  notFoundComponent: NotFound
})

function Root() {
  return (
    <Document>
      <SmoothScroll>
        <Nav />
        <main>
          <Outlet />
        </main>
        <Footer />
      </SmoothScroll>
    </Document>
  )
}

function Document({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* First in <head>: paints the saved theme before anything else renders. */}
        {/** biome-ignore lint/security/noDangerouslySetInnerHtml: the boot snippet is a build-time constant. */}
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
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

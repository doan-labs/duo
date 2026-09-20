import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { color, ease, font } from '../tokens.stylex'

/** The SDK reference moved under Docs. A page is still prerendered here so old links land, then forward. */
export const Route = createFileRoute('/sdk')({
  head: () => ({ meta: [{ title: 'SDK · Duo' }, { httpEquiv: 'refresh', content: '0; url=/docs/sdk' }] }),
  component: Page
})

function Page() {
  return (
    <div {...stylex.props(styles.wrap)}>
      {/* Rendered, not blank: the forward is instant with scripting, and this is
          what is left of the page when a crawler or a reader arrives without it. */}
      <p {...stylex.props(styles.note)}>Taking you to the SDK reference</p>
      <Link to="/docs/sdk" {...stylex.props(styles.link)}>
        /docs/sdk
      </Link>
      <Navigate to="/docs/sdk" replace />
    </div>
  )
}

const styles = stylex.create({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    minHeight: '52vh',
    paddingLeft: '24px',
    paddingRight: '24px',
    backgroundColor: color.bg,
    fontFamily: font.sans
  },
  note: {
    margin: 0,
    fontFamily: font.mono,
    fontSize: '12px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: color.text3
  },
  link: {
    fontFamily: font.mono,
    fontSize: '16px',
    color: { default: color.accent, ':hover': color.accentHover },
    textDecoration: 'none',
    borderRadius: '4px',
    transitionProperty: 'color, outline-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '3px'
  }
})

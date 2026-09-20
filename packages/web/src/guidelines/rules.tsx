// The three rules and the iOS shortlist, on a reading measure rather than the
// full token grid: this is the one tab that is prose.
import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { color, ease, font, radius } from '../tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

export function Rules() {
  return (
    <div {...stylex.props(styles.measure)}>
      <ol {...stylex.props(styles.rules)}>
        <Rule n="1" title="Design for the cover first">
          <p {...stylex.props(styles.p)}>
            The cover display is 387 points wide; the inner display is 790, a little more than two covers. A layout that
            reads on the cover has room to breathe unfolded: a list becomes a list beside its detail, a toolbar spreads
            out, a chart gets its axis labels back. The reverse never works: an inner-first layout squeezed onto the
            cover loses controls or text.
          </p>
          <p {...stylex.props(styles.p)}>
            Lay out in boxes and let width decide. The kit's components collapse themselves at cover width; yours should
            too. Never hide a feature on the cover: the person may never unfold the phone for it.
          </p>
        </Rule>

        <Rule n="2" title="Your app runs twice">
          <p {...stylex.props(styles.p)}>
            While the phone is in use, the other display holds a running copy of your app so the fold hands over without
            a remount or a flash. The copy draws everything and starts nothing: no sound, no network request, no timer
            of its own. State that both copies must agree on lives in shared storage, not in a component.
          </p>
          <p {...stylex.props(styles.p)}>
            Test it: open your app, fold the phone all the way, unfold it. The same note, the same scroll position, the
            same playback, once.
          </p>
        </Rule>

        <Rule n="3" title="Tokens only">
          <p {...stylex.props(styles.p)}>
            Every colour, font size, radius and easing comes from the kit's tokens. No hex, no pixel font sizes. This is
            not taste: the two displays have different densities and the shell tunes the palette for both, and an app
            with literals looks wrong on one of them and inherits no fix.
          </p>
        </Rule>
      </ol>

      <h3 {...stylex.props(styles.h3)}>And the iOS rules still hold</h3>
      <ul {...stylex.props(styles.ul)}>
        <li {...stylex.props(styles.li)}>Navigation is a stack with a back button on the left; Escape goes home.</li>
        <li {...stylex.props(styles.li)}>Text input works on the cover: a note, a search, a message, at 387 points.</li>
        <li {...stylex.props(styles.li)}>Timings are iOS timings. Pushes take about 380 ms; nothing bounces twice.</li>
        <li {...stylex.props(styles.li)}>
          A widget is a snapshot the shell draws, with its age shown. It is not a live view of your app.
        </li>
      </ul>
      <p {...stylex.props(styles.p)}>
        Every component:{' '}
        <Link to="/kit" {...stylex.props(styles.link)}>
          UI kit
        </Link>
        . The fold's mechanics:{' '}
        <Link to="/docs/$" params={{ _splat: 'displays' }} {...stylex.props(styles.link)}>
          Displays and the fold
        </Link>
        .
      </p>
    </div>
  )
}

/** A numbered rule: mono number in its own column, the rule beside it. */
function Rule({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <li {...stylex.props(styles.rule)}>
      <span {...stylex.props(styles.n)} aria-hidden="true">
        {n.padStart(2, '0')}
      </span>
      <div {...stylex.props(styles.body)}>
        <h3 {...stylex.props(styles.ruleTitle)}>{title}</h3>
        {children}
      </div>
    </li>
  )
}

const styles = stylex.create({
  measure: { maxWidth: '760px' },
  rules: { listStyleType: 'none', margin: 0, padding: 0, display: 'grid', gap: '14px' },
  rule: {
    display: 'grid',
    gridTemplateColumns: { default: '44px minmax(0, 1fr)', [SMALL]: 'minmax(0, 1fr)' },
    gap: { default: '4px', [SMALL]: '10px' },
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.md,
    paddingTop: '26px',
    paddingBottom: '12px',
    paddingLeft: { default: '28px', [SMALL]: '20px' },
    paddingRight: { default: '28px', [SMALL]: '20px' },
    transitionProperty: 'border-color, box-shadow, transform',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out,
    transform: { default: 'translateY(0)', ':hover': 'translateY(-2px)' },
    boxShadow: { default: 'none', ':hover': color.shadow }
  },
  n: {
    display: 'block',
    marginTop: '4px',
    fontFamily: font.mono,
    fontSize: '12px',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.12em',
    color: color.accent
  },
  body: { minWidth: 0 },
  ruleTitle: {
    margin: 0,
    marginBottom: '12px',
    fontFamily: font.display,
    fontSize: { default: '26px', [SMALL]: '22px' },
    lineHeight: 1.15,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: color.text
  },
  h3: {
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: color.text3,
    marginTop: '48px',
    marginBottom: '12px'
  },
  p: {
    fontFamily: font.sans,
    fontSize: '17px',
    lineHeight: 1.6,
    color: color.text,
    marginTop: 0,
    marginBottom: '16px'
  },
  ul: {
    fontFamily: font.sans,
    fontSize: '17px',
    lineHeight: 1.6,
    color: color.text,
    marginTop: 0,
    marginBottom: '24px',
    paddingLeft: '22px'
  },
  li: { marginBottom: '8px' },
  link: {
    color: { default: color.accent, ':hover': color.accentHover },
    textDecoration: { default: 'none', ':hover': 'underline' }
  }
})

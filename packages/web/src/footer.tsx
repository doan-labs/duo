import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { DOAN, LICENSE, MORE, REPO } from './site'
import { color, font } from './tokens.stylex'

/**
 * The Doan mark: a half disc, a ring, a triangle and a tilted square on a 24
 * grid, one to a cell. Copied from doan-labs.com's handoff file
 * (public/doan-mark.svg); strokes are outlined so it fills in currentColor.
 */
const DoanMark = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...stylex.props(styles.markSvg)}>
    <path fill="currentColor" d="M5.6 3.4A4.1 4.1 0 0 1 5.6 11.6Z" />
    <path
      fill="currentColor"
      d="M21 7.5A4.5 4.5 0 1 1 12 7.5A4.5 4.5 0 1 1 21 7.5ZM19.2 7.5A2.7 2.7 0 1 0 13.8 7.5A2.7 2.7 0 1 0 19.2 7.5Z"
    />
    <path fill="currentColor" d="M7.5 12.9L3.5 20.1L11.5 20.1Z" />
    <path
      fill="currentColor"
      d="M16.5 11.586L21.414 16.5L16.5 21.414L11.586 16.5ZM16.5 14.061L14.061 16.5L16.5 18.939L18.939 16.5Z"
    />
  </svg>
)

/** One line of links, one line of small print with the studio's mark. No sitemap. */
export function Footer() {
  return (
    <footer {...stylex.props(styles.foot)}>
      <div {...stylex.props(styles.row)}>
        <Link to="/" {...stylex.props(styles.mark)}>
          Duo
        </Link>
        <nav aria-label="Footer" {...stylex.props(styles.links)}>
          <a href={REPO} {...stylex.props(styles.link)}>
            GitHub
          </a>
          <Link to="/docs" {...stylex.props(styles.link)}>
            Docs
          </Link>
          <Link to="/apps" {...stylex.props(styles.link)}>
            Apps
          </Link>
          <a href={LICENSE} {...stylex.props(styles.link)}>
            License
          </a>
        </nav>
      </div>
      <div {...stylex.props(styles.row, styles.base)}>
        <p {...stylex.props(styles.fine)}>
          <a href={DOAN} {...stylex.props(styles.studio)}>
            <DoanMark />
            Made by Doan Labs
          </a>
          Built in the open. Not affiliated with Apple.
        </p>
        <nav aria-label="More pages" {...stylex.props(styles.links)}>
          {MORE.map((n) => (
            <Link key={n.to} to={n.to} {...stylex.props(styles.link, styles.small)}>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}

const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  foot: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingTop: '48px',
    paddingBottom: '48px',
    paddingLeft: { default: '40px', [SMALL]: '24px' },
    paddingRight: { default: '40px', [SMALL]: '24px' },
    fontFamily: font.sans,
    color: color.text,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.border
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '16px'
  },
  base: { marginTop: '28px' },
  mark: {
    fontFamily: font.display,
    fontSize: '18px',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    color: color.text,
    textDecoration: 'none'
  },
  links: { display: 'flex', flexWrap: 'wrap', gap: '24px' },
  link: {
    fontSize: '14px',
    color: { default: color.text2, ':hover': color.text },
    textDecoration: 'none',
    transitionProperty: 'color',
    transitionDuration: '0.15s'
  },
  small: { fontSize: '13px', color: { default: color.text3, ':hover': color.text } },
  fine: { margin: 0, fontSize: '13px', color: color.text3, display: 'flex', flexWrap: 'wrap', gap: '16px' },
  studio: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: { default: color.text2, ':hover': color.text },
    textDecoration: 'none',
    transitionProperty: 'color',
    transitionDuration: '0.15s'
  },
  markSvg: { display: 'block', flexShrink: 0 }
})

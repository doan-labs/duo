import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { appForName } from './home/apps'
import { color, ease, font, radius } from './tokens.stylex'

/** Settings is not on the home screen, so /apps has no entry for it: an icon, no page. */
const SETTINGS = '/icons/settings.webp'
export const iconOf = (name: string) => appForName(name)?.icon ?? (name === 'Settings' ? SETTINGS : undefined)

/** App names as icons, each linked to its /apps page when it has one: the changelog's app lines and a post's. */
export function AppGrid({ names, from }: { names: readonly string[]; from?: string }) {
  return (
    <ul {...stylex.props(styles.grid)}>
      {names.map((n) => {
        const slug = appForName(n)?.slug
        const face = (
          <>
            <img src={iconOf(n)} alt="" width={1024} height={1024} {...stylex.props(styles.icon)} />
            {n}
          </>
        )
        return (
          <li key={n}>
            {slug ? (
              <Link
                to="/apps/$slug"
                params={{ slug }}
                search={from ? { from } : {}}
                {...stylex.props(styles.app, styles.appLink)}
              >
                {face}
              </Link>
            ) : (
              <span {...stylex.props(styles.app)}>{face}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const styles = stylex.create({
  grid: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px'
  },
  app: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    fontFamily: font.sans,
    fontSize: '15px',
    color: color.text,
    // Every tile takes the hover pad, linked or not, so Settings lines up with its row.
    marginLeft: '-6px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: radius.md
  },
  appLink: {
    textDecoration: 'none',
    backgroundColor: { default: 'transparent', ':hover': color.well },
    transitionProperty: 'background-color',
    transitionDuration: '0.2s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  icon: { width: '32px', height: '32px', flexShrink: 0, borderRadius: '7px' }
})

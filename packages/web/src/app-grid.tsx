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
            <span {...stylex.props(styles.name)}>{n}</span>
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

// On a phone the grid turns into a home screen: icon over name, four across.
const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  grid: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(auto-fill, minmax(150px, 1fr))', [SMALL]: 'repeat(4, minmax(0, 1fr))' },
    columnGap: { default: '12px', [SMALL]: '4px' },
    rowGap: { default: '12px', [SMALL]: '14px' }
  },
  app: {
    display: 'flex',
    flexDirection: { default: 'row', [SMALL]: 'column' },
    alignItems: 'center',
    gap: { default: '10px', [SMALL]: '6px' },
    minWidth: 0,
    fontFamily: font.sans,
    fontSize: { default: '15px', [SMALL]: '12px' },
    color: color.text,
    // Every tile takes the hover pad, linked or not, so Settings lines up with its row.
    marginLeft: { default: '-6px', [SMALL]: 0 },
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
  icon: {
    width: { default: '32px', [SMALL]: '52px' },
    height: { default: '32px', [SMALL]: '52px' },
    flexShrink: 0,
    borderRadius: { default: '7px', [SMALL]: '12px' }
  },
  name: { maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
})

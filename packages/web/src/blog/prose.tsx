// The MDX element map: a post's Markdown renders with the docs' own styles
// (`md` in markdown.tsx), so a heading, a link or a fence reads the same on
// /blog as on /docs. The interactive pieces a post can place are added in the
// post route.
import * as stylex from '@stylexjs/stylex'
import { Children, isValidElement, type ReactNode } from 'react'
import { md, slug } from '../markdown'
import { Pre } from '../page-parts'
import { GITHUB_MARK, NAV } from '../site'
import { color } from '../tokens.stylex'

type Props = { children?: ReactNode }

/** Plain text of a heading, for its id: `The \`os.mirror\` flag` → `the-os-mirror-flag`. */
const textOf = (n: ReactNode): string =>
  Children.toArray(n)
    .map((c) =>
      typeof c === 'string' || typeof c === 'number'
        ? String(c)
        : isValidElement<Props>(c)
          ? textOf(c.props.children)
          : ''
    )
    .join('')

function Heading({ level, children }: Props & { level: 2 | 3 }) {
  const Tag = level === 2 ? 'h2' : 'h3'
  const id = slug(textOf(children))
  return (
    <Tag id={id} {...stylex.props(md.h, level === 2 ? md.h2 : md.h3)}>
      <a href={`#${id}`} {...stylex.props(md.anchor)}>
        {children}
      </a>
    </Tag>
  )
}

export const prose = {
  h2: ({ children }: Props) => <Heading level={2}>{children}</Heading>,
  h3: ({ children }: Props) => <Heading level={3}>{children}</Heading>,
  p: ({ children }: Props) => <p {...stylex.props(md.p, styles.p)}>{children}</p>,
  a: ({ children, href = '' }: Props & { href?: string }) => (
    <a href={href} {...stylex.props(md.a, styles.link)}>
      <LinkMark href={href} />
      {children}
    </a>
  ),
  strong: ({ children }: Props) => <strong {...stylex.props(md.strong)}>{children}</strong>,
  code: ({ children }: Props) => <code {...stylex.props(md.code)}>{children}</code>,
  ul: ({ children }: Props) => <ul {...stylex.props(md.list, styles.p)}>{children}</ul>,
  ol: ({ children }: Props) => <ol {...stylex.props(md.list, styles.p)}>{children}</ol>,
  li: ({ children }: Props) => <li {...stylex.props(md.li)}>{children}</li>,
  blockquote: ({ children }: Props) => <blockquote {...stylex.props(md.quote)}>{children}</blockquote>,
  hr: () => <hr {...stylex.props(md.hr)} />,
  // A fence arrives as <pre><code class="language-ts">; the site's block wants the text and the language.
  pre: ({ children }: Props) => {
    const code = isValidElement<Props & { className?: string }>(children) ? children.props : {}
    return <Pre lang={code.className?.replace('language-', '')}>{textOf(code.children).replace(/\n$/, '')}</Pre>
  }
}

/** A processor, for the hardware docs: the one site page the nav has no glyph for. */
const CHIP =
  'M4.5 4.5h7v7h-7zM6.75 6.75h2.5v2.5h-2.5zM6.25 1.75v2.75M9.75 1.75v2.75M6.25 11.5v2.75M9.75 11.5v2.75M1.75 6.25h2.75M1.75 9.75h2.75M11.5 6.25h2.75M11.5 9.75h2.75'

/**
 * The glyph before a link, so a reader sees where it goes before reading it:
 * the Doan Labs mark for the live site, GitHub's for the repo, and the nav's
 * own icon for a page of this site. Anything else stays a plain link.
 */
function LinkMark({ href }: { href: string }) {
  if (/^https?:\/\/duo\.doan-labs\.com/.test(href))
    return (
      <img src="/icon.svg" alt="" width="16" height="16" {...stylex.props(styles.mark, styles.logoSize, styles.logo)} />
    )
  const fill = href.startsWith('https://github.com')
  const page = NAV.find((n) => href === n.to || href.startsWith(`${n.to}/`))
  const d = fill ? GITHUB_MARK : href.startsWith('/docs/hardware') ? CHIP : page?.icon
  if (!d) return null
  const hue = fill
    ? styles.plain
    : href.startsWith('/docs/hardware')
      ? styles.red
      : (tint(page?.to ?? '') ?? styles.plain)
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...stylex.props(styles.mark, styles.tile, hue)}>
      <path
        d={d}
        fill={fill ? 'currentColor' : 'none'}
        stroke={fill ? 'none' : 'currentColor'}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Each destination keeps one hue in every post, never the link's own. */
const tint = (to: string) =>
  ({
    '/apps': styles.orange,
    '/kit': styles.green,
    '/docs': styles.red,
    '/simulator': styles.orange,
    '/blog': styles.green,
    '/changelog': styles.green
  })[to]

const styles = stylex.create({
  // The glyph and the first word never part across a line break.
  link: { whiteSpace: 'nowrap' },
  mark: {
    display: 'inline-block',
    width: '0.9em',
    height: '0.9em',
    marginRight: '0.3em',
    verticalAlign: '-0.1em',
    flexShrink: 0
  },
  // A tinted tile behind the glyph, like the logo's: the icon reads as a place, not a word.
  tile: {
    width: '1.15em',
    height: '1.15em',
    paddingTop: '0.14em',
    paddingBottom: '0.14em',
    paddingLeft: '0.14em',
    paddingRight: '0.14em',
    borderRadius: '0.28em',
    verticalAlign: '-0.2em'
  },
  green: { color: color.green, backgroundColor: color.greenBg },
  orange: { color: color.orange, backgroundColor: color.orangeBg },
  red: { color: color.red, backgroundColor: color.redBg },
  plain: { color: color.text, backgroundColor: color.grayBg },
  logoSize: { width: '1.15em', height: '1.15em', verticalAlign: '-0.2em' },
  logo: {
    borderRadius: '0.22em',
    outlineWidth: '1px',
    outlineStyle: 'solid',
    outlineColor: color.border,
    outlineOffset: '-1px'
  },
  // An essay reads a touch looser than reference docs.
  p: { fontSize: '18px', lineHeight: 1.7 }
})

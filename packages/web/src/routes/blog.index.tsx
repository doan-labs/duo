import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link } from '@tanstack/react-router'
import { day, type Post, posts } from '../blog/posts'
import { Section } from '../layout'
import { PageTop, Reveal } from '../page-parts'
import { color, ease, font, radius } from '../tokens.stylex'

export const Route = createFileRoute('/blog/')({
  head: () => ({
    meta: [
      { title: 'Blog · Duo' },
      { name: 'description', content: 'How the folding iPhone simulator is built, and what each release changes.' }
    ]
  }),
  component: Page
})

function Page() {
  return (
    <Section>
      <PageTop
        eyebrow="Blog"
        title="Notes from the fold."
        lead="How Duo is built, why it works the way it does, and what each release changes."
      />
      <div {...stylex.props(styles.list)}>
        {posts.map((p, i) => (
          <Reveal key={p.slug} delay={0.08 + i * 0.06}>
            <Card post={p} />
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

function Card({ post: p }: { post: Post }) {
  return (
    <Link to="/blog/$slug" params={{ slug: p.slug }} {...stylex.props(styles.card)}>
      <span {...stylex.props(styles.shot)}>
        <img src={p.poster} alt="" width={1600} height={900} {...stylex.props(styles.image)} />
      </span>
      <span {...stylex.props(styles.text)}>
        <span {...stylex.props(styles.meta)}>
          {day(p.date)} · {p.minutes} min read
        </span>
        <span {...stylex.props(styles.title)}>{p.title}</span>
        <span {...stylex.props(styles.lead)}>{p.lead}</span>
        <span {...stylex.props(styles.more)}>
          Read the post <span aria-hidden="true">&#8594;</span>
        </span>
      </span>
    </Link>
  )
}

const MID = '@media (max-width: 1068px)'
const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  list: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1.35fr) minmax(0, 1fr)', [MID]: '1fr' },
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.lg,
    textDecoration: 'none',
    color: color.text,
    transform: { default: 'translateY(0)', ':hover': 'translateY(-3px)' },
    boxShadow: { default: 'none', ':hover': color.shadow },
    transitionProperty: 'transform, box-shadow, border-color',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '3px'
  },
  shot: { display: 'block', overflow: 'hidden', backgroundColor: color.well },
  image: { display: 'block', width: '100%', height: 'auto', aspectRatio: '16 / 9', objectFit: 'cover' },
  text: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingTop: { default: '32px', [SMALL]: '22px' },
    paddingBottom: { default: '32px', [SMALL]: '26px' },
    paddingLeft: { default: '36px', [SMALL]: '24px' },
    paddingRight: { default: '36px', [SMALL]: '24px' }
  },
  meta: {
    fontFamily: font.mono,
    fontSize: '11.5px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.text3
  },
  title: {
    fontFamily: font.display,
    fontSize: { default: '34px', [SMALL]: '26px' },
    fontWeight: 600,
    lineHeight: 1.08,
    letterSpacing: '-0.03em',
    textWrap: 'balance'
  },
  lead: { fontFamily: font.sans, fontSize: '16px', lineHeight: 1.55, color: color.text2 },
  more: { marginTop: '6px', fontFamily: font.sans, fontSize: '15px', fontWeight: 500, color: color.accent }
})

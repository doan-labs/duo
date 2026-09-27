import * as stylex from '@stylexjs/stylex'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { useState } from 'react'
import { Apps } from '../blog/apps'
import { Contents } from '../blog/contents'
import { Figures } from '../blog/figures'
import { Film } from '../blog/film'
import { FoldDiagram } from '../blog/fold-diagram'
import { Heard } from '../blog/heard'
import { HomePlay } from '../blog/home-play'
import { Live } from '../blog/live'
import { MicWave } from '../blog/mic-wave'
import { NotifyRun } from '../blog/notify-run'
import { Points } from '../blog/points'
import { day, type Post, post, posts } from '../blog/posts'
import { prose } from '../blog/prose'
import { useReading } from '../blog/reading'
import { StocksDiagram } from '../blog/stocks-diagram'
import { TileDiagram } from '../blog/tile-diagram'
import { DoanMark } from '../footer'
import { Button } from '../layout'
import { Reveal } from '../page-parts'
import { color, ease, font, radius } from '../tokens.stylex'

export const Route = createFileRoute('/blog/$slug')({
  loader: ({ params }) => {
    if (!post(params.slug)) throw notFound()
    return params.slug
  },
  head: ({ loaderData }) => {
    const p = post(loaderData ?? '')
    if (!p) return {}
    // Absolute for the crawlers; relative in dev, where the card is not deployed yet but previews should load.
    const image = `${import.meta.env.DEV ? '' : 'https://duo.doan-labs.com'}${p.og ?? p.poster}`
    return {
      meta: [
        { title: `${p.title} · Duo` },
        { name: 'description', content: p.lead },
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: p.title },
        { property: 'og:description', content: p.lead },
        { property: 'og:image', content: image },
        ...(p.og
          ? [
              { property: 'og:image:width', content: '1200' },
              { property: 'og:image:height', content: '630' }
            ]
          : []),
        { name: 'twitter:title', content: p.title },
        { name: 'twitter:description', content: p.lead },
        { name: 'twitter:image', content: image }
      ]
    }
  },
  component: Page
})

/** What a post can place besides Markdown. */
const components = {
  ...prose,
  Film,
  FoldDiagram,
  Live,
  Figures,
  Heard,
  NotifyRun,
  Points,
  Apps,
  TileDiagram,
  StocksDiagram,
  MicWave,
  HomePlay
}

function Page() {
  const p = post(Route.useLoaderData())
  useReading(p?.slug ?? '', p?.title ?? '')
  if (!p) return null
  const next = posts.find((q) => q.slug !== p.slug)
  return (
    <>
      <Progress post={p} />
      <Contents toc={p.toc} />
      <article {...stylex.props(styles.page)}>
        <Reveal>
          <header {...stylex.props(styles.head)}>
            <p {...stylex.props(styles.eyebrow)}>
              <Link to="/blog" {...stylex.props(styles.back)}>
                Blog
              </Link>
              <span aria-hidden="true"> · </span>
              <time dateTime={p.date}>{day(p.date)}</time>
              <span aria-hidden="true"> · </span>
              {p.minutes} min read
            </p>
            <h1 {...stylex.props(styles.title)}>{p.title}</h1>
            <p {...stylex.props(styles.lead)}>{p.lead}</p>
            <div {...stylex.props(styles.bylines)}>
              {[p.author].flat().map((name) => {
                const id = name.toLowerCase().replace(/\s+/g, '-')
                return (
                  <p key={name} {...stylex.props(styles.byline)}>
                    {/* The portrait doan-labs.com prints, copied into public/people/. */}
                    {/* The name is the same link; this one is skipped by keyboard and screen readers. */}
                    <a
                      href={`https://doan-labs.com/people/${id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={-1}
                      aria-hidden="true"
                      {...stylex.props(styles.avatarLink)}
                    >
                      <img src={`/people/${id}.webp`} alt="" width="36" height="36" {...stylex.props(styles.avatar)} />
                    </a>
                    <span>
                      <a
                        href={`https://doan-labs.com/people/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...stylex.props(styles.author)}
                      >
                        {name}
                      </a>
                      <a
                        href="https://doan-labs.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...stylex.props(styles.studio)}
                      >
                        <DoanMark size={12} />
                        Doan Labs
                      </a>
                    </span>
                  </p>
                )
              })}
            </div>
          </header>
        </Reveal>
        <div data-post-body {...stylex.props(styles.body)}>
          <p.Body components={components} />
        </div>
      </article>
      <aside {...stylex.props(styles.end)}>
        <div {...stylex.props(styles.endInner)}>
          <p {...stylex.props(styles.eyebrow)}>Try it</p>
          <h2 {...stylex.props(styles.endTitle)}>Fold it. Then build something that notices.</h2>
          <div {...stylex.props(styles.actions)}>
            <Button to="/simulator">Open the simulator</Button>
            <Button to="/docs" outline>
              Read the docs
            </Button>
          </div>
          {next && (
            <Link to="/blog/$slug" params={{ slug: next.slug }} {...stylex.props(styles.next)}>
              <img src={next.poster} alt="" width={1600} height={900} {...stylex.props(styles.nextImage)} />
              <span {...stylex.props(styles.nextText)}>
                <span {...stylex.props(styles.nextLabel)}>Keep reading</span>
                <span {...stylex.props(styles.nextTitle)}>{next.title}</span>
              </span>
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}

/**
 * A hairline under the nav that fills as the post is read, and the section
 * in view beside it once the header has scrolled away. The section is the
 * last `h2` whose top has passed the bar.
 */
function Progress({ post: p }: { post: Post }) {
  const { scrollYProgress } = useScroll()
  const [here, setHere] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  useMotionValueEvent(scrollYProgress, 'change', () => {
    setShown(window.scrollY > 420)
    let now: string | null = null
    for (const h of p.toc) {
      const el = document.getElementById(h.id)
      if (el && el.getBoundingClientRect().top < 140) now = h.text
    }
    setHere(now)
  })
  return (
    <div {...stylex.props(styles.progress)} aria-hidden="true">
      <motion.span {...stylex.props(styles.fillBar)} style={{ scaleX: scrollYProgress }} />
      <span {...stylex.props(styles.here, shown && here !== null && styles.hereOn)}>{here ?? ''}</span>
    </div>
  )
}

const SMALL = '@media (max-width: 734px)'

const styles = stylex.create({
  progress: {
    position: 'fixed',
    top: '60px',
    left: 0,
    right: 0,
    zIndex: 99,
    height: '2px',
    pointerEvents: 'none'
  },
  fillBar: {
    display: 'block',
    height: '100%',
    backgroundColor: color.accent,
    transformOrigin: 'left'
  },
  here: {
    position: 'absolute',
    top: '12px',
    left: '50%',
    maxWidth: 'calc(100vw - 48px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radius.pill,
    backgroundColor: color.navBg,
    backdropFilter: 'blur(18px) saturate(1.6)',
    WebkitBackdropFilter: 'blur(18px) saturate(1.6)',
    boxShadow: color.thumbShadow,
    fontFamily: font.sans,
    fontSize: '13px',
    fontWeight: 500,
    color: color.text,
    opacity: 0,
    transform: 'translate(-50%, -6px)',
    transitionProperty: 'opacity, transform',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out
  },
  // Wide screens show the outline beside the column instead.
  hereOn: { opacity: { default: 1, '@media (min-width: 1200px)': 0 }, transform: 'translate(-50%, 0)' },
  page: {
    paddingTop: { default: '96px', [SMALL]: '56px' },
    paddingBottom: '48px',
    paddingLeft: '24px',
    paddingRight: '24px',
    fontFamily: font.sans,
    color: color.text
  },
  head: { maxWidth: '880px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '56px', textAlign: 'center' },
  eyebrow: {
    margin: 0,
    marginBottom: '22px',
    fontFamily: font.mono,
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: color.text3
  },
  back: {
    color: { default: color.accent, ':hover': color.accentHover },
    textDecoration: 'none',
    borderRadius: '4px',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '3px'
  },
  title: {
    margin: 0,
    fontFamily: font.display,
    fontSize: 'clamp(38px, 6.4vw, 68px)',
    lineHeight: 1.02,
    fontWeight: 600,
    letterSpacing: '-0.035em',
    textWrap: 'balance'
  },
  lead: {
    maxWidth: '640px',
    marginTop: '22px',
    marginBottom: 0,
    marginLeft: 'auto',
    marginRight: 'auto',
    fontSize: { default: '20px', [SMALL]: '17px' },
    lineHeight: 1.55,
    color: color.text2,
    textWrap: 'pretty'
  },
  bylines: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: '36px',
    rowGap: '16px',
    marginTop: '32px'
  },
  byline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: 0,
    marginBottom: 0,
    textAlign: 'left'
  },
  avatarLink: {
    display: 'flex',
    flexShrink: 0,
    opacity: { default: 1, ':hover': 0.85 },
    transitionProperty: 'opacity',
    transitionDuration: '0.2s'
  },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' },
  author: {
    display: 'block',
    fontSize: '15px',
    fontWeight: 600,
    color: { default: color.text, ':hover': color.accent },
    textDecoration: 'none',
    transitionProperty: 'color',
    transitionDuration: '0.2s'
  },
  studio: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '13px',
    color: { default: color.text3, ':hover': color.text },
    textDecoration: 'none',
    transitionProperty: 'color',
    transitionDuration: '0.2s',
    borderRadius: '4px',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  // The film and the live phone break out of this column on their own.
  body: { maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto' },
  end: {
    paddingTop: '88px',
    paddingBottom: '104px',
    paddingLeft: '24px',
    paddingRight: '24px',
    backgroundColor: color.well
  },
  endInner: { maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto', fontFamily: font.sans },
  endTitle: {
    margin: 0,
    fontFamily: font.display,
    fontSize: { default: '36px', [SMALL]: '28px' },
    lineHeight: 1.08,
    fontWeight: 600,
    letterSpacing: '-0.03em',
    color: color.text
  },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '28px' },
  next: {
    display: 'grid',
    gridTemplateColumns: { default: '200px 1fr', [SMALL]: '1fr' },
    alignItems: 'center',
    gap: '20px',
    marginTop: '56px',
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: '14px',
    paddingRight: '20px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: color.border, ':hover': color.borderStrong },
    borderRadius: radius.lg,
    textDecoration: 'none',
    transform: { default: 'translateY(0)', ':hover': 'translateY(-2px)' },
    boxShadow: { default: 'none', ':hover': color.shadow },
    transitionProperty: 'transform, box-shadow, border-color',
    transitionDuration: '0.25s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  nextImage: {
    display: 'block',
    width: '100%',
    height: 'auto',
    aspectRatio: '16 / 9',
    objectFit: 'cover',
    borderRadius: radius.md
  },
  nextText: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 },
  nextLabel: {
    fontFamily: font.mono,
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.text3
  },
  nextTitle: {
    fontFamily: font.display,
    fontSize: '22px',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    color: color.text
  }
})

// The pieces the shared layout primitives do not cover, used by more than one
// route: the mono eyebrow over a page's headline, a reduced-motion-aware
// entrance, and the code and table shapes several pages repeat. Anything used
// by a single page stays in that page's own stylex.create.
import * as stylex from '@stylexjs/stylex'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Line } from './highlight'
import { CURVE, TAP } from './motion'
import { color, ease, font, radius } from './tokens.stylex'

// StyleX 0.19 cannot resolve an imported string as a media-query key, so the
// shared breakpoint is declared here (see tokens.stylex.ts).
const SMALL = '@media (max-width: 734px)'

const IN = { opacity: 0, transform: 'translateY(14px)' }
const OUT = { opacity: 1, transform: 'translateY(0px)' }

/**
 * Fades a section in as the page arrives. The element is always a `motion.div`
 * so the server and client trees match; when the visitor asks for less motion
 * the animation props are simply dropped.
 *
 * It animates on mount rather than on scroll on purpose. A jump the length of
 * the page - a hash link, a restored scroll position, the End key - can carry
 * an element past the viewport between two IntersectionObserver ticks, and a
 * `whileInView` reveal then sits at its initial opacity for good. Losing the
 * documentation is worse than losing the flourish.
 */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const still = useReducedMotion() ?? false
  // `initial` stays constant. It is the pose motion renders at mount, and
  // `useReducedMotion` is null on the server but a real boolean on the first
  // client render, so branching it here made the server ship `opacity: 0` and a
  // reduced-motion client mount at `opacity: 1`, which fails hydration. Reduced
  // motion takes the duration to nothing instead: same markup, no movement.
  return (
    <motion.div initial={IN} animate={OUT} transition={still ? { duration: 0 } : { duration: 0.5, delay, ease: CURVE }}>
      {children}
    </motion.div>
  )
}

/** A page's top: mono uppercase eyebrow, display headline, lead paragraph. */
export function PageTop({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: ReactNode }) {
  return (
    <Reveal>
      <p {...stylex.props(styles.eyebrow)}>{eyebrow}</p>
      <h1 {...stylex.props(styles.h1)}>{title}</h1>
      {lead && <p {...stylex.props(styles.lead)}>{lead}</p>}
    </Reveal>
  )
}

/** The same shape one level down: mono eyebrow over an `h2`, revealed on scroll. */
export function SectionTop({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: ReactNode }) {
  return (
    <Reveal>
      <p {...stylex.props(styles.eyebrow)}>{eyebrow}</p>
      <h2 {...stylex.props(styles.h2)}>{title}</h2>
      {lead && <p {...stylex.props(styles.lead)}>{lead}</p>}
    </Reveal>
  )
}

export function Code({ children }: { children: ReactNode }) {
  return <code {...stylex.props(styles.code)}>{children}</code>
}

/**
 * Puts text on the clipboard, reporting whether it landed. The async API needs
 * both a secure origin and a granted permission, and this site can be served
 * from a plain file host; the old command needs neither, so it is the fallback.
 */
async function put(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;top:-1000px;opacity:0'
    document.body.append(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

/**
 * Copies a block's source and says so. The confirmation is the point: a button
 * that does nothing visible reads as a button that did nothing. It is also why
 * a failed copy stays silent rather than claiming success.
 */
export function CopyButton({ text, label = 'Copy code' }: { text: string; label?: string }) {
  const still = useReducedMotion()
  const [done, setDone] = useState(false)
  // Held in a ref so unmounting mid-confirmation cannot leave a timer to fire.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = () => {
    void put(text).then((ok) => {
      if (!ok) return
      setDone(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setDone(false), 1500)
    })
  }
  const swap = { duration: still ? 0 : 0.22, ease: CURVE }
  return (
    <motion.button
      type="button"
      onClick={copy}
      title={done ? 'Copied' : label}
      aria-label={done ? 'Copied' : label}
      // motion writes `tabIndex` itself for anything carrying a gesture prop,
      // a button included, and `useReducedMotion` is null on the server but a
      // boolean on the first client render: dropping `whileTap` under reduced
      // motion meant the server shipped `tabindex="0"` and the client did not.
      // State it, keep the prop, gate only the scale.
      tabIndex={0}
      whileTap={{ scale: still ? 1 : TAP }}
      {...stylex.props(styles.copy, done && styles.copyDone)}
    >
      <span {...stylex.props(styles.copyIcon)} aria-hidden="true">
        <AnimatePresence initial={false}>
          {done ? (
            <motion.svg
              key="ok"
              viewBox="0 0 16 16"
              initial={{ opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.55 }}
              transition={swap}
              {...stylex.props(styles.glyph)}
            >
              <path
                d="M3.4 8.6 6.4 11.6 12.6 4.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="copy"
              viewBox="0 0 16 16"
              initial={{ opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.55 }}
              transition={swap}
              {...stylex.props(styles.glyph)}
            >
              <rect
                x="5.4"
                y="2.1"
                width="8.5"
                height="10.4"
                rx="2.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M10.6 13.9H4.3a2.2 2.2 0 0 1-2.2-2.2V5.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  )
}

/** The tokenizer in highlight.tsx only knows TypeScript, so only its family is coloured. */
const COLOURED = new Set(['ts', 'tsx', 'js', 'jsx', 'json'])
const LANG: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  json: 'JSON',
  sh: 'Shell',
  bash: 'Shell',
  console: 'Shell',
  html: 'HTML',
  css: 'CSS',
  md: 'Markdown'
}

/**
 * A code block: surface, hairline, copy button, and a horizontal scroll that
 * keeps its line numbers pinned. `title` names the file, `lang` comes from a
 * Markdown fence; source gets numbers and colour, a shell transcript does not.
 */
export function Pre({ children, title, lang }: { children: string; title?: string; lang?: string }) {
  const label = title ?? (lang ? (LANG[lang] ?? lang) : undefined)
  const source = title !== undefined || COLOURED.has(lang ?? '')
  const lines = children.split('\n')
  return (
    <div {...stylex.props(styles.codeBox)}>
      {label ? (
        <div {...stylex.props(styles.codeTitle)}>
          <span {...stylex.props(styles.codeLabel)}>{label}</span>
          <CopyButton text={children} />
        </div>
      ) : (
        <div {...stylex.props(styles.float)}>
          <CopyButton text={children} />
        </div>
      )}
      {/* Lenis owns the page's wheel events; without this it swallows the block's own sideways scroll. */}
      <pre data-lenis-prevent {...stylex.props(styles.codePre)}>
        {source ? (
          lines.map((line, i) => (
            <div key={`L${String(i + 1)}`} {...stylex.props(styles.codeLine)}>
              <span {...stylex.props(styles.gutter, lines.length > 9 && styles.gutterWide)}>{i + 1}</span>
              <code {...stylex.props(styles.codeText)}>
                <Line code={line} />
              </code>
            </div>
          ))
        ) : (
          <code {...stylex.props(styles.codeText, styles.codePlain, !label && styles.codeClear)}>{children}</code>
        )}
      </pre>
    </div>
  )
}

/** A data table that scrolls inside its own box on a narrow screen. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div {...stylex.props(styles.tableWrap)}>
      <table {...stylex.props(styles.table)}>{children}</table>
    </div>
  )
}

/** A body row. It lights up under the pointer so the eye keeps its place across wide columns. */
export function Tr({ children }: { children: ReactNode }) {
  return <tr {...stylex.props(styles.tr)}>{children}</tr>
}

export function Th({ children }: { children: ReactNode }) {
  return <th {...stylex.props(styles.th)}>{children}</th>
}

export function Td({ children, nowrap = false }: { children: ReactNode; nowrap?: boolean }) {
  return <td {...stylex.props(styles.td, nowrap && styles.nowrap)}>{children}</td>
}

const styles = stylex.create({
  eyebrow: {
    margin: 0,
    marginBottom: '14px',
    fontFamily: font.mono,
    fontSize: '12px',
    lineHeight: 1.2,
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: color.text3
  },
  h1: {
    margin: 0,
    fontFamily: font.display,
    fontSize: { default: '52px', [SMALL]: '38px' },
    lineHeight: 1.04,
    fontWeight: 600,
    letterSpacing: '-0.03em',
    color: color.text
  },
  h2: {
    margin: 0,
    fontFamily: font.display,
    fontSize: { default: '34px', [SMALL]: '27px' },
    lineHeight: 1.12,
    fontWeight: 600,
    letterSpacing: '-0.025em',
    color: color.text
  },
  lead: {
    marginTop: '18px',
    marginBottom: '32px',
    maxWidth: '680px',
    fontFamily: font.sans,
    fontSize: { default: '20px', [SMALL]: '18px' },
    lineHeight: 1.5,
    color: color.text2
  },
  code: {
    fontFamily: font.mono,
    fontSize: '0.86em',
    backgroundColor: color.well,
    borderRadius: '6px',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '5px',
    paddingRight: '5px',
    overflowWrap: 'break-word'
  },
  copy: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '30px',
    height: '30px',
    padding: 0,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: 'transparent', ':hover': color.border },
    borderRadius: radius.sm,
    backgroundColor: { default: 'transparent', ':hover': color.well },
    color: { default: color.text3, ':hover': color.text },
    cursor: 'pointer',
    transitionProperty: 'background-color, border-color, color, outline-color',
    transitionDuration: '0.18s',
    transitionTimingFunction: ease.out,
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  copyDone: { color: color.green, backgroundColor: color.greenBg, borderColor: 'transparent' },
  copyIcon: { position: 'relative', display: 'block', width: '16px', height: '16px' },
  glyph: { position: 'absolute', top: 0, left: 0, display: 'block', width: '16px', height: '16px' },
  codeBox: {
    position: 'relative',
    marginBottom: '24px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    overflow: 'hidden'
  },
  codeTitle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '18px',
    paddingRight: '8px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    backgroundColor: color.well
  },
  codeLabel: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: font.mono,
    fontSize: '11.5px',
    letterSpacing: '0.04em',
    color: color.text3
  },
  // Without a title bar the button floats over the first line, so that line keeps clear of it.
  float: { position: 'absolute', top: '8px', right: '8px', zIndex: 1 },
  codePre: {
    margin: 0,
    paddingTop: '14px',
    paddingBottom: '14px',
    fontFamily: font.mono,
    fontSize: '13.5px',
    lineHeight: 1.7,
    color: color.text,
    overflowX: 'auto',
    overscrollBehaviorX: 'contain',
    scrollbarWidth: 'thin',
    scrollbarColor: `${color.borderStrong} transparent`,
    '::-webkit-scrollbar': { height: '8px' },
    '::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
    '::-webkit-scrollbar-thumb': { backgroundColor: color.borderStrong, borderRadius: '999px' }
  },
  codeLine: { display: 'flex', paddingRight: '18px', width: 'max-content', minWidth: '100%' },
  // Sticky so a line that runs off the right edge still shows which line it is.
  gutter: {
    position: 'sticky',
    left: 0,
    flexShrink: 0,
    width: 'calc(1.5ch + 32px)',
    paddingLeft: '16px',
    paddingRight: '16px',
    textAlign: 'right',
    backgroundColor: color.surface,
    color: color.text3,
    userSelect: 'none'
  },
  gutterWide: { width: 'calc(2ch + 32px)' },
  codeText: { whiteSpace: 'pre', fontFamily: 'inherit' },
  codePlain: { display: 'block', paddingLeft: '20px', paddingRight: '20px' },
  codeClear: { paddingRight: '48px' },
  tableWrap: {
    marginBottom: '24px',
    backgroundColor: color.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.border,
    borderRadius: radius.md,
    overflowX: 'auto',
    // `overflow-x: auto` alone computes `overflow-y` to `auto` as well, and the
    // table's -1px bottom margin is then a 1px vertical overflow with a scrollbar.
    overflowY: 'hidden',
    overscrollBehaviorX: 'contain'
  },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    // The last row's rule would otherwise double up with the box's own bottom edge.
    marginBottom: '-1px',
    minWidth: '420px',
    fontFamily: font.sans,
    fontSize: '15px',
    lineHeight: 1.5
  },
  tr: {
    backgroundColor: { default: 'transparent', ':hover': color.well },
    transitionProperty: 'background-color',
    transitionDuration: '0.15s',
    transitionTimingFunction: ease.out
  },
  th: {
    textAlign: 'left',
    fontFamily: font.mono,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: color.text3,
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: '18px',
    paddingRight: '18px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    whiteSpace: 'nowrap'
  },
  td: {
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: '18px',
    paddingRight: '18px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: color.border,
    verticalAlign: 'top',
    color: color.text
  },
  nowrap: { whiteSpace: 'nowrap' }
})

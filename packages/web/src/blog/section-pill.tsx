import * as stylex from '@stylexjs/stylex'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { SHEET } from '../motion'
import { color, ease, font, radius } from '../tokens.stylex'
import { goTo } from './contents'
import type { Post } from './posts'
import { SectionIcon } from './section-icons'

// Below the wide outline, the section in view floats under the nav as a pill.
// Tapping it grows the pill into the post's contents, one icon per section;
// picking a row scrolls there and folds the card back into the pill.

/** Scrolling this far with the card open means the reader moved on. */
const DRIFT = 48

export function SectionPill({ toc }: { toc: Post['toc'] }) {
  const still = useReducedMotion()
  const { scrollY } = useScroll()
  const [at, setAt] = useState(-1)
  const [shown, setShown] = useState(false)
  const [open, setOpen] = useState(false)
  const openedAt = useRef(0)

  useMotionValueEvent(scrollY, 'change', (y) => {
    let now = -1
    toc.forEach((h, i) => {
      const el = document.getElementById(h.id)
      if (el && el.getBoundingClientRect().top < 140) now = i
    })
    setAt(now)
    setShown(y > 420 && now >= 0)
    if (y <= 420 || Math.abs(y - openedAt.current) > DRIFT) setOpen(false)
  })

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  const toggle = () => {
    openedAt.current = window.scrollY
    setOpen((o) => !o)
  }
  const pick = (id: string) => {
    setOpen(false)
    goTo(id)
  }

  const spring = still ? { duration: 0 } : SHEET
  const fade = { duration: still ? 0 : 0.18 }
  const here = toc[at]

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="scrim"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: still ? 0 : 0.25 }}
            onClick={() => setOpen(false)}
            {...stylex.props(styles.scrim)}
          />
        )}
      </AnimatePresence>
      <div {...stylex.props(styles.dock, shown && styles.dockOn)}>
        <motion.div
          layout
          initial={false}
          animate={{ borderRadius: open ? 22 : 18 }}
          transition={spring}
          {...stylex.props(styles.card, open && styles.cardOpen)}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {open ? (
              <motion.nav
                key="list"
                aria-label="Contents"
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: fade }}
                exit={{ opacity: 0, transition: { duration: still ? 0 : 0.1 } }}
                {...stylex.props(styles.list)}
              >
                <span {...stylex.props(styles.label)}>Contents</span>
                {toc.map((h, i) => (
                  <motion.button
                    key={h.id}
                    type="button"
                    aria-current={i === at ? 'location' : undefined}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0, transition: { ...spring, delay: still ? 0 : 0.05 + i * 0.03 } }}
                    onClick={() => pick(h.id)}
                    {...stylex.props(styles.row, i === at && styles.rowOn)}
                  >
                    <span {...stylex.props(styles.tile, i === at && styles.tileOn)}>
                      <SectionIcon id={h.id} play={i === at ? 'loop' : 'once'} delay={0.12 + i * 0.05} />
                    </span>
                    <span {...stylex.props(styles.rowText)}>{h.text}</span>
                  </motion.button>
                ))}
              </motion.nav>
            ) : (
              <motion.button
                key="pill"
                type="button"
                layout="position"
                aria-expanded={false}
                aria-label={here ? `Contents, now reading ${here.text}` : 'Contents'}
                tabIndex={shown ? 0 : -1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: fade }}
                exit={{ opacity: 0, transition: { duration: still ? 0 : 0.08 } }}
                onClick={toggle}
                {...stylex.props(styles.pill)}
              >
                <motion.span
                  key={at}
                  initial={still ? false : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring}
                  {...stylex.props(styles.pillNow)}
                >
                  <SectionIcon id={here?.id ?? ''} play="once" delay={0.1} />
                  <span {...stylex.props(styles.pillText)}>{here?.text ?? ''}</span>
                </motion.span>
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" {...stylex.props(styles.chevron)}>
                  <path
                    d="M2 3.75 5 6.75l3-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  )
}

const WIDE = '@media (min-width: 1200px)'

const styles = stylex.create({
  scrim: {
    display: { default: 'block', [WIDE]: 'none' },
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 98,
    backgroundColor: color.scrim
  },
  dock: {
    display: { default: 'flex', [WIDE]: 'none' },
    justifyContent: 'center',
    position: 'fixed',
    top: '74px',
    left: '16px',
    right: '16px',
    zIndex: 99,
    opacity: 0,
    transform: 'translateY(-6px)',
    pointerEvents: 'none',
    transitionProperty: 'opacity, transform',
    transitionDuration: '0.3s',
    transitionTimingFunction: ease.out
  },
  dockOn: { opacity: 1, transform: 'translateY(0)' },
  card: {
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: color.navBg,
    backdropFilter: 'blur(18px) saturate(1.6)',
    WebkitBackdropFilter: 'blur(18px) saturate(1.6)',
    boxShadow: color.thumbShadow,
    pointerEvents: 'auto'
  },
  cardOpen: { width: '360px', backgroundColor: color.surface },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    maxWidth: '100%',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontFamily: font.sans,
    fontSize: '13px',
    fontWeight: 500,
    color: color.text,
    cursor: 'pointer',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '-2px',
    borderRadius: radius.pill
  },
  pillNow: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 },
  pillText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chevron: { display: 'block', flexShrink: 0, color: color.text3 },
  list: { display: 'flex', flexDirection: 'column', paddingTop: '14px', paddingBottom: '8px' },
  label: {
    paddingBottom: '6px',
    paddingLeft: '18px',
    fontFamily: font.sans,
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: color.text3
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: '6px',
    marginRight: '6px',
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderWidth: 0,
    borderRadius: '14px',
    backgroundColor: { default: 'transparent', ':active': color.accentSoft },
    textAlign: 'left',
    fontFamily: font.sans,
    fontSize: '15px',
    lineHeight: 1.3,
    color: color.text2,
    cursor: 'pointer',
    outlineColor: { default: 'transparent', ':focus-visible': color.ring },
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '-2px'
  },
  rowOn: { color: color.text, fontWeight: 500 },
  rowText: { minWidth: 0 },
  tile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '30px',
    height: '30px',
    borderRadius: '9px',
    boxShadow: `inset 0 0 0 1px ${color.border}`,
    color: color.text3
  },
  tileOn: { boxShadow: 'none', backgroundColor: color.accentSoft, color: color.accent }
})

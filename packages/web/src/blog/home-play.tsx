import {
  chrome,
  easing,
  glass,
  layout,
  leading,
  radius,
  shadow,
  tracking,
  typeScale,
  weight
} from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react'
import { type PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SHEET, SLIDE } from '../motion'
import { color, font } from '../tokens.stylex'
import { diagram } from './diagram'

// The home screen's arranging rules, as packages/shell/springboard/grid.ts
// writes them, on local state instead of the device's saved grid: a drop on an
// app makes a folder of the two, a drop on a folder joins it, a folder left
// with one app dissolves into it, the dock takes apps only and at most eight,
// and a drop on the wallpaper sets the app down loose at the end.

type Folder = { id: number; name: string; apps: string[] }
type Slot = string | Folder
type Home = { grid: Slot[]; dock: string[] }
type From = 'grid' | 'dock' | 'folder'

const HOLD = 500
const DOCK_MAX = 8
const PITCH = 50
const DOCK_PAD = 8
const isFolder = (s: Slot): s is Folder => typeof s !== 'string'
const keyOf = (s: Slot) => (isFolder(s) ? `fold:${s.id}` : s)
const icon = (n: string) => `/icons/${n.toLowerCase().replace(/\s/g, '')}.webp`

const FACTORY: Home = {
  grid: [
    'Maps',
    'Stocks',
    'Weather',
    'Music',
    'Photos',
    'Notes',
    'Clock',
    'Calendar',
    'Podcasts',
    'Voice Memos',
    { id: 1, name: 'Reading', apps: ['Books', 'News', 'Tips'] }
  ],
  dock: ['Phone', 'Safari', 'Messages', 'Mail']
}

/** `slots` without `app`, loose or in a folder; a folder down to one app becomes that app. */
const without = (slots: Slot[], app: string): Slot[] =>
  slots.flatMap<Slot>((s) => {
    if (s === app) return []
    if (!isFolder(s) || !s.apps.includes(app)) return [s]
    const apps = s.apps.filter((n) => n !== app)
    return apps.length > 1 ? [{ ...s, apps }] : apps
  })
const lift = (h: Home, app: string): Home => ({ grid: without(h.grid, app), dock: h.dock.filter((n) => n !== app) })

let nextId = 2
const stack = (h: Home, app: string, target: string): Home => {
  const out = lift(h, app)
  return {
    ...out,
    grid: out.grid.map((s) =>
      keyOf(s) !== target
        ? s
        : isFolder(s)
          ? { ...s, apps: [...s.apps, app] }
          : { id: nextId++, name: 'Folder', apps: [s, app] }
    )
  }
}
const dock = (h: Home, app: string, i: number): Home => {
  const out = lift(h, app)
  out.dock.splice(Math.min(i, out.dock.length), 0, app)
  return out
}
const place = (h: Home, app: string): Home => {
  const out = lift(h, app)
  return { ...out, grid: [...out.grid, app] }
}

type Carry = { app: string; from: From; hot: string | null; dockAt: number | null }
type Press = { app: string; from: From; x: number; y: number; el: HTMLElement; timer: number; slot: Slot }

/**
 * The arranging gesture, live in the post: hold an icon half a second, carry
 * it, and let go on an app, a folder, the dock or the wallpaper. The drop runs
 * the shell's own rules and every icon settles with a spring from where it was.
 */
export function HomePlay() {
  const [home, setHome] = useState<Home>(FACTORY)
  const [carry, setCarry] = useState<Carry | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [log, setLog] = useState('Hold an icon for half a second, then carry it.')
  const stage = useRef<HTMLDivElement>(null)
  const press = useRef<Press | null>(null)
  const carryRef = useRef<Carry | null>(null)
  const landing = useRef<{ key: string; rect: DOMRect; bump?: string } | null>(null)
  const gx = useMotionValue(0)
  const gy = useMotionValue(0)
  const gs = useMotionValue(1)
  const go = useMotionValue(1)

  const folder = home.grid.find((s): s is Folder => isFolder(s) && s.id === open) ?? null

  // After a drop, the icon that moved flies in from where the finger let go.
  useLayoutEffect(() => {
    const l = landing.current
    const root = stage.current
    if (!l || !root) return
    landing.current = null
    const el = root.querySelector<HTMLElement>(`[data-icon="${CSS.escape(l.key)}"]`)
    if (el) {
      const r = el.getBoundingClientRect()
      const dx = l.rect.left + l.rect.width / 2 - (r.left + r.width / 2)
      const dy = l.rect.top + l.rect.height / 2 - (r.top + r.height / 2)
      animate(el, { x: [dx, 0], y: [dy, 0], scale: [l.rect.width / r.width, 1] }, SLIDE)
    }
    const b = l.bump && root.querySelector<HTMLElement>(`[data-icon="${CSS.escape(l.bump)}"]`)
    if (b) animate(b, { scale: [1.18, 1] }, { type: 'spring', stiffness: 420, damping: 18 })
  })

  useEffect(() => {
    const at = (e: PointerEvent) => {
      const r = stage.current?.getBoundingClientRect()
      return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 }
    }
    const move = (e: PointerEvent) => {
      const p = press.current
      if (!p) return
      if (!carryRef.current) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) {
          window.clearTimeout(p.timer)
          press.current = null
        }
        return
      }
      const pt = at(e)
      gx.set(pt.x)
      gy.set(pt.y)
      const under = document.elementFromPoint(e.clientX, e.clientY)
      const c = carryRef.current
      const d = under?.closest<HTMLElement>('[data-dock]')
      let dockAt: number | null = null
      if (d) {
        const n = home.dock.filter((x) => x !== c.app).length
        if (home.dock.includes(c.app) || n < DOCK_MAX) {
          const top = d.getBoundingClientRect().top + DOCK_PAD
          dockAt = Math.max(0, Math.min(n, Math.round((e.clientY - top - PITCH / 2) / PITCH)))
        }
      }
      const t = dockAt === null ? (under?.closest<HTMLElement>('[data-target]')?.dataset.target ?? null) : null
      const hot = t && t !== c.app ? t : null
      if (hot !== c.hot || dockAt !== c.dockAt) {
        carryRef.current = { ...c, hot, dockAt }
        setCarry(carryRef.current)
      }
    }
    const up = (e: PointerEvent) => {
      const p = press.current
      press.current = null
      if (!p) return
      window.clearTimeout(p.timer)
      const c = carryRef.current
      if (!c) {
        if (isFolder(p.slot)) setOpen(p.slot.id)
        else animate(p.el, { scale: [0.88, 1] }, { duration: 0.25 })
        return
      }
      const ghost = stage.current?.querySelector<HTMLElement>('[data-ghost]')?.getBoundingClientRect()
      const under = document.elementFromPoint(e.clientX, e.clientY)
      const src = home.grid.find((s): s is Folder => isFolder(s) && s.apps.includes(c.app))
      const gone = src && src.apps.length === 2 ? `; '${src.name}' dissolves` : ''
      const finish = (next: Home, msg: string, key: string, bump?: string) => {
        if (ghost) landing.current = { key, rect: ghost, bump }
        carryRef.current = null
        setCarry(null)
        setHome(next)
        setLog(next === home ? msg : msg + gone)
      }
      if (c.dockAt !== null) {
        finish(dock(home, c.app, c.dockAt), `dock('${c.app}', ${c.dockAt})`, `d:${c.app}`)
      } else if (c.hot) {
        const target = home.grid.find((s) => keyOf(s) === c.hot)
        const next = stack(home, c.app, c.hot)
        const made = next.grid.find((s) => isFolder(s) && s.apps.includes(c.app)) as Folder | undefined
        const into = target && isFolder(target) ? `'${target.name}'` : `'${target}'`
        // The icon drops into the target and shrinks away, then the folder takes it.
        const el = stage.current?.querySelector<HTMLElement>(`[data-icon="g:${CSS.escape(c.hot)}"]`)
        const r = el?.getBoundingClientRect()
        const s = stage.current?.getBoundingClientRect()
        const commit = () => {
          carryRef.current = null
          setCarry(null)
          setHome(next)
          setLog(`stack('${c.app}', ${into}) → ${made?.name ?? 'Folder'} [${made?.apps.join(', ')}]${gone}`)
          landing.current = made && ghost ? { key: '', rect: ghost, bump: `g:fold:${made.id}` } : null
          gs.set(1)
          go.set(1)
        }
        if (r && s) {
          animate(gx, r.left + r.width / 2 - s.left, SLIDE)
          animate(gy, r.top + r.height / 2 - s.top, SLIDE)
          animate(go, 0, { duration: 0.22 })
          animate(gs, 0.35, { duration: 0.22 }).then(commit)
        } else commit()
      } else if (under?.closest('[data-paper]') && !home.grid.includes(c.app)) {
        finish(place(home, c.app), `place('${c.app}')`, `g:${c.app}`)
      } else {
        // Let go nowhere it can land, or back on its own paper: it springs home.
        finish(home, 'No change: it springs back.', `${p.from === 'dock' ? 'd' : 'g'}:${c.app}`)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [home, gx, gy, gs, go])

  const down = (slot: Slot, from: From) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || carryRef.current) return
    const el = e.currentTarget
    const r = stage.current?.getBoundingClientRect()
    const timer = window.setTimeout(() => {
      // Folders open on a tap and stay put: the dock never takes one, so a held folder has nowhere new to go.
      if (isFolder(slot) || !r) return
      const box = el.getBoundingClientRect()
      gx.set(box.left + box.width / 2 - r.left)
      gy.set(box.top + box.height / 2 - r.top)
      gs.set(box.width / 51)
      go.set(1)
      animate(gs, 1.12, SLIDE)
      if (from === 'folder') setOpen(null)
      carryRef.current = { app: slot, from, hot: null, dockAt: null }
      setCarry(carryRef.current)
      setLog(`Carrying ${slot}…`)
    }, HOLD)
    press.current = { app: keyOf(slot), from, x: e.clientX, y: e.clientY, el, timer, slot }
  }

  // A grid tile keeps its cell while carried, so nothing reflows under the finger; a dock tile gives its slot up.
  const shown = carry
    ? {
        grid: home.grid.flatMap((s) => (s === carry.app ? [s] : without([s], carry.app))),
        dock: home.dock.filter((n) => n !== carry.app)
      }
    : home
  const dockN = shown.dock.length + (carry?.dockAt != null ? 1 : 0)
  const dockItems: (string | null)[] = [...shown.dock]
  if (carry?.dockAt != null) dockItems.splice(carry.dockAt, 0, null)

  return (
    <figure {...stylex.props(diagram.figure)}>
      <div ref={stage} {...stylex.props(styles.stage)}>
        <div data-paper {...stylex.props(styles.paper)}>
          <div {...stylex.props(styles.grid)}>
            {shown.grid.map((s) => {
              const k = keyOf(s)
              const hot = carry?.hot === k
              if (s === carry?.app) return <div key={k} {...stylex.props(styles.tile)} />
              return (
                <motion.div key={k} layout transition={SLIDE} {...stylex.props(styles.tile)}>
                  <div
                    data-target={k}
                    onPointerDown={down(s, 'grid')}
                    {...stylex.props(styles.well, hot && styles.wellHot, carry && styles.shake)}
                  >
                    {isFolder(s) ? (
                      open === s.id ? (
                        <div {...stylex.props(styles.icon)} />
                      ) : (
                        <motion.div
                          layoutId={`well:${s.id}`}
                          transition={SHEET}
                          data-icon={`g:${k}`}
                          {...stylex.props(styles.icon, styles.fold, hot && styles.iconHot)}
                        >
                          {s.apps.slice(0, 9).map((n) => (
                            <img key={n} src={icon(n)} alt="" draggable={false} {...stylex.props(styles.foldImg)} />
                          ))}
                        </motion.div>
                      )
                    ) : (
                      <img
                        data-icon={`g:${k}`}
                        src={icon(s)}
                        alt=""
                        draggable={false}
                        {...stylex.props(styles.icon, hot && styles.iconHot)}
                      />
                    )}
                  </div>
                  <span {...stylex.props(styles.label)}>{isFolder(s) ? s.name : s}</span>
                </motion.div>
              )
            })}
          </div>
        </div>
        <motion.div data-dock layout transition={SLIDE} {...stylex.props(styles.dock, styles.dockHeight(dockN))}>
          {dockItems.map((n) =>
            n === null ? (
              <motion.div key="gap" layout transition={SLIDE} {...stylex.props(styles.dockSlot)} />
            ) : (
              <motion.div key={n} layout transition={SLIDE} {...stylex.props(styles.dockSlot)}>
                <img
                  data-icon={`d:${n}`}
                  src={icon(n)}
                  alt={n}
                  draggable={false}
                  onPointerDown={down(n, 'dock')}
                  {...stylex.props(styles.icon, styles.dockIcon, carry && styles.shake)}
                />
              </motion.div>
            )
          )}
        </motion.div>

        <AnimatePresence>
          {folder && (
            <motion.div
              key="folder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onPointerDown={(e) => e.target === e.currentTarget && setOpen(null)}
              {...stylex.props(styles.scrim)}
            >
              <input
                key={folder.id}
                defaultValue={folder.name}
                aria-label="Folder name"
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (!name || name === folder.name) return
                  setHome((h) => ({ ...h, grid: h.grid.map((s) => (s === folder ? { ...s, name } : s)) }))
                  setLog(`rename('${folder.name}', '${name}')`)
                }}
                {...stylex.props(styles.name)}
              />
              <motion.div layoutId={`well:${folder.id}`} transition={SHEET} {...stylex.props(styles.folderWell)}>
                {folder.apps.map((n) => (
                  <div key={n} {...stylex.props(styles.tile)}>
                    <img
                      src={icon(n)}
                      alt=""
                      draggable={false}
                      onPointerDown={down(n, 'folder')}
                      {...stylex.props(styles.icon)}
                    />
                    <span {...stylex.props(styles.label)}>{n}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {carry && (
          <div {...stylex.props(styles.ghostLayer)}>
            <motion.div style={{ x: gx, y: gy, scale: gs, opacity: go }}>
              <img
                data-ghost
                src={icon(carry.app)}
                alt=""
                draggable={false}
                {...stylex.props(styles.icon, styles.ghost)}
              />
            </motion.div>
          </div>
        )}
      </div>
      <div {...stylex.props(diagram.controls)}>
        <code {...stylex.props(styles.log)} aria-live="polite">
          {log}
        </code>
        <button
          type="button"
          onClick={() => {
            setHome(FACTORY)
            setOpen(null)
            setLog('Back to the factory layout.')
          }}
          {...stylex.props(diagram.button)}
        >
          Reset
        </button>
      </div>
      <figcaption {...stylex.props(diagram.caption)}>
        Hold an icon, then drop it on another to make a folder, on a folder to add to it, in the dock, or on the
        wallpaper. Tap a folder to open it and carry an app back out.
      </figcaption>
    </figure>
  )
}

const shake = stylex.keyframes({
  '0%': { transform: 'rotate(-1.5deg)' },
  '50%': { transform: 'rotate(1.5deg)' },
  '100%': { transform: 'rotate(-1.5deg)' }
})

const styles = stylex.create({
  stage: {
    position: 'relative',
    height: '440px',
    overflow: 'hidden',
    borderRadius: layout.screenInnerPanel,
    backgroundImage: `${chrome.wash}, url(/icons/wall.webp)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#fff',
    userSelect: 'none',
    WebkitUserSelect: 'none'
  },
  paper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: `calc(${layout.dock} + ${layout.dockRight} * 2)`,
    paddingTop: layout.top,
    paddingLeft: '20px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, ${layout.cell})`,
    gridAutoRows: layout.row
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    width: layout.cell,
    fontSize: typeScale.caption2,
    lineHeight: leading.caption2,
    letterSpacing: tracking.caption2,
    fontWeight: weight.semibold,
    textShadow: shadow.text
  },
  well: {
    borderRadius: radius.xl,
    outlineWidth: '5px',
    outlineStyle: 'solid',
    outlineColor: 'transparent',
    cursor: 'pointer',
    touchAction: 'none',
    transitionProperty: 'background-color, outline-color',
    transitionDuration: '.15s'
  },
  // The cell a carried tile is over: a well behind the icon, the icon grown, as iOS offers to stack the two.
  wellHot: { backgroundColor: chrome.fill, outlineColor: chrome.fill },
  icon: {
    display: 'block',
    width: layout.icon,
    height: layout.icon,
    borderRadius: layout.iconRadius,
    transitionProperty: 'transform',
    transitionDuration: '.12s'
  },
  iconHot: { transform: 'scale(1.1)' },
  fold: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    alignContent: 'start',
    gap: '2px',
    padding: '4px',
    borderRadius: radius.xl,
    backgroundColor: chrome.folder,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: shadow.rim
  },
  foldImg: { width: '100%', height: 'auto', aspectRatio: '1', minWidth: 0, borderRadius: radius.xs },
  label: { maxWidth: layout.cell, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  shake: {
    animationName: { default: shake, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: '.3s',
    animationIterationCount: 'infinite',
    animationTimingFunction: easing.inOut
  },
  // Decision 18: blur, tint, one hairline, one soft shadow.
  dock: {
    position: 'absolute',
    top: layout.top,
    right: layout.dockRight,
    width: layout.dock,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: `${DOCK_PAD}px`,
    borderRadius: radius.xxl,
    backgroundColor: glass.tint,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    boxShadow: `${shadow.rim}, ${shadow.float}`
  },
  dockHeight: (n: number) => ({ height: `${Math.max(1, n) * PITCH + DOCK_PAD * 2 - 9}px` }),
  dockSlot: { display: 'grid', placeItems: 'center', height: `${PITCH}px` },
  dockIcon: { width: '41px', height: '41px', cursor: 'pointer', touchAction: 'none' },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    backgroundColor: chrome.scrim,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur
  },
  name: {
    width: '220px',
    fontFamily: 'inherit',
    fontSize: typeScale.title3,
    lineHeight: leading.title3,
    letterSpacing: tracking.title3,
    fontWeight: weight.semibold,
    textAlign: 'center',
    color: 'inherit',
    textShadow: shadow.text,
    backgroundColor: { default: 'transparent', ':focus': glass.tint },
    borderWidth: 0,
    borderRadius: radius.md,
    outlineStyle: 'none',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '10px',
    paddingRight: '10px'
  },
  folderWell: {
    display: 'grid',
    gridTemplateColumns: `repeat(3, ${layout.cell})`,
    gridAutoRows: layout.row,
    justifyItems: 'center',
    paddingTop: '18px',
    paddingBottom: '6px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radius.xxl,
    backgroundColor: glass.tint,
    boxShadow: `${shadow.rim}, ${shadow.float}`
  },
  ghostLayer: { position: 'absolute', top: '-25.5px', left: '-25.5px', zIndex: 3, pointerEvents: 'none' },
  ghost: { boxShadow: shadow.float },
  log: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: font.mono,
    fontSize: '13px',
    color: color.text2
  }
})

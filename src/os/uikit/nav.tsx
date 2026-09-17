import * as stylex from '@stylexjs/stylex'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { shared } from './styles.ts'
import { Sym } from './sym.tsx'
import { app, easing } from './tokens.stylex.ts'

type Push = (make: (back: () => void) => ReactNode) => void
const NavCtx = createContext<{ push: Push; pop: () => void }>({ push: () => {}, pop: () => {} })
/** Inside a `<Nav>`: `push((back) => <Page title="…" back={back}>…</Page>)`. */
export const useNav = () => useContext(NavCtx)

type Entry = { id: number; node: ReactNode; entered: boolean }
let seq = 0

/**
 * iOS push navigation: the new page slides in from the right and the one behind
 * drifts left and dims, so the stack reads as depth rather than a cross-fade.
 * `children` is the root page.
 */
export function Nav({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Entry[]>([])
  const [leaving, setLeaving] = useState<Entry[]>([])
  const pop = () =>
    setStack((s) => {
      const top = s.at(-1)
      if (!top) return s
      setLeaving((l) => [...l, top])
      setTimeout(() => setLeaving((l) => l.filter((e) => e !== top)), 380)
      return s.slice(0, -1)
    })
  const push: Push = (make) => setStack((s) => [...s, { id: ++seq, node: make(pop), entered: false }])
  // Two frames: one to get the page on screen off to the right, one to slide it
  // in. A single rAF lands in the same style flush and the page appears with no
  // transition.
  useEffect(() => {
    if (!stack.some((e) => !e.entered)) return
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setStack((s) => s.map((e) => (e.entered ? e : { ...e, entered: true }))))
    })
    return () => cancelAnimationFrame(raf)
  }, [stack])
  const depth = stack.filter((e) => e.entered).length
  return (
    <NavCtx.Provider value={{ push, pop }}>
      <div {...stylex.props(styles.nav)}>
        <div {...stylex.props(styles.pg, depth > 0 && styles.under)}>{children}</div>
        {stack.map((e, i) => (
          <div key={e.id} {...stylex.props(styles.pg, !e.entered && styles.off, i < depth - 1 && styles.under)}>
            {e.node}
          </div>
        ))}
        {leaving.map((e) => (
          <div key={e.id} {...stylex.props(styles.pg, styles.off)}>
            {e.node}
          </div>
        ))}
      </div>
    </NavCtx.Provider>
  )
}

/** One page in a `Nav`: fixed header with an optional back chevron, scrolling body. */
export const Page = ({ title, back, children }: { title: ReactNode; back?: () => void; children?: ReactNode }) => (
  <div {...stylex.props(shared.column)}>
    <div {...stylex.props(shared.hdr)}>
      {back && (
        <button type="button" {...stylex.props(shared.bk)} onClick={back}>
          <Sym name="back" size={20} />
        </button>
      )}
      {title}
    </div>
    <div {...stylex.props(shared.body)}>{children}</div>
  </div>
)

const styles = stylex.create({
  // Not absolute+inset:0. An absolutely positioned box resolves against the
  // padding box of its containing block, so it would sit under the 40 px the
  // app reserves for the status bar. As a flex child it lands in the content box.
  nav: { position: 'relative', flexGrow: 1, minHeight: 0, overflow: 'hidden' },
  pg: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: app.bg,
    transitionProperty: 'transform, opacity',
    transitionDuration: '.38s',
    transitionTimingFunction: easing.push
  },
  off: { transform: 'translateX(100%)' },
  under: { transform: 'translateX(-26%)', opacity: 0.5 }
})

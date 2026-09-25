import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef } from 'react'
import type { Place } from './data.ts'
import { Glyph, type GlyphName } from './glyphs.tsx'
import { arrival, formatLength, formatMin, MODE_LABEL, type Route, type TravelMode } from './live.ts'
import { styles } from './styles.ts'

const MODE_ICON: Partial<Record<TravelMode, GlyphName>> = { drive: 'car', bike: 'bike' }

type Props = {
  to: Place
  /** "My Location" or the reverse-geocoded street under it. */
  origin: string
  mode: TravelMode
  onMode: (m: TravelMode) => void
  routes: Route[] | null
  active: number
  onPick: (i: number) => void
  /** Fetch failed or the engine found no road there. */
  error: boolean
  onEnd: () => void
  /** The shared steps offset; both copies converge on it so the fold keeps the turn. */
  scroll: number
  onScrolled: (n: number) => void
}

/** The directions panel: modes, the ways there with times, and the turns of the chosen one. */
export function Directions({
  to,
  origin,
  mode,
  onMode,
  routes,
  active,
  onPick,
  error,
  onEnd,
  scroll,
  onScrolled
}: Props) {
  const chosen = routes?.[active]
  const list = useRef<HTMLDivElement>(null)
  const deb = useRef<number | null>(null)
  // A programmatic set fires its own scroll event; skip writing it back.
  const applying = useRef(0)

  // Both copies settle on the shared offset whenever it changes: the one in
  // hand is already there, so only the folded-away one actually moves - and it
  // stays caught up, ready for whenever the fold swaps them. The scroller can
  // mount while the sheet is still animating, where scrollTop clamps to 0, so
  // the apply retries as the element gets its real height.
  useEffect(() => {
    const el = list.current
    if (!el) return
    const settle = () => {
      const n = list.current
      if (n && Math.abs(n.scrollTop - scroll) > 1) {
        applying.current = performance.now()
        n.scrollTop = scroll
      }
    }
    settle()
    const size = new ResizeObserver(settle)
    size.observe(el)
    return () => size.disconnect()
  }, [scroll])

  useEffect(
    () => () => {
      if (deb.current !== null) window.clearTimeout(deb.current)
    },
    []
  )

  const scrolled = () => {
    if (!list.current || performance.now() - applying.current < 120) return
    const el = list.current
    if (deb.current !== null) window.clearTimeout(deb.current)
    deb.current = window.setTimeout(() => onScrolled(el.scrollTop), 140)
  }

  return (
    <>
      <div {...stylex.props(styles.dirTop)}>
        <h1 {...stylex.props(styles.dirTitle)}>
          <span {...stylex.props(styles.clip)}>{to.name}</span>
        </h1>
        <button type="button" aria-label="End directions" onClick={onEnd} {...stylex.props(styles.round)}>
          <Sym name="close" size={11} />
        </button>
      </div>

      <div {...stylex.props(styles.dirModes)}>
        {(Object.keys(MODE_LABEL) as TravelMode[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={m === mode}
            aria-label={MODE_LABEL[m]}
            onClick={() => onMode(m)}
            {...stylex.props(styles.modeBtn, m === mode && styles.modeBtnOn)}
          >
            {m === 'walk' ? <Sym name="walk" size={15} /> : <Glyph name={MODE_ICON[m]!} size={17} />}
          </button>
        ))}
      </div>

      <div key={`${to.id}:${mode}:${active}`} ref={list} onScroll={scrolled} {...stylex.props(styles.scroll)}>
        <div {...stylex.props(styles.ends)}>
          <div {...stylex.props(styles.endRow)}>
            <span {...stylex.props(styles.endDot)} />
            <span {...stylex.props(styles.clip)}>{origin}</span>
          </div>
          <div {...stylex.props(styles.endRow)}>
            <span {...stylex.props(styles.endPin)}>
              <Sym name="pin" size={11} />
            </span>
            <span {...stylex.props(styles.clip)}>{to.name}</span>
          </div>
        </div>

        {error ? (
          <div {...stylex.props(styles.dirNote)}>Directions aren’t available right now.</div>
        ) : !routes ? (
          <div {...stylex.props(styles.dirNote)}>Finding the best route…</div>
        ) : routes.length === 0 ? (
          <div {...stylex.props(styles.dirNote)}>No route between these places.</div>
        ) : (
          <>
            {(routes.length > 1 ? routes : []).map((r, i) => (
              <button
                key={`${r.duration}-${r.distance}`}
                type="button"
                onClick={() => onPick(i)}
                {...stylex.props(styles.routeRow, i === active && styles.routeRowOn)}
              >
                <span {...stylex.props(styles.routeMin)}>{formatMin(r.duration)}</span>
                <span {...stylex.props(styles.routeMeta)}>
                  {formatLength(r.distance)}
                  {r.via ? ` via ${r.via}` : ''} · arrive {arrival(r.duration)}
                </span>
                {i === 0 && <span {...stylex.props(styles.fastest)}>Fastest</span>}
              </button>
            ))}
            {routes.length === 1 && (
              <div {...stylex.props(styles.dirSummary)}>
                <span {...stylex.props(styles.routeMin)}>{formatMin(routes[0]!.duration)}</span>
                <span {...stylex.props(styles.routeMeta)}>
                  {formatLength(routes[0]!.distance)}
                  {routes[0]!.via ? ` via ${routes[0]!.via}` : ''} · arrive {arrival(routes[0]!.duration)}
                </span>
              </div>
            )}
            {chosen && (
              <>
                <div {...stylex.props(styles.hdr)}>Steps</div>
                {chosen.steps.map((s, i) => (
                  <div key={`${s.lat}-${s.lon}`} {...stylex.props(styles.step)}>
                    <span {...stylex.props(styles.stepIcon)}>
                      {s.icon === 'flag' ? (
                        <Sym name="pin" size={13} />
                      ) : (
                        <Glyph name={s.icon as GlyphName} size={16} />
                      )}
                    </span>
                    <span {...stylex.props(styles.stepText)}>
                      {s.text}
                      {i < chosen.steps.length - 1 && s.distance > 0 && (
                        <span {...stylex.props(styles.stepDist)}> · {formatLength(s.distance)}</span>
                      )}
                    </span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

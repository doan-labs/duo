import { os } from '@doan-labs/ipduo-sdk'
import { useKV } from '@doan-labs/ipduo-sdk/react.ts'
import { colors, fonts } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'

function FoldCompass() {
  const view = useSyncExternalStore(os.onView, () => os.view)
  const note = useKV(os.storage, 'field-note')
  const angle = Math.round(view.angle)
  const pocket = view.display === 'cover'
  const mode = pocket ? 'Pocket card' : angle < 150 ? 'Folded workspace' : 'Desk board'
  useEffect(() => {
    requestAnimationFrame(() => os.ready())
  }, [])
  return (
    <main
      data-demo="fold-compass"
      data-display={view.display}
      data-angle={angle}
      {...stylex.props(styles.root, pocket && styles.pocket)}
    >
      <header {...stylex.props(styles.header)}>
        <span>INDEPENDENT APP</span>
        <span>{view.active ? 'ACTIVE DISPLAY' : 'MIRROR'}</span>
      </header>
      <h1 {...stylex.props(styles.title)}>Fold Compass</h1>
      <section {...stylex.props(styles.board)}>
        <p {...stylex.props(styles.mode)}>{mode}</p>
        <div {...stylex.props(styles.angle)}>
          {angle}
          <span {...stylex.props(styles.degrees)}>°</span>
        </div>
        <div
          role="meter"
          aria-label="Hinge angle"
          aria-valuemin={0}
          aria-valuemax={180}
          aria-valuenow={angle}
          {...stylex.props(styles.track)}
        >
          <div {...stylex.props(styles.fill(angle))} />
        </div>
        <p>
          {pocket
            ? 'Your field note stays close when the phone is shut.'
            : 'Fold the device: this board follows the hinge and becomes a pocket card on the cover.'}
        </p>
      </section>
      {!pocket && (
        <div {...stylex.props(styles.details)}>
          <span>
            {view.display} · {view.placement}
          </span>
          <span>
            {view.width} × {view.height}
          </span>
          <span>{view.visible ? 'Visible' : 'Hidden'}</span>
        </div>
      )}
      <label {...stylex.props(styles.label)}>
        Field note
        <input
          aria-label="Field note"
          placeholder="One thing to remember…"
          value={note.value ?? ''}
          onChange={(event) => note.set(event.target.value)}
          {...stylex.props(styles.input)}
        />
      </label>
      <small role="status">
        {note.status === 'error'
          ? `Not saved: ${note.error}`
          : note.status === 'saving'
            ? 'Saving…'
            : note.status === 'hydrating'
              ? 'Loading…'
              : 'Saved in this app only'}
      </small>
    </main>
  )
}
const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingTop: 22,
    paddingInline: 26,
    paddingBottom: 42,
    fontFamily: fonts.system,
    color: colors.white,
    backgroundColor: colors.weatherNight,
    fontSize: 14
  },
  pocket: { paddingInline: 20, gap: 8 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    color: colors.cyan,
    fontSize: 9,
    letterSpacing: 1.5
  },
  title: { fontSize: 30, marginBlock: 0, fontWeight: 600 },
  board: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.weatherScrollRim,
    borderRadius: 20,
    paddingInline: 20,
    paddingBlock: 12,
    backgroundColor: colors.fillThin
  },
  mode: { fontSize: 15, marginBlock: 0 },
  angle: { fontSize: 74, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' },
  degrees: { color: colors.cyan, fontSize: 38 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.fillThick, overflow: 'hidden', marginBlock: 12 },
  fill: (angle: number) => ({ width: `${(angle / 180) * 100}%`, height: '100%', backgroundColor: colors.cyan }),
  details: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.grey3 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.weatherScrollRim,
    borderRadius: 10,
    paddingBlock: 10,
    paddingInline: 12,
    color: colors.white,
    backgroundColor: colors.fillThin,
    fontSize: 15
  }
})
await os.connect()
createRoot(document.body).render(<FoldCompass />)

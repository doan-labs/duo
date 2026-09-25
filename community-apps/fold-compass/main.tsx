import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import { useWide } from '@doan-labs/duo-uikit'
import { dark } from '@doan-labs/duo-uikit/styles.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { styles } from './styles.ts'

function FoldCompass() {
  const [root, wide] = useWide<HTMLElement>()
  // Each display keeps its own live hinge view; only the field note belongs in shared storage.
  const view = useSyncExternalStore(os.onView, () => os.view)
  const note = useKV(os.storage, 'field-note')
  const angle = Math.round(view.angle)
  const pocket = view.display === 'cover'
  const wideInner = wide && !pocket
  const mode = pocket ? 'Pocket card' : angle < 150 ? 'Folded workspace' : 'Desk board'

  useEffect(() => {
    // Signal readiness after React has committed the app's first frame.
    requestAnimationFrame(() => os.ready())
  }, [])

  return (
    <main
      ref={root}
      data-demo="fold-compass"
      data-display={view.display}
      data-angle={angle}
      {...stylex.props(dark, styles.root, pocket && styles.pocket, wideInner && styles.wide)}
    >
      <header {...stylex.props(styles.header)}>
        <span>INDEPENDENT APP</span>
        <span>{view.active ? 'ACTIVE DISPLAY' : 'MIRROR'}</span>
      </header>
      <h1 {...stylex.props(styles.title)}>Fold Compass</h1>
      <section {...stylex.props(styles.board, wideInner && styles.boardWide)}>
        <div {...stylex.props(styles.readout)}>
          <p {...stylex.props(styles.mode)}>{mode}</p>
          <div {...stylex.props(styles.angle, wideInner && styles.angleWide)}>
            {angle}
            <span {...stylex.props(styles.degrees)}>°</span>
          </div>
        </div>
        <div {...stylex.props(styles.gauge)}>
          <div aria-hidden="true" {...stylex.props(styles.track)}>
            <div {...stylex.props(styles.fill, styles.fillWidth(angle))} />
          </div>
          <p {...stylex.props(styles.description)}>
            {pocket
              ? 'Your field note stays close when the phone is shut.'
              : 'Fold the device: this board follows the hinge and becomes a pocket card on the cover.'}
          </p>
        </div>
      </section>
      {!pocket && (
        <div {...stylex.props(styles.details, wideInner && styles.detailsWide)}>
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
      <small role="status" {...stylex.props(styles.status)}>
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

await os.connect()
createRoot(document.body).render(<FoldCompass />)

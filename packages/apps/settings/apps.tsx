// Settings › Apps. Every app that was installed rather than baked into the
// shell, with what it is allowed to reach and the button that removes it. The
// rows come from the same `os.store` the App Store drives, so an install or a
// removal shows on both screens and on both displays at once.

import type { Os } from '@doan-labs/duo-sdk'
import type { Store, StoreRow } from '@doan-labs/duo-sdk/store.ts'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState, useSyncExternalStore } from 'react'
import { Glyph, Head, Hero, Link, Note, PERM_GLYPH, Row, Section, size, version } from './parts.tsx'
import { styles } from './styles.ts'

const LANE: Record<string, string> = {
  official: 'Duo catalog',
  community: 'Community',
  development: 'Local preview'
}

const useRows = (store: Store) => useSyncExternalStore(store.subscribe, store.snapshot).rows

const Icon = ({ row, big }: { row: StoreRow; big?: boolean }) => {
  const shape = big ? styles.appIconBig : styles.appIcon
  return row.icon ? (
    <img src={row.icon} alt="" {...stylex.props(shape)} />
  ) : (
    <span {...stylex.props(shape, typography.subheadline, styles.appLetter)}>{row.name.slice(0, 1)}</span>
  )
}

export function AppsPage({ os }: { os: Os }) {
  if (!os.store) return <Note>Apps are unavailable: this device has no storage to install into.</Note>
  return <Installed os={os} store={os.store} />
}

function Installed({ os, store }: { os: Os; store: Store }) {
  const rows = useRows(store).filter((row) => row.installed)
  const busy = rows.filter((row) => row.progress !== undefined)
  return (
    <>
      <Hero name="grid" bg={colors.indigo} title="Apps">
        Manage the apps installed on this Duo: what each one is allowed to reach, how much room it takes and whether it
        stays.
      </Hero>
      {rows.length === 0 ? (
        <Note>Nothing is installed yet. Open the App Store to get an app.</Note>
      ) : (
        <>
          <Head>
            {rows.length} installed · {size(rows.reduce((n, row) => n + (row.bytes ?? 0), 0))}
          </Head>
          <Section>
            {rows.map((row) => (
              <Link
                key={row.id}
                title={row.name}
                icon={<Icon row={row} />}
                label={row.name}
                subtitle={`${row.author} · ${size(row.bytes)}`}
                page={() => <Detail id={row.id} os={os} store={store} />}
              />
            ))}
          </Section>
        </>
      )}
      <Note>
        Only installed releases are listed. The rest of the home screen is baked into the shell itself and has nothing
        to uninstall. {busy.length > 0 && 'An app is being written to storage; its row updates when it settles.'}
      </Note>
    </>
  )
}

/**
 * One app. `id` rather than the row, so the page keeps following the store after
 * a removal starts and can say so instead of showing a stale snapshot.
 */
function Detail({ id, os, store }: { id: string; os: Os; store: Store }) {
  const row = useRows(store).find((r) => r.id === id)
  const [confirming, setConfirming] = useState(false)
  if (!row?.installed) return <Note>This app is no longer installed.</Note>
  const working = row.progress !== undefined
  const remove = () => void store.remove(row.id)
  return (
    <>
      <div {...stylex.props(shared.grp, styles.card, styles.hero)}>
        <Icon row={row} big />
        <div {...stylex.props(typography.title1)}>{row.name}</div>
        <div {...stylex.props(typography.body, styles.heroText)}>{row.author}</div>
      </div>
      <Section>
        <Row label="Version" detail={version(row.installed)} />
        <Row label="Size" detail={size(row.bytes)} />
        <Row label="Source" detail={LANE[row.lane] ?? row.lane} />
      </Section>
      <Head>Device access</Head>
      <Section>
        {row.permissions.length ? (
          row.permissions.map((name) => (
            <Row key={name} icon={<Glyph name={PERM_GLYPH[name] ?? 'lock'} bg={colors.blue} />} label={name} />
          ))
        ) : (
          <Row icon={<Glyph name="lock" bg={colors.grey} />} label="No device access" />
        )}
      </Section>
      <Note>
        {row.development
          ? 'A local preview. Removing it clears this preview’s private data.'
          : 'Runs in its own sandbox: no camera, no microphone, no embedded pages. Its storage never leaves this device.'}
      </Note>
      <Section>
        <button
          type="button"
          {...stylex.props(shared.row, styles.row, styles.action)}
          onClick={() => os.open(row.name)}
          disabled={working}
        >
          Open {row.name}
        </button>
        {row.recovery && (
          <button
            type="button"
            {...stylex.props(shared.row, styles.row, styles.action, working && styles.busy)}
            onClick={() => void store.restore(row.id)}
            disabled={working}
          >
            <Sym name="undo" size={15} />
            Restore previous version
          </button>
        )}
      </Section>
      {/* A preinstalled app reinstalls itself at the next start, so nothing offers to remove it. */}
      {row.preinstalled ? null : confirming ? (
        <>
          <Section>
            <button
              type="button"
              {...stylex.props(shared.row, styles.row, styles.destructive, working && styles.busy)}
              onClick={remove}
              disabled={working}
            >
              Delete “{row.name}”
            </button>
            <button
              type="button"
              {...stylex.props(shared.row, styles.row, styles.action, styles.centred)}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </Section>
          <Note>Deleting this app also deletes its data. Reinstalling starts it empty.</Note>
        </>
      ) : (
        <Section>
          <button
            type="button"
            {...stylex.props(shared.row, styles.row, styles.destructive, working && styles.busy)}
            onClick={() => setConfirming(true)}
            disabled={working}
          >
            <Sym name="trash" size={15} />
            Remove App
          </button>
        </Section>
      )}
      {row.error && <Note>{row.error}</Note>}
    </>
  )
}

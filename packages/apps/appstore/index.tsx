import type { Os } from '@doan-labs/ipduo-sdk'
import { PREVIEW_FEATURES } from '@doan-labs/ipduo-sdk/preview-features.ts'
import type { Store } from '@doan-labs/ipduo-sdk/store.ts'
import { LargeTitle, Screen } from '@doan-labs/ipduo-uikit'
import { colors } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState, useSyncExternalStore } from 'react'

export function AppStore({ os }: { os: Os }) {
  return os.store ? <Shelf store={os.store} open={os.open} /> : <p>Store unavailable</p>
}
function Shelf({ store, open }: { store: Store; open: Os['open'] }) {
  const state = useSyncExternalStore(store.subscribe, store.snapshot)
  const [tab, setTab] = useState('Apps')
  const [query, setQuery] = useState('')
  const [catalogUrl, setCatalogUrl] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const rows = state.rows.filter(
    (row) =>
      row.name.toLowerCase().includes(query.toLowerCase()) &&
      (tab !== 'Updates' || (row.installed && (row.version !== row.installed || row.failed || row.candidate)))
  )
  return (
    <Screen>
      <LargeTitle as="h1">App Store</LargeTitle>
      <nav aria-label="Store sections" {...stylex.props(styles.actions)}>
        {(PREVIEW_FEATURES.stageUpdates ? ['Apps', 'Updates'] : ['Apps']).map((name) => (
          <button key={name} type="button" aria-pressed={name === tab} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </nav>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setCatalogError('')
          void store.loadCatalog(catalogUrl).catch((error) => setCatalogError(String(error.message)))
        }}
      >
        <label>
          Developer catalog
          <input
            aria-label="Developer catalog URL"
            type="url"
            placeholder="http://localhost:5173/index.json"
            value={catalogUrl}
            onChange={(event) => setCatalogUrl(event.target.value)}
            required
          />
        </label>
        <button type="submit">Load catalog</button>
      </form>
      <p>Install a separately built app. Catalog hashes check downloads; they do not verify the publisher.</p>
      {catalogError && <p role="alert">{catalogError}</p>}
      <input
        aria-label="Search apps"
        placeholder="Search apps"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button
        type="button"
        onClick={() => {
          void store.refresh()
        }}
      >
        Refresh catalog
      </button>
      {state.loading && <p role="status">Loading catalog…</p>}
      {state.error && <p role="status">Catalog offline. Showing the last available releases.</p>}
      {rows.map((row) => (
        <section key={row.id} data-store-app={row.id} {...stylex.props(styles.row)}>
          <h2>
            {row.name} {row.lane === 'community' && <small>Community</small>}
          </h2>
          <p>
            {row.author} · {row.version?.split('+')[0] ?? 'Unavailable'}
          </p>
          <p>Can use: {row.permissions.join(', ') || 'none'}</p>
          {row.development && <p>Local preview. Remove App clears this preview’s private data.</p>}
          {row.error && <p role="alert">{row.error}</p>}
          {!row.compatible ? (
            <>
              <p>Requires a newer platform version</p>
              <button type="button" onClick={() => location.reload()}>
                Reload platform
              </button>
            </>
          ) : row.progress !== undefined ? (
            <progress aria-label={`Downloading ${row.name}`} value={row.progress} max={1} />
          ) : (
            <div {...stylex.props(styles.actions)}>
              {!row.installed ? (
                <button
                  type="button"
                  onClick={() => {
                    void store.install(row.id)
                  }}
                >
                  GET
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => open(row.id)}>
                    OPEN
                  </button>
                  {PREVIEW_FEATURES.stageUpdates &&
                    !row.development &&
                    (row.candidate ? (
                      <span>Updates when {row.name} closes</span>
                    ) : row.failed && (!row.version || row.version === row.failed || row.version === row.installed) ? (
                      <button
                        type="button"
                        onClick={() => {
                          void store.retry(row.id)
                        }}
                      >
                        Retry update
                      </button>
                    ) : (
                      row.version !== row.installed && (
                        <button
                          type="button"
                          onClick={() => {
                            void store.install(row.id)
                          }}
                        >
                          UPDATE
                        </button>
                      )
                    ))}
                  {row.recovery && (
                    <button
                      type="button"
                      onClick={() => {
                        void store.restore(row.id)
                      }}
                    >
                      Restore previous version
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      void store.remove(row.id)
                    }}
                  >
                    Remove App
                  </button>
                </>
              )}
            </div>
          )}
          {row.recovery && <p>Restore keeps newer edits aside; those edits may be missing in the previous version.</p>}
        </section>
      ))}
      {!state.loading && !rows.length && <p>No {tab === 'Updates' ? 'updates' : 'apps'} found.</p>}
    </Screen>
  )
}
const styles = stylex.create({
  row: { borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: colors.grey, paddingBlock: 16 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 12, paddingBlock: 8 }
})

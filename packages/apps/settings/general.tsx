// Settings › General, and the panes under it: About, Software Update, Duo
// Storage and the reset. Nothing here is a placeholder — the numbers come from
// the store and from `navigator.storage.estimate()`, and Erase All Content and
// Settings really does empty the device and reboot it.

import type { Os, SettingsHost } from '@doan-labs/duo-sdk'
import { HOST_SDK } from '@doan-labs/duo-sdk/compat.ts'
import type { Store } from '@doan-labs/duo-sdk/store.ts'
import { Row, Section } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { emptyStore, Glyph, Head, Hero, Link, Note, noStore, size } from './parts.tsx'
import { styles } from './styles.ts'

export const SOFTWARE = 'iOS 27.0'
const MODEL = 'iPhone Duo'
const STUDIO = 'https://doan-labs.com'
const SOURCE = 'https://github.com/doan-labs/iphoneduo'
/** One colour per app in the storage bar, reused round the list. */
const SEGMENTS = [colors.blue, colors.green, colors.orange, colors.purple, colors.teal, colors.settingsPink]

export function GeneralPage({ os, host }: { os: Os; host: SettingsHost }) {
  return (
    <>
      <Hero name="gear" bg={colors.grey} title="General">
        Manage this Duo’s overall setup: what it is running, how much room it has left, and what it takes to put it back
        the way it shipped.
      </Hero>
      <Section>
        <Link
          title="About"
          icon={<Glyph name="iphone" bg={colors.grey} />}
          label="About"
          page={() => <AboutPage os={os} host={host} />}
        />
        <Link
          title="Software Update"
          icon={<Glyph name="gear" bg={colors.grey} />}
          label="Software Update"
          page={() => <UpdatePage />}
        />
        <Link
          title="Duo Storage"
          icon={<Glyph name="folder" bg={colors.grey} />}
          label="Duo Storage"
          page={() => <StoragePage store={os.store} />}
        />
      </Section>
      <Section>
        <Link
          title="Transfer or Reset iPhone"
          icon={<Glyph name="undo" bg={colors.grey} />}
          label="Transfer or Reset iPhone"
          page={() => <ResetPage host={host} />}
        />
      </Section>
      <Note>
        Transfer or Reset holds the only destructive action on this device. Everything it clears lives in this browser;
        nothing is sent anywhere.
      </Note>
    </>
  )
}

function AboutPage({ os, host }: { os: Os; host: SettingsHost }) {
  const rows = useSyncExternalStore(
    os.store?.subscribe ?? noStore,
    os.store?.snapshot ?? emptyStore,
    os.store?.snapshot ?? emptyStore
  ).rows
  const installed = rows.filter((row) => row.installed)
  const estimate = useEstimate()
  return (
    <>
      <Section>
        <Row label="Name" detail={MODEL} />
        <Row label="Software Version" detail={SOFTWARE} />
        <Row label="Model Name" detail={MODEL} />
        <Row label="Platform SDK" detail={HOST_SDK} />
      </Section>
      <Section>
        <Row label="Apps" detail={String(installed.length)} />
        <Row label="Used" detail={estimate ? size(estimate.usage) : 'Measuring…'} />
        <Row label="Available" detail={estimate ? size(estimate.free) : 'Measuring…'} />
      </Section>
      <Note>
        Capacity is whatever this browser is willing to give the origin, not a fixed disk. It moves as the browser
        recalculates its quota.
      </Note>
      <Head>Made by</Head>
      <Section>
        <button type="button" {...stylex.props(shared.row, styles.action)} onClick={() => host.openExternal(STUDIO)}>
          <Sym name="globe" size={15} />
          Doan Labs
        </button>
        <button type="button" {...stylex.props(shared.row, styles.action)} onClick={() => host.openExternal(SOURCE)}>
          <Sym name="document" size={15} />
          Source on GitHub
        </button>
      </Section>
      <Note>
        A study of Apple’s folding iPhone, built from the published model and the hands-on footage. Not an Apple product
        and not affiliated with Apple.
      </Note>
    </>
  )
}

function UpdatePage() {
  return (
    <>
      <Hero name="gear" bg={colors.grey} title={SOFTWARE}>
        {MODEL} is up to date.
      </Hero>
      <Note>
        This device ships with the shell it was built from; there is no update server behind it. A new build arrives by
        reloading the page. Installed apps update from the App Store instead.
      </Note>
    </>
  )
}

function StoragePage({ store }: { store?: Store }) {
  const rows = useSyncExternalStore(
    store?.subscribe ?? noStore,
    store?.snapshot ?? emptyStore,
    store?.snapshot ?? emptyStore
  )
    .rows.filter((row) => row.installed && row.bytes)
    .sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0))
  const estimate = useEstimate()
  const apps = rows.reduce((n, row) => n + (row.bytes ?? 0), 0)
  // The bar divides what is used, not the quota: a browser hands out gigabytes
  // and a release is tens of kilobytes, so against the quota every app is one
  // invisible sliver. Against the usage the split is the information.
  const used = Math.max(estimate?.usage ?? 0, apps)
  const other = used - apps
  return (
    <>
      <div {...stylex.props(shared.grp, styles.measure)}>
        <div {...stylex.props(styles.heroTitle)}>{estimate ? size(estimate.usage) : '—'}</div>
        <div {...stylex.props(styles.heroText)}>
          used of {estimate ? size(estimate.quota) : '—'} this browser allows
        </div>
        <div {...stylex.props(styles.bar)}>
          {used > 0 && (
            <>
              {rows.map((row, i) => (
                <span
                  key={row.id}
                  {...stylex.props(styles.seg(SEGMENTS[i % SEGMENTS.length]!, ((row.bytes ?? 0) / used) * 100))}
                />
              ))}
              <span {...stylex.props(styles.seg(colors.grey3, (other / used) * 100))} />
            </>
          )}
        </div>
        <div {...stylex.props(styles.legend)}>
          {rows.map((row, i) => (
            <span key={row.id} {...stylex.props(styles.key)}>
              <span {...stylex.props(styles.dot, styles.tint(SEGMENTS[i % SEGMENTS.length]!))} />
              {row.name}
            </span>
          ))}
          <span {...stylex.props(styles.key)}>
            <span {...stylex.props(styles.dot, styles.tint(colors.grey3))} />
            Shell and app data · {size(other)}
          </span>
        </div>
      </div>
      <Head>Installed apps · {size(apps)}</Head>
      <Section>
        {rows.length ? (
          rows.map((row) => <Row key={row.id} label={row.name} subtitle={row.author} detail={size(row.bytes)} />)
        ) : (
          <Row label="No installed apps" />
        )}
      </Section>
      <Note>
        App sizes are the release bytes this device downloaded. The rest of the measured total is the shell’s own cache
        and the data each app has written since.
      </Note>
    </>
  )
}

function ResetPage({ host }: { host: SettingsHost }) {
  const [confirming, setConfirming] = useState(false)
  const [erasing, setErasing] = useState(false)
  const [error, setError] = useState('')
  return (
    <>
      <Section>
        <button
          type="button"
          {...stylex.props(shared.row, styles.destructive, erasing && styles.busy)}
          onClick={() => setConfirming(true)}
          disabled={erasing || confirming}
        >
          <Sym name="trash" size={15} />
          Erase All Content and Settings
        </button>
      </Section>
      <Note>
        This removes every installed app and its data, the home screen you arranged, the wallpaper you chose and the
        notes, places and settings each app saved. The device restarts and reinstalls the apps it ships with, exactly as
        a first visit does.
      </Note>
      {confirming && (
        <>
          <Section>
            <button
              type="button"
              {...stylex.props(shared.row, styles.destructive, erasing && styles.busy)}
              disabled={erasing}
              onClick={() => {
                setErasing(true)
                setError('')
                host.erase().catch((reason: unknown) => {
                  setErasing(false)
                  setError(String(reason))
                })
              }}
            >
              {erasing ? 'Erasing…' : `Erase ${MODEL}`}
            </button>
            <button
              type="button"
              {...stylex.props(shared.row, styles.action, styles.centred)}
              disabled={erasing}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </Section>
          <Note>This cannot be undone. The page reloads as soon as the device is empty.</Note>
        </>
      )}
      {error && <Note>Erase failed: {error}</Note>}
    </>
  )
}

/** `navigator.storage.estimate()`, measured once per mount. Undefined until it answers. */
function useEstimate() {
  const [value, setValue] = useState<{ usage: number; quota: number; free: number }>()
  useEffect(() => {
    let live = true
    navigator.storage
      ?.estimate?.()
      .then(({ usage = 0, quota = 0 }) => {
        if (live) setValue({ usage, quota, free: Math.max(0, quota - usage) })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])
  return value
}

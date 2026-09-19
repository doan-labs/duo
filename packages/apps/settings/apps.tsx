// Settings › Apps. Every app that was installed rather than baked into the
// shell, with what it is allowed to reach and the button that removes it. The
// rows come from the same `os.store` the App Store drives, so an install or a
// removal shows on both screens and on both displays at once.

import type { Os, SettingsHost } from '@doan-labs/duo-sdk'
import type { Store, StoreRow } from '@doan-labs/duo-sdk/store.ts'
import { Row, Section } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Glyph, Head, Hero, Link, Note, PERM_GLYPH, size, version } from './parts.tsx'
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
    <span {...stylex.props(shape, styles.appLetter)}>{row.name.slice(0, 1)}</span>
  )
}

// Easter egg: Flappy Duo charges a deletion fee through its own Pay sheet, and
// the payment never quite settles. Each receipt is followed by another sheet
// for the same fee under a new name; the last one gives up and deletes for
// free so the app stays removable. The sheet is the game's, beat for beat.
const FLAPPY = 'com.mnismt.duo.flappyduo'
const FEE = '$9.99'
const FEES = ['Deletion fee', 'Retry surcharge', 'Declined by duck', 'Convenience fee', 'Final offer']

function PaySheet({ host, onDone, onCancel }: { host: SettingsHost; onDone: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(0)
  const [pay, setPay] = useState<'sheet' | 'processing' | 'done'>('sheet')
  const dim = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(0)
  // The page body scrolls; the dim pins to what is on screen and the body holds still under it.
  useLayoutEffect(() => {
    const body = dim.current?.offsetParent as HTMLElement | null
    if (!body) return
    setTop(body.scrollTop)
    const overflow = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = overflow
    }
  }, [])
  // The frame's side button pays while the sheet is up, else Wallet gets the double-click.
  useEffect(() => {
    if (pay !== 'sheet') return
    return host.claimSide(() => {
      setPay('processing')
      return true
    })
  }, [pay, host])
  useEffect(() => {
    if (pay === 'sheet') return
    const id = window.setTimeout(
      () => {
        if (pay === 'processing') return setPay('done')
        if (step + 1 >= FEES.length) return onDone()
        setStep(step + 1)
        setPay('sheet')
      },
      pay === 'processing' ? 1100 : 1400
    )
    return () => clearTimeout(id)
  }, [pay, step, onDone])
  const label = FEES[step] ?? FEES[0]
  return (
    <div ref={dim} {...stylex.props(styles.payDim, styles.payTop(top))}>
      <section role="dialog" aria-label="Duo Pay" {...stylex.props(styles.paySheet)}>
        <div {...stylex.props(styles.payHead)}>
          <strong {...stylex.props(styles.payMark)}> Pay</strong>
          {pay === 'sheet' && (
            <button type="button" onClick={onCancel} {...stylex.props(styles.payCancel)}>
              Cancel
            </button>
          )}
        </div>
        <div {...stylex.props(styles.payCardRow)}>
          <span {...stylex.props(styles.payCard)} />
          <span {...stylex.props(styles.payCardText)}>
            <strong>Doan Labs Card</strong>
            <span>(•••• 2399)</span>
          </span>
          <span {...stylex.props(styles.payChev)}>›</span>
        </div>
        <div {...stylex.props(styles.payRow)}>
          <span {...stylex.props(styles.payKey)}>To Duo Store</span>
          <span {...stylex.props(styles.payValue)}>{FEE}</span>
        </div>
        <div {...stylex.props(styles.payRow, styles.payLast)}>
          <span {...stylex.props(styles.payKey)}>{label}</span>
          <span {...stylex.props(styles.payValue)}>{step ? 'Payment failed' : 'Required'}</span>
        </div>
        {pay === 'sheet' && (
          <button type="button" onClick={() => setPay('processing')} {...stylex.props(styles.payFace)}>
            <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true" {...stylex.props(styles.payGlyph)}>
              <g fill="none" stroke="#0a84ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 22V12a6 6 0 0 1 6-6h10M42 6h10a6 6 0 0 1 6 6v10M58 42v10a6 6 0 0 1-6 6H42M22 58H12a6 6 0 0 1-6-6V42" />
                <path d="M22 26v6M42 26v6M32 26v12h-4" />
                <path d="M22 42c3 4 7 5 10 5s7-1 10-5" />
              </g>
            </svg>
            <span {...stylex.props(styles.payLabel)}>Face ID</span>
            <span {...stylex.props(styles.payHint)}>Double-click side button to pay</span>
          </button>
        )}
        {pay === 'processing' && (
          <div {...stylex.props(styles.payFace)}>
            <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true" {...stylex.props(styles.paySpin)}>
              <circle cx="32" cy="32" r="26" fill="none" stroke="#d1d1d6" strokeWidth="4" />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="#0a84ff"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="40 124"
              />
            </svg>
            <span {...stylex.props(styles.payLabel)}>Processing…</span>
            <span {...stylex.props(styles.payHint, styles.payStill)}>Do not fold the device during processing</span>
          </div>
        )}
        {pay === 'done' && (
          <div {...stylex.props(styles.payFace)}>
            <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true" {...stylex.props(styles.payPop)}>
              <defs>
                <linearGradient id="okg-settings" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0a84ff" />
                  <stop offset="1" stopColor="#30d158" />
                </linearGradient>
              </defs>
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="url(#okg-settings)"
                strokeWidth="4"
                strokeLinecap="round"
                pathLength="100"
                {...stylex.props(styles.payRing)}
              />
              <path
                d="M20 33l8 8 16-17"
                fill="none"
                stroke="url(#okg-settings)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="100"
                {...stylex.props(styles.payTick)}
              />
            </svg>
            <span {...stylex.props(styles.payLabel)}>Done</span>
            <span {...stylex.props(styles.payHint, styles.payStill)}>
              {step + 1 >= FEES.length ? 'Fine. Deleting for free.' : 'Charged to Doan Labs Card'}
            </span>
          </div>
        )}
      </section>
    </div>
  )
}

export function AppsPage({ os, host }: { os: Os; host: SettingsHost }) {
  if (!os.store) return <Note>Apps are unavailable: this device has no storage to install into.</Note>
  return <Installed os={os} host={host} store={os.store} />
}

function Installed({ os, host, store }: { os: Os; host: SettingsHost; store: Store }) {
  const rows = useRows(store).filter((row) => row.installed)
  const busy = rows.filter((row) => row.progress !== undefined)
  return (
    <>
      <Hero name="grid" bg={colors.settingsIndigo} title="Apps">
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
                page={() => <Detail id={row.id} os={os} host={host} store={store} />}
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
function Detail({ id, os, host, store }: { id: string; os: Os; host: SettingsHost; store: Store }) {
  const row = useRows(store).find((r) => r.id === id)
  const [confirming, setConfirming] = useState(false)
  const [paying, setPaying] = useState(false)
  if (!row?.installed) return <Note>This app is no longer installed.</Note>
  const working = row.progress !== undefined
  const remove = () => void store.remove(row.id)
  return (
    <>
      {paying && <PaySheet host={host} onDone={remove} onCancel={() => setPaying(false)} />}
      <div {...stylex.props(shared.grp, styles.hero)}>
        <Icon row={row} big />
        <div {...stylex.props(styles.heroTitle)}>{row.name}</div>
        <div {...stylex.props(styles.heroText)}>{row.author}</div>
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
          {...stylex.props(shared.row, styles.action)}
          onClick={() => os.open(row.name)}
          disabled={working}
        >
          Open {row.name}
        </button>
        {row.recovery && (
          <button
            type="button"
            {...stylex.props(shared.row, styles.action, working && styles.busy)}
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
              {...stylex.props(shared.row, styles.destructive, working && styles.busy)}
              onClick={row.id === FLAPPY ? () => setPaying(true) : remove}
              disabled={working}
            >
              Delete “{row.name}”
            </button>
            <button
              type="button"
              {...stylex.props(shared.row, styles.action, styles.centred)}
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
            {...stylex.props(shared.row, styles.destructive, working && styles.busy)}
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

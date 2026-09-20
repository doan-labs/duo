// The pieces every list in the Store shares: the icon tile, the GET / OPEN
// capsule and the app row. The capsule is the only place a release's lifecycle
// is read, so install, update, retry and the download ring resolve once.

import { art } from '@doan-labs/duo-fixtures'
import type { Os } from '@doan-labs/duo-sdk'
import { PREVIEW_FEATURES } from '@doan-labs/duo-sdk/preview-features.ts'
import type { Store, StoreRow } from '@doan-labs/duo-sdk/store.ts'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { styles } from './styles.ts'

export type Open = Os['open']
export type External = (url: string) => void

/** Permission labels come from the runtime; the glyph is ours. */
export const PERM_GLYPH: Record<string, SymProps['name']> = {
  Location: 'location',
  Photos: 'grid',
  'Read clipboard': 'note',
  'Write clipboard': 'compose'
}

export const size = (bytes?: number) =>
  bytes === undefined
    ? 'Unknown'
    : bytes < 1e6
      ? `${Math.max(1, Math.round(bytes / 1e3))} KB`
      : `${(bytes / 1e6).toFixed(1)} MB`
export const version = (row: StoreRow) => (row.installed ?? row.version)?.split('+')[0] ?? 'Unavailable'
export const hasUpdate = (row: StoreRow) =>
  PREVIEW_FEATURES.stageUpdates && !!row.installed && !row.development && !!row.version && row.version !== row.installed
export const needsRetry = (row: StoreRow) =>
  !!row.failed && (!row.version || row.version === row.failed || row.version === row.installed)

/** What a row says under its name: what it reaches for, or that it reaches for nothing. */
export const tagline = (row: StoreRow) =>
  row.permissions.length ? `Uses ${row.permissions.join(', ').toLowerCase()}` : 'Sandboxed, no device access'

/**
 * The editorial kicker over a Today card: whatever this release most needs said
 * about it, falling back to where it came from. Installed is left to the capsule,
 * which already says OPEN rather than GET.
 */
export const kicker = (row: StoreRow, lead = false) =>
  !row.compatible
    ? 'Needs a newer Duo'
    : hasUpdate(row)
      ? 'Update available'
      : row.development
        ? 'Local preview'
        : lead
          ? 'Featured today'
          : row.lane === 'community'
            ? 'From the community'
            : 'From Doan Labs'

export function Icon({ row, xstyle }: { row: StoreRow; xstyle?: stylex.StyleXStyles }) {
  return row.icon ? (
    <img src={row.icon} alt="" {...stylex.props(styles.icon, xstyle)} />
  ) : (
    <span aria-hidden="true" {...stylex.props(styles.icon, styles.iconArt(art(row.name)), xstyle)}>
      {row.name[0]}
    </span>
  )
}

/** GET, OPEN, UPDATE, Retry update, a download ring or a reload prompt, whatever the row is in. */
export function Action({ row, store, open, light }: { row: StoreRow; store: Store; open: Open; light?: boolean }) {
  const pill = (label: string, onClick: () => void, filled = false) => (
    <button
      type="button"
      onClick={onClick}
      {...stylex.props(styles.pill, filled && styles.pillFilled, light && !filled && styles.pillLight)}
    >
      {label}
    </button>
  )
  if (!row.compatible)
    return (
      <div {...stylex.props(styles.action)}>
        {pill('Reload platform', () => location.reload())}
        <span {...stylex.props(styles.pct)}>Needs a newer Duo</span>
      </div>
    )
  if (row.progress !== undefined)
    return (
      <div {...stylex.props(styles.action)}>
        <div
          role="progressbar"
          aria-label={`Downloading ${row.name}`}
          aria-valuenow={Math.round(row.progress * 100)}
          {...stylex.props(styles.ring(row.progress))}
        >
          <i {...stylex.props(styles.ringHole)} />
          <i {...stylex.props(styles.ringStop)} />
        </div>
        <span {...stylex.props(styles.pct)}>{Math.round(row.progress * 100)}%</span>
      </div>
    )
  if (!row.installed)
    return (
      <div {...stylex.props(styles.action)}>
        {pill(
          'GET',
          () => {
            void store.install(row.id)
          },
          true
        )}
        <span {...stylex.props(styles.pct)}>{size(row.bytes)}</span>
      </div>
    )
  if (PREVIEW_FEATURES.stageUpdates && !row.development && needsRetry(row))
    return (
      <div {...stylex.props(styles.action)}>
        {pill('Retry update', () => {
          void store.retry(row.id)
        })}
      </div>
    )
  if (hasUpdate(row) && !row.candidate)
    return (
      <div {...stylex.props(styles.action)}>
        {pill(
          'UPDATE',
          () => {
            void store.install(row.id)
          },
          true
        )}
        <span {...stylex.props(styles.pct)}>{row.version?.split('+')[0]}</span>
      </div>
    )
  return <div {...stylex.props(styles.action)}>{pill('OPEN', () => open(row.id))}</div>
}

/** Error and staged-update notices under a row; Restore lives on the app page. */
export function Notices(row: StoreRow): ReactNode {
  const parts: ReactNode[] = []
  if (row.error)
    parts.push(
      <span key="e" role="alert" {...stylex.props(styles.alert)}>
        {row.error}
      </span>
    )
  if (row.candidate && !row.development)
    parts.push(
      <span key="c" {...stylex.props(styles.note)}>
        Updates when {row.name} closes
      </span>
    )
  return parts.length ? parts : null
}

/** One catalog row: icon, name, what it reaches for, and the capsule. */
export function Item({ row, store, open, onShow }: { row: StoreRow; store: Store; open: Open; onShow: () => void }) {
  const notes = Notices(row)
  return (
    <div data-store-app={row.id} {...stylex.props(styles.item)}>
      <div {...stylex.props(styles.itemRow)}>
        <button
          type="button"
          onClick={onShow}
          aria-label={`${row.name} details`}
          {...stylex.props(styles.bare, shared.press)}
        >
          <Icon row={row} />
        </button>
        <button type="button" onClick={onShow} {...stylex.props(styles.info, styles.bare)}>
          <span {...stylex.props(styles.name)}>{row.name}</span>
          <span {...stylex.props(styles.sub)}>
            {row.author} · {version(row)}
          </span>
          {/* No lane chip: every group is one lane and its heading already says which. */}
          {(row.development || row.permissions.length > 0) && (
            <span {...stylex.props(styles.perms)}>
              {row.development && <span {...stylex.props(styles.tag, styles.tagDev)}>DEV</span>}
              {row.permissions.map((p) => (
                <span key={p} title={p} {...stylex.props(styles.tag)}>
                  <Sym name={PERM_GLYPH[p] ?? 'lock'} size={10} />
                  {p}
                </span>
              ))}
            </span>
          )}
        </button>
        <Action row={row} store={store} open={open} />
      </div>
      {notes && <div {...stylex.props(styles.itemTail)}>{notes}</div>}
    </div>
  )
}

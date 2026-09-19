// The pieces every Settings pane uses: the coloured glyph square, a row that
// pushes a page, the pane header iOS puts above a group, and the two formatters.

import type { SettingsHost } from '@doan-labs/duo-sdk'
import { Page, Row, type RowProps, useNav } from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useSyncExternalStore } from 'react'
import { styles } from './styles.ts'

/** The runtime names a permission; the glyph is ours, as in the Store. */
export const PERM_GLYPH: Record<string, SymProps['name']> = {
  Location: 'location',
  Photos: 'grid',
  'Read clipboard': 'note',
  'Write clipboard': 'compose'
}

/** The tinted rounded square that opens a Settings row. */
export const Glyph = ({ name, bg }: { name: SymProps['name']; bg: string }) => (
  <span {...stylex.props(shared.rowIc, styles.tint(bg))}>
    <Sym name={name} size={17} />
  </span>
)

/**
 * A row that pushes a pane. `page` is called at the push, not at render, so the
 * pane subscribes to its own data and keeps updating behind the chevron — a
 * node captured here would freeze at whatever the list held when it was drawn.
 */
export function Link({
  title,
  page,
  ...rest
}: { title: string; page: () => ReactNode } & Omit<RowProps<'button'>, 'as' | 'onClick' | 'children'>) {
  const { push } = useNav()
  return (
    <Row
      as="button"
      chevron
      xstyle={styles.link}
      {...rest}
      onClick={() =>
        push((back) => (
          <Page title={title} back={back}>
            {page()}
          </Page>
        ))
      }
    />
  )
}

/** iOS's pane header: the glyph at size, the pane's name and what it covers. */
export const Hero = ({
  name,
  bg,
  title,
  children
}: {
  name: SymProps['name']
  bg: string
  title: string
  children: ReactNode
}) => (
  <div {...stylex.props(shared.grp, styles.hero)}>
    <span {...stylex.props(styles.heroIcon, styles.tint(bg))}>
      <Sym name={name} size={34} />
    </span>
    <div {...stylex.props(typography.title1)}>{title}</div>
    <div {...stylex.props(typography.body, styles.heroText)}>{children}</div>
  </div>
)

/** The grey line under a group that says what it does, or what it cannot do. */
export const Note = ({ children }: { children: ReactNode }) => (
  <p {...stylex.props(shared.sub, styles.note)}>{children}</p>
)

/** Uppercase group heading. */
export const Head = ({ children }: { children: ReactNode }) => (
  <div {...stylex.props(typography.footnote, styles.head)}>{children}</div>
)

/**
 * Same rounding as the Store for a release, with a GB step above it: a browser
 * quota runs to ten figures of megabytes and reads as noise.
 */
export const size = (bytes?: number) =>
  bytes === undefined
    ? '—'
    : bytes < 1e6
      ? `${Math.max(1, Math.round(bytes / 1e3))} KB`
      : bytes < 1e9
        ? `${(bytes / 1e6).toFixed(1)} MB`
        : `${(bytes / 1e9).toFixed(1)} GB`

/** Build metadata is the release identity, not the version a reader wants. */
export const version = (value?: string) => value?.split('+')[0] ?? 'Unavailable'

/** The device switches, re-rendering the caller on every flip from either display. */
export function useSwitches(host: SettingsHost) {
  useSyncExternalStore(host.subscribe, host.revision, host.revision)
  return host.switches
}

// A device with no storage still renders. Module level, not inline: a fresh
// function identity per render makes useSyncExternalStore re-subscribe forever.
const EMPTY = { rows: [], loading: false, source: '', developer: false }
export const noStore = () => () => {}
export const emptyStore = () => EMPTY

// The pieces every Settings pane uses: the coloured glyph square, a row that
// pushes a page, the pane header iOS puts above a group, and the two formatters.
//
// `Row` and `Section` re-wrap the kit's with iPadOS geometry - a 44 px row and a
// rounder card - so no pane has to say so at the call site. Every Settings file
// imports both from here rather than from the kit.

import type { SettingsHost } from '@doan-labs/duo-sdk'
import {
  Row as KitRow,
  Section as KitSection,
  Page,
  type RowProps,
  type SectionProps,
  useNav
} from '@doan-labs/duo-uikit'
import { shared, typography } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import * as stylex from '@stylexjs/stylex'
import type { ElementType, ReactNode } from 'react'
import { useSyncExternalStore } from 'react'
import { styles } from './styles.ts'

/**
 * One row of the root list: a sidebar destination when the display is unfolded,
 * a pushing row when it is not. `page` is what the detail pane shows; a row
 * without one is read-only, the way Battery only reports a level.
 */
export type Dest = {
  id: string
  label: string
  glyph: SymProps['name']
  tint: string
  /** Trailing value, as iOS names the joined network beside Wi-Fi. */
  detail?: ReactNode
  /** A switch in place of the chevron. The row stops being a destination. */
  control?: ReactNode
  page?: () => ReactNode
}
/** Rows the list keeps together, and the line iOS prints under them. */
export type Group = { rows: Dest[]; note?: ReactNode }

/** The runtime names a permission; the glyph is ours, as in the Store. */
export const PERM_GLYPH: Record<string, SymProps['name']> = {
  Location: 'location',
  Photos: 'grid',
  'Read clipboard': 'note',
  'Write clipboard': 'compose'
}

/** The kit's grouped row at the 44 px iPadOS gives it, whatever it carries. */
export function Row<T extends ElementType = 'div'>({ xstyle, ...rest }: RowProps<T>) {
  const props = rest as RowProps<T>
  return <KitRow {...props} xstyle={[styles.row, props.icon != null && styles.rowGlyph, xstyle]} />
}

/** The kit's inset group on iPadOS's larger corner. */
export function Section<T extends ElementType = 'div'>({ xstyle, ...rest }: SectionProps<T>) {
  return <KitSection {...(rest as SectionProps<T>)} xstyle={[styles.card, xstyle]} />
}

/** The tinted rounded square that opens a Settings row. */
export const Glyph = ({ name, bg }: { name: SymProps['name']; bg: string }) => (
  <span {...stylex.props(shared.rowIc, styles.tint(bg))}>
    <Sym name={name} size={17} />
  </span>
)

/**
 * A row that pushes a pane. `page` is called at the push, not at render, so the
 * pane subscribes to its own data and keeps updating behind the chevron: a node
 * captured here would freeze at whatever the list held when it was drawn.
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
  <div {...stylex.props(shared.grp, styles.card, styles.hero)}>
    <span {...stylex.props(styles.heroIcon, styles.tint(bg))}>
      <Sym name={name} size={32} />
    </span>
    <div {...stylex.props(typography.title2)}>{title}</div>
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

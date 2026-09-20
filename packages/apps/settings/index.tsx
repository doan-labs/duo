// Settings. Every row does something: the radios flip the same device store
// Control Center flips and the status stacks read, Apps removes real installed
// releases, and General › Transfer or Reset empties the database and reboots.
// Apple's root list is longer: the panes with nothing behind them are simply
// not here, rather than drawn and dead.
//
// Unfolded, the root list is a sidebar and the selected pane fills the rest,
// the way iPadOS splits it. Folded, the same list pushes. `rootList` is written
// once for both, so a row is never described twice.

import type { Os, SettingsHost, Switches } from '@doan-labs/duo-sdk'
import { Nav, Page, Toggle } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym, type SymProps } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { Fragment, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AppsPage } from './apps.tsx'
import { GeneralPage, SOFTWARE } from './general.tsx'
import {
  type Dest,
  emptyStore,
  Glyph,
  type Group,
  Hero,
  Link,
  Note,
  noStore,
  PERM_GLYPH,
  Row,
  Section,
  useSwitches
} from './parts.tsx'
import { Sidebar } from './sidebar.tsx'
import { styles } from './styles.ts'

/** The width iPadOS shows two columns at; the cover display stays under it. */
const SPLIT = 600

export function Settings({ os, host }: { os: Os; host: SettingsHost }) {
  const root = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => setWide(entry!.contentRect.width > SPLIT))
    ro.observe(root.current!)
    return () => ro.disconnect()
  }, [])
  const [picked, setPicked] = useState('general')
  const groups = rootList(os, host, useSwitches(host))
  const current = groups.flatMap((group) => group.rows).find((row) => row.id === picked)
  return (
    <div ref={root} {...stylex.props(styles.split)}>
      {wide && <Sidebar groups={groups} current={picked} pick={setPicked} />}
      <div {...stylex.props(styles.detail)}>
        {wide ? (
          // Keyed: switching destination drops whatever the last one had pushed,
          // and the fresh mount replays the fade the swap reads as.
          <Nav key={picked}>
            <div {...stylex.props(shared.column)}>
              <div {...stylex.props(shared.body, styles.pane, shared.swap)}>{current?.page?.()}</div>
            </div>
          </Nav>
        ) : (
          <Nav>
            <Page title="Settings">
              <Folded groups={groups} />
            </Page>
          </Nav>
        )}
      </div>
    </div>
  )
}

/**
 * The root list, once. The sidebar draws it as destinations and the folded page
 * draws it as pushing rows; `page` is called at the selection either way, so a
 * pane subscribes to its own data rather than freezing at render.
 */
function rootList(os: Os, host: SettingsHost, sw: Switches): Group[] {
  return [
    {
      rows: [
        {
          id: 'airplane',
          label: 'Airplane Mode',
          glyph: 'airplane',
          tint: colors.orange,
          control: (
            <Toggle
              aria-label="Airplane Mode"
              checked={sw.airplane}
              onChange={() => host.flip('airplane')}
              xstyle={styles.sw}
            />
          )
        },
        {
          id: 'wifi',
          label: 'Wi‑Fi',
          glyph: 'wifi',
          tint: colors.blue,
          detail: sw.wifi ? host.network : 'Off',
          page: () => (
            <Radio host={host} name="wifi" label="Wi‑Fi" glyph="wifi" tint={colors.blue}>
              <Section>
                <Row
                  icon={<Glyph name="wifi" bg={colors.blue} />}
                  label={host.network}
                  detail={<Sym name="check" size={15} />}
                />
              </Section>
              <Note>One network, and no radio to scan with. The status stacks on both displays name this one.</Note>
            </Radio>
          )
        },
        {
          id: 'bt',
          label: 'Bluetooth',
          glyph: 'bluetooth',
          tint: colors.blue,
          detail: sw.bt ? 'On' : 'Off',
          page: () => (
            <Radio host={host} name="bt" label="Bluetooth" glyph="bluetooth" tint={colors.blue}>
              <Note>No devices are paired, and nothing here can pair one.</Note>
            </Radio>
          )
        },
        {
          id: 'cell',
          label: 'Cellular',
          glyph: 'antenna',
          tint: colors.green,
          detail: sw.cell ? 'On' : 'Off',
          page: () => (
            <Radio host={host} name="cell" label="Cellular Data" glyph="antenna" tint={colors.green}>
              <Note>No SIM is installed. The bars in the status stack follow this switch.</Note>
            </Radio>
          )
        }
      ],
      note: 'Airplane Mode drags the three radios down with it, as it does in Control Center.'
    },
    {
      rows: [
        {
          id: 'general',
          label: 'General',
          glyph: 'gear',
          tint: colors.grey,
          detail: SOFTWARE,
          page: () => <GeneralPage os={os} host={host} />
        },
        { id: 'battery', label: 'Battery', glyph: 'battery', tint: colors.green, detail: `${host.battery}%` },
        {
          id: 'privacy',
          label: 'Privacy & Security',
          glyph: 'privacy',
          tint: colors.blue,
          page: () => <PrivacyPage os={os} />
        }
      ]
    },
    {
      rows: [{ id: 'apps', label: 'Apps', glyph: 'grid', tint: colors.indigo, page: () => <AppsPage os={os} /> }]
    }
  ]
}

/** The folded root: the account card, then every group as an inset section. */
function Folded({ groups }: { groups: Group[] }) {
  return (
    <>
      <Section>
        <Row
          icon={
            <span {...stylex.props(shared.rowIc, styles.tint(colors.grey), styles.avatar)}>
              <Sym name="person" size={26} />
            </span>
          }
          label="Apple Account"
          subtitle="Sign in to use iCloud, the App Store and more"
          xstyle={styles.accountRow}
        />
      </Section>
      <Note>Nothing signs in here. The App Store installs without an account.</Note>
      {groups.map((group, i) => (
        // Positional: the root list is written out above, not keyed data, and never reorders.
        // biome-ignore lint/suspicious/noArrayIndexKey: the groups are literal
        <Fragment key={i}>
          <Section>
            {group.rows.map((row) => (
              <FoldedRow key={row.id} dest={row} />
            ))}
          </Section>
          {group.note && <Note>{group.note}</Note>}
        </Fragment>
      ))}
    </>
  )
}

const FoldedRow = ({ dest }: { dest: Dest }) => {
  const icon = <Glyph name={dest.glyph} bg={dest.tint} />
  return dest.page ? (
    <Link title={dest.label} icon={icon} label={dest.label} detail={dest.detail} page={dest.page} />
  ) : (
    <Row icon={icon} label={dest.label} detail={dest.detail}>
      {dest.control}
    </Row>
  )
}

/** Wi-Fi, Bluetooth and Cellular are the same pane: one switch, then whatever it has to show. */
function Radio({
  host,
  name,
  label,
  glyph,
  tint,
  children
}: {
  host: SettingsHost
  name: keyof typeof ABOUT
  label: string
  glyph: SymProps['name']
  tint: string
  children: ReactNode
}) {
  const sw = useSwitches(host)
  return (
    <>
      <Hero name={glyph} bg={tint} title={label}>
        {ABOUT[name]}
      </Hero>
      <Section>
        <Row label={label}>
          <Toggle aria-label={label} checked={sw[name]} onChange={() => host.flip(name)} xstyle={styles.sw} />
        </Row>
      </Section>
      {sw.airplane && <Note>Airplane Mode is on. Turning this back on leaves Airplane Mode on, as iOS does.</Note>}
      {sw[name] && children}
    </>
  )
}

/** What each radio pane covers, in the line iPadOS prints under the pane's name. */
const ABOUT = {
  wifi: 'The network this Duo is on, and the switch both status stacks follow.',
  bt: 'The Bluetooth radio, and whatever this Duo has paired with it.',
  cell: 'Cellular data for this Duo, and the bars the status stacks draw from it.'
} satisfies Partial<Record<keyof Switches, string>>

/**
 * What installed apps are allowed to reach. The list is the runtime's, not a
 * copy: an app declares its permissions in its manifest and the shell hands
 * them to the store.
 */
function PrivacyPage({ os }: { os: Os }) {
  const rows = useSyncExternalStore(
    os.store?.subscribe ?? noStore,
    os.store?.snapshot ?? emptyStore,
    os.store?.snapshot ?? emptyStore
  ).rows.filter((row) => row.installed)
  const granted = new Map<string, string[]>()
  for (const row of rows)
    for (const name of row.permissions) granted.set(name, [...(granted.get(name) ?? []), row.name])
  return (
    <>
      <Hero name="privacy" bg={colors.blue} title="Privacy & Security">
        What the apps on this Duo are allowed to reach, and what the device refuses to anyone.
      </Hero>
      <Section>
        {granted.size ? (
          [...granted].map(([name, apps]) => (
            <Row
              key={name}
              icon={<Glyph name={PERM_GLYPH[name] ?? 'lock'} bg={colors.blue} />}
              label={name}
              subtitle={apps.join(', ')}
            />
          ))
        ) : (
          <Row icon={<Glyph name="lock" bg={colors.grey} />} label="No app requests device access" />
        )}
      </Section>
      <Note>
        A permission is declared in the app’s manifest and shown on its App Store page before you install it. Nothing
        here hands one out afterwards; removing the app is how you take it back.
      </Note>
      <Section>
        <Row icon={<Glyph name="privacy" bg={colors.red} />} label="Camera" detail="Denied to every app" />
        <Row icon={<Glyph name="volume" bg={colors.red} />} label="Microphone" detail="Denied to every app" />
      </Section>
      <Note>
        Installed apps run in an opaque sandbox, which browsers refuse capture to outright. The Camera app you can open
        from the home screen is baked into the shell, not installed, and is not covered by this.
      </Note>
    </>
  )
}

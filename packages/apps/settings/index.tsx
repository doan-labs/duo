// Settings. Every row does something: the radios flip the same device store
// Control Center flips and the status stacks read, Apps removes real installed
// releases, and General › Transfer or Reset empties the database and reboots.
// Apple's root list is longer — the panes with nothing behind them are simply
// not here, rather than drawn and dead.

import type { Os, SettingsHost, Switches } from '@doan-labs/duo-sdk'
import { Nav, Page, Row, Section, Toggle } from '@doan-labs/duo-uikit'
import { shared } from '@doan-labs/duo-uikit/styles.ts'
import { Sym } from '@doan-labs/duo-uikit/sym.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { type ReactNode, useSyncExternalStore } from 'react'
import { AppsPage } from './apps.tsx'
import { GeneralPage, SOFTWARE } from './general.tsx'
import { emptyStore, Glyph, Hero, Link, Note, noStore, PERM_GLYPH, useSwitches } from './parts.tsx'
import { styles } from './styles.ts'

export function Settings({ os, host }: { os: Os; host: SettingsHost }) {
  return (
    <Nav>
      <Page title="Settings">
        <Root os={os} host={host} />
      </Page>
    </Nav>
  )
}

function Root({ os, host }: { os: Os; host: SettingsHost }) {
  const sw = useSwitches(host)
  return (
    <>
      <Section>
        <Row
          icon={
            <span {...stylex.props(shared.rowIc, styles.tint(colors.grey), styles.avatar)}>
              <Sym name="person" size={26} />
            </span>
          }
          label="Sign in to your iPhone"
          subtitle="Set up iCloud, the App Store and more"
          xstyle={styles.account}
        />
      </Section>
      <Note>There is no account behind this device. The App Store installs without one.</Note>
      <Section>
        <Row icon={<Glyph name="airplane" bg={colors.orange} />} label="Airplane Mode">
          <Toggle
            aria-label="Airplane Mode"
            checked={sw.airplane}
            onChange={() => host.flip('airplane')}
            xstyle={styles.sw}
          />
        </Row>
        <Link
          title="Wi‑Fi"
          icon={<Glyph name="wifi" bg={colors.blue} />}
          label="Wi‑Fi"
          detail={sw.wifi ? host.network : 'Off'}
          page={() => (
            <Radio host={host} name="wifi" label="Wi‑Fi">
              <Section>
                <Row
                  icon={<Glyph name="wifi" bg={colors.blue} />}
                  label={host.network}
                  detail={<Sym name="check" size={15} />}
                />
              </Section>
              <Note>One network, and no radio to scan with. The status stacks on both displays name this one.</Note>
            </Radio>
          )}
        />
        <Link
          title="Bluetooth"
          icon={<Glyph name="bluetooth" bg={colors.blue} />}
          label="Bluetooth"
          detail={sw.bt ? 'On' : 'Off'}
          page={() => (
            <Radio host={host} name="bt" label="Bluetooth">
              <Note>No devices are paired, and nothing here can pair one.</Note>
            </Radio>
          )}
        />
        <Link
          title="Cellular"
          icon={<Glyph name="antenna" bg={colors.green} />}
          label="Cellular"
          detail={sw.cell ? 'On' : 'Off'}
          page={() => (
            <Radio host={host} name="cell" label="Cellular Data">
              <Note>No SIM is installed. The bars in the status stack follow this switch.</Note>
            </Radio>
          )}
        />
      </Section>
      <Note>Airplane Mode drags the three radios down with it, as it does in Control Center.</Note>
      <Section>
        <Link
          title="General"
          icon={<Glyph name="gear" bg={colors.grey} />}
          label="General"
          detail={SOFTWARE}
          page={() => <GeneralPage os={os} host={host} />}
        />
        <Row icon={<Glyph name="battery" bg={colors.green} />} label="Battery" detail={`${host.battery}%`} />
        <Link
          title="Privacy & Security"
          icon={<Glyph name="privacy" bg={colors.blue} />}
          label="Privacy & Security"
          page={() => <PrivacyPage os={os} />}
        />
      </Section>
      <Section>
        <Link
          title="Apps"
          icon={<Glyph name="grid" bg={colors.settingsIndigo} />}
          label="Apps"
          page={() => <AppsPage os={os} host={host} />}
        />
      </Section>
    </>
  )
}

/** Wi-Fi, Bluetooth and Cellular are the same pane: one switch, then whatever it has to show. */
function Radio({
  host,
  name,
  label,
  children
}: {
  host: SettingsHost
  name: keyof Switches
  label: string
  children: ReactNode
}) {
  const sw = useSwitches(host)
  return (
    <>
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

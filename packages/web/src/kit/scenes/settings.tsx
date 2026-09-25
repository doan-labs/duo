// Settings as the kit builds it: tinted glyph squares, a switch that other rows
// answer to, and a push into Wi-Fi where picking a network ticks it.
import { Nav, Page, Row, Section, Sym, type SymProps, Toggle, useNav } from '@doan-labs/duo-uikit'
import { app, colors, radius, space } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'

const NETWORKS = ['Home', 'Studio 5G', 'Café Lisboa']

export default function Settings() {
  const [airplane, setAirplane] = useState(false)
  const [network, setNetwork] = useState('Home')
  return (
    <Nav>
      <Root airplane={airplane} setAirplane={setAirplane} network={network} setNetwork={setNetwork} />
    </Nav>
  )
}

function Root({
  airplane,
  setAirplane,
  network,
  setNetwork
}: {
  airplane: boolean
  setAirplane: (on: boolean) => void
  network: string
  setNetwork: (n: string) => void
}) {
  const nav = useNav()
  const off = airplane ? 'Off' : undefined
  return (
    <Page title="Settings">
      <Section>
        <Row icon={<Ic name="airplane" tint={colors.orange} />} label="Airplane Mode">
          <Toggle
            aria-label="Airplane Mode"
            checked={airplane}
            onChange={(e) => setAirplane(e.target.checked)}
            xstyle={styles.trail}
          />
        </Row>
        <Row
          as="button"
          icon={<Ic name="wifi" tint={colors.blue} />}
          label="Wi-Fi"
          detail={off ?? network}
          chevron
          xstyle={styles.button}
          onClick={() => nav.push((back) => <WiFi back={back} network={network} setNetwork={setNetwork} />)}
        />
        <Row icon={<Ic name="bluetooth" tint={colors.blue} />} label="Bluetooth" detail={off ?? 'On'} chevron />
        <Row icon={<Ic name="cellular" tint={colors.green} />} label="Cellular" detail={off} chevron />
      </Section>
      <Section>
        <Row icon={<Ic name="sun" tint={colors.blue} />} label="Display & Brightness" chevron />
        <Row icon={<Ic name="volume" tint={colors.pink} />} label="Sounds & Haptics" chevron />
        <Row icon={<Ic name="moon" tint={colors.indigo} />} label="Focus" chevron />
        <Row icon={<Ic name="privacy" tint={colors.blue} />} label="Privacy & Security" chevron />
      </Section>
    </Page>
  )
}

function WiFi({ back, network, setNetwork }: { back: () => void; network: string; setNetwork: (n: string) => void }) {
  // Local so the tick moves at once; the root reads the choice back after the pop.
  const [picked, setPicked] = useState(network)
  return (
    <Page title="Wi-Fi" back={back}>
      <Section>
        {NETWORKS.map((n) => (
          <Row
            key={n}
            as="button"
            label={n}
            xstyle={styles.button}
            onClick={() => {
              setPicked(n)
              setNetwork(n)
            }}
            icon={
              <span {...stylex.props(styles.tick, n !== picked && styles.hidden)}>
                <Sym name="tick" size={15} />
              </span>
            }
            detail={
              <span {...stylex.props(styles.meta)}>
                <Sym name="lock" size={12} />
                <Sym name="wifi" size={15} />
              </span>
            }
          />
        ))}
      </Section>
    </Page>
  )
}

function Ic({ name, tint }: { name: SymProps['name']; tint: string }) {
  return (
    <span {...stylex.props(styles.ic, styles.tint(tint))}>
      <Sym name={name} size={17} />
    </span>
  )
}

const styles = stylex.create({
  ic: {
    width: 29,
    height: 29,
    borderRadius: radius.sm,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
    color: colors.white
  },
  tint: (c: string) => ({ backgroundColor: c }),
  trail: { marginLeft: 'auto' },
  button: { width: '100%', textAlign: 'left' },
  tick: { display: 'flex', width: 17, color: app.link },
  hidden: { opacity: 0 },
  meta: { display: 'flex', alignItems: 'center', gap: space.sm, color: app.fg }
})

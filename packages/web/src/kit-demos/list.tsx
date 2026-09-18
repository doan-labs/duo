import { List, Row, Section, Sym } from '@doan-labs/duo-uikit'

export default function Demo() {
  return (
    <Section>
      <List aria-label="Connections">
        <Row as="li" icon={<Sym name="wifi" />} label="Wi-Fi" detail="Home" chevron />
        <Row as="li" icon={<Sym name="bluetooth" />} label="Bluetooth" detail="On" chevron />
        <Row as="li" icon={<Sym name="cellular" />} label="Cellular" chevron />
      </List>
    </Section>
  )
}

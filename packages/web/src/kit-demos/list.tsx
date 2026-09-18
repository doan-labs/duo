import { Symbol as DuoSymbol, List, Row, Section } from '@doan-labs/duo-uikit'

export default function Demo() {
  return (
    <Section>
      <List aria-label="Connections">
        <Row as="li" icon={<DuoSymbol name="wifi" />} label="Wi-Fi" detail="Home" chevron />
        <Row as="li" icon={<DuoSymbol name="bluetooth" />} label="Bluetooth" detail="On" chevron />
        <Row as="li" icon={<DuoSymbol name="cellular" />} label="Cellular" chevron />
      </List>
    </Section>
  )
}

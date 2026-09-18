import { Symbol as DuoSymbol, Row, Section, Toggle } from '@doan-labs/ipduo-uikit'
import { useState } from 'react'

export default function Demo() {
  const [taps, setTaps] = useState(0)
  return (
    <Section>
      <Row label="Label only" />
      <Row label="With detail" detail="Value" />
      <Row icon={<DuoSymbol name="gear" />} label="Icon and chevron" chevron />
      <Row label="With a control">
        <Toggle aria-label="Example switch" defaultChecked />
      </Row>
      <Row
        as="button"
        label="As a button"
        detail={taps ? `${taps} taps` : undefined}
        onClick={() => setTaps((n) => n + 1)}
        chevron
      />
    </Section>
  )
}

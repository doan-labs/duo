import { Row, Section, Toggle } from '@doan-labs/ipduo-uikit'
import { useState } from 'react'

export default function Demo() {
  const [on, setOn] = useState(true)
  return (
    <Section>
      <Row label="Airplane mode">
        <Toggle aria-label="Airplane mode" checked={on} onChange={(e) => setOn(e.target.checked)} />
      </Row>
      <Row label="Disabled">
        <Toggle aria-label="Disabled switch" checked disabled />
      </Row>
    </Section>
  )
}

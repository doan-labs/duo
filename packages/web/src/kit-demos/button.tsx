import { Button, Row, Section, Sym } from '@doan-labs/duo-uikit'
import { useState } from 'react'

export default function Demo() {
  const [pressed, setPressed] = useState('Nothing pressed yet')
  return (
    <Section>
      <Row>
        <Button variant="filled" onClick={() => setPressed('Filled')}>
          Filled
        </Button>
        <Button onClick={() => setPressed('Tinted')}>Tinted</Button>
        <Button variant="plain" onClick={() => setPressed('Plain')}>
          Plain
        </Button>
      </Row>
      <Row>
        <Button disabled>Disabled</Button>
        <Button aria-label="Settings" onClick={() => setPressed('Symbol')}>
          <Sym name="gear" />
        </Button>
      </Row>
      <Row label="Last pressed" detail={pressed} />
    </Section>
  )
}

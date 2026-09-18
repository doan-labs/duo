import { Row, Section, Title } from '@doan-labs/duo-uikit'

export default function Demo() {
  return (
    <>
      <Title as="h1">
        Reminders
        <Title as="span" variant="accessory">
          3 due
        </Title>
      </Title>
      <Section>
        <Row label="Call the vet" />
      </Section>
    </>
  )
}

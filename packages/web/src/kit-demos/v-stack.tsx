import { Placeholder, Row, Section, Title, VStack } from '@doan-labs/duo-uikit'

export default function Demo() {
  return (
    <VStack as="main">
      <Title as="h1">Stack</Title>
      <Section>
        <Row label="Header stays put" />
      </Section>
      <Placeholder>The placeholder takes what is left</Placeholder>
    </VStack>
  )
}

import { Hero, Row, Section, Text } from '@doan-labs/duo-uikit'

export default function Demo() {
  return (
    <>
      <Hero as="h1">Field guide</Hero>
      <Section>
        <Row label="Introduces" detail={<Text size="caption">the screen below it</Text>} />
      </Section>
    </>
  )
}

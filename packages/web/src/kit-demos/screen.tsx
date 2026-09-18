import { LargeTitle, Row, Screen, Section, Title } from '@doan-labs/ipduo-uikit'

export default function Demo() {
  return (
    <>
      <Title as="h1">Notes</Title>
      <Screen aria-label="Notes">
        <LargeTitle>All notes</LargeTitle>
        <Section>
          <Row label="Groceries" detail="Today" chevron />
          <Row label="Packing list" detail="Yesterday" chevron />
          <Row label="Ideas" detail="Monday" chevron />
        </Section>
      </Screen>
    </>
  )
}

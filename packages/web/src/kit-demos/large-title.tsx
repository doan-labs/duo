import { LargeTitle, Row, Section } from '@doan-labs/ipduo-uikit'

export default function Demo() {
  return (
    <>
      <LargeTitle as="h1">Settings</LargeTitle>
      <Section>
        <Row label="General" chevron />
        <Row label="Display and Brightness" chevron />
      </Section>
    </>
  )
}

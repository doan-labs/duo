import { Symbol as DuoSymbol, Row, Section, Text } from '@doan-labs/duo-uikit'

export default function Demo() {
  return (
    <Section>
      <Row icon={<DuoSymbol name="wifi" />} label="Inherits the row colour" />
      <Row
        icon={
          <Text color="accent">
            <DuoSymbol name="location" size={22} />
          </Text>
        }
        label="Tinted through Text"
      />
      <Row icon={<DuoSymbol name="lock" size={14} />} label="Sized in points" />
    </Section>
  )
}

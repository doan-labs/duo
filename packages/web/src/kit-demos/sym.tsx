import { Row, Section, Sym, Text } from '@doan-labs/duo-uikit'

export default function Demo() {
  return (
    <Section>
      <Row icon={<Sym name="wifi" />} label="Inherits the row colour" />
      <Row
        icon={
          <Text color="accent">
            <Sym name="location" size={22} />
          </Text>
        }
        label="Tinted through Text"
      />
      <Row icon={<Sym name="lock" size={14} />} label="Sized in points" />
    </Section>
  )
}

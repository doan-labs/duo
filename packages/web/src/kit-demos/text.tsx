import { Row, Section, Text } from '@doan-labs/ipduo-uikit'

export default function Demo() {
  return (
    <Section>
      <Row label="Body" detail={<Text>Regular text</Text>} />
      <Row label="Caption" detail={<Text size="caption">Secondary label</Text>} />
      <Row label="Footnote" detail={<Text size="footnote">Footnote</Text>} />
      <Row
        label="Title"
        detail={
          <Text size="title" weight="bold">
            Title
          </Text>
        }
      />
      <Row
        label="Accent"
        detail={
          <Text color="accent" weight="medium">
            Tinted
          </Text>
        }
      />
      <Row label="Number" detail={<Text value={1234.5} format={{ maximumFractionDigits: 1 }} suffix=" units" />} />
    </Section>
  )
}

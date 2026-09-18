import { Button, HStack, Row, Section, Sym, Text } from '@doan-labs/duo-uikit'
import * as stylex from '@stylexjs/stylex'

export default function Demo() {
  return (
    <Section>
      <Row>
        <HStack gap={8}>
          <Button variant="filled">Save</Button>
          <Button>Later</Button>
        </HStack>
      </Row>
      <Row>
        <HStack gap={10} justify="between" xstyle={styles.fill}>
          <Text>Pushed apart</Text>
          <Text color="secondary">by justify</Text>
        </HStack>
      </Row>
      <Row>
        <HStack gap={6}>
          <Sym name="wifi" size={15} />
          <Text size="subheadline">Centred on the cross axis</Text>
        </HStack>
      </Row>
    </Section>
  )
}

const styles = stylex.create({ fill: { width: '100%' } })

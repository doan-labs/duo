import { NavigationLink, NavigationStack, Row, Section, Text, Title } from '@doan-labs/ipduo-uikit'

export default function Demo() {
  return (
    <NavigationStack>
      <Title as="h1">Trips</Title>
      <Section>
        <Row>
          <NavigationLink title="Lisbon" destination={<Text as="p">Back returns focus to the link.</Text>}>
            Open Lisbon
          </NavigationLink>
        </Row>
      </Section>
    </NavigationStack>
  )
}

import { Nav, NavigationLink, Row, Section, Text, Title } from '@doan-labs/duo-uikit'

export default function Demo() {
  return (
    <Nav>
      <Title as="h1">Trips</Title>
      <Section>
        <Row>
          <NavigationLink title="Lisbon" destination={<Text as="p">Back returns focus to the link.</Text>}>
            Open Lisbon
          </NavigationLink>
        </Row>
      </Section>
    </Nav>
  )
}

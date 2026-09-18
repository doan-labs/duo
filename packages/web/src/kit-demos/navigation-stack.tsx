import { NavigationLink, NavigationStack, Row, Section, Title } from '@doan-labs/duo-uikit'

export default function Demo() {
  return (
    <NavigationStack>
      <Title as="h1">Inbox</Title>
      <Section>
        <Row>
          <NavigationLink
            title="Message"
            destination={
              <Section>
                <Row label="From" detail="Duo" />
              </Section>
            }
          >
            Read message
          </NavigationLink>
        </Row>
      </Section>
    </NavigationStack>
  )
}

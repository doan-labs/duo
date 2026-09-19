import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react.ts'
import {
  Button,
  HStack,
  LargeTitle,
  List,
  Nav,
  NavigationLink,
  Placeholder,
  Row,
  Screen,
  Section,
  Sym,
  Text,
  Title,
  Toggle,
  useDisplay,
  VStack,
  Widget,
  WidgetLabel
} from '@doan-labs/duo-uikit'
import { app, colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

/** Live public-kit gallery. Its entry uses only the same exports available to external apps. */
function Gallery() {
  const display = useDisplay()
  const toggle = useKV(os.storage, 'gallery-toggle')
  const [message, setMessage] = useState('Ready')
  useEffect(() => {
    os.ready()
  }, [])
  return (
    <VStack as="main" xstyle={[styles.root, light]}>
      <Nav>
        <Title>
          Developer{' '}
          <Title as="span" variant="accessory">
            UI kit 1.0
          </Title>
        </Title>
        <Screen aria-label="Component gallery">
          <Text as="p" xstyle={styles.inset} data-testid="display">
            {display.display} · {display.width} × {display.height} · {Math.round(display.angle)}°
          </Text>
          <LargeTitle>Components</LargeTitle>
          <Section>
            <Row label="Body" detail={<Text>Regular text</Text>} />
            <Row label="Caption" detail={<Text size="caption">Secondary label</Text>} />
            <Row
              label="Footnote"
              detail={
                <Text size="footnote" color="secondary">
                  Footnote
                </Text>
              }
            />
            <Row
              label="Title"
              detail={
                <Text size="title2" weight="bold">
                  Title
                </Text>
              }
            />
            <Row
              label="Number"
              detail={<Text value={1234.5} format={{ maximumFractionDigits: 1 }} suffix=" units" />}
            />
            <Row label="Unavailable" detail={<Text format={{}}>Fallback</Text>} />
          </Section>
          <Section>
            <List aria-label="Rows">
              <Row as="li" icon={<Sym name="gear" />} label="Icon and detail" detail="Value" chevron />
              <Row as="li" label="Switch">
                <Toggle
                  aria-label="Gallery switch"
                  disabled={toggle.status === 'hydrating'}
                  checked={toggle.value === 'on'}
                  onChange={(e) => toggle.set(e.target.checked ? 'on' : 'off')}
                />
              </Row>
              <Row as="li" label="Disabled switch">
                <Toggle aria-label="Disabled switch" checked disabled />
              </Row>
            </List>
          </Section>
          <Section>
            <HStack gap={8} wrap xstyle={styles.tray}>
              <Button variant="filled" onClick={() => setMessage('Filled pressed')}>
                Filled
              </Button>
              <Button onClick={() => setMessage('Tinted pressed')}>Tinted</Button>
              <Button variant="plain" onClick={() => setMessage('Plain pressed')}>
                Plain
              </Button>
              <Button disabled>Disabled</Button>
              <Button aria-label="Symbol action" onClick={() => setMessage('Symbol pressed')}>
                <Sym name="gear" />
              </Button>
            </HStack>
            <Row>
              <NavigationLink
                title="Detail"
                destination={
                  <Text as="p" xstyle={styles.inset}>
                    Back returns to the gallery.
                  </Text>
                }
              >
                Open detail
              </NavigationLink>
            </Row>
            <Row>
              <Text role="status">{toggle.error ? 'Save failed' : message}</Text>
            </Row>
          </Section>
          <Section>
            <HStack gap={8} wrap xstyle={styles.tray}>
              {(['spin', 'rise', 'pop', 'fade', 'rip', 'draw', 'bob', 'glow'] as const).map((animation) => (
                <Text key={animation} animate={animation} xstyle={styles.sample}>
                  {animation}
                </Text>
              ))}
            </HStack>
          </Section>
          <Section>
            <Row label="Type ramp" subtitle="Every step, with its own leading" chevron />
            {(['largeTitle', 'title2', 'headline', 'body', 'subheadline', 'caption2'] as const).map((step) => (
              <Row key={step} label={<Text size={step}>{step}</Text>} detail={step} />
            ))}
          </Section>
          <Section>
            <Placeholder>No content yet</Placeholder>
          </Section>
          <Section xstyle={styles.widget}>
            <WidgetLabel>Passive snapshot</WidgetLabel>
            <Widget
              snapshot={{
                lines: [
                  { text: 'Developer', role: 'label' },
                  { text: '42', role: 'value' },
                  { text: 'Open sample', role: 'caption' }
                ]
              }}
              updatedAt={0}
              onOpen={() => setMessage('Widget pressed')}
            />
          </Section>
        </Screen>
      </Nav>
    </VStack>
  )
}
const light = stylex.createTheme(app, { bg: colors.grey6, fg: colors.black })
const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    color: colors.black,
    backgroundColor: colors.grey6,
    fontFamily: fonts.system
  },
  inset: { paddingLeft: 16, paddingRight: 16 },
  tray: { flexWrap: 'wrap', paddingTop: 11, paddingRight: 16, paddingBottom: 11, paddingLeft: 16 },
  sample: { display: 'inline-block', paddingTop: 10, paddingRight: 10, paddingBottom: 10, paddingLeft: 10 },
  widget: {
    backgroundColor: colors.grey6Dark,
    color: colors.white,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12
  }
})
await os.connect()
createRoot(document.body).render(<Gallery />)

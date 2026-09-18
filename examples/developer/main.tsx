import { os } from '@doan-labs/ipduo-sdk'
import { useKV } from '@doan-labs/ipduo-sdk/react.ts'
import {
  Button,
  Symbol as DuoSymbol,
  Hero,
  LargeTitle,
  List,
  NavigationLink,
  NavigationStack,
  Placeholder,
  Row,
  Screen,
  Section,
  Text,
  Title,
  Toggle,
  useDisplay,
  VStack,
  Widget,
  WidgetLabel
} from '@doan-labs/ipduo-uikit'
import { app, colors, fonts } from '@doan-labs/ipduo-uikit/tokens.stylex.ts'
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
      <NavigationStack>
        <Title>
          Developer{' '}
          <Title as="span" variant="accessory">
            UI kit 0.1
          </Title>
        </Title>
        <Screen aria-label="Component gallery">
          <Text as="p" xstyle={styles.inset} data-testid="display">
            {display.display} · {display.width} × {display.height} · {Math.round(display.angle)}°
          </Text>
          <LargeTitle>Components</LargeTitle>
          <Section>
            <Hero>Harvested UI</Hero>
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
              label="Number"
              detail={<Text value={1234.5} format={{ maximumFractionDigits: 1 }} suffix=" units" />}
            />
            <Row label="Unavailable" detail={<Text format={{}}>Fallback</Text>} />
          </Section>
          <Section>
            <List aria-label="Rows">
              <Row as="li" icon={<DuoSymbol name="gear" />} label="Icon and detail" detail="Value" chevron />
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
            <Row xstyle={styles.wrap}>
              <Button variant="filled" onClick={() => setMessage('Filled pressed')}>
                Filled
              </Button>
              <Button onClick={() => setMessage('Tinted pressed')}>Tinted</Button>
              <Button variant="plain" onClick={() => setMessage('Plain pressed')}>
                Plain
              </Button>
              <Button disabled>Disabled</Button>
              <Button aria-label="Symbol action" onClick={() => setMessage('Symbol pressed')}>
                <DuoSymbol name="gear" />
              </Button>
            </Row>
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
            <Row xstyle={styles.wrap}>
              {(['spin', 'rise', 'pop', 'fade', 'rip', 'draw', 'bob', 'glow'] as const).map((animation) => (
                <Text key={animation} animate={animation} xstyle={styles.sample}>
                  {animation}
                </Text>
              ))}
            </Row>
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
      </NavigationStack>
    </VStack>
  )
}
const light = stylex.createTheme(app, { bg: colors.groupedLight, fg: colors.black })
const styles = stylex.create({
  root: {
    position: 'absolute',
    inset: 0,
    color: colors.black,
    backgroundColor: colors.groupedLight,
    fontFamily: fonts.system
  },
  inset: { paddingLeft: 16, paddingRight: 16 },
  wrap: { flexWrap: 'wrap' },
  sample: { display: 'inline-block', paddingTop: 10, paddingRight: 10, paddingBottom: 10, paddingLeft: 10 },
  widget: {
    backgroundColor: colors.weatherNight,
    color: colors.white,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12
  }
})
await os.connect()
createRoot(document.body).render(<Gallery />)

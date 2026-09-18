import { VStack, WidgetLabel } from '@doan-labs/duo-uikit'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'

export default function Demo() {
  return (
    <VStack xstyle={styles.night}>
      <WidgetLabel>Weather</WidgetLabel>
      <WidgetLabel as="span">Cupertino · 21°</WidgetLabel>
    </VStack>
  )
}

const styles = stylex.create({
  night: { justifyContent: 'center', backgroundColor: colors.weatherNight, color: colors.white, padding: 24 }
})

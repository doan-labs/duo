import { VStack, Widget } from '@doan-labs/duo-uikit'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'

export default function Demo() {
  const [opened, setOpened] = useState(0)
  return (
    <VStack xstyle={styles.night}>
      <Widget
        snapshot={{
          lines: [
            { text: 'Steps', role: 'label' },
            { text: '8,412', role: 'value' },
            { text: opened ? `Opened ${opened}×` : 'Tap to open', role: 'caption' }
          ]
        }}
        updatedAt={Date.now() - 2 * 3600000}
        onOpen={() => setOpened((n) => n + 1)}
      />
    </VStack>
  )
}

// Widgets sit on a wallpaper; the gallery uses the Weather night blue.
const styles = stylex.create({
  night: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.weatherNight, padding: 24 }
})

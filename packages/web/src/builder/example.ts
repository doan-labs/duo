import type { Source } from './types'
export const example: Source = {
  name: 'Focus',
  summary: 'A focus timer that keeps its deadline when you fold the phone or update the app.',
  files: {
    'app.tsx': `import { useEffect, useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import { os } from '@doan-labs/duo-sdk'
import { useKV } from '@doan-labs/duo-sdk/react'
import { Button, Screen, Text, VStack, useDisplay } from '@doan-labs/duo-uikit'
import { colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex'

export default function App() {
  const deadline = useKV(os.storage, 'deadline')
  const [now, setNow] = useState(Date.now())
  const display = useDisplay()
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer) }, [])
  const seconds = Math.max(0, Math.ceil((Number(deadline.value || 0) - now) / 1000))
  const running = seconds > 0
  return <Screen xstyle={styles.screen}><div {...stylex.props(styles.body)}>
    <Text>MAKE ROOM FOR ONE THING</Text>
    <h1 {...stylex.props(styles.heading)}>Time to focus.</h1>
    <div {...stylex.props(styles.clock)}>{running ? String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0') : '25:00'}</div>
    <VStack><Button onClick={() => deadline.set(String(Date.now() + 25 * 60 * 1000))}>Start 25 minutes</Button>
    <Button onClick={() => deadline.set('0')}>Reset timer</Button></VStack>
    <Text>{display.display === 'cover' ? 'Small screen. Same focus.' : 'Fold the phone. Your timer follows.'}</Text>
    {deadline.status === 'error' && <Text>Could not save your timer. Please try again.</Text>}
  </div></Screen>
}
const styles = stylex.create({
  screen: { backgroundColor: colors.groupedLight },
  body: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24, boxSizing: 'border-box', backgroundColor: colors.groupedLight, color: colors.black, fontFamily: fonts.system },
  heading: { fontSize: 36, margin: 0, fontWeight: 600 },
  clock: { fontSize: 80, fontWeight: 300, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.06em' }
})`
  }
}

// The small controls on one card, each wired to something it visibly changes.
import { Button, Checkbox, HStack, IconButton, Num, Segmented, Toggle } from '@doan-labs/duo-uikit'
import { app, colors, leading, radius, space, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'

const RANGES = ['Day', 'Week', 'Month'] as const

export default function Controls() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('Week')
  const [cups, setCups] = useState(3)
  const [saved, setSaved] = useState(false)
  return (
    <div {...stylex.props(styles.scene)}>
      <Segmented options={RANGES} value={range} onChange={setRange} aria-label="Range" />
      <HStack gap={8}>
        <Button variant="filled" onClick={() => setSaved((s) => !s)}>
          {saved ? 'Saved' : 'Save'}
        </Button>
        <Button>Share</Button>
        <Button variant="plain">Cancel</Button>
      </HStack>
      <HStack gap={16} justify="between" xstyle={styles.fill}>
        <HStack gap={10}>
          <Checkbox aria-label="Water" tint={colors.teal} defaultChecked />
          <Checkbox aria-label="Stretch" tint={colors.orange} defaultChecked />
          <Checkbox aria-label="Read" tint={colors.purple} />
        </HStack>
        <HStack gap={8}>
          <IconButton
            variant="round"
            name="minus"
            size={11}
            aria-label="Fewer"
            onClick={() => setCups((c) => Math.max(0, c - 1))}
          />
          <span {...stylex.props(styles.count)}>
            <Num value={cups} />
          </span>
          <IconButton variant="round" name="plus" size={11} aria-label="More" onClick={() => setCups((c) => c + 1)} />
        </HStack>
        <Toggle aria-label="Remind me" defaultChecked />
      </HStack>
    </div>
  )
}

const styles = stylex.create({
  scene: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    marginTop: space.xs,
    marginLeft: space.lg,
    marginRight: space.lg,
    marginBottom: space.lg,
    paddingLeft: space.lg,
    paddingRight: space.lg,
    borderRadius: radius.xl,
    backgroundColor: app.surface
  },
  fill: { alignSelf: 'stretch' },
  count: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: typeScale.headline,
    lineHeight: leading.headline,
    fontVariantNumeric: 'tabular-nums'
  }
})

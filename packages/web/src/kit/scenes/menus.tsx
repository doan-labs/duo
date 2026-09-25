// A note with its actions menu. The menu floats out of the button a beat after
// the tile arrives, and sinks back once something in it is chosen.
import { IconButton, Menu, Row, Section, Text } from '@doan-labs/duo-uikit'
import { app, leading, radius, space, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect, useState } from 'react'

export default function Menus() {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(true)
  const [last, setLast] = useState('Nothing chosen yet')
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 700)
    return () => clearTimeout(t)
  }, [])
  const did = (what: string) => () => setLast(what)
  return (
    <div {...stylex.props(styles.scene)}>
      <Section xstyle={styles.card}>
        <Row label="Weekend in Lisbon" subtitle={last}>
          <IconButton
            name="more"
            size={20}
            variant="round"
            aria-label="Note actions"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            xstyle={styles.more}
          />
        </Row>
        <Row>
          <Text size="footnote" color="secondary">
            Tram 28 before nine, while it still has seats.
          </Text>
        </Row>
      </Section>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        size={15}
        itemStyle={styles.item}
        xstyle={styles.menu}
        items={[
          { label: 'Pin Note', icon: 'pin', checked: pinned, onSelect: () => setPinned((p) => !p) },
          { label: 'Duplicate', icon: 'stack', onSelect: did('Duplicated') },
          'separator',
          { label: 'Move to Folder', icon: 'folder', onSelect: did('Moved to Trips') }
        ]}
        footer={[
          { label: 'Share', icon: 'share', onSelect: did('Shared') },
          { label: 'Find', icon: 'search', onSelect: did('Searched') },
          { label: 'Delete', icon: 'trash', onSelect: did('Deleted, then restored') }
        ]}
      />
    </div>
  )
}

const styles = stylex.create({
  scene: { position: 'relative', flexGrow: 1, paddingTop: space.xs },
  card: { marginRight: '46%' },
  more: { marginLeft: 'auto', width: 30, height: 30, color: app.link },
  // Pinned beside the button that opened it, rather than over the note it acts on.
  menu: {
    position: 'absolute',
    top: space.xs,
    right: space.lg,
    width: '42%',
    minWidth: '200px',
    backgroundColor: app.surface,
    borderRadius: radius.xl
  },
  item: {
    paddingTop: 7,
    paddingBottom: 7,
    fontSize: typeScale.subheadline,
    lineHeight: leading.subheadline
  }
})

// Three widgets over Apple's own dune wallpaper, so the glass has something
// to blur. Each is a snapshot the shell would draw, with its age where it has one.
import { Widget } from '@doan-labs/duo-uikit'
import { WALLPAPER } from '@doan-labs/duo-uikit/icons/index.ts'
import { space } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'

export default function Widgets() {
  const [opened, setOpened] = useState<string>()
  const now = new Date()
  const open = (name: string) => () => setOpened(name)
  return (
    <div {...stylex.props(styles.scene, styles.wall(`url(${WALLPAPER})`))}>
      <div {...stylex.props(styles.row)}>
        <Widget
          snapshot={{
            lines: [
              { text: 'Cupertino', role: 'label' },
              { text: '21°', role: 'value' },
              { text: opened === 'weather' ? 'Opening Weather' : 'Clear · H 24° L 14°', role: 'caption' }
            ]
          }}
          updatedAt={Date.now() - 2 * 3600000}
          onOpen={open('weather')}
        />
        <Widget
          snapshot={{
            lines: [
              { text: now.toLocaleDateString('en', { weekday: 'long' }), role: 'label' },
              { text: String(now.getDate()), role: 'value' },
              { text: opened === 'calendar' ? 'Opening Calendar' : 'No more events', role: 'caption' }
            ]
          }}
          updatedAt={Date.now()}
          onOpen={open('calendar')}
        />
        <Widget
          snapshot={{
            lines: [
              { text: 'Steps', role: 'label' },
              { text: '8,412', role: 'value' },
              { text: opened === 'fitness' ? 'Opening Fitness' : '6.2 km today', role: 'caption' }
            ]
          }}
          updatedAt={Date.now()}
          onOpen={open('fitness')}
        />
      </div>
    </div>
  )
}

const rise = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(18px) scale(.94)' } })

const styles = stylex.create({
  scene: {
    flexGrow: 1,
    display: 'grid',
    placeItems: 'center',
    marginTop: space.xs,
    backgroundSize: 'cover',
    backgroundPosition: 'center 40%'
  },
  wall: (url: string) => ({ backgroundImage: url }),
  row: {
    display: 'flex',
    gap: space.lg,
    paddingLeft: space.lg,
    paddingRight: space.lg,
    animationName: rise,
    animationDuration: '.7s',
    animationFillMode: 'backwards'
  }
})

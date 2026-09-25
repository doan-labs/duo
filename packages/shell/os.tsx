// Boot: builds the root element for one display and hands it to React. Nothing
// else lives here. The shell is springboard/, the device is device.ts, and the
// framework the apps link against is uikit/.

import { colors, fonts, layout, leading, tracking, typeScale } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { createRoot } from 'react-dom/client'
import { device } from './device.ts'
import { development } from './runtime/development.ts'
import { shots } from './runtime/photos.ts'
import { bootRegistry } from './runtime/registry.ts'
import { BOOT_FADE_MS, BOOT_MS, BootScreen } from './springboard/power.tsx'
import { SpringBoard } from './springboard/springboard.tsx'

/** Builds one display's OS. `w`/`hgt` in CSS px. `arg` is the deep link `boot` opens with. */
export function os(
  w: number,
  hgt: number,
  container: HTMLElement,
  boot?: string | null,
  arg?: string | null
): HTMLElement {
  const wide = w > 600
  // The root is handed to CSS3DObject before React has rendered anything, so
  // its own look is applied here by hand; everything inside is React.
  // Glass corners measured off Apple's mesh (10.7 mm inner; 11.4 mm outer,
  // 1.3 mm on its hinge edge). The active area sits 6 px in, concentric.
  const root = document.createElement('div')
  root.dataset.os = wide ? 'wide' : 'narrow'
  const p = stylex.props(styles.os, styles.size(w, hgt), wide ? styles.osWide : styles.osNarrow)
  root.className = p.className ?? ''
  for (const [k, v] of Object.entries(p.style ?? {})) root.style.setProperty(k, String(v))
  // CSS3DRenderer only attaches visible objects; hidden sandbox views still need a live document.
  root.style.display = 'none'
  container.append(root)
  // Tap to wake. A block, not an expression: an `on*` handler returning false
  // cancels the event, and a cancelled pointerdown never focuses the field
  // under it, so nothing could be typed anywhere.
  root.onpointerdown = () => {
    if (device.asleep) device.wake()
  }
  // The registry boot is the long wait, so the display wears the same logo the
  // device shows coming out of a restart until the springboard can take over.
  const view = createRoot(root)
  view.render(<BootScreen />)
  void Promise.all([bootRegistry(), new Promise((r) => setTimeout(r, BOOT_MS))])
    .then(() => {
      const dev = [...development].find(([, value]) => value.bundle.release.manifest.id === boot)
      const board = <SpringBoard w={w} hgt={hgt} boot={dev?.[0] ?? boot} arg={arg} shots={shots} />
      // The logo fades over the springboard rather than cutting to it; same fragment
      // shape both times so React keeps the one SpringBoard instance.
      view.render(
        <>
          {board}
          <BootScreen leaving />
        </>
      )
      // biome-ignore lint/complexity/noUselessFragments: a bare `board` would change the root's type and remount it
      setTimeout(() => view.render(<>{board}</>), BOOT_FADE_MS)
    })
    .catch((error) => {
      view.render(<BootScreen error={`Apps unavailable: ${error.message}. Reload to retry.`} />)
    })
  return root
}

const styles = stylex.create({
  os: {
    position: 'relative',
    backgroundColor: colors.black,
    overflow: 'hidden',
    fontFamily: fonts.system,
    fontSize: typeScale.body,
    lineHeight: leading.body,
    letterSpacing: tracking.body,
    color: colors.white,
    pointerEvents: 'auto',
    backfaceVisibility: 'hidden',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    cursor: 'default'
  },
  osWide: { borderRadius: layout.glassInner },
  osNarrow: {
    borderTopLeftRadius: layout.glassCoverHinge,
    borderTopRightRadius: layout.glassCoverFree,
    borderBottomRightRadius: layout.glassCoverFree,
    borderBottomLeftRadius: layout.glassCoverHinge
  },
  size: (w: number, h: number) => ({ width: w, height: h })
})

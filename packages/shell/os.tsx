// Boot: builds the root element for one display and hands it to React. Nothing
// else lives here. The shell is springboard/, the device is device.ts, and the
// framework the apps link against is uikit/.

import { colors, fonts } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { createRoot } from 'react-dom/client'
import { device } from './device.ts'
import { development } from './runtime/development.ts'
import { shots } from './runtime/photos.ts'
import { bootRegistry } from './runtime/registry.ts'
import { BootScreen } from './springboard/power.tsx'
import { SpringBoard } from './springboard/springboard.tsx'

/** Builds one display's OS. `w`/`hgt` in CSS px. */
export function os(w: number, hgt: number, container: HTMLElement, boot?: string | null): HTMLElement {
  const wide = w > 600
  // The root is handed to CSS3DObject before React has rendered anything, so
  // its own look is applied here by hand; everything inside is React.
  // Glass corners measured off Apple's mesh (10.7 mm inner; 11.4 mm outer,
  // 1.3 mm on its hinge edge). The active area sits 11 px in, concentric.
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
  void bootRegistry()
    .then(() => {
      const dev = [...development].find(([, value]) => value.bundle.release.manifest.id === boot)
      view.render(<SpringBoard w={w} hgt={hgt} boot={dev?.[0] ?? boot} shots={shots} />)
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
    fontSize: 15,
    lineHeight: 1.3,
    color: colors.white,
    pointerEvents: 'auto',
    backfaceVisibility: 'hidden',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    cursor: 'default'
  },
  osWide: { borderRadius: 53.5 },
  osNarrow: {
    borderTopLeftRadius: 6.6,
    borderTopRightRadius: 57,
    borderBottomRightRadius: 57,
    borderBottomLeftRadius: 6.6
  },
  size: (w: number, h: number) => ({ width: w, height: h })
})

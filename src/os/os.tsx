// Boot: builds the root element for one display and hands it to React. Nothing
// else lives here. The shell is springboard/, the device is device.ts, and the
// framework the apps link against is uikit/.

import * as stylex from '@stylexjs/stylex'
import { createRoot } from 'react-dom/client'
import { device } from './device.ts'
import { SpringBoard } from './springboard/springboard.tsx'
import { colors, fonts } from './uikit/tokens.stylex.ts'

/** Builds one display's OS. `w`/`hgt` in CSS px; `wall` is a wallpaper URL. */
export function os(w: number, hgt: number, wall: string, boot?: string | null): HTMLElement {
  const wide = w > 600
  // The root is handed to CSS3DObject before React has rendered anything, so
  // its own look is applied here by hand; everything inside is React.
  // Glass corners measured off Apple's mesh (10.7 mm inner; 11.4 mm outer,
  // 1.3 mm on its hinge edge). The active area sits 11 px in, concentric.
  const root = document.createElement('div')
  root.dataset.os = ''
  const p = stylex.props(styles.os, styles.size(w, hgt), wide ? styles.osWide : styles.osNarrow)
  root.className = p.className ?? ''
  for (const [k, v] of Object.entries(p.style ?? {})) root.style.setProperty(k, String(v))
  // Tap to wake. A block, not an expression: an `on*` handler returning false
  // cancels the event, and a cancelled pointerdown never focuses the field
  // under it, so nothing could be typed anywhere.
  root.onpointerdown = () => {
    if (device.asleep) device.wake()
  }
  createRoot(root).render(<SpringBoard w={w} hgt={hgt} wall={wall} boot={boot} shots={[]} />)
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

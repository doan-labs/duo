import * as stylex from '@stylexjs/stylex'
import { createRoot } from 'react-dom/client'
import { Notes } from '../../../packages/apps/notes/index.tsx'
import { colors, fonts } from '../../../packages/uikit/tokens.stylex.ts'

// E0 isolates document construction from the host database, which is gated by E1.
// The probe uses the real Notes component with the in-memory KV fixture below.
const root = document.createElement('main')
document.body.append(root)
const styles = stylex.create({
  screen: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.black,
    color: colors.white,
    fontFamily: fonts.system,
    display: 'flex',
    flexDirection: 'column'
  }
})
createRoot(root).render(
  <div {...stylex.props(styles.screen)}>
    <Notes os={{ shots: [], camera: { current: null }, home() {}, open() {} }} />
  </div>
)

setTimeout(() => {
  const ta = document.querySelector('textarea')!
  const result: Record<string, unknown> = {
    loader: window.name,
    origin: location.origin,
    cspFirst: document.head.firstElementChild?.getAttribute('http-equiv') === 'Content-Security-Policy',
    rendered: !!ta,
    color: ta && getComputedStyle(ta).color,
    icons: [...document.querySelectorAll('i')].some((el) => getComputedStyle(el).maskImage.includes('data:')),
    lifted: document.querySelectorAll('[class*="duo-dynamic-"]').length,
    tauri: typeof (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  }
  for (const [key, read] of Object.entries({
    parentDocument: () => parent.document,
    localStorage: () => localStorage.length,
    indexedDB: () => indexedDB.open('forbidden'),
    caches: () => caches
  })) {
    try {
      read()
      result[key] = 'accessible'
    } catch {
      result[key] = 'denied'
    }
  }
  parent.postMessage({ stage2: result }, '*')
}, 1000)

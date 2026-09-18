# Your first app

`create` writes five files. Here is what each one does and what to change first.

## manifest.json

```json
{
  "id": "dev.example.my-app",
  "name": "my-app",
  "version": "1.0.0",
  "lane": "community",
  "entry": "main.tsx",
  "icon": "icon.png",
  "author": "Your name",
  "repo": "https://github.com/your-name/your-app",
  "license": "MIT"
}
```

Change `id` before you share anything: it is reverse-DNS, immutable, and the key for the app's data. `name` is the home screen label and must fit in twelve characters. Every field is in [Manifest](manifest.md).

## main.tsx

```tsx
import { os } from '@doan-labs/duo-sdk'
import { Nav, Page } from '@doan-labs/duo-uikit/nav.tsx'
import { colors } from '@doan-labs/duo-uikit/tokens.stylex.ts'
import * as stylex from '@stylexjs/stylex'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  useEffect(() => { requestAnimationFrame(() => os.ready()) }, [])
  return (
    <main {...stylex.props(styles.root)}>
      <Nav><Page title="my-app"><ul><li>Your first Duo app</li></ul></Page></Nav>
    </main>
  )
}

const styles = stylex.create({
  root: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', color: colors.white, backgroundColor: colors.black }
})

await os.connect()
createRoot(document.body).render(<App />)
```

Two lines matter. `await os.connect()` runs before anything renders: it performs the handshake with the shell and fills `os.view`, `os.owner` and `os.session`. `os.ready()` after the first paint tells the shell to drop its launch cover. Everything else is React.

Colours come from the kit's tokens, never literals. The two displays have different densities and the shell tunes the palette for both; a hex value looks wrong on one of them.

## Reading the fold

```tsx
import { useDisplay } from '@doan-labs/duo-uikit'

function Layout() {
  const view = useDisplay()   // { display, placement, width, height, visible, active, focused, angle }
  return <Grid columns={view.display === 'cover' ? 1 : 2} />
}
```

`display` is `cover` or `inner`. `width` is the box you actually have, which is also the right thing to lay out against: a split half of the inner display is as narrow as the cover. `angle` is the hinge in degrees, live while the person folds. [Displays and the fold](displays.md) has the rest.

## Remembering something

```tsx
import { useKV } from '@doan-labs/duo-sdk/react'

function Note() {
  const note = useKV(os.storage, 'field-note')   // { value, status, set, del }
  return <input value={note.value ?? ''} onChange={(e) => note.set(e.target.value)} />
}
```

Storage is asynchronous, string-valued and private to the app. `status` is `hydrating`, `ready`, `saving` or `error`. Edits made during hydration are kept, writes are serialised, and both displays see the same value. [Storage](storage.md) explains the revisions underneath.

## A complete example

[Fold Compass](https://github.com/doan-labs/iphoneduo/blob/main/examples/fold-compass/main.tsx) is an independent app in about a hundred lines: it reads the hinge angle, switches between a pocket card on the cover and a board on the inner display, and keeps one field note in storage. The [Developer gallery](https://github.com/doan-labs/iphoneduo/blob/main/examples/developer/main.tsx) renders every kit component at both widths.

# iPhone Duo

Apple's iPhone Duo, folding in the browser and in a native window. Three.js scene with a
fixed-view projected screen.

## Run

```sh
bun install
pip install usd-core && python3 scripts/prepare-model.py   # once: fetches Apple's model into public/model
bun run dev                  # web, http://localhost:3000
bun run desktop              # native window (Tauri), needs rustup
bun run desktop:build        # .app / .exe / .AppImage
```

## Docs

`docs/architecture.md` how it fits together, `docs/decisions.md` why, `docs/working.md` how to add things and what is known broken, `docs/debug.md` how to drive and verify it from a terminal.

## Layout

```
index.html          entry page: the CSS reset and the script tag
serve.ts            dev server: page plus public/ as plain files
build.ts            production build: Bun.build with the StyleX plugin, writes dist/stylex.css
stylex-plugin.ts    StyleX for Bun: runs the Babel plugin in onLoad; bunfig.toml points the dev server at it
src/
  main.ts           scene, model, fold, loop
  hud.tsx           floating HUD: hinge slider, Open, Flip, Home, Auto-rotate
  buttons.ts        the four buttons on the frame: meshes, springs, click
  native.ts         the one bridge to the desktop shell; browser gets defaults
  shaders/          fold and projected-screen GLSL, as TS strings
  os/               the fake iOS drawn on the displays
    os.tsx          boot: builds one display's root element and renders the shell
    device.ts       the device the frame buttons see: lock, sleep, the displays attached
    buttons.ts      what a press means: click, hold, double, chord, with iOS timings
    screen.ts       the shell baked to canvas for the fold
    springboard/    the shell one display runs, one file per layer
      springboard.tsx     the layer stack and the state that outlives any one layer
      scenes.ts           the open apps: open, close, swap, launch, the icon-to-app zoom
      home-screen.tsx     paged grid, widget cells, page dots, dock, search button
      home-bar.tsx        the home indicator, the drag that grabs an app, the drop zones
      lock-screen.tsx     lock screen, padlock, torch and camera buttons
      status-bar.tsx      the top-right status stack
      spotlight.tsx       Spotlight and the magnifier glyph
      control-center.tsx  Control Center, iOS 26's first page
      power.tsx           slide to power off, and the boot logo
      system-hud.tsx      volume readout, screenshot flash and thumbnail, brightness veil
      tile.tsx            one cell of the home grid: Icon, Tile, WidgetTile
      clock.ts            useNow, clock, dateOf: the minute the shell shares
      gestures.ts         swipe, settle, zone, spot, zoom; pure logic, no React
    uikit/          what the apps link against, and nothing else
      app.ts            the App, Os and CameraHooks types; no runtime
      nav.tsx           Nav, useNav, Page
      sym.tsx           Sym, the SF Symbol glyphs
      styles.ts         the blocks more than one file uses, glass included
      tokens.stylex.ts  colours, fonts, per-app surface, grid geometry, easings
    apps/           one React component per app and its widget; index.ts is the home grid
  icons/            app icons imported by code
  desktop/          Tauri shell, one crate
    main.rs         wires only
    commands/       one file per feature the web side can call
    platform/       OS-specific code behind one trait, nowhere else
public/model/       Apple's USDC + textures, gitignored, shipped verbatim
docs/               architecture, decisions, workflow, debugging
scripts/            run by a human, never imported: model prep, icons, screenshots
design/             Blender source and renders, not part of the build
.cache/             Rust build output (see .cargo/config.toml)
```

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
packages/
  shell/            scene, HUD, hardware buttons, shaders, native.ts, index.html
    springboard/    display layers, scenes, gestures and device controls
    apps.ts         unchanged baked-app seed registry and home grid
    desktop/        Tauri crate, commands/ and platform/
  uikit/            existing UI, tokens, icon catalog and shared helpers
  sdk/              transitional host types; future runtime contract scaffold
  cli/              future CLI scaffold (@doan-labs/ipduo)
  web/              future official website scaffold
  apps/             one private workspace per existing app
public/             static assets; icons/ and gitignored model/
serve.ts            root development server
build.ts            root production build, writes dist/ and stylex.css
stylex-plugin.ts    shared Bun StyleX compilation
bunfig.toml         development plugin registration
tsconfig.json       shared strict TypeScript configuration
.cargo/             shared Rust cache configuration and shell-check alias
docs/               architecture, decisions, workflow, debug and platform plan
scripts/            model preparation, asset extraction, screenshots
design/             Blender sources, outside the build
.cache/             local verification evidence and Rust build output
```

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

[Developer platform review](docs/platform/review.md): create an external app,
install it without rebuilding the simulator, and reproduce stages 2–5 evidence.

[Documentation index](docs/README.md): architecture, working guide, debugging, decisions,
current platform references, roadmap and verification guidance.

## Layout

```
packages/
  shell/            scene, HUD, hardware buttons, shaders, native.ts, index.html
    springboard/    display layers, scenes, gestures and device controls
    apps.ts         remaining baked apps and home grid
    runtime/        isolated app bridge, storage, lifecycle, catalog and registry
    desktop/        Tauri crate, commands/ and platform/
  uikit/            harvested typed components, tokens, icons and shared helpers
  sdk/              host types, sandbox contract/client and async React adapter
  cli/              create/check/build/dev/preview/serve, import and type validation
  web/              future official website scaffold
  apps/             one private workspace per existing app
public/             static assets; icons/ and gitignored model/
examples/
  fold-compass/     independent public-SDK demo, never seeded into the shell
  developer/        installable public UI-kit component gallery
serve.ts            root development server
build.ts            root production build, writes dist/ and stylex.css
stylex-plugin.ts    shared Bun StyleX compilation
bunfig.toml         development plugin registration
tsconfig.json       shared strict TypeScript configuration
.cargo/             shared Rust cache configuration and shell-check alias
docs/               maintainer guides and documentation index
  platform/         current platform references, roadmap, publication/website plans
    api/            generated UI-kit API data
scripts/            model preparation, asset extraction, screenshots
  build-app.ts      isolated document builder and local release catalog
  build-preinstalled.ts  bundled Notes and Weather releases
  package-platform.ts  private SDK/kit/CLI archives for external consumers
  check-platform.ts    local/CI platform gate
  check-app-tokens.ts   app appearance token gate alongside Biome
  generate-kit-docs.ts  exported props and TSDoc to API data
  checks/stage2/    document, storage, permission, lifecycle and MVP checks
  checks/stage3/    external developer workflow and preview teardown checks
  checks/stage4/    official app captures, component gallery and validation checks
.github/workflows/ read-only platform validation; no publication or deployment
design/             Blender sources, outside the build
.cache/             local verification evidence and Rust build output
```

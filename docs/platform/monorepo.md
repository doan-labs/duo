# Monorepo

Bun workspaces, no extra tooling. One root `package.json` with
`"workspaces": ["packages/*", "packages/apps/*"]`. Biome, tsconfig, git hooks,
`.cargo` stay at the root.

## Layout

```
packages/
  shell/          main.ts, hud, buttons, shaders, screen.ts, springboard/, native.ts
    desktop/      the Tauri crate, moved from src/desktop
  uikit/          @doan-labs/ipduo-uikit: components, styles, tokens, shared view helpers
  sdk/            @doan-labs/ipduo-sdk: host API, protocol, manifest types, display information
  cli/            @doan-labs/ipduo: `create`, `dev`, `check`
  web/            the official site
  apps/
    weather/      manifest.json, icon.png, index.tsx, styles.ts, data.ts
    stocks/
    settings/
    ...           one folder per app, official and community side by side
```

## What moves

- `src/os/uikit/*` → `packages/uikit/`. `src/os/apps/shared.ts` (art, beep, hue,
  walk, poly, mmss) joins it; more than one app uses every export.
- Public host types currently in `uikit/app.ts` move to SDK ownership. UI-only
  adapters stay in the kit.
- `src/os/apps/<name>/` → `packages/apps/<name>/`. Apps are already folders.
- Shared UI imports use the kit; host API imports use the SDK. Apps import
  nothing from the shell or another app. The kit consumes the SDK contract;
  the shell implements it. Extraction requires build-path verification.
- `src/os/apps/index.ts`, the home grid, stays in the shell as the seed list of
  baked apps and their default positions. It stops being the only registry
  (runtime.md).
- `src/desktop` → `packages/shell/desktop`. `tauri.conf.json` `frontendDist` and
  `beforeDevCommand` change; `.cargo/config` at root points at the new crate.

## Build

Each downloadable app builds from its manifest entry into an immutable document
bundle: HTML, JavaScript, compiled CSS, and referenced assets. React, React DOM,
the SDK, and the kit are included when needed by that app. Any split chunks
belong to the same release. Apps do not externalize dependencies to the shell's
copies or use its import map. The shell build is separate.

Verify SDK and kit consumption outside workspace-only source resolution before
publishing; an isolated app must include everything its own document needs.

## Known bites

- **StyleX plugin across packages.** `stylex-plugin.ts` filters by path in
  `onLoad`. Workspace packages resolve through `node_modules/@doan-labs/ipduo-*`, so
  the filter must not exclude that path. Verify workspace and packaged builds.
- **Tokens are owned by the kit.** Each isolated app includes its compiled
  variables and styles; it cannot inherit the shell's CSS. Keep JavaScript
  and CSS from the same build together.
- **Type-checking apps against the kit.** Each app package gets a
  `tsconfig.json` extending root and checks against SDK and kit exports. The
  project-reference/emission configuration remains to be designed.
- **CODEOWNERS.** `packages/shell`, `packages/uikit`, `packages/sdk` and every
  official app folder require maintainer review. Community author review can
  supplement that; listing two owners does not require both approvals. Protect
  trust lists and publishing workflows too.

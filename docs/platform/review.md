# Local platform review

Stages 2–5 implement the non-website platform. Nothing was published, deployed
or pushed. Public npm packages and the hosted simulator are not prerequisites
for this review. Run commands from the repository unless a step changes directory.
Bun and the existing dependencies are required; full simulator rendering also
needs the locally prepared Apple model (`docs/working.md`).

## 1. Start the simulator

```sh
bun run dev
```

Open `http://localhost:3000/?app=App%20Store&deg=180` in a browser. Keep this
terminal running. For the ordinary native window, use `bun run desktop` instead.

## 2. Create and install an external app

In another terminal at the repository root:

```sh
platform_repo="$PWD"
platform_demo="$(mktemp -d -t ipduo-review)"
cd "$platform_demo"
bun "$platform_repo/packages/cli/index.mjs" create field-guide --packages "$platform_repo/.cache/platform-packages/final/artifacts.json"
cd field-guide
bun install --ignore-scripts
cp "$platform_repo/examples/fold-compass/main.tsx" main.tsx
bun run check
bun run build
bun node_modules/@doan-labs/ipduo/index.mjs serve dist --port 5173
```

In App Store, load `http://localhost:5173/index.json`, then GET and OPEN
field-guide. Fold to 120° and 0°: the board changes to a folded workspace and
pocket card. Enter a field note and reopen/restart: the note persists. The app
uses public packages from local archives; installation does not rebuild the shell.
The source copied above is the independent Fold Compass demonstration, not a
required repository contribution for future developer apps.

## 3. Try isolated development

Stop the catalog server with Ctrl-C in that terminal, then, still inside
`field-guide` (the root `bun run dev` is the simulator, not this command):

```sh
bun run dev --port 5173 --simulator http://localhost:3000
```

Open the printed URL, or
`http://localhost:3000/?dev=http%3A%2F%2Flocalhost%3A5173&app=dev.example.field-guide`.
Its field note starts separately from the installed app. Edit the title in
`main.tsx`, then explicitly reload the simulator to select the rebuilt release.
Ctrl-C stops the watcher/server. Remove the DEV row in Store to erase only its
preview data. The host pins verified HTML in an opaque Blob iframe; no remote
second response can replace it.

## 4. Review updates and retained safety

For a normal update, change the app version in `manifest.json`, document it in
`CHANGELOG.md`, run check/build, and serve the same catalog origin again. Store's
explicit Refresh offers UPDATE. A running session keeps its release; activation
waits for it to end. A failed launch offers restore/retry and preserves the prior
checkpoint. Uninstall clears that installed app's data, without clearing a DEV
namespace. Catalogs are unsigned; the existing app binds to its installation
origin. There is no catalog polling or automatic shell update.

Camera/microphone, more device permissions, expanded widgets, advanced recovery,
accounts, payments, reviews, rankings, recommendations and category expansion
remain deferred. Working trusted shell app capabilities and shared lifecycle
safeguards remain intact. `packages/web` and its owner's worktree were untouched.

## 5. Reproduce the automated evidence

From the repository root, run heavy simulator checks serially. `notes.mjs` and
`weather.mjs` need the simulator from step 1 on port 3110 (`PORT=3110 bun run dev`);
the others start their own servers.

```sh
bun run build
bun scripts/check-platform.ts
PLATFORM_ARTIFACTS=.cache/platform-packages/final/artifacts.json bun scripts/checks/stage4/packages.mjs
MVP_EVIDENCE_DIR=.cache/debug/stage5/mvp bun scripts/checks/stage2/mvp.mjs
bun scripts/checks/stage2/runtime.mjs
bun scripts/checks/stage3/development.mjs
PLATFORM_ARTIFACTS=.cache/platform-packages/final/artifacts.json PLATFORM_EVIDENCE_DIR=.cache/debug/stage5/workflow bun scripts/checks/stage3/workflow.mjs
bun scripts/checks/stage2/notes.mjs
bun scripts/checks/stage2/weather.mjs
```

The external checks create fresh projects. To prepare a new archive set, run
`bun scripts/package-platform.ts .cache/platform-packages/review` and pass its
`artifacts.json`. Use a new directory when repacking an unchanged private version
to avoid Bun reusing an earlier local archive cache.

Artifacts: `dist/`, `.cache/platform-packages/final/artifacts.json`, and the
ordinary debug native binary `.cache/cargo/debug/iphoneduo`. Build the latter
with `bun x tauri build --debug --no-bundle` from `packages/shell`.
Versions: SDK/CLI 0.0.0, kit 0.1.0, protocol 1. These are private previews.

Read [stage 5](progress/stage-5.md) for measured browser/native coverage and
limits, [stage 4](progress/stage-4.md) for the 39-app capture matrix, and
[website integration](website-integration.md) for the separate owner's handoff.
Remote CI, npm publication, signed native distribution and public hosting still
require their normal external release decisions; none was performed here.

# Local platform review

Stages 2–5 implement the non-website platform. Nothing was published, deployed
or pushed. Public npm packages and the hosted simulator are not prerequisites
for this review. Run commands from the repository unless a step changes directory.
Bun and installed repository dependencies are required; run `bun install` on a fresh clone.
Full simulator rendering also
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
platform_archives="$(mktemp -d -t ipduo-packages)"
bun scripts/package-platform.ts "$platform_archives"
export PLATFORM_ARTIFACTS="$platform_archives/artifacts.json"
platform_demo="$(mktemp -d -t ipduo-review)"
cd "$platform_demo"
bun "$platform_repo/packages/cli/index.mjs" create field-guide --packages "$PLATFORM_ARTIFACTS"
cd field-guide
bun install --ignore-scripts
cp "$platform_repo/examples/fold-compass/main.tsx" main.tsx
bun run check
bun run build
bun node_modules/@doan-labs/duo-cli/index.mjs serve dist --port 5173
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
safeguards remain intact. Website integration remains a separate workstream.

## 5. Reproduce the automated evidence

From the repository root, run heavy simulator checks serially. `notes.mjs` and
`weather.mjs` need the simulator from step 1 on port 3110 (`PORT=3110 bun run dev`);
the others start their own servers.

```sh
platform_archives="$(mktemp -d -t ipduo-check-packages)"
bun scripts/package-platform.ts "$platform_archives"
export PLATFORM_ARTIFACTS="$platform_archives/artifacts.json"
bun run build
bun scripts/check-platform.ts
bun scripts/checks/stage4/packages.mjs
MVP_EVIDENCE_DIR=.cache/debug/stage5/mvp bun scripts/checks/stage2/mvp.mjs
bun scripts/checks/stage2/runtime.mjs
bun scripts/checks/stage3/development.mjs
PLATFORM_EVIDENCE_DIR=.cache/debug/stage5/workflow bun scripts/checks/stage3/workflow.mjs
bun scripts/checks/stage2/notes.mjs
bun scripts/checks/stage2/weather.mjs
```

The external checks create fresh projects. To prepare a new archive set, run
`bun scripts/package-platform.ts .cache/platform-packages/review` and pass its
`artifacts.json`. Use a new directory when repacking an unchanged private version
to avoid Bun reusing an earlier local archive cache.

Artifacts produced locally: `dist/`, the selected archive directory, and the
ordinary debug native binary `.cache/cargo/debug/iphoneduo`. Build the latter
with `bun x tauri build --debug --no-bundle` from `packages/shell`.
Versions: SDK/CLI 0.0.0, kit 0.1.0, protocol 1. These are private previews.

## 6. Reproduce the submission and publication checks

```sh
bun run build                                                        # the shell the runtime probe serves
bun scripts/check-submissions.ts community-apps/fold-compass --runtime   # PASS, evidence in .cache/submissions/
bun scripts/checks/submission/negatives.mjs                          # nine invalid submissions fail for the stated reason
bun scripts/checks/publish/publisher.mjs                             # sequential publish, update, retry, failure, delist
cd packages/web && bun run build                                     # assembles public/catalog/ from dist/cdn (+ the catalog branch)
```

The runtime probe installs the built release through the real Store from a loopback catalog
in headless Chromium, launches it, captures `inner.png` and `cover.png` and records console
errors and app-frame requests outside the declared origins. The example's committed
screenshots are those captures. The publisher check runs on a scratch tree inside `.cache/`.
`scripts/checks/store/catalog-switching.mjs` covers the default catalog, a developer catalog,
**Back to Duo catalog** and the origin-binding refusal in Chromium.

## Verification scope and limits

### Browser builder (2026-09-18)

The `/build` workspace was verified against the production static build in Chromium 153
using agent-browser 0.27.0. `bun run typecheck`, the website production build, lint on
changed builder/runtime files, and all six provider/schema tests (18 assertions) passed.
The PostToolUse formatting hook was inactive; the pre-commit hook subsequently formatted
and checked the staged changes. No manual formatter was run.

`bun scripts/check-builder.mjs http://localhost:3019/build` passed real browser compilation
and sandbox execution with streamed fixture replies: a timer keeps counting across a
revision, folding retains the inner view and starts the cover, Undo restores code/data,
one repair is the limit, and a startup failure that writes app data rolls those writes
back. Stop aborts without resubmitting. Altered document bytes are refused. Mobile tabs
retain the simulator; a mobile reload restores conversation but not the key.
Captures go under `.cache/debug/builder/<session>/`; inspect pixels after the state checks.

Live browser-to-OpenRouter checks used `openai/gpt-5.4-mini` for a timer and a follow-up
adding one minute, with the running deadline retained. `google/gemini-3.1-flash-lite-preview`
built notes and added Delete while folded in two successful provider requests, with the
saved note retained and Delete working on the cover. Both display frames reported ready,
used only `allow-scripts`, and had opaque origins. The real key was absent from project
IndexedDB and localStorage, then cleared by navigation. The Clear key control was checked
separately with a non-secret fixture. Light/dark 390 px previews and
1440 px desktop captures were inspected; mobile fold controls fit inside the frame.

This is local Chromium evidence, not Cloudflare deployment, Safari, native parity, every
compatible provider or a guarantee that any model-generated app is correct. Provider CORS,
hosted asset headers and long-running generated-code behavior need separate checks.
The full historical platform adversarial suite was not rerun for this change.

Additional live check: `meta/muse-spark-1.3-contributor` built a water counter and
updated it in two successful requests without compiler repair. The follow-up preserved
the count, fixed literal Unicode escapes and an oversized first layout, and added a
Remove control disabled at zero. The cover retained the count after folding. Generated
designs still benefit from visual review even when compilation succeeds.

After integrating main's UI kit 0.2.0 and `/kit/docs` routes, typecheck, provider tests,
the production build and the complete builder browser check passed again. This run
used the refreshed browser runtime descriptor, including the new kit exports and styles.

The completed local audit verified all four MVP outcomes in Chromium, including stable
view IDs across 180/120/0 degrees and unchanged hashes for all 378 simulator build files.
The external workflow exercised create/develop/install, process restart, update staging,
activation, failed-launch restore/retry, a newer fixed release and uninstall. The runtime
matrix exercised policy tampering, migration, quota abort, ownership/commands, denied
permissions, cross-tab removal and stale-generation rejection after reinstall.

The kit gallery covered external package consumption, keyboard/navigation, mirror state
and reduced motion. All 39 official app surfaces were captured at both fold endpoints
(78 inspected captures); this was a rendering smoke matrix, not exhaustive interaction.
Maps' external embed was blank in both baseline and final headless captures; it has since
been rebuilt on tiles it draws itself and does render there (decision 60). Camera used
its unavailable state in headless Chromium.

Native checks covered real Store installation, field-note persistence across process
restart, stable folding views and verified Blob preview isolation with separate preview
data. Chromium lifecycle results do not establish full native update/recovery, permission,
background-media or Windows/Linux parity. Those checks remain unrun.

Native test storage requires an explicit WebKit data-store partition; a different Tauri
identifier alone does not isolate it. The harness copies the desktop crate and sets the
store identifier through the window builder to avoid the installed Tauri config generator's
array/Vec mismatch and runtime adapter omission. Production settings remain unchanged.
Build the harness's generated crate, not the production crate with an identifier-only
config override. Earlier identifier-only tests are not evidence of storage isolation.

Historical local evidence is under `.cache/debug/stage5/` and `.cache/debug/stage4/`,
including `stage5/mvp/chromium.json`, `stage5/workflow/evidence.json`, native captures and
the gallery/app capture matrix. These files are ignored and may not exist on another
machine. The commands above reproduce checks; paths alone are not evidence of a new run.
Run heavy SwiftShader checks serially and keep probe frames onscreen; renderer starvation
or suspended first-paint callbacks must not be fixed by weakening lifecycle deadlines.

The submission and publication workflows were verified locally through their scripts; a
remote run of `submissions.yml` and `publish.yml`, and the site serving `/catalog` from the
`catalog` branch, need the first real pull request and deploy. The native **Submit your app**
link compiles (`cargo shell-check`) but opening a browser from the Tauri window was not
exercised in this pass.

Remote CI, npm publication, signed native distribution and public hosting require their
normal release decisions; none is established by local verification. See
[website integration](website-integration.md) for the public-site interface.

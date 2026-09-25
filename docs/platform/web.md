# Website and deployment plan

The current authoring route is `/build`, with chat and the real simulator together.
`/get-started` and `/simulator` redirect there. The [browser builder](builder.md)
supersedes the separate-page authoring flow described in the historical build record below.

Status: the site is built in `packages/web` (see the build record at the end); the
deployment requirements below are a plan, not deployment evidence. Public packages remain unpublished. Use [local development](dev.md) today and
[the integration guide](website-integration.md) for existing API/catalog interfaces.

`packages/web`, same repo, same build, deploys with the rest. Its advantage over
any other platform's docs: the simulator is a web page, so the site embeds the
real device instead of screenshots.

## Deployment

Accepted 2026-09-18: the canonical public origin is
`https://duo.doan-labs.com`. Host the website, browser simulator, first-party
catalog and immutable app bundles as static files on this origin initially.
Build locally or in CI; installation, app execution and persistence stay in
the client. No custom application server is required for the MVP. This does
not change the SDK, iframe isolation or lifecycle contracts.

The hosting provider and final paths for the simulator, docs, catalog and
bundles remain open. Keep deployment URLs configurable rather than encoding
an assumed route layout into the SDK. A separate CDN hostname is optional;
external developer catalogs remain supported.

Deployment requirements:

- Configure DNS and HTTPS for the canonical domain, and serve correct content
  types. Do not return the website's HTML fallback for missing catalog or
  artifact paths.
- Cache immutable versioned bundles long-term. Revalidate site entry documents
  and keep catalog freshness short (the store proposal uses 60 seconds).
  Publish complete artifacts before the catalog references them. An already
  open simulator does not automatically adopt newly deployed shell code.
- Configure the desktop shell's first-party catalog URL and verify required
  cross-origin reads from the actual native origin. Verify hosted-shell reads
  of external developer catalogs separately. CDN CORS and the app-document
  sandbox/CSP serve different purposes; preserve the latter.
- Verify hosted `?dev=` loading against localhost in supported browsers,
  including CORS and browser local-network permissions. Retain a fully local
  shell plus app development path when hosted access is unavailable.
- Verify the website embed, app installation and persisted launch on the
  deployed origin. A successful local build is not deployment evidence.

Web installations and data are scoped to the origin. Localhost, previous
domains and the native shell have separate storage; no automatic migration
or cross-device sync is promised. Website and simulator pages on this origin
share its storage boundary regardless of URL path. Downloadable app documents
remain opaque-origin sandboxed frames and use the SDK for persistence.
Choose the public origin before collecting user data; a later domain change
would need an explicit migration/export plan.

These are deployment requirements, not a claim that DNS, hosting or browser
compatibility have already been verified.

## Pages

1. **Home.** The device, folding on scroll. Download links for the dmg, msi,
   AppImage, and Open in Browser.
2. **Get started (after publication).** `npx @doan-labs/duo-cli create`, `npx @doan-labs/duo-cli dev`, and the `?dev=`
   link. Target: an app on the home screen in five minutes. The embedded
   simulator targets the reader's localhost app document, subject to browser
   network permissions and CORS. Development uses the production sandbox and SDK.
3. **UI kit.** One page per component, generated from the TSDoc and props type
   in `packages/uikit`. The same demo file that powers the in-OS Developer app
   renders here, so there is one source of truth. Never hand-written.
4. **SDK and app lifecycle.** The manifest, host compatibility, bridge protocol,
   isolated display instances, and fold behavior. Mostly manifest.md and
   runtime.md rendered; label unresolved contracts until implemented.
5. **Publish.** publishing.md rendered, plus the PR template.
6. **Human Interface Guidelines.** Short and opinionated. The fold is the
   headline: design for the cover width first, then let the inner display give
   you room. Second: your app runs twice. Third: tokens only.
7. **Changelog.** The SDK's, kit's, and shell's, one page.

## Rules

- Docs live next to code, superseded by decision 57 (2026-09-18): the site's `/docs`
  is written for developers in `packages/web/content/docs/`; only the SDK and kit
  references are generated from the source. This folder is the plan and record
  and is not rendered.
- No blog, no accounts, no forum. GitHub Discussions link in the footer.
- Ships after the kit exists. Building it earlier means writing it twice.

## Build record

Newest first. Each pass records what changed and how it was verified.

### The core idea and the store step use the real shell too

- "The fold is not a breakpoint" (`src/home/fold.tsx`) drives a `Simulator bare`
  frame from its four posture chips. The code sample now shows what
  `useDisplay()` really returns (display, angle, width, height) and the line
  each posture reaches is lit; `src/highlight.tsx` colours it with a
  hand-rolled tokenizer and `color.syn*` tokens that follow the section's theme.
  The readout shows display, angle, placement and size. No CSS mockup remains
  on the home page except in the build section.
- The App Store step of the scrolling scene goes full width: caption centred on
  top, the phone large beneath (`Simulator fill` takes the grid row's height).
- Shell: with `?hud=0` the fit reserves no HUD bands and centres the image on
  the phone's projected bounds, not the hinge, so a closed or half-open phone
  sits in the middle of the frame. The flexible display's bounding box is now
  cut at the hinge (only its moving side turns); before, a closed phone's
  bounds swung the fixed half's width through the air, which also made the fit
  shrink the phone more than needed in the desktop window.
- `Simulator` paints the frame's backdrop from its own box, not the page body,
  so a frame in a dark section is dark.
- Verification: `bun scripts/check.mjs` PASS (14 routes × 3 widths × 2 schemes,
  84 screenshots, 63 links); screenshots of 180°, 120°, 90° and 0° in the fold
  section and of the full-width store step inspected.

### One real shell carries the home story

- The "Fold it" scene, the camera section and the App Store section are one
  sticky scene in `src/home/works.tsx`: a single `Simulator bare` frame that
  folds, turns and reopens over four captions, then crosses to the right column
  for "Real hardware" and "The twist". The camera step shows a card that says
  what will be asked and opens the Camera app only after "Allow camera"; the
  store step opens the App Store. `camera.tsx` and `store.tsx` are gone.
- The CSS device mockup no longer appears in that scene. The bridge gained
  `?hud=0` (no controls), `paused` (render loop off while the frame is off
  screen) and `app` (launch by name), and the frame URL is fixed at first
  render: a live pose in `src` reloaded the scene on every scroll step, which
  was the flashing and lag reported on the first cut.
- The site describes Duo as a simulator of Apple's iPhone Duo, nowhere as a
  phone that does not exist.
- Verification: `bun scripts/check.mjs` PASS (13 routes × 3 widths × 2 schemes,
  78 screenshots, 63 links); a headless scroll-through with a fake camera
  confirmed zero frame reloads, the crossover, Allow → Camera app with a live
  feed, App Store on the last step, and Home again on scrolling back.

### Developer docs replace the rendered repository notes

2026-09-18, after the rebase below. The owner reviewed the rebased pages and
rejected two things: the "Get started · Works today" eyebrows with a status
notice under every heading, and `/docs` listing the repository's planning and
progress files. Decision 57 records the change.

- `/docs` renders `packages/web/content/docs/*.md`: Start (Introduction,
  Getting started, Your first app), Build (Manifest, Lifecycle, Displays and
  the fold, Storage, Permissions, then the SDK reference at `/docs/sdk`), Ship
  (CLI, Catalogs, Publishing), and a Reference group linking `/kit/docs` and
  `/changelog`. `/sdk` forwarded to `/docs/sdk` until decision 96 made it the
  hardware showcase; the global bar lists Apps, UI kit, SDK, Docs and a
  highlighted Simulator. Each page has the
  outline box when long, previous and next, and an edit link. The index shows
  each page's first paragraph. Content is drawn from the SDK source
  (`client.ts`, `protocol.ts`, `manifest.ts`, `permissions.ts`), the three
  package READMEs, `dev.md`, `store.md`, `security.md` and `publishing.md`,
  stated as what the code does today; the curated official catalog is named
  as not live in Publishing.
- `src/status.tsx` is deleted. No page carries a badge or a notice. Eyebrows
  are the page's name or "Reference"; `PageTop` and `Title` lost their badge
  slot.
- `/get-started` is one four-step timeline (simulator, create, `?dev=`,
  install) and four cards into the docs. `/sdk` is the usage sample, five
  guide links and the generated reference without the baked-app host types.
  `/kit` is a single hero: the count read from the generated API, the install
  line, and a strip that drifts every demo past live; `/kit/docs` leads with the
  README's example and lists components before types.
  `/publish` renders the Publishing page. Guidelines, Simulator, Changelog and
  the home store note lost their notices and now link the new pages.
- `src/markdown.tsx` resolves relative links against `content/docs/` and turns
  a `/`-prefixed link into a router link. `scripts/check.mjs` requires tables
  and code blocks on `/docs/manifest` and `/docs/lifecycle`.
- One hydration mismatch found by the check on the new pages: the previous and
  next links used `docs.indexOf(doc)` on loader data, which is a copy after
  hydration. Matching by slug fixed it (`doc-body.tsx`).

| Run | Result |
| --- | --- |
| `bun scripts/check.mjs http://localhost:3011` | PASS: 13 routes × 3 widths × 2 schemes, 78 screenshots, 63 links |
| `bun run typecheck` (root, then `packages/web`) | passes |
| Desktop screenshots of `/docs`, `/docs/introduction`, `/docs/displays`, `/get-started`, `/sdk`, `/kit`, `/publish` | inspected; the intro's package table became a list after its first column wrapped, and the SDK sample was shortened to fit the measure |

### Rebased onto stages 2–5

2026-09-18, later the same day. `feature/platform-web` was rebased onto `main`
after stages 2–5 landed there, and every page that had described the platform
as "being built" was rewritten against the code that now exists. Nothing on
the site invents a command: every one quoted is in `packages/cli/README.md` or
`docs/platform/review.md`.

| Where | Before | Now |
| --- | --- | --- |
| `/docs` badges (`src/docs.ts`) | every `platform/*` file "Planning document"; the contract "Proposed" | the platform files whose header says what is implemented carry "Works today" with a note that their roadmap sections stay intent; progress records "Works today"; the contract "Works today"; revision 1's review "Transitional"; `platform/web.md` "Proposed" (deployment still open). New files ordered in: `stage-2-mvp`, `review`, `website-integration`, `progress/stage-2…5`, `progress/web`. Group renamed Platform plan → Platform |
| `/get-started` | SDK path "Not built yet", `npx` commands | four steps that work locally: package archives, `create --packages`, `check`/`dev`, `?dev=` on the local simulator, `build`/`serve` and the Store's Developer catalog field. Links the CLI reference and Fold Compass |
| `/sdk` | legacy types first; contract "Proposed"; `os` "proposed, not published" | the sandbox client (`os`, `useKV`) first with the usage from `dev.md`, generated cards for the non-legacy exports, the contract "Works today", the baked-app host types last as "Transitional"; camera and microphone stated as rejected |
| `/kit` | "0.0.0, harvest is a later stage", "Developer app does not exist" | 0.1.0 private preview, 39 official surfaces on it, the Developer gallery linked as the live demo |
| `/simulator` | `?dev=` "Not built yet" | `?dev=` in the parameter table |
| `/changelog` | "Not built yet, all 0.0.0" | "Nothing published yet" as Proposed: kit 0.1.0 has the first changelog entry, the rest 0.0.0 from local archives |
| `/publish` | PR template "later stage" | template still absent; the per-app checks and the CI workflow exist; the curated catalog does not |
| `/apps`, `home/store.tsx`, `home/sdk.tsx`, `home/build.tsx` | "once the stage 2 runtime lands"; four brief primitives including `requestCamera()`; `npx create-duo-app` | "installs from a catalog through the Duo Store"; the store note says the frame's store is real, lists the bundled Notes and Weather, and takes a developer catalog URL; `useDisplay()` `useKV()` `os.commands` `os.open()`; the CLI's real create/dev lines and the `?dev=` URL; the editor snippet reads `display === 'cover'` |

`scripts/api.ts` learned three shapes it silently skipped: a class
(`PlatformError`), a re-export or local alias inside the target file
(`animations`, `Symbol`, `useNavigation`, now named by their exported name so
`useNav` no longer appears twice) and a value declared in the index itself
(`os`). 58 exports generate, up from 54.

The embed needed one more copy: the runtime seeds the preinstalled apps from
`/preinstalled/index.json` and reads `/cdn/index.json` first, both absolute,
so `scripts/simulator.ts` now copies `dist/cdn` and `dist/preinstalled` to the
site root beside `/model` and `/icons`. Without them the Store frame showed
"Preinstalled catalog unavailable. Reload to retry." on a black screen.

Verification, headless Chromium against `dist/client` on port 3011:

| Run | Result |
| --- | --- |
| `bun scripts/check.mjs http://localhost:3011` | PASS: 13 routes × 3 widths × 2 schemes, 78 screenshots, 79 links (up from 35: the new doc pages), theme kept across reload, reduced motion, posture buttons, bridge, no-JS HTML |
| `.cache/debug/web/store-wait.mjs` (the embedded shell on `?app=App%20Store`) | "Loading apps…" for under 8 s, then the App Store with Notes 1.0.0 and Weather 1.0.0 (OPEN, Remove App) and the Developer catalog field; the only 4xx is `/favicon.ico` |
| Screenshots of `/docs`, `/get-started`, `/sdk`, `/kit` and home sections 3, 5, 6 | inspected: badges, commands and copy as described above |
| `bun run typecheck` (root, then `packages/web`) | passes |
| `bunx biome check` on the changed files | no lint errors; two files await the formatter's line wrapping (the PostToolUse hook is inactive in this session; the pre-commit hook formats staged files) |
| `bun scripts/api.ts` | 58 exports |

The "Awaiting stage 2" list at the bottom of the file is done in full.

---

### The second build

The site was rewritten end to end from the launch brief: a phone
Apple hasn't shipped, that you can build apps for. One story on `/`, told in
ten sections, with the product as the centrepiece; the documentation pages
stay and take the same nav, footer and type. Still at the website review gate:
nothing is published, no host is chosen, no CI deploys it.

### The page

| # | Section | What is on screen | How it is made |
| --- | --- | --- | --- |
| 0 | Hero | "A phone Apple hasn't shipped, that you can build apps for." Try Duo, Build an app, the real shell full width | `home/hero.tsx`; `Simulator eager tall`; under 734 px the pre-rendered loop `public/hero.*` |
| 1 | Not a mockup | "It looks like a concept. It behaves like a device." A device that folds, turns and opens as the page scrolls; four captions take turns | `home/works.tsx`; `useScroll` on a 320 vh track driving a sticky `Simulator` by pose; reduced motion gets a still device and the captions as a list |
| 2 | Real hardware | "Your imaginary phone can use your real camera." The shell running Camera; "The apps are fake. The capabilities aren't." | `home/camera.tsx`, near-black palette via the `dark` theme class; the page asks for the webcam when the scene is on screen, then mounts `Simulator app="Camera" mount`, `allow="camera"` |
| 3 | The twist | "And then we gave it an App Store." The shell on the App Store, six steps from Get to launch | `home/store.tsx`; a mono note says the runtime and store are real (stages 2–5) and the frame's store lists the bundled Notes and Weather until a developer catalog URL is pasted |
| 4 | The core idea | "The fold is not a breakpoint. It is input." Four postures, `useDisplay()` code, a live readout | `home/fold.tsx`; a `Segmented` posture control easing the real shell to each `deg` |
| 5 | Build | "Build software for hardware that doesn't exist yet." Terminal, editor beside the device; a colour line changes and the phone folds on a loop; "Change code. Fold the phone. See what breaks." | `home/build.tsx` |
| 6 | SDK | "Four primitives. That is the whole surface." `useDisplay` `useStorage` `requestCamera` `openURL` as four rows | `home/sdk.tsx`; names are the brief's, the SDK page says what exists today |
| 7 | The apps | The catalog (`/catalog/index.json`) and the shell's home-screen list, read at build time into `src/generated/catalog.ts`. `/apps` groups the official lane by status behind `<details>`: Published (open), Built in and In development (folded) | `home/apps.tsx`, reused by `routes/apps.tsx` |
| 8 | Open | "The platform is open. So are the apps." Four facts, the Berlin sentence, fork → PR → review → Duo Store | `home/open.tsx` |
| 9 | Go | "Build something strange for a phone that doesn't exist." Try Duo, Read the docs, View on GitHub | `home/cta.tsx` |

Nav: Duo · Apps · SDK · Docs · Build an app · GitHub · theme toggle · Try Duo.
Footer: Duo · GitHub · Docs · Apps · License, then the Doan mark with "Made by
Doan Labs" (doan-labs.com), the small print, and the remaining pages in a
second row so nothing is orphaned. The page scrolls through Lenis
(`src/smooth-scroll.tsx`), off under reduced motion. Warm off-white by default, dark follows the
system or the toggle; near-black sections use the dark theme class, so in dark
mode they read as the same page. No gradient blobs, no cards for the product,
hairlines only where a list needs them, mono only for code and captions.

### What changed underneath

- **The shell learned the embed bridge** (`packages/shell/main.ts`): `?bg=` at
  load and same-origin `{ deg, yaw, bg }` messages, registered before the model
  loads and queued until the pose functions exist. `src/simulator.tsx` mounts
  a frame when it is within a screen of the viewport, posts the body colour on
  every load and on theme change, and follows its `deg` prop by message. The
  device now floats on the page in both themes; `/simulator` folds without a
  reload.
- **A CSS-3D Duo** (`src/device.tsx`) carried the scroll and posture scenes
  while three WebGL frames were judged too many for one page. Both scenes moved
  back to the real shell and the component was deleted on 2026-09-20; see
  decision 76.
- **`src/reset.css`** replaces the inline reset. See decision 39: React hoists
  the stylesheet link above inline `<style>`, so the reset layer was declared
  last and won, zeroing every StyleX margin in the build only.
- **Prerender** runs three fetches at a time and skips trailing-slash paths;
  ten in parallel timed out and failed one build in three.
- **Theme classes** are token lists: a StyleX theme can compile to two class
  names, and `classList.remove('a b')` throws.
- **Embedded frames drop the HUD title** (`packages/shell/hud.tsx`): the
  "iPhone Duo" heading and display line render only when the shell is the top
  window. Each scene on the site has its own headline.
- **`lenis`** is the one dependency added since the first build, asked for by
  the user; `ReactLenis root` wraps the document in `__root.tsx`.
- `check.mjs` grew: section order on `/`, the frame count per width, the
  posture buttons, the bridge (one live shell load), reduced motion ignoring the
  CSS device's screen fades, the hero video checked at phone width.

### Verification

Headless Chromium (SwiftShader for WebGL), 2026-09-18, against
`dist/client` served on port 3011:

| Run | Result |
| --- | --- |
| `bun scripts/check.mjs http://localhost:3011` | PASS (re-run after Lenis, the camera gate and the footer credit): 13 routes × 3 widths × 2 schemes, 78 screenshots, 35 links; theme toggle dark → light kept across reload (Lenis's `<html>` classes ignored); reduced motion hides nothing; posture Closed → mode "closed"; bridge painted `rgb(11, 11, 10)` behind the hero device; no-JS HTML carries the h1 and links |
| `.cache/debug/web/camera.mjs` (Chrome's fake camera, auto-granted) | the camera frame is `waiting` until the scene scrolls in, then `mounted`; the Camera app shows the feed; no frame has an `h1`; footer reads "Made by Doan Labs" |
| `.cache/debug/web/sections.mjs` (per-section screenshots, light and dark) | all three frames report the page background; no page errors |
| `bun run typecheck` (root, then `packages/web`) | passes |
| `bunx biome check` on the changed files | lint clean; six files under `src/home` await the formatter (hook inactive in this session; the pre-commit hook formats staged files) |
| `bun run build` in `packages/web` | 43 pages prerendered |

Not verified: a real webcam and a real permission prompt in the Camera scene
(headless used Chrome's fake device with the prompt auto-granted), the native
WKWebView, and the hero loop's eyebrow still reads "iPhone Duo" (not
re-rendered).

---

# Website: first build (superseded above)

2026-09-17. `packages/web` is a TanStack Start site built in parallel with
stage 2, on its own branch and checkout (`feature/platform-web`). It renders
the platform's own Markdown, generates the SDK and kit references from TSDoc,
and embeds the real simulator. Stops at the website review gate: nothing is
published, no host is chosen, no CI deploys it.

### Scope delivered

| Page | Route | What it shows | Status shown to the reader |
| --- | --- | --- | --- |
| Home | `/` | Apple-style hero, the live simulator, the three fold rules, tiles to every section, download notes | Installers marked not built; browser marked works |
| Get started | `/get-started` | Clone, model fetch, `bun run dev`, `?app=`/`?deg=` poses, how a baked app is added; the CLI and `?dev=` path as a plan | First half works today; SDK path marked not built |
| Docs | `/docs`, `/docs/<path>` | Every file under `docs/` rendered from source with a badge and a source link; sidebar grouped Platform plan, Progress, Repository | Planning document, Proposed, or Works today per file |
| UI kit | `/kit`, `/kit/docs`, `/kit/docs/<export>` | `/kit` is one hero: the export counts and every demo drifting past live, pausing on hover. Under it the reference is generated from `packages/uikit/index.ts` exports: TSDoc, declaration, props table, source line | Works today |
| SDK | `/sdk` | Generated legacy types marked Transitional; the runtime contract summarised and linked by section, marked Proposed | Two badges, never mixed |
| Publish | `/publish` | `publishing.md` rendered; PR template marked not built | Planning document |
| Guidelines | `/guidelines` | The three fold rules and the iOS rules that still hold, with Notes on the cover to fold | Works today (describes current shell behaviour) |
| Changelog | `/changelog` | Package names and versions read at build time; renders `CHANGELOG.md` when one exists | Not built yet (all packages are 0.0.0, no changelog exists) |
| Simulator | `/simulator` | Full-width embed with Closed / Half open / Open, the URL parameters the shell reads today | Works today; `?dev=` marked not built |

Design follows Apple's marketing site: a 44 px translucent global nav with a
`<details>` menu under 834 px, a one-line ribbon, black hero with 56 px title,
pill buttons, 980 px content column, 1068 / 834 / 734 breakpoints, system font
stack. Every colour, size and easing is a StyleX token in
`packages/web/src/tokens.stylex.ts`; the only plain CSS is the `@layer reset`
block in the root route, matching the shell's convention.

### How it is built

- **TanStack Start on Vite 8**, `packages/web/vite.config.ts`. Every route is
  prerendered from a crawl that starts at `/`, so `dist/client` is a static
  site for any file host. `src/route-tree.gen.ts` is the generator's output,
  renamed from its camelCase default to satisfy the kebab-case rule.
- **StyleX through a Vite plugin**, `packages/web/vite-stylex.ts`. It runs the
  same Babel plugin the root Bun plugin runs, collects every module's rules
  from both the client and server passes, and serves them as the virtual
  `virtual:stylex.css` the root route imports. Runtime injection is off in
  development too: a second `<style>` in the server-rendered head broke
  hydration. HMR refreshes the virtual stylesheet; a brand-new rule can lag one
  edit and a reload catches up.
- **Markdown**, `packages/web/src/markdown.tsx`. No Markdown library is
  installed, so a parser for exactly what `docs/` uses (ATX headings, fenced
  code, pipe tables with code-span-aware splitting, nested bullet and numbered
  lists, quotes, rules; inline code, links, bold, italic) renders to React
  elements, never to HTML. Relative `.md` links become router links when the
  target has a page and GitHub blob links otherwise. Files are bundled as
  strings with `import.meta.glob`; the site keeps no copy.
- **TSDoc**, `packages/web/scripts/api.ts`. TypeScript 7 ships no compiler
  API, so the Babel parser (already installed through `@babel/core`) walks each
  package's `index.ts` exports to their declarations and emits
  `src/generated/api.ts`: doc comment, declaration text, members with their
  own comments, file and line. It also records package versions and any
  `CHANGELOG.md`. Regenerated on every `dev` and `build`; committed so
  typecheck works on a fresh clone.
- **Simulator**, `packages/web/scripts/simulator.ts` and `src/simulator.tsx`.
  The build runs the root `bun run build` and copies `dist/` under
  `public/device/`, plus `/model` and `/icons` at the site root because
  `main.ts` loads them from `/`. In development the frame points at the root
  dev server on port 3000 (`VITE_SIMULATOR_URL` overrides). Pose buttons reload
  the frame with `?deg=`; nothing crosses the frame boundary. `/simulator` is
  the site's page, `/device/` the shell, so the prerender never overwrites the
  copy.

### Root changes to coordinate with the stage 2 branch

- `bun.lock` and `packages/web/package.json`: `@tanstack/react-start`,
  `@tanstack/react-router`, `react`, `react-dom`, `@stylexjs/stylex` (same
  0.19.0 as the kit), and dev `vite`, `@vitejs/plugin-react`, `@types/node`.
  The user asked for TanStack Start; nothing else new is pulled in.
- `tsconfig.json` excludes `packages/web`, and `package.json`'s `typecheck`
  runs `tsc --noEmit -p packages/web` after the root check. Reason: Vite's
  types reference `@types/node`, and with the site inside the root project
  every shell `setTimeout` became a `Timeout` and failed the build.
- `biome.json` ignores `packages/web/src/route-tree.gen.ts` and
  `packages/web/src/generated`, turns the file-name rule off for
  `packages/web/src/routes/**` (TanStack needs `$param` and `__root`), and
  turns `noArrayIndexKey` off for `markdown.tsx` (a document's block order is
  its identity).

### Verification

The website pass (the committed `check.mjs` until its browser driver was removed;
drive it with `agent-browser` now) walks twelve routes at 1440, 820 and 390 px,
blocks the simulator frame so the check is about the site, and asserts:
HTTP 200, an `h1`, no page or console errors,
no horizontal overflow, the desktop list or the mobile menu shown for the
width, tables and code blocks present on platform docs, the mobile menu opening
with every link, every internal link answering 200 with an `h1`, and a nav click
routing without a document reload. Screenshots land in `.cache/debug/web/`.

Results, 2026-09-17, headless Chromium:

| Run | Result |
| --- | --- |
| `check.mjs` against the dev server (port 3001) | all checks passed, 33 internal links |
| `check.mjs` against `dist/client` served statically (port 3011) | all checks passed, 35 internal links |
| `.cache/debug/web/embed.mjs` on the production Simulator page | the shell inside the frame reached `[data-os]` with its lock screen and canvas; the Closed button reloaded the frame with `deg=0` |
| `bun run typecheck` (root, then `packages/web`) | passes |
| `bun run lint` | passes for `packages/web`; the pre-existing a11y warnings under `packages/apps` are unchanged |
| `bun run build` in `packages/web` | 31 pages prerendered, StyleX placeholder replaced by 10 KB of rules, shell copied under `/device/` |

Screenshots: `.cache/debug/web/home-{desktop,tablet,phone}.png` and one per
route and width, plus `simulator-embed-prod.png` with the real device inside
the page.

### Awaiting stage 2 (done, see the top of this file)

Runtime-dependent pieces were on the site as labelled placeholders until the
rebase onto stages 2–5:

- [ ] `?dev=` in the embedded simulator (Get started, Simulator pages) once the
      shell reads it; the frame already passes query parameters through.
- [ ] SDK reference generated from the real runtime exports (`connect`,
      `storage`, `session`, `view`, `owner`, `commands`, `widget`, `useKV`) once
      `packages/sdk` exports them; the generator already walks `index.ts`.
- [ ] CLI commands on Get started once `packages/cli` ships `create`, `dev`
      and `check`; the page shows them as a plan today.
- [x] Kit component demos: every `/kit/<Component>` page renders the real
      component from `src/kit-demos/<name>.tsx` with its source, and the props
      table carries defaults and what the props extend.
- [ ] Changelog entries once any package publishes a version and a
      `CHANGELOG.md`; the page reads them at build time already.
- [ ] Manifest and permission tables from `packages/sdk/manifest.ts` and
      `permissions.ts` once they exist, replacing the pointers into the contract.
- [ ] Download links once CI publishes installers; the page says they are not
      published.

### Remaining limits

- Formatting: the PostToolUse formatting hook was inactive in this session and
  the site's files were written from the shell, so `bun run format:check`
  reports pending formatting under `packages/web`. Lint passes. The pre-commit
  hook formats staged files.
- Headless Chromium only. The site has no WebKit-specific code, but Safari was
  not run.
- The Markdown renderer covers the syntax `docs/` uses today. A new construct
  (footnotes, HTML blocks, reference links) renders as plain text until the
  parser learns it; the check's table-and-code assertion catches a regression
  on the platform docs only.
- The static shell copy is a full second build (`bun run build` at the root,
  about 6.5 MB with the model), so `bun run build` in `packages/web` takes as
  long as both.

### Gate

Website review gate. Publishing needs a host decision (open item "CDN host"
in `docs/platform/decisions.md` covers the store CDN; the site can share it or
use GitHub Pages) and a CI job that runs `bun run build` in `packages/web` and
uploads `dist/client`. Neither is authorised by this checkpoint.

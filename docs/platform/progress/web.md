# Website: launch page, second build

2026-09-18. The site was rewritten end to end from the launch brief: a phone
Apple hasn't shipped, that you can build apps for. One story on `/`, told in
ten sections, with the product as the centrepiece; the documentation pages
stay and take the same nav, footer and type. Still at the website review gate:
nothing is published, no host is chosen, no CI deploys it.

## The page

| # | Section | What is on screen | How it is made |
| --- | --- | --- | --- |
| 0 | Hero | "A phone Apple hasn't shipped, that you can build apps for." Try Duo, Build an app, the real shell full width | `home/hero.tsx`; `Simulator eager tall`; under 734 px the Remotion loop `public/hero.*` |
| 1 | Not a mockup | "It looks like a concept. It behaves like a device." A device that folds, turns and opens as the page scrolls; four captions take turns | `home/works.tsx`; `useScroll` on a 320 vh track, `Device` from `device.tsx`; reduced motion gets a still device and the captions as a list |
| 2 | Real hardware | "Your imaginary phone can use your real camera." The shell running Camera; "The apps are fake. The capabilities aren't." | `home/camera.tsx`, near-black palette via the `dark` theme class; the page asks for the webcam when the scene is on screen, then mounts `Simulator app="Camera" mount`, `allow="camera"` |
| 3 | The twist | "And then we gave it an App Store." The shell on the App Store, six steps from Get to launch | `home/store.tsx`; a mono note says the sandboxed runtime is stage 2 and the store in the frame is the baked Get → wait → Open |
| 4 | The core idea | "The fold is not a breakpoint. It is input." Four postures, `useDisplay()` code, a live readout | `home/fold.tsx`; `animate(open, deg / 180)` on the CSS device |
| 5 | Build | "Build software for hardware that doesn't exist yet." Terminal, editor beside the device; a colour line changes and the phone folds on a loop; "Change code. Fold the phone. See what breaks." | `home/build.tsx` |
| 6 | SDK | "Four primitives. That is the whole surface." `useDisplay` `useStorage` `requestCamera` `openURL` as four rows | `home/sdk.tsx`; names are the brief's, the SDK page says what exists today |
| 7 | First apps | "Built for a phone that doesn't exist yet." FoldCam, Notes, Calculator, Music (Game and Browser on `/apps`) as tinted plates | `home/apps.tsx`, reused by `routes/apps.tsx` |
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

## What changed underneath

- **The shell learned the embed bridge** (`packages/shell/main.ts`): `?bg=` at
  load and same-origin `{ deg, yaw, bg }` messages, registered before the model
  loads and queued until the pose functions exist. `src/simulator.tsx` mounts
  a frame when it is within a screen of the viewport, posts the body colour on
  every load and on theme change, and follows its `deg` prop by message. The
  device now floats on the page in both themes; `/simulator` folds without a
  reload.
- **A CSS-3D Duo** (`src/device.tsx`) for scenes that need per-frame control:
  two hinged panels, the cover on the back of the moving one, a stylised app
  that hands over from one column to two as the hinge passes 90°. Driven by a
  motion value, so scroll, buttons and a timer all use the same component.
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

## Verification

Headless Chromium (puppeteer-core, SwiftShader for WebGL), 2026-09-18, against
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

## Scope delivered

| Page | Route | What it shows | Status shown to the reader |
| --- | --- | --- | --- |
| Home | `/` | Apple-style hero, the live simulator, the three fold rules, tiles to every section, download notes | Installers marked not built; browser marked works |
| Get started | `/get-started` | Clone, model fetch, `bun run dev`, `?app=`/`?deg=` poses, how a baked app is added; the CLI and `?dev=` path as a plan | First half works today; SDK path marked not built |
| Docs | `/docs`, `/docs/<path>` | Every file under `docs/` rendered from source with a badge and a source link; sidebar grouped Platform plan, Progress, Repository | Planning document, Proposed, or Works today per file |
| UI kit | `/kit`, `/kit/<export>` | Generated from `packages/uikit/index.ts` exports: TSDoc, declaration, props table, source line | Works today; live demos marked not built |
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

## How it is built

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

## Root changes to coordinate with the stage 2 branch

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

## Verification

`bun packages/web/scripts/check.mjs [url]` drives headless Chrome through
twelve routes at 1440, 820 and 390 px, blocks the simulator frame so the check
is about the site, and asserts: HTTP 200, an `h1`, no page or console errors,
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

## Awaiting stage 2

Runtime-dependent pieces are on the site as labelled placeholders, not as
working features:

- [ ] `?dev=` in the embedded simulator (Get started, Simulator pages) once the
      shell reads it; the frame already passes query parameters through.
- [ ] SDK reference generated from the real runtime exports (`connect`,
      `storage`, `session`, `view`, `owner`, `commands`, `widget`, `useKV`) once
      `packages/sdk` exports them; the generator already walks `index.ts`.
- [ ] CLI commands on Get started once `packages/cli` ships `create`, `dev`
      and `check`; the page shows them as a plan today.
- [ ] Kit component demos once the Developer app's demo file exists; the kit
      pages are generated from TSDoc only.
- [ ] Changelog entries once any package publishes a version and a
      `CHANGELOG.md`; the page reads them at build time already.
- [ ] Manifest and permission tables from `packages/sdk/manifest.ts` and
      `permissions.ts` once they exist, replacing the pointers into the contract.
- [ ] Download links once CI publishes installers; the page says they are not
      published.

## Remaining limits

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

## Gate

Website review gate. Publishing needs a host decision (open item "CDN host"
in `docs/platform/decisions.md` covers the store CDN; the site can share it or
use GitHub Pages) and a CI job that runs `bun run build` in `packages/web` and
uploads `dist/client`. Neither is authorised by this checkpoint.

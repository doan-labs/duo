# Platform

**Status:** stages 2–5 (non-website scope) are implemented and locally verified;
see [progress](progress/README.md). Use the [review guide](review.md) for exact
commands, artifacts and measured limits.

**Current stage 2 launch gate:** [scope amendment](stage-2-mvp.md), accepted
2026-09-18. Prove an independent third-party app, isolation, meaningful visible
fold/display behavior and installation without rebuilding simulator source.
The broader workstreams below are a roadmap, not additional launch gates.

**Public deployment:** `https://duo.doan-labs.com`, using static hosting/CDN
without a custom application server. Provider and final routes remain open.
This leaves the runtime architecture unchanged; see [web.md](web.md#deployment).

The plan for turning the fake OS into a developer platform: a store that installs
real apps, an SDK and UI kit to build them, a site that teaches it. Discussed
2026-09-17; everything here is intent until the matching code lands, then the
file becomes the reference for that code.

Rules that hold across every file:

- The curated catalog proposal uses MIT apps in this repo. The revised launch
  gate also permits independently hosted developer catalogs. No commerce or accounts.
- Every downloadable app, official or community, runs as an immutable sandboxed
  bundle. It never runs in the shell's JavaScript context or directly reaches Tauri IPC.
- The SDK owns the host API, bridge protocol, and manifest contract. The UI kit
  has independent versioning; its version alone does not determine host compatibility.
- The fold is the platform's reason to exist. Every API and every component answers
  "what happens on the cover display, and what happens mid-fold."

## Files

Implementation checkpoints, verification evidence and remaining limits live in
[progress/](progress/README.md). Record each completed workstream there.

| File | What it settles |
| --- | --- |
| [stage-2-mvp.md](stage-2-mvp.md) | Current four-outcome launch gate; explicitly supersedes conflicting broader scope |
| [monorepo.md](monorepo.md) | Package layout, workspaces, what moves where |
| [manifest.md](manifest.md) | The app manifest: id, version, lane, entry, widgets, permissions |
| [runtime.md](runtime.md) | Baked shell components, sandboxed app bundles, the SDK bridge, and display instances |
| [progress/contract.md](progress/contract.md) | Stage 2 contract, revision 2: manifest and compatibility, bridge, sessions and views, storage and release lifecycle, Notes as the first sandboxed app, experiments and acceptance checks |
| [uikit.md](uikit.md) | The UI kit: harvest plan, component tiers, rules, versioning |
| [store.md](store.md) | CDN layout, index, install, updates, Requires-version gating |
| [updates.md](updates.md) | App updates over the CDN and shell updates over Tauri's updater |
| [dev.md](dev.md) | Local dev: `?dev=`, the CLI, the SDK package |
| [publishing.md](publishing.md) | Lanes, the PR flow, what CI checks, review rules |
| [security.md](security.md) | IPC isolation, sandbox, storage namespacing, permissions |
| [web.md](web.md) | The official site and its Developers pages |
| [decisions.md](decisions.md) | Open decisions with a blank next to each |

## Workstreams and one-day constraint

Historical plan, 2026-09-17. The original target was the full platform in one
day of work, including the website. Stages 2–5 completed the non-website
workstreams; the website (workstream 10) is handed off separately in
[website-integration.md](website-integration.md).

The numbers retain the original workstream identifiers, not an executable order.
Sandboxed installation depends on the SDK and iframe runtime. Final sequencing
remains open; all workstreams stay within the one-day target.

| # | Workstream | Depends on |
| --- | --- | --- |
| 1 | Monorepo restructure | nothing |
| 2 | UI kit harvest, rewrite official apps onto it | 1; SDK contract for host-aware components |
| 3 | Manifest, `id`, storage namespacing, registry in the shell | 1 |
| 4 | Immutable app bundles, dmg ships shell plus core apps | 3, iframe runtime from 7 |
| 5 | CDN index, real App Store shelf, Updates tab | 4 |
| 6 | Tauri updater plus real Software Update screen | native release configuration |
| 7 | Iframe runtime, `?dev=`, SDK, CLI | 3 |
| 8 | CI: manifest schema, bundle checks, isolation, icons | 3, 4, 7 |
| 9 | Widgets contract, `useDisplay()`, URL scheme | 2, 3, 7 |
| 10 | Website with embedded simulator and generated UI kit docs | 2, 7 |

The create → develop → install → fold → persist → update → uninstall flow
provides early integration evidence, verified in browser and native runtimes.
[progress/contract.md](progress/contract.md) defines that flow for Notes, with the runtime
contracts it exercises and the checks that prove each step; it is the stage 2
historical broader acceptance plan; the amended launch gate is stage-2-mvp.md.
The kit harvest and official app migration are complete (stage 4); the website
remains the separate owner's work. Signing, npm publishing, and deployment access
are unresolved external dependencies.

## Vocabulary

- **Shell**: the springboard, the displays, the frame buttons, the Tauri window. What ships in the dmg.
- **App**: a manifest plus a view. Official or community, same shape.
- **Lane**: official or community maintenance and review status. It does not grant execution privileges.
- **Runtime**: trusted baked shell components or isolated app documents. Every downloadable app uses the latter.
- **Kit**: `@doan-labs/ipduo-uikit`, the components apps build with.
- **SDK**: `@doan-labs/ipduo-sdk`, the public host API, bridge protocol, and manifest contract.

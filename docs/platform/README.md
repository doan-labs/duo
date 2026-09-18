# Developer platform

The non-website platform is implemented and locally verified: independent apps install
without rebuilding the simulator, run in opaque sandboxes, and respond visibly to the
fold/display SDK. CLI authoring, isolated previews, explicit app updates and the UI-kit
harvest are also implemented. SDK/CLI 0.0.0 and kit 0.1.0 are private local previews.

Start with [the local review guide](review.md) to build and install an external app.
[current platform verification](review.md) records measured coverage and limits: Chromium
covers the adversarial/lifecycle matrix; native checks cover installation, folding,
persistence and preview isolation, not complete WebKit parity. Local artifacts are
not published packages, a deployed service or evidence of a remote CI run.

## Read by responsibility

| Responsibility | Reference |
| --- | --- |
| App authoring and local packages | [Development](dev.md), [CLI](../../packages/cli/README.md), [SDK](../../packages/sdk/README.md) |
| SDK and host invariants | [Contract](contract.md), [runtime](runtime.md), [manifest](manifest.md), [security](security.md) |
| UI components and tokens | [UI kit](uikit.md), [package reference](../../packages/uikit/README.md), [generated API](api/uikit.json) |
| Installation and lifecycle | [Store](store.md), [app updates](updates.md), [review commands](review.md) |
| Future work and integration | [Roadmap](roadmap.md), [publication plan](publishing.md), [website plan](web.md), [website integration](website-integration.md) |

## Scope and boundaries

Historical plan, 2026-09-17. The original target was the full platform in one
day of work, including the website. Stages 2–5 completed the non-website
workstreams; the website (workstream 10) was built on its own branch against
the handoff in [website-integration.md](website-integration.md) and is
recorded in [progress/web.md](progress/web.md).

Enabled functionality retains its safety requirements: opaque frames, verified document
bytes and policy, nonce-bound bridge authority, app-private storage, generations,
owner epochs, locks, leases, durable transitions and recovery. Narrow scope does not
remove lifecycle reconciliation or weaken these guarantees. Catalog refresh and update
requests are explicit; there is no periodic catalog polling.

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
is built and not yet deployed ([progress/web.md](progress/web.md)). Signing, npm publishing, and deployment access
are unresolved external dependencies.

## Vocabulary

- **Shell:** displays, renderer, SpringBoard, device controls and native window.
- **App:** a manifest and an immutable document; downloadable official and community apps
  share the sandbox. Trusted baked components are a separate execution boundary.
- **SDK:** host API, bridge protocol and manifest contract; its version gates compatibility.
- **Kit:** independently versioned presentation components bundled by each app.
- **Session/view:** one session per app per shell document, with one isolated view per
  displayed instance. Lane describes maintenance status, never additional privileges.

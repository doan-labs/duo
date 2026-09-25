# Developer platform

The non-website platform is implemented and locally verified: independent apps install
without rebuilding the simulator, run in opaque sandboxes, and respond visibly to the
fold/display SDK and its device events. CLI authoring, isolated previews, explicit app updates and the UI-kit
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
| Browser AI authoring | [Browser builder](builder.md): direct provider calls, local compilation and live revisions |
| SDK and host invariants | [Contract](contract.md), [runtime](runtime.md), [manifest](manifest.md), [security](security.md) |
| UI components and tokens | [UI kit](uikit.md), [package reference](../../packages/uikit/README.md), [generated API](api/uikit.json) |
| Installation and lifecycle | [Store](store.md), [app updates](updates.md), [review commands](review.md) |
| Future work and integration | [Roadmap](roadmap.md), [publication plan](publishing.md), [website plan](web.md), [website integration](website-integration.md) |

## Scope and boundaries

The four launch outcomes remain: an independent app runs, is isolated from the shell
and other apps, uses the display SDK visibly, and installs without source modification
or simulator rebuild. The [review guide](review.md) records how to reproduce these
outcomes and distinguishes measured evidence from remaining verification work.

Enabled functionality retains its safety requirements: opaque frames, verified document
bytes and policy, nonce-bound bridge authority, app-private storage, generations,
owner epochs, locks, leases, durable transitions and recovery. Narrow scope does not
remove lifecycle reconciliation or weaken these guarantees. Catalog refresh and update
requests are explicit; there is no periodic catalog polling.

Camera/microphone, additional device permissions, expanded widgets, native shell updating,
advanced recovery, accounts, payments, reviews, ranking, recommendations and category
expansion remain deferred. Public npm distribution, signing and hosting require separate
release decisions. The accepted public origin is `https://duo.doan-labs.com` on static
hosting; this document does not claim deployment.

## Vocabulary

- **Shell:** displays, renderer, SpringBoard, device controls and native window.
- **App:** a manifest and an immutable document; downloadable official and community apps
  share the sandbox. Trusted baked components are a separate execution boundary.
- **SDK:** host API, bridge protocol and manifest contract; its version gates compatibility.
- **Kit:** independently versioned presentation components bundled by each app.
- **Session/view:** one session per app per shell document, with one isolated view per
  displayed instance. Lane describes maintenance status, never additional privileges.

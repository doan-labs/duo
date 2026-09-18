# Platform roadmap

Status: remaining work after the locally verified non-website stages 2–5, 2026-09-18.
These items are not extra requirements for the completed four-outcome MVP and do not
constitute authorization to implement, publish or deploy them. Current behavior is in
[the overview](README.md); evidence is in [current platform verification](review.md).

| Area | Status | Remaining decision or work |
| --- | --- | --- |
| Curated publication | Implemented locally, 2026-09-18 / needs first remote run | Source submission under `community-apps/`, registry ownership, uniqueness/version checks, immutable publish-before-index pipeline and per-submission runtime evidence exist; the first real PR, publish run and `/catalog` deploy remain to be observed; [publication](publishing.md) |
| Public packages | Needs release decisions | Versions, provenance, credentials and npm publication; the local archive workflow stays the documented path |
| Permission-bearing community apps | Deferred | Curated submissions accept only empty permissions; an expansion needs its own verification and review policy |
| Website and static hosting | Separate workstream / needs deployment verification | Website integration, provider, final routes, DNS/TLS, MIME/cache headers, native cross-origin catalog reads, hosted localhost preview access and web-shell freshness; [website plan](web.md), [handoff](website-integration.md) |
| Native distribution and updater | Deferred | Signing/notarization, platform installers, updater keys/plugin/configuration and real Software Update UI; no automatic updater currently runs |
| Permissions and media | Deferred / needs verification | Host-mediated camera/microphone contract; native/browser location, clipboard/photos matrix; hidden-owner timers and user-activation/audio tests before sandbox audio migration; external catalogs and previews currently accept no device permissions |
| Store, widgets and advanced recovery | Deferred | Categories/discovery/recommendations/ranking/reviews/accounts/payments, richer widgets/background refresh, advanced recovery UI and installed-app revocation; no catalog polling or expanded permissions implied |
| Native and app verification | Needs verification | Full native adversarial update/recovery and background-media matrix, Windows/Linux coverage, exhaustive interaction checks beyond the 39-app rendering smoke matrix |
| Long-term product/API decisions | Needs decisions | Branding/assets distribution rights, kit 1.0 support/deprecation policy, future baked-app list, custom URL scheme, catalog signing and publisher identity |

## Completed foundations are not open work

The SDK/opaque sandbox, storage authority, fold/display API, Notes migration, Weather
owner effects and passive snapshots, external packages/CLI, explicit update recovery,
UI-kit harvest and measured bundle caps are implemented. Existing recovery, leases,
generation checks and background reconciliation remain enabled. No native permission
or media parity is inferred from retaining adapters.

The accepted runtime design is [contract.md](contract.md). [Project decisions](../decisions.md)
record implementation choices, including verified Blob previews and catalog-origin binding.
The original four-outcome launch scope remains in [the overview](README.md). Completed
work does not become outstanding merely because an older plan had unchecked boxes.

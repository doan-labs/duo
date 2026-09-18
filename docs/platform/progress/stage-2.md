# Stage 2 implementation checkpoint

2026-09-18. Current acceptance is the [four-outcome MVP amendment](../stage-2-mvp.md),
which supersedes the broader revision-2 launch checklist. Preserve the contract
and earlier review as historical decisions; do not treat deferred A–M checks as
passing. No commit, push, publication, deployment or external dependency added.

**Status: passes the revised stage-2 gate.** Chromium verifies all four
outcomes; WKWebView additionally verifies Store installation/open, 180/120/0
fold layouts, stable view IDs and saved data after process restart. Stage 3
follows.

## Revised launch outcomes

| Outcome | Evidence |
| --- | --- |
| Independently built app runs | Fold Compass is a standalone project using public SDK/kit/React imports. The MVP check copies it outside the repository to an OS temporary directory, builds its release separately, selects a catalog on another origin, and drives Store GET/OPEN. It is never imported, seeded or named in simulator runtime source. |
| Isolated from shell and other apps | The running app has an opaque origin; parent DOM/storage, its own localStorage/IDB and Tauri globals are inaccessible. An undeclared fetch fails before reaching the server. A same-key Notes sentinel and the demo's saved value remain distinct in host storage. The runtime check additionally rejects a weakened CSP with otherwise valid release hashes and rejects stale writes after removal/reinstall. |
| Visible fold/display SDK use | At 180° the inner display shows Desk board; at 120° it shows Folded workspace with a shorter angle meter; at 0° the cover shows Pocket card. The same saved field note follows the displays. View IDs stay unchanged through the sweep. Captured pixels and SDK text are both checked. |
| Installs without simulator modification/rebuild | The simulator is built before the external demo. SHA-256 hashes of every dist file are equal before demo build and after install, folding and reload. The installed app and its private data survive shell reload. |

The demo's independent author label is illustrative. This proves independent
source/build/distribution through public contracts; it does not claim an
unrelated human or external publisher supplied the app. SDK/kit packages remain
private at 0.0.0 and are resolved by the existing local toolchain.

Evidence: `.cache/debug/stage2/mvp/chromium.json`, `independent-build.json`,
`installed.png`, `fold-180.png`, `fold-120.png`, `fold-0.png`. The demonstrated
app document is about 232 kB (exact byte count is in the JSON). The simulator
dist hash comparison covers every file (the exact count is in the JSON).

## Retained and deferred capabilities

| Capability | Disposition and background behavior |
| --- | --- |
| Core SDK, sandbox and lifecycle | Retained: nonce/port handshake, opaque frame, explicit permissions policy, CSP/hash verification, ordered requests and duplicate IDs, bounded input, durable acknowledgements, revisioned KV, app generations, sticky owner, cross-tab invalidation, leases, checkpoints, restoration and removal. The 10-second lease/reconciliation loop remains because existing committed state must be completed safely. |
| Notes and Weather | Retained as separately built preinstalled apps. Notes migrates legacy values after durable commit and preserves empty edits. Weather's owner alone fetches; nonowners send commands. Its 30-second freshness check and abort-on-owner-change remain. A persisted widget snapshot is retained; the shell's one-minute age timer fetches nothing and wakes no app. |
| Store and local authoring | Retained: explicit catalog selection, compatible GET/OPEN/remove, progress/errors, immutable separate build, CLI create/check. No periodic catalog discovery or background download. Catalog hashes verify integrity relative to the selected catalog, not publisher identity. External developer catalogs currently accept no device permissions. |
| Incomplete live development and app updates | *Superseded by [stage 3](stage-3.md): both `PREVIEW_FEATURES` flags are now enabled after their safety checks passed.* At stage 2 they were disabled by `PREVIEW_FEATURES`: CLI dev rejects before build/watch/server; shell `?dev=` rejects before development fetch/namespace/frame creation. Store update staging/retry controls are hidden and operations reject before download. Existing committed candidates, trial restore, cleanup and uninstall remain operational; shared infrastructure and contracts were not removed. |
| Broader roadmap | Capture remains denied pending a host-mediated contract. No expanded widgets, additional permissions, categories, recommendations, ranking, reviews, accounts, payments, native shell updating, advanced recovery UI, website/deployment or published npm service. Existing optional adapters stay implemented without claims of complete browser/native verification. |

## Reproducible checks

Run from the repository root. Logs and captures are local under `.cache/debug/`.

| Check | Scope and evidence |
| --- | --- |
| `bun run build` then `bun scripts/checks/stage2/mvp.mjs` | Frozen production shell + independent catalog in headless Chromium; four outcomes above; `stage2-mvp.log` and `stage2/mvp/`. |
| `bun scripts/checks/stage2/runtime.mjs` | Real browser IDB/bridge: tampered policy, legacy migration, two views, quota abort preserving data, empty strings, owner/nonowner command completion, owner handover, denied photos, candidate generation, trial readiness/failure, restore without repeat activation, two tabs, removal and reinstall fencing. `stage2-runtime.log`. |
| `bun scripts/checks/stage2/notes.mjs` / `weather.mjs` | Actual shell on port 3110. Notes edit/reload and escape; Weather one real API fetch for two views, nonowner refresh and denied origin. `stage2-notes.log`, `stage2-weather.log`, `stage2/notes-180.png`, `stage2/weather-network.json`. |
| SDK and static checks | `bun test packages/sdk` (6 tests), `bun run typecheck`, `bun run build`, `bun run format:check`, `bun run lint`, `cargo shell-check`. `stage2-unit.log`, `stage2-typecheck.log`, `stage2-build.log`, `stage2-format.log`, `stage2-lint.log`, `stage2-cargo.log`. Existing lint warnings remain; no error suppression was added. |
| Earlier WKWebView prerequisites | E0 src/srcdoc rendering, CSSOM styles/icons, actual network fetches, denied shell storage; native IDB 1 MiB persisted across process restart, abort preservation, serialized locks and holder destruction. `stage2/e0-native-src.png`, `stage2/e0-native-srcdoc.png`, `stage2/native-*.json`. These probes do not establish native parity for the entire runtime matrix. |

## Historical clarifications preserved

Native MVP evidence is `stage2/mvp/native.json`, `native-180.png`,
`native-120.png`, `native-0.png`, `native-restart.png`, native AX state JSON and
`stage2/native-shell-reports.json`. The actual Store GET/OPEN and field-note edit
were driven by native pointer/paste input. At 120 degrees a test-only parent
harness dispatched the same hinge input event used by Chromium; the native
Close button reached 0 degrees. Screenshots were inspected, including partial
fold clipping/blur. Same frame IDs survived; binary SHA-256 before/after matches.

`native-host.mjs` copies production assets into a separate test directory and
adds parent-only diagnostics/control; it changes neither SDK nor sandbox app.
Build with `bun x tauri build --debug --no-bundle --config
../../.cache/debug/stage2-native-test-config.json` from `packages/shell` after
starting that harness and `mvp.mjs --serve`. Its identifier is
`com.mnismt.iphoneduo.stage2-native-test`. Full native adversarial, permission
and lifecycle matrices remain distinct from this installation/fold check.

Stage-5 verification supersedes that historical harness build command: the
current `native-host.mjs` prepares a copied test crate with an explicit WebKit
data-store partition. Build inside `.cache/debug/<stage>/native-crate` with
`bun x tauri build --debug --no-bundle`. See `stage-5.md` for the local Tauri
config-codegen workaround and storage-isolation limitation of this earlier run.

Native automation note: AX set-value can read as successful without triggering
React input. Focus the actual field, paste, then verify value and durable state.
Read screenshot coordinates anew after pose changes; reusing an old point can
hit the canvas and orbit the model. No application input fix was needed.

Decided: `installed.generation` is the launch authority. Staging and
attempt/readiness bookkeeping preserve it; activation, restoration and removal
increment it. Removal persists the last generation so reinstall cannot revive
authority from an older app instance. The original conflict is recorded in
`stage2-contract-conflict.txt`; contract §§4.1/4.5 contain the accepted wording.

Camera capture returned `SecurityError: Invalid security origin` in an opaque
frame despite delegated policy, granted browser permission and fake devices.
Decided: defer camera/microphone rather than add allow-same-origin.
The amended feature probe (`m-permissions.mjs`) passes declared/undeclared
geolocation and camera denial. This is not full permission acceptance: native
permission prompts and photos integration were not established. The later MVP
amendment also removes additional device permissions from this launch gate.

The earlier document probe measured Notes at 337,623 bytes; integrated Notes
and Weather are roughly 344/378 kB. App caps are 1 MiB soft, 4 MiB hard and
8 MiB for a release. Exact build sizes are recorded in the build/check artifacts.
Timer drift/audio activation, full offline/update recovery, live development
hosting, all icon variants and concurrent catalog publication remain unverified
or deferred. No full A–M acceptance claim is made.

## Review boundary

The stop-after-stage-2 instruction was later withdrawn; stages 3–5 followed
without restoring the broader roadmap ([progress](README.md)).

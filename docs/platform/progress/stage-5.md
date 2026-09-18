# Stage 5 audit and local review artifacts

2026-09-18. Complete and locally verified; nothing published.

## Current evidence

- Final host runtime matrix passes policy tampering, transactional migration,
  quota abort, empty strings, ownership/commands, permission refusal, update
  activation/failure/restore, two-tab uninstall and stale reinstall fencing.
  `.cache/debug/stage5-runtime.log`.
- The full external create/develop/install/fold/persist/restart/update/recovery/
  uninstall workflow passes against the final simulator build and kit 0.1.0.
  `.cache/debug/stage5/workflow/evidence.json` (after the pinned-dev-document fix).
- Final SDK/kit/CLI archives install into a separate temporary project. Public
  CLI checks/builds the full Developer gallery with strict types, all public
  component exports and embedded assets, without workspace paths. Archive
  SHA-256 values and the external project are in `stage4/packages.json`.
- All 39 official app surfaces pass both-width smoke checks; 78 captures inspected.
  Native install/fold/restart passes in an explicit isolated WKWebView store.
  Do not infer complete native parity from Chromium or from a successful build.

## Verification discoveries

Parallel SwiftShader simulator runs crossed the existing ten-second ready
deadline for Notes/Weather. Both apps pass the same final build when tested
individually at 180/0. Retain failure logs and run heavy simulator checks serially;
no lifecycle deadline or failure guarantee was weakened. Serial Notes durable
edit/reload/Escape and Weather live owner/non-owner refresh/network-denial pass.

The development loader had a verified-download/remote-navigation gap: a changing
server could supply different iframe HTML after its hash and CSP were checked.
The regression test demonstrated that second fetch. The host now keeps src-mode
development but owns a Blob URL of the verified bytes. Same-release loads reuse
it; replacement/removal revoke it under the existing app lock. No SDK, namespace,
permission or generation contract changed. The adversarial server, separate
installed/two-origin namespaces, explicit reload, old-URL revocation and watcher/
server teardown all pass. `stage5-dev-audit-before.log` preserves the failure;
`stage5-development.log` records the fixed result. Expected ERR_FILE_NOT_FOUND
messages in that test are attempts to read revoked Blob URLs.

The native debug executable initially exposed the earlier native test app even
with a different Tauri identifier. A raw executable's identifier does not by
itself partition WKWebView storage. Before installing anything in this final
run, the test harness was changed to give its window an explicit random
`dataStoreIdentifier` (macOS 14+, verified here on 26.3). That identifier is baked
into the test binary and persists across its restart. This is test-only config;
production storage identity is unchanged. Earlier native evidence did not use
this isolated store and must not be described as having done so.

The installed `tauri-utils` config generator emits `Vec<u8>` for the array-valued
store identifier, causing Rust E0308. Its runtime config adapter also omits
that field. The harness copies the existing desktop crate, retains the window
configuration, and creates the window with the explicit builder's store setter
after context generation. No production Rust, dependency version or ordinary storage setting
is changed. Build from `.cache/debug/stage5/native-crate`; the test profile is
recorded beside it. The earlier `--config` build method is historical and does
not provide this explicit WebKit partition.

## Final evidence and boundaries

| Outcome | Evidence under `.cache/debug/` |
| --- | --- |
| Independent app, shell/other-app isolation, visible SDK fold, unchanged simulator | `stage5/mvp/chromium.json`, three fold captures; all 378 dist file hashes unchanged |
| External public packages and full explicit lifecycle | `stage5/workflow/evidence.json`; create/develop/install/restart/staging/restore/retry/fixed update/uninstall |
| Native installed app | `stage5/native.json`, `native-180.png`, `native-120.png`, `native-0.png`, `native-restart.png`; real Store/paste, stable frames, same binary hash, saved note after process restart |
| Native verified Blob preview | `stage5-native-dev-final.json`, `stage5-native-dev-0.json`, `stage5/native-dev-180.png`, `native-dev-0.png`; SDK layout, separate empty preview note, opaque origin, parent/storage/network denied and no Tauri global |
| Kit and migrations | `stage4/gallery/evidence.json`, `stage4/packages.json`, `stage4/final`, `stage4/final-serial`; see stage 4 for scope |
| Static checks | `stage5-typecheck.log`, `stage5-sdk-tests.log` (6 pass), `stage5-api.log`, `stage5-tokens.log`, `stage5-format-check.log` (no errors; that log predates the monorepo commit and reports 80 warnings, the current tree reports 180 pre-existing a11y/style warnings and 5 infos, still no errors) |

Native evidence uses the production frontend copied with parent diagnostics in
the test crate. The independent preview alone adds an app-side isolation probe.
Installed native checks preceded the development-only loader fix; native preview
checks exercise that fix. Ordinary native output was rebuilt separately afterward;
`stage5-native-ordinary-build.log` passes. `stage5/artifacts.json` records its
SHA-256, the local archives and all 378 simulator assets. No test instrumentation
is in the ordinary build.
Chromium covers the full adversarial/update matrix; native coverage is bounded
to measured install/open/fold/persistence and preview isolation. Full native
update/recovery, permission/background-media parity and exhaustive interaction
checks for every trusted app are unrun, not implied by the 39-app smoke matrix.
Maps' external embed is blank in both baseline and final headless captures.

Use [the local review guide](../review.md) for exact commands and artifacts.
`packages/web` and the separate worktree were untouched. No public release,
deployment, push, signing/notarization or remote CI run occurred. Camera/microphone,
extra device permissions, expanded widgets, advanced recovery, native shell
updating and commercial/discovery features remain deferred. Existing trusted
capabilities and lifecycle background reconciliation remain; catalog polling
and automatic development refresh are absent.

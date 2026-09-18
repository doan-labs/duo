# Updates

The [stage 2 MVP amendment](stage-2-mvp.md) defers native shell updating and
advanced app-update recovery from the launch gate. Existing basic lifecycle
code is retained only with its documented verification scope.

**Implemented:** the app update flow and recovery below (download as install,
`candidate`, lease-gated activation, checkpoint, `trial`, `failedVersion`,
Restore/Retry) in `packages/shell/runtime/lifecycle.ts`. **Not implemented:**
CI publication, the Tauri updater, `update.*` in `native.ts`, the Software
Update screen, badges and boot/daily checks. Those sections are the original plan.

Two paths because two different things change at two different speeds.

## Apps, over the CDN

App updates need no shell restart. The Store downloads and verifies the new
release exactly as an install does, records it as `candidate`, and activates
it when no tab holds a session lease for the app (progress/contract.md §4.5).
Activation checkpoints the app's data and widget snapshots in the same
transaction that flips `current`, marks the release `trial` until its first
`ready`, and delivers the migration context to the owner view once before
secondary views mount. It never tears down a running view and never imports
app code into the shell.

Recovery (progress/contract.md §4.6): the device keeps one known-good pair,
the previous release's bytes and the data checkpoint taken at activation, and
replaces that pair only when the next candidate proves itself with `ready`. A
release that fails to start twice, counted per launch attempt, offers
"Restore previous version": code and checkpoint come back together, the data
the failed release wrote is kept aside in a bounded recovery copy, and the
failed release becomes `failedVersion`, offered as "Retry update" and never
reactivated automatically. Data migration is the app's job, driven by the
migration context and a schema marker; the host records completion on
`ready`. Repointing the catalog to an older version is not a mechanism; the
on-device recovery pair is.

Publishing an update is a PR that bumps `version` in the manifest and adds a
line to the app's `CHANGELOG.md`. CI builds the bundle, uploads under the new
version folder, then publishes `index.json`. A rebuild after a shared dependency
change must not overwrite previously published release bytes.

## Shell, over Tauri's updater

Use Tauri 2's separately installed `tauri-plugin-updater`. Its update signatures
are distinct from operating-system code signing and notarization. Plugin setup,
signing credentials, and updater artifacts are implementation prerequisites.

- CI signs the build with the updater keypair and uploads `shell/latest.json`
  plus platform-specific updater artifacts and installers. macOS updater
  downloads use the signed app archive, not the DMG download itself.
- `native.ts` exposes `update.check()`, `update.download(onProgress)`,
  `update.install()`. Browser builds report native updating as not applicable,
  rather than claiming to have checked the current web deployment.
- Settings → General → Software Update is the real screen: version, release
  notes from the shell's `CHANGELOG.md`, Download and Install, a progress bar,
  then Restart Now. The badge on Settings comes from the same check.

The native shell checks on boot and daily. Web deployment and native updating
are separate: an already-open tab can retain an older shell. Web reload and
cache behavior need an explicit policy before promising it is up to date.

## What ties them together

The SDK's host contract. Runtime requirements determine app compatibility;
a shell update may supply the required API or protocol support. The app's
bundled UI kit has its own version and does not gate host compatibility.
The store's "Requires a newer platform version" row links to Software Update when a shell
update that would satisfy it is waiting.

## Skipped

Delta updates and staged rollouts remain outside the initial proposal. Bundle
sizes and release cadence must be measured. Installed-app revocation, artifact
verification/signing, and recovery remain open. Hiding a Store listing is not
equivalent to preventing an installed release from running.

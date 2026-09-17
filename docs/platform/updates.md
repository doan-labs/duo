# Updates

Two paths because two different things change at two different speeds.

## Apps, over the CDN

App updates need no shell restart. The Store downloads the complete new
sandboxed bundle and activates it on the next app launch, after old instances
and bridge connections close. It never imports app code into the shell.
Multi-view activation semantics still need the session contract in runtime.md.

Old artifacts make rollback possible, but are not a recovery mechanism by
themselves. Version selection, failed-launch recovery, and data migration or
downgrade rules remain open. Repointing the catalog to an older version does
not work with a client that only accepts increasing versions.

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
The store's "Requires iPhone Duo x.y" row links to Software Update when a shell
update that would satisfy it is waiting.

## Skipped

Delta updates and staged rollouts remain outside the initial proposal. Bundle
sizes and release cadence must be measured. Installed-app revocation, artifact
verification/signing, and recovery remain open. Hiding a Store listing is not
equivalent to preventing an installed release from running.

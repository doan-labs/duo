# App updates and recovery

Implemented in `packages/shell/runtime/lifecycle.ts`; the [contract](contract.md) owns
its invariants. Updates are explicitly requested through Store and bound to the original
catalog origin. There is no periodic catalog polling or automatic shell updater.

## Apps, over the CDN

App updates need no shell restart. The Store downloads and verifies the new
release exactly as an install does, records it as `candidate`, and activates
it when no tab holds a session lease for the app (contract.md §4.5).
Activation checkpoints the app's data and widget snapshots in the same
transaction that flips `current`, marks the release `trial` until its first
`ready`, and delivers the migration context to the owner view once before
secondary views mount. It never tears down a running view and never imports
app code into the shell.

Recovery (contract.md §4.6): the device keeps one known-good pair,
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

## Authoring an update

Bump the authored manifest version, document it in CHANGELOG, check/build, then serve
the catalog from the same origin. Store Refresh offers the candidate. Preinstalled apps
re-seed on boot whenever the bundled release id differs from the installed one, so a
rebuild at the same version still lands as a candidate. Public CI uploads,
release governance and npm publication are separate [publishing plans](publishing.md).
Release bytes are immutable, including shared-dependency rebuilds.

## Retained safeguards and remaining work

Locks, generation checks, leases, checkpoints, trial/recovery state and reconciliation
remain enabled even when optional entry points are unavailable. Disabling them could
strand durable state. [current platform verification](review.md) records actual verification; full
native update/recovery parity is not claimed.

Native shell updating, Software Update UI, updater signing/plugin configuration, badges,
boot/daily update checks, advanced recovery UI, revocation and staged rollouts remain
[roadmap](roadmap.md). An open web tab also needs an explicit deployment freshness policy;
a native updater would not make it current. No updater dependency has been added.

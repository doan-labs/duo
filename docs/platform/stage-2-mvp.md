# Stage 2 launch scope amendment

Note (2026-09-18): a later scope decision replaced the instruction below to
stop after stage 2. Its four-outcome gate and scope limits remain; stages 3–5
(developer workflow, kit migration, audit) followed without a review pause and
are recorded in [progress](progress/README.md).

2026-09-18. Explicit user amendment during implementation. This is the current
launch acceptance gate and takes precedence over conflicting stage 2 scope in
the revision-2 contract and companion plans. It does not weaken the runtime
security, compatibility, transaction or isolation requirements for enabled code.

## Required for this review

1. An independently authored third-party app runs.
2. The app is isolated from the shell and other apps.
3. It uses the fold/display SDK API in a meaningful, visible way.
4. It installs without modifying or rebuilding simulator source.

A small app built independently from simulator source proves the main path:
author a manifest and entry using public SDK imports; build an immutable bundle;
serve its catalog separately; select that catalog in the running Store; install;
open and fold. Evidence belongs in `progress/stage-2.md`. Notes remains useful
evidence for persistence and legacy migration. Stop implementation at this
revised review gate, rather than continuing into the roadmap.

## Explicitly superseded launch requirements

- Contract §5.3's requirement to finish every numbered workstream and §5.4's
  entire A–M matrix as a condition of stage 2 launch are superseded by the four
  outcomes above. Relevant checks remain useful evidence. Unrun optional
  checks must be labeled, never claimed as passing.
- The original one-day full-platform target does not make UI-kit harvesting,
  all official-app migrations, a website or deployment part of this gate.
- Source living in this repository and CI-only distribution remain proposals
  for the curated official catalog, not restrictions on proving independent
  development and installation. A separately hosted developer catalog is
  permitted for this gate. A catalog remains unauthenticated until signing;
  hashes prove integrity relative to the selected catalog, not publisher identity.
- Expanded categories, recommendations, ranking, reviews, accounts, payments,
  native shell updating, advanced app recovery, widgets and additional device
  permissions are not launch requirements. Do not expand them to pass this gate.

## Existing optional work

Retain working implementations, finish only what the install/open/fold path
needs, and disable incomplete optional entry points if their safety cannot be
established. No architecture restart or removal merely to reduce code size.
The checkpoint records the final disposition and test scope of each capability.
Camera/microphone remain explicitly deferred by the separately approved capture
amendment. Geolocation/clipboard/photos do not become requirements of this gate.

The historical contract, review and decisions remain available as records;
this amendment supersedes their conflicting scope rather than erasing them.

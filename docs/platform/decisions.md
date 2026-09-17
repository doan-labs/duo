# Open decisions

Blank until decided. Move each into `docs/decisions.md` with a date when it
lands in code.

## Initial decisions, 2026-09-17

The confirmed revisions below take precedence where they conflict with this
initial proposal or the other platform planning files.

- Every store app is MIT and lives in this repo. No separate community repo.
- Two lanes, official and community, one index. Lane is trust, not location.
- Community code never reaches Tauri IPC. Iframe sandbox plus lint plus capabilities.
- Community apps are inner-display only until the mid-fold snapshot improves.
- The kit's version, not the shell's, is what the manifest pins.
- Software Update in Settings is real, on Tauri's updater. Apps update over the CDN without restart.
- Community module apps build with our StyleX plugin through CI; they never bring a prebuilt bundle.
- Permissions are reserved and empty in v1.
- The website is last in the build order and renders these docs, it does not copy them.
- Order: monorepo → kit harvest → manifest and registry → lazy chunks → store → updater → iframe, dev, SDK, CLI → CI → widgets, `useDisplay`, URL scheme → web.

## Confirmed revision: sandboxed bundles and SDK contract, 2026-09-17

- **All downloadable apps use sandboxed bundles**, official and community alike.
  They do not execute as modules in the shell's JavaScript context. The existing
  requirement that store app source lives in this repo still applies. CI builds
  immutable releases from that source; arbitrary external pages are not the
  store distribution contract. This supersedes the community-module tier above.
- **The SDK owns the runtime contract**: the host API, bridge protocol, and
  manifest types. Runtime compatibility is distinct from UI kit compatibility;
  the kit retains its own version and changelog. A kit version alone cannot
  determine whether an app can run. Exact schema fields remain to be designed.
- **Lane does not grant execution privileges.** Official/community remains the
  maintenance and review distinction. Downloadable official apps use the same
  isolation boundary; any future privileged service needs an explicit contract.
  Lint and Tauri capabilities support that boundary rather than replacing it.
- **Sandboxed apps may use the UI kit.** Each iframe has its own React tree and
  may bundle the kit. Sharing the shell's React instance through an import map
  is not required for this runtime.

## One-day full-platform target, 2026-09-17

The target is the full platform in one day of agent work, including the UI kit
harvest, official app migration, and website. Sequencing should prove the
end-to-end loop early and continue through the remaining work within the same
day. Report each deliverable as complete, verified, or unfinished against that
full target.

This discussion authorizes evaluation and planning-document updates only,
not implementation, installation, publishing, or deployment. Native signing,
publishing access, and deployment configuration remain external dependencies
whose availability has not been established.

The detailed build order, app-session design, and release recovery model remain
open decisions. Companion platform documents now reflect the confirmed
sandbox and SDK revision. Remaining recommendations are marked open rather
than silently adopted; these planning edits do not authorize implementation.

## Open

- [ ] **Name of the OS and the API.** Packages are `@doan-labs/ipduo-*` (npm allows one scope, so the project prefix goes in the name) and official ids are `labs.doan.ipduo.*` (decided). Still open: "iPhone Duo", "iOS" in strings, Apple's
      model and SF Symbols. Fine as a fan project; a store inviting developers
      is a different posture. Rename the OS layer (the manifest `kit`, the URL
      scheme, the package scope) or accept the risk knowingly.
- [ ] **CDN host.** GitHub Pages from a `gh-pages` branch is free and immutable
      paths cache well; Cloudflare R2 costs nothing at this scale and gives
      proper `Cache-Control`. Pick one; both work.
- [ ] **Which apps are baked.** Proposed: Phone, Safari, Messages, Music,
      Settings, Camera, Photos, App Store, Clock. Other downloadable apps use
      sandboxed bundles. Distinguish trusted baked components from isolated
      bundles preinstalled for offline use; confirm the list and privilege boundary.
- [ ] **Widget contract.** Specify isolated widget rendering and bridge behavior.
      The shell must not import downloadable widget code into its own context.
- [ ] **Kit version at 1.0.** What must be in the kit before promising a major
      with a deprecation window. Proposed: the harvest table in uikit.md, plus
      `TabView`, `Sheet`, `Alert`.
- [ ] **Bundle size cap.** Reevaluate the earlier 100 KB gzip proposal against
      complete isolated bundles, including React, SDK, kit, CSS, and assets.
- [ ] **Web shell freshness.** Define reload/cache behavior. An open tab is not
      automatically current; native updating does not solve web deployment.
- [ ] **Network policy.** Define allowed API hosts and app-document enforcement.
      Static checks are review aids, not proof of runtime network behavior.
- [ ] **Category list.** iOS's 26 categories or a shorter list. Affects the
      store's Apps tab only.
- [ ] **Developer app in the store.** Downloadable isolated bundle, optionally
      preinstalled for offline docs. Preinstallation need not grant shell privileges.
- [ ] **Runtime schema and lifecycle.** Finalize compatibility fields, bridge
      handshake, per-app storage, display state, synchronization, and effect ownership.
- [ ] **Release recovery.** Decide persistent artifact storage, verification,
      compatible release history, rollback/data migrations, and revocation behavior.
- [ ] **Cover support.** Reevaluate the initial community restriction against
      the current live-panel renderer and an isolated-app prototype.
- [ ] **One-day sequence and acceptance.** Approve work ordering and define
      release evidence, including native checks and external publishing prerequisites.

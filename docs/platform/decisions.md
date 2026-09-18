# Open decisions

## Public origin and static hosting, 2026-09-18

Accepted: `https://duo.doan-labs.com` is the canonical public web origin.
The website, browser simulator, first-party catalog and immutable app bundles
can share this origin on static hosting/CDN. The MVP requires no custom
application server: builds run locally or in CI, distribution serves files,
and the shell owns installation, execution and local persistence. Independently
hosted developer catalogs remain supported by the stage 2 scope amendment.

This is a deployment decision, not a runtime redesign. Preserve the accepted
SDK, sandbox, sessions, storage and lifecycle contracts. The hosting provider,
final route layout, DNS/TLS configuration and deployment credentials remain
to be selected or verified; this entry does not claim the site is deployed.
See [web.md](web.md#deployment) for caching, origin storage and verification.

## Stage 2 scope amendment, 2026-09-18

The user narrowed the launch review to the four outcomes in
[stage-2-mvp.md](stage-2-mvp.md). This explicitly supersedes conflicting
requirements below that all app sources live in this repo, distribution is
CI-only, and the broader platform roadmap must be completed for stage 2.
Existing working capabilities are retained with their safety guarantees.
Historical decisions below remain as records of the earlier scope.

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
- Permissions are reserved and empty in v1. *Superseded 2026-09-17: browser
  features and host services ship on day one with review as the grant
  (progress/contract.md §6); native services stay reserved.*
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

The target is the full platform in one day of work, including the UI kit
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

## Stage 2 contract, 2026-09-17

[progress/contract.md](progress/contract.md) is revision 2 of the runtime
schema and lifecycle, release recovery, cover support and the first integration
sequence. Revision 1 was reviewed the same day (5 accepted, 9 changed, five
amendment groups; kept verbatim in
[progress/contract-review-1.md](progress/contract-review-1.md)) and this
revision incorporates every amendment; its appendix maps each verdict to the
section that resolves it. Accepted 2026-09-17 and implemented in stage 2
(progress/stage-2.md). In one line each:

- Compatibility: host satisfies `^build.sdk` under full npm caret semantics,
  0.x rules included, evaluated per host; release identity is `version+hash`.
- Document: single-file `app.html` with CI-written CSP; `srcdoc` when
  installed, `src` for `?dev=` from the same builder; explicit `allow` denials.
- Bridge: host launch record with a single-use nonce in `window.name`,
  `hello`/`welcome`/`ack`, `MessagePort` as capability not identity, explicit
  states, revocation before anything else, retry by request id with dedupe.
- Network: exact HTTPS origins into `connect-src` and `media-src`; bounds
  connections only, stated as such.
- Session: one per app id per shell document; a view per document; revisioned
  `os.storage` and `os.session`; one designated owner with an epoch, at most
  one, no exactly-once promise; acknowledged commands; async `useKV` adapter.
- Widgets: bounded declarative snapshots the shell renders, with age shown.
- Storage: IndexedDB is the only authority; generation checked in every
  transaction; Web Locks and leases across tabs; `localStorage` is a cache.
- Recovery: one known-good release plus data checkpoint, replaced only by a
  proven candidate; a failed candidate is `failedVersion`, explicit retry only;
  Restore returns code and data together; transactional legacy migration.
- Cover: restriction lifted, field dropped, verified by check F.
- Permissions: one SDK table of browser features and host services, review is
  the grant, `allow` and the method gate are built from it, `photos` is the
  day-one service, native reserved; check M.
- First app: Notes (with session navigation and an async store), then Weather,
  which declares `geolocation`.

## Open

- [ ] **Name of the OS and the API.** Packages are `@doan-labs/ipduo-*` (npm allows one scope, so the project prefix goes in the name) and official ids are `labs.doan.ipduo.*` (decided). Still open: "iPhone Duo", "iOS" in strings, Apple's
      model and SF Symbols. Fine as a fan project; a store inviting developers
      is a different posture. Rename the OS layer (the manifest `kit`, the URL
      scheme, the package scope) or accept the risk knowingly.
- [ ] **Static hosting provider.** Public origin is decided:
      `https://duo.doan-labs.com`. Select a provider and verify custom-domain
      HTTPS, cache headers, MIME types and required cross-origin reads. A
      separate CDN hostname and custom application server are not required.
- [ ] **Which apps are baked.** Proposed: Phone, Safari, Messages, Music,
      Settings, Camera, Photos, App Store, Clock. Other downloadable apps use
      sandboxed bundles. Distinguish trusted baked components from isolated
      bundles preinstalled for offline use; confirm the list and privilege boundary.
- [ ] **Widget contract.** Accepted in review (progress/contract.md §3.6): the
      owner publishes a bounded declarative snapshot through `os.widget.set`;
      the shell renders it live and in the bake and shows its age. Confirmed
      when Weather moves onto it (check L).
- [ ] **Kit version at 1.0.** What must be in the kit before promising a major
      with a deprecation window. Proposed: the harvest table in uikit.md, plus
      `TabView`, `Sheet`, `Alert`.
- [x] **Bundle size cap.** Set in stage 2: 1 MiB soft, 4 MiB hard per document,
      8 MiB per release (`packages/shell/runtime/releases.ts`).
- [ ] **Web shell freshness.** Define reload/cache behavior. An open tab is not
      automatically current; native updating does not solve web deployment.
- [ ] **Network policy.** Revised in progress/contract.md §2.6: exact HTTPS
      origins become the document's `connect-src` and `media-src`, written by
      CI; this bounds connections, not all egress, and is verified against
      Weather's real API from an opaque origin (E0, check L).
- [ ] **Category list.** iOS's 26 categories or a shorter list. Affects the
      store's Apps tab only.
- [ ] **Developer app in the store.** Downloadable isolated bundle, optionally
      preinstalled for offline docs. Preinstallation need not grant shell privileges.
- [x] **Runtime schema and lifecycle.** Revision 2 in progress/contract.md §1
      to §3: full caret rule, nonce-bound bootstrap with explicit states and
      revocation, revisioned KV with snapshot and cursor, `ViewInfo` with
      derived visibility and focus, designated owner with epochs, commands.
      Accepted and implemented (progress/stage-2.md).
- [x] **Release recovery.** Implemented in `packages/shell/runtime/lifecycle.ts` (stages 2–3). Revision 2 in progress/contract.md §4: IndexedDB as
      the only authority with generation checks, locks and leases; candidate
      activation with a data checkpoint; one known-good pair replaced only by a
      proven candidate; `failedVersion` with explicit retry; Restore returns
      code and data together; transactional legacy migration. Revocation of
      installed apps by the maintainer remains open.
- [ ] **Cover support.** Accepted in review: restriction lifted, `cover` field
      dropped, responsive cover support required of every app. Verified by
      progress/contract.md check F in Chromium and WKWebView; a failure is fixed
      in the runtime or kit, not by restoring a per-lane restriction.
- [ ] **One-day sequence and acceptance.** Revision 2 in progress/contract.md
      §5: three experiments first (document builder and loaders, storage and
      locks in WKWebView, owner lifecycle), eleven steps, checks A to L with
      native repeats, all committed under `scripts/checks/stage2/`. Estimates
      are plan only; publishing prerequisites remain external.
- [ ] **Hidden-view timers and audio activation.** Checks G and G2 record how a
      hidden owner view behaves in both runtimes; the result becomes a
      documented limit, and a refused audio activation opens a media contract
      before any audio app moves to the sandbox.
- [x] **IndexedDB and Web Locks under `tauri://localhost`.** Verified in stage 2:
      native IDB persisted 1 MiB across process restart, serialized locks and
      holder destruction pass; no fallback was needed (progress/stage-2.md).

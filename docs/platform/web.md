# Website and deployment plan

Status: separate website workstream; the requirements below are a plan, not deployment
evidence. Public packages remain unpublished. Use [local development](dev.md) today and
[the integration guide](website-integration.md) for existing API/catalog interfaces.

`packages/web`, same repo, same build, deploys with the rest. Its advantage over
any other platform's docs: the simulator is a web page, so the site embeds the
real device instead of screenshots.

## Deployment

Accepted 2026-09-18: the canonical public origin is
`https://duo.doan-labs.com`. Host the website, browser simulator, first-party
catalog and immutable app bundles as static files on this origin initially.
Build locally or in CI; installation, app execution and persistence stay in
the client. No custom application server is required for the MVP. This does
not change the SDK, iframe isolation or lifecycle contracts.

The hosting provider and final paths for the simulator, docs, catalog and
bundles remain open. Keep deployment URLs configurable rather than encoding
an assumed route layout into the SDK. A separate CDN hostname is optional;
external developer catalogs remain supported.

Deployment requirements:

- Configure DNS and HTTPS for the canonical domain, and serve correct content
  types. Do not return the website's HTML fallback for missing catalog or
  artifact paths.
- Cache immutable versioned bundles long-term. Revalidate site entry documents
  and keep catalog freshness short (the store proposal uses 60 seconds).
  Publish complete artifacts before the catalog references them. An already
  open simulator does not automatically adopt newly deployed shell code.
- Configure the desktop shell's first-party catalog URL and verify required
  cross-origin reads from the actual native origin. Verify hosted-shell reads
  of external developer catalogs separately. CDN CORS and the app-document
  sandbox/CSP serve different purposes; preserve the latter.
- Verify hosted `?dev=` loading against localhost in supported browsers,
  including CORS and browser local-network permissions. Retain a fully local
  shell plus app development path when hosted access is unavailable.
- Verify the website embed, app installation and persisted launch on the
  deployed origin. A successful local build is not deployment evidence.

Web installations and data are scoped to the origin. Localhost, previous
domains and the native shell have separate storage; no automatic migration
or cross-device sync is promised. Website and simulator pages on this origin
share its storage boundary regardless of URL path. Downloadable app documents
remain opaque-origin sandboxed frames and use the SDK for persistence.
Choose the public origin before collecting user data; a later domain change
would need an explicit migration/export plan.

These are deployment requirements, not a claim that DNS, hosting or browser
compatibility have already been verified.

## Pages

1. **Home.** The device, folding on scroll. Download links for the dmg, msi,
   AppImage, and Open in Browser.
2. **Get started (after publication).** `npx @doan-labs/ipduo create`, `npx @doan-labs/ipduo dev`, and the `?dev=`
   link. Target: an app on the home screen in five minutes. The embedded
   simulator targets the reader's localhost app document, subject to browser
   network permissions and CORS. Development uses the production sandbox and SDK.
3. **UI kit.** One page per component, generated from the TSDoc and props type
   in `packages/uikit`. The same demo file that powers the in-OS Developer app
   renders here, so there is one source of truth. Never hand-written.
4. **SDK and app lifecycle.** The manifest, host compatibility, bridge protocol,
   isolated display instances, and fold behavior. Mostly manifest.md and
   runtime.md rendered; label unresolved contracts until implemented.
5. **Publish.** publishing.md rendered, plus the PR template.
6. **Human Interface Guidelines.** Short and opinionated. The fold is the
   headline: design for the cover width first, then let the inner display give
   you room. Second: your app runs twice. Third: tokens only.
7. **Changelog.** The SDK's, kit's, and shell's, one page.

## Rules

- Docs live next to code. The site selects current platform references and generated
  kit API data explicitly; it does not copy them or automatically publish archives,
  roadmap pages or maintainer reports as user instructions.
- No blog, no accounts, no forum. GitHub Discussions link in the footer.
- Ships after the kit exists. Building it earlier means writing it twice.

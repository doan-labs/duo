# Documentation

Start with the guide for your task. Current guidance and planned work are separate;
the root README remains the only repository file tree.

## Maintainer guides

| Task | Read |
| --- | --- |
| Understand responsibilities or change the renderer/shell | [Architecture](architecture.md) |
| Set up, extend or maintain the project | [Working guide](working.md) |
| Verify browser/native behavior | [Debugging](debug.md), [platform review](platform/review.md) |
| Understand or change a design choice | [Project decisions](decisions.md); append explicit superseding entries |
| Build on or change the developer platform | [Platform overview](platform/README.md) and the references below |

## Current platform references

| Topic | Reference |
| --- | --- |
| Browser chat builder and preview revisions | [Builder](platform/builder.md) |
| SDK/host invariants and execution | [Contract](platform/contract.md), [runtime](platform/runtime.md), [SDK package](../packages/sdk/README.md) |
| App metadata and isolation | [Manifest](platform/manifest.md), [security](platform/security.md) |
| Authoring and presentation | [Development](platform/dev.md), [CLI package](../packages/cli/README.md), [UI kit](platform/uikit.md), [kit package](../packages/uikit/README.md) |
| Installation and data lifecycle | [Store](platform/store.md), [updates](platform/updates.md), [local review](platform/review.md) |
| Submitting and publishing apps | [Publication](platform/publishing.md), [community-apps guide](../community-apps/README.md), [CONTRIBUTING](../CONTRIBUTING.md) |
| Website integration and generated data | [Integration guide](platform/website-integration.md), [generated kit API](platform/api/uikit.json) |

## Plans and evidence

| Need | Read |
| --- | --- |
| Remaining work and verification gaps | [Roadmap](platform/roadmap.md) |
| Public packages and hosting | [Publication](platform/publishing.md) for the curated catalog, [website plan and build record](platform/web.md) |
| Verification scope and limits | [Local review](platform/review.md) |

## Maintenance

Update the owning guide with each change: responsibilities in architecture, constraints in
working, probes in debug, reasoning in append-only decisions. The contract owns safety
invariants; resolve code/doc conflicts explicitly. Roadmap items are not implementation
claims or work authorization. The review guide records coverage; Chromium is not native
parity, and local artifacts are not publication evidence.

Package READMEs own usage details. Regenerate kit API data with `scripts/generate-kit-docs.ts`.
Fix links and check website consumers after moves. Keep no progress/archive folders;
committed history remains in Git. The root README is the only repository file tree.

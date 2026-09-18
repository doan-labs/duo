# Browser app builder

Status: upcoming. The builder workspace (`packages/web/src/builder`) stays in the tree
but is not linked; `/build` and `/get-started` redirect to `/simulator`, the public page
where visitors drive the phone directly. `/device/` remains the embedded shell. Local CLI
authoring remains under `/docs/getting-started`. The rest of this page describes the
parked workspace as built.

## Credentials and requests

The trusted chat page calls the selected HTTPS provider's Chat Completions endpoint
directly, with bearer authorization, omitted cookies and refused redirects. There is
no AI server route. Providers must support browser CORS. Base URLs exclude credentials,
queries and fragments. Changing the endpoint clears the key. The Connection panel offers
OpenRouter, OpenAI, Google Gemini and Groq presets plus a custom base URL; while it is open
it fetches the endpoint's `/models` list (with the key when one is entered) to fill a
datalist for the model field. Manual model entry still works when that list is unavailable.

Keys exist only in React memory and provider authorization headers. They never enter
prompts, workers, simulator messages, saved projects or downloads. Provider errors use
status-based messages instead of displaying response bodies. Never enable session replay
or prompt/request-body logging on this route. The provider receives conversation and
source; this is not offline AI.

Connection preferences and last-selected-project IDs use localStorage. Project source,
revisions and chat use the separate `duo-builder` IndexedDB database. Storage failures
remain visible; Download still provides a JSON source project without credentials or
app data. This is not an installable release or Store submission.

## Browser compilation

`packages/web/scripts/builder-assets.mjs` prebuilds React, SDK, kit, tokens and the
sandbox StyleX adapter, embeds kit assets, and emits a hashed runtime descriptor and
versioned esbuild WebAssembly. It generates `src/generated/builder-assets.ts`. Retain
old hashed assets across deployments so open pages can finish builds.

`src/builder/compiler-worker.ts` resolves a closed virtual filesystem. Babel standalone
and StyleX's official browser plugin transform authored styles; token references come
from the same build as the kit. esbuild bundles one immutable document. Named token
imports and the listed public modules are supported; arbitrary packages and new token
modules are not. Compilation does not run TypeScript semantic checking or publication checks.

`app.tsx` exports a default React component. The host-generated entry connects the SDK,
reports readiness after the first successful React commit; generated app code does not
call connect/ready. Hidden mirrored displays cannot promise a visible paint, so the entry
does not wait on animation frames. Rendering errors stay behind the error boundary and
fail the unchanged startup deadline. Visible pixels are verified separately. Responses
contain JSON with a name, summary and complete source map. Limits: 12 kebab-case TS/TSX/JSON
files, 180 KB source, 4 MiB compiled document and a 45-second compiler deadline.

## Preview lifecycle

`packages/sdk/builder-preview.ts` defines the private protocol and document builder.
`packages/shell/runtime/builder-preview.ts` accepts messages only in a web embed launched
with a random builder token. Sender, exact parent origin, token, project identity and
sequence are checked. Localhost development alone permits a cross-port parent. Native
and ordinary simulator embeds do not accept this channel; overlapping activations are refused.

The shell independently checks release hashes, sizes, SDK compatibility and exact document
policy. Generated apps retain opaque sandboxes and declare no network, permissions or
widgets. Verified bytes execute through an owned Blob URL. The host derives
`dev:builder:<project-uuid>`, separate from installed apps and CLI origins. A lifetime
Web Lock allows one builder tab per project. Storage generations, locks and leases remain active.

Activation synchronously unmounts old views, retires their authority, snapshots app data
and advances the generation. Only app documents restart; the phone and pose remain.
SDK storage survives, arbitrary React state and session memory do not. Store timer
deadlines rather than ticks. Startup failure restores previous code/data; a durable pending
checkpoint recovers if the tab closes during activation. Undo restores source and its data
checkpoint, potentially losing newer app data. Ten checkpoints are retained. Installed-app
update rules are unchanged.

CSP is not a universal egress or CPU boundary. Self-navigation remains a separate concern;
an infinite app loop can stall its browser renderer. Startup timeouts cannot preempt a
monopolized main thread. Compiler workers are separately terminable.

## Interaction and bounds

Generation progress streams, but only a complete valid revision applies. The old app stays
live during generation/compilation. Stop cancels those stages; activation finishes or rolls
back before another action. Provider charges may already have occurred on cancellation.

One automatic repair may use another provider request with bounded diagnostics. Authentication,
rate-limit and network failures do not trigger repair. Requests time out after three minutes;
responses are capped at 2 MB including framing. Truncated/partial streams are refused.
The UI retains ten source revisions, forty chat messages and up to ten local projects.
Mobile Chat/Preview tabs hide panels without removing the simulator frame.

## Verification and hosting

Run `bun test ./packages/web/src/builder/provider.test.ts` for request/schema tests.
`bun scripts/check-builder.mjs <built-site-build-url>` drives agent-browser in an isolated
session. It uses fake streamed replies with real compilation and the real shell. It does
not establish live provider compatibility. Measured evidence belongs in [review](review.md).

Serve `/builder/`, worker chunks and `/device/` with correct MIME types and no HTML fallback
for missing assets. If the host sets a CSP, permit own workers, WebAssembly compilation
and selected HTTPS providers separately from the unchanged generated-app policy. Cloudflare
deployment, live providers, Safari and native parity need separate evidence.

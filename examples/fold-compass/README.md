# Fold Compass

An independently built community app consuming only the public SDK, kit and
React. It is not imported, seeded or registered by simulator source. The test
copies this project outside the simulator workspace and builds a separate
catalog after freezing the simulator build.

The SDK/toolchain is local and unpublished. Run from the simulator repository:

```sh
bun packages/cli/index.mjs check examples/fold-compass
IPDUO_BUILD_OUTPUT=.cache/debug/fold-catalog bun scripts/build-app.ts examples/fold-compass
```

Serve that output directory on a separate loopback origin with CORS enabled.
In App Store, enter its `/index.json` URL, Load catalog, GET, OPEN. No simulator
source changes or simulator rebuild are required. The reproducible acceptance
runner is `bun scripts/checks/stage2/mvp.mjs`.

MIT. Demo author metadata is illustrative, not a claim of an external publisher
or an authenticated catalog.

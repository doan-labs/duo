# CLI

`@doan-labs/ipduo`, a small Bun tool. Until it is published, run it from the repository as `bun packages/cli/index.mjs <command>`, or through the scripts `create` writes into your app's `package.json`.

```sh
bun scripts/package-platform.ts                  # archives + artifacts.json into .cache/platform-packages/
bun packages/cli/index.mjs create <name> --packages .cache/platform-packages/artifacts.json
bun packages/cli/index.mjs check   <folder>
bun packages/cli/index.mjs build   <folder> [--out <dir>]
bun packages/cli/index.mjs dev     <folder> [--port 5173] [--simulator http://localhost:3000]
bun packages/cli/index.mjs preview <folder> [--port 5173]
bun packages/cli/index.mjs serve   <dir>    [--port 5173]
```

## create

Writes `manifest.json`, `main.tsx`, a placeholder `icon.png`, `CHANGELOG.md` and `package.json` into a new folder in the current directory. The name is kebab-case and at most twelve characters; it becomes the folder, the display name and the last segment of `dev.example.<name>`.

`--packages <artifacts.json>` points the generated `package.json` at local SDK, kit and CLI archives instead of published versions. It is required while the packages are unpublished.

The generated scripts are `bun run check`, `bun run build` and `bun run dev`.

## check

Everything a machine can decide before a human looks:

- the manifest validates, the version has a changelog line, an `official` lane is backed by the trust list;
- imports stay inside the app: no relative imports above the folder, no computed imports, no remote modules, no source symlinks, nothing from the shell or another app;
- strict TypeScript against the SDK and kit exports;
- the built document is under 4 MiB.

Temporary output is removed afterwards. A pass prints the app id, the size and the permissions in words.

## build

Compiles `entry` with the StyleX plugin into one `app.html`, hashes every file, and writes an immutable release plus a catalog:

```
dist/
  index.json
  apps/<id>/<version>+<hash>/release.json
  apps/<id>/<version>+<hash>/app.html
  apps/<id>/<version>+<hash>/icon-1024.png
```

`build` refuses to write into a release folder that already exists. Bump the version, or change the bytes and get a new hash.

## dev and preview

Both build the app into a temporary folder and serve it on loopback with CORS. `dev` also watches the source and rebuilds; each build is a new immutable release, and you reload the simulator to select it. Both print the simulator URL with `?dev=` and `&app=` filled in.

The shell fetches `release.json` from that origin, verifies the document once, and runs its bytes from a Blob URL in the same sandbox an installed app gets, under a `dev:` storage namespace with a DEV badge. Framing an arbitrary URL is not development mode; the document has to be one the CLI built.

Ctrl-C stops the server and the watcher and removes the temporary output.

## serve

Static hosting for a built catalog on loopback with CORS and no caching. Paste its `/index.json` URL into the App Store's Developer catalog field. Use it to test the install path exactly as a person would experience it, or to hand a catalog to another machine on your network.

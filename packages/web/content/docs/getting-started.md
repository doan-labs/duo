# Getting started

To build entirely in your browser, open [Build](/build), connect an OpenRouter key or a
browser-accessible OpenAI-compatible endpoint, and describe your app. No local tools are
needed. Your provider receives requests directly; Duo does not proxy your key or prompts.

The local developer workflow below remains available for full source projects and catalogs.

Ten minutes: the simulator running locally, a new app on its inner home screen, then installed from a catalog like any other app.

You need [Bun](https://bun.sh) and Python 3 with `pip`. The packages are not on npm yet; the repository builds local archives that the CLI resolves instead.

## 1. Run the simulator

```sh
git clone https://github.com/doan-labs/duo.git && cd duo
bun install
pip install usd-core && python3 scripts/prepare-model.py   # Apple's model into public/model, once
bun run dev                                                # http://localhost:3000
```

Open `http://localhost:3000/?deg=180` for the phone flat open, or `?deg=0` for the cover. The slider on the right folds it live.

## 2. Create an app

From the repository root:

```sh
bun scripts/package-platform.ts          # SDK, kit and CLI archives → .cache/platform-packages/
bun packages/cli/index.mjs create my-app --packages .cache/platform-packages/artifacts.json
cd my-app && bun install
```

The name is kebab-case, at most twelve characters. You get `manifest.json`, `main.tsx`, `icon.png`, `CHANGELOG.md` and a `package.json` wired to the local archives. The folder can live anywhere; nothing has to be inside the repository.

## 3. Run it on the phone

```sh
bun run check   # import boundaries, strict TypeScript, the 4 MiB cap
bun run dev     # builds, watches, prints the link
```

`dev` prints something like `http://localhost:3000/?dev=http://localhost:5173&app=dev.example.my-app`. Open it. Your app is on the inner home screen with a DEV badge, running in the same sandbox an installed app gets. Edit `main.tsx`, save, reload the simulator to pick up the new build.

## 4. Install it

```sh
bun run build                                        # dist/: index.json plus the release
bun packages/cli/index.mjs serve dist --port 5173    # from the repository root
```

In the simulator, open App Store, paste `http://localhost:5173/index.json` into the Developer catalog field, then Get and Open. The app now installs the way every Duo app installs: verified, hashed, stored in the shell's own database, launched from there.

## Where things live

| | |
| --- | --- |
| Your app's data | The shell's IndexedDB, under the app id. A `?dev=` app uses a separate `dev:` namespace; the DEV row in App Store removes it. |
| The release | `dist/apps/<id>/<version>+<hash>/`: `release.json`, `app.html`, `icon-1024.png`. Immutable; a rebuild that changes bytes is a new identity. |
| The catalog | `dist/index.json`. What App Store reads. |

Next: [Your first app](your-first-app.md).

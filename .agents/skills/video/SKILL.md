---
name: video
description: Entry point for all video work in this repo. Read it first to make, edit, animate, preview or render a video, animation or motion graphic (promo, explainer, captioned clip, title card, overlay, slideshow), for any HyperFrames composition, and for the Duo films in video/hyperframes. Holds HyperFrames with all its guides (composition, animation, keyframes, creative direction, audio, media, CLI, registry, Studio) and its general, product-launch and motion-graphics workflows.
---

# Video

Video here is HyperFrames. `video/hyperframes` holds both Duo films: `store/` (DuoStore, 16.3 s) and `edge/` (DuoEdge, 17.5 s). `video/` is gitignored, so it exists only on the machine that made it: a fresh clone has none, and nothing there is backed up by git.

Users may edit these files between turns. A surprising change is intentional: don't overwrite it, ask.

## HyperFrames

Read [the HyperFrames guide](./hyperframes/REFERENCE.md) and follow it. It and the folders beside it are HyperFrames' own skills, vendored here as one:

- A skill they name is a folder: `/hyperframes-core`, `/media-use`, `/general-video` and the rest are `./hyperframes/<name>/REFERENCE.md`. A `SKILL.md` they mention is that folder's `REFERENCE.md`, and a `skills/<name>/` path is `./hyperframes/<name>/`. Give a subagent you dispatch these two rules along with its packet: it hasn't read this file.
- Of the guide's workflows, `/general-video`, `/product-launch-video` and `/motion-graphics` are here. For a route to any other (`/slideshow`, `/embedded-captions`, …), use `/general-video`, or add that workflow as below.
- Don't run `npx hyperframes skills update` (the guide's step 4) or a bare `npx hyperframes init`: both install the whole set globally, as separate skills beside this one. The workflows are already here, so skip step 4. Scaffold with `HYPERFRAMES_SKIP_SKILLS=1 npx hyperframes init`.
- To add or refresh a skill, take it from the release the films pin: `git clone --depth 1 --filter=blob:none --sparse --branch v0.8.70 https://github.com/heygen-com/hyperframes`, then `git sparse-checkout set skills` in it. Copy each skill to `./hyperframes/<name>/` (the `hyperframes` skill itself to `./hyperframes/`), rename its `SKILL.md` to `REFERENCE.md`, and point `../hyperframes/` paths at `../`. This repo has no Remotion: cut the guide's Remotion-port route and other Remotion mentions again, and skip `remotion-to-hyperframes`.

## The Duo films

- One project per film (`store/`, `edge/`), each with its own `index.html` and `assets/`. `lint` allows one root composition per project. `video/hyperframes/lib.js` is shared, symlinked into each.
- `film.js` builds the DOM once and redraws every frame from the frame number: `drive()` in `lib.js` tweens a clock whose setter calls `render`.
- Register the timeline synchronously (`window.__timelines[id] = film` inline in `index.html`). The runtime player binds only what exists while the page parses: a timeline registered in a `.then()` still renders, but `snapshot`, `check` and Studio see a frozen frame 0.
- Sound is literal `<audio>` tags in `index.html`, each with a `data-duration` and its own `data-track-index` where hits overlap. Tags created by script are not mixed.
- Screenshot sequences go through `sequence()`, which mounts every frame up front. Don't swap an `img.src` per frame: nothing waits for it to load.
- The screenshots are captures of the live app, so a UI change makes them stale. Capture again with the app on :3000: `bun run capture:store` / `capture:edge` (README → Screenshots), then render.
- `snapshot` needs `--timeout 30000`, since hundreds of screenshots load before the first seek.
- In `video/hyperframes`: `bun run dev` (Studio on :3002; `dev:edge` for the other film), `bun run check`, `bun run store` / `bun run edge` (render, master the sound, write `~/Desktop/duo-<film>.mp4`).

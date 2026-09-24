---
name: duo-films
description: The Duo films in video/hyperframes, the App Store film (store/, DuoStore) and the edge film (edge/, DuoEdge), made with HyperFrames. Use it to edit, recapture, preview or render either film.
---

# The Duo films

`video/hyperframes` holds both Duo films: `store/` (DuoStore, 16.3 s) and `edge/` (DuoEdge, 17.5 s). `video/` is gitignored, so it exists only on the machine that made it: a fresh clone has none, and nothing there is backed up by git.

They're HyperFrames, so the `video-making` skill (global, not in this repo) comes first. This is only what's particular to these films.

Users may edit these files between turns. A surprising change is intentional: don't overwrite it, ask.

- One project per film (`store/`, `edge/`), each with its own `index.html` and `assets/`. `video/hyperframes/lib.js` is shared, symlinked into each.
- `film.js` builds the DOM once and redraws every frame from the frame number, through `drive()` in `lib.js`. Screenshot sequences go through `sequence()`.
- The screenshots are captures of the live app, so a UI change makes them stale. Capture again with the app on :3000 (`PORT=3000 bun run dev` at the repo root): `bun run capture:store` / `capture:edge` (README → Screenshots), then render.
- The captures pin the day to 2026-09-23, the one Discover gives Calendar, and expect the shell's glass where `film.js` places every frame. `capture/cdp.ts` warns when the glass moves, and `meta.json` has the new rects.
- In `video/hyperframes`: `bun run dev` (Studio on :3002; `dev:edge` for the other film), `bun run check`, `bun run store` / `bun run edge` (render, master the sound, write `~/Desktop/duo-<film>.mp4`).

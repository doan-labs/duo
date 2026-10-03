# Changelog

## 1.0.0

- Added a fold-aware sixteen-step sequencer with four built-in voices: keys on a pentatonic scale, hi-hat, snare and kick.
- Added tap-to-edit pads with drag-to-paint, per-track mutes and a tempo slider from 60 to 184 BPM.
- Added saved loops with load and delete, plus autosave of the working sketch through `os.storage`.
- Laid out cover-first: vertical pads and a chip strip of loops on the cover, the grid beside a transport rail on the inner display via `useWide`.
- Kept sound owner-only: one AudioContext and lookahead scheduler on the owning copy, gesture unlock inside taps, a "tap the other display" hint when autoplay blocks, and full teardown on pause or ownership loss.

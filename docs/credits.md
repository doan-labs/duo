# Credits

Third-party media in the simulator, and the licence each piece is here under.

## Music

Every release in the Music app's catalog, and the track queue Control Center's
deck shares, is a real album or EP streamed from the Internet Archive item it
was published in. The cover art is the release's own, resized into
`public/covers/`. The list lives in `packages/fixtures/tracks.ts`.

| Release | Artist | Licence | Source |
| --- | --- | --- | --- |
| Layers | Broke For Free | CC BY 3.0 | https://archive.org/details/BrokeForFreeLayers |
| Directionless EP | Broke For Free | CC BY 3.0 | https://archive.org/details/Directionless_EP-8295 |
| Slam Funk | Broke For Free | CC BY 3.0 | https://archive.org/details/Slam_Funk-7603 |
| The Simple Life (Part 2) | Josh Woodward | CC BY 4.0 | https://archive.org/details/The_Simple_Life_Part_2_1667-16369 |
| Grab Bag | Jahzzar | CC BY-SA 3.0 | https://archive.org/details/Grab_Bag-12446 |
| Kuddelmuddel | Jahzzar | CC BY-SA 3.0 | https://archive.org/details/Kuddelmuddel |
| Sele | Jahzzar | CC BY-SA 3.0 | https://archive.org/details/Jahzzar_Sele |
| Relaxing Ukulele | Monplaisir | CC0 1.0 | https://archive.org/details/Monplaisir-RelaxingUkulele |
| Power Animal | Monplaisir | CC0 1.0 | https://archive.org/details/Monplaisir-Power_Animal |
| Cheap Imitation | Monplaisir | CC0 1.0 | https://archive.org/details/Monplaisir-Cheap_Imitation |
| Direct to Video | Chris Zabriskie | CC BY 3.0 | https://archive.org/details/ChrisZabriskieDirectToVideo |
| Thoughtless | Chris Zabriskie | CC BY 3.0 | https://archive.org/details/ChrisZabriskieThoughtless |
| Reappear | Chris Zabriskie | CC BY 3.0 | https://archive.org/details/Reappear-11948 |

Every one of these is attribution-only or public domain. Nothing under a
NonCommercial or NoDerivatives licence belongs in the app: the site is public and
the repository is MIT, so a restriction on either would be one the project cannot
honour. The app names the artist, the release and the licence under each album's
track list and on the now-playing sheet's credits, which is the attribution CC BY
asks for at the point of use.

The Podcasts app is the exception in shape only. Its shows and episode titles are
invented, but the audio under them is the same licensed set.

## Maps

Explore uses OpenStreetMap Japan's MapTiler Basic raster tiles; see
`docs/decisions.md` 60 for why Maps draws its own tiles rather than embedding a
map SDK.

## Apple artwork

App icons and the wallpaper are extracted from a local macOS install by
`bun run icons`, and the device model comes from Apple's own iPhone Duo USDZ via
`scripts/prepare-model.py`. Neither is redistributed in this repository: both are
fetched per clone, which is why `public/model` is git-ignored.

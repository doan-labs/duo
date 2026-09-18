# Credits

Third-party media in the simulator, and the licence each piece is here under.

## Music

The five tracks in the Music app and behind Control Center's deck are real
releases, streamed from the Internet Archive item they were published in. The
cover art is the release's own, resized into `public/covers/`. The list lives in
`packages/fixtures/tracks.ts`.

| Track | Artist | Release | Licence | Source |
| --- | --- | --- | --- | --- |
| Night Owl | Broke For Free | Directionless EP | CC BY 3.0 | https://archive.org/details/Directionless_EP-8295 |
| Ships | Josh Woodward | The Simple Life | CC BY 4.0 | https://archive.org/details/The_Simple_Life_Part_2_1667-16369 |
| Candlelight | Jahzzar | Grab Bag | CC BY-SA 3.0 | https://archive.org/details/Grab_Bag-12446 |
| Caught In The Beat | Broke For Free | Slam Funk | CC BY 3.0 | https://archive.org/details/Slam_Funk-7603 |
| Red Hair, Blue Sky | Monplaisir | Relaxing Ukulele | CC0 1.0 | https://archive.org/details/Monplaisir-RelaxingUkulele |

Every one of these is attribution-only or public domain. Nothing under a
NonCommercial or NoDerivatives licence belongs in the app: the site is public and
the repository is MIT, so a restriction on either would be one the project cannot
honour. The app names the artist, the release and the licence on the now-playing
card, which is the attribution CC BY asks for at the point of use.

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

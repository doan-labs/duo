# Changelog

## 0.3.0 (Unreleased)

### SDK & UI kit

- View updates reach occluded copies, and reduced motion is honoured across the kit.
- The token gate now covers spacing and every app, held by a baseline ratchet.

### Shell

- The inner live panel is culled once the fold covers it.
- One phase value drives the state machines across shell, builder, blog and apps.

### Apps

- Weather: legible rain, real cloud banks and moonlight through cloudy nights.
- Maps: recenter on tap, dark-mode labels, the iOS locate arrow and sharp face-on displays.
- Reader back buttons announce their real destination.

### Community apps

- Twenty-three new: Chess (with an engine bot), Sudoku, Flashcards, Minesweeper,
  Pixel Studio, Nonogram, Pocket Budget, Recipe Box, Music Sketchpad, Battleship,
  Block Drop, Mind Map, Reversi, Trip Planner, Solitaire, Pantry, Color Lab,
  Room Planner, Jigsaw, Circuit Lab, Paper Fold, Phrasebook and Tennis for Two.
- Ten more official apps published to the catalog.
- Jigsaw 1.0.1: recovery UI and a safe retry for settled seed/hydrate failures.
- Chess: the LEVEL segmented control no longer overflows its rail.

### Site

- `/kit` is the Platform page: Duo taken apart layer by layer, the build rules, the UI kit and the SDK's buttons and sensors on one page. `/sdk` forwards to it. It has its own social card.
- Developer profiles in the registry, developer tabs on `/apps`, and an interactive submission guide.
- Release trees are served untransformed and immutable.
- The blog films are seekable, stale chunks trigger a reload, and figures got phone layouts and a tappable blueprint.
- Plainer headlines on the homepage, Platform page and blog; `twitter:creator` in the head.
- Hosting moved off the Cloudflare Worker to OpenShip.

### Dependencies

- React 19.3.1, StyleX 0.19.2, Three.js 0.187, Vite 8.3.8, TanStack Router/Start, Biome 2.6.8 and Tauri 2.12.

## 0.2.0 (2026-09-26)

### UI kit 1.1.0 → 1.2.0

- 1.2.0: `Menu`, the iOS pop-up menu.
- 1.1.0: `Checkbox`, `IconButton`, `Segmented`, `TextField`, `Select`, `Sheet` and `useWide`.

### SDK

- Device events for the frame's buttons and sensors.
- `os.notify.post` and `os.notify.clear`: a banner, then a card on the lock screen.
- `microphone` and `files` permissions: a shell-owned recorder and durable file storage.

### Shell

- Drag apps out of, into and around the dock.
- The frame remembers its view, switches and levels across reloads.
- Apps fly into folders on drop; folders and the wallpaper sheet animate out.

### Apps

- Rebuilt after Apple's: Camera, Notes, Safari, Reminders, News, Wallet, Home, Health, Fitness,
  Weather, Contacts, Clock, Tips, Music, Phone, Calendar, Settings, the App Store, Messages, Maps,
  Books, Calculator, Voice Memos, Shortcuts, Podcasts and Stocks.
- Live data: Stocks quotes, News articles from DEV Community, Maps search and routing.
- Removed the YouTube, Watch, iTunes Store and Find My mocks.

### Community apps

- Redesigned with fold sync: 2048, Snake, Tic-Tac-Toe, Memory Match, Wordle Mini, Pomo Timer,
  Habit Streak and Fold Compass.

### Site

- `/apps` catalog and `/kit` showcase.
- The changelog in the nav.
- `/blog`: the introduction to Duo and the 0.2.0 release post, with the film and the live phone.

## 0.1.0 (2026-09-19)

The initial release.

### UI kit 0.1.0 → 1.0.0

- 1.0.0: every token traces to Apple's HIG and UIKit.
- 0.2.0: `HStack`, the type ramp and app themes; `Hero`, `Symbol` and `NavigationStack` removed.
- 0.1.0: screen, stack, title, list, row, text, button, toggle, symbol, navigation and widget
  components.

### SDK

- The sandbox runtime, app lifecycle, storage and permissions.

### CLI

- Create, develop and package apps outside the repository.

### Shell

- The folding iPhone Duo in Three.js, on the web and the desktop.
- App switcher, split view, folders and wallpapers.

### Apps

- Nine official apps in the catalog.
- Rebuilt after Apple's: Weather, Photos, Maps, Music, Notes, Settings and the App Store.

### Community apps

- 2048, Snake, Tic-Tac-Toe, Habit Streak, Wordle Mini, Pomo Timer, Memory Match and Flappy Duo.

### Site

- Launch site, developer docs, the UI kit reference, `/simulator` and the AI app builder.

#!/bin/bash
# Re-extracts the icon set in public/icons from this Mac: real Apple app artwork
# out of /System/Applications, and real SF Symbols out of AppKit. Needs Xcode's
# swift and cwebp (brew install webp). macOS only.
set -euo pipefail
cd "$(dirname "$0")/.."
A=/System/Applications
out=public/icons
mkdir -p "$out/sym"

xcrun swift scripts/appicons.swift "$out" 192 \
  "phone|$A/Phone.app" "safari|/Applications/Safari.app" "messages|$A/Messages.app" "music|$A/Music.app" \
  "facetime|$A/FaceTime.app" "calendar|$A/Calendar.app" "photos|$A/Photos.app" "mail|$A/Mail.app" \
  "notes|$A/Notes.app" "reminders|$A/Reminders.app" "clock|$A/Clock.app" "news|$A/News.app" \
  "tv|$A/TV.app" "podcasts|$A/Podcasts.app" "appstore|$A/App Store.app" "maps|$A/Maps.app" \
  "weather|$A/Weather.app" "calculator|$A/Calculator.app" "settings|$A/System Settings.app" "books|$A/Books.app" \
  "stocks|$A/Stocks.app" "home|$A/Home.app" "freeform|$A/Freeform.app" "shortcuts|$A/Shortcuts.app" \
  "findmy|$A/FindMy.app" "voicememos|$A/VoiceMemos.app" \
  "preview|$A/Preview.app" "contacts|$A/Contacts.app" "tips|$A/Tips.app" "siri|$A/Siri.app"

xcrun swift scripts/symbols.swift "$out/sym" 128 \
  cellularbars wifi battery.100 airplane dot.radiowaves.left.and.right antenna.radiowaves.left.and.right \
  gear sun.max.fill speaker.wave.3.fill moon.fill iphone hand.raised.fill lock.fill \
  chevron.left chevron.right book.fill square.and.arrow.up square.on.square magnifyingglass \
  arrow.clockwise xmark plus location.fill ellipsis.circle person.crop.circle \
  bolt.fill bolt.slash.fill square.grid.3x3 arrow.triangle.2.circlepath.camera.fill aspectratio camera.filters \
  plusminus.circle livephoto chevron.up flashlight.on.fill flashlight.off.fill \
  folder.fill folder.badge.plus trash.fill note.text person.2.fill sidebar.left square.and.pencil \
  arrow.up.left.and.arrow.down.right arrow.uturn.backward checklist tablecells pencil.tip.crop.circle \
  photo.on.rectangle.angled square.grid.2x2 heart heart.fill square.and.arrow.down map video camera.viewfinder \
  person.2.crop.square.stack trash rectangle.stack photo rectangle.stack.badge.person.crop bubble.left.and.bubble.right \
  shared.with.you hand.draw paintbrush.pointed doc.text square.and.arrow.down.on.square minus \
  line.3.horizontal.decrease ellipsis info.circle checkmark.circle.fill chevron.down \
  mappin figure.walk bus.fill tram.fill fork.knife cup.and.saucer.fill \
  cart.fill cross.fill leaf.fill building.columns.fill film.fill star checkmark globe.americas.fill

# PNG straight off the icon services is ~50 KB each; webp holds up at a fifth of that.
find "$out" -name '*.png' | while read -r f; do
  cwebp -quiet -q 90 -alpha_q 100 -m 6 "$f" -o "${f%.png}.webp"
  rm "$f"
done

# The Star White home-screen wallpaper is a texture inside the same USDZ the body
# model comes out of, so scripts/prepare-model.py has already unpacked it.
dunes=assets/textures/bRLlvSMXjHGTFMA.avif
if [ -f "$dunes" ]; then
  sips -s format png "$dunes" --out /tmp/duo-wall.png >/dev/null
  cwebp -quiet -q 82 -m 6 /tmp/duo-wall.png -o "$out/wall.webp"
  rm /tmp/duo-wall.png
else
  echo "skipping wall.webp: run scripts/prepare-model.py first"
fi
du -sh "$out"

# Phrasebook

An offline travel phrasebook for Duo. Pick a language, tap a phrase, and show the
screen to the person you are talking to. 41 phrases in five groups (Basics, Getting
around, Eating out, Shopping, Help) in Spanish, French, German, Italian, Portuguese,
Japanese and Vietnamese. Japanese carries a romanisation under every phrase so you
can read it aloud.

The phrases are bundled and hand-written: nothing is translated live, so there is no
network use, no account and no permission. It works with no signal.

## Using it

- **Language**: the pill row at the top. Your choice is remembered.
- **Search**: matches the English, the chosen language and the romanisation, and
  ignores accents (`donde` finds `¿Dónde está el baño?`).
- **Filter**: All, Saved, or one of the five groups.
- **Show a phrase**: tap it. The phrase is set as large as its longest word allows,
  with what it means in English underneath. Previous and Next step through the
  current list; ArrowLeft and ArrowRight do the same. The star saves it.
- **Back**: the back button, or Escape on the cover. Escape from the list goes home as usual.

## Both displays

The cover shows one screen at a time: the list, then the phrase. The inner display
shows the list on the left and the phrase on the right. Which phrase is open is shared
between the displays for the session, so a phrase picked while open is already on the
cover after you fold the phone, and the other way round. Folding, unfolding and
reopening keep your language and saved phrases.

## Data

`os.storage` key `lang` holds the language id and `favs` a JSON array of saved phrase
ids. `os.session` key `ui` holds `{ filter, query, sel }`, the open list and phrase.
Every read narrows its input, so an unknown id or malformed value falls back to the
default rather than failing. No network, no other permissions.

## Notes on the phrases

Spanish is neutral to Spain-leaning (`billete`, `cacahuete (maní)`); Portuguese is
Brazilian (`banheiro`, `trem`, `cardápio`). Where a word changes with the speaker's
gender the phrase gives both forms (`Soy vegetariano/a`). French keeps a no-break space
before `? ! : ;`. Japanese uses polite forms.

## Checks

`bun community-apps/phrasebook/phrasebook.test.ts` checks that every phrase exists in
every language, that only Japanese has a romanisation, the list filtering and search,
stepping at the ends, the sizing of long words and the parsing of bad stored values.

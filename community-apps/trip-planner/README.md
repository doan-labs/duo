# Trip Planner

An offline trip organizer for the Duo. Keep named trips with date ranges,
day-by-day stop itineraries, travel legs, stays and a packing checklist.
Everything is stored on the device: no accounts, no network, no booking.

## What it does

- **Trips**: create, rename and delete named trips with a start and end date.
  Each trip card shows its status (today counts are computed live from your
  dates), how many days it runs and how many stops it holds.
- **Days**: a chip per day of the trip, labelled with its real calendar date,
  plus a "Later" lane for ideas that are not scheduled yet. Pick a day to see
  its timeline; the current day is highlighted while a trip is live.
- **Stops**: an ordered timeline per day. Add stops with an optional time,
  address and notes, edit them in place, drag-free reorder with Arrange, and
  delete with confirmation. Undo restores a deleted stop to its exact slot.
- **Travel**: log the legs between places - flights, trains, drives, ferries,
  bus rides and walks - each with route, date, departure/arrival times and a
  reference field for confirmation numbers.
- **Stays**: record where you sleep with check-in/check-out dates and the
  address. Times and dates are validated, so a checkout before a check-in can
  never be saved.
- **Packing**: a checklist with a progress bar. Add items, tick them off, and
  clear the packed ones in one tap - undo brings them back.
- **Pause anywhere**: the editor draft, the selected day and even an open stop
  detail are session state. Fold the phone mid-edit and the other display
  resumes exactly where you left; relaunching restores everything.

## Data

All data is user-entered. Dates are stored as calendar days (`YYYY-MM-DD`),
times as `HH:MM`, and every record is validated on read so a torn or hostile
storage value degrades to an empty list instead of a crash. The trip library
lives in `os.storage` under one record per trip plus an ordering index, so two
displays can edit different trips without clobbering each other.

Writes commit in semantic order (`commitLibWrites`): changed records first,
then a tomb marker under each removed `trip.<id>`, then the index - so a
peer restore landing mid-commit ends up a recoverable orphan instead of
being erased by a late step. A tomb marks an acknowledged delete so it can
never resurrect, while an unmarked orphan (a partial create) still
recovers. Tombs are retained - records are never deleted at all, because
no read-then-delete pair is atomic on the port and old reclamation could
erase a newer same-id incarnation restored in between. Each tomb is a
~16-byte permanent marker the assembler always skips; the count grows with
delete history (not bounded by the trip cap), so the platform's per-app
key/byte quota is the real bound and exhausting it surfaces as an ordinary
write failure - an honest error, never silent loss. A commit performs no
reads and issues no rollback: a verify-read's value is only valid at its
captured revision, so a snapshot-driven write could erase a peer's
acknowledged edit. Instead the outcome is 'applied', 'failed' (provably
nothing landed) or 'partial' (landed data preserved, honestly reported).
Every mutation rebases on the storage mirror (never the render
snapshot), and watch echoes keep the newest still-pending own write so
older acknowledgements
cannot roll state back. New input is admitted only on the live display; an
operation already accepted finishes through a fold and reports an explicit
failure when storage drops out underneath it.

## Interface

Cover (387pt) leads with the trip list, then pushes a full-screen itinerary;
selecting a stop pushes its detail page. The inner display pairs the itinerary
with a glass inspector rail showing the stop or trip overview. Both themes,
reduced motion, and a persistent sound toggle are supported.

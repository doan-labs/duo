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

## Interface

Cover (387pt) leads with the trip list, then pushes a full-screen itinerary;
selecting a stop pushes its detail page. The inner display pairs the itinerary
with a glass inspector rail showing the stop or trip overview. Both themes,
reduced motion, and a persistent sound toggle are supported.

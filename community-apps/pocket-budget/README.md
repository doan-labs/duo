# Pocket Budget

Pocket Budget is a fold-aware spending ledger for Duo. The cover keeps the
whole loop - month picker, quick entry, the breakdown chart and the limit
fields - within thumb reach, while the inner display puts the entry form and
the running ledger on the left and the month's numbers on the right.

## Using it

- **Add an expense:** pick a date, type an amount (`12` or `12.50`), choose a
  category chip, optionally add a note, then Add expense. Enter submits too.
- **Edit or delete:** tap a ledger row to load it into the entry card, then
  Save, Cancel or Delete. The trash button on a row deletes it directly.
- **Change month:** the pill in the header steps one month back or forward;
  a Today button appears whenever you browse away from the current month.
  Adding an expense dated in another month takes you there so the row lands
  in view.
- **Set a limit:** each category's field in Monthly limits is a dollar cap;
  `0` or an empty field clears it. Breakdown bars draw the cap as a white
  tick and spill over it in red when you pass it.

## Data

Amounts are stored as integer minor units (cents), so totals never drift on
floating point. The ledger and the limits persist through `os.storage` under
`budget-v1`; the viewed month and any remote edit travel through `os.session`,
so folding the phone mid-entry keeps both displays on the same month with the
same numbers. Nothing leaves the device: the app declares no network access.
